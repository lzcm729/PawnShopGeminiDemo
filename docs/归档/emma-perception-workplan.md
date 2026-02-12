# 艾玛故事线：玩家感知改进工作方案

> 基于：emma-player-perception.md
> 创建时间：2026-01-26
> 目标：让玩家能感知到艾玛的每一次出现和消失都有充足的理由

---

## 工作概览

| 阶段 | 任务数 | 核心目标 | 预计新增文件/代码 |
|------|--------|----------|-------------------|
| Phase 1 | 4 | 交易即时反馈 | 8封邮件 + outcomes修改 |
| Phase 2 | 3 | 赎回流程补全 | 2封邮件 + onFailure修改 |
| Phase 3 | 4 | 面试进展可见 | 3封邮件 + CHANCE规则修改 |
| Phase 4 | 3 | 阶段状态更新 | 4封邮件 + 引擎扩展 |
| Phase 5 | 2 | 崩溃过渡事件 | 1个新事件 |

---

## Phase 1: 交易即时反馈 [高优先级]

**目标**：玩家完成交易后，立即通过邮件感知到自己决策的影响

### 任务 1.1: 创建交易反馈邮件模板

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
// ========== 艾玛交易反馈邮件 ==========

"mail_emma_01_charity": {
  id: "mail_emma_01_charity",
  sender: "艾玛",
  subject: "谢谢你",
  body: `老板，\n\n真的很感谢你。这个价格比我预期的高很多。\n\n有你这样的人在，也许这个世界还没那么糟。等我找到工作，第一个来赎！\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_01_shark": {
  id: "mail_emma_01_shark",
  sender: "艾玛",
  subject: "（无主题）",
  body: `好吧。有总比没有好。\n\n希望面试顺利，不然下次见面可能更惨。`,
  attachments: { cash: 0 }
},

"mail_emma_02_charity": {
  id: "mail_emma_02_charity",
  sender: "艾玛",
  subject: "撑过这周",
  body: `老板，\n\n谢谢你又帮了我一把。这周的房租有着落了。\n\n面试还在继续，我不会放弃的。\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_02_shark": {
  id: "mail_emma_02_shark",
  sender: "艾玛",
  subject: "...",
  body: `这点钱... 也就够买几天泡面。\n\n算了，有总比没有强。`,
  attachments: { cash: 0 }
},

