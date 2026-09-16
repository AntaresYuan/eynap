# Hosts — the single host branching table

**This is the only place host differences are described.** Every atom references this file; no atom restates a host branch inline. If a new host needs support, this file is the one place that changes.

---

## Supported hosts

| Host | Skill path | Layer 2 memory substrate | Layer 1 (personal prefs) |
|---|---|---|---|
| **Claude Code** | `~/.claude/skills/<atom>/` | Local disk — `{project_root}/docs/` | Skill-owned file, read explicitly → [preferences.md](preferences.md) |
| **Cursor** | `~/.cursor/skills/<atom>/` | Local disk — `{project_root}/docs/` | Same as above |
| **Mira** | host skill store | **Feishu docs** (see below) | Same as above |
| **DoubaoWork** | host skill store | Local disk — `{project_root}/docs/` | Same as above |

> **Layer 1 no longer branches by host.** Personal preferences used to live in `~/.claude/CLAUDE.md` and be loaded automatically by Claude Code only — which meant Cursor had no cross-project personalization at all, and PM preferences leaked into unrelated coding sessions. Preferences are now a skill-owned file that every atom reads explicitly at startup, identical on all hosts. See [preferences.md](preferences.md).

---

## Local disk hosts (Claude Code / Cursor / DoubaoWork)

- **Root:** `{project_root}/docs/`
- **Layout:** as defined in [conventions.md](conventions.md)
- **Initialization:** `scripts/init_project.sh`, or the protocol in [memory.md](memory.md)

Nothing else differs between these three. They are one branch.

---

## Mira — Feishu (Lark) docs

Mira sessions cannot rely on a persistent local `docs/` across sessions. Layer 2 memory MUST live in Feishu.

**Fixed root folder (all users of one deployment share this root):**
`<your-workspace-drive-folder-url>` — set this once per deployment; there is no default.

**Per-project layout (create under the fixed root):**
```
[AI-PM] {project_id}/
├── 00_MEMORY/
│   ├── CONTEXT_SNAPSHOT
│   ├── SESSION_MEMORY
│   ├── STATE
│   └── DECISIONS
├── 01_STRATEGY/
├── 02_PRD/
├── 03_DESIGN/
├── 04_RESOURCES/
└── TODO
```

**Local index (the only local state kept):**
`workspace/docs/00_MEMORY/.feishu-index.json` maps `project_id → { project_folder_token, subfolder_tokens, doc_urls }`. Always read it at session start and write back after creating any new folder/doc.

**Tool rules in Mira:**
- Create folders and move docs via `lark-drive-wiki-skill`.
- Create docs via `upload_to_feishu_tool` (do NOT pass `folder_token`; move afterwards).
- **Append to an existing doc:** use `feishu_update_doc_inplace`. NEVER use `feishu_update_doc_newcopy` for append — it forks a new doc each time and fragments memory.
- Full-document rewrite is not supported by `feishu_update_doc_inplace` without `selection_with_ellipsis`; when a true rewrite is needed, create a new versioned doc (e.g. `INTERVIEW_OUTLINE_V0_2`) instead of overwriting.
- Document names are human-readable, no extensions.

---

## Capability differences that affect delivery

The delivery-layer work (product-feature-helper) needs three host capabilities. Missing any one degrades the path but does not block it — **say which one is missing rather than silently downgrading**:

| Capability | If present | If absent |
|---|---|---|
| Feishu doc write (`lark-cli docs` / `lark-doc`) | interaction-doc writes the table directly | Produce the table XML as a local file and hand it to the user — do not discard screenshots already taken |
| Browser automation (`seed_browser_use` / Browser Use) | Agent can inject and screenshot directly | Fall back to delivering a Console script for the user to paste — this is PFH's main path anyway, so the loss is limited |
| Interactive takeover (`interaction.request_action`) | Agent can ask the user to clear a login wall | Tell the user directly that the page needs manual login |
| **A2UI form rendering** (host registers an A2UI tool / protocol tag **and** the client has a renderer) | Render a decision point as a form the user picks from → [protocols.md](protocols.md) | **Fall back to plain-text options in the conversation, carrying the same information** |

**A2UI is host infrastructure, not something a skill can provide.** A skill is a prompt: it can emit A2UI-shaped output, but rendering requires the host to have registered the tool or protocol tag, the client to have a renderer, and the current scene to be wired to it. **Never assume it is available** — check first, and when it is not, degrade to text rather than emitting a form nobody renders.

**`design-system.js` needs none of these.** It is a read-only browser script: the user can run it in their own Console and return `copy(window.__uiDS.cssText)`. That works on every host, at zero porting cost.

---

## Verifying a skill update (applies to `[Meta]` on any host)

After any `[Meta]` change that modifies a skill file, AI MUST verify the change actually persisted before reporting success, by **either**:
- re-invoking the skill and reading back the exact edited section to confirm the new text appears, **or**
- asking the user to start a new session and quote back the loaded content.

A success message from the writing tool is NOT sufficient evidence. Never tell the user a `[Meta]` change is "done" based solely on tool-level success. See [verification.md](verification.md).
