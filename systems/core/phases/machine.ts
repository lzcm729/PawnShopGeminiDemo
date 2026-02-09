/**
 * State Machine Core
 *
 * Core state machine functions for phase transitions.
 * Part of the state machine migration (Phase 2).
 */

import { GamePhase, PhaseEvent } from './types';
// TODO: resolve core<->game cycle - GameState should live in a shared location
import { GameState } from '../../game/types';
import { TRANSITIONS, TransitionRule } from './transitions';

// ============================================
// Transition Result Type
// ============================================

export interface TransitionResult {
    nextPhase: GamePhase;
    stateUpdates: Partial<GameState>;
}

// ============================================
// Core Functions
// ============================================

/**
 * Find a matching transition rule for the given phase and event.
 *
 * @param phase - Current phase
 * @param event - Event to process
 * @param state - Current game state (for guard evaluation)
 * @returns Matching transition rule or null
 */
export function findTransition(
    phase: GamePhase,
    event: PhaseEvent,
    state: GameState
): TransitionRule | null {
    return TRANSITIONS.find(rule =>
        rule.from(phase) &&
        rule.event === event.type &&
        (rule.guard?.(state, event) ?? true)
    ) ?? null;
}

/**
 * Check if a transition is valid for the given phase and event.
 *
 * @param phase - Current phase
 * @param event - Event to check
 * @param state - Current game state (for guard evaluation)
 * @returns true if transition is valid
 */
export function canTransition(
    phase: GamePhase,
    event: PhaseEvent,
    state: GameState
): boolean {
    return findTransition(phase, event, state) !== null;
}

/**
 * Execute a state transition.
 *
 * @param phase - Current phase
 * @param event - Event to process
 * @param state - Current game state
 * @returns Transition result with next phase and state updates, or null if invalid
 */
export function transition(
    phase: GamePhase,
    event: PhaseEvent,
    state: GameState
): TransitionResult | null {
    const rule = findTransition(phase, event, state);

    if (!rule) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[StateMachine] Invalid transition: ${JSON.stringify(phase)} + ${event.type}`);
        }
        return null;
    }

    const nextPhase = rule.to(state, event);

    const stateUpdates = rule.effects?.reduce(
        (acc, effect) => ({ ...acc, ...effect(state, event) }),
        {} as Partial<GameState>
    ) ?? {};

    if (process.env.NODE_ENV === 'development') {
        console.log(`[StateMachine] ${JSON.stringify(phase)} --[${event.type}]--> ${JSON.stringify(nextPhase)}`);
    }

    return { nextPhase, stateUpdates };
}

/**
 * Get available events for the current phase.
 *
 * @param phase - Current phase
 * @param state - Current game state (for guard evaluation)
 * @returns Array of available event types
 */
export function getAvailableEvents(
    phase: GamePhase,
    state: GameState
): PhaseEvent['type'][] {
    const eventTypes = new Set<PhaseEvent['type']>();

    for (const rule of TRANSITIONS) {
        if (rule.from(phase)) {
            // For guards that depend on specific event data, we can't easily test them
            // without the actual event, so we include them as potentially available
            if (!rule.guard || rule.guard(state, {} as PhaseEvent)) {
                eventTypes.add(rule.event);
            }
        }
    }

    return Array.from(eventTypes);
}
