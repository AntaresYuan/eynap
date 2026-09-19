/*
 * design-system.js — Design System 提取器（只读）
 *
 * 与 recon.js 的分工：
 *   recon.js       → 摸清"能不能改、哪里不能碰"（框架、危险区、z-index）
 *   design-system.js → 摸清"必须照什么写"（token + 真实组件配方 + 可直接用的 CSS）
 *
 * 核心设计（针对"统计平均值不构成规范"这一问题）：
 *   1. 不做离散统计。直接扒页面上真实按钮/输入框/卡片的**完整 computed style**，
 *      形成成套的"组件配方"——因为圆角/内边距/字号/色彩是一个整体，拆开取平均就失真。
 *   2. 输出 `cssText`：一段可直接注入的 CSS 变量层 + 组件类。
 *      注入脚本只准引用这些 var() 和类名，不准写字面量。
 *      这样把"建议复用"变成"只能复用"。
 *   3. 每个 token 都带 `source`，标明它是从哪个真实元素扒来的，便于人工核对而非盲信。
 *
 * 输出：window.__uiDS，含 tokens / components / cssText / confidence
 *
 * ⚠️ 必须在**浏览器页面上下文**里运行（Browser Use 的 bu.js 或用户 Console）。
 *    不能用 `node design-system.js`：它读真实页面的 computed style，Node 里没有 document。
 */
