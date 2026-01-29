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
import { EssenceBalance } from '../systems/economy/essence';
import {
  Recipe,
  RestoreRecipe,
  ReforgeRecipe,
  RecipeStatus,
  WorkshopResult,
  isRestoreRecipe,
  isReforgeRecipe,
  getRecipeStatus,
  performWorkshop,
  getBlockReasonText,
  RESTORE_RECIPES,
  REFORGE_RECIPES,
} from '../systems/workshop';

// ============================================================================
// Hook 返回类型
// ============================================================================

interface WorkshopableItem {
  item: Item;
  restoreOptions: Array<{ recipe: RestoreRecipe; status: RecipeStatus }>;
  reforgeOptions: Array<{ recipe: ReforgeRecipe; status: RecipeStatus }>;
  hasAnyOption: boolean;
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

  /** 执行修复 */
  doRestore: (itemId: string, recipeId: string) => WorkshopOperationResult | null;

  /** 执行重铸 */
  doReforge: (itemId: string, recipeId: string) => WorkshopOperationResult | null;

  /** 获取配方的状态 */
  getStatus: (recipe: Recipe, item: Item) => RecipeStatus;

  /** 获取阻止原因的显示文本 */
  getReasonText: (reason: string) => string;
}

interface WorkshopOperationResult {
  success: boolean;
  result?: WorkshopResult;
  errorReason?: string;
}

// ============================================================================
// Hook 实现
// ============================================================================

export const useWorkshop = (): UseWorkshopReturn => {
  const { state, dispatch } = useGame();
  const { inventory, nightState, essenceBalance } = state;

  // 获取可操作的物品列表
  const workshopableItems = useMemo((): WorkshopableItem[] => {
    // 筛选库存中可操作的物品（FORFEIT 优先，因为是自己的物品）
    const eligibleItems = inventory.filter(
      item => item.status === ItemStatus.ACTIVE || item.status === ItemStatus.FORFEIT
    );

    return eligibleItems.map(item => {
      // 获取修复选项
      const restoreOptions = RESTORE_RECIPES.map(recipe => ({
        recipe,
        status: getRecipeStatus(recipe, item, essenceBalance, nightState),
      }));

      // 获取重铸选项
      const reforgeOptions = REFORGE_RECIPES.map(recipe => ({
        recipe,
        status: getRecipeStatus(recipe, item, essenceBalance, nightState),
      }));

      // 检查是否有任何可用选项
      const hasAnyOption =
        restoreOptions.some(o => o.status.canApply) ||
        reforgeOptions.some(o => o.status.canApply);

      return {
        item,
        restoreOptions,
        reforgeOptions,
        hasAnyOption,
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

    // 执行操作
    const output = performWorkshop(recipeId, item, essenceBalance, nightState);
    if (!output) {
      return {
        success: false,
        errorReason: '操作失败',
      };
    }

    const { result, updatedItem, newBalance } = output;

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

  return {
    workshopableItems,
    essenceBalance,
    currentEnergy: nightState.energy,
    maxEnergy: nightState.maxEnergy,
    doRestore,
    doReforge,
    getStatus,
    getReasonText,
  };
};