"mail_emma_03_charity": {
  id: "mail_emma_03_charity",
  sender: "艾玛",
  subject: "电脑的事",
  body: `老板，\n\n谢谢你给了一个公道的价格。我知道这台电脑对我意味着什么，你也知道。\n\n我会回来赎它的。一定。\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_03_shark": {
  id: "mail_emma_03_shark",
  sender: "艾玛",
  subject: "再见，老伙计",
  body: `这个价格... 算了，我没得选。\n\n希望你对它好一点。里面有我五年的心血。`,
  attachments: { cash: 0 }
},

"mail_emma_03b_charity": {
  id: "mail_emma_03b_charity",
  sender: "艾玛",
  subject: "最后的挣扎",
  body: `老板，\n\n谢谢你还愿意收这块表。也许... 还有希望。\n\n我再试试。`,
  attachments: { cash: 0 }
},

"mail_emma_03b_shark": {
  id: "mail_emma_03b_shark",
  sender: "艾玛",
  subject: "（无主题）",
  body: `连这个价都压... 算了。\n\n我已经不在乎了。`,
  attachments: { cash: 0 }
},
```

**验证**：在 `MAIL_TEMPLATES` 对象中能找到这 8 封邮件

---

### 任务 1.2: 修改 emma_01_clothes 的 outcomes

**文件**：`systems/narrative/stories/emma.ts`

**当前代码** (约第121-126行)：
```typescript
outcomes: {
  "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 70 }, { type: "MODIFY_VAR", variable: "job_chance", value: 30 }],
  "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 65 }, { type: "MODIFY_VAR", variable: "job_chance", value: 25 }],
  "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 60 }, { type: "MODIFY_VAR", variable: "job_chance", value: 20 }],
  "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 40 }, { type: "MODIFY_VAR", variable: "job_chance", value: 10 }]
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity":  [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "hope", value: 70 },
    { type: "MODIFY_VAR", variable: "job_chance", value: 30 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_charity", delayDays: 0 }
  ],
  "deal_aid":      [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "hope", value: 65 },
    { type: "MODIFY_VAR", variable: "job_chance", value: 25 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_charity", delayDays: 0 }
  ],
  "deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "hope", value: 60 },
    { type: "MODIFY_VAR", variable: "job_chance", value: 20 }
    // standard 不发邮件，保持中性
  ],
  "deal_shark":    [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "hope", value: 40 },
    { type: "MODIFY_VAR", variable: "job_chance", value: 10 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_shark", delayDays: 0 }
  ]
}
```

---

### 任务 1.3: 修改 emma_02_skincare 的 outcomes

**文件**：`systems/narrative/stories/emma.ts`

**当前代码** (约第177-182行)：
```typescript
outcomes: {
  "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", delta: 10 }, { type: "MODIFY_VAR", variable: "job_chance", delta: 10 }],
  // ...
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity":  [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "MODIFY_VAR", variable: "hope", delta: 10 },
    { type: "MODIFY_VAR", variable: "job_chance", delta: 10 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 }
  ],
  "deal_aid":      [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "MODIFY_VAR", variable: "hope", delta: 0 },
    { type: "MODIFY_VAR", variable: "job_chance", delta: 5 }
  ],
  "deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "MODIFY_VAR", variable: "hope", delta: -5 },
    { type: "MODIFY_VAR", variable: "job_chance", delta: 0 }
  ],
  "deal_shark":    [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "MODIFY_VAR", variable: "hope", delta: -15 },
    { type: "MODIFY_VAR", variable: "job_chance", delta: -5 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_shark", delayDays: 0 }
  ]
}
```

---

### 任务 1.4: 修改 emma_03_laptop 和 emma_03b_struggle 的 outcomes

**同样的模式**，为 charity 和 shark 添加邮件触发：

**emma_03_laptop** (约第229-253行)：
- `deal_charity` 添加 `{ type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 }`
- `deal_shark` 添加 `{ type: "SCHEDULE_MAIL", templateId: "mail_emma_03_shark", delayDays: 0 }`

**emma_03b_struggle** (约第376-380行)：
- `deal_charity` 添加 `{ type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }`
- `deal_shark` 添加 `{ type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }`

---

## Phase 2: 赎回流程补全 [高优先级]

**目标**：让玩家理解为什么艾玛赎回失败后会来当手表

### 任务 2.1: 创建赎回相关邮件模板

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
"mail_emma_redeem_failed": {
  id: "mail_emma_redeem_failed",
  sender: "艾玛",
  subject: "电脑的事...",
  body: `老板，\n\n我凑不够赎金。\n\n说好的 Offer 黄了，HR 说预算调整，岗位取消了。男朋友也开始抱怨我拖累他。\n\n但我不想就这样放弃。明天我会再来，看看还有什么能换点钱的。\n\n别放弃我。\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_coming_for_ring": {
  id: "mail_emma_coming_for_ring",
  sender: "艾玛",
  subject: "他走了",
  body: `老板，\n\n他走了。今天早上醒来，他的东西都不见了。\n\n我手上还有一枚戒指。明天我会来的。\n\n也许这是最后一次了。`,
  attachments: { cash: 0 }
},
```

---

### 任务 2.2: 修改 emma_redeem_attempt 的 onFailure

**文件**：`systems/narrative/stories/emma.ts`

**当前代码** (约第269-272行)：
```typescript
onFailure: [
    { type: "MODIFY_VAR", variable: "hope", value: -20 },
    { type: "MODIFY_VAR", variable: "redeem_attempted", value: 1 }
]
```

**修改为**：
```typescript
onFailure: [
    { type: "MODIFY_VAR", variable: "hope", delta: -20 },
    { type: "MODIFY_VAR", variable: "redeem_attempted", value: 1 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_redeem_failed", delayDays: 0 }
]
```

---

### 任务 2.3: 为 emma_04_ring 添加预告邮件

**目标**：在婚戒事件触发前，让玩家知道艾玛要来了

**方案**：修改 THRESHOLD 规则，在男友离开时就发送预告

**当前代码** (约第44-52行)：
```typescript
{
    type: 'THRESHOLD',
    targetVar: 'hope',
    operator: '<',
    value: 10,
    onTrigger: [
        { type: 'SET_STAGE', value: 4 },
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_boyfriend_left', delayDays: 0 }
    ],
    triggerLog: "彻底崩溃，男友离开了她"
}
```

**保持不变**，因为 `mail_emma_boyfriend_left` 已经起到了预告作用。

但需要**检查**：当 stage 3 → ring 事件（非 THRESHOLD 路径）时是否有预告？

**补充方案**：为 emma_04_ring 添加一个前置邮件触发条件

在 `emma_03b_struggle` 的 outcomes 中，如果 hope 较低，发送预告：

```typescript
// 在 emma_03b_struggle 的 deal_shark outcome 中追加
{ type: "SCHEDULE_MAIL", templateId: "mail_emma_coming_for_ring", delayDays: 1,
  condition: { variable: "hope", operator: "<", value: 20 } }
```

> **注意**：这需要引擎支持 `SCHEDULE_MAIL` 的条件触发。如果不支持，可以通过 simulationRules 实现。

---

## Phase 3: 面试进展可见 [中优先级]

**目标**：让玩家知道艾玛的面试进展

### 任务 3.1: 创建面试进展邮件模板

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
"mail_emma_interview_progress": {
  id: "mail_emma_interview_progress",
  sender: "艾玛",
  subject: "好消息！",
  body: `老板！\n\n我过了一轮面试！HR 说下周会有终面结果。\n\n感觉有戏，我要加油！\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_got_job": {
  id: "mail_emma_got_job",
  sender: "艾玛",
  subject: "我拿到 Offer 了！！！",
  body: `老板！！！\n\n我拿到 Offer 了！！！是那家跨国公司！\n\n等我入职拿了安家费，我马上来赎东西！谢谢你一直没放弃我！\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_interview_failed_3x": {
  id: "mail_emma_interview_failed_3x",
  sender: "艾玛",
  subject: "我是不是真的不行",
  body: `老板，\n\n又被拒了。这已经是第三次了。\n\nHR 说我"气质不够自信"。也许他们说得对。\n\n我开始怀疑自己了。`,
  attachments: { cash: 0 }
},
```

---

### 任务 3.2: 修改 CHANCE 规则添加成功邮件

**文件**：`systems/narrative/stories/emma.ts`

**当前代码** (约第65-74行)：
```typescript
{
    type: 'CHANCE',
    chanceVar: 'job_chance',
    onSuccess: [
        { type: 'MOD_VAR', target: 'funds', value: 3000, op: 'ADD' },
        { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'SET' },
        { type: 'MOD_VAR', target: 'hope', value: 50, op: 'ADD' }
    ],
    onFail: [
        { type: 'MOD_VAR', target: 'hope', value: -8, op: 'ADD' },
        { type: 'MOD_VAR', target: 'job_chance', value: -3, op: 'ADD' }
    ],
    successLog: "收到录用通知书！(OFFER RECEIVED)",
    failLog: "面试再次被拒..."
}
```

**修改为**：
```typescript
{
    type: 'CHANCE',
    chanceVar: 'job_chance',
    onSuccess: [
        { type: 'MOD_VAR', target: 'funds', value: 3000, op: 'ADD' },
        { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'SET' },
        { type: 'MOD_VAR', target: 'hope', value: 50, op: 'ADD' },
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_got_job', delayDays: 0 }
    ],
    onFail: [
        { type: 'MOD_VAR', target: 'hope', value: -8, op: 'ADD' },
        { type: 'MOD_VAR', target: 'job_chance', value: -3, op: 'ADD' }
    ],
    successLog: "收到录用通知书！(OFFER RECEIVED)",
    failLog: "面试再次被拒..."
}
```

---

### 任务 3.3: 添加面试失败累计邮件触发

**目标**：连续失败 3 次后发送沮丧邮件

**方案**：新增变量 `interview_failures` 并添加 THRESHOLD 规则

**步骤 1**：修改变量初始化 (约第10行)

```typescript
variables: {
  funds: 0,
  hope: 50,
  job_chance: 0,
  has_laptop: 0,
  redeem_attempted: 0,
  struggle_occurred: 0,
  breakdown_timer: 0,
  interview_failures: 0  // 新增
}
```

**步骤 2**：修改 CHANCE 规则的 onFail

```typescript
onFail: [
    { type: 'MOD_VAR', target: 'hope', value: -8, op: 'ADD' },
    { type: 'MOD_VAR', target: 'job_chance', value: -3, op: 'ADD' },
    { type: 'MOD_VAR', target: 'interview_failures', value: 1, op: 'ADD' }  // 新增
]
```

**步骤 3**：新增 THRESHOLD 规则

```typescript
{
    type: 'THRESHOLD',
    targetVar: 'interview_failures',
    operator: '>=',
    value: 3,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_3x', delayDays: 0 },
        { type: 'MOD_VAR', target: 'interview_failures', value: 0, op: 'SET' }  // 重置计数
    ],
    triggerLog: "连续面试失败，信心受挫"
}
```

---

### 任务 3.4: (可选) 添加面试阶段性进展邮件

**目标**：当 job_chance 达到较高值时，发送"过了一轮"邮件

**方案**：新增 THRESHOLD 规则

```typescript
{
    type: 'THRESHOLD',
    targetVar: 'job_chance',
    operator: '>=',
    value: 50,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_progress', delayDays: 0 }
    ],
    triggerOnce: true,  // 只触发一次（需要引擎支持）
    triggerLog: "面试进展顺利"
}
```

> **注意**：如果引擎不支持 `triggerOnce`，需要用变量标记实现。

---

## Phase 4: 阶段状态更新 [中优先级]

**目标**：让玩家在艾玛不出现的日子里也能感知她的状态

### 任务 4.1: 创建阶段状态邮件模板

**文件**：`systems/narrative/mailRegistry.ts`

**新增内容**：

```typescript
"mail_emma_stage1_hopeful": {
  id: "mail_emma_stage1_hopeful",
  sender: "艾玛",
  subject: "近况汇报",
  body: `老板，\n\n这几天投了很多简历，有几家已经约了面试。感觉事情在往好的方向发展。\n\n等我有好消息，第一时间告诉你！\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_stage1_anxious": {
  id: "mail_emma_stage1_anxious",
  sender: "艾玛",
  subject: "有点焦虑",
  body: `老板，\n\n简历投了很多，但都石沉大海。房东又开始催租了。\n\n如果这周还没消息，我可能还要来找你...\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_stage2_struggling": {
  id: "mail_emma_stage2_struggling",
  sender: "艾玛",
  subject: "快撑不住了",
  body: `老板，\n\n男朋友开始抱怨我整天愁眉苦脸。我也知道这样不好，但我控制不住。\n\n冰箱空了，存款也快见底了。\n\n艾玛`,
  attachments: { cash: 0 }
},

