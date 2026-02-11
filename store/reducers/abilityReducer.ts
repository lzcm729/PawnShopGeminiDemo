/**
 * Ability Reducer
 * Handles character ability system actions (skill unlock, usage tracking, moral echoes)
 */

import { GameState, ReputationType } from '../../types';
import { Action } from '../actions/types';
import { SkillId } from '../../systems/characterAbility/types';
import { SKILL_DEFINITIONS } from '../../systems/characterAbility/skillDefinitions';
import { removeDeliveredEchoes, enqueueEchoes } from '../../systems/characterAbility/moralEcho';
import { scheduleWordOfMouthCheck, isSkillUnlocked } from '../../systems/characterAbility/abilityEngine';
import { clampReputation } from '../../systems/core/reputationUtils';
import { calculateGewuLevel, getGewuEnergyMax } from '../../systems/insight';
import { getEffectiveNightEnergy } from '../../systems/upgrades';

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
                    comfortUsedThisDeparture: false,
                },
            };
        }

        case 'SET_COMFORT_USED': {
            return {
                ...state,
                abilityState: {
                    ...state.abilityState,
                    comfortUsedThisDeparture: true,
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

        case 'SET_ECHO_TEXTS': {
            return {
                ...state,
                pendingEchoTexts: action.payload,
            };
        }

        case 'CLEAR_ECHO_TEXTS': {
            return {
                ...state,
                pendingEchoTexts: [],
            };
        }

        case 'RECORD_EPIPHANY': {
            const newTotal = (state.abilityState.totalEpiphanies ?? 0) + 1;
            const newGewuLevel = calculateGewuLevel(newTotal);
            const oldGewuLevel = state.abilityState.gewuLevel ?? 1;

            // Update ability state with new epiphany count and level
            const updatedAbility = {
                ...state.abilityState,
                totalEpiphanies: newTotal,
                gewuLevel: newGewuLevel,
            };

            // If level changed, update energy max (gewu level provides base energy growth)
            if (newGewuLevel > oldGewuLevel) {
                const gewuEnergyMax = getGewuEnergyMax(newGewuLevel);
                // Effective energy = max(upgrade-based energy, gewu-based energy)
                const upgradeEnergy = getEffectiveNightEnergy(state.shopUpgrades);
                const newMaxEnergy = Math.max(upgradeEnergy, gewuEnergyMax);
                return {
                    ...state,
                    abilityState: updatedAbility,
                    nightState: {
                        ...state.nightState,
                        maxEnergy: newMaxEnergy,
                        // Also grant the energy increase immediately
                        energy: state.nightState.energy + (newMaxEnergy - state.nightState.maxEnergy),
                    },
                    dayEvents: [
                        ...state.dayEvents,
                        `[格物] 格物等级提升至 Lv${newGewuLevel}！精力上限提升至 ${newMaxEnergy}。`,
                    ],
                };
            }

            return {
                ...state,
                abilityState: updatedAbility,
            };
        }

        case 'APPLY_COMFORT': {
            const { hopeChange, humanityChange, chainId } = action.payload;

            // 1. Update reputation (humanity)
            const comfortRep = { ...state.reputation };
            comfortRep[ReputationType.HUMANITY] += humanityChange;
            clampReputation(comfortRep);

            // 2. Update hope on the active chain (if chainId provided and chain exists)
            let comfortChains = state.activeChains;
            if (chainId) {
                comfortChains = state.activeChains.map(chain => {
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
                reputation: comfortRep,
                activeChains: comfortChains,
            };
        }

        case 'SET_CONSEQUENCE_FLASH': {
            return {
                ...state,
                lastConsequenceFlash: action.payload,
            };
        }

        case 'CLEAR_CONSEQUENCE_FLASH': {
            return {
                ...state,
                lastConsequenceFlash: null,
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

            // 3. Schedule word-of-mouth check if WORD_OF_MOUTH skill is unlocked
            let updatedWordOfMouth = state.abilityState.wordOfMouth;
            if (isSkillUnlocked('WORD_OF_MOUTH', state.abilityState)) {
                updatedWordOfMouth = scheduleWordOfMouthCheck(
                    state.stats.day,
                    state.abilityState.wordOfMouth
                );
            }

            return {
                ...state,
                reputation: newRep,
                activeChains: updatedChains,
                abilityState: {
                    ...state.abilityState,
                    wordOfMouth: updatedWordOfMouth,
                },
            };
        }

        default:
            return state;
    }
}
