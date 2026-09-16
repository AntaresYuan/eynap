# Verification — what you may claim, and how to talk

Two things live here: the **boundary of every claim** you make, and the **communication style** shared by all atoms.

The first exists because ai-pm's failure mode mirrors product-feature-helper's: PFH is tempted to claim "已验证" when it only ran a static check; ai-pm is tempted to claim "PRD 完成" when a document exists but nothing was checked. **Same risk, same rule: a claim may never exceed what was actually done.**

---

## 实际做到 → 只能这么说

| 实际做到 | 只能这么说 | 不允许说 |
|---|---|---|
| 写完文档，没有逐节核对 | "初稿已写完，还没逐节核对" | "PRD 完成" |
| 文档结构齐全，但含未消解的 `[待定-XXX]` | "结构齐全，还有 N 个待定项没结（逐条说明）" | "已定稿" / "可以进开发" |
| Scene 1 收敛出价值锚点，用户尚未确认 | "我提炼了一个锚点，需要你确认" | "价值锚点已确立" |
| 痛点覆盖检查跑过，有痛点未覆盖且已记入 TODO | "覆盖检查跑过，N 个痛点未覆盖，已记入 TODO" | "痛点全覆盖" |
| 三层设计门只清了 User Flow 与 Frontend | "三层里两层清了，Backend Logic 还没定" | "ready to build" |
| 实体状态表列了状态，没走反向转移与字段行为 | "状态与正向转移已列，反向转移和字段行为待补" | "状态机梳理完成" |
| 只跑了 `check_gate.sh` | "机器门通过，内容未经人工评审" | "已评审通过" |
| `[Meta]` 改动写盘、未回读 | "已写入，尚未回读确认" | "已生效" |
| `[Meta]` 改动写盘并回读到新文本 | "已生效（回读确认）" | — |
| 调研只查到二手资料，没有一手用户输入 | "结论基于公开二手资料" | "用户调研结论" |
| greenfield mockup 截图 | "截图来自设计稿，不是线上产品" | "线上效果" |

**Two rules generalize the table:**

1. **A conclusion may not exceed the scope of what was checked.** "全部符合" / "未发现问题" is only sayable when a checklist was actually walked item by item — and then say which checklist.
2. **When in doubt, understate.** Saying "没验证" costs a follow-up question; saying "已验证" when it was not costs the user's trust in every other claim.

---

## Gate reporting

Gates come in two kinds, and they are reported differently:

| Gate type | Enforcement | How to report |
|---|---|---|
| **Delivery-layer** (PFH `deliver.sh`, `check_gate.sh`) | **Blocking** — nonzero exit means not passed | Align the wording with the actual output, item by item. Never summarize a blocked run as passed |
| **Definition-layer** (value anchor, pain coverage, three-layer) | **Advisory** — flag and record in `STATE.md`, do not hard-block exploration | Name what is unmet and what it puts at risk, then let the user decide whether to proceed |

Definition-layer gates are advisory on purpose: in PM work, "痛点没全覆盖就不许进下一环" would block legitimate exploration. Advisory does **not** mean silent — an unmet gate is always stated and always recorded in `STATE.md`'s `gates_passed`.

---

## Verifying a `[Meta]` change

A write tool returning success is **not** evidence the change persisted. Verify by **either**:
- re-invoking the skill and reading back the exact edited section, confirming the new text appears, **or**
- asking the user to start a new session and quote back the loaded content.

Until one of those happens, the change is "written, not yet confirmed". → [hosts.md](hosts.md)

---

## Communication Style

- **Direct, no padding.** PM vocabulary. No pleasantries.
- **Always close with** `[Next Step]` or `[Decision Needed]`.
- **Fragment the focus.** Specific nodes and logic blocks, not whole documents.
- **Mirror the user's language.** English ↔ Chinese as they use it.
- **Calibrate depth:** Expert → precise, skip scaffolding. Novice → scenario first, then logic.
- **Surface open items in the dialogue**, not only in the document → [protocols.md](protocols.md).

---

## 措辞规范：不用大词、隐喻、黑话

**适用于所有产出物**——PRD、立项文档、调研报告、实体文档、交互说明、以及对话本身。这不是文风偏好，是**可执行性要求**：一句话如果不能被开发、设计或算法照着做，它就没有完成任务。

### 三类要删掉的词

| 类型 | 例子 | 为什么删 | 改成 |
|---|---|---|---|
| **大词 / 空词** | 赋能、抓手、闭环、生态、链路打通、全域、体系化、深度融合、颠覆、极致、显著提升 | 听起来有内容，但没有任何可执行信息，也无法证伪 | 把动作和对象写出来：谁对什么做了什么，结果是什么 |
| **隐喻 / 比喻** | 打通任督二脉、搭高速路、种子用户破圈、飞轮转起来、护城河、north star | 读者要先猜比喻映射到什么，不同人猜出不同结果 | 直接说机制：什么触发什么、什么依赖什么 |
| **黑话 / 内部缩写** | 团队内自造的缩写、未展开的项目代号、圈内速记（"P0 了"当形容词用）、来源不明的英文缩写 | 新人、跨团队、外部协作方读不懂，半年后自己也读不懂 | 首次出现时写全称 + 一句解释，之后可用缩写 |

### 判定方法：一句话能不能被照着做

写完一句话，问自己：**开发 / 设计 / 算法拿到这句话，能直接动手吗？** 不能就重写。

