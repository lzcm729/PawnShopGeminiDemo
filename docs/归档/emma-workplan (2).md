# 艾玛故事线改进工作计划

> 生成时间：2026-01-26
> 基于：emma-analysis.md

---

## 工作概览

| 阶段 | 内容 | 预计改动 |
|------|------|----------|
| Phase 1 | 调度已有邮件 | 修改 outcomes |
| Phase 2 | exitDialogues 条件变体 | 修改 4 个事件 |
| Phase 3 | Stage 3 面试反馈 | 新增邮件 + simulationRules |
| Phase 4 | 衣服重要性强调 | 修改对话 |
| Phase 5 | 技术补全 | 添加 deal_aid |
| Phase 6 | fateHints 扩展 | 修改 fateHints.ts |

---

## Phase 1: 调度已有邮件

### 1.1 目标
将已定义但未使用的 `mail_emma_stage2_struggling` 和 `mail_emma_stage3_desperate` 调度到合适的时机。

### 1.2 具体改动

#### 文件：`systems/narrative/stories/emma.ts`

**改动 1：Stage 1→2 (面霜) outcomes 添加延迟邮件**

```typescript
// emma_02_skincare outcomes
outcomes: {
    "deal_charity":  [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 2 },
        { type: "MODIFY_VAR", variable: "hope", value: 65 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
        // 新增：延迟邮件铺垫男友抱怨
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
    ],
    "deal_standard": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 2 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
        // 新增
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
    ],
    "deal_shark":    [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 2 },
        { type: "MODIFY_VAR", variable: "hope", value: 30 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_shark", delayDays: 0 },
        // 新增
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 1 }
    ]
}
```

**改动 2：Stage 2→3 (电脑) outcomes 添加延迟邮件**

```typescript
// emma_03_laptop outcomes
outcomes: {
    "deal_charity":  [
        // ... 现有内容 ...
        // 新增：延迟邮件铺垫男友要离开
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 2 }
    ],
    "deal_standard": [
        // ... 现有内容 ...
        // 新增
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 2 }
    ],
    "deal_shark":    [
        // ... 现有内容 ...
        // 新增（更快触发，因为状态更差）
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 1 }
    ]
}
```

### 1.3 验证点
- [ ] 典当面霜后 1-2 天收到 `mail_emma_stage2_struggling`
- [ ] 典当电脑后 1-2 天收到 `mail_emma_stage3_desperate`
- [ ] 邮件内容提及男友

---

## Phase 2: exitDialogues 条件变体

### 2.1 目标
在交易结束时通过离开对话铺垫男友、反映状态变化。

### 2.2 具体改动

#### 文件：`systems/narrative/stories/emma.ts`

**改动 1：emma_01_clothes exitDialogues**

```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 65 },
          text: "真的很感谢你！我回去告诉男朋友这个好消息，他一直很担心我。" },
        { text: "真的很感谢你！等我找到工作，第一时间来赎！" }
    ],
    neutral: "回见。帮我保管好它。",
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 45 },
          text: "没想到这行也这么黑... 回去又要被他念叨了。" },
        { text: "没想到这行也这么黑... 算了。" }
    ],
    desperate: "[她默默地把钱塞进包里，低着头快步走了出去]"
}
```

**改动 2：emma_02_skincare exitDialogues**

```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 60 },
          text: "谢谢你，真的。我男朋友说只要能撑过这个月就好。" },
        { text: "谢谢你，真的。我会记住你的恩情。" }
    ],
    neutral: "走了。",
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 35 },
          text: "[她攥着钱，嘴唇颤抖] 回去... 他又要发火了..." },
        { text: "..." }
    ],
    desperate: "[她紧紧攥着那几张钞票，像是抓着最后一根稻草]"
}
```

**改动 3：emma_03_laptop exitDialogues**

```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 55 },
          text: "谢谢... 我会回来的。他说只要我找到工作，一切都会好起来的。" },
        { text: "谢谢... 谢谢... (语无伦次)" }
    ],
    neutral: "我会回来的。",
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 25 },
          text: "[她的手在发抖] 他说得对... 我就是个废物..." },
        { text: "..." }
    ],
    desperate: "[她一步三回头地看着那台电脑，眼神里充满了恐惧]"
}
```

