# 艾玛故事线工作计划 v2

> 生成时间：2026-01-26
> 基于：emma-analysis-v2.md
> 状态：**主要改进已完成**

---

## 工作概览

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 调度已有邮件 | ✅ 已完成 |
| Phase 2 | exitDialogues 条件变体 | ✅ 已完成 |
| Phase 3 | Stage 3 面试反馈 | ✅ 已完成 |
| Phase 4 | 衣服重要性强调 | ✅ 已完成 |
| Phase 5 | 技术补全 deal_aid | ✅ 已完成 |
| Phase 6 | fateHints 扩展 | ✅ 已完成 |

---

## 已完成的改进

### Phase 1: 调度已有邮件 ✅

**改动位置：** `systems/narrative/stories/emma.ts`

**Stage 1→2 (面霜) outcomes:**
```typescript
// 所有 deal 类型都添加了延迟邮件
{ type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
// shark 类型延迟更短 (1天)
```

**Stage 2→3 (电脑) outcomes:**
```typescript
// 所有 deal 类型都添加了延迟邮件
{ type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 2 }
// shark 类型延迟更短 (1天)
```

### Phase 2: exitDialogues 条件变体 ✅

**Stage 0 (衣服):**
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 65 },
          text: "真的很感谢你！我回去告诉男朋友这个好消息，他一直很担心我。" },
        { text: "真的很感谢你！等我找到工作，第一时间来赎！" }
    ],
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 45 },
          text: "没想到这行也这么黑... 回去又要被他念叨了。" },
        { text: "没想到这行也这么黑... 算了。" }
    ]
}
```

**Stage 1 (面霜):**
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 60 },
          text: "谢谢你，真的。我男朋友说只要能撑过这个月就好。" },
        { text: "谢谢你，真的。我会记住你的恩情。" }
    ],
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 35 },
          text: "[她攥着钱，嘴唇颤抖] 回去... 他又要发火了..." },
        { text: "..." }
    ]
}
```

**Stage 2 (电脑):**
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 55 },
          text: "谢谢... 我会回来的。他说只要我找到工作，一切都会好起来的。" },
        { text: "谢谢... 谢谢... (语无伦次)" }
    ],
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 25 },
          text: "[她的手在发抖] 他说得对... 我就是个废物..." },
        { text: "..." }
    ]
}
```

### Phase 3: Stage 3 面试反馈 ✅

**新增邮件模板:**
- `mail_emma_interview_failed_once` - 第1次失败
- `mail_emma_interview_failed_twice` - 第2次失败

**新增 simulationRules:**
```typescript
// 单次失败
{
    type: 'THRESHOLD',
    condition: { variable: 'stage', operator: '==', value: 3 },
    targetVar: 'interview_failures',
    operator: '==',
    value: 1,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_once', delayDays: 0 }
    ]
},
// 两次失败
{
    type: 'THRESHOLD',
    condition: { variable: 'stage', operator: '==', value: 3 },
    targetVar: 'interview_failures',
    operator: '==',
    value: 2,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_twice', delayDays: 0 }
    ]
}
```

### Phase 4: 衣服重要性强调 ✅

**Stage 0 pawnReason:**
```typescript
pawnReason: "刚收到裁员通知... 不过别担心，这只是暂时的，我很快就能找到下家。这套衣服是我的战袍，面试和入职都得穿它。"
```

**Stage 0 redemptionPlea:**
```typescript
redemptionPlea: "我面试一旦通过，拿了安家费就会来赎。入职第一天必须穿这套，这是我的幸运战袍。"
```

**mail_emma_got_job:**
```typescript
body: `老板！！！\n\n我拿到 Offer 了！！！是那家跨国公司！\n\n下周一入职，我得穿那套衣服去报到。等我入职拿了安家费，马上来赎！千万帮我留着！\n\n艾玛`
```

**mail_emma_plea:**
```typescript
body: `老板，\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那套衣服对我真的很重要——如果拿到offer，入职第一天必须穿它。请千万不要把它挂牌出售，再宽限我几天。\n\n拜托了。`
```

### Phase 5: 技术补全 deal_aid ✅

**Stage 1 (面霜):**
```typescript
"deal_aid": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "MODIFY_VAR", variable: "hope", value: 60 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
]
```

**Stage 2 (电脑):**
```typescript
"deal_aid": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "MODIFY_VAR", variable: "hope", value: 55 },
    { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 2 }
]
```

### Phase 6: fateHints 扩展 ✅

**改动位置：** `systems/narrative/fateHints.ts`

**新增规则:**
```typescript
// interview_failures >= 2
{
    variableName: 'interview_failures',
    condition: (v) => v >= 2,
    priority: 7,
    hints: [
        '（她的眼圈发红，像是刚哭过）',
        '（手里攥着一张皱巴巴的纸，上面写着什么联系方式）',
        '（指甲被咬得参差不齐，透露着焦虑）'
    ]
},

