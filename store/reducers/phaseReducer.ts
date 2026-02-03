/**
 * Phase Reducer
 * Handles PHASE_TRANSITION action for the new state machine.
 * Part of the state machine migration (Phase 3-4).
 *
 * During migration, this reducer syncs both phase2 (new) and phase (legacy).
 */

import { GameState, GamePhase } from '../../types';
import { Action } from '../actions/types';
import { transition } from '../../systems/core/phases/machine';
import { PhaseEvent, GamePhase2 } from '../../systems/core/phases/types';

/**
 * Maps the new GamePhase2 type to the legacy GamePhase enum.
 * This ensures backward compatibility during migration.
 */
function mapToLegacyPhase(phase2: GamePhase2): GamePhase {
    switch (phase2.type) {
        case 'START_SCREEN':
            return GamePhase.START_SCREEN;
        case 'MORNING_BRIEF':
            return GamePhase.MORNING_BRIEF;
        case 'DAY_START':
            // DAY_START is a transitional phase, map to BUSINESS since
            // it handles expiry settlement which uses the business interface
            return GamePhase.BUSINESS;
        case 'BUSINESS':
            return GamePhase.BUSINESS;
        case 'NEGOTIATION':
            return GamePhase.NEGOTIATION;
        case 'DEPARTURE':
            return GamePhase.DEPARTURE;
        case 'NIGHT':
            return GamePhase.NIGHT;
        case 'GAME_OVER':
            return GamePhase.GAME_OVER;
        case 'VICTORY':
            return GamePhase.VICTORY;
        default:
            return GamePhase.START_SCREEN;
    }
}

/**
 * Handles PHASE_TRANSITION actions by delegating to the state machine.
 * Returns unchanged state if action is not PHASE_TRANSITION or transition is invalid.
 *
 * During migration (Phase 4), this reducer also syncs the legacy `phase` field
 * to maintain backward compatibility with components that haven't migrated yet.
 */
export function phaseReducer(state: GameState, action: Action): GameState {
    if (action.type !== 'PHASE_TRANSITION') {
        return state;
    }

    const event = action.payload as PhaseEvent;
    const result = transition(state.phase2, event, state);

    if (!result) {
        // Invalid transition - return unchanged state
        return state;
    }

    // Sync both new and legacy phase fields
    const legacyPhase = mapToLegacyPhase(result.nextPhase);

    return {
        ...state,
        ...result.stateUpdates,
        phase2: result.nextPhase,
        phase: legacyPhase  // Sync legacy phase for backward compatibility
    };
}
