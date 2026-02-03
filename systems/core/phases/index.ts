/**
 * State Machine Module
 *
 * Unified exports for the explicit state machine implementation.
 */

// Types
export type {
    GamePhase,
    PhaseEvent,
    DayStartSubphase,
    BusinessSubphase,
    NegotiationMode,
    NightSubphase,
    EvaluationOutcome
} from './types';

// Type Guards
export { PhaseIs, PhaseMatch } from './guards';

// Core Functions
export {
    findTransition,
    canTransition,
    transition,
    getAvailableEvents,
    type TransitionResult
} from './machine';

// Transition Rules (for advanced use cases)
export { TRANSITIONS, type TransitionRule } from './transitions';

// Actions (for advanced use cases)
export * as actions from './actions';
