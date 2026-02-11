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
  calculateTagStackMultiplier,
  convertEssence,
  rollQualityOutcome,
  getQualityDisplayName,
  isMultiNightRecipe,
  getInProgressRecipe,
  hasInProgressRecipe,
} from './workshopLogic';
