/**
 * 格物系统核心逻辑 (Insight System Logic)
 *
 * 提供格物操作的核心函数：
 * - 检查是否可以格物
 * - 执行格物操作
 * - 计算顿悟条件
 * - 生成格物叙事文本
 */

import { Item, ItemStatus, ItemTrait } from '../items/types';
import { KnowledgePool } from '../items/tags';
import { EssenceCost } from '../economy/essence';
import { NightState } from '../game/types';
import { GAME_CONFIG } from '../game/config';
import {
  InsightResult,
  InsightStatus,
  InsightBlockReason,
  InsightNarrative,
} from './types';
import {
  calculateEssenceYieldFromTags,
  initializeKnowledgePool,
  getRemainingKnowledge,
  isKnowledgePoolDepleted,
} from '../items/tagUtils';
import { calculateEssenceGain } from '../economy/essenceUtils';

// ============================================================================
// 配置读取
// ============================================================================

const getInsightConfig = () => ({
  energyCost: GAME_CONFIG.NIGHT.INSIGHT_ENERGY_COST,
  extractionRate: GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE,
  epiphanyBonusRatio: GAME_CONFIG.NIGHT.EPIPHANY_BONUS_RATIO,
  defaultCapacity: GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY,
  // 夜间鉴定配置
  rangeShrinkRate: GAME_CONFIG.NIGHT.INSIGHT_RANGE_SHRINK_RATE,
  traitDiscoveryChance: GAME_CONFIG.NIGHT.INSIGHT_TRAIT_DISCOVERY_CHANCE,
  valueLockThreshold: GAME_CONFIG.NIGHT.VALUE_LOCK_THRESHOLD,
});

// ============================================================================
// 夜间鉴定辅助函数
// ============================================================================

/**
 * 检查物品估价是否已锁定（区间足够小）
 */
export function isValueLocked(item: Item): boolean {
  const config = getInsightConfig();
  const [min, max] = item.currentRange;
  const width = max - min;
  const realValue = item.realValue;

  // 区间宽度 / 真值 < 阈值时视为锁定
  // 或者区间宽度小于 100（绝对值兜底）
  return (width / realValue < config.valueLockThreshold) || (width < 100);
}

/**
 * 收窄估价区间，向真值靠拢
 *
 * @param item 物品
 * @returns 新的估价区间
 */
function shrinkRange(item: Item): [number, number] {
  const config = getInsightConfig();
  const [min, max] = item.currentRange;
  const realValue = item.realValue;

  // Lerp 向真值收窄
  const newMin = min + (realValue - min) * config.rangeShrinkRate;
  const newMax = max - (max - realValue) * config.rangeShrinkRate;

  return [Math.round(newMin), Math.round(newMax)];
}

/**
 * 检查收窄后的区间是否应该锁定
 */
function shouldLockAfterShrink(newRange: [number, number], realValue: number): boolean {
  const config = getInsightConfig();
  const [min, max] = newRange;
  const width = max - min;

  return (width / realValue < config.valueLockThreshold) || (width < 100);
}

/**
 * 尝试发现一个隐藏特征
 *
 * @param item 物品
 * @returns 发现的特征，如果没有发现返回 undefined
 */
function tryDiscoverTrait(item: Item): ItemTrait | undefined {
  const config = getInsightConfig();
  const hiddenTraits = item.hiddenTraits || [];

  // 没有隐藏特征
  if (hiddenTraits.length === 0) return undefined;

  // 概率检查
  if (Math.random() > config.traitDiscoveryChance) return undefined;

  // 随机选择一个隐藏特征
  const index = Math.floor(Math.random() * hiddenTraits.length);
  return hiddenTraits[index];
}

// ============================================================================
// 检查函数
// ============================================================================

/**
 * 检查物品是否可以被格物
 *
 * @param item 物品
 * @param nightState 夜间状态
 * @returns 格物状态
 */
