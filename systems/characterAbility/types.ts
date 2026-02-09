/**
 * Character Ability System - Core Types
 *
 * 12 skills across 3 pure paths + 3 fusion paths.
 * Essence types align with reputation axes via modulation.
 *
 * Design doc: Designer/系统设计文档/人物能力升级系统 (Character Ability System).md
 */

import { EssenceCost } from '../economy/essence';

// ============================================================================
// Path & Tier
// ============================================================================

/** Three pure essence paths (精魄系) */
export type AbilityPath = 'CRAFT' | 'TIME' | 'VIBE';

/** Three fusion paths (融合路线) */
export type FusionPath = 'TIME_CRAFT' | 'CRAFT_VIBE' | 'TIME_VIBE';

/** Skill tier within a path */
export type AbilityTier = 'T1' | 'T2';

// ============================================================================
// Skill IDs
// ============================================================================

/**
 * All 12 skill IDs.
 *
 * Pure paths (6):
 *   CRAFT: SENSE_HIDDEN (察隐), PIERCE_ILLUSION (破妄)
 *   TIME:  APPLY_PRESSURE (施压), HEART_STRIKE (攻心)
 *   VIBE:  EMPATHY (共情), COMFORT (抚慰)
 *
 * Fusion paths (6):
 *   TIME+CRAFT: SHARP_SCRUTINY (明察秋毫), POKER_FACE (不动声色)
 *   CRAFT+VIBE: CHERISH_ALL (惜物如人), WORD_OF_MOUTH (口口相传)
 *   TIME+VIBE:  FORESIGHT (洞若观火), SEE_CONSEQUENCE (因果自见)
 */
export type SkillId =
  // Craft pure
  | 'SENSE_HIDDEN'
  | 'PIERCE_ILLUSION'
  // Time pure
  | 'APPLY_PRESSURE'
  | 'HEART_STRIKE'
  // Vibe pure
  | 'EMPATHY'
  | 'COMFORT'
  // Time+Craft fusion (dark path)
  | 'SHARP_SCRUTINY'
  | 'POKER_FACE'
  // Craft+Vibe fusion (bright path)
  | 'CHERISH_ALL'
  | 'WORD_OF_MOUTH'
  // Time+Vibe fusion (wisdom path)
  | 'FORESIGHT'
  | 'SEE_CONSEQUENCE';

// ============================================================================
// Skill Effect Types
// ============================================================================

/** Skill activation mode */
export type SkillActivation = 'PASSIVE' | 'ACTIVE';

/** Which game phase the active skill is used in */
export type SkillPhase = 'APPRAISAL' | 'NEGOTIATION' | 'DEPARTURE' | 'NIGHT';

// ============================================================================
// Skill Definition
// ============================================================================

/** Static definition of a skill (immutable configuration) */
export interface AbilitySkillDef {
  id: SkillId;
  name: string;           // Chinese display name
  englishName: string;     // English reference name
  description: string;     // Flavor text
  path: AbilityPath | FusionPath;
  tier: AbilityTier;
  essenceCost: EssenceCost;
  energyCost: number;      // Night energy cost (always 1)
  activation: SkillActivation;
  phase?: SkillPhase;      // Where active skills are used
  apCost?: number;         // AP cost for active skills (0 = free)
  prerequisites: SkillId[];
  // Monologue shown when skill is learned
  learnMonologue: string;
}

// ============================================================================
// Ability State (persisted in GameState)
// ============================================================================

/** Per-skill runtime state */
export interface SkillRuntimeState {
  /** Skill has been unlocked/learned */
  unlocked: boolean;
  /** Number of times this skill has been used (for mastery tracking) */
  useCount: number;
}

/** Word of Mouth pseudo-random tracking */
export interface WordOfMouthTracker {
  /** Number of consecutive non-trigger rolls since last trigger */
  failStreak: number;
  /** Pending referral checks: [dayToCheck, essenceGainDay][] */
  pendingChecks: Array<{ checkDay: number; sourceDay: number }>;
}

/** Moral echo event queued for delayed delivery */
export interface MoralEchoEvent {
  /** Which skill/action triggered this */
  source: 'APPLY_PRESSURE' | 'HEART_STRIKE' | 'SHARK_DEAL' | 'STOLEN_GOODS' | 'BLACKMARKET_SELL';
  /** Severity level (affects narrative intensity) */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Day the echo should manifest */
  deliveryDay: number;
  /** The echo channel */
  channel: 'MONOLOGUE' | 'NEWS' | 'MAIL' | 'NPC_REACTION';
  /** Optional: target NPC behavior tag for context */
  targetTag?: string;
}

