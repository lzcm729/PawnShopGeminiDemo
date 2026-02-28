/**
 * Character Ability System - Ability Engine
 *
 * Core logic for:
 * - Skill unlock checks and execution
 * - Active skill usage (pressure, heart strike, comfort, extra care)
 * - Passive skill effect queries
 * - Floor reduction with global 20% cap
 * - Foresight and consequence flash
 * - Word of mouth pseudo-random
 *
 * Design doc: v1.4 sections 4, 8, 9
 */

import { ReputationProfile } from '../core/types';
import { EssenceBalance, EssenceCost } from '../economy/essence';
import { BehaviorTag } from '../core/types';
// NpcPushPullStyle and getPushPullStyle no longer needed after heart strike redesign
import {
  AbilityState,
  SkillId,
  FloorReductionResult,
  ForesightResult,
  ConsequenceFlashResult,
  ContractTierHint,
  ComfortResult,
  ExtraCareResult,
  ForesightFatigue,
  WordOfMouthTracker,
} from './types';
import { SKILL_DEFINITIONS } from './skillDefinitions';
import { getSkillModifier } from './modulation';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// Constants
// ============================================================================

/** Global cap on total floor reduction from all skills */
const GLOBAL_FLOOR_REDUCTION_CAP = GAME_CONFIG.ABILITY.GLOBAL_FLOOR_REDUCTION_CAP;

/** Base floor reduction for Apply Pressure */
const PRESSURE_BASE_REDUCTION = GAME_CONFIG.ABILITY.PRESSURE_BASE_REDUCTION;

// Heart strike floor reduction constants removed — mechanic is now concession chance bonus

/** Per-flaw floor reduction for Sharp Scrutiny */
const SHARP_SCRUTINY_PER_FLAW = GAME_CONFIG.ABILITY.SHARP_SCRUTINY_PER_FLAW;

/** Timing bonus when skill is used right after NPC concession */
const TIMING_BONUS_MULTIPLIER = GAME_CONFIG.ABILITY.TIMING_BONUS_MULTIPLIER;

/** Word of mouth: base referral chance */
const WOM_BASE_CHANCE = GAME_CONFIG.ABILITY.WOM_BASE_CHANCE;
/** Word of mouth: increment per fail */
const WOM_INCREMENT = GAME_CONFIG.ABILITY.WOM_INCREMENT;
/** Word of mouth: guaranteed trigger at this many consecutive fails */
const WOM_GUARANTEE_STREAK = GAME_CONFIG.ABILITY.WOM_GUARANTEE_STREAK;

/** Foresight fatigue: flash count before fatigue kicks in */
const FORESIGHT_FATIGUE_THRESHOLD = GAME_CONFIG.ABILITY.FORESIGHT_FATIGUE_THRESHOLD;
/** Foresight fatigue: minimum hope change to trigger flash after fatigue */
const FORESIGHT_FATIGUE_HOPE_THRESHOLD = GAME_CONFIG.ABILITY.FORESIGHT_HOPE_THRESHOLD;

// ============================================================================
// Essence Discount
// ============================================================================

/**
 * Apply essence discount to a cost. Each component is floored after discount.
 * @param cost Original essence cost
 * @param discountPercent Discount percentage (0-100), e.g. 10 means -10%
 */
export function applyEssenceDiscount(cost: EssenceCost, discountPercent: number): EssenceCost {
  if (discountPercent <= 0) return cost;
  const multiplier = 1 - discountPercent / 100;
  return {
    craft: cost.craft ? Math.floor(cost.craft * multiplier) : 0,
    time: cost.time ? Math.floor(cost.time * multiplier) : 0,
    vibe: cost.vibe ? Math.floor(cost.vibe * multiplier) : 0,
  };
}

// ============================================================================
// Initial State Factory
// ============================================================================

/**
 * Create initial ability state with all skills locked.
 */
export function createInitialAbilityState(): AbilityState {
  const skills = {} as Record<SkillId, { unlocked: boolean; useCount: number }>;
  for (const id of Object.keys(SKILL_DEFINITIONS) as SkillId[]) {
    skills[id] = { unlocked: false, useCount: 0 };
  }

  return {
    skills,
    moralEchoQueue: [],
    wordOfMouth: {
      failStreak: 0,
      pendingChecks: [],
    },
    foresightFatigue: {
      totalFlashes: 0,
      fatigued: false,
    },
    skillsUsedThisNegotiation: [],
    extraCareUsedThisDeparture: false,
    comfortUsedThisDeparture: false,
    totalEpiphanies: 0,
    gewuLevel: 1,
  };
}

