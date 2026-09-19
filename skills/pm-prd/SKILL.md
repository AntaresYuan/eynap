---
name: pm-prd
description: 把已有的立项、流程、实体、交互产出组装成一份交给研发的 PRD，并补写只属于 PRD 的章节（目标与指标、功能规则、分期）；也负责评审已有 PRD。当用户要一份完整需求文档、要把前面的产出整理成 PRD 交给研发、或要评审已有 PRD 时使用。产出物落在 docs/02_PRD/。触发词：写份 PRD、出需求文档、整理成 PRD、交给研发、review 这份需求、PRD 评审。不负责：梳理流程与页面结构（用 pm-flow）、实体状态机（用 pm-entity）、视觉稿与交互说明（用 product-feature-helper）。
---

# pm-prd — Assemble the PRD

产出 **Framework PRD** 或 **Feature PRD**：把上游已经想清楚的东西组装成一份交给研发的文档。

> **PRD 是组装出来的，不是从头写出来的。** 流程、实体、交互各有自己的技能负责想清楚；这里做三件事：按团队骨架组装、补写只属于 PRD 的章节、查出各部分之间对不上的地方。上游一改，重新组装即可——PRD 是派生产物。

## Input contract

| | |
|---|---|
| **有上游时读** | `docs/01_STRATEGY/` 立项文档 · `docs/02_PRD/flow.md` · `docs/02_PRD/entities.md` · `docs/03_DESIGN/` 的交互文档 |
| **无上游时** | 逐段判断缺什么，见下方「缺口处理」。**不要为了凑出一份完整 PRD 而编造上游该产出的内容** |
| **产出落点** | `docs/02_PRD/` —— 命名规则见 [_shared/conventions.md](_shared/conventions.md) |
| **无项目目录时** | 产出物直接在对话里给用户，**不落盘** |

启动流程、记忆读写、协议、命名规则、表述边界与沟通风格 —— 见 `shared/`：[memory](_shared/memory.md) · [preferences](_shared/preferences.md) · [conventions](_shared/conventions.md) · [protocols](_shared/protocols.md) · [hosts](_shared/hosts.md) · [verification](_shared/verification.md) · [doc-backend](_shared/doc-backend.md)

> `_shared/` 是全套共用的地基（记忆、命名、协议、核查），每个技能目录各带一份，单独安装也能用。改动只改仓库根部的 `shared/`，再跑 `scripts/sync_shared.sh`。

PRD 的结构标准、两级文档层次、多功能点 PRD 模板、写作原则 → [references/prd-protocols.md](references/prd-protocols.md)

**本团队实际在用的 PRD 骨架与交互设计写法 → [references/prd-patterns.md](references/prd-patterns.md)。组装前先读这份**——它给出章节顺序、交互表四列结构、描述列三段式与反模式。与 `prd-protocols.md` 冲突时，**以团队范式为准**。

---

## 每一段从哪来

按 `prd-patterns.md` 的骨架组装。**来源一栏是组装的依据，也是给读者的出处**——成品里每段注明取自哪个文件。

| PRD 章节 | 来源 | 这里做什么 |
|---|---|---|
| 1 背景 | 立项文档 | 引用或简述，只讲问题不讲方案 |
| 2 目标 | **PRD 自写** | 见下方「PRD 自己要写的章节」 |
| 3 关键流程 / 用户旅程 | `flow.md` §1–2 | 组装；MVP 范围按旅程写，不写成功能清单 |
| 4 实体与状态模型 | `entities.md` | 组装；状态表与转移矩阵照搬，不重新推导 |
| 5 功能规则 | **PRD 自写**，依据 `entities.md` 的转移条件 | 按子问题切分，每节一条规则 |
| 6 交互设计 | 交互文档；没有时用 `flow.md` §3 + `entities.md` 的转移条件 | 按四列表格写，见下 |
| 7 待讨论 | 各上游文件里未消解的 `[待定-XXX]` 汇总 | 收口到文末，不散在正文 |

---

## 缺口处理

某一段的上游不存在时，**先告诉用户缺的是哪一段、归哪个技能**，然后让用户选：

1. **现在补上游** —— 调对应技能（流程缺 → `pm-flow`，实体缺 → `pm-entity`，交互缺 → product-feature-helper），做完再回来组装。
2. **在 PRD 里先写薄版本** —— 只问该段的最少必要信息，写成简版，并在段首标注 `[待定-XXX] 本段未经 pm-flow / pm-entity 推敲`，同时记入 `STATE.md` 的 `open_items`。

**不要默默选第二种。** 用户只说"给我份 PRD"时，他可能不知道流程和实体其实还没想清楚——说出来，让他决定。

---

## PRD 自己要写的章节

这几段没有上游技能负责，组装时由这里写：

**目标** → [references/prd-patterns.md](references/prd-patterns.md)：上线预期写成可观察的状态变化（不是"显著提升效率"这类形容词），并把指标**按产品侧与算法侧分开列**——产品看行为与转化（渗透率 / 完成率 / 采纳率），算法看质量与效率（准确率 / 召回率 / Top-N / 延迟 / 成本）。每个指标都要写口径（分子分母）、基线与观察周期；算法指标还要写明评测集来源与标注标准。**目标里的指标必须在「效果观测」里有对应埋点**，否则上线后量不出来。

**功能规则** —— 按子问题切分（谁可以用 / 权限与可见范围 / 推荐逻辑 / 效果观测……）。规则里涉及的状态与转移条件，以 `entities.md` 为准，不在这里另起一套。

**分期** —— 哪些旅程进首期、哪些延后，依据 `flow.md` 的 MVP 范围。

**交互设计的写法** → [references/prd-patterns.md](references/prd-patterns.md)：默认四列 **阶段 / 入口 / 描述 / 交互**，描述列用加粗小标题分三段——`用户诉求：` / `用户动作：` / `阶段判定逻辑：`。第三段取自 `entities.md` 各转移的 trigger 与 precondition；缺了它前端不知道何时渲染，会把分阶段形态做成常显。字段要逐项写出默认值与可选值，不要只写"支持配置"。

---

## 组装时的一致性检查

组装是唯一能同时看到所有上游的时刻，**对不上的地方在这里发现**：

- `flow.md` 里的某屏展示了 `entities.md` 没有的字段？
- `entities.md` 里某个状态在 `flow.md` 的页面上没有落点？
- 交互文档的环节数与 CUJ 步骤对不上？
- 立项文档里的痛点，在旅程里找不到解决路径，也没记为延后？

发现冲突时：**说出来，指向该改的上游文件，不要在 PRD 里就地抹平。** 在 PRD 里改掉，上游就和成品不一致了，下次重新组装时冲突会回来。

---

## Reviewing an existing PRD

When the user brings a PRD to review rather than write:

1. Read it in full first — do not review from a summary.
2. Check it against [references/prd-patterns.md](references/prd-patterns.md) and [references/prd-protocols.md](references/prd-protocols.md): are the two levels collapsed into one file? Does every feature trace back to a pain point?
3. Check the three-layer gate coverage (User Flow / Frontend / Backend Logic) and name which layer is thin — and which upstream skill would fix it.
4. Raise findings as `[待定-XXX]` in the doc **and** explain each in conversation → [protocols](_shared/protocols.md).
5. **Do not rewrite the document without confirmation.** Propose, then execute.

---

## Output contract

On finishing: update `docs/00_MEMORY/STATE.md` — `current_stage: prd`, `artifacts.prd`, plus any `open_items`（包括缺口处理里记下的薄版本段落）。

**[Next Step]** 成品交给研发。上游任何一份改了，回到这里重新组装，不要直接改 PRD 正文。
