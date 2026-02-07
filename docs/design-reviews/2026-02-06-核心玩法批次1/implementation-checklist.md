# 实现清单

> **来源**: `docs/design-reviews/2026-02-06-核心玩法批次1`
> **存放位置**: `docs/design-reviews/2026-02-06-核心玩法批次1/implementation-checklist.md`
> **生成日期**: 2026-02-08
> **合并顺序**: appraisal → medical

---

## 采纳项分析

13 个已采纳 OPT 中，7 个为**纯设计文档更新**（已完成），6 个需要**代码实现**：

| OPT | 标题 | 需代码? | 归属系统 | 理由 |
|-----|------|---------|---------|------|
| OPT-1 | 叠加强化计划体系 | ❌ | — | 纯设计框架，具体实现依赖事件链/邮件等系统（批次2范围） |
| OPT-2 | 子系统交叉连接 | ❌ | — | 四条连接路径依赖探望、后果回传、事件链等未实现系统 |
| OPT-5 | 等待期动态化 + 不定时小额支出 | ✅ | medical | 需添加随机小额医疗支出逻辑 |
| OPT-6 | 鉴定-格物 uncertainty 共享 | ❌ | — | 代码已正确实现（共享 item.uncertainty） |
| OPT-7 | 夜间活动时序图 | ❌ | — | 纯文档定义执行顺序 |
| OPT-8 | 违约赔偿基数统一 | ❌ | — | 代码已正确使用 principal*2 |
| OPT-9 | 经济参数文档同步 | ❌ | — | 纯文档更新，已完成 |
| OPT-10 | 护理选项整合 | ❌ | — | 当前代码已有 PURCHASE_TREATMENT，功能扩展依赖探望系统（批次2） |
| OPT-11 | 事件概率单骰统一 | ✅ | appraisal | 当前代码使用独立掷骰，需改为 d100 单骰互斥 |
| OPT-12 | FAKE 发现保底机制 | ✅ | appraisal | 需添加伪随机递增保底 |
| OPT-13 | 鉴定 vs 洞察经济平衡 | ❌ | — | 三方向精度收益已实现 |
| OPT-14 | 修行面板纳入昼夜循环 | ❌ | — | 修行面板系统尚未设计，仅在文档中提及 |
| OPT-16 | 生命值/医药费分离 | ✅ | medical | 需实现每日健康值衰减/恢复 + Game Over 触发 |

---

## 基础变更（Phase 1 — main 分支）

| ID | 任务 | 代码层 | 状态 | 备注 |
|----|------|--------|------|------|
| B-1 | 在 config/game.toml 添加不定时小额支出参数 | framework | merged | [mother] 节新增 random_medical_min/max/chance |
| B-2 | 在 config/game.toml 添加健康值衰减/恢复参数 | framework | merged | [mother] 节新增 health_decay_rate/health_recovery_rate |
| B-3 | 在 config/game.toml 添加鉴定意外 d100 参数 | framework | merged | 新增 [appraisal_events] 节，含各事件骰子范围 |

---

## 系统 1: appraisal — 鉴定意外与 FAKE 保底（worktree: feat/appraisal）

**设计文档**: `Designer/系统设计文档/鉴定系统 (Appraisal System).md`
**版本**: v1.7
**经济参数**: `Designer/数值平衡/经济参数.md` v1.1

### Framework 层

| ID | OPT | 任务描述 | 设计文档章节 | 状态 | 依赖 |
|----|-----|---------|-------------|------|------|
| S1-F1 | OPT-11 | 重写 `rollAppraisalEvent()` 为 d100 单骰互斥判定 | 鉴定 2.H节 + 经济参数 鉴定意外事件表 | merged | B-3 |
| S1-F2 | OPT-11 | 新增 `BREAKTHROUGH` 事件类型（灵光一闪），uncertainty ×0.60 + range 收敛 ×0.30 | 鉴定 2.H节 + 2.B节 | merged | S1-F1 |
| S1-F3 | OPT-11 | 实现单骰触发条件过滤：首次不触发负面、同物品最多1次负面、伪造品不触发失误 | 鉴定 2.H节 限制规则 | merged | S1-F1 |
| S1-F4 | OPT-11 | 实现灵光一闪与特征发现的交互：FAKE/JACKPOT 特征发现优先（u→0.10），非跳变特征时 ×0.60 正常生效 | 鉴定 2.H节 交互规则 | merged | S1-F2 |
| S1-F5 | OPT-12 | 实现 FAKE 伪随机保底：跟踪每物品鉴定次数，第2次 ×1.5、第3次 ×2.0、第4次 100% 强制发现 | 鉴定 2.C节 + 经济参数 FAKE保底表 | merged | - |
| S1-F6 | OPT-12 | 在 Item 类型中添加 `appraisalCount` 字段（或复用现有字段），用于保底计数 | 类型定义 | merged | - |