export function getInsightStatus(item: Item, nightState: NightState): InsightStatus {
  const config = getInsightConfig();

  // 确保物品有知识池
  const pool = item.knowledgePool || {
    capacity: config.defaultCapacity,
    extracted: 0,
    essenceYield: calculateEssenceYieldFromTags(item),
  };

  const remaining = pool.capacity - pool.extracted;
  const progress = pool.extracted / pool.capacity;
  const nearEpiphany = remaining <= config.extractionRate;

  // 检查各种阻止条件
  let canInsight = true;
  let reason: InsightBlockReason | undefined;

  // 物品状态检查
  if (item.status === ItemStatus.REDEEMED) {
    canInsight = false;
    reason = 'ITEM_REDEEMED';
  } else if (item.status === ItemStatus.SOLD) {
    canInsight = false;
    reason = 'ITEM_SOLD';
  }
  // 知识池检查
  else if (isKnowledgePoolDepleted(item)) {
    canInsight = false;
    reason = 'DEPLETED';
  }
  // 今晚已格物检查
  else if (item.insightedTonight) {
    canInsight = false;
    reason = 'ALREADY_INSIGHTED';
  }
  // 精力检查
  else if (nightState.energy < config.energyCost) {
    canInsight = false;
    reason = 'NO_ENERGY';
  }

  // 夜间鉴定状态
  const valueLocked = isValueLocked(item);
  const hiddenTraitCount = (item.hiddenTraits || []).length;
  const revealedTraitCount = (item.revealedTraits || []).length;

  return {
    canInsight,
    reason,
    progress,
    remainingKnowledge: remaining,
    estimatedYield: pool.essenceYield,
    nearEpiphany,
    // 夜间鉴定状态
    isValueLocked: valueLocked,
    hiddenTraitCount,
    revealedTraitCount,
  };
}

/**
 * 简化的可格物检查
 */
export function canInsight(item: Item, nightState: NightState): boolean {
  return getInsightStatus(item, nightState).canInsight;
}

// ============================================================================
// 执行格物
// ============================================================================

/**
 * 执行格物操作
 *
 * 格物产出三项收益：
 * 1. 点数（必得）- 直到知识池清空
 * 2. 估价收窄 ~20%（必得）- 直到估价锁定
 * 3. 特征发现 25%（概率）- 直到特征全开
 *
 * 顿悟时的兜底机制：
 * - 如果估价还没锁定 -> 强制锁定为 realValue
 * - 如果特征还有未发现的 -> 强制全开
 *
 * @param item 物品（将被修改）
 * @param nightState 夜间状态（用于检查）
 * @returns 格物结果，如果无法格物返回 null
 */
