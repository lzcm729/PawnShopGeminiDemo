# 到期日系统 (Expiry System) 完整实现计划

> 创建时间：2026-01-27
> 目标：实现典当物品的到期日处理机制，让玩家在赎回/续当/绝当场景中做出影响故事走向的决策

---

## 实现进度

| 组件 | 状态 | 文件 |
|------|------|------|
| 类型定义扩展 | ✅ 已完成 | `systems/narrative/types.ts` |
| GameState 扩展 | ✅ 已完成 | `systems/game/types.ts` |
| Reducer actions | ✅ 已完成 | `store/GameContext.tsx` |
| NPC行为决策逻辑 | ✅ 已完成 | `hooks/usePawnShop.ts` |
| 到期事件队列处理 | ✅ 已完成 | `hooks/useGameEngine.ts` |
| ExpiryEventModal UI | ✅ 已完成 | `components/ExpiryEventModal.tsx` |
| App.tsx 集成 | ✅ 已完成 | `App.tsx` |
| Emma expiryFlows | ✅ 已完成 | `systems/narrative/stories/emma.ts` |
| Emma 到期邮件模板 | ✅ 已完成 | `systems/narrative/stories/emma.ts` |

**最近更新**: 2026-01-27 - 完成基础实现，构建验证通过

---

## 概述

### 现状分析

经过代码库探索，发现**基础设施已经存在**：

| 组件 | 状态 | 位置 |
|------|------|------|
| `PawnInfo.dueDate` | ✅ 已有 | `systems/items/types.ts` |
| `ItemStatus.FORFEIT` | ✅ 已有 | `systems/items/types.ts` |
| `checkDailyExpirations()` | ✅ 已有 | `hooks/usePawnShop.ts:112-132` |
| `EXPIRE_ITEMS` action | ✅ 已有 | `store/GameContext.tsx:107` |
| `EXTEND_PAWN` action | ✅ 已有 | `store/GameContext.tsx:105` |
| `interactionType: 'RENEWAL'` | ✅ 已有 | `systems/npc/types.ts:33` |
| Inventory EXPIRING tab | ✅ 已有 | `components/InventoryModal.tsx` |
| 利息计算 | ✅ 已有 | `hooks/usePawnShop.ts:10-29` |

### 缺失部分

| 组件 | 状态 | 说明 |
|------|------|------|
| NPC 到期行为决策 | ❌ 缺失 | 根据 funds/hope 决定赎回/续当/不出现 |
| 玩家到期决策 UI | ❌ 缺失 | 赎回场景的同意/拒绝/加价选项 |
| 故事链到期整合 | ❌ 缺失 | `expiryFlows` 类似 `dynamicFlows` |
| 到期触发邮件 | ❌ 缺失 | 到期前预警、续当结果反馈 |
| 物品命运对故事影响 | ❌ 缺失 | 物品被卖掉后触发坏结局 |

---

## 核心设计

### 到期日场景矩阵

```
物品到期日到达
    ↓
NPC 行为判定（基于 funds/hope/stage）
    ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  场景A: NPC来赎回          场景B: NPC来续当          场景C: NPC不出现  │
│  (funds >= 赎金)           (funds < 赎金 但 hope>30)  (hope <= 30)   │
│                                                     │
│  玩家选择:                 玩家选择:                 玩家选择:       │
│  - 正常赎回                - 同意续当                - 挂牌出售      │
│  - 要求额外费用            - 拒绝续当                - 继续保留      │
│  - 拒绝赎回                                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
    ↓
结果影响故事变量 + 触发邮件 + 更新物品状态
```

### NPC 行为决策规则

```typescript
// 决定 NPC 到期时的行为
function determineExpiryBehavior(chain: EventChainState, item: Item): ExpiryBehavior {
    const { funds, hope } = chain.variables;
    const redemptionCost = calculateRedemptionCost(item);

    // 有钱且有希望 → 来赎回
    if (funds >= redemptionCost.total && hope >= 40) {
        return 'REDEEM';
    }

    // 没钱但有希望 → 来续当
    if (funds < redemptionCost.total && hope > 30) {
        return 'RENEW';
    }

    // 绝望 → 不出现（绝当）
    return 'NO_SHOW';
}
```

