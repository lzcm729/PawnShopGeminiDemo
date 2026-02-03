/**
 * State Machine Transition Rules
 *
 * Declarative transition rules for the state machine.
 * Part of the state machine migration (Phase 2).
 */

import { GamePhase, PhaseEvent } from './types';
import { GameState } from '../../game/types';
import * as actions from './actions';

// ============================================
// Transition Rule Type
// ============================================

export type TransitionRule = {
    from: (phase: GamePhase) => boolean;
    event: PhaseEvent['type'];
    guard?: (state: GameState, event: PhaseEvent) => boolean;
    to: (state: GameState, event: PhaseEvent) => GamePhase;
    effects?: Array<(state: GameState, event: PhaseEvent) => Partial<GameState>>;
};

// ============================================
// Transition Rules Table
// ============================================

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
        // loadGameState is handled externally
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
        guard: (_, e) => (e as { hasExpiry: boolean }).hasExpiry === true,
        to: () => ({ type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' }),
        effects: [actions.createExpiryCustomer]
    },
    {
        from: (p) => p.type === 'DAY_START' && p.subphase === 'EXPIRY_CHECK',
        event: 'EXPIRY_CHECK_DONE',
        guard: (_, e) => (e as { hasExpiry: boolean }).hasExpiry === false,
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
        guard: (_, e) => (e as { hasCustomer: boolean }).hasCustomer === true,
        to: () => ({ type: 'BUSINESS', subphase: 'SERVING' })
        // setCustomer is handled externally
    },
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'IDLE',
        event: 'CUSTOMER_GENERATED',
        guard: (_, e) => (e as { hasCustomer: boolean }).hasCustomer === false,
        to: () => ({ type: 'BUSINESS', subphase: 'CLOSED' })
    },

    // ========== BUSINESS: SERVING ==========
    {
        from: (p) => p.type === 'BUSINESS' && p.subphase === 'SERVING',
        event: 'TRANSACTION_COMPLETE',
        to: () => ({ type: 'DEPARTURE' })
        // transaction effects are handled externally
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
        // nightCycle effects are handled externally
    },

    // ========== NIGHT: EVALUATING ==========
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as { outcome: string }).outcome === 'continue',
        to: () => ({ type: 'MORNING_BRIEF' }),
        effects: [actions.incrementDay]
    },
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as { outcome: string }).outcome === 'bankrupt',
        to: () => ({ type: 'GAME_OVER', reason: '破产' })
    },
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as { outcome: string }).outcome === 'mother_died',
        to: () => ({ type: 'GAME_OVER', reason: '母亲去世' })
    },
    {
        from: (p) => p.type === 'NIGHT' && p.subphase === 'EVALUATING',
        event: 'EVALUATION_DONE',
        guard: (_, e) => (e as { outcome: string }).outcome === 'victory',
        to: () => ({ type: 'VICTORY' })
    },
];
