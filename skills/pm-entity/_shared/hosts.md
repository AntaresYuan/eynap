# Hosts — the single host branching table

**This is the only place host differences are described.** Every atom references this file; no atom restates a host branch inline. If a new host needs support, this file is the one place that changes.

> This file names common hosts as *examples* of where a skill can live, not as a closed list. Treat host detection as "local-disk substrate" vs "cloud-doc substrate" — a new host almost always falls into one of the two branches below.

---

## Two substrates, not N hosts

Classify a host by **where Layer 2 project memory can persist**, not by its product name:

| Substrate | Typical hosts | Layer 2 memory | Layer 1 (personal prefs) |
|---|---|---|---|
| **Local disk** | Any host that exposes a project filesystem (e.g. desktop IDE agents, CLI agents) | `{project_root}/docs/` | Skill-owned file, read explicitly → [preferences.md](preferences.md) |
| **Cloud docs** | Hosts where a session does not keep a persistent local filesystem between runs (e.g. web / cloud agents) | A shared cloud-drive folder (see below) | Same as above |

> **Layer 1 never branches by host.** Personal preferences are a skill-owned file that every atom reads explicitly at startup, identical on all hosts. They do not rely on any host auto-loading a global prompt file, and they do not leak PM preferences into unrelated sessions. See [preferences.md](preferences.md).

---

## Local-disk substrate

- **Root:** `{project_root}/docs/`
- **Layout:** as defined in [conventions.md](conventions.md)
- **Initialization:** `scripts/init_project.sh`, or the protocol in [memory.md](memory.md)

Any host that mounts a real working directory is this branch — no new branch needed per product.

---

## Cloud-doc substrate

When sessions cannot rely on a persistent local `docs/` across runs, Layer 2 memory lives in a shared cloud document store. The concrete store is a **deployment setting**, so none of its vendor-specific details are hardcoded here.

**Fixed root folder (set once per deployment):**
`<your-cloud-drive-root-folder-url>` — there is no default.

**Per-project layout under the fixed root:**
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
`workspace/docs/00_MEMORY/.cloud-index.json` maps `project_id → { project_folder_id, subfolder_ids, doc_urls }`. Read it at session start and write it back after creating any new folder/doc.

**Tool rules (host provides these; names vary by deployment):**
- Create folders and move docs with the host's cloud-drive capability.
- Create docs with the host's doc-upload capability (do not pass the parent folder id at creation if the tool does not support it; move afterwards).
- **Appending vs. rewriting** differ per store: prefer an in-place append; if the store only supports in-place edits over an explicit text selection and cannot whole-document rewrite, create a new versioned doc (e.g. `INTERVIEW_OUTLINE_V0_2`) instead of overwriting.
- Document names are human-readable, no extensions.

If the host exposes no cloud-doc capability at all, run in local-disk mode within the current workspace and say so — do not assume a store exists.

---

## Capability differences that affect delivery

The delivery layer (prototype injection, interaction docs) depends on optional host capabilities. Missing any one degrades the path but does not block it — **say which one is missing rather than silently downgrading**:

| Capability | If present | If absent |
|---|---|---|
| **Cloud doc write** | An interaction doc can be written directly into the cloud store | Produce the table markup as a local file and hand it to the user — do not discard screenshots already taken |
| **Browser automation** (a Browser-Use / equivalent driver) | The agent can inject and screenshot directly | Fall back to delivering a Console script for the user to paste — this is the prototype tool's main path anyway, so the loss is limited |
| **Interactive takeover** (a tool that hands control to the user mid-task) | The agent can ask the user to clear a login wall | Tell the user directly that the page needs manual login |
| **A2UI form rendering** (host registers an A2UI tool / protocol tag **and** the client has a renderer) | Render a decision point as a form the user picks from → [protocols.md](protocols.md) | **Fall back to plain-text options in the conversation, carrying the same information** |

**A2UI is host infrastructure, not something a skill can provide.** A skill is a prompt: it can emit A2UI-shaped output, but rendering requires the host to have registered the tool or protocol tag, the client to have a renderer, and the current scene to be wired to it. **Never assume it is available** — check first, and when it is not, degrade to text rather than emitting a form nobody renders.

**The read-only design-token extraction needs none of these.** It is a browser script the user can run in their own Console and paste back. That works on every host, at zero porting cost.

---

## Verifying a skill update (applies to `[Meta]` on any host)

After any `[Meta]` change that modifies a skill file, verify the change actually persisted before reporting success, by **either**:
- re-invoking the skill and reading back the exact edited section to confirm the new text appears, **or**
- asking the user to start a new session and quote back the loaded content.

A success message from the writing tool is NOT sufficient evidence. Never report a `[Meta]` change as "done" based solely on tool-level success. See [verification.md](verification.md).