"mail_emma_stage3_desperate": {
  id: "mail_emma_stage3_desperate",
  sender: "艾玛",
  subject: "（无主题）",
  body: `老板，\n\n我不知道还能撑多久。\n\n他最近总是很晚回家，回来也不怎么说话。\n\n也许他也在想办法离开我吧。`,
  attachments: { cash: 0 }
},
```

---

### 任务 4.2: 实现阶段状态邮件触发逻辑

**挑战**：当前引擎的 simulationRules 没有"冷却时间"机制，会导致邮件重复发送。

**方案 A（推荐）**：使用变量标记 + THRESHOLD

```typescript
// 在 variables 中新增
mail_stage1_sent: 0,
mail_stage2_sent: 0,
mail_stage3_sent: 0,

// 新增 COMPOUND 规则（示例：stage 1 乐观邮件）
{
    type: 'COMPOUND',
    sourceVar: 'stage',
    operator: '==',
    threshold: 1,
    targetVar: 'mail_stage1_sent',  // 借用这个变量做检查
    effect: 0,  // 不修改
    // 需要在引擎中支持 secondaryCondition
    secondaryCondition: [
        { sourceVar: 'hope', operator: '>=', threshold: 60 },
        { sourceVar: 'mail_stage1_sent', operator: '==', threshold: 0 }
    ],
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_stage1_hopeful', delayDays: 0 },
        { type: 'MOD_VAR', target: 'mail_stage1_sent', value: 1, op: 'SET' }
    ],
    logMessage: "艾玛发来近况更新（乐观）"
}
```

**方案 B（简化）**：只在关键节点发送，不做每日检查

在事件的 outcomes 中直接触发状态邮件，例如：

- `emma_01` 完成后 2 天，发送 `mail_emma_stage1_hopeful` 或 `mail_emma_stage1_anxious`
- `emma_02` 完成后 2 天，发送 `mail_emma_stage2_struggling`

```typescript
// 修改 emma_01 的 outcomes
"deal_charity": [
    // ... 现有操作 ...
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage1_hopeful", delayDays: 2 }  // 2天后发
]
```

---

### 任务 4.3: 确认引擎是否支持 SCHEDULE_MAIL 的 delayDays

**检查点**：
1. `delayDays: 0` 是否立即发送？
2. `delayDays: 2` 是否延迟 2 天？
3. 多个 SCHEDULE_MAIL 是否都能正确排队？

**如果不支持延迟**，需要先修改引擎，或使用 COMPOUND 规则每日检查实现。

---

## Phase 5: 崩溃过渡事件 [中优先级]

**目标**：当 THRESHOLD 触发（hope<10）时，让玩家亲眼见证艾玛的崩溃

### 任务 5.1: 创建崩溃告别事件

**文件**：`systems/narrative/stories/emma.ts`

**在 EMMA_EVENTS 数组中新增**：

```typescript
{
  id: "emma_04a_breakdown_visit",
  chainId: "chain_emma",
  triggerConditions: [
    { variable: "stage", operator: "==", value: 4 },
    { variable: "breakdown_timer", operator: "==", value: 1 }  // 刚进入 stage 4 的第二天
  ],
  template: {
    name: "艾玛",
    description: "她站在门口，没有带任何东西，眼眶红肿，神情恍惚。",
    avatarSeed: "emma_broken",
    interactionType: 'VISIT',
    dialogue: {
      greeting: "老板... 我只是想来看看。",
      pawnReason: "他走了。今天早上醒来，他的东西都不见了。我...我不知道该怎么办。",
      redemptionPlea: "不是来当东西的... 我就是想找个人说说话。",
      negotiationDynamic: "...",
      accepted: {
        fair: "谢谢你愿意听我说。也许明天会好一点。",
        fleeced: "算了... 打扰你了。",
        premium: "你愿意听我说话... 谢谢。"
      },
      rejected: "好... 好吧。打扰了。",
      rejectionLines: { standard: "打扰了。", angry: "...", desperate: "..." },
      exitDialogues: {
        grateful: "谢谢你... 我先走了。",
        neutral: "再见。",
        resentful: "...",
        desperate: "[她默默地转身，像个幽灵一样飘走了]"
      }
    },
    redemptionResolve: "None",
    negotiationStyle: "Desperate",
    patience: 5,
    mood: "Sad",
    desiredAmount: 0,
    minimumAmount: 0,
    maxRepayment: 0,
    item: makeItem({ id: "visit_dummy", name: "访问", realValue: 0, isVirtual: true }, "chain_emma"),
    tags: ["Story", "Visit"]
  },
  outcomes: {
    "listen": [
      { type: "MODIFY_VAR", variable: "hope", delta: 5 },
      { type: "MODIFY_VAR", variable: "breakdown_timer", value: 2 }
    ],
    "dismiss": [
      { type: "MODIFY_VAR", variable: "hope", delta: -10 },
      { type: "MODIFY_VAR", variable: "breakdown_timer", value: 2 }
    ]
  }
}
```

---

### 任务 5.2: 确保事件触发顺序正确

**检查点**：
1. `breakdown_timer` 在 stage 4 每天 +1
2. `emma_04a_breakdown_visit` 在 `breakdown_timer == 1` 时触发
3. `emma_05_chip` 在 `breakdown_timer >= 2` 时触发

**潜在问题**：如果 `breakdown_timer` 在进入 stage 4 当天就是 0，第二天变成 1，那么：
- Day 0: 进入 stage 4，timer = 0
- Day 1: timer = 1 → 触发 breakdown_visit
- Day 2: timer = 2 → 可以触发 chip

**需要确认**：breakdown_visit 完成后，timer 会被设为 2 还是继续自然增长？

根据当前设计，outcomes 中设置 `breakdown_timer = 2`，这意味着无论玩家选择什么，chip 事件都会在下一个有效日触发。

---

## 执行顺序

```
Phase 1 (高) ─────► Phase 2 (高) ─────► Phase 3 (中) ─────► Phase 4 (中) ─────► Phase 5 (中)
    │                   │                   │                   │                   │
    ▼                   ▼                   ▼                   ▼                   ▼
