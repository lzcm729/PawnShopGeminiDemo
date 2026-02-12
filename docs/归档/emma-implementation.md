# 艾玛（Emma）故事线代码实施计划

> 初始版本：2026-01-26
> 最后更新：2026-01-27 v2（新增结构性修复）
> 目标文件：`systems/narrative/stories/emma.ts`
> 设计文档：`docs/story-improvements/emma-improvement.md`
> 验证报告：`docs/story-validations/emma-validation-20260127-v2.md`

---

## 概述

本文档提供详细的代码修改清单。

### 已完成（2026-01-27 早期）
- ✅ C3: `emma_04` 缺少 deal_aid 和 deal_shark
- ✅ W1: `mail_emma_hate` 内容与场景不匹配
- ✅ W3: deal_standard 不修改 hope
- ✅ W4: interview_failures 重置逻辑问题
- ✅ I1: fateHints 性别错误
- ✅ 到期日相关邮件模板

### 新增待实现（2026-01-27 v2）
基于 `/story-validator emma` 和 `/story-improve emma` 的综合分析：

**P0 优先级（结构性问题）**
- ✅ S1: emma_03_laptop 添加 expiryFlows（致命 noShow.sell）
- ✅ S2: emma_03_laptop onReject 致命后果
- ✅ S3: 新增 6 封邮件模板

**P1 优先级（感知盲区）**
- ✅ S4: emma_01 onReject 添加邮件
- ✅ S5: emma_02 添加 expiryFlows
- ✅ S6: 邮件触发互斥修复（使用 breakdown_timer 变量）
- ✅ S7: 叙事碎片对话修改（3处）— 已在之前实现

**P2 优先级（完善）**
- ✅ S8: emma_05 onFailure 使用 mail_emma_redeem_failed
- ✅ S9: fateHints 补充身体语言暗示 — 已存在
- ✅ 修复 fateHints 性别错误（"他" → "她"）

---

## 修改概览

| 序号 | 修改位置 | 修改类型 | 问题编号 | 状态 |
|------|----------|----------|----------|------|
| 1 | `mail_emma_hate` | 邮件修改 | W1 | ✅ 已完成 |
| 2 | `emma_04_watch_final.outcomes` | 事件修改 | C3 | ✅ 已完成 |
| 3 | `emma_02_skincare.outcomes.deal_standard` | 数值修改 | W3 | ✅ 已完成 |
| 4 | `emma_03_laptop.outcomes.deal_standard` | 数值修改 | W3 | ✅ 已完成 |
| 5 | `simulationRules` (interview_failures) | 规则修改 | W4 | ✅ 已完成 |
| 6 | `fateHints[0].hints[1]` | 文本修改 | I1 | ✅ 已完成 |
| 7 | 新增邮件模板 | 邮件新增 | C1 | ✅ 已完成 |

---

## 详细修改清单

### 修改 1: [W1] 修复 `mail_emma_hate` 内容与触发场景不匹配

**文件**: `systems/narrative/stories/emma.ts`
**位置**: EMMA_MAILS["mail_emma_hate"]（第14-20行）
**类型**: 修改

**原代码**:
```typescript
"mail_emma_hate": {
  id: "mail_emma_hate",
  sender: "艾玛",
  subject: "你毁了一切",
  body: `我以为你会帮我... 结果你和其他吸血鬼没什么两样。\n\n因为没有电脑，我错过了入职提交材料的截止日期。工作没了，还要背负你的违约金债务。\n\n我要离开这座城市了。拿着我的电脑烂在手里吧。我诅咒你，诅咒这家店永远不得安宁。`,
  attachments: { cash: 0 }
},
```

**目标代码**:
```typescript
"mail_emma_hate": {
  id: "mail_emma_hate",
  sender: "艾玛",
  subject: "你毁了一切",
  body: `我以为你会帮我... 结果你和其他吸血鬼没什么两样。\n\n你卖掉了我的职业套装。那是我入职第一天必须穿的衣服。\n\nHR说公司有着装要求，让我"准备好了再来"。可是Offer有时限...\n\n我要离开这座城市了。我诅咒你，诅咒这家店永远不得安宁。`,
  attachments: { cash: 0 }
},
```

