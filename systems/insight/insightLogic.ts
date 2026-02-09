/**
 * 格物系统核心逻辑 (Insight System Logic)
 *
 * 提供格物操作的核心函数：
 * - 检查是否可以格物
 * - 执行格物操作
 * - 计算顿悟条件
 * - 生成格物叙事文本
 *
 * v1.1 新增：
 * - 随机化产出 (15-25)
 * - 顿悟暴击比例修正 (25% of capacity)
 * - 格物意外事件（走神/惊人发现）
 * - 窥见事件 (Glimpse)
 * - 共鸣事件 (Resonance)
 * - 精力上限可成长
 * - 顿悟后残留不确定性
 * - 收益递减信息字段
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
  UnexpectedEventType,
  DepletedRewards,
} from './types';
import {
  calculateEssenceYieldFromTags,
  initializeKnowledgePool,
  getRemainingKnowledge,
  isKnowledgePoolDepleted,
  getAttributeTags,
} from '../items/tagUtils';
import { calculateEssenceGain } from '../economy/essenceUtils';
import { createTextRegistry, TextRegistry } from '../utils/textRegistry';
import insightTextsCSV from '@/assets/data/texts/insight_texts.csv?raw';

// ============================================================================
// 配置读取
// ============================================================================

const getInsightConfig = () => ({
  energyCost: GAME_CONFIG.NIGHT.INSIGHT_ENERGY_COST,
  extractionRateMin: GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE_MIN,
  extractionRateMax: GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE_MAX,
  epiphanyBonusRatio: GAME_CONFIG.NIGHT.EPIPHANY_BONUS_RATIO,
  defaultCapacity: GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY,
  // 夜间鉴定配置
  rangeShrinkRate: GAME_CONFIG.NIGHT.INSIGHT_RANGE_SHRINK_RATE,
  traitDiscoveryChance: GAME_CONFIG.NIGHT.INSIGHT_TRAIT_DISCOVERY_CHANCE,
  valueLockThreshold: GAME_CONFIG.NIGHT.VALUE_LOCK_THRESHOLD,
  // v1.1 新增配置
  distractionChance: GAME_CONFIG.NIGHT.DISTRACTION_CHANCE,
  remarkableFindChance: GAME_CONFIG.NIGHT.REMARKABLE_FIND_CHANCE,
  glimpseChance: GAME_CONFIG.NIGHT.GLIMPSE_CHANCE,
  resonanceChance: GAME_CONFIG.NIGHT.RESONANCE_CHANCE,
  resonanceBonusRatio: GAME_CONFIG.NIGHT.RESONANCE_BONUS_RATIO,
  epiphanyResidualUncertainty: GAME_CONFIG.NIGHT.EPIPHANY_RESIDUAL_UNCERTAINTY,
});

// ============================================================================
// 文本注册表 (从 CSV 加载叙事文本)
// ============================================================================

let insightTexts: TextRegistry | null = null;

function getTexts(): TextRegistry {
  if (!insightTexts) {
    insightTexts = createTextRegistry('insight', insightTextsCSV);
  }
  return insightTexts;
}

// ============================================================================
// 随机产出计算 (S3-F1)
// ============================================================================

/**
 * 计算随机格物产出量
 * 范围: [min, max] (inclusive)
 */