// hope 40-60
{
    variableName: 'hope',
    condition: (v) => v >= 40 && v < 60,
    priority: 6,
    hints: [
        '（她努力挤出一个微笑，但眼底的疲惫藏不住）',
        '（不时看向手机，像是在等什么重要消息）'
    ]
},

// hope 20-40
{
    variableName: 'hope',
    condition: (v) => v >= 20 && v < 40,
    priority: 8,
    hints: [
        '（她的声音有些沙哑，像是好几天没怎么说话）',
        '（肩膀微微塌着，整个人像是被抽走了力气）',
        '（手指在不停地绞着衣角，透露出内心的不安）'
    ]
}
```

---

## 测试验证

### 测试场景 1：全程善待路线 ✅

1. Stage 0: 慈善价收衣服
   - [x] exitDialogue 提及男友（正面）
   - [x] 收到 hopeful 邮件
2. Stage 1: 慈善价收面霜
   - [x] 收到 struggling 邮件（男友抱怨）
3. Stage 2: 慈善价收电脑
   - [x] 收到 desperate 邮件（男友要离开）
4. Stage 3: 等待面试结果
   - [x] 收到面试进度邮件
5. 预期结局：好结局概率高

### 测试场景 2：全程剥削路线 ✅

1. Stage 0: 高利贷价收衣服
   - [x] exitDialogue 暗示男友不满
2. Stage 1: 高利贷价收面霜
   - [x] struggling 邮件更快到达
3. Stage 2: 高利贷价收电脑
   - [x] desperate 邮件更快到达
4. Stage 3/4: 快速崩溃
   - [x] 玩家此时已知道男友是谁
5. 预期结局：坏结局

### 测试场景 3：卖掉衣服路线 ✅

1. 正常完成 Stage 0-2
2. 在 Stage 3 期间卖掉衣服
3. 艾玛来赎回时触发 core_lost
4. [x] 玩家理解"衣服被卖=入职失败"

---

## 可选的后续优化

以下是低优先级的可选改进，当前版本已可发布：

### P3: Stage 4 exitDialogues 条件变体

当前 Stage 4 的 exitDialogues 是固定文本。可以考虑添加条件变体，但崩溃阶段情感已到极点，固定文本也可接受。

```typescript
// 可选改进
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 35 },
          text: "谢谢你。你是这个城市唯一对我好的人。也许... 还有希望。" },
        { text: "谢谢你。你是这个城市唯一对我好的人。" }
    ]
}
```

### P3: 更多 fateHints 变体

当前 fateHints 覆盖已足够，但可以添加更多细节：

```typescript
// 可选：funds 中间状态
{
    variableName: 'funds',
    condition: (v) => v >= 100 && v < 300,
    priority: 4,
    hints: [
        '（她的包看起来比上次更旧了，边角有些磨损）',
        '（指甲上的指甲油已经斑驳，但她似乎没心思补）'
    ]
}
```

---

## 完成标准

- [x] Phase 1-6 所有改动已实施
- [x] 三个测试场景验证通过
- [x] 验证清单全部勾选
- [x] 无 TypeScript 编译错误
- [x] 游戏可正常运行

**艾玛故事线状态：可发布** ✅
