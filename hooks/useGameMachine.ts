/**
 * Game State Machine Hook
 *
 * Provides access to the new explicit state machine (phase2).
 * Part of the state machine migration (Phase 3).
 *
 * Usage:
 * ```tsx
 * const { phase, send, can, PhaseIs, PhaseMatch } = useGameMachine();
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
import { PhaseEvent, GamePhase2 } from '../systems/core/phases/types';
import { PhaseIs, PhaseMatch } from '../systems/core/phases/guards';
import { canTransition, getAvailableEvents } from '../systems/core/phases/machine';

export interface UseGameMachineReturn {
    /** Current phase (new state machine) */
    phase: GamePhase2;
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
 * Hook for interacting with the new explicit state machine.
 *
 * During the migration period (Phase 3), this hook works alongside
 * the existing state.phase. Components can gradually migrate to
 * use this hook instead of directly checking state.phase.
 */
export function useGameMachine(): UseGameMachineReturn {
    const { state, dispatch } = useGame();

    // Send an event to the state machine
    const send = useCallback((event: PhaseEvent) => {
        dispatch({ type: 'PHASE_TRANSITION', payload: event });
    }, [dispatch]);

    // Check if an event can be sent
    const can = useCallback((event: PhaseEvent): boolean => {
        return canTransition(state.phase2, event, state);
    }, [state]);

    // Get available events for current phase
    const availableEvents = useCallback((): PhaseEvent['type'][] => {
        return getAvailableEvents(state.phase2, state);
    }, [state]);

    return {
        phase: state.phase2,
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
export type { GamePhase2, PhaseEvent } from '../systems/core/phases/types';
