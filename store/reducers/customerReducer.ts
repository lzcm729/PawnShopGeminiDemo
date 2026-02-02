/**
 * Customer Reducer
 * Handles customer-related state changes
 */

import { GameState, GamePhase, Mood } from '../../types';
import { Action } from '../actions/types';
import { getPatienceBonus } from '../../systems/upgrades';
import { generateValuationRange } from '../../systems/items/utils';

export function customerReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'SET_CUSTOMER': {
            if (!action.payload) return { ...state, currentCustomer: null };
            // Apply patience bonus from Tea Set upgrade (only for non-seller customers)
            const patienceBonus = getPatienceBonus(state.shopUpgrades);
            const basePatience = action.payload.patience;
            // Only apply bonus if customer has patience > 0 (normal customers, not special cases)
            const adjustedPatience = basePatience > 0 ? basePatience + patienceBonus : basePatience;
            const customerInit = { ...action.payload, mood: 'Neutral' as Mood, patience: adjustedPatience };
            return { ...state, currentCustomer: customerInit, phase: GamePhase.NEGOTIATION, lastSatisfaction: null };
        }

        case 'CLEAR_CUSTOMER':
            return { ...state, currentCustomer: null, lastDealSummary: null };

        case 'UPDATE_CUSTOMER_STATUS':
            if (!state.currentCustomer) return state;
            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    patience: action.payload.patience,
                    mood: action.payload.mood,
                    currentAskPrice: action.payload.currentAskPrice
                }
            };

        case 'UPDATE_ITEM_KNOWLEDGE': {
            if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state;
            const prevCount = state.currentCustomer.item.appraisalCount || 0;
            const prevNegative = state.currentCustomer.item.hasNegativeAppraisalEvent || false;
            const prevLogs = state.currentCustomer.item.logs || [];
            const newLogs = action.payload.log ? [...prevLogs, action.payload.log] : prevLogs;
            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: {
                        ...state.currentCustomer.item,
                        currentRange: action.payload.newRange,
                        revealedTraits: action.payload.revealedTraits,
                        uncertainty: action.payload.newUncertainty,
                        perceivedValue: action.payload.newPerceived,
                        appraised: true,
                        appraisalCount: action.payload.incrementAppraisalCount ? prevCount + 1 : prevCount,
                        hasNegativeAppraisalEvent: action.payload.hasNegativeEvent !== undefined ? action.payload.hasNegativeEvent : prevNegative,
                        logs: newLogs
                    }
                }
            };
        }

        case 'REALIZE_ITEM_TRUTH': {
            if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state;
            const item = state.currentCustomer.item;
            const newUncertainty = 0.1;
            const trueRange = generateValuationRange(item.realValue, undefined, newUncertainty);
            const newInitialRange = generateValuationRange(item.realValue, undefined, 0.4);
            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: {
                        ...item,
                        perceivedValue: undefined,
                        uncertainty: newUncertainty,
                        currentRange: trueRange,
                        initialRange: newInitialRange,
                        appraised: false
                    }
                }
            };
        }

        case 'MARK_TRAIT_USED': {
            if (!state.currentCustomer) return state;
            const currentItem = state.currentCustomer.item;
            const newUsed = [...(currentItem.usedTraitIds || []), action.payload.traitId];
            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: {
                        ...currentItem,
                        usedTraitIds: newUsed
                    }
                }
            };
        }

        case 'APPRAISE_ITEM':
            if (!state.currentCustomer) return state;
            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: {
                        ...state.currentCustomer.item,
                        appraised: true
                    }
                }
            };

        case 'SET_SATISFACTION':
            return { ...state, lastSatisfaction: action.payload };

        default:
            return state;
    }
}
