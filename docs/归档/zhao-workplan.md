# 周守义故事线：玩家感知改进工作方案

> 基于：zhao-improvement.md v2
> 创建时间：2026-01-26
> 目标：让玩家能感知到每个决策对周老的影响，消除"突然住院"的感知断裂

---

## 工作概览

| 阶段 | 任务数 | 核心目标 | 预计新增内容 |
|------|--------|----------|--------------|
| Phase 1 | 4 | 交易即时反馈 | 4封邮件 + outcomes修改 |
| Phase 2 | 3 | stress 可见化 | 2封邮件 + simulationRules修改 |
| Phase 3 | 2 | 住院期间补全 | 1封邮件 + outcomes修改 |
| Phase 4 | 2 | 好结局铺垫 | 1封邮件 + dynamicFlows修改 |
| Phase 5 | 2 | 婚礼倒计时 | 修改2封现有邮件 |
| Phase 6 | 2 | 对话动态化 | 修改dialogue条件 |

---

## Phase 1: 交易即时反馈 [高优先级]

**目标**：玩家完成交易后，立即通过邮件感知到周老的真实感受

### 任务 1.1: 创建交易反馈邮件模板

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
// ========== 周守义交易反馈邮件 ==========

"mail_zhao_01_charity": {
  id: "mail_zhao_01_charity",
  sender: "周守义",
  subject: "谢谢你，老板",
  body: `老板，\n\n今天多谢你帮忙。这个价格比我预想的好。\n\n孙子的婚礼是27号，我得抓紧时间把红包凑齐。等退休金一到账，我第一时间来赎。\n\n你是个公道人。\n\n老周`,
  attachments: { cash: 0 }
},

"mail_zhao_01_shark": {
  id: "mail_zhao_01_shark",
  sender: "周守义",
  subject: "（无主题）",
  body: `老板，\n\n钱是少了点，但有总比没有好。\n\n我得去医院看看腿了。这老毛病，一受气就犯。\n\n老周`,
  attachments: { cash: 0 }
},

"mail_zhao_03_charity": {
  id: "mail_zhao_03_charity",
  sender: "周守义",
  subject: "住院押金交了",
  body: `老板，\n\n多亏你今天帮我一把，住院押金总算交上了。医生说要观察几天。\n\n证书放你那，我放心。千万别跟勋章拆散了。\n\n老周`,
  attachments: { cash: 0 }
},

"mail_zhao_03_shark": {
  id: "mail_zhao_03_shark",
  sender: "周守义",
  subject: "...",
  body: `老板，\n\n这点钱... 也就够交一半押金。剩下的我再想办法吧。\n\n腿疼得厉害，心里也堵得慌。\n\n老周`,
  attachments: { cash: 0 }
},
```

---

### 任务 1.2: 修改 zhao_01_medal 的 outcomes

**文件**：`systems/narrative/stories/zhao.ts`

**当前代码** (约第83-88行)：
```typescript
outcomes: {
  "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "trust", value: 10 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }],
  "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "trust", value: 5 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }],
  "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }],
  "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "stress", value: 10 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }]
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "trust", value: 10 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_01_charity", delayDays: 0 }  // 新增
  ],
  "deal_aid": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "trust", value: 5 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_01_charity", delayDays: 0 }  // 新增
  ],
  "deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }
    // standard 不发邮件，保持中性
  ],
  "deal_shark": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "stress", value: 10 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_01_shark", delayDays: 0 }  // 新增
  ]
}
```

---

### 任务 1.3: 修改 zhao_03_cert 的 outcomes

**文件**：`systems/narrative/stories/zhao.ts`

**当前代码** (约第177-182行)：
```typescript
outcomes: {
  "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "trust", value: 5 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 }],
  // ...
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "MODIFY_VAR", variable: "trust", value: 5 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_03_charity", delayDays: 0 }  // 新增
  ],
  "deal_aid": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "MODIFY_VAR", variable: "trust", value: 3 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_03_charity", delayDays: 0 }  // 新增
  ],
  "deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 }
  ],
  "deal_shark": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 },
    { type: "MODIFY_VAR", variable: "stress", value: 20 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_03_shark", delayDays: 0 }  // 新增
  ]
}
```

---

### 任务 1.4: 验证邮件触发

**验证步骤**：
1. 运行游戏，zhao_01 选择 charity → 检查是否收到"谢谢你"邮件
2. 运行游戏，zhao_01 选择 shark → 检查是否收到"腿一受气就犯"邮件
3. 同样验证 zhao_03 的邮件触发

---

## Phase 2: stress 可见化 [高优先级]

**目标**：让玩家能通过邮件感知到周老的压力在累积，不会被住院事件"突然"击中

### 任务 2.1: 创建 stress 预警邮件模板

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
"mail_zhao_stress_warning": {
  id: "mail_zhao_stress_warning",
  sender: "孙子 小周",
  subject: "关于我爷爷",
  body: `当铺老板：\n\n我是周守义的孙子。最近爷爷的状态不太好，血压一直高。\n\n他不愿意告诉我发生了什么，但我看到他整夜整夜睡不着，嘴里念叨着什么勋章的事。\n\n如果你知道什么，请告诉我。谢谢。\n\n小周`,
  attachments: { cash: 0 }
},

"mail_zhao_health_warning": {
  id: "mail_zhao_health_warning",
  sender: "社区医院",
  subject: "患者周守义的健康提醒",
  body: `致相关人士：\n\n患者周守义近日血压持续偏高，情绪波动较大。\n\n医生建议患者减少压力，避免剧烈情绪起伏。如有相关事宜，请尽量给予老人关照。\n\n此致`,
  attachments: { cash: 0 }
},
```

