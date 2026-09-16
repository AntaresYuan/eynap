---
name: pm-value
description: 产出一份立项文档——把模糊想法收敛成明确的价值锚点、目标用户、范围边界。当用户有个想法但还不确定值不值得做、或需要说清楚"为什么做这一版"时使用。产出物含价值锚点、In/Out scope、痛点与成功指标，落在 docs/01_STRATEGY/。触发词：我有个想法、这个值得做吗、帮我想清楚、要解决什么问题、这一版做什么不做什么、值不值得投入。不负责：写 PRD（用 pm-prd）、市场调研（用 pm-research）。
---

# pm-value — Value Discovery

产出**立项文档**：把一个模糊想法收敛成价值锚点、目标用户、范围边界、痛点与成功指标。

> **Core belief:** 价值锚点不是想出来的，是从真实故事里挖出来的。

## Input contract

| | |
|---|---|
| **有上游时读** | `docs/00_MEMORY/CONTEXT_SNAPSHOT.md` 里已记录的真实故事与硬约束；`docs/04_RESOURCES/` 的调研报告（若 `pm-research` 跑过） |
| **无上游时问** | 开放式起手式（下方 Step 1），让用户自己讲想法 |
| **产出落点** | `docs/01_STRATEGY/` —— 命名规则见 [../../shared/conventions.md](../../shared/conventions.md) |
| **无项目目录时** | 产出物直接在对话里给用户，**不落盘**。不要为了有地方写而擅自初始化项目 |

启动流程、记忆读写、`[批注]` / `[待定-XXX]` / `[Meta]` 协议、命名与版本规则、表述边界与沟通风格 —— 全部见 `shared/`：[memory](../../shared/memory.md) · [preferences](../../shared/preferences.md) · [conventions](../../shared/conventions.md) · [protocols](../../shared/protocols.md) · [hosts](../../shared/hosts.md) · [verification](../../shared/verification.md) · [doc-backend](../../shared/doc-backend.md)

---

## Mode

**Trigger:** User has an idea, a pain point, or a vague direction.
**Mode:** Resist solutions. Mine for truth first.

**Default questioning principle (when context is still vague):**
- Start with 1–2 **open-ended prompts** that let the user freely describe the idea in their own words (e.g. "Tell me about this idea/inspiration freely, don't worry about structure or details for now").
- Avoid long checklists or overly detailed questions before the user has given their own narrative, to **not prematurely constrain their thinking or solution space**.

Three core steps — never skip, never reorder:

### Step 1 — Context Mining (Story Extraction)

The goal is a vivid, specific, real story. Not "users struggle with X" but "last Tuesday, I tried to do X and then Y happened and I had to Z."

- **Open-ended start:** "Tell me about this idea/inspiration freely, don't worry about structure or details for now."
- **Target User Profiling:** If this product is not just for yourself, we must clarify: **Who exactly has this problem?** What are their specific traits, habits, or constraints? (If for self-use, skip this.)
  - This asks the user who they *think* the user is. **It is not user research.** When the answer needs to be grounded in real user behavior rather than the user's assumption, route to `pm-research` instead of guessing here.
- **Focus on stories, not states:** When guiding the user to imagine "the world after the problem is solved," prioritize asking for **specific stories** (e.g. "At a certain time/situation, how do you do related things?"), rather than discussing abstract psychological states.
- **Dig deeper:** After the user shares a story, prioritize **follow-up questions to dig for more real/ideal scenarios and reality checks** (e.g. other typical days, different nodes in a week, differences in mindset/behavior).
- **Avoid jargon:** Minimize product/tech jargon (like "MVP", "CUJ", "Scenario 1/2/3"), and use the user's daily language to rephrase and ask questions.
- **Memory Action:** When the user provides a detailed story or constraint, **append it to `docs/00_MEMORY/CONTEXT_SNAPSHOT.md`** as a new entry with a `[CNT-XXX]` ID.

### Step 2 — Reality Check & Problem Focus

Try to kill the idea with existing alternatives.

- **Light probe:** During open-ended expression, you can **lightly probe with "What is the core problem you want to solve most?"**, helping the user focus on the problem itself.
- **Challenge:** Ask: *"Why can't you just use [obvious existing solution]? What makes this specific friction unbearable enough to build something new?"*
- **Wait for exhaustion:** Only when the user says "I can't think of more ideas for now / let's stop here", move to the next step.

### Step 3 — Anchor Extraction

Lock in one **Tangible Anchor** — the concrete, observable thing that proves the problem is solved.

- **Do not summarize prematurely:** Before the user has fully explained their "ideal scenario," **do not prematurely generate formed scenario descriptions or summaries for the user**, to avoid stopping their thinking too early.
- *Structural shift:* "from manually checking → to being proactively notified"
- *B-side lens (Value Lever):* Which KPI moves, for whom, by how much?
- *C-side lens (Psychological Mirror):* Exact before/after emotional state in user language ("from dreading Monday planning → to starting the week with a clear head").
- *Physical metric:* Time / cost / steps — only for incremental solutions

**Gate — `value_anchor`:** At least one Tangible Anchor confirmed **by the user** and logged. Advisory, not blocking: if the user wants to move on with a fragile anchor, say what it puts at risk, record the gate as unmet in `STATE.md`, and proceed. Never report the anchor as established before the user confirms it → [verification](../../shared/verification.md).

### Optional Step — The "Human Nature" Challenge (Anti-corruption)

When time permits or the value anchor feels fragile, test it against human weaknesses. Recommended but not required before proceeding.

- *Cognitive Miser:* Would a lazy user find a workaround and not bother? (e.g., "Too much friction to setup?")
- *Selfish Agent:* Could a self-interested user game this in ways that undermine the value? (e.g., "Fake data for rewards?")
- **Action:** If the answer is "Yes" to either, **challenge the assumption** before proceeding.

---

## Output contract

As value anchors, scope, target users, and pain points are clarified, maintain or create the 立项文档 (value & scope doc) in `docs/01_STRATEGY/` so that value decisions are recorded for later review. Dimensions and conventions → [references/strategy-foundation.md](references/strategy-foundation.md).

On finishing: update `docs/00_MEMORY/STATE.md` — `current_stage: value`, `artifacts.strategy_doc`, plus any `open_items` opened along the way.

**[Next Step]** 价值锚点确立后，写需求文档走 `pm-prd`；需要真实用户或竞品证据走 `pm-research`。