---

## 实现步骤

### Phase 1: 类型定义扩展

**文件**: `systems/narrative/types.ts`

```typescript
// ========== 新增类型 ==========

export type ExpiryBehavior = 'REDEEM' | 'RENEW' | 'NO_SHOW';

export interface ExpiryEvent {
    type: 'EXPIRY_CHECK';
    chainId: string;
    itemId: string;
    itemName: string;
    behavior: ExpiryBehavior;
    redemptionCost: {
        principal: number;
        interest: number;
        total: number;
    };
    dueDate: number;
}

export interface ExpiryFlowDefinition {
    // 赎回场景的玩家选项
    redemption?: {
        accept: ChainUpdateEffect[];      // 正常赎回
        chargeExtra: ChainUpdateEffect[]; // 要求额外费用
        refuse: ChainUpdateEffect[];      // 拒绝赎回
    };
    // 续当场景的玩家选项
    renewal?: {
        accept: ChainUpdateEffect[];      // 同意续当
        refuse: ChainUpdateEffect[];      // 拒绝续当
    };
    // 绝当场景的玩家选项
    noShow?: {
        sell: ChainUpdateEffect[];        // 挂牌出售
        keep: ChainUpdateEffect[];        // 继续保留
    };
}

// 扩展 StoryEvent
export interface StoryEvent {
    // ... 现有字段 ...
    expiryFlows?: ExpiryFlowDefinition;   // 新增：到期处理流程
    coreItemId?: string;                   // 新增：标记核心物品（丢失会触发坏结局）
}
```

### Phase 2: Reducer 扩展

**文件**: `store/GameContext.tsx`

```typescript
// ========== 新增 Action Types ==========

type GameAction =
    // ... 现有 actions ...
    | { type: 'TRIGGER_EXPIRY_EVENT'; payload: ExpiryEvent }
    | { type: 'RESOLVE_EXPIRY'; payload: {
        eventId: string;
        choice: 'accept' | 'chargeExtra' | 'refuse' | 'sell' | 'keep';
        effects: ChainUpdateEffect[];
    }}
    | { type: 'MARK_ITEM_SOLD'; payload: { itemId: string; salePrice: number } }
    | { type: 'UPDATE_ITEM_DUE_DATE'; payload: { itemId: string; newDueDate: number } };

// ========== Reducer 实现 ==========

case 'TRIGGER_EXPIRY_EVENT': {
    const { payload: expiryEvent } = action;
    return {
        ...state,
        currentExpiryEvent: expiryEvent,  // 新增 state 字段
        phase: GamePhase.NEGOTIATION      // 切换到谈判阶段处理
    };
}

case 'RESOLVE_EXPIRY': {
    const { eventId, choice, effects } = action.payload;
    let newState = { ...state, currentExpiryEvent: null };

    // 应用 effects（复用现有 effect 处理逻辑）
    effects.forEach(effect => {
        newState = applyChainEffect(newState, effect);
    });

    return newState;
}

case 'MARK_ITEM_SOLD': {
    const { itemId, salePrice } = action.payload;
    return {
        ...state,
        inventory: state.inventory.map(item =>
            item.id === itemId
                ? { ...item, status: ItemStatus.SOLD, salePrice }
                : item
        ),
        stats: { ...state.stats, funds: state.stats.funds + salePrice }
    };
}

case 'UPDATE_ITEM_DUE_DATE': {
    const { itemId, newDueDate } = action.payload;
    return {
        ...state,
        inventory: state.inventory.map(item =>
            item.id === itemId && item.pawnInfo
                ? {
                    ...item,
                    pawnInfo: {
                        ...item.pawnInfo,
                        dueDate: newDueDate,
                        extensionCount: (item.pawnInfo.extensionCount || 0) + 1
                    }
                }
                : item
        )
    };
}
```

### Phase 3: 到期检测增强