---

### 任务 2.2: 修改 simulationRules 添加分阶段预警

**文件**：`systems/narrative/stories/zhao.ts`

**在 simulationRules 数组中新增**（约第17-35行之间）：

```typescript
// 阶段1: stress >= 15 时，孙子发来担忧邮件
{
  type: 'THRESHOLD',
  targetVar: 'stress',
  operator: '>=',
  value: 15,
  onTrigger: [
    { type: 'SCHEDULE_MAIL', templateId: 'mail_zhao_stress_warning', delayDays: 0 }
  ],
  triggerLog: "周老压力初显，孙子发来担忧"
},

// 阶段2: stress >= 25 时，医院发来健康警告
{
  type: 'THRESHOLD',
  targetVar: 'stress',
  operator: '>=',
  value: 25,
  onTrigger: [
    { type: 'SCHEDULE_MAIL', templateId: 'mail_zhao_health_warning', delayDays: 0 }
  ],
  triggerLog: "周老健康状况恶化，医院发来警告"
},
```

---

### 任务 2.3: 修改住院触发阈值

**文件**：`systems/narrative/stories/zhao.ts`

**当前代码** (约第24-34行)：
```typescript
{
  type: 'THRESHOLD',
  targetVar: 'stress',
  operator: '>=',
  value: 30,  // 原阈值
  onTrigger: [
    { type: 'SET_STAGE', value: 99 },
    { type: 'SCHEDULE_MAIL', templateId: 'mail_zhao_hospital', delayDays: 0 }
  ],
  triggerLog: "周老因压力过大被送往医院"
}
```

**修改为**：
```typescript
{
  type: 'THRESHOLD',
  targetVar: 'stress',
  operator: '>=',
  value: 35,  // 提高阈值，给玩家挽救空间
  onTrigger: [
    { type: 'SET_STAGE', value: 99 },
    { type: 'SCHEDULE_MAIL', templateId: 'mail_zhao_hospital', delayDays: 0 }
  ],
  triggerLog: "周老因压力过大被送往医院"
}
```

**设计意图**：
- stress 15 → 孙子担忧邮件（预警1）
- stress 25 → 医院健康警告（预警2）
- stress 35 → 住院（原30，现在需要3次 shark 才会触发）

---

## Phase 3: 住院期间补全 [高优先级]

**目标**：解释为什么周老第二次来时"更憔悴"