### 2.3 验证点
- [ ] 慈善价交易后，离开对话提及男友（正面）
- [ ] 高利贷交易后，离开对话暗示男友关系紧张（负面）
- [ ] 条件变体根据 hope 值正确触发

---

## Phase 3: Stage 3 面试进程反馈

### 3.1 目标
让玩家在 Stage 3 等待期间了解艾玛的面试进展。

### 3.2 具体改动

#### 3.2.1 新增邮件模板

```typescript
// 新增邮件：单次面试失败
"mail_emma_interview_failed_once": {
    id: "mail_emma_interview_failed_once",
    sender: "艾玛",
    subject: "今天的面试",
    body: `老板，\n\n今天的面试没过。HR说我"经验不够匹配"。\n\n没关系，还有其他机会。我不会放弃的。\n\n艾玛`,
    attachments: { cash: 0 }
},

// 新增邮件：两次面试失败
"mail_emma_interview_failed_twice": {
    id: "mail_emma_interview_failed_twice",
    sender: "艾玛",
    subject: "又被拒了",
    body: `老板，\n\n又被拒了。这次HR说我"状态不太好"。\n\n也许他们说得对。最近确实睡不好，他也开始冷落我了。\n\n但我还会继续试的。\n\n艾玛`,
    attachments: { cash: 0 }
}
```

#### 3.2.2 修改 simulationRules

```typescript
// 在 EMMA_CHAIN_INIT.simulationRules 中添加

// 单次面试失败反馈
{
    type: 'THRESHOLD',
    condition: { variable: 'stage', operator: '==', value: 3 },
    targetVar: 'interview_failures',
    operator: '==',
    value: 1,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_once', delayDays: 0 }
    ],
    triggerLog: "第一次面试失败"
},

// 两次面试失败反馈
{
    type: 'THRESHOLD',
    condition: { variable: 'stage', operator: '==', value: 3 },
    targetVar: 'interview_failures',
    operator: '==',
    value: 2,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_twice', delayDays: 0 }
    ],
    triggerLog: "第二次面试失败"
}
```

### 3.3 验证点
- [ ] Stage 3 期间，每次面试失败都有邮件反馈
- [ ] 邮件内容递进（从乐观到沮丧）
- [ ] 邮件中自然提及男友

---

## Phase 4: 衣服重要性强调

### 4.1 目标
让玩家事前知道衣服对艾玛入职的重要性。

### 4.2 具体改动

#### 4.2.1 修改 emma_01_clothes 对话

```typescript
// pawnReason 添加衣服重要性
pawnReason: "刚收到裁员通知... 不过别担心，这只是暂时的，我很快就能找到下家。这套衣服是我的战袍，面试和入职都得穿它。"

// redemptionPlea 强调
redemptionPlea: "我面试一旦通过，拿了安家费就会来赎。入职第一天必须穿这套，这是我的幸运战袍。"
```

#### 4.2.2 修改 mail_emma_got_job 邮件

```typescript
"mail_emma_got_job": {
    id: "mail_emma_got_job",
    sender: "艾玛",
    subject: "我拿到 Offer 了！！！",
    body: `老板！！！\n\n我拿到 Offer 了！！！是那家跨国公司！\n\n下周一入职，我得穿那套衣服去报到。等我入职拿了安家费，马上来赎！千万帮我留着！\n\n艾玛`,
    attachments: { cash: 0 }
}
```

#### 4.2.3 修改 mail_emma_plea 邮件（赎回失败时）

```typescript
"mail_emma_plea": {
    id: "mail_emma_plea",
    sender: "艾玛",
    subject: "关于那套衣服...",
    body: `老板，\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那套衣服对我真的很重要——如果拿到offer，入职第一天必须穿它。请千万不要把它挂牌出售，再宽限我几天。\n\n拜托了。`,
    attachments: { cash: 0 }
}
```