**文件**: `hooks/usePawnShop.ts`

```typescript
// ========== 增强 checkDailyExpirations ==========

const checkDailyExpirations = useCallback(() => {
    const currentDay = state.stats.day;
    const expiryEvents: ExpiryEvent[] = [];

    state.inventory.forEach(item => {
        if (item.status !== ItemStatus.ACTIVE || !item.pawnInfo) return;
        if (currentDay !== item.pawnInfo.dueDate) return; // 精确匹配到期日

        // 找到关联的故事链
        const chain = state.activeChains.find(c => c.id === item.relatedChainId);
        if (!chain) {
            // 无故事链的普通物品，直接绝当
            dispatch({ type: 'EXPIRE_ITEMS', payload: {
                expiredItemIds: [item.id],
                logs: [`[系统] ${item.name} 已过期，转为绝当。`]
            }});
            return;
        }

        // 有故事链的物品，触发到期事件
        const behavior = determineExpiryBehavior(chain, item);
        const redemptionCost = calculateRedemptionCost(item);

        expiryEvents.push({
            type: 'EXPIRY_CHECK',
            chainId: chain.id,
            itemId: item.id,
            itemName: item.name,
            behavior,
            redemptionCost: redemptionCost!,
            dueDate: item.pawnInfo.dueDate
        });
    });

    // 返回到期事件供游戏引擎处理
    return expiryEvents;
}, [state.stats.day, state.inventory, state.activeChains, dispatch]);

// ========== NPC 行为判定函数 ==========

const determineExpiryBehavior = (
    chain: EventChainState,
    item: Item
): ExpiryBehavior => {
    const funds = chain.variables.funds ?? 0;
    const hope = chain.variables.hope ?? 50;
    const redemptionCost = calculateRedemptionCost(item);

    if (!redemptionCost) return 'NO_SHOW';

    // 有钱且有希望 → 来赎回
    if (funds >= redemptionCost.total && hope >= 40) {
        return 'REDEEM';
    }

    // 没钱但有希望 → 来续当
    if (funds < redemptionCost.total && hope > 30) {
        return 'RENEW';
    }

    // 绝望或资金极低 → 不出现
    return 'NO_SHOW';
};
```

### Phase 4: 游戏引擎整合

**文件**: `hooks/useGameEngine.ts`

```typescript
// ========== 修改 startNewDay ==========

const startNewDay = useCallback(() => {
    // 1. 处理邮件
    processDailyMail();

    // 2. 检测到期事件（增强版）
    const expiryEvents = checkDailyExpirations();

    // 3. 如果有到期事件，优先处理
    if (expiryEvents.length > 0) {
        // 逐个处理到期事件（存入队列）
        dispatch({ type: 'SET_EXPIRY_QUEUE', payload: expiryEvents });
        dispatch({ type: 'TRIGGER_EXPIRY_EVENT', payload: expiryEvents[0] });
        return; // 暂停日常流程，先处理到期
    }

    // 4. 无到期事件，正常开店
    dispatch({ type: 'TRANSITION_PHASE', payload: GamePhase.BUSINESS });
}, [processDailyMail, checkDailyExpirations, dispatch]);

// ========== 新增：处理到期事件完成 ==========

const completeExpiryEvent = useCallback(() => {
    const queue = state.expiryQueue || [];
    const remaining = queue.slice(1);

    if (remaining.length > 0) {
        // 还有更多到期事件
        dispatch({ type: 'SET_EXPIRY_QUEUE', payload: remaining });
        dispatch({ type: 'TRIGGER_EXPIRY_EVENT', payload: remaining[0] });
    } else {
        // 所有到期事件处理完毕，继续日常
        dispatch({ type: 'CLEAR_EXPIRY_QUEUE' });
        dispatch({ type: 'TRANSITION_PHASE', payload: GamePhase.BUSINESS });
    }
}, [state.expiryQueue, dispatch]);
```

### Phase 5: 到期事件 UI 组件

**文件**: `components/ExpiryEventModal.tsx` (新建)

