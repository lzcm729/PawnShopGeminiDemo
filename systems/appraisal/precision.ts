/**
 * Appraisal Precision Payoff - Continuous Function Model
 *
 * Maps item uncertainty to modifier coefficients for:
 * - A1: NPC ask price correction
 * - A2: Insult threshold correction
 * - D:  Push-pull concession multiplier
 * - C': Black market volatility binding
 *
 * Design doc: 鉴定系统 v1.4 section 3
 */

import { GAME_CONFIG } from '../game/config';

const P = () => GAME_CONFIG.APPRAISAL;

/**
 * Normalize uncertainty to [0, 1] range.
 * 0 = best precision (u_min), 1 = worst precision (u_max).
 */
export function normalizeUncertainty(u: number): number {
  const { PRECISION_U_MIN, PRECISION_U_MAX } = P();
  const range = PRECISION_U_MAX - PRECISION_U_MIN;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (u - PRECISION_U_MIN) / range));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * A1: NPC ask price correction factor.
 * Low uncertainty -> lower ask (NPC respects expertise).
 * High uncertainty -> higher ask (NPC tries to exploit).
 */
export function getAskPriceModifier(uncertainty: number): number {
  const n = normalizeUncertainty(uncertainty);
  return lerp(P().PRECISION_ASK_BEST, P().PRECISION_ASK_WORST, n);
}

/**
 * A2: Insult threshold correction factor.
 * Low uncertainty -> lower insult line (safer to explore low offers).
 * High uncertainty -> higher insult line (easier to insult).
 */
export function getInsultModifier(uncertainty: number): number {
  const n = normalizeUncertainty(uncertainty);
  return lerp(P().PRECISION_INSULT_BEST, P().PRECISION_INSULT_WORST, n);
}

/**
 * D: Push-pull concession amount multiplier.
 * Low uncertainty -> NPC concedes more (player has leverage).
 * High uncertainty -> NPC concedes less.
 */
export function getConcessionMultiplier(uncertainty: number): number {
  const n = normalizeUncertainty(uncertainty);
  return lerp(P().PRECISION_CONCESSION_BEST, P().PRECISION_CONCESSION_WORST, n);
}

/**
 * C': Black market sale volatility offset range.
 * Returns [offsetLow, offsetHigh] for the item.
 * Low uncertainty -> narrow range (stable price).
 * High uncertainty -> wide asymmetric range (risky).
 */
export function getBlackmarketVolatilityRange(uncertainty: number): [number, number] {
  const n = normalizeUncertainty(uncertainty);
  const low = lerp(P().PRECISION_BM_OFFSET_LOW_BEST, P().PRECISION_BM_OFFSET_LOW_WORST, n);
  const high = lerp(P().PRECISION_BM_OFFSET_HIGH_BEST, P().PRECISION_BM_OFFSET_HIGH_WORST, n);
  return [low, high];
}

/**
 * C': Black market purchase precision modifier.
 * Low uncertainty -> full price (buyer trusts your knowledge).
 * High uncertainty -> discounted (buyer penalizes ignorance).
 */
export function getBlackmarketPurchaseModifier(uncertainty: number): number {
  const n = normalizeUncertainty(uncertainty);
  return lerp(P().PRECISION_BM_PURCHASE_BEST, P().PRECISION_BM_PURCHASE_WORST, n);
}
