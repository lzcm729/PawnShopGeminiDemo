# Emma 路径验证报告

> 生成时间：2026-01-27
> 事件链：chain_emma
> NPC：艾玛

---

## 概览

### 事件链结构

```
Stage 0: emma_01_clothes (职业套装)
    ↓
Stage 1: emma_02_skincare (面霜礼盒) [触发条件: funds ≤ 200]
    ↓
Stage 2: emma_03_laptop (笔记本) [触发条件: funds < 100]
    ↓
Stage 3: 等待面试结果 (CHANCE: job_chance)
    ↓ 失败多次 + hope < 10
Stage 4: emma_04_watch_final (男友的表) [崩溃路径]
    ↓
Stage 5: emma_05_redemption (赎回) [成功路径]
Stage 99: 故事结束 (离开城市)
```

### 决策点统计
- 典当交易：5 个事件
- 到期结算：1 个事件有 expiryFlows (emma_01_clothes)
- 特殊事件：1 个 REDEMPTION_CHECK (emma_05_redemption)

### 路径统计
- 好结局路径：可达 (Stage 5 → dynamicFlows: all_safe/core_safe)
- 坏结局路径：可达 (Stage 4 → Stage 99 或 dynamicFlows: core_lost)
- 中性结局：可达 (Stage 99 离开城市)

---

## 问题清单

### 🔴 Critical Issues

#### Issue 1: 事件2/3触发条件可能永远不满足

**问题描述：**
- `emma_02_skincare` 触发条件: `funds ≤ 200`
- `emma_03_laptop` 触发条件: `funds < 100`

但艾玛的初始 funds = 500，每日消耗 -50 (DELTA 规则)。如果玩家在 Day 1 给了 charity 价格 (如 ¥1000)，funds 会变成 500 + 1000 - 50*N。

**计算：**
- Day 1 交易后: funds ≈ 500 + 交易金额
- 若 charity deal 给 ¥1000: funds = 1500
- 需要 (1500 - 200) / 50 = 26 天才能触发事件2

**风险：** 如果玩家对艾玛非常慷慨，她可能永远不会触发后续事件，导致故事卡在 Stage 1。

**建议修复：**
1. 添加基于时间的备用触发条件，如 `OR { stage == 1 AND daysSinceLastVisit >= 5 }`
2. 或降低触发门槛，改用相对变化而非绝对值

---

#### Issue 2: emma_02_skincare 和 emma_03_laptop 缺少 expiryFlows

**问题描述：**
只有 `emma_01_clothes` 定义了 `expiryFlows`（redemption/renewal/noShow）。

面霜和笔记本的到期日处理没有定义：
- 面霜到期时会发生什么？
- 笔记本到期时（对她极其重要）会发生什么？

**影响：**
- 玩家可能在到期日售出面霜/笔记本，但艾玛没有任何反馈
- 特别是笔记本 (`has_laptop` 变量追踪)，到期被售出应该有重大影响

**建议修复：**
为 emma_02_skincare 和 emma_03_laptop 添加 expiryFlows，特别是笔记本：
```typescript
expiryFlows: {
  noShow: {
    sell: [
      { type: "MODIFY_VAR", variable: "hope", value: -50 },
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_sold", delayDays: 0 }
    ]
  }
}
```

---

#### Issue 3: REDEMPTION_CHECK 事件缺少完整的 item 定义

**问题描述：**
`emma_05_redemption` 的 `template.item` 使用了虚拟物品：
```typescript
item: makeItem({ id: "emma_redeem_dummy", name: "赎回清单", realValue: 0, isVirtual: true }, "chain_emma")
```

这可能在游戏引擎处理时导致问题，因为：
1. 没有 `category`
2. 没有 `visualDescription`
3. 缺少其他必需字段

**建议修复：**
确保虚拟物品也有完整的必需字段，或在引擎中特殊处理 REDEMPTION_CHECK 类型事件。

---

### 🟡 Warnings

#### Warning 1: Stage 4 到 Stage 3 的回退逻辑不明确

**路径：** emma_04_watch_final → deal_charity/deal_aid → SET_STAGE: 3

**问题：**
当艾玛崩溃后（Stage 4）来当手表，如果玩家选择 charity，会将 stage 回退到 3（等待面试结果）。

