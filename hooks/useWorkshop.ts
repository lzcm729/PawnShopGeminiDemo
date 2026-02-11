/**
 * 工作台系统 Hook (Workshop System Hook)
 *
 * 提供工作台操作的 React 接口：
 * - 获取可操作的物品和配方
 * - 执行修复/伪造/重铸操作
 * - 精魄转换
 * - 获取操作状态
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { Item, ItemStatus } from '../systems/items/types';
import { ReputationType } from '../types';
import { STATE_TAGS } from '../systems/items/tags';
import { EssenceBalance, EssenceType } from '../systems/economy/essence';
import { GAME_CONFIG } from '../systems/game/config';
import {
  Recipe,
  RestoreRecipe,
  CounterfeitRecipe,
  ReforgeRecipe,
  RecipeStatus,
  WorkshopResult,
  InProgressRecipe,
  ViolationWarning,
  isRestoreRecipe,
  isCounterfeitRecipe,
  isReforgeRecipe,
  getRecipeStatus,
  performWorkshop,
  getBlockReasonText,
  getViolationWarning,
  getCounterfeitViolationWarning,
  convertEssence,
  isMultiNightRecipe,
  getInProgressRecipe,
  calculatePerceptionTier,
  RESTORE_RECIPES,
  COUNTERFEIT_RECIPES,
  REFORGE_RECIPES,
  getRecipeById,
} from '../systems/workshop';

// ============================================================================
// Hook 返回类型
// ============================================================================

interface RecipeWithStatus<T> {
  recipe: T;
  status: RecipeStatus;
}

interface WorkshopableItem {
  item: Item;
  /** 该物品唯一的修复配方（由物品的负面标签决定） */
  restoreRecipe: RecipeWithStatus<RestoreRecipe> | null;
  /** 该物品所有可用的修复配方（用于显示可修复数量） */
  allRestoreRecipes: RecipeWithStatus<RestoreRecipe>[];
  /** 该物品唯一的伪造配方（由物品属性决定） */
  counterfeitRecipe: RecipeWithStatus<CounterfeitRecipe> | null;
  /** 该物品唯一的重铸配方（由物品属性决定） */
  reforgeRecipe: RecipeWithStatus<ReforgeRecipe> | null;
  hasAnyOption: boolean;
  /** 可用的修复操作数量 */
  restoreCount: number;
}

interface UseWorkshopReturn {
  /** 可操作的物品列表 */
  workshopableItems: WorkshopableItem[];

  /** 当前精魄余额 */
  essenceBalance: EssenceBalance;

  /** 当前精力 */
  currentEnergy: number;

  /** 精力上限 */
  maxEnergy: number;

  /** 进行中的多夜工序 */
  inProgressRecipes: InProgressRecipe[];

  /** 执行修复 */
  doRestore: (itemId: string, recipeId: string) => WorkshopOperationResult | null;

  /** 执行伪造 */
  doCounterfeit: (itemId: string, recipeId: string) => WorkshopOperationResult | null;

  /** 执行重铸 */
  doReforge: (itemId: string, recipeId: string) => WorkshopOperationResult | null;

  /** 转换精魄 (3:1) */
  doConvertEssence: (from: EssenceType, to: EssenceType, amount: number) => boolean;

  /** 推进多夜工序（夜间处理时调用） */
  advanceInProgressRecipe: (itemId: string) => WorkshopOperationResult | null;

  /** 获取配方的状态 */
  getStatus: (recipe: Recipe, item: Item) => RecipeStatus;

  /** 获取阻止原因的显示文本 */
  getReasonText: (reason: string) => string;

  /** 获取重铸不确定性提示（当期物品） */
  getWarning: (item: Item) => ViolationWarning | null;

  /** 获取伪造违约风险预警（当期物品） */
  getCounterfeitWarning: (item: Item) => ViolationWarning | null;
}

interface WorkshopOperationResult {
  success: boolean;
  result?: WorkshopResult;
  errorReason?: string;
}

// ============================================================================
// 配方匹配逻辑
// ============================================================================

/**
 * 检查修复配方是否匹配物品
 */
function doesRestoreRecipeMatch(recipe: RestoreRecipe, item: Item): boolean {
  const tags = item.tags || [];

  // 全面翻新：只要物品有任何负面标签就匹配
  if (recipe.targetAll) {
    return STATE_TAGS.some(tag => tags.includes(tag));
  }

  // 单目标：检查物品是否有目标负面标签
  if (recipe.targetTag && !tags.includes(recipe.targetTag)) {
    return false;
  }

  // 检查前置标签（如艺术修复需要 ARTISTIC）
  if (recipe.requiredTags && recipe.requiredTags.length > 0) {
    if (!recipe.requiredTags.every(tag => tags.includes(tag))) {
      return false;
    }
  }

  return true;
}