### 任务 3.1: 创建住院更新邮件

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
"mail_zhao_hospital_update": {
  id: "mail_zhao_hospital_update",
  sender: "孙子 小周",
  subject: "爷爷的情况",
  body: `当铺老板：\n\n爷爷的腿犯了老毛病，这两天一直在医院。医生说是老伤复发，加上最近压力大。\n\n他一直念叨着什么勋章的事，说那是老战友的命。我不太懂你们之间的事，但爷爷说你是个好人。\n\n等爷爷好点了，他会去你那取东西的。拜托照顾好那些东西。\n\n小周`,
  attachments: { cash: 0 }
},
```

---

### 任务 3.2: 在 shark 路径添加延迟邮件

**文件**：`systems/narrative/stories/zhao.ts`

**修改 zhao_01_medal 的 deal_shark**：

```typescript
"deal_shark": [
  { type: "ADD_FUNDS_DEAL" },
  { type: "SET_STAGE", value: 1 },
  { type: "MODIFY_VAR", variable: "stress", value: 10 },
  { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 },
  { type: "SCHEDULE_MAIL", templateId: "mail_zhao_01_shark", delayDays: 0 },
  { type: "SCHEDULE_MAIL", templateId: "mail_zhao_hospital_update", delayDays: 4 }  // 新增：Day 5 左右
]
```

**设计意图**：如果玩家在 zhao_01 选择了 shark，会在 Day 5 收到孙子的邮件，解释爷爷住院了。这样当 Day 6 周老再次出现时"更憔悴"就有了解释。

---

## Phase 4: 好结局铺垫 [中优先级]

**目标**：勋章赎回成功后，让玩家持续感知到周老的好转

### 任务 4.1: 创建赎回成功邮件

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
"mail_zhao_redeem_success": {
  id: "mail_zhao_redeem_success",
  sender: "周守义",
  subject: "老伙计回家了",
  body: `老板，\n\n勋章拿回来了，放在枕头底下，心里踏实多了。\n\n孙子的婚礼定在27号。我想穿着军装、戴着这枚勋章去证婚。这是我这辈子最体面的事。\n\n等证书也赎回来，我请你喝喜酒。\n\n老周`,
  attachments: { cash: 0 }
},
```

---

### 任务 4.2: 在赎回成功分支添加邮件触发

**文件**：`systems/narrative/stories/zhao.ts`

**修改 zhao_04_redeem_medal 的 dynamicFlows** (约第222-239行)：

```typescript
dynamicFlows: {
  "core_lost": {
    dialogue: "你说什么？勋章卖了？... 那是我的命啊！你... 你这个骗子！赔钱有什么用？！",
    outcome: [{ type: "SET_STAGE", value: 4 }, { type: "MODIFY_REP", value: -30 }]
  },
  "all_safe": {
    dialogue: "老板，钱凑齐了。连本带利，我想把勋章赎回去。只有放在自己枕头底下，心里才踏实。",
    outcome: [
      { type: "REDEEM_TARGET_ONLY" },
      { type: "SET_STAGE", value: 4 },
      { type: "SCHEDULE_MAIL", templateId: "mail_zhao_redeem_success", delayDays: 0 }  // 新增
    ]
  },
  "core_safe": {
    dialogue: "老板，钱凑齐了。连本带利，我想把勋章赎回去。只有放在自己枕头底下，心里才踏实。",
    outcome: [
      { type: "REDEEM_TARGET_ONLY" },
      { type: "SET_STAGE", value: 4 },
      { type: "SCHEDULE_MAIL", templateId: "mail_zhao_redeem_success", delayDays: 0 }  // 新增
    ]
  },
  "hostile_takeover": {
    dialogue: "强买强卖？好... 好... 你们这些吸血鬼。",
    outcome: [{ type: "SET_STAGE", value: 4 }, { type: "MODIFY_REP", value: -50 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_hostile", delayDays: 1 }]
  }
}
```

---

## Phase 5: 婚礼倒计时 [中优先级]

**目标**：让玩家感受到时间紧迫感

### 任务 5.1: 修改 mail_zhao_rumor