/** Foresight (因果自见) fatigue tracking */
export interface ForesightFatigue {
  /** Total number of consequence flashes triggered */
  totalFlashes: number;
  /** Whether fatigue mode is active (after 10 flashes) */
  fatigued: boolean;
}

/** Complete ability system state */
export interface AbilityState {
  /** Per-skill state keyed by SkillId */
  skills: Record<SkillId, SkillRuntimeState>;
  /** Queued moral echo events */
  moralEchoQueue: MoralEchoEvent[];
  /** Word of mouth pseudo-random tracker */
  wordOfMouth: WordOfMouthTracker;
  /** Foresight fatigue tracker */
  foresightFatigue: ForesightFatigue;
  /** Tracks which skills have been used this negotiation (for per-negotiation limits) */
  skillsUsedThisNegotiation: SkillId[];
  /** Whether "extra care" was used this departure */
  extraCareUsedThisDeparture: boolean;
  /** Total epiphanies achieved (for gewu level calculation) */
  totalEpiphanies: number;
  /** Current gewu level (1-3), determines extraction rates and energy cap */
  gewuLevel: number;
}

// ============================================================================
// Panel Data (for UI consumption)
// ============================================================================

/** Data for the skill tree panel display */
export interface AbilityPanelData {
  skills: Array<{
    def: AbilitySkillDef;
    state: SkillRuntimeState;
    canUnlock: boolean;
    meetsPrerequisites: boolean;
    hasEnoughEssence: boolean;
    hasEnoughEnergy: boolean;
  }>;
  essenceBalance: { craft: number; time: number; vibe: number };
  currentEnergy: number;
}

// ============================================================================
// Skill Effect Results (returned by skill engine)
// ============================================================================

/** Result of applying pressure or heart strike */
export interface FloorReductionResult {
  /** Percentage of floor reduction (before cap) */
  rawReduction: number;
  /** Actual reduction applied (after cap and modulation) */
  effectiveReduction: number;
  /** New floor amount */
  newFloor: number;
  /** Patience cost (施压: 1, 攻心: 0) */
  patienceCost: number;
  /** Whether the 20% global cap was hit */
  cappedByGlobalLimit: boolean;
  /** Modulation coefficient applied */
  modulationCoefficient: number;
  /** Timing bonus applied */
  timingBonusApplied: boolean;
}

/** Result of foresight (洞若观火) check */
export interface ForesightResult {
  /** Redemption intent signal */
  signal: 'HIGH' | 'LOW' | 'NONE';
  /** Narrative text to display */
  narrativeText: string;
  /** Flow value range (only shown when signal is LOW) */
  flowValueRange?: [number, number];
}

/** Result of consequence flash (因果自见) */
export interface ConsequenceFlashResult {
  /** Direction of impact */
  direction: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  /** Flash narrative text */
  narrativeText: string;
  /** Whether this flash was suppressed by fatigue */
  suppressed: boolean;
}

/** Contract tier color hint for 因果自见 hover preview */
export interface ContractTierHint {
  tier: 'CHARITY' | 'AID' | 'STANDARD' | 'SHARK';
  hintColor: 'GOLD' | 'NONE' | 'DARK_RED';
}

/** Comfort (抚慰) result */
export interface ComfortResult {
  /** Whether comfort was available */
  available: boolean;
  /** Hope change applied */
  hopeChange: number;
  /** Humanity reputation change */
  humanityChange: number;
  /** Narrative text */
  narrativeText: string;
}

/** Extra care (额外关照) result */
export interface ExtraCareResult {
  /** Whether extra care was available */
  available: boolean;
  /** Hope change */
  hopeChange: number;
  /** Humanity reputation change */
  humanityChange: number;
  /** Item marked with goodwill tag */
  goodwillTagApplied: boolean;
  /** Narrative text */
  narrativeText: string;
}

/** Essence gain from a transaction (moral alignment bonus) */
export interface TransactionEssenceGain {
  craft: number;
  time: number;
  vibe: number;
  /** Description of why this essence was gained */
  reason: string;
}
