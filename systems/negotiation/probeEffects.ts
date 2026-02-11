/**
 * Probe Skill Effects (试探技能效果)
 *
 * When probe correctly matches customer disposition (bluffing/firm),
 * reveals:
 * 1. Floor price fuzzy range (minimumAmount +/-15%)
 * 2. Concession probability tier (low/medium/high)
 * 3. Midpoint shortcut for quick-offer button
 *
 * All threshold values loaded from game.toml via GAME_CONFIG.
 */

import { GAME_CONFIG } from '../game/config';
import { calculateConcessionChance, getPushPullStyle } from './pushPull';
import { BehaviorTag } from '../../types';

// ============================================================================
// Types
// ============================================================================

/** Fuzzy floor price range revealed by successful probe */
export interface FloorRange {
  /** Lower bound of the revealed range */
  low: number;
  /** Upper bound of the revealed range */
  high: number;
  /** Midpoint (used for the quick-offer shortcut button) */
  midpoint: number;
}

/** Concession probability tier */
export type ConcessionTier = 'low' | 'medium' | 'high';

/** Complete probe reveal result */
export interface ProbeRevealResult {
  /** Fuzzy floor price range */
  floorRange: FloorRange;
  /** Concession probability tier */
  concessionTier: ConcessionTier;
  /** Raw concession chance (for debug/logging) */
  concessionChance: number;
}

// ============================================================================
// Floor Range Calculation
// ============================================================================

/**
 * Calculate the fuzzy floor price range revealed by a successful probe.
 *
 * The range is minimumAmount +/- floor_range_percent (default 15%).
 * Values are clamped to be non-negative and the low bound is floored,
 * high bound is ceiled for integer currency.
 */
export function calculateFloorRange(minimumAmount: number): FloorRange {
  const rangePercent = GAME_CONFIG.NEGOTIATION.PROBE.FLOOR_RANGE_PERCENT;
  const offset = minimumAmount * rangePercent;

  const low = Math.max(0, Math.floor(minimumAmount - offset));
  const high = Math.ceil(minimumAmount + offset);
  const midpoint = Math.round((low + high) / 2);

  return { low, high, midpoint };
}

// ============================================================================
// Concession Tier Determination
// ============================================================================

/**
 * Determine the concession probability tier from a raw chance value.
 *
 * Tiers (configurable via game.toml):
 * - low:    chance < concession_tier_low (default 20%)
 * - medium: concession_tier_low <= chance < concession_tier_high (default 20%-40%)
 * - high:   chance >= concession_tier_high (default 40%)
 */
export function getConcessionTier(concessionChance: number): ConcessionTier {
  const { CONCESSION_TIER_LOW, CONCESSION_TIER_HIGH } = GAME_CONFIG.NEGOTIATION.PROBE;

  if (concessionChance < CONCESSION_TIER_LOW) return 'low';
  if (concessionChance < CONCESSION_TIER_HIGH) return 'medium';
  return 'high';
}

// ============================================================================
// Concession Chance Query (externally queryable)
// ============================================================================

/**
 * Query the current NPC concession chance without executing a push-pull round.
 * Used by probe to display the three-tier concession indicator.
 *
 * This extracts the calculation logic from executePushPull so it can be
 * called independently for display purposes (no side effects, no dice roll).
 *
 * @param behaviorTags NPC behavior tags
 * @param currentOffer Player's current offer amount
 * @param minimumAmount NPC's minimum acceptable amount
 * @param persistCount How many times the player has persisted consecutively
 * @param concessionCount How many times the NPC has already conceded
 * @param insightConcessionModifier Optional modifier from insight system
 * @returns Raw concession probability (0-1)
 */
export function queryConcessionChance(
  behaviorTags: BehaviorTag[],
  currentOffer: number,
  minimumAmount: number,
  persistCount: number,
  concessionCount: number,
  insightConcessionModifier: number = 0
): number {
  const style = getPushPullStyle(behaviorTags);

  // Use 'PERSIST' as the default player move for querying
  // (represents the typical scenario after probe is used)
  let chance = calculateConcessionChance(
    style,
    'PERSIST',
    persistCount,
    concessionCount,
    currentOffer,
    minimumAmount
  );

  // Apply insight modifier
  if (insightConcessionModifier !== 0) {
    chance = Math.min(1.0, Math.max(0, chance + insightConcessionModifier));
  }

  return chance;
}

// ============================================================================
// Combined Probe Reveal
// ============================================================================

/**
 * Generate the complete probe reveal result.
 * Called when probe skill successfully matches customer disposition.
 *
 * @param minimumAmount NPC's hidden minimum amount
 * @param behaviorTags NPC behavior tags
 * @param currentOffer Player's current offer
 * @param persistCount Consecutive persist count
 * @param concessionCount NPC concession count so far
 * @param insightConcessionModifier Optional insight modifier
 * @returns ProbeRevealResult with floor range and concession tier
 */
export function generateProbeReveal(
  minimumAmount: number,
  behaviorTags: BehaviorTag[],
  currentOffer: number,
  persistCount: number,
  concessionCount: number,
  insightConcessionModifier: number = 0
): ProbeRevealResult {
  const floorRange = calculateFloorRange(minimumAmount);

  const concessionChance = queryConcessionChance(
    behaviorTags,
    currentOffer,
    minimumAmount,
    persistCount,
    concessionCount,
    insightConcessionModifier
  );

  const concessionTier = getConcessionTier(concessionChance);

  return {
    floorRange,
    concessionTier,
    concessionChance,
  };
}
