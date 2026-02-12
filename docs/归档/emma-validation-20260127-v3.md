# Emma 路径验证报告 v3

> 生成时间：2026-01-27
> 事件链：chain_emma
> NPC：艾玛

---

## 概览

### 事件链结构

```
Stage 0: emma_01_clothes (职业套装)
    ↓ [4种deal + reject]
Stage 1: emma_02_skincare (面霜礼盒)
    │   触发条件: stage==1 AND funds≤400
    ↓ [4种deal + reject]
Stage 2: emma_03_laptop (笔记本)
    │   触发条件: stage==2 AND funds<100
    ↓ [4种deal + reject]
Stage 3: 等待面试结果 + emma_03b_laptop_request
    │   触发条件: stage==3 AND days_since_interview>=3
    │   每日运行 CHANCE(job_chance) 判定
    ├─ 成功 → Stage 5
    └─ 失败累积 + hope<10 → Stage 4

Stage 4: emma_04_watch_final (男友的表) [崩溃路径]
    │   可能回退到 Stage 3 (charity/aid)
    │   或进入 Stage 99 (standard/shark/reject)
    ↓
Stage 5: emma_05_redemption (赎回事件) [成功路径]
    │   REDEMPTION_CHECK 类型
    │   dynamicFlows: all_safe / core_safe / core_lost
    ↓
Stage 99: 故事结束 (离开城市/仇恨结局)
```

### 决策点统计

| 类型 | 数量 | 事件 |
|------|------|------|
| 典当节点 | 4 | emma_01, emma_02, emma_03, emma_04 |
| 物品衍生节点 | 1 | emma_03b_laptop_request (借用电脑) |
| 结算节点 | 3 | emma_01/02/03 各有 expiryFlows |
| 赎回节点 | 1 | emma_05_redemption |

### 结局统计

| 结局类型 | 可达性 | 路径 |
|----------|--------|------|
| 好结局 (成功入职) | ✅ | Stage 5 → all_safe/core_safe |
| 坏结局 (仇恨) | ✅ | Stage 5 → core_lost |
| 中性结局 (离开城市) | ✅ | Stage 4 → 99 或 Stage 99 |
| 崩溃结局 (男友离开) | ✅ | hope < 10 → Stage 4 |

---

## 问题清单

### 🔴 Critical Issues

#### Issue 1: 事件触发条件可能导致长时间等待

**问题描述：**
- `emma_02_skincare` 触发条件: `funds ≤ 400` (已从200改为400)
- `emma_03_laptop` 触发条件: `funds < 100`

**改善情况：**
- v2 报告指出 funds ≤ 200 门槛太低
- 当前代码已调整为 funds ≤ 400，有所改善

**仍存在的问题：**
如果 charity deal 给了 ¥1000 (职业套装 realValue=1200)：
- Day 1 交易后: funds = 500 + 1000 = 1500
- 每日消耗 -50
- 需要 (1500 - 400) / 50 = 22 天才能触发事件2

**建议修复：**
添加基于时间的备用触发条件：
```typescript
triggerConditions: [
  { variable: "stage", operator: "==", value: 1 },
  { variable: "funds", operator: "<=", value: 400 }
  // 备选：OR daysSinceStageChange >= 5
]
```

---

#### Issue 2: emma_02_skincare 缺少 expiryFlows 的邮件反馈

**问题描述：**
`emma_02_skincare` 有 expiryFlows 定义，但缺少专门的邮件模板：

```typescript
expiryFlows: {
  redemption: {
    accept: [{ type: "MODIFY_VAR", variable: "hope", value: 10 }],
    // 无邮件
  },
  noShow: {
    sell: [{ type: "MODIFY_VAR", variable: "hope", value: -20 }],
    // 无邮件 - 面霜被卖掉她没反应？
  }
}
```

**影响：**
面霜对艾玛来说是"男友的假礼物"，有情感含义。被卖掉应该有邮件反馈。

**建议修复：**
添加面霜相关的到期邮件模板：
- `mail_emma_skincare_sold`: 面霜被卖后的反应

---

