# 艾玛（Emma）故事线代码实施计划 v3

> 初始版本：2026-01-27
> 目标文件：`systems/narrative/stories/emma.ts`
> 设计文档：`docs/story-improvements/emma-improvement-v3.md`
> 前置报告：`docs/story-causality/emma-causality-20260127.md`

---

## 概述

本文档提供 v3 改进计划的详细代码修改清单，聚焦于**因果感知盲区修复**。

### 修改概览

| 序号 | 修改位置 | 修改类型 | 优先级 | 状态 |
|------|----------|----------|--------|------|
| M1 | `EMMA_MAILS["mail_emma_03b_charity"]` | 邮件修改 | P0 | ⏳ 待实施 |
| M2 | `EMMA_MAILS` 新增 `mail_emma_left_city_laptop` | 邮件新增 | P0 | ⏳ 待实施 |
| M3 | `emma_04_watch_final.outcomes` | 事件修改 | P0 | ⏳ 待实施 |
| M4 | `emma_01_clothes.exitDialogues` | 对话修改 | P1 | ⏳ 待实施 |
| M5 | `EMMA_MAILS["mail_emma_success"]` | 邮件修改 | P1 | ⏳ 待实施 |
| M6 | `EMMA_MAILS` 新增 `mail_emma_breaking_point` | 邮件新增 | P2 | ⏳ 待实施 |
| M7 | `EMMA_CHAIN_INIT.simulationRules` | 规则新增 | P2 | ⏳ 待实施 |
| M8 | `emma_04_watch_final.exitDialogues.grateful` | 对话修改 | P2 | ⏳ 待实施 |

---

## 详细修改清单

### M1: [P0] 修改 mail_emma_03b_charity - Stage 4 回退归因

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_MAILS["mail_emma_03b_charity"]`（约第77-83行）
**类型**: 修改
**问题编号**: causality 路径5

**原代码**:
```typescript
"mail_emma_03b_charity": {
  id: "mail_emma_03b_charity",
  sender: "艾玛",
  subject: "最后的挣扎",
  body: `老板，\n\n谢谢你还愿意收这块表。也许... 还有希望。\n\n我再试试。`,
  attachments: { cash: 0 }
},
```

**目标代码**:
```typescript
"mail_emma_03b_charity": {
  id: "mail_emma_03b_charity",
  sender: "艾玛",
  subject: "也许还有希望",
  body: `老板，\n\n谢谢你还愿意收这块表。\n\n我本来已经放弃了。从你店里出来那一刻，我甚至想过去桥上吹吹风。\n\n但你愿意帮我，哪怕是在我最落魄的时候。也许... 还有希望。\n\n我决定再试一次。投简历、准备面试... 从头开始。\n\n谢谢你没有放弃我。\n\n艾玛`,
  attachments: { cash: 0 }
},
```

**修改说明**:
- 明确表达"第二次机会"的意图
- 暗示 Stage 4 的绝望程度（"想过去桥上"）
- 让玩家理解这次交易改变了艾玛的命运轨迹
- 修改主题为"也许还有希望"，更符合内容

---

### M2: [P0] 新增 mail_emma_left_city_laptop - 拒绝笔记本归因

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_MAILS` 对象末尾（约第255行后）
**类型**: 新增
**问题编号**: causality 路径4

**目标代码**:
```typescript
  // === 新增：拒绝笔记本导致离开城市的归因邮件 ===
  "mail_emma_left_city_laptop": {
    id: "mail_emma_left_city_laptop",
    sender: "艾玛",
    subject: "再见",
    body: `老板，\n\n我要离开这座城市了。\n\n你还记得那天吗？我带着电脑来找你，求你帮帮我。你说不收。\n\n我理解，也许它真的不值什么钱。但那是我最后的机会了。\n\n没有电脑，我错过了面试作业的截止日期。没有面试，就没有工作。没有工作... 他也走了。\n\n我不怪你。这个世界本来就是这样的。\n\n再见。\n\n艾玛`,
    attachments: { cash: 0 }
  }
```

**修改说明**:
- 在离开城市结局中归因到"拒绝笔记本"这一关键决策
- 完整的因果链：拒绝电脑 → 错过面试作业 → 没有面试 → 没有工作 → 男友离开
- 保持艾玛的特点："我不怪你"

---

