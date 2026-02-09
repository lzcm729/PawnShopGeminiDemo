/**
 * 格物系统 Hook (Insight System Hook)
 *
 * 提供格物操作的 React 接口：
 * - 获取可格物的物品列表
 * - 执行格物操作
 * - 获取格物状态和叙事
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { Item, ItemStatus } from '../systems/items/types';
import { EssenceCost } from '../systems/economy/essence';
import {
  getInsightStatus,
  performInsight,
  getInsightNarrative,
  getBlockReasonText,
  getPrimaryEssenceType,
  InsightResult,
  InsightStatus,
  InsightNarrative,
} from '../systems/insight';

// ============================================================================
// Hook 返回类型
// ============================================================================

interface InsightableItem {
  item: Item;
  status: InsightStatus;
  primaryEssence: 'CRAFT' | 'TIME' | 'VIBE' | 'BALANCED';
}

interface UseInsightReturn {
  /** 可格物的物品列表（带状态信息） */
  insightableItems: InsightableItem[];

  /** 当前精力 */
  currentEnergy: number;

  /** 精力上限 */
  maxEnergy: number;

  /** 执行格物 */
  doInsight: (itemId: string) => InsightOperationResult | null;

  /** 获取物品的格物状态 */
  getItemInsightStatus: (item: Item) => InsightStatus;

  /** 获取物品的格物叙事（用于执行后显示） */
  getItemNarrative: (item: Item, result: InsightResult) => InsightNarrative;

  /** 获取阻止原因的显示文本 */
  getReasonText: (reason: string) => string;
}

interface InsightOperationResult {
  success: boolean;
  result?: InsightResult;
  narrative?: InsightNarrative;
  errorReason?: string;
}

// ============================================================================
// Hook 实现
// ============================================================================

export const useInsight = (): UseInsightReturn => {
  const { state, dispatch } = useGame();
  const { inventory, nightState, essenceBalance } = state;
  const gewuLevel = state.abilityState?.gewuLevel ?? 1;

  // 获取可格物的物品列表
  const insightableItems = useMemo((): InsightableItem[] => {
    // 筛选库存中可以被格物的物品
    // 只有 ACTIVE（典当中）和 FORFEIT（流当）的物品在库存中
    const eligibleItems = inventory.filter(
      item => item.status === ItemStatus.ACTIVE || item.status === ItemStatus.FORFEIT
    );

    return eligibleItems.map(item => ({
      item,
      status: getInsightStatus(item, nightState, gewuLevel),
      primaryEssence: getPrimaryEssenceType(item),
    }));
  }, [inventory, nightState, gewuLevel]);

  // 获取物品的格物状态
  const getItemInsightStatus = useCallback(
    (item: Item): InsightStatus => {
      return getInsightStatus(item, nightState, gewuLevel);
    },
    [nightState, gewuLevel]
  );

  // 获取格物叙事
  const getItemNarrative = useCallback(
    (item: Item, result: InsightResult): InsightNarrative => {
      return getInsightNarrative(item, result);
    },
    []
  );

  // 获取阻止原因文本
  const getReasonText = useCallback((reason: string): string => {
    return getBlockReasonText(reason as any);
  }, []);

  // 执行格物操作
  const doInsight = useCallback(
    (itemId: string): InsightOperationResult | null => {
      // 查找物品
      const item = inventory.find(i => i.id === itemId);
      if (!item) {
        return {
          success: false,
          errorReason: '物品不存在',
        };
      }

      // 检查是否可以格物
      const status = getInsightStatus(item, nightState, gewuLevel);
      if (!status.canInsight) {
        return {
          success: false,
          errorReason: status.reason ? getBlockReasonText(status.reason) : '无法格物',
        };
      }

      // 执行格物（传入库存以支持共鸣事件，传入格物等级）
      const insightOutput = performInsight(item, nightState, inventory, gewuLevel);
      if (!insightOutput) {
        return {
          success: false,
          errorReason: '格物失败',
        };
      }

      const { result, updatedItem } = insightOutput;

      // 消耗精力（如果没有顿悟返还）
      if (!result.energyRefunded) {
        dispatch({
          type: 'CONSUME_NIGHT_ENERGY',
          payload: 1, // INSIGHT_ENERGY_COST
        });
      }

      // 增加获得的精魄（包含共鸣奖励）
      const totalEssence = mergeEssence(
        mergeEssence(result.essenceGained, result.bonusEssence),
        result.resonance?.bonusEssence
      );
      if (hasEssence(totalEssence)) {
        dispatch({
          type: 'ADD_ESSENCE_BATCH',
          payload: totalEssence,
        });
      }

      // 更新物品状态（标记为已格物，更新知识池、估价区间、特征等）
      // 注意：MARK_ITEM_INSIGHTED 已经会自动记录到 actionsThisNight
      dispatch({
        type: 'MARK_ITEM_INSIGHTED',
        payload: {
          itemId: item.id,
          knowledgePool: updatedItem.knowledgePool!,
          currentRange: updatedItem.currentRange,
          perceivedValue: updatedItem.perceivedValue,
          hiddenTraits: updatedItem.hiddenTraits,
          revealedTraits: updatedItem.revealedTraits,
        },
      });

      // 记录顿悟（更新格物等级和精力上限）
      if (result.isEpiphany) {
        dispatch({ type: 'RECORD_EPIPHANY' });
      }

      // 生成叙事
      const narrative = getInsightNarrative(item, result);

      return {
        success: true,
        result,
        narrative,
      };
    },
    [inventory, nightState, dispatch, gewuLevel]
  );

  return {
    insightableItems,
    currentEnergy: nightState.energy,
    maxEnergy: nightState.maxEnergy,
    doInsight,
    getItemInsightStatus,
    getItemNarrative,
    getReasonText,
  };
};

// ============================================================================
// 辅助函数
// ============================================================================

function mergeEssence(a: EssenceCost, b?: EssenceCost): EssenceCost {
  if (!b) return a;
  return {
    craft: (a.craft || 0) + (b.craft || 0),
    time: (a.time || 0) + (b.time || 0),
    vibe: (a.vibe || 0) + (b.vibe || 0),
  };
}

function hasEssence(cost: EssenceCost): boolean {
  return (cost.craft || 0) > 0 || (cost.time || 0) > 0 || (cost.vibe || 0) > 0;
}
