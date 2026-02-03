/**
 * State Machine Type Guards
 *
 * Type guard functions for discriminated union phases.
 * Part of the state machine migration (Phase 1).
 */

import {
    GamePhase2,
    DayStartSubphase,
    BusinessSubphase,
    NightSubphase,
    NegotiationMode
} from './types';

// ============================================
// Individual Phase Type Guards
// ============================================

export const PhaseIs = {
    startScreen: (p: GamePhase2): p is { type: 'START_SCREEN' } =>
        p.type === 'START_SCREEN',

    morningBrief: (p: GamePhase2): p is { type: 'MORNING_BRIEF' } =>
        p.type === 'MORNING_BRIEF',

    dayStart: (p: GamePhase2): p is { type: 'DAY_START'; subphase: DayStartSubphase } =>
        p.type === 'DAY_START',

    business: (p: GamePhase2): p is { type: 'BUSINESS'; subphase: BusinessSubphase } =>
        p.type === 'BUSINESS',

    negotiation: (p: GamePhase2): p is { type: 'NEGOTIATION'; mode: NegotiationMode } =>
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

// ============================================
// Compound Phase Checks
// ============================================

export const PhaseMatch = {
    // Day start compound checks
    dayStartExpiry: (p: GamePhase2): boolean =>
        PhaseIs.dayStart(p) && p.subphase === 'EXPIRY_SETTLEMENT',

    // Business compound checks
    businessIdle: (p: GamePhase2): boolean =>
        PhaseIs.business(p) && p.subphase === 'IDLE',

    businessGenerating: (p: GamePhase2): boolean =>
        PhaseIs.business(p) && p.subphase === 'GENERATING',

    businessServing: (p: GamePhase2): boolean =>
        PhaseIs.business(p) && p.subphase === 'SERVING',

    businessClosed: (p: GamePhase2): boolean =>
        PhaseIs.business(p) && p.subphase === 'CLOSED',

    // Night compound checks
    nightActive: (p: GamePhase2): boolean =>
        PhaseIs.night(p) && p.subphase === 'ACTIVE',

    nightProcessing: (p: GamePhase2): boolean =>
        PhaseIs.night(p) && p.subphase === 'PROCESSING',

    nightEvaluating: (p: GamePhase2): boolean =>
        PhaseIs.night(p) && p.subphase === 'EVALUATING',
};
