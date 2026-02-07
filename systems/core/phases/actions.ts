/**
 * State Machine Actions
 *
 * Pure functions that return partial state updates.
 * Part of the state machine migration (Phase 2).
 *
 * These actions are called as side-effects during phase transitions.
 * They return partial state updates that are merged into the game state.
 */

import { GameState, ReputationType, MotherCondition } from '../../../types';
import { PhaseEvent } from './types';
import { GAME_CONFIG } from '../../game/config';
import { INITIAL_ESSENCE_BALANCE } from '../../economy/essence';
import { INITIAL_SHOP_UPGRADES, getEffectiveNightEnergy, getTotalMaintenanceCost } from '../../upgrades';
import { INITIAL_APPOINTMENT_BOARD_STATE } from '../../appointment';
import { createInitialBlackmarketState, processStartOfDay as processBlackmarketStartOfDay } from '../../blackmarket/blackmarketService';

// ============================================
// Game Initialization Actions
// ============================================

/**
 * Reset game state for new game
 * Returns complete initial state values
 */
export function resetGameState(_state: GameState, _event: PhaseEvent): Partial<GameState> {
    return {
        stats: {
            day: 1,
            cash: GAME_CONFIG.INITIAL_FUNDS,
            targetSavings: GAME_CONFIG.GOAL_AMOUNT,
            motherStatus: { ...GAME_CONFIG.INITIAL_MOTHER_STATUS } as MotherCondition,
            medicalBill: {
                amount: GAME_CONFIG.WEEKLY_MEDICAL_COST,
                dueDate: GAME_CONFIG.BILL_CYCLE,
                status: 'PENDING'
            },
            visitedToday: false,
            dailyExpenses: GAME_CONFIG.DAILY_EXPENSES,
            actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
            maxActionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
            rentDue: GAME_CONFIG.WEEKLY_RENT,
            rentDueDate: GAME_CONFIG.RENT_CYCLE
        },
        reputation: {
            [ReputationType.HUMANITY]: GAME_CONFIG.INITIAL_REPUTATION.HUMANITY,
            [ReputationType.CREDIBILITY]: GAME_CONFIG.INITIAL_REPUTATION.CREDIBILITY,
            [ReputationType.INNOCENCE]: GAME_CONFIG.INITIAL_REPUTATION.INNOCENCE
        },
        inventory: [],
        currentCustomer: null,
        currentNode: null,
        dayEvents: [],
        todayTransactions: [],
        customersServedToday: 0,
        narrativeCustomersServedToday: 0,
        maxCustomersPerDay: GAME_CONFIG.MAX_CUSTOMERS_PER_DAY,
        isLoading: false,
        showInventory: false,
        showMail: false,
        showDebug: false,
        showFinancials: false,
        showMedical: false,
        showVisit: false,
        activeChains: [...GAME_CONFIG.STARTING_CHAINS],
        inbox: [],
        pendingMails: [],
        completedScenarioIds: [],
        dailyNews: [],
        activeMarketEffects: [],
        violationFlags: [],
        financialHistory: [],
        lastSatisfaction: null,
        lastDepartureSatisfaction: null,
        lastDealSummary: null,
        activeMilestones: [],
        currentExpiryEvent: null,
        expiryQueue: [],
        coreLostItems: [],
        essenceBalance: { ...INITIAL_ESSENCE_BALANCE },
        nightState: {
            energy: GAME_CONFIG.NIGHT.BASE_ENERGY,
            maxEnergy: GAME_CONFIG.NIGHT.BASE_ENERGY,
            actionsThisNight: [],
            energyLevel: 0,
        },
        shopUpgrades: { ...INITIAL_SHOP_UPGRADES },
        showUpgradeShop: false,
        showFacilityControl: false,
        appointmentBoard: { ...INITIAL_APPOINTMENT_BOARD_STATE },
        showAppointmentBoard: false,
        pendingAppointedCandidates: [],
        blackmarket: createInitialBlackmarketState(),
        showBlackmarket: false,
        showWorkshop: false,
        showInsight: false,
        pendingSelectedItemId: null
    };
}

// ============================================
// Night Closing Actions
// ============================================

/**
 * Deduct daily maintenance costs for enabled COUNTER upgrades
 * Called during night closing (END_DAY transition), per design doc 2.2
 */
