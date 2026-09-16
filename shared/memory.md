# Memory — Layer 2 project memory

Schemas, update rules, and the coordination point shared by every atom. **This is the only definition of project memory** — atoms reference it, never restate it.

Physical location branches by host → [hosts.md](hosts.md). Logical schema and file names are identical everywhere.

---

## Memory architecture

```
Layer 0 — Skill Definition
  What:  PM working methodology, protocols, contracts
  Where: Each atom's SKILL.md + references/ + this shared/ directory
  Scope: All users, all projects
  Owner: Updated via [Meta] → skill is re-packaged

Layer 1 — Personal Preferences
  What:  Working style, cross-project methodology patterns
  Where: Skill-owned file, read explicitly at startup on every host → preferences.md
  Scope: You, across all projects
  Owner: Updated via [Meta1] (or any [Meta] inferred as Layer 1)

Layer 2 — Project Memory
  What:  Decisions, entities, flows, todos, progress for one specific project
  Where: {project_root}/docs/ — see hosts.md for the cloud-doc substrate variant
  Scope: That project only
  Owner: Updated during product discussions
```

---

## Startup: load context

Every atom runs this at the start of a session. **There is no environment setup check** — if the skill is running, it is installed.

1. **Read preferences** → [preferences.md](preferences.md). Explicit read, every host. This is also where the recorded **doc backend** comes from — if one is recorded, use it and do not ask again → [doc-backend.md](doc-backend.md).
2. **Resolve project** — look for `docs/00_MEMORY/` in the working directory (on the cloud-doc substrate: `.cloud-index.json`).
   - **Found** → continue.
   - **Not found** → this is a no-upstream run. Ask for the project name and initialize via `scripts/init_project.sh` **only if** the user wants a project; otherwise produce the deliverable directly in conversation and **do not write to disk** (see each atom's input contract).
3. **Read `STATE.md`** — the fast path to "where are we". One read replaces inferring progress from the narrative log. Read it whole; it is a fixed-length summary.
4. **Read the tail of `SESSION_MEMORY.md`** for the last topic, and the `## Open` section of `TODO.md` for pending items. Not the whole files — see retrieval discipline below.
5. **First use in a project** — send a one-time self-introduction matching the user's language (detect from their first message; default to Chinese if ambiguous).
6. **Acknowledge** — one line: `"{atom} ready. Project: {id}. Stage: {current_stage}. Last topic: [X]. Pending: [Y]."`

---

## Retrieval discipline — search project data, read instructions whole

The memory files are **append-only and unbounded**: a project running for months reaches thousands of lines. Loading them whole to find one fact is waste. But the same shortcut applied to instruction files causes a different, worse failure — so the rule splits by *what kind of file it is*, not by size.

| File | How to access | Why |
|---|---|---|
| `CONTEXT_SNAPSHOT.md` · `SESSION_MEMORY.md` · `TODO.md` | **Search first** — grep the ID (`[CNT-XXX]`, `TODO-XXX`, `DEC-XXX`), a date heading, or a keyword; then read only the matched entries **plus enough surrounding lines to get the whole entry**. Read the tail when you just need "what happened last" | Append-only, grows without limit, and entries are self-contained under their own `##` heading — a matched entry is a complete unit |
| `STATE.md` | **Read whole** | Fixed-length summary by design. It exists precisely so progress never has to be re-derived by scanning |
| Everything under `shared/` | **Read whole. Never grep for a fragment** | See below |

**Why instruction files are never grepped:** they are behavioral directives, not reference data. A grepped fragment yields the rule but drops the reason behind it, the exceptions that qualify it, and the adjacent rules that interact with it — which is how a rule gets followed to the letter and missed in intent. These files are also small (all under ~300 lines, most under 160); a grep round-trip plus a follow-up read usually costs more than reading one whole.

**Practical rule:** searching for a *fact* → grep. Judging whether something is *coherent, complete, or correct* → read whole. Never grep to decide something you have not read.

---

## docs/00_MEMORY/STATE.md — the coordination point

**New file, and the only place atoms coordinate through.** Atoms do not call each other; they read and write agreed locations. `STATE.md` answers "where are we" without re-deriving it from the narrative log every session.

**Stores enumerations and pointers only — never content.** When it conflicts with `SESSION_MEMORY.md`, **the narrative log wins** (it is the append-only record of what actually happened; `STATE.md` is a derived cache).

```yaml
current_stage:  research | value | prd | entity | design | delivery
gates_passed:   [value_anchor, pain_coverage, three_layer]   # gates already cleared
artifacts:      # existing deliverables → path
  strategy_doc:  docs/01_STRATEGY/v1_0_value_and_scope_20260914.md
  framework_prd: docs/02_PRD/framework-prd.md
  design_tokens: null
open_items:     # unresolved 待定项: ID + one line
  - 待定-003: 通知触达范围未与法务对齐
updated:        2026-09-14
```

**Update trigger:** whenever an atom finishes a unit of work, clears a gate, produces an artifact, or opens/closes a 待定项. Rewrite the affected field; do not append history here — history belongs in `SESSION_MEMORY.md`.

---

## docs/00_MEMORY/CONTEXT_SNAPSHOT.md

**Role:** The "Evidence Locker". Records raw user inputs, constraints, and story samples that serve as the factual basis for decisions. **Append-only.**

### Format rules (MUST follow when appending)

1. **Heading:** `## [CNT-XXX] 简短标题（日期）` — 每条一个二级标题；简单事实可省略日期，会议/外部输入必须带日期
2. **Structured fields first:** 条目开头用 bullet list 列出结构化元数据（来源、参会方、数据规模等），字段名用 `**bold**`
3. **正文内容:** 用 bullet list (`-`) 组织，关键分类用 **bold 行内标题 + 冒号**（如 `**AI外呼：**`），嵌套用缩进子项
4. **不要用** 大段散文 / `###` 子标题；CONTEXT_SNAPSHOT 只用到二级标题 `##`
5. 条目之间无需 `---` 分隔线（二级标题已足够区分）

```markdown
# CONTEXT_SNAPSHOT — {project_id}
**Project ID:** {project_id}
**项目文件夹:** [链接文字](url)
---

## [CNT-001] 项目背景
HiringAgent 是一个候选人推荐系统，核心功能是为招聘岗位推荐合适的候选人。

## [CNT-002] 数据结构
当前分析使用的评测数据表（表名）包含以下字段：
- **job_id**: 岗位 ID
- **talent_id**: 候选人 ID
- **active_tag**: 活跃标签（7天内活跃 / 30天内活跃 / NULL）

## [CNT-005] 全量数据更新（2026-04-27）
**全量评测数据表**（表名），12,081 条记录，27 个岗位 × 5 个职位类别。
数据规模：
- 评测数据：11,093 个独立候选人 × 27 个评测岗位
- 锁定数据：5,191 条锁定记录 × 2,824 个岗位

## [CNT-008] EB风险评估对齐会议（2026-04-28）
- **来源：** [文档标题](url)
- **参会方：** 产品侧（A、B）× EB侧（C、D）
- **评估范围：** 模块1、模块2、模块3
**模块1（细分标题）——与项目直接相关：**
- 现状：xxx
- 测试计划：xxx
- 触达范围争议：
  - 子议题1：结论
  - 子议题2：结论
**跨模块共性结论：**
- 结论1
- 结论2
```

**Update trigger:**
- User tells a specific story (value discovery).
- User sets a hard constraint.
- User explicitly corrects a misunderstanding.
- External meeting / review produces new facts or constraints.

---

## docs/00_MEMORY/SESSION_MEMORY.md

**Role:** The "Narrative Log". Records what happened, connecting facts (Context) to conclusions (Decisions). **Append-only.**

### Format rules (MUST follow when appending)

1. **Heading:** `## 日期 · 简短标题` — 每个 session 一个二级标题
2. **条目之间:** 用 `---` 分隔线隔开不同日期的 session
3. **内部结构:** 用 `### 子标题` 组织不同维度（背景、核心发现、方法论沉淀、待办等）
4. **字段标签:** 用 `**字段名：**` 或 `**字段名**` 格式（如 `**背景：**`、`**数据源：**`、`**状态：**`）
5. **正文内容:** 用 bullet list + 编号列表组织，关键发现用 **bold**
6. **待办清单:** 用 `- [ ] xxx` checkbox 格式
7. **交叉引用:** 引用 CONTEXT_SNAPSHOT 时用 `[CNT-XXX]`，引用 DECISIONS 时用 `[D-XXX]`

```markdown
# SESSION_MEMORY — {project_id}

## 2026-04-24 · 候选人资源数据分析（探索性）
**背景：** 在项目中对候选人推荐数据做探索性分析。
**数据源：** 在线表格 [表名](url)，共 N 条记录。
**分析思路（方法论沉淀）：**
### 思路一：锁定状态分析
- 按 rank 分段统计锁定比例
- 关键发现：头部候选人约 70% 锁定
### 产品层面初步洞察（待更全数据验证）
1. 未锁定 ≠ 可用，推荐策略应引入活跃度加权
1. 「即将解锁 + 活跃」是真正高价值池
**状态：** 探索性分析完成，结论暂不固化。
**待办：**
- [ ] 用户将提供包含岗位分类的更全数据
- [ ] 基于新数据按岗位维度拆分分析
---

## 2026-04-28 · EB风险评估对齐会议
### 背景
因项目涉及AI外呼等能力，存在EB风险，与EB团队进行评估。
会议纪要来源：[文档标题](url)
### 与项目直接相关的结论
1. **结论1**：详细说明
1. **结论2**：详细说明
### 对产品策略的影响
- 影响点1
- 影响点2
### 待办
- [ ] 任务描述（负责人）
- [ ] 任务描述
```

**Update trigger:** End of a meaningful discussion loop or session.

---

## docs/TODO.md

**Role:** The "Action List". Single source of truth for tasks.

### Format rules (MUST follow when appending)

1. **每条 TODO 格式（严格）:** `- [ ] **TODO-XXX** \`[tag]\` 描述` — checkbox + bold ID + backtick-wrapped tag + 描述文字
2. **HIGH 标记:** 紧急项在 tag 后加 `**[HIGH]**`，如 `- [ ] **TODO-006** \`[flow]\` **[HIGH]** 描述`
3. **子项缩进:** 用两个空格缩进，格式为 `- 字段名: 内容` 或 `- **字段名:** 内容`；常用字段包括 Trigger / Added / Impact / 前置依赖 / 负责人
4. **分组标题:** 用 `## Open`、`## In Progress`、`## Done`、`## Dropped` 四个固定二级标题；批量新增用 `## Open(日期 新增 · 批次主题)` 子标题
5. **状态变更:** 用 `## 状态变更(日期 · 变更主题)` 子标题，记录 TODO 状态流转，格式为 `- **TODO-XXX** \`[tag]\` 描述 → **新状态**`
6. **条目之间:** 同一 section 内的 TODO 之间不需要分隔线；不同 section 之间可用 `---`

```markdown
# TODO — {project_id}

## Open
- [ ] **TODO-001** `[value]` 与用户确认 Hypothesis Tree 顶层分类
  - Trigger: Session 2026-04-22 AI PM 提出
  - Added: 2026-04-22
- [ ] **TODO-006** `[flow]` **[HIGH]** 验证 A4 隐含假设——当前排序是否有效
  - 提议实验:同一批候选人分别以原序和打散序推给 HM
  - 若该假设不成立:Hypothesis Tree B/C 层需重构
  - Added: 2026-04-22

## In Progress
*(none)*

## Done
*(none)*

## Dropped
*(none)*
---

## Open(2026-04-28 新增 · EB风险评估跟进)
- [ ] **TODO-030** `[ops]` **[HIGH]** 整理过去AI外呼反馈数据，提交给EB团队
  - 背景：EB去年曾叫停AI外呼，重启前需提供历史反馈数据
  - 负责人：xxx
  - Trigger: [CNT-008] EB对齐会议
  - Added: 2026-04-28
- [ ] **TODO-031** `[flow]` **[HIGH]** 与法务/HR对齐不可触达人才黑名单机制
  - 内容：背调红灯、诉讼纠纷等人群的过滤规则需跨部门共识
  - 关联方：法务、合规、HR
  - Trigger: [CNT-008] EB对齐会议
  - Added: 2026-04-28

## 状态变更(2026-04-24 · v1 方向反转)
- **TODO-011** `[flow] [HIGH]` HM 反馈交互重新设计 → **[PIVOT] Open**
  - 原计划:基于 D-001 的条件级形态
  - 新状态:D-001 已废弃,回到 Scene 1
  - Updated: 2026-04-24
```

**Dimension tags:** `[value]` `[flow]` `[entity]` `[interaction]` `[design]` `[ops]` `[infra]`

**Update triggers:**
- User signals uncertainty → append to Open
- Decision resolves a pending item → move to Done with resolution note
- Item becomes irrelevant → move to Dropped with reason
- External meeting produces action items → append to Open with batch header

---

## docs/01_STRATEGY/DECISIONS.md

**Role:** The "Rule Book". Human-readable record of business judgments.

```markdown
# Business Decisions — {project_id}

## DEC-001 · {Short decision title}
- **Date:** 2026-03-01
- **Context:** Based on [CNT-001]
- **Decision:** One sentence summary of what was decided
- **Rationale:** Why this direction, not alternatives
- **Trade-offs accepted:** What was explicitly de-prioritized
- **Residual risk:** Known open questions from this decision

---
```

**Written when:** Consensus Detection fires — user signals agreement on a business judgment.

**Critical rule:** DECISIONS are **never written without explicit user confirmation**. The AI may draft a decision, but it must present the draft and wait for the user to approve before writing to `DECISIONS.md`. If the decision overrides or conflicts with an existing Context entry, the decision must explicitly reference the affected `[CNT-XXX]` and state the override reason.

---

## Project initialization

Run `scripts/init_project.sh <project_id>` — it creates the whole skeleton deterministically. Directory layout → [conventions.md](conventions.md).

---

## Two-layer principle within Layer 2

| Sub-layer | Records | Files |
|-----------|---------|-------|
| **Objective facts** | What happened & user's raw input | `docs/00_MEMORY/SESSION_MEMORY.md`, `docs/00_MEMORY/CONTEXT_SNAPSHOT.md` |
| **Logic assets** | Conclusions — decisions, flows, specs | `docs/01_STRATEGY/DECISIONS.md`, other `docs/` |

Facts layer = history. Logic layer = conclusions.

**When they conflict — stop and flag, do not auto-resolve.** The AI must:
1. Surface the conflict to the user: *"I noticed [DEC-XXX] may conflict with the earlier constraint [CNT-XXX] — here's what I see: [brief description]. How would you like to handle this?"*
2. Wait for the user's judgment.
3. If the user decides to override: record a new decision in `DECISIONS.md` that explicitly references `[CNT-XXX]` and explains why the override is justified.
4. The original Context entry is never deleted or modified — it remains as historical evidence.