| ❌ 原句 | 问题 | ✓ 改写 |
|---|---|---|
| 赋能用户高效完成筛选 | "赋能"没有动作，"高效"没有度量 | 用户在列表页可一次选中多条并批量处理，原本需逐条操作 |
| 打通上下游链路，形成数据闭环 | 两个大词，不知道谁和谁通、通什么 | A 模块提交后把 `order_id` 传给 B 模块，B 处理完回写状态到 A |
| 通过智能算法显著提升推荐精准度 | "智能""显著""精准"三个词都无法验收 | 排序改用 X 特征后，Top-5 命中率从 a% 到 b%（评测集 N 条，人工标注） |
| 这块先 P0 一下，把体验做扎实 | 黑话当形容词，"扎实"不可验收 | 本期优先做 X 和 Y；验收标准是完成率 ≥ z%、报错率 ≤ w% |

### 反例词表（来自公司「清晰表达」规范，可直接当扫描清单）

公司「坦诚清晰」规范把「不易懂词」分为三类：**过度缩写、堆砌高级感词、其他不易懂词**（内部指标/项目名、跨部门难懂的行业术语）。下表按这三类收录在产品文档里高频误用的部分——**看到就优先用右列替换**，并据此举一反三；不是穷举。

**1. 堆砌高级感 / 引申义词汇**

| 黑话 | 直接说法 |
|---|---|
| 赋能 | 帮助、支持 |
| 抓手 | 方法、措施、手段 |
| 闭环 | 完成、跟进到底 |
| 拉通 | 打通、整合 |
| 拉齐 | 统一认知、对齐信息 |
| 对齐 | 统一 / 确认信息（动词可用，但别"对齐颗粒度"式叠加） |
| 沉淀 | 总结、积累 |
| 底层逻辑 | 核心原因、根本原因 |
| 颗粒度 | 细致程度、详细程度 |
| 心智 / 击穿心智 | 认知、印象 / 让用户记住 |
| 全链路 | 全流程 |
| 矩阵打法 | 多渠道策略 |
| 打爆 | 大力推广 |
| 通晒 | 公开信息 |
| 握手 | 沟通、对接 |
| 做功 | 发力、投入 |
| 转身 | 身份 / 角色变化 |
| 场域 | 领域、场景 |
| 下探 | 深入了解 |
| 有机结合 | 结合（"有机"是多余修饰） |
| 资源水位 | 资源使用率、利用率 |
| 对标 | 参考、对比 |
| 杠杆 | 借力、利用 |
| 生态 | 体系、系统（除非真在讨论生态系统） |
| 势能 | 优势、潜力 |
| 护城河 | 竞争壁垒、核心优势 |
| 最佳实践 | 流程、规范、踩坑经验（"最佳"带时效性） |
| 私域 | 私有领域 / 私有场景 |
| 体感 | 感受、体验 |
| 锚定 | 立足、围绕 |
| 同构 | 同类、相似 |
| 浓度 | 程度、密集程度 |
| 底池 | 基础总量 |

**2. 过度缩写（全称 ≤ 6 字就别缩写）**

| 缩写 | 全称 / 直接说法 |
|---|---|
| 开平 | 开放平台（且易和"开屏广告"混淆） |
| 产解 / 行解 | 产品解决方案 / 行业解决方案 |
| 用增 | 用户增长 |
| 综搜 | 综合搜索 |
| 潜客 | 潜在客户 |
| 次留 / 冷启 | 次日留存 / 冷启动 |
| 立购 | 立即购买 |
| 二确 | 二次确认 |
| 官旗 | 官方旗舰店 |
| 百补 | 百亿补贴 |
| 短直 / 抖小 / 商达 | 短视频和直播 / 抖音小程序 / 商家和达人 |
| 内场 / 外场 | 内部业务 / 外部业务 |
| 本本 | 本地对本地（电商模式） |
| 控比 | 相对份额 |
| 猜喜 | 猜你喜欢 |
| 加桌 | 添加桌面 |
| 底软 | 底层软件 |

跨部门时用 `L2 / T3 / M1-M3` 这类内部分层名，要么改成直白名（高销售额商家、基础内容流量），要么**首次出现时写出全称 + 具体阈值**。

**3. 模糊代称与回避性表述**

- "**公司认为 / 和公司对齐**" → 写清具体是哪个部门、哪个人。
- "**与 XFN 协同**" → 列出具体哪些部门、各自职责。
- 把落后写成 "**加速领先优势**"、把没人关注写成 "**全域覆盖**" → 直接陈述事实，不用措辞粉饰结论。

**判定缩写是否保留**：缩写只在「受众已就该词达成共识、且全称确实很长」时提效。**内部高频、跨部门难懂**的缩写，就是要删的那一类。

### 例外：什么时候可以保留

- **行业或技术标准术语**照常用：状态机、幂等、埋点、召回率、rowspan。它们有公认定义，不属于黑话。
- **本项目已定义的实体名与状态名**照常用——前提是在实体模型章节定义过。
- **用户自己的原话**在引用痛点、故事、访谈记录时**必须保留原样**，包括他用的比喻。这是证据，不是你的表述；不要"翻译"成规范措辞后当成一手材料 → [memory.md](memory.md)。

### 一条自查动作

交付前扫一遍产出物：**每个形容词和每个抽象名词，都问一次"这个词删掉，句子还成立吗？"** 成立就删。剩下的词如果仍无法落地，说明该处的方案本身还没想清楚——那是内容问题，不是措辞问题，回去补事实而不是换个说法。