function rollExtractionAmount(): number {
  const config = getInsightConfig();
  const min = config.extractionRateMin;
  const max = config.extractionRateMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// 格物意外事件判定 (S3-F3)
// ============================================================================

/**
 * 判定格物意外事件
 * 走神 (5%): 产出减半
 * 惊人发现 (5%): 产出翻倍
 * 互斥：先掷一次随机数
 */
function rollUnexpectedEvent(): UnexpectedEventType | undefined {
  const config = getInsightConfig();
  const roll = Math.random();
  if (roll < config.distractionChance) {
    return 'DISTRACTION';
  }
  if (roll > 1 - config.remarkableFindChance) {
    return 'REMARKABLE_FIND';
  }
  return undefined;
}

/**
 * 应用意外事件对产出量的影响
 */
function applyUnexpectedEvent(
  baseAmount: number,
  event: UnexpectedEventType | undefined
): number {
  if (!event) return baseAmount;
  if (event === 'DISTRACTION') return Math.floor(baseAmount / 2);
  if (event === 'REMARKABLE_FIND') return baseAmount * 2;
  return baseAmount;
}

// ============================================================================
// 窥见事件 (S3-F4)
// ============================================================================

/**
 * 尝试触发窥见事件
 * 条件：物品有未解锁的故事（知识池未清空），概率触发
 */
function tryGlimpse(item: Item): { text: string } | undefined {
  const config = getInsightConfig();

  // 已顿悟的物品不触发窥见
  if (isKnowledgePoolDepleted(item)) return undefined;

  // 概率检查
  if (Math.random() > config.glimpseChance) return undefined;

  // S3-C2: 从丰富的窥见文案库中随机选择
  const tags = item.tags || [];
  const glimpses = getGlimpseTexts(item, tags);
  const index = Math.floor(Math.random() * glimpses.length);
  return { text: glimpses[index] };
}

// ============================================================================
// 共鸣事件 (S3-F5)
// ============================================================================

/**
 * 尝试触发共鸣事件
 * 条件：库存中存在共享 G2 属性标签的其他物品
 */
function tryResonance(
  item: Item,
  inventory: Item[]
): { text: string; bonusEssence: EssenceCost; pairedItemId: string; pairedItemName: string } | undefined {
  const config = getInsightConfig();

  const itemAttrTags = getAttributeTags(item);
  if (itemAttrTags.length === 0) return undefined;

  // 查找库存中共享 G2 属性标签的其他物品
  const pairedItem = inventory.find(other => {
    if (other.id === item.id) return false;
    if (other.status !== ItemStatus.ACTIVE && other.status !== ItemStatus.FORFEIT) return false;
    const otherAttrTags = getAttributeTags(other);
    return otherAttrTags.some(tag => itemAttrTags.includes(tag));
  });

  if (!pairedItem) return undefined;

  // 概率检查
  if (Math.random() > config.resonanceChance) return undefined;

  // 计算共鸣奖励精魄
  const pool = item.knowledgePool;
  const yieldRatios = pool?.essenceYield || calculateEssenceYieldFromTags(item);
  const bonusAmount = Math.floor(config.extractionRateMin * config.resonanceBonusRatio);
  const bonusEssence = calculateEssenceGain(bonusAmount, yieldRatios);

  const resonanceVars = { item_name: item.name, paired_name: pairedItem.name };
  const resonanceText = getTexts().getWithVars('resonance', resonanceVars)
    || `${item.name}与${pairedItem.name}之间产生了微妙的共鸣...`;

  return {
    text: resonanceText,
    bonusEssence,
    pairedItemId: pairedItem.id,
    pairedItemName: pairedItem.name,
  };
}

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
 */
function tryDiscoverTrait(item: Item): ItemTrait | undefined {
  const config = getInsightConfig();
  const hiddenTraits = item.hiddenTraits || [];

  if (hiddenTraits.length === 0) return undefined;
  if (Math.random() > config.traitDiscoveryChance) return undefined;

  const index = Math.floor(Math.random() * hiddenTraits.length);
  return hiddenTraits[index];
}

// ============================================================================
// 检查函数
// ============================================================================

/**
 * 检查物品是否可以被格物
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
  // 使用最大产出判断是否接近顿悟（最乐观估计）
  const nearEpiphany = remaining > 0 && remaining <= config.extractionRateMax;

  // 检查各种阻止条件
  let canInsight = true;
  let reason: InsightBlockReason | undefined;

  if (item.status === ItemStatus.REDEEMED) {
    canInsight = false;
    reason = 'ITEM_REDEEMED';
  } else if (item.status === ItemStatus.SOLD) {
    canInsight = false;
    reason = 'ITEM_SOLD';
  } else if (isKnowledgePoolDepleted(item)) {
    canInsight = false;
    reason = 'DEPLETED';
  } else if (item.insightedTonight) {
    canInsight = false;
    reason = 'ALREADY_INSIGHTED';
  } else if (nightState.energy < config.energyCost) {
    canInsight = false;
    reason = 'NO_ENERGY';
  }

  // 夜间鉴定状态
  const valueLocked = isValueLocked(item);
  const hiddenTraitCount = (item.hiddenTraits || []).length;
  const revealedTraitCount = (item.revealedTraits || []).length;

  // 收益递减状态 (S3-F8)
  const allTraitsRevealed = hiddenTraitCount === 0;
  const depletedRewards: DepletedRewards = {
    valueLocked,
    allTraitsRevealed,
    onlyEssenceRemaining: valueLocked && allTraitsRevealed,
  };

  // 距顿悟次数（基于最大产出的乐观估计）
  const insightsToEpiphany = remaining <= 0
    ? 0
    : Math.ceil(remaining / config.extractionRateMax);

  return {
    canInsight,
    reason,
    progress,
    remainingKnowledge: remaining,
    estimatedYield: pool.essenceYield,
    nearEpiphany,
    isValueLocked: valueLocked,
    hiddenTraitCount,
    revealedTraitCount,
    depletedRewards,
    insightsToEpiphany,
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
 * v1.1 新增：
 * - 随机产出 15-25（S3-F1）
 * - 顿悟暴击基于知识池上限的25%（S3-F2）
 * - 意外事件（S3-F3）
 * - 窥见事件（S3-F4）
 * - 共鸣事件（S3-F5）
 * - 顿悟残留不确定性（S3-F7）
 */
export function performInsight(
  item: Item,
  nightState: NightState,
  inventory?: Item[]
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

  // S3-F1: 随机产出量
  const baseExtraction = rollExtractionAmount();

  // S3-F3: 格物意外事件判定
  const unexpectedEvent = rollUnexpectedEvent();
  const modifiedExtraction = applyUnexpectedEvent(baseExtraction, unexpectedEvent);

  // 计算实际提取量（不超过剩余量）
  const extractedAmount = Math.min(modifiedExtraction, remaining);

  // 计算产出精魄
  const essenceGained = calculateEssenceGain(extractedAmount, pool.essenceYield);

  // 检查是否触发顿悟
  const newExtracted = pool.extracted + extractedAmount;
  const isEpiphany = newExtracted >= pool.capacity;

  // S3-F2: 顿悟暴击基于知识池上限的25%（而非提取量）
  let bonusEssence: EssenceCost | undefined;
  if (isEpiphany) {
    const bonusAmount = Math.floor(pool.capacity * config.epiphanyBonusRatio);
    bonusEssence = calculateEssenceGain(bonusAmount, pool.essenceYield);
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
    // S3-F7: 顿悟兜底 — 强制收窄，但保留微量不确定性
    if (!wasValueLocked) {
      rangeNarrowed = true;
      const halfUncertainty = config.epiphanyResidualUncertainty / 2;
      const residualMin = Math.round(workingItem.realValue * (1 - halfUncertainty));
      const residualMax = Math.round(workingItem.realValue * (1 + halfUncertainty));
      newRange = [residualMin, residualMax];
      valueLocked = true;
      updatedCurrentRange = newRange;
      updatedPerceivedValue = undefined;
    }
  } else if (!wasValueLocked) {
    // 普通格物：收窄估价区间
    const shrunkRange = shrinkRange(workingItem);
    rangeNarrowed = true;
    newRange = shrunkRange;
    updatedCurrentRange = shrunkRange;

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
      allNewlyDiscoveredTraits = [...updatedHiddenTraits];
      updatedRevealedTraits = [...updatedRevealedTraits, ...updatedHiddenTraits];
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
      updatedHiddenTraits = updatedHiddenTraits.filter(t => t.id !== discovered.id);
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
    rangeNarrowed = true;
    valueLocked = true;
    newRange = [workingItem.realValue, workingItem.realValue];
    updatedCurrentRange = newRange;
    updatedPerceivedValue = undefined;
  }

  // =========================================================================
  // S3-F4: 窥见事件
  // =========================================================================
  const glimpse = !isEpiphany ? tryGlimpse(workingItem) : undefined;

  // =========================================================================
  // S3-F5: 共鸣事件
  // =========================================================================
  const resonance = !isEpiphany && inventory
    ? tryResonance(workingItem, inventory)
    : undefined;

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
    currentRange: updatedCurrentRange,
    perceivedValue: updatedPerceivedValue,
    hiddenTraits: updatedHiddenTraits,
    revealedTraits: updatedRevealedTraits,
  };

  const result: InsightResult = {
    essenceGained,
    isEpiphany,
    energyRefunded: isEpiphany,
    bonusEssence,
    extractedAmount,
    remainingKnowledge: pool.capacity - newExtracted,
    rangeNarrowed,
    newRange,
    valueLocked,
    traitDiscovered,
    lockedValue: valueLocked ? workingItem.realValue : undefined,
    // v1.1 新增
    unexpectedEvent,
    glimpse,
    resonance,
  };

  return { result, updatedItem };
}

