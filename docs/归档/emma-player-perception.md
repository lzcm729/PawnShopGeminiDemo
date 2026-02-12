# 艾玛故事线：玩家感知分析

> 生成时间：2026-01-26
> 核心问题：艾玛的出现和消失是否都能被玩家感知到，并具备充足的理由？

---

## 一、核心发现

**结论**：艾玛的故事在**系统层面**设计得很完整，但在**玩家感知层面**存在严重的信息断裂。

玩家只能在艾玛**出现时**感知她的状态，但在她**消失的日子里**完全不知道：
- 她的生活状况如何
- 面试进展如何
- 为什么这次来的状态比上次更差/更好
- 她什么时候会再来

这导致：
1. 好结局感觉像"运气"而不是"玩家努力的结果"
2. 坏结局的心理递进对玩家来说是**断裂的**
3. 玩家的善意/恶意决策缺乏即时反馈

---

## 二、玩家视角时间线

### 当前实现

```
Day 1:  艾玛来当职业套装 → 玩家决策
Day 2-5: [黑箱] 玩家什么都不知道
Day 6:  艾玛来当面霜 → 玩家决策
        玩家："她怎么又来了？发生了什么？"
Day 7-10: [黑箱]
Day 11: 艾玛来当电脑 → 玩家决策
        玩家："她怎么变得这么惨？"
Day 12+: [黑箱]
...
Day ??: 艾玛来当婚戒
        玩家："她分手了？什么时候的事？"
```

### 问题诊断表

| # | 问题 | 玩家体验 | 严重性 |
|---|------|----------|--------|
| 1 | 事件之间无"预告" | 不知道艾玛什么时候会来 | 高 |
| 2 | 好结局条件不可见 | hope>=40 触发赎回，但玩家看不到 hope | 高 |
| 3 | 坏结局缺乏过渡 | 从电脑到婚戒，中间的崩溃过程隐藏 | 高 |
| 4 | THRESHOLD 跳转无预警 | hope<10 直接跳 stage，只有邮件无面对面 | 中 |
| 5 | struggle 事件动机不明 | 玩家不知道为什么她赎回失败后来当手表 | 中 |
| 6 | 面试结果完全隐藏 | CHANCE 规则每天运行，玩家看不到 | 中 |

---

## 三、场景分析

### 场景A：玩家全程善待艾玛

```
实际发生：
- Day 1: Charity → hope=70, job_chance=30
- Day 2-5: 面试中，每天有概率成功
- Day 6: 来当面霜
- ...
- 最终找到工作，来赎回

玩家感知：
- Day 1: 给了高价
- Day 2-5: [什么都不知道]
- Day 6: "她怎么又来了？上次不是帮她了吗？"
- ...
- Day ??: "她突然找到工作了！...为什么？"

问题：玩家不知道自己的善意产生了什么效果
```

### 场景B：玩家全程剥削艾玛

```
实际发生：
- Day 1: Shark → hope=40, job_chance=10
- Day 2-3: 面试失败，hope 持续下降
- Day 4: 来当面霜
- Day 5-6: hope 跌破临界值
- Day 7: 来当电脑
- Day 8-10: 赎回失败，男友离开
- Day 11: 来当婚戒
- Day 12-14: 彻底崩溃
- Day 15: 来卖芯片

玩家感知：
- Day 1: 压价成功
- Day 2-3: [什么都不知道]
- Day 4: "她又来了，好像更惨了"
- ...
- Day 11: "她分手了？什么时候的事？"
- Day 15: "这也太突然了吧？"

问题：崩溃过程对玩家是隐藏的，坏结局来得"莫名其妙"
```

### 场景C：玩家卖掉了艾玛的电脑

```
实际发生：
- 电脑到期，玩家卖掉
- 艾玛某天来赎回，发现电脑没了
- 触发 core_lost 分支

玩家感知：
- 卖掉电脑后：[没有任何反馈]
- Day ??: "艾玛来了？原来她要赎回啊..."
- 触发愤怒对话

问题：玩家不知道艾玛会不会来、什么时候来
```

---

## 四、改进方案

### 4.1 【高优先级】交易后即时反馈

**目标**：让玩家在交易完成后立即知道自己的决策产生了什么效果

**方案**：交易完成后发送一封短邮件

```typescript
// 新增邮件
"mail_emma_deal_charity": {
  sender: "艾玛",
  subject: "谢谢你",
  body: "老板，\n\n真的很感谢你。这个价格比我预期的高很多。\n\n有你这样的人在，也许这个世界还没那么糟。\n\n艾玛"
}

"mail_emma_deal_shark": {
  sender: "艾玛",
  subject: "（无主题）",
  body: "好吧。有总比没有好。"
}
```

