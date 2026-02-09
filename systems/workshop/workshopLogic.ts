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
 */
export function getRecipeStatus(
  recipe: Recipe,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState
): RecipeStatus {
  // 计算实际成本
  const actualCost = calculateActualCost(recipe, item);
  const affordable = canAfford(essenceBalance, actualCost);
  const deficit = affordable ? undefined : getDeficit(essenceBalance, actualCost);

  // 检查各种阻止条件
  const blockReason = checkBlockReason(recipe, item, nightState);

  return {
    canApply: blockReason === null && affordable && nightState.energy >= recipe.energyCost,
    reason: blockReason || (nightState.energy < recipe.energyCost ? 'NO_ENERGY' : (!affordable ? 'NO_ESSENCE' : undefined)),
    actualCost,
    canAfford: affordable,
    deficit,
  };
}

/**
 * 检查阻止原因（不包括成本检查）
 */
function checkBlockReason(
  recipe: Recipe,
  item: Item,
  nightState: NightState
): WorkshopBlockReason | null {
  // 物品状态检查
  if (item.status === ItemStatus.REDEEMED) return 'ITEM_REDEEMED';
  if (item.status === ItemStatus.SOLD) return 'ITEM_SOLD';

  // 精力检查
  if (nightState.energy < recipe.energyCost) return 'NO_ENERGY';

  if (isRestoreRecipe(recipe)) {
    return checkRestoreBlockReason(recipe, item);
  } else if (isReforgeRecipe(recipe)) {
    return checkReforgeBlockReason(recipe, item);
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
  item: Item
): WorkshopBlockReason | null {
  const tags = item.tags || [];

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
 */
export function performReforge(
  recipe: ReforgeRecipe,
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

  // 添加结果标签
  let updatedItem = addTag(item, recipe.resultTag);

  // 标记已重铸，设置加工状态
  updatedItem = { ...updatedItem, wasReforged: true, workState: 'REFORGED' as WorkState };

  // 计算价值变化
  const oldValue = calculateTaggedValue(item);
  const newValue = calculateTaggedValue(updatedItem);
  const valueIncrease = newValue - oldValue;

  // 生成叙事
  const narrative = generateReforgeNarrative(recipe, item);

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
  };

  return { result, updatedItem, newBalance };
}

/**
 * 通用执行函数
 */
export function performWorkshop(
  recipeId: string,
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState
): { result: WorkshopResult; updatedItem: Item; newBalance: EssenceBalance } | null {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return null;

  if (isRestoreRecipe(recipe)) {
    return performRestore(recipe, item, essenceBalance, nightState);
  } else if (isReforgeRecipe(recipe)) {
    return performReforge(recipe, item, essenceBalance, nightState);
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
function generateReforgeNarrative(recipe: ReforgeRecipe, item: Item): WorkshopNarrative {
  const texts = getTexts();
  const vars = { item_name: item.name };

  // Try specific result tag key, then default
  const tag = recipe.resultTag;
  const actionText = texts.resolve([`narrative:reforge:${tag}:action`, 'narrative:reforge:_default:action'], vars)
    || `你开始为${item.name}注入新的故事...`;
  const resultText = texts.resolve([`narrative:reforge:${tag}:result`, 'narrative:reforge:_default:result'])
    || '物品被赋予了新的"身份"。';

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
export function getAvailableRestoreRecipes(
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  recipes: RestoreRecipe[]
): Array<{ recipe: RestoreRecipe; status: RecipeStatus }> {
  return recipes.map(recipe => ({
    recipe,
    status: getRecipeStatus(recipe, item, essenceBalance, nightState),
  }));
}

/**
 * 获取物品可用的重铸配方
 */
export function getAvailableReforgeRecipes(
  item: Item,
  essenceBalance: EssenceBalance,
  nightState: NightState,
  recipes: ReforgeRecipe[]
): Array<{ recipe: ReforgeRecipe; status: RecipeStatus }> {
  return recipes.map(recipe => ({
    recipe,
    status: getRecipeStatus(recipe, item, essenceBalance, nightState),
  }));
}