// ============================================================================
// 顿悟系统
// ============================================================================

/**
 * 检查物品是否即将触发顿悟
 */
export function isNearEpiphany(item: Item): boolean {
  if (!item.knowledgePool) return false;

  const config = getInsightConfig();
  const remaining = getRemainingKnowledge(item);

  return remaining > 0 && remaining <= config.extractionRateMax;
}

/**
 * 计算达到顿悟还需要多少次格物
 * 使用最大产出的乐观估计
 */
export function getInsightsToEpiphany(item: Item): number {
  if (!item.knowledgePool) {
    const config = getInsightConfig();
    return Math.ceil(config.defaultCapacity / config.extractionRateMax);
  }

  const remaining = getRemainingKnowledge(item);
  if (remaining <= 0) return 0;

  const config = getInsightConfig();
  return Math.ceil(remaining / config.extractionRateMax);
}

// ============================================================================
// 叙事生成
// ============================================================================

/**
 * 根据物品和结果生成格物叙事
 * 所有叙事文本从 CSV 文件加载 (assets/data/texts/insight_texts.csv)
 */
export function getInsightNarrative(
  item: Item,
  result: InsightResult
): InsightNarrative {
  const tags = item.tags || [];
  const vars = { item_name: item.name };
  const texts = getTexts();

  // 基础行为描述
  let actionText = texts.getWithVars('action_default', vars)
    || `你在灯下仔细端详着${item.name}...`;

  // S3-C3: 意外事件覆盖行为描述（从多样化文案中随机选择）
  if (result.unexpectedEvent === 'DISTRACTION') {
    actionText = texts.getRandom('distraction') || actionText;
  } else if (result.unexpectedEvent === 'REMARKABLE_FIND') {
    actionText = texts.getRandomWithVars('remarkable', vars) || actionText;
  }

  // 根据标签生成发现描述（优先级：按标签顺序尝试）
  const discoveryKeys = buildDiscoveryKeys(tags);
  const discoveryText = texts.resolve(discoveryKeys)
    || '你从中获得了一些领悟。';

  // 顿悟描述 (S3-C1: 物品类型专属独白)
  let epiphanyText: string | undefined;
  if (result.isEpiphany) {
    const epiphanyKeys = buildEpiphanyKeys(item, tags);
    epiphanyText = texts.resolve(epiphanyKeys, vars);

    if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
      const suffix = texts.get('pawn_active_suffix')
        || '...只是，这件物品的主人还在等着它。';
      epiphanyText = (epiphanyText || '') + '\n' + suffix;
    }
  }

  return {
    actionText,
    discoveryText,
    epiphanyText,
  };
}