**修改说明**: 邮件触发于 `dynamicFlows.core_lost`（职业套装丢失），但内容说的是"电脑"。修正为与触发场景匹配的内容。

---

### 修改 2: [C3] 补充 `emma_04_watch_final` 的 deal_aid 和 deal_shark

**文件**: `systems/narrative/stories/emma.ts`
**位置**: EMMA_EVENTS[3].outcomes（第701-714行）
**类型**: 修改

**原代码**:
```typescript
outcomes: {
    "deal_charity":  [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 },
        { type: "MODIFY_VAR", variable: "hope", value: 40 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }
    ],
    "deal_standard": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 99 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }
    ]
},
```

**目标代码**:
```typescript
outcomes: {
    "deal_charity":  [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 3 },
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
        { type: "SET_STAGE", value: 99 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }
    ],
    "deal_shark": [
        { type: "ADD_FUNDS_DEAL" },
        { type: "SET_STAGE", value: 99 },
        { type: "MODIFY_VAR", variable: "hope", value: 0 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }
    ]
},
```

**修改说明**: 原事件只有 charity 和 standard 两个选项，与其他事件的四选项不一致。补充 deal_aid（给她第二次机会，hope 较低）和 deal_shark（彻底结束）。

---

### 修改 3: [W3] `emma_02_skincare` deal_standard 增加 hope 修改

**文件**: `systems/narrative/stories/emma.ts`
**位置**: EMMA_EVENTS[1].outcomes.deal_standard（第553-558行）
**类型**: 修改

**原代码**:
```typescript
"deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
],
```

**目标代码**:
```typescript
"deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 2 },
    { type: "MODIFY_VAR", variable: "hope", value: 55 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
],
```

**修改说明**: 公平交易应该有轻微的 hope 影响（从当前值设为 55），让玩家感知到决策的后果。

---

### 修改 4: [W3] `emma_03_laptop` deal_standard 增加 hope 修改

**文件**: `systems/narrative/stories/emma.ts`
**位置**: EMMA_EVENTS[2].outcomes.deal_standard（第636-643行）
**类型**: 修改

**原代码**:
```typescript
"deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_waiting", delayDays: 3 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 5 }
],
```

**目标代码**:
```typescript
"deal_standard": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: 3 },
    { type: "MODIFY_VAR", variable: "hope", value: 50 },
    { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_waiting", delayDays: 3 },
    { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 5 }
],
```

**修改说明**: 同上，公平交易应该有轻微的 hope 影响。

---

### 修改 5: [W4] 修复 interview_failures 重置逻辑

**文件**: `systems/narrative/stories/emma.ts`
**位置**: simulationRules THRESHOLD（第348-360行）
**类型**: 修改

**原代码**:
```typescript
{
    type: 'THRESHOLD',
    condition: { variable: 'stage', operator: '==', value: 3 },
    targetVar: 'interview_failures',
    operator: '>=',
    value: 3,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_3x', delayDays: 0 },
        { type: 'MOD_VAR', target: 'interview_failures', value: 0, op: 'SET' }
    ],
    triggerLog: "连续面试失败，信心受挫"
},
```

**目标代码**:
```typescript
{
    type: 'THRESHOLD',
    condition: { variable: 'stage', operator: '==', value: 3 },
    targetVar: 'interview_failures',
    operator: '>=',
    value: 3,
    onTrigger: [
        { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_3x', delayDays: 0 }
        // 移除重置：避免重复触发 failures==1 和 failures==2 的邮件
    ],
    triggerLog: "连续面试失败，信心受挫"
},
```

**修改说明**: 移除 `interview_failures` 的重置，避免重复触发"第一次失败"和"第二次失败"的邮件。让失败次数持续累加，后续可以在 6 次、9 次时触发不同内容（如需要）。

---

### 修改 6: [I1] 修复 fateHints 性别错误

**文件**: `systems/narrative/stories/emma.ts`
**位置**: fateHints[0].hints[1]（第200行）
**类型**: 修改

**原代码**:
```typescript
{
    condition: { variable: 'hope', operator: '>=', value: 80 },
    priority: 10,
    hints: [
        '（她的步伐轻快，嘴角甚至带着一丝若有若无的微笑）',
        '（看起来即使在阴雨天，他的心情也很不错）',
        '（眼神里有了光彩，不再像上次那样躲闪）'
    ]
},
```