### M3: [P0] 修改 emma_04_watch_final.outcomes - 根据路径选择邮件

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_04_watch_final.outcomes`（约第979-1004行）
**类型**: 修改
**问题编号**: causality 路径4

**原代码**:
```typescript
outcomes: {
    "deal_charity":  [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 }, // Revert to waiting stage (give her a 2nd chance)
        { type: "MODIFY_VAR", variable: "hope", value: 40 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }
    ],
    "deal_aid": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 },
        { type: "MODIFY_VAR", variable: "hope", value: 30 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }
    ],
    "deal_standard": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 99 }, // End chain (leaves city)
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }
    ],
    "deal_shark": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 99 },
        { type: "MODIFY_VAR", variable: "hope", value: 0 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }
    ]
},
onReject: [{ type: "SET_STAGE", value: 99 }, { type: "MODIFY_VAR", variable: "hope", value: 0 }]
```

**目标代码**:
```typescript
outcomes: {
    "deal_charity":  [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 }, // Revert to waiting stage (give her a 2nd chance)
        { type: "MODIFY_VAR", variable: "hope", value: 40 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }
    ],
    "deal_aid": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 },
        { type: "MODIFY_VAR", variable: "hope", value: 30 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }
    ],
    "deal_standard": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 99 }, // End chain (leaves city)
        // 根据 has_laptop 判断是哪条路径进入的：
        // has_laptop == 1 表示从拒绝笔记本路径进入，使用归因邮件
        // has_laptop == 0 表示从其他路径进入，使用通用邮件
        { type: "SCHEDULE_MAIL_CONDITIONAL",
          condition: { variable: "has_laptop", operator: "==", value: 1 },
          trueTemplateId: "mail_emma_left_city_laptop",
          falseTemplateId: "mail_emma_03b_shark",
          delayDays: 0 }
    ],
    "deal_shark": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 99 },
        { type: "MODIFY_VAR", variable: "hope", value: 0 },
        { type: "SCHEDULE_MAIL_CONDITIONAL",
          condition: { variable: "has_laptop", operator: "==", value: 1 },
          trueTemplateId: "mail_emma_left_city_laptop",
          falseTemplateId: "mail_emma_03b_shark",
          delayDays: 0 }
    ]
},
onReject: [
    { type: "SET_STAGE", value: 99 },
    { type: "MODIFY_VAR", variable: "hope", value: 0 },
    { type: "SCHEDULE_MAIL_CONDITIONAL",
      condition: { variable: "has_laptop", operator: "==", value: 1 },
      trueTemplateId: "mail_emma_left_city_laptop",
      falseTemplateId: "mail_emma_03b_shark",
      delayDays: 0 }
]
```

**备选方案**（如引擎不支持 `SCHEDULE_MAIL_CONDITIONAL`）:

在 `simulationRules` 中添加延迟触发逻辑：

```typescript
// 在 EMMA_CHAIN_INIT.simulationRules 中添加
{
    type: 'THRESHOLD',
    condition: { variable: 'has_laptop', operator: '==', value: 1 },
    targetVar: 'stage',
    operator: '==',
    value: 99,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_left_city_laptop', delayDays: 0 }
    ],
    triggerOnce: true,
    triggerLog: "从拒绝笔记本路径离开城市"
}
```

并在 outcomes 中移除邮件调度（让 simulationRules 统一处理）。

**修改说明**:
- 使用 `has_laptop` 变量区分进入 Stage 4 的路径
- 拒绝笔记本时 `has_laptop` 保持为 1
- 接受笔记本时 `has_laptop` 设为 0
- 根据这个变量选择不同的归因邮件

---

### M4: [P1] 修改 emma_01_clothes.exitDialogues - 利率提示

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS[0].template.dialogue.exitDialogues`（约第524-535行）
**类型**: 修改
**问题编号**: causality 系统级盲区1

**原代码**:
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 65 }, text: "谢谢！回去告诉他这个好消息，他最近也挺烦的。" },
        { text: "真的很感谢你！等我找到工作，第一时间来赎！" }
    ],
    neutral: "回见。帮我保管好它。——啊，得赶紧回去了，他不喜欢我在外面待太久。",
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 45 }, text: "算了... 回去再想办法吧。" },
        { text: "没想到这行也这么黑... 算了。" }
    ],
    desperate: "[她默默地把钱塞进包里，低着头快步走了出去]"
}
```

**目标代码**:
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 65 }, text: "谢谢！这个利息... 比我想的低多了。回去告诉他这个好消息！" },
        { text: "真的很感谢你！等我找到工作，第一时间来赎！" }
    ],
    neutral: "回见。帮我保管好它。——啊，得赶紧回去了，他不喜欢我在外面待太久。",
    resentful: [
        { condition: { variable: "hope", operator: "<", value: 45 }, text: "这个利息... 算了，回去再想办法吧。（她的步伐变得沉重）" },
        { text: "没想到这行也这么黑... 算了。" }
    ],
    desperate: "[她默默地把钱塞进包里，低着头快步走了出去]"
}
```

**修改说明**:
- 在 grateful 路径提及"利息低"，让玩家知道 0% 利率对她有帮助
- 在 resentful 路径提及"利息"，让玩家知道 20% 利率给她带来压力
- 添加动作描写"步伐变得沉重"增强情感表达

