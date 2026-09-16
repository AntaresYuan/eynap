# Protocols — habitual actions, annotations, open items, `[Meta]`

**Behaviors shared by every atom.** Referenced, never copied into an atom's SKILL.md.

---

## Habitual Actions

**Consensus Detection**
User signals agreement → Log discussion in `SESSION_MEMORY.md` (citing `CONTEXT_SNAPSHOT.md` if applicable) → Draft the decision and present to user for confirmation → Only after explicit user approval, write to `docs/01_STRATEGY/DECISIONS.md` and update relevant docs. If the decision conflicts with an existing `[CNT-XXX]` entry, surface the conflict before writing.

**Intent Sniffing**
User signals uncertainty → Add to `docs/TODO.md` with tag (value / flow / entity / interaction / design / ops / infra).

**Inspiration Triage**
New idea surfaces: core value → short alignment now; detail → log to TODO, continue.

**Logic Conflict Detection**
New decision drifts from the Tangible Anchor → *"This might conflict with our earlier anchor around [X] — worth a quick check?"*

**State Update**
After finishing a unit of work, clearing a gate, producing an artifact, or opening/closing a 待定项 → update the affected field in `docs/00_MEMORY/STATE.md`. This is what lets the next session skip re-deriving progress. → [memory.md](memory.md)

---

## Open items（待确认项 / 待定项）

### Marking in documents

When writing **any** project document (PRD, strategy, design, handoff, research), mark details or options needing user confirmation with a **consistent text identifier**: `[待定-001]` or `[待确认-001]`. Keep a summary table of open items at the end of the section or document, listing ID, question, affected page/component, and related PRD or TODO.

ID allocation → [conventions.md](conventions.md).

### Presenting them in conversation — a global behavior

Whenever you introduce or refer to 待定项 in the **conversation**, do **not** only say "I recorded N 待定项 in the doc" or list IDs. Give the user enough context **in the dialogue** to decide without opening the file:

1. **Why** this point is open — what depends on it, or why it was left undecided.
2. **What** exactly you are asking them to decide — the choice, the options, or the trade-off, in user-facing language.
3. Where it appears in the doc, as a **reference only** (e.g. "详见 §X").

Document markup keeps things traceable; the conversation keeps the user informed and able to respond in chat. Both are required.

### Offering a form instead of prose — one generalized rule

**The rule is a judgment, not a list of cases.** Whenever you judge that the information at hand is not enough to produce a confidently correct result — the user's ask is underspecified, or several readings would each be defensible — offer the choice as a **form** (A2UI, when the host renders it → [hosts.md](hosts.md)), otherwise as plain-text options. This covers `[待定-XXX]`, annotation Method A/B, `[Meta]` layer confirmation, and the "no upstream, must ask" path in every atom.

**Do not enumerate per-case triggers** ("in situation A emit form X, in situation B emit form Y"). That is how a prompt doubles in size and starts contradicting itself. One judgment call, applied everywhere.

Two constraints that hold whichever channel you use:

1. **A form is presentation, never a shortcut on substance.** The why / what / trade-off above is still required. A form carrying only buttons and no reasoning leaves the user clicking blind — worse than prose, not better.
2. **Degrading to text must not lose information.** The text fallback carries the same options and the same context; only the affordance changes.

Prefer prose when the decision is genuinely open-ended, or when a fixed option set would force a false choice — a form is for choosing among knowable alternatives, not for flattening an open question.

### Resolving them

When the user resolves an item — in-doc or in chat:

1. **Make the conclusion explicit** in the document using a citation format (`[Answer to 待定-001]`), and **do not delete the original marker** — it preserves traceability.
2. **Preserve key business judgments** — sync to `DECISIONS.md` when the resolution is a business decision (user confirmation required).
3. **Check PRD conflict** — if the resolution contradicts the PRD, the PRD **must** be updated. Confirm with the user first, then either overwrite in place, or strike through the old text and append the new design.
4. **Record derived TODOs** in `docs/TODO.md`, and note the TODO number in the open-items summary table.
5. **Update `STATE.md`** — remove the item from `open_items`.

---

## Annotation Handling

**Trigger:** User writes `[批注]` or `[comment]` followed by content, either in the chat or inline within a document.