**目标代码**:
```typescript
{
    condition: { variable: 'hope', operator: '>=', value: 80 },
    priority: 10,
    hints: [
        '（她的步伐轻快，嘴角甚至带着一丝若有若无的微笑）',
        '（看起来即使在阴雨天，她的心情也很不错）',
        '（眼神里有了光彩，不再像上次那样躲闪）'
    ]
},
```

**修改说明**: 艾玛是女性，应该用"她"而非"他"。

---

### 修改 7: [C1] 新增到期日相关邮件模板

**文件**: `systems/narrative/stories/emma.ts`
**位置**: EMMA_MAILS（在现有邮件后添加）
**类型**: 新增

**目标代码**:
```typescript
"mail_emma_expiry_plea": {
  id: "mail_emma_expiry_plea",
  sender: "艾玛",
  subject: "关于那套衣服...",
  body: `老板，\n\n我知道典当期快到了。\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那套衣服对我真的很重要——如果拿到offer，入职第一天必须穿它。请千万不要把它挂牌出售，再宽限我几天。\n\n拜托了。\n\n艾玛`,
  attachments: { cash: 0 }
},
"mail_emma_renewal_thanks": {
  id: "mail_emma_renewal_thanks",
  sender: "艾玛",
  subject: "谢谢你愿意等我",
  body: `老板，\n\n谢谢你同意续当。\n\n我知道这不符合规矩，但你还是愿意帮我。这个世界上好人不多了。\n\n我会努力的。一定会回来赎的。\n\n艾玛`,
  attachments: { cash: 0 }
},
"mail_emma_renewal_rejected": {
  id: "mail_emma_renewal_rejected",
  sender: "艾玛",
  subject: "我理解...",
  body: `老板，\n\n我理解你的决定。毕竟这是生意。\n\n只是... 那套衣服对我真的很重要。如果它被卖掉了...\n\n算了，也许这就是我的命。\n\n艾玛`,
  attachments: { cash: 0 }
},
```

**修改说明**: 为到期日机制准备邮件内容。这些邮件将在系统支持到期日处理后被调度。

---

## 验证清单

- [x] 修改 1: `mail_emma_hate` 内容修复
- [x] 修改 2: `emma_04` 四选项完整
- [x] 修改 3: `emma_02` deal_standard hope 修改
- [x] 修改 4: `emma_03` deal_standard hope 修改
- [x] 修改 5: interview_failures 不再重置
- [x] 修改 6: fateHints 性别修复
- [x] 修改 7: 新邮件模板添加

---

## 关于到期日机制（C1）

**到期日处理是系统级功能，需要引擎支持。** 当前修改只准备了邮件内容。

完整实现需要：
1. `types.ts` 中添加 `EXPIRY_CHECK` 事件类型
2. `useGameEngine.ts` 中添加到期日检测逻辑
3. `usePawnShop.ts` 中添加续当/绝当处理
4. `emma.ts` 中添加 `expiryFlows` 定义

这部分需要单独的实现计划。

---

## 状态标记规范

- `⏳ 待实现` - 新增的修改项
- `✅ 已完成` - 已实现并验证
- `🔄 进行中` - 正在实现
- `❌ 已取消` - 设计变更导致取消

---

*此实施计划基于 2026-01-27 的路径验证报告生成*

---

# 第二批修改清单（2026-01-27 v2）

以下修改基于 `/story-validator emma` 和 `/story-improve emma` 的综合分析。

---

## 修改概览（新增）

| 序号 | 修改位置 | 修改类型 | 优先级 | 状态 |
|------|----------|----------|--------|------|
| S1 | `emma_03_laptop.expiryFlows` | 事件新增 | P0 | ✅ 已完成 |
| S2 | `emma_03_laptop.onReject` | 事件修改 | P0 | ✅ 已完成 |
| S3 | `EMMA_MAILS` | 邮件新增(6封) | P0 | ✅ 已完成 |
| S4 | `emma_01_clothes.onReject` | 事件修改 | P1 | ✅ 已完成 |
| S5 | `emma_02_skincare.expiryFlows` | 事件新增 | P1 | ✅ 已完成 |
| S6 | `simulationRules` (hope阈值) | 规则修改 | P1 | ✅ 已完成 |
| S7 | 对话修改(3处) | 对话修改 | P1 | ✅ 已存在 |
| S8 | `emma_05_redemption.onFailure` | 事件修改 | P2 | ✅ 已完成 |
| S9 | `fateHints` | 提示新增 | P2 | ✅ 已存在 |
| S10 | `fateHints` 性别修复 | 文本修改 | P2 | ✅ 已完成 |