#### Issue 3: Stage 3 借用电脑事件可能不触发

**问题描述：**
`emma_03b_laptop_request` 触发条件：
```typescript
triggerConditions: [
  { variable: "stage", operator: "==", value: 3 },
  { variable: "days_since_interview", operator: ">=", value: 3 }
]
```

但 `days_since_interview` 变量的递增规则有条件限制：
```typescript
{
  type: 'DELTA',
  condition: { variable: 'stage', operator: '==', value: 3 },
  targetVar: 'days_since_interview',
  value: 1
}
```

**问题：**
如果在 Stage 3 的第一天就触发了 CHANCE 成功（进入 Stage 5），或者 hope 崩溃（进入 Stage 4），`days_since_interview` 永远不会达到 3，借用电脑事件永远不会触发。

**影响：**
- `mail_emma_laptop_borrow_thanks` 和 `mail_emma_laptop_borrow_refused` 可能永远不会触发
- 这是一个重要的交互机会，玩家可以通过允许借用来帮助艾玛

**建议修复：**
1. 降低触发门槛到 `days_since_interview >= 1`
2. 或确保 Stage 3 不会在第一天就转换状态

---

### 🟡 Warnings

#### Warning 1: 邮件重叠触发风险

**相关规则：**
- `hope ≤ 15` → `mail_emma_coming_for_ring` (breakdown_timer == 0 时)
- `hope < 10` → `mail_emma_boyfriend_left` + SET_STAGE: 4

**场景：**
如果 hope 从 16 直接跌到 5（如 shark 交易 -15 + 每日模拟累积），可能同时触发两封邮件。

**已有保护：**
- 使用 `breakdown_timer` 变量防止重复触发 `coming_for_ring`
- 但仍可能在同一天触发两种邮件

**建议：**
在 `hope < 10` 规则中添加条件：`AND breakdown_timer == 1`，确保先收到预警再崩溃。

---

#### Warning 2: emma_04_watch_final 回退逻辑的叙事一致性

**路径：** emma_04_watch_final → deal_charity/deal_aid → SET_STAGE: 3

**问题：**
当艾玛崩溃后（男友离开）来当手表，如果玩家选择 charity：
- stage 回退到 3（等待面试结果）
- hope 设为 40

但叙事上：
- 她的男友已经离开了
- 她刚经历了崩溃
- Stage 3 的对话和邮件是否还适用？

**建议：**
考虑添加一个过渡状态（如 Stage 3.5），专门处理"崩溃后恢复"的情况。

---

#### Warning 3: interview_failures 邮件触发逻辑

**规则：**
```typescript
// failures == 1 → mail_emma_interview_failed_once
// failures == 2 → mail_emma_interview_failed_twice
// failures >= 3 → mail_emma_interview_failed_3x
```

**问题：**
这些规则使用 `THRESHOLD` 类型，没有"触发一次"的保护。如果某天 failures 从 0 跳到 3（不太可能但理论上可能），三封邮件可能同时触发。

**实际风险：** 低。因为 CHANCE 规则每天最多让 failures +1。

---

#### Warning 4: dynamicFlows 的 itemCondition 检查

**已实现：**
`emma_05_redemption` 使用了显式的 `itemCondition`：
```typescript
"all_safe": {
  itemCondition: {
    targetItemId: "emma_item_clothes",
    targetStatus: 'SAFE',
    otherItemsStatus: 'ALL_SAFE'
  },
  ...
}
```

**验证：**
引擎中 `resolveRedemptionFlow` 函数实现了 `matchesItemCondition` 逻辑。✅ 已修复。

---

### 🔵 Info

#### Info 1: onReject 路径已有邮件反馈

**已修复：**
`emma_01_clothes` 的 onReject 现在包含邮件：
```typescript
onReject: [
  { type: "SET_STAGE", value: 1 },
  { type: "MODIFY_VAR", variable: "hope", value: 40 },
  { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_rejected", delayDays: 0 }
]
```

**仍缺少：**
- `emma_02_skincare.onReject` 无邮件
- `emma_03_laptop.onReject` 有邮件 (`mail_emma_laptop_rejected`)
- `emma_04_watch_final.onReject` 无邮件

