# 内容层全面回顾报告

**日期：** 2026-02-10
**范围：** 全部内容数据（排除 Lin/Susan 故事）

---

## 一、数据驱动违规（硬编码文本仍在 TS 中）

CLAUDE.md 已知违规列表中，**部分已修复，部分仍未迁移**：

| 系统 | 状态 | 说明 |
|------|------|------|
| `negotiation/data.ts` | **已修复** | 文本从 CSV 加载 |
| `npc/fallback.ts` | **已修复** | 从 `fallback_customers.csv` 加载 |
| `game/templates/appraisalFeedback.ts` | **已修复** | 从 `appraisal_feedback.csv` 加载 |
| `upgrades/spectrometerFeedback.ts` | **已修复** | 从 `spectrometer_feedback.csv` 加载 |
| `workshop/recipes.ts` | **已修复** | 文本从 CSV，数值从 TOML |
| `reputation/milestones.ts` | **已修复** | 从 `milestones.csv` 加载 |
| `characterAbility/essenceSystem.ts` | **已修复** | 从 `essence_system.csv` 加载 |
| **`news/registry.ts`** | **未修复** | ~477 行新闻内容硬编码 |
| **`npc/fillerGenerator` 系列** | **未修复** | 填充客户名字/描述/对话/理由 ~200+ 行，CSV 文件缺失 |
| **`appointment/index.ts`** | **未修复** | 预约板模板 ~175 行硬编码 |
| **`narrative/mailRegistry.ts`** | **需确认** | 邮件模板（已部分迁移到 `system_mails.csv` / `threat_mails.csv`） |

**总计约 1000+ 行中文文本仍在 TS 文件中**，策划无法不碰代码就修改。

---

## 二、内容缺失清单

### 2.1 填充客户系统（高优先级）

系统代码已准备好从 CSV 加载，但 **4 个 CSV 文件不存在**，运行时降级到 TS 硬编码默认值：

- `assets/data/texts/filler_names.csv` — 缺失
- `assets/data/texts/filler_descriptions.csv` — 缺失
- `assets/data/texts/filler_dialogues.csv` — 缺失
- `assets/data/texts/filler_reasons.csv` — 缺失

**影响：** 填充客户的名字/外貌/对话全部硬编码，内容单调，策划无法扩充。

### 2.2 新闻系统内容（高优先级）

`news/registry.ts` 中 477 行新闻内容直接写死，包括：
- 叙事回声新闻（Emma/Zhao/Susan/Lin 的后果新闻）
- 市场情报（价格变动、风险提示）
- 氛围新闻（世界观建设）

缺少：`assets/data/texts/news_content.csv`

### 2.3 预约系统内容（中优先级）

`appointment/index.ts` 中候选客户模板、神秘访客、新闻关联提示 ~175 行硬编码。

缺少：`assets/data/texts/appointment_templates.csv`

### 2.4 结局文本（中优先级）

`GameOverScreen.tsx` / `VictoryScreen.tsx` 中：
- 3 种胜利结局变体（SAINT/FAIR/RUTHLESS/BETRAYER）
- Game Over 原因描述
- 评价标签

全部硬编码在 TSX 组件中。

缺少：`assets/data/texts/endgame_texts.csv`

---

## 三、现有内容的质量/平衡观察

### 3.1 物品池（Items_Base.csv）

- **总计 44 件物品**，34 件在填充池中（Filler_Pool=true）
- 覆盖 17 个品类，分布较均匀（每类 2-4 件）
- **问题：** 填充池物品数量偏少。每天 4 个客户中 3 个是填充客户，7 天就需要 21 次抽取，34 件物品容易重复
- **建议：** 至少扩充到 50-60 件填充物品，每个品类 4-6 件

### 3.2 特征池（Traits.csv）

- 70 个特征，覆盖 STORY/FLAW/FAKE/JACKPOT/STOLEN 类型
- 每个品类都有对应的 bargain（捡漏）和 mistake（打眼）配对
- **良好，无明显缺失**

### 3.3 故事链（emma.story / zhao.story）

**Emma 故事：** 完整度很高
- 5 个事件节点 + 1 个借用互动
- 22 封邮件覆盖各种分支
- SimRules 模拟合理（funds/hope/job_chance 联动）
- fate_hints 丰富（11 个条件提示）
- expiry_flows 完备（赎回/续当/无人认领路径）

**Zhao 故事：** 完整度很高
- 6 个事件节点（含两个收藏顾问路线分支）
- 14 封邮件
- SimRules 包含 stress 累积 → 住院机制
- 收藏顾问低价/高价两条路线设计精妙

**两个故事的小问题：**
- Emma 的 `emma_02_skincare` 和 `emma_03_laptop` 的 `@on_reject` 都没有发送邮件，拒绝后玩家缺少叙事反馈
- Zhao `zhao_03_cert` 的 `@on_reject` 直接 `deactivate_chain`，但 `modify_rep: -10` 似乎过于严厉——拒绝收当就扣声誉？

### 3.4 Fallback 客户（fallback_customers.csv）

- **仅 3 个预设**（老张/陈学生/神秘客）
- 当 Gemini API 不可用时只有这 3 个，循环感极强
- **建议：** 至少扩充到 8-10 个，覆盖更多画像

### 3.5 文本 CSV 覆盖检查

| 文件 | 条目数 | 评估 |
|------|--------|------|
| `echo_texts.csv` | 72 条 | 充足，覆盖 6 种行为 × 3 级 × 多变体 |
| `reaction_texts.csv` | 34 条 | 充足 |
| `insight_texts.csv` | 70 条 | 充足，顿悟/窥见/意外/分心都有 |
| `workshop_texts.csv` | 47 条 | 充足 |
| `negotiation_instinct.csv` | 112 条 | 充足 |
| `insight_feedback.csv` | 48 条 | 充足 |
| `mirror_warnings.csv` | 17 条 | 充足 |
| `skill_definitions.csv` | 13 条 | 完整（所有技能都有） |
| `InsightHints.csv` | 5 行 | 充足（4 级 × 4 姿态矩阵） |
| `spectrometer_feedback.csv` | 28 条 | 充足 |
| `appraisal_feedback.csv` | 5 条 | OK |
| `milestones.csv` | 6 条 | 完整（3 轴 × 正负） |
| `essence_system.csv` | 6 条 | OK |
| `threat_mails.csv` | 5 条 | 偏少，可扩充 |
| `system_mails.csv` | 7 条 | OK |
| `fallback_customers.csv` | 3 条 | **严重不足** |

---

## 四、优先级总结

| 优先级 | 项目 | 工作量 | 说明 |
|--------|------|--------|------|
| **P0** | 填充客户 CSV 外部化 | 大 | 4 个缺失 CSV + ~200 行迁移 |
| **P0** | 新闻内容 CSV 外部化 | 大 | 477 行迁移 |
| **P1** | Fallback 客户扩充 | 中 | 3→8-10 个预设 |
| **P1** | 填充物品扩充 | 中 | 34→50-60 件 |
| **P1** | 预约模板 CSV 外部化 | 中 | ~175 行迁移 |
| **P2** | 结局文本 CSV 外部化 | 小 | ~100 行 |
| **P2** | 威胁邮件扩充 | 小 | 5→10+ 条 |
| **P3** | Emma/Zhao 故事微调 | 小 | 拒绝路线邮件补全 |
