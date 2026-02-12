# 周守义故事线 - 代码修改方案

> 对应分析文档：[zhao-improvement.md](./zhao-improvement.md)

---

## 一、zhao.ts 新增 fateHints

在 `ZHAO_CHAIN` 定义中添加 `fateHints` 数组（参考 emma.ts 格式）：

**位置：** `ZHAO_CHAIN` 对象，与 `variables`、`simulationLog` 同级

```typescript
fateHints: [
    // --- STRESS (Physical/Mental Pressure) ---
    {
        condition: { variable: 'stress', operator: '>=', value: 25 },
        priority: 9,
        hints: [
            '（他的手在微微发抖，指节因为紧握拐杖而发白）',
            '（额头的皱纹比上次更深了，眼角有未干的泪痕）',
            '（走路时明显更加吃力，不时停下来喘气）'
        ]
    },
    {
        condition: { variable: 'stress', operator: '>=', value: 15 },
        priority: 7,
        hints: [
            '（他的脸色比上次苍白了一些，嘴唇有些干裂）',
            '（说话时偶尔会停顿，像是在努力控制情绪）',
            '（拄着拐杖的手比上次更用力了）'
        ]
    },

    // --- TRUST (Relationship with Player) ---
    {
        condition: { variable: 'trust', operator: '>=', value: 70 },
        priority: 6,
        hints: [
            '（看到你时，老人的眼里有了光）',
            '（他走进来时，身板似乎比以前挺直了一些）'
        ]
    },
    {
        condition: { variable: 'trust', operator: '<=', value: 30 },
        priority: 6,
        hints: [
            '（他警惕地打量着你，像是在重新评估什么）',
            '（进门时刻意保持着距离，眼神里有防备）'
        ]
    }
],
```

**注意：** fateHints 使用 priority 系统，高优先级会覆盖低优先级。stress >= 25 (priority 9) 会优先于 stress >= 15 (priority 7) 显示。

---

## 二、zhao.ts 新增邮件模板

在 `ZHAO_MAILS` 对象中添加：

```typescript
"mail_zhao_leg_pain": {
    id: "mail_zhao_leg_pain",
    sender: "周守义",
    subject: "腿又犯了老毛病",
    body: `老板，\n\n这几天腿疼得厉害，医生说得住院观察。\n\n这笔住院费... 我得再来你那一趟。证书原件在老柜子里，实在是最后的家当了。\n\n东西是死的，人是活的。先活着，才能赎回来。\n\n老周`,
    attachments: { cash: 0 }
},
```

---

## 三、zhao.ts exitDialogues 升级

### 3.1 zhao_01_medal exitDialogues

**原代码位置：** `ZHAO_EVENTS[0].template.dialogue.exitDialogues`

**修改前：**
```typescript
exitDialogues: {
    grateful: "谢谢... 谢谢。东西放你这，我放心。",
    neutral: "回见。保管好啊。",
    resentful: "唉... 世风日下。",
    desperate: "[老人拄着拐杖，颤颤巍巍地转身，背影显得格外佝偻]"
}
```

**修改后：**
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "trust", operator: ">=", value: 60 },
          text: "谢谢老板！这下红包不用愁了。我一定准时来赎！" },
        { text: "谢谢... 谢谢。东西放你这，我放心。" }
    ],
    neutral: "回见。保管好啊。",
    resentful: [
        { condition: { variable: "stress", operator: ">=", value: 10 },
          text: "[老人深吸一口气] 唉... 钱是少了点，但有总比没有好。" },
        { text: "唉... 世风日下。" }
    ],
    desperate: "[老人拄着拐杖，颤颤巍巍地转身，背影显得格外佝偻]"
}
```

### 3.2 zhao_03_cert exitDialogues

**原代码位置：** `ZHAO_EVENTS[2].template.dialogue.exitDialogues`

**修改前：**
```typescript
exitDialogues: {
    grateful: "大恩不言谢。我去交钱了。",
    neutral: "回见。",
    resentful: "...",
    desperate: "[老人擦了擦眼角，紧紧攥着钱，像是怕它飞了一样]"
}
```

**修改后：**
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "stress", operator: ">=", value: 20 },
          text: "[老人长舒一口气] 住院押金... 总算交上了。等腿好了我就来赎。" },
        { text: "大恩不言谢。我去交钱了。" }
    ],
    neutral: "回见。",
    resentful: [
        { condition: { variable: "stress", operator: ">=", value: 30 },
          text: "[老人的嘴唇在颤抖] 这点钱... 也就够交一半... 我再想办法吧..." },
        { text: "..." }
    ],
    desperate: "[老人擦了擦眼角，紧紧攥着钱，像是怕它飞了一样]"
}
```

