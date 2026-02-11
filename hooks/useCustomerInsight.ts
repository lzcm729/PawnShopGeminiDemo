/**
 * Customer Insight Hook (洞察客户 Hook) v1.4
 *
 * Provides React interface for the customer insight ability.
 * Allows players to "read" customer psychology during negotiation.
 *
 * Changes from v1.0:
 * - Uses probabilistic patience cost (I-3)
 * - Returns patienceCostProbability instead of expectedPatienceCost
 * - Exposes insight reward and push-pull modifier functions (I-4, I-7)
 *
 * Usage:
 * ```tsx
 * const { canUseInsight, useInsight, insightResult, status } = useCustomerInsight();
 *
 * if (canUseInsight()) {
 *   const result = useInsight();
 *   // Display result to player
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { PhaseIs } from '../systems/core/phases';
import {
  generateCustomerInsight,
  CustomerInsightResult,
  CustomerInsightStatus,
  InsightBlockReason,
  InsightLayer,
  DISPOSITION_INFO,
  getPatienceCostProbability,
  calculateInsightReward,
  getInsightPushPullModifier,
  InsightReward,
  InsightPushPullModifier,
  ForesightInfo,
} from '../systems/customerInsight';
import { hasEmpathyBonus, isSkillUnlocked, generateForesightResult } from '../systems/characterAbility/abilityEngine';
import { ForesightResult } from '../systems/characterAbility/types';
import { GAME_CONFIG } from '../systems/game/config';

// ============================================================================
// Foresight Converter
// ============================================================================

/** Convert ForesightResult (ability system) to ForesightInfo (UI display) */
function toForesightInfo(result: ForesightResult): ForesightInfo | null {
  if (result.signal === 'NONE') return null;
  return {
    predictionText: result.narrativeText,
    confidence: result.signal === 'HIGH' ? 'high' : 'low',
  };
}

// ============================================================================
// Constants
// ============================================================================

/** AP cost for using customer insight (layer 1) */
const INSIGHT_AP_COST = GAME_CONFIG.INSIGHT.AP_COST;

