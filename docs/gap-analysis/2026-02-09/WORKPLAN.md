# Gap Analysis Work Plan — 2026-02-09

Based on gap analysis of 23 design documents (1,107 features, 73.6% overall coverage).

---

## P0: "已建未接" — 快速收益

**策略:** 7 个 framework subAgent 并行发射，改动小且互相独立。

### P0-1: News 违规惩罚接入
- **问题:** `useGameEngine.ts:151` 违规惩罚 dispatch 被注释（`// Future:`），玩家无视警察警告无后果
- **修改:** 取消注释 externalTriggers dispatch，确保 TRANSIENT 惩罚链实际执行
- **涉及文件:** `hooks/useGameEngine.ts`
- **验证:** 在 crackdown 周接受赃物 → 应触发声誉惩罚

### P0-2: News v1.2 NewsEffect 消费端接入
- **问题:** `NewsEffect`（targetSystem/parameter/modifier）定义完整但从未被消费，只有 legacy `MarketModifier` 在用
- **修改:** 在鉴定/议价系统中读取 `getActiveModifiers()` 并应用 NewsEffect
- **涉及文件:** `hooks/useAppraisal.ts`, `hooks/useNegotiation.ts`, `systems/news/engine.ts`
- **验证:** 电子产品暴跌新闻 → 鉴定估价范围应受影响

### P0-3: Calendar 叙事标记接入
- **问题:** `getNewsMarkers()` 从未被 `useFinancialProjection` 调用，日历无叙事事件标记
- **修改:** 在 `useFinancialProjection.ts` 中调用 `getNewsMarkers()` 并注入 STORY_MOMENT 事件
- **涉及文件:** `hooks/useFinancialProjection.ts`
- **验证:** 打开日历 → 应显示严打周/纪念日等叙事标记

### P0-4: FillerEvent 四个死函数接入
- **问题:** 以下函数完整实现但从未调用：
  - `scheduleCustomerOrder()` — 客户排程（叙事-填充交替）
  - `generateDailyChallenge()` — 每日挑战生成
  - `generateRedemptionVisitDialogue()` — 赎回拜访对话
  - `getFillerMerchantMonologue()` — 填充客户商人独白
- **修改:**
  - 在 `useGameEngine.ts` 中接入 `scheduleCustomerOrder()` 替换简单顺序逻辑
  - 在 `useGameEngine.ts` 夜间流程中调用 `generateDailyChallenge()` 并 dispatch `SET_DAILY_CHALLENGE`
  - 在赎回/续当流程中调用 `generateRedemptionVisitDialogue()`
  - 在成交后调用 `getFillerMerchantMonologue()` 显示独白
- **涉及文件:** `hooks/useGameEngine.ts`, `store/GameContext.tsx`（reducer）
- **验证:** 晨报应显示每日挑战；填充客户赎回时应有对话

### P0-5: CharAbility UI 接入
- **问题:**
  - `generateContractTierHints()` 有逻辑但无组件消费（因果自见合同颜色提示）
  - `generateConsequenceFlash()` 有逻辑但无 UI 渲染（因果自见后果闪现）
  - `canComfort()` 有逻辑但送客界面无按钮（抚慰技能）
- **修改:**
  - 在 `NegotiationPanel` 或 `ControlDeck` 中消费合同颜色提示
  - 创建 ConsequenceFlash 组件在成交后显示叙事闪现
  - 在 `ShopClosedView` 添加抚慰按钮
- **涉及文件:** `components/negotiation/ControlDeck.tsx`, `components/ShopClosedView.tsx`, 新建 `components/ConsequenceFlash.tsx`
- **Agent:** framework（逻辑接入）+ interaction（UI 组件）

### P0-6: Mail 语气自动选择接入
- **问题:** `selectMailTone()` / `applyToneVariant()` / `resolveMailWithTone()` 完整实现，但 SCHEDULE_MAIL reducer 未调用，`resolvedTone` 和 `category` 字段从未填充
- **修改:** 在 `narrativeReducer.ts` 的 SCHEDULE_MAIL case 中调用 `resolveMailWithTone()`
- **涉及文件:** `store/reducers/narrativeReducer.ts`
- **验证:** 邮件语气应随 NPC 关系状态变化

### P0-7: EventChain BehaviorTag 效果接入
- **问题:** `behaviorTagMapping.ts` 完整编码（tripartite mapping table）但从未被 import；议价使用独立的 `pushPull.ts` 简化映射
- **修改:**
  - 添加 BehaviorTag floor modifiers（DESPERATE -15%, NAIVE -10%, SAVVY +10%, SUSPICIOUS +5%）
  - 添加 BehaviorTag patience modifiers（DESPERATE -1, STUBBORN +1, SUSPICIOUS -1, SENTIMENTAL +1）
  - 统一使用 `behaviorTagMapping.ts` 的映射替换 `pushPull.ts` 简化版
- **涉及文件:** `hooks/useNegotiation.ts`, `config/game.toml`, `systems/negotiation/pushPull.ts`
- **验证:** DESPERATE 客户应有更低底线和更少耐心

