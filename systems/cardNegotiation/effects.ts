/**
 * Card Negotiation System - Effect Resolution Engine (K-3)
 *
 * Resolves card effects against the current negotiation state.
 * Handles multi-effect cards, session modifiers, and precision bonuses.
 */

import type {
  Card,
  CardEffect,
  CardNegotiationState,
  CardPlayResult,
  EconomicEffect,
  InformationEffect,
  NarrativeEffect,
  PatienceEffect,
} from './types';
import { exhaustCard } from './deck';
import { addTemporaryCard } from './deck';
import { createInsightCards, createTraitCard } from './definitions';
import { getNegotiationPhase, getPhaseModifiers } from './roundProgression';
import { canAffordFocus, deductFocus } from './focus';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// Main Resolution
// ============================================================================

/**
 * Resolve playing a card. Applies all effects, tracks state changes,
 * and returns the result.
 *
 * @param card - The card being played
 * @param state - Current negotiation state
 * @param choiceId - If the card has choices, which one was selected
 */
export function resolveCardEffect(
  card: Card,
  state: CardNegotiationState,
  choiceId?: string,
): { newState: CardNegotiationState; result: CardPlayResult } {
  const config = GAME_CONFIG.CARD_NEGOTIATION;

  // Determine which effects to apply
  let effectsToApply: CardEffect[];
  if (card.hasChoice && card.choices && choiceId) {
    const choice = card.choices.find(c => c.id === choiceId);
    effectsToApply = choice ? choice.effects : card.effects;
  } else {
    effectsToApply = card.effects;
  }

  // Initialize result tracking
  const result: CardPlayResult = {
    card,
    choiceId,
    pawnAmountDelta: 0,
    rateDelta: 0,
    patienceChange: 0,
    estimateRangeShrunk: false,
    generatedCards: [],
    rateLocked: false,
    rateReset: false,
    isInsult: false,
    focusCost: 0,
  };

  let newState = { ...state };

  // --- Focus deduction ---
  let actualFocusCost = card.focusCost ?? 0;
  if (card.negativeType === 'occupation') {
    actualFocusCost = config.FOCUS_OCCUPATION_REMOVE_COST;
  } else if (card.negativeType === 'debuff' || card.negativeType === 'sacrifice') {
    actualFocusCost = 0;
  }
  newState = deductFocus(newState, actualFocusCost);
  result.focusCost = actualFocusCost;

  // Get phase modifiers for patience calculations
  const macroPhase = getNegotiationPhase(newState.roundNumber, newState.patience);
  const phaseModifiers = getPhaseModifiers(macroPhase);

  // Track if this card has economic effects (for patience calculation)
  let hasEconomicEffect = false;

  // Apply each effect
  for (const effect of effectsToApply) {
    switch (effect.type) {
      case 'economic':
        hasEconomicEffect = true;
        newState = applyEconomicEffect(effect, newState, result);
        break;
      case 'information':
        newState = applyInformationEffect(effect, newState, result);
        break;
      case 'narrative':
        newState = applyNarrativeEffect(effect, newState, result);
        break;
      case 'patience':
        newState = applyPatienceEffect(effect, newState, result);
        break;
    }
  }

  // Calculate patience cost for economic cards
  if (hasEconomicEffect) {
    let patienceCost = 1; // Base cost for playing an economic card

    // Check for explicit patience costs in effects (e.g., showdown)
    for (const effect of effectsToApply) {
      if (effect.type === 'patience' && effect.patienceCost) {
        patienceCost = effect.patienceCost;
      }
    }

    // Probing phase: economic card patience cost halved
    if (phaseModifiers.economicPatienceMultiplier < 1) {
      patienceCost = Math.floor(patienceCost * phaseModifiers.economicPatienceMultiplier);
    }

    // Precision bonus: u <= threshold -> patience cost halved
    if (newState.currentUncertainty <= config.PRECISION_PATIENCE_THRESHOLD) {
      patienceCost = Math.floor(patienceCost * 0.5);
    }

    // Conscience effect: don't change patience for economic cards differently
    // (the halving applies to effect magnitude, not patience cost)

    // Apply patience cost (probability-based in the original system,
    // but card system uses deterministic costs for clarity)
    if (patienceCost > 0) {
      newState = {
        ...newState,
        patience: Math.max(0, newState.patience - patienceCost),
      };
      result.patienceChange -= patienceCost;
    }
  }

  // Check for insult (pawn amount below threshold)
  const insultThreshold = newState.originalDesiredAmount * config.INSULT_THRESHOLD;
  if (newState.currentPawnAmount < insultThreshold && result.pawnAmountDelta < 0) {
    result.isInsult = true;
    const insultCost = config.INSULT_PATIENCE_COST;
    newState = {
      ...newState,
      patience: Math.max(0, newState.patience - insultCost),
    };
    result.patienceChange -= insultCost;
  }

  // Handle card lifecycle after play
  if (card.cardType === 'consumable') {
    newState = exhaustCard(newState, card.instanceId);
    // Update appraisal count for FAKE guarantee
    if (card.category === 'information' && card.id.startsWith('appraisal')) {
      newState = { ...newState, appraisalCount: newState.appraisalCount + 1 };
    }
  } else if (card.cardType === 'temporary') {
    // Temporary cards are removed from hand after play
    newState = {
      ...newState,
      deck: {
        ...newState.deck,
        hand: newState.deck.hand.filter(c => c.instanceId !== card.instanceId),
      },
    };
  } else {
    // Permanent cards go to discard after play
    newState = {
      ...newState,
      deck: {
        ...newState.deck,
        hand: newState.deck.hand.filter(c => c.instanceId !== card.instanceId),
        discardPile: [...newState.deck.discardPile, card],
      },
    };
  }

  // Track cards played this round
  newState = {
    ...newState,
    cardsPlayedThisRound: [...newState.cardsPlayedThisRound, card],
  };

  // Update macro phase
  newState = {
    ...newState,
    macroPhase: getNegotiationPhase(newState.roundNumber, newState.patience),
  };

  // Check if locked (patience = 0)
  if (newState.patience <= 0) {
    newState = { ...newState, isLocked: true };
  }

  return { newState, result };
}

