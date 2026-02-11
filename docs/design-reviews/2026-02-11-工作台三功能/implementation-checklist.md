# Implementation Checklist — 工作台三功能

> **来源**: `采纳索引.md` (31+5+4 items)
> **设计文档**: `重铸与修复系统 (The Workshop System).md` v2.1
> **生成日期**: 2026-02-11
> **完成日期**: 2026-02-11
> **状态**: **ALL BATCHES COMPLETE**

## 实现总结

| 批次 | 状态 | 提交数 | 文件数 | 行数变更 |
|------|------|--------|--------|---------|
| Phase 1 (共享类型) | DONE | 1 | 5 | +112 |
| Batch 1 WT-1 (配方重构) | DONE | 1 | 14 | +1160/-459 |
| Batch 1 WT-2 (伪造出售) | DONE | 1+merge | 13 | +858/-28 |
| Batch 2 WT-3 (信息流+归还) | DONE | 1 | 21 | +1036/-71 |
| **总计** | **DONE** | **5** | **36** | **+2961/-498** |

### 新增文件
- `systems/workshop/forgeryNotoriety.ts` — 伪造声名四阶段系统
- `systems/workshop/emotionalWeight.ts` — 情感分量积分系统
- `systems/workshop/perceptionTier.ts` — 感知层级四档系统
- `systems/workshop/returnMatrix.ts` — 重铸归还概率矩阵
- `systems/workshop/invisibleTraining.ts` — 隐形训练三阶段
- `components/night/blackmarket/CounterfeitSaleModal.tsx` — 伪造品出售弹窗
- `assets/data/texts/counterfeit_sale_texts.csv` — 伪造出售文案
- `assets/data/texts/workshop_intuition.csv` — 商人直觉文案(18条)
- `assets/data/texts/workshop_return_results.csv` — 归还结果文案(8条)
- `assets/data/texts/workshop_training.csv` — 训练独白(5条)

## 现状分析

### 已有代码
- `systems/workshop/` — types.ts, recipes.ts, workshopLogic.ts, index.ts
- `hooks/useWorkshop.ts` — React hook (15.5KB)
- `components/night/WorkshopPanel.tsx` — UI (27KB)
- `systems/blackmarket/` — 完整黑市系统（热度/出售/收购/风险事件）
- `config/game.toml` — workshop section (9 recipe configs)
- `assets/data/texts/workshop_*.csv` — 文本 (57行)

### 关键差距（v2.0代码 vs v2.1设计）
1. **WorkState 缺 FORGED** — 当前只有 DEFAULT/RESTORED/REFORGED
2. **无 CounterfeitRecipe 类型** — 伪造逻辑混在 ReforgeRecipe 中
3. **无伪造路线** — 现有 4 个 reforge recipe 包含了伪造类（fake_history, master_forgery）
4. **无伪造出售流程** — 黑市系统存在但无伪造品检测
5. **无伪造声名系统** — ForgeryNotoriety 完全不存在
6. **无 PawnCustomerSnapshot** — 物品无客户快照信息
7. **无 emotionalWeight/perceptionTier** — 信息数据流不存在
8. **无归还概率矩阵** — 重铸归还逻辑缺失

## 纯文档项（已完成，不需代码）

| 采纳# | 摘要 |
|--------|------|
| #2 | "黑道"→"清白(Innocence)" 术语 |
| #25 | 品质分布写入配方表 |
| #30 | 格物独立性说明 |
| #31 | 修复ROI估算章节 |
| R4 | 工作台文档交叉引用 |

---

## Batch 1: Core 3-Route Workshop

**目标**: 让工作台支持三条路线（修复/伪造/重铸），伪造品可通过黑市出售（含检测），基础声誉效果完整。

### Phase 1: 基础变更（main 分支）

**共享类型定义** — 所有 worktree 都需要的类型变更：