export function performInsight(
  item: Item,
  nightState: NightState
): { result: InsightResult; updatedItem: Item } | null {
  const status = getInsightStatus(item, nightState);

  if (!status.canInsight) {
    return null;
  }

  const config = getInsightConfig();

  // 确保物品有知识池
  let workingItem = item.knowledgePool
    ? item
    : initializeKnowledgePool(item, config.defaultCapacity);

  const pool = workingItem.knowledgePool!;
  const remaining = getRemainingKnowledge(workingItem);

  // 计算实际提取量（不超过剩余量）
  const extractedAmount = Math.min(config.extractionRate, remaining);

  // 计算产出精魄
  const essenceGained = calculateEssenceGain(extractedAmount, pool.essenceYield);

  // 检查是否触发顿悟
  const newExtracted = pool.extracted + extractedAmount;
  const isEpiphany = newExtracted >= pool.capacity;

  // 计算顿悟奖励
  let bonusEssence: EssenceCost | undefined;
  if (isEpiphany) {
    bonusEssence = calculateEssenceGain(
      extractedAmount * config.epiphanyBonusRatio,
      pool.essenceYield
    );
  }

  // =========================================================================
  // 夜间鉴定：估价收窄逻辑
  // =========================================================================
  let rangeNarrowed = false;
  let newRange: [number, number] | undefined;
  let valueLocked = false;
  let updatedCurrentRange = workingItem.currentRange;
  let updatedPerceivedValue = workingItem.perceivedValue;

  const wasValueLocked = isValueLocked(workingItem);

  if (isEpiphany) {
    // 顿悟兜底：强制锁定估价为真值
    if (!wasValueLocked) {
      rangeNarrowed = true;
      newRange = [workingItem.realValue, workingItem.realValue];
      valueLocked = true;
      updatedCurrentRange = newRange;
      updatedPerceivedValue = undefined; // 真值已知，清除 perceivedValue
    }
  } else if (!wasValueLocked) {
    // 普通格物：收窄估价区间
    const shrunkRange = shrinkRange(workingItem);
    rangeNarrowed = true;
    newRange = shrunkRange;
    updatedCurrentRange = shrunkRange;

    // 检查是否在收窄后达到锁定阈值
    if (shouldLockAfterShrink(shrunkRange, workingItem.realValue)) {
      valueLocked = true;
      newRange = [workingItem.realValue, workingItem.realValue];
      updatedCurrentRange = newRange;
      updatedPerceivedValue = undefined;
    }
  }

  // =========================================================================
  // 夜间鉴定：特征发现逻辑
  // =========================================================================
  let traitDiscovered: ItemTrait | undefined;
  let updatedHiddenTraits = [...(workingItem.hiddenTraits || [])];
  let updatedRevealedTraits = [...(workingItem.revealedTraits || [])];
  let allNewlyDiscoveredTraits: ItemTrait[] = [];

  if (isEpiphany) {
    // 顿悟兜底：强制全开所有隐藏特征
    if (updatedHiddenTraits.length > 0) {
      // 将所有隐藏特征移动到已发现
      allNewlyDiscoveredTraits = [...updatedHiddenTraits];
      updatedRevealedTraits = [...updatedRevealedTraits, ...updatedHiddenTraits];
      // 如果只有一个特征，记录为"发现的特征"用于 UI 显示
      if (updatedHiddenTraits.length === 1) {
        traitDiscovered = updatedHiddenTraits[0];
      }
      updatedHiddenTraits = [];
    }
  } else {
    // 普通格物：概率发现特征
    const discovered = tryDiscoverTrait(workingItem);
    if (discovered) {
      traitDiscovered = discovered;
      allNewlyDiscoveredTraits = [discovered];
      // 从隐藏特征中移除
      updatedHiddenTraits = updatedHiddenTraits.filter(t => t.id !== discovered.id);
      // 添加到已发现特征
      updatedRevealedTraits = [...updatedRevealedTraits, discovered];
    }
  }

  // =========================================================================
  // FAKE/JACKPOT 价值跳变：发现时立即触发
  // =========================================================================
  const discoveredFakeOrJackpot = allNewlyDiscoveredTraits.find(
    t => t.type === 'FAKE' || t.type === 'JACKPOT'
  );

  if (discoveredFakeOrJackpot && !wasValueLocked) {
    // 发现 FAKE 或 JACKPOT 特征时，立即将估价跳变到真实值
    rangeNarrowed = true;
    valueLocked = true;
    newRange = [workingItem.realValue, workingItem.realValue];
    updatedCurrentRange = newRange;
    updatedPerceivedValue = undefined; // 真值已知
  }

  // =========================================================================
  // 更新物品状态
  // =========================================================================
  const updatedItem: Item = {
    ...workingItem,
    knowledgePool: {
      ...pool,
      extracted: newExtracted,
    },
    insightedTonight: true,
    // 夜间鉴定更新
    currentRange: updatedCurrentRange,
    perceivedValue: updatedPerceivedValue,
    hiddenTraits: updatedHiddenTraits,
    revealedTraits: updatedRevealedTraits,
  };

  const result: InsightResult = {
    essenceGained,
    isEpiphany,
    energyRefunded: isEpiphany, // 顿悟时返还精力
    bonusEssence,
    extractedAmount,
    remainingKnowledge: pool.capacity - newExtracted,
    // 夜间鉴定结果
    rangeNarrowed,
    newRange,
    valueLocked,
    traitDiscovered,
    // 顿悟时锁定的价值
    lockedValue: valueLocked ? workingItem.realValue : undefined,
  };

  return { result, updatedItem };
}

// ============================================================================
// 顿悟系统
// ============================================================================

/**
 * 检查物品是否即将触发顿悟
 *
 * @param item 物品
 * @returns 是否接近顿悟
 */
