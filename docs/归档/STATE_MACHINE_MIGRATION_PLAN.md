# 方案 B: 显式状态机迁移计划

## 概述

将当前分散的状态管理重构为集中式显式状态机模式，不引入外部依赖。

**目标**：
- 状态转换逻辑集中到单一文件
- 消除隐式子状态
- 移除 useEffect 驱动的状态转换
- 保持向后兼容，支持增量迁移

**预估工期**：5-7 个工作日

---

## 当前架构分析

### 现状

```
状态定义:
├── systems/core/types.ts    → GamePhase enum (8 个状态)
└── 隐式子状态 (变量组合)    → 约 15+ 种实际状态

状态转换分布:
├── store/reducers/coreReducer.ts       → START_DAY, START_NIGHT, RESOLVE_TRANSACTION...
├── store/reducers/customerReducer.ts   → SET_CUSTOMER (→ NEGOTIATION)
├── store/reducers/expiryReducer.ts     → RESOLVE_EXPIRY
├── hooks/useGameEngine.ts              → startNewDay, generateDailyEvent, performNightCycle
└── App.tsx                             → useEffect 自动触发

Action 类型: ~80+ 种
组件使用 GamePhase: 6 个文件, 17 处引用
```

### 隐式子状态清单

| 当前状态 | 变量组合 | 实际含义 |
|----------|----------|----------|
| BUSINESS | `expiryQueue.length > 0` | 到期结算中 |
| BUSINESS | `!currentCustomer && !isLoading` | 等待生成顾客 |
| BUSINESS | `isLoading` | 正在生成顾客 |
| BUSINESS | `currentCustomer !== null` | 服务顾客中 |
| BUSINESS | `customersServedToday >= max` | 可以打烊 |
| NEGOTIATION | `interactionType === 'PAWN'` | 典当谈判 |
| NEGOTIATION | `interactionType === 'REDEEM'` | 赎回结算 |
| NEGOTIATION | `interactionType === 'RENEWAL'` | 续当请求 |
| NIGHT | `nightState.energy > 0` | 夜间活动中 |
| NIGHT | `performingNightCycle` | 夜间结算中 |

---

## 迁移阶段

### 阶段 0: 准备工作 (0.5 天)

**任务**:
1. 创建功能分支 `feature/explicit-state-machine`
2. 备份当前 `systems/core/types.ts`
3. 创建迁移跟踪文件

**文件变更**:
```
新增:
└── docs/pending-systems/STATE_MACHINE_MIGRATION_PLAN.md  ← 本文件
```

**验证点**:
- [ ] 分支创建成功
- [ ] 游戏当前功能正常

---

### 阶段 1: 类型定义 (0.5 天)

**任务**:
1. 创建新的 Phase 类型 (Discriminated Union)
2. 创建 PhaseEvent 类型
3. 创建类型守卫函数
4. **不修改现有代码**，仅新增文件

**文件变更**:
```
新增:
├── systems/core/phases/types.ts       → GamePhase2, PhaseEvent 类型
├── systems/core/phases/guards.ts      → PhaseIs 类型守卫
└── systems/core/phases/index.ts       → 统一导出
```