```typescript
import React from 'react';
import { ExpiryEvent, ExpiryBehavior } from '../systems/narrative/types';
import { useGame } from '../store/GameContext';

interface ExpiryEventModalProps {
    event: ExpiryEvent;
    onResolve: (choice: string, effects: any[]) => void;
}

export const ExpiryEventModal: React.FC<ExpiryEventModalProps> = ({ event, onResolve }) => {
    const { behavior, itemName, redemptionCost } = event;

    // 根据 behavior 渲染不同场景
    return (
        <div className="modal-overlay">
            <div className="modal-content bg-pawn-dark border border-pawn-accent">
                <h2 className="text-xl font-bold text-pawn-accent mb-4">
                    {behavior === 'REDEEM' && `${event.chainId.replace('chain_', '')} 来赎回物品`}
                    {behavior === 'RENEW' && `${event.chainId.replace('chain_', '')} 请求续当`}
                    {behavior === 'NO_SHOW' && `物品到期：${itemName}`}
                </h2>

                {/* 场景描述 */}
                <div className="mb-6 text-gray-300">
                    {renderSceneDescription(event)}
                </div>

                {/* 费用信息 */}
                {behavior !== 'NO_SHOW' && (
                    <div className="mb-4 p-3 bg-gray-800 rounded">
                        <p>本金: ¥{redemptionCost.principal}</p>
                        <p>利息: ¥{redemptionCost.interest}</p>
                        <p className="font-bold text-pawn-green">
                            合计: ¥{redemptionCost.total}
                        </p>
                    </div>
                )}

                {/* 玩家选项 */}
                <div className="space-y-2">
                    {renderPlayerOptions(event, onResolve)}
                </div>
            </div>
        </div>
    );
};

function renderSceneDescription(event: ExpiryEvent): JSX.Element {
    const { behavior, itemName } = event;

    switch (behavior) {
        case 'REDEEM':
            return (
                <p>
                    顾客带着现金来了，想要赎回 <strong>{itemName}</strong>。
                    <br />
                    "老板，我凑够钱了，可以把东西拿回去了吗？"
                </p>
            );
        case 'RENEW':
            return (
                <p>
                    顾客来了，但看起来手头紧张。
                    <br />
                    "老板，我现在还凑不够赎金... 能不能再宽限几天？利息我先付着。"
                </p>
            );
        case 'NO_SHOW':
            return (
                <p>
                    今天是 <strong>{itemName}</strong> 的到期日。
                    <br />
                    你等了一整天，但顾客始终没有出现。
                </p>
            );
    }
}

function renderPlayerOptions(
    event: ExpiryEvent,
    onResolve: (choice: string, effects: any[]) => void
): JSX.Element[] {
    const { behavior } = event;

    switch (behavior) {
        case 'REDEEM':
            return [
                <button key="accept"
                    className="w-full py-2 bg-pawn-green hover:bg-green-600 rounded"
                    onClick={() => onResolve('accept', [])}
                >
                    正常赎回 (收取 ¥{event.redemptionCost.total})
                </button>,
                <button key="extra"
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded"
                    onClick={() => onResolve('chargeExtra', [])}
                >
                    要求额外费用 (+20% 保管费)
                </button>,
                <button key="refuse"
                    className="w-full py-2 bg-red-600 hover:bg-red-500 rounded"
                    onClick={() => onResolve('refuse', [])}
                >
                    拒绝赎回 (物品已被预定/出售)
                </button>
            ];

        case 'RENEW':
            return [
                <button key="accept"
                    className="w-full py-2 bg-pawn-green hover:bg-green-600 rounded"
                    onClick={() => onResolve('accept', [])}
                >
                    同意续当 (延长7天)
                </button>,
                <button key="refuse"
                    className="w-full py-2 bg-red-600 hover:bg-red-500 rounded"
                    onClick={() => onResolve('refuse', [])}
                >
                    拒绝续当 (立即转为绝当)
                </button>
            ];

        case 'NO_SHOW':
            return [
                <button key="sell"
                    className="w-full py-2 bg-pawn-accent hover:bg-amber-600 rounded"
                    onClick={() => onResolve('sell', [])}
                >
                    挂牌出售
                </button>,
                <button key="keep"
                    className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded"
                    onClick={() => onResolve('keep', [])}
                >
                    继续保留 (等待顾客)
                </button>
            ];
    }

    return [];
}
```

