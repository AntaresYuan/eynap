#!/usr/bin/env bash
#
# init_project.sh — create the ai-pm project skeleton deterministically.
#
# Replaces 25 lines of prose that the model had to hand-build every time.
# Layout must match shared/conventions.md exactly.
#
# Usage:
#   bash scripts/init_project.sh <project_id> [target_dir]
#
# Always invoke with `bash` — the execute bit can be lost by packaging,
# unzipping, or a cross-platform clone.

set -euo pipefail

PROJECT_ID="${1:-}"
TARGET="${2:-.}"
TODAY="$(date +%Y-%m-%d)"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Missing project_id." >&2
  echo "   Usage: bash scripts/init_project.sh <project_id> [target_dir]" >&2
  exit 2
fi

DOCS="$TARGET/docs"

if [ -d "$DOCS/00_MEMORY" ]; then
  echo "ℹ️  $DOCS/00_MEMORY already exists — this project is already initialized."
  echo "   Nothing was overwritten. Inspect it before re-initializing."
  exit 0
fi

mkdir -p "$DOCS"/00_MEMORY \
         "$DOCS"/01_STRATEGY \
         "$DOCS"/02_PRD \
         "$DOCS"/03_DESIGN/{screens,handoff,ui_ux,prototypes,ai_prompts,tech_design} \
         "$DOCS"/04_RESOURCES

# ---- 00_MEMORY ----------------------------------------------------------
cat > "$DOCS/00_MEMORY/CONTEXT_SNAPSHOT.md" <<EOF
# CONTEXT_SNAPSHOT — $PROJECT_ID
**Project ID:** $PROJECT_ID