/**
 * 根据物品属性确定最佳修复配方
 */
function getRestoreRecipeForItem(item: Item): RestoreRecipe | null {
  const tags = item.tags || [];
  const hasArtistic = tags.includes('ARTISTIC');

  for (const recipe of RESTORE_RECIPES) {
    if (recipe.targetAll) continue;
    if (!doesRestoreRecipeMatch(recipe, item)) continue;
    if (recipe.targetTag === 'BROKEN' && recipe.requiredTags?.includes('ARTISTIC')) {
      if (hasArtistic) return recipe;
      continue;
    }
    if (recipe.targetTag === 'BROKEN' && !recipe.requiredTags) {
      if (hasArtistic) continue;
    }
    return recipe;
  }

  return null;
}

/**
 * 获取物品所有可用的修复配方
 */
function getAllRestoreRecipesForItem(item: Item): RestoreRecipe[] {
  return RESTORE_RECIPES.filter(recipe => doesRestoreRecipeMatch(recipe, item));
}

/**
 * 根据物品属性确定唯一的伪造配方
 */
function getCounterfeitRecipeForItem(item: Item): CounterfeitRecipe | null {
  const tags = item.tags || [];

  for (const recipe of COUNTERFEIT_RECIPES) {
    // 检查类别
    if (recipe.requiredCategories && recipe.requiredCategories.length > 0) {
      if (!recipe.requiredCategories.includes(item.category)) {
        continue;
      }
    }

    // 检查排除标签
    if (recipe.excludedTags && recipe.excludedTags.length > 0) {
      if (recipe.excludedTags.some(tag => tags.includes(tag as any))) {
        continue;
      }
    }

    return recipe;
  }

  return null;
}

/**
 * 根据物品属性确定唯一的重铸配方
 */
function getReforgeRecipeForItem(item: Item): ReforgeRecipe | null {
  const tags = item.tags || [];

  for (const recipe of REFORGE_RECIPES) {
    if (recipe.requiredTags && recipe.requiredTags.length > 0) {
      if (!recipe.requiredTags.every(tag => tags.includes(tag))) {
        continue;
      }
    }
    if (recipe.requiredCategories && recipe.requiredCategories.length > 0) {
      if (!recipe.requiredCategories.includes(item.category)) {
        continue;
      }
    }
    if (recipe.excludedTags && recipe.excludedTags.length > 0) {
      if (recipe.excludedTags.some(tag => tags.includes(tag))) {
        continue;
      }
    }
    return recipe;
  }

  return null;
}

// ============================================================================
// Hook 实现
// ============================================================================

