---
name: pm-flow
description: 产出一份流程与页面结构文档——关键用户旅程（CUJ）、MVP 范围、Screen Tree 与每屏的信息层级和主要交互。当用户要梳理用户流程、定义 MVP 做哪些、设计页面怎么组织与导航时使用。产出物落在 docs/02_PRD/flow.md。触发词：用户流程是什么、MVP 做哪些、页面怎么组织、导航怎么设计、这个功能怎么走、用户旅程、这个功能怎么设计。不负责：组装成 PRD 文档（用 pm-prd）、实体状态机（用 pm-entity）、视觉稿与交互说明（用 product-feature-helper）。
---

# pm-flow — Journeys, MVP scope, page structure

产出 **`flow.md`**：关键用户旅程、MVP 范围、页面结构与导航。

> 这是想清楚"怎么走"的一步，不是写 PRD。PRD 在最后由 `pm-prd` 组装，本文件是它的第 3 节来源，也是 `pm-entity` 抽实体的输入——**先有流程才能抽实体**。

## Input contract

| | |
|---|---|
| **有上游时读** | `docs/01_STRATEGY/` 立项文档的价值锚点、目标用户、In/Out scope；`CONTEXT_SNAPSHOT.md` 的痛点原话 |
| **无上游时问** | 背景、目标用户、要解决什么问题（一次问完，不要挤牙膏） |
| **需要证据时** | 某条旅程依赖"用户真的会这么做"的假设 → 调 `pm-research` 验证，结论回写这里 |
| **产出落点** | `docs/02_PRD/flow.md` —— 命名规则见 [_shared/conventions.md](_shared/conventions.md) |
| **无项目目录时** | 产出物直接在对话里给用户，**不落盘** |

启动流程、记忆读写、协议、命名规则、表述边界与沟通风格 —— 见 `shared/`：[memory](_shared/memory.md) · [preferences](_shared/preferences.md) · [conventions](_shared/conventions.md) · [protocols](_shared/protocols.md) · [hosts](_shared/hosts.md) · [verification](_shared/verification.md) · [doc-backend](_shared/doc-backend.md)

> `_shared/` 是全套共用的地基（记忆、命名、协议、核查），每个技能目录各带一份，单独安装也能用。改动只改仓库根部的 `shared/`，再跑 `scripts/sync_shared.sh`。

---

## Part 1 · Journeys & MVP（旅程与 MVP）

**Trigger:** Core value is confirmed. Now designing how the solution works.
**Mode:** Map the ideal flow first. MVP cuts come later.

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

**Stay at the current layer.** Design clarity > velocity. Do not push toward implementation.

**MVP trade-off communication:** When presenting options, always state:
- Which user expectations each option defers
- Which original pain points remain unaddressed
- In user-perspective language, not technical language

**Gate — `pain_coverage`:** Scan every pain point from the strategy doc. Each must have a solution path in the defined CUJs, or be explicitly named as a deferral and logged in `docs/TODO.md`. **Advisory**: name what is uncovered, record it in `STATE.md`, let the user decide whether to proceed — do not hard-block exploration, and never call coverage complete when it is not → [verification](_shared/verification.md).

---

## Part 2 · Page structure（页面结构）

**Trigger:** Journeys are stable. Now sketching the page structure and how users navigate the system.
**Mode:** Logic blueprints, not visual design. Keep the structure flexible — `pm-entity` will validate it against the entity model and may send changes back here.

**Cross-Module Stitching (Horizontal Check):**
Before detailing individual screens, validate the "seams" between modules using the journeys:
- **Context Passing:** Does the destination know *why* the user came here? (e.g. from "Low Stock" alert -> pre-fills filter in Order list)
- **Wayfinding:** Can the user return to their original context after the task?
- **Consistency:** Do interaction patterns match across the journey?

**Page Structure Definition:**
1. Define the **Screen Tree** — global navigation map, page hierarchy, key entry points.
2. For each screen, describe the **information hierarchy** — what the user sees, in what order of importance.
3. List **primary interactions** per screen — what can the user do here?
4. Map CUJs from Part 1 onto the Screen Tree — ensure every journey step has a visible landing spot.

> **Annotate entry points explicitly** (e.g. `[Entry Point for Journey A]`). The delivery layer reads these directly as the 「入口」column of the interaction doc — see `skills/ai-pm/references/handoff-contract.md`. An un-annotated Screen Tree forces that question back onto the user.

**User-Perspective Review (Persona Walkthrough):**
After the page structure is drafted, step out of the PM perspective entirely. Conduct a fresh review:
1. Load the **target user persona** from the strategy doc (traits, habits, constraints, tech literacy).
2. Walk through each core CUJ **seeing only the designed pages** — no background knowledge of entity models.
3. At each screen, ask as the persona: *"Do I understand what I'm looking at? Do I know what to do next? Is anything confusing, missing, or intimidating?"*
4. Flag any friction points where the persona would hesitate, misunderstand, or abandon the flow.

If issues are found, adjust the page structure before proceeding. Log significant design pivots in `SESSION_MEMORY.md`.

If the user says "I'm not sure about X," stay in design. Do not push to build.

---

## Output format — `flow.md`

```
## 1 Critical User Journeys      3–5 条，每条从一个痛点出发，到达成价值锚点结束
## 2 MVP Scope                   按旅程定义，每条核心旅程写 Entry → Info → Action → Outcome
## 3 Screen Tree & Navigation    导航树 + 每屏信息层级与主要交互；入口点显式标注
```

**When `pm-entity` sends changes back** (its Page Structure Validation found a screen the entity model cannot support, or a state with no screen): edit this file, not the PRD. The PRD is re-assembled from here.

---

## Output contract

On finishing: update `docs/00_MEMORY/STATE.md` — `current_stage: flow`, `artifacts.flow_doc`, `gates_passed` if `pain_coverage` genuinely cleared, plus any `open_items`.

**[Next Step]** 从旅程与页面抽实体、定状态机走 `pm-entity`。