### Phase 6: 故事链到期流程定义

**文件**: `systems/narrative/stories/emma.ts` (扩展)

```typescript
// ========== 在 EMMA_EVENTS 中添加 expiryFlows ==========

// 为第一个事件（职业套装）添加到期处理
{
    id: "emma_01_clothes",
    // ... 现有字段 ...
    coreItemId: "emma_item_clothes",  // 标记为核心物品
    expiryFlows: {
        // 赎回场景
        redemption: {
            accept: [
                { type: "MODIFY_VAR", variable: "hope", value: 10 },
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_redeem_thanks", delayDays: 0 },
                { type: "REDEEM_ITEM" }
            ],
            chargeExtra: [
                { type: "MODIFY_VAR", variable: "hope", value: -5 },
                { type: "MODIFY_VAR", variable: "funds", value: -50 },
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_charged_extra", delayDays: 0 },
                { type: "REDEEM_ITEM" }
            ],
            refuse: [
                { type: "MODIFY_VAR", variable: "hope", value: -30 },
                { type: "SET_STAGE", value: 99 },  // 坏结局路径
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_hate", delayDays: 1 },
                { type: "MARK_CORE_LOST" }
            ]
        },
        // 续当场景
        renewal: {
            accept: [
                { type: "MODIFY_VAR", variable: "hope", value: 5 },
                { type: "EXTEND_PAWN", days: 7 },
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_renewal_thanks", delayDays: 0 }
            ],
            refuse: [
                { type: "MODIFY_VAR", variable: "hope", value: -20 },
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_renewal_rejected", delayDays: 0 },
                { type: "FORFEIT_ITEM" }
            ]
        },
        // 绝当场景
        noShow: {
            sell: [
                { type: "SELL_ITEM" },
                { type: "MARK_CORE_LOST" }  // 如果是核心物品，标记丢失
            ],
            keep: [
                { type: "KEEP_FORFEIT" }  // 继续保留，等待可能的回头客
            ]
        }
    }
}
```

### Phase 7: 邮件模板补充

**文件**: `systems/narrative/stories/emma.ts` (邮件部分)

```typescript
// ========== 新增到期相关邮件 ==========

"mail_emma_redeem_thanks": {
    id: "mail_emma_redeem_thanks",
    sender: "艾玛",
    subject: "终于拿回来了",
    body: `老板，\n\n谢谢你帮我保管了这么久。\n\n拿到衣服的时候，我差点哭出来。它对我真的很重要。\n\n下周一就要入职了，一切都在往好的方向发展。\n\n艾玛`,
    attachments: { cash: 0 }
},

"mail_emma_charged_extra": {
    id: "mail_emma_charged_extra",
    sender: "艾玛",
    subject: "额外的费用...",
    body: `老板，\n\n我知道保管费是额外的成本。\n\n只是... 这笔钱本来是打算买入职当天午餐的。算了，先撑过去再说。\n\n艾玛`,
    attachments: { cash: 0 }
},

"mail_emma_renewal_plea": {
    id: "mail_emma_renewal_plea",
    sender: "艾玛",
    subject: "能再等等我吗",
    body: `老板，\n\n我知道明天就到期了。\n\n我真的在努力凑钱。面试结果还没出，但我相信会有好消息的。\n\n求你再给我几天时间。那套衣服对我真的很重要。\n\n艾玛`,
    attachments: { cash: 0 }
}
```

---

## 修改清单