// ============================================================================
// 文本查找键构建 (Key Builders)
// ============================================================================

/** 标签发现文本的查找键优先级 */
const DISCOVERY_TAG_ORDER = ['MECHANICAL', 'GOLD', 'VINTAGE_REAL', 'SENTIMENTAL', 'ARTISTIC'] as const;

function buildDiscoveryKeys(tags: string[]): string[] {
  const keys: string[] = [];
  for (const tag of DISCOVERY_TAG_ORDER) {
    if (tags.includes(tag)) {
      keys.push(`discovery:${tag}`);
    }
  }
  keys.push('discovery:_default');
  return keys;
}

/**
 * 构建顿悟文本查找键 — 复现原始优先级逻辑：
 * MECHANICAL+钟表 > GOLD(非MECHANICAL) > ARTISTIC(非VINTAGE_REAL) >
 * VINTAGE_REAL+ARTISTIC > VINTAGE_REAL > SENTIMENTAL > TRENDY >
 * category > _default
 */
function buildEpiphanyKeys(item: Item, tags: string[]): string[] {
  const keys: string[] = [];
  const cat = item.category;
  const nameHasWatch = item.name.includes('表');

  // Tag-based keys (most specific combos first)
  if (tags.includes('MECHANICAL') && (cat === '钟表' || nameHasWatch)) {
    keys.push('epiphany:MECHANICAL:钟表');
  }
  if (tags.includes('GOLD') && !tags.includes('MECHANICAL')) {
    keys.push('epiphany:GOLD');
  }
  if (tags.includes('ARTISTIC') && !tags.includes('VINTAGE_REAL')) {
    keys.push('epiphany:ARTISTIC');
  }
  if (tags.includes('VINTAGE_REAL') && tags.includes('ARTISTIC')) {
    keys.push('epiphany:VINTAGE_REAL:ARTISTIC');
  }
  if (tags.includes('VINTAGE_REAL')) {
    keys.push('epiphany:VINTAGE_REAL');
  }
  if (tags.includes('SENTIMENTAL')) {
    keys.push('epiphany:SENTIMENTAL');
  }
  if (tags.includes('TRENDY')) {
    keys.push('epiphany:TRENDY');
  }

  // Category-based keys
  keys.push(`epiphany:cat:${cat}`);

  // Fallback
  keys.push('epiphany:_default');

  return keys;
}

