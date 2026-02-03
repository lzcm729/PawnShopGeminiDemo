/**
 * Phase Reducer
 * Handles PHASE_TRANSITION action for the new state machine.
 * Part of the state machine migration (Phase 3).
 */

import { GameState } from '../../types';
import { Action } from '../actions/types';
import { transition } from '../../systems/core/phases/machine';
import { PhaseEvent } from '../../systems/core/phases/types';

/**
 * Handles PHASE_TRANSITION actions by delegating to the state machine.
 * Returns unchanged state if action is not PHASE_TRANSITION or transition is invalid.
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

    return {
        ...state,
        ...result.stateUpdates,
        phase2: result.nextPhase
    };
}