8封交易邮件          2封赎回邮件         3封面试邮件         4封状态邮件         1个过渡事件
+ outcomes修改      + onFailure修改     + CHANCE修改        + 触发逻辑          + 触发条件
```

---

## 文件修改汇总

| 文件 | Phase | 修改类型 | 内容 |
|------|-------|----------|------|
| `mailRegistry.ts` | 1 | 新增 | 8封交易反馈邮件 |
| `mailRegistry.ts` | 2 | 新增 | 2封赎回相关邮件 |
| `mailRegistry.ts` | 3 | 新增 | 3封面试进展邮件 |
| `mailRegistry.ts` | 4 | 新增 | 4封阶段状态邮件 |
| `emma.ts` | 1 | 修改 | 4个事件的 outcomes 添加邮件触发 |
| `emma.ts` | 2 | 修改 | onFailure 添加邮件触发 |
| `emma.ts` | 3 | 修改 | CHANCE 规则 + 新增变量 + THRESHOLD |
| `emma.ts` | 4 | 修改 | outcomes 添加延迟邮件 |
| `emma.ts` | 5 | 新增 | emma_04a_breakdown_visit 事件 |

---

## 验证清单

### Phase 1 验证
- [ ] emma_01 charity 交易后收到感谢邮件
- [ ] emma_01 shark 交易后收到冷淡邮件
- [ ] emma_02/03/03b 同上

### Phase 2 验证
- [ ] 赎回失败后收到 "电脑的事..." 邮件
- [ ] struggle 事件触发时玩家已知道原因

### Phase 3 验证
- [ ] CHANCE 成功时收到 "我拿到 Offer 了" 邮件
- [ ] 连续失败 3 次收到沮丧邮件
- [ ] job_chance >= 50 时收到进展邮件（如果实现）

### Phase 4 验证
- [ ] emma_01 完成 2 天后收到状态邮件
- [ ] 邮件内容根据 hope 值变化

### Phase 5 验证
- [ ] hope < 10 触发后，第二天看到崩溃告别事件
- [ ] 倾听选项给予 hope +5
- [ ] 赶走选项导致 hope -10
- [ ] 之后正常触发 chip 事件

---

## 新增邮件完整列表

| ID | 发送者 | 主题 | 触发时机 |
|----|--------|------|----------|
| `mail_emma_01_charity` | 艾玛 | 谢谢你 | emma_01 charity/aid |
| `mail_emma_01_shark` | 艾玛 | （无主题） | emma_01 shark |
| `mail_emma_02_charity` | 艾玛 | 撑过这周 | emma_02 charity |
| `mail_emma_02_shark` | 艾玛 | ... | emma_02 shark |
| `mail_emma_03_charity` | 艾玛 | 电脑的事 | emma_03 charity |
| `mail_emma_03_shark` | 艾玛 | 再见，老伙计 | emma_03 shark |
| `mail_emma_03b_charity` | 艾玛 | 最后的挣扎 | emma_03b charity |
| `mail_emma_03b_shark` | 艾玛 | （无主题） | emma_03b shark |
| `mail_emma_redeem_failed` | 艾玛 | 电脑的事... | 赎回失败时 |
| `mail_emma_coming_for_ring` | 艾玛 | 他走了 | 婚戒事件前（可选） |
| `mail_emma_interview_progress` | 艾玛 | 好消息！ | job_chance >= 50 |
| `mail_emma_got_job` | 艾玛 | 我拿到 Offer 了！！！ | CHANCE 成功 |
| `mail_emma_interview_failed_3x` | 艾玛 | 我是不是真的不行 | 连续失败 3 次 |
| `mail_emma_stage1_hopeful` | 艾玛 | 近况汇报 | stage 1 + hope >= 60 |
| `mail_emma_stage1_anxious` | 艾玛 | 有点焦虑 | stage 1 + hope < 50 |
| `mail_emma_stage2_struggling` | 艾玛 | 快撑不住了 | stage 2 |
| `mail_emma_stage3_desperate` | 艾玛 | （无主题） | stage 3 + hope < 30 |

**总计**：17 封新邮件
