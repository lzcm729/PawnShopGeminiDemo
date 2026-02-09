/**
 * Renewal Refusal Penalty Calculation
 *
 * Escalating humanity penalty when refusing renewal:
 * More prior renewals = harsher penalty ("giving hope then taking it away")
 */

import { GAME_CONFIG } from '../game/config';

/**
 * Get the humanity penalty for refusing a renewal based on prior extension count.
 * Returns a negative number (e.g., -10, -15, -20, -25).
 */
export function getRenewalRefusalPenalty(extensionCount: number): number {
  const penalties = GAME_CONFIG.PAWN_BUSINESS;
  if (extensionCount >= 3) return penalties.RENEWAL_REFUSAL_PENALTY_3_PLUS;
  if (extensionCount === 2) return penalties.RENEWAL_REFUSAL_PENALTY_2;
  if (extensionCount === 1) return penalties.RENEWAL_REFUSAL_PENALTY_1;
  return penalties.RENEWAL_REFUSAL_PENALTY_0;
}
