/**
 * 工作台系统核心逻辑 (Workshop System Logic)
 *
 * 提供工作台操作的核心函数：
 * - 检查配方是否可以应用
 * - 计算实际成本
 * - 执行修复/伪造/重铸操作
 * - 生成叙事文本（含凝视时刻）
 * - 违约风险预警（伪造/重铸）
 * - 标签叠加公式（递减加法）
 * - 精魄 3:1 转换
 */

import { Item, ItemStatus, WorkState } from '../items/types';
import { ItemTag, StateTag, EssenceTag, STATE_TAGS } from '../items/tags';
import { EssenceBalance, EssenceCost, EssenceType } from '../economy/essence';
import { NightState } from '../game/types';
import { addTag, removeTag, hasTags, hasAnyTag, calculateTaggedValue } from '../items/tagUtils';
import { canAfford, getDeficit, spendEssenceBatch } from '../economy/essenceUtils';
import type { PerceptionTier } from './perceptionTier';
import {
  Recipe,
  RecipeType,
  RestoreRecipe,
  ReforgeRecipe,
  CounterfeitRecipe,
  RecipeStatus,
  WorkshopResult,
  WorkshopNarrative,
  WorkshopBlockReason,
  ViolationWarning,
  ReforgeQuality,
  QualityOutcome,
  SurpriseDiscovery,
  InProgressRecipe,
  isRestoreRecipe,
  isReforgeRecipe,
  isCounterfeitRecipe,
} from './types';
import { getRecipeById } from './recipes';
import { createTextRegistry, TextRegistry } from '../utils/textRegistry';
import workshopTextsCSV from '@/assets/data/texts/workshop_texts.csv?raw';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// 文本注册表 (从 CSV 加载叙事文本)
// ============================================================================

let workshopTexts: TextRegistry | null = null;

function getTexts(): TextRegistry {
  if (!workshopTexts) {
    workshopTexts = createTextRegistry('workshop', workshopTextsCSV);
  }
  return workshopTexts;
}

// ============================================================================
// 标签叠加公式（设计文档 §5.5）
// ============================================================================

/**
 * 计算标签叠加后的最终价值系数
 *
 * 使用递减加法：max(标签系数) + (次高标签系数 - 1.0) * 0.5
 * 硬上限：x5.0
 *
 * @param tagMultipliers 所有有效标签的价值系数数组
 * @returns 最终合成系数
 */
export function calculateTagStackMultiplier(tagMultipliers: number[]): number {
  if (tagMultipliers.length === 0) return 1.0;
  if (tagMultipliers.length === 1) return tagMultipliers[0];
  const sorted = [...tagMultipliers].sort((a, b) => b - a);
  const result = sorted[0] + (sorted[1] - 1.0) * 0.5;
  return Math.min(result, 5.0); // 硬上限 x5.0
}

// ============================================================================
// 精魄 3:1 转换（设计文档 §5.8）
// ============================================================================

/**
 * 将一种精魄转换为另一种精魄，转换比率 3:1
 *
 * @param from 源精魄类型
 * @param to 目标精魄类型
 * @param amount 目标精魄数量（消耗 = amount * 3）
 * @param balance 当前精魄余额
 * @returns { success, newBalance }
 */
export function convertEssence(
  from: EssenceType,
  to: EssenceType,
  amount: number,
  balance: EssenceBalance
): { success: boolean; newBalance: EssenceBalance } {
  if (from === to || amount <= 0) {
    return { success: false, newBalance: balance };
  }

  const ratio = GAME_CONFIG.WORKSHOP.ESSENCE_CONVERSION.RATIO;
  const cost = amount * ratio;
  const fromKey = from.toLowerCase() as keyof EssenceBalance;
  const toKey = to.toLowerCase() as keyof EssenceBalance;

  if (balance[fromKey] < cost) {
    return { success: false, newBalance: balance };
  }

  return {
    success: true,
    newBalance: {
      ...balance,
      [fromKey]: balance[fromKey] - cost,
      [toKey]: balance[toKey] + amount,
    },
  };
}

// ============================================================================
// 路线确认提示 (Route Confirmation Prompts - #63)
// ============================================================================