// ============================================================================
// Skill Unlock
// ============================================================================

/**
 * Check if a skill can be unlocked right now.
 */
export function canUnlockSkill(
  skillId: SkillId,
  abilityState: AbilityState,
  essenceBalance: EssenceBalance,
  currentEnergy: number,
  essenceDiscountPercent: number = 0
): { canUnlock: boolean; meetsPrereqs: boolean; hasEssence: boolean; hasEnergy: boolean } {
  const def = SKILL_DEFINITIONS[skillId];

  // Already unlocked
  if (abilityState.skills[skillId].unlocked) {
    return { canUnlock: false, meetsPrereqs: true, hasEssence: true, hasEnergy: true };
  }

  // Check prerequisites
  const meetsPrereqs = def.prerequisites.every(
    prereq => abilityState.skills[prereq].unlocked
  );

  // Check essence cost (apply cultivation room discount)
  const cost = applyEssenceDiscount(def.essenceCost, essenceDiscountPercent);
  const hasEssence =
    essenceBalance.craft >= (cost.craft || 0) &&
    essenceBalance.time >= (cost.time || 0) &&
    essenceBalance.vibe >= (cost.vibe || 0);

  // Check energy
  const hasEnergy = currentEnergy >= def.energyCost;

  return {
    canUnlock: meetsPrereqs && hasEssence && hasEnergy,
    meetsPrereqs,
    hasEssence,
    hasEnergy,
  };
}

/**
 * Check if a skill is unlocked.
 */
export function isSkillUnlocked(skillId: SkillId, abilityState: AbilityState): boolean {
  return abilityState.skills[skillId].unlocked;
}

// ============================================================================
// Active Skill Usage Checks
// ============================================================================

/**
 * Check if an active skill can be used right now in negotiation.
 * Considers per-negotiation usage limits.
 */
export function canUseSkillInNegotiation(
  skillId: SkillId,
  abilityState: AbilityState,
  currentAP: number
): boolean {
  if (!isSkillUnlocked(skillId, abilityState)) return false;

  const def = SKILL_DEFINITIONS[skillId];
  if (def.activation !== 'ACTIVE') return false;

  // Check per-negotiation usage limit
  if (abilityState.skillsUsedThisNegotiation.includes(skillId)) return false;

  // Check AP
  if (def.apCost !== undefined && currentAP < def.apCost) return false;

  return true;
}

// ============================================================================
// Floor Reduction Skills (施压, 攻心, 明察秋毫)
// ============================================================================

/**
 * Calculate the floor reduction from Apply Pressure (施压).
 *
 * Base: -8% of original floor
 * Timing bonus: +20% if used right after NPC concession
 * Modulation: scaled by Time path reputation modifier
 * Patience cost: 1
 *
 * @param originalFloor The NPC's original (unmodified) floor price
 * @param currentFloor The NPC's current floor price (after any previous reductions)
 * @param reputation Current reputation profile
 * @param afterConcession Whether NPC just conceded (timing bonus)
 * @param existingReduction Total floor reduction already applied from all skills (0-1)
 */
export function calculatePressureEffect(
  originalFloor: number,
  currentFloor: number,
  reputation: ReputationProfile,
  afterConcession: boolean,
  existingReduction: number
): FloorReductionResult {
  const modCoeff = getSkillModifier('APPLY_PRESSURE', reputation);

  let baseReduction = PRESSURE_BASE_REDUCTION;
  const timingApplied = afterConcession;
  if (timingApplied) {
    baseReduction *= TIMING_BONUS_MULTIPLIER;
  }

  const rawReduction = baseReduction * modCoeff;

  // Apply global cap
  const totalWithNew = existingReduction + rawReduction;
  const cappedTotal = Math.min(totalWithNew, GLOBAL_FLOOR_REDUCTION_CAP);
  const effectiveReduction = cappedTotal - existingReduction;
  const cappedByGlobalLimit = totalWithNew > GLOBAL_FLOOR_REDUCTION_CAP;

  const reductionAmount = Math.floor(originalFloor * effectiveReduction);
  const newFloor = Math.max(currentFloor - reductionAmount, 0);

  return {
    rawReduction,
    effectiveReduction,
    newFloor,
    patienceCost: 1,
    cappedByGlobalLimit,
    modulationCoefficient: modCoeff,
    timingBonusApplied: timingApplied,
  };
}