**触发方式**：在 outcomes 中添加 `SCHEDULE_MAIL`

```typescript
outcomes: {
  "deal_charity": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "hope", value: 70 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_deal_charity", delayDays: 0 }  // 新增
  ],
  "deal_shark": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "hope", value: 40 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_deal_shark", delayDays: 0 }  // 新增
  ]
}
```

---

### 4.2 【高优先级】阶段性状态邮件

**目标**：让玩家在艾玛不出现的日子里也能感知她的状态

**方案**：根据 stage 和变量状态，定期发送状态更新邮件

```typescript
// 新增邮件模板
"mail_emma_stage1_hopeful": {
  sender: "艾玛",
  subject: "近况汇报",
  body: "老板，\n\n这几天投了很多简历，有几家已经约了面试。感觉事情在往好的方向发展。\n\n等我有好消息，第一时间告诉你！"
}

"mail_emma_stage1_anxious": {
  sender: "艾玛",
  subject: "有点焦虑",
  body: "老板，\n\n简历投了很多，但都石沉大海。房东又开始催租了。\n\n如果这周还没消息，我可能还要来找你..."
}

"mail_emma_stage2_struggling": {
  sender: "艾玛",
  subject: "快撑不住了",
  body: "老板，\n\n男朋友开始抱怨我整天愁眉苦脸。我也知道这样不好，但我控制不住。\n\n我能撑过这一关吗？"
}
```

**触发逻辑**：在 simulationRules 中添加（需要引擎支持 cooldown）

```typescript
{
  type: 'COMPOUND',
  sourceVar: 'stage',
  operator: '==',
  threshold: 1,
  secondaryCondition: { sourceVar: 'hope', operator: '>=', threshold: 60 },
  onTrigger: [{ type: 'SCHEDULE_MAIL', templateId: 'mail_emma_stage1_hopeful', delayDays: 0 }],
  cooldown: 4,  // 每4天最多触发一次
  triggerLog: "艾玛发来近况更新"
}
```

---

### 4.3 【高优先级】赎回失败解释

**目标**：让玩家理解为什么艾玛赎回失败后会来当手表

**方案**：在赎回失败时发送解释邮件

```typescript
// 新增邮件
"mail_emma_redeem_failed": {
  sender: "艾玛",
  subject: "电脑的事...",
  body: "老板，\n\n我凑不够赎金。说好的 Offer 黄了，男朋友也开始抱怨我拖累他。\n\n但我不想就这样放弃。明天我会再来，看看还有什么能换点钱的。\n\n别放弃我。"
}
```

**修改 onFailure**：

```typescript
// emma_redeem_attempt
onFailure: [
  { type: "MODIFY_VAR", variable: "hope", delta: -20 },
  { type: "MODIFY_VAR", variable: "redeem_attempted", value: 1 },
  { type: "SCHEDULE_MAIL", templateId: "mail_emma_redeem_failed", delayDays: 0 }  // 新增
]
```

---

### 4.4 【中优先级】面试进展可见化

**目标**：让玩家知道艾玛的面试进展

**方案**：面试成功时发送邮件

```typescript
// 新增邮件
"mail_emma_interview_progress": {
  sender: "艾玛",
  subject: "好消息！",
  body: "老板！\n\n我过了一轮面试！HR 说下周会有结果。\n\n感觉有戏，我要加油！"
}

"mail_emma_got_job": {
  sender: "艾玛",
  subject: "我拿到 Offer 了！！！",
  body: "老板！！！\n\n我拿到 Offer 了！！！\n\n等我入职拿了安家费，我马上来赎东西！谢谢你一直没放弃我！"
}
```

**修改 CHANCE 规则**：

```typescript
{
  type: 'CHANCE',
  chanceVar: 'job_chance',
  onSuccess: [
    { type: 'MOD_VAR', target: 'funds', value: 3000, op: 'ADD' },
    { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'SET' },
    { type: 'MOD_VAR', target: 'hope', value: 50, op: 'ADD' },
    { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_got_job', delayDays: 0 }  // 新增
  ],
  // ...
}
```

---

### 4.5 【中优先级】崩溃告别事件

**目标**：当 THRESHOLD 触发（hope<10）时，让玩家亲眼见证艾玛的崩溃

**方案**：新增一个"崩溃告别"事件