// ============================================================================
// Effect Handlers
// ============================================================================

function applyEconomicEffect(
  effect: EconomicEffect,
  state: CardNegotiationState,
  result: CardPlayResult,
): CardNegotiationState {
  let newState = { ...state };
  const config = GAME_CONFIG.CARD_NEGOTIATION;

  // Check if economic effects should be halved (conscience card)
  const effectMultiplier = newState.modifiers.economicEffectHalved
    ? config.CONSCIENCE_ECONOMIC_PENALTY
    : 1;

  // Pawn amount adjustment
  if (effect.pawnPercent !== undefined) {
    // Check if locked
    if (effect.pawnPercent < 0 && newState.modifiers.priceCutLocked) {
      // Cannot reduce pawn amount further
      return newState;
    }

    const adjustedPercent = effect.pawnPercent * effectMultiplier;
    const delta = Math.round(newState.currentPawnAmount * (adjustedPercent / 100));
    newState = {
      ...newState,
      currentPawnAmount: Math.max(0, newState.currentPawnAmount + delta),
    };
    result.pawnAmountDelta += delta;
  }

  // Interest rate adjustment
  if (effect.rateAdjust !== undefined) {
    if (newState.modifiers.rateLocked) {
      // Cannot adjust rate when locked
      return newState;
    }

    const adjustedRate = Math.round(effect.rateAdjust * effectMultiplier);
    newState = {
      ...newState,
      currentRate: Math.max(0, newState.currentRate + adjustedRate),
    };
    result.rateDelta += adjustedRate;
  }

  // Lock rate
  if (effect.lockRate) {
    newState = {
      ...newState,
      modifiers: { ...newState.modifiers, rateLocked: true },
    };
    result.rateLocked = true;
  }

  // Reset rate
  if (effect.resetRate) {
    result.rateDelta = -newState.currentRate;
    newState = {
      ...newState,
      currentRate: 0,
      modifiers: { ...newState.modifiers, economicEffectHalved: true },
    };
    result.rateReset = true;
  }

  // Lock price cuts
  if (effect.lockPriceCut) {
    newState = {
      ...newState,
      modifiers: { ...newState.modifiers, priceCutLocked: true },
    };
  }

  return newState;
}

