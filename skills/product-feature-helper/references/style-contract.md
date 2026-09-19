# 样式硬约束

本文件解决一个具体失败：**注入的 UI 不遵循站点已有 CSS 规范，交互显得割裂。**

根因不是"提取得不够多"，而是提取结果没有约束力——模型看过一堆参考数值后，
照样凭感觉写 `padding: 16px`、`#3370FF`。所以本 skill 的做法是：
**把"建议复用"改成"只能复用"，并用机器阻断违规交付。**

## 目录

- [提取器能力边界（先读）](#提取器能力边界先读)
- [三条铁律](#三条铁律)
- [为什么统计平均值不构成规范](#为什么统计平均值不构成规范)
- [token 清单](#token-清单)
- [组件类清单](#组件类清单)
- [置信度与缺失项处理](#置信度与缺失项处理)
- [常见违规与改法](#常见违规与改法)

---

## 提取器能力边界（先读）

`design-system.js` 分三层取值，优先级从高到低：

| 层 | 做法 | 可靠性 |
|---|---|---|
| 1. 体系指纹 | 识别出 Arco / Semi / Primer / antd / MUI / Bootstrap / Tailwind 后，用该体系**官方 token 名** | 高 |
| 2. 通用语义打分 | 不认具体名字，按「语义词 + 角色词」组合打分 | 中，自研站点易错 |
| 3. 真实组件反推 | 从页面真实元素的 computed style 取 | 中高 |

三层结果都要过**合理性校验**（主色不能是接近底色的灰、边框不能是纯黑、
主文字与次要文字不能同色等）。不合格就置空走兜底——**宁可留空也不输出错的规范**。

### 8 站点盲测结果（其中 6 站未参与调参）

| 站点 | 体系识别 | 得分 | 备注 |
|---|---|---|---|
| MUI | ✅ Material / MUI | 92% | 最佳 |
| Semi | ✅ Semi Design | 77% | 官方 token 全中 |
| Arco | ✅ Arco Design | 69% | 官方 token 全中 |
| antd | 反推 | 69% | alpha 文字层级正确 |
| Notion | 自研 / 语义 | 69% | 主色、边框均正确 |
| GitHub | ✅ Primer | 62% | 深色主题正确 |
| Vercel | 自研 / 语义 | 46% | 全站黑白灰，主色本就无彩色 |
| Stripe | 自研 / 语义 | 46% | 彩色渐变多，易干扰 |

**结论**：使用已知设计体系的站点可靠；纯自研站点只能保证
不输出错值，但缺失项更多。**得分低不代表可以拿兜底值硬写。**

### 已知失效场景

- **纯自研 + 大量彩色渐变**（如 Stripe）：可能把装饰性彩色误当主色，需人工核对
- **黑白灰设计语言**（如 Vercel）：主色反推为灰色，属正常，但要确认
- **跨域样式表**：`cssRules` 会被浏览器拦掉（Arco 官网实测 100% 被阻）。
  提取器已改用 `getPropertyValue` 直接探测，不受此限；
  但这意味着**只能拿到已知名字的变量**，自研体系的变量名扫不全

### 自建 / 私有设计体系

企业或团队常有自建组件库，其变量命名不在公开体系的指纹表里。
遇到这类站点时，提取器会退化为通用语义打分，此时务必按下节做人工核对。

若某个自建体系会长期反复使用，值得给它加一条指纹：在 `design-system.js` 的
`SYSTEMS` 数组里追加一项，填该体系的特征变量名与角色映射即可（参照 Arco / Semi 两条）。
这是提升准确率最直接的办法——命中指纹后取的是官方 token，比任何反推都可靠。

---

## 三条铁律

### 铁律 1：先提取，后编码

写任何样式之前必须先跑 `scripts/design-system.js`，拿到 `cssText`。
**禁止**在未提取的情况下凭印象填色值——那正是产生割裂的原因。

若页面无法访问（需登录等），让用户在 Console 跑该脚本并回传
`copy(window.__uiDS.cssText)` 的结果。脚本是只读的，可安全交给用户执行。

### 铁律 2：视觉值只能用 token，不能写字面量

注入脚本中所有颜色、圆角、间距、字号、字体、阴影必须写成 `var(--pfh-*)`。

```css
/* 违规：凭感觉的字面量 */
.my-panel { background: #fff; color: #1D2129; border-radius: 10px; padding: 16px; }

/* 正确：引用提取到的 token */
.my-panel {
  background: var(--pfh-bg-card);
  color: var(--pfh-text);
  border-radius: var(--pfh-radius-overlay);
  padding: var(--pfh-space-3);
}
```

唯一例外是 `design-system.js` 生成的 token 层与组件类本身——那里的字面量就是提取产物。

### 铁律 3：交付前必须过质量门

```bash
bash scripts/deliver.sh <script.js>
```

它会扫描样式字面量，**发现违规即退出码 1 阻断交付**。不要绕过它手工交付。

同时它会检查：引用了 `var(--pfh-*)` 却缺少 `:root` 定义时同样阻断——
因为变量落空会让样式整体失效（比割裂更糟）。

---

## 为什么统计平均值不构成规范

早期版本只做统计（"高频圆角有 4px/8px/10px"），这没有用：

1. **拿到三个候选值等于没有结论**，模型只能猜一个。
2. **design system 是成套的**。按钮的圆角/内边距/字号/高度/过渡曲线是一个整体，
   拆开各自取众数会得到一套现实中不存在的组合。

因此 `design-system.js` 改为**直接扒真实组件的完整 computed style**
（`components.buttonPrimary` 等），形成可直接复刻的配方，并生成对应组件类。

同时做**一致性对齐**（`reconciled` 字段）：token 层由统计得出、组件层由真实元素得出，
两者冲突时以真实组件为准。实测 antd 曾出现 token `radiusButton=4px`
而真实主按钮为 `6px` 的冲突，若不对齐，注入内容自身就风格不统一。

---

## token 清单

`design-system.js` 输出的 `cssText` 定义了这些变量，直接引用：

| Token | 含义 |
|---|---|
| `--pfh-brand` | 主色（从主按钮/链接反推，非全页统计） |
| `--pfh-text` / `--pfh-text-secondary` / `--pfh-text-tertiary` | 文字三级色阶（限中性色） |
| `--pfh-bg-page` / `--pfh-bg-card` / `--pfh-bg-subtle` | 页面底 / 卡片底 / 次级底 |
| `--pfh-border` / `--pfh-border-width` | 描边色与线宽 |
| `--pfh-font` / `--pfh-font-size` / `--pfh-font-size-sm` / `--pfh-line-height` | 排版 |
| `--pfh-radius-button` / `-input` / `-card` / `-overlay` | 分组件圆角，不混用 |
| `--pfh-shadow-overlay` | 浮层阴影 |
| `--pfh-space-1` ~ `--pfh-space-4` | 间距阶梯，基于识别出的 4/8 栅格 |

间距只用这四档。需要更大间距用 `calc(var(--pfh-space-4) * 2)`，不要写 `32px`。

---

## 组件类清单

比 token 更进一步——直接套用类名即可获得与站点一致的外观：

| Class | 用途 |
|---|---|
| `.pfh-surface` | 面板/弹窗/卡片容器（含背景、描边、圆角、阴影、字体） |
| `.pfh-btn-primary` | 主按钮，复刻站点真实主按钮 |
| `.pfh-btn-secondary` | 次要按钮 |
| `.pfh-input` | 输入框（已对畸形值做回退处理） |
| `.pfh-text-secondary` | 次要说明文字 |
| `.pfh-divider` | 分隔线 |

**优先套类名，其次用 token，绝不写字面量。**

```javascript
// 推荐：直接继承站点外观
const panel = el(`div`, `pfh-root pfh-panel pfh-surface`);
```

---

## 置信度与缺失项处理

`confidence` 字段会列出哪些 token 是真实提取、哪些用了兜底默认值：

```json
{ "score": "85%", "fellBackToDefault": ["subtleBg", "shadowOverlay"] }
```

**处理规则**：
- `fellBackToDefault` 中的项使用的是通用默认值，**不代表站点规范**。
- 这些项若对当前改动重要（如面板要用次级底色），应换锚点重新提取，
  或明确告知用户"该项未能从页面提取，用了通用默认值"。
- **不要把兜底默认值当成站点规范交付**，那等于回到了 yy 的老路。

`score` 低于 60% 时，说明页面缺少可识别的标准组件，应告知用户视觉贴合度有限。

---

## 常见违规与改法

| 违规写法 | 正确写法 |
|---|---|
| `background: #fff` | `background: var(--pfh-bg-card)` |
| `color: #333` | `color: var(--pfh-text)` |
| `font-size: 13px` | `font-size: var(--pfh-font-size-sm)` |
| `padding: 16px` | `padding: var(--pfh-space-4)` |
| `border-radius: 8px` | `border-radius: var(--pfh-radius-card)` |
| `border: 1px solid #eee` | `border: var(--pfh-border-width) solid var(--pfh-border)` |
| `box-shadow: 0 4px 12px rgba(0,0,0,.1)` | `box-shadow: var(--pfh-shadow-overlay)` |
| `font-family: -apple-system, ...` | `font-family: var(--pfh-font)` 或 `inherit` |

**允许的字面量**（不算违规）：
- `0`、`none`、`auto`、`inherit`、`transparent`、`100%`
- `z-index`（取自 recon 的 `maxZIndex`，与设计规范无关）
- 位移/尺寸等布局值（`width: 320px`、拖拽计算出的 `left`）
- `console.log` 的 `%c` 样式参数
