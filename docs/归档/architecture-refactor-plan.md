# 架构重构工作计划

**基于:** `docs/architecture-review-2026-02-09.md` 审查报告
**目标:** 使代码库全面符合"数据驱动"原则，消除架构债务

---

## 批次 1：叙事文本外部化（最高优先级）

**目标:** 将 ~1200 行硬编码中文叙事文本迁移到数据文件，覆盖约 70% 的 P0 违规。

**方案:** 在 `assets/data/texts/` 目录下创建按系统分类的 CSV 文件。代码侧创建统一的文本加载器（类似现有 csvLoader.ts 模式）。

### 任务清单

| # | 任务 | 涉及文件 | Agent | 预估 |
|---|------|---------|-------|------|
| 1.1 | 创建文本加载框架 — `systems/utils/textLoader.ts` | 新文件 | Framework | 小 |
| 1.2 | 迁移洞察叙事文本 (~400行) | `systems/insight/insightLogic.ts` → `assets/data/texts/insight_texts.csv` | Framework + Content | 大 |
| 1.3 | 迁移道德回声文本 (~260行) | `systems/characterAbility/moralEchoTexts.ts` → `assets/data/texts/echo_texts.csv` | Framework + Content | 中 |
| 1.4 | 迁移镜鉴法则警告 (~120行) | `systems/characterAbility/mirrorLawWarnings.ts` → `assets/data/texts/mirror_warnings.csv` | Framework + Content | 中 |
| 1.5 | 迁移技能定义 (~200行) | `systems/characterAbility/skillDefinitions.ts` → `assets/data/texts/skill_definitions.csv` | Framework + Content | 中 |
| 1.6 | 迁移NPC反应文本 (~60行) | `systems/characterAbility/modulation.ts` → `assets/data/texts/reaction_texts.csv` | Framework + Content | 小 |
| 1.7 | 迁移工坊叙事 (~80行) | `systems/workshop/workshopLogic.ts` → `assets/data/texts/workshop_texts.csv` | Framework + Content | 小 |
| 1.8 | 迁移洞察反馈矩阵 (~70行) | `systems/customerInsight/generator.ts` → `assets/data/texts/insight_feedback.csv` | Framework + Content | 小 |

**并行策略:** 1.1 先完成（创建加载框架），1.2-1.8 可并行执行。

---

## 批次 2：配置集中化（高优先级）

**目标:** 将 ~65 个游戏数值参数迁移到 `config/game.toml`，新增 12 个 TOML section。修复 4 处数值不一致。

### 任务清单

| # | 任务 | 涉及文件 | Agent | 预估 |
|---|------|---------|-------|------|
| 2.1 | 扩展 game.toml + config.ts — 添加新 section 定义 | `config/game.toml`, `systems/game/config.ts` | Framework | 中 |
| 2.2 | 迁移鉴定参数 (6个) | `hooks/useAppraisal.ts` | Framework | 小 |
| 2.3 | 迁移声誉增减表 (~15个) | `hooks/useGameEngine.ts:700-758` | Framework | 中 |
| 2.4 | 迁移推拉议价配置 (~10个) | `systems/negotiation/pushPull.ts` | Framework | 中 |
| 2.5 | 迁移黑市参数 (~15个) | `systems/blackmarket/blackmarketService.ts` | Framework | 中 |
| 2.6 | 迁移角色能力常量 (~12个) | `systems/characterAbility/abilityEngine.ts`, `moralEcho.ts`, `mirrorLawWarnings.ts` | Framework | 中 |
| 2.7 | 迁移经济补充参数 (清算率、赔偿倍率等) | `useGameEngine.ts`, `usePawnShop.ts`, components 多处 | Framework | 小 |
| 2.8 | 修复 4 处数值不一致 | 见审查报告"不一致问题" | Framework | 小 |
| 2.9 | 迁移 NPC 填充参数 (~5个) | `npc/fillerGenerator.ts` | Framework | 小 |
| 2.10 | 迁移杂项参数 (新闻、预约、挑战等) | 多处 | Framework | 小 |

**并行策略:** 2.1 先完成（扩展 TOML 结构），2.2-2.10 可并行执行。

---

## 批次 3：架构修正（中优先级）

**目标:** 解除循环依赖，修正职责越界，清理 UI 层业务逻辑泄漏。

### 任务清单

| # | 任务 | 涉及文件 | Agent | 预估 |
|---|------|---------|-------|------|
| 3.1 | 移动 Dashboard.tsx 到 components/ | `systems/game/ui/Dashboard.tsx` → `components/Dashboard.tsx` | Framework | 小 |
| 3.2 | 解除 narrative<->npc 循环 | 移 BehaviorTag 到 `core/types.ts` | Framework | 小 |
| 3.3 | 解除 economy<->items 循环 | 移 EssenceCost 到共享位置 | Framework | 小 |
| 3.4 | 解除 core<->game 循环 | 拆分 `core/phases/actions.ts` 初始化逻辑到 `systems/init/` | Framework | 中 |
| 3.5 | 清理 RedemptionInterface 中的声誉数值 | 移到 systems/economy 或通过 hook 提供 | Framework + Interaction | 小 |
| 3.6 | 清理 ExpiryEventModal 中的业务计算 | 移计算到 hook，文本外部化 | Framework + Interaction | 中 |
| 3.7 | 清理 HospitalVisitModal 中的叙事逻辑 | 移到 systems/narrative，文本外部化 | Framework + Interaction | 中 |
| 3.8 | 清理 PostForfeitPanel/EndOfDaySummary 经济数值 | 通过 config 提供 | Framework + Interaction | 小 |
| 3.9 | 清理 ItemPanel 中的压价逻辑 | 移 handleTraitClick 中的谈判逻辑到 hook | Framework + Interaction | 小 |
| 3.10 | 统一 barrel export 使用模式 | 系统内部直接导入，hooks/components 用 barrel | Framework | 中 |

