/**
 * Police Reducer
 * Handles stolen goods decisions and police investigation events
 */

import { GameState, ReputationType, ItemStatus } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';

export function policeReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'STOLEN_ITEM_DECISION': {
            const { accept } = action.payload;
            const currentCustomer = state.currentCustomer;

            if (!currentCustomer || !currentCustomer.item) {
                return state;
            }

            const item = currentCustomer.item;

            if (accept) {
                // Player accepts stolen goods
                // The actual transaction will be committed by the normal transaction flow
                // Here we just apply the reputation changes specific to accepting stolen goods
                // Note: The reputation change happens when RESOLVE_TRANSACTION is called
                // This action is for UI confirmation only - the actual changes
                // are handled in evaluateTransaction and commitTransaction
                playSfx('CLICK');
                return state;
            } else {
                // Player rejects stolen goods - cancel transaction, customer leaves
                playSfx('CLICK');
                const newRep = { ...state.reputation };
                newRep[ReputationType.INNOCENCE] = Math.min(100, newRep[ReputationType.INNOCENCE] + 1);

                const servedCount = state.customersServedToday + 1;

                return {
                    ...state,
                    reputation: newRep,
                    customersServedToday: servedCount,
                    phase: { type: 'DEPARTURE' },
                    lastSatisfaction: 'RESENTFUL',
                    dayEvents: [
                        ...state.dayEvents,
                        `拒绝收购疑似赃物: ${item.name}。(Innocence +1)`
                    ]
                };
            }
        }

        case 'TRIGGER_POLICE_INVESTIGATION': {
            const { itemId, itemName } = action.payload;
            playSfx('FAIL');
            return {
                ...state,
                currentPoliceInvestigation: { itemId, itemName },
                dayEvents: [
                    ...state.dayEvents,
                    `[警方调查] 有人举报店内存有来历不明的物品...`
                ]
            };
        }

        case 'POLICE_INVESTIGATION_DECISION': {
            const { surrender, itemId } = action.payload;
            const item = state.inventory.find(i => i.id === itemId);

            if (!item) {
                return {
                    ...state,
                    currentPoliceInvestigation: null
                };
            }

            const newRep = { ...state.reputation };

            if (surrender) {
                // Player surrenders the stolen item - confiscated
                playSfx('CLICK');
                newRep[ReputationType.INNOCENCE] = Math.min(100, newRep[ReputationType.INNOCENCE] + 1);

                // Remove item from inventory (mark as SOLD with special log)
                const updatedInventory = state.inventory.map(i => {
                    if (i.id === itemId) {
                        return {
                            ...i,
                            status: ItemStatus.SOLD,
                            logs: [
                                ...(i.logs || []),
                                {
                                    id: crypto.randomUUID(),
                                    day: state.stats.day,
                                    content: '物品被警方没收。',
                                    type: 'SOLD' as const,
                                    metadata: { reason: 'police_confiscation' }
                                }
                            ]
                        };
                    }
                    return i;
                });

                return {
                    ...state,
                    inventory: updatedInventory,
                    reputation: newRep,
                    currentPoliceInvestigation: null,
                    dayEvents: [
                        ...state.dayEvents,
                        `[警方调查] 主动交出 ${item.name}，警方表示感谢。(Innocence +1)`
                    ]
                };
            } else {
                // Player conceals the stolen item
                playSfx('FAIL');
                newRep[ReputationType.INNOCENCE] = Math.max(0, newRep[ReputationType.INNOCENCE] - 3);

                return {
                    ...state,
                    reputation: newRep,
                    currentPoliceInvestigation: null,
                    dayEvents: [
                        ...state.dayEvents,
                        `[警方调查] 声称店内没有赃物。警方心存怀疑地离开。(Innocence -3)`
                    ]
                };
            }
        }

        case 'CLEAR_POLICE_INVESTIGATION': {
            return {
                ...state,
                currentPoliceInvestigation: null
            };
        }

        default:
            return state;
    }
}
