# 架构审查报告 — 数据驱动合规 & 代码质量

**日期:** 2026-02-09
**范围:** 全代码库（systems/, hooks/, store/, components/）
**方法:** 5 个并行审计 Agent（数据驱动合规、架构耦合、配置集中化、UI 层、代码质量）

---

## 概览

| 维度 | 审计结果 |
|------|---------|
| **数据驱动合规** | 10 P0 + 9 P1 + 12 P2 + 5 P3 = **36 处违规** |
| **配置集中化** | 覆盖率 **~40%**，约 65 个参数未配置化 |
| **UI 层泄漏** | 9 处业务逻辑/数值泄漏到 components，10+ 组件含硬编码文本 |
| **架构耦合** | 3 组循环依赖，1 处 React 组件放错目录 |
| **代码质量** | 38 处 `any`，32 个死导出，4 处调试 console.log |

---

## 一、数据驱动合规审计

### P0-CRITICAL（大量叙事内容硬编码在 TS 中）

| # | 文件 | 行号 | 约行数 | 问题 | 建议 |
|---|------|------|--------|------|------|
| 1 | `systems/characterAbility/mirrorLawWarnings.ts` | 49-166 | ~120 | 15 条镜鉴法则警告文本（3级×3频道） | 迁移到 CSV/JSON |
| 2 | `systems/characterAbility/moralEchoTexts.ts` | 39-298 | ~260 | 道德回声文本数据库（7源×3级×多变体，60+条） | 迁移到 CSV |
| 3 | `systems/characterAbility/skillDefinitions.ts` | 14-209 | ~200 | 12个技能完整定义（name, description, learnMonologue） | 迁移到 CSV/TOML |
| 4 | `systems/characterAbility/modulation.ts` | 147-210 | ~60 | NPC反应文本（3强度×4阶段=12组行为描述） | 迁移到 CSV |
| 5 | `systems/insight/insightLogic.ts` | 568-795 | ~400 | 顿悟独白(10+类型)、窥见碎片(30变体)、走神/发现文案 | 迁移到 CSV/JSON |
| 6 | `systems/insight/insightLogic.ts` | 582-594 | — | 标签发现文本 if-else 链 | 合并到上述数据文件 |
| 7 | `systems/insight/insightLogic.ts` | 804-821 | — | `getBlockReasonText` 7条中文显示文本 | 迁移到 i18n/配置 |
| 8 | `systems/workshop/workshopLogic.ts` | 354-368 | ~10 | 凝视文本（修复5条+重铸5条） | 迁移到 CSV |
| 9 | `systems/workshop/workshopLogic.ts` | 381-452 | ~70 | 修复/重铸叙事生成（switch中大量文本） | 迁移到数据文件 |
| 10 | `systems/customerInsight/generator.ts` | 272-298, 438-503 | ~70 | 性格描述(4类×3变体)+道德提示(7关键词分支) | 迁移到 CSV |

### P1-MAJOR（中等内容或关键配置值）

| # | 文件 | 行号 | 问题 | 建议 |
|---|------|------|------|------|
| 1 | `systems/characterAbility/abilityEngine.ts` | 39-67 | 技能效果常量(GLOBAL_CAP=0.20, PRESSURE=0.08等12个) | 迁移到 game.toml [ability] |
| 2 | `systems/characterAbility/abilityEngine.ts` | 351-528 | 4条技能结果中文文本 | 迁移到数据文件 |
| 3 | `systems/characterAbility/essenceSystem.ts` | 48-53 | 精魄获取表 TIER_ESSENCE_GAINS | 迁移到 game.toml |
| 4 | `systems/characterAbility/essenceSystem.ts` | 62-67 | TIER_NAMES 中文显示名 | 迁移到 i18n/配置 |
| 5 | `systems/characterAbility/essenceSystem.ts` | 85, 95 | 中文原因字符串 | 随 TIER_NAMES 迁移 |
| 6 | `systems/workshop/workshopLogic.ts` | 461-476 | `getBlockReasonText` 12条中文文本 | 迁移到 i18n/配置 |
| 7 | `systems/workshop/workshopLogic.ts` | 195-199 | 违规警告文本+声誉损失{humanity:-15,credibility:-10} | 文本→数据文件，数值→TOML |
| 8 | `hooks/useGameEngine.ts` | 129-142 | 夜间随机事件池(cash:-30/-20/+15等)+概率(0.3/0.15/0.5) | 事件池→CSV/JSON，概率→TOML |
| 9 | `systems/customerInsight/generator.ts` | 131-136, 188-234 | 推拉修正原因文本+反馈矩阵(3×4=12条) | 迁移到 CSV |

