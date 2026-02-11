/**
 * 工作台系统导出 (Workshop System Exports)
 */

// 类型导出
export type {
  RecipeType,
  RecipeBase,
  RestoreRecipe,
  CounterfeitRecipe,
  ReforgeRecipe,
  Recipe,
  ReforgeQuality,
  QualityOutcome,
  SurpriseDiscovery,
  ForgeryNotorietyStage,
  ForgeryNotorietyState,
  ReturnResult,
  InProgressRecipe,
  WorkshopResult,
  WorkshopBlockReason,
  RecipeStatus,
  WorkshopNarrative,
  ViolationWarning,
} from './types';

export {
  isRestoreRecipe,
  isCounterfeitRecipe,
  isReforgeRecipe,
} from './types';

// 配方导出
export {
  RESTORE_RECIPES,
  COUNTERFEIT_RECIPES,
  REFORGE_RECIPES,
  ALL_RECIPES,
  getRecipeById,
} from './recipes';

// 逻辑函数导出
export type { RouteConfirmation } from './workshopLogic';
export {
  getRecipeStatus,
  calculateActualCost,
  performRestore,
  performCounterfeit,
  performReforge,
  performWorkshop,
  getBlockReasonText,
  getViolationWarning,
  getCounterfeitViolationWarning,
  getRouteConfirmation,
  calculateTagStackMultiplier,
  convertEssence,
  rollQualityOutcome,
  getQualityDisplayName,
  isMultiNightRecipe,
  getInProgressRecipe,
  hasInProgressRecipe,
} from './workshopLogic';

// 伪造声名导出
export {
  INITIAL_FORGERY_NOTORIETY,
  getNotorietyStage,
  getDetectionRate,
  getGazeConfig,
  advanceNotoriety,
  getNotorietyStageConfig,
} from './forgeryNotoriety';

// 情感权重系统导出
export type { EmotionalWeight, EmotionalWeightResult } from './emotionalWeight';
export {
  calculateEmotionalWeight,
  getEmotionalWeightFromScore,
} from './emotionalWeight';

// 感知层级系统导出
export type { PerceptionTier, NarrativePerceptionTier } from './perceptionTier';
export {
  calculatePerceptionTier,
  getNarrativeTier,
} from './perceptionTier';

// 归还概率矩阵导出
export type { CustomerPersonality } from './returnMatrix';
export {
  inferPersonality,
  rollReturnResult,
  getReturnReputationDelta,
  getReturnProbabilities,
} from './returnMatrix';

// 隐形训练系统导出
export type { ScaffoldingPhase } from './invisibleTraining';
export {
  getScaffoldingPhase,
  shouldShowScaffolding,
} from './invisibleTraining';