export function isNearEpiphany(item: Item): boolean {
  if (!item.knowledgePool) return false;

  const config = getInsightConfig();
  const remaining = getRemainingKnowledge(item);

  return remaining > 0 && remaining <= config.extractionRate;
}

/**
 * 计算达到顿悟还需要多少次格物
 *
 * @param item 物品
 * @returns 还需要的格物次数
 */
export function getInsightsToEpiphany(item: Item): number {
  if (!item.knowledgePool) {
    const config = getInsightConfig();
    return Math.ceil(config.defaultCapacity / config.extractionRate);
  }

  const remaining = getRemainingKnowledge(item);
  if (remaining <= 0) return 0;

  const config = getInsightConfig();
  return Math.ceil(remaining / config.extractionRate);
}

// ============================================================================
// 叙事生成
// ============================================================================

/**
 * 根据物品和结果生成格物叙事
 *
 * 设计原则（来自D1）：叙事提醒玩家这是"有主之物"，
 * 但不做道德评判，让玩家自己体会。
 */
export function getInsightNarrative(
  item: Item,
  result: InsightResult
): InsightNarrative {
  // 根据物品属性标签选择合适的描述
  const tags = item.tags || [];

  // 基础行为描述
  let actionText = `你在灯下仔细端详着${item.name}...`;

  // 根据标签生成发现描述
  let discoveryText: string;

  if (tags.includes('MECHANICAL')) {
    discoveryText = '精密的机械结构让你对工艺有了更深的理解。';
  } else if (tags.includes('GOLD')) {
    discoveryText = '贵金属的质感与重量，让你对材质工艺有了新的认识。';
  } else if (tags.includes('VINTAGE_REAL')) {
    discoveryText = '岁月在这件物品上留下的痕迹，诉说着一段无声的历史。';
  } else if (tags.includes('SENTIMENTAL')) {
    discoveryText = '你仿佛能感受到物品主人曾经的情感寄托。';
  } else if (tags.includes('ARTISTIC')) {
    discoveryText = '艺术的美感让你的感知变得更加敏锐。';
  } else {
    discoveryText = '你从中获得了一些领悟。';
  }

  // 顿悟描述
  let epiphanyText: string | undefined;
  if (result.isEpiphany) {
    epiphanyText = `你已经完全理解了这件${item.name}的一切秘密。它对你而言，不再有任何未知。`;

    // D1: 微妙的道德提醒（不做评判）
    if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
      epiphanyText += '\n...只是，这件物品的主人还在等着它。';
    }
  }

  return {
    actionText,
    discoveryText,
    epiphanyText,
  };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取格物受阻原因的显示文本
 */
export function getBlockReasonText(reason: InsightBlockReason): string {
  switch (reason) {
    case 'NO_ENERGY':
      return '精力不足';
    case 'ALREADY_INSIGHTED':
      return '今晚已研究过';
    case 'DEPLETED':
      return '已被研究透彻';
    case 'NOT_IN_INVENTORY':
      return '物品不在库存中';
    case 'ITEM_REDEEMED':
      return '物品已被赎回';
    case 'ITEM_SOLD':
      return '物品已售出';
    default:
      return '无法研究';
  }
}

/**
 * 获取物品可以产出的主要精魄类型
 */
export function getPrimaryEssenceType(
  item: Item
): 'CRAFT' | 'TIME' | 'VIBE' | 'BALANCED' {
  const pool = item.knowledgePool;
  const yieldRatios = pool?.essenceYield || calculateEssenceYieldFromTags(item);

  const craft = yieldRatios.craft || 0;
  const time = yieldRatios.time || 0;
  const vibe = yieldRatios.vibe || 0;

  // 如果某种类型占比超过50%，认为是主要类型
  if (craft >= 0.5) return 'CRAFT';
  if (time >= 0.5) return 'TIME';
  if (vibe >= 0.5) return 'VIBE';

  return 'BALANCED';
}

/**
 * 批量重置物品的"今晚已格物"标记
 * 在新的夜晚开始时调用
 */
export function resetInsightedFlags(items: Item[]): Item[] {
  return items.map(item => ({
    ...item,
    insightedTonight: false,
  }));
}
