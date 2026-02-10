/**
 * Core Reducer
 * Handles game flow, phase transitions, transactions
 */

import { GameState, ReputationType, TransactionRecord } from '../../types';
import { clampReputation } from '../../systems/core/reputationUtils';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { clearSave } from '../../systems/core/persistence';
import { GAME_CONFIG } from '../../systems/game/config';
import { INITIAL_SHOP_UPGRADES, getEffectiveNightEnergy, getTotalMaintenanceCost } from '../../systems/upgrades';
import { INITIAL_APPOINTMENT_BOARD_STATE } from '../../systems/appointment';
import { GamePhase, LegacyGamePhase } from '../../systems/core/types';
import { getGewuEnergyMax } from '../../systems/insight';

/**
 * Infer phase from old saves that used the legacy GamePhase enum.
 * Maps string-based phase values to the new discriminated union type.
 */
function inferPhaseFromLegacySave(legacyPhase: any): GamePhase {
    // Handle string values from old saves
    const phaseType = typeof legacyPhase === 'string' ? legacyPhase : legacyPhase?.type;

    // If it already has the new structure, return as-is
    if (legacyPhase && typeof legacyPhase === 'object' && 'type' in legacyPhase) {
        return legacyPhase as GamePhase;
    }

    switch (phaseType) {
        case 'START_SCREEN':
        case LegacyGamePhase.START_SCREEN:
            return { type: 'START_SCREEN' };
        case 'MORNING_BRIEF':
        case LegacyGamePhase.MORNING_BRIEF:
            return { type: 'MORNING_BRIEF' };
        case 'BUSINESS':
        case LegacyGamePhase.BUSINESS:
            return { type: 'BUSINESS', subphase: 'IDLE' };
        case 'NEGOTIATION':
        case LegacyGamePhase.NEGOTIATION:
            return { type: 'NEGOTIATION', mode: 'PAWN' };
        case 'DEPARTURE':
        case LegacyGamePhase.DEPARTURE:
            return { type: 'DEPARTURE' };
        case 'NIGHT':
        case LegacyGamePhase.NIGHT:
            return { type: 'NIGHT', subphase: 'ACTIVE' };
        case 'GAME_OVER':
        case LegacyGamePhase.GAME_OVER:
            return { type: 'GAME_OVER', reason: 'Unknown' };
        case 'VICTORY':
        case LegacyGamePhase.VICTORY:
            return { type: 'VICTORY' };
        default:
            return { type: 'START_SCREEN' };
    }
}

