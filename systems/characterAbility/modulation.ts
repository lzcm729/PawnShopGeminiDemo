/**
 * Character Ability System - Reputation Modulation
 *
 * Skill effects are modulated by reputation alignment:
 *   - Craft skills scaled by Credibility (商誉)
 *   - Time skills scaled by Innocence (清白) -- INVERSELY
 *   - Vibe skills scaled by Humanity (人情)
 *   - Fusion skills use average of both paths' modifiers
 *
 * Range: 0.8x (misaligned) to 1.2x (fully aligned)
 *
 * Design doc: v1.4 section 6 "声誉调制机制"
 */

import { ReputationType, ReputationProfile } from '../core/types';
import { getReputationModifier } from '../reputation/modulation';
import { AbilityPath, FusionPath, SkillId } from './types';
import { SKILL_DEFINITIONS } from './skillDefinitions';

// ============================================================================
// Path-to-Reputation Mapping
// ============================================================================

/**
 * Mapping from essence path to reputation axis.
 *
 * | Path  | Reputation | Direction |
 * |-------|-----------|-----------|
 * | CRAFT | Credibility | Positive (higher rep = stronger) |
 * | TIME  | Innocence   | INVERSE  (lower rep = stronger) |
 * | VIBE  | Humanity    | Positive (higher rep = stronger) |
 */
const PATH_REPUTATION_MAP: Record<AbilityPath, { axis: ReputationType; inverse: boolean }> = {
  CRAFT: { axis: ReputationType.CREDIBILITY, inverse: false },
  TIME:  { axis: ReputationType.INNOCENCE,   inverse: true  },
  VIBE:  { axis: ReputationType.HUMANITY,    inverse: false },
};

/** Fusion path component mapping */
const FUSION_COMPONENTS: Record<FusionPath, [AbilityPath, AbilityPath]> = {
  TIME_CRAFT: ['TIME', 'CRAFT'],
  CRAFT_VIBE: ['CRAFT', 'VIBE'],
  TIME_VIBE:  ['TIME', 'VIBE'],
};

// ============================================================================
// Modulation Calculation
// ============================================================================

/**
 * Get the reputation modifier for a pure path.
 *
 * For TIME path (旧影), the relationship is INVERSE:
 *   modifier = 0.8 + 0.4 * (1 - innocence/100)
 *   Lower innocence (dirtier hands) = stronger modifier
 *
 * For CRAFT/VIBE, it's the standard positive relationship.
 */
export function getPathModifier(path: AbilityPath, reputation: ReputationProfile): number {
  const { axis, inverse } = PATH_REPUTATION_MAP[path];
  const repValue = reputation[axis];

  if (inverse) {
    // 旧影: 0.8 + 0.4 * (1 - rep/100) = 1.2 - 0.4 * (rep/100)
    return getReputationModifier(100 - repValue, axis);
  }

  return getReputationModifier(repValue, axis);
}

/**
 * Get the reputation modifier for a fusion path.
 * Fusion modifier = average of both component path modifiers.
 */
export function getFusionModifier(fusionPath: FusionPath, reputation: ReputationProfile): number {
  const [pathA, pathB] = FUSION_COMPONENTS[fusionPath];
  const modA = getPathModifier(pathA, reputation);
  const modB = getPathModifier(pathB, reputation);
  return (modA + modB) / 2;
}

/**
 * Get the reputation modifier for any skill.
 * Dispatches to pure or fusion modifier based on skill path.
 */
export function getSkillModifier(skillId: SkillId, reputation: ReputationProfile): number {
  const def = SKILL_DEFINITIONS[skillId];
  const path = def.path;

  // Check if it's a fusion path
  if (path === 'TIME_CRAFT' || path === 'CRAFT_VIBE' || path === 'TIME_VIBE') {
    return getFusionModifier(path, reputation);
  }

  return getPathModifier(path as AbilityPath, reputation);
}

/**
 * Apply modulation to a base effect value.
 *
 * @param baseEffect - The unmodified effect value (e.g., 0.08 for 8%)
 * @param skillId - The skill whose modulation to apply
 * @param reputation - Current reputation profile
 * @returns Modulated effect value
 */
export function modulateEffect(
  baseEffect: number,
  skillId: SkillId,
  reputation: ReputationProfile
): number {
  const modifier = getSkillModifier(skillId, reputation);
  return baseEffect * modifier;
}

// ============================================================================
// NPC Reaction Intensity (Design doc v1.4 section 6.3)
// ============================================================================

/**
 * Determine NPC reaction intensity based on modulation level.
 *
 * Used by UI/narrative layer to select appropriate reaction text.
 * High modulation (>1.1) = stronger NPC reactions
 * Low modulation (<0.9) = weaker NPC reactions
 */
export type ReactionIntensity = 'STRONG' | 'NORMAL' | 'WEAK';

export function getReactionIntensity(modulationCoefficient: number): ReactionIntensity {
  if (modulationCoefficient > 1.1) return 'STRONG';
  if (modulationCoefficient < 0.9) return 'WEAK';
  return 'NORMAL';
}