| # | 文件 | 变更 | 采纳项 |
|---|------|------|--------|
| B1 | `systems/items/types.ts` | WorkState 增加 `'FORGED'` | #5 |
| B2 | `systems/items/types.ts` | Item 增加 `wasForged?: boolean` | #5 |
| B3 | `systems/items/types.ts` | 定义 `PawnCustomerSnapshot` 接口 | #7 |
| B4 | `systems/items/types.ts` | Item 增加 `customerSnapshot?: PawnCustomerSnapshot` | #7 |
| B5 | `systems/workshop/types.ts` | 新增 `CounterfeitRecipe` 类型 + 更新 Recipe union | #5 |
| B6 | `systems/workshop/types.ts` | 新增类型守卫 `isCounterfeitRecipe()` | #5 |
| B7 | `store/actions/types.ts` | 新增 action types（如需） | - |
| B8 | `config/game.toml` | 新增 `[workshop.forgery]` section（伪造相关参数） | #13, D1 |

### WT-1: Workshop Recipe & Logic Restructuring

**Worktree 分支**: `feat/workshop-recipe-restructure`
**文件影响**: `systems/workshop/`, `hooks/useWorkshop.ts`, `config/game.toml`, CSV texts

#### Framework 任务

| # | 采纳项 | 描述 | 文件 | 设计文档 |
|---|--------|------|------|----------|
| F1 | #5 | 新增 performCounterfeit() 逻辑 — 添加虚假标签、切换 variant 到 forged_state、设 workState=FORGED | workshopLogic.ts | §3 行为B |
| F2 | #5 | 更新 checkBlockReason — 添加 counterfeit 专用阻塞检查（已 FORGED/RESTORED 不可伪造） | workshopLogic.ts | §4 互斥 |
| F3 | #5+D5 | 配方重构 — fake_history/master_forgery → counterfeit 类型，art_enhanced 保留为 reforge 类型 | recipes.ts | §5.3 |
| F4 | D5 | 单配方简化 — 每路线一个配方：restore（动态）, counterfeit_generic, reforge_generic。效果由物品属性预定义 | recipes.ts | §1 |
| F5 | #27 | 配方命名前缀 counterfeit_ | recipes.ts + game.toml + CSV | §5 |
| F6 | #6 | 标签叠加公式 — `max(tag) + (second-1)×0.5`, 硬上限 x5.0 | 新文件或 workshopLogic.ts | §5.5 |
| F7 | #22 | 精魄 3:1 转换机制 — 3 点 A 类 → 1 点 B 类 | 新增转换函数 + action | §5.8 |
| F8 | #28 | 精魄消耗类型纯度 80-90% — 修复主匠心, 伪造主旧影, 重铸主灵韵 | recipes.ts + game.toml | §3 |
| F9 | D3 | 去掉伪造折扣 — 出售公式中无 0.75 系数 | workshopLogic.ts 或 blackmarketService | §6.5 |
| F10 | #3 | 术语更新 — 代码中"感动"→"叹服" | workshopLogic.ts + CSV texts | §7 |
| F11 | #4 | 完整声誉变化表 — 三路线所有操作的声誉 delta | workshopLogic.ts + 声誉系统接口 | §11 |
| F12 | #14 | 伪造操作清白成本 — 死当操作0+出售-4, 当期操作-3+出售-4 | workshopLogic.ts | §7.3, §11 |
| F13 | R1 | 声誉行为影响矩阵增加工作台条目 | reputation 相关文件 | 声誉系统 §行为影响矩阵 |
| F14 | #1 | TRENDING 标签删除/配方移除（已确认代码中不存在，仅需检查 CSV/config 残留） | 检查 game.toml + CSV | §5 |
| F15 | #23 | 修复归还与赎回整合 — 赎回流程增加 WorkState 分支：RESTORED → 感激流程(H+10, C+1) | expiryReducer 或 departure 相关 | §7.2 |

#### Interaction 任务

| # | 采纳项 | 描述 | 文件 | 设计文档 |
|---|--------|------|------|----------|
| I1 | #5 | WorkshopPanel 三路线显示 — 三按钮（手/眼/心）+ 互斥锁标记 | WorkshopPanel.tsx | §2 UI 呈现 |
| I2 | #5 | 伪造确认弹窗 — 当期物品伪造时的风险预警 | WorkshopPanel.tsx | §7.3 弹窗 |
| I3 | #5 | 伪造 Gaze Moment — 凝视文案（首次固定5秒） | WorkshopPanel.tsx | §9.3 |

#### Content 任务

