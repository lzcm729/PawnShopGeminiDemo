/**
 * Customer Reducer
 * Handles customer-related state changes
 *
 * NOTE: This reducer maintains backward compatibility with currentCustomer
 * while the codebase transitions to the new currentNode architecture.
 * When SET_CUSTOMER is called, we also create a corresponding PawnNode.
 */

import { GameState, Mood } from '../../types';
import { Action } from '../actions/types';
import { getPatienceBonus } from '../../systems/upgrades';
import { generateValuationRange } from '../../systems/items/utils';
import { createPawnNode, PawnNode } from '../../types/node';

export function customerReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'SET_CUSTOMER': {
            if (!action.payload) return { ...state, currentCustomer: null, currentNode: null };
            // Apply patience bonus from Tea Set upgrade (only for non-seller customers)
            const patienceBonus = getPatienceBonus(state.shopUpgrades);
            const basePatience = action.payload.patience;
            // Only apply bonus if customer has patience > 0 (normal customers, not special cases)
            const adjustedPatience = basePatience > 0 ? basePatience + patienceBonus : basePatience;
            const customerInit = { ...action.payload, mood: 'Neutral' as Mood, patience: adjustedPatience };

            // Create corresponding PawnNode for backward compatibility
            // This syncs the new node architecture with the old customer system
            let pawnNode: PawnNode | null = null;
            if (action.payload.interactionType === 'PAWN' || !action.payload.interactionType) {
                // Determine visit count from chain state if available
                let visitCount = 1;
                if (action.payload.chainId) {
                    const chain = state.activeChains.find(c => c.id === action.payload!.chainId);
                    if (chain) visitCount = chain.stage + 1;
                }
                pawnNode = createPawnNode(customerInit, visitCount);
            }

            // Phase transition handled by state machine (SET_CUSTOMER_EVENT)
            return {
                ...state,
                currentCustomer: customerInit,
                currentNode: pawnNode,
                // phase transition removed - handled by state machine
                lastSatisfaction: null
            };
        }

        case 'CLEAR_CUSTOMER':
            return { ...state, currentCustomer: null, currentNode: null, lastDealSummary: null };

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

            const updatedItem = {
                ...state.currentCustomer.item,
                currentRange: action.payload.newRange,
                revealedTraits: action.payload.revealedTraits,
                uncertainty: action.payload.newUncertainty,
                perceivedValue: action.payload.newPerceived,
                appraised: true,
                appraisalCount: action.payload.incrementAppraisalCount ? prevCount + 1 : prevCount,
                hasNegativeAppraisalEvent: action.payload.hasNegativeEvent !== undefined ? action.payload.hasNegativeEvent : prevNegative,
                logs: newLogs
            };

            // Also update currentNode if it's a PawnNode
            let updatedNode = state.currentNode;
            if (state.currentNode && state.currentNode.type === 'PAWN') {
                const pawnNode = state.currentNode as PawnNode;
                updatedNode = {
                    ...pawnNode,
                    item: {
                        ...pawnNode.item,
                        currentRange: action.payload.newRange ?? pawnNode.item.currentRange,
                        revealedTraits: action.payload.revealedTraits ?? pawnNode.item.revealedTraits,
                        uncertainty: action.payload.newUncertainty ?? pawnNode.item.uncertainty,
                        perceivedValue: action.payload.newPerceived !== undefined ? action.payload.newPerceived : pawnNode.item.perceivedValue,
                        appraised: true,
                        appraisalCount: action.payload.incrementAppraisalCount ? (pawnNode.item.appraisalCount || 0) + 1 : pawnNode.item.appraisalCount,
                        hasNegativeAppraisalEvent: action.payload.hasNegativeEvent !== undefined ? action.payload.hasNegativeEvent : pawnNode.item.hasNegativeAppraisalEvent,
                        logs: action.payload.log ? [...pawnNode.item.logs, action.payload.log] : pawnNode.item.logs
                    }
                };
            }

            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: updatedItem
                },
                currentNode: updatedNode
            };
        }

        case 'REALIZE_ITEM_TRUTH': {
            if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state;
            const item = state.currentCustomer.item;
            const newUncertainty = 0.1;
            const trueRange = generateValuationRange(item.realValue, undefined, newUncertainty);
            const newInitialRange = generateValuationRange(item.realValue, undefined, 0.4);

            const updatedItem = {
                ...item,
                perceivedValue: undefined,
                uncertainty: newUncertainty,
                currentRange: trueRange,
                initialRange: newInitialRange,
                appraised: false
            };

            // Also update currentNode if it's a PawnNode
            let updatedNode = state.currentNode;
            if (state.currentNode && state.currentNode.type === 'PAWN') {
                const pawnNode = state.currentNode as PawnNode;
                updatedNode = {
                    ...pawnNode,
                    item: {
                        ...pawnNode.item,
                        perceivedValue: undefined,
                        uncertainty: newUncertainty,
                        currentRange: trueRange,
                        initialRange: newInitialRange,
                        appraised: false
                    }
                };
            }

            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: updatedItem
                },
                currentNode: updatedNode
            };
        }

        case 'MARK_TRAIT_USED': {
            if (!state.currentCustomer) return state;
            const currentItem = state.currentCustomer.item;
            const newUsed = [...(currentItem.usedTraitIds || []), action.payload.traitId];

            // Also update currentNode if it's a PawnNode
            let updatedNode = state.currentNode;
            if (state.currentNode && state.currentNode.type === 'PAWN') {
                const pawnNode = state.currentNode as PawnNode;
                updatedNode = {
                    ...pawnNode,
                    item: {
                        ...pawnNode.item,
                        usedTraitIds: [...(pawnNode.item.usedTraitIds || []), action.payload.traitId]
                    }
                };
            }

            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: {
                        ...currentItem,
                        usedTraitIds: newUsed
                    }
                },
                currentNode: updatedNode
            };
        }

        case 'APPRAISE_ITEM': {
            if (!state.currentCustomer) return state;

            // Also update currentNode if it's a PawnNode
            let updatedNode = state.currentNode;
            if (state.currentNode && state.currentNode.type === 'PAWN') {
                const pawnNode = state.currentNode as PawnNode;
                updatedNode = {
                    ...pawnNode,
                    item: {
                        ...pawnNode.item,
                        appraised: true
                    }
                };
            }

            return {
                ...state,
                currentCustomer: {
                    ...state.currentCustomer,
                    item: {
                        ...state.currentCustomer.item,
                        appraised: true
                    }
                },
                currentNode: updatedNode
            };
        }

        case 'SET_SATISFACTION':
            return { ...state, lastSatisfaction: action.payload };

        default:
            return state;
    }
}
