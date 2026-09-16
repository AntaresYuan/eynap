# Eynap — Everything You Need as an AI PM

**An AI product-manager skill kit: one orchestrator, five independently callable skills, and one shared foundation.**

> This is an adaptation of [SmileLiuuuu/ai-pm](https://github.com/SmileLiuuuu/ai-pm),
> released under the same CC BY-NC 4.0 license. The original author retains copyright on v1.0.0.
> See [Credits](#credits--版权与鸣谢).

---

**Site: <https://antaresyuan.github.io/eynap-site/>** — browse, download, and leave feedback.

---

## What changed from v1

v1 was a single five-Scene pipeline: to change one requirement you still had to run the whole thing from the start. v2 splits it apart:

| | v1.0.0 (original) | v2.0.0 (this project) |
|---|---|---|
| Structure | one SKILL.md, 581 lines | one orchestrator + five skills |
| Invocation | the whole pipeline every time | call whichever skill the task needs |
| Cross-cutting rules | scattered across the Scenes | extracted into `shared/`, one copy only |
| Missing upstream | depended on prior Scenes | each skill asks for what it needs itself |

The methodology is unchanged and comes entirely from v1: value anchors, scenario-based MVP rather than feature lists, PRDs that emerge as understanding deepens.

## What's inside

| Skill | What it does | Output |
|---|---|---|
| `ai-pm` | Orchestrator: detects stage, routes to a skill, checks gates; produces no deliverable itself | — |
| `pm-research` | Purpose-first research: business-funnel walkthrough plus single-variable controlled experiments, evidence-graded | `docs/04_RESOURCES/` |
| `pm-value` | Mines value anchors from real stories, reality-checks, converges the charter and scope | `docs/01_STRATEGY/` |
| `pm-prd` | Journeys, MVP, page structure; goals split into product vs. algorithm metrics, four-column interaction tables | `docs/02_PRD/` |
| `pm-entity` | State tables, forward/backward transitions, per-state permissions and field behavior | `docs/02_PRD/` |
| `product-feature-helper` | Extracts tokens from a real page, injects a clickable prototype, interaction docs with annotated screenshots | `docs/03_DESIGN/` |

`product-feature-helper` is an **external skill**, installed separately and not included in this repo.

`shared/` is one foundation every skill reads: memory, preferences, naming, protocols, host differences, wording standards. Place it alongside the skills on deploy — **do not copy it into each skill directory**; having a single copy is the point.

## Install

The kit is plain Markdown and is not tied to any host. Pick the option that fits your environment.

**1. Claude Code / any host that supports plugins**

```bash
git clone https://github.com/AntaresYuan/eynap.git ~/.claude/plugins/eynap
```

Restart the host and call it with `@`. It picks up `.claude-plugin/plugin.json`.

**2. Cursor**

```bash
git clone https://github.com/AntaresYuan/eynap.git .cursor/rules/eynap
```

Reference `skills/ai-pm/SKILL.md` in your `.cursorrules`.

**3. Any agent that can read local files**

Clone anywhere in your project and add one line to your system prompt:

> When product work is needed, read `skills/ai-pm/SKILL.md` first.

**4. Manual / no agent**

Use it as a writing template: fill in the structure under `skills/<skill>/SKILL.md` yourself.

The only hard requirement is that the agent can read local files; option 4 does not even need that.

## Usage

Bring one concrete task — you do not have to start from the beginning:

| You want to | Say |
|---|---|
| A fuzzy idea needs to become a charter | `/pm-value` |
| Write a PRD or lay out the user flow | `/pm-prd` |
| Untangle a business object's states, permissions, fields | `/pm-entity` |
| Research or benchmark, with the other side's performance quantified | `/pm-research` |
| Build a new product and don't know where to start | "build a product from scratch" — the orchestrator routes by stage |

Use it inside one project directory across sessions; skills hand off through `STATE.md`, so you don't restate context. Without a project directory, the deliverable is given directly in the conversation.

## Scripts

Call both with `bash` (the executable bit may be lost when unpacking):

```bash
# create the agreed directory skeleton in a new project
bash scripts/init_project.sh <project_id> [target_dir]

# check whether the definition-layer gates pass
bash scripts/check_gate.sh <project_root> [value_anchor|pain_coverage|three_layer|all]
```

`check_gate.sh` checks **your project's output**, not this repository itself.
Exit codes: 0 all passed, 1 a gate failed (advisory — you decide whether to proceed), 2 usage or structure error.

## Contributing

Issues and pull requests are welcome. Two notes:

- For **methodology-level changes** (how to mine a value anchor, how to structure a PRD), discuss in the [upstream repo](https://github.com/SmileLiuuuu/ai-pm), where it originates.
- For the **split structure, shared foundation, and per-skill usability**, open changes here.

Please follow the wording standard in `shared/verification.md`: no buzzwords, no metaphors, no jargon.

## About the word "open source"

This project is **publicly available and free for non-commercial use**, but under the [Open Source Definition](https://opensource.org/osd), CC BY-NC **is not an open-source license** — an open-source license cannot restrict commercial use. As an adaptation it cannot be licensed more permissively than the original, so this will not switch to MIT. If this matters to you, discuss a license change with the upstream author.

### The author's interpretation of "non-commercial"

The license text in [LICENSE](LICENSE) governs; the following is the author's statement of intent to clear up common ambiguity, and **does not change the license itself**:

- ✅ **Allowed**: downloading, studying, modifying, and personal use by individuals; everyday internal use within your organization/company; non-commercial fork development and redistribution (attribution required, must remain CC BY-NC).
- ❌ **Not allowed**: reselling the kit or a derivative as a product, selling access to it, or bundling it into an externally charged product or paid service.
- The test is **whether you charge money for the kit itself**: using it to do your normal job is not commercial; selling the kit itself is.

## License

[CC BY-NC 4.0](LICENSE) — Attribution required, non-commercial use only.

---
---

# Eynap — Everything You Need as an AI PM（中文版）

**把产品经理的活拆成能单独调用的技能：1 个编排者 + 5 个技能 + 1 份共享地基。**

> 本项目是 [SmileLiuuuu/ai-pm](https://github.com/SmileLiuuuu/ai-pm) 的重构衍生版本。
> 原作者保留初版著作权，本项目沿用 CC BY-NC 4.0 授权。详见[版权与鸣谢](#credits--版权与鸣谢)。

---

**站点：<https://antaresyuan.github.io/eynap-site/>** — 在线浏览、下载、提反馈。

---

## 和初版的区别

初版是一条五 Scene 的单技能流水线：想改一段需求，也要从头走一遍。这一版把它拆开了：

| | v1.0.0（初版） | v2.0.0（本项目） |
|---|---|---|
| 结构 | 1 个 SKILL.md，581 行 | 1 个编排者 + 5 个技能 |
| 调用 | 走完整条流水线 | 哪件事需要就调哪个 |
| 横切规则 | 散在各 Scene 里 | 抽成 `shared/`，只存一份 |
| 缺上游时 | 依赖前序 Scene 的产出 | 技能自己把必要信息问齐 |

方法论骨架没有变，全部来自初版：价值锚点、场景而非功能清单、PRD 随理解加深而涌现。

## 这里有什么

| 技能 | 做什么 | 产出落点 |
|---|---|---|
| `ai-pm` | 编排者：判定阶段、路由技能、检查关卡，自己不产出交付物 | — |
| `pm-research` | 目的先行的调研：业务漏斗走查 + 单变量对照实验，证据分级 | `docs/04_RESOURCES/` |
| `pm-value` | 从真实故事挖价值锚点，现实检验，收敛立项与范围 | `docs/01_STRATEGY/` |
| `pm-prd` | 旅程、MVP、页面结构；目标分产品/算法写指标，交互四列表 | `docs/02_PRD/` |
| `pm-entity` | 状态表、正反向转移、每状态权限与字段行为 | `docs/02_PRD/` |
| `product-feature-helper` | 真实页面提取 token、注入可点原型、带标注截图的交互说明 | `docs/03_DESIGN/` |

`product-feature-helper` 是**外部技能**，需另行安装，本仓库不包含。

`shared/` 是所有技能共读的一份地基：记忆、偏好、命名、协议、宿主差异、措辞规范。部署时要一并放置，**不要复制进各技能目录**——它的价值就在于只有一份。

## 安装

### 一行命令（推荐）

```bash
npx skills add AntaresYuan/eynap --skill '*'
```

用的是 [Vercel 开源的 `skills` CLI](https://github.com/vercel-labs/skills)，
自动识别你装了哪些 Agent 并放到对应目录，支持 Claude Code、Cursor、Codex、
OpenCode 等 70 多个宿主。

常用变体：

```bash
# 看看有哪些技能
npx skills add AntaresYuan/eynap --list

# 装到全局（所有项目可用），默认是装到当前项目
npx skills add AntaresYuan/eynap --skill '*' -g

# 只装给某个 Agent
npx skills add AntaresYuan/eynap --skill '*' -a claude-code

# 之后更新
npx skills update
```

每个技能目录都自带一份 `_shared/`（记忆、命名、协议、核查规则），
所以单独装一个技能也能正常工作。仍然建议装整套——`ai-pm` 是编排者，
没有其他四个可路由就没意义。

> 改 `shared/` 时只改仓库根部那一份，然后跑 `scripts/sync_shared.sh` 同步。
> 副本存在只是因为 skills CLI 只复制技能目录本身，装到宿主后
> 指向仓库外的路径会断链。

### 手动安装

不想用 CLI，或者宿主不在支持列表里：

```bash
# Claude Code / 支持 plugin 的宿主
git clone https://github.com/AntaresYuan/eynap.git ~/.claude/plugins/eynap

# Cursor
git clone https://github.com/AntaresYuan/eynap.git .cursor/rules/eynap
# 然后在 .cursorrules 里引用 skills/ai-pm/SKILL.md

# 任意能读本地文件的 Agent
git clone https://github.com/AntaresYuan/eynap.git
# 在系统提示里写一行：需要产品工作时，先读 skills/ai-pm/SKILL.md
```

也可以从 [Releases](https://github.com/AntaresYuan/eynap/releases) 下 zip 包。

### 不用 Agent

当成写作模板：按 `skills/<技能>/SKILL.md` 的结构自己填。

最低要求只有一条：Agent 能读本地文件。最后这种连这个都不需要。

## 怎么用

带着一件具体的事来，不必从头走：

| 你要做的事 | 说什么 |
|---|---|
| 想法很模糊，要收敛成能立项的文档 | `/pm-value` |
| 写 PRD，或把用户流程讲清楚 | `/pm-prd` |
| 一个业务对象的状态、权限、字段没理清 | `/pm-entity` |
| 做调研或对标，想量化对方效果 | `/pm-research` |
| 从零做新产品，不知道先干哪步 | 「从头做一个产品」，编排者按阶段路由 |

连续使用时在一个项目目录里进行，各技能通过 `STATE.md` 交接，不必重复交代背景。没有项目目录时，产出直接在对话里给你。

## 附带的脚本

两个脚本都用 `bash` 调用（打包解压后执行位可能丢失）：

```bash
# 在新项目里建出约定的目录骨架
bash scripts/init_project.sh <project_id> [目标目录]

# 校验定义层关卡是否通过，让关卡不再只是口头约定
bash scripts/check_gate.sh <project_root> [value_anchor|pain_coverage|three_layer|all]
```

`check_gate.sh` 检查的是**你项目的产出**，不是本仓库自身。
退出码：0 全部通过，1 有关卡未过（提示性质，由你决定是否继续），2 用法或结构错误。

## 想一起改

欢迎 Issue 和 Pull Request。两点说明：

- **方法论层面的改进**（价值锚点怎么挖、PRD 怎么组织），建议回[上游仓库](https://github.com/SmileLiuuuu/ai-pm)讨论，那是它的源头。
- **拆分结构、共享地基、单技能可用性**相关的改进，在本仓库提。

写文档请遵守 `shared/verification.md` 里的措辞规范：不用大词、不用隐喻、不用黑话。

## 版权与鸣谢

本套件的初版（v1.0.0）由 **SmileLiuuuu** 创作，原始仓库 [github.com/SmileLiuuuu/ai-pm](https://github.com/SmileLiuuuu/ai-pm)，按 CC BY-NC 4.0 授权。

当前版本（v2.0.0）是在其基础上重构的衍生作品：把原先的五 Scene 单技能流水线，拆成 1 个编排者 + 5 个可单独调用的技能，并抽出一份共享地基。

依据 CC BY-NC 4.0，本衍生作品同样以 CC BY-NC 4.0 授权、保留原作者署名、**不得用于商业用途**。原作以「现状」提供，不附任何明示或默示担保。

感谢我的 mentor SmileLiuuuu。这套东西的方法论骨架都来自初版，v2.0.0 只是把它拆得更细、让每个环节能被单独调用。

### 关于「开源」这个词

本项目**公开源码、可自由非商业使用**，但按[开源定义](https://opensource.org/osd)，CC BY-NC **不是开源许可证**——开源许可证不能限制任何人商用。衍生作品也不能比原作更宽松，所以这里不会换成 MIT。如果你在意这一点，可以去上游仓库和原作者讨论许可变更。

### 作者对「非商业」的解释

许可证文本以 [LICENSE](LICENSE) 为准；以下是作者对使用边界的意图说明，用于消除常见歧义，**不改变许可证本身**：

- ✅ **允许**：个人下载、学习、修改、自用；在你所在的组织/公司内部日常工作中使用；非商业目的的二次开发与再分发（需保留署名、沿用 CC BY-NC）。
- ❌ **禁止**：把本套件或其衍生物本身作为商品转售、售卖访问权限、打包进对外收费的产品或付费服务。
- 判断标准是**有没有直接靠这套东西本身收钱**：拿它辅助你正常工作不算商用，拿它本身卖钱才算。

## License

[CC BY-NC 4.0](LICENSE) — 署名要求，仅限非商业使用。