**types.ts 内容**:
```typescript
// systems/core/phases/types.ts

// ============================================
// 新的 Phase 类型 (Discriminated Union)
// ============================================

export type GamePhase2 =
    | { type: 'START_SCREEN' }
    | { type: 'MORNING_BRIEF' }
    | { type: 'DAY_START'; subphase: DayStartSubphase }
    | { type: 'BUSINESS'; subphase: BusinessSubphase }
    | { type: 'NEGOTIATION'; mode: NegotiationMode }
    | { type: 'DEPARTURE' }
    | { type: 'NIGHT'; subphase: NightSubphase }
    | { type: 'GAME_OVER'; reason: string }
    | { type: 'VICTORY' };

export type DayStartSubphase =
    | 'EXPIRY_CHECK'
    | 'EXPIRY_SETTLEMENT';

export type BusinessSubphase =
    | 'IDLE'           // 等待生成顾客
    | 'GENERATING'     // 正在生成顾客
    | 'SERVING'        // 服务顾客中
    | 'CLOSED';        // 可以打烊

export type NegotiationMode =
    | 'PAWN'
    | 'REDEEM'
    | 'RENEWAL'
    | 'POST_FORFEIT';

export type NightSubphase =
    | 'ACTIVE'         // 夜间活动
    | 'PROCESSING'     // 执行夜间循环
    | 'EVALUATING';    // 评估结局

// ============================================
// Phase 事件类型
// ============================================

export type PhaseEvent =
    // 开始界面
    | { type: 'NEW_GAME' }
    | { type: 'LOAD_GAME' }

    // 晨间简报
    | { type: 'OPEN_SHOP' }

    // 日间开始
    | { type: 'EXPIRY_CHECK_DONE'; hasExpiry: boolean }
    | { type: 'SETTLEMENT_COMPLETE' }

    // 送客
    | { type: 'DISMISS' }

    // 营业
    | { type: 'CUSTOMER_GENERATED'; hasCustomer: boolean }
    | { type: 'TRANSACTION_COMPLETE' }
    | { type: 'CUSTOMER_REJECTED' }
    | { type: 'CLOSE_SHOP' }

    // 夜间
    | { type: 'END_DAY' }
    | { type: 'NIGHT_CYCLE_DONE' }
    | { type: 'EVALUATION_DONE'; outcome: EvaluationOutcome };

export type EvaluationOutcome =
    | 'continue'
    | 'bankrupt'
    | 'mother_died'
    | 'victory';
```

**guards.ts 内容**:
```typescript
// systems/core/phases/guards.ts

import { GamePhase2, DayStartSubphase, BusinessSubphase, NightSubphase } from './types';

export const PhaseIs = {
    startScreen: (p: GamePhase2): p is { type: 'START_SCREEN' } =>
        p.type === 'START_SCREEN',

    morningBrief: (p: GamePhase2): p is { type: 'MORNING_BRIEF' } =>
        p.type === 'MORNING_BRIEF',

    dayStart: (p: GamePhase2): p is { type: 'DAY_START'; subphase: DayStartSubphase } =>
        p.type === 'DAY_START',

    business: (p: GamePhase2): p is { type: 'BUSINESS'; subphase: BusinessSubphase } =>
        p.type === 'BUSINESS',

    negotiation: (p: GamePhase2): p is { type: 'NEGOTIATION'; mode: any } =>
        p.type === 'NEGOTIATION',

    departure: (p: GamePhase2): p is { type: 'DEPARTURE' } =>
        p.type === 'DEPARTURE',

    night: (p: GamePhase2): p is { type: 'NIGHT'; subphase: NightSubphase } =>
        p.type === 'NIGHT',

    gameOver: (p: GamePhase2): p is { type: 'GAME_OVER'; reason: string } =>
        p.type === 'GAME_OVER',

    victory: (p: GamePhase2): p is { type: 'VICTORY' } =>
        p.type === 'VICTORY',
};

// 复合检查
export const PhaseMatch = {
    dayStartExpiry: (p: GamePhase2) =>
        PhaseIs.dayStart(p) && p.subphase === 'EXPIRY_SETTLEMENT',

    businessIdle: (p: GamePhase2) =>
        PhaseIs.business(p) && p.subphase === 'IDLE',

    businessServing: (p: GamePhase2) =>
        PhaseIs.business(p) && p.subphase === 'SERVING',

    businessClosed: (p: GamePhase2) =>
        PhaseIs.business(p) && p.subphase === 'CLOSED',

    nightActive: (p: GamePhase2) =>
        PhaseIs.night(p) && p.subphase === 'ACTIVE',

    nightProcessing: (p: GamePhase2) =>
        PhaseIs.night(p) && p.subphase === 'PROCESSING',
};
```

**验证点**:
- [ ] TypeScript 编译无错误
- [ ] 新类型文件导出正常
- [ ] 游戏功能不受影响（未使用新类型）

---

### 阶段 2: 状态机核心 (1 天)

**任务**:
1. 创建状态转换规则表
2. 实现 `transition()` 和 `canTransition()` 函数
3. 创建 Action 函数（纯函数，返回状态片段）
4. **不集成到现有系统**

**文件变更**:
```
新增:
├── systems/core/phases/machine.ts     → 状态机核心逻辑
├── systems/core/phases/actions.ts     → Action 纯函数
└── systems/core/phases/transitions.ts → 转换规则表
```