### 4.3 验证点
- [ ] 玩家在第一次交易时就知道衣服=入职必需品
- [ ] 赎回相关邮件强化这个信息
- [ ] 卖掉衣服导致坏结局时，玩家能理解因果

---

## Phase 5: 技术补全 - deal_aid outcomes

### 5.1 目标
补全 Stage 1 和 Stage 2 缺失的 `deal_aid` outcomes。

### 5.2 具体改动

#### emma_02_skincare outcomes

```typescript
outcomes: {
    "deal_charity":  [...],
    // 新增 deal_aid
    "deal_aid": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 2 },
        { type: "MODIFY_VAR", variable: "hope", value: 60 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
    ],
    "deal_standard": [...],
    "deal_shark":    [...]
}
```

#### emma_03_laptop outcomes

```typescript
outcomes: {
    "deal_charity":  [...],
    // 新增 deal_aid
    "deal_aid": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 },
        { type: "MODIFY_VAR", variable: "hope", value: 55 },
        { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 2 }
    ],
    "deal_standard": [...],
    "deal_shark":    [...]
}
```

### 5.3 验证点
- [ ] 5% 援助利率交易能正常完成
- [ ] hope 值变化介于 charity 和 standard 之间

---

## Phase 6: fateHints 扩展

### 6.1 目标
为艾玛特定状态添加更多 observation 描述。

### 6.2 具体改动

#### 文件：`systems/narrative/fateHints.ts`

```typescript
// 新增：面试失败状态
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

// 新增：中等 hope 状态（填补 20-80 的空白）
{
    variableName: 'hope',
    condition: (v) => v >= 40 && v < 60,
    priority: 6,
    hints: [
        '（她努力挤出一个微笑，但眼底的疲惫藏不住）',
        '（不时看向手机，像是在等什么重要消息）'
    ]
},

// 新增：低 hope 但未崩溃
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

### 6.3 验证点
- [ ] 不同 hope 区间显示不同的 observation
- [ ] 面试失败次数多时有专属描述
- [ ] observation 与 description 互补，不重复

---

## 实施顺序

```
Phase 1 (调度邮件)
    ↓
Phase 2 (exitDialogues)
    ↓
Phase 4 (衣服重要性) ← 可与 Phase 2 并行
    ↓
Phase 3 (面试反馈)
    ↓
Phase 5 (deal_aid) ← 可与 Phase 3 并行
    ↓
Phase 6 (fateHints)
    ↓
全面测试
```

---

## 测试场景

### 场景 1：全程善待路线
1. Stage 0: 慈善价收衣服
2. 检查：收到 hopeful 邮件，exitDialogue 提及男友（正面）
3. Stage 1: 慈善价收面霜
4. 检查：收到 struggling 邮件（男友抱怨）
5. Stage 2: 慈善价收电脑
6. 检查：收到 desperate 邮件（男友要离开）
7. Stage 3: 等待面试结果
8. 检查：收到面试进度邮件
9. 预期结局：好结局概率高

### 场景 2：全程剥削路线
1. Stage 0: 高利贷价收衣服
2. 检查：exitDialogue 暗示男友不满
3. Stage 1: 高利贷价收面霜
4. 检查：struggling 邮件更快到达
5. Stage 2: 高利贷价收电脑
6. 检查：desperate 邮件，hope 很低
7. Stage 3: 快速崩溃
8. 检查：男友离开邮件
9. Stage 4: 艾玛带手表来
10. 检查：玩家此时已知道男友是谁
11. 预期结局：坏结局

### 场景 3：卖掉衣服路线
1. 正常完成 Stage 0-2
2. 在 Stage 3 期间卖掉衣服
3. 艾玛来赎回时触发 core_lost
4. 检查：玩家理解"衣服被卖=入职失败"

---

## 完成标准

- [ ] 所有 Phase 改动已实施
- [ ] 三个测试场景全部通过
- [ ] 验证清单（emma-analysis.md 第六节）全部勾选
- [ ] 无 TypeScript 编译错误
- [ ] 游戏可正常运行