---

#### Info 2: Stage 3 互动事件设计良好

`emma_03b_laptop_request` 是一个物品衍生节点：
- 允许借用 → hope +15, job_chance +5
- 允许但收费 → 收取 ¥20-50
- 拒绝 → hope -5

这是很好的机制设计，让玩家有更多互动机会。

---

#### Info 3: 笔记本到期处理完善

`emma_03_laptop` 现在有完整的 expiryFlows：
```typescript
expiryFlows: {
  redemption: {
    accept: [..., mail_emma_laptop_renewal_thanks],
    refuse: [..., mail_emma_laptop_renewal_refused]
  },
  renewal: {
    accept: [...],
    refuse: [..., SET_STAGE: 4]  // 拒绝续当导致崩溃
  },
  noShow: {
    sell: [..., mail_emma_laptop_sold, SET_STAGE: 4],  // 卖掉导致崩溃
    keep: [..., mail_emma_laptop_plea]
  }
}
```

---

## 完整路径分析

### 路径 1: 全程慷慨 → 好结局

```
Day 1: emma_01_clothes [charity, 90% × 0%]
  └─ 当金: ~1080 (realValue 1200 × 90%)
  └─ hope: 50→70, job_chance: 0→30, stage: 0→1
  └─ funds: 500 + 1080 = 1580
  └─ 邮件: mail_emma_01_charity, mail_emma_stage1_hopeful (Day 3)

Day 1-23: 等待 funds ≤ 400
  └─ 每日: funds -50, job_chance 可能 +2 (hope>=80)
  └─ Day ~24: funds ≈ 1580 - 23*50 = 430 → 未触发
  └─ Day ~25: funds ≈ 380 → 触发！

Day 25: emma_02_skincare [charity]
  └─ 当金: ~540 (realValue 600 × 90%)
  └─ hope: 70→65, stage: 1→2
  └─ funds: 380 + 540 = 920
  └─ 邮件: mail_emma_02_charity, mail_emma_stage2_struggling (Day 27)

Day 25-42: 等待 funds < 100
  └─ Day ~42: funds ≈ 920 - 17*50 = 70 → 触发！

Day 42: emma_03_laptop [charity]
  └─ 当金: ~1350 (realValue 1500 × 90%)
  └─ hope: →60, has_laptop: 0, stage: 2→3
  └─ 邮件: mail_emma_03_charity, mail_emma_stage3_waiting (Day 45)

Day 42+: Stage 3 - 等待面试结果
  └─ 每日运行 CHANCE(job_chance)
  └─ job_chance = 30 + 累积 ≈ 50-60
  └─ 假设 Day 46 成功

Day 46: CHANCE 成功!
  └─ funds: +3000, hope: +50 (→110, 显示为满), stage: 3→5
  └─ 邮件: mail_emma_got_job (Day 47)

Day 48: emma_05_redemption 触发
  └─ 检查物品状态: emma_item_clothes 还在库存
  └─ dynamicFlows: all_safe
  └─ 对话: "太好了，都在！"
  └─ 结局: 成功入职，感恩赎回
  └─ 邮件: mail_emma_success (Day 49)
```

**评估：** ✅ 路径完整

**问题：** 从 Day 1 到好结局需要 ~48 天，时间跨度较长。在实际游戏中玩家可能需要面对其他事件链。

---

### 路径 2: 全程苛刻 → 崩溃结局