### P2-MODERATE（小量文本或魔法数字）

| # | 文件 | 行号 | 问题 |
|---|------|------|------|
| 1 | `hooks/useNegotiation.ts` | 69-76 | BEHAVIOR_INSULT_MODIFIERS 每种 BehaviorTag 侮辱修正 |
| 2 | `hooks/useNegotiation.ts` | 79-80 | 基础侮辱阈值 0.7，clamp 范围 0.5/0.9 |
| 3 | `hooks/useNegotiation.ts` | 277-293 | 4条中文拒绝消息 |
| 4 | `systems/customerInsight/generator.ts` | 102-104 | AP效率常量 base=0.05, layer=0.10, max=0.25 |
| 5 | `systems/customerInsight/generator.ts` | 164-170 | Deal position 阈值 >0.9/0.7 |
| 6 | `systems/customerInsight/generator.ts` | 218-234 | 准确度提示文本+阈值 1.2/1.8 |
| 7 | `systems/customerInsight/generator.ts` | 421 | 兜底文本 |
| 8 | `systems/customerInsight/generator.ts` | 444-457 | 3条兜底文本 |
| 9 | `systems/characterAbility/modulation.ts` | 129-131 | 反应强度阈值 >1.1/0.9 |
| 10 | `systems/insight/insightLogic.ts` | 177 | 共鸣事件文本模板 |
| 11 | `systems/insight/insightLogic.ts` | 568 | 基础行为描述 |
| 12 | `systems/insight/insightLogic.ts` | 602 | 当期典当物品附加文本 |

### P3-MINOR

| # | 文件 | 问题 |
|---|------|------|
| 1 | `systems/characterAbility/mirrorLawWarnings.ts:173-180` | LEVEL_THRESHOLDS + WARNING_COOLDOWN_DAYS |
| 2 | `systems/customerInsight/generator.ts:246-253` | BehaviorTag 优先级排序硬编码 |
| 3 | `systems/characterAbility/abilityEngine.ts:358-360` | Foresight ±15% 范围 |
| 4 | `systems/characterAbility/abilityEngine.ts:399-402` | npcHope≤30 阈值 |
| 5 | `hooks/useGameEngine.ts:148` | 字符串匹配 `.includes("Vandals")` |

---

## 二、配置集中化审计

### 已配置化参数 (~40个)

经济(initial_funds, goal_amount, medical_cost等)、夜间(base_energy, insight成本等)、母亲(health, risk等)、玩法(AP, max_customers)、声誉初始值、鉴定事件概率。

### 应配置化但未配置的参数

#### P0 — 核心平衡数值 (~15个)

| 参数 | 文件 | 当前值 | 建议 TOML key |
|------|------|--------|--------------|
| 鉴定基础发现概率 | `hooks/useAppraisal.ts:97` | `0.5 - difficulty*0.3` | `[appraisal] base_discovery_chance, discovery_difficulty_factor` |
| 鉴定正常收窄率 | `hooks/useAppraisal.ts:151` | `0.85` | `[appraisal] normal_shrink_rate` |
| FAKE/JACKPOT发现后不确定性 | `hooks/useAppraisal.ts:144` | `0.10` | `[appraisal] trait_discovery_uncertainty` |
| 鉴定范围正常收敛速度 | `hooks/useAppraisal.ts:172` | `0.15` | `[appraisal] normal_convergence_speed` |
| 鉴定MISHAP范围扩张 | `hooks/useAppraisal.ts:179-180` | `0.05` | `[appraisal] mishap_range_expansion` |
| 清算价格比例 | `useGameEngine:1032, usePawnShop:333` | `0.8` | `[economy] liquidation_rate` |
| 声誉增减数值 | `useGameEngine.ts:700-758` | +1/+2/-1/-3/-5/-20等 | `[reputation_deltas]` 段 |
| 推拉议价配置表 | `negotiation/pushPull.ts:18-43` | SOFT/HARD/SLY/CALM四组 | `[negotiation.push_pull]` 段 |
| 推拉概率修正系数 | `negotiation/pushPull.ts:94,101-102` | 首次×0.3, 坚持×0.5等 | 同上 |
| 母亲健康状态阈值 | `useGameEngine.ts:237-238` | Stable≥70, Declining≥40 | `[mother] thresholds` |
| 母亲断缴衰减 | `useGameEngine.ts:214-226` | -15/-10/+10risk | `[mother] overdue_*` |

