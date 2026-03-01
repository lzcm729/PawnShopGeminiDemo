/**
 * Card Negotiation System - Type Definitions (K-1)
 *
 * Defines all types for the card-based negotiation system.
 * This system runs parallel to the push-pull negotiation,
 * switchable via feature flag.
 */

import type { Disposition, CustomerInsightResult } from '../customerInsight/types';
import type { SkillFeedback } from '../negotiation/empathyProbeFeedback';
import type { ConcessionTier } from '../negotiation/probeEffects';

// ============================================================================
// Card Effect Types
// ============================================================================

/** The four core effect types (v0.2 simplified from 9 to 4) */
export type CardEffectType = 'economic' | 'information' | 'narrative' | 'patience';

/** Economic sub-effects */
export interface EconomicEffect {
  type: 'economic';
  /** Pawn amount percentage adjustment (e.g., -5 = reduce by 5%) */
  pawnPercent?: number;
  /** Interest rate absolute adjustment in percentage points (e.g., 1 = +1%) */
  rateAdjust?: number;
  /** Lock the current interest rate (cannot use +rate cards after) */
  lockRate?: boolean;
  /** Reset interest rate to 0% */
  resetRate?: boolean;
  /** Lock further price cuts (cannot use -pawn cards after) */
  lockPriceCut?: boolean;
}

/** Information sub-effects */
export interface InformationEffect {
  type: 'information';
  /** Estimate range shrink percentage (e.g., 15 = shrink by 15%) */
  shrinkPercent?: number;
  /** Whether this card can trigger trait discovery */
  canDiscoverTrait?: boolean;
  /** Show customer redemption intent */
  showRedemptionIntent?: boolean;
  /** Generate empathy/probe temporary cards */
  generateInsightCards?: boolean;
  /** Provide vague information (for weakened cards) */
  vagueInfo?: boolean;
  /** Success chance for vague info (0-1) */
  successChance?: number;
  /** Add uncertainty to estimate */
  addUncertainty?: number;
  /** Insight reveal layer (1 = disposition only, 2 = + floor hint) */
  insightLayer?: 1 | 2;
}

/** Narrative sub-effects */
export interface NarrativeEffect {
  type: 'narrative';
  /** Trigger a specific dialogue by key */
  triggerDialogue?: string;
  /** Humanity reputation delta */
  humanityDelta?: number;
  /** Credibility reputation delta */
  credibilityDelta?: number;
  /** Innocence reputation delta */
  innocenceDelta?: number;
}

/** Patience sub-effects */
export interface PatienceEffect {
  type: 'patience';
  /** Direct patience cost (positive = consume patience) */
  patienceCost?: number;
  /** Patience recovery */
  patienceRecover?: number;
}

export type CardEffect = EconomicEffect | InformationEffect | NarrativeEffect | PatienceEffect;

// ============================================================================
// Card Types
// ============================================================================

/** Card lifecycle type */
export type CardType = 'permanent' | 'consumable' | 'temporary';

/** Card category for organization */
export type CardCategory = 'economic' | 'information' | 'narrative' | 'disruption' | 'temptation';

/** How temporary cards behave at end of round */
export type TemporaryRetention = 'retain' | 'discard';

/** Source of temporary cards */
export type TemporaryCardSource = 'customer_drop' | 'trait_discovery' | 'insight_unlock';

/** A card definition */
export interface Card {
  id: string;
  /** Instance-unique ID (cards with same definition ID get unique instance IDs) */
  instanceId: string;
  name: string;
  description: string;
  cardType: CardType;
  category: CardCategory;
  effects: CardEffect[];

  // Temporary card specifics
  temporarySource?: TemporaryCardSource;
  temporaryRetention?: TemporaryRetention;

  // Special flags
  /** Whether the card offers a choice when played (e.g., FLAW tell/hide) */
  hasChoice?: boolean;
  /** Available choices when played */
  choices?: CardPlayChoice[];
}

/** A choice available when playing a card with multiple options */
export interface CardPlayChoice {
  id: string;
  label: string;
  effects: CardEffect[];
}

// ============================================================================
// Deck & Hand State
// ============================================================================

export interface DeckState {
  /** Cards in the draw pile (top = index 0) */
  drawPile: Card[];
  /** Cards in the discard pile */
  discardPile: Card[];
  /** Cards in the player's hand */
  hand: Card[];
  /** Cards exhausted today (consumable cards that were used) */
  exhausted: Card[];
}

// ============================================================================
// Round & Phase Types
// ============================================================================

/** Phase within a single round */
export type RoundPhase = 'player_draw' | 'player_play' | 'player_end' | 'customer_turn';

