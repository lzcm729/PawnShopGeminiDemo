/**
 * State Machine Types
 *
 * Discriminated union types for explicit state machine phases.
 * Part of the state machine migration (Phase 1).
 */

// ============================================
// Subphase Types
// ============================================

export type DayStartSubphase =
    | 'EXPIRY_CHECK'
    | 'EXPIRY_SETTLEMENT';

export type BusinessSubphase =
    | 'IDLE'           // Waiting for customer generation
    | 'GENERATING'     // Generating customer
    | 'SERVING'        // Serving a customer
    | 'CLOSED';        // Can close shop

export type NegotiationMode =
    | 'PAWN'
    | 'REDEEM'
    | 'RENEWAL'
    | 'POST_FORFEIT';

export type NightSubphase =
    | 'ACTIVE'         // Night activities available
    | 'PROCESSING'     // Executing night cycle
    | 'EVALUATING';    // Evaluating game outcome

// ============================================
// Main Phase Type (Discriminated Union)
// ============================================

/**
 * Game phase represented as a discriminated union.
 * This replaces the old GamePhase enum with a more expressive type
 * that includes subphase information.
 */
export type GamePhase =
    | { type: 'START_SCREEN' }
    | { type: 'MORNING_BRIEF' }
    | { type: 'DAY_START'; subphase: DayStartSubphase }
    | { type: 'BUSINESS'; subphase: BusinessSubphase }
    | { type: 'NEGOTIATION'; mode: NegotiationMode }
    | { type: 'DEPARTURE' }
    | { type: 'NIGHT'; subphase: NightSubphase }
    | { type: 'GAME_OVER'; reason: string }
    | { type: 'VICTORY' };

// ============================================
// Evaluation Outcome Type
// ============================================

export type EvaluationOutcome =
    | 'continue'
    | 'bankrupt'
    | 'mother_died'
    | 'victory';

// ============================================
// Phase Event Types
// ============================================

export type PhaseEvent =
    // Start screen events
    | { type: 'NEW_GAME' }
    | { type: 'LOAD_GAME' }

    // Morning brief events
    | { type: 'OPEN_SHOP' }

    // Day start events
    | { type: 'EXPIRY_CHECK_DONE'; hasExpiry: boolean }
    | { type: 'SETTLEMENT_COMPLETE' }

    // Departure events
    | { type: 'DISMISS' }

    // Business events
    | { type: 'CUSTOMER_GENERATED'; hasCustomer: boolean }
    | { type: 'SET_CUSTOMER_EVENT'; mode: NegotiationMode }
    | { type: 'TRANSACTION_COMPLETE' }
    | { type: 'CUSTOMER_REJECTED' }
    | { type: 'CLOSE_SHOP' }

    // Night events
    | { type: 'END_DAY' }
    | { type: 'NIGHT_CYCLE_DONE' }
    | { type: 'EVALUATION_DONE'; outcome: EvaluationOutcome };
