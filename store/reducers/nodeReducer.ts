/**
 * Node Reducer
 * Handles GameNode state management for the new unified node architecture
 */

import { GameState } from '../../types';
import { Action } from '../actions/types';
import { getPatienceBonus } from '../../systems/upgrades';
import { isPawnNode, PawnNode } from '../../types/node';
import { GamePhase } from '../../systems/core/phases';

export function nodeReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'SET_NODE': {
            if (!action.payload) {
                return { ...state, currentNode: null };
            }

            let node = action.payload;

            // Apply patience bonus from Tea Set upgrade (only for PawnNodes)
            if (isPawnNode(node)) {
                const patienceBonus = getPatienceBonus(state.shopUpgrades);
                const basePatience = node.customer.patience;
                const adjustedPatience = basePatience > 0 ? basePatience + patienceBonus : basePatience;

                node = {
                    ...node,
                    customer: {
                        ...node.customer,
                        patience: adjustedPatience
                    }
                };
            }

            return {
                ...state,
                currentNode: node,
                phase: { type: 'NEGOTIATION', mode: 'PAWN' } as GamePhase,
                lastSatisfaction: null
            };
        }

        case 'CLEAR_NODE':
            return { ...state, currentNode: null, lastDealSummary: null };

        case 'UPDATE_NODE_ITEM': {
            // Update item data within a PawnNode
            if (!state.currentNode || !isPawnNode(state.currentNode)) {
                return state;
            }

            const pawnNode = state.currentNode as PawnNode;
            const prevItem = pawnNode.item;
            const prevCount = prevItem.appraisalCount || 0;
            const prevNegative = prevItem.hasNegativeAppraisalEvent || false;
            const prevLogs = prevItem.logs || [];
            const newLogs = action.payload.log ? [...prevLogs, action.payload.log] : prevLogs;

            const updatedItem = {
                ...prevItem,
                currentRange: action.payload.newRange ?? prevItem.currentRange,
                revealedTraits: action.payload.revealedTraits ?? prevItem.revealedTraits,
                uncertainty: action.payload.newUncertainty ?? prevItem.uncertainty,
                perceivedValue: action.payload.newPerceived !== undefined ? action.payload.newPerceived : prevItem.perceivedValue,
                appraised: true,
                appraisalCount: action.payload.incrementAppraisalCount ? prevCount + 1 : prevCount,
                hasNegativeAppraisalEvent: action.payload.hasNegativeEvent !== undefined ? action.payload.hasNegativeEvent : prevNegative,
                logs: newLogs
            };

            return {
                ...state,
                currentNode: {
                    ...pawnNode,
                    item: updatedItem
                }
            };
        }

        default:
            return state;
    }
}
