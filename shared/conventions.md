# Conventions — naming, IDs, versioning, layout

**The single source for every naming and versioning rule.** Atoms reference this file; no atom restates these rules inline.

---

## Document naming

Format: `vX_Y_<short_description>_<yyyymmdd>.md`

| Component | Meaning | Example |
|-----------|---------|---------|
| `vX_Y` | Major.minor **product** version | `v1_0`, `v1_1`, `v2_0` |
| `short_description` | Underscore-joined keywords | `mvp_core`, `feat_login` |
| `yyyymmdd` | Date | `20260301` |

**Examples:**
- Framework PRD: `v1_0_mvp_core_workflow_20260301.md` → `docs/02_PRD/`
- Feature PRD: `v1_0_feat_notification_center_20260301.md` → `docs/02_PRD/`
- Strategy doc: `v1_0_value_and_scope_20260301.md` → `docs/01_STRATEGY/`
- Research report: `v1_0_research_competitors_20260301.md` → `docs/04_RESOURCES/`

---

## Document version suffix

Distinct from the product version. When creating a revision (annotation Method B), the **trailing document version number** increments by 1. With no suffix present, append `_2` for the first revision.

| Original filename | New filename |
|------------------|-------------|
| `v1_0_feat_login_20260301` | `v1_0_feat_login_20260301_2` |
| `v1_0_mvp_framework_20260301_2` | `v1_0_mvp_framework_20260301_3` |

`vX_Y` is the product version — **never change it here**. Only the trailing document version increments.

---

## ID allocation

All IDs are zero-padded to three digits and **never reused**, even after an item is dropped.

| Prefix | Lives in | Assigned by |
|---|---|---|
| `CNT-XXX` | `docs/00_MEMORY/CONTEXT_SNAPSHOT.md` | Next unused number in that file |
| `DEC-XXX` | `docs/01_STRATEGY/DECISIONS.md` | Next unused number in that file |
| `TODO-XXX` | `docs/TODO.md` | Next unused number across all sections, Dropped included |
| `待定-XXX` / `待确认-XXX` | Any document | Per-document sequence; the summary table at the doc's end is authoritative |

**Before allocating, scan the target file for the highest existing number.** Do not assume the count of entries equals the highest ID — dropped items leave gaps.

---

## File system layout

```
{project_root}/                      # One git repo per project
├── docs/                            # Project deliverables (commit this)
│   ├── 00_MEMORY/                   # Explicit memory
│   │   ├── CONTEXT_SNAPSHOT.md      # Fact snapshot (append-only)
│   │   ├── SESSION_MEMORY.md        # Session log (append-only)
│   │   └── STATE.md                 # ★ The only coordination point between atoms
│   ├── 01_STRATEGY/                 # 立项文档（价值与范围）+ DECISIONS.md
│   ├── 02_PRD/                      # PRD docs — framework + feature level
│   │   ├── README.md                # 目录说明 & 各 PRD 文件用途
│   │   └── framework-prd.md         # 默认 Framework PRD 主文档（可按项目约定更名）
│   ├── 03_DESIGN/                   # 设计与中间产物：PRD 之后、开发之前
│   │   ├── design-tokens.md         # 真实 token（brownfield 提取 / greenfield 自定）
│   │   ├── screens/                 # 定稿界面
│   │   ├── handoff/                 # 每屏交付说明
│   │   ├── ui_ux/                   # 设计指导文档、设计原则、页面拆分
│   │   ├── prototypes/              # 线稿与组件 demo
│   │   ├── ai_prompts/              # 模拟的 AI Prompt
│   │   └── tech_design/             # 技术设计文档
│   ├── 04_RESOURCES/                # 调研报告、竞品资料、原始输入
│   └── TODO.md                      # Single source of tasks
└── .ai-pm-prefs.md                  # 个人偏好（见 shared/preferences.md）
```

> This layout applies to local-disk hosts. In **Mira**, Layer 2 lives in Feishu under the fixed root folder → [hosts.md](hosts.md).

### What goes in 03_DESIGN

PRD answers **what to build**; `03_DESIGN/` answers **how it looks, what it says, what the tech approach is**.

| Subdirectory | Contents |
|---|---|
| `ui_ux/` | 设计指导文档（页面拆分到字段粒度）、全局设计原则、导航与信息架构、共享组件说明 |
| `prototypes/` | 线稿（Figma 链接 / 导出图 / Mermaid / ASCII 均可）与关键组件 demo |
| `screens/` | 定稿高保真界面 |
| `handoff/` | 每屏交付说明（给开发读） |
| `ai_prompts/` | 产品相关的 AI 话术与 Prompt 草稿、边界 case 预期话术 |
| `tech_design/` | 模块划分、接口约定、数据流、技术选型与风险 |

**设计阶段的产出顺序（建议）：** 设计指导文档（文字版）→ 设计原则与核心流程线稿（可并行）→ 关键组件 demo → 定稿视觉与 handoff。

### 与记忆系统同步

重要设计决策（含待定项结论、技术选型）确认后，除在 `03_DESIGN/` 更新外：讨论过程记入 `SESSION_MEMORY.md`，关键事实或约束追加到 `CONTEXT_SNAPSHOT.md`；涉及业务判断的，经用户确认后写入 `DECISIONS.md`。产出物路径同步进 `STATE.md` 的 `artifacts`。

---

## Directory-to-atom ownership

Which atom writes where. Reading is unrestricted; **writing outside your own column requires a reason stated to the user.**

| Directory | Written by |
|---|---|
| `docs/00_MEMORY/` | Every atom (memory is shared) |
| `docs/01_STRATEGY/` | `pm-value` |
| `docs/02_PRD/` | `pm-prd`, `pm-entity` |
| `docs/03_DESIGN/` | product-feature-helper (delivery layer) |
| `docs/04_RESOURCES/` | `pm-research` |
| `docs/TODO.md` | Every atom |