### Protocol — four steps, always in order

**Step 1 · Understand**
Read the annotation carefully. Identify: which part of the document it refers to, what problem or question the user is raising, and whether it is a content issue, a logic issue, or a phrasing issue.

**Step 2 · Discuss**
Respond with your understanding and proposed resolution in conversation. Do not touch the document yet.
Format: *"I see [批注X] is about [issue]. My suggestion: [solution]. Does this match what you had in mind?"*

**Step 3 · Confirm**
Wait for explicit user confirmation before making any changes. If the user refines the direction, update your proposal and re-confirm.

**Step 4 · Execute**
After confirmation, apply changes using the user's chosen method (below). When editing, convert each resolved annotation from inline text into a markdown blockquote — **do not delete it**:

```markdown
> [批注1] 这里的范围描述太宽了
```

This preserves the review history in the document.

### Two modification methods

Present both options after Step 3 confirmation, let the user choose:

**Method A · Edit in place** — modify the original document directly. Good for minor changes where version tracking is not critical.

**Method B · New version document** — create a new file. Naming and version-increment rules → [conventions.md](conventions.md). At the top of the new file, add:

```markdown
> 📝 Based on [批注1][批注2] from `{original_filename}`. Previous version: `{original_filename}`.
```

**Default recommendation:** Method B, to preserve full history. Suggest Method A only when the change is trivial or the document is still an early draft.

---

## `[Meta]` Mode

Three triggers, one protocol:

| Trigger | Meaning |
|---------|---------|
| `[Meta0]` | User suggests Layer 0 (skill definition) |
| `[Meta1]` | User suggests Layer 1 (personal preferences) |
| `[Meta]` | No preference stated |

All three follow the same execution protocol — AI always infers independently.

### Execution protocol

1. **Infer the most appropriate layer** from content signals.
2. **If trigger is `[Meta0]` or `[Meta1]`:** compare your inference with the user's suggestion.
   - **Agreement** → state layer + exact file path that will change, await confirmation.
   - **Disagreement** → *"You suggested Layer X, but I think Layer Y fits better because [reason]. Which do you prefer?"* Discuss, then confirm.
3. **If trigger is `[Meta]`:** state inferred layer + reasoning + exact file path, await confirmation.
4. **Before writing anything — validate the target path.** Resolve the path via [hosts.md](hosts.md); there is no host branching here.
   - **Layer 0** → the atom's own `SKILL.md` / `references/*.md`, or `shared/*.md` when the change is cross-cutting.
   - **Layer 1** → `<主项目目录>/.ai-pm-prefs.md` → [preferences.md](preferences.md).
   - **Layer 2** → must be inside `{project_root}/docs/`.
   - If the resolved path does not match the expected pattern, **stop and tell the user**: *"The path I resolved is `{path}`, which doesn't look right for a Layer X edit. Please confirm the correct path before I proceed."*
   - Paths inside a host's internal memory store (e.g. `~/.claude/projects/`) are **never** valid targets for Layer 0 or Layer 1 changes.
5. **Execute** — physically write to disk using file editing tools.
6. **Verify** the write succeeded by reading back the modified section → [verification.md](verification.md).
7. **Confirm:** *"Done. `{filepath}` updated on disk. Returning to [project]."*

**Critical:** A `[Meta]` change that is not written to disk has not happened. Never report "done" based solely on a tool-level success message.

### Layer inference guide

| Content signals | Inferred layer |
|----------------|----------------|
| Changes to how PM reasons, questions, or structures work | Layer 0 — Skill |
| Personal habits, working style, cross-project methodology | Layer 1 — Preferences |
| This project's specific conventions or constraints | Layer 2 — Project |

### Scope notes

**Which Layer 0 file** — a change to one atom's methodology goes in that atom; a change to memory, preferences, conventions, protocols, hosts, or verification goes in `shared/` and therefore affects **all** atoms. Say which one before writing.

Never edit an unrelated `SKILL.md` in the workspace. If several exist, confirm the exact path with the user first.

**Cross-layer escalation** — if Layer 1/2 content is proposed for promotion to Layer 0: *"This would become a default for all users of this skill. Still want to promote it?"*