| 序号 | 文件 | 修改类型 | 说明 |
|------|------|----------|------|
| 1 | `systems/narrative/types.ts` | 新增类型 | ExpiryEvent, ExpiryFlowDefinition 等 |
| 2 | `store/GameContext.tsx` | 扩展 reducer | 新增 TRIGGER_EXPIRY_EVENT 等 actions |
| 3 | `hooks/usePawnShop.ts` | 增强函数 | checkDailyExpirations + determineExpiryBehavior |
| 4 | `hooks/useGameEngine.ts` | 整合逻辑 | startNewDay 优先处理到期事件 |
| 5 | `components/ExpiryEventModal.tsx` | 新建组件 | 到期事件 UI |
| 6 | `components/App.tsx` | 整合组件 | 渲染 ExpiryEventModal |
| 7 | `systems/narrative/stories/emma.ts` | 扩展事件 | 添加 expiryFlows |
| 8 | `systems/narrative/stories/emma.ts` | 新增邮件 | 到期相关邮件模板 |

---

## 实现优先级

### P0 - 核心功能 (必须)
1. 类型定义扩展
2. NPC 行为决策逻辑
3. Reducer actions
4. 到期事件 UI 组件

### P1 - 故事整合 (重要)
5. Emma expiryFlows 定义
6. 到期相关邮件
7. 游戏引擎整合

### P2 - 体验优化 (可选)
8. 到期前预警邮件（自动发送）
9. 库存界面到期倒计时
10. 到期事件音效/动画

---

## 验证清单

- [ ] 物品到期日到达时，正确判断 NPC 行为（REDEEM/RENEW/NO_SHOW）
- [ ] 赎回场景：三个选项都能正常执行
- [ ] 续当场景：续当后 dueDate 正确延长
- [ ] 绝当场景：挂牌出售后资金正确增加
- [ ] 核心物品丢失后，触发 dynamicFlows.core_lost
- [ ] 邮件按预期时机发送
- [ ] 多物品同时到期时，逐个处理
- [ ] 到期事件处理完成后，正常继续日常流程

---

## 与现有系统的交互

```
┌─────────────────┐     ┌─────────────────┐
│   Morning       │     │   Expiry        │
│   Brief         │────▶│   Queue         │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ ExpiryEventModal│
                        │   (玩家决策)     │
                        └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   REDEEM      │      │   RENEW       │      │   NO_SHOW     │
│   物品归还     │      │   延长期限     │      │   绝当处理     │
└───────┬───────┘      └───────┬───────┘      └───────┬───────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Story Chain Effects                       │
│   - MODIFY_VAR (hope, funds)                                │
│   - SCHEDULE_MAIL                                           │
│   - SET_STAGE                                               │
│   - dynamicFlows 触发条件更新                                │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────┐
│   Continue to   │
│   BUSINESS      │
└─────────────────┘
```

---

## 附录：完整的 Emma 到期场景示例

### 场景：Day 8 - 职业套装到期

**前置条件**：
- Day 1 艾玛典当职业套装，termDays = 7，dueDate = 8
- 当前 Emma 变量：funds = 300, hope = 55

**NPC 行为判定**：
- `funds (300) < redemptionCost (880)` → 不够赎回
- `hope (55) > 30` → 还有希望
- **结果：RENEW（来续当）**

**玩家看到**：
```
┌──────────────────────────────────────────┐
│            艾玛请求续当                    │
├──────────────────────────────────────────┤
│ 艾玛来了，但看起来手头紧张。              │
│                                          │
│ "老板，我现在还凑不够赎金...              │
│  能不能再宽限几天？利息我先付着。"         │
│                                          │
│ 本金: ¥800                               │
│ 利息: ¥80                                │
│ 合计: ¥880                               │
│                                          │
│ [同意续当 (延长7天)]     [拒绝续当]        │
└──────────────────────────────────────────┘
```

**玩家选择"同意续当"**：
- dueDate 更新为 15 (8 + 7)
- hope +5 → 60
- 发送 mail_emma_renewal_thanks

**玩家选择"拒绝续当"**：
- 物品状态 → FORFEIT
- hope -20 → 35
- 发送 mail_emma_renewal_rejected
- 如果是核心物品，标记 core_lost = true

---

*此实现计划基于现有代码架构设计，最大化复用已有基础设施*