(function () {
  'use strict';

  // 环境守卫：错误的运行方式给出可操作指引，而不是抛一句 document is not defined
  if (typeof document === `undefined` || typeof getComputedStyle === `undefined`) {
    var msg = [
      `[pfh] design-system.js 必须在浏览器页面上下文里运行，不能用 node 执行。`,
      `正确做法（二选一）：`,
      `  1. Browser Use：bu.js(<本文件内容>)`,
      `  2. 让用户在目标页面 F12 → Console 整段粘贴运行，再 copy(window.__uiDS.cssText)`,
      `原因：本脚本靠读取真实元素的 computed style 来提取站点规范，Node 环境没有 DOM。`
    ].join(`\n`);
    if (typeof console !== `undefined`) console.error(msg);
    throw new Error(`design-system.js must run in a browser page context, not Node`);
  }

  var DS = {};

  // ============ 0. 页面就绪检测 ============
  // 页面未渲染完就提取会拿到残缺/错误的 token（实测：antd 页面刚加载时抓不到主按钮，
  // border 还会错成半透明白，分数从 62% 掉到 46%），而使用者对此毫无察觉。
  // 所以先自检并给出明确警告，而不是默默产出错误规范。
  DS.readiness = (function () {
    var issues = [];
    if (document.readyState !== 'complete') issues.push('document.readyState=' + document.readyState + '（资源仍在加载）');

    var btnCount = document.querySelectorAll('button, [role="button"]').length;
    if (btnCount === 0) issues.push('页面上找不到任何按钮（可能组件尚未渲染，或确实是纯静态页）');

    // 骨架屏/加载态存在说明内容还没到位
    var skeleton = document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"], [class*="loading"], [class*="spinner"], [aria-busy="true"]').length;
    if (skeleton > 0) issues.push('检测到 ' + skeleton + ' 个骨架屏/加载中元素，内容可能未渲染完成');

    return {
      ready: issues.length === 0,
      issues: issues,
      advice: issues.length
        ? '建议等页面完全渲染（可滚动一下触发懒加载）后重新运行本脚本，否则 token 可能不准'
        : '页面已就绪'
    };
  })();

  // ============ 工具 ============
  function cs(el) { return el ? getComputedStyle(el) : null; }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.05;
  }

  // 排除我们自己注入的元素，避免二次侦察时把自己的样式当成站点规范
  // 注意：className 在 SVG 元素上是 SVGAnimatedString 而非字符串，closest 也可能抛错，
  // 任何异常都必须吞掉——否则会让整个 pickVisible 静默返回空，导致"页面明明有按钮却抓不到"
  function isOurs(el) {
    try {
      var c = typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '';
      if (/(^|\s)(uix|pfh)-/.test(c)) return true;
      return el.closest ? el.closest('[class*="uix-"],[class*="pfh-"]') !== null : false;
    } catch (e) { return false; }
  }

  // 有意义的交互元素：排除纯图标按钮（无文字、近正方形），它们的圆角/内边距不代表标准规格
  function hasTextContent(el) {
    try { return (el.textContent || '').trim().length > 0; } catch (e) { return false; }
  }
  function isIconOnly(el) {
    try {
      var r = el.getBoundingClientRect();
      if (hasTextContent(el)) return false;
      return Math.abs(r.width - r.height) < 6;   // 无文字且近正方形 → 图标按钮
    } catch (e) { return false; }
  }

  function pickVisible(selector, limit, opts) {
    var out = [];
    var els;
    opts = opts || {};
    try { els = document.querySelectorAll(selector); } catch (e) { return out; }
    for (var i = 0; i < els.length && out.length < (limit || 8); i++) {
      var el = els[i];
      if (!visible(el) || isOurs(el)) continue;
      if (opts.requireText && !hasTextContent(el)) continue;
      if (opts.excludeIconOnly && isIconOnly(el)) continue;
      out.push(el);
    }
    return out;
  }

  // 众数：组件配方取"最常见的那一套"，而不是平均值
  function mode(arr) {
    if (!arr.length) return null;
    var c = {};
    arr.forEach(function (v) { if (v != null && v !== '') c[v] = (c[v] || 0) + 1; });
    var keys = Object.keys(c);
    if (!keys.length) return null;
    keys.sort(function (a, b) { return c[b] - c[a]; });
    return keys[0];
  }

  function toHex(rgb) {
    if (!rgb) return null;
    var m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return rgb;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.99) return rgb;  // 保留 alpha 原样
    function h(n) { var s = parseInt(n, 10).toString(16); return s.length === 1 ? '0' + s : s; }
    return '#' + h(m[1]) + h(m[2]) + h(m[3]);
  }

  // 解析任意颜色写法为 [r,g,b]，解析不出返回 null
  // 必须同时支持 rgb() 与 #hex：数据在管道里会被 toHex 转换，
  // 只认一种格式会导致判定静默失效（曾因此把链接蓝误判成中性色）
  function rgbOf(color) {
    var s = String(color || '').trim();
    var m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return [+m[1], +m[2], +m[3]];
    var h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (h) {
      var v = h[1];
      if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    }
    return null;
  }

  // 是否中性色（灰阶）。解析失败返回 false —— 宁可漏判也不要把彩色当灰色放行
  // 用 HSL 饱和度而非绝对色差：淡红 #fff1f0 的绝对色差只有 15，会绕过色差阈值，
  // 但其饱和度高达 100%（在浅色区），必须靠饱和度才能识别出这是语义色而非灰阶。
  function isNeutral(color) {
    var c = rgbOf(color);
    if (!c) return false;
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    if (max === min) return true;                        // 纯灰
    var d = max - min;
    var s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    return s < 0.12;                                     // 饱和度阈值：真灰阶普遍 < 0.12
  }

  // 有效亮度：必须把 alpha 折算进去。
  // 很多设计体系（antd、Material）用 alpha 表达文字层级，例如
  // rgba(0,0,0,0.88) / 0.65 / 0.45 分别是主/次/三级文字。
  // 若忽略 alpha，三者亮度都算作 0，就永远分不出层级（实测导致次要文字色始终为 null）。
  function lumOf(color, bgLum) {
    var c = rgbOf(color);
    if (!c) return 128;
    var raw = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    var a = alphaOf(color);
    if (a >= 0.99) return raw;
    // 与背景合成后的视觉亮度（默认按白底 255 计算）
    var bg = (bgLum === undefined || bgLum === null) ? 255 : bgLum;
    return raw * a + bg * (1 - a);
  }

  function alphaOf(rgb) {
    var m = String(rgb).match(/rgba?\([^)]*,\s*([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  // ============ 1. 品牌色：从真实交互元素反推，而非全页统计 ============
  // 依据：主色一定出现在主按钮/链接上，全页统计只会得到大面积的白与灰
  DS.brand = (function () {
    var votes = {};
    function vote(color, weight, src) {
      if (!color || alphaOf(color) < 0.5 || isNeutral(color)) return;
      var hex = toHex(color);
      if (!votes[hex]) votes[hex] = { weight: 0, sources: [] };
      votes[hex].weight += weight;
      if (votes[hex].sources.length < 3) votes[hex].sources.push(src);
    }

    // 主按钮的背景色权重最高——这是主色最可靠的来源
    var btnSels = [
      'button[class*="primary"]', '[class*="btn-primary"]', '[class*="button--primary"]',
      '[class*="Primary"]', 'button[type="submit"]', '.ant-btn-primary', '.el-button--primary',
      '.arco-btn-primary', '.semi-button-primary', '.MuiButton-contained'
    ];
    btnSels.forEach(function (sel) {
      pickVisible(sel, 4).forEach(function (el) {
        var s = cs(el);
        vote(s.backgroundColor, 10, sel + ' → background');
        if (isNeutral(s.backgroundColor)) vote(s.color, 6, sel + ' → color');
      });
    });

    // 普通按钮兜底
    if (!Object.keys(votes).length) {
      pickVisible('button, [role="button"], input[type="submit"]', 12).forEach(function (el) {
        var s = cs(el);
        vote(s.backgroundColor, 4, 'button → background');
        vote(s.borderTopColor, 2, 'button → border');
      });
    }

    // 链接色
    pickVisible('a[href]', 12).forEach(function (el) {
      vote(cs(el).color, 3, 'a[href] → color');
    });

    // 选中态导航
    pickVisible('[class*="active"], [aria-selected="true"], [class*="selected"]', 8).forEach(function (el) {
      var s = cs(el);
      vote(s.color, 2, 'active/selected → color');
      vote(s.borderBottomColor, 2, 'active → border-bottom');
    });

    var ranked = Object.keys(votes)
      .map(function (k) { return { color: k, weight: votes[k].weight, sources: votes[k].sources }; })
      .sort(function (a, b) { return b.weight - a.weight; });

    return {
      primary: ranked.length ? ranked[0].color : null,
      primarySource: ranked.length ? ranked[0].sources[0] : null,
      candidates: ranked.slice(0, 5)
    };
  })();

  // ============ 2. 文本色阶：按与背景的对比度分层，而非取高频 ============
  DS.textColors = (function () {
    var body = cs(document.body);
    // 页面底色亮度：用于把半透明文字折算成视觉亮度
    var pageBgLum = (function () {
      var bg = body.backgroundColor;
      if (!bg || alphaOf(bg) < 0.5) {
        bg = cs(document.documentElement).backgroundColor;
      }
      var c = rgbOf(bg);
      return c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) : 255;
    })();

    var samples = [];
    var els = document.querySelectorAll('body p, body span, body div, body li, body td, body label, body h1, body h2, body h3');
    var step = Math.max(1, Math.floor(els.length / 300));
    for (var i = 0; i < els.length; i += step) {
      var el = els[i];
      if (!visible(el) || isOurs(el)) continue;
      // 只取直接含文本的节点，容器的继承色没有代表性
      var hasText = false;
      for (var n = 0; n < el.childNodes.length; n++) {
        if (el.childNodes[n].nodeType === 3 && el.childNodes[n].textContent.trim().length > 1) { hasText = true; break; }
      }
      if (!hasText) continue;
      var s = cs(el);
      samples.push({
        color: toHex(s.color),
        size: parseFloat(s.fontSize) || 14,
        weight: parseInt(s.fontWeight, 10) || 400,
        // 按页面底色折算，半透明文字才能得到正确的视觉亮度
        lum: lumOf(s.color, pageBgLum)
      });
    }

    var counter = {};
    samples.forEach(function (x) {
      if (!counter[x.color]) counter[x.color] = { n: 0, lum: x.lum, sizes: [] };
      counter[x.color].n++;
      counter[x.color].sizes.push(x.size);
    });
    var list = Object.keys(counter).map(function (c) {
      return { color: c, count: counter[c].n, lum: counter[c].lum };
    }).filter(function (x) { return x.count >= 2; })
      .sort(function (a, b) { return b.count - a.count; });

    // 文字层级判定
    // 两个必须点：
    // 1) 限定中性色 —— 否则把链接蓝、标签绿、警告红当成"次要文字色"，
    //    注入后出现整段彩色小字（实测在 antd 踩到过）。
    // 2) 用「与页面底色的对比度」分层，而不是绝对亮度 ——
    //    深色主题下文字比背景亮、浅色主题下文字比背景暗，绝对亮度的方向是相反的。
    //    对比度越高越像主文字，越低越像次要文字，两种主题下都成立。
    var pageLum = lumOf(cs(document.body).backgroundColor);
    if (!isFinite(pageLum)) pageLum = 255;

    var neutrals = list.filter(function (x) { return isNeutral(x.color); })
      .map(function (x) { return { color: x.color, count: x.count, lum: x.lum, contrast: Math.abs(x.lum - pageLum) }; });

    var primary = null, secondary = null, tertiary = null;
    if (neutrals.length) {
      // 主文字：对比度足够且出现最多
      var strong = neutrals.filter(function (x) { return x.contrast >= 60; })
        .sort(function (a, b) { return b.count - a.count; });
      var pick = strong.length ? strong[0] : neutrals.slice().sort(function (a, b) { return b.contrast - a.contrast; })[0];
      primary = pick.color;

      // 次要/三级：对比度低于主文字，按对比度从高到低取两档
      var weaker = neutrals.filter(function (x) {
        return x.color !== primary && x.contrast < pick.contrast - 12 && x.contrast > 12;
      }).sort(function (a, b) { return b.contrast - a.contrast; });

      if (weaker.length) secondary = weaker[0].color;
      if (weaker.length > 1) tertiary = weaker[weaker.length - 1].color;
      if (tertiary === secondary) tertiary = null;
    } else {
      primary = list.length ? list[0].color : toHex(body.color);
    }

    return {
      primary: primary, secondary: secondary, tertiary: tertiary,
      pageLum: Math.round(pageLum),
      ranked: list.slice(0, 8)
    };
  })();

  // ============ 3. 表面与描边色 ============
  DS.surfaces = (function () {
    var body = cs(document.body);
    var pageBg = toHex(body.backgroundColor);
    if (!pageBg || pageBg === 'rgba(0, 0, 0, 0)') pageBg = toHex(cs(document.documentElement).backgroundColor) || '#ffffff';

    // 卡片/面板背景
    var cardBgs = [], borders = [];
    pickVisible('[class*="card"], [class*="Card"], [class*="panel"], [class*="modal"], [class*="dialog"], [class*="popover"], [class*="dropdown"], [class*="menu"]', 20)
      .forEach(function (el) {
        var s = cs(el);
        if (alphaOf(s.backgroundColor) > 0.5) cardBgs.push(toHex(s.backgroundColor));
        if (s.borderTopWidth !== '0px' && alphaOf(s.borderTopColor) > 0.15) borders.push(toHex(s.borderTopColor));
      });

    // 输入框描边最能代表标准 border 色
    pickVisible('input, textarea, select', 12).forEach(function (el) {
      var s = cs(el);
      if (s.borderTopWidth !== '0px' && alphaOf(s.borderTopColor) > 0.15) borders.push(toHex(s.borderTopColor));
    });

    // 兜底：扫描任意有可见描边的元素，只取中性色
    if (!borders.length) {
      var els = document.querySelectorAll('body div, body section, body li, body td, body button');
      var step = Math.max(1, Math.floor(els.length / 200));
      for (var i = 0; i < els.length; i += step) {
        var el = els[i];
        if (!visible(el) || isOurs(el)) continue;
        var s2 = cs(el);
        if (s2.borderTopWidth !== '0px' && s2.borderTopStyle !== 'none' &&
            alphaOf(s2.borderTopColor) > 0.15 && isNeutral(s2.borderTopColor)) {
          borders.push(toHex(s2.borderTopColor));
        }
        // 分隔线常用 border-bottom
        if (s2.borderBottomWidth !== '0px' && s2.borderBottomStyle !== 'none' &&
            alphaOf(s2.borderBottomColor) > 0.15 && isNeutral(s2.borderBottomColor)) {
          borders.push(toHex(s2.borderBottomColor));
        }
      }
    }

    // 浅灰底（次级表面）：必须是中性色。
    // 否则会把警告/错误提示的淡红淡黄底当成"次级背景"，注入面板整体泛红（实测踩到过）
    var subtle = [];
    pickVisible('[class*="secondary"], [class*="subtle"], [class*="muted"], thead, [class*="table-header"], [class*="tag"], [class*="badge"], pre, code', 24)
      .forEach(function (el) {
        var s = cs(el);
        var bg = toHex(s.backgroundColor);
        if (alphaOf(s.backgroundColor) > 0.5 && isNeutral(s.backgroundColor) && bg !== pageBg) subtle.push(bg);
      });

    return {
      page: pageBg,
      card: mode(cardBgs) || pageBg,
      subtle: mode(subtle) || null,
      border: mode(borders) || null,
      borderWidth: (function () {
        var ws = [];
        pickVisible('input, textarea, [class*="card"]', 10).forEach(function (el) {
          var w = cs(el).borderTopWidth;
          if (w && w !== '0px') ws.push(w);
        });
        return mode(ws) || '1px';
      })()
    };
  })();

  // ============ 4. 排版阶梯 ============
  DS.typography = (function () {
    var body = cs(document.body);
    function scale(sel) {
      var els = pickVisible(sel, 6);
      if (!els.length) return null;
      var sizes = [], weights = [], lhs = [];
      els.forEach(function (el) {
        var s = cs(el);
        sizes.push(s.fontSize); weights.push(s.fontWeight); lhs.push(s.lineHeight);
      });
      return { fontSize: mode(sizes), fontWeight: mode(weights), lineHeight: mode(lhs) };
    }
    return {
      fontFamily: body.fontFamily,
      base: { fontSize: body.fontSize, fontWeight: body.fontWeight, lineHeight: body.lineHeight, color: toHex(body.color) },
      h1: scale('h1'), h2: scale('h2'), h3: scale('h3, h4'),
      small: (function () {
        // 找出比正文更小的字号作为辅助文字规格。
        // 只取整数 px：em/rem 计算出的 12.6px 这类小数值放进 token 会显得很业余
        var base = parseFloat(body.fontSize) || 14, found = [];
        var els = document.querySelectorAll('body span, body div, body p, body label, small');
        var step = Math.max(1, Math.floor(els.length / 200));
        for (var i = 0; i < els.length; i += step) {
          if (!visible(els[i]) || isOurs(els[i])) continue;
          var fsRaw = cs(els[i]).fontSize;
          var fs = parseFloat(fsRaw);
          if (fs && fs < base && fs >= 10 && Math.abs(fs - Math.round(fs)) < 0.01) {
            found.push(Math.round(fs) + 'px');
          }
        }
        return mode(found);
      })()
    };
  })();

  // ============ 5. 真实组件配方（核心）============
  // 直接扒真实元素的成套样式，不做跨元素平均——这是"规范"与"统计"的本质区别
  DS.components = (function () {
    var comp = {};

    function recipe(el, extra) {
      if (!el) return null;
      var s = cs(el);
      var r = {
        selectorSample: (function () {
          var c = String(el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
          return el.tagName.toLowerCase() + (c ? '.' + c : '');
        })(),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        color: toHex(s.color),
        background: toHex(s.backgroundColor),
        padding: s.padding,
        borderRadius: s.borderRadius,
        border: s.borderTopWidth === '0px' ? 'none' : (s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + toHex(s.borderTopColor)),
        boxShadow: s.boxShadow === 'none' ? null : s.boxShadow,
        height: Math.round(el.getBoundingClientRect().height) + 'px',
        transition: s.transition && s.transition !== 'all 0s ease 0s' ? s.transition : null
      };
      if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
      return r;
    }

    // 主按钮：必须带文字且非图标按钮，否则规格不具代表性
    var primaryBtn = null;
    ['button[class*="primary"]', '[class*="btn-primary"]', '.ant-btn-primary', '.el-button--primary',
     '.arco-btn-primary', '.semi-button-primary', '.MuiButton-contained', '[class*="button--primary"]',
     'button[type="submit"]'
    ].some(function (sel) {
      var els = pickVisible(sel, 3, { requireText: true, excludeIconOnly: true });
      if (els.length) { primaryBtn = els[0]; return true; }
      return false;
    });
    // 兜底：找背景色等于品牌色的按钮
    if (!primaryBtn && DS.brand.primary) {
      pickVisible('button, [role="button"], a[class*="btn"]', 30, { requireText: true, excludeIconOnly: true })
        .some(function (el) {
          if (toHex(cs(el).backgroundColor) === DS.brand.primary) { primaryBtn = el; return true; }
          return false;
        });
    }
    comp.buttonPrimary = recipe(primaryBtn);

    // 次要按钮：排除主按钮后的第一个带文字按钮
    var secondaryBtn = null;
    pickVisible('button, [role="button"]', 30, { requireText: true, excludeIconOnly: true }).some(function (el) {
      if (el === primaryBtn) return false;
      var s = cs(el);
      if (primaryBtn && toHex(s.backgroundColor) === toHex(cs(primaryBtn).backgroundColor)) return false;
      if (alphaOf(s.backgroundColor) < 0.1) return false;   // 纯文字按钮不作为次要按钮规格
      secondaryBtn = el; return true;
    });
    comp.buttonSecondary = recipe(secondaryBtn);

    // 输入框
    var input = pickVisible('input[type="text"], input[type="search"], input:not([type]), textarea', 1)[0]
             || pickVisible('input', 1)[0];
    comp.input = recipe(input, input ? { placeholderColor: null } : null);

    // 卡片/面板
    var card = pickVisible('[class*="card"], [class*="Card"], [class*="panel"]', 1)[0];
    comp.card = recipe(card);

    // 浮层（弹窗/下拉/气泡）——注入的面板最该照它写
    var overlay = pickVisible('[class*="modal"], [class*="dialog"], [class*="popover"], [class*="dropdown-menu"], [class*="tooltip"], [role="dialog"], [role="menu"]', 1)[0];
    comp.overlay = recipe(overlay);

    // 标签/徽标
    var tag = pickVisible('[class*="tag"], [class*="badge"], [class*="chip"], [class*="label"]', 1)[0];
    comp.tag = recipe(tag);

    return comp;
  })();

  // ============ 6. 间距节奏：识别基准栅格 ============
  DS.spacing = (function () {
    var vals = [];
    var els = document.querySelectorAll('body div, body section, body li, body button, body [class*="item"]');
    var step = Math.max(1, Math.floor(els.length / 250));
    for (var i = 0; i < els.length; i += step) {
      if (!visible(els[i]) || isOurs(els[i])) continue;
      var s = cs(els[i]);
      [s.paddingTop, s.paddingLeft, s.gap, s.marginBottom].forEach(function (v) {
        var n = parseFloat(v);
        if (n >= 2 && n <= 64 && String(v).indexOf('px') > -1) vals.push(n);
      });
    }
    var counter = {};
    vals.forEach(function (v) { counter[v] = (counter[v] || 0) + 1; });
    var ranked = Object.keys(counter).map(Number).sort(function (a, b) { return counter[b] - counter[a]; });

    // 判断 4/8 栅格：多数值能被基数整除即认定
    function fitRate(base) {
      var hit = 0, total = 0;
      ranked.slice(0, 12).forEach(function (v) { total += counter[v]; if (v % base === 0) hit += counter[v]; });
      return total ? hit / total : 0;
    }
    var r8 = fitRate(8), r4 = fitRate(4);
    return {
      common: ranked.slice(0, 8),
      baseGrid: r8 >= 0.6 ? 8 : (r4 >= 0.6 ? 4 : null),
      gridConfidence: { base8: +r8.toFixed(2), base4: +r4.toFixed(2) }
    };
  })();

  // ============ 7. 圆角与阴影：按组件归属，不混为一谈 ============
  DS.shape = (function () {
    // 只接受单值圆角（如 "6px"）。多值简写（"0px 6px 6px 0px"）是局部特例（如输入框组的一侧），
    // 直接拿来用会让注入面板出现半边直角的怪异形状。
    function normalizeRadius(r, elHeight) {
      if (!r || r === '0px') return null;
      if (r.indexOf('%') > -1) return null;               // 全圆/椭圆，非常规组件圆角
      var parts = r.trim().split(/\s+/);
      if (parts.length > 1) {
        // 多值：若各值一致则归一，否则丢弃
        var uniq = parts.filter(function (v, i, a) { return a.indexOf(v) === i; });
        if (uniq.length !== 1) return null;
        r = uniq[0];
      }
      var n = parseFloat(r);
      if (!isFinite(n) || n <= 0) return null;
      // 胶囊形：圆角接近元素半高 → 属特例（搜索框、标签），不代表标准规格
      if (elHeight && n >= elHeight / 2 - 1) return null;
      return r;
    }

    function radiusOf(sels, opts) {
      var vals = [];
      sels.forEach(function (sel) {
        pickVisible(sel, 12, opts).forEach(function (el) {
          var h = el.getBoundingClientRect().height;
          var r = normalizeRadius(cs(el).borderRadius, h);
          if (r) vals.push(r);
        });
      });
      return mode(vals);
    }

    // 阴影：过滤掉几乎不可见的极淡阴影（如 rgba(0,0,0,0.02) 2px），它们撑不起浮层层次
    var shadows = [];
    pickVisible('[class*="modal"], [class*="dialog"], [class*="popover"], [class*="dropdown"], [class*="card"]', 16)
      .forEach(function (el) {
        var sh = cs(el).boxShadow;
        if (!sh || sh === 'none') return;
        var a = sh.match(/rgba?\([^)]*,\s*([\d.]+)\)/);
        var blur = sh.match(/(\d+(?:\.\d+)?)px/g);
        var maxBlur = blur ? Math.max.apply(null, blur.map(parseFloat)) : 0;
        if (a && parseFloat(a[1]) < 0.04 && maxBlur < 4) return;   // 太淡且几乎无扩散
        shadows.push(sh);
      });

    return {
      // 按钮圆角必须排除图标按钮，否则会被小图标的圆角污染
      radiusButton: radiusOf(['button', '[role="button"]', '[class*="btn"]'], { requireText: true, excludeIconOnly: true }),
      radiusInput: radiusOf(['input[type="text"]', 'input[type="search"]', 'input:not([type])', 'textarea', 'select']),
      radiusCard: radiusOf(['[class*="card"]', '[class*="panel"]']),
      radiusOverlay: radiusOf(['[class*="modal"]', '[class*="dialog"]', '[class*="popover"]', '[class*="dropdown"]']),
      shadowOverlay: mode(shadows)
    };
  })();

  // ============ 8. 原生 CSS 变量：站点自己声明的最权威 ============
  DS.nativeVars = (function () {
    var vars = {}, rootStyle = getComputedStyle(document.documentElement);
    var sheets = document.styleSheets;
    for (var s = 0; s < sheets.length; s++) {
      var rules;
      try { rules = sheets[s].cssRules || sheets[s].rules; } catch (e) { continue; }
      if (!rules) continue;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        if (!rule.style || !rule.selectorText) continue;
        if (!/^(:root|html|body|\[data-theme|\.theme)/.test(rule.selectorText)) continue;
        for (var p = 0; p < rule.style.length; p++) {
          var prop = rule.style[p];
          if (prop && prop.indexOf('--') === 0) {
            var live = rootStyle.getPropertyValue(prop).trim();
            if (live) vars[prop] = live;
          }
        }
      }
    }
    // 只保留与视觉规范相关的
    var picked = {};
    var interesting = /(color|bg|background|text|border|primary|brand|accent|success|warn|danger|error|fill|font|radius|shadow|space|spacing|gap|size)/i;
    Object.keys(vars).forEach(function (k) { if (interesting.test(k)) picked[k] = vars[k]; });
    return { all: Object.keys(vars).length, tokens: picked };
  })();

  // ============ 8.4 原生 token 语义映射（优先级高于反推）============
  // 站点自己声明的 CSS 变量是最权威的规范来源——它就是这个站的 design system 本体。
  // 反推（从渲染结果猜）只应作为兜底。实测 GitHub 有 1235 个原生变量，
  // 其中 --button-primary-bgColor-rest / --border-default 等语义明确，
  // 而反推得到的主色是错的（把浅蓝链接当成了主色）。
  DS.nativeMapped = (function () {
    var all = {};
    var VAR_CAP = 400;          // 变量数量上限：超大 token 体系（GitHub 有 1235 个）会拖垮遍历
    var count = 0;
    var sheetStat = { total: 0, readable: 0, blocked: 0 };

    // 变量可能挂在 :root / html / body 或主题容器上（Arco 实测挂在 body），
    // 所以逐个宿主查。多个宿主都有时以更内层为准（更贴近实际生效值）。
    var HOSTS = [document.documentElement, document.body];
    (function () {
      var themed = document.querySelector('[data-theme], [data-color-mode], [class*="theme-"], [data-bs-theme]');
      if (themed && HOSTS.indexOf(themed) === -1) HOSTS.push(themed);
    })();
    var hostCS = HOSTS.filter(Boolean).map(function (h) { return cs(h); });

    function liveValue(name) {
      // 由外层向内层查，后者覆盖前者
      var v = '';
      for (var i = 0; i < hostCS.length; i++) {
        var t = hostCS[i].getPropertyValue(name).trim();
        if (t) v = t;
      }
      return v;
    }

    // 只收集与视觉规范相关的变量，且边收边过滤——
    // 先全量收集再匹配会导致 O(patterns × vars) 的开销，实测曾把进程拖死
    var RELEVANT = /(fgcolor|bgcolor|bordercolor|borderradius|canvas|fg-|bg-|border|accent|primary|brand|text|surface|radius|fill|neutral)/i;

    // ---- 通道 A：遍历样式表拿到全部变量名 ----
    // 注意：跨域样式表（CDN 上的 CSS）读 cssRules 会抛 SecurityError，
    // 实测 Arco 官网 2/2 张样式表全部被阻止。所以这条通道经常完全失效，
    // 必须有通道 B 兜底，不能只依赖它。
    var sheets = document.styleSheets;
    outer:
    for (var s = 0; s < sheets.length; s++) {
      var rules;
      sheetStat.total++;
      try { rules = sheets[s].cssRules || sheets[s].rules; } catch (e) { sheetStat.blocked++; continue; }
      if (!rules) { sheetStat.blocked++; continue; }
      sheetStat.readable++;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        if (!rule.style || !rule.selectorText) continue;
        if (!/^(:root|html|body|\[data-color-mode|\[data-theme|\.theme|\[data-bs-theme)/.test(rule.selectorText)) continue;
        for (var p = 0; p < rule.style.length; p++) {
          var prop = rule.style[p];
          if (!prop || prop.indexOf('--') !== 0) continue;
          if (!RELEVANT.test(prop)) continue;
          if (all[prop] !== undefined) continue;
          var live = liveValue(prop);
          if (!live) continue;
          all[prop] = live;
          if (++count >= VAR_CAP) break outer;
        }
      }
    }

    var keys = Object.keys(all);

    function isColorVal(v) { return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(String(v).trim()); }
    function isLenVal(v) { return /^[\d.]+(px|rem|em)$/.test(String(v).trim()); }

    // 有些体系把颜色存成裸数字（Arco 的 --arcoblue-6 是 "22,93,255"），
    // 直接当颜色用会失效，必须补成 rgb()。
    function normalizeColorVal(v) {
      var t = String(v || '').trim();
      if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(t)) return 'rgb(' + t.replace(/\s+/g, '') + ')';
      return t;
    }
    function isColorish(v) { return isColorVal(normalizeColorVal(v)); }

    // ---- 已知设计体系指纹 ----
    // 只用于"确定是这个体系时走它的官方命名"，不作为通用规则。
    // 每个体系的命名差异极大，靠一份混合列表去猜必然过拟合，
    // 所以先识别体系（看特征变量是否存在），再用该体系自己的键名。
    var SYSTEMS = [
      { name: 'Arco Design', probe: ['--arcoblue-6', '--color-text-1', '--primary-6'],
        map: { brand: ['--primary-6', '--arcoblue-6'], text: ['--color-text-1'],
               textSecondary: ['--color-text-2', '--color-text-3'],
               bgCard: ['--color-bg-2', '--color-bg-white'], bgSubtle: ['--color-fill-1', '--color-fill-2'],
               border: ['--color-border-2', '--color-border'], radius: ['--border-radius-medium'] } },
      { name: 'Semi Design', probe: ['--semi-color-primary', '--semi-color-text-0'],
        map: { brand: ['--semi-color-primary'], text: ['--semi-color-text-0'],
               textSecondary: ['--semi-color-text-1', '--semi-color-text-2'],
               bgCard: ['--semi-color-bg-2', '--semi-color-bg-1'], bgSubtle: ['--semi-color-fill-0'],
               border: ['--semi-color-border'], radius: ['--semi-border-radius-medium'] } },
      { name: 'GitHub Primer', probe: ['--fgColor-default', '--bgColor-default'],
        map: { brand: ['--button-primary-bgColor-rest', '--bgColor-accent-emphasis'],
               text: ['--fgColor-default'], textSecondary: ['--fgColor-muted'],
               bgCard: ['--bgColor-default'], bgSubtle: ['--bgColor-muted'],
               border: ['--borderColor-default'], radius: ['--borderRadius-medium'] } },
      { name: 'Ant Design', probe: ['--ant-primary-color', '--ant-color-primary'],
        map: { brand: ['--ant-color-primary', '--ant-primary-color'],
               text: ['--ant-color-text'], textSecondary: ['--ant-color-text-secondary'],
               bgCard: ['--ant-color-bg-container'], bgSubtle: ['--ant-color-fill-quaternary'],
               border: ['--ant-color-border'], radius: ['--ant-border-radius'] } },
      { name: 'Material / MUI', probe: ['--md-sys-color-primary', '--mui-palette-primary-main'],
        map: { brand: ['--md-sys-color-primary', '--mui-palette-primary-main'],
               text: ['--md-sys-color-on-surface', '--mui-palette-text-primary'],
               textSecondary: ['--md-sys-color-on-surface-variant', '--mui-palette-text-secondary'],
               bgCard: ['--md-sys-color-surface', '--mui-palette-background-paper'],
               bgSubtle: ['--md-sys-color-surface-variant'],
               border: ['--md-sys-color-outline', '--mui-palette-divider'], radius: [] } },
      { name: 'Bootstrap', probe: ['--bs-primary', '--bs-body-color'],
        map: { brand: ['--bs-primary'], text: ['--bs-body-color'], textSecondary: ['--bs-secondary-color'],
               bgCard: ['--bs-body-bg'], bgSubtle: ['--bs-tertiary-bg'],
               border: ['--bs-border-color'], radius: ['--bs-border-radius'] } },
      { name: 'Tailwind / shadcn', probe: ['--primary', '--foreground', '--muted-foreground'],
        map: { brand: ['--primary'], text: ['--foreground'], textSecondary: ['--muted-foreground'],
               bgCard: ['--card', '--background'], bgSubtle: ['--muted'],
               border: ['--border'], radius: ['--radius'] } }
    ];

    // ---- 通道 B：直接探测已知体系的变量名 ----
    // 关键：getPropertyValue 不受跨域限制，样式表读不到也能拿到值。
    // 通道 A 在 CDN 托管 CSS 的站点上会 100% 失效，所以这条是主力而非补充。
    var detected = null, detectedHits = 0;
    for (var si = 0; si < SYSTEMS.length; si++) {
      var sys = SYSTEMS[si], hits = 0;
      for (var pi = 0; pi < sys.probe.length; pi++) {
        var pv = liveValue(sys.probe[pi]);
        if (pv) { hits++; if (all[sys.probe[pi]] === undefined) all[sys.probe[pi]] = pv; }
      }
      // 取命中特征最多的体系，避免 Tailwind 的 --primary 这类通用名误判
      if (hits > detectedHits) { detectedHits = hits; detected = sys; }
    }

    // 把识别到的体系的全部映射变量也读进来（它们可能不在通道 A 的结果里）
    if (detected) {
      Object.keys(detected.map).forEach(function (role) {
        detected.map[role].forEach(function (n) {
          if (all[n] === undefined) {
            var v = liveValue(n);
            if (v) all[n] = v;
          }
        });
      });
    }
    keys = Object.keys(all);

    // ---- 通用语义打分 ----
    // 体系未识别时用这套。不认具体名字，只按"语义词 + 角色词"组合打分，
    // 因此对没见过的自研体系同样有效。
    var ROLE = {
      brand:         { need: [/primary|brand|accent|theme/], plus: [/bg|background|fill|main|6$|500$|emphasis/], minus: [/hover|active|disabled|focus|light|lighter|dark|darker|shadow|border|text|fg|on-|contrast|alpha|\d{2,}$/] },
      text:          { need: [/text|fg|foreground|font|ink|content/], plus: [/default|primary|base|1$|0$|body|heading|strong/], minus: [/secondary|tertiary|muted|subtle|disabled|placeholder|invert|inverse|link|white|on-|hover|active|2$|3$|4$/] },
      textSecondary: { need: [/text|fg|foreground|ink|content/], plus: [/secondary|muted|subtle|weak|tertiary|2$|3$/], minus: [/primary|default|disabled|placeholder|invert|inverse|link|0$|1$|on-/] },
      bgCard:        { need: [/bg|background|surface|canvas|card|paper|container/], plus: [/default|base|card|paper|white|1$|2$|elevated|container/], minus: [/hover|active|disabled|overlay|mask|inverse|invert|dark|muted|subtle|fill|shadow|image|gradient/] },
      bgSubtle:      { need: [/bg|background|surface|fill|canvas/], plus: [/subtle|muted|secondary|weak|tertiary|fill|2$|3$|inset/], minus: [/default|primary|hover|active|disabled|overlay|mask|inverse|0$/] },
      border:        { need: [/border|divider|outline|stroke|separator/], plus: [/default|base|color|1$|2$|primary/], minus: [/hover|active|focus|disabled|error|danger|warning|success|radius|width|style|top|left|right|bottom|inverse|strong/] },
      radius:        { need: [/radius|rounded|corner/], plus: [/default|base|medium|md|2$|sm/], minus: [/none|full|circle|pill|max|999|9999|top|left|right|bottom|large|xl/] }
    };

    function scoreKey(key, rule) {
      var k = key.toLowerCase();
      var i;
      var hitNeed = false;
      for (i = 0; i < rule.need.length; i++) if (rule.need[i].test(k)) { hitNeed = true; break; }
      if (!hitNeed) return -1;
      for (i = 0; i < rule.minus.length; i++) if (rule.minus[i].test(k)) return -1;
      var sc = 10;
      for (i = 0; i < rule.plus.length; i++) if (rule.plus[i].test(k)) sc += 5;
      // 层级越浅越可能是根 token（--color-text 优于 --table-header-color-text）
      sc -= k.split('-').filter(Boolean).length;
      return sc;
    }

    function pickByRole(role, validator) {
      var rule = ROLE[role];
      if (!rule) return null;
      var best = null, bestScore = 0;
      for (var i = 0; i < keys.length; i++) {
        var val = all[keys[i]];
        if (validator && !validator(val)) continue;
        var sc = scoreKey(keys[i], rule);
        if (sc > bestScore) { bestScore = sc; best = { name: keys[i], value: val, score: sc }; }
      }
      return best;
    }

    function fromSystem(role, validator) {
      if (!detected) return null;
      var cands = detected.map[role] || [];
      for (var i = 0; i < cands.length; i++) {
        var v = all[cands[i]];
        if (v !== undefined && (!validator || validator(v))) {
          return { name: cands[i], value: normalizeColorVal(v), via: detected.name };
        }
      }
      return null;
    }

    // ---- 角色合理性校验 ----
    // 语义打分只看名字，名字对了值也可能荒谬（实测 Vercel 反推出 brand=#444 灰、
    // border=#000 纯黑；Linear/Notion 的 primary 与 secondary 撞成同一个值）。
    // 所以每个角色再按"值本身像不像这个角色"过一遍，不合格就丢弃，
    // 宁可留空走兜底，也不要输出一个错的规范。
    var pgLum = (function () {
      var c = rgbOf(cs(document.body).backgroundColor) || rgbOf(cs(document.documentElement).backgroundColor);
      return c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) : 255;
    })();
    var isDarkPage = pgLum < 128;

    function sanityOk(role, val) {
      var v = normalizeColorVal(val);
      if (role === 'radius') return true;
      var c = rgbOf(v);
      if (!c) return false;
      var lum = lumOf(v, pgLum);
      var sat = (function () {
        var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
        if (mx === mn) return 0;
        var d = mx - mn;
        return l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      })();

      if (role === 'brand') {
        // 主色通常有色相；但存在纯粹黑白灰设计语言的站点
        // （实测 Vercel 全站无任何彩色按钮/链接，主按钮就是纯黑底白字），
        // 这类站点的"主色"本就是中性色，不能一概判错。
        // 所以只排除明显不可能的：接近页面底色（会看不见）或极端过曝。
        if (sat >= 0.15) return lum > 20 && lum < 240;
        return Math.abs(lum - pgLum) >= 45;
      }
      if (role === 'text') {
        // 主文字要与背景有足够对比，且不能是高饱和彩色（那通常是链接或强调色）
        return Math.abs(lum - pgLum) >= 55 && sat < 0.5;
      }
      if (role === 'textSecondary') {
        // 次要文字：对比度存在但弱于主文字，且必须近中性
        var d = Math.abs(lum - pgLum);
        return d >= 12 && d < 200 && sat < 0.35;
      }
      if (role === 'bgCard' || role === 'bgSubtle') {
        // 表面色应与页面同明暗方向，不能是纯黑/纯白反向值
        return isDarkPage ? lum < 140 : lum > 120;
      }
      if (role === 'border') {
        // 边框应是低饱和、且不能是与背景对比极强的纯黑/纯白
        return sat < 0.35 && Math.abs(lum - pgLum) < 170;
      }
      return true;
    }

    function resolve(role, validator) {
      var cands = [fromSystem(role, validator), pickByRole(role, validator)];
      for (var i = 0; i < cands.length; i++) {
        var r = cands[i];
        if (!r) continue;
        r.value = normalizeColorVal(r.value);
        if (!sanityOk(role, r.value)) { r.rejected = true; continue; }
        return r;
      }
      return null;
    }

    var mapped = {
      brand: resolve('brand', isColorish),
      text: resolve('text', isColorish),
      textSecondary: resolve('textSecondary', isColorish),
      bgCard: resolve('bgCard', isColorish),
      bgSubtle: resolve('bgSubtle', isColorish),
      border: resolve('border', isColorish),
      radius: resolve('radius', isLenVal)
    };

    // 角色互斥：同一个色值不能既当主文字又当次要文字（实测 Linear / Notion 都撞车了）。
    // 层级本身就是靠"不同"来表达的，撞车说明其中一个是错的，宁可留空。
    function sameColor(a, b) {
      if (!a || !b) return false;
      var x = rgbOf(a), y = rgbOf(b);
      if (!x || !y) return String(a) === String(b);
      return x[0] === y[0] && x[1] === y[1] && x[2] === y[2] && Math.abs(alphaOf(a) - alphaOf(b)) < 0.02;
    }
    if (mapped.text && mapped.textSecondary && sameColor(mapped.text.value, mapped.textSecondary.value)) {
      mapped.textSecondary = null;
    }
    if (mapped.bgCard && mapped.bgSubtle && sameColor(mapped.bgCard.value, mapped.bgSubtle.value)) {
      mapped.bgSubtle = null;
    }
    // 主色不该等于主文字色
    if (mapped.brand && mapped.text && sameColor(mapped.brand.value, mapped.text.value)) {
      mapped.brand = null;
    }

    // 用命中的原生 token 覆盖反推结果
    var applied = [];
    function apply(key, target, field) {
      var m = mapped[key];
      if (!m) return;
      var old = target[field];
      if (old === m.value) return;
      target[field] = m.value;
      applied.push(field + ': ' + (old || 'null') + ' → ' + m.value +
        '（' + (m.via ? m.via + ' 官方 token ' : '语义匹配 ') + m.name + '）');
    }
    apply('brand', DS.brand, 'primary');
    apply('text', DS.textColors, 'primary');
    apply('textSecondary', DS.textColors, 'secondary');
    apply('bgCard', DS.surfaces, 'card');
    apply('bgSubtle', DS.surfaces, 'subtle');
    apply('border', DS.surfaces, 'border');

    // 反推值也必须过合理性校验。
    // 原生 token 通道没命中时，输出的就是反推值；若它本身荒谬（如 brand 是灰色、
    // border 是纯黑），不拦住等于把错的规范当成对的交出去。
    var rejected = [];
    function guard(target, field, role, label) {
      var v = target[field];
      if (v === null || v === undefined) return;
      if (sanityOk(role, v)) return;
      target[field] = null;
      rejected.push(label + ' 反推值 ' + v + ' 不符合「' + role + '」特征，已置空改走兜底');
    }
    guard(DS.brand, 'primary', 'brand', '主色');
    guard(DS.textColors, 'primary', 'text', '主文字');
    guard(DS.textColors, 'secondary', 'textSecondary', '次要文字');
    guard(DS.surfaces, 'border', 'border', '边框');

    // 反推链路同样要防层级撞车
    if (DS.textColors.primary && DS.textColors.secondary &&
        sameColor(DS.textColors.primary, DS.textColors.secondary)) {
      DS.textColors.secondary = null;
      rejected.push('次要文字与主文字同色，已置空（层级需可区分）');
    }

    return {
      scannedVars: keys.length,
      truncated: count >= VAR_CAP,
      stylesheets: sheetStat,
      system: detected ? detected.name : null,
      systemProbeHits: detectedHits,
      matchedVia: detected
        ? '已识别 ' + detected.name + '，优先用其官方 token'
        : '未识别到已知体系，使用通用语义打分',
      matched: mapped,
      applied: applied,
      rejected: rejected,
      note: applied.length
        ? '已用站点原生 token 覆盖反推值（原生声明更权威）'
        : (keys.length ? '未匹配到语义明确的原生 token，沿用反推值' : '站点未声明相关 CSS 变量')
    };
  })();

  // ============ 8.5 一致性对齐（必须在生成 CSS 之前）============
  // 问题：token 层由统计众数得出，组件层由单个真实元素得出，两者可能冲突
  // （实测 antd：token radiusButton=4px，而真实主按钮 borderRadius=6px）。
  // 冲突会让注入内容自身风格不统一，所以以"真实组件"为权威来源覆盖 token。
  DS.reconciled = (function () {
    var log = [];
    var c = DS.components;

    function align(tokenPath, compVal, label) {
      if (!compVal) return;
      var parts = tokenPath.split('.');
      var obj = DS, i;
      for (i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      var key = parts[parts.length - 1];
      var old = obj[key];
      var norm = (function () {
        var p = String(compVal).trim().split(/\s+/);
        var uniq = p.filter(function (v, idx, a) { return a.indexOf(v) === idx; });
        return uniq.length === 1 ? uniq[0] : null;
      })();
      if (!norm || norm.indexOf('%') > -1) return;
      if (parseFloat(norm) <= 0) return;    // 0px 不是有效圆角规格，别用它覆盖已有 token
      if (old !== norm) {
        obj[key] = norm;
        log.push(label + ': ' + (old || 'null') + ' → ' + norm + '（以真实组件为准）');
      }
    }

    if (c.buttonPrimary) align('shape.radiusButton', c.buttonPrimary.borderRadius, 'radiusButton');
    if (c.overlay) align('shape.radiusOverlay', c.overlay.borderRadius, 'radiusOverlay');
    if (c.card) align('shape.radiusCard', c.card.borderRadius, 'radiusCard');
    // 输入框：只有形状正常（非胶囊）时才用它对齐 token
    if (c.input) {
      var ih = parseFloat(c.input.height) || 0;
      var ir = parseFloat(c.input.borderRadius) || 0;
      if (!(ih && ir >= ih / 2 - 1)) align('shape.radiusInput', c.input.borderRadius, 'radiusInput');
      else log.push('radiusInput: 忽略胶囊形输入框（' + c.input.borderRadius + '），非常规规格');
    }
    // 浮层阴影以真实浮层为准
    if (c.overlay && c.overlay.boxShadow && !DS.shape.shadowOverlay) {
      DS.shape.shadowOverlay = c.overlay.boxShadow;
      log.push('shadowOverlay: 取自真实浮层组件');
    }

    return { adjustments: log, note: log.length ? '已对齐 token 与真实组件' : 'token 与组件本就一致' };
  })();

  // ============ 9. 生成可直接注入的 CSS（关键产出）============
  // 注入脚本只准 var(--pfh-*) 和 .pfh-* 类，不准写字面量。
  // 这样"照站点规范写"就从口头要求变成了机制约束。
  DS.cssText = (function () {
    var b = DS.brand, t = DS.textColors, sf = DS.surfaces, ty = DS.typography,
        sp = DS.spacing, sh = DS.shape, c = DS.components;

    function v(val, fallback) { return (val === null || val === undefined || val === '') ? fallback : val; }
    var grid = sp.baseGrid || 4;

    var lines = [];
    lines.push('/* Design tokens extracted from ' + location.host + ' — 由 design-system.js 自动生成，勿手改字面量 */');
    lines.push(':root {');
    lines.push('  --pfh-brand: ' + v(b.primary, '#3370FF') + ';');
    lines.push('  --pfh-text: ' + v(t.primary, '#1D2129') + ';');
    lines.push('  --pfh-text-secondary: ' + v(t.secondary, '#646A73') + ';');
    lines.push('  --pfh-text-tertiary: ' + v(t.tertiary, v(t.secondary, '#8F959E')) + ';');
    lines.push('  --pfh-bg-page: ' + v(sf.page, '#FFFFFF') + ';');
    lines.push('  --pfh-bg-card: ' + v(sf.card, '#FFFFFF') + ';');
    lines.push('  --pfh-bg-subtle: ' + v(sf.subtle, '#F7F8FA') + ';');
    lines.push('  --pfh-border: ' + v(sf.border, '#E5E6EB') + ';');
    lines.push('  --pfh-border-width: ' + v(sf.borderWidth, '1px') + ';');
    lines.push('  --pfh-font: ' + v(ty.fontFamily, 'inherit') + ';');
    lines.push('  --pfh-font-size: ' + v(ty.base.fontSize, '14px') + ';');
    lines.push('  --pfh-font-size-sm: ' + v(ty.small, '12px') + ';');
    lines.push('  --pfh-line-height: ' + v(ty.base.lineHeight, '1.5') + ';');
    lines.push('  --pfh-radius-button: ' + v(sh.radiusButton, '6px') + ';');
    lines.push('  --pfh-radius-input: ' + v(sh.radiusInput, '6px') + ';');
    lines.push('  --pfh-radius-card: ' + v(sh.radiusCard, '8px') + ';');
    lines.push('  --pfh-radius-overlay: ' + v(sh.radiusOverlay, v(sh.radiusCard, '10px')) + ';');
    lines.push('  --pfh-shadow-overlay: ' + v(sh.shadowOverlay, '0 6px 24px rgba(0,0,0,0.12)') + ';');
    lines.push('  --pfh-space-1: ' + grid + 'px;');
    lines.push('  --pfh-space-2: ' + (grid * 2) + 'px;');
    lines.push('  --pfh-space-3: ' + (grid * 3) + 'px;');
    lines.push('  --pfh-space-4: ' + (grid * 4) + 'px;');
    lines.push('}');
    lines.push('');

    // 组件类：直接复刻真实组件的成套样式
    lines.push('/* 组件类：复刻站点真实组件，注入内容直接套用这些 class */');
    lines.push('.pfh-surface {');
    lines.push('  background: var(--pfh-bg-card);');
    lines.push('  border: var(--pfh-border-width) solid var(--pfh-border);');
    lines.push('  border-radius: var(--pfh-radius-overlay);');
    lines.push('  box-shadow: var(--pfh-shadow-overlay);');
    lines.push('  font-family: var(--pfh-font);');
    lines.push('  font-size: var(--pfh-font-size);');
    lines.push('  line-height: var(--pfh-line-height);');
    lines.push('  color: var(--pfh-text);');
    lines.push('  box-sizing: border-box;');
    lines.push('}');

    if (c.buttonPrimary) {
      lines.push('.pfh-btn-primary {');
      lines.push('  font-family: var(--pfh-font);');
      lines.push('  font-size: ' + c.buttonPrimary.fontSize + ';');
      lines.push('  font-weight: ' + c.buttonPrimary.fontWeight + ';');
      lines.push('  color: ' + c.buttonPrimary.color + ';');
      lines.push('  background: ' + c.buttonPrimary.background + ';');
      lines.push('  padding: ' + c.buttonPrimary.padding + ';');
      lines.push('  border-radius: ' + c.buttonPrimary.borderRadius + ';');
      lines.push('  border: ' + c.buttonPrimary.border + ';');
      if (c.buttonPrimary.transition) lines.push('  transition: ' + c.buttonPrimary.transition + ';');
      lines.push('  cursor: pointer;');
      lines.push('}');
    }
    if (c.buttonSecondary) {
      lines.push('.pfh-btn-secondary {');
      lines.push('  font-family: var(--pfh-font);');
      lines.push('  font-size: ' + c.buttonSecondary.fontSize + ';');
      lines.push('  font-weight: ' + c.buttonSecondary.fontWeight + ';');
      lines.push('  color: ' + c.buttonSecondary.color + ';');
      lines.push('  background: ' + c.buttonSecondary.background + ';');
      lines.push('  padding: ' + c.buttonSecondary.padding + ';');
      lines.push('  border-radius: ' + c.buttonSecondary.borderRadius + ';');
      lines.push('  border: ' + c.buttonSecondary.border + ';');
      lines.push('  cursor: pointer;');
      lines.push('}');
    }
    if (c.input) {
      // 输入框可能取到搜索框这类特例（透明底、胶囊圆角、给图标预留的超大左内边距）。
      // 直接照抄会让注入的输入框畸形，所以异常值回退到 token。
      var ih = parseFloat(c.input.height) || 0;
      var irad = parseFloat(c.input.borderRadius) || 0;
      var pillish = ih && irad >= ih / 2 - 1;
      var pads = String(c.input.padding).trim().split(/\s+/).map(parseFloat);
      var lopsided = pads.length === 4 && Math.abs(pads[1] - pads[3]) > 8;   // 左右内边距差异过大
      var transparent = alphaOf(c.input.background) < 0.1 ||
                        String(c.input.background).indexOf('rgba(0, 0, 0, 0)') > -1;

      lines.push('.pfh-input {');
      lines.push('  font-family: var(--pfh-font);');
      lines.push('  font-size: ' + c.input.fontSize + ';');
      lines.push('  color: var(--pfh-text);');
      lines.push('  background: ' + (transparent ? 'var(--pfh-bg-card)' : c.input.background) + ';');
      lines.push('  padding: ' + (lopsided ? '0 var(--pfh-space-3)' : c.input.padding) + ';');
      lines.push('  border-radius: ' + (pillish ? 'var(--pfh-radius-input)' : c.input.borderRadius) + ';');
      lines.push('  border: ' + (c.input.border === 'none'
        ? 'var(--pfh-border-width) solid var(--pfh-border)' : c.input.border) + ';');
      if (ih) lines.push('  height: ' + c.input.height + ';');
      lines.push('  box-sizing: border-box;');
      lines.push('}');
    }
    lines.push('.pfh-text-secondary { color: var(--pfh-text-secondary); font-size: var(--pfh-font-size-sm); }');
    lines.push('.pfh-divider { height: var(--pfh-border-width); background: var(--pfh-border); border: 0; }');

    return lines.join('\n');
  })();

  // ============ 10. 置信度：哪些 token 是真实提取、哪些是兜底默认 ============
  // 目的是让使用者知道哪几项不可信、需要人工确认，而不是把默认值当成站点规范
  DS.confidence = (function () {
    var checks = {
      brand: !!DS.brand.primary,
      textPrimary: !!DS.textColors.primary,
      textSecondary: !!DS.textColors.secondary,
      border: !!DS.surfaces.border,
      subtleBg: !!DS.surfaces.subtle,
      baseGrid: !!DS.spacing.baseGrid,
      radiusButton: !!DS.shape.radiusButton,
      radiusOverlay: !!DS.shape.radiusOverlay,
      shadowOverlay: !!DS.shape.shadowOverlay,
      buttonPrimary: !!DS.components.buttonPrimary,
      input: !!DS.components.input,
      overlay: !!DS.components.overlay,
      nativeVars: Object.keys(DS.nativeVars.tokens).length > 0
    };
    var got = Object.keys(checks).filter(function (k) { return checks[k]; });
    var missing = Object.keys(checks).filter(function (k) { return !checks[k]; });
    var notes = [];
    if (missing.length) {
      notes.push('以下项未提取到、用了兜底默认值，注入前需人工确认或改用其他锚点：' + missing.join(', '));
    }
    // 页面未就绪时分数不可信，必须显式提示重跑，否则会拿着错误 token 继续
    if (!DS.readiness.ready) {
      notes.push('页面未完全就绪（' + DS.readiness.issues.join('；') + '），本次结果不可信，建议重跑');
    }
    return {
      extracted: got,
      fellBackToDefault: missing,
      score: Math.round(got.length / Object.keys(checks).length * 100) + '%',
      trustworthy: DS.readiness.ready && missing.length <= 3,
      note: notes.length ? notes.join(' | ') : '全部 token 均来自页面真实元素'
    };
  })();

  DS.meta = { url: location.href, host: location.host, scannedAt: new Date().toISOString() };

  window.__uiDS = DS;
  try {
    if (!DS.readiness.ready) {
      console.warn('%c[Design System] ⚠️ 页面可能未就绪，token 未必准确', 'color:#FF7D00;font-weight:bold');
      DS.readiness.issues.forEach(function (i) { console.warn('  · ' + i); });
      console.warn('  ' + DS.readiness.advice);
    }
    console.log('%c[Design System] 提取完成 ' + DS.confidence.score, 'color:#3370FF;font-weight:bold');
    console.log(DS);
    if (DS.nativeMapped.applied.length) {
      console.log('%c已用站点原生 token 覆盖反推值：', 'color:#00A870');
      DS.nativeMapped.applied.forEach(function (a) { console.log('  · ' + a); });
    }
    if (DS.confidence.fellBackToDefault.length) {
      console.warn('%c以下项用了兜底默认值，不代表站点规范：' + DS.confidence.fellBackToDefault.join(', '), 'color:#FF7D00');
    }
    console.log('%c--- 可直接注入的 CSS ---', 'color:#646A73');
    console.log(DS.cssText);
    console.log('%c复制 CSS：copy(window.__uiDS.cssText)', 'color:#646A73');
  } catch (e) {}

  return DS;
})();
