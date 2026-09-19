/*
 * annotate.js — 截图前的红框标注（第 7 步用）
 *
 * 作用：在页面上叠一层红框 + 序号，把"要看哪里"直接拍进截图里。
 *      比截完再 P 稳：框的位置由元素真实 getBoundingClientRect 决定，不会错位。
 *
 * 与其他脚本的分工：
 *   recon.js        → 能不能改、哪里不能碰
 *   design-system.js → 必须照什么写
 *   annotate.js     → 截图时把关键位置圈出来（只加覆盖层，不动站内 DOM）
 *
 * 用法（Browser Use 里 bu.js 注入后调用）：
 *   __pfhAnnotate([
 *     { text: `更新记录`, label: `1`, note: `点这里进入` },   // 按可见文本找
 *     { selector: `.some-btn`, label: `2` },                  // 按选择器找
 *     { rect: {x:100,y:200,w:180,h:40}, label: `3` }          // 直接给坐标
 *   ]);
 *   __pfhAnnotateClear();   // 清除所有标注
 *
 * 安全性：只在 body 下追加 position:fixed 的覆盖层，pointer-events:none，
 *        不改任何站内元素的 DOM 与样式，清除后页面完全复原。
 */
(function () {
  'use strict';

  if (typeof document === 'undefined') {
    throw new Error('annotate.js must run in a browser page context, not Node');
  }

  var NS = 'pfh-annot';
  var RED = '#F53F3F';

  function clear() {
    document.querySelectorAll('[data-' + NS + ']').forEach(function (n) { n.remove(); });
  }

  /* 按可见文本找元素：优先取最内层命中，避免框住一整个大容器 */
  function findByText(text) {
    var hits = [];
    /*
     * 候选范围要覆盖标题与表格单元格：实测遇到过版本号写在 <h2> 里、
     * 状态值写在 <td> 里，只查 button/a/span/div 会直接漏掉。
     */
    var SEL = 'button, a, [role="button"], [role="tab"], [role="menuitem"], input, label,' +
              ' li, td, th, h1, h2, h3, h4, h5, h6, p, span, div';
    document.querySelectorAll(SEL).forEach(function (el) {
      var t = (el.textContent || '').trim();
      if (t !== text) return;
      var r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      hits.push({ el: el, area: r.width * r.height });
    });
    if (!hits.length) return null;
    hits.sort(function (a, b) { return a.area - b.area; });   // 最小的那个 = 最内层
    return hits[0].el;
  }

  function resolve(item) {
    if (item.rect) return null;                       // 直接给坐标，不需要找元素
    if (item.selector) return document.querySelector(item.selector);
    if (item.text) return findByText(item.text);
    return null;
  }

  function box(r, label, note) {
    var pad = 4;
    var b = document.createElement('div');
    b.setAttribute('data-' + NS, '1');
    b.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'pointer-events:none',
      'border:2px solid ' + RED,
      'border-radius:4px',
      'box-shadow:0 0 0 3px rgba(245,63,63,.18)',
      'left:' + (r.left - pad) + 'px',
      'top:' + (r.top - pad) + 'px',
      'width:' + (r.width + pad * 2) + 'px',
      'height:' + (r.height + pad * 2) + 'px'
    ].join(';');
    document.body.appendChild(b);

    if (label) {
      var tag = document.createElement('div');
      tag.setAttribute('data-' + NS, '1');
      tag.textContent = label;
      tag.style.cssText = [
        'position:fixed',
        'z-index:2147483647',
        'pointer-events:none',
        'background:' + RED,
        'color:#fff',
        'font:600 12px/18px -apple-system,BlinkMacSystemFont,sans-serif',
        'min-width:18px',
        'height:18px',
        'text-align:center',
        'border-radius:9px',
        'padding:0 4px',
        'box-sizing:border-box',
        'left:' + (r.left - pad - 9) + 'px',
        'top:' + (r.top - pad - 9) + 'px'
      ].join(';');
      document.body.appendChild(tag);
    }

    if (note) {
      var n = document.createElement('div');
      n.setAttribute('data-' + NS, '1');
      n.textContent = note;
      var gap = pad + 6;
      /*
       * 先以隐藏状态插入，量出备注的真实宽高，再决定放哪一侧。
       * 实测教训：用估算宽度（如固定 200px）配合 CSS right 定位会算错——
       * 实际渲染宽度往往远小于估算值，导致备注左边缘越过元素、直接压住目标。
       * 放置顺序：右 → 左 → 下 → 上，四个方向都以真实尺寸判断，绝不压在元素身上。
       */
      n.style.cssText = [
        'position:fixed', 'z-index:2147483647', 'pointer-events:none',
        'background:' + RED, 'color:#fff',
        'font:500 12px/16px -apple-system,BlinkMacSystemFont,sans-serif',
        'padding:3px 8px', 'border-radius:4px', 'max-width:200px',
        'white-space:pre-line', 'visibility:hidden', 'left:0', 'top:0'
      ].join(';');
      document.body.appendChild(n);

      var nr = n.getBoundingClientRect();
      var nw = nr.width, nh = nr.height;
      var left, top;
      /*
       * 避让的是红框而不是元素本身：红框比元素四周各大 pad，外面还有 3px 外发光。
       * 实测教训：按元素矩形计算时备注会压在红框上，视觉上仍然挡住目标。
       */
      var GLOW = 3;
      var bL = r.left - pad - GLOW, bR = r.right + pad + GLOW;
      var bT = r.top - pad - GLOW, bB = r.top + r.height + pad + GLOW;

      if (bR + gap + nw <= window.innerWidth - 4) {
        left = bR + gap; top = r.top - pad;
      } else if (bL - gap - nw >= 4) {
        left = bL - gap - nw; top = r.top - pad;
      } else if (bB + gap + nh <= window.innerHeight - 4) {
        left = Math.max(4, bL); top = bB + gap;
      } else {
        left = Math.max(4, bL); top = Math.max(4, bT - gap - nh);
      }
      /* 收进视口，避免贴边被截图裁掉 */
      left = Math.min(left, window.innerWidth - nw - 4);
      n.style.left = left + 'px';
      n.style.top = top + 'px';
      n.style.visibility = 'visible';
    }
  }

  /*
   * 主入口：传入标注项数组。
   * 返回 { items: [...], bbox: {...} }：
   *   items 每项带 found，false 表示没定位到（那一项没有框）
   *   bbox  所有标注（含备注）的包围盒，用于截图后裁剪——
   *         整页截图放进表格单元格会被缩到看不清，按 bbox 裁到重点区域才有意义
   */
  window.__pfhAnnotate = function (items) {
    clear();
    var result = [];
    (items || []).forEach(function (item, i) {
      var label = item.label != null ? String(item.label) : String(i + 1);
      var r;
      if (item.rect) {
        r = { left: item.rect.x, top: item.rect.y, width: item.rect.w, height: item.rect.h,
              right: item.rect.x + item.rect.w };
      } else {
        var el = resolve(item);
        if (!el) { result.push({ label: label, found: false, by: item.selector || item.text || 'rect' }); return; }
        var br = el.getBoundingClientRect();
        /* 元素在视口外时先滚进来，否则框会画在看不见的地方 */
        if (br.top < 0 || br.bottom > window.innerHeight) {
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          br = el.getBoundingClientRect();
        }
        r = { left: br.left, top: br.top, width: br.width, height: br.height, right: br.right };
      }
      box(r, label, item.note);
      result.push({ label: label, found: true, by: item.selector || item.text || 'rect' });
    });

    /* 汇总所有标注元素的包围盒，供裁剪使用 */
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, n = 0;
    document.querySelectorAll('[data-' + NS + ']').forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0) return;
      n++;
      x1 = Math.min(x1, b.left); y1 = Math.min(y1, b.top);
      x2 = Math.max(x2, b.right); y2 = Math.max(y2, b.bottom);
    });
    var bbox = null;
    if (n > 0) {
      var M = 24;   /* 留白，让裁出来的图有上下文，不是贴着框硬切 */
      bbox = {
        x: Math.max(0, Math.round(x1 - M)),
        y: Math.max(0, Math.round(y1 - M)),
        w: Math.round(Math.min(window.innerWidth, x2 + M) - Math.max(0, x1 - M)),
        h: Math.round(Math.min(window.innerHeight, y2 + M) - Math.max(0, y1 - M)),
        viewport: { w: window.innerWidth, h: window.innerHeight },
        dpr: window.devicePixelRatio || 1
      };
    }
    return { items: result, bbox: bbox };
  };

  window.__pfhAnnotateClear = clear;

  return 'annotate.js ready: __pfhAnnotate([...]) / __pfhAnnotateClear()';
})();
