/**
 * Customer Insight Hook (洞察客户 Hook)
 *
 * Provides React interface for the customer insight ability.
 * Allows players to "read" customer psychology during negotiation.
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
  DISPOSITION_INFO,
  calculatePatienceCost,
} from '../systems/customerInsight';

// ============================================================================
// Constants
// ============================================================================

/** AP cost for using customer insight */
const INSIGHT_AP_COST = 1;

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
   * Use insight ability on current customer
   * @returns InsightResult if successful, null if cannot use
   */
  useInsight: () => CustomerInsightResult | null;

  /** Clear current insight result */
  clearInsight: () => void;

  /** Get display text for block reason */
  getBlockReasonText: (reason: InsightBlockReason) => string;

  /** Get disposition display info */
  getDispositionInfo: typeof DISPOSITION_INFO;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useCustomerInsight = (): UseCustomerInsightReturn => {
  const { state, dispatch } = useGame();
  const { currentCustomer, currentCustomerInsight, phase, stats } = state;

  // Calculate insight status
  const status = useMemo((): CustomerInsightStatus => {
    // Check if customer exists
    if (!currentCustomer) {
      return {
        canUse: false,
        blockReason: 'NO_CUSTOMER',
        apCost: INSIGHT_AP_COST,
        expectedPatienceCost: 0,
      };
    }

    // Check if in negotiation phase
    if (!PhaseIs.negotiation(phase)) {
      return {
        canUse: false,
        blockReason: 'WRONG_PHASE',
        apCost: INSIGHT_AP_COST,
        expectedPatienceCost: 0,
      };
    }

    // Check if already used
    if (currentCustomerInsight !== null) {
      return {
        canUse: false,
        blockReason: 'ALREADY_USED',
        apCost: INSIGHT_AP_COST,
        expectedPatienceCost: 0,
      };
    }

    // Check AP
    if (stats.actionPoints < INSIGHT_AP_COST) {
      return {
        canUse: false,
        blockReason: 'NO_AP',
        apCost: INSIGHT_AP_COST,
        expectedPatienceCost: calculatePatienceCost(currentCustomer.behaviorTags),
      };
    }

    // Can use insight
    return {
      canUse: true,
      apCost: INSIGHT_AP_COST,
      expectedPatienceCost: calculatePatienceCost(currentCustomer.behaviorTags),
    };
  }, [currentCustomer, currentCustomerInsight, phase, stats.actionPoints]);

  // Shortcut check function
  const canUseInsight = useCallback((): boolean => {
    return status.canUse;
  }, [status.canUse]);

  // Use insight ability
  const useInsight = useCallback((): CustomerInsightResult | null => {
    if (!status.canUse || !currentCustomer) {
      return null;
    }

    // Generate insight result
    const result = generateCustomerInsight(currentCustomer);

    // Consume AP
    dispatch({ type: 'CONSUME_AP', payload: INSIGHT_AP_COST });

    // Apply patience cost if any
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

    return result;
  }, [status.canUse, currentCustomer, dispatch]);

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

  return {
    insightResult: currentCustomerInsight,
    status,
    canUseInsight,
    useInsight,
    clearInsight,
    getBlockReasonText,
    getDispositionInfo: DISPOSITION_INFO,
  };
};
