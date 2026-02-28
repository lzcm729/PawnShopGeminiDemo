# 实现清单 — 卡牌议价系统设计迭代

> **来源**: `采纳索引.md` + 代码现状分析
> **生成日期**: 2026-02-28
> **当前分支**: cards

## 实现概览

| 类别 | 项数 | 说明 |
|------|------|------|
| 纯文档（已完成） | 15 | 设计文档已更新，无代码变更 |
| v0.3 规划（未来） | 16 | 标注为 §v0.3规划，本轮不实现 |
| **可实现** | **~25** | 分两批实现 |

---

## 批次 1：六区间基础 + 现有系统适配

### Phase 1: 基础变更（main 分支，创建 worktree 前）

跨系统共享变更，影响 17 个文件：

| # | 变更 | 文件 | 说明 |
|---|------|------|------|
| B-1 | `InterestRate` 类型扩展 | `systems/economy/types.ts` | `0\|0.05\|0.10\|0.20` → `number`（支持连续利率） |
| B-2 | `ContractTier` 扩展为 6 档 | `systems/characterAbility/essenceSystem.ts` | 新增 `ELEVATED` `HIGH`，重命名无变化项 |
| B-3 | `getContractTier()` 阈值更新 | `systems/characterAbility/essenceSystem.ts` | 0%=CHARITY, 1-4%=AID, 5-9%=STANDARD, 10-14%=ELEVATED, 15-19%=HIGH, 20%+=SHARK |
| B-4 | `config/game.toml` reputation_deltas 6 区间 | `config/game.toml` | 新增 elevated/high 区间声誉变化 |
| B-5 | `config/game.toml` essence.tier_gains 6 区间 | `config/game.toml` | 新增 ELEVATED/HIGH 区间精魄获取 |
| B-6 | `config.ts` 类型适配 | `systems/game/config.ts` | 配置读取支持 6 区间 |
| B-7 | 修复所有编译错误 | 17 个引用文件 | `InterestRate` 从 union → number 的类型适配 |

### WT-1: 声誉 + 人物能力系统 (wt-rep-char)

**Framework 任务：**

| # | 采纳项 | 变更 | 主要文件 |
|---|--------|------|---------|
| R-1 | 声誉#1 | 行为影响矩阵 4→6 区间查表 | `config/game.toml`, 声誉计算逻辑 |
| R-2 | 声誉#2 | 分层可见性模型逻辑（道德地震：每存档首次跨越区间阈值时触发） | 新增 `systems/reputation/visibility.ts` |
| R-3 | 声誉#3 = 卡牌#7 | 赎回率连续函数 `baseRate × (1 - rate × 0.02)` | 赎回率计算逻辑 |
| R-4 | 声誉#4 = 人物能力#3 | 道德回声触发阈值：高利贷20% → 利率>=15%（HIGH/SHARK） | `systems/characterAbility/moralEcho.ts` |
| C-1 | 人物能力#1 | 精魄道德加成 6 区间映射（TOML 已在 B-5 更新，代码适配） | `systems/characterAbility/essenceSystem.ts` |
| C-2 | 人物能力#2 | 口口相传判定适配：触发条件改为惜物如人触发（利率<=4%）| `systems/characterAbility/abilityEngine.ts` |
| C-3 | 人物能力#4 | 因果自见 v0.2 降级：取消决策前预兆，保留命运闪现 | `systems/characterAbility/abilityEngine.ts` |

**Interaction 任务：**

| # | 采纳项 | 变更 | 主要文件 |
|---|--------|------|---------|
| R-UI-1 | 声誉#2 | 分层可见性 UI：道德地震视觉效果（首次跨越 HIGH/SHARK 阈值） | 声誉相关 UI 组件 |

### WT-2: 系统增强 (wt-enhance)

**Framework 任务：**

| # | 采纳项 | 变更 | 主要文件 |
|---|--------|------|---------|
| E-1 | 卡牌#2 | 商人直觉文案框架：基调+修饰词架构，六区间各 2-3 条 | `systems/negotiation/instinct.ts`, CSV |
| E-2 | 卡牌#14 | 鉴定收益天花板：u<=0.12 时提示"已看透"，停止进一步收益 | `hooks/useAppraisal.ts`, 鉴定逻辑 |
| E-3 | 卡牌#29 | 耐心归零决策梯度：耐心=1 特殊决策窗口，耐心=0 最终修正机会 | `hooks/useNegotiation.ts` |
| E-4 | 卡牌#32 | 耐心消耗规则明确：区分被动消耗（回合推进）和行为消耗（打卡/拒绝塞牌） | `hooks/useNegotiation.ts` |
| E-5 | 卡牌#16 | 道德滑坡回望 Drift Meter：追踪累计利率偏移，夜间阈值独白 | 新增 `systems/reputation/driftMeter.ts` |

**Interaction 任务：**

| # | 采纳项 | 变更 | 主要文件 |
|---|--------|------|---------|
| E-UI-1 | 卡牌#8 | 0% CHARITY 成交金色光晕视觉效果 | 议价结算 UI |
| E-UI-2 | 卡牌#16 | Drift Meter 夜间仪表盘 UI + 阈值独白展示 | 夜间 UI 组件 |
| E-UI-3 | 卡牌#29 | 耐心归零时的 UI 流程（特殊决策窗口/最终修正） | 议价面板 |

### 批次 1 内容项（可并行或合并后处理）

