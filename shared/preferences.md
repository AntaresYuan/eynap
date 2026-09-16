# Preferences — Layer 1 personal preferences

**One file, read by every atom, identical on every host.** This is the fix for a broken personalization loop: preferences used to live in `~/.claude/CLAUDE.md`, which the skill never read (it relied on the host loading it), which Cursor did not have at all, and which leaked PM preferences into unrelated coding and SQL sessions.

Three properties, all deliberate:

| Property | Why |
|---|---|
| **Skill-owned file, in the project directory** | Survives skill updates; preferences are the user's asset, not the skill's |
| **Read explicitly at startup, not host-loaded** | Works identically across local-disk and cloud hosts — no host branch |
| **Scoped to PM work** | Does not pollute coding sessions the way a global config does |

---

## File location

```
<主项目目录>/.ai-pm-prefs.md
```

Same pattern as product-feature-helper's `.product-feature-helper-prefs.md`, and for the same reasons.

**No project directory?** Keep preferences in conversation only for that session and say so — do not write a preferences file into a directory the user did not open as a project.

---

## When to read and write

**At startup (every atom, every session):** read the file if it exists and apply it. Skip questions it already answers; confirm only the decisive ones.

**On write — relaxed compared to the old rule.** Previously cross-project methodology was written at only two moments (Framework PRD finalization, phase close), which almost never fired, so nothing was ever learned. Now:

| Section | Write when |
|---|---|
| **Working Style & Communication** | Any time, via `[Meta]` / `[Meta1]`. Low friction, high frequency |
| **Cross-Project Methodology** | **Every `[Meta1]`**, plus the two original milestones (Framework PRD finalized, phase closes) |
| **文档后端 (doc backend)** | Once the user has picked a backend **and it successfully wrote something** → [doc-backend.md](doc-backend.md) |

**Still never auto-written.** Surface up to 3 candidate patterns, and write only what the user confirms. A pattern the user did not confirm is a guess, and guesses do not belong in a file that shapes every future session.

---

## Recommended structure

```markdown
# ai-pm 用户偏好

## Working Style & Communication
- [e.g., I prefer to discuss ideal flow before touching entities]
- [e.g., Think in Chinese for strategy, English for technical specs]
- [e.g., Keep responses concise unless I ask for depth]
- [e.g., Always show the tradeoff, not just the recommendation]
- [e.g., Push back when feature list grows — I tend to over-scope]

## Cross-Project Methodology

### Validated Patterns
- **[Pattern name]** | Source: {project-id} | Confirmed: {date}
  - Context: when does this apply
  - Approach: what to do
  - Why it works: one sentence

### Anti-Patterns
- **[Anti-pattern name]** | Source: {project-id} | Confirmed: {date}
  - Context: what triggers this mistake
  - What goes wrong: one sentence

### Open Hypotheses
- **[Hypothesis]** | Source: {project-id} | Status: watching
  - Observation: what was noticed
  - Needs: one more project to confirm or refute

## 文档后端
- 选择：{本地 Markdown / 云文档 / 其他}（{date} 确认）
- 安装：{实际验证过的安装方式，未装则写「无需安装」}
- 授权：{如每个新沙箱需重新登录一次}
- 落点：{哪些目录写云文档，哪些留本地}

## 做法禁忌
- [做法 + 为什么否决的一句话，避免重复踩]
```

文档后端的提问时机、安装方式与切换流程 → [doc-backend.md](doc-backend.md)。**未成功写入过的后端不算已确认偏好**，标为 pending。

---

## Milestone distillation

At Framework PRD finalization and at phase close: scan `SESSION_MEMORY.md` for cross-project patterns, surface up to 3 to the user, and write only the confirmed ones into **Cross-Project Methodology** above. This no longer requires waiting for a milestone — `[Meta1]` triggers it too.

---

## Update principles

- A new preference that contradicts a recorded one → **replace the old entry**, never keep two contradictory lines.
- A practice the user explicitly rejected → record it under 做法禁忌 with the reason.
- Unconfirmed inference, one-off task instructions, and temporary parameters → **do not record**.

---

## Boundary with global preferences

This file holds ai-pm–related preferences only. Genuinely cross-domain preferences (reply language, general communication style) belong to the host's own preference mechanism, not here.
