/*
 * injection-template.js — 前端注入脚本骨架
 *
 * 这是给 Agent 用的编写模板，不是成品。
 *
 * ⚠️ 最重要的规则：本模板中所有视觉值都必须来自 design-system.js 提取的 token。
 *   禁止写任何颜色/圆角/间距/字号的字面量。理由：凭感觉写的样式与站点规范不一致，
 *   注入后交互显得割裂——这是本 skill 要解决的核心问题。
 *   具体约束见 references/style-contract.md。
 *
 * 模板已内置的防线都是真实踩坑换来的，不要为了简洁删掉：
 *   1. 幂等清理（重复粘贴不叠加、不重复绑监听器）
 *   2. 监听器统一登记 + 一次性清除（累积的 capture 监听器会互相打架）
 *   3. 命名空间前缀（避免与站内类名冲突、便于整体移除）
 *   4. 富文本编辑器安全写入（剪贴板 + focus，绝不碰内部 DOM）
 *   5. 框架重渲染兜底（MutationObserver 重新套用）
 *   6. 全部用反引号做字符串（避免复制粘贴时直引号被转成弯引号）
 *   7. Top Layer 置顶（z-index 压不过站内 popover/dialog，实测见 safety-rules.md）
 *   8. 站内样式改动可完全恢复（备份原内联值，cleanup 精确还原）
 */
