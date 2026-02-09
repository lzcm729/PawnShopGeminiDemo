/**
 * 工作台系统核心逻辑 (Workshop System Logic)
 *
 * 提供工作台操作的核心函数：
 * - 检查配方是否可以应用
 * - 计算实际成本
 * - 执行修复/重铸操作
 * - 生成叙事文本（含凝视时刻）
 * - 违约重铸风险预警
 */

import { Item, ItemStatus, WorkState } from '../items/types';
import { ItemTag, StateTag, EssenceTag, STATE_TAGS } from '../items/tags';
import { EssenceBalance, EssenceCost } from '../economy/essence';
import { NightState } from '../game/types';
import { addTag, removeTag, hasTags, hasAnyTag, calculateTaggedValue } from '../items/tagUtils';
import { canAfford, getDeficit, spendEssenceBatch } from '../economy/essenceUtils';
import {
  Recipe,
  RestoreRecipe,
  ReforgeRecipe,
  RecipeStatus,
  WorkshopResult,
  WorkshopNarrative,
  WorkshopBlockReason,
  ViolationWarning,
  ReforgeQuality,
  QualityOutcome,
  SurpriseDiscovery,
  isRestoreRecipe,
  isReforgeRecipe,
} from './types';
import { getRecipeById } from './recipes';
import { createTextRegistry, TextRegistry } from '../utils/textRegistry';
import workshopTextsCSV from '@/assets/data/texts/workshop_texts.csv?raw';

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

  // S2-F2: 互斥检查 - 已被重铸的物品不能修复
  if (item.workState === 'REFORGED') {
    return 'ALREADY_REFORGED';
  }

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

  // S2-F2: 互斥检查 - 已被修复的物品不能重铸
  if (item.workState === 'RESTORED') {
    return 'ALREADY_RESTORED';
  }

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
 */
export function calculateActualCost(recipe: Recipe, item: Item): EssenceCost {
  return recipe.baseCost;
}

// ============================================================================
// 违约重铸风险预警 (S2-F3)
// ============================================================================

/**
 * 获取违约重铸风险预警
 * 当物品仍在当期(ACTIVE)时，重铸会触发违约
 */
export function getViolationWarning(item: Item): ViolationWarning | null {
  if (item.status !== ItemStatus.ACTIVE) {
    return null;
  }

  const principal = item.pawnInfo?.principal || item.pawnAmount;
  const compensationAmount = Math.ceil(principal * 2);

  // 商人直觉文本：有故事关联时使用情感化提示
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
    reputationLoss: { humanity: -15, credibility: -10 },
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
  nightState: NightState
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
  const narrative = generateRestoreNarrative(recipe, item);

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
 * 执行重铸操作
 * @param currentDay 当前天数（可选，用于 minDay 检查）
 */
export function performReforge(
  recipe: ReforgeRecipe,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  currentDay?: number
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
    const narrative = generateReforgeNarrative(recipe, item, reforgeQuality);

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
  const narrative = generateReforgeNarrative(recipe, item, reforgeQuality);

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
  currentDay?: number
): { result: WorkshopResult; updatedItem: Item; newBalance: EssenceBalance } | null {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return null;

  if (isRestoreRecipe(recipe)) {
    return performRestore(recipe, item, essenceBalance, nightState);
  } else if (isReforgeRecipe(recipe)) {
    return performReforge(recipe, item, essenceBalance, nightState, currentDay);
  }

  return null;
}

// ============================================================================
// 叙事生成 (凝视时刻文本 S2-F5 从 CSV 加载)
// ============================================================================

/**
 * 生成修复操作的叙事（含凝视时刻）
 */
function generateRestoreNarrative(recipe: RestoreRecipe, item: Item): WorkshopNarrative {
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

  const gazeText = texts.getRandom('gaze:restore') || '修复完成。';

  return { actionText, resultText, gazeText };
}

/**
 * 生成重铸操作的叙事（含凝视时刻）
 */
function generateReforgeNarrative(recipe: ReforgeRecipe, item: Item, quality?: ReforgeQuality): WorkshopNarrative {
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

  const gazeText = texts.getRandom('gaze:reforge') || '重铸完成。';

  return { actionText, resultText, moralNote, gazeText };
}

// ============================================================================
// 概率系统 (Probabilistic Reforge - 设计文档 8.2节)
// ============================================================================

/**
 * 根据品质分布掷骰，返回最终品质
 *
 * 使用加权随机：遍历 outcomes，累计概率，
 * 当随机值落入某个区间时返回对应品质。
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
 *
 * 从物品尚未拥有的属性标签中随机选择一个。
 * 如果物品已拥有所有属性标签，则不触发。
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

/**
 * 获取物品可用的修复配方
 */
