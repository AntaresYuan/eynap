---
name: pm-research
description: 产出一份用户调研或竞品分析报告。当用户需要了解目标用户的真实行为与需求、或需要盘点市场上已有的同类产品时使用。产出物是调研报告，含研究问题、方法、发现与结论，落在 docs/04_RESOURCES/。触发词：做份调研、竞品分析、市场上有什么类似的、用户到底怎么用的、这个方向有人做过吗、对标产品。不负责：定义产品价值与范围（用 pm-value）、写需求文档（用 pm-prd）。
---

# pm-research — User & competitor research

产出一份**调研报告**：研究问题、方法、发现、结论、对产品决策的影响。

> **This atom exists because asking the user "who is your user?" is not research.** It records an assumption. Research goes and checks whether the assumption holds.

## Input contract

| | |
|---|---|
| **有上游时读** | `docs/01_STRATEGY/` 立项文档的目标用户与典型场景；`CONTEXT_SNAPSHOT.md` 里的真实故事 |
| **无上游时问** | **研究对象**（哪类用户 / 哪个品类的产品）+ **要回答什么问题**（决策依赖它什么）。一次问完 |
| **产出落点** | `docs/04_RESOURCES/` —— 命名规则见 [_shared/conventions.md](_shared/conventions.md) |
| **无项目目录时** | 报告直接在对话里给用户，**不落盘** |

**天然不依赖上游。** 这是七个原子里唯一可以零上游独立成立的——没有立项文档也能做，反过来调研结论正好喂给 `pm-value`。

启动流程、记忆读写、协议、命名规则、表述边界与沟通风格 —— 见 `shared/`：[memory](_shared/memory.md) · [preferences](_shared/preferences.md) · [conventions](_shared/conventions.md) · [protocols](_shared/protocols.md) · [hosts](_shared/hosts.md) · [verification](_shared/verification.md) · [doc-backend](_shared/doc-backend.md)


> `_shared/` 是全套共用的地基（记忆、命名、协议、核查），每个技能目录各带一份，单独安装也能用。改动只改仓库根部的 `shared/`，再跑 `scripts/sync_shared.sh`。

---

## Step 0 · Frame the question before collecting anything

**A research request without a decision behind it produces a document nobody uses.** Before any searching, pin down:

1. **What decision does this inform?** ("要不要做这个方向" / "首版对谁做" / "定价怎么定" / "有没有人做过")
2. **What would change your mind?** Name the finding that would flip the decision. If nothing would, the research is decoration — say so and ask what is really being decided.
3. **Which type is this?** The two types below have completely different methods; do not blend them silently.

| Type | Answers | Method |
|---|---|---|
| **User research** | 用户实际怎么做事、卡在哪、怎么绕过 | 一手：访谈 / 观察 / 现有反馈数据；二手：公开讨论与评价 |
| **Competitor analysis** | 市场上已有什么、做到什么程度、留了什么空白 | 产品实测 / 官网与文档 / 定价页 / 评价与更新日志 |

Both often needed. **Do them as separate passes with separate conclusions** — merging them is how "用户想要 X" quietly becomes "竞品有 X".

**产品调研（按对方完整业务流程逐环走查的深度对标）有一套独立节奏与故事线** → [references/product-research-patterns.md](references/product-research-patterns.md)。当范围已给定、不需要论证"为什么是竞品"时用它：先对齐双方问题定义，再沿共用漏斗逐环走查，每个功能点当场给"可借鉴/中性/我们更好 + 对我们来说"，重点环节开专项子文档，结论落到带优先级的"可抄清单（含不抄）"。

---

## Part A · User research

### A1 · Distinguish what you can actually get

| Evidence | Strength | How to get it |
|---|---|---|
| **一手用户输入** — 访谈、观察、用户自己的原话 | Strongest | 用户提供；或设计访谈提纲让用户去做 |
| **现有反馈数据** — 工单、评价、社群讨论、内部反馈 | Strong | 用户提供导出；公开评价可检索 |
| **公开二手讨论** — 论坛、社媒、评测里的用户抱怨 | Medium | 检索工具 |
| **推断** — 从产品形态倒推用户行为 | Weakest | 只能作为假设，**必须标注为推断** |