**文件**：`systems/narrative/mailRegistry.ts`

**当前代码**：
```typescript
"mail_zhao_rumor": {
  id: "mail_zhao_rumor",
  sender: "同行老李",
  subject: "有人在打听老物件",
  body: `老弟：\n\n最近有个穿西装的在咱们这片转悠，专门打听老军功章的事。听说他背后是个大买家，出手很阔绰。\n\n你店里如果有这类东西，可得留个心眼。这种人看着体面，背后的道道多着呢。\n\n提醒你一句，别让人给套路了。\n\n老李`,
  attachments: { cash: 0 }
},
```

**修改为**：
```typescript
"mail_zhao_rumor": {
  id: "mail_zhao_rumor",
  sender: "同行老李",
  subject: "有人在打听老物件",
  body: `老弟：\n\n最近有个穿西装的在咱们这片转悠，专门打听老军功章的事。听说他背后是个大买家，出手很阔绰。\n\n你店里如果有这类东西，可得留个心眼。这种人看着体面，背后的道道多着呢。\n\n对了，听说那老兵的孙子婚礼是27号。你可得把东西保管好了。\n\n老李`,
  attachments: { cash: 0 }
},
```

---

### 任务 5.2: 修改 mail_zhao_offer

**文件**：`systems/narrative/mailRegistry.ts`

**当前代码**：
```typescript
"mail_zhao_offer": {
  id: "mail_zhao_offer",
  sender: "匿名收藏顾问",
  subject: "关于那套勋章的报价",
  body: `老板，\n\n我看到你店里收了一张立功证书。如果我没猜错，那枚编号029的勋章也在你手里吧？\n\n单卖勋章不值钱，但如果证书和勋章能凑成一套，那就是另一回事了。\n\n我代表一位海外买家出价：$38,000 收购整套（勋章+证书+合影）。\n\n我会在 Day 8 下午再次登门。希望到时候东西还在你店里（或者在你手里，我不介意你是怎么弄到它们的）。`,
  attachments: { cash: 0 }
},
```

**修改为**：
```typescript
"mail_zhao_offer": {
  id: "mail_zhao_offer",
  sender: "匿名收藏顾问",
  subject: "关于那套勋章的报价",
  body: `老板，\n\n我看到你店里收了一张立功证书。如果我没猜错，那枚编号029的勋章也在你手里吧？\n\n单卖勋章不值钱，但如果证书和勋章能凑成一套，那就是另一回事了。\n\n我代表一位海外买家出价：$38,000 收购整套（勋章+证书+合影）。\n\n我会在 Day 10 左右再次登门。届时离婚礼（27号）只剩一周多，那老头应该急着要东西。\n\n希望到时候东西还在你店里。`,
  attachments: { cash: 0 }
},
```

---

## Phase 6: 对话动态化 [中优先级]

**目标**：让玩家通过对话感知 stress 变量的影响

### 任务 6.1: 修改 zhao_03_cert 的 greeting

**文件**：`systems/narrative/stories/zhao.ts`

**当前代码** (约第155-158行)：
```typescript
greeting: [
  { condition: { variable: "funds", operator: "<", value: 0 }, text: "老板... 我又来了。这次是真的没办法了。" },
  { text: "老板... 我又来了。" }
],
```

**修改为**：
```typescript
greeting: [
  { condition: { variable: "stress", operator: ">=", value: 20 },
    text: "老板... [老人的手在发抖，脸色发白] 我... 我又来了..." },
  { condition: { variable: "stress", operator: ">=", value: 10 },
    text: "老板... [老人脸色不太好] 我又来了。" },
  { condition: { variable: "funds", operator: "<", value: 0 },
    text: "老板... 我又来了。这次是真的没办法了。" },
  { text: "老板... 我又来了。" }
],
```

---

### 任务 6.2: 验证对话条件触发

**验证步骤**：
1. zhao_01 选择 shark (stress=10) → zhao_03 应该显示"脸色不太好"
2. zhao_01 shark + zhao_03 shark (stress=30) → zhao_03 应该显示"手在发抖"（如果还没触发住院）

