/**
 * 工作台系统 Hook (Workshop System Hook)
 *
 * 提供工作台操作的 React 接口：
 * - 获取可操作的物品和配方
 * - 执行修复/重铸操作
 * - 获取操作状态
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { Item, ItemStatus } from '../systems/items/types';
import { STATE_TAGS } from '../systems/items/tags';
import { EssenceBalance } from '../systems/economy/essence';
import {
  Recipe,
  RestoreRecipe,
  ReforgeRecipe,
  RecipeStatus,
  WorkshopResult,
  InProgressRecipe,
  ViolationWarning,
  isRestoreRecipe,
  isReforgeRecipe,
  getRecipeStatus,
  performWorkshop,
  getBlockReasonText,
  getViolationWarning,
  isMultiNightRecipe,
  getInProgressRecipe,
  RESTORE_RECIPES,
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

  /** 执行重铸 */
  doReforge: (itemId: string, recipeId: string) => WorkshopOperationResult | null;

  /** 推进多夜工序（夜间处理时调用） */
  advanceInProgressRecipe: (itemId: string) => WorkshopOperationResult | null;

  /** 获取配方的状态 */
  getStatus: (recipe: Recipe, item: Item) => RecipeStatus;

  /** 获取阻止原因的显示文本 */
  getReasonText: (reason: string) => string;

  /** 获取违约重铸风险预警 */
  getWarning: (item: Item) => ViolationWarning | null;
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
 * 处理 targetTag（单目标）、targetAll（全面翻新）和 requiredTags（前置条件）
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
 * 优先级：艺术修复 > 机械修复 > 除锈 > 清洁 > 全面翻新
 * （配方列表中有 requiredTags 的更具体配方排在前面）
 */