---

## S1: [P0] emma_03_laptop 添加 expiryFlows

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_03_laptop` 事件（约第628行后）
**类型**: 新增字段

**目标代码**（在 `onReject` 后添加）:
```typescript
    onReject: [
        { type: "SET_STAGE", value: 4 }, // 修改：直接崩溃
        { type: "MODIFY_VAR", variable: "hope", value: 10 },
        { type: "MODIFY_VAR", variable: "has_laptop", value: 1 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_rejected", delayDays: 0 }
    ],
    coreItemId: "emma_item_laptop",
    expiryFlows: {
      redemption: {
        accept: [
          { type: "MODIFY_VAR", variable: "hope", value: 20 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_renewal_thanks", delayDays: 0 }
        ],
        chargeExtra: [
          { type: "MODIFY_VAR", variable: "hope", value: -15 },
          { type: "MODIFY_VAR", variable: "funds", value: -100 }
        ],
        refuse: [
          { type: "MODIFY_VAR", variable: "hope", value: -40 },
          { type: "SET_STAGE", value: 4 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_renewal_refused", delayDays: 0 }
        ]
      },
      renewal: {
        accept: [
          { type: "MODIFY_VAR", variable: "hope", value: 15 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_renewal_thanks", delayDays: 0 }
        ],
        refuse: [
          { type: "MODIFY_VAR", variable: "hope", value: -35 },
          { type: "SET_STAGE", value: 4 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_renewal_refused", delayDays: 0 }
        ]
      },
      noShow: {
        sell: [
          { type: "MODIFY_VAR", variable: "hope", value: -60 },
          { type: "SET_STAGE", value: 4 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_sold", delayDays: 0 }
        ],
        keep: [
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_plea", delayDays: 0 }
        ]
      }
    }
```

**修改说明**:
- 笔记本是艾玛的"命根子"，到期被卖应触发致命后果
- `noShow.sell` 直接进入 Stage 4（崩溃路径）
- 添加 `coreItemId` 标记这是核心物品

---

## S2: [P0] emma_03_laptop.onReject 致命后果

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_03_laptop.onReject`（约第714行）
**类型**: 修改

**原代码**:
```typescript
    onReject: [
        { type: "SET_STAGE", value: 3 },
        { type: "MODIFY_VAR", variable: "hope", value: 10 },
        { type: "MODIFY_VAR", variable: "has_laptop", value: 1 } // She keeps laptop but has no money
    ]
```

**目标代码**:
```typescript
    onReject: [
        { type: "SET_STAGE", value: 4 }, // 致命：直接进入崩溃路径
        { type: "MODIFY_VAR", variable: "hope", value: 10 },
        { type: "MODIFY_VAR", variable: "has_laptop", value: 1 },
        { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_rejected", delayDays: 0 }
    ]
```

**修改说明**:
- 拒绝收她的笔记本 = 她没有钱也没有工具完成面试作业
- 这是致命选择，直接进入崩溃路径
- 添加邮件反馈让玩家知道后果

---

## S3: [P0] 新增 6 封邮件模板

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_MAILS` 对象末尾（约第196行后）
**类型**: 新增

**目标代码**:
```typescript
  // === 新增：拒绝路径邮件 ===
  "mail_emma_01_rejected": {
    id: "mail_emma_01_rejected",
    sender: "艾玛",
    subject: "也许我太骄傲了",
    body: `老板，\n\n我带着衣服去了别家。\n\n那家给的更少。老板娘上下打量我，说"这种衣服现在不好卖"。\n\n我最后还是当了。比你开的价低30%。\n\n也许... 我不该那么骄傲。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_laptop_rejected": {
    id: "mail_emma_laptop_rejected",
    sender: "艾玛",
    subject: "我完了",
    body: `老板，\n\n你不收我的电脑，我理解。也许它真的不值什么钱。\n\n可是没有它，我做不了面试作业。\n下周一就是截止日期了。\n\n我想过去网吧，但网吧的电脑没有我需要的软件。\n我想过借，但我不知道还能向谁开口。\n\n也许这就是命吧。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  // === 新增：笔记本到期邮件 ===
  "mail_emma_laptop_sold": {
    id: "mail_emma_laptop_sold",
    sender: "艾玛",
    subject: "你怎么能...！",
    body: `你卖了我的电脑？！\n\n里面有我所有的作品集！有我三年的心血！\n我说过千万别动里面的文件！\n\n我求过你的... 我求过你的...\n\n你和其他人没什么两样。这个世界从来就不会帮我。`,
    attachments: { cash: 0 }
  },
  "mail_emma_laptop_plea": {
    id: "mail_emma_laptop_plea",
    sender: "艾玛",
    subject: "千万别卖电脑",
    body: `老板，\n\n我算了一下，电脑的典当期快到了。\n\n我知道我还没凑够赎金。面试结果还没出来。\n\n但求你千万别把它卖掉。我的作品集还在里面。那是我唯一的机会了。\n\n再等我几天。求你了。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_laptop_renewal_thanks": {
    id: "mail_emma_laptop_renewal_thanks",
    sender: "艾玛",
    subject: "谢谢你等我",
    body: `老板，\n\n谢谢你同意续当。\n\n我知道按规矩你不该等我，但你还是愿意帮我。\n\n电脑对我真的很重要。我会努力的。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_laptop_renewal_refused": {
    id: "mail_emma_laptop_renewal_refused",
    sender: "艾玛",
    subject: "我理解...",
    body: `老板，\n\n我理解你的决定。毕竟这是生意。\n\n只是... 那台电脑里有我所有的东西。\n\n也许这就是我的命。\n\n艾玛`,
    attachments: { cash: 0 }
  }
```

**修改说明**:
- 填补 reject 路径和到期路径的感知空白
- 每封邮件对应特定触发场景，有明确的情感定位

---

## S4: [P1] emma_01_clothes.onReject 添加邮件

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_01_clothes.onReject`（约第503行）
**类型**: 修改

**原代码**:
```typescript
    onReject: [{ type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 40 }],
```

**目标代码**:
```typescript
    onReject: [
      { type: "SET_STAGE", value: 1 },
      { type: "MODIFY_VAR", variable: "hope", value: 40 },
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_rejected", delayDays: 0 }
    ],
```

**修改说明**: 拒绝路径需要邮件反馈，让玩家知道艾玛之后去了哪里

---

## S5: [P1] emma_02_skincare 添加 expiryFlows

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_02_skincare` 事件末尾（约第625行后）
**类型**: 新增字段

**目标代码**（在 `onReject` 后添加）:
```typescript
    onReject: [{ type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: 30 }],
    expiryFlows: {
      redemption: {
        accept: [
          { type: "MODIFY_VAR", variable: "hope", value: 10 }
        ],
        chargeExtra: [
          { type: "MODIFY_VAR", variable: "hope", value: -5 },
          { type: "MODIFY_VAR", variable: "funds", value: -30 }
        ],
        refuse: [
          { type: "MODIFY_VAR", variable: "hope", value: -15 }
        ]
      },
      renewal: {
        accept: [
          { type: "MODIFY_VAR", variable: "hope", value: 8 }
        ],
        refuse: [
          { type: "MODIFY_VAR", variable: "hope", value: -10 }
        ]
      },
      noShow: {
        sell: [
          { type: "MODIFY_VAR", variable: "hope", value: -20 }
          // 面霜不是核心物品，影响较小，无专门邮件
        ],
        keep: []
      }
    }
```

**修改说明**: 面霜不是核心物品，到期处理影响较小，但仍需要定义以保持结构完整

---

## S6: [P1] 邮件触发互斥修复

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_CHAIN_INIT.simulationRules` → hope ≤ 15 规则（约第407行）
**类型**: 修改

**原代码**:
```typescript
      // Pre-breakdown Warning Mail (男友即将离开的预警)
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '<', value: 5 },
          targetVar: 'hope',
          operator: '<=',
          value: 15,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_coming_for_ring', delayDays: 0 }
          ],
          triggerLog: "男友即将离开的预警"
      }
```

**目标代码**:
```typescript
      // Pre-breakdown Warning Mail (男友即将离开的预警)
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '<', value: 5 },
          // 添加：排除已经崩溃的情况
          additionalCondition: { variable: 'hope', operator: '>=', value: 10 },
          targetVar: 'hope',
          operator: '<=',
          value: 15,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_coming_for_ring', delayDays: 0 }
          ],
          triggerOnce: true, // 添加：只触发一次
          triggerLog: "男友即将离开的预警"
      }
```

**修改说明**:
- 添加 `additionalCondition` 排除 hope < 10 的情况，避免与崩溃邮件同时触发
- 添加 `triggerOnce: true` 防止重复触发
- **注意**：需要确认引擎是否支持 `additionalCondition` 和 `triggerOnce`，如不支持需要用其他方式实现

---

## S7: [P1] 叙事碎片对话修改（3处）

### S7.1: emma_01_clothes.exitDialogues.neutral

**位置**: `EMMA_EVENTS[0].template.dialogue.exitDialogues.neutral`
**类型**: 修改

**原代码**:
```typescript
            neutral: "回见。帮我保管好它。",
```

**目标代码**:
```typescript
            neutral: "回见。帮我保管好它。——啊，得赶紧回去了，他不喜欢我在外面待太久。",
```

### S7.2: emma_02_skincare.greeting 添加变体

**位置**: `EMMA_EVENTS[1].template.dialogue.greeting`
**类型**: 修改

**原代码**:
```typescript
        greeting: [
            { condition: { variable: "hope", operator: "<", value: 50 }, text: "老板... 没想到这么快又见面了。（声音低沉）" },
            { condition: { variable: "hope", operator: ">=", value: 50 }, text: "老板！又见面了。只是暂时周转一下。" },
            { text: "老板，又见面了。" }
        ],
```

**目标代码**:
```typescript
        greeting: [
            { condition: { variable: "hope", operator: "<", value: 50 }, text: "老板... 没想到这么快又见面了。（声音低沉）" },
            { condition: { variable: "hope", operator: ">=", value: 50 }, text: "老板！又见面了。只是暂时周转一下。" },
            { condition: { variable: "hope", operator: "<", value: 60 }, text: "老板，又见面了。（她下意识看了眼手机）他问我几点回去..." },
            { text: "老板，又见面了。" }
        ],
```

### S7.3: emma_03_laptop.exitDialogues.resentful 添加变体

**位置**: `EMMA_EVENTS[2].template.dialogue.exitDialogues.resentful`
**类型**: 修改

**原代码**:
```typescript
            resentful: [
                { condition: { variable: "hope", operator: "<", value: 25 }, text: "[眼神空洞] 也许... 他说得对，我就是个拖累。什么都做不好。" },
                { text: "..." }
            ],
```

**目标代码**:
```typescript
            resentful: [
                { condition: { variable: "hope", operator: "<", value: 25 }, text: "[眼神空洞] 也许... 他说得对，我就是个拖累。什么都做不好。" },
                { condition: { variable: "hope", operator: "<", value: 40 }, text: "[低声] 他总说我太敏感... 也许真的是我想太多了。" },
                { text: "..." }
            ],
```

**修改说明**:
- S7.1: 铺垫男友控制行为的早期模糊信号
- S7.2: 对话层碎片，"他问我几点回去"暗示控制
- S7.3: 放宽内化表现的触发条件，让更多玩家能看到 gaslighting 语言

---

## S8: [P2] emma_05_redemption.onFailure 使用 mail_emma_redeem_failed

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_EVENTS` → `emma_05_redemption`（约第793行）
**类型**: 修改

**原代码**:
```typescript
    failureMailId: "mail_emma_plea",
    onFailure: [{ type: "MODIFY_VAR", variable: "hope", value: -10 }],
```

**目标代码**:
```typescript
    failureMailId: "mail_emma_plea",
    onFailure: [
      { type: "MODIFY_VAR", variable: "hope", value: -10 },
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_redeem_failed", delayDays: 0 }
    ],
```

**修改说明**: 利用已定义但未使用的 `mail_emma_redeem_failed` 邮件

---

## S9: [P2] fateHints 补充身体语言暗示

**文件**: `systems/narrative/stories/emma.ts`
**位置**: `EMMA_CHAIN_INIT.fateHints` 数组末尾（约第313行后）
**类型**: 新增

**目标代码**:
```typescript
      // --- PSYCHOLOGICAL STATE (隐性压力暗示) ---
      {
          condition: { variable: 'hope', operator: '<=', value: 30 },
          priority: 9,
          hints: [
              '（她说话时总是下意识看向地面，好像在躲避什么）',
              '（每说完一句话都要停顿一下，像是在确认自己有没有说错）',
              '（她的肩膀微微向内缩，整个人看起来比上次更小了）'
          ]
      },
      {
          condition: { variable: 'hope', operator: '<=', value: 40 },
          priority: 7,
          hints: [
              '（她的指甲缝有咬过的痕迹，边缘参差不齐）',
              '（她不时看一眼手机，又马上把它塞回口袋）',
              '（她的笑容持续不到一秒就消失了）'
          ]
      }
```

**修改说明**:
- 这些 fateHints 已在原文件中存在（约第295-312行）
- 确认已实现，标记为 ✅
- 如发现缺失，按上述代码补充

---

## 验证清单（第二批）

### 代码验证
- [ ] S1: emma_03_laptop.expiryFlows 添加完成
- [ ] S2: emma_03_laptop.onReject 修改完成
- [ ] S3: 6封新邮件添加到 EMMA_MAILS
- [ ] S4: emma_01_clothes.onReject 添加邮件调度
- [ ] S5: emma_02_skincare.expiryFlows 添加完成
- [ ] S6: hope阈值规则添加互斥条件
- [ ] S7.1-S7.3: 3处对话修改完成
- [ ] S8: emma_05 onFailure 添加邮件调度
- [ ] S9: fateHints 身体语言暗示已存在/已补充
- [ ] TypeScript 编译无错误

### 游戏内验证
- [ ] 笔记本到期 → 收到 mail_emma_laptop_plea（keep）或 mail_emma_laptop_sold（sell）
- [ ] 笔记本 reject → 收到 mail_emma_laptop_rejected + 进入 Stage 4
- [ ] 职业套装 reject → 收到 mail_emma_01_rejected
- [ ] hope 从 16 跌到 8 时，只收到 mail_emma_boyfriend_left，不收到 mail_emma_coming_for_ring
- [ ] emma_01 neutral exitDialogue 显示"他不喜欢我在外面待太久"
- [ ] emma_02 greeting 在 50 ≤ hope < 60 时显示"他问我几点回去"
- [ ] emma_03 resentful exitDialogue 在 25 ≤ hope < 40 时显示"他总说我太敏感"

### 玩家感知验证
- [ ] 拒绝笔记本 → 玩家知道这导致了艾玛的崩溃
- [ ] 卖掉笔记本 → 玩家知道艾玛失去了最后的希望
- [ ] 男友碎片 → 玩家能在回顾时拼凑出"精神控制"真相

---

## 实施顺序建议

1. **第一步**：添加 6 封新邮件模板（S3）— 其他修改依赖这些邮件
2. **第二步**：修改 emma_03_laptop（S1, S2）— P0 优先级
3. **第三步**：修改 emma_01_clothes.onReject（S4）
4. **第四步**：添加 emma_02_skincare.expiryFlows（S5）
5. **第五步**：修复邮件触发互斥（S6）
6. **第六步**：对话修改（S7.1-S7.3）
7. **第七步**：emma_05 onFailure 修改（S8）
8. **第八步**：确认 fateHints（S9）

---

## 引擎依赖确认

以下功能需要确认引擎是否支持：

| 功能 | 使用位置 | 备选方案 |
|------|----------|----------|
| `expiryFlows` | S1, S5 | 需要 expiry-system-implementation.md 完成 |
| `additionalCondition` | S6 | 用状态变量标记是否已触发 |
| `triggerOnce` | S6 | 在 onTrigger 中设置标记变量 |
| `coreItemId` | S1 | 用于 dynamicFlows 判断，需引擎支持 |

---

*此实施计划基于 2026-01-27 的综合分析生成，包含叙事改进和结构性修复*