export function coreReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'LOAD_GAME': {
            // Ensure shop upgrades are migrated from old saves
            const shopUpgrades = action.payload.shopUpgrades || { ...INITIAL_SHOP_UPGRADES };
            // Ensure appointment board is migrated from old saves
            const appointmentBoard = action.payload.appointmentBoard || { ...INITIAL_APPOINTMENT_BOARD_STATE };
            // Ensure pending appointments are migrated
            const pendingAppointedCandidates = action.payload.pendingAppointedCandidates || [];
            // Recalculate maxEnergy based on upgrades and gewu level
            const upgradeMaxEnergy = getEffectiveNightEnergy(shopUpgrades);
            const gewuLevel = action.payload.abilityState?.gewuLevel ?? 1;
            const gewuMaxEnergy = getGewuEnergyMax(gewuLevel);
            const effectiveMaxEnergy = Math.max(upgradeMaxEnergy, gewuMaxEnergy);

            // Migrate phase from old saves
            // Old saves had phase as string enum, new format is discriminated union
            // Also handle saves that had phase2 field (migration period)
            const loadedPhase = (action.payload as any).phase2 ?? action.payload.phase;
            const phase = inferPhaseFromLegacySave(loadedPhase);

            // Migrate abilityState from old saves (add gewu fields)
            const loadedAbility = action.payload.abilityState;
            const migratedAbility = loadedAbility ? {
                ...loadedAbility,
                totalEpiphanies: loadedAbility.totalEpiphanies ?? 0,
                gewuLevel: loadedAbility.gewuLevel ?? 1,
            } : undefined;

            return {
                ...action.payload,
                shopUpgrades,
                showUpgradeShop: action.payload.showUpgradeShop ?? false,
                showFacilityControl: action.payload.showFacilityControl ?? false,
                appointmentBoard,
                showAppointmentBoard: action.payload.showAppointmentBoard ?? false,
                pendingAppointedCandidates,
                // Ensure currentNode is present (migration from old saves)
                currentNode: action.payload.currentNode ?? null,
                // Ensure narrativeCustomersServedToday is present (migration from old saves)
                narrativeCustomersServedToday: action.payload.narrativeCustomersServedToday ?? 0,
                // Migrate abilityState with gewu fields
                ...(migratedAbility ? { abilityState: migratedAbility } : {}),
                nightState: {
                    ...action.payload.nightState,
                    maxEnergy: effectiveMaxEnergy,
                    energyLevel: action.payload.nightState?.energyLevel ?? 0,
                },
                // Set the migrated phase
                phase,
                // v2.1 migration: daily challenge & schedule
                dailyChallenge: action.payload.dailyChallenge ?? null,
                rejectedCustomersToday: action.payload.rejectedCustomersToday ?? 0,
                hadMistakeToday: action.payload.hadMistakeToday ?? false,
                hadHighRiskItemToday: action.payload.hadHighRiskItemToday ?? false,
                dailyCustomerSchedule: action.payload.dailyCustomerSchedule ?? null,
                scheduleSlotIndex: action.payload.scheduleSlotIndex ?? 0,
                // P1-6 / H-1 migration: moraleBuff and purchasedCare
                moraleBuff: action.payload.moraleBuff ?? null,
                // NPC fate log migration
                npcFateLog: action.payload.npcFateLog ?? [],
                stats: {
                    ...action.payload.stats,
                    // Recalculate dailyExpenses from base + maintenance (fixes old saves with stale $50)
                    dailyExpenses: GAME_CONFIG.DAILY_EXPENSES + getTotalMaintenanceCost(shopUpgrades),
                    motherStatus: {
                        ...action.payload.stats.motherStatus,
                        purchasedCare: action.payload.stats.motherStatus.purchasedCare ?? null
                    }
                }
            };
        }

        case 'START_GAME':
            // Phase transition handled by state machine (NEW_GAME event)
            clearSave();
            return state;

        case 'START_DAY': {
            // Phase transition handled by state machine (EXPIRY_CHECK_DONE event)
            // This action now only handles data reset operations
            const apModifier = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.actionPointsModifier || 0), 0);

            // Milestone Effect: Gold Standard (+2 AP)
            const hasGoldStandard = state.activeMilestones.includes('cred_expert');
            const baseAP = state.stats.maxActionPoints + (hasGoldStandard ? 2 : 0);

            const effectiveMaxAP = Math.max(1, baseAP + apModifier);
            return {
                ...state,
                customersServedToday: 0,
                narrativeCustomersServedToday: 0,
                currentCustomer: null,  // @deprecated - keep for compatibility
                currentNode: null,      // Clear node when starting new day
                dayEvents: [],
                todayTransactions: [],
                // phase transition removed - handled by state machine
                stats: { ...state.stats, actionPoints: effectiveMaxAP, visitedToday: false },
                violationFlags: [],
                lastSatisfaction: null,
                lastDepartureSatisfaction: null,
                // Reset night state for the upcoming night
                nightState: {
                    ...state.nightState,
                    energy: state.nightState.maxEnergy,
                    actionsThisNight: []
                },
                // Reset insightedTonight flags so items can be researched in the upcoming night
                inventory: state.inventory.map(item => ({
                    ...item,
                    insightedTonight: false
                })),
                // Reset daily challenge tracking (v2.1)
                rejectedCustomersToday: 0,
                hadMistakeToday: false,
                hadHighRiskItemToday: false,
                dailyCustomerSchedule: null,
                scheduleSlotIndex: 0
            };
        }

        case 'OPEN_SHOP': {
            // Phase transition handled by state machine (OPEN_SHOP event -> DAY_START.EXPIRY_CHECK)
            // This action now only handles mail processing data
            // FIX: Process Daily Mail on Shop Open
            // This ensures that pending mails seen in Morning Brief are actually delivered to the Inbox
            const today = state.stats.day;
            const arrivingMails = state.pendingMails.filter(m => m.arrivalDay <= today);
            const remainingPending = state.pendingMails.filter(m => m.arrivalDay > today);

            const newInbox = arrivingMails.length > 0
                ? [...arrivingMails, ...state.inbox]
                : state.inbox;

            return {
                ...state,
                // phase transition removed - handled by state machine
                inbox: newInbox,
                pendingMails: remainingPending
            };
        }

        case 'START_NIGHT':
            // Phase transition handled by state machine (CLOSE_SHOP event)
            // This action now only handles data cleanup
            // Sound effect removed to prevent duplicate play with UI interaction
            return { ...state, currentCustomer: null, currentNode: null, lastSatisfaction: null, lastDepartureSatisfaction: null };

        case 'SET_PHASE':
            // Handle legacy SET_PHASE action - convert to new format if needed
            return { ...state, phase: inferPhaseFromLegacySave(action.payload) };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'MANUAL_CLOSE_SHOP':
            playSfx('CLICK');
            return { ...state, phase: { type: 'NIGHT', subphase: 'ACTIVE' } };

        case 'MARK_NO_MORE_CUSTOMERS':
            // Set to effective max to trigger shop closed state
            // Effective max = max(maxCustomersPerDay, narrativeServed) to handle cases
            // where narrative customers exceed the base limit
            const effectiveMaxForClose = Math.max(state.maxCustomersPerDay, state.narrativeCustomersServedToday);
            return { ...state, customersServedToday: effectiveMaxForClose };

        case 'INCREMENT_NARRATIVE_CUSTOMER':
            return { ...state, narrativeCustomersServedToday: state.narrativeCustomersServedToday + 1 };

        case 'GAME_OVER':
            clearSave();
            playSfx('FAIL');
            return { ...state, phase: { type: 'GAME_OVER', reason: action.payload }, dayEvents: [...state.dayEvents, action.payload] };

        case 'RESOLVE_TRANSACTION': {
            const { cashDelta, reputationDelta, item, log, customerName, dealQuality } = action.payload;
            if (cashDelta > 0) playSfx('CASH'); else if (cashDelta < 0) playSfx('CLICK');

            // --- VIOLATION CHECK (Task 11 Fix) ---
            // Verify if we accepted an illicit item during a crackdown
            let newViolationFlags = [...state.violationFlags];
            const currentRisk = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.riskModifier || 0), 0);

            if (item && (item.isStolen || (item.category === '违禁品' && !item.isSuspicious))) {
                if (currentRisk > 0 && !newViolationFlags.includes('police_risk_ignored')) {
                    newViolationFlags.push('police_risk_ignored');
                }
            }
            // -------------------------------------

            const newRep = { ...state.reputation };
            if (reputationDelta[ReputationType.HUMANITY]) newRep[ReputationType.HUMANITY] += reputationDelta[ReputationType.HUMANITY]!;
            if (reputationDelta[ReputationType.CREDIBILITY]) newRep[ReputationType.CREDIBILITY] += reputationDelta[ReputationType.CREDIBILITY]!;
            if (reputationDelta[ReputationType.INNOCENCE]) newRep[ReputationType.INNOCENCE] += reputationDelta[ReputationType.INNOCENCE]!;
            clampReputation(newRep);

            const newInventory = item ? [...state.inventory, item] : state.inventory;
            const newTransaction: TransactionRecord | null = item ? { id: crypto.randomUUID(), description: `收当: ${item.name}`, amount: cashDelta, type: 'PAWN' } : null;
            const updatedTransactions = newTransaction ? [...state.todayTransactions, newTransaction] : state.todayTransactions;
            const servedCount = state.customersServedToday + 1;
            const completedId = state.currentCustomer?.id;
            const newCompletedIds = (completedId && !completedId.startsWith('proc-')) ? [...state.completedScenarioIds, completedId] : state.completedScenarioIds;

            // Build deal summary for departure view
            const interestRate = action.payload.interestRate ?? 0.05;
            const newDealSummary = item ? {
                cashDelta,
                reputationDelta,
                itemName: item.name,
                itemCategory: item.category,
                dealQuality: dealQuality || 'fair',
                interestRate,
                ...(action.payload.merchantMonologue ? { merchantMonologue: action.payload.merchantMonologue } : {}),
            } : null;

            // Phase transition handled by state machine (TRANSACTION_COMPLETE event)
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + cashDelta },
                reputation: newRep,
                inventory: newInventory,
                dayEvents: [...state.dayEvents, log],
                todayTransactions: updatedTransactions,
                customersServedToday: servedCount,
                // phase transition removed - handled by state machine
                completedScenarioIds: newCompletedIds,
                violationFlags: newViolationFlags,
                lastDealSummary: newDealSummary
            };
        }

        case 'REJECT_DEAL': {
            // Phase transition handled by state machine (CUSTOMER_REJECTED event)
            const servedCount = state.customersServedToday + 1;
            const completedId = state.currentCustomer?.id;
            const newCompletedIds = (completedId && !completedId.startsWith('proc-')) ? [...state.completedScenarioIds, completedId] : state.completedScenarioIds;
            playSfx('CLICK');
            return {
                ...state,
                dayEvents: [...state.dayEvents, `Turned away ${state.currentCustomer?.name}`],
                customersServedToday: servedCount,
                // phase transition removed - handled by state machine
                completedScenarioIds: newCompletedIds,
                rejectedCustomersToday: state.rejectedCustomersToday + 1
            };
        }

        // === DAILY CHALLENGE (v2.1) ===
        case 'SET_DAILY_CHALLENGE':
            return { ...state, dailyChallenge: action.payload };

        case 'COMPLETE_DAILY_CHALLENGE':
            if (!state.dailyChallenge || state.dailyChallenge.isCompleted) return state;
            return {
                ...state,
                dailyChallenge: { ...state.dailyChallenge, isCompleted: true }
            };

        case 'TRACK_REJECTED_CUSTOMER':
            return { ...state, rejectedCustomersToday: state.rejectedCustomersToday + 1 };

        case 'TRACK_MISTAKE':
            return { ...state, hadMistakeToday: true };

        case 'TRACK_HIGH_RISK_ITEM':
            return { ...state, hadHighRiskItemToday: true };

        // === CUSTOMER SCHEDULE (v2.1) ===
        case 'SET_DAILY_SCHEDULE':
            return { ...state, dailyCustomerSchedule: action.payload, scheduleSlotIndex: 0 };

        case 'ADVANCE_SCHEDULE_SLOT':
            return { ...state, scheduleSlotIndex: state.scheduleSlotIndex + 1 };

        default:
            return state;
    }
}
