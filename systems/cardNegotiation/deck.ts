/**
 * Card Negotiation System - Deck Management (K-2)
 *
 * Pure functions for managing the draw pile, hand, and discard pile.
 * Implements Fisher-Yates shuffle, draw/discard mechanics, and
 * end-of-round retention rules.
 */

import type { Card, DeckState, CardNegotiationState } from './types';
import { GAME_CONFIG } from '../game/config';
import { generateInstanceId } from './definitions';

// ============================================================================
// Deck Initialization
// ============================================================================

/**
 * Create a new deck state from a pool of cards.
 * Shuffles the pool into the draw pile.
 */
export function createDeck(cardPool: Card[]): DeckState {
  const drawPile = [...cardPool];
  shuffleArray(drawPile);
  return {
    drawPile,
    discardPile: [],
    hand: [],
    exhausted: [],
  };
}

// ============================================================================
// Shuffle
// ============================================================================

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Return a new DeckState with the draw pile shuffled.
 */
export function shuffleDeck(deck: DeckState): DeckState {
  const newDrawPile = [...deck.drawPile];
  shuffleArray(newDrawPile);
  return { ...deck, drawPile: newDrawPile };
}

// ============================================================================
// Draw Cards
// ============================================================================

/**
 * Draw cards from the draw pile to fill hand up to the hand limit.
 * If the draw pile is insufficient, shuffle the discard pile into the draw pile.
 *
 * Returns a new state with updated deck.
 */
export function drawCards(state: CardNegotiationState): CardNegotiationState {
  const handLimit = GAME_CONFIG.CARD_NEGOTIATION.HAND_LIMIT;
  const currentHandSize = state.deck.hand.length;
  const drawCount = Math.max(0, handLimit - currentHandSize);

  if (drawCount === 0) return state;

  let drawPile = [...state.deck.drawPile];
  let discardPile = [...state.deck.discardPile];

  // If not enough cards in draw pile, shuffle discard pile back
  if (drawPile.length < drawCount && discardPile.length > 0) {
    shuffleArray(discardPile);
    drawPile = [...drawPile, ...discardPile];
    discardPile = [];
  }

  // Draw up to available cards
  const actualDraw = Math.min(drawCount, drawPile.length);
  const drawnCards = drawPile.splice(0, actualDraw);
  const newHand = [...state.deck.hand, ...drawnCards];

  return {
    ...state,
    deck: {
      ...state.deck,
      drawPile,
      discardPile,
      hand: newHand,
    },
  };
}

// ============================================================================
// Discard & Exhaust
// ============================================================================

/**
 * Discard a card from hand to the discard pile.
 */
export function discardCard(state: CardNegotiationState, cardInstanceId: string): CardNegotiationState {
  const cardIndex = state.deck.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = state.deck.hand[cardIndex];
  const newHand = state.deck.hand.filter((_, i) => i !== cardIndex);

  // Temporary cards are removed entirely when discarded
  if (card.cardType === 'temporary') {
    return {
      ...state,
      deck: { ...state.deck, hand: newHand },
    };
  }

  return {
    ...state,
    deck: {
      ...state.deck,
      hand: newHand,
      discardPile: [...state.deck.discardPile, card],
    },
  };
}

/**
 * Exhaust a consumable card (remove from today's deck entirely).
 */
export function exhaustCard(state: CardNegotiationState, cardInstanceId: string): CardNegotiationState {
  const cardIndex = state.deck.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = state.deck.hand[cardIndex];
  const newHand = state.deck.hand.filter((_, i) => i !== cardIndex);

  // Track remaining counts
  let appraisalRemaining = state.appraisalCardsRemaining;
  let insightRemaining = state.insightCardsRemaining;
  if (card.category === 'information' && card.cardType === 'consumable') {
    if (card.id.startsWith('appraisal')) {
      appraisalRemaining = Math.max(0, appraisalRemaining - 1);
    } else if (card.id.startsWith('insight')) {
      insightRemaining = Math.max(0, insightRemaining - 1);
    }
  }

  return {
    ...state,
    deck: {
      ...state.deck,
      hand: newHand,
      exhausted: [...state.deck.exhausted, card],
    },
    appraisalCardsRemaining: appraisalRemaining,
    insightCardsRemaining: insightRemaining,
  };
}

// ============================================================================
// Add Temporary Card
// ============================================================================

/**
 * Add a temporary card directly to the player's hand.
 */
export function addTemporaryCard(state: CardNegotiationState, card: Card): CardNegotiationState {
  // Ensure unique instance ID
  const instanceCard: Card = {
    ...card,
    instanceId: card.instanceId || generateInstanceId(card.id),
  };

  return {
    ...state,
    deck: {
      ...state.deck,
      hand: [...state.deck.hand, instanceCard],
    },
  };
}

// ============================================================================
// End-of-Round Retention Rules (K-7)
// ============================================================================

/**
 * Apply end-of-round retention rules.
 *
 * Rules:
 * - Temporary cards with retention='retain' stay in hand
 * - Temporary cards with retention='discard' are removed
 * - Permanent cards are discarded (go to discard pile)
 * - Consumable cards that weren't played are discarded
 * - Player may retain 1 extra card of any type
 *
 * @param retainedCardInstanceId - The card the player chose to retain (optional)
 */
export function applyRetentionRules(
  state: CardNegotiationState,
  retainedCardInstanceId?: string,
): CardNegotiationState {
  const retained: Card[] = [];
  const toDiscard: Card[] = [];
  const extraRetainSlots = GAME_CONFIG.CARD_NEGOTIATION.EXTRA_RETAIN_SLOTS;

  let extraRetainUsed = 0;

  for (const card of state.deck.hand) {
    // Check if this is the player's chosen extra-retain card
    if (
      retainedCardInstanceId &&
      card.instanceId === retainedCardInstanceId &&
      extraRetainUsed < extraRetainSlots
    ) {
      retained.push(card);
      extraRetainUsed++;
      continue;
    }

    // Temporary cards: check retention policy
    if (card.cardType === 'temporary') {
      if (card.temporaryRetention === 'retain') {
        retained.push(card);
      }
      // 'discard' temporary cards are simply removed (not added to discard pile)
      continue;
    }

    // Permanent and unused consumable cards go to discard pile
    toDiscard.push(card);
  }

  return {
    ...state,
    deck: {
      ...state.deck,
      hand: retained,
      discardPile: [...state.deck.discardPile, ...toDiscard],
    },
  };
}
