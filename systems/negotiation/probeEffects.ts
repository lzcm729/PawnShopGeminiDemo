/**
 * Probe Skill Effects (试探技能效果)
 *
 * When probe correctly matches customer disposition (bluffing/firm),
 * reveals:
 * 1. Exact floor price (minimumAmount)
 * 2. Concession probability tier (low/medium/high)
 *
 * All threshold values loaded from game.toml via GAME_CONFIG.
 */

import { GAME_CONFIG } from '../game/config';
import { calculateConcessionChance, getPushPullStyle } from './pushPull';
import { BehaviorTag } from '../../types';

// ============================================================================
// Types
// ============================================================================

/** Concession probability tier (null when offer >= ask, as NPC will directly accept) */
export type ConcessionTier = 'low' | 'medium' | 'high' | null;

/** Complete probe reveal result */
export interface ProbeRevealResult {
  /** Exact floor price revealed by probe */
  floorPrice: number;
  /** Concession probability tier */
  concessionTier: ConcessionTier;
  /** Raw concession chance (for debug/logging) */
  concessionChance: number;
}

// ============================================================================
// Concession Tier Determination
// ============================================================================

/**
 * Determine the concession probability tier from a raw chance value.
 *
 * Returns null if concessionChance is null (indicating offer >= ask price).
 *
 * Tiers (configurable via game.toml):
 * - low:    chance < concession_tier_low (default 20%)
 * - medium: concession_tier_low <= chance < concession_tier_high (default 20%-40%)
 * - high:   chance >= concession_tier_high (default 40%)
 * - null:   when offer >= ask price (NPC will directly accept, no concession needed)
 */
export function getConcessionTier(concessionChance: number | null): ConcessionTier {
  if (concessionChance === null) return null;

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
 * @returns ProbeRevealResult with exact floor price and concession tier
 */
export function generateProbeReveal(
  minimumAmount: number,
  behaviorTags: BehaviorTag[],
  currentOffer: number,
  persistCount: number,
  concessionCount: number,
  insightConcessionModifier: number = 0
): ProbeRevealResult {
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
    floorPrice: minimumAmount,
    concessionTier,
    concessionChance,
  };
}
