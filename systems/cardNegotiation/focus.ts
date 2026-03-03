/**
 * Card Negotiation System - Focus (Concentration) Module
 *
 * Manages the focus resource that limits card plays per round.
 * Core philosophy: "Exploitation requires effort, kindness does not"
 */

import type { Card, CardNegotiationState } from './types';
import { GAME_CONFIG } from '../game/config';

/**
 * Calculate effective maximum focus for the current state.
 * Formula: max(minimum, base + tempBonus - debuffCount - (highRatePenalty ? 1 : 0))
 */
export function calculateEffectiveFocus(state: CardNegotiationState): number {
  const penalty = state.modifiers.highRateFocusPenalty ? 1 : 0;
  return Math.max(
    GAME_CONFIG.CARD_NEGOTIATION.FOCUS_MINIMUM,
    state.focusBase + state.focusTempBonus - state.focusDebuffCount - penalty,
  );
}

/**
 * Check if the player can afford to play a card given current focus.
 * For sacrifice cards, also checks that there's at least one non-negative card to sacrifice.
 */
export function canAffordFocus(card: Card, state: CardNegotiationState): boolean {
  const cost = card.focusCost ?? 0;

  // Negative cards have special rules
  if (card.negativeType) {
    switch (card.negativeType) {
      case 'occupation':
        // Costs focus to remove
        return state.focusRemaining >= GAME_CONFIG.CARD_NEGOTIATION.FOCUS_OCCUPATION_REMOVE_COST;
      case 'debuff':
        // Free to remove
        return true;
      case 'sacrifice': {
        // Free to remove but must have another non-negative card to sacrifice
        const nonNegativeCards = state.deck.hand.filter(
          c => c.instanceId !== card.instanceId && !c.negativeType,
        );
        return nonNegativeCards.length > 0;
      }
    }
  }

  return state.focusRemaining >= cost;
}

/**
 * Deduct focus from the state.
 */
export function deductFocus(state: CardNegotiationState, cost: number): CardNegotiationState {
  if (cost <= 0) return state;
  return {
    ...state,
    focusRemaining: Math.max(0, state.focusRemaining - cost),
  };
}

/**
 * Refresh focus at the start of a new round.
 * Recalculates effective focus based on current debuffs and penalties.
 */
export function refreshFocus(state: CardNegotiationState): CardNegotiationState {
  const effectiveFocus = calculateEffectiveFocus(state);
  return {
    ...state,
    focusRemaining: effectiveFocus,
  };
}

/**
 * Count debuff-type negative cards in hand.
 */
export function countDebuffsInHand(hand: Card[]): number {
  return hand.filter(c => c.negativeType === 'debuff').length;
}
