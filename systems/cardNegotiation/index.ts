/**
 * Card Negotiation System - Public API
 *
 * Re-exports all public types and functions from the card negotiation system.
 */

// Types
export type {
  Card,
  CardEffect,
  CardEffectType,
  CardType,
  CardCategory,
  CardPlayChoice,
  DeckState,
  RoundPhase,
  NegotiationMacroPhase,
  CardCustomerType,
  DropCategory,
  InsertedCardDecision,
  WaitOutcome,
  WaitResult,
  CardPlayResult,
  SessionModifiers,
  CardNegotiationState,
  TemporaryRetention,
  TemporaryCardSource,
  EconomicEffect,
  InformationEffect,
  NarrativeEffect,
  PatienceEffect,
} from './types';

// Definitions
export {
  getCardDefinition,
  getAllCardDefinitions,
  getCustomerDropTable,
  buildInitialDeck,
  createCardInstance,
  createTraitCard,
  createInsightCards,
  generateInstanceId,
} from './definitions';

// Deck management
export {
  createDeck,
  shuffleDeck,
  drawCards,
  discardCard,
  exhaustCard,
  addTemporaryCard,
  applyRetentionRules,
} from './deck';

// Effects engine
export {
  resolveCardEffect,
  canPlayCard,
} from './effects';

// Round progression
export {
  getNegotiationPhase,
  getPhaseModifiers,
  checkRateThreshold,
} from './roundProgression';

// Customer turn
export {
  executeCustomerTurn,
  mapBehaviorToCustomerType,
} from './customerTurn';

// Persistence
export {
  executeWait,
} from './persistence';

// Instinct texts
export {
  getCardInstinctText,
  getCardInstinctTexts,
} from './instinct';