export interface RouteConfirmation {
  /** 叙事化确认文本 (physical explanation of irreversibility) */
  text: string;
  /** 路线类型 */
  route: RecipeType;
  /** 风险等级: low (修复), high (伪造), medium (重铸) */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 获取路线确认提示
 * 当物品首次选择某条路线时，返回叙事化的确认文本，
 * 解释该操作的物理不可逆性（非机械性警告）。
 *
 * 仅在物品 workState === 'DEFAULT' 时触发（首次路线选择）
 */
export function getRouteConfirmation(
  route: RecipeType,
  item: Item,
): RouteConfirmation | null {
  // Only show confirmation on first route selection (item not yet committed)
  if (item.workState && item.workState !== 'DEFAULT') {
    return null;
  }

  const texts = getTexts();

  switch (route) {
    case 'RESTORE':
      return {
        text: texts.get('route_confirm:restore')
          || '保护层一旦涂上，就没有回头路了。物品将无法再进行做旧或结构改造。',
        route: 'RESTORE',
        riskLevel: 'low',
      };
    case 'COUNTERFEIT':
      return {
        text: texts.get('route_confirm:counterfeit')
          || '化学做旧会吞噬原本的纹路...一旦动手，真正的历史将被永久覆盖。',
        route: 'COUNTERFEIT',
        riskLevel: 'high',
      };
    case 'REFORGE':
      return {
        text: texts.get('route_confirm:reforge')
          || '拆开之后，它就不再是原来的那件东西了。重铸意味着不可逆的改变。',
        route: 'REFORGE',
        riskLevel: 'medium',
      };
  }
}

// ============================================================================
// 配方检查
// ============================================================================

/**
 * 检查配方是否可以应用于物品
 * @param currentDay 当前天数（可选，用于检查 minDay 解锁条件）
 */
export function getRecipeStatus(
  recipe: Recipe,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  currentDay?: number
): RecipeStatus {
  // 计算实际成本
  const actualCost = calculateActualCost(recipe, item);
  const affordable = canAfford(essenceBalance, actualCost);
  const deficit = affordable ? undefined : getDeficit(essenceBalance, actualCost);

  // 检查各种阻止条件
  const blockReason = checkBlockReason(recipe, item, nightState, currentDay);

  // 提取概率信息（仅重铸配方）
  const reforgeRecipe = isReforgeRecipe(recipe) ? recipe : null;
  const isProbabilistic = reforgeRecipe?.probabilistic ?? false;
  const qualityOutcomes = isProbabilistic ? reforgeRecipe?.qualityOutcomes : undefined;

  return {
    canApply: blockReason === null && affordable && nightState.energy >= recipe.energyCost,
    reason: blockReason || (nightState.energy < recipe.energyCost ? 'NO_ENERGY' : (!affordable ? 'NO_ESSENCE' : undefined)),
    actualCost,
    canAfford: affordable,
    deficit,
    isProbabilistic,
    qualityOutcomes,
  };
}

/**
 * 检查阻止原因（不包括成本检查）
 */
function checkBlockReason(
  recipe: Recipe,
  item: Item,
  nightState: NightState,
  currentDay?: number
): WorkshopBlockReason | null {
  // 物品状态检查
  if (item.status === ItemStatus.REDEEMED) return 'ITEM_REDEEMED';
  if (item.status === ItemStatus.SOLD) return 'ITEM_SOLD';

  // 精力检查
  if (nightState.energy < recipe.energyCost) return 'NO_ENERGY';

  if (isRestoreRecipe(recipe)) {
    return checkRestoreBlockReason(recipe, item);
  } else if (isCounterfeitRecipe(recipe)) {
    return checkCounterfeitBlockReason(recipe, item);
  } else if (isReforgeRecipe(recipe)) {
    return checkReforgeBlockReason(recipe, item, currentDay);
  }

  return null;
}

/**
 * 检查修复配方的阻止原因
 */
function checkRestoreBlockReason(
  recipe: RestoreRecipe,
  item: Item
): WorkshopBlockReason | null {
  const tags = item.tags || [];

  // 互斥检查 - 已被重铸或伪造的物品不能修复
  if (item.workState === 'REFORGED') return 'ALREADY_REFORGED';
  if (item.workState === 'FORGED') return 'ALREADY_FORGED';

  // 全面翻新配方：检查物品是否有任何负面标签
  if (recipe.targetAll) {
    const hasNegative = STATE_TAGS.some(tag => tags.includes(tag));
    if (!hasNegative) {
      return 'MISSING_TAG';
    }
    return null;
  }

  // 单目标配方：检查是否有目标标签
  if (recipe.targetTag && !tags.includes(recipe.targetTag)) {
    return 'MISSING_TAG';
  }

  // 检查前置标签（如艺术修复需要 ARTISTIC）
  if (recipe.requiredTags && recipe.requiredTags.length > 0) {
    if (!hasTags(item, recipe.requiredTags)) {
      return 'MISSING_REQUIRED';
    }
  }

  return null;
}

/**
 * 检查伪造配方的阻止原因
 */
function checkCounterfeitBlockReason(
  recipe: CounterfeitRecipe,
  item: Item
): WorkshopBlockReason | null {
  // 互斥检查 - 三选一
  if (item.workState === 'RESTORED') return 'ALREADY_RESTORED';
  if (item.workState === 'REFORGED') return 'ALREADY_REFORGED';
  if (item.workState === 'FORGED') return 'ALREADY_FORGED';

  // 检查类别
  if (recipe.requiredCategories && recipe.requiredCategories.length > 0) {
    if (!recipe.requiredCategories.includes(item.category)) {
      return 'WRONG_CATEGORY';
    }
  }

  // 检查排除标签
  if (recipe.excludedTags && recipe.excludedTags.length > 0) {
    const tags = item.tags || [];
    if (recipe.excludedTags.some(tag => tags.includes(tag as ItemTag))) {
      return 'HAS_EXCLUDED';
    }
  }

  // 已伪造过
  if (item.wasForged) return 'ALREADY_FORGED';

  return null;
}

/**
 * 检查重铸配方的阻止原因
 */
function checkReforgeBlockReason(
  recipe: ReforgeRecipe,
  item: Item,
  currentDay?: number
): WorkshopBlockReason | null {
  // 检查最低天数解锁条件
  if (recipe.minDay != null && currentDay != null && currentDay < recipe.minDay) {
    return 'NOT_UNLOCKED';
  }

  // 互斥检查 - 三选一
  if (item.workState === 'RESTORED') return 'ALREADY_RESTORED';
  if (item.workState === 'FORGED') return 'ALREADY_FORGED';

  // 检查前置标签
  if (recipe.requiredTags && recipe.requiredTags.length > 0) {
    if (!hasTags(item, recipe.requiredTags)) {
      return 'MISSING_REQUIRED';
    }
  }

  // 检查排除标签
  if (recipe.excludedTags && recipe.excludedTags.length > 0) {
    if (hasAnyTag(item, recipe.excludedTags)) {
      return 'HAS_EXCLUDED';
    }
  }

  // 检查类别
  if (recipe.requiredCategories && recipe.requiredCategories.length > 0) {
    if (!recipe.requiredCategories.includes(item.category)) {
      return 'WRONG_CATEGORY';
    }
  }

  // 检查是否已经重铸过
  if (item.wasReforged) {
    return 'ALREADY_REFORGED';
  }

  return null;
}

// ============================================================================
// 成本计算
// ============================================================================

/**
 * 计算配方的实际成本
 *
 * 动态调整规则：
 * - 多个 G1 负面标签 → 每个额外标签 +20% 成本
 * - 高价值物品（realValue > 阈值）→ 成本 +30%
 * - 已有部分修复（wasRestored）→ 修复类配方成本减半
 */
export function calculateActualCost(recipe: Recipe, item: Item): EssenceCost {
  const config = GAME_CONFIG.WORKSHOP;
  let multiplier = 1.0;

  // 多个 G1 负面标签：第一个免费，之后每个额外标签 +20%
  const tags = item.tags || [];
  const negativeTagCount = STATE_TAGS.filter(tag => tags.includes(tag)).length;
  if (negativeTagCount > 1) {
    multiplier += (negativeTagCount - 1) * config.EXTRA_NEGATIVE_TAG_COST_RATIO;
  }

  // 高价值物品加成
  if (item.realValue > config.HIGH_VALUE_THRESHOLD) {
    multiplier += config.HIGH_VALUE_COST_RATIO;
  }

  // 已有部分修复：修复类配方享受折扣
  if (item.wasRestored && isRestoreRecipe(recipe)) {
    multiplier *= (1 - config.PARTIAL_RESTORE_DISCOUNT);
  }

  // 如果没有调整，直接返回原始成本
  if (multiplier === 1.0) {
    return recipe.baseCost;
  }

  // 应用乘数到每个精魄类型
  const result: EssenceCost = {};
  if (recipe.baseCost.craft) result.craft = Math.ceil(recipe.baseCost.craft * multiplier);
  if (recipe.baseCost.time) result.time = Math.ceil(recipe.baseCost.time * multiplier);
  if (recipe.baseCost.vibe) result.vibe = Math.ceil(recipe.baseCost.vibe * multiplier);

  return result;
}

// ============================================================================
// 违约风险预警
// ============================================================================

/**
 * 获取伪造违约风险预警
 * 当物品仍在当期(ACTIVE)时，伪造属于硬违约
 */
export function getCounterfeitViolationWarning(item: Item): ViolationWarning | null {
  if (item.status !== ItemStatus.ACTIVE) {
    return null;
  }

  const principal = item.pawnInfo?.principal || item.pawnAmount;
  const compensationAmount = Math.ceil(principal * GAME_CONFIG.WORKSHOP.BREACH_COMPENSATION_MULTIPLIER);

  const repConfig = GAME_CONFIG.WORKSHOP.REPUTATION;
  const texts = getTexts();
  const vars = { item_name: item.name };

  let intuitionText: string;
  if (item.relatedChainId) {
    intuitionText = texts.getWithVars('violation:counterfeit:related', vars)
      || `这件${item.name}的主人还在等着赎回...你脑海中浮现出他的脸。伪造它，就是彻底的背叛。`;
  } else {
    intuitionText = texts.get('violation:counterfeit:generic')
      || '伪造受托之物...这不是冒险，是预谋。';
  }

  return {
    compensationAmount,
    reputationLoss: {
      humanity: repConfig.counterfeit_breach_humanity ?? -15,
      credibility: repConfig.counterfeit_breach_credibility ?? -12,
      innocence: repConfig.counterfeit_breach_innocence ?? -5,
    },
    intuitionText,
    isActive: true,
  };
}

/**
 * 获取重铸不确定性提示
 * 当物品仍在当期(ACTIVE)时，重铸归还结果不确定
 */
export function getViolationWarning(item: Item): ViolationWarning | null {
  if (item.status !== ItemStatus.ACTIVE) {
    return null;
  }

  const principal = item.pawnInfo?.principal || item.pawnAmount;
  const compensationAmount = Math.ceil(principal * GAME_CONFIG.WORKSHOP.BREACH_COMPENSATION_MULTIPLIER);

  const texts = getTexts();
  const vars = { item_name: item.name };
  let intuitionText: string;
  if (item.relatedChainId) {
    intuitionText = texts.getWithVars('violation:related', vars) || `这件${item.name}的主人还在等着它...你脑海中浮现出他的脸。`;
  } else {
    intuitionText = texts.get('violation:generic') || '这件物品对某人来说可能意义非凡...';
  }

  return {
    compensationAmount,
    reputationLoss: {
      humanity: GAME_CONFIG.WORKSHOP.BREACH_HUMANITY_LOSS,
      credibility: GAME_CONFIG.WORKSHOP.BREACH_CREDIBILITY_LOSS,
    },
    intuitionText,
    isActive: true,
  };
}

// ============================================================================
// 执行操作
// ============================================================================

/**
 * 执行修复操作
 */
export function performRestore(
  recipe: RestoreRecipe,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  perceptionTier?: PerceptionTier
): { result: WorkshopResult; updatedItem: Item; newBalance: EssenceBalance } | null {
  const status = getRecipeStatus(recipe, item, essenceBalance, nightState);
  if (!status.canApply) {
    return null;
  }

  // 扣除精魄
  const newBalance = spendEssenceBatch(essenceBalance, status.actualCost);
  if (!newBalance) return null;

  let updatedItem = { ...item };
  const removedTags: ItemTag[] = [];

  if (recipe.targetAll) {
    // 全面翻新：移除所有负面标签
    const tags = item.tags || [];
    for (const tag of STATE_TAGS) {
      if (tags.includes(tag)) {
        updatedItem = removeTag(updatedItem, tag);
        removedTags.push(tag);
      }
    }
  } else if (recipe.targetTag) {
    // 单目标：移除特定标签
    updatedItem = removeTag(updatedItem, recipe.targetTag);
    removedTags.push(recipe.targetTag);
  }

  // 添加结果标签（如果有）
  if (recipe.resultTag) {
    updatedItem = addTag(updatedItem, recipe.resultTag);
  }

  // 标记已修复，设置加工状态
  updatedItem = { ...updatedItem, wasRestored: true, workState: 'RESTORED' as WorkState };

  // 计算价值变化
  const oldValue = calculateTaggedValue(item);
  const newValue = calculateTaggedValue(updatedItem);
  const valueIncrease = newValue - oldValue;

  // 生成叙事
  const narrative = generateRestoreNarrative(recipe, item, perceptionTier);

  const result: WorkshopResult = {
    success: true,
    type: 'RESTORE',
    recipeId: recipe.id,
    essenceSpent: status.actualCost,
    energySpent: recipe.energyCost,
    removedTags,
    addedTags: recipe.resultTag ? [recipe.resultTag] : undefined,
    newValue,
    valueIncrease,
    narrative,
  };

  return { result, updatedItem, newBalance };
}

/**
 * 执行伪造操作
 *
 * 伪造流程：
 * 1. 检查互斥（已 RESTORED/REFORGED/FORGED 不可伪造）
 * 2. 扣除精魄（以旧影为主 80-90%）
 * 3. 添加虚假标签（resultTag）
 * 4. 切换 variant 到 forged_state
 * 5. 设置 wasForged=true, workState='FORGED'
 * 6. 生成叙事文本
 */
export function performCounterfeit(
  recipe: CounterfeitRecipe,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  perceptionTier?: PerceptionTier
): { result: WorkshopResult; updatedItem: Item; newBalance: EssenceBalance } | null {
  const status = getRecipeStatus(recipe, item, essenceBalance, nightState);
  if (!status.canApply) {
    return null;
  }

  // 扣除精魄
  const newBalance = spendEssenceBatch(essenceBalance, status.actualCost);
  if (!newBalance) return null;

  // 添加虚假标签
  let updatedItem = addTag(item, recipe.resultTag as ItemTag);

  // 设置伪造状态
  updatedItem = {
    ...updatedItem,
    wasForged: true,
    workState: 'FORGED' as WorkState,
  };

  // 计算伪造后价值（使用 valueMultiplier，无折扣）
  const baseValue = item.baseValue ?? item.realValue;
  const newValue = Math.round(baseValue * recipe.valueMultiplier);
  const valueIncrease = newValue - item.realValue;

  // 生成叙事
  const narrative = generateCounterfeitNarrative(recipe, item, perceptionTier);

  const result: WorkshopResult = {
    success: true,
    type: 'COUNTERFEIT',
    recipeId: recipe.id,
    essenceSpent: status.actualCost,
    energySpent: recipe.energyCost,
    addedTags: [recipe.resultTag as ItemTag],
    newValue,
    valueIncrease,
    narrative,
    isCounterfeit: true,
    counterfeitValueMultiplier: recipe.valueMultiplier,
  };

  return { result, updatedItem, newBalance };
}

/**
 * 执行重铸操作
 * @param currentDay 当前天数（可选，用于 minDay 检查）
 */
export function performReforge(
  recipe: ReforgeRecipe,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  currentDay?: number,
  perceptionTier?: PerceptionTier
): { result: WorkshopResult; updatedItem: Item; newBalance: EssenceBalance } | null {
  const status = getRecipeStatus(recipe, item, essenceBalance, nightState, currentDay);
  if (!status.canApply) {
    return null;
  }

  // 扣除精魄（无论成功与否，精魄都会消耗）
  const newBalance = spendEssenceBatch(essenceBalance, status.actualCost);
  if (!newBalance) return null;

  // 概率配方：先掷骰决定品质
  let reforgeQuality: ReforgeQuality | undefined;
  let qualityMultiplier: number | undefined;

  if (recipe.probabilistic && recipe.qualityOutcomes) {
    const outcome = rollQualityOutcome(recipe.qualityOutcomes);
    reforgeQuality = outcome.quality;
    qualityMultiplier = outcome.valueMultiplier;
  }

  // FAILED 结果：精魄消耗但物品不变
  if (reforgeQuality === 'FAILED') {
    const narrative = generateReforgeNarrative(recipe, item, reforgeQuality, perceptionTier);

    const result: WorkshopResult = {
      success: false,
      type: 'REFORGE',
      recipeId: recipe.id,
      essenceSpent: status.actualCost,
      energySpent: recipe.energyCost,
      narrative,
      reforgeQuality,
      qualityMultiplier: 0,
    };

    // Item is unchanged except we mark the failed attempt
    // (wasReforged stays false so player can retry)
    return { result, updatedItem: item, newBalance };
  }

  // 添加结果标签
  let updatedItem = addTag(item, recipe.resultTag);

  // 标记已重铸，设置加工状态和品质
  updatedItem = {
    ...updatedItem,
    wasReforged: true,
    workState: 'REFORGED' as WorkState,
    reforgeQuality,
  };

  // 计算价值变化（考虑品质修正）
  const oldValue = calculateTaggedValue(item);
  let newValue = calculateTaggedValue(updatedItem);

  // 应用品质系数修正
  if (qualityMultiplier != null && qualityMultiplier !== 1.0) {
    const baseValue = updatedItem.baseValue ?? updatedItem.realValue;
    const taggedValue = newValue;
    const valueFromTags = taggedValue - baseValue;
    // Apply quality multiplier to the tag-added value portion
    newValue = Math.round(baseValue + valueFromTags * qualityMultiplier);
  }

  const valueIncrease = newValue - oldValue;

  // 意外发现检查
  let surpriseDiscovery: SurpriseDiscovery | undefined;
  if (recipe.surpriseDiscoveryChance && Math.random() < recipe.surpriseDiscoveryChance) {
    surpriseDiscovery = rollSurpriseDiscovery(updatedItem);
    if (surpriseDiscovery) {
      updatedItem = addTag(updatedItem, surpriseDiscovery.tag);
    }
  }

  // 生成叙事
  const narrative = generateReforgeNarrative(recipe, item, reforgeQuality, perceptionTier);

  const result: WorkshopResult = {
    success: true,
    type: 'REFORGE',
    recipeId: recipe.id,
    essenceSpent: status.actualCost,
    energySpent: recipe.energyCost,
    addedTags: [recipe.resultTag],
    newValue,
    valueIncrease,
    narrative,
    reforgeQuality,
    qualityMultiplier,
    surpriseDiscovery,
  };

  return { result, updatedItem, newBalance };
}

/**
 * 通用执行函数
 * @param currentDay 当前天数（可选，用于 minDay 检查和概率配方）
 */
export function performWorkshop(
  recipeId: string,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  currentDay?: number,
  perceptionTier?: PerceptionTier
): { result: WorkshopResult; updatedItem: Item; newBalance: EssenceBalance } | null {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return null;

  if (isRestoreRecipe(recipe)) {
    return performRestore(recipe, item, essenceBalance, nightState, perceptionTier);
  } else if (isCounterfeitRecipe(recipe)) {
    return performCounterfeit(recipe, item, essenceBalance, nightState, perceptionTier);
  } else if (isReforgeRecipe(recipe)) {
    return performReforge(recipe, item, essenceBalance, nightState, currentDay, perceptionTier);
  }

  return null;
}

// ============================================================================
// 叙事生成 (凝视时刻文本从 CSV 加载)
// ============================================================================

/**
 * 生成修复操作的叙事（含凝视时刻）
 */
function generateRestoreNarrative(recipe: RestoreRecipe, item: Item, perceptionTier?: PerceptionTier): WorkshopNarrative {
  const texts = getTexts();
  const vars = { item_name: item.name };

  let actionText: string;
  let resultText: string;

  if (recipe.targetAll) {
    actionText = texts.getWithVars('narrative:restore:all:action', vars) || `你准备了全套工具，开始对${item.name}进行彻底的翻新修复...`;
    resultText = texts.get('narrative:restore:all:result') || '所有瑕疵被一一清除，物品焕然一新。';
  } else {
    // Try specific key with required tag variant first, then tag-only, then default
    const tag = recipe.targetTag || '_default';
    const hasArtistic = recipe.requiredTags?.includes('ARTISTIC');
    const actionKeys = hasArtistic
      ? [`narrative:restore:${tag}:ARTISTIC:action`, `narrative:restore:${tag}:action`, 'narrative:restore:_default:action']
      : [`narrative:restore:${tag}:action`, 'narrative:restore:_default:action'];
    const resultKeys = hasArtistic
      ? [`narrative:restore:${tag}:ARTISTIC:result`, `narrative:restore:${tag}:result`, 'narrative:restore:_default:result']
      : [`narrative:restore:${tag}:result`, 'narrative:restore:_default:result'];

    actionText = texts.resolve(actionKeys, vars) || `你开始修复${item.name}...`;
    resultText = texts.resolve(resultKeys) || '修复完成。';
  }

  const gazeText = (perceptionTier && texts.getRandom(`gaze:restore:${perceptionTier}`))
    || texts.getRandom('gaze:restore') || '修复完成。';

  return { actionText, resultText, gazeText };
}

/**
 * 生成伪造操作的叙事（含凝视时刻）
 */
function generateCounterfeitNarrative(recipe: CounterfeitRecipe, item: Item, perceptionTier?: PerceptionTier): WorkshopNarrative {
  const texts = getTexts();
  const vars = { item_name: item.name };

  const tag = recipe.resultTag;
  const actionText = texts.resolve([`narrative:counterfeit:${tag}:action`, 'narrative:counterfeit:_default:action'], vars)
    || `你开始为${item.name}伪造历史...`;

  const resultText = texts.resolve([`narrative:counterfeit:${tag}:result`, 'narrative:counterfeit:_default:result'])
    || '赝品制成。谎言被精心编织在每一道纹路中。';

  // 伪造当期物品的道德提醒
  let moralNote: string | undefined;
  if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
    moralNote = texts.getWithVars('moral:counterfeit:active', vars)
      || `...这件物品的主人还在等着赎回。伪造它，意味着彻底的背叛。`;
  }