```typescript
{
  id: "emma_04a_breakdown_visit",
  chainId: "chain_emma",
  triggerConditions: [
    { variable: "stage", operator: "==", value: 4 },
    { variable: "breakdown_timer", operator: "==", value: 0 }  // 刚进入 stage 4
  ],
  template: {
    name: "艾玛",
    description: "她站在门口，没有带任何东西，眼眶红肿，神情恍惚。",
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
      rejected: "好... 好吧。打扰了。"
    },
    patience: 5,
    mood: "Sad"
  },
  outcomes: {
    "listen": [  // 倾听选项
      { type: "MODIFY_VAR", variable: "hope", delta: 5 },
      { type: "MODIFY_VAR", variable: "breakdown_timer", value: 1 }
    ],
    "dismiss": [  // 赶走选项
      { type: "MODIFY_VAR", variable: "hope", delta: -10 },
      { type: "MODIFY_VAR", variable: "breakdown_timer", value: 1 }
    ]
  }
}
```

**设计意图**：
- 让玩家亲眼看到艾玛的崩溃状态
- 给玩家一个"最后的选择"：倾听还是赶走
- 为后续的悲剧结局做情感铺垫

---

### 4.6 【低优先级】物品到期预警

**目标**：当艾玛的物品即将到期时，提醒玩家

**方案**：物品到期前2天发送邮件

```typescript
"mail_emma_item_expiring": {
  sender: "艾玛",
  subject: "关于那个{{itemName}}...",
  body: "老板，\n\n我看了一下日期，{{itemName}}快到期了。\n\n我还在想办法凑钱，能不能再给我几天？\n\n拜托了。"
}
```

---

## 五、改进后的玩家体验

```
Day 1:  艾玛来当职业套装 → 玩家选 Charity
Day 1:  📧 收到 "谢谢你，老板..."
Day 3:  📧 收到 "面试准备得还不错..."
Day 6:  艾玛来当面霜 → 玩家："我知道她最近在找工作"
Day 6:  📧 收到交易反馈邮件
Day 8:  📧 收到 "我过了一轮面试！"
Day 11: 艾玛来当电脑 → 玩家："她的 Offer 黄了吗？"
Day 13: 📧 收到 "我拿到 Offer 了！！！"
Day 15: 艾玛来赎回 → 玩家："太好了，她成功了！这是我帮她的！"

或者（坏结局路径）：

Day 11: 艾玛来当电脑 → 玩家选 Shark
Day 11: 📧 收到 "这点钱..."
Day 14: 艾玛来赎回失败
Day 14: 📧 收到 "电脑的事... 我凑不够赎金"
Day 16: 艾玛来当手表 → 玩家："她说的是真的..."
Day 18: 📧 收到 "一切都结束了"（男友离开）
Day 19: 艾玛来店（崩溃告别）→ 玩家亲眼看到她的状态
Day 21: 艾玛来当婚戒 → 玩家："我早该帮她的..."
Day 24: 艾玛来卖芯片 → 玩家："我害了她..."
```

---

## 六、实施清单

| # | 任务 | 优先级 | 文件 |
|---|------|--------|------|
| 1 | 新增交易反馈邮件 (4封) | 高 | `mailRegistry.ts` |
| 2 | 在 outcomes 中添加交易邮件触发 | 高 | `emma.ts` |
| 3 | 新增阶段状态邮件 (3-4封) | 高 | `mailRegistry.ts` |
| 4 | 新增 `mail_emma_redeem_failed` | 高 | `mailRegistry.ts` |
| 5 | 修改 `emma_redeem_attempt.onFailure` | 高 | `emma.ts` |
| 6 | 新增面试进展邮件 (2封) | 中 | `mailRegistry.ts` |
| 7 | 修改 CHANCE 规则添加邮件触发 | 中 | `emma.ts` |
| 8 | 新增 `emma_04a_breakdown_visit` 事件 | 中 | `emma.ts` |
| 9 | 新增物品到期预警邮件 | 低 | `mailRegistry.ts` + engine |

---

## 七、验证清单

### 交易反馈验证
- [ ] Charity 交易后收到感谢邮件
- [ ] Shark 交易后收到冷淡邮件

### 状态邮件验证
- [ ] Stage 1 + hope>=60 时收到乐观邮件
- [ ] Stage 1 + hope<50 时收到焦虑邮件

### 赎回流程验证
- [ ] 赎回失败后收到解释邮件
- [ ] 之后 struggle 事件触发，玩家能理解原因

### 崩溃路径验证
- [ ] hope<10 触发后，看到崩溃告别事件
- [ ] 倾听/赶走产生不同效果