**transitions.ts 内容**:
```typescript
// systems/core/phases/transitions.ts

import { GamePhase2, PhaseEvent } from './types';
import { GameState } from '../../../types';
import * as actions from './actions';

export type TransitionRule = {
    from: (phase: GamePhase2) => boolean;
    event: PhaseEvent['type'];
    guard?: (state: GameState, event: PhaseEvent) => boolean;
    to: (state: GameState, event: PhaseEvent) => GamePhase2;
    effects?: Array<(state: GameState, event: PhaseEvent) => Partial<GameState>>;
};

export const TRANSITIONS: TransitionRule[] = [
    // ========== START_SCREEN ==========
    {
        from: (p) => p.type === 'START_SCREEN',
        event: 'NEW_GAME',
        to: () => ({ type: 'MORNING_BRIEF' }),
        effects: [actions.resetGameState]
    },
    {
        from: (p) => p.type === 'START_SCREEN',
        event: 'LOAD_GAME',
        to: () => ({ type: 'MORNING_BRIEF' }),
        // loadGameState 由外部处理
    },

    // ========== MORNING_BRIEF ==========
    {
        from: (p) => p.type === 'MORNING_BRIEF',
        event: 'OPEN_SHOP',
        to: () => ({ type: 'DAY_START', subphase: 'EXPIRY_CHECK' }),
        effects: [
            actions.deductMaintenanceCost,
            actions.refreshBlackmarket,
            actions.processMailAction
        ]
    },

    // ========== DAY_START: EXPIRY_CHECK ==========
    {
        from: (p) => p.type === 'DAY_START' && p.subphase === 'EXPIRY_CHECK',
        event: 'EXPIRY_CHECK_DONE',
        guard: (_, e) => (e as any).hasExpiry === true,
        to: () => ({ type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' }),
        effects: [actions.createExpiryCustomer]
    },
    {
        from: (p) => p.type === 'DAY_START' && p.subphase === 'EXPIRY_CHECK',
        event: 'EXPIRY_CHECK_DONE',
        guard: (_, e) => (e as any).hasExpiry === false,
        to: () => ({ type: 'BUSINESS', subphase: 'IDLE' }),
        effects: [actions.resetDailyCounters]
    },

    // ========== DAY_START: EXPIRY_SETTLEMENT ==========
    {
        from: (p) => p.type === 'DAY_START' && p.subphase === 'EXPIRY_SETTLEMENT',
        event: 'SETTLEMENT_COMPLETE',
        to: () => ({ type: 'DEPARTURE' })
    },

    // ========== DEPARTURE ==========
    {
        from: (p) => p.type === 'DEPARTURE',
        event: 'DISMISS',
        guard: (state) => state.expiryQueue.length > 1,
        to: () => ({ type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' }),
        effects: [actions.popExpiryQueue, actions.createExpiryCustomer]
    },
    {
        from: (p) => p.type === 'DEPARTURE',
        event: 'DISMISS',
        guard: (state) => state.expiryQueue.length <= 1,
        to: () => ({ type: 'BUSINESS', subphase: 'IDLE' }),
        effects: [actions.clearExpiryQueue, actions.clearCustomer, actions.resetDailyCounters]
    },

    // ========== BUSINESS: IDLE ==========
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'IDLE',
        event: 'CUSTOMER_GENERATED',
        guard: (_, e) => (e as any).hasCustomer === true,
        to: () => ({ type: 'BUSINESS', subphase: 'SERVING' })
        // setCustomer 由外部处理
    },
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'IDLE',
        event: 'CUSTOMER_GENERATED',
        guard: (_, e) => (e as any).hasCustomer === false,
        to: () => ({ type: 'BUSINESS', subphase: 'CLOSED' })
    },

    // ========== BUSINESS: SERVING ==========
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'SERVING',
        event: 'TRANSACTION_COMPLETE',
        to: () => ({ type: 'DEPARTURE' })
        // transaction effects 由外部处理
    },
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'SERVING',
        event: 'CUSTOMER_REJECTED',
        to: () => ({ type: 'DEPARTURE' }),
        effects: [actions.setSatisfactionDesperate]
    },

    // ========== BUSINESS: CLOSED ==========
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'CLOSED',
        event: 'CLOSE_SHOP',
        to: () => ({ type: 'NIGHT', subphase: 'ACTIVE' })
    },

    // ========== NIGHT: ACTIVE ==========
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'ACTIVE',
        event: 'END_DAY',
        to: () => ({ type: 'NIGHT', subphase: 'PROCESSING' })
    },

    // ========== NIGHT: PROCESSING ==========
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'PROCESSING',
        event: 'NIGHT_CYCLE_DONE',
        to: () => ({ type: 'NIGHT', subphase: 'EVALUATING' })
        // nightCycle effects 由外部处理
    },

    // ========== NIGHT: EVALUATING ==========
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as any).outcome === 'continue',
        to: () => ({ type: 'MORNING_BRIEF' }),
        effects: [actions.incrementDay]
    },
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as any).outcome === 'bankrupt',
        to: () => ({ type: 'GAME_OVER', reason: '破产' })
    },
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as any).outcome === 'mother_died',
        to: () => ({ type: 'GAME_OVER', reason: '母亲去世' })
    },
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as any).outcome === 'victory',
        to: () => ({ type: 'VICTORY' })
    },
];
```

