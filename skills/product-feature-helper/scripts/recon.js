/*
 * recon.js — 目标页面 UI 侦察脚本（只读，不修改页面）
 *
 * 用途：注入改动前，先把页面的框架、设计 token、组件库、字体、危险区域全量摸清，
 *      让后续注入的样式能贴合原站视觉，并避开会崩页面的雷区。
 *
 * 两种运行方式（都必须在**浏览器页面上下文**里执行）：
 *   A) Browser Use 内：bu.js(<本文件内容>)，返回值是结构化对象
 *   B) 让用户在 Console 手动跑：整段粘贴，结果会 console.log 出来，
 *      同时挂在 window.__uiRecon 上，可让用户复制 JSON 回传
 *
 * ⚠️ 不能用 `node recon.js` 运行：它读的是真实页面的 DOM 与 computed style，
 *    Node 里没有 document，只会报 `document is not defined`。
 *
 * 输出字段说明见 references/recon-guide.md
 */
(function () {
  'use strict';

  // 环境守卫：错误的运行方式给出可操作指引，而不是抛一句 document is not defined
  if (typeof document === `undefined`) {
    var msg = [
      `[pfh] recon.js 必须在浏览器页面上下文里运行，不能用 node 执行。`,
      `正确做法（二选一）：`,
      `  1. Browser Use：bu.js(<本文件内容>)`,
      `  2. 让用户在目标页面 F12 → Console 整段粘贴运行`,
      `原因：本脚本读取真实页面的 DOM 与 computed style，Node 环境没有 document。`
    ].join(`\n`);
    if (typeof console !== `undefined`) console.error(msg);
    throw new Error(`recon.js must run in a browser page context, not Node`);
  }

  var out = {};

  // ---------- 1. 框架识别（决定注入策略：CSS 覆盖 vs DOM 改写）----------
  function detectFrameworks() {
    var fw = [];
    var html = document.documentElement;

    // React：查找 __reactContainer / __reactFiber 属性
    var hasReact = !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    if (!hasReact) {
      var all = document.querySelectorAll('body *');
      for (var i = 0; i < Math.min(all.length, 400); i++) {
        var keys = Object.keys(all[i]);
        for (var k = 0; k < keys.length; k++) {
          if (keys[k].indexOf('__reactFiber') === 0 || keys[k].indexOf('__reactProps') === 0 ||
              keys[k].indexOf('__reactContainer') === 0) { hasReact = true; break; }
        }
        if (hasReact) break;
      }
    }
    if (hasReact) fw.push('React');

    if (window.__VUE__ || html.querySelector('[data-v-app]') || document.querySelector('[data-v-app]')) fw.push('Vue3');
    if (window.Vue || document.querySelector('[data-server-rendered]')) fw.push('Vue2');
    if (window.ng || document.querySelector('[ng-version]')) {
      var ngEl = document.querySelector('[ng-version]');
      fw.push('Angular' + (ngEl ? ' ' + ngEl.getAttribute('ng-version') : ''));
    }
    if (window.__svelte || document.querySelector('.svelte-hash')) fw.push('Svelte');
    if (window.__NEXT_DATA__) fw.push('Next.js');
    if (window.__NUXT__) fw.push('Nuxt');
    if (window.jQuery || window.$) fw.push('jQuery' + (window.jQuery && window.jQuery.fn ? ' ' + window.jQuery.fn.jquery : ''));

    return fw.length ? fw : ['未识别（可能是原生 JS / SSR 静态页）'];
  }
  out.frameworks = detectFrameworks();

  // ---------- 2. CSS 变量（设计 token）：注入时优先复用这些变量而非硬编码色值 ----------
  function collectCssVars() {
    var vars = {};
    var sheets = document.styleSheets;
    for (var s = 0; s < sheets.length; s++) {
      var rules;
      try { rules = sheets[s].cssRules || sheets[s].rules; } catch (e) { continue; } // 跨域样式表读不到，跳过
      if (!rules) continue;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        if (!rule.style) continue;
        for (var p = 0; p < rule.style.length; p++) {
          var prop = rule.style[p];
          if (prop && prop.indexOf('--') === 0) {
            var val = rule.style.getPropertyValue(prop).trim();
            if (val && !vars[prop]) vars[prop] = val;
          }
        }
      }
    }
    // 补充 :root 上真实生效的值
    var rootStyle = getComputedStyle(document.documentElement);
    Object.keys(vars).forEach(function (k) {
      var live = rootStyle.getPropertyValue(k).trim();
      if (live) vars[k] = live;
    });
    return vars;
  }
  var cssVars = collectCssVars();
  out.cssVarCount = Object.keys(cssVars).length;
  // 只回传疑似设计 token 的变量，避免输出爆炸
  out.designTokens = (function () {
    var picked = {};
    var interesting = /(color|bg|background|text|border|primary|brand|success|warn|danger|error|fill|font|radius|shadow|space|gap|size)/i;
    Object.keys(cssVars).forEach(function (k) {
      if (interesting.test(k)) picked[k] = cssVars[k];
    });
    return picked;
  })();

  // ---------- 3. 组件库指纹：命中后按其类名前缀写覆盖样式，视觉才统一 ----------
  function detectComponentLibs() {
    var libs = [];
    var probes = [
      ['Ant Design',        '[class^="ant-"], [class*=" ant-"]'],
      ['Element Plus/UI',   '[class^="el-"], [class*=" el-"]'],
      ['Arco Design',       '[class^="arco-"], [class*=" arco-"]'],
      ['Semi Design',       '[class^="semi-"], [class*=" semi-"]'],
      ['TDesign',           '[class^="t-"], [class*=" t-"]'],
      ['Material UI',       '[class^="Mui"], [class*=" Mui"]'],
      ['Bootstrap',         '.btn-primary, .container-fluid, .navbar'],
      ['Chakra UI',         '[class^="chakra-"]'],
      ['Vuetify',           '[class^="v-"][class*="theme--"], .v-application'],
      ['Tailwind CSS',      '[class*="flex"][class*="items-center"], [class*="px-"][class*="py-"]']
    ];
    probes.forEach(function (pair) {
      var n = 0;
      try { n = document.querySelectorAll(pair[1]).length; } catch (e) { return; }
      if (n > 0) libs.push({ name: pair[0], nodeCount: n });
    });
    libs.sort(function (a, b) { return b.nodeCount - a.nodeCount; });
    return libs;
  }
  out.componentLibs = detectComponentLibs();

  // ---------- 4. CSS Modules / 类名哈希模式：判断类名是否可作为稳定选择器 ----------
  out.classNamePattern = (function () {
    var samples = [], seen = 0;
    var els = document.querySelectorAll('body *[class]');
    for (var i = 0; i < els.length && samples.length < 12; i += Math.max(1, Math.floor(els.length / 60))) {
      var cn = els[i].className;
      if (typeof cn !== 'string' || !cn.trim()) continue;
      seen++;
      cn.trim().split(/\s+/).forEach(function (c) {
        if (samples.length < 12 && /__|--|_[A-Za-z0-9]{5}$/.test(c)) samples.push(c);
      });
    }
    var hashed = samples.filter(function (c) { return /_[A-Za-z0-9]{5,}$/.test(c); });
    return {
      samples: samples.slice(0, 12),
      looksHashed: hashed.length > 0,
      // 关键提示：哈希类名会随构建变化，别写死在长期脚本里
      note: hashed.length > 0
        ? 'CSS Modules 哈希类名，构建后会变；选择器优先用文本/结构/data 属性定位'
        : '类名较稳定，可直接用作选择器'
    };
  })();

  // ---------- 5. 排版与色彩基线：注入组件要沿用这些值才不突兀 ----------
  out.typography = (function () {
    var b = getComputedStyle(document.body);
    var h = document.querySelector('h1, h2, [class*="title"]');
    return {
      bodyFontFamily: b.fontFamily,
      bodyFontSize: b.fontSize,
      bodyColor: b.color,
      bodyBackground: b.backgroundColor,
      headingFontSize: h ? getComputedStyle(h).fontSize : null,
      headingFontWeight: h ? getComputedStyle(h).fontWeight : null
    };
  })();

  out.palette = (function () {
    // 统计页面实际高频用色，作为注入配色的依据
    var counter = {};
    var els = document.querySelectorAll('body *');
    var step = Math.max(1, Math.floor(els.length / 500));
    for (var i = 0; i < els.length; i += step) {
      var cs = getComputedStyle(els[i]);
      [cs.color, cs.backgroundColor, cs.borderTopColor].forEach(function (c) {
        if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return;
        counter[c] = (counter[c] || 0) + 1;
      });
    }
    return Object.keys(counter)
      .map(function (c) { return { color: c, count: counter[c] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 14);
  })();

  out.radiusAndShadow = (function () {
    var radii = {}, shadows = {};
    var els = document.querySelectorAll('button, [class*="card"], [class*="btn"], [class*="modal"], input');
    for (var i = 0; i < Math.min(els.length, 120); i++) {
      var cs = getComputedStyle(els[i]);
      if (cs.borderRadius && cs.borderRadius !== '0px') radii[cs.borderRadius] = (radii[cs.borderRadius] || 0) + 1;
      if (cs.boxShadow && cs.boxShadow !== 'none') shadows[cs.boxShadow] = (shadows[cs.boxShadow] || 0) + 1;
    }
    function top(o, n) {
      return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).slice(0, n);
    }
    return { commonRadius: top(radii, 5), commonShadow: top(shadows, 3) };
  })();

  // ---------- 6. z-index 天花板：注入的浮层必须高于它才不会被盖住 ----------
  out.maxZIndex = (function () {
    var max = 0, holder = null;
    var els = document.querySelectorAll('body *');
    for (var i = 0; i < els.length; i++) {
      var z = parseInt(getComputedStyle(els[i]).zIndex, 10);
      if (!isNaN(z) && z > max) { max = z; holder = els[i]; }
    }
    return {
      value: max,
      holderClass: holder ? String(holder.className).slice(0, 80) : null,
      suggestForInjection: max + 1000
    };
  })();

  // ---------- 7. 危险区域：这些地方直接改 DOM 会崩页面（真实踩坑记录）----------
  out.dangerZones = (function () {
    var zones = [];

    // 富文本编辑器：Slate / ProseMirror / Quill / CodeMirror / Monaco / TinyMCE
    // 它们维护独立的内部文档模型，外部直接写 DOM 会导致模型与视图不一致 → 整页崩溃
    var editorProbes = [
      ['Slate',       '[data-slate-editor], [data-slate-node]'],
      ['ProseMirror', '.ProseMirror'],
      ['Quill',       '.ql-editor'],
      ['CodeMirror',  '.CodeMirror, .cm-editor'],
      ['Monaco',      '.monaco-editor'],
      ['TinyMCE',     '.tox-tinymce, .mce-content-body'],
      ['Draft.js',    '[data-contents="true"]'],
      ['Lexical',     '[data-lexical-editor]']
    ];
    editorProbes.forEach(function (p) {
      var n = 0;
      try { n = document.querySelectorAll(p[1]).length; } catch (e) { return; }
      if (n) zones.push({
        type: 'rich-text-editor', name: p[0], selector: p[1], nodeCount: n,
        risk: 'CRITICAL',
        rule: '禁止用代码写入内容/改其子 DOM。只允许 focus() 或 navigator.clipboard.writeText() + 让用户手动粘贴'
      });
    });

    // 任意 contenteditable 也按富文本对待
    var ce = document.querySelectorAll('[contenteditable="true"]');
    if (ce.length) zones.push({
      type: 'contenteditable', selector: '[contenteditable="true"]', nodeCount: ce.length,
      risk: 'HIGH',
      rule: '可能由框架托管，不要直接 innerHTML/insertText 写入'
    });

    // 虚拟滚动列表：往里插入/删除节点会打乱其高度与索引计算 → 布局崩坏
    var virtualProbes = [
      '[class*="virtual"]', '[class*="rc-virtual"]', '[class*="ReactVirtualized"]',
      '[class*="vue-recycle"]', '[data-virtuoso-scroller]', '[class*="infinite"]'
    ];
    var vFound = [];
    virtualProbes.forEach(function (sel) {
      var n = 0;
      try { n = document.querySelectorAll(sel).length; } catch (e) { return; }
      if (n) vFound.push({ selector: sel, nodeCount: n });
    });
    if (vFound.length) zones.push({
      type: 'virtual-list', matches: vFound, risk: 'CRITICAL',
      rule: '禁止向其中插入/删除 DOM 节点。需要展示新条目时另建独立容器（挂 body 下）'
    });

    // canvas / WebGL：无 DOM 可改
    var canvases = document.querySelectorAll('canvas');
    if (canvases.length) zones.push({
      type: 'canvas', nodeCount: canvases.length, risk: 'MEDIUM',
      rule: '内容非 DOM，无法用 CSS/DOM 改动；只能在其上层叠加覆盖物'
    });

    // Shadow DOM：外部样式表默认穿不进去
    var shadowHosts = 0;
    var allEls = document.querySelectorAll('body *');
    for (var i = 0; i < allEls.length; i++) if (allEls[i].shadowRoot) shadowHosts++;
    if (shadowHosts) zones.push({
      type: 'shadow-dom', hostCount: shadowHosts, risk: 'MEDIUM',
      rule: '外部 CSS 无法穿透，需注入到各 shadowRoot 内或使用 ::part()'
    });

    // iframe：跨域 iframe 内部无法注入
    var iframes = document.querySelectorAll('iframe');
    if (iframes.length) {
      var cross = 0;
      for (var f = 0; f < iframes.length; f++) {
        try { if (!iframes[f].contentDocument) cross++; } catch (e) { cross++; }
      }
      zones.push({
        type: 'iframe', total: iframes.length, crossOrigin: cross, risk: cross ? 'HIGH' : 'LOW',
        rule: cross ? '跨域 iframe 内部无法注入，改动只能作用于外层文档' : '同域 iframe 可分别注入'
      });
    }

    return zones;
  })();

  // ---------- 8. CSP：决定 Console 注入是否会被拦 ----------
  out.csp = (function () {
    var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return {
      metaPolicy: meta ? meta.getAttribute('content') : null,
      note: meta ? '存在 CSP meta；若含 style-src 严格策略，注入 <style> 可能被拦，改用元素 inline style'
                 : '未发现 CSP meta（响应头仍可能有，注入被拦时看 Console 报错）'
    };
  })();

  // ---------- 9. 页面骨架：定位注入锚点 ----------
  out.landmarks = (function () {
    var picks = [];
    ['header', 'nav', 'main', 'aside', 'footer', '[role="banner"]', '[role="navigation"]',
     '[role="main"]', '[class*="sidebar"]', '[class*="header"]', '[class*="layout"]'].forEach(function (sel) {
      var el;
      try { el = document.querySelector(sel); } catch (e) { return; }
      if (!el) return;
      var r = el.getBoundingClientRect();
      picks.push({
        selector: sel,
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 70),
        box: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) }
      });
    });
    return picks;
  })();

  out.meta = {
    url: location.href,
    title: document.title,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    domNodeCount: document.querySelectorAll('*').length,
    scannedAt: new Date().toISOString()
  };

  // ---------- 10. 注入策略结论 ----------
  out.strategy = (function () {
    var isFramework = out.frameworks.some(function (f) {
      return /React|Vue|Angular|Svelte|Next|Nuxt/.test(f);
    });
    var hasCritical = out.dangerZones.some(function (z) { return z.risk === 'CRITICAL'; });
    return {
      reRenderRisk: isFramework,
      // 框架页面会重渲染覆盖 DOM 改动，所以样式优先、并用 MutationObserver 兜住
      preferredApproach: isFramework
        ? 'CSS 覆盖优先（!important）；必须改 DOM 时用 MutationObserver 重新应用'
        : 'CSS 覆盖 + 直接 DOM 操作均可',
      mustAvoid: hasCritical
        ? '存在 CRITICAL 危险区（富文本编辑器/虚拟列表），禁止写入其内容或插入子节点'
        : '无 CRITICAL 危险区',
      zIndexFloor: out.maxZIndex.suggestForInjection
    };
  })();

  window.__uiRecon = out;
  try {
    console.log('%c[UI Recon] 侦察完成', 'color:#3370FF;font-weight:bold');
    console.log(out);
    console.log('%c复制完整 JSON：copy(JSON.stringify(window.__uiRecon, null, 2))', 'color:#646A73');
  } catch (e) {}

  return out;
})();