```
Day 1: emma_01_clothes [shark, 70% × 20%]
  └─ 当金: ~840 (realValue 1200 × 70%)
  └─ hope: 50→40, job_chance: 0→10, stage: 0→1
  └─ funds: 500 + 840 = 1340
  └─ 邮件: mail_emma_01_shark, mail_emma_stage1_anxious (Day 3)

Day 1-19: 等待 funds ≤ 400
  └─ 每日: funds -50, job_chance 可能 -5 (hope<30)
  └─ Day ~19: funds ≈ 1340 - 18*50 = 440
  └─ Day ~20: funds ≈ 390 → 触发！

Day 20: emma_02_skincare [shark]
  └─ 当金: ~420 (realValue 600 × 70%)
  └─ hope: 40→30, stage: 1→2
  └─ funds: 390 + 420 = 810
  └─ 邮件: mail_emma_02_shark, mail_emma_stage2_struggling (Day 21)

Day 20-35: 等待 funds < 100
  └─ 每日: funds -50, job_chance -5 (hope<30)
  └─ Day ~35: funds ≈ 810 - 15*50 = 60 → 触发！

Day 35: emma_03_laptop [shark]
  └─ 当金: ~1050 (realValue 1500 × 70%)
  └─ hope: 30→20, job_chance: ~-35→0 (capped), stage: 2→3
  └─ 邮件: mail_emma_03_shark, mail_emma_stage3_nervous (Day 37)

Day 35+: Stage 3 - 面试必败循环
  └─ job_chance = 0, 每天 CHANCE 失败
  └─ 每次失败: hope -15, interview_failures +1

Day 36: 第一次失败
  └─ hope: 20→5 (触发 hope<10!)
  └─ 触发: mail_emma_boyfriend_left, stage: 3→4

Day 37: emma_04_watch_final 触发
  └─ [shark] → stage: 4→99, hope: →0
  └─ 邮件: mail_emma_03b_shark
  └─ 结局: 离开城市
```

**评估：** ✅ 路径完整，因果清晰

**注意：** 在 Day 36，应该先收到 `mail_emma_coming_for_ring` (hope≤15 触发)，但 hope 从 20 跌到 5 时可能同时触发两封邮件。

---

### 路径 3: Day 1 拒绝 → 后续发展

```
Day 1: emma_01_clothes [reject]
  └─ hope: 50→40, stage: 0→1
  └─ 艾玛带着衣服离开
  └─ 邮件: mail_emma_01_rejected
  └─ funds: 500 (未交易)

Day 1-3: 等待 funds ≤ 400
  └─ funds: 500 - 2*50 = 400 → 触发！

Day 3: emma_02_skincare 触发
  └─ 艾玛带着面霜来（职业套装她自己留着）
  └─ 对话: greeting 根据 hope<50 选择低落版本
```

**评估：** ✅ 路径可行

**特点：** 拒绝路径的核心物品（职业套装）不在玩家库存中，无法在到期日做选择。但故事仍可继续。

---

### 路径 4: 到期日卖出职业套装 → 坏结局

```
Day 1: emma_01_clothes [standard, 80% × 10%]
  └─ 当金: ~960, 7天到期
  └─ hope: 50→60, job_chance: 0→20

Day 8: 职业套装到期 (EXPIRY_CHECK)
  └─ 艾玛未来赎回 (noShow)
  └─ 玩家选择: [noshow_sell] 挂牌出售
  └─ expiryFlows.noShow.sell: hope -40 (60→20)
  └─ 物品状态: FORFEIT → SOLD

[后续触发 emma_02, emma_03...]

[最终 CHANCE 成功，进入 Stage 5]

Day N: emma_05_redemption 触发
  └─ 检查物品: emma_item_clothes.status == SOLD
  └─ dynamicFlows: core_lost
  └─ 对话: "衣服... 卖了？那我明天穿什么去入职？！"
  └─ 邮件: mail_emma_hate
  └─ 声誉: -30
  └─ 结局: 仇恨结局
```

**评估：** ✅ 路径完整，因果可追溯

---

### 路径 5: 借用电脑事件

```
Day N: emma_03_laptop [charity]
  └─ stage: 2→3, days_since_interview: 0

Day N+1: Stage 3 每日模拟
  └─ days_since_interview: 0→1
  └─ CHANCE 检查 (可能成功/失败)

Day N+2: days_since_interview: 1→2
Day N+3: days_since_interview: 2→3 → 触发 emma_03b_laptop_request!

Day N+3: emma_03b_laptop_request
  └─ 艾玛请求借用电脑
  └─ [deal_charity] → hope +15, job_chance +5
  └─ 邮件: mail_emma_laptop_borrow_thanks

[继续 Stage 3 等待...]
```