| # | 采纳项 | 变更 |
|---|--------|------|
| CT-1 | 卡牌#2 | 商人直觉六区间文案 CSV |
| CT-2 | 卡牌#15 | Day 2-3 洞察教学事件 (.story DSL) |
| CT-3 | 卡牌#22 | 客户类型道德地形差异化（NPC 数据） |
| CT-4 | 卡牌#31 | 阴暗路径后果链（叙事内容） |

---

## 批次 2：卡牌议价系统核心

> **前提**：批次 1 完成并合并后再开始
> **策略**：作为新系统并行构建（不删除旧推拉系统），通过 feature flag 切换

### WT-3: 卡牌议价系统核心 (wt-cards)

**Framework 任务：**

| # | 采纳项 | 变更 | 主要文件 |
|---|--------|------|---------|
| K-1 | 核心 | 卡牌类型定义：Card, CardType, Deck, Hand, CardEffect | 新增 `systems/cardNegotiation/types.ts` |
| K-2 | 核心 | 牌组管理系统：洗牌、抽牌、弃牌、消耗卡追踪 | 新增 `systems/cardNegotiation/deck.ts` |
| K-3 | 核心 | 卡牌效果引擎：经济/信息/叙事/耐心四类效果结算 | 新增 `systems/cardNegotiation/effects.ts` |
| K-4 | 核心 | 卡牌定义数据加载（CSV 驱动） | 新增 `systems/cardNegotiation/definitions.ts` + CSV |
| K-5 | 卡牌#9 | 弱化版普通卡（[基础观察]/[直觉判断]）软降级 | 包含在 K-4 卡牌定义中 |
| K-6 | 卡牌#13 | 临时卡生命周期：回合末保留规则（叙事/特征保留，经济弃置） | `systems/cardNegotiation/deck.ts` |
| K-7 | 卡牌#17 | 回合末弃牌规则修订：有限保留 + 1 张额外保留位 | `systems/cardNegotiation/deck.ts` |
| K-8 | 卡牌#18 | 特征卡重设计：FLAW 告知两难 + JACKPOT 诚实 vs 隐瞒 | `systems/cardNegotiation/effects.ts` |
| K-9 | 卡牌#23 | 微观兴趣曲线：回合递进（试探期→博弈期→摊牌时刻） | 新增 `systems/cardNegotiation/roundProgression.ts` |
| K-10 | 卡牌#19 | 客户回合改善：动态掉牌 + 微决策（接受/拒绝塞牌）+ 表演升级 | 新增 `systems/cardNegotiation/customerTurn.ts` |
| K-11 | 卡牌#24 | 非线性效果卡（一锤定音/底价摊牌/良心发现） | 包含在 K-3 效果引擎中 |
| K-12 | 卡牌#25 | FAKE 临时卡：可选 vs 强制明确 | 包含在 K-3/K-6 中 |
| K-13 | 卡牌#27 | 坚持博弈替代机制 | 新增 `systems/cardNegotiation/persistence.ts` |
| K-14 | 卡牌#11 | A2 替代：耐心消耗修正 + 归因文案（精度影响耐心消耗率） | `systems/cardNegotiation/effects.ts` |
| K-15 | 核心 | 卡牌议价 Hook：整合牌组、手牌、回合、效果、客户行为 | 新增 `hooks/useCardNegotiation.ts` |
| K-16 | 核心 | GamePhase 适配：NEGOTIATION phase 接入卡牌系统 | `systems/core/phases/`, `store/` |
| K-17 | 核心 | Feature flag：`config/game.toml` 中 `card_negotiation_enabled` 切换新旧系统 | `config/game.toml`, `systems/game/config.ts` |

**Interaction 任务：**

| # | 采纳项 | 变更 | 主要文件 |
|---|--------|------|---------|
| K-UI-1 | 核心 | 卡牌议价面板：手牌展示、打牌交互、当金/利率实时显示 | 新增 `components/CardNegotiationPanel.tsx` |
| K-UI-2 | 卡牌#12 | 信息预算指示器 UI（鉴定●●○ \| 洞察●○） | 包含在 K-UI-1 中 |
| K-UI-3 | 卡牌#19 | 客户回合可视化：掉牌动画、塞牌选择、情绪变化 | 包含在 K-UI-1 中 |
| K-UI-4 | 卡牌#30 | 掉落概率视觉暗示（卡牌边缘微光等） | 包含在 K-UI-1 中 |

**Content 任务：**

| # | 采纳项 | 变更 |
|---|--------|------|
| K-CT-1 | 核心 | 卡牌定义 CSV：所有基础卡牌的名称、效果、描述 |
| K-CT-2 | 卡牌#28 | 塞牌叙事意义 + 道德惩罚文案 |

---

## 合并顺序

### 批次 1
```
Phase 1 (main) → commit
  → WT-1 (rep-char) → merge → tsc
  → WT-2 (enhance) → merge → tsc
  → Content (CT-1~4) → commit
```

### 批次 2
```
WT-3 (cards) → merge → tsc → commit
Content (K-CT-1~2) → commit
```

---

## 不实现的项

| 类别 | 项 | 原因 |
|------|-----|------|
| 纯文档 | #3,#4,#5,#6,#10,#20,#21,#26,#35,#37,#38,#42,#43,#44,#47 | 设计文档已更新 |
| v0.3 规划 | #33-#48 | 标注为 §v0.3规划 |