/**
 * 构建窥见文本查找键 — 累积所有匹配的标签和类别
 * 原始逻辑: 收集所有匹配标签的窥见文本，无匹配时用默认
 */
function buildGlimpseKeys(item: Item, tags: string[]): string[] {
  const keys: string[] = [];
  const cat = item.category;
  const nameHasWatch = item.name.includes('表');

  // Tag-based keys (accumulative)
  if (tags.includes('MECHANICAL') && (cat === '钟表' || nameHasWatch)) {
    keys.push('glimpse:MECHANICAL:钟表');
  }
  if (tags.includes('GOLD')) {
    keys.push('glimpse:GOLD');
  }
  if (tags.includes('VINTAGE_REAL')) {
    keys.push('glimpse:VINTAGE_REAL');
  }
  if (tags.includes('SENTIMENTAL')) {
    keys.push('glimpse:SENTIMENTAL');
  }
  if (tags.includes('ARTISTIC')) {
    keys.push('glimpse:ARTISTIC');
  }
  if (tags.includes('TRENDY')) {
    keys.push('glimpse:TRENDY');
  }

  // Category-based keys
  keys.push(`glimpse:cat:${cat}`);

  return keys;
}

/**
 * S3-C2: 窥见碎片文案
 * 从 CSV 加载，按标签累积收集
 */
function getGlimpseTexts(item: Item, tags: string[]): string[] {
  const vars = { item_name: item.name };
  const keys = buildGlimpseKeys(item, tags);
  const texts = getTexts();

  const glimpses = texts.collectAll(keys, 'glimpse:_default', vars);

  // Should never be empty due to _default fallback, but guard anyway
  if (glimpses.length === 0) {
    return [`...恍惚间，你似乎看到了${item.name}过去的影子...`];
  }
  return glimpses;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取格物受阻原因的显示文本
 * 从 CSV 加载 (key: block:REASON)
 */
export function getBlockReasonText(reason: InsightBlockReason): string {
  const texts = getTexts();
  return texts.get(`block:${reason}`)
    || texts.get('block:_default')
    || '无法研究';
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