/**
 * Heart Strike Result — concession chance bonus (not floor reduction)
 */
export interface HeartStrikeResult {
  /** Concession chance bonus (e.g. 0.30 = +30%) */
  concessionBonus: number;
  /** Patience cost (always 0 for heart strike) */
  patienceCost: number;
  /** Modulation coefficient applied */
  modulationCoefficient: number;
  /** NPC type category used for differentiation */
  npcCategory: 'DESPERATE' | 'HARD' | 'DEFAULT';
}

/**
 * BehaviorTag → NPC category mapping for Heart Strike differentiation.
 *
 * Design doc v1.4 sec 4.2: Heart Strike effectiveness varies by NPC type.
 * - DESPERATE/NAIVE → vulnerable customers, higher bonus
 * - STUBBORN/SAVVY/SUSPICIOUS → tough customers, lower bonus
 * - SENTIMENTAL/default → standard bonus
 */
function getHeartStrikeNpcCategory(behaviorTags: BehaviorTag[]): 'DESPERATE' | 'HARD' | 'DEFAULT' {
  // Priority: check DESPERATE/NAIVE first (vulnerable), then STUBBORN/SAVVY/SUSPICIOUS (tough)
  if (behaviorTags.includes('DESPERATE') || behaviorTags.includes('NAIVE')) {
    return 'DESPERATE';
  }
  if (behaviorTags.includes('STUBBORN') || behaviorTags.includes('SAVVY') || behaviorTags.includes('SUSPICIOUS')) {
    return 'HARD';
  }
  return 'DEFAULT';
}

/**
 * Get the concession bonus for Heart Strike based on NPC category.
 *
 * Uses base concession bonus from NEGOTIATION config (heart_strike_concession_bonus = 0.30),
 * scaled by type-specific ratios from ABILITY config:
 * - DESPERATE: base * (desperate / default) → more susceptible (e.g., 0.30 * 1.2 = 0.36)
 * - HARD: base * (hard / default) → resistant (e.g., 0.30 * 0.6 = 0.18)
 * - DEFAULT: base * 1.0 → standard (e.g., 0.30)
 */
function getHeartStrikeBaseBonus(npcCategory: 'DESPERATE' | 'HARD' | 'DEFAULT'): number {
  const baseConcession = GAME_CONFIG.NEGOTIATION.HEART_STRIKE_CONCESSION_BONUS;
  const defaultFloor = GAME_CONFIG.ABILITY.HEART_STRIKE_DEFAULT;
  // Avoid division by zero
  if (defaultFloor <= 0) return baseConcession;

  switch (npcCategory) {
    case 'DESPERATE': return baseConcession * (GAME_CONFIG.ABILITY.HEART_STRIKE_DESPERATE / defaultFloor);
    case 'HARD': return baseConcession * (GAME_CONFIG.ABILITY.HEART_STRIKE_HARD / defaultFloor);
    case 'DEFAULT': return baseConcession;
  }
}

/**
 * Calculate the Heart Strike (攻心) effect.
 *
 * Design: Heart Strike grants a concession chance bonus that varies by NPC type.
 * This is NOT a floor reduction — it boosts the probability that NPC
 * concedes during push-pull negotiation.
 *
 * NPC differentiation (design doc v1.4 sec 4.2):
 * - DESPERATE/NAIVE: +12% (vulnerable, more susceptible)
 * - STUBBORN/SAVVY/SUSPICIOUS: +6% (tough, harder to influence)
 * - SENTIMENTAL/default: +10% (standard effectiveness)
 *
 * All values are further scaled by reputation modulation.
 * Patience cost: 0 (unique to heart strike)
 *
 * @param reputation Current reputation profile
 * @param behaviorTags NPC behavior tags for type differentiation
 */