| # | 采纳项 | 描述 | 文件 |
|---|--------|------|------|
| C1 | D5 | 更新 workshop_recipes.csv — counterfeit 配方文本 | CSV |
| C2 | #28 | 更新 game.toml — counterfeit recipe 参数 | TOML |
| C3 | #3 | 更新 workshop_texts.csv — "感动"→"叹服" | CSV |

---

### WT-2: Counterfeit Sale + Notoriety System

**Worktree 分支**: `feat/counterfeit-sale-notoriety`
**文件影响**: `systems/blackmarket/`, `systems/workshop/`(新文件), `hooks/useBlackmarket.ts`, `components/night/blackmarket/`, `store/`

#### Framework 任务

| # | 采纳项 | 描述 | 文件 | 设计文档 |
|---|--------|------|------|----------|
| F16 | #13 | 伪造声名系统 — ForgeryNotoriety 4阶段(试水/入行/老手/声名在外)，每次伪造出售+1，不可衰减 | 新: systems/workshop/forgeryNotoriety.ts | §8 |
| F17 | #13 | GameState 增加 forgeryNotoriety 字段 + reducer | store 相关 | §8.1 |
| F18 | D1 | 黑市伪造品出售 — 同步阻塞流程，判断物品 workState===FORGED，计算售价 | blackmarketService.ts 扩展 | §6.5 |
| F19 | D1 | 鉴伪概率机制 — 基础15%, +3%/次, cap 33%。被识破→售价x0.50 + 热度+3 + 商誉-3 | blackmarketService.ts 或新文件 | §6.5 |
| F20 | D4 | 收购订单鉴伪 — 伪造品满足收购标签时，同样33%上限鉴伪 | blackmarketService.ts | §6.5 |
| F21 | R3 | 伪造声名与清白侵蚀关联 — 阶段越高叙事越沉默，清白持续流失 | forgeryNotoriety.ts | §8.3 通道B |
| F22 | #12+D1 | 出售结果包含声誉变化 — 出售时清白-4, 被识破额外商誉-3 + 热度+3 | 相关 reducer | §11 |

#### Interaction 任务

| # | 采纳项 | 描述 | 文件 | 设计文档 |
|---|--------|------|------|----------|
| I4 | D1 | 出售进度条 — 同步阻塞 UI，进度条满后显示结果 | SaleTab.tsx 或新组件 | §6.5 |
| I5 | D2 | 鉴伪结果文字告知 — 明确文字说明（非金额暗示） | SaleTab.tsx | §6.5 |
| I6 | #17 | 伪造凝视进化序列 — 根据 notoriety 阶段调整时长(5s→3s→2s→2s) 和文案基调 | WorkshopPanel.tsx 修改 | §9.3 |

#### Content 任务

| # | 采纳项 | 描述 | 文件 |
|---|--------|------|------|
| C4 | #17 | 伪造凝视进化文本 — 4阶段基调变化（道德不安→自我合理化→职业麻木→沉默） | CSV |
| C5 | D2 | 鉴伪结果文案 — 被识破/未识破的明确文字 | CSV |
| C6 | D1 | game.toml 增加鉴伪参数 — base_detection_rate, detection_increment, detection_cap | TOML |

---

## Batch 2: Information Architecture + Return + Polish

**前置**: Batch 1 全部合并完成

### WT-3: Information Data Flow + Return Mechanics

**Worktree 分支**: `feat/info-dataflow-return`
**文件影响**: `systems/items/`, `systems/workshop/`, `hooks/`, `store/reducers/`

#### Framework 任务

