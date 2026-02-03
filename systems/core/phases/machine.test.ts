/**
 * State Machine Unit Tests (TDD)
 *
 * Tests for the explicit state machine implementation.
 * Written BEFORE the implementation code.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    GamePhase,
    PhaseEvent,
    DayStartSubphase,
    BusinessSubphase,
    NightSubphase
} from './types';
import { PhaseIs, PhaseMatch } from './guards';
import { transition, canTransition, findTransition } from './machine';
import { GameState } from '../../../types';

// ============================================
// Test Fixtures
// ============================================

function createMockState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: { type: 'START_SCREEN' } as GamePhase, // Discriminated union phase
        stats: {
            day: 1,
            cash: 1000,
            targetSavings: 100000,
            motherStatus: { health: 80, status: 'Stable', risk: 10, careLevel: 'Basic' },
            medicalBill: { amount: 500, dueDate: 7, status: 'PENDING' },
            visitedToday: false,
            dailyExpenses: 50,
            actionPoints: 3,
            maxActionPoints: 3,
            rentDue: 200,
            rentDueDate: 7
        },
        reputation: { Humanity: 50, Credibility: 50, Underworld: 10 },
        inventory: [],
        currentCustomer: null,
        currentNode: null,
        dayEvents: [],
        todayTransactions: [],
        customersServedToday: 0,
        narrativeCustomersServedToday: 0,
        maxCustomersPerDay: 4,
        isLoading: false,
        showInventory: false,
        showMail: false,
        showDebug: false,
        showFinancials: false,
        showMedical: false,
        showVisit: false,
        activeChains: [],
        inbox: [],
        pendingMails: [],
        completedScenarioIds: [],
        dailyNews: [],
        activeMarketEffects: [],
        violationFlags: [],
        financialHistory: [],
        lastSatisfaction: null,
        lastDealSummary: null,
        activeMilestones: [],
        currentExpiryEvent: null,
        expiryQueue: [],
        coreLostItems: [],
        essenceBalance: { HOPE: 0, REGRET: 0, GREED: 0, TRUST: 0, FEAR: 0 },
        nightState: { energy: 3, maxEnergy: 3, actionsThisNight: [] },
        shopUpgrades: { upgrades: [] },
        showUpgradeShop: false,
        showFacilityControl: false,
        appointmentBoard: { candidates: [], selectedIds: [], preference: 'RANDOM' },
        showAppointmentBoard: false,
        pendingAppointedCandidates: [],
        blackmarket: {} as any,
        showBlackmarket: false,
        showWorkshop: false,
        showInsight: false,
        pendingSelectedItemId: null,
        ...overrides
    } as GameState;
}

// ============================================
// Type Guard Tests
// ============================================

describe('PhaseIs Type Guards', () => {
    it('should correctly identify START_SCREEN', () => {
        const phase: GamePhase = { type: 'START_SCREEN' };
        expect(PhaseIs.startScreen(phase)).toBe(true);
        expect(PhaseIs.morningBrief(phase)).toBe(false);
    });

    it('should correctly identify MORNING_BRIEF', () => {
        const phase: GamePhase = { type: 'MORNING_BRIEF' };
        expect(PhaseIs.morningBrief(phase)).toBe(true);
        expect(PhaseIs.startScreen(phase)).toBe(false);
    });

    it('should correctly identify DAY_START with subphase', () => {
        const phase: GamePhase = { type: 'DAY_START', subphase: 'EXPIRY_CHECK' };
        expect(PhaseIs.dayStart(phase)).toBe(true);
        if (PhaseIs.dayStart(phase)) {
            expect(phase.subphase).toBe('EXPIRY_CHECK');
        }
    });

    it('should correctly identify BUSINESS with subphase', () => {
        const phase: GamePhase = { type: 'BUSINESS', subphase: 'IDLE' };
        expect(PhaseIs.business(phase)).toBe(true);
        if (PhaseIs.business(phase)) {
            expect(phase.subphase).toBe('IDLE');
        }
    });

    it('should correctly identify NEGOTIATION with mode', () => {
        const phase: GamePhase = { type: 'NEGOTIATION', mode: 'PAWN' };
        expect(PhaseIs.negotiation(phase)).toBe(true);
    });

    it('should correctly identify NIGHT with subphase', () => {
        const phase: GamePhase = { type: 'NIGHT', subphase: 'ACTIVE' };
        expect(PhaseIs.night(phase)).toBe(true);
    });

    it('should correctly identify GAME_OVER with reason', () => {
        const phase: GamePhase = { type: 'GAME_OVER', reason: '破产' };
        expect(PhaseIs.gameOver(phase)).toBe(true);
        if (PhaseIs.gameOver(phase)) {
            expect(phase.reason).toBe('破产');
        }
    });

    it('should correctly identify VICTORY', () => {
        const phase: GamePhase = { type: 'VICTORY' };
        expect(PhaseIs.victory(phase)).toBe(true);
    });
});

describe('PhaseMatch Compound Guards', () => {
    it('should match businessIdle', () => {
        const phase: GamePhase = { type: 'BUSINESS', subphase: 'IDLE' };
        expect(PhaseMatch.businessIdle(phase)).toBe(true);

        const serving: GamePhase = { type: 'BUSINESS', subphase: 'SERVING' };
        expect(PhaseMatch.businessIdle(serving)).toBe(false);
    });

    it('should match businessClosed', () => {
        const phase: GamePhase = { type: 'BUSINESS', subphase: 'CLOSED' };
        expect(PhaseMatch.businessClosed(phase)).toBe(true);
    });

    it('should match nightActive', () => {
        const phase: GamePhase = { type: 'NIGHT', subphase: 'ACTIVE' };
        expect(PhaseMatch.nightActive(phase)).toBe(true);

        const processing: GamePhase = { type: 'NIGHT', subphase: 'PROCESSING' };
        expect(PhaseMatch.nightActive(processing)).toBe(false);
    });

    it('should match dayStartExpiry', () => {
        const phase: GamePhase = { type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' };
        expect(PhaseMatch.dayStartExpiry(phase)).toBe(true);

        const check: GamePhase = { type: 'DAY_START', subphase: 'EXPIRY_CHECK' };
        expect(PhaseMatch.dayStartExpiry(check)).toBe(false);
    });
});

// ============================================
// State Transition Tests
// ============================================

describe('State Machine Transitions', () => {
    describe('START_SCREEN transitions', () => {
        it('should transition to MORNING_BRIEF on NEW_GAME', () => {
            const state = createMockState({ phase: { type: 'START_SCREEN' } });
            const event: PhaseEvent = { type: 'NEW_GAME' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('MORNING_BRIEF');
        });

        it('should transition to MORNING_BRIEF on LOAD_GAME', () => {
            const state = createMockState({ phase: { type: 'START_SCREEN' } });
            const event: PhaseEvent = { type: 'LOAD_GAME' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('MORNING_BRIEF');
        });

        it('should NOT transition on invalid event', () => {
            const state = createMockState({ phase: { type: 'START_SCREEN' } });
            const event: PhaseEvent = { type: 'CLOSE_SHOP' };

            const result = transition(state.phase, event, state);

            expect(result).toBeNull();
        });
    });

    describe('MORNING_BRIEF transitions', () => {
        it('should transition to DAY_START.EXPIRY_CHECK on OPEN_SHOP', () => {
            const state = createMockState({ phase: { type: 'MORNING_BRIEF' } });
            const event: PhaseEvent = { type: 'OPEN_SHOP' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('DAY_START');
            if (result!.nextPhase.type === 'DAY_START') {
                expect(result!.nextPhase.subphase).toBe('EXPIRY_CHECK');
            }
        });
    });

    describe('DAY_START transitions', () => {
        it('should transition to EXPIRY_SETTLEMENT when hasExpiry is true', () => {
            const state = createMockState({
                phase: { type: 'DAY_START', subphase: 'EXPIRY_CHECK' },
                expiryQueue: [{ itemId: '1', chainId: 'c1' }] as any
            });
            const event: PhaseEvent = { type: 'EXPIRY_CHECK_DONE', hasExpiry: true };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('DAY_START');
            if (result!.nextPhase.type === 'DAY_START') {
                expect(result!.nextPhase.subphase).toBe('EXPIRY_SETTLEMENT');
            }
        });

        it('should transition to BUSINESS.IDLE when hasExpiry is false', () => {
            const state = createMockState({
                phase: { type: 'DAY_START', subphase: 'EXPIRY_CHECK' },
                expiryQueue: []
            });
            const event: PhaseEvent = { type: 'EXPIRY_CHECK_DONE', hasExpiry: false };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('BUSINESS');
            if (result!.nextPhase.type === 'BUSINESS') {
                expect(result!.nextPhase.subphase).toBe('IDLE');
            }
        });

        it('should transition to DEPARTURE on SETTLEMENT_COMPLETE', () => {
            const state = createMockState({
                phase: { type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' }
            });
            const event: PhaseEvent = { type: 'SETTLEMENT_COMPLETE' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('DEPARTURE');
        });
    });

    describe('DEPARTURE transitions', () => {
        it('should return to EXPIRY_SETTLEMENT when more expiry events exist', () => {
            const state = createMockState({
                phase: { type: 'DEPARTURE' },
                expiryQueue: [{ itemId: '1' }, { itemId: '2' }] as any
            });
            const event: PhaseEvent = { type: 'DISMISS' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('DAY_START');
            if (result!.nextPhase.type === 'DAY_START') {
                expect(result!.nextPhase.subphase).toBe('EXPIRY_SETTLEMENT');
            }
        });

        it('should transition to BUSINESS.IDLE when no more expiry events', () => {
            const state = createMockState({
                phase: { type: 'DEPARTURE' },
                expiryQueue: [{ itemId: '1' }] as any // Only 1 left, will be popped
            });
            const event: PhaseEvent = { type: 'DISMISS' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('BUSINESS');
            if (result!.nextPhase.type === 'BUSINESS') {
                expect(result!.nextPhase.subphase).toBe('IDLE');
            }
        });
    });

    describe('BUSINESS transitions', () => {
        it('should transition to SERVING when customer generated', () => {
            const state = createMockState({
                phase: { type: 'BUSINESS', subphase: 'IDLE' }
            });
            const event: PhaseEvent = { type: 'CUSTOMER_GENERATED', hasCustomer: true };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('BUSINESS');
            if (result!.nextPhase.type === 'BUSINESS') {
                expect(result!.nextPhase.subphase).toBe('SERVING');
            }
        });

        it('should transition to CLOSED when no customer generated', () => {
            const state = createMockState({
                phase: { type: 'BUSINESS', subphase: 'IDLE' }
            });
            const event: PhaseEvent = { type: 'CUSTOMER_GENERATED', hasCustomer: false };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('BUSINESS');
            if (result!.nextPhase.type === 'BUSINESS') {
                expect(result!.nextPhase.subphase).toBe('CLOSED');
            }
        });

        it('should transition to DEPARTURE on TRANSACTION_COMPLETE', () => {
            const state = createMockState({
                phase: { type: 'BUSINESS', subphase: 'SERVING' }
            });
            const event: PhaseEvent = { type: 'TRANSACTION_COMPLETE' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('DEPARTURE');
        });

        it('should transition to DEPARTURE on CUSTOMER_REJECTED', () => {
            const state = createMockState({
                phase: { type: 'BUSINESS', subphase: 'SERVING' }
            });
            const event: PhaseEvent = { type: 'CUSTOMER_REJECTED' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('DEPARTURE');
        });

        it('should transition to NIGHT on CLOSE_SHOP from CLOSED', () => {
            const state = createMockState({
                phase: { type: 'BUSINESS', subphase: 'CLOSED' }
            });
            const event: PhaseEvent = { type: 'CLOSE_SHOP' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('NIGHT');
            if (result!.nextPhase.type === 'NIGHT') {
                expect(result!.nextPhase.subphase).toBe('ACTIVE');
            }
        });

        it('should NOT allow CLOSE_SHOP from SERVING', () => {
            const state = createMockState({
                phase: { type: 'BUSINESS', subphase: 'SERVING' }
            });
            const event: PhaseEvent = { type: 'CLOSE_SHOP' };

            const result = transition(state.phase, event, state);

            expect(result).toBeNull();
        });
    });

    describe('NIGHT transitions', () => {
        it('should transition to PROCESSING on END_DAY', () => {
            const state = createMockState({
                phase: { type: 'NIGHT', subphase: 'ACTIVE' }
            });
            const event: PhaseEvent = { type: 'END_DAY' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('NIGHT');
            if (result!.nextPhase.type === 'NIGHT') {
                expect(result!.nextPhase.subphase).toBe('PROCESSING');
            }
        });

        it('should transition to EVALUATING on NIGHT_CYCLE_DONE', () => {
            const state = createMockState({
                phase: { type: 'NIGHT', subphase: 'PROCESSING' }
            });
            const event: PhaseEvent = { type: 'NIGHT_CYCLE_DONE' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('NIGHT');
            if (result!.nextPhase.type === 'NIGHT') {
                expect(result!.nextPhase.subphase).toBe('EVALUATING');
            }
        });

        it('should transition to MORNING_BRIEF on continue outcome', () => {
            const state = createMockState({
                phase: { type: 'NIGHT', subphase: 'EVALUATING' }
            });
            const event: PhaseEvent = { type: 'EVALUATION_DONE', outcome: 'continue' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('MORNING_BRIEF');
        });

        it('should transition to GAME_OVER on bankrupt outcome', () => {
            const state = createMockState({
                phase: { type: 'NIGHT', subphase: 'EVALUATING' }
            });
            const event: PhaseEvent = { type: 'EVALUATION_DONE', outcome: 'bankrupt' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('GAME_OVER');
            if (result!.nextPhase.type === 'GAME_OVER') {
                expect(result!.nextPhase.reason).toBe('破产');
            }
        });

        it('should transition to GAME_OVER on mother_died outcome', () => {
            const state = createMockState({
                phase: { type: 'NIGHT', subphase: 'EVALUATING' }
            });
            const event: PhaseEvent = { type: 'EVALUATION_DONE', outcome: 'mother_died' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('GAME_OVER');
            if (result!.nextPhase.type === 'GAME_OVER') {
                expect(result!.nextPhase.reason).toBe('母亲去世');
            }
        });

        it('should transition to VICTORY on victory outcome', () => {
            const state = createMockState({
                phase: { type: 'NIGHT', subphase: 'EVALUATING' }
            });
            const event: PhaseEvent = { type: 'EVALUATION_DONE', outcome: 'victory' };

            const result = transition(state.phase, event, state);

            expect(result).not.toBeNull();
            expect(result!.nextPhase.type).toBe('VICTORY');
        });
    });
});

// ============================================
// canTransition Tests
// ============================================

describe('canTransition helper', () => {
    it('should return true for valid transitions', () => {
        const state = createMockState({ phase: { type: 'MORNING_BRIEF' } });
        expect(canTransition(state.phase, { type: 'OPEN_SHOP' }, state)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
        const state = createMockState({ phase: { type: 'MORNING_BRIEF' } });
        expect(canTransition(state.phase, { type: 'CLOSE_SHOP' }, state)).toBe(false);
    });

    it('should respect guard conditions', () => {
        // With expiry events
        const stateWithExpiry = createMockState({
            phase: { type: 'DEPARTURE' },
            expiryQueue: [{ itemId: '1' }, { itemId: '2' }] as any
        });

        // Without expiry events (only 1, will be popped)
        const stateWithoutExpiry = createMockState({
            phase: { type: 'DEPARTURE' },
            expiryQueue: [{ itemId: '1' }] as any
        });

        // Both should allow DISMISS, but lead to different states
        expect(canTransition(stateWithExpiry.phase, { type: 'DISMISS' }, stateWithExpiry)).toBe(true);
        expect(canTransition(stateWithoutExpiry.phase, { type: 'DISMISS' }, stateWithoutExpiry)).toBe(true);
    });
});

// ============================================
// Full Flow Integration Tests
// ============================================

describe('Full Game Flow Integration', () => {
    it('should complete a full day cycle without expiry', () => {
        let state = createMockState({ phase: { type: 'START_SCREEN' } });

        // Start game
        let result = transition(state.phase, { type: 'NEW_GAME' }, state);
        expect(result!.nextPhase.type).toBe('MORNING_BRIEF');
        state = { ...state, phase: result!.nextPhase };

        // Open shop
        result = transition(state.phase, { type: 'OPEN_SHOP' }, state);
        expect(result!.nextPhase).toEqual({ type: 'DAY_START', subphase: 'EXPIRY_CHECK' });
        state = { ...state, phase: result!.nextPhase };

        // No expiry
        result = transition(state.phase, { type: 'EXPIRY_CHECK_DONE', hasExpiry: false }, state);
        expect(result!.nextPhase).toEqual({ type: 'BUSINESS', subphase: 'IDLE' });
        state = { ...state, phase: result!.nextPhase };

        // Customer arrives
        result = transition(state.phase, { type: 'CUSTOMER_GENERATED', hasCustomer: true }, state);
        expect(result!.nextPhase).toEqual({ type: 'BUSINESS', subphase: 'SERVING' });
        state = { ...state, phase: result!.nextPhase };

        // Complete transaction
        result = transition(state.phase, { type: 'TRANSACTION_COMPLETE' }, state);
        expect(result!.nextPhase.type).toBe('DEPARTURE');
        state = { ...state, phase: result!.nextPhase, expiryQueue: [] };

        // Dismiss customer
        result = transition(state.phase, { type: 'DISMISS' }, state);
        expect(result!.nextPhase).toEqual({ type: 'BUSINESS', subphase: 'IDLE' });
        state = { ...state, phase: result!.nextPhase };

        // No more customers
        result = transition(state.phase, { type: 'CUSTOMER_GENERATED', hasCustomer: false }, state);
        expect(result!.nextPhase).toEqual({ type: 'BUSINESS', subphase: 'CLOSED' });
        state = { ...state, phase: result!.nextPhase };

        // Close shop
        result = transition(state.phase, { type: 'CLOSE_SHOP' }, state);
        expect(result!.nextPhase).toEqual({ type: 'NIGHT', subphase: 'ACTIVE' });
        state = { ...state, phase: result!.nextPhase };

        // End day
        result = transition(state.phase, { type: 'END_DAY' }, state);
        expect(result!.nextPhase).toEqual({ type: 'NIGHT', subphase: 'PROCESSING' });
        state = { ...state, phase: result!.nextPhase };

        // Night cycle done
        result = transition(state.phase, { type: 'NIGHT_CYCLE_DONE' }, state);
        expect(result!.nextPhase).toEqual({ type: 'NIGHT', subphase: 'EVALUATING' });
        state = { ...state, phase: result!.nextPhase };

        // Continue to next day
        result = transition(state.phase, { type: 'EVALUATION_DONE', outcome: 'continue' }, state);
        expect(result!.nextPhase.type).toBe('MORNING_BRIEF');
    });

    it('should handle expiry settlement flow', () => {
        let state = createMockState({
            phase: { type: 'DAY_START', subphase: 'EXPIRY_CHECK' },
            expiryQueue: [{ itemId: '1' }, { itemId: '2' }] as any
        });

        // Has expiry
        let result = transition(state.phase, { type: 'EXPIRY_CHECK_DONE', hasExpiry: true }, state);
        expect(result!.nextPhase).toEqual({ type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' });
        state = { ...state, phase: result!.nextPhase };

        // First settlement complete
        result = transition(state.phase, { type: 'SETTLEMENT_COMPLETE' }, state);
        expect(result!.nextPhase.type).toBe('DEPARTURE');
        state = { ...state, phase: result!.nextPhase };

        // Dismiss - still more expiry (2 items)
        result = transition(state.phase, { type: 'DISMISS' }, state);
        expect(result!.nextPhase).toEqual({ type: 'DAY_START', subphase: 'EXPIRY_SETTLEMENT' });
        state = { ...state, phase: result!.nextPhase, expiryQueue: [{ itemId: '2' }] as any };

        // Second settlement complete
        result = transition(state.phase, { type: 'SETTLEMENT_COMPLETE' }, state);
        expect(result!.nextPhase.type).toBe('DEPARTURE');
        state = { ...state, phase: result!.nextPhase };

        // Dismiss - no more expiry (1 item will be popped)
        result = transition(state.phase, { type: 'DISMISS' }, state);
        expect(result!.nextPhase).toEqual({ type: 'BUSINESS', subphase: 'IDLE' });
    });
});