---

## P1: 核心机制缺失（第2轮）

**策略:** Worktree + Team 流水线，3 个系统并行。

### P1-A: Reputation 系统补全（63% → 目标 80%）
- 危险阈值视觉警告（声誉 ≤20 闪烁黄色，≤10 红色，≤5 剧烈闪烁）
- 声誉门控故事内容（Humanity>70 解锁情感故事线，Credibility>60 解锁高价值客户）
- 声誉影响议价难度
- 动态客户对话引用声誉
- 声誉触发邮件

### P1-B: Insight 洞察系统补全（61% → 目标 78%）
- 三层揭示门控执行（layer 1 默认，layer 2 需 AP/技能，layer 3 需升级）
- 多标签混合描述（DESPERATE+SAVVY 同时显示矛盾行为）
- 训练反馈接入（`generateTrainingResult()` 和 `generateInsightAccuracyHint()` 接入夜间复盘）
- NPC 因洞察改变反应
- 使用 insight 后的时序提示

### P1-C: Negotiation 议价系统修正（66% → 目标 80%）
- 推拉参数对齐设计文档数值（HARD chance 15%/max 1, 非 25%/max 2）
- 攻心机制修正（从 floor reduction 改为 +30% concession chance）
- 添加回合上限（~5 回合）
- 侮辱惩罚改为概率模型（+25% 而非固定 patience -2）
- 完善 mercy 机制

---

## P1: 核心机制缺失（第3轮）

### P1-D: Business 典当业务补全（73% → 目标 82%）
- 赎回决心感知流程
- 卖家道德模糊场景（家暴受害者、紧急求助者）
- 持有期风险事件（小偷后悔、原主人出现）
- 客户取消典当功能

### P1-E: Workshop 重铸系统补全（72% → 目标 82%）
- 违约惩罚在赎回时真正执行（目前只有显示）
- 动态成本计算（替换 stub）
- TRENDING 标签和配方
- 多夜工序机制

### P1-F: ItemVariant 标签显示（80% → 目标 88%）
- 接入 `getItemTagsDisplay()` 到所有物品 UI 组件
- 标签发现机制（G2 通过鉴定揭示，非创建时直接设置）
- 库存溢出损坏机制

---

## P2: 数值修正

**策略:** SubAgent 并行，每个修改独立。

| # | 系统 | 偏差 | 修正 |
|---|------|------|------|
| 1 | Economy | 高利贷 shark 惩罚 H-1 → H-3, +C-2, +I-2 | `config/game.toml` + reducer |
| 2 | Negotiation | HARD chance 0.25→0.15, max 2→1 | `config/game.toml` |
| 3 | Negotiation | SLY/CALM/SOFT 参数对齐 | `config/game.toml` |
| 4 | Workshop | FAKE_HISTORY 3.0x→2.5x | `systems/items/tagData.ts` |
| 5 | Reputation | 续当拒绝惩罚模式修正 | `store/reducers/expiryReducer.ts` |
| 6 | BlackMarket | 入口：所有玩家可访问 vs 需购买升级 | `systems/upgrades/`, `hooks/` |
| 7 | Economy | 赎回成功声誉 C+2→C+1 | `hooks/useGameEngine.ts` |

---

## P3: 沉浸感打磨

**策略:** 按子系统逐个 SubAgent。

### P3-A: 音频系统
- 环境音（夜间爵士/雨声，白天街道噪音）
- 结算仪式音效
- 门铃 SFX 在送客时触发
- 打字机音效在邮件中
- 格物顿悟音效

### P3-B: 动画与视觉
- 结算日三拍仪式（信封滑入 + 现金倒计时 + 屏幕泛红）
- NPC 离场淡出动画
- 设施切换仪式动画
- 黑市终端风格（等宽字体 + 打字动画）
- 库存日志档案视觉隐喻

### P3-C: 叙事内容
- 苦涩胜利（胜利屏展示 NPC 命运）
- 开场叙事序幕（医院走廊）
- ExitDialogues 故事内容填充
- 日历双轨显示（叙事语言 + 精确数字）

---

## 执行顺序

```
第1轮 P0: 7 个 framework subAgent 并行 → qa-tester → commit
第2轮 P1-ABC: 3 个 worktree 并行（Reputation/Insight/Negotiation）→ merge → commit
第3轮 P1-DEF: 3 个 worktree 并行（Business/Workshop/ItemVariant）→ merge → commit
第4轮 P2: 7 个 subAgent 并行（纯数值）→ qa-tester → commit
第5轮 P3-A: 音频 subAgent
第6轮 P3-B: 动画 subAgent
第7轮 P3-C: 叙事 content agent
```

---

## 注意事项

1. **P0 每个 agent 完成后必须 dev server + curl 验证**（不能只依赖 tsc）
2. **Worktree 成员必须 `mode: "bypassPermissions"`**
3. **合并后检查跨系统冲突**
4. **P0-5 是跨层任务（framework + interaction），需按顺序执行**
5. **P0-4 改动最大**（4 个函数接入），建议单独一个 agent 处理
