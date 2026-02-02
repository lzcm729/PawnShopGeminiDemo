/**
 * Core Reducer
 * Handles game flow, phase transitions, transactions
 */

import { GameState, GamePhase, ReputationType, TransactionRecord, Mood, ReputationProfile } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { clearSave } from '../../systems/core/persistence';
import { GAME_CONFIG } from '../../systems/game/config';
import { INITIAL_SHOP_UPGRADES, getEffectiveNightEnergy } from '../../systems/upgrades';
import { INITIAL_APPOINTMENT_BOARD_STATE } from '../../systems/appointment';

export function coreReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'LOAD_GAME': {
            // Ensure shop upgrades are migrated from old saves
            const shopUpgrades = action.payload.shopUpgrades || { ...INITIAL_SHOP_UPGRADES };
            // Ensure appointment board is migrated from old saves
            const appointmentBoard = action.payload.appointmentBoard || { ...INITIAL_APPOINTMENT_BOARD_STATE };
            // Ensure pending appointments are migrated
            const pendingAppointedCandidates = action.payload.pendingAppointedCandidates || [];
            // Recalculate maxEnergy based on upgrades
            const effectiveMaxEnergy = getEffectiveNightEnergy(shopUpgrades);
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
                nightState: {
                    ...action.payload.nightState,
                    maxEnergy: effectiveMaxEnergy
                }
            };
        }

        case 'START_GAME':
            clearSave();
            return { ...state, phase: GamePhase.MORNING_BRIEF };

        case 'START_DAY': {
            const apModifier = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.actionPointsModifier || 0), 0);

            // Milestone Effect: Gold Standard (+2 AP)
            const hasGoldStandard = state.activeMilestones.includes('cred_expert');
            const baseAP = state.stats.maxActionPoints + (hasGoldStandard ? 2 : 0);

            const effectiveMaxAP = Math.max(1, baseAP + apModifier);
            return {
                ...state,
                customersServedToday: 0,
                currentCustomer: null,  // @deprecated - keep for compatibility
                currentNode: null,      // Clear node when starting new day
                dayEvents: [],
                todayTransactions: [],
                phase: GamePhase.BUSINESS,
                stats: { ...state.stats, actionPoints: effectiveMaxAP, visitedToday: false },
                violationFlags: [],
                lastSatisfaction: null,
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
                }))
            };
        }

        case 'OPEN_SHOP': {
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
                phase: GamePhase.BUSINESS,
                inbox: newInbox,
                pendingMails: remainingPending
            };
        }

        case 'START_NIGHT':
            // Sound effect removed to prevent duplicate play with UI interaction
            return { ...state, phase: GamePhase.NIGHT, currentCustomer: null, currentNode: null, lastSatisfaction: null };

        case 'SET_PHASE':
            return { ...state, phase: action.payload };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'MANUAL_CLOSE_SHOP':
            playSfx('CLICK');
            return { ...state, phase: GamePhase.NIGHT };

        case 'MARK_NO_MORE_CUSTOMERS':
            return { ...state, customersServedToday: state.maxCustomersPerDay };

        case 'GAME_OVER':
            clearSave();
            playSfx('FAIL');
            return { ...state, phase: GamePhase.GAME_OVER, dayEvents: [...state.dayEvents, action.payload] };

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
            if (reputationDelta[ReputationType.UNDERWORLD]) newRep[ReputationType.UNDERWORLD] += reputationDelta[ReputationType.UNDERWORLD]!;
            Object.keys(newRep).forEach(key => { newRep[key as ReputationType] = Math.max(0, Math.min(100, newRep[key as ReputationType])); });

            const newInventory = item ? [...state.inventory, item] : state.inventory;
            const newTransaction: TransactionRecord | null = item ? { id: crypto.randomUUID(), description: `收当: ${item.name}`, amount: cashDelta, type: 'PAWN' } : null;
            const updatedTransactions = newTransaction ? [...state.todayTransactions, newTransaction] : state.todayTransactions;
            const servedCount = state.customersServedToday + 1;
            const completedId = state.currentCustomer?.id;
            const newCompletedIds = (completedId && !completedId.startsWith('proc-')) ? [...state.completedScenarioIds, completedId] : state.completedScenarioIds;

            // Build deal summary for departure view
            const newDealSummary = item ? {
                cashDelta,
                reputationDelta,
                itemName: item.name,
                itemCategory: item.category,
                dealQuality: dealQuality || 'fair'
            } : null;

            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + cashDelta },
                reputation: newRep,
                inventory: newInventory,
                dayEvents: [...state.dayEvents, log],
                todayTransactions: updatedTransactions,
                customersServedToday: servedCount,
                phase: GamePhase.DEPARTURE,
                completedScenarioIds: newCompletedIds,
                violationFlags: newViolationFlags,
                lastDealSummary: newDealSummary
            };
        }

        case 'REJECT_DEAL': {
            const servedCount = state.customersServedToday + 1;
            const completedId = state.currentCustomer?.id;
            const newCompletedIds = (completedId && !completedId.startsWith('proc-')) ? [...state.completedScenarioIds, completedId] : state.completedScenarioIds;
            playSfx('CLICK');
            return {
                ...state,
                dayEvents: [...state.dayEvents, `Turned away ${state.currentCustomer?.name}`],
                customersServedToday: servedCount,
                phase: GamePhase.DEPARTURE,
                completedScenarioIds: newCompletedIds
            };
        }

        default:
            return state;
    }
}