(function () {
  'use strict';

  const NS = `pfh`;          // 命名空间前缀，所有类名/ID 都带上它
  const Z = 999999;          // 取 recon.js 的 maxZIndex.suggestForInjection

  // ============ 0. 注入 Design System token 层（必须最先执行）============
  // 把 design-system.js 输出的 cssText 原样粘贴到下面的 DS_CSS 中。
  // 它定义了 --pfh-* 变量和 .pfh-surface / .pfh-btn-primary 等组件类，
  // 后续所有样式只准引用它们，不准写字面量。
  const DS_CSS = `
/* PFH_DS_PLACEHOLDER —— 这一行是模板身份标记，deliver.sh 靠它识别未填充状态。
   把 design-system.js 输出的 cssText 粘贴到本注释下方后，删掉这一整行注释。
   不要凭印象填默认值：错的规范比没有规范更糟。 */
`;

  // ============ 1. 幂等清理：先彻底移除上一次注入的一切 ============
  // 关键：不只删元素，还要断开旧的 observer 和 document 级监听器。
  // 否则反复粘贴脚本会累积多个 capture 阶段监听器，它们会抢在自身逻辑前执行，
  // 导致「点击关闭反而又被打开」这类诡异开关失灵。
  if (window.__pfhCleanup) {
    try { window.__pfhCleanup(); } catch (e) { console.warn(`[${NS}] cleanup failed`, e); }
  }

  const listeners = [];   // 统一登记，便于一次性摘除
  const observers = [];
  const restores = [];    // 站内样式改动的还原操作（见第 4.5 节）

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push({ target, type, handler, options });
  }

  /*
   * 备份站内元素某个内联样式属性的原值并登记还原，返回备份值。改写由调用方做。
   * 关键：备份的是 style 属性上的原值（可能是空字符串），不是 computed 值——
   * 把 computed 值写回去会将样式表的贡献固化成内联值，等于污染了页面。
   */
  function patchStyle(node, prop) {
    const backup = node.style.getPropertyValue(prop);
    restores.push(() => {
      if (backup) node.style.setProperty(prop, backup);
      else node.style.removeProperty(prop);       // 原本没有内联值就彻底移除
    });
    return backup;
  }

  window.__pfhCleanup = function () {
    listeners.forEach(({ target, type, handler, options }) => {
      try { target.removeEventListener(type, handler, options); } catch (e) {}
    });
    listeners.length = 0;
    observers.forEach((o) => { try { o.disconnect(); } catch (e) {} });
    observers.length = 0;
    // 先还原站内样式改动，再移除自己的节点
    restores.forEach((fn) => { try { fn(); } catch (e) {} });
    restores.length = 0;
    document.querySelectorAll(`[class*="${NS}-"], style[id^="${NS}-"]`).forEach((n) => {
      // Top Layer 里的元素要先收起再删，否则可能留下残影
      try { if (n.hidePopover && n.matches(`:popover-open`)) n.hidePopover(); } catch (e) {}
      try { if (n.tagName === `DIALOG` && n.open) n.close(); } catch (e) {}
      n.remove();
    });
  };

  // ============ 2. 样式注入 ============
  // 框架页面（React/Vue）会重渲染覆盖内联 style，因此样式走独立 <style> 表。
  // 注意：本段只允许用 var(--pfh-*)，任何字面量都是违规。
  const style = document.createElement(`style`);
  style.id = `${NS}-style`;
  style.textContent = DS_CSS + `
    .${NS}-root {
      position: fixed;
      z-index: ${Z};
      box-sizing: border-box;
    }
    /* 复用 .pfh-surface 承载面板外观，不要另写一套背景/边框/阴影 */
    .${NS}-panel {
      padding: var(--pfh-space-3);
      max-width: 320px;
    }
    /* 多行文本必须显式保留换行，否则字符串里的 \\n 会被空白折叠掉 */
    .${NS}-text {
      white-space: pre-line;
      font-size: var(--pfh-font-size-sm);
      line-height: var(--pfh-line-height);
      color: var(--pfh-text-secondary);
    }
    .${NS}-title {
      font-size: var(--pfh-font-size);
      font-weight: 600;
      color: var(--pfh-text);
      margin-bottom: var(--pfh-space-2);
    }
    .${NS}-toast {
      position: fixed;
      z-index: ${Z + 10};
      background: var(--pfh-text);
      color: var(--pfh-bg-card);
      font-size: var(--pfh-font-size-sm);
      padding: var(--pfh-space-2) var(--pfh-space-3);
      border-radius: var(--pfh-radius-button);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
    }
    .${NS}-toast.show { opacity: 1; }
  `;
  document.head.appendChild(style);

  // ============ 3. 工具函数 ============
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    // 用 textContent 而非 innerHTML：避免内容里的特殊字符破坏结构，也更安全
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function toast(msg) {
    const t = el(`div`, `${NS}-toast`, msg);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add(`show`));
    setTimeout(() => {
      t.classList.remove(`show`);
      setTimeout(() => t.remove(), 300);
    }, 2200);
  }

  /*
   * 富文本编辑器安全交互（Slate / ProseMirror / Quill / Lexical 等）
   *
   * 硬规则：绝不用代码写入它们的内容。这类编辑器维护独立的内部文档模型，
   * 外部直接改 DOM 或 insertText 会让模型与视图不一致，整页崩溃（已实测翻车多次，
   * 换写法只能降低概率、无法根治）。
   * 安全替代：复制到剪贴板 + 聚焦输入框，由用户手动 Cmd/Ctrl+V。
   */
  async function sendToEditorSafely(text, editorSelector) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // 剪贴板写入要求真实用户手势，脚本模拟点击时会被浏览器拒绝，属预期行为
      console.warn(`[${NS}] clipboard blocked (needs real user gesture)`, e);
    }
    const editor = document.querySelector(editorSelector);
    if (editor) editor.focus();
    toast(`已复制，去输入框粘贴发送`);
  }

  /*
   * 复用站内原生按钮：比自己模拟一套交互安全得多。
   * 原生按钮内部会用框架自己的方式处理状态，不会破坏内部模型。
   */
  function triggerNativeButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) { btn.click(); return true; }
    console.warn(`[${NS}] native button not found: ${selector}`);
    return false;
  }

  /*
   * 置顶：z-index 只在普通层叠上下文内有效，压不过站内的 popover / dialog.showModal()
   * （它们在浏览器 Top Layer 里）。实测对照表见 references/safety-rules.md。
   *
   * 分层选择：
   *   第 1 档 只写 z-index          —— 绝大多数场景够用（模板默认）
   *   第 2 档 raiseToTopLayer()     —— 被站内 popover 盖住时用，不阻塞页面交互
   *   第 3 档 dialog.showModal()    —— 仅在被站内 modal 遮挡时用，会锁背景交互，慎用
   */
  function raiseToTopLayer(node) {
    // 老浏览器不支持 popover，探测后降级回 z-index，不要直接抛错中断注入
    if (!HTMLElement.prototype.hasOwnProperty(`popover`)) {
      console.warn(`[${NS}] popover 不支持，已降级为 z-index 置顶`);
      return false;
    }
    try {
      node.popover = `manual`;   // manual：不会被 Esc 或点击外部自动关闭
      node.showPopover();
      return true;
    } catch (e) {
      console.warn(`[${NS}] showPopover 失败，降级为 z-index 置顶`, e);
      return false;
    }
  }

  /*
   * 顶部横幅占位：按真实高度动态计算 + 叠加原值 + 可完全恢复。
   * 三个都不能省：写死高度会遮挡或留白；覆盖原值会破坏站内布局；
   * ResizeObserver 里不先还原就会反复累加，把页面越推越远。
   */
  function reserveTopSpace(banner) {
    const target = document.body;
    // 备份 style 属性上的原值（可能是空字符串），并登记还原
    const backup = patchStyle(target, `padding-top`);
    const apply = () => {
      // 每次都先回到备份值再重算，避免在上次结果上累加
      if (backup) target.style.setProperty(`padding-top`, backup);
      else target.style.removeProperty(`padding-top`);
      const base = parseFloat(getComputedStyle(target).paddingTop) || 0;
      const h = banner.offsetHeight;                      // 真实高度，不写死
      target.style.paddingTop = (base + h) + `px`;
    };
    requestAnimationFrame(apply);                          // 等一帧，否则 offsetHeight 为 0
    if (typeof ResizeObserver === `function`) {
      const ro = new ResizeObserver(() => requestAnimationFrame(apply));
      ro.observe(banner);
      observers.push(ro);
    }
  }

  // ============ 4. 业务实现（按需替换）============
  // 注意 className 同时挂上 pfh-surface：外观直接继承站点规范
  const root = el(`div`, `${NS}-root ${NS}-panel pfh-surface`);
  root.style.right = `var(--pfh-space-4)`;
  root.style.bottom = `var(--pfh-space-4)`;
  root.setAttribute(`role`, `button`);
  // 加独特 aria-label，避免自己注入的元素之后被误认成站内原有组件
  root.setAttribute(`aria-label`, `${NS} 注入组件`);
  root.appendChild(el(`div`, `${NS}-title`, `注入成功`));
  root.appendChild(el(`div`, `${NS}-text`, `样式已继承站点 design system`));
  document.body.appendChild(root);

  // 拖拽 + 点击区分：单击用原生 click 判断，pointer 事件只管移动。
  // 不要用 pointerup 判断点击——单次点击可能不产生完整 pointerdown/up 配对。
  let dragging = false, moved = false, sx = 0, sy = 0, sr = 0, sb = 0;
  on(root, `pointerdown`, (e) => {
    dragging = true; moved = false;
    const r = root.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY;
    sr = window.innerWidth - r.right;
    sb = window.innerHeight - r.bottom;
  });
  on(window, `pointermove`, (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    if (!moved) return;
    root.style.right = Math.max(8, sr - dx) + `px`;
    root.style.bottom = Math.max(8, sb - dy) + `px`;
  });
  on(window, `pointerup`, () => { dragging = false; });
  on(root, `click`, (e) => {
    e.preventDefault(); e.stopPropagation();
    const wasDrag = moved;
    moved = false;
    if (wasDrag) return;   // 拖拽结束时不触发点击
    // TODO: 点击逻辑
  });

  // ============ 5. 框架重渲染兜底 ============
  // React/Vue 重渲染会移除注入的节点，用 observer 检测并重新挂载。
  // 注意 observer 必须登记进 observers，否则 cleanup 摘不掉、会累积。
  if (document.body) {
    const mo = new MutationObserver(() => {
      if (!document.body.contains(root)) document.body.appendChild(root);
      if (!document.head.contains(style)) document.head.appendChild(style);
    });
    mo.observe(document.body, { childList: true, subtree: false });
    observers.push(mo);
  }

  console.log(`%c[${NS}] 注入完成。移除请执行 window.__pfhCleanup()`, `color:#3370FF;font-weight:bold`);
})();
