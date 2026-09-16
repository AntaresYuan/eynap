# Doc backend — choose once, install on demand, remember it

Every atom produces a document. **How it gets written is not the atom's business** — the atom decides *what* goes in `01_STRATEGY/` or `02_PRD/`; this file decides *where that lands* and *what CLI writes it*.

Two deliberate choices:

| Choice | Why |
|---|---|
| **Ship with nothing installed** | Pre-installing several doc CLIs pays setup cost for every user to serve the one backend they actually use, and stale pre-installs fail in ways that look like skill bugs |
| **Ask once, then remember** | The question is worth asking exactly once per user; after that it belongs in preferences → [preferences.md](preferences.md) |

---

## Default: local Markdown, no install, no question

`docs/` on local disk is the default and needs **no CLI, no auth, no network**. It is what `scripts/init_project.sh` creates.

**Do not ask which backend to use until the user actually wants a document somewhere other than local disk.** Asking at startup, or "just in case", is friction for a decision most sessions never need. The atoms keep writing local Markdown until then.

---

## When to ask

Ask **once**, at the first moment a cloud document is genuinely needed:

- The user says they want the doc in Feishu / Lark / Notion / a wiki / "somewhere I can share".
- The deliverable is meant to circulate for review, and the user has not said where.
- An atom is about to write and `doc_backend` is unset in preferences **and** the user asked for something beyond a local file.

**Do not ask** when the user only wants a local file, when preferences already record a backend, or when the current request is read-only.

### How to ask

Present the options as a form when the host renders one, otherwise as plain text → [protocols.md](protocols.md). State the trade-off, not just the names, and **do not present one cloud vendor as if it were the only option**:

> 文档写哪儿？默认是本地 Markdown（`docs/` 下，零配置、随时可用）。想直接落到云文档、方便分享和评审的话，我接一次就行，之后都走它，随时能换。
>
> - **本地 Markdown** —— 现在就能用，不装东西；缺点是分享要自己搬
> - **飞书 / Lark、Notion、Confluence、Google Docs、语雀等云文档** —— 都能接，接入方式与认证成本各不相同；告诉我用哪个，我先确认它的写入路径和鉴权方式再动手

用户说了具体产品但不在上面的清单里，**不要说"不支持"** —— 先按下一节的接入方式分类去查，确认清楚再回答能不能接。

**Never install anything before the user picks.** Installing on their machine without being asked is not a shortcut worth taking.

---

## Backends: classify by integration route, not by vendor

**All mainstream cloud doc products are in scope.** The list below is not a whitelist — it is a map of the four routes a backend can arrive through. A product that is not named here is not unsupported; find which route it takes, confirm it, then use it.

**Resolve the route in this order** — stop at the first that works, because each step down costs more setup:

| # | Route | How to detect | Cost |
|---|---|---|---|
| 1 | **Host already provides the capability** | A `lark-doc` / docs skill or tool is already available in this host | Zero — install nothing |
| 2 | **Official first-party CLI** | The vendor ships a CLI that writes documents | One install + one auth |
| 3 | **Official REST API + token** | No CLI, but a documented write endpoint and a personal token | Token setup; write via `curl`/script |
| 4 | **Community CLI / MCP only** | Only third-party wrappers exist | Highest risk — see the caution below |

**Verify before you run.** Package names, registries, endpoints and auth flows all drift. Check `--help` or the vendor's own docs first; a stale command that half-succeeds is worse than one that fails loudly. If a command fails, read the error instead of retrying variants.

### Known routes as of writing

**Treat this table as a starting point that may be out of date — re-confirm before relying on any row.**

| Backend | Route | Write path | Auth |
|---|---|---|---|
| **Local Markdown** | — | Default, always available | None |
| **Feishu / Lark** | 1, else 2 | Host `lark-doc` capability if present; otherwise its CLI | Login per session; a fresh sandbox usually needs it again |
| **Notion** | 2 | Official `ntn` CLI: `ntn pages create --parent page:<id> --content` takes Markdown, `ntn pages edit` updates. REST `POST /v1/pages` also accepts markdown. [CLI ref](https://developers.notion.com/cli/reference/commands) · [API](https://developers.notion.com/reference/post-page) | `NOTION_API_KEY` bearer token |
| **Yuque 语雀** | 3 | REST API v2; **no official CLI**. Personal token from 设置 → Token | `X-Auth-Token` header |
| **Confluence** | 3 | REST `POST /wiki/api/v2/pages` with `spaceId` + `title` + `body`. [Basic auth guide](https://developer.atlassian.com/cloud/confluence/basic-auth-for-rest-apis/) | Atlassian email + API token, base64 basic auth |
| **Google Docs** | 3 | Docs API. **No first-party CLI for authoring** — `gcloud` only enables the API, it does not write documents. An official Docs MCP server exists. [MCP setup](https://developers.google.com/workspace/docs/api/guides/configure-mcp-server) | OAuth 2.0 client — heaviest setup of the group |
| **Obsidian / local-vault tools** | — | Plain Markdown files in a folder | None — treat as local Markdown pointed elsewhere |
| **Anything else** | Resolve 1→4 | Confirm the documented write path first | Varies |

**Google Docs is the one worth flagging to the user upfront**: it needs an OAuth client, not just a token, so it is materially more setup than the others. Say so before starting rather than halfway through.

### On community CLIs and MCP wrappers (route 4)

Several products only have third-party tooling. These are usable, but **tell the user what they are getting**: unofficial, may break on vendor API changes, and in some cases they ask for a session cookie rather than a scoped token — a cookie carries the user's whole session, so **never ask for one without saying what it grants**. Prefer route 3 with an official token over route 4 whenever both exist.

**Install into user scope, never system-wide.** If the host already exposes the capability as a skill or tool, use that and install nothing.

### When install or auth fails

Do **not** silently fall back and let the user believe the doc landed in the cloud. In order:

1. Report what failed — the command, the error, and whether it is install, auth, or permission.
2. Write the document to local Markdown so **the content is never lost**.
3. Tell the user it is local, and what would be needed to get it to the cloud.

This mirrors the capability-degradation rule in [hosts.md](hosts.md): degrade the channel, never the deliverable, and never misreport which channel was used → [verification.md](verification.md).

---

## Recording the choice

After the user picks and the backend actually works, record it in `<主项目目录>/.ai-pm-prefs.md` → [preferences.md](preferences.md):

```markdown
## 文档后端
- 选择：云文档（{backend}，{date} 确认）
- 安装：<实际用的安装方式>
- 授权：每个新沙箱需重新登录一次
- 落点：01_STRATEGY / 02_PRD / 04_RESOURCES 都写云文档；03_DESIGN 的 HTML 稿仍留本地
```

**Record only what was verified.** A backend that was chosen but never successfully wrote anything is not a settled preference — note it as pending instead.

Once recorded, every atom reads it at startup and stops asking.

---

## Switching later

The user can switch at any time, and switching is cheap by design — the choice lives in one line of preferences, not spread across the atoms.

1. Confirm which backend to move to, and **whether existing docs should be migrated or left where they are**. Ask; do not assume.
2. Install and verify the new backend before touching the old docs.
3. Update the preferences entry — **replace the old line, never keep two** → [preferences.md](preferences.md).
4. Leave already-written documents in place unless the user asked for migration. Silently moving a user's documents is not tidying up.

Mixed states are legitimate: an older project on local Markdown and a newer one in Feishu is fine. Record the backend per project when they diverge.