但此时：
- 她的男友已经离开（根据 mail_emma_boyfriend_left）
- 面试机会可能已经没了（job_chance 可能很低）
- 她是否还有面试能力？

**建议：**
Stage 4 的 charity 路径应该有专门的恢复逻辑，而不是简单回退到 Stage 3。考虑：
- 添加一个新的 Stage (如 Stage 4.5 "重建希望")
- 或修改 Stage 3 的模拟规则，增加崩溃后恢复的特殊处理

---

#### Warning 2: 邮件触发可能重叠

**问题：**
多个 THRESHOLD 规则监控 `interview_failures`:
- `== 1` → mail_emma_interview_failed_once
- `== 2` → mail_emma_interview_failed_twice
- `>= 3` → mail_emma_interview_failed_3x

但如果 job_chance 很低，failures 可能快速累积，导致多封邮件在同一天触发。

**建议：**
1. 添加 `triggerOnce: true` 防止重复触发
2. 或在规则中添加互斥条件

---

#### Warning 3: hope ≤ 15 预警邮件与 hope < 10 崩溃邮件可能同时触发

**相关规则：**
- `hope ≤ 15` → mail_emma_coming_for_ring
- `hope < 10` → mail_emma_boyfriend_left + SET_STAGE: 4

如果 hope 从 16 直接跌到 8（比如一次 shark 交易 -15），两封邮件会同时发送，叙事逻辑混乱。

**建议：**
调整 THRESHOLD 规则的执行顺序，或在低优先级规则中添加条件排除。

---

#### Warning 4: onReject 路径缺少后续邮件反馈

**问题：**
所有事件的 `onReject` 只有变量修改，没有邮件：
- emma_01_clothes: 无邮件
- emma_02_skincare: 无邮件
- emma_03_laptop: 无邮件
- emma_04_watch_final: 无邮件

被拒绝是重大事件，应该有邮件反馈艾玛的状态。

**建议：**
为拒绝路径添加相应邮件，如：
```typescript
onReject: [
  { type: "SET_STAGE", value: 1 },
  { type: "MODIFY_VAR", variable: "hope", value: 40 },
  { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_rejected", delayDays: 0 }
]
```

---

#### Warning 5: dynamicFlows 中 "all_safe" 和 "core_safe" 的区分条件未定义

**问题：**
`emma_05_redemption` 定义了三个 dynamicFlows:
- `all_safe`: 所有物品都还在
- `core_safe`: 核心物品（职业套装）还在，其他卖了
- `core_lost`: 核心物品被卖了

但代码中没有看到判断逻辑——如何确定玩家进入哪个分支？

**建议：**
需要在游戏引擎中实现检查逻辑，或在事件定义中明确条件。

---

### 🔵 Info

#### Info 1: fateHints 覆盖良好

fateHints 定义了多层次的状态提示：
- hope >= 80, <= 20, >= 40, <= 40, <= 30
- funds >= 3000, <= 100
- job_chance >= 50
- interview_failures >= 2

这些 hints 能为玩家提供足够的状态感知。

---

#### Info 2: exitDialogues 条件覆盖合理

每个事件都根据 hope 值提供了不同的离店台词，能够反映玩家选择的影响。

---

#### Info 3: 邮件模板数量充足

已定义邮件：24 个
- 交易后反馈邮件：6 个（01-03 charity/shark）
- 状态追踪邮件：6 个（stage1-3 各2个）
- 到期相关邮件：4 个
- 面试结果邮件：5 个
- 结局邮件：3 个

---

## 完整路径分析

### 路径 1: 全程慷慨 → 好结局

```
Day 1: emma_01_clothes [charity]
  └─ hope: 50→70, job_chance: 0→30, stage: 0→1
  └─ 邮件: mail_emma_01_charity (即时), mail_emma_stage1_hopeful (Day 3)

[等待 funds ≤ 200 触发事件2...]
[假设 ~Day 7: funds 降到 200 以下]

Day 7: emma_02_skincare [charity]
  └─ hope: 70→65, stage: 1→2
  └─ 邮件: mail_emma_02_charity (即时), mail_emma_stage2_struggling (Day 9)

[等待 funds < 100 触发事件3...]

Day N: emma_03_laptop [charity]
  └─ hope: →60, has_laptop: 0, stage: 2→3
  └─ 邮件: mail_emma_03_charity, mail_emma_stage3_waiting (Day N+3), mail_emma_stage3_desperate (Day N+5)

[Stage 3: 每日运行 CHANCE 规则检测 job_chance]
[假设 job_chance = 30 + 2*高hope天数, 某天成功]

Day M: CHANCE 成功!
  └─ funds: +3000, hope: +50, stage: 3→5
  └─ 邮件: mail_emma_got_job (Day M+1)

Day M+X: emma_05_redemption 触发
  └─ dynamicFlows: all_safe (假设所有物品都在)
  └─ 结局: 成功入职，感恩赎回
  └─ 邮件: mail_emma_success (Day M+X+1)
```

