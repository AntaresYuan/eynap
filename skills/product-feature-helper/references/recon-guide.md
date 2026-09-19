# 侦察报告解读

第 2 步要跑**两个**脚本，解决不同问题：

| 脚本 | 回答 | 输出挂载 |
|---|---|---|
| `scripts/recon.js` | 能不能改、哪里不能碰 | `window.__uiRecon` |
| `scripts/design-system.js` | 必须照什么写 | `window.__uiDS` |

本文说明 `recon.js` 的输出如何转化为注入决策。
`design-system.js` 的产出用法见 [style-contract.md](style-contract.md)。

## 目录

- [运行方式](#运行方式)
- [字段速查](#字段速查)
- [决策链](#决策链)

---

## 运行方式

**宿主有浏览器自动化能力时**（方式 A，`bu.*` 为该能力的示意写法，实际调用以宿主为准）：
```python
recon = open("<skill>/scripts/recon.js").read()
ds    = open("<skill>/scripts/design-system.js").read()
print(bu.js(recon))
print(bu.js(ds))     # 取其 cssText 填入注入脚本的 DS_CSS
```

**让用户手动跑**（方式 B，或页面需登录而 Agent 无法访问时）：
1. `bash scripts/deliver.sh scripts/recon.js` 复制到剪贴板
2. 让用户粘贴到 Console 执行
3. 让用户执行 `copy(JSON.stringify(window.__uiRecon, null, 2))` 复制结果回传
4. 对 `design-system.js` 重复一次，回传 `copy(window.__uiDS.cssText)`

两个脚本都是**只读**的，不改页面，可安全让用户执行。

---

## 字段速查

| 字段 | 用途 |
|---|---|
| `frameworks` | 含 React/Vue/Angular → 有重渲染风险，CSS 覆盖优先 |
| `componentLibs` | 命中组件库 → 按其类名前缀写覆盖样式，视觉才统一 |
| `classNamePattern.looksHashed` | `true` → 类名构建后会变，选择器改用文本/结构/data 属性 |
| `maxZIndex.suggestForInjection` | 注入浮层的 z-index 下限，低于它会被盖住 |
| `dangerZones` | **最重要**，见下 |
| `csp` | 有严格 CSP → `<style>` 可能被拦，改用元素 inline style |
| `landmarks` | 页面骨架与尺寸，定位注入锚点 |
| `strategy` | 脚本给出的策略结论汇总 |

注：`recon.js` 也会顺带输出 `designTokens` / `palette` / `typography` / `radiusAndShadow`，
但那些是**粗略统计**，仅供快速判断。**写样式必须用 `design-system.js` 的产出**——
它提取的是成套的真实组件配方并做过一致性对齐，统计平均值不构成规范。

---

## 决策链

### 1. 先看 `dangerZones`，risk=CRITICAL 的必须绕开

| 命中类型 | 硬规则 |
|---|---|
| `rich-text-editor` | 禁止代码写入内容。只允许 `focus()` + 剪贴板，让用户手动粘贴 |
| `virtual-list` | 禁止插入/删除其内部节点。新内容另建 `body` 下的独立容器 |
| `contenteditable` | 同富文本对待 |
| `shadow-dom` | 样式需注入各 shadowRoot 内 |
| `iframe`(crossOrigin>0) | 跨域内部无法注入，如实告知用户 |
| `canvas` | 内容非 DOM，只能上层叠加覆盖物 |

细则见 [safety-rules.md](safety-rules.md)。

### 2. 再看 `frameworks` 决定改动手法

- 含 React/Vue/Angular/Svelte → 独立 `<style>` 表 + `!important`；改站内 DOM 时配 `MutationObserver` 兜底
- 未识别（原生/SSR）→ CSS 与 DOM 操作均可，仍建议样式走 `<style>` 表便于整体移除

### 3. 视觉规范一律取自 `design-system.js`

**不要**用 `recon.js` 的 `designTokens` / `palette` / `radiusAndShadow` 写样式——
那些是离散统计，拿到"圆角有 4px/8px/10px 三个候选"等于没有结论。

正确做法：用 `design-system.js` 输出的 `cssText`（含 `--pfh-*` 变量与 `.pfh-*` 组件类），
粘贴进注入脚本的 `DS_CSS`，然后只引用它们。详见 [style-contract.md](style-contract.md)。

### 4. 用 `maxZIndex` 定层级

取 `suggestForInjection`（= 页面最大值 + 1000）。不要凭感觉写 `9999`，很可能低于站内弹层。

### 5. 用 `classNamePattern` 定选择器策略

`looksHashed: true` 时，禁止用哈希类名做长期选择器（构建后就失效）。改用：
- 文本内容匹配：`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '提交')`
- `data-*` 属性、`role`、`aria-label`
- 结构位置：`header > div:first-child`

若必须用哈希类名（如复用某个原生按钮），**在脚本注释里标注它可能失效**，并加空值保护：
```javascript
const btn = document.querySelector(`.xxx__hash`);
if (btn) btn.click();
else console.warn(`[uix] 原生按钮未找到，可能类名已变`);
```
