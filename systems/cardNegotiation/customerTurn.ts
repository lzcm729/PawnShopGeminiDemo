/**
 * Card Negotiation System - Customer Turn (K-10)
 *
 * Executes the customer's turn: generates temporary cards based on
 * customer type, current state, and dynamic conditions.
 * Returns cards that require player accept/reject decisions.
 */

import type {
  Card,
  CardNegotiationState,
  CardCustomerType,
  InsertedCardDecision,
  DropCategory,
} from './types';
import { getCustomerDropTable, generateInstanceId, type CustomerDropEntry } from './definitions';
import { getPhaseModifiers, getNegotiationPhase } from './roundProgression';
import { GAME_CONFIG } from '../game/config';
import type { BehaviorTag } from '../core/types';

// ============================================================================
// Customer Type Mapping
// ============================================================================

/**
 * Map BehaviorTag array to a CardCustomerType for drop table lookup.
 * Uses the dominant behavior tag to determine type.
 */
export function mapBehaviorToCustomerType(behaviorTags: BehaviorTag[]): CardCustomerType {
  // Priority mapping: check in order
  if (behaviorTags.includes('STUBBORN')) return 'HARD';
  if (behaviorTags.includes('DESPERATE')) return 'SOFT';
  if (behaviorTags.includes('SUSPICIOUS')) return 'SLY';
  if (behaviorTags.includes('SENTIMENTAL')) return 'SOFT';
  if (behaviorTags.includes('SAVVY')) return 'SLY';
  if (behaviorTags.includes('NAIVE')) return 'CALM';
  return 'CALM';
}

// ============================================================================
// Dynamic Drop Modifiers
// ============================================================================

interface DropModifiers {
  /** Narrative drop weight multiplier */
  narrativeMultiplier: number;
  /** Temptation drop weight multiplier */
  temptationMultiplier: number;
  /** Disruption drop weight multiplier */
  disruptionMultiplier: number;
}

/**
 * Calculate dynamic drop modifiers based on the current negotiation state.
 */
function calculateDropModifiers(state: CardNegotiationState): DropModifiers {
  const config = GAME_CONFIG.CARD_NEGOTIATION;
  const modifiers: DropModifiers = {
    narrativeMultiplier: 1,
    temptationMultiplier: 1,
    disruptionMultiplier: 1,
  };

  // Price cut exceeds threshold -> more narrative/disruption, less temptation
  const priceReduction = 1 - (state.currentPawnAmount / state.originalDesiredAmount);
  if (priceReduction > config.DYNAMIC_DROP_PRICE_THRESHOLD) {
    modifiers.narrativeMultiplier *= 1.5;
    modifiers.disruptionMultiplier *= 1.3;
    modifiers.temptationMultiplier *= 0.7;
  }

  // Rate exceeds threshold -> despair cards
  if (state.currentRate >= config.DYNAMIC_DROP_RATE_THRESHOLD) {
    modifiers.narrativeMultiplier *= 1.8;
    modifiers.temptationMultiplier *= 0.5;
  }

  // Player hasn't played economic cards for N rounds -> emotional calm
  if (state.modifiers.passiveRounds >= config.DYNAMIC_DROP_PASSIVE_ROUNDS) {
    modifiers.narrativeMultiplier *= 2.0;
    modifiers.temptationMultiplier *= 0.3;
    modifiers.disruptionMultiplier *= 0.5;
  }

  return modifiers;
}

// ============================================================================
// Weighted Random Selection
// ============================================================================

function weightedRandomSelect(
  entries: CustomerDropEntry[],
  modifiers: DropModifiers,
): CustomerDropEntry | null {
  if (entries.length === 0) return null;

  // Apply category-based weight modifiers
  const adjustedEntries = entries.map(entry => {
    let weight = entry.weight;
    switch (entry.dropCategory) {
      case 'narrative':
        weight *= modifiers.narrativeMultiplier;
        break;
      case 'temptation':
        weight *= modifiers.temptationMultiplier;
        break;
      case 'disruption':
        weight *= modifiers.disruptionMultiplier;
        break;
    }
    return { ...entry, weight };
  });

  const totalWeight = adjustedEntries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const entry of adjustedEntries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }

  return adjustedEntries[adjustedEntries.length - 1];
}

// ============================================================================
// Main Customer Turn Execution
// ============================================================================

export interface CustomerTurnResult {
  /** Cards being inserted (require player accept/reject) */
  insertedCards: InsertedCardDecision[];
  /** Drop probability hint signal for UI */
  dropHint: 'narrative' | 'disruption' | 'temptation' | 'none';
}

/**
 * Execute the customer turn.
 * Generates 0-2 cards based on customer type and current state.
 */
export function executeCustomerTurn(
  state: CardNegotiationState,
  customerType: CardCustomerType,
): CustomerTurnResult {
  const dropTable = getCustomerDropTable(customerType);
  const dropModifiers = calculateDropModifiers(state);
  const macroPhase = getNegotiationPhase(state.roundNumber, state.patience);
  const phaseModifiers = getPhaseModifiers(macroPhase);

  // Base drop count: 1 card per turn, with phase modifier
  let dropCount = 1;

  // Bargaining phase: occasionally drop 2 cards
  if (macroPhase === 'bargaining' && Math.random() < 0.3) {
    dropCount = 2;
  }

  // Showdown: higher chance of extra card
  if (macroPhase === 'showdown' && Math.random() < 0.5) {
    dropCount = 2;
  }

  // Probing: may not drop any cards
  if (macroPhase === 'probing' && Math.random() < 0.4) {
    dropCount = 0;
  }

  const insertedCards: InsertedCardDecision[] = [];
  const usedCardIds = new Set<string>();

  for (let i = 0; i < dropCount; i++) {
    // Filter out already-selected cards
    const availableEntries = dropTable.filter(e => !usedCardIds.has(e.card.id));
    const selected = weightedRandomSelect(availableEntries, dropModifiers);

    if (selected) {
      usedCardIds.add(selected.card.id);
      const instanceCard: Card = {
        ...selected.card,
        instanceId: generateInstanceId(selected.card.id),
      };

      insertedCards.push({
        card: instanceCard,
        decided: false,
      });
    }
  }

  // Generate drop hint for next round (for UI)
  const dropHint = generateDropHint(dropTable, dropModifiers);

  return {
    insertedCards,
    dropHint,
  };
}

/**
 * Generate a probability hint for the next customer drop.
 * This is used by the UI to show body language hints.
 */
function generateDropHint(
  dropTable: CustomerDropEntry[],
  modifiers: DropModifiers,
): 'narrative' | 'disruption' | 'temptation' | 'none' {
  if (dropTable.length === 0) return 'none';

  // Calculate total weight per category
  const categoryWeights: Record<DropCategory, number> = {
    narrative: 0,
    disruption: 0,
    temptation: 0,
  };

  for (const entry of dropTable) {
    let weight = entry.weight;
    switch (entry.dropCategory) {
      case 'narrative': weight *= modifiers.narrativeMultiplier; break;
      case 'temptation': weight *= modifiers.temptationMultiplier; break;
      case 'disruption': weight *= modifiers.disruptionMultiplier; break;
    }
    categoryWeights[entry.dropCategory] += weight;
  }

  // Return the dominant category
  const maxCategory = Object.entries(categoryWeights).reduce(
    (max, [cat, weight]) => weight > max[1] ? [cat, weight] as [string, number] : max,
    ['none', 0] as [string, number],
  );

  return maxCategory[0] as 'narrative' | 'disruption' | 'temptation' | 'none';
}