**machine.ts 内容**:
```typescript
// systems/core/phases/machine.ts

import { GamePhase2, PhaseEvent } from './types';
import { GameState } from '../../../types';
import { TRANSITIONS, TransitionRule } from './transitions';

export function findTransition(
    phase: GamePhase2,
    event: PhaseEvent,
    state: GameState
): TransitionRule | null {
    return TRANSITIONS.find(rule =>
        rule.from(phase) &&
        rule.event === event.type &&
        (rule.guard?.(state, event) ?? true)
    ) ?? null;
}

export function canTransition(
    phase: GamePhase2,
    event: PhaseEvent,
    state: GameState
): boolean {
    return findTransition(phase, event, state) !== null;
}

export function transition(
    phase: GamePhase2,
    event: PhaseEvent,
    state: GameState
): { nextPhase: GamePhase2; stateUpdates: Partial<GameState> } | null {
    const rule = findTransition(phase, event, state);

    if (!rule) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[StateMachine] Invalid transition: ${JSON.stringify(phase)} + ${event.type}`);
        }
        return null;
    }

    const nextPhase = rule.to(state, event);

    const stateUpdates = rule.effects?.reduce(
        (acc, effect) => ({ ...acc, ...effect(state, event) }),
        {} as Partial<GameState>
    ) ?? {};

    if (process.env.NODE_ENV === 'development') {
        console.log(`[StateMachine] ${JSON.stringify(phase)} --[${event.type}]--> ${JSON.stringify(nextPhase)}`);
    }

    return { nextPhase, stateUpdates };
}

// 获取当前状态下可用的事件
export function getAvailableEvents(
    phase: GamePhase2,
    state: GameState
): PhaseEvent['type'][] {
    const eventTypes = new Set<PhaseEvent['type']>();

    for (const rule of TRANSITIONS) {
        if (rule.from(phase) && (rule.guard?.(state, {} as PhaseEvent) ?? true)) {
            eventTypes.add(rule.event);
        }
    }

    return Array.from(eventTypes);
}
```

**验证点**:
- [ ] 单元测试：transition() 返回正确的目标状态
- [ ] 单元测试：canTransition() 正确判断守卫条件
- [ ] 单元测试：无效转换返回 null

---

### 阶段 3: 双轨并行 (1.5 天)

**任务**:
1. 在 GameState 中添加 `phase2` 字段（新状态）
2. 创建 `phaseReducer` 处理 `PHASE_TRANSITION` action
3. 创建 `useGameMachine` hook
4. 旧 `phase` 和新 `phase2` **同时存在**，组件仍使用旧 `phase`

**文件变更**:
```
修改:
├── systems/game/types.ts              → 添加 phase2 字段
├── store/GameContext.tsx              → 初始化 phase2
├── store/actions/types.ts             → 添加 PHASE_TRANSITION action
└── store/reducers/index.ts            → 添加 phaseReducer

新增:
├── store/reducers/phaseReducer.ts     → 处理 PHASE_TRANSITION
└── hooks/useGameMachine.ts            → 状态机 hook
```

**GameState 扩展**:
```typescript
// systems/game/types.ts (添加)

import { GamePhase2 } from '../core/phases';

export interface GameState {
    // ... 现有字段 ...

