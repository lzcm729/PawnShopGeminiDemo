/**
 * Card Negotiation System - Persistence / Wait Mechanic (K-13)
 *
 * Replaces the push-pull "persist" action.
 * Player can choose to wait instead of playing cards,
 * gambling on the customer's reaction based on BehaviorTag.
 */

import type { Card, CardNegotiationState, WaitResult, WaitOutcome, CardCustomerType } from './types';
import { getCustomerDropTable, generateInstanceId } from './definitions';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// Wait Probabilities by Customer Type
// ============================================================================

interface WaitProbabilities {
  concession: number;
  noReaction: number;
  impatient: number;
}

/**
 * Get wait outcome probabilities based on customer type.
 * HARD types are more likely to get impatient.
 * SOFT types are more likely to concede.
 */
function getWaitProbabilities(customerType: CardCustomerType): WaitProbabilities {
  const config = GAME_CONFIG.CARD_NEGOTIATION;

  // Base probabilities from config
  const base: WaitProbabilities = {
    concession: config.WAIT_CONCESSION_CHANCE,
    noReaction: config.WAIT_NO_REACTION_CHANCE,
    impatient: config.WAIT_IMPATIENT_CHANCE,
  };

  // Adjust by customer type
  switch (customerType) {
    case 'HARD':
      return {
        concession: base.concession * 0.5,  // 25% -> less likely to concede
        noReaction: base.noReaction * 0.8,   // 24%
        impatient: 1 - (base.concession * 0.5) - (base.noReaction * 0.8), // ~51%
      };
    case 'SOFT':
      return {
        concession: base.concession * 1.4,  // 70% -> more likely to concede
        noReaction: base.noReaction * 0.5,   // 15%
        impatient: 1 - (base.concession * 1.4) - (base.noReaction * 0.5), // ~15%
      };
    case 'SLY':
      return {
        concession: base.concession * 0.6,  // 30%
        noReaction: base.noReaction * 1.5,   // 45% -> more likely to stall
        impatient: 1 - (base.concession * 0.6) - (base.noReaction * 1.5), // ~25%
      };
    case 'CALM':
    default:
      return base; // 50/30/20
  }
}

// ============================================================================
// Execute Wait
// ============================================================================

/**
 * Execute the "wait" action.
 *
 * Outcomes:
 * - Concession (50% base): customer drops a favorable temporary card
 * - No reaction (30% base): nothing happens, round wasted
 * - Impatient (20% base): patience -1
 */
export function executeWait(
  state: CardNegotiationState,
  customerType: CardCustomerType,
): WaitResult {
  const probs = getWaitProbabilities(customerType);
  const roll = Math.random();

  let outcome: WaitOutcome;
  if (roll < probs.concession) {
    outcome = 'concession';
  } else if (roll < probs.concession + probs.noReaction) {
    outcome = 'no_reaction';
  } else {
    outcome = 'impatient';
  }

  switch (outcome) {
    case 'concession': {
      // Drop a favorable card from the customer's table
      const dropTable = getCustomerDropTable(customerType);
      // Filter to temptation cards (favorable to player)
      const favorableDrops = dropTable.filter(e => e.dropCategory === 'temptation');
      let droppedCard: Card | undefined;

      if (favorableDrops.length > 0) {
        const idx = Math.floor(Math.random() * favorableDrops.length);
        const template = favorableDrops[idx].card;
        droppedCard = {
          ...template,
          instanceId: generateInstanceId(template.id),
        };
      }

      return {
        outcome: 'concession',
        droppedCard,
      };
    }

    case 'no_reaction':
      return {
        outcome: 'no_reaction',
      };

    case 'impatient':
      return {
        outcome: 'impatient',
        patienceChange: -1,
      };
  }
}
