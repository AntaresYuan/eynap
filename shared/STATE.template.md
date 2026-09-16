# STATE — {project_id}

> **The coordination point.** Atoms do not call each other; they read and write agreed locations, and this file answers "where are we" in one read — no re-deriving progress from the narrative log.
>
> **Stores enumerations and pointers only, never content.** When it disagrees with `SESSION_MEMORY.md`, the narrative log wins. Schema and update rules → `shared/memory.md`.

```yaml
current_stage:  value          # research | value | prd | entity | design | delivery
gates_passed:   []             # value_anchor | pain_coverage | three_layer
artifacts:                     # existing deliverables → path (null when absent)
  research_report: null
  strategy_doc:    null
  framework_prd:   null
  design_tokens:   null
open_items:     []             # unresolved 待定项: "待定-XXX: one line"
updated:        {yyyy-mm-dd}
```

## Field notes

| Field | Rule |
|---|---|
| `current_stage` | Exactly one value from the enum. Users jump between stages freely — record where they **are**, not where the pipeline says they should be |
| `gates_passed` | Append only when a gate genuinely cleared. An advisory gate that was flagged-but-unmet does **not** go here |
| `artifacts` | Path relative to project root. `null` means the artifact does not exist — do not point at a planned filename |
| `open_items` | ID + one line, enough for the next session to raise it without opening the doc. Remove when resolved |
| `updated` | The date of the last change to this file |