**评估：** ⚠️ 如果在 Day N+1/N+2 CHANCE 成功（进入 Stage 5），借用事件永远不会触发。

---

## 覆盖率统计

### 邮件模板覆盖率

| 邮件ID | 触发路径 | 状态 |
|--------|----------|------|
| mail_emma_success | Stage 5 + all_safe/core_safe | ✅ |
| mail_emma_hate | Stage 5 + core_lost | ✅ |
| mail_emma_boyfriend_left | hope < 10 | ✅ |
| mail_emma_plea | emma_05 failureMailId | ✅ |
| mail_emma_01_charity | emma_01 charity/aid | ✅ |
| mail_emma_01_shark | emma_01 shark | ✅ |
| mail_emma_01_rejected | emma_01 reject | ✅ (新增) |
| mail_emma_02_charity | emma_02 charity/aid/standard | ✅ |
| mail_emma_02_shark | emma_02 shark | ✅ |
| mail_emma_03_charity | emma_03 charity/aid/standard | ✅ |
| mail_emma_03_shark | emma_03 shark | ✅ |
| mail_emma_03b_charity | emma_04 charity/aid | ✅ |
| mail_emma_03b_shark | emma_04 standard/shark | ✅ |
| mail_emma_redeem_failed | emma_05 onFailure | ✅ |
| mail_emma_coming_for_ring | hope ≤ 15 | ✅ |
| mail_emma_got_job | CHANCE 成功 | ✅ |
| mail_emma_interview_failed_once | failures == 1 | ✅ |
| mail_emma_interview_failed_twice | failures == 2 | ✅ |
| mail_emma_interview_failed_3x | failures >= 3 | ✅ |
| mail_emma_stage1_hopeful | emma_01 charity/aid | ✅ |
| mail_emma_stage1_anxious | emma_01 standard/shark | ✅ |
| mail_emma_stage2_struggling | emma_02 所有deal路径 | ✅ |
| mail_emma_stage3_desperate | emma_03 所有deal路径 | ✅ |
| mail_emma_stage3_waiting | emma_03 charity/aid/standard | ✅ |
| mail_emma_stage3_nervous | emma_03 shark | ✅ |
| mail_emma_expiry_plea | expiryFlows.noShow.keep | ✅ |
| mail_emma_renewal_thanks | expiryFlows.renewal.accept | ✅ |
| mail_emma_renewal_rejected | expiryFlows.renewal.refuse | ✅ |
| mail_emma_laptop_rejected | emma_03 reject | ✅ (新增) |
| mail_emma_laptop_sold | emma_03 expiryFlows.noShow.sell | ✅ (新增) |
| mail_emma_laptop_plea | emma_03 expiryFlows.noShow.keep | ✅ (新增) |
| mail_emma_laptop_renewal_thanks | emma_03 expiryFlows.renewal.accept | ✅ (新增) |
| mail_emma_laptop_renewal_refused | emma_03 expiryFlows.renewal.refuse | ✅ (新增) |
| mail_emma_laptop_borrow_thanks | emma_03b charity/aid | ✅ (新增) |
| mail_emma_laptop_borrow_refused | emma_03b reject | ✅ (新增) |

**覆盖率：** 35/35 = **100%**

---

### dynamicFlows 覆盖率

| Flow | itemCondition | 触发条件 | 状态 |
|------|---------------|----------|------|
| all_safe | targetStatus: SAFE, otherItemsStatus: ALL_SAFE | 所有物品都在 | ✅ |
| core_safe | targetStatus: SAFE, otherItemsStatus: ANY_LOST | 职业套装在，其他卖了 | ✅ |
| core_lost | targetStatus: SOLD | 职业套装被卖 | ✅ |

**覆盖率：** 3/3 = **100%**

---

### expiryFlows 覆盖率

