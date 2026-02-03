/**
 * Game State Machine Hook
 *
 * Provides access to the explicit state machine.
 *
 * Usage:
 * ```tsx
 * const { phase, send, can } = useGameMachine();
 * import { PhaseIs, PhaseMatch } from '@/systems/core/phases';
 *
 * // Check current phase
 * if (PhaseIs.business(phase)) {
 *   console.log('Subphase:', phase.subphase);
 * }
 *
 * // Send events
 * if (can({ type: 'CLOSE_SHOP' })) {
 *   send({ type: 'CLOSE_SHOP' });
 * }
 * ```
 */

import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { PhaseEvent, GamePhase } from '../systems/core/phases/types';
import { PhaseIs, PhaseMatch } from '../systems/core/phases/guards';
import { canTransition, getAvailableEvents } from '../systems/core/phases/machine';

export interface UseGameMachineReturn {
    /** Current phase (new state machine) */
    phase: GamePhase;
    /** Full game state context */
    context: ReturnType<typeof useGame>['state'];
    /** Send an event to the state machine */
    send: (event: PhaseEvent) => void;
    /** Check if an event can be sent */
    can: (event: PhaseEvent) => boolean;
    /** Get list of available event types for current phase */
    availableEvents: () => PhaseEvent['type'][];
    /** Type guards for individual phases */
    PhaseIs: typeof PhaseIs;
    /** Compound phase checks */
    PhaseMatch: typeof PhaseMatch;
}

/**
 * Hook for interacting with the explicit state machine.
 * Components use this hook to interact with the state machine.
 */
export function useGameMachine(): UseGameMachineReturn {
    const { state, dispatch } = useGame();

    // Send an event to the state machine
    const send = useCallback((event: PhaseEvent) => {
        dispatch({ type: 'PHASE_TRANSITION', payload: event });
    }, [dispatch]);

    // Check if an event can be sent
    const can = useCallback((event: PhaseEvent): boolean => {
        return canTransition(state.phase, event, state);
    }, [state]);

    // Get available events for current phase
    const availableEvents = useCallback((): PhaseEvent['type'][] => {
        return getAvailableEvents(state.phase, state);
    }, [state]);

    return {
        phase: state.phase,
        context: state,
        send,
        can,
        availableEvents,
        PhaseIs,
        PhaseMatch
    };
}

// Re-export type guards for convenience
export { PhaseIs, PhaseMatch } from '../systems/core/phases/guards';

// Re-export types for consumers
export type { GamePhase, PhaseEvent } from '../systems/core/phases/types';
