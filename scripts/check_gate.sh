#!/usr/bin/env bash
#
# check_gate.sh — report definition-layer gate state deterministically,
# so gates stop being honor-system prose.
#
# Usage:
#   bash scripts/check_gate.sh <project_root> [gate]
#
#   gate: value_anchor | pain_coverage | three_layer | all   (default: all)
#
# Exit codes:
#   0 — every requested gate passed
#   1 — at least one gate not passed   (advisory for definition-layer work:
#       the orchestrator surfaces this and lets the user decide; it does NOT
#       silently proceed as if the gate had passed)
#   2 — usage / project structure error
#
# Always invoke with `bash` — the execute bit can be lost by packaging,
# unzipping, or a cross-platform clone.

set -uo pipefail

ROOT="${1:-}"
GATE="${2:-all}"

if [ -z "$ROOT" ]; then
  echo "❌ Missing project_root." >&2
  echo "   Usage: bash scripts/check_gate.sh <project_root> [value_anchor|pain_coverage|three_layer|all]" >&2
  exit 2
fi

DOCS="$ROOT/docs"
if [ ! -d "$DOCS/00_MEMORY" ]; then
  echo "❌ Not an initialized ai-pm project: $DOCS/00_MEMORY not found." >&2
  echo "   Run: bash scripts/init_project.sh <project_id> $ROOT" >&2
  exit 2
fi

STATE="$DOCS/00_MEMORY/STATE.md"
STRATEGY_DIR="$DOCS/01_STRATEGY"
PRD_DIR="$DOCS/02_PRD"

FAILED=0
SKIPPED=0

pass() { echo "✅ $1"; }
fail() { echo "🚫 $1"; FAILED=1; }
skip() { echo "⚠️  $1 — NOT CHECKED (cannot verify here, do not count as passed)"; SKIPPED=1; }

# A real TODO entry looks like: - [ ] **TODO-001** `[tag]` ...
# Checking "file is non-empty" gives false positives — the scaffold contains
# heading and format-hint lines that are not entries.
has_todo_entries() {
  local f="$1"
  [ -f "$f" ] || return 1
  grep -qE '^\s*-\s*\[[ xX]\]\s*\*\*TODO-[0-9]+\*\*' "$f" 2>/dev/null
}

check_value_anchor() {
  echo "── gate: value_anchor ──"
  local doc
  doc="$(ls "$STRATEGY_DIR"/*value*scope*.md "$STRATEGY_DIR"/*.md 2>/dev/null | grep -v DECISIONS | head -1)"
  if [ -z "$doc" ]; then
    fail "no strategy doc in 01_STRATEGY/ — value anchor not recorded anywhere"
    return
  fi
  if grep -qiE '价值锚点|tangible anchor|value anchor' "$doc"; then
    if grep -qE '\[待定-[0-9]+\]|\[待确认-[0-9]+\]' "$doc"; then
      fail "$(basename "$doc"): anchor section present but still has unresolved 待定项 — state which, do not report the anchor as settled"
    else
      pass "$(basename "$doc"): value anchor section present, no unresolved 待定项"
    fi
  else
    fail "$(basename "$doc"): no 价值锚点 / Tangible Anchor section found"
  fi
  skip "whether the user actually CONFIRMED the anchor — only the conversation shows that"
}

# Real content = lines that are not headings, quotes, blank, or "*(...)" scaffold hints.
real_lines() { grep -vE '^\s*(#|>|\*\(|$)'; }

FLOW="$PRD_DIR/flow.md"
ENTITIES="$PRD_DIR/entities.md"

# Projects created with v2 kept journeys / Screen Tree inside framework-prd.md.
legacy_hint() {
  if ls "$PRD_DIR"/*framework*.md >/dev/null 2>&1; then
    echo "   (v2 layout? journeys and Screen Tree used to live in framework-prd.md §2/§3 —"
    echo "    move them into flow.md; entities into entities.md; then re-assemble the PRD.)"
  fi
}

check_pain_coverage() {
  echo "── gate: pain_coverage ──"
  if [ ! -f "$FLOW" ]; then
    fail "no flow.md in 02_PRD/ — journeys not recorded (written by pm-flow)"
    legacy_hint
    return
  fi
  if [ -z "$(awk '/^## 1 /,/^## 2 /' "$FLOW" | real_lines | head -1)" ]; then
    fail "flow.md: §1 Critical User Journeys is still empty scaffold"
  else
    pass "flow.md: §1 has journey content"
  fi
  if has_todo_entries "$DOCS/TODO.md"; then
    pass "TODO.md has real TODO-XXX entries — deferrals can be traced"
  else
    skip "TODO.md has no TODO-XXX entries: either nothing was deferred, or deferrals were never logged"
  fi
  skip "whether EVERY pain point maps to a journey or a logged deferral — requires reading both docs semantically"
}

check_three_layer() {
  echo "── gate: three_layer ──"
  local missing=""
  if [ ! -f "$FLOW" ] || [ -z "$(awk '/^## 3 /{f=1} f' "$FLOW" | real_lines | head -1)" ]; then
    missing="$missing Screen-Tree(flow.md §3)"
  fi
  if [ ! -f "$ENTITIES" ] || [ -z "$(real_lines < "$ENTITIES" | head -1)" ]; then
    missing="$missing Entities(entities.md)"
  elif ! grep -qE '→|->' "$ENTITIES"; then
    # A real state machine writes transitions; look for the arrow form.
    missing="$missing State-transitions(entities.md)"
  fi
  if [ -n "$missing" ]; then
    fail "incomplete:$missing — do NOT say \"ready to build\""
    [ -f "$FLOW" ] || legacy_hint
  else
    pass "Screen Tree, entities and state transitions all present"
  fi
  skip "Backend business rules & AI call points completeness — semantic, not detectable here"
}

echo "ai-pm gate check — project: $ROOT"
echo

case "$GATE" in
  value_anchor)  check_value_anchor ;;
  pain_coverage) check_pain_coverage ;;
  three_layer)   check_three_layer ;;
  all)           check_value_anchor; echo; check_pain_coverage; echo; check_three_layer ;;
  *) echo "❌ Unknown gate: $GATE" >&2
     echo "   Valid: value_anchor | pain_coverage | three_layer | all" >&2
     exit 2 ;;
esac

echo
if [ -f "$STATE" ]; then
  echo "STATE.md says: $(grep -E '^\s*(current_stage|gates_passed):' "$STATE" | tr '\n' ' ')"
else
  echo "⚠️  STATE.md missing — the orchestrator has no coordination point to read."
fi

echo
if [ "$FAILED" -ne 0 ]; then
  echo "🚫 One or more gates NOT passed."
  echo "   Definition-layer gates are ADVISORY: state what is unmet and what it risks,"
  echo "   record it in STATE.md, and let the user decide whether to proceed."
  echo "   Do not report an unmet gate as passed."
  exit 1
fi

if [ "$SKIPPED" -ne 0 ]; then
  echo "✅ All machine-checkable conditions passed."
  echo "   Items marked NOT CHECKED above were not verified — say so rather than"
  echo "   claiming full coverage."
else
  echo "✅ All requested gates passed."
fi
exit 0
