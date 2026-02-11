/**
 * Game Context (Refactored)
 *
 * Centralized state management for the game.
 * The reducer logic has been split into domain-specific reducers:
 *
 * - coreReducer: Game flow, phase transitions, transactions
 * - customerReducer: Customer state, appraisal, negotiation
 * - inventoryReducer: Item lifecycle (pawn, redeem, forfeit, sell)
 * - financialReducer: Cash, bills, medical expenses
 * - narrativeReducer: Event chains, mail, news
 * - expiryReducer: Item expiration scenarios
 * - nightReducer: Night phase mechanics (essence, energy)
 * - upgradeReducer: Shop upgrades and facilities
 * - appointmentReducer: Customer appointment system
 * - uiReducer: UI toggles (modals, panels)
 *
 * Each reducer is in store/reducers/ directory.
 * Action types are defined in store/actions/types.ts
 */

import React, { createContext, useContext, useReducer, PropsWithChildren, useEffect } from 'react';
import { GameState, ReputationType, MotherCondition } from '../types';
import { GamePhase, PhaseIs } from '../systems/core/phases';
import { saveGame } from '../systems/core/persistence';
import { GAME_CONFIG } from '../systems/game/config';
import { INITIAL_ESSENCE_BALANCE } from '../systems/economy/essence';
import { INITIAL_SHOP_UPGRADES } from '../systems/upgrades';
import { INITIAL_APPOINTMENT_BOARD_STATE } from '../systems/appointment';
import { createInitialBlackmarketState } from '../systems/blackmarket';
import { INITIAL_FORGERY_NOTORIETY } from '../systems/workshop/forgeryNotoriety';
import { createInitialAbilityState } from '../systems/characterAbility';
import { EMMA_CHAIN_INIT, SUSAN_CHAIN_INIT, ZHAO_CHAIN_INIT, LIN_CHAIN_INIT } from '../systems/narrative/storyRegistry';

// Import combined reducer and action types
import { gameReducer, Action } from './reducers';

// === Initial State ===
const initialState: GameState = {
    phase: { type: 'START_SCREEN' },
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
    activeChains: [EMMA_CHAIN_INIT, SUSAN_CHAIN_INIT, ZHAO_CHAIN_INIT, LIN_CHAIN_INIT],
    inbox: [],
    pendingMails: [],
    completedScenarioIds: [],
    dailyNews: [],
    activeMarketEffects: [],
    violationFlags: [],
    pendingNews: [],
    financialHistory: [],
    lastSatisfaction: null,
    lastDepartureSatisfaction: null,
    lastDealSummary: null,
    activeMilestones: [],
    // === EXPIRY SYSTEM ===
    currentExpiryEvent: null,
    expiryQueue: [],
    coreLostItems: [],
    unseenForfeitItemIds: [],
    // === NIGHT PHASE ===
    essenceBalance: { ...INITIAL_ESSENCE_BALANCE },
    nightState: {
        energy: GAME_CONFIG.NIGHT.BASE_ENERGY,
        maxEnergy: GAME_CONFIG.NIGHT.BASE_ENERGY,
        actionsThisNight: [] as string[],
        energyLevel: 0,
    },
    inProgressRecipes: [],
    // === SHOP UPGRADES ===
    shopUpgrades: { ...INITIAL_SHOP_UPGRADES },
    showUpgradeShop: false,
    showFacilityControl: false,
    // === APPOINTMENT BOARD ===
    appointmentBoard: { ...INITIAL_APPOINTMENT_BOARD_STATE },
    showAppointmentBoard: false,
    pendingAppointedCandidates: [],
    // === BLACK MARKET ===
    blackmarket: createInitialBlackmarketState(),
    showBlackmarket: false,
    // === FORGERY NOTORIETY (伪造声名) ===
    forgeryNotoriety: { ...INITIAL_FORGERY_NOTORIETY },
    // === NIGHT PANELS ===
    showWorkshop: false,
    showInsight: false,
    // === PENDING ITEM SELECTION ===
    pendingSelectedItemId: null,
    // === CUSTOMER INSIGHT ===
    currentCustomerInsight: null,
    currentForesightInfo: null,
    lastInsightTrainingResult: null,
    // === POLICE INVESTIGATION ===
    currentPoliceInvestigation: null,
    // === ITEM-DERIVED EVENTS ===
    currentItemDerivedEvent: null,
    // === DAILY CHALLENGE (每日挑战 v2.1) ===
    dailyChallenge: null,
    rejectedCustomersToday: 0,
    hadMistakeToday: false,
    hadHighRiskItemToday: false,
    // === CUSTOMER SCHEDULE (出场顺序 v2.1) ===
    dailyCustomerSchedule: null,
    scheduleSlotIndex: 0,
    // === CHARACTER ABILITY (人物能力升级系统) ===
    abilityState: createInitialAbilityState(),
    showAbilityPanel: false,
    lastConsequenceFlash: null,
    // === MORALE BUFF (探望 → 次日心态) ===
    moraleBuff: null,
    // === MORAL ECHO ===
    pendingEchoTexts: [],
    // === NPC FATE LOG (Victory Screen: Bitter Victory) ===
    npcFateLog: [],
    // === WORKSHOP (工作台归还结果) ===
    lastReturnResult: null,
    workshopUsageCount: 0,
    // === WORD OF MOUTH REFERRAL (口口相传推荐客户) ===
    pendingReferralCustomer: false,
    // === DEBUG FLAGS ===
    debugRevealFloor: false
};

// === Context ===
const GameContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

// === Provider ===
export const GameProvider = ({ children }: PropsWithChildren) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Auto-save on morning brief
    useEffect(() => {
        if (PhaseIs.morningBrief(state.phase)) {
            saveGame(state);
        }
    }, [state.phase]);

    return (
        <GameContext.Provider value={{ state, dispatch }}>
            {children}
        </GameContext.Provider>
    );
};

// === Hook ===
export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
};

// Re-export Action type for consumers
export type { Action } from './reducers';