**并行策略:** 3.1-3.4 可并行（纯架构调整），3.5-3.9 可并行（UI+逻辑清理）。

---

## 批次 4：代码清理（低优先级）

**目标:** 消除类型安全问题、死代码、调试残留。

### 任务清单

| # | 任务 | 涉及文件 | Agent | 预估 |
|---|------|---------|-------|------|
| 4.1 | 修复 _dynamicEffects 幽灵属性 | 声明到 Customer 类型, `hooks/useGameEngine.ts` | Framework | 小 |
| 4.2 | 补充 TransactionRecord.type 的 MAINTENANCE 值 | `systems/economy/types.ts`, `upgradeReducer.ts` | Framework | 小 |
| 4.3 | 修复 actions/types.ts 的 4 个 any[] | `store/actions/types.ts` | Framework | 小 |
| 4.4 | 修复 narrative/engine.ts 的 template as any | `systems/narrative/engine.ts` | Framework | 小 |
| 4.5 | 删除 designExporter.ts 整个文件 | `systems/game/utils/designExporter.ts` | Framework | 小 |
| 4.6 | 清理 workshop 6 个死导出 | `systems/workshop/recipes.ts`, `workshopLogic.ts` | Framework | 小 |
| 4.7 | 清理 moralEcho 7 个死导出 | `systems/characterAbility/moralEcho.ts`, `moralEchoTexts.ts` | Framework | 小 |
| 4.8 | 清理 modulation barrel 层 5 个死导出 | `systems/characterAbility/index.ts` | Framework | 小 |
| 4.9 | 清理 essence 8 个死导出 | `systems/economy/essence.ts`, `essenceUtils.ts` | Framework | 小 |
| 4.10 | 清理 customerInsight 3 个死导出 | `systems/customerInsight/generator.ts` | Framework | 小 |
| 4.11 | 清理 4 处调试 console.log | App.tsx, useGameEngine.ts, phases/machine.ts | Framework | 小 |
| 4.12 | 提取 clampReputation 工具函数 | coreReducer, expiryReducer, inventoryReducer | Framework | 小 |
| 4.13 | 统一图片错误回退处理 | DealSuccessModal, ItemPanel, WorkshopPanel | Interaction | 小 |
| 4.14 | 消除 CategoryIcon 重复映射 | ItemPanel, ShopClosedView (改用已有 CategoryIcon 组件) | Interaction | 小 |
| 4.15 | 消除声誉图标/颜色映射重复 | 提取到 utils 或共享组件 | Interaction | 小 |

**并行策略:** 4.1-4.12 由 Framework 并行，4.13-4.15 由 Interaction 并行。

---

## 批次 5：大型组件拆分（可选/长期）

**目标:** 改善可维护性，拆分超大组件。

| 组件 | 行数 | 拆分方案 |
|------|------|---------|
| `NegotiationPanel.tsx` | 1197 | → ChatLog, ControlDeck, StolenWarningOverlay |
| `BlackmarketPanel.tsx` | 1195 | → 子面板组件化 |
| `InsightPanel.tsx` | 964 | → ItemInsightCard, InsightExpectation |
| `AbilityPanel.tsx` | 817 | → SkillTree, NewbieGuide 独立文件 |
| `ItemPanel.tsx` | 803 | → 虚拟/物理物品视图分离 |
| `NightDashboard.tsx` | 773 | → 功能面板入口独立 |

**注意:** 此批次优先级最低，仅在前4批次完成后考虑。

---

## 执行策略

### 推荐顺序
```
批次1 (文本外部化) → 批次2 (配置集中化) → 批次3 (架构修正) → 批次4 (代码清理)
```

批次1和2 可以并行执行（无依赖），但建议串行以减少冲突。

### 每批次内部并行
使用 git worktree 并行实现模式（参考 MEMORY.md 中的 worktree 注意事项）。

### 验证策略
- 每个任务完成后 `node ./node_modules/typescript/bin/tsc --noEmit` 确保编译通过
- qa-tester 验证功能不受影响
- 合并后全量回归测试

---

## 预期收益

| 指标 | 当前 | 目标 |
|------|------|------|
| 配置化覆盖率 | ~40% | ~95% |
| 硬编码叙事文本 | ~1200行 | ~0行 |
| 循环依赖 | 3组 | 0组 |
| `any` 类型 | 38处 | <5处 |
| 死代码 | 32个导出 | 0 |
| 最大组件行数 | 1197 | <500 |