export function calculateHeartStrikeEffect(
  reputation: ReputationProfile,
  behaviorTags: BehaviorTag[] = [],
): HeartStrikeResult {
  const modCoeff = getSkillModifier('HEART_STRIKE', reputation);
  const npcCategory = getHeartStrikeNpcCategory(behaviorTags);
  const baseBonus = getHeartStrikeBaseBonus(npcCategory);

  return {
    concessionBonus: baseBonus * modCoeff,
    patienceCost: 0,
    modulationCoefficient: modCoeff,
    npcCategory,
  };
}

/**
 * @deprecated Legacy floor reduction interface for Heart Strike.
 * Kept for backward compatibility with existing component calls.
 * Returns zero floor reduction; the actual effect is now concession chance bonus.
 */
export function calculateHeartStrikeFloorEffect(
  originalFloor: number,
  currentFloor: number,
  reputation: ReputationProfile,
  behaviorTags: BehaviorTag[],
  afterConcession: boolean,
  existingReduction: number
): FloorReductionResult {
  return {
    rawReduction: 0,
    effectiveReduction: 0,
    newFloor: currentFloor,
    patienceCost: 0,
    cappedByGlobalLimit: false,
    modulationCoefficient: getSkillModifier('HEART_STRIKE', reputation),
    timingBonusApplied: false,
  };
}

/**
 * Calculate the floor reduction from Sharp Scrutiny (明察秋毫).
 *
 * Passive: each FLAW trait discovered automatically reduces floor by 3%.
 */
export function calculateSharpScrutinyEffect(
  originalFloor: number,
  currentFloor: number,
  reputation: ReputationProfile,
  flawCount: number,
  existingReduction: number
): FloorReductionResult {
  const modCoeff = getSkillModifier('SHARP_SCRUTINY', reputation);
  const rawReduction = SHARP_SCRUTINY_PER_FLAW * flawCount * modCoeff;

  const totalWithNew = existingReduction + rawReduction;
  const cappedTotal = Math.min(totalWithNew, GLOBAL_FLOOR_REDUCTION_CAP);
  const effectiveReduction = cappedTotal - existingReduction;
  const cappedByGlobalLimit = totalWithNew > GLOBAL_FLOOR_REDUCTION_CAP;

  const reductionAmount = Math.floor(originalFloor * effectiveReduction);
  const newFloor = Math.max(currentFloor - reductionAmount, 0);

  return {
    rawReduction,
    effectiveReduction,
    newFloor,
    patienceCost: 0,
    cappedByGlobalLimit,
    modulationCoefficient: modCoeff,
    timingBonusApplied: false,
  };
}

/**
 * Check if the global floor reduction cap has been reached.
 * Shows qualitative hint to player.
 */
export function isFloorCapReached(existingReduction: number): boolean {
  return existingReduction >= GLOBAL_FLOOR_REDUCTION_CAP - 0.001;
}

// ============================================================================
// Foresight (洞若观火)
// ============================================================================

/**
 * Generate foresight result based on NPC redemption resolve.
 *
 * Only triggers for HIGH or LOW redemption intent.
 * MEDIUM/NONE produces no signal (design: "没有触发本身即是信息").
 *
 * @param redemptionResolve NPC's redemption resolve level
 * @param itemRealValue Item's real value (for flow value estimate)
 */
export function generateForesightResult(
  redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None',
  itemRealValue: number
): ForesightResult {
  switch (redemptionResolve) {
    case 'Strong':
      return {
        signal: 'HIGH',
        narrativeText: '他的眼神里有坚定——他一定会回来的。',
      };

    case 'Weak':
    case 'None': {
      // Estimate flow value range: +-15% of real value
      const low = Math.floor(itemRealValue * 0.85);
      const high = Math.floor(itemRealValue * 1.15);
      return {
        signal: 'LOW',
        narrativeText: '直觉告诉你......这可能是最后一面。',
        flowValueRange: [low, high],
      };
    }

    case 'Medium':
    default:
      return {
        signal: 'NONE',
        narrativeText: '',
      };
  }
}

// ============================================================================
// See Consequence (因果自见)
// ============================================================================