    /**
     * 新状态机 Phase (迁移期间与 phase 并存)
     * 迁移完成后将替换 phase
     */
    phase2: GamePhase2;
}
```

**phaseReducer.ts 内容**:
```typescript
// store/reducers/phaseReducer.ts

import { GameState } from '../../types';
import { Action } from '../actions/types';
import { transition } from '../../systems/core/phases/machine';
import { PhaseEvent } from '../../systems/core/phases/types';

export function phaseReducer(state: GameState, action: Action): GameState {
    if (action.type !== 'PHASE_TRANSITION') {
        return state;
    }

    const event = action.payload as PhaseEvent;
    const result = transition(state.phase2, event, state);

    if (!result) {
        return state;  // 无效转换，忽略
    }

    return {
        ...state,
        ...result.stateUpdates,
        phase2: result.nextPhase
    };
}
```

**useGameMachine.ts 内容**:
```typescript
// hooks/useGameMachine.ts

import { useCallback, useEffect, useRef } from 'react';
import { useGame } from '../store/GameContext';
import { PhaseEvent, GamePhase2 } from '../systems/core/phases/types';
import { PhaseIs, PhaseMatch } from '../systems/core/phases/guards';
import { canTransition } from '../systems/core/phases/machine';

export function useGameMachine() {
    const { state, dispatch } = useGame();
    const prevPhaseRef = useRef<GamePhase2 | null>(null);

    // 发送事件
    const send = useCallback((event: PhaseEvent) => {
        dispatch({ type: 'PHASE_TRANSITION', payload: event });
    }, [dispatch]);

    // 检查是否可以发送事件
    const can = useCallback((event: PhaseEvent) => {
        return canTransition(state.phase2, event, state);
    }, [state]);

    // 检测 phase2 变化，触发自动效果
    useEffect(() => {
        const prevPhase = prevPhaseRef.current;
        const currentPhase = state.phase2;

        // 跳过初始渲染
        if (prevPhase === null) {
            prevPhaseRef.current = currentPhase;
            return;
        }

        // 状态未变化
        if (JSON.stringify(prevPhase) === JSON.stringify(currentPhase)) {
            return;
        }

        prevPhaseRef.current = currentPhase;

        // 自动效果（异步操作触发器）
        runAutoEffects(currentPhase, state, send, dispatch);

    }, [state.phase2, state, send, dispatch]);

    return {
        phase: state.phase2,
        context: state,
        send,
        can,
        // 类型守卫导出
        PhaseIs,
        PhaseMatch
    };
}

// 自动效果函数（根据进入的状态触发异步操作）
async function runAutoEffects(
    phase: GamePhase2,
    state: GameState,
    send: (event: PhaseEvent) => void,
    dispatch: Dispatch
) {
    // DAY_START: EXPIRY_CHECK → 自动检查到期
    if (PhaseIs.dayStart(phase) && phase.subphase === 'EXPIRY_CHECK') {
        const { expiryEvents } = await checkDailyExpirations(state);
        dispatch({ type: 'SET_EXPIRY_QUEUE', payload: expiryEvents });
        send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: expiryEvents.length > 0 });
    }

    // BUSINESS: IDLE → 自动生成顾客
    if (PhaseIs.business(phase) && phase.subphase === 'IDLE') {
        const customer = await generateDailyEvent(state);
        if (customer) {
            dispatch({ type: 'SET_CUSTOMER', payload: customer });
        }
        send({ type: 'CUSTOMER_GENERATED', hasCustomer: customer !== null });
    }

    // NIGHT: PROCESSING → 自动执行夜间循环
    if (PhaseIs.night(phase) && phase.subphase === 'PROCESSING') {
        await performNightCycle(state, dispatch);
        send({ type: 'NIGHT_CYCLE_DONE' });
    }

    // NIGHT: EVALUATING → 自动评估结局
    if (PhaseIs.night(phase) && phase.subphase === 'EVALUATING') {
        const outcome = evaluateGameOutcome(state);
        send({ type: 'EVALUATION_DONE', outcome });
    }
}