| # | 采纳项 | 描述 | 文件 | 设计文档 |
|---|--------|------|------|----------|
| F23 | #7 | PawnCustomerSnapshot 人口化 — ADD_ITEM action 中从 Customer 提取快照 | inventoryReducer 或 transactionReducer | §12.2 |
| F24 | #8 | emotionalWeight 积分规则 — SENTIMENTAL+3, STORY+3, 洞察+3, 对话+2, BehaviorTag+1; 0分=unknown, 1-3=低, 4-6=中, 7+=高 | 新: systems/workshop/emotionalWeight.ts | §12.3 |
| F25 | #9 | perceptionTier 计算 — blind(0鉴定+无洞察)/glimpse(1+鉴定)/partial(有洞察)/clear(2+鉴定+洞察) | 新: systems/workshop/perceptionTier.ts | §12.4 |
| F26 | #15 | 重铸归还概率矩阵 — 4种组合(低情感+开放型 ~ 高情感+情感型)，叹服/认可/不安/愤怒 | 新: systems/workshop/returnMatrix.ts | §7.4 + 附录D |
| F27 | #15 | 归还结果声誉效果 — 叹服H+5/C+8, 认可C+3, 不安H-5/C-2, 愤怒H-12/C-5 | returnMatrix.ts | §7.4 |
| F28 | #18 | 洞察→工作台接口 — 洞察第3层道德信息贡献 emotionalWeight +3 | 接口定义 | §12.5 |
| F29 | #19 | 鉴定→工作台 trait 消费 — SENTIMENTAL/STORY trait 影响 emotionalWeight | 接口定义 | §12.5 |
| F30 | #23 | 重铸归还流程 — 赎回时 WorkState=REFORGED 触发善意僭越判定 | departure/redemption 相关 | §7.4 |
| F31 | #26 | NPC 生成配合 — 确保足够多物品满足修复和重铸条件 | npc generation 相关 | §5.8 |
| F32 | #20 | 隐形训练三阶段 — 首次信息不足时的独白 + 渐退脚手架 | 新逻辑 | §12.7 |

#### Interaction 任务

| # | 采纳项 | 描述 | 文件 | 设计文档 |
|---|--------|------|------|----------|
| I7 | #24 | 重铸弹窗信息密度 — 根据 perceptionTier 差异化直觉文案(blind焦虑/clear从容) | WorkshopPanel.tsx | §7.4 弹窗 |
| I8 | #21 | blind 档确认弹窗叙事化 — "你对这件东西和这个人都不了解"，按钮"凭直觉来"/"再想想" | WorkshopPanel.tsx | §7.4 blind 档 |
| I9 | #16+R2 | 三层声誉反馈 — 即时微反馈(声誉条微变+角落数值+音效) + 叙事化反馈(次日新闻/邮件) + 状态总览 | 新组件 | §11 三层架构 |
| I10 | #20 | 隐形训练前馈信号 — 鉴定时偶尔商人独白"这东西如果能……" | 相关组件 | §12.7 |

#### Content 任务

| # | 采纳项 | 描述 | 文件 |
|---|--------|------|------|
| C7 | #11 | 商人直觉弹窗文案 — 重铸(3档情感×4档感知≈12条), 伪造(道德维度≈6条) | CSV |
| C8 | #12 | 归还结果文案 — 叹服/认可/不安/愤怒各含归因暗示(≈8条+变体) | CSV |
| C9 | #29 | 凝视文本扩展 — 三路线×信息状态(≈12条) | CSV |
| C10 | #20 | 隐形训练独白 — 首次引导+渐退脚手架(≈5条) | CSV |
| C11 | #21 | blind档确认文案(≈3条) | CSV |

---

## 合并顺序

### Batch 1
1. **Phase 1** → main 分支 commit
2. **WT-1 (Recipe Restructure)** 先合并 — 核心类型和逻辑，被 WT-2 依赖
3. **WT-2 (Sale + Notoriety)** 后合并 — 扩展黑市，依赖 counterfeit 类型

### Batch 2
4. **WT-3 (Info Flow + Return)** 先合并 — 新类型和逻辑
5. **(如需) WT-4: UI+Content polish** — 最后

---

## 注意事项

1. **现有 reforge 配方分类**：fake_history 和 master_forgery 应重分类为 counterfeit；art_enhanced 保留为 reforge；imperial 需确认归属（当前是 reforge）
2. **黑市系统已存在** — 伪造出售不是新建系统，而是扩展 `systems/blackmarket/` 添加检测逻辑
3. **配方简化冲击大** — 当前 5+4=9 配方 → 约 3-4 配方，需要清理大量旧代码
4. **UI 重构** — WorkshopPanel (27KB) 需要从"修复/重铸两列"改为"修复/伪造/重铸三列"
5. **声誉系统集成** — 需要检查现有声誉 reducer 是否支持 innocence (清白) 维度
6. **essence 转换** — 3:1 转换需要新 UI 入口（可能在夜间面板或工作台内）