function getRestoreRecipeForItem(item: Item): RestoreRecipe | null {
  // 遍历配方，找到第一个匹配的
  // 艺术修复排在机械修复之后但有 requiredTags 区分
  // 我们需要选择最具体的匹配
  const tags = item.tags || [];
  const hasArtistic = tags.includes('ARTISTIC');

  for (const recipe of RESTORE_RECIPES) {
    // 跳过全面翻新（不作为默认推荐）
    if (recipe.targetAll) continue;

    if (!doesRestoreRecipeMatch(recipe, item)) continue;

    // 对于 BROKEN 标签，优先选择匹配 requiredTags 的配方
    if (recipe.targetTag === 'BROKEN' && recipe.requiredTags?.includes('ARTISTIC')) {
      if (hasArtistic) return recipe;
      continue; // 物品没有 ARTISTIC，跳过艺术修复
    }
    if (recipe.targetTag === 'BROKEN' && !recipe.requiredTags) {
      if (hasArtistic) continue; // 物品有 ARTISTIC，应该用艺术修复，跳过机械修复
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
 * 根据物品属性确定唯一的重铸配方
 * 按条件严格程度排序，选择最匹配的配方
 *
 * 优先级（条件越严格越优先）：
 * 1. imperial: 需要 VINTAGE_REAL + ARTISTIC
 * 2. fake_history: 需要 VINTAGE_REAL
 * 3. art_enhanced: 需要 ARTISTIC
 * 4. trending: 无特殊要求（兜底）
 */
function getReforgeRecipeForItem(item: Item): ReforgeRecipe | null {
  const tags = item.tags || [];

  for (const recipe of REFORGE_RECIPES) {
    // 检查前置标签
    if (recipe.requiredTags && recipe.requiredTags.length > 0) {
      if (!recipe.requiredTags.every(tag => tags.includes(tag))) {
        continue;
      }
    }

    // 检查类别
    if (recipe.requiredCategories && recipe.requiredCategories.length > 0) {
      if (!recipe.requiredCategories.includes(item.category)) {
        continue;
      }
    }

    // 检查排除标签（但不检查 wasReforged，那是在 status 中处理）
    if (recipe.excludedTags && recipe.excludedTags.length > 0) {
      if (recipe.excludedTags.some(tag => tags.includes(tag))) {
        continue;
      }
    }

    // 找到匹配的配方
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
    // 筛选库存中可操作的物品（FORFEIT 优先，因为是自己的物品）
    const eligibleItems = inventory.filter(
      item => item.status === ItemStatus.ACTIVE || item.status === ItemStatus.FORFEIT
    );

    return eligibleItems.map(item => {
      // 获取该物品所有可用的修复配方
      const allRestoreMatches = getAllRestoreRecipesForItem(item);
      const allRestoreRecipes = allRestoreMatches.map(recipe => ({
        recipe,
        status: getRecipeStatus(recipe, item, essenceBalance, nightState),
      }));

      // 获取该物品唯一的修复配方（最佳匹配）
      const restoreRecipeMatch = getRestoreRecipeForItem(item);
      const restoreRecipe = restoreRecipeMatch
        ? { recipe: restoreRecipeMatch, status: getRecipeStatus(restoreRecipeMatch, item, essenceBalance, nightState) }
        : null;

      // 获取该物品唯一的重铸配方
      const reforgeRecipeMatch = getReforgeRecipeForItem(item);
      const reforgeRecipe = reforgeRecipeMatch
        ? { recipe: reforgeRecipeMatch, status: getRecipeStatus(reforgeRecipeMatch, item, essenceBalance, nightState) }
        : null;

      // 检查是否有任何可用选项
      const hasAnyOption =
        (restoreRecipe?.status.canApply ?? false) ||
        (reforgeRecipe?.status.canApply ?? false);

      // 统计可用的修复操作数量
      const restoreCount = allRestoreRecipes.length;

      return {
        item,
        restoreRecipe,
        allRestoreRecipes,
        reforgeRecipe,
        hasAnyOption,
        restoreCount,
      };
    });
  }, [inventory, nightState, essenceBalance]);

  // 获取配方状态
  const getStatus = useCallback(
    (recipe: Recipe, item: Item): RecipeStatus => {
      return getRecipeStatus(recipe, item, essenceBalance, nightState);
    },
    [essenceBalance, nightState]
  );

  // 获取阻止原因文本
  const getReasonText = useCallback((reason: string): string => {
    return getBlockReasonText(reason as any);
  }, []);

  // 获取违约风险预警
  const getWarning = useCallback((item: Item): ViolationWarning | null => {
    return getViolationWarning(item);
  }, []);

  // 执行修复
  const doRestore = useCallback(
    (itemId: string, recipeId: string): WorkshopOperationResult | null => {
      return executeWorkshop(itemId, recipeId, 'restore');
    },
    [inventory, nightState, essenceBalance, dispatch]
  );

  // 执行重铸
  const doReforge = useCallback(
    (itemId: string, recipeId: string): WorkshopOperationResult | null => {
      return executeWorkshop(itemId, recipeId, 'reforge');
    },
    [inventory, nightState, essenceBalance, dispatch]
  );

  // 通用执行函数
  function executeWorkshop(
    itemId: string,
    recipeId: string,
    type: 'restore' | 'reforge'
  ): WorkshopOperationResult | null {
    // 查找物品
    const item = inventory.find(i => i.id === itemId);
    if (!item) {
      return {
        success: false,
        errorReason: '物品不存在',
      };
    }

    // 检查是否为多夜配方
    const recipe = getRecipeById(recipeId);
    if (recipe && isMultiNightRecipe(recipe)) {
      // 检查物品是否已有进行中的工序
      const existing = getInProgressRecipe(itemId, inProgressRecipes);
      if (existing) {
        return {
          success: false,
          errorReason: '该物品已有进行中的工序',
        };
      }

      // 多夜配方第一夜：扣除精魄和精力，创建进度记录，但不执行最终效果
      const status = getRecipeStatus(recipe, item, essenceBalance, nightState);
      if (!status.canApply) {
        return {
          success: false,
          errorReason: status.reason || '无法执行',
        };
      }

      // 消耗精力
      dispatch({ type: 'CONSUME_NIGHT_ENERGY', payload: recipe.energyCost });
      // 消耗精魄
      dispatch({ type: 'SPEND_ESSENCE_BATCH', payload: status.actualCost });
      // 创建多夜工序进度记录
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
      // 记录行动
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
    const output = performWorkshop(recipeId, item, essenceBalance, nightState);
    if (!output) {
      return {
        success: false,
        errorReason: '操作失败',
      };
    }

    const { result, updatedItem } = output;

    // 消耗精力
    dispatch({
      type: 'CONSUME_NIGHT_ENERGY',
      payload: result.energySpent,
    });

    // 更新精魄余额
    dispatch({
      type: 'SPEND_ESSENCE_BATCH',
      payload: result.essenceSpent,
    });

    // 更新物品
    dispatch({
      type: 'UPDATE_ITEM_TAGS',
      payload: {
        itemId: item.id,
        tags: updatedItem.tags,
        wasRestored: updatedItem.wasRestored,
        wasReforged: updatedItem.wasReforged,
        workState: updatedItem.workState,
      },
    });

    // 记录行动
    dispatch({
      type: 'RECORD_NIGHT_ACTION',
      payload: `${type.toUpperCase()}:${item.id}:${recipeId}`,
    });

    return {
      success: true,
      result,
    };
  }

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

      // 检查精力是否足够（后续夜只消耗精力，不消耗精魄）
      if (nightState.energy < recipe.energyCost) {
        return { success: false, errorReason: '精力不足' };
      }

      const newNightsCompleted = progress.nightsCompleted + 1;
      const isComplete = newNightsCompleted >= progress.nightsRequired;

      // 消耗精力
      dispatch({ type: 'CONSUME_NIGHT_ENERGY', payload: recipe.energyCost });

      if (isComplete) {
        // 最终夜：执行实际效果
        const output = performWorkshop(progress.recipeId, item, essenceBalance, nightState);
        if (!output) {
          // 完成多夜工序记录但标记为取消
          dispatch({ type: 'COMPLETE_MULTI_NIGHT_RECIPE', payload: { itemId } });
          return { success: false, errorReason: '最终工序执行失败' };
        }

        const { result, updatedItem } = output;

        // 注意：精魄已在第一夜扣除，所以这里不再扣除
        // performWorkshop 内部已扣除了一次，需要补偿回去
        // 更简单的做法：最终夜直接应用效果到物品，不通过 performWorkshop
        // 但为了复用逻辑（概率/品质/surprise），仍通过 performWorkshop

        // 更新物品
        dispatch({
          type: 'UPDATE_ITEM_TAGS',
          payload: {
            itemId: item.id,
            tags: updatedItem.tags,
            wasRestored: updatedItem.wasRestored,
            wasReforged: updatedItem.wasReforged,
            workState: updatedItem.workState,
          },
        });

        // 清除进度记录
        dispatch({ type: 'COMPLETE_MULTI_NIGHT_RECIPE', payload: { itemId } });

        // 记录行动
        dispatch({
          type: 'RECORD_NIGHT_ACTION',
          payload: `REFORGE_COMPLETE:${item.id}:${progress.recipeId}`,
        });

        return { success: true, result };
      } else {
        // 中间夜：推进进度
        dispatch({ type: 'ADVANCE_MULTI_NIGHT_RECIPE', payload: { itemId } });

        // 记录行动
        dispatch({
          type: 'RECORD_NIGHT_ACTION',
          payload: `REFORGE_PROGRESS:${item.id}:${progress.recipeId}:${newNightsCompleted}/${progress.nightsRequired}`,
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
    doReforge,
    advanceInProgressRecipe,
    getStatus,
    getReasonText,
    getWarning,
  };
};
