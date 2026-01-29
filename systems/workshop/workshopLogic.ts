/**
 * 工作台系统核心逻辑 (Workshop System Logic)
 *
 * 提供工作台操作的核心函数：
 * - 检查配方是否可以应用
 * - 计算实际成本
 * - 执行修复/重铸操作
 * - 生成叙事文本
 */

import { Item, ItemStatus } from '../items/types';
import { ItemTag, StateTag, EssenceTag } from '../items/tags';
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
  isRestoreRecipe,
  isReforgeRecipe,
} from './types';
import { getRecipeById } from './recipes';

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

  // 检查是否有目标标签
  if (!tags.includes(recipe.targetTag)) {
    return 'MISSING_TAG';
  }

  // 检查是否已经修复过（可选规则）
  // if (item.wasRestored) return 'ALREADY_RESTORED';

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

  // 设计考量：重铸典当中的物品需要特殊处理
  // 暂时不阻止，但在叙事中提醒玩家
  // if (item.status === ItemStatus.ACTIVE) return 'ITEM_ACTIVE';

  return null;
}

// ============================================================================
// 成本计算
// ============================================================================

/**
 * 计算配方的实际成本
 *
 * 设计原则（来自C1, C2）：
 * - 成本配比由物品的属性标签决定
 * - 基础成本作为总量参考
 */
export function calculateActualCost(recipe: Recipe, item: Item): EssenceCost {
  // 目前直接返回基础成本
  // 未来可以根据物品属性进行调整
  return recipe.baseCost;
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

  // 移除目标标签
  let updatedItem = removeTag(item, recipe.targetTag);

  // 添加结果标签（如果有）
  if (recipe.resultTag) {
    updatedItem = addTag(updatedItem, recipe.resultTag);
  }

  // 标记已修复
  updatedItem = { ...updatedItem, wasRestored: true };

  // 计算新价值
  const newValue = calculateTaggedValue(updatedItem);

  // 生成叙事
  const narrative = generateRestoreNarrative(recipe, item);

  const result: WorkshopResult = {
    success: true,
    type: 'RESTORE',
    recipeId: recipe.id,
    essenceSpent: status.actualCost,
    energySpent: recipe.energyCost,
    removedTags: [recipe.targetTag],
    addedTags: recipe.resultTag ? [recipe.resultTag] : undefined,
    newValue,
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

  // 标记已重铸
  updatedItem = { ...updatedItem, wasReforged: true };

  // 计算新价值
  const newValue = calculateTaggedValue(updatedItem);

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
// 叙事生成
// ============================================================================

/**
 * 生成修复操作的叙事
 */
function generateRestoreNarrative(recipe: RestoreRecipe, item: Item): WorkshopNarrative {
  let actionText: string;
  let resultText: string;

  switch (recipe.targetTag) {
    case 'BROKEN':
      actionText = `你仔细检查了${item.name}的损坏部位，开始动手修复...`;
      resultText = '经过精心修复，物品恢复了原本的完整。';
      break;
    case 'DIRTY':
      actionText = `你准备好清洁工具，开始为${item.name}去除污垢...`;
      resultText = '污垢被彻底清除，物品焕然一新。';
      break;
    case 'RUSTED':
      actionText = `你取出除锈剂和抛光布，开始处理${item.name}的锈蚀...`;
      resultText = '锈迹被完全清除，金属重新散发光泽。';
      break;
    default:
      actionText = `你开始修复${item.name}...`;
      resultText = '修复完成。';
  }

  return { actionText, resultText };
}

/**
 * 生成重铸操作的叙事
 *
 * 设计原则（来自D1）：
 * - 如果物品仍在典当中，提醒玩家这是"有主之物"
 * - 不做道德评判，让玩家自己体会
 */
function generateReforgeNarrative(recipe: ReforgeRecipe, item: Item): WorkshopNarrative {
  let actionText: string;
  let resultText: string;
  let moralNote: string | undefined;

  switch (recipe.resultTag) {
    case 'FAKE_HISTORY':
      actionText = `你开始为${item.name}进行做旧处理，模拟时间的痕迹...`;
      resultText = '物品现在看起来像是一件真正的古董了。';
      break;
    case 'CELEBRITY':
      actionText = `你开始编织一个关于${item.name}的故事，将它与某位名人联系起来...`;
      resultText = '一个引人入胜的故事诞生了。剩下的就看买家是否相信。';
      break;
    case 'LIMITED':
      actionText = `你仔细地为${item.name}添加限量版的标识和编号...`;
      resultText = '物品现在带有限量版的标记。它的稀缺性被"证明"了。';
      break;
    case 'TRENDING':
      actionText = `你开始改造${item.name}，让它符合当下的潮流审美...`;
      resultText = '改造完成，物品焕发出时尚的气息。';
      break;
    case 'IMPERIAL':
      actionText = `你开始为${item.name}编造一个与皇室相关的故事...`;
      resultText = '一个惊人的"宫廷来历"被创造出来了。这是一把双刃剑。';
      break;
    default:
      actionText = `你开始为${item.name}注入新的故事...`;
      resultText = '物品被赋予了新的"身份"。';
  }

  // D1: 微妙的道德提醒（不做评判）
  if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
    moralNote = `...这件物品的主人还在等着它。当他赎回时，会看到一个不一样的${item.name}。`;
  }

  return { actionText, resultText, moralNote };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取阻止原因的显示文本
 */
export function getBlockReasonText(reason: WorkshopBlockReason): string {
  switch (reason) {
    case 'NO_ENERGY': return '精力不足';
    case 'NO_ESSENCE': return '精魄不足';
    case 'MISSING_TAG': return '物品没有该状态';
    case 'MISSING_REQUIRED': return '缺少前置条件';
    case 'HAS_EXCLUDED': return '物品已有冲突标签';
    case 'WRONG_CATEGORY': return '物品类别不匹配';
    case 'ALREADY_RESTORED': return '已经修复过';
    case 'ALREADY_REFORGED': return '已经重铸过';
    case 'ITEM_ACTIVE': return '物品仍在典当中';
    case 'ITEM_REDEEMED': return '物品已被赎回';
    case 'ITEM_SOLD': return '物品已售出';
    default: return '无法操作';
  }
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
