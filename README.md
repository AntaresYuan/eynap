# Eynap — Everything You Need as an AI PM

**把产品经理的活拆成能单独调用的技能：1 个编排者 + 5 个技能 + 1 份共享地基。**
**An AI product-manager skill kit: one orchestrator, five skills, one shared foundation.**

> 本项目是 [SmileLiuuuu/ai-pm](https://github.com/SmileLiuuuu/ai-pm) 的重构衍生版本。
> 原作者保留初版著作权，本项目沿用 CC BY-NC 4.0 授权。详见 [版权与鸣谢](#版权与鸣谢--credits)。
>
> This is an adaptation of [SmileLiuuuu/ai-pm](https://github.com/SmileLiuuuu/ai-pm),
> released under the same CC BY-NC 4.0 license.

---

**站点：<https://antaresyuan.github.io/eynap-site/>** — 在线浏览、下载、提反馈。

---

## 和初版的区别 / What changed

初版是一条五 Scene 的单技能流水线：想改一段需求，也要从头走一遍。
这一版把它拆开了：

| | v1.0.0（初版） | v2.0.0（本项目） |
|---|---|---|
| 结构 | 1 个 SKILL.md，581 行 | 1 个编排者 + 5 个技能 |
| 调用 | 走完整条流水线 | 哪件事需要就调哪个 |
| 横切规则 | 散在各 Scene 里 | 抽成 `shared/`，只存一份 |
| 缺上游时 | 依赖前序 Scene 的产出 | 技能自己把必要信息问齐 |

方法论骨架没有变，全部来自初版：价值锚点、场景而非功能清单、PRD 随理解加深而涌现。

---

## 这里有什么 / What's inside

| 技能 | 做什么 | 产出落点 |
|---|---|---|
| `ai-pm` | 编排者：判定阶段、路由技能、检查关卡，自己不产出交付物 | — |
| `pm-research` | 目的先行的调研：业务漏斗走查 + 单变量对照实验，证据分级 | `docs/04_RESOURCES/` |
| `pm-value` | 从真实故事挖价值锚点，现实检验，收敛立项与范围 | `docs/01_STRATEGY/` |
| `pm-prd` | 旅程、MVP、页面结构；目标分产品/算法写指标，交互四列表 | `docs/02_PRD/` |
| `pm-entity` | 状态表、正反向转移、每状态权限与字段行为 | `docs/02_PRD/` |
| `product-feature-helper` | 真实页面提取 token、注入可点原型、带标注截图的交互说明 | `docs/03_DESIGN/` |

`product-feature-helper` 是**外部技能**，需另行安装，本仓库不包含。

`shared/` 是所有技能共读的一份地基：记忆、偏好、命名、协议、宿主差异、措辞规范。
部署时要一并放置，**不要复制进各技能目录**——它的价值就在于只有一份。

---

## 安装 / Install

这套东西本体是 Markdown，不绑定任何一家宿主。按你的环境选一种：

**1. Claude Code / 支持 plugin 的宿主**

```bash
git clone https://github.com/AntaresYuan/eynap.git ~/.claude/plugins/eynap
```

重启宿主，用 `@` 调用。识别 `.claude-plugin/plugin.json`。

**2. Cursor**

```bash
git clone https://github.com/AntaresYuan/eynap.git .cursor/rules/eynap
```

在 `.cursorrules` 里引用 `skills/ai-pm/SKILL.md`。

**3. 任意能读本地文件的 Agent**

克隆到项目任意位置，在系统提示里写一行：

> 需要产品工作时，先读 `skills/ai-pm/SKILL.md`。

**4. 手动 / 无 Agent**

当成写作模板用：按 `skills/<技能>/SKILL.md` 的结构自己填。

最低要求只有一条：Agent 能读本地文件。第 4 种连这个都不需要。

---

## 怎么用 / Usage

带着一件具体的事来，不必从头走：

| 你要做的事 | 说什么 |
|---|---|
| 想法很模糊，要收敛成能立项的文档 | `/pm-value` |
| 写 PRD，或把用户流程讲清楚 | `/pm-prd` |
| 一个业务对象的状态、权限、字段没理清 | `/pm-entity` |
| 做调研或对标，想量化对方效果 | `/pm-research` |
| 从零做新产品，不知道先干哪步 | 「从头做一个产品」，编排者按阶段路由 |

连续使用时在一个项目目录里进行，各技能通过 `STATE.md` 交接，不必重复交代背景。
没有项目目录时，产出直接在对话里给你。

---

## 附带的脚本 / Scripts

两个脚本都用 `bash` 调用（打包解压后执行位可能丢失）：

```bash
# 在新项目里建出约定的目录骨架
bash scripts/init_project.sh <project_id> [目标目录]

# 校验定义层关卡是否通过，让关卡不再只是口头约定
bash scripts/check_gate.sh <project_root> [value_anchor|pain_coverage|three_layer|all]
```

`check_gate.sh` 检查的是**你项目的产出**，不是本仓库自身。
退出码：0 全部通过，1 有关卡未过（提示性质，由你决定是否继续），2 用法或结构错误。

---

## 想一起改 / Contributing

欢迎 Issue 和 Pull Request。两点说明：

- **方法论层面的改进**（价值锚点怎么挖、PRD 怎么组织），建议回
  [上游仓库](https://github.com/SmileLiuuuu/ai-pm) 讨论，那是它的源头。
- **拆分结构、共享地基、单技能可用性**相关的改进，在本仓库提。

写文档请遵守 `shared/verification.md` 里的措辞规范：不用大词、不用隐喻、不用黑话。

---

## 版权与鸣谢 / Credits

本套件的初版（v1.0.0）由 **SmileLiuuuu** 创作，原始仓库
[github.com/SmileLiuuuu/ai-pm](https://github.com/SmileLiuuuu/ai-pm)，按 CC BY-NC 4.0 授权。

当前版本（v2.0.0）是在其基础上重构的衍生作品：把原先的五 Scene 单技能流水线，
拆成 1 个编排者 + 5 个可单独调用的技能，并抽出一份共享地基。

依据 CC BY-NC 4.0，本衍生作品同样以 CC BY-NC 4.0 授权、保留原作者署名、
**不得用于商业用途**。原作以「现状」提供，不附任何明示或默示担保。

感谢我的 mentor SmileLiuuuu。这套东西的方法论骨架都来自初版，
v2.0.0 只是把它拆得更细、让每个环节能被单独调用。

### 关于「开源」这个词

本项目**公开源码、可自由非商业使用**，但按
[开源定义](https://opensource.org/osd)，CC BY-NC **不是开源许可证**——
开源许可证不能限制任何人商用。衍生作品也不能比原作更宽松，所以这里不会换成 MIT。

如果你在意这一点，可以去上游仓库和原作者讨论许可变更。

---

## License

[CC BY-NC 4.0](LICENSE) — Attribution required, non-commercial use only.