function evaluateGameOutcome(state: GameState): EvaluationOutcome {
    if (state.stats.cash < 0) return 'bankrupt';
    if (state.stats.motherStatus.health <= 0) return 'mother_died';
    if (state.stats.cash >= state.stats.targetSavings) return 'victory';
    return 'continue';
}
```

**验证点**:
- [ ] `phase2` 正确初始化
- [ ] `PHASE_TRANSITION` action 被正确处理
- [ ] 新旧状态同时存在，游戏正常运行
- [ ] DevConsole 可查看 `phase2` 状态

---

### 阶段 4: 组件迁移 (1.5 天)

**任务**:
1. 逐个组件迁移到使用 `useGameMachine`
2. 替换 `state.phase` 为 `phase` (from useGameMachine)
3. 替换直接 dispatch 为 `send(event)`
4. 保留旧 dispatch 用于非状态机 action

**迁移顺序** (按依赖关系):
1. `App.tsx` - 主状态分发
2. `MorningBrief.tsx` - OPEN_SHOP
3. `ShopClosedView.tsx` - DISMISS, CLOSE_SHOP
4. `DepartureView.tsx` - DISMISS
5. `NightDashboard.tsx` - END_DAY
6. `NegotiationPanel.tsx` - TRANSACTION_COMPLETE, CUSTOMER_REJECTED

**App.tsx 迁移示例**:
```typescript
// 迁移前
function App() {
    const { state, dispatch } = useGame();
    const { phase } = state;

    useEffect(() => {
        if (phase === GamePhase.BUSINESS && !state.isLoading && !state.currentCustomer) {
            generateDailyEvent();
        }
    }, [phase, state.isLoading, state.currentCustomer]);

    return (
        <>
            {phase === GamePhase.START_SCREEN && <StartScreen />}
            {phase === GamePhase.MORNING_BRIEF && <MorningBrief />}
            {/* ... */}
        </>
    );
}

// 迁移后
function App() {
    const { phase, PhaseIs, PhaseMatch } = useGameMachine();

    // 移除 useEffect - 自动效果由 useGameMachine 处理

    return (
        <>
            {PhaseIs.startScreen(phase) && <StartScreen />}
            {PhaseIs.morningBrief(phase) && <MorningBrief />}

            {PhaseMatch.dayStartExpiry(phase) && <SettlementInterface />}

            {PhaseMatch.businessIdle(phase) && <LoadingSpinner />}
            {PhaseMatch.businessServing(phase) && <NegotiationPanel />}
            {PhaseMatch.businessClosed(phase) && <ShopClosedView />}

            {PhaseIs.departure(phase) && <DepartureView />}

            {PhaseIs.night(phase) && <NightDashboard />}

            {PhaseIs.gameOver(phase) && <GameOverScreen reason={phase.reason} />}
            {PhaseIs.victory(phase) && <VictoryScreen />}
        </>
    );
}
```

**MorningBrief.tsx 迁移示例**:
```typescript
// 迁移前
function MorningBrief() {
    const { state, dispatch } = useGame();

    const handleOpenShop = () => {
        dispatch({ type: 'OPEN_SHOP' });
    };

    return (
        <button onClick={handleOpenShop}>开门营业</button>
    );
}

// 迁移后
function MorningBrief() {
    const { context, send, can } = useGameMachine();

    const handleOpenShop = () => {
        send({ type: 'OPEN_SHOP' });
    };

    const canOpen = can({ type: 'OPEN_SHOP' });

    return (
        <button onClick={handleOpenShop} disabled={!canOpen}>
            开门营业
        </button>
    );
}
```

**验证点**:
- [ ] 每个组件迁移后单独测试
- [ ] 状态转换流程完整：开始 → 晨间 → 营业 → 送客 → 夜间 → 循环
- [ ] 到期结算流程正常
- [ ] 游戏结束（破产/胜利）正常触发

---

### 阶段 5: 清理旧代码 (1 天)

**任务**:
1. 移除 `GamePhase` enum (旧类型)
2. 重命名 `GamePhase2` → `GamePhase`
3. 移除 `state.phase` 字段
4. 移除旧的 phase 相关 action (START_DAY, START_NIGHT 等)
5. 清理 coreReducer 中的旧转换逻辑

**文件变更**:
```
修改:
├── systems/core/types.ts              → 移除 GamePhase enum
├── systems/core/phases/types.ts       → 重命名 GamePhase2 → GamePhase
├── systems/game/types.ts              → 移除 phase 字段
├── store/GameContext.tsx              → 更新初始状态
├── store/actions/types.ts             → 移除旧 action
├── store/reducers/coreReducer.ts      → 移除旧转换逻辑
└── 所有组件                            → 更新 import

