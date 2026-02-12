---
name: story-playtest
description: >
  交互式故事体验工具 - 以纯文字形式体验事件链故事。
  通过选择推进故事，发现叙事设计问题。
  使用场景：
  (1) 以玩家视角体验完整故事流程，
  (2) 在每个决策点做出选择，观察后果，
  (3) 发现故事的逻辑漏洞、感知盲区、缺失内容。
---

# Story Playtest

交互式故事体验工具 - 以纯文字形式体验事件链故事

## Usage

```
/story-playtest [chain_name]
```

- 不带参数：列出所有可用事件链供选择
- 带 chain_name：直接开始指定故事（如 `/story-playtest emma`）

## 核心理念

**通过实际体验发现问题。** 再完美的设计文档也不如亲自走一遍流程。

## 流程概览

```
Phase 1: 选择事件链
    ↓
Phase 2: 加载故事数据
    ↓
Phase 3: 交互式体验（循环）
    ↓
Phase 4: 复盘总结
```

## Phase 1: 选择事件链

如果用户没有指定事件链，读取 `systems/narrative/stories/` 目录，使用 AskUserQuestion 展示选项：
- `emma` - 艾玛（失业女白领）
- `zhao` - 周守义（退伍老兵）
- `susan` - 苏珊（富太太）
- `lin` - 小林（大学生）

## Phase 2: 加载故事数据

读取对应的故事文件：
1. `systems/narrative/stories/[chain_name].ts` - 主要故事数据
2. 设计文档（如有）：`Designer/事件链参考/叙事构建参考（样例：[name]）.md`

提取关键信息：
- `[NAME]_CHAIN_INIT` - 初始状态和变量
- `[NAME]_EVENTS` - 事件列表
- `[NAME]_MAILS` - 邮件模板
- `simulationRules` - 模拟规则
- `fateHints` - 命运提示

## Phase 3: 交互式体验

### 3.1 时间线管理

维护一个虚拟时间线：
```
currentDay: 1
inventory: [] // 库存物品及到期日
variables: { ...CHAIN_INIT.variables }
stage: 0
```

### 3.2 事件触发

根据 `triggerConditions` 判断哪个事件应该触发：
```typescript
triggerConditions: [
  { variable: "stage", operator: "==", value: X },
  { variable: "funds", operator: "<=", value: Y }
]
```

### 3.3 呈现场景

每个场景包含：
1. **时间标记**：`【Day X】`
2. **场景描述**：NPC 外观、状态（根据 fateHints 动态选择）
3. **物品信息**：名称、历史片段
4. **对话内容**：greeting、pawnReason（根据变量选择条件变体）
5. **典当期限**：物品到期日

### 3.4 决策点类型

使用 `AskUserQuestion` 工具呈现选择。

#### 类型 A：交易决策
```
触发：NPC 带物品典当
选项：
- 慷慨（对应 deal_charity/deal_aid）
- 公平（对应 deal_standard）
- 苛刻（对应 deal_shark）
- 拒绝交易（触发 onReject）
```

#### 类型 B：到期结算
```
触发：物品到期日到达
根据 NPC 状态决定场景：
- NPC 来赎回 → 玩家选择：同意赎回 / 要求额外费用 / 拒绝赎回
- NPC 来续当 → 玩家选择：同意续当 / 拒绝续当
- NPC 不出现（绝当）→ 玩家选择：挂牌出售 / 继续保留
```

#### 类型 C：特殊事件
```
触发：特定条件（如 type: "REDEMPTION_CHECK"）
根据 dynamicFlows 选择场景
```

### 3.5 结果处理

根据玩家选择执行 outcomes：
```typescript
outcomes: {
  "deal_charity": [
    { type: "ADD_FUNDS_DEAL" },
    { type: "SET_STAGE", value: X },
    { type: "MODIFY_VAR", variable: "hope", value: Y },
    { type: "SCHEDULE_MAIL", templateId: "mail_xxx", delayDays: N }
  ]
}
```

更新状态后：
1. 显示即时邮件（delayDays: 0）
2. 推进时间线
3. 显示延迟邮件（当到达对应天数时）
4. 检查下一个事件/到期日

### 3.6 模拟规则执行

每推进一天，执行 `simulationRules`：
- `DELTA`: 固定变量变化
- `CHANCE`: 概率事件（如面试结果）
- `THRESHOLD`: 阈值触发（如崩溃）
- `COMPOUND`: 复合条件

### 3.7 到期日管理

**关键：每件物品的到期日独立管理**

```
库存示例：
- 职业套装（Day 8 到期）
- 面霜礼盒（Day 12 到期）
- 笔记本电脑（Day 17 到期）
```

按时间顺序处理每个到期日，在到期前推进故事事件。

## Phase 4: 复盘总结

故事结束后，输出：

### 4.1 选择记录
```
Day 1 - 职业套装：公平
Day 5 - 面霜：慷慨
Day 8 - 续当：同意
...
```

### 4.2 变量变化轨迹
```
hope: 50 → 60 → 55 → 40 → 10
funds: 500 → 1200 → 800 → 300 → 0
job_chance: 0 → 20 → 20 → 15 → 0
```

### 4.3 发现的问题

引导用户思考：
- 有没有哪个环节感觉突兀？
- 有没有信息缺失导致困惑？
- 结局是否符合预期？因果关系清晰吗？

## 呈现规范

### 场景格式
```markdown
### 【Day X - 标题】

[场景描述]

[NPC外观描述，根据 fateHints 动态选择]

[对话内容]

> "对话原文"

**典当期限：Y天（Day Z 到期）**

---
```

### 邮件格式
```markdown
**Day X - 邮件**

**发件人：[sender]**
**主题：[subject]**

> [body]

---
```

### 决策格式

使用 AskUserQuestion 工具，提供清晰的选项描述。

## 注意事项

1. **保持沉浸感**：用叙事语言呈现，避免暴露技术细节
2. **完整呈现到期日**：每件物品的到期结算都要有对应决策点
3. **邮件按时呈现**：根据 delayDays 在正确的时间显示邮件
4. **条件变体**：对话和描述根据变量选择正确的变体
5. **记录选择**：为复盘保留完整的选择记录