#### P1 — 系统模块参数 (~30个)

黑市系统(购买倍率、搜查罚款、保护费参数等15个)、角色能力(全局cap、各技能参数等12个)、新闻(显示位、违规检测概率)。

详见 config-auditor 完整报告。

#### P2 — 生成/填充参数 (~20个)

NPC填充(期望/底价比例、稀有遭遇概率)、预约(神秘访客概率)、每日挑战(概率、目标)、估价偏斜、库存容量等。

### 不一致问题 (4处)

| 问题 | 详情 |
|------|------|
| 清算比例重复 | `useGameEngine.ts:1032` 和 `usePawnShop.ts:333` 都硬编码 `realValue * 0.8` |
| 侮辱阈值重复 | `negotiation/instinct.ts:21` 和 `fillerGenerator.ts:1380` 都用 `0.70` |
| survivalMinimum重复 | 3处独立使用 `floor * 0.7` |
| 默认典当期限 | `useGameEngine.ts:761` 用 `\|\| 7` 但未配置化 |

### 建议新增 TOML 配置段 (12个)

`[appraisal]`, `[economy]` 补充, `[reputation_deltas]`, `[negotiation.push_pull.*]`, `[negotiation]` 补充, `[mother]` 补充, `[blackmarket]` 补充, `[ability]`, `[ability.moral_echo]`, `[ability.mirror_law]`, `[npc.filler]`, `[news]` 补充, `[narrative]`, `[appointment]`, `[gameplay]` 补充

---

## 三、UI 层数据驱动审计

### 业务逻辑泄漏到 components (P0-P1)

| 文件 | 行号 | 问题 | 严重度 |
|------|------|------|--------|
| `RedemptionInterface.tsx` | 404,427,443 | 声誉数值 -15/-10/+2/+15 硬编码 | P0 |
| `HospitalVisitModal.tsx` | 47-121 | 完整叙事分支树+阈值(hope<20,trust>70等) | P0 |
| `ExpiryEventModal.tsx` | 16-101 | 赔偿倍率×2、续当7天、利息计算、场景对话 | P1 |
| `PostForfeitPanel.tsx` | 22 | 回售溢价率 1.1 | P1 |
| `EndOfDaySummary.tsx` | 225 | 变卖折扣 0.8 | P1 |
| `ItemPanel.tsx` | 316,332 | 赃物/赝品压价 0.25 | P1 |
| `AbilityPanel.tsx` | 268 | 技能解锁阈值 50 | P2 |
| `NegotiationPanel.tsx` | 569-701 | 推拉对话文本+默认利率0.10 | P2 |
| `ShopClosedView.tsx` | 50-65 | 退出台词 10条 | P2 |

### 硬编码文本 (10+组件)

HospitalVisitModal(~15段), ShopClosedView(~10段), ExpiryEventModal(~8段), NegotiationPanel(~6段), ItemPanel(~10段), PostForfeitPanel(~3段), FacilityControlModal(~4段), NightDashboard(~8段), FinancialCalendar(~5段)

### 大型组件需拆分