export function deductMaintenanceCost(state: GameState, _event: PhaseEvent): Partial<GameState> {
    const cost = getTotalMaintenanceCost(state.shopUpgrades);
    if (cost <= 0) return {};

    return {
        stats: {
            ...state.stats,
            cash: state.stats.cash - cost
        }
    };
}

/**
 * Refresh blackmarket inventory (check lock expiration)
 */
export function refreshBlackmarket(state: GameState, _event: PhaseEvent): Partial<GameState> {
    if (!state.blackmarket) return {};

    const refreshedState = processBlackmarketStartOfDay(state.blackmarket, state.stats.day);
    return {
        blackmarket: refreshedState
    };
}

/**
 * Process daily mail (move pending mails to inbox if arrival day reached)
 */
export function processMailAction(state: GameState, _event: PhaseEvent): Partial<GameState> {
    const today = state.stats.day;
    const arrivingMails = state.pendingMails.filter(m => m.arrivalDay <= today);
    const remainingPending = state.pendingMails.filter(m => m.arrivalDay > today);

    if (arrivingMails.length === 0) return {};

    return {
        inbox: [...arrivingMails, ...state.inbox],
        pendingMails: remainingPending
    };
}

// ============================================
// Expiry Actions
// ============================================

/**
 * Create expiry customer for settlement
 * NOTE: Complex logic with customer generation stays in useGameEngine.
 * This action returns empty as the full implementation requires
 * access to story events and customer creation utilities.
 */
export function createExpiryCustomer(_state: GameState, _event: PhaseEvent): Partial<GameState> {
    // Complex logic stays in useGameEngine.ts - createExpiryCustomer function
    // The hook handles customer instantiation with dialogue, item lookup, etc.
    return {};
}

/**
 * Pop the first item from expiry queue
 */
export function popExpiryQueue(state: GameState, _event: PhaseEvent): Partial<GameState> {
    return {
        expiryQueue: state.expiryQueue.slice(1)
    };
}

/**
 * Clear the entire expiry queue
 */
export function clearExpiryQueue(_state: GameState, _event: PhaseEvent): Partial<GameState> {
    return {
        expiryQueue: []
    };
}

// ============================================
// Customer Actions
// ============================================

/**
 * Clear current customer and related state
 */
export function clearCustomer(_state: GameState, _event: PhaseEvent): Partial<GameState> {
    return {
        currentCustomer: null,
        currentNode: null
    };
}

/**
 * Reset daily counters for new business day
 */
export function resetDailyCounters(state: GameState, _event: PhaseEvent): Partial<GameState> {
    // Calculate effective max AP with milestone bonus
    const hasGoldStandard = state.activeMilestones.includes('cred_expert');
    const baseAP = state.stats.maxActionPoints + (hasGoldStandard ? 2 : 0);
    const apModifier = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.actionPointsModifier || 0), 0);
    const effectiveMaxAP = Math.max(1, baseAP + apModifier);

    // Calculate effective max energy for the upcoming night
    const effectiveMaxEnergy = getEffectiveNightEnergy(state.shopUpgrades);

    return {
        customersServedToday: 0,
        narrativeCustomersServedToday: 0,
        currentCustomer: null,
        currentNode: null,
        dayEvents: [],
        todayTransactions: [],
        violationFlags: [],
        lastSatisfaction: null,
        lastDepartureSatisfaction: null,
        stats: {
            ...state.stats,
            actionPoints: effectiveMaxAP,
            visitedToday: false
        },
        nightState: {
            ...state.nightState,
            energy: effectiveMaxEnergy,
            maxEnergy: effectiveMaxEnergy,
            actionsThisNight: []
        },
        // Reset insightedTonight flags
        inventory: state.inventory.map(item => ({
            ...item,
            insightedTonight: false
        }))
    };
}

/**
 * Set satisfaction to desperate (when customer is rejected)
 */
export function setSatisfactionDesperate(_state: GameState, _event: PhaseEvent): Partial<GameState> {
    return {
        lastSatisfaction: 'DESPERATE',
        lastDepartureSatisfaction: { scene: 'PAWN', level: 'DESPERATE' }
    };
}

// ============================================
// Day Transition Actions
// ============================================

/**
 * Increment day counter
 */
export function incrementDay(state: GameState, _event: PhaseEvent): Partial<GameState> {
    return {
        stats: {
            ...state.stats,
            day: state.stats.day + 1
        }
    };
}