  const gazeText = (perceptionTier && texts.getRandom(`gaze:counterfeit:${perceptionTier}`))
    || texts.getRandom('gaze:counterfeit') || '赝品在灯光下闪烁，和真品别无二致。';

  return { actionText, resultText, moralNote, gazeText };
}

/**
 * 生成重铸操作的叙事（含凝视时刻）
 */
function generateReforgeNarrative(recipe: ReforgeRecipe, item: Item, quality?: ReforgeQuality, perceptionTier?: PerceptionTier): WorkshopNarrative {
  const texts = getTexts();
  const vars = { item_name: item.name };

  // Try specific result tag key, then default
  const tag = recipe.resultTag;
  const actionText = texts.resolve([`narrative:reforge:${tag}:action`, 'narrative:reforge:_default:action'], vars)
    || `你开始为${item.name}注入新的故事...`;

  // Quality-specific result text
  let resultText: string;
  if (quality) {
    resultText = texts.resolve(
      [`narrative:reforge:quality:${quality}`, `narrative:reforge:${tag}:result`, 'narrative:reforge:_default:result']
    ) || getDefaultQualityText(quality);
  } else {
    resultText = texts.resolve([`narrative:reforge:${tag}:result`, 'narrative:reforge:_default:result'])
      || '物品被赋予了新的"身份"。';
  }

  // 微妙的道德提醒（不做评判）
  let moralNote: string | undefined;
  if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
    moralNote = texts.getWithVars('moral:active', vars)
      || `...这件物品的主人还在等着它。当他赎回时，会看到一个不一样的${item.name}。`;
  }

  const gazeText = (perceptionTier && texts.getRandom(`gaze:reforge:${perceptionTier}`))
    || texts.getRandom('gaze:reforge') || '重铸完成。';

  return { actionText, resultText, moralNote, gazeText };
}

