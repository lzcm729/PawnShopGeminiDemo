/**
 * Night Reducer
 * Handles night phase mechanics (essence, energy, research)
 */

import { GameState } from '../../types';
import { Action } from '../actions/types';
import { EssenceBalance } from '../../systems/economy/essence';

export function nightReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'ADD_ESSENCE': {
            const { essenceType, amount } = action.payload;
            const key = essenceType.toLowerCase() as keyof EssenceBalance;
            return {
                ...state,
                essenceBalance: {
                    ...state.essenceBalance,
                    [key]: state.essenceBalance[key] + amount
                }
            };
        }

        case 'ADD_ESSENCE_BATCH': {
            const gains = action.payload;
            return {
                ...state,
                essenceBalance: {
                    craft: state.essenceBalance.craft + (gains.craft || 0),
                    time: state.essenceBalance.time + (gains.time || 0),
                    vibe: state.essenceBalance.vibe + (gains.vibe || 0)
                }
            };
        }

        case 'SPEND_ESSENCE': {
            const { essenceType, amount } = action.payload;
            const key = essenceType.toLowerCase() as keyof EssenceBalance;
            const newAmount = state.essenceBalance[key] - amount;
            if (newAmount < 0) {
                // Silently reject - UI should prevent this from happening
                return state;
            }
            return {
                ...state,
                essenceBalance: {
                    ...state.essenceBalance,
                    [key]: newAmount
                }
            };
        }

        case 'SPEND_ESSENCE_BATCH': {
            const costs = action.payload;
            const newCraft = state.essenceBalance.craft - (costs.craft || 0);
            const newTime = state.essenceBalance.time - (costs.time || 0);
            const newVibe = state.essenceBalance.vibe - (costs.vibe || 0);
            if (newCraft < 0 || newTime < 0 || newVibe < 0) {
                // Silently reject - UI should prevent this from happening
                return state;
            }
            return {
                ...state,
                essenceBalance: {
                    craft: newCraft,
                    time: newTime,
                    vibe: newVibe
                }
            };
        }

        case 'CONVERT_ESSENCE': {
            const { from, to, amount } = action.payload;
            const ratio = 3; // 3:1 conversion
            const cost = amount * ratio;
            const fromKey = from.toLowerCase() as 'craft' | 'time' | 'vibe';
            const toKey = to.toLowerCase() as 'craft' | 'time' | 'vibe';
            if (fromKey === toKey || state.essenceBalance[fromKey] < cost) {
                return state;
            }
            return {
                ...state,
                essenceBalance: {
                    ...state.essenceBalance,
                    [fromKey]: state.essenceBalance[fromKey] - cost,
                    [toKey]: state.essenceBalance[toKey] + amount,
                }
            };
        }

        case 'CONSUME_NIGHT_ENERGY': {
            const amount = action.payload;
            const newEnergy = state.nightState.energy - amount;
            if (newEnergy < 0) {
                // Silently reject - UI should prevent this from happening
                return state;
            }
            return {
                ...state,
                nightState: {
                    ...state.nightState,
                    energy: newEnergy
                }
            };
        }

        case 'ADD_NIGHT_ENERGY': {
            const amount = action.payload;
            return {
                ...state,
                nightState: {
                    ...state.nightState,
                    energy: state.nightState.energy + amount
                }
            };
        }

        case 'RESET_NIGHT_STATE':
            return {
                ...state,
                nightState: {
                    energy: state.nightState.maxEnergy,
                    maxEnergy: state.nightState.maxEnergy,
                    actionsThisNight: [],
                    energyLevel: state.nightState.energyLevel ?? 0,
                }
            };

        case 'RECORD_NIGHT_ACTION':
            return {
                ...state,
                nightState: {
                    ...state.nightState,
                    actionsThisNight: [...state.nightState.actionsThisNight, action.payload]
                }
            };

        // === MULTI-NIGHT RECIPES ===

        case 'START_MULTI_NIGHT_RECIPE':
            return {
                ...state,
                inProgressRecipes: [...state.inProgressRecipes, action.payload]
            };

        case 'ADVANCE_MULTI_NIGHT_RECIPE': {
            const { itemId } = action.payload;
            return {
                ...state,
                inProgressRecipes: state.inProgressRecipes.map(r =>
                    r.itemId === itemId
                        ? { ...r, nightsCompleted: r.nightsCompleted + 1 }
                        : r
                )
            };
        }

        case 'COMPLETE_MULTI_NIGHT_RECIPE': {
            const { itemId } = action.payload;
            return {
                ...state,
                inProgressRecipes: state.inProgressRecipes.filter(r => r.itemId !== itemId)
            };
        }

        case 'CANCEL_MULTI_NIGHT_RECIPE': {
            const { itemId } = action.payload;
            return {
                ...state,
                inProgressRecipes: state.inProgressRecipes.filter(r => r.itemId !== itemId)
            };
        }

        default:
            return state;
    }
}