事实快照库（append-only）。记录用户原始输入、硬约束、真实故事样本，作为决策的事实依据。
格式规则见 \`shared/memory.md\`；条目用 \`## [CNT-XXX] 标题（日期）\`。
EOF

cat > "$DOCS/00_MEMORY/SESSION_MEMORY.md" <<EOF
# SESSION_MEMORY — $PROJECT_ID

叙事日志（append-only）。记录发生了什么，把事实（Context）连到结论（Decisions）。
格式规则见 \`shared/memory.md\`；每个 session 用 \`## 日期 · 标题\`。
EOF

cat > "$DOCS/00_MEMORY/STATE.md" <<EOF
# STATE — $PROJECT_ID

> 原子之间唯一的协调点。只存枚举和指针，不存内容。
> 与 SESSION_MEMORY 冲突时以叙事日志为准。字段说明见 \`shared/memory.md\`。

\`\`\`yaml
current_stage:  value          # research | value | flow | entity | design | prd
gates_passed:   []             # value_anchor | pain_coverage | three_layer
artifacts:
  research_report: null
  strategy_doc:    null
  flow_doc:        null
  entities_doc:    null
  design_tokens:   null
  interaction_doc: null
  prd:             null
open_items:     []
updated:        $TODAY
\`\`\`
EOF

# ---- 01_STRATEGY --------------------------------------------------------
cat > "$DOCS/01_STRATEGY/DECISIONS.md" <<EOF
# Business Decisions — $PROJECT_ID

业务判断的「结论与理由」。**没有用户明确确认不得写入。**
格式与触发时机见 \`shared/memory.md\`。

*(none yet)*
EOF

# ---- 02_PRD -------------------------------------------------------------
cat > "$DOCS/02_PRD/README.md" <<EOF
# 02_PRD — $PROJECT_ID

| 文件 | 用途 |
|---|---|
| \`flow.md\` | pm-flow：关键用户旅程 · MVP 范围 · Screen Tree |
| \`entities.md\` | pm-entity：状态表 · 转移矩阵 · 每状态操作与字段行为 |
| \`framework-prd.md\` | pm-prd：由立项文档、上面两份、交互文档**最后组装**的 PRD 成品 |

命名规则 \`vX_Y_<desc>_<yyyymmdd>.md\` 见 \`shared/conventions.md\`。
本 README 只说明目录用途。**改流程或实体时改 flow.md / entities.md，再重新组装 PRD，不要直接改 PRD 正文。**
EOF

cat > "$DOCS/02_PRD/flow.md" <<EOF
# Flow — $PROJECT_ID

> 由 pm-flow 写。pm-entity 从这里抽实体；发现页面结构对不上时改回本文件，不改 PRD。

## 1 Critical User Journeys
*(3–5 条 CUJ，每条从一个具体痛点出发，到用户达成价值锚点结束)*

## 2 MVP Scope
*(按旅程定义，不写功能清单；每条核心旅程写 Entry → Info → Action → Outcome)*

## 3 Screen Tree & Navigation
*(全局导航树 + 每屏信息层级与主要交互；入口点显式标注 \`[Entry Point for Journey X]\`)*
EOF

cat > "$DOCS/02_PRD/entities.md" <<EOF
# Entities — $PROJECT_ID

> 由 pm-entity 写，输入是 flow.md。每个实体一节：状态、转移（含反向与越级）、每状态操作、字段行为。

*(尚无实体)*
EOF

cat > "$DOCS/02_PRD/framework-prd.md" <<EOF
# Framework PRD — $PROJECT_ID

> **组装产物，最后生成。** 由 pm-prd 从立项文档、flow.md、entities.md、交互文档组装。
> 上游改了就重新组装，不要直接改这里的正文。骨架见 \`skills/pm-prd/references/prd-patterns.md\`。

*(尚未组装)*
EOF

# ---- 03_DESIGN ----------------------------------------------------------
cat > "$DOCS/03_DESIGN/design-tokens.md" <<EOF
# Design Tokens — $PROJECT_ID

**Source:** 未填充 —— 由 Scene 5 路由判定决定填法：

- **Brownfield（已有产品页）** → 跑 product-feature-helper 的 \`scripts/design-system.js\`，
  把 \`copy(window.__uiDS.cssText)\` 的结果原样粘进来，**保留 \`--pfh-*\` / \`.pfh-*\` 命名不翻译**。
- **Greenfield（0-to-1）** → 自定一套有主张的 token，每个值都是真实决策。

**禁止留填空占位。** 定不了的值标 \`[待定-XXX]\` 并在对话里交代，不要留下看起来像决策的空行。
写法见 \`skills/ai-pm/references/design-handoff.md\`。
EOF

# ---- 04_RESOURCES ------------------------------------------------------
cat > "$DOCS/04_RESOURCES/README.md" <<EOF
# 04_RESOURCES — $PROJECT_ID

调研报告、竞品资料、原始输入。报告结构与证据分级见 \`skills/pm-research/SKILL.md\`。
EOF

# ---- TODO --------------------------------------------------------------
cat > "$DOCS/TODO.md" <<EOF
# TODO — $PROJECT_ID

格式规则见 \`shared/memory.md\`。Tags: \`[value]\` \`[flow]\` \`[entity]\` \`[interaction]\` \`[design]\` \`[ops]\` \`[infra]\`

## Open
*(none)*

## In Progress
*(none)*

## Done
*(none)*

## Dropped
*(none)*
EOF

echo "✅ Project '$PROJECT_ID' initialized."
echo "   Memory:   $DOCS/00_MEMORY/ (CONTEXT_SNAPSHOT, SESSION_MEMORY, STATE)"
echo "   Strategy: $DOCS/01_STRATEGY/DECISIONS.md"
echo "   PRD:      $DOCS/02_PRD/ (README + flow.md + entities.md + framework-prd.md)"
echo "   Design:   $DOCS/03_DESIGN/ (6 subdirs + design-tokens.md)"
echo "   Tasks:    $DOCS/TODO.md"
echo
echo "No .gitignore changes needed — docs are meant to be committed."