---

## 执行顺序

```
Phase 1 (高) ─────► Phase 2 (高) ─────► Phase 3 (高) ─────► Phase 4 (中) ─────► Phase 5 (中) ─────► Phase 6 (中)
    │                   │                   │                   │                   │                   │
    ▼                   ▼                   ▼                   ▼                   ▼                   ▼
4封交易邮件          2封预警邮件         1封住院更新         1封赎回成功         修改2封邮件         对话条件
+ outcomes          + simulationRules   + outcomes          + dynamicFlows      (婚礼日期)          (stress影响)
```

---

## 文件修改汇总

| 文件 | Phase | 修改类型 | 内容 |
|------|-------|----------|------|
| `mailRegistry.ts` | 1 | 新增 | 4封交易反馈邮件 |
| `mailRegistry.ts` | 2 | 新增 | 2封stress预警邮件 |
| `mailRegistry.ts` | 3 | 新增 | 1封住院更新邮件 |
| `mailRegistry.ts` | 4 | 新增 | 1封赎回成功邮件 |
| `mailRegistry.ts` | 5 | 修改 | 2封现有邮件添加婚礼日期 |
| `zhao.ts` | 1 | 修改 | zhao_01, zhao_03 的 outcomes |
| `zhao.ts` | 2 | 修改 | simulationRules 添加2个THRESHOLD |
| `zhao.ts` | 2 | 修改 | 住院THRESHOLD阈值 30→35 |
| `zhao.ts` | 3 | 修改 | zhao_01 shark 添加延迟邮件 |
| `zhao.ts` | 4 | 修改 | zhao_04 dynamicFlows 添加邮件 |
| `zhao.ts` | 6 | 修改 | zhao_03 greeting 添加 stress 条件 |

---

## 新增邮件完整列表

| ID | 发送者 | 主题 | 触发时机 |
|----|--------|------|----------|
| `mail_zhao_01_charity` | 周守义 | 谢谢你，老板 | zhao_01 charity/aid |
| `mail_zhao_01_shark` | 周守义 | （无主题） | zhao_01 shark |
| `mail_zhao_03_charity` | 周守义 | 住院押金交了 | zhao_03 charity/aid |
| `mail_zhao_03_shark` | 周守义 | ... | zhao_03 shark |
| `mail_zhao_stress_warning` | 孙子 小周 | 关于我爷爷 | stress >= 15 |
| `mail_zhao_health_warning` | 社区医院 | 健康提醒 | stress >= 25 |
| `mail_zhao_hospital_update` | 孙子 小周 | 爷爷的情况 | zhao_01 shark 后4天 |
| `mail_zhao_redeem_success` | 周守义 | 老伙计回家了 | 勋章赎回成功 |

**总计**：8封新邮件

---

## 验证清单

### Phase 1 验证
- [ ] zhao_01 charity → 收到"谢谢你"邮件
- [ ] zhao_01 shark → 收到"腿一受气就犯"邮件
- [ ] zhao_03 charity → 收到"押金交了"邮件
- [ ] zhao_03 shark → 收到"这点钱"邮件

### Phase 2 验证
- [ ] stress = 15 → 收到孙子担忧邮件
- [ ] stress = 25 → 收到健康警告邮件
- [ ] stress = 34 → 不触发住院
- [ ] stress = 35 → 触发住院

### Phase 3 验证
- [ ] zhao_01 shark → Day 5 收到住院更新邮件
- [ ] zhao_03 出现时，玩家已知道周老住院过

### Phase 4 验证
- [ ] 勋章赎回成功 → 收到"老伙计回家了"邮件
- [ ] 邮件中提到婚礼日期 27号

### Phase 5 验证
- [ ] mail_zhao_rumor 中有婚礼日期
- [ ] mail_zhao_offer 中有倒计时暗示

### Phase 6 验证
- [ ] stress >= 10 → zhao_03 greeting 显示"脸色不太好"
- [ ] stress >= 20 → zhao_03 greeting 显示"手在发抖"
