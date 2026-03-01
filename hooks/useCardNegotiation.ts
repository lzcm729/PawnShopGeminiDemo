/**
 * Card Negotiation Hook (K-15)
 *
 * Integrates deck management, hand state, round progression,
 * effect resolution, and customer behavior into a single hook.
 *
 * This is the primary interface for the card negotiation UI.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Card,
  CardNegotiationState,
  CardPlayResult,
  InsertedCardDecision,
  NegotiationMacroPhase,
  CardCustomerType,
} from '@/systems/cardNegotiation/types';
import { createDeck, drawCards, applyRetentionRules } from '@/systems/cardNegotiation/deck';
import { addTemporaryCard } from '@/systems/cardNegotiation/deck';
import { resolveCardEffect, canPlayCard } from '@/systems/cardNegotiation/effects';
import { getNegotiationPhase, checkRateThreshold } from '@/systems/cardNegotiation/roundProgression';
import { executeCustomerTurn, mapBehaviorToCustomerType, type CustomerTurnResult } from '@/systems/cardNegotiation/customerTurn';
import { buildInitialDeck, createTraitCard } from '@/systems/cardNegotiation/definitions';
import { getContractTier, type ContractTier } from '@/systems/characterAbility/essenceSystem';
import { updateDriftMeter } from '@/systems/reputation/driftMeter';
import { GAME_CONFIG } from '@/systems/game/config';
import { generateValuationRange } from '@/systems/items/utils';
import { performAppraisalCore } from '@/systems/items/appraisalCore';
import type { Customer } from '@/types';
import type { AbilityState } from '@/systems/characterAbility/types';
import type { ActiveNewsInstance } from '@/systems/news/types';

// ============================================================================
// Dependencies for external integrations
// ============================================================================

export interface CardNegotiationDeps {
  dispatch: (action: any) => void;
  abilityState: AbilityState;
  moraleBuff?: { appraisalModifier: number; expiresDay: number } | null;
  currentDay: number;
  motherHealth: number;
  dailyNews: ActiveNewsInstance[];
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface CardNegotiationActions {
  /** Play a card from hand */
  playCard: (cardInstanceId: string, choiceId?: string) => CardPlayResult | null;
  /** End the player's turn -> retention rules -> customer turn -> draw */
  endTurn: (retainedCardInstanceId?: string) => CustomerTurnResult | null;
  /** Accept the current conditions and close the deal */
  acceptDeal: () => DealResult;
  /** Dismiss the customer without a deal */
  dismissCustomer: () => void;
  /** Accept a customer-inserted card */
  acceptInsertedCard: (cardInstanceId: string) => void;
  /** Reject a customer-inserted card (costs patience) */
  rejectInsertedCard: (cardInstanceId: string) => void;
  /** Check if a specific card can be played */
  canPlay: (card: Card) => boolean;
}

export interface DealResult {
  pawnAmount: number;
  /** Interest rate in percentage form (e.g., 5 = 5%) */
  ratePercent: number;
  /** Interest rate as decimal for legacy system compatibility (e.g., 0.05) */
  rateDecimal: number;
  contractTier: ContractTier;
  /** Whether this was a charity deal (0% rate, golden glow) */
  isCharity: boolean;
  /** Whether pawn amount was boosted (active kindness) */
  isActiveKindness: boolean;
}

export interface CardNegotiationHookReturn {
  // State
  state: CardNegotiationState;
  /** Customer type for UI hints */
  customerType: CardCustomerType;
  /** Current macro phase */
  macroPhase: NegotiationMacroPhase;
  /** Current contract tier (for drift meter / instinct) */
  contractTier: ContractTier;
  /** Pending insert decisions */
  pendingInserts: InsertedCardDecision[];
  /** Rate threshold instinct key (if just crossed) */
  rateThresholdKey: string | null;
  /** Customer drop hint for UI */
  dropHint: 'narrative' | 'disruption' | 'temptation' | 'none';
  /** Whether a deal was completed */
  dealCompleted: boolean;
  /** Deal result (if completed) */
  dealResult: DealResult | null;

