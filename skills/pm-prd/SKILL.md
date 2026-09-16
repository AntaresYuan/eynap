---
name: pm-prd
description: 产出或评审一份 PRD——Framework PRD（关键用户旅程 + 页面结构 + 实体索引）或 Feature PRD（单模块的流程、前端规格、后端逻辑）。当用户要写需求文档、评审已有 PRD、梳理用户流程、定义 MVP 范围、或设计页面结构与导航时使用。产出物落在 docs/02_PRD/。触发词：写份 PRD、review 这份需求、MVP 做哪些、用户流程是什么、页面怎么组织、这个功能怎么设计、需求文档。不负责：实体状态机（用 pm-entity）、视觉稿与交互说明（用 product-feature-helper）。
---

# pm-prd — Flow, MVP scope, page structure

产出**Framework PRD** 或 **Feature PRD**：用户旅程、MVP 范围、页面结构与导航。

> 流程设计与页面结构没有各自单独成技能——它们的产出直接就是 Framework PRD 的第 2、3 节，拎出来没有独立产出物。

## Input contract

| | |
|---|---|
| **有上游时读** | `docs/01_STRATEGY/` 立项文档的价值锚点、目标用户、In/Out scope；`CONTEXT_SNAPSHOT.md` 的痛点原话 |
| **无上游时问** | 背景、目标用户、要解决什么问题（一次问完，不要挤牙膏） |
| **产出落点** | `docs/02_PRD/` —— 命名规则见 [../../shared/conventions.md](../../shared/conventions.md) |
| **无项目目录时** | 产出物直接在对话里给用户，**不落盘** |

启动流程、记忆读写、协议、命名规则、表述边界与沟通风格 —— 见 `shared/`：[memory](../../shared/memory.md) · [preferences](../../shared/preferences.md) · [conventions](../../shared/conventions.md) · [protocols](../../shared/protocols.md) · [hosts](../../shared/hosts.md) · [verification](../../shared/verification.md) · [doc-backend](../../shared/doc-backend.md)


> **单独安装时**：本技能引用的 `../../shared/` 是全套共用的地基。若这些文件不存在（例如只装了单个技能），按本文自身的约定执行即可；要完整行为请装整套：`npx skills add AntaresYuan/eynap --skill '*'`。

PRD 的结构标准、两级文档层次、多功能点 PRD 模板、写作原则 → [references/prd-protocols.md](references/prd-protocols.md)

**本团队实际在用的 PRD 骨架与交互设计写法 → [references/prd-patterns.md](references/prd-patterns.md)。写正文前先读这份**——它给出团队已验证的章节顺序、交互表四列结构、描述列三段式（用户诉求 / 用户动作 / 阶段判定逻辑）与反模式。与 `prd-protocols.md` 冲突时，**以团队范式为准**：不要把 PRD 写成通用咨询报告的七章节结构。

---

## Part 1 · Logic Structuring（流程与 MVP）

**Trigger:** Core value is confirmed. Now designing how the solution works.
**Mode:** Map the ideal flow first. MVP cuts come later.

**写「目标」一节时，必须拆到可验收** → [references/prd-patterns.md](references/prd-patterns.md)：上线预期写成可观察的状态变化（不是"显著提升效率"这类形容词），并把指标**按产品侧与算法侧分开列**——产品看行为与转化（渗透率 / 完成率 / 采纳率），算法看质量与效率（准确率 / 召回率 / Top-N / 延迟 / 成本）。每个指标都要写口径（分子分母）、基线与观察周期；算法指标还要写明评测集来源与标注标准。**目标里的指标必须在「效果观测」里有对应埋点**，否则这个目标上线后量不出来。

**Flow-First pattern:**
1. **Pain-Point Driven Journeys:** Before drawing boxes, write 3-5 *Critical User Journeys (CUJs)*. Each must start from a specific pain point (from the strategy doc / `CONTEXT_SNAPSHOT`) and end with the user achieving the value anchor.
2. Draw the *ideal end-to-end flow* ignoring constraints — full picture first.
3. Let the user narrate all branches, edge cases, and expectations.
4. *Then* categorize: core vs. deferrable.

**MVP Definition via Scenario Mapping:**
Do not define MVP as a feature list. Define it as a set of supported journeys.
For each core journey in the MVP, explicitly map:
`{Entry Context} → {Visible Info} → {Action} → {Routing/Outcome}`

*Example:*
> **Scenario:** Stockout Replenishment
> - **Start:** User sees "Low Stock" alert on Dashboard.
> - **Info Needed:** Current stock, rate of sale, reorder lead time.
> - **Action:** Click "One-click Reorder".
> - **Outcome:** System confirms order placed -> Redirects to Order History with "Pending" status.