---

### M5: [P1] 修改 mail_emma_success - 面试成功归因

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_MAILS["mail_emma_success"]`（约第7-13行）
**类型**: 修改
**问题编号**: causality 系统级盲区2

**原代码**:
```typescript
"mail_emma_success": {
  id: "mail_emma_success",
  sender: "艾玛",
  subject: "我入职了！",
  body: `老板：\n\n告诉你一个好消息，我被那家跨国公司录取了！\n\n还记得那台{{relatedItemName}}吗？如果那时候你像别人一样狠狠宰我一笔，或者因为我没钱就赶我走，我可能早就崩溃了。\n\n这笔钱({{amount}})是我多付的利息，或者是... 感谢费。请你务必收下。\n\n另外，那枚婚戒我也不打算卖了。生活好像又有希望了。\n\n祝好，\n\n艾玛`,
  attachments: { cash: 500 }
},
```

**目标代码**:
```typescript
"mail_emma_success": {
  id: "mail_emma_success",
  sender: "艾玛",
  subject: "我入职了！",
  body: `老板：\n\n告诉你一个好消息，我被那家跨国公司录取了！\n\n还记得那台{{relatedItemName}}吗？如果那时候你像别人一样狠狠宰我一笔，或者因为我没钱就赶我走，我可能早就崩溃了。\n\n面试官说我"状态很好，很有感染力"。我想，这是因为每次从你店里出来，我都觉得这个世界还有好人。你给我的不只是钱，还有信心。\n\n这笔钱({{amount}})是我多付的利息，或者是... 感谢费。请你务必收下。\n\n另外，那枚婚戒我也不打算卖了。生活好像又有希望了。\n\n祝好，\n\n艾玛`,
  attachments: { cash: 500 }
},
```

**修改说明**:
- 新增段落解释面试成功的原因
- "状态很好"对应 hope 变量
- "有感染力"对应 job_chance（面试表现）
- "你给我的不只是钱，还有信心"明确归因玩家的帮助

---

### M6: [P2] 新增 mail_emma_breaking_point - 崩溃预警归因

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_MAILS` 对象末尾
**类型**: 新增
**问题编号**: causality 路径2

**目标代码**:
```typescript
  // === 新增：苛刻路径崩溃预警邮件 ===
  "mail_emma_breaking_point": {
    id: "mail_emma_breaking_point",
    sender: "艾玛",
    subject: "快撑不住了",
    body: `老板，\n\n我算了一下账。\n\n当铺的利息、房租、水电... 每一笔都在催命。\n\n有时候我会想，如果你当初给的价格再高一点，利息再低一点... 也许我不用这么拼命。\n\n但我也知道，这不能怪你。毕竟你也是做生意的。\n\n只是... 我快撑不住了。\n\n艾玛`,
    attachments: { cash: 0 }
  }
```

**修改说明**:
- 在崩溃前发送，给玩家最后的警告
- 明确归因"典当利息"
- 保持艾玛"不自责他人"的特点："不能怪你"

---

### M7: [P2] 新增 simulationRule - 崩溃预警触发

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_CHAIN_INIT.simulationRules` 数组末尾（约第487行后）
**类型**: 新增
**问题编号**: causality 路径2

**目标代码**:
```typescript
      // 崩溃预警邮件（在 hope 降到 25 以下但还没触发崩溃时发送）
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '<', value: 4 }, // 还没进入崩溃路径
          targetVar: 'hope',
          operator: '<=',
          value: 25,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_breaking_point', delayDays: 0 }
          ],
          triggerOnce: true, // 需要引擎支持，或用变量标记
          triggerLog: "艾玛快撑不住了（归因邮件）"
      }
```

**备选方案**（如引擎不支持 `triggerOnce`）:

使用变量标记：

```typescript
      {
          type: 'THRESHOLD',
          condition: {
              AND: [
                  { variable: 'stage', operator: '<', value: 4 },
                  { variable: 'breaking_point_sent', operator: '==', value: 0 }
              ]
          },
          targetVar: 'hope',
          operator: '<=',
          value: 25,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_breaking_point', delayDays: 0 },
              { type: 'MOD_VAR', target: 'breaking_point_sent', value: 1, op: 'SET' }
          ],
          triggerLog: "艾玛快撑不住了（归因邮件）"
      }
```

并在 `EMMA_CHAIN_INIT.variables` 中添加：
```typescript
breaking_point_sent: 0
```

**修改说明**:
- 在 hope ≤ 25 且尚未崩溃时触发
- 只触发一次，避免重复发送
- 给玩家一个"最后的警告"

---

### M8: [P2] 修改 emma_04_watch_final.exitDialogues.grateful - 回退暗示

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_04_watch_final.template.dialogue.exitDialogues`（约第971行）
**类型**: 修改
**问题编号**: causality 路径5

