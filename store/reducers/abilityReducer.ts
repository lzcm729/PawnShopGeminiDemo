/**
 * Ability Reducer
 * Handles character ability system actions (skill unlock, usage tracking, moral echoes)
 */

import { GameState, ReputationType } from '../../types';
import { Action } from '../actions/types';
import { SkillId } from '../../systems/characterAbility/types';
import { SKILL_DEFINITIONS } from '../../systems/characterAbility/skillDefinitions';
import { removeDeliveredEchoes, enqueueEchoes } from '../../systems/characterAbility/moralEcho';
import { clampReputation } from '../../systems/core/reputationUtils';

export function abilityReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'UNLOCK_ABILITY_SKILL': {
            const { skillId } = action.payload;
            // Verify skill exists
            if (!SKILL_DEFINITIONS[skillId]) return state;
            // Already unlocked
            if (state.abilityState.skills[skillId].unlocked) return state;

            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    skills: {
                        ...state.abilityState.skills,
                        [skillId]: {
                            ...state.abilityState.skills[skillId],
                            unlocked: true,
                        },
                    },
                },
            };
        }

        case 'MARK_SKILL_USED': {
            const { skillId } = action.payload;
            const currentState = state.abilityState.skills[skillId];
            if (!currentState) return state;

            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    skills: {
                        ...state.abilityState.skills,
                        [skillId]: {
                            ...currentState,
                            useCount: currentState.useCount + 1,
                        },
                    },
                    // Also mark as used this negotiation (for per-negotiation limits)
                    skillsUsedThisNegotiation: [
                        ...state.abilityState.skillsUsedThisNegotiation,
                        skillId,
                    ],
                },
            };
        }

        case 'RESET_NEGOTIATION_SKILLS': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    skillsUsedThisNegotiation: [],
                },
            };
        }

        case 'RESET_DEPARTURE_SKILLS': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    extraCareUsedThisDeparture: false,
                },
            };
        }

        case 'SET_EXTRA_CARE_USED': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    extraCareUsedThisDeparture: true,
                },
            };
        }

        case 'ENQUEUE_MORAL_ECHOES': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    moralEchoQueue: enqueueEchoes(
                        state.abilityState.moralEchoQueue,
                        action.payload
                    ),
                },
            };
        }

        case 'PROCESS_MORAL_ECHOES': {
            const { day } = action.payload;
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    moralEchoQueue: removeDeliveredEchoes(
                        state.abilityState.moralEchoQueue,
                        day
                    ),
                },
            };
        }

        case 'UPDATE_WORD_OF_MOUTH': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    wordOfMouth: action.payload,
                },
            };
        }

        case 'UPDATE_FORESIGHT_FATIGUE': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    foresightFatigue: action.payload,
                },
            };
        }

        case 'SET_ABILITY_STATE': {
            return {
                ...state,
                abilityState: action.payload,
            };
        }

        case 'TOGGLE_ABILITY_PANEL': {
            return {
                ...state,
                showAbilityPanel: !state.showAbilityPanel,
            };
        }

        case 'APPLY_EXTRA_CARE': {
            const { hopeChange, humanityChange, chainId } = action.payload;

            // 1. Update reputation (humanity)
            const newRep = { ...state.reputation };
            newRep[ReputationType.HUMANITY] += humanityChange;
            clampReputation(newRep);

            // 2. Update hope on the active chain (if chainId provided and chain exists)
            let updatedChains = state.activeChains;
            if (chainId) {
                updatedChains = state.activeChains.map(chain => {
                    if (chain.id === chainId) {
                        const currentHope = chain.variables?.hope ?? 50;
                        return {
                            ...chain,
                            variables: {
                                ...chain.variables,
                                hope: Math.min(100, Math.max(0, currentHope + hopeChange)),
                            },
                        };
                    }
                    return chain;
                });
            }

            return {
                ...state,
                reputation: newRep,
                activeChains: updatedChains,
            };
        }

        default:
            return state;
    }
}
