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
import { AbilityPath, FusionPath, SkillId, SkillPhase } from './types';
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

// ============================================================================
// NPC Reaction Texts (Design doc v1.4 section 6.3)
// ============================================================================

/**
 * NPC reaction text variants organized by ReactionIntensity x SkillPhase.
 *
 * These texts describe NPC reactions to the *player's skill effectiveness*,
 * which is modulated by reputation alignment. They are behavioral descriptions
 * (expressions, gestures, tone) rather than explicit reputation references.
 *
 * NIGHT phase has no NPC interaction, so arrays are empty.
 */
const REACTION_TEXTS: Record<ReactionIntensity, Record<SkillPhase, readonly string[]>> = {
  STRONG: {
    APPRAISAL: [
      '对方明显一愣，目光中多了几分敬意。',
      '你果然名不虚传......',
      '对方不自觉地点了点头，像是被说服了。',
      '看得出来，对方对你的判断深信不疑。',
    ],
    NEGOTIATION: [
      '对方的手微微发抖，显然感受到了压力。',
      '对方咽了口唾沫，额头渗出细汗。',
      '对方的眼神开始游移，底气明显不足了。',
      '你话音未落，对方的姿态已经软了下来。',
    ],
    DEPARTURE: [
      '对方眼眶微红，深深鞠了一躬。',
      '对方握着你的手迟迟不肯松开。',
      '走到门口又回头看了你一眼，嘴唇翕动着说不出话。',
      '对方低声说了句"谢谢"，声音有些哽咽。',
    ],
    NIGHT: [],
  },

  NORMAL: {
    APPRAISAL: [
      '嗯，你说的有道理。',
      '对方若有所思地看了看物件。',
      '对方没有反驳，似乎认可了你的说法。',
    ],
    NEGOTIATION: [
      '对方犹豫了一下，在心里盘算着。',
      '对方皱了皱眉，但没有立刻拒绝。',
      '对方沉默片刻，似乎在权衡利弊。',
    ],
    DEPARTURE: [
      '谢谢你，再见。',
      '对方礼貌地点了点头，转身离开。',
      '对方拿好东西，朝你挥了挥手。',
    ],
    NIGHT: [],
  },

  WEAK: {
    APPRAISAL: [
      '你确定？我可听说过一些关于你的事......',
      '对方用怀疑的眼神打量着你。',
      '哼，我凭什么信你的鉴定？',
      '对方不以为然地撇了撇嘴。',
    ],
    NEGOTIATION: [
      '你那一套对我没用。',
      '对方双臂交叉，冷冷地看着你。',
      '对方面无表情，丝毫不为所动。',
      '少来这套，我又不是没打听过你。',
    ],
    DEPARTURE: [
      '哼，不必了。',
      '对方头也不回地走了出去。',
      '对方面无表情地收好东西，径直离开。',
      '对方冷淡地点了下头，快步走向门口。',
    ],
    NIGHT: [],
  },
};

/**
 * Get a random NPC reaction text for the given intensity and phase.
 *
 * Returns undefined for NIGHT phase (no NPC interaction).
 *
 * @param intensity - Reaction intensity from getReactionIntensity()
 * @param phase - Current skill phase
 * @returns A reaction text string, or undefined if phase has no texts
 */
export function getReactionText(
  intensity: ReactionIntensity,
  phase: SkillPhase
): string | undefined {
  const variants = REACTION_TEXTS[intensity][phase];
  if (variants.length === 0) return undefined;
  const index = Math.floor(Math.random() * variants.length);
  return variants[index];
}
