/**
 * Card Negotiation System - Round Progression (K-9)
 *
 * Implements the micro interest curve:
 * - Probing (round 1): safe exploration, economic patience cost halved
 * - Bargaining (rounds 2-3): information reveals, economic operations intensify
 * - Showdown (patience <= 2 or round 4+): dramatic climax
 */

import type { NegotiationMacroPhase } from './types';

// ============================================================================
// Phase Determination
// ============================================================================

/**
 * Determine the current negotiation macro phase based on round number and patience.
 */
export function getNegotiationPhase(
  roundNumber: number,
  patience: number,
): NegotiationMacroPhase {
  // Showdown triggers on patience <= 2 OR round 4+
  if (patience <= 2 || roundNumber >= 4) {
    return 'showdown';
  }
  // Probing is only round 1
  if (roundNumber <= 1) {
    return 'probing';
  }
  // Bargaining is rounds 2-3
  return 'bargaining';
}

// ============================================================================
// Phase Modifiers
// ============================================================================

export interface PhaseModifiers {
  /** Multiplier on economic card patience cost (0.5 during probing) */
  economicPatienceMultiplier: number;
  /** Whether showdown narrative effects are active */
  isShowdown: boolean;
  /** Customer drop frequency modifier */
  customerDropMultiplier: number;
}

/**
 * Get effect modifiers for the current phase.
 */
export function getPhaseModifiers(phase: NegotiationMacroPhase): PhaseModifiers {
  switch (phase) {
    case 'probing':
      return {
        economicPatienceMultiplier: 0.5,
        isShowdown: false,
        customerDropMultiplier: 0.5,
      };
    case 'bargaining':
      return {
        economicPatienceMultiplier: 1,
        isShowdown: false,
        customerDropMultiplier: 1,
      };
    case 'showdown':
      return {
        economicPatienceMultiplier: 1,
        isShowdown: true,
        customerDropMultiplier: 1.5,
      };
  }
}

/**
 * Check if the current state should trigger rate threshold instinct.
 * Returns the threshold key if triggered, null otherwise.
 */
export function checkRateThreshold(
  currentRate: number,
  previousRate: number,
): string | null {
  const thresholds = [5, 10, 15, 20];
  for (const threshold of thresholds) {
    if (previousRate < threshold && currentRate >= threshold) {
      return `rate_threshold_${threshold}`;
    }
  }
  return null;
}