**评估：** ✅ 路径完整，内容充实

---

### 路径 2: 全程苛刻 → 崩溃结局

```
Day 1: emma_01_clothes [shark]
  └─ hope: 50→40, job_chance: 0→10, stage: 0→1
  └─ 邮件: mail_emma_01_shark, mail_emma_stage1_anxious (Day 3)

Day N: emma_02_skincare [shark] (funds ≤ 200 触发)
  └─ hope: 40→30, stage: 1→2
  └─ 邮件: mail_emma_02_shark, mail_emma_stage2_struggling (Day N+1)

Day M: emma_03_laptop [shark] (funds < 100 触发)
  └─ hope: 30→20, job_chance: 10→0, has_laptop: 0, stage: 2→3
  └─ 邮件: mail_emma_03_shark, mail_emma_stage3_nervous (Day M+2), mail_emma_stage3_desperate (Day M+4)

[Stage 3: CHANCE 规则每日运行，但 job_chance = 0，永远失败]
[每次失败: hope -15, interview_failures +1]

Day M+1: 第一次面试失败
  └─ hope: 20→5 (触发 hope < 10 阈值!)
  └─ 触发 THRESHOLD: hope < 10
  └─ stage: 3→4, 邮件: mail_emma_boyfriend_left

[同时触发 hope ≤ 15: mail_emma_coming_for_ring — 叙事冲突!]

Day M+2: emma_04_watch_final 触发 (Stage 4)
  └─ [shark] → stage: 4→99, hope: →0
  └─ 邮件: mail_emma_03b_shark

结局: 艾玛离开城市，故事结束
```

**评估：** ⚠️ 路径存在问题
- 两封邮件同时触发 (coming_for_ring + boyfriend_left)
- 崩溃速度可能太快（1-2天从 hope 20 到崩溃）

---

### 路径 3: 拒绝交易 → 未完成故事

```
Day 1: emma_01_clothes [reject]
  └─ hope: 50→40, stage: 0→1
  └─ 无邮件

[艾玛带着职业套装离开了，故事似乎中断...]

问题：
- Stage 1 需要 funds ≤ 200 触发事件2
- 但她没有交易，funds 还在自然消耗
- 触发事件2后，玩家没有她的任何物品
- 这条路径的叙事意义是什么？
```

**评估：** 🔴 需要设计 reject 路径的专门处理

---

### 路径 4: 到期日卖出职业套装 → 坏结局

```
Day 1: emma_01_clothes [standard]
  └─ hope: 50→60, job_chance: 0→20, stage: 0→1
  └─ 物品入库，假设7天到期

Day 8: 职业套装到期
  └─ 艾玛未来赎回 (noShow)
  └─ 玩家选择: [sell] 挂牌出售
  └─ expiryFlows.noShow.sell: hope: -40

[后续触发 emma_02_skincare, emma_03_laptop...]

[最终到达 Stage 5: REDEMPTION_CHECK]
  └─ dynamicFlows: core_lost
  └─ 对话: "衣服... 卖了？那我明天穿什么去入职？！"
  └─ 邮件: mail_emma_hate
  └─ 结局: 仇恨结局
```

**评估：** ✅ 路径完整，因果清晰

---

## 覆盖率统计

### 邮件模板覆盖率

