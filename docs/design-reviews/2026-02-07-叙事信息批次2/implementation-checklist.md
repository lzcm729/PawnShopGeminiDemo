# 实现清单

> **来源**: `docs/design-reviews/2026-02-07-叙事信息批次2`
> **生成日期**: 2026-02-08
> **完成日期**: 2026-02-08
> **合并顺序**: 送客环节 → 邮件系统 → 新闻系统 → 事件链系统
> **设计文档版本**: 送客 v1.3, 邮件 v1.2, 新闻 v1.2, 事件链 v1.5

---

## 基础变更（Phase 1 — CC 分支）

| ID | 任务 | 代码层 | 状态 | 备注 |
|----|------|--------|------|------|
| B-1 | SatisfactionLevel 类型扩展：新增 'CONFLICTED' | framework | merged | `systems/narrative/types.ts` |
| B-2 | NewsItem 类型扩展：新增 sourceLabel, tags, displayDay, expiresDay 字段 | framework | merged | `systems/news/types.ts` |
| B-3 | MailTemplate 类型扩展：新增 delay 字段（四级延时） | framework | merged | `systems/narrative/types.ts` |
| B-4 | 信息信道协议类型定义 | framework | merged | `systems/narrative/channelProtocol.ts` |

---

## S1: 送客环节（worktree: feat/departure）

**设计文档**: `送客环节 (The Departure Interaction).md` v1.3

### Framework 层

| ID | 采纳项 | 任务描述 | 状态 | 依赖 |
|----|--------|---------|------|------|
| S1-F1 | P1-1 | 满意度评估重构：二维满意度矩阵（合同档位 × 当金比例），含 CONFLICTED | merged | B-1 |
| S1-F2 | P2-10 | 多场景送客支持：REDEEM/RENEWAL/POST_FORFEIT 独立评估逻辑 | merged | B-1 |
| S1-F3 | P2-10 | 内心OS扩展：CONFLICTED + 多场景商人独白 | merged | B-1 |
| S1-F4 | P1-9 | 送客兴趣曲线：三阶段过渡节奏参数 | merged | S1-F1 |

### Interaction 层

| ID | 采纳项 | 任务描述 | 状态 | 依赖 |
|----|--------|---------|------|------|
| S1-I1 | P1-1, P1-9 | DepartureView：CONFLICTED 视觉 + 三阶段过渡动画 | merged | S1-F1, S1-F4 |

---

## S2: 邮件系统（worktree: feat/mail）

**设计文档**: `邮件系统 (Mail System).md` v1.2

### Framework 层

| ID | 采纳项 | 任务描述 | 状态 | 依赖 |
|----|--------|---------|------|------|
| S2-F1 | P0-1 | 附件收取微交互：需玩家主动点击"收下" | merged | B-3 |
| S2-F2 | P2-3 | 四级延时投递：immediate/standard/slow/surprise | merged | B-3 |
| S2-F3 | P0-6 | 非必然回报机制：30-40% 现金概率 + 非金钱类型 | merged | - |
| S2-F4 | P0-2 | 黑帮威胁邮件瘦身：纯信息传递 | merged | - |
| S2-F5 | P0-5 | 邮件侧信道协议：新闻先于邮件 ≥1天 | merged | B-4 |

### Interaction 层

| ID | 采纳项 | 任务描述 | 状态 | 依赖 |
|----|--------|---------|------|------|
| S2-I1 | P0-1 | MailModal 附件微交互 UI | merged | S2-F1 |

---

## S3: 新闻系统（worktree: feat/news）

**设计文档**: `新闻与传闻系统 (News & Rumor System).md` v1.2

### Framework 层

| ID | 采纳项 | 任务描述 | 状态 | 依赖 |
|----|--------|---------|------|------|
| S3-F1 | P0-3 | NewsItem 数据架构升级至 v1.2 规范 | merged | B-2 |
| S3-F2 | P0-3 | 优先级算法重构：保底 + 上限 + 溢出延迟 | merged | S3-F1 |
| S3-F3 | P0-3 | 生成时序集成：夜间结算 + 输入/输出接口 | merged | S3-F1 |
| S3-F4 | P1-3 | 情报验证循环概率化：60-80% + 延迟 + 分级惩罚 | merged | S3-F1 |
| S3-F5 | P1-5 | 声誉惩罚走 TRANSIENT 事件链 | merged | S3-F4 |
| S3-F6 | P0-5 | 新闻侧信道协议：后果严重程度决定新闻生成 | merged | B-4, S3-F1 |

---

## S4: 事件链系统（worktree: feat/event-chain）

**设计文档**: `动态事件链系统 (Dynamic Event Chain System).md` v1.5

### Framework 层

| ID | 采纳项 | 任务描述 | 状态 | 依赖 |
|----|--------|---------|------|------|
| S4-F1 | P0-2 | 黑帮威胁事件链模板：MAIL_DELIVERED 触发 | merged | - |
| S4-F2 | P1-5 | TRANSIENT 事件链外部触发：NEWS_VERIFICATION 接口 | merged | - |
| S4-F3 | P0-5 | 事件链后果分发器：SimRules 后果 → 信道分发 | merged | B-4 |
| S4-F4 | P0-5 | 信道时序规则执行：同事件不同天/不重复 | merged | S4-F3 |

---

## 合并记录

| 批次 | 系统 | 合并时间 | 提交哈希 | 冲突 |
|------|------|---------|---------|------|
| Phase 1 | 基础类型 B-1~B-4 | 2026-02-08 | 直接提交到 CC | 无 |
| Batch A | S1 送客环节 | 2026-02-08 | feat/departure → CC | 无 |
| Batch A | S2 邮件系统 | 2026-02-08 | feat/mail → CC | 无（自动合并） |
| Batch B | S3 新闻系统 | 2026-02-08 | feat/news → CC | 无 |
| Batch B | S4 事件链系统 | 2026-02-08 | feat/event-chain → CC | hooks/useGameEngine.ts（手动解决） |

---

## 任务统计

| 类别 | 数量 | 完成 |
|------|------|------|
| 基础变更 (Phase 1) | 4 | 4 |
| Framework 任务 | 19 (S1:4 + S2:5 + S3:6 + S4:4) | 19 |
| Interaction 任务 | 2 (S1:1 + S2:1) | 2 |
| Content 任务 | 0 | 0 |
| **总计** | **25** | **25** |
