/**
 * 工作台系统导出 (Workshop System Exports)
 */

// 类型导出
export type {
  RecipeType,
  RecipeBase,
  RestoreRecipe,
  ReforgeRecipe,
  Recipe,
  WorkshopResult,
  WorkshopBlockReason,
  RecipeStatus,
  WorkshopNarrative,
} from './types';

export {
  isRestoreRecipe,
  isReforgeRecipe,
} from './types';

// 配方导出
export {
  RESTORE_RECIPES,
  REFORGE_RECIPES,
  ALL_RECIPES,
  getRecipeById,
  getRestoreRecipes,
  getReforgeRecipes,
  getRestoreRecipeForTag,
  getReforgeRecipeForResult,
} from './recipes';

// 逻辑函数导出
export {
  getRecipeStatus,
  calculateActualCost,
  performRestore,
  performReforge,
  performWorkshop,
  getBlockReasonText,
  getAvailableRestoreRecipes,
  getAvailableReforgeRecipes,
} from './workshopLogic';