// ============================================================================
// 概率系统 (Probabilistic Reforge - 设计文档 §5.6)
// ============================================================================

/**
 * 根据品质分布掷骰，返回最终品质
 */
export function rollQualityOutcome(outcomes: QualityOutcome[]): QualityOutcome {
  const roll = Math.random();
  let cumulative = 0;

  for (const outcome of outcomes) {
    cumulative += outcome.probability;
    if (roll < cumulative) {
      return outcome;
    }
  }

  // Fallback: return last outcome (handles floating point rounding)
  return outcomes[outcomes.length - 1];
}

/**
 * 意外发现：小概率在重铸时发现隐藏属性标签
 */
function rollSurpriseDiscovery(item: Item): SurpriseDiscovery | null {
  const currentTags = item.tags || [];

  // 候选：物品尚未拥有的属性标签
  const candidateTags: ItemTag[] = (
    ['VINTAGE_REAL', 'ARTISTIC', 'SENTIMENTAL'] as ItemTag[]
  ).filter(tag => !currentTags.includes(tag));

  if (candidateTags.length === 0) {
    return null;
  }

  const chosen = candidateTags[Math.floor(Math.random() * candidateTags.length)];

  const descriptions: Record<string, string> = {
    VINTAGE_REAL: '在重铸过程中，你发现了物品上被掩盖的年代痕迹——这是真正的古物。',
    ARTISTIC: '重铸时，你注意到物品暗藏的精妙工艺——这出自名匠之手。',
    SENTIMENTAL: '物品内侧隐约可见一段刻字——某人曾深深珍视它。',
  };

  return {
    tag: chosen,
    description: descriptions[chosen] || '你在重铸中意外发现了物品的隐藏属性。',
  };
}