export const useWorkshop = (): UseWorkshopReturn => {
  const { state, dispatch } = useGame();
  const { inventory, nightState, essenceBalance, inProgressRecipes } = state;

  // 获取可操作的物品列表
  const workshopableItems = useMemo((): WorkshopableItem[] => {
    const eligibleItems = inventory.filter(
      item => item.status === ItemStatus.ACTIVE || item.status === ItemStatus.FORFEIT
    );

    return eligibleItems.map(item => {
      // 修复配方
      const allRestoreMatches = getAllRestoreRecipesForItem(item);
      const allRestoreRecipes = allRestoreMatches.map(recipe => ({
        recipe,
        status: getRecipeStatus(recipe, item, essenceBalance, nightState),
      }));
      const restoreRecipeMatch = getRestoreRecipeForItem(item);
      const restoreRecipe = restoreRecipeMatch
        ? { recipe: restoreRecipeMatch, status: getRecipeStatus(restoreRecipeMatch, item, essenceBalance, nightState) }
        : null;

      // 伪造配方
      const counterfeitRecipeMatch = getCounterfeitRecipeForItem(item);
      const counterfeitRecipe = counterfeitRecipeMatch
        ? { recipe: counterfeitRecipeMatch, status: getRecipeStatus(counterfeitRecipeMatch, item, essenceBalance, nightState) }
        : null;

      // 重铸配方
      const reforgeRecipeMatch = getReforgeRecipeForItem(item);
      const reforgeRecipe = reforgeRecipeMatch
        ? { recipe: reforgeRecipeMatch, status: getRecipeStatus(reforgeRecipeMatch, item, essenceBalance, nightState) }
        : null;

      const hasAnyOption =
        (restoreRecipe?.status.canApply ?? false) ||
        (counterfeitRecipe?.status.canApply ?? false) ||
        (reforgeRecipe?.status.canApply ?? false);

      const restoreCount = allRestoreRecipes.length;

      return {
        item,
        restoreRecipe,
        allRestoreRecipes,
        counterfeitRecipe,
        reforgeRecipe,
        hasAnyOption,
        restoreCount,
      };
    });
  }, [inventory, nightState, essenceBalance]);

  const getStatus = useCallback(
    (recipe: Recipe, item: Item): RecipeStatus => {
      return getRecipeStatus(recipe, item, essenceBalance, nightState);
    },
    [essenceBalance, nightState]
  );

  const getReasonText = useCallback((reason: string): string => {
    return getBlockReasonText(reason as any);
  }, []);

  const getWarning = useCallback((item: Item): ViolationWarning | null => {
    return getViolationWarning(item);
  }, []);

  const getCounterfeitWarning = useCallback((item: Item): ViolationWarning | null => {
    return getCounterfeitViolationWarning(item);
  }, []);

  // 通用执行函数
  function executeWorkshop(
    itemId: string,
    recipeId: string,
    type: 'restore' | 'counterfeit' | 'reforge'
  ): WorkshopOperationResult | null {
    const item = inventory.find(i => i.id === itemId);
    if (!item) {
      return { success: false, errorReason: '物品不存在' };
    }

    // 检查是否为多夜配方
    const recipe = getRecipeById(recipeId);
    if (recipe && isMultiNightRecipe(recipe)) {
      const existing = getInProgressRecipe(itemId, inProgressRecipes);
      if (existing) {
        return { success: false, errorReason: '该物品已有进行中的工序' };
      }

      const status = getRecipeStatus(recipe, item, essenceBalance, nightState);
      if (!status.canApply) {
        return { success: false, errorReason: status.reason || '无法执行' };
      }

      dispatch({ type: 'CONSUME_NIGHT_ENERGY', payload: recipe.energyCost });
      dispatch({ type: 'SPEND_ESSENCE_BATCH', payload: status.actualCost });
      dispatch({
        type: 'START_MULTI_NIGHT_RECIPE',
        payload: {
          recipeId,
          itemId,
          nightsCompleted: 1,
          nightsRequired: recipe.nightsRequired!,
          essenceSpent: status.actualCost,
        },
      });
      dispatch({
        type: 'RECORD_NIGHT_ACTION',
        payload: `${type.toUpperCase()}_START:${item.id}:${recipeId}`,
      });

      return {
        success: true,
        result: {
          success: true,
          type: recipe.type,
          recipeId,
          essenceSpent: status.actualCost,
          energySpent: recipe.energyCost,
          narrative: {
            actionText: `开始${recipe.name}的第一夜工序...`,
            resultText: `工序进行中 (1/${recipe.nightsRequired})，明晚继续。`,
            gazeText: '今夜的工作只是开始，明晚还需继续。',
          },
        },
      };
    }

    // 单夜配方：直接执行
    const perceptionTier = calculatePerceptionTier(item);
    const output = performWorkshop(recipeId, item, essenceBalance, nightState, undefined, perceptionTier);
    if (!output) {
      return { success: false, errorReason: '操作失败' };
    }

    const { result, updatedItem } = output;

    dispatch({ type: 'CONSUME_NIGHT_ENERGY', payload: result.energySpent });
    dispatch({ type: 'SPEND_ESSENCE_BATCH', payload: result.essenceSpent });
    dispatch({
      type: 'UPDATE_ITEM_TAGS',
      payload: {
        itemId: item.id,
        tags: updatedItem.tags,
        wasRestored: updatedItem.wasRestored,
        wasForged: updatedItem.wasForged,
        wasReforged: updatedItem.wasReforged,
        workState: updatedItem.workState,
      },
    });
    dispatch({
      type: 'RECORD_NIGHT_ACTION',
      payload: `${type.toUpperCase()}:${item.id}:${recipeId}`,
    });

    // #45/#68: Counterfeit active pawn item -> immediate Innocence penalty
    if (type === 'counterfeit' && item.status === ItemStatus.ACTIVE) {
      const innocenceCost = GAME_CONFIG.WORKSHOP.FORGERY.INNOCENCE_COST_ACTIVE;
      dispatch({
        type: 'RESOLVE_TRANSACTION',
        payload: {
          cashDelta: 0,
          reputationDelta: { [ReputationType.INNOCENCE]: innocenceCost },
          item: null,
          log: `[工作台] 伪造当期物品 ${item.name}，清白 ${innocenceCost}`,
          customerName: 'System',
        },
      });
    }

    return { success: true, result };
  }

  const doRestore = useCallback(
    (itemId: string, recipeId: string): WorkshopOperationResult | null => {
      return executeWorkshop(itemId, recipeId, 'restore');
    },
    [inventory, nightState, essenceBalance, dispatch]
  );

  const doCounterfeit = useCallback(
    (itemId: string, recipeId: string): WorkshopOperationResult | null => {
      return executeWorkshop(itemId, recipeId, 'counterfeit');
    },
    [inventory, nightState, essenceBalance, dispatch]
  );

  const doReforge = useCallback(
    (itemId: string, recipeId: string): WorkshopOperationResult | null => {
      return executeWorkshop(itemId, recipeId, 'reforge');
    },
    [inventory, nightState, essenceBalance, dispatch]
  );

  const doConvertEssence = useCallback(
    (from: EssenceType, to: EssenceType, amount: number): boolean => {
      const result = convertEssence(from, to, amount, essenceBalance);
      if (!result.success) return false;
      dispatch({ type: 'CONVERT_ESSENCE', payload: { from, to, amount } });
      return true;
    },
    [essenceBalance, dispatch]
  );

  // 推进多夜工序
  const advanceInProgressRecipe = useCallback(
    (itemId: string): WorkshopOperationResult | null => {
      const progress = getInProgressRecipe(itemId, inProgressRecipes);
      if (!progress) {
        return { success: false, errorReason: '该物品没有进行中的工序' };
      }

      const item = inventory.find(i => i.id === itemId);
      if (!item) {
        return { success: false, errorReason: '物品不存在' };
      }

      const recipe = getRecipeById(progress.recipeId);
      if (!recipe) {
        return { success: false, errorReason: '配方不存在' };
      }

      if (nightState.energy < recipe.energyCost) {
        return { success: false, errorReason: '精力不足' };
      }

      const newNightsCompleted = progress.nightsCompleted + 1;
      const isComplete = newNightsCompleted >= progress.nightsRequired;

      dispatch({ type: 'CONSUME_NIGHT_ENERGY', payload: recipe.energyCost });

      if (isComplete) {
        const perceptionTier = calculatePerceptionTier(item);
        const output = performWorkshop(progress.recipeId, item, essenceBalance, nightState, undefined, perceptionTier);
        if (!output) {
          dispatch({ type: 'COMPLETE_MULTI_NIGHT_RECIPE', payload: { itemId } });
          return { success: false, errorReason: '最终工序执行失败' };
        }

        const { result, updatedItem } = output;

        dispatch({
          type: 'UPDATE_ITEM_TAGS',
          payload: {
            itemId: item.id,
            tags: updatedItem.tags,
            wasRestored: updatedItem.wasRestored,
            wasForged: updatedItem.wasForged,
            wasReforged: updatedItem.wasReforged,
            workState: updatedItem.workState,
          },
        });

        dispatch({ type: 'COMPLETE_MULTI_NIGHT_RECIPE', payload: { itemId } });

        const actionType = isCounterfeitRecipe(recipe) ? 'COUNTERFEIT' : 'REFORGE';
        dispatch({
          type: 'RECORD_NIGHT_ACTION',
          payload: `${actionType}_COMPLETE:${item.id}:${progress.recipeId}`,
        });

        // #45/#68: Multi-night counterfeit on active pawn -> Innocence penalty
        if (isCounterfeitRecipe(recipe) && item.status === ItemStatus.ACTIVE) {
          const innocenceCost = GAME_CONFIG.WORKSHOP.FORGERY.INNOCENCE_COST_ACTIVE;
          dispatch({
            type: 'RESOLVE_TRANSACTION',
            payload: {
              cashDelta: 0,
              reputationDelta: { [ReputationType.INNOCENCE]: innocenceCost },
              item: null,
              log: `[工作台] 伪造当期物品 ${item.name}，清白 ${innocenceCost}`,
              customerName: 'System',
            },
          });
        }

        return { success: true, result };
      } else {
        dispatch({ type: 'ADVANCE_MULTI_NIGHT_RECIPE', payload: { itemId } });

        dispatch({
          type: 'RECORD_NIGHT_ACTION',
          payload: `WORKSHOP_PROGRESS:${item.id}:${progress.recipeId}:${newNightsCompleted}/${progress.nightsRequired}`,
        });

        return {
          success: true,
          result: {
            success: true,
            type: recipe.type,
            recipeId: progress.recipeId,
            essenceSpent: {},
            energySpent: recipe.energyCost,
            narrative: {
              actionText: `继续${recipe.name}的工序...`,
              resultText: `工序进行中 (${newNightsCompleted}/${progress.nightsRequired})。`,
              gazeText: '工序稳步推进，距离完成又近了一步。',
            },
          },
        };
      }
    },
    [inventory, nightState, essenceBalance, inProgressRecipes, dispatch]
  );

  return {
    workshopableItems,
    essenceBalance,
    currentEnergy: nightState.energy,
    maxEnergy: nightState.maxEnergy,
    inProgressRecipes,
    doRestore,
    doCounterfeit,
    doReforge,
    doConvertEssence,
    advanceInProgressRecipe,
    getStatus,
    getReasonText,
    getWarning,
    getCounterfeitWarning,
  };
};