**Output:** Record these Core Journeys and MVP Scenarios in the **Framework PRD**（默认文件例如 `docs/02_PRD/framework-prd.md`，名称可按项目约定调整，而 `docs/02_PRD/README.md` 仅用于说明该目录与各 PRD 文档的用途）。Framework PRD 作为后续所有 feature 级 PRD 的「横向胶水」。这一阶段重点完成第 1 部分（Background & Value Scope）和第 2 部分（Critical User Journeys）；第 3 部分（Screen Tree）在下方 Part 2 补全，第 4 部分（Entities）由 `pm-entity` 补全。

**Stay at the current layer.** Design clarity > velocity. Do not push toward implementation.

**MVP trade-off communication:** When presenting options, always state:
- Which user expectations each option defers
- Which original pain points remain unaddressed
- In user-perspective language, not technical language

**Gate — `pain_coverage`:** Scan every pain point from the strategy doc. Each must have a solution path in the defined CUJs, or be explicitly named as a deferral and logged in `docs/TODO.md`. **Advisory**: name what is uncovered, record it in `STATE.md`, let the user decide whether to proceed — do not hard-block exploration, and never call coverage complete when it is not → [verification](../../shared/verification.md).

---

## Part 2 · Interaction Design（页面结构）

**Trigger:** Flow is stable. Now sketching the page structure and how users navigate the system.
**Mode:** Logic blueprints, not visual design. Keep the structure flexible — it will be validated against entities by `pm-entity`.

**Cross-Module Stitching (Horizontal Check):**
Before detailing individual screens, validate the "seams" between modules using the Framework PRD journeys:
- **Context Passing:** Does the destination know *why* the user came here? (e.g. from "Low Stock" alert -> pre-fills filter in Order list)
- **Wayfinding:** Can the user return to their original context after the task?
- **Consistency:** Do interaction patterns match across the journey?

**Page Structure Definition:**
1. Define the **Screen Tree** — global navigation map, page hierarchy, key entry points.
2. For each screen, describe the **information hierarchy** — what the user sees, in what order of importance.
3. List **primary interactions** per screen — what can the user do here?
4. Map CUJs from Part 1 onto the Screen Tree — ensure every journey step has a visible landing spot.

> **Annotate entry points explicitly** (e.g. `[Entry Point for Journey A]`). The delivery layer reads these directly as the 「入口」column of the interaction doc — see `skills/ai-pm/references/handoff-contract.md`. An un-annotated Screen Tree forces that question back onto the user.

**写成交互设计章节时，用团队范式的四列表格** → [references/prd-patterns.md](references/prd-patterns.md)：默认 **阶段 / 入口 / 描述 / 交互**，描述列必须用加粗小标题分三段——`用户诉求：` / `用户动作：` / `阶段判定逻辑：`。第三段最常漏但后果最直接：缺了它前端不知道何时渲染，会把分阶段形态做成常显。字段要逐项写出默认值与可选值，不要只写"支持配置"。

**User-Perspective Review (Persona Walkthrough):**
After the page structure is drafted, step out of the PM perspective entirely. Conduct a fresh review:
1. Load the **target user persona** from the strategy doc (traits, habits, constraints, tech literacy).
2. Walk through each core CUJ **seeing only the designed pages** — no background knowledge of PRD logic or entity models.
3. At each screen, ask as the persona: *"Do I understand what I'm looking at? Do I know what to do next? Is anything confusing, missing, or intimidating?"*
4. Flag any friction points where the persona would hesitate, misunderstand, or abandon the flow.

If issues are found, adjust the page structure before proceeding. Log significant design pivots in `SESSION_MEMORY.md`.

If the user says "I'm not sure about X," stay in design. Do not push to build.

---

## Reviewing an existing PRD

When the user brings a PRD to review rather than write:

1. Read it in full first — do not review from a summary.
2. Check it against the structure standard in [references/prd-protocols.md](references/prd-protocols.md): are the two levels collapsed into one file? Does every feature trace back to a pain point?
3. Check the three-layer gate coverage (User Flow / Frontend / Backend Logic) and name which layer is thin.
4. Raise findings as `[待定-XXX]` in the doc **and** explain each in conversation → [protocols](../../shared/protocols.md).
5. **Do not rewrite the document without confirmation.** Propose, then execute.

---

## Output contract

On finishing: update `docs/00_MEMORY/STATE.md` — `current_stage: prd`, `artifacts.framework_prd`, plus any `open_items`.

**[Next Step]** 实体与状态机走 `pm-entity`；视觉稿与交互说明走 `product-feature-helper`（路由判定见 `skills/ai-pm/SKILL.md` Scene 5）。