| 事件 | redemption | renewal | noShow | 状态 |
|------|------------|---------|--------|------|
| emma_01_clothes | ✅ accept/chargeExtra/refuse | ✅ accept/refuse | ✅ sell/keep | 完整 |
| emma_02_skincare | ✅ accept/chargeExtra/refuse | ✅ accept/refuse | ✅ sell/keep | 完整但缺邮件 |
| emma_03_laptop | ✅ accept/chargeExtra/refuse | ✅ accept/refuse | ✅ sell/keep | 完整 |

**覆盖率：** 3/3 结构完整，2/3 有专门邮件

---

### fateHints 覆盖率

| 条件 | priority | 对应路径 | 状态 |
|------|----------|----------|------|
| hope >= 80 | 10 | 全 charity + job 成功 | ✅ |
| hope <= 20 | 10 | 全 shark 后期 | ✅ |
| hope >= 40 | 6 | 中性路径 | ✅ |
| hope <= 40 | 8 | shark 中期 | ✅ |
| hope <= 30 | 9 | 接近崩溃 | ✅ |
| funds >= 3000 | 5 | job 成功后 | ✅ |
| funds <= 100 | 5 | 触发事件3前 | ✅ |
| job_chance >= 50 | 8 | charity 累积 | ✅ |
| interview_failures >= 2 | 7 | 面试失败累积 | ✅ |

**覆盖率：** 9/9 = **100%**

---

## 与 v2 报告的对比

### 已修复的问题

| 问题 | v2 状态 | v3 状态 |
|------|---------|---------|
| emma_02 触发条件 ≤200 太低 | 🔴 Critical | ✅ 改为 ≤400 |
| emma_01 onReject 缺少邮件 | 🟡 Warning | ✅ 已添加 mail_emma_01_rejected |
| emma_03 缺少 expiryFlows | 🔴 Critical | ✅ 已添加完整 expiryFlows |
| emma_03 onReject 缺少邮件 | 🟡 Warning | ✅ 已添加 mail_emma_laptop_rejected |
| dynamicFlows 判断逻辑缺失 | 🟡 Warning | ✅ 已实现 itemCondition |
| mail_emma_redeem_failed 未使用 | 🔵 Info | ✅ 已在 onFailure 中引用 |

### 新增问题

| 问题 | 状态 | 描述 |
|------|------|------|
| emma_03b 可能不触发 | 🔴 Critical | days_since_interview 需要 3 天，但 Stage 3 可能快速转换 |
| emma_02 expiryFlows 缺邮件 | 🟡 Warning | 面霜被卖没有专门反馈 |
| emma_02 onReject 无邮件 | 🟡 Warning | 拒绝面霜没有反馈 |
| emma_04 onReject 无邮件 | 🟡 Warning | 拒绝手表没有反馈 |

---

## 修复建议优先级

| 优先级 | 问题 | 建议 |
|--------|------|------|
| P0 | emma_03b 触发门槛过高 | 改为 days_since_interview >= 1 |
| P1 | emma_02 expiryFlows.noShow.sell 无邮件 | 添加 mail_emma_skincare_sold |
| P1 | emma_02/04 onReject 无邮件 | 添加相应拒绝邮件 |
| P2 | 事件触发等待时间长 | 考虑添加时间备用触发 |
| P2 | 邮件重叠风险 | 添加互斥条件或调整阈值 |

---

## 总结

Emma 事件链相比 v2 报告时已有显著改善：

**改善点：**
1. 触发条件从 funds≤200 放宽到 funds≤400
2. emma_01 和 emma_03 的 onReject 都有了邮件反馈
3. emma_03_laptop 有了完整的 expiryFlows（包括笔记本被卖的严重后果）
4. 新增了 Stage 3 的互动事件（借用电脑）
5. dynamicFlows 使用了显式的 itemCondition

**仍需关注：**
1. 借用电脑事件的触发窗口太窄
2. emma_02 的到期处理缺少邮件反馈
3. 部分 onReject 路径仍无邮件

**建议下一步：**
使用 `/story-causality emma` 深入分析因果感知问题，特别是：
- 玩家是否能理解自己的选择如何导致艾玛崩溃
- Stage 4 回退到 Stage 3 的叙事逻辑是否清晰