---

## 四、邮件调度调整

在 `zhao_01_medal` 的 `deal_shark` outcomes 中添加 `mail_zhao_leg_pain`：

**修改前：**
```typescript
"deal_shark": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "stress", value: 10 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_01_shark", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_hospital_update", delayDays: 4 }
]
```

**修改后：**
```typescript
"deal_shark": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 1 },
    { type: "MODIFY_VAR", variable: "stress", value: 10 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_01_shark", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_leg_pain", delayDays: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_zhao_hospital_update", delayDays: 4 }
]
```

---

## 五、新增内容汇总

### 5.1 FateHints 新增

| 变量 | 条件 | 优先级 | 示例文本 |
|------|------|--------|----------|
| stress | >= 25 | 9 | "他的手在微微发抖，指节因紧握拐杖而发白" |
| stress | >= 15 | 7 | "脸色比上次苍白，嘴唇有些干裂" |
| trust | >= 70 | 6 | "看到你时，老人眼里有了光" |
| trust | <= 30 | 6 | "警惕地打量着你，眼神里有防备" |

### 5.2 exitDialogues 升级

| 事件 | 类型 | 条件 | 变体内容 |
|------|------|------|----------|
| zhao_01_medal | grateful | trust >= 60 | "红包不用愁了！准时来赎！" |
| zhao_01_medal | resentful | stress >= 10 | "[深吸气] 钱是少了点..." |
| zhao_03_cert | grateful | stress >= 20 | "[长舒气] 住院押金总算交上了" |
| zhao_03_cert | resentful | stress >= 30 | "[嘴唇颤抖] 只够交一半..." |

### 5.3 新增邮件

| ID | 发送者 | 主题 | 触发时机 |
|----|--------|------|----------|
| mail_zhao_leg_pain | 周守义 | 腿又犯了老毛病 | shark 路径 +2 天 |

---

## 六、类型兼容性说明

当前 `exitDialogues` 的类型定义可能需要更新以支持条件变体。检查 `types.ts` 中的 `Dialogue` 接口：

```typescript
// 如果当前定义是：
exitDialogues: {
    grateful: string;
    neutral: string;
    resentful: string;
    desperate: string;
}

// 需要改为：
exitDialogues: {
    grateful: DialogueText;
    neutral: DialogueText;
    resentful: DialogueText;
    desperate: DialogueText;
}

// 其中 DialogueText 的定义应为：
type DialogueText = string | DialogueVariant[];

interface DialogueVariant {
    condition?: TriggerCondition;
    text: string;
}
```

引擎中的 `resolveCustomerDialogue` 函数已经支持 `DialogueText` 类型的解析，所以只需确保类型定义正确即可。

---

## 七、实施顺序

1. **Step 1:** 在 `zhao.ts` 的 `ZHAO_CHAIN` 中添加 `fateHints` 数组
2. **Step 2:** 检查并更新 `types.ts` 中 exitDialogues 的类型定义（如需要）
3. **Step 3:** 更新 `zhao.ts` 中的 exitDialogues（zhao_01_medal 和 zhao_03_cert）
4. **Step 4:** 添加 `mail_zhao_leg_pain` 邮件模板
5. **Step 5:** 调整 deal_shark 的邮件调度顺序
6. **Step 6:** 测试验证
