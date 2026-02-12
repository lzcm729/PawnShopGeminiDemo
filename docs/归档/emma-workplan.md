# 艾玛事件链修复工作计划

> 基于：emma-improvement.md v2
> 创建时间：2026-01-26

---

## 工作概览

| 阶段 | 任务数 | 优先级 | 预计影响文件 |
|------|--------|--------|--------------|
| Phase 1: 资金系统修复 | 2 | 致命 | reducer, useGameEngine |
| Phase 2: 变量语义统一 | 4 | 高 | emma.ts |
| Phase 3: 分支逻辑完善 | 2 | 高 | emma.ts, engine.ts |
| Phase 4: 细节优化 | 2 | 低 | emma.ts |

---

## Phase 1: 资金系统修复 [致命]

### 任务 1.1: 定位当金处理逻辑

**目标**：找到 `ADD_FUNDS_DEAL` 的处理位置

**步骤**：
1. 搜索 `ADD_FUNDS_DEAL` 在 reducer 或 hooks 中的处理逻辑
2. 确认当前实现：玩家账户如何增加、当金金额从哪里获取
3. 记录需要修改的具体文件和行号

**验证**：列出所有处理 `ADD_FUNDS_DEAL` 的代码位置

---

### 任务 1.2: 实现当金同步到 NPC funds

**目标**：当玩家收到当金时，同步更新关联 NPC 的 `funds` 变量

**修改位置**：`store/GameContext.tsx` 或 `hooks/useGameEngine.ts`

**实现逻辑**：
```typescript
// 伪代码
case "ADD_FUNDS_DEAL":
  const pawnAmount = /* 从交易中获取当金金额 */;

  // 1. 玩家收钱（已有逻辑）
  newState.stats.funds += pawnAmount;

  // 2. NPC 收钱（新增逻辑）
  if (currentCustomer?.chainId) {
    const chain = newState.activeChains.find(c => c.id === currentCustomer.chainId);
    if (chain) {
      chain.variables.funds = (chain.variables.funds || 0) + pawnAmount;
    }
  }
```

**验证**：
- [ ] 完成 emma_01 交易后，检查 chain.variables.funds 是否增加
- [ ] 控制台打印 funds 值确认

---

## Phase 2: 变量语义统一 [高]

### 任务 2.1: 修改 emma_01_clothes 的 hope 初始化

**目标**：第一个事件保持用 `value` 设置基线，作为特例

**当前代码** (emma.ts 第121-124行)：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", value: 70 }, ...],
  "deal_shark":    [..., { type: "MODIFY_VAR", variable: "hope", value: 40 }, ...],
}
```

**修改为**：保持不变（这是设置基线值，用 value 是正确的）

---

### 任务 2.2: 修改 emma_02_skincare 的 hope 调整

**目标**：改用 `delta` 增量模式

**当前代码** (emma.ts 第177-181行)：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", value: 10 }, ...],
  "deal_shark":    [..., { type: "MODIFY_VAR", variable: "hope", value: -15 }, ...],
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", delta: 10 }, ...],
  "deal_aid":      [..., { type: "MODIFY_VAR", variable: "hope", delta: 0 }, ...],
  "deal_standard": [..., { type: "MODIFY_VAR", variable: "hope", delta: -5 }, ...],
  "deal_shark":    [..., { type: "MODIFY_VAR", variable: "hope", delta: -15 }, ...],
}
```

---

### 任务 2.3: 修改 emma_03b_struggle 的 hope 调整

**当前代码** (emma.ts 第376-379行)：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", value: 8 }, ...],
  ...
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", delta: 8 }, ...],
  "deal_aid":      [..., { type: "MODIFY_VAR", variable: "hope", delta: 3 }, ...],
  "deal_standard": [..., { type: "MODIFY_VAR", variable: "hope", delta: -3 }, ...],
  "deal_shark":    [..., { type: "MODIFY_VAR", variable: "hope", delta: -10 }, ...],
}
```

---

### 任务 2.4: 修改 emma_04_ring 的 hope 调整

**当前代码** (emma.ts 第426-429行)：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", value: 5 }, ...],
  ...
}
```

**修改为**：
```typescript
outcomes: {
  "deal_charity":  [..., { type: "MODIFY_VAR", variable: "hope", delta: 5 }, ...],
  "deal_aid":      [..., { type: "MODIFY_VAR", variable: "hope", delta: 0 }, ...],
  "deal_standard": [..., { type: "MODIFY_VAR", variable: "hope", delta: -5 }, ...],
  "deal_shark":    [..., { type: "MODIFY_VAR", variable: "hope", delta: -15 }, ...],
}
```

