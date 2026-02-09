/**
 * Character Ability System (人物能力升级系统)
 *
 * 12 skills across 3 pure paths (Craft/Time/Vibe) and 3 fusion paths.
 * Skills are quality-change breakthroughs, not percentage tweaks.
 * Reputation modulates skill effectiveness.
 *
 * Design doc: Designer/系统设计文档/人物能力升级系统 (Character Ability System).md
 */

// === Types ===
export type {
  AbilityPath,
  FusionPath,
  AbilityTier,
  SkillId,
  SkillActivation,
  SkillPhase,
  AbilitySkillDef,
  SkillRuntimeState,
  WordOfMouthTracker,
  MoralEchoEvent,
  ForesightFatigue,
  AbilityState,
  AbilityPanelData,
  FloorReductionResult,
  ForesightResult,
  ConsequenceFlashResult,
  ContractTierHint,
  ComfortResult,
  ExtraCareResult,
  TransactionEssenceGain,
} from './types';

// === Skill Definitions ===
export {
  SKILL_DEFINITIONS,
  ALL_SKILL_IDS,
  PURE_CRAFT_SKILLS,
  PURE_TIME_SKILLS,
  PURE_VIBE_SKILLS,
  DARK_PATH_SKILLS,
  BRIGHT_PATH_SKILLS,
  WISDOM_PATH_SKILLS,
  FUSION_SKILLS,
  getSkillDef,
} from './skillDefinitions';

// === Ability Engine ===
export {
  createInitialAbilityState,
  canUnlockSkill,
  isSkillUnlocked,
  canUseSkillInNegotiation,
  calculatePressureEffect,
  calculateHeartStrikeEffect,
  calculateSharpScrutinyEffect,
  isFloorCapReached,
  generateForesightResult,
  generateContractTierHints,
  generateConsequenceFlash,
  updateForesightFatigue,
  canUseComfort,
  calculateComfortEffect,
  canUseExtraCare,
  calculateExtraCareEffect,
  scheduleWordOfMouthCheck,
  processWordOfMouthChecks,
  shouldSuppressFlawPatienceCost,
  getSenseHiddenHint,
  getPierceIllusionEffect,
  hasEmpathyBonus,
} from './abilityEngine';

// === Modulation ===
export {
  getPathModifier,
  getFusionModifier,
  getSkillModifier,
  modulateEffect,
  getReactionIntensity,
} from './modulation';
export type { ReactionIntensity } from './modulation';

// === Essence Gain ===
export {
  getContractTier,
  calculateTransactionEssenceGain,
  calculateStolenGoodsEssenceGain,
  aggregateEssenceGains,
} from './essenceSystem';
export type { ContractTier } from './essenceSystem';

// === Moral Echo ===
export {
  createPressureEcho,
  createHeartStrikeEchoes,
  createSharkDealEchoes,
  createStolenGoodsEchoes,
  createBlackmarketSellEcho,
  getEchoesForDay,
  removeDeliveredEchoes,
  enqueueEchoes,
} from './moralEcho';

// === Moral Echo Texts ===
export { getEchoText } from './moralEchoTexts';
export type { EchoText } from './moralEchoTexts';

// === Panel Data ===
export { generatePanelData } from './panelData';
