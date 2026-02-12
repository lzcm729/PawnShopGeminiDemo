# 实现文档模板

按以下结构生成代码实现文档：

```markdown
# [NPC名称] 故事线改进 - 实现文档

> 生成时间：[日期]
> 关联设计文档：[chain_name]-improvement.md
> 目标文件：systems/narrative/stories/[chain_name].ts

---

## 修改概览

| 序号 | 修改位置 | 修改类型 | 状态 |
|------|----------|----------|------|
| 1 | [事件ID.字段名] | 对话修改 | ⏳ 待实现 |
| 2 | [MAILS数组] | 邮件新增 | ⏳ 待实现 |

---

## 详细修改清单

### 修改 1: [简要描述]

**文件**: `systems/narrative/stories/[chain_name].ts`
**位置**: `[事件ID]` → `[字段路径]`
**类型**: 修改

**原代码**:
```typescript
exitDialogues: {
    grateful: "谢谢你。",
    neutral: "好的。",
    resentful: "..."
}
```

**目标代码**:
```typescript
exitDialogues: {
    grateful: [
        { condition: { variable: "hope", operator: ">=", value: 60 },
          text: "谢谢！我回去告诉他这个好消息！" },
        { text: "谢谢你。" }
    ],
    neutral: [
        { condition: { variable: "hope", operator: "<", value: 40 },
          text: "他不喜欢我在外面待太久..." },
        { text: "好的。" }
    ],
    resentful: "..."
}
```

**修改说明**:
- 对应改进计划 2.1 节"填补感知盲区"
- 通过 exitDialogues 条件变体铺垫男友关系
- 低 hope 时暗示控制行为，高 hope 时暗示支持关系

---

### 修改 2: [新增邮件模板]

**文件**: `systems/narrative/stories/[chain_name].ts`
**位置**: `[CHAIN]_MAILS` 数组末尾
**类型**: 新增

**新增代码**:
```typescript
{
    id: 'mail_[chain]_[stage]_[purpose]',
    sender: '[NPC名称]',
    subject: '[邮件主题]',
    body: `[邮件正文，使用模板字符串]`,
    category: 'personal'
}
```

**修改说明**: 填补 Stage X 到 Stage Y 之间的信息空白

---

### 修改 3: [邮件调度规则]

**文件**: `systems/narrative/stories/[chain_name].ts`
**位置**: `simulationRules` 数组
**类型**: 新增

**新增代码**:
```typescript
{
    type: 'THRESHOLD',
    condition: {
        variable: '[变量名]',
        operator: '<=',
        value: [阈值]
    },
    trigger: 'ONCE',
    outcome: {
        type: 'SCHEDULE_MAIL',
        mailId: 'mail_[chain]_[stage]_[purpose]',
        delayDays: [延迟天数]
    }
}
```

**修改说明**: 当 [变量] 达到阈值时触发邮件发送

---

## 验证清单

### 代码验证
- [ ] 所有修改项代码已更新
- [ ] TypeScript 编译无错误
- [ ] 变量名和邮件 ID 拼写正确

### 游戏内验证
- [ ] 启动游戏无报错
- [ ] NPC 对话正常显示
- [ ] 条件变体根据变量正确切换
- [ ] 邮件按预期时机发送

### 玩家感知验证
- [ ] 路径A（善待）：[具体验证点]
- [ ] 路径B（剥削）：[具体验证点]
- [ ] 隐藏信息的碎片化铺垫有效
```

---

## 模板使用说明

1. **修改概览表** - 让读者快速了解改动范围
2. **精确定位** - 文件路径 + 对象/数组名 + 字段路径
3. **完整代码** - 可直接复制粘贴，无需额外查找
4. **修改说明** - 关联改进计划，说明"为什么"
5. **验证清单** - 确保改动生效且符合预期

## 状态标记

| 标记 | 含义 |
|------|------|
| ⏳ 待实现 | 新增修改项，尚未开始 |
| 🔄 进行中 | 正在实现 |
| ✅ 已完成 | 已实现并通过验证 |
| ❌ 已取消 | 设计变更导致取消 |
| ⚠️ 需确认 | 实现有疑问，需讨论 |

## 代码定位技巧

### 事件定位
```
[CHAIN]_EVENTS 数组 → 找到 id: '[event_id]' → 找到目标字段
```

### 邮件定位
```
[CHAIN]_MAILS 数组 → 按 id 查找或在末尾新增
```

### 规则定位
```
[CHAIN]_CHAIN_INIT.simulationRules 数组 → 按类型和条件查找
```

### fateHints 定位
```
[CHAIN]_CHAIN_INIT.fateHints 数组 → 按 variable 查找
```