**Never present the bottom row as the top row.** 报告里逐条标注证据级别；只有二手资料时，结论必须写成"基于公开二手资料"→ [verification](_shared/verification.md)。

### A2 · No first-hand access? Design the instrument instead

拿不到真实用户时，**不要编一个用户画像交差**。改为产出可执行的访谈提纲：

- 5–8 个开放式问题，问**具体经历**而非观点（"上次遇到 X 是什么情况" 而非 "你觉得 X 重要吗"）
- 每个问题标注它要验证哪个假设
- 明确说明：这是待执行的工具，不是调研结论

### A3 · Synthesize

- 按**行为模式**聚类，不按人聚类。同一个人可能落在多个模式里
- 每个模式给出：触发情境 → 当前做法 → 卡点 → 现有绕行方案（workaround 是最强的痛点信号）
- **反例优先**：主动找与主流模式相反的证据，写进报告

---

## Part B · Competitor analysis

### B1 · Define the comparison set

3–5 个即可，但要覆盖三类，**只看直接竞品会漏掉真正的替代品**：

| 类别 | 为什么必须看 |
|---|---|
| **直接竞品** | 同目标用户 + 同问题 |
| **替代方案** | 用户现在实际在用的东西——常常是 Excel、微信群、纸笔。**这是最容易漏且最重要的一类** |
| **邻域参照** | 别的领域解决同类结构问题的产品，交互思路可借 |

### B2 · Compare on dimensions that discriminate

**不要做特性清单打勾表**——那种表看起来严谨，但不产生决策。每个维度必须能区分对象：

- **它把谁排除在外**（定价、部署门槛、语言、合规）
- **核心流程要几步**，卡在哪一步
- **它明确不做什么**（往往写在文档或定价页里，是最有信息量的一处）
- **最近在往哪走**（更新日志 / 版本说明）

### B3 · Conclude with the gap, not the list

结论必须回答：**空白在哪，为什么还空着，我们凭什么能填。** "还没人做" 通常有原因——找出那个原因。

### B4 · No search capability?

如实说明，**不要凭印象编竞品信息**：

> 这个环境里我没有可用的检索能力，没法自动盘点竞品。如果你有参考产品或链接，发我，我按上面的维度整理成对比；也可以我先出一份对比框架，你填实测结果。

---

## Report structure

```markdown
# {研究对象} 调研报告

## 1 研究问题与决策
- 要支持的决策：
- 什么发现会改变结论：
- 类型：用户调研 / 竞品分析 / 两者

## 2 方法与证据边界
- 实际做了什么：
- 证据级别：一手 / 现有反馈数据 / 公开二手 / 推断（逐项标注）
- 没能做到什么、为什么：

## 3 发现
（用户调研按行为模式；竞品分析按维度对比。每条附来源）

## 4 反例与不确定性
（与主流结论相反的证据；样本或来源的局限）

## 5 结论与对产品的影响
- 结论：
- 影响哪个决策、怎么影响：
- 仍需验证的假设 → `[待定-XXX]`
```

**每条事实附可追溯来源，并区分「已查证」与「一方称」。** 竞品官网的宣称是"一方称"，实测才是"已查证"。

---

## Output contract

产出物落 `docs/04_RESOURCES/`。完成后更新 `docs/00_MEMORY/STATE.md` —— `current_stage: research`、`artifacts.research_report`、以及新开的 `open_items`。关键事实追加到 `CONTEXT_SNAPSHOT.md`（带 `[CNT-XXX]`）。

**[Next Step]** 调研结论用于收敛价值与范围 → `pm-value`。

---

## A note on running this as a subagent

调研要读大量外部资料，会塞满主上下文，所以这个原子适合放进独立上下文的子工作者、只回传报告。**七个原子里只有它有这个特征**——其余六个都要和用户来回对话，丢进子窗口反而不合适。若 host 支持子 agent，优先这么跑；不支持就正常跑，只是主上下文会更满。