/** Macro-phase of the negotiation (interest curve) */
export type NegotiationMacroPhase = 'probing' | 'bargaining' | 'showdown';

// ============================================================================
// Customer Turn Types
// ============================================================================

/** Customer type mapped from NPC BehaviorTag for card drop tables */
export type CardCustomerType = 'HARD' | 'SOFT' | 'SLY' | 'CALM';

/** Category of customer-dropped cards */
export type DropCategory = 'temptation' | 'disruption' | 'narrative';

/** A card being offered to the player (insert decision) */
export interface InsertedCardDecision {
  card: Card;
  /** Whether the player has decided */
  decided: boolean;
  /** Player's choice: accept or reject */
  accepted?: boolean;
}

// ============================================================================
// Card Play Result
// ============================================================================

export interface CardPlayResult {
  /** The card that was played */
  card: Card;
  /** Choice made (if card had choices) */
  choiceId?: string;
  /** Economic changes applied */
  pawnAmountDelta: number;
  rateDelta: number;
  /** Patience change */
  patienceChange: number;
  /** Information gained */
  estimateRangeShrunk: boolean;
  traitDiscovered?: string;
  redemptionIntentRevealed?: boolean;
  /** Temporary cards generated */
  generatedCards: Card[];
  /** Narrative triggers */
  dialogueKey?: string;
  /** Rate was locked */
  rateLocked: boolean;
  /** Rate was reset to 0 */
  rateReset: boolean;
  /** Whether this was an insult */
  isInsult: boolean;
  /** All traits discovered (names) */
  traitsDiscovered?: string[];
  /** Appraisal event type from d100 roll */
  appraisalEvent?: string;
  /** Whether a breakthrough event occurred */
  isBreakthrough?: boolean;
  /** Value jump type when FAKE or JACKPOT trait discovered */
  valueJump?: 'FAKE' | 'JACKPOT';
  /** Whether the item is fully mastered */
  isMastered?: boolean;
  /** Insight result (when playing insight card) */
  insightResult?: {
    disposition: Disposition;
    dispositionText: string;
    floorHint: string;
    patienceCost: number;
    patienceTriggered: boolean;
    layer: 1 | 2;
  };
  /** Empathy result (when playing empathy card) */
  empathyResult?: {
    isSuccess: boolean;
    feedback: SkillFeedback;
  };
  /** Probe result (when playing probe card) */
  probeResult?: {
    isSuccess: boolean;
    feedback: SkillFeedback;
    floorPrice?: number;
    concessionTier?: ConcessionTier;
  };
}

// ============================================================================
// Full Negotiation State
// ============================================================================

/** Modifiers active for the current negotiation session */
export interface SessionModifiers {
  /** Interest rate is locked (cannot use +rate cards) */
  rateLocked: boolean;
  /** Price cuts are locked (cannot use -pawn cards) */
  priceCutLocked: boolean;
  /** Economic card effects halved (conscience card effect) */
  economicEffectHalved: boolean;
  /** Number of consecutive rounds without playing economic cards */
  passiveRounds: number;
}

/** Complete state for a card negotiation session */
export interface CardNegotiationState {
  // Core economic state
  /** Current pawn amount (starts at customer desired amount) */
  currentPawnAmount: number;
  /** Current interest rate in percentage points (starts at 0) */
  currentRate: number;
  /** Original desired amount from customer */
  originalDesiredAmount: number;

  // Deck state
  deck: DeckState;

  // Round tracking
  roundNumber: number;
  roundPhase: RoundPhase;
  macroPhase: NegotiationMacroPhase;

  // Patience
  patience: number;
  maxPatience: number;

  // Session modifiers
  modifiers: SessionModifiers;

  // Customer insert decisions pending
  pendingInserts: InsertedCardDecision[];

  // Item uncertainty (from appraisal system)
  currentUncertainty: number;

  // Cards played this round (for tracking)
  cardsPlayedThisRound: Card[];

  // Appraisal count for FAKE guarantee
  appraisalCount: number;

  // Insight state
  /** Insight result from playing insight card */
  insightResult?: CustomerInsightResult;
  /** Whether disposition has been revealed */
  dispositionRevealed: boolean;
  /** Revealed floor price from successful probe */
  revealedFloorPrice?: number;
  /** Revealed concession tier from successful probe */
  revealedConcessionTier?: ConcessionTier;

  // Whether the negotiation is still active
  isActive: boolean;
  /** If patience reaches 0, conditions are locked */
  isLocked: boolean;

  // Consumable card tracking (for info budget display)
  appraisalCardsRemaining: number;
  insightCardsRemaining: number;
  appraisalCardsTotal: number;
  insightCardsTotal: number;
}