### Interaction 层

| ID | OPT | 任务描述 | 设计文档章节 | 状态 | 依赖 |
|----|-----|---------|-------------|------|------|
| S1-I1 | OPT-11 | 为 BREAKTHROUGH 事件添加鉴定反馈文案和视觉效果（黄金色闪光） | 鉴定 视觉反馈 | merged | S1-F2 |

### Content 层

无内容层任务。

---

## 系统 2: medical — 健康值系统与不定时支出（worktree: feat/medical）

**设计文档**: `Designer/系统设计文档/核心设定 (Core Setting & Motivation).md`
**版本**: v1.4
**经济参数**: `Designer/数值平衡/经济参数.md` v1.1

### Framework 层

| ID | OPT | 任务描述 | 设计文档章节 | 状态 | 依赖 |
|----|-----|---------|-------------|------|------|
| S2-F1 | OPT-16 | 实现每日健康值更新：已支付 → +2%/天（上限100），欠费 → -15%/天 | 核心设定 B.1节 | merged | B-2 |
| S2-F2 | OPT-16 | 实现健康值 ≤ 0 触发 Game Over（母亲病逝），在每日结算时检查 | 核心设定 B.1节 | merged | S2-F1 |
| S2-F3 | OPT-16 | 实现紧急治疗 action：花费 $200，立即 +5% 生命值 | 核心设定 B.1节 挽救手段 | merged | S2-F1 |
| S2-F4 | OPT-5 | 实现不定时小额医疗支出：每天有一定概率（如15%）随机扣除 $100-300 | 核心设定 B节 + 经济参数 不定时小额支出 | merged | B-1 |
| S2-F5 | OPT-5 | 小额支出产生事件日志和交易记录（"门诊复查"/"药物补充"等描述） | 核心设定 B节 | merged | S2-F4 |

### Interaction 层

| ID | OPT | 任务描述 | 设计文档章节 | 状态 | 依赖 |
|----|-----|---------|-------------|------|------|
| S2-I1 | OPT-16 | 健康值 UI：在医疗终端显示病情状态文字 + 百分比（稳定70-100/恶化40-69/危急1-39） | 核心设定 3节 医疗终端 | merged | S2-F1 |
| S2-I2 | OPT-16 | 欠费状态下 UI 红色警告效果 | 核心设定 B.1节 | merged | S2-F1 |
| S2-I3 | OPT-16 | 紧急治疗按钮 UI（仅在欠费或健康值低时显示） | 核心设定 B.1节 挽救手段 | merged | S2-F3 |

### Content 层

| ID | OPT | 任务描述 | 设计文档章节 | 状态 | 依赖 |
|----|-----|---------|-------------|------|------|
| S2-C1 | OPT-5 | 在 game.toml 中配置不定时支出的描述文案池 | — | merged | S2-F4 |

---

## 批次规划

### 批次 5（本批）

两个系统文件无重叠，可放同一批并行实现：

- **appraisal**: 修改 `systems/items/utils.ts` + `hooks/useAppraisal.ts` + `types/`
- **medical**: 修改 `store/reducers/financialReducer.ts` + `hooks/useFinancialProjection.ts` + `components/ui/`

**合并顺序**: appraisal → medical

理由：appraisal 改动自包含（鉴定系统内部），medical 涉及全局状态但不依赖 appraisal 的变更。appraisal 改动更小更独立，先合并降低冲突风险。

---

## 总计

| 统计 | 数量 |
|------|------|
| 基础变更 | 3 |
| Framework 任务 | 11 (S1: 6, S2: 5) |
| Interaction 任务 | 4 (S1: 1, S2: 3) |
| Content 任务 | 1 (S2: 1) |
| **总计** | **19** |