**原代码**:
```typescript
exitDialogues: {
    grateful: "谢谢你。你是这个城市唯一... 愿意好好跟我说话的人。",
    neutral: "走了。",
    resentful: "...",
    desperate: "[她的眼神空洞，像是已经放弃了什么]"
}
```

**目标代码**:
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 30 },
          text: "谢谢你。你是这个城市唯一... 愿意好好跟我说话的人。也许... 我还可以再试一次。" },
        { text: "谢谢你。你是这个城市唯一... 愿意好好跟我说话的人。" }
    ],
    neutral: "走了。",
    resentful: "...",
    desperate: "[她的眼神空洞，像是已经放弃了什么]"
}
```

**修改说明**:
- 当 charity/aid 交易后（hope 恢复到 30+），暗示"再试一次"
- 让玩家在 exitDialogue 时就感知到这是一个转折点
- 与 mail_emma_03b_charity 形成呼应

---

## 变量依赖检查

本次修改依赖以下现有变量：

| 变量名 | 用途 | 当前状态 |
|--------|------|----------|
| `has_laptop` | 判断是否从拒绝笔记本路径进入 Stage 4 | ✅ 已存在 |
| `hope` | 判断情绪状态，用于对话条件 | ✅ 已存在 |
| `stage` | 判断当前阶段 | ✅ 已存在 |

需要新增的变量（如引擎不支持 `triggerOnce`）：

| 变量名 | 用途 | 初始值 |
|--------|------|--------|
| `breaking_point_sent` | 标记崩溃预警邮件是否已发送 | 0 |

---

## 引擎依赖确认

以下功能需要确认引擎是否支持：

| 功能 | 使用位置 | 备选方案 |
|------|----------|----------|
| `SCHEDULE_MAIL_CONDITIONAL` | M3 | 使用 simulationRules 延迟触发 |
| `triggerOnce` | M7 | 用变量标记是否已触发 |
| `AND` 条件组合 | M7 备选 | 使用嵌套 condition |

---

## 验证清单

### 代码验证

- [ ] M1: mail_emma_03b_charity 内容更新
- [ ] M2: mail_emma_left_city_laptop 新增到 EMMA_MAILS
- [ ] M3: emma_04_watch_final.outcomes 条件邮件逻辑
- [ ] M4: emma_01_clothes.exitDialogues 利率提示
- [ ] M5: mail_emma_success 内容更新
- [ ] M6: mail_emma_breaking_point 新增到 EMMA_MAILS
- [ ] M7: simulationRules 崩溃预警规则
- [ ] M8: emma_04_watch_final.exitDialogues.grateful 条件变体
- [ ] TypeScript 编译无错误

### 游戏内验证

**P0 路径验证**:
- [ ] Stage 4 + charity → 收到修改后的 mail_emma_03b_charity（包含"第二次机会"）
- [ ] Stage 4 + charity → exitDialogue 显示"再试一次"
- [ ] 拒绝笔记本 → Stage 4 → standard/shark/reject → 收到 mail_emma_left_city_laptop

**P1 路径验证**:
- [ ] emma_01 + charity → exitDialogue 显示"利息低"
- [ ] emma_01 + shark → exitDialogue 显示"这个利息"
- [ ] 好结局 → mail_emma_success 包含"状态很好，很有感染力"

**P2 路径验证**:
- [ ] hope 从 30 跌到 25 → 收到 mail_emma_breaking_point
- [ ] hope 从 25 继续跌 → 不重复收到 mail_emma_breaking_point

### 玩家感知验证

- [ ] Stage 4 回退：玩家是否理解"我给了她第二次机会"？
- [ ] 拒绝笔记本：玩家是否理解"是我拒绝收她的电脑导致的"？
- [ ] 利率影响：玩家是否感知到利率选择的后果？
- [ ] 成功归因：玩家是否理解"我的帮助让她有信心"？

---

## 实施顺序建议

1. **第一步**：新增邮件模板（M2, M6）— 其他修改依赖这些邮件
2. **第二步**：修改现有邮件（M1, M5）
3. **第三步**：修改事件 outcomes（M3）— 需要确认引擎支持
4. **第四步**：修改对话（M4, M8）
5. **第五步**：新增 simulationRule（M7）— 需要确认变量或 triggerOnce 支持

---

## 状态标记规范

- `⏳ 待实施` - 等待实施
- `🔄 进行中` - 正在实施
- `✅ 已完成` - 已实现并验证
- `❌ 已取消` - 设计变更导致取消
- `⚠️ 需引擎支持` - 等待引擎功能确认

---

*此实施计划基于 2026-01-27 的 causality 分析生成，聚焦于因果感知盲区修复*