| 邮件ID | 触发路径 | 状态 |
|--------|----------|------|
| mail_emma_success | Stage 5 + all_safe/core_safe | ✅ |
| mail_emma_hate | Stage 5 + core_lost | ✅ |
| mail_emma_boyfriend_left | hope < 10 触发 | ✅ |
| mail_emma_plea | emma_05 failureMailId | ✅ |
| mail_emma_01_charity | emma_01 charity/aid | ✅ |
| mail_emma_01_shark | emma_01 shark | ✅ |
| mail_emma_02_charity | emma_02 charity/aid/standard | ✅ |
| mail_emma_02_shark | emma_02 shark | ✅ |
| mail_emma_03_charity | emma_03 charity/aid/standard | ✅ |
| mail_emma_03_shark | emma_03 shark | ✅ |
| mail_emma_03b_charity | emma_04 charity/aid | ✅ |
| mail_emma_03b_shark | emma_04 standard/shark | ✅ |
| mail_emma_redeem_failed | 未在代码中引用 | ❌ |
| mail_emma_coming_for_ring | hope ≤ 15 触发 | ✅ |
| mail_emma_got_job | CHANCE 成功 | ✅ |
| mail_emma_interview_failed_3x | failures >= 3 | ✅ |
| mail_emma_stage1_hopeful | emma_01 charity/aid | ✅ |
| mail_emma_stage1_anxious | emma_01 standard/shark | ✅ |
| mail_emma_stage2_struggling | emma_02 所有路径 | ✅ |
| mail_emma_stage3_desperate | emma_03 所有deal路径 | ✅ |
| mail_emma_stage3_waiting | emma_03 charity/aid/standard | ✅ |
| mail_emma_stage3_nervous | emma_03 shark | ✅ |
| mail_emma_interview_failed_once | failures == 1 | ✅ |
| mail_emma_interview_failed_twice | failures == 2 | ✅ |
| mail_emma_expiry_plea | expiryFlows.noShow.keep | ✅ |
| mail_emma_renewal_thanks | expiryFlows.renewal/redemption.accept | ✅ |
| mail_emma_renewal_rejected | expiryFlows.renewal/redemption.refuse | ✅ |

**覆盖率：** 26/27 = **96%**

**未覆盖邮件：**
- `mail_emma_redeem_failed`: 定义了但未在任何路径中引用

---

### dynamicFlows 覆盖率

| Flow | 触发条件 | 状态 |
|------|----------|------|
| all_safe | 所有物品都在库 | ✅ 可达 |
| core_safe | 核心物品在，其他卖了 | ✅ 可达 |
| core_lost | 核心物品被卖 | ✅ 可达 |

**覆盖率：** 3/3 = **100%**

---

### fateHints 覆盖率

| 条件 | 对应路径 | 状态 |
|------|----------|------|
| hope >= 80 | charity 连续 + job 成功 | ✅ |
| hope <= 20 | shark 连续 | ✅ |
| hope >= 40 | 中性路径 | ✅ |
| hope <= 40 | shark 后期 | ✅ |
| hope <= 30 | 接近崩溃 | ✅ |
| funds >= 3000 | job 成功后 | ✅ |
| funds <= 100 | 触发事件3前 | ✅ |
| job_chance >= 50 | charity 累积 | ✅ |
| interview_failures >= 2 | 面试失败累积 | ✅ |

**覆盖率：** 9/9 = **100%**

---

## 修复建议优先级

| 优先级 | 问题 | 建议 |
|--------|------|------|
| P0 | 事件2/3触发条件过于严格 | 添加时间备用触发 |
| P0 | emma_02/03 缺少 expiryFlows | 添加到期处理 |
| P1 | 邮件重叠触发 | 添加互斥条件 |
| P1 | onReject 缺少邮件反馈 | 补充拒绝路径邮件 |
| P1 | dynamicFlows 判断逻辑缺失 | 在引擎中实现 |
| P2 | Stage 4→3 回退逻辑 | 设计专门的恢复路径 |
| P2 | mail_emma_redeem_failed 未使用 | 移除或找到使用场景 |

---

## 总结

Emma 的故事线整体设计完善，邮件和对话内容丰富。主要问题集中在：

1. **触发条件设计** — 依赖绝对值可能导致路径无法触发
2. **到期日处理** — 面霜和笔记本缺少到期反馈
3. **边界情况** — reject 路径和极端选择组合需要更多考虑

建议使用 `/story-playtest emma` 手动体验以下关键路径：
- 全 charity 路径
- 全 shark 路径
- Day 1 reject 后的后续
- 到期日卖出核心物品