/**
 * 品质等级的默认叙事文本
 */
function getDefaultQualityText(quality: ReforgeQuality): string {
  switch (quality) {
    case 'MASTERWORK':
      return '超乎预期的杰作！每一处细节都浑然天成，连你自己都为之惊叹。';
    case 'NORMAL':
      return '物品被赋予了新的"身份"。';
    case 'FLAWED':
      return '成品有些瑕疵...仔细看还是能发现不自然的痕迹。但也许能骗过外行。';
    case 'FAILED':
      return '重铸失败了。精魄消散在空气中，物品纹丝未动。也许下次运气会好些。';
  }
}

/**
 * 获取品质等级的显示名称
 */
export function getQualityDisplayName(quality: ReforgeQuality): string {
  switch (quality) {
    case 'MASTERWORK': return '精品';
    case 'NORMAL': return '普通';
    case 'FLAWED': return '次品';
    case 'FAILED': return '失败';
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取阻止原因的显示文本
 */
export function getBlockReasonText(reason: WorkshopBlockReason): string {
  const texts = getTexts();
  return texts.resolve([`block:${reason}`, 'block:_default']) || '无法操作';
}

// ============================================================================
// 多夜工序辅助函数 (Multi-Night Recipe Helpers)
// ============================================================================

/**
 * 检查配方是否需要多夜工序
 */
export function isMultiNightRecipe(recipe: Recipe): boolean {
  return (recipe.nightsRequired ?? 1) > 1;
}

/**
 * 获取物品当前进行中的工序（如果有）
 */
export function getInProgressRecipe(
  itemId: string,
  inProgressRecipes: InProgressRecipe[]
): InProgressRecipe | undefined {
  return inProgressRecipes.find(r => r.itemId === itemId);
}

/**
 * 检查物品是否有进行中的多夜工序
 */
export function hasInProgressRecipe(
  itemId: string,
  inProgressRecipes: InProgressRecipe[]
): boolean {
  return inProgressRecipes.some(r => r.itemId === itemId);
}