  // Actions
  actions: CardNegotiationActions;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Card negotiation hook.
 *
 * @param customer - The current customer being served
 * @param itemUncertainty - Current item uncertainty from appraisal system
 * @param deps - External dependencies for appraisal integration
 */
export function useCardNegotiation(
  customer: Customer | null,
  itemUncertainty: number = 0.5,
  deps?: CardNegotiationDeps,
): CardNegotiationHookReturn {
  // Determine customer type from behavior tags
  const customerType = useMemo<CardCustomerType>(() => {
    if (!customer) return 'CALM';
    return mapBehaviorToCustomerType(customer.behaviorTags);
  }, [customer]);

  // Initialize state
  const [state, setState] = useState<CardNegotiationState>(() =>
    createInitialState(customer, itemUncertainty),
  );

  const [rateThresholdKey, setRateThresholdKey] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<'narrative' | 'disruption' | 'temptation' | 'none'>('none');
  const [dealCompleted, setDealCompleted] = useState(false);
  const [dealResult, setDealResult] = useState<DealResult | null>(null);

  // Reset state when customer changes (BUG FIX: useState initializer only runs on mount)
  useEffect(() => {
    if (!customer) return;
    setState(createInitialState(customer, itemUncertainty));
    setRateThresholdKey(null);
    setDropHint('none');
    setDealCompleted(false);
    setDealResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  // Derived state
  const macroPhase = useMemo(
    () => getNegotiationPhase(state.roundNumber, state.patience),
    [state.roundNumber, state.patience],
  );

  const contractTier = useMemo(
    () => getContractTier(state.currentRate),
    [state.currentRate],
  );

  // ---- Actions ----

  const playCard = useCallback((cardInstanceId: string, choiceId?: string): CardPlayResult | null => {
    const card = state.deck.hand.find(c => c.instanceId === cardInstanceId);
    if (!card) return null;
    if (!canPlayCard(card, state)) return null;

    const previousRate = state.currentRate;
    let { newState, result } = resolveCardEffect(card, state, choiceId);

    // Check rate threshold crossing
    const thresholdKey = checkRateThreshold(newState.currentRate, previousRate);
    setRateThresholdKey(thresholdKey);

    // --- Appraisal card integration: run full appraisal logic ---
    const hasAppraisalEffect = card.effects.some(
      e => e.type === 'information' && e.canDiscoverTrait,
    );

    if (hasAppraisalEffect && customer && deps) {
      // Build item with card system's appraisalCount (effects.ts already incremented it)
      const itemForAppraisal = {
        ...customer.item,
        appraisalCount: newState.appraisalCount - 1, // undo the +1 from effects.ts line 146
      };

      const appraisalResult = performAppraisalCore({
        item: itemForAppraisal,
        abilityState: deps.abilityState,
        moraleBuff: deps.moraleBuff,
        currentDay: deps.currentDay,
        motherHealth: deps.motherHealth,
        dailyNews: deps.dailyNews,
      });

      // Override uncertainty with the core calculation
      newState = { ...newState, currentUncertainty: appraisalResult.newUncertainty };

      // Sync to Redux
      deps.dispatch({
        type: 'UPDATE_ITEM_KNOWLEDGE',
        payload: {
          itemId: customer.item.id,
          newRange: appraisalResult.newRange,
          revealedTraits: appraisalResult.updatedRevealed,
          hiddenTraits: appraisalResult.updatedHidden,
          newUncertainty: appraisalResult.newUncertainty,
          newPerceived: appraisalResult.finalPerceived,
          incrementAppraisalCount: true,
          hasNegativeEvent: appraisalResult.hasNegativeEvent ? true : undefined,
          ...(appraisalResult.initialRange && { initialRange: appraisalResult.initialRange }),
          ...(appraisalResult.revealedHiddenTag && { revealedHiddenTag: appraisalResult.revealedHiddenTag }),
        },
      });

      // Generate trait cards for discovered traits
      for (const trait of appraisalResult.newTraitsFound) {
        const traitCard = createTraitCard(
          trait.type as 'FLAW' | 'FAKE' | 'STORY' | 'STOLEN' | 'JACKPOT',
          trait.name,
          trait.description,
          trait.valueImpact,
        );
        newState = addTemporaryCard(newState, traitCard);
        result.generatedCards.push(traitCard);
      }

      // Populate result fields
      if (appraisalResult.newTraitsFound.length > 0) {
        result.traitDiscovered = appraisalResult.newTraitsFound[0].name;
      }
      result.traitsDiscovered = appraisalResult.newTraitsFound.map(t => t.name);
      result.appraisalEvent = appraisalResult.event.type;
      result.isBreakthrough = appraisalResult.isBreakthrough;
      result.valueJump = appraisalResult.valueJump;
      result.isMastered = appraisalResult.isMastered;
    }

    // --- Basic observation Redux sync (non-appraisal info cards) ---
    const hasBasicInfoEffect = card.effects.some(
      e => e.type === 'information' && e.shrinkPercent !== undefined && e.shrinkPercent > 0 && !e.canDiscoverTrait,
    );

    if (hasBasicInfoEffect && result.estimateRangeShrunk && customer && deps) {
      deps.dispatch({
        type: 'UPDATE_ITEM_KNOWLEDGE',
        payload: {
          itemId: customer.item.id,
          newRange: generateValuationRange(
            customer.item.realValue,
            customer.item.perceivedValue,
            newState.currentUncertainty,
          ),
          revealedTraits: customer.item.revealedTraits || [],
          newUncertainty: newState.currentUncertainty,
        },
      });
    }

    setState(newState);
    return result;
  }, [state, customer, deps]);

  const endTurn = useCallback((retainedCardInstanceId?: string): CustomerTurnResult | null => {
    if (!state.isActive || state.isLocked) return null;

    // Step 1: Apply retention rules
    let newState = applyRetentionRules(state, retainedCardInstanceId);

    // Track passive rounds (no economic cards played this round)
    const playedEconomicCard = state.cardsPlayedThisRound.some(
      c => c.effects.some(e => e.type === 'economic'),
    );
    newState = {
      ...newState,
      modifiers: {
        ...newState.modifiers,
        passiveRounds: playedEconomicCard ? 0 : newState.modifiers.passiveRounds + 1,
      },
    };

    // Step 2: Customer turn
    const customerResult = executeCustomerTurn(newState, customerType);

    // Step 3: Process inserted cards (set as pending decisions)
    newState = {
      ...newState,
      pendingInserts: customerResult.insertedCards,
    };

    // Step 4: Advance round
    const nextRound = newState.roundNumber + 1;
    newState = {
      ...newState,
      roundNumber: nextRound,
      roundPhase: 'player_draw',
      cardsPlayedThisRound: [],
      macroPhase: getNegotiationPhase(nextRound, newState.patience),
    };

    // Step 5: Draw cards (after inserts are resolved, done separately)
    // Cards are drawn after pending inserts are resolved
    newState = drawCards(newState);

    setDropHint(customerResult.dropHint);
    setState(newState);
    return customerResult;
  }, [state, customerType]);

  const acceptDeal = useCallback((): DealResult => {
    const ratePercent = state.currentRate;
    const rateDecimal = ratePercent / 100;
    const tier = getContractTier(ratePercent);
    const isCharity = ratePercent === 0;
    const isActiveKindness = state.currentPawnAmount > state.originalDesiredAmount;

    const result: DealResult = {
      pawnAmount: state.currentPawnAmount,
      ratePercent,
      rateDecimal,
      contractTier: tier,
      isCharity,
      isActiveKindness,
    };

    // Update drift meter
    updateDriftMeter(ratePercent);

    setState(prev => ({ ...prev, isActive: false }));
    setDealCompleted(true);
    setDealResult(result);

    return result;
  }, [state]);

  const dismissCustomer = useCallback((): void => {
    setState(prev => ({ ...prev, isActive: false }));
    setDealCompleted(true);
    setDealResult(null);
  }, []);

  const acceptInsertedCard = useCallback((cardInstanceId: string): void => {
    setState(prev => {
      const insertIndex = prev.pendingInserts.findIndex(
        d => d.card.instanceId === cardInstanceId,
      );
      if (insertIndex === -1) return prev;

      const decision = prev.pendingInserts[insertIndex];
      const newInserts = [...prev.pendingInserts];
      newInserts[insertIndex] = { ...decision, decided: true, accepted: true };

      // Add card to hand
      return {
        ...prev,
        deck: {
          ...prev.deck,
          hand: [...prev.deck.hand, decision.card],
        },
        pendingInserts: newInserts,
      };
    });
  }, []);

  const rejectInsertedCard = useCallback((cardInstanceId: string): void => {
    const config = GAME_CONFIG.CARD_NEGOTIATION;

    setState(prev => {
      const insertIndex = prev.pendingInserts.findIndex(
        d => d.card.instanceId === cardInstanceId,
      );
      if (insertIndex === -1) return prev;

      const newInserts = [...prev.pendingInserts];
      newInserts[insertIndex] = {
        ...newInserts[insertIndex],
        decided: true,
        accepted: false,
      };

      // Rejecting costs patience
      const newPatience = Math.max(0, prev.patience - config.REFUSE_INSERT_COST);

      return {
        ...prev,
        patience: newPatience,
        isLocked: newPatience <= 0,
        pendingInserts: newInserts,
      };
    });
  }, []);

  const canPlay = useCallback((card: Card): boolean => {
    return canPlayCard(card, state);
  }, [state]);

  // ---- Return ----

  return {
    state,
    customerType,
    macroPhase,
    contractTier,
    pendingInserts: state.pendingInserts,
    rateThresholdKey,
    dropHint,
    dealCompleted,
    dealResult,
    actions: {
      playCard,
      endTurn,
      acceptDeal,
      dismissCustomer,
      acceptInsertedCard,
      rejectInsertedCard,
      canPlay,
    },
  };
}

// ============================================================================
// State Initialization
// ============================================================================

function createInitialState(
  customer: Customer | null,
  itemUncertainty: number,
): CardNegotiationState {
  const config = GAME_CONFIG.CARD_NEGOTIATION;
  const desiredAmount = customer?.desiredAmount ?? 1000;
  const patience = customer?.patience ?? 3;

  // Build initial deck and draw
  const initialCards = buildInitialDeck();
  const deck = createDeck(initialCards);

  // Count consumable cards
  const appraisalTotal = initialCards.filter(
    c => c.cardType === 'consumable' && c.id.startsWith('appraisal'),
  ).length;
  const insightTotal = initialCards.filter(
    c => c.cardType === 'consumable' && c.id.startsWith('insight'),
  ).length;

  const initialState: CardNegotiationState = {
    currentPawnAmount: desiredAmount,
    currentRate: 0,
    originalDesiredAmount: desiredAmount,
    deck,
    roundNumber: 1,
    roundPhase: 'player_draw',
    macroPhase: 'probing',
    patience,
    maxPatience: patience,
    modifiers: {
      rateLocked: false,
      priceCutLocked: false,
      economicEffectHalved: false,
      passiveRounds: 0,
    },
    pendingInserts: [],
    currentUncertainty: itemUncertainty,
    cardsPlayedThisRound: [],
    appraisalCount: 0,
    isActive: true,
    isLocked: false,
    appraisalCardsRemaining: appraisalTotal,
    insightCardsRemaining: insightTotal,
    appraisalCardsTotal: appraisalTotal,
    insightCardsTotal: insightTotal,
  };

  // Draw initial hand
  return drawCards(initialState);
}