/**
 * @deprecated v0.2: "决策前命运预兆" has been removed.
 * The original design was based on hovering over discrete contract tiers,
 * which no longer exist with the continuous interest rate card system.
 * Returns all-NONE hints for backward compatibility.
 * v0.3 will implement card-boundary foresight (边界预兆) instead.
 *
 * @param npcHope Current NPC hope value
 * @param isDesperateTag Whether NPC has DESPERATE tag
 */
export function generateContractTierHints(
  _npcHope: number | undefined,
  _isDesperateTag: boolean
): ContractTierHint[] {
  // v0.2: all hints are NONE (feature disabled)
  return [
    { tier: 'CHARITY', hintColor: 'NONE' },
    { tier: 'AID', hintColor: 'NONE' },
    { tier: 'STANDARD', hintColor: 'NONE' },
    { tier: 'ELEVATED', hintColor: 'NONE' },
    { tier: 'HIGH', hintColor: 'NONE' },
    { tier: 'SHARK', hintColor: 'NONE' },
  ];
}

/**
 * Generate a consequence flash after a transaction.
 *
 * @param hopeChange How much the NPC's hope changed from this transaction
 * @param fatigue Current fatigue state
 */
export function generateConsequenceFlash(
  hopeChange: number,
  fatigue: ForesightFatigue
): ConsequenceFlashResult {
  // Check fatigue suppression
  if (fatigue.fatigued && Math.abs(hopeChange) < FORESIGHT_FATIGUE_HOPE_THRESHOLD) {
    return {
      direction: 'NEUTRAL',
      narrativeText: '',
      suppressed: true,
    };
  }

  if (hopeChange > 5) {
    return {
      direction: 'POSITIVE',
      narrativeText: '你看到她笑了——也许事情会好起来。',
      suppressed: false,
    };
  } else if (hopeChange < -5) {
    return {
      direction: 'NEGATIVE',
      narrativeText: '你看到一个阴暗的画面......有什么不好的事情正在酿造。',
      suppressed: false,
    };
  }

  return {
    direction: 'NEUTRAL',
    narrativeText: '一切如常。这笔交易没有改变什么。',
    suppressed: false,
  };
}

/**
 * Update foresight fatigue after a flash.
 */
export function updateForesightFatigue(fatigue: ForesightFatigue): ForesightFatigue {
  const newTotal = fatigue.totalFlashes + 1;
  return {
    totalFlashes: newTotal,
    fatigued: newTotal >= FORESIGHT_FATIGUE_THRESHOLD,
  };
}

// ============================================================================
// Comfort (抚慰)
// ============================================================================

/**
 * Check if comfort can be used on an NPC.
 *
 * Trigger conditions:
 * - NPC has active event chain
 * - NPC hope <= 30 OR has DESPERATE behavior tag
 */
export function canUseComfort(
  hasActiveChain: boolean,
  npcHope: number | undefined,
  behaviorTags: BehaviorTag[]
): boolean {
  if (!hasActiveChain) return false;
  if (behaviorTags.includes('DESPERATE')) return true;
  if (npcHope !== undefined && npcHope <= 30) return true;
  return false;
}

/**
 * Calculate comfort effect.
 * Hope +5, Humanity +1 (base, before modulation).
 */
export function calculateComfortEffect(
  reputation: ReputationProfile
): ComfortResult {
  const modCoeff = getSkillModifier('COMFORT', reputation);
  const hopeChange = Math.round(5 * modCoeff);
  const humanityChange = 1;

  return {
    available: true,
    hopeChange,
    humanityChange,
    narrativeText: '你说了一句安慰的话。也许什么都改变不了，但至少不是沉默。',
  };
}

// ============================================================================
// Extra Care (额外关照 - 惜物如人)
// ============================================================================

/**
 * Check if extra care can be used.
 * Requires current transaction to be charity (0%) or aid (<=4%) tier.
 * Design doc v1.5 section 4.5: trigger condition is rate <= 4%.
 */
export function canUseExtraCare(
  interestRate: number
): boolean {
  // InterestRate is a decimal fraction (0, 0.04 = 4%)
  // Extra care only available for charity (0%) and aid (1%-4%) tiers
  return interestRate <= 0.04;
}

/**
 * Calculate extra care effect.
 * Hope +3, Humanity +1, item gets goodwill tag.
 */