function applyInformationEffect(
  effect: InformationEffect,
  state: CardNegotiationState,
  result: CardPlayResult,
): CardNegotiationState {
  let newState = { ...state };

  // Shrink estimate range
  if (effect.shrinkPercent !== undefined && effect.shrinkPercent > 0) {
    if (effect.canDiscoverTrait) {
      // Appraisal cards: uncertainty handled by performAppraisalCore in the hook
      result.estimateRangeShrunk = true;
    } else {
      // Basic observation: simple shrink
      const shrinkFactor = effect.shrinkPercent / 100;
      const newUncertainty = Math.max(0, newState.currentUncertainty * (1 - shrinkFactor));

      // Check ceiling
      if (newState.currentUncertainty <= GAME_CONFIG.CARD_NEGOTIATION.APPRAISAL_CEILING_THRESHOLD) {
        // No further shrinkage
      } else {
        newState = { ...newState, currentUncertainty: newUncertainty };
        result.estimateRangeShrunk = true;
      }
    }
  }

  // Trait discovery (handled externally by the hook, but we flag it)
  if (effect.canDiscoverTrait) {
    // The actual trait discovery logic is in the hook since it needs
    // access to the Item's trait list. We just increment appraisal count.
  }

  // Show redemption intent
  if (effect.showRedemptionIntent) {
    result.redemptionIntentRevealed = true;
  }

  // Generate empathy/probe cards
  if (effect.generateInsightCards) {
    const [empathy, probe] = createInsightCards();
    newState = addTemporaryCard(newState, empathy);
    newState = addTemporaryCard(newState, probe);
    result.generatedCards.push(empathy, probe);
  }

  // Add uncertainty (SLY disruption card)
  if (effect.addUncertainty !== undefined) {
    newState = {
      ...newState,
      currentUncertainty: Math.min(1, newState.currentUncertainty + effect.addUncertainty),
    };
  }

  return newState;
}

function applyNarrativeEffect(
  effect: NarrativeEffect,
  state: CardNegotiationState,
  result: CardPlayResult,
): CardNegotiationState {
  // Narrative effects are mostly signals for the UI/game engine
  if (effect.triggerDialogue) {
    result.dialogueKey = effect.triggerDialogue;
  }

  // Reputation deltas are tracked in the result and applied at deal completion
  // (not during negotiation, as the deal might not be accepted)
  return state;
}

function applyPatienceEffect(
  effect: PatienceEffect,
  state: CardNegotiationState,
  result: CardPlayResult,
): CardNegotiationState {
  let newState = { ...state };

  if (effect.patienceCost !== undefined && effect.patienceCost > 0) {
    newState = {
      ...newState,
      patience: Math.max(0, newState.patience - effect.patienceCost),
    };
    result.patienceChange -= effect.patienceCost;
  }

  if (effect.patienceRecover !== undefined && effect.patienceRecover > 0) {
    newState = {
      ...newState,
      patience: Math.min(newState.maxPatience, newState.patience + effect.patienceRecover),
    };
    result.patienceChange += effect.patienceRecover;
  }

  return newState;
}

// ============================================================================
// Utility: Can Play Card
// ============================================================================

/**
 * Check if a card can be played given the current state.
 */
export function canPlayCard(card: Card, state: CardNegotiationState): boolean {
  if (state.isLocked) return false;
  if (!state.isActive) return false;

  // Check if card is in hand
  if (!state.deck.hand.some(c => c.instanceId === card.instanceId)) return false;

  // Check economic restrictions
  for (const effect of card.effects) {
    if (effect.type === 'economic') {
      if (effect.pawnPercent !== undefined && effect.pawnPercent < 0 && state.modifiers.priceCutLocked) {
        return false;
      }
      if (effect.rateAdjust !== undefined && effect.rateAdjust > 0 && state.modifiers.rateLocked) {
        return false;
      }
    }
  }

  // Check appraisal ceiling
  if (card.category === 'information') {
    const hasInfoEffect = card.effects.some(
      e => e.type === 'information' && e.shrinkPercent !== undefined && e.shrinkPercent > 0,
    );
    if (hasInfoEffect && state.currentUncertainty <= GAME_CONFIG.CARD_NEGOTIATION.APPRAISAL_CEILING_THRESHOLD) {
      // Can still play for trait discovery on consumable cards
      if (card.cardType !== 'consumable') return false;
    }
  }

  // Check focus affordability
  if (!canAffordFocus(card, state)) return false;

  return true;
}
