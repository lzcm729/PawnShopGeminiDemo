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
  REFORGE_RECIPES,
  ALL_RECIPES,
  getRecipeById,
} from './recipes';

// 逻辑函数导出
export {
  getRecipeStatus,
  calculateActualCost,
  performRestore,
  performReforge,
  performWorkshop,
  getBlockReasonText,
  getViolationWarning,
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