---

## Phase 3: 分支逻辑完善 [高]

### 任务 3.1: 放宽 emma_03b_struggle 触发条件

**目标**：让"挣扎阶段"事件更容易触发

**当前代码** (emma.ts 第333行)：
```typescript
{ variable: "funds", operator: ">", value: 0 }
```

**修改为**：
```typescript
{ variable: "funds", operator: ">", value: -500 }
```

**设计意图**：允许小额负债时仍可触发此事件，给玩家更多叙事体验

---

### 任务 3.2: 实现 hostile_takeover 触发逻辑

**目标**：当玩家强制出售未到期物品时，触发愤怒分支

**修改文件**：`systems/narrative/engine.ts`

**修改函数**：`resolveRedemptionFlow`

**新增逻辑**：
```typescript
export const resolveRedemptionFlow = (
  event: StoryEvent,
  inventory: Item[],
  dynamicTargetId?: string,
  forceSoldBeforeDue?: boolean  // 新增参数
): { flowKey: string, flow: DynamicFlowOutcome } | null => {
  // ... 现有代码 ...

  let flowKey = "core_lost";

  // 新增：强制出售检测
  if (forceSoldBeforeDue && event.dynamicFlows?.["hostile_takeover"]) {
    flowKey = "hostile_takeover";
  } else if (coreSafe) {
    flowKey = othersSafe ? "all_safe" : "core_safe";
  }

  // ... 现有代码 ...
};
```

**配套修改**：在出售物品的逻辑中，检测并传递 `forceSoldBeforeDue` 标志

---

## Phase 4: 细节优化 [低]

### 任务 4.1: 为 breakdown_timer 添加上限

**当前代码** (emma.ts 第55-63行)：
```typescript
{
  type: 'COMPOUND',
  sourceVar: 'stage',
  operator: '==',
  threshold: 4,
  targetVar: 'breakdown_timer',
  effect: 1,
  logMessage: "绝望在蔓延..."
}
```

**修改为**：
```typescript
{
  type: 'COMPOUND',
  sourceVar: 'stage',
  operator: '==',
  threshold: 4,
  targetVar: 'breakdown_timer',
  effect: 1,
  cap: { min: 0, max: 7 },  // 新增
  logMessage: "绝望在蔓延..."
}
```

---

### 任务 4.2: (可选) 添加被动崩溃过渡事件

**目标**：当 THRESHOLD 触发 (hope<10) 直接跳到 stage 4 时，添加一个过渡事件

**新增事件**：`emma_04b_aftermath`

**触发条件**：
- stage == 4
- 来源是 THRESHOLD（非 emma_04_ring）
- 尚未发生过此事件

**事件内容**：艾玛来店里通知玩家她和男友分手了，不是典当，而是告别/倾诉

---

## 验证清单

### 资金系统验证
- [ ] 完成 emma_01 charity 交易 → funds 应为 ~800
- [ ] 等待 5 天 → funds 应减少到 ~50
- [ ] emma_02 触发 → 确认是因为 funds<=200

### 变量语义验证
- [ ] emma_01 charity → hope = 70 (value 设置)
- [ ] emma_02 charity → hope = 80 (70 + delta 10)
- [ ] emma_02 shark → hope = 55 (70 + delta -15)

### 分支逻辑验证
- [ ] 赎回失败后 funds > -500 → emma_03b_struggle 触发
- [ ] 主动出售未到期电脑 → hostile_takeover 触发

---

## 文件修改汇总

| 文件 | 修改类型 | 任务编号 |
|------|----------|----------|
| `store/GameContext.tsx` 或 reducer | 新增逻辑 | 1.2 |
| `systems/narrative/stories/emma.ts` | 修改参数 | 2.2, 2.3, 2.4, 3.1, 4.1 |
| `systems/narrative/engine.ts` | 新增参数和逻辑 | 3.2 |

---

## 执行顺序建议

```
1. Phase 1 (致命) ──► 2. Phase 2 (高) ──► 3. Phase 3 (高) ──► 4. Phase 4 (低)
      │                    │                    │
      ▼                    ▼                    ▼
   测试资金流           测试hope累积         测试分支触发
```

**注意**：Phase 1 完成前，Phase 2/3 的测试结果可能不准确（因为 funds 条件不工作）