export function calculateExtraCareEffect(
  reputation: ReputationProfile
): ExtraCareResult {
  const modCoeff = getSkillModifier('CHERISH_ALL', reputation);
  const hopeChange = Math.round(3 * modCoeff);

  return {
    available: true,
    hopeChange,
    humanityChange: 1,
    goodwillTagApplied: true,
    narrativeText: '你仔细地包裹好物品，附上一张保管说明。客人的眼中闪过一丝感激。',
  };
}

// ============================================================================
// Word of Mouth (口口相传)
// ============================================================================

/**
 * Schedule a word-of-mouth check after using extra care.
 * Check happens 3-5 days later.
 */
export function scheduleWordOfMouthCheck(
  currentDay: number,
  tracker: WordOfMouthTracker
): WordOfMouthTracker {
  const delay = 3 + Math.floor(Math.random() * 3); // 3-5 days
  return {
    ...tracker,
    pendingChecks: [
      ...tracker.pendingChecks,
      { checkDay: currentDay + delay, sourceDay: currentDay },
    ],
  };
}

/**
 * Process word-of-mouth checks for today.
 *
 * Pseudo-random: base 25%, +15% per consecutive fail, guaranteed at 6th.
 * Returns whether a referral customer should appear.
 */
export function processWordOfMouthChecks(
  currentDay: number,
  tracker: WordOfMouthTracker
): { triggered: boolean; updatedTracker: WordOfMouthTracker } {
  const todayChecks = tracker.pendingChecks.filter(c => c.checkDay === currentDay);
  const remainingChecks = tracker.pendingChecks.filter(c => c.checkDay !== currentDay);

  if (todayChecks.length === 0) {
    return { triggered: false, updatedTracker: { ...tracker, pendingChecks: remainingChecks } };
  }

  // Process first check (one per day to avoid flood)
  let { failStreak } = tracker;

  // Calculate chance: 25% + 15% per fail, guaranteed at streak 5 (6th check)
  const chance = failStreak >= WOM_GUARANTEE_STREAK
    ? 1.0
    : Math.min(WOM_BASE_CHANCE + WOM_INCREMENT * failStreak, 1.0);

  const roll = Math.random();
  const triggered = roll < chance;

  const updatedTracker: WordOfMouthTracker = {
    failStreak: triggered ? 0 : failStreak + 1,
    pendingChecks: triggered
      ? remainingChecks // Remove remaining checks on trigger? No, keep them
      : remainingChecks.concat(todayChecks.slice(1)), // Keep unprocessed checks
  };

  return { triggered, updatedTracker };
}

// ============================================================================
// Poker Face (不动声色)
// ============================================================================

/**
 * Check if FLAW discovery should suppress patience cost.
 * When Poker Face is unlocked, discovering flaws doesn't cost patience.
 */
export function shouldSuppressFlawPatienceCost(abilityState: AbilityState): boolean {
  return isSkillUnlocked('POKER_FACE', abilityState);
}

// ============================================================================
// Sense Hidden (察隐)
// ============================================================================

/**
 * Check if item has hidden traits (for pre-appraisal hint).
 * When unlocked, shows a subtle glow on items with hidden traits.
 *
 * @param hasHiddenTraits Whether the item has any unrevealed traits
 */
export function getSenseHiddenHint(hasHiddenTraits: boolean): 'HAS_HIDDEN' | 'NO_HIDDEN' {
  return hasHiddenTraits ? 'HAS_HIDDEN' : 'NO_HIDDEN';
}

// ============================================================================
// Pierce Illusion (破妄)
// ============================================================================

/**
 * Check if first appraisal should auto-reveal fake or guarantee a trait.
 *
 * @param isFake Whether the item is a fake
 * @returns 'REVEAL_FAKE' | 'GUARANTEE_TRAIT' | null
 */
export function getPierceIllusionEffect(
  isFake: boolean
): 'REVEAL_FAKE' | 'GUARANTEE_TRAIT' {
  return isFake ? 'REVEAL_FAKE' : 'GUARANTEE_TRAIT';
}

// ============================================================================
// Empathy (共情)
// ============================================================================

/**
 * Check if empathy bonus layer applies.
 * When unlocked, insight reveals one additional layer per AP.
 */
export function hasEmpathyBonus(abilityState: AbilityState): boolean {
  return isSkillUnlocked('EMPATHY', abilityState);
}