/** AP cost for deep insight (layer 2) */
const DEEP_INSIGHT_AP_COST = GAME_CONFIG.INSIGHT.AP_COST;

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseCustomerInsightReturn {
  /** Current insight result (null if not used yet) */
  insightResult: CustomerInsightResult | null;

  /** Current insight status */
  status: CustomerInsightStatus;

  /** Check if insight can be used (shortcut for status.canUse) */
  canUseInsight: () => boolean;

  /**
   * Use insight ability on current customer (layer 1 basic)
   * @returns InsightResult if successful, null if cannot use
   */
  useInsight: () => CustomerInsightResult | null;

  /**
   * Perform deep insight (layer 2) — requires additional AP
   * Must have already performed basic insight (layer 1)
   * @returns Updated InsightResult if successful, null if cannot use
   */
  performDeepInsight: () => CustomerInsightResult | null;

  /**
   * Whether deep insight (layer 2) can be performed
   */
  canDeepInsight: boolean;

  /**
   * Perform full insight (layer 3) — requires EMPATHY skill
   * Must have already performed deep insight (layer 2)
   * @returns Updated InsightResult if successful, null if cannot use
   */
  performFullInsight: () => CustomerInsightResult | null;

  /**
   * Whether full insight (layer 3) can be performed
   */
  canFullInsight: boolean;

  /** Clear current insight result */
  clearInsight: () => void;

  /** Get display text for block reason */
  getBlockReasonText: (reason: InsightBlockReason) => string;

  /** Get disposition display info */
  getDispositionInfo: typeof DISPOSITION_INFO;

  /** Get insight reward for the current insight (I-4) */
  getInsightReward: () => InsightReward | null;

  /** Get push-pull modifier based on current insight (I-7) */
  getPushPullModifier: () => InsightPushPullModifier | null;

  /** Current foresight info (generated alongside insight when FORESIGHT skill is unlocked) */
  foresightInfo: ForesightInfo | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useCustomerInsight = (): UseCustomerInsightReturn => {
  const { state, dispatch } = useGame();
  const { currentCustomer, currentCustomerInsight, phase, stats } = state;
  const abilityState = state.abilityState;

  // Calculate insight status
  const status = useMemo((): CustomerInsightStatus => {
    // Check if customer exists
    if (!currentCustomer) {
      return {
        canUse: false,
        blockReason: 'NO_CUSTOMER',
        apCost: INSIGHT_AP_COST,
        patienceCostProbability: 0,
      };
    }

    // Check if in negotiation phase
    if (!PhaseIs.negotiation(phase)) {
      return {
        canUse: false,
        blockReason: 'WRONG_PHASE',
        apCost: INSIGHT_AP_COST,
        patienceCostProbability: 0,
      };
    }

    // Check if already used
    if (currentCustomerInsight !== null) {
      return {
        canUse: false,
        blockReason: 'ALREADY_USED',
        apCost: INSIGHT_AP_COST,
        patienceCostProbability: 0,
      };
    }

    // Check AP
    if (stats.actionPoints < INSIGHT_AP_COST) {
      return {
        canUse: false,
        blockReason: 'NO_AP',
        apCost: INSIGHT_AP_COST,
        patienceCostProbability: getPatienceCostProbability(currentCustomer.behaviorTags),
      };
    }

    // Can use insight
    return {
      canUse: true,
      apCost: INSIGHT_AP_COST,
      patienceCostProbability: getPatienceCostProbability(currentCustomer.behaviorTags),
    };
  }, [currentCustomer, currentCustomerInsight, phase, stats.actionPoints]);

  // Shortcut check function
  const canUseInsight = useCallback((): boolean => {
    return status.canUse;
  }, [status.canUse]);

  // Check if pressure/heartstrike skills were used before insight (#22 time-order warning)
  const hasUsedPressureSkills = useMemo((): boolean => {
    if (!abilityState) return false;
    const used = abilityState.skillsUsedThisNegotiation || [];
    return used.includes('APPLY_PRESSURE') || used.includes('HEART_STRIKE');
  }, [abilityState]);

  // Use insight ability (layer 1 basic)
  const useInsight = useCallback((): CustomerInsightResult | null => {
    if (!status.canUse || !currentCustomer) {
      return null;
    }

    // Generate insight result (layer 1 for basic insight)
    const result = generateCustomerInsight(currentCustomer, 1);

    // #22: Add time-order warning if pressure/heartstrike was already used
    if (hasUsedPressureSkills) {
      result.timeOrderWarning = true;
    }

    // Consume AP
    dispatch({ type: 'CONSUME_AP', payload: INSIGHT_AP_COST });

    // Apply patience cost if triggered (I-3: probabilistic)
    if (result.patienceCost > 0) {
      dispatch({
        type: 'UPDATE_CUSTOMER_STATUS',
        payload: {
          patience: Math.max(0, currentCustomer.patience - result.patienceCost),
          mood: currentCustomer.mood,
          currentAskPrice: currentCustomer.currentAskPrice ?? currentCustomer.desiredAmount,
        },
      });
    }

    // Store insight result
    dispatch({ type: 'USE_CUSTOMER_INSIGHT', payload: result });

    // Generate foresight if FORESIGHT skill is unlocked (洞若观火)
    if (abilityState && isSkillUnlocked('FORESIGHT', abilityState)) {
      const foresightResult = generateForesightResult(
        currentCustomer.redemptionResolve,
        currentCustomer.item.realValue
      );
      const info = toForesightInfo(foresightResult);
      dispatch({ type: 'SET_FORESIGHT_INFO', payload: info });
    }

    return result;
  }, [status.canUse, currentCustomer, dispatch, hasUsedPressureSkills, abilityState]);

  // Can perform deep insight (layer 2): insight already used, at layer 1, have AP
  const canDeepInsight = useMemo((): boolean => {
    if (!currentCustomerInsight) return false;
    if (currentCustomerInsight.revealedLayer >= 2) return false;
    if (!currentCustomer) return false;
    if (!PhaseIs.negotiation(phase)) return false;
    return stats.actionPoints >= DEEP_INSIGHT_AP_COST;
  }, [currentCustomerInsight, currentCustomer, phase, stats.actionPoints]);

  // Perform deep insight (layer 2)
  const performDeepInsight = useCallback((): CustomerInsightResult | null => {
    if (!canDeepInsight || !currentCustomer) return null;

    // Re-generate with layer 2
    const result = generateCustomerInsight(currentCustomer, 2);
    // Preserve time-order warning from previous insight
    if (currentCustomerInsight?.timeOrderWarning) {
      result.timeOrderWarning = true;
    }

    // Consume AP for deep insight
    dispatch({ type: 'CONSUME_AP', payload: DEEP_INSIGHT_AP_COST });

    // Update stored insight result
    dispatch({ type: 'USE_CUSTOMER_INSIGHT', payload: result });

    return result;
  }, [canDeepInsight, currentCustomer, currentCustomerInsight, dispatch]);

  // Can perform full insight (layer 3): at layer 2, has EMPATHY skill
  const canFullInsight = useMemo((): boolean => {
    if (!currentCustomerInsight) return false;
    if (currentCustomerInsight.revealedLayer >= 3) return false;
    if (currentCustomerInsight.revealedLayer < 2) return false;
    if (!currentCustomer) return false;
    if (!PhaseIs.negotiation(phase)) return false;
    // Layer 3 requires EMPATHY skill (no additional AP cost)
    return hasEmpathyBonus(abilityState);
  }, [currentCustomerInsight, currentCustomer, phase, abilityState]);

  // Perform full insight (layer 3)
  const performFullInsight = useCallback((): CustomerInsightResult | null => {
    if (!canFullInsight || !currentCustomer) return null;

    // Re-generate with layer 3
    const result = generateCustomerInsight(currentCustomer, 3);
    // Preserve time-order warning from previous insight
    if (currentCustomerInsight?.timeOrderWarning) {
      result.timeOrderWarning = true;
    }

    // No additional AP cost for layer 3 (empathy skill unlocks it)
    // Update stored insight result
    dispatch({ type: 'USE_CUSTOMER_INSIGHT', payload: result });

    return result;
  }, [canFullInsight, currentCustomer, currentCustomerInsight, dispatch]);

  // Clear insight
  const clearInsight = useCallback((): void => {
    dispatch({ type: 'CLEAR_CUSTOMER_INSIGHT' });
  }, [dispatch]);

  // Get block reason text
  const getBlockReasonText = useCallback((reason: InsightBlockReason): string => {
    switch (reason) {
      case 'NO_AP':
        return '行动点不足';
      case 'ALREADY_USED':
        return '本次交易已使用过洞察';
      case 'NO_CUSTOMER':
        return '没有客户';
      case 'WRONG_PHASE':
        return '只能在议价阶段使用';
      default:
        return '无法使用洞察';
    }
  }, []);

  // Get insight reward (I-4)
  const getInsightReward = useCallback((): InsightReward | null => {
    if (!currentCustomerInsight) return null;
    return calculateInsightReward(
      currentCustomerInsight.disposition,
      currentCustomerInsight.revealedLayer,
      INSIGHT_AP_COST
    );
  }, [currentCustomerInsight]);

  // Get push-pull modifier (I-7)
  const getPushPullModifier = useCallback((): InsightPushPullModifier | null => {
    if (!currentCustomerInsight) return null;
    return getInsightPushPullModifier(currentCustomerInsight.disposition);
  }, [currentCustomerInsight]);

  return {
    insightResult: currentCustomerInsight,
    status,
    canUseInsight,
    useInsight,
    performDeepInsight,
    canDeepInsight,
    performFullInsight,
    canFullInsight,
    clearInsight,
    getBlockReasonText,
    getDispositionInfo: DISPOSITION_INFO,
    getInsightReward,
    getPushPullModifier,
    foresightInfo: state.currentForesightInfo,
  };
};