| 文件 | 行数 | 建议 |
|------|------|------|
| `NegotiationPanel.tsx` | 1197 | 强烈建议拆分 |
| `BlackmarketPanel.tsx` | 1195 | 强烈建议拆分 |
| `InsightPanel.tsx` | 964 | 建议拆分 |
| `AbilityPanel.tsx` | 817 | 建议拆分 |
| `ItemPanel.tsx` | 803 | 建议拆分 |
| `NightDashboard.tsx` | 773 | 建议拆分 |

### 重复代码

- 物品分类图标映射 — 3处重复（已有 CategoryIcon 组件但未使用）
- 声誉图标/颜色映射 — 3处重复

---

## 四、架构耦合分析

### 循环依赖

| 循环 | 严重度 | 根因 | 解法 |
|------|--------|------|------|
| `narrative` <-> `npc` | 中 | BehaviorTag 归属不清 | 移 BehaviorTag 到 core/types.ts |
| `economy` <-> `items` | 中 | EssenceCost 双向引用 | 移 EssenceCost 到共享位置 |
| `core` <-> `game` | 高 | GameState 在 game 中定义，core 反向依赖 | 拆分初始化逻辑到 systems/init/ |

### 职责越界

| 问题 | 严重度 | 解法 |
|------|--------|------|
| `systems/game/ui/Dashboard.tsx` 是 React 组件放在 systems/ | P0 | 移到 components/ |
| `game/types.ts` GameState 聚合 12 系统类型 (God Object) | P2 | 拆分为子状态接口 |
| root `types.ts` barrel export 掩盖依赖 | P2 | 系统内部直接从源导入 |
| `core/phases/actions.ts` 导入 5 系统 | P2 | 拆分到 systems/init/ |

### 系统间依赖热点（被依赖次数）

1. `items/` — ~10个系统导入
2. `core/types` — ~8个系统导入
3. `economy/essence` — ~6个系统导入
4. `narrative/types` — ~5个系统导入
5. `game/config` — ~4个系统导入

---

## 五、代码质量扫描

### `any` 类型 (38处)

**Critical (4):**
- `useGameEngine.ts:598,604,958` — `_dynamicEffects` 幽灵属性通过 as any 注入
- `upgradeReducer.ts:72` — `'MAINTENANCE' as any` (TransactionRecord.type 缺此值)
- `narrative/engine.ts:12,352,355,407` — 动态属性访问+未声明属性

**Major (9):** actions/types.ts 4个 any[], useGameEngine.ts 5处, items/utils.ts 1处, narrative/types.ts 2处, RedemptionInterface.tsx 4处

**Minor (5):** debug/commandParser.ts 16处(工具代码), csvReader.ts, news/engine.ts, node.ts, coreReducer.ts(迁移代码)

### 死代码 (32个导出)

| 系统 | 死函数/导出数量 |
|------|---------------|
| `designExporter.ts` (整个文件) | 1 |
| workshop recipes | 6 |
| customerInsight | 3 |
| moralEcho + moralEchoTexts | 7 |
| modulation (barrel 层) | 5 |
| essence utils | 8 |
| narrativeAnchors | 1 |
| customerInsight types | 1 |

### 其他

- **调试 console.log:** App.tsx:138, useGameEngine.ts:472/474/520, phases/machine.ts:91
- **重复代码:** 声誉裁剪 clamp 3处, 图片错误回退 5处
- **TODO/FIXME:** 仅1处(useNegotiation.ts:286 功能性TODO)
- **@ts-ignore/@ts-nocheck:** 零使用（良好）
- **命名一致性:** 良好（camelCase/PascalCase/UPPER_SNAKE 统一）

---

## 六、违规模式分析

1. **最常见:** 叙事文本（中文独白、NPC反应、邮件内容）直接嵌入业务逻辑函数 — P0 主要来源
2. **第二常见:** 游戏平衡数值硬编码为 const — 项目已有 TOML→config.ts 链路但新系统未使用
3. **好的实践:** insightLogic.ts 数值配置正确使用 GAME_CONFIG，但同文件叙事内容硬编码
4. **CSV 成功案例:** customerInsight/generator.ts 已部分使用 InsightHints.csv，但同文件其他内容仍硬编码
