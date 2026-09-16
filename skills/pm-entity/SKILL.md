---
name: pm-entity
description: 产出一份实体状态表与转移矩阵——状态定义、正反向转移、每状态的操作权限、字段的状态相关行为。当用户要定义数据模型、梳理某个业务对象的状态流转、或排查状态设计漏洞时使用。产出物落在 docs/02_PRD/。触发词：状态机、这个单子有哪些状态、能不能回退、数据模型、实体设计、什么时候能改哪些字段、状态流转。不负责：整篇需求文档（用 pm-prd）。
---

# pm-entity — Entity & state machine

产出**状态表 + 转移矩阵**：状态定义、正反向转移、每状态的操作权限、字段的状态相关行为。

## Input contract

| | |
|---|---|
| **有上游时读** | Framework PRD 第 2 节 CUJ 与第 3 节 Screen Tree（`docs/02_PRD/`） |
| **无上游时问** | 这个实体在哪些流程里出现？谁会操作它？它从哪来、到哪结束？ |
| **产出落点** | `docs/02_PRD/` —— Framework PRD 第 4 节，或单独的实体文档 |
| **无项目目录时** | 状态表与转移矩阵直接在对话里给用户，**不落盘** |

启动流程、记忆读写、协议、命名规则、表述边界与沟通风格 —— 见 `shared/`：[memory](../../shared/memory.md) · [preferences](../../shared/preferences.md) · [conventions](../../shared/conventions.md) · [protocols](../../shared/protocols.md) · [hosts](../../shared/hosts.md) · [verification](../../shared/verification.md) · [doc-backend](../../shared/doc-backend.md)

---

## Mode

**Trigger:** Page structure is sketched. Now crystallizing what exists in the system.
**Mode:** Abstract entities *from* the flow and page structure — never define schema before flow.

- If flow or page structure is still changing: *"Let's stabilize the flow and page structure first so entities don't shift under us."*
- **0-to-1 projects:** Flexible definitions, high communication frequency, avoid premature rigidity.
- **Legacy systems:** Mandatory validation against existing data models. Log every conflict.

**State machines are the core.** Work through these five layers in order for every entity — do not jump ahead:

### Layer 1 · Business flow first

Re-read the flow from the CUJs. Identify nodes where the entity "rests" and where different rules apply — these are state candidates. Not every flow step becomes a state; only those where the entity's condition meaningfully changes.

### Layer 2 · Define each state

For every state, articulate three things:
- *Business meaning:* what does it mean to be in this state? What happened to get here?
- *Visibility:* who can see this entity in this state?
- *Editability:* what fields can be changed while here?

### Layer 3 · Map all transitions — including reverse

The forward flow is rarely the full picture. Explicitly ask:
- What are the reverse transitions? (e.g., `Published → Draft` for rollback)
- What triggers each reverse transition — user action or system event?
- Are there escape-hatch transitions that skip steps? (e.g., `Draft → Archived` directly)
- Are there terminal states with no outbound transitions?

For every transition, record: **trigger event, who can perform it, preconditions.**

> These three fields are what the delivery layer reads as the 「规则 / 判定条件」part of the interaction doc's 描述 column. Recording them thoroughly here is what stops that question from being asked again later — see `skills/ai-pm/references/handoff-contract.md`.

### Layer 4 · Operations per state

For each state, list what actions are available to each role. This matrix drives permission logic and UI affordances — what buttons are visible, what APIs are callable.

> This operations matrix is also the direct source for 「想要什么交互」in the interaction doc. It is the single most expensive question in the delivery flow when it has to be asked from scratch.

### Layer 5 · Field behavior per state

Some fields have state-dependent logic — surface these explicitly:
- Required in state A but optional in state B?
- Auto-populated on a specific transition?
- Locked (read-only) once a certain state is reached?
- Derived from other fields only in certain states?

These are a common source of bugs when left implicit.

---

## Output format

Produce a state table + transition matrix before writing any other spec:

```
States: [Draft, In Review, Approved, Rejected, Archived]

Transitions:
  Draft     → In Review   trigger: user submits      who: author
  In Review → Approved    trigger: reviewer accepts   who: reviewer
  In Review → Rejected    trigger: reviewer rejects   who: reviewer
  Rejected  → Draft       trigger: user revises       who: author    ← reverse
  Any       → Archived    trigger: admin archives     who: admin     ← escape hatch

Operations per state:
  Draft:     edit all fields / delete / submit
  In Review: comment only (author) / approve or reject (reviewer)
  Approved:  read-only / archive
  Rejected:  read-only / revise → returns to Draft

Field notes:
  submitted_at  auto-set on Draft→In Review, locked thereafter
  reviewer_id   required in Approved/Rejected, null in Draft
```

---

## Page Structure Validation

After entity definitions stabilize, revisit the Screen Tree:

- Does every screen's displayed information map to actual entity fields?
- Do entity state changes align with the interactions defined per screen?
- **Are there entity states that have no corresponding UI representation?**
- Are there screens that assume data relationships the entity model doesn't support?

If conflicts are found, adjust the page structure or entity model — and log the change in `SESSION_MEMORY.md`.

> **The third question does double duty.** Its answer is exactly the screenshot list the delivery layer needs: state table × screen, as a cartesian product. Answering it thoroughly here means nobody has to ask "哪些状态要截图" later → `skills/ai-pm/references/handoff-contract.md`.

---

## Three-layer design gate — `three_layer`

A feature is only "ready to build" when all three are clear:

| Layer | What must be defined |
|-------|---------------------|
| User Flow | Entry point → every key step → exit condition |
| Frontend | Key pages/components, information hierarchy, primary interactions |
| Backend Logic | Entities touched, business rules, state changes, AI call points |

**Advisory, not blocking.** When a layer is thin, name which one and what it risks, record it in `STATE.md`, and let the user decide. **Never say "ready to build" while a layer is incomplete** → [verification](../../shared/verification.md).

---

## Output contract

On finishing: update `docs/00_MEMORY/STATE.md` — `current_stage: entity`, `gates_passed` if `three_layer` genuinely cleared, plus any `open_items`.

**[Next Step]** 三层齐备后走设计与交付（`skills/ai-pm/SKILL.md` Scene 5 的路由判定）。