删除:
└── 无 (所有迁移都是修改)
```

**验证点**:
- [ ] TypeScript 编译无错误
- [ ] 所有测试通过
- [ ] 完整游戏流程测试
- [ ] 存档兼容性测试（需要迁移逻辑）

---

### 阶段 6: 文档与优化 (0.5 天)

**任务**:
1. 更新 `DAILY_FLOW.md` 文档
2. 添加状态机可视化图表
3. 添加开发者文档
4. 性能优化（如果需要）

**文件变更**:
```
修改:
├── docs/DAILY_FLOW.md                 → 更新状态图
└── CLAUDE.md                          → 添加状态机说明

新增:
└── docs/STATE_MACHINE.md              → 状态机开发文档
```

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 迁移期间双状态不同步 | 高 | 添加同步检查断言，开发环境警告 |
| 存档兼容性破坏 | 中 | LOAD_GAME 中添加迁移逻辑 |
| 自动效果竞态条件 | 中 | 使用 ref 追踪处理状态，防止重复触发 |
| 组件迁移遗漏 | 低 | 阶段 5 编译会报错 |

**回滚策略**:
- 每个阶段完成后打 tag
- 阶段 1-2 可随时删除新文件回滚
- 阶段 3-4 可通过 git revert 回滚
- 阶段 5 后需要完整回滚分支

---

## 检查清单

### 阶段 0
- [x] 创建分支 `feature/explicit-state-machine`
- [x] 确认当前功能正常

### 阶段 1
- [x] 创建 `systems/core/phases/types.ts`
- [x] 创建 `systems/core/phases/guards.ts`
- [x] 创建 `systems/core/phases/index.ts`
- [x] TypeScript 编译通过

### 阶段 2
- [x] 创建 `systems/core/phases/transitions.ts`
- [x] 创建 `systems/core/phases/actions.ts`
- [x] 创建 `systems/core/phases/machine.ts`
- [x] 单元测试通过

### 阶段 3
- [x] 添加 `phase2` 到 GameState
- [x] 创建 `phaseReducer`
- [x] 创建 `useGameMachine` hook
- [x] DevConsole 可查看 phase2

### 阶段 4
- [x] 迁移 App.tsx
- [x] 迁移 MorningBrief.tsx
- [x] 迁移 ShopClosedView.tsx (DepartureView)
- [x] 迁移 NightDashboard.tsx
- [x] 迁移 NegotiationPanel.tsx
- [x] 迁移 RedemptionInterface.tsx (SettlementInterface)
- [x] 迁移 RenewalRequestPanel.tsx
- [x] 迁移 PostForfeitPanel.tsx
- [x] 完整流程测试通过

### 阶段 5
- [x] 移除旧 GamePhase enum (保留为 LegacyGamePhase 用于存档迁移)
- [x] 重命名 GamePhase2 → GamePhase
- [x] 移除 state.phase2 (现在只有 state.phase 使用新类型)
- [x] 清理 coreReducer
- [x] 编译通过，测试通过

### 阶段 6
- [x] 更新 DAILY_FLOW.md
- [x] 创建 STATE_MACHINE.md
- [x] 更新 CLAUDE.md
- [x] 合并到主分支 (待合并 CC → main，迁移计划已归档 2026-02-04)

---

## 完成日期

| 阶段 | 完成日期 |
|------|----------|
| 阶段 0: 准备工作 | 2026-02-03 |
| 阶段 1: 类型定义 | 2026-02-03 |
| 阶段 2: 状态机核心 | 2026-02-03 |
| 阶段 3: 双轨并行 | 2026-02-03 |
| 阶段 4: 组件迁移 | 2026-02-04 |
| 阶段 5: 清理旧代码 | 2026-02-04 |
| 阶段 6: 文档与优化 | 2026-02-04 |

---

## 时间线

```
Day 1: 阶段 0 + 阶段 1 + 阶段 2 (前半)
Day 2: 阶段 2 (后半) + 阶段 3
Day 3: 阶段 3 (测试) + 阶段 4 (App, MorningBrief)
Day 4: 阶段 4 (剩余组件)
Day 5: 阶段 5
Day 6: 阶段 6 + 缓冲
Day 7: 缓冲 + 合并
```
