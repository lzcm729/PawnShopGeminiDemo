/**
 * 工作台系统类型定义 (Workshop System Types)
 *
 * 工作台是夜间的核心设施，玩家可以：
 * - 修复：移除负面状态标签（如破损、脏污、生锈）
 * - 重铸：注入新的本质标签（如伪造历史、名人关联）
 *
 * 设计原则：
 * - 修复和重铸都是中性操作，没有道德属性
 * - 成本由物品的属性标签决定，而非操作类型
 * - 重铸需要特定条件（如物品类型、已有标签）
 */

import { EssenceCost } from '../economy/essence';
import { ItemTag, StateTag, EssenceTag, AttributeTag } from '../items/tags';

// ============================================================================
// 配方类型
// ============================================================================

/**
 * 配方类型
 */
export type RecipeType = 'RESTORE' | 'REFORGE';

/**
 * 配方基础接口
 */
export interface RecipeBase {
  /** 配方ID */
  id: string;

  /** 配方类型 */
  type: RecipeType;

  /** 显示名称 */
  name: string;

  /** 描述 */
  description: string;

  /** 基础成本（实际成本可能根据物品调整） */
  baseCost: EssenceCost;

  /** 消耗的精力 */
  energyCost: number;
}

/**
 * 修复配方 - 移除负面状态标签
 */
export interface RestoreRecipe extends RecipeBase {
  type: 'RESTORE';

  /** 目标移除的标签（全面翻新时为 undefined） */
  targetTag?: StateTag;

  /** 是否移除全部负面标签（全面翻新） */
  targetAll?: boolean;

  /** 移除后的替代标签（可选，如 BROKEN -> MINT） */
  resultTag?: ItemTag;

  /** 前置条件：物品必须拥有的标签（如艺术修复需要 ARTISTIC） */
  requiredTags?: ItemTag[];
}

/**
 * 重铸配方 - 注入新的本质标签
 */
export interface ReforgeRecipe extends RecipeBase {
  type: 'REFORGE';

  /** 注入的标签 */
  resultTag: EssenceTag;

  /** 前置条件：物品必须拥有的标签 */
  requiredTags?: ItemTag[];

  /** 前置条件：物品必须的类别 */
  requiredCategories?: string[];

  /** 排除条件：物品不能拥有的标签 */
  excludedTags?: ItemTag[];

  /** 风险描述（用于UI显示） */
  riskNote?: string;
}

/**
 * 所有配方的联合类型
 */
export type Recipe = RestoreRecipe | ReforgeRecipe;

// ============================================================================
// 操作结果
// ============================================================================

/**
 * 工作台操作结果
 */
export interface WorkshopResult {
  /** 是否成功 */
  success: boolean;

  /** 操作类型 */
  type: RecipeType;

  /** 使用的配方 */
  recipeId: string;

  /** 消耗的精魄 */
  essenceSpent: EssenceCost;

  /** 消耗的精力 */
  energySpent: number;

  /** 移除的标签（修复） */
  removedTags?: ItemTag[];

  /** 添加的标签 */
  addedTags?: ItemTag[];

  /** 新的物品价值（如果变化） */
  newValue?: number;

  /** 价值增加量 */
  valueIncrease?: number;

  /** 叙事文本 */
  narrative: WorkshopNarrative;
}

/**
 * 操作失败原因
 */
export type WorkshopBlockReason =
  | 'NO_ENERGY'           // 精力不足
  | 'NO_ESSENCE'          // 精魄不足
  | 'MISSING_TAG'         // 缺少目标标签（修复）
  | 'MISSING_REQUIRED'    // 缺少前置条件（重铸）
  | 'HAS_EXCLUDED'        // 有排除标签
  | 'WRONG_CATEGORY'      // 类别不匹配
  | 'ALREADY_RESTORED'    // 已被修复过
  | 'ALREADY_REFORGED'    // 已被重铸过
  | 'ITEM_ACTIVE'         // 物品仍在典当中（所有权冲突）
  | 'ITEM_REDEEMED'       // 物品已被赎回
  | 'ITEM_SOLD';          // 物品已卖出

// ============================================================================
// 状态检查
// ============================================================================

/**
 * 配方可用性状态
 */
export interface RecipeStatus {
  /** 是否可用 */
  canApply: boolean;

  /** 不可用原因 */
  reason?: WorkshopBlockReason;

  /** 实际成本（根据物品计算） */
  actualCost: EssenceCost;

  /** 是否能支付成本 */
  canAfford: boolean;

  /** 缺少的精魄 */
  deficit?: EssenceCost;
}

// ============================================================================
// 叙事
// ============================================================================

/**
 * 工作台操作叙事
 */
export interface WorkshopNarrative {
  /** 操作描述 */
  actionText: string;

  /** 结果描述 */
  resultText: string;

  /** 道德提醒（如果操作涉及典当中物品） */
  moralNote?: string;

  /** 凝视时刻文本（操作完成后的情感铺垫） */
  gazeText: string;
}

/**
 * 违约重铸风险预警
 */
export interface ViolationWarning {
  /** 赔偿金额：当金 x 200% */
  compensationAmount: number;

  /** 声誉损失 */
  reputationLoss: { humanity: number; credibility: number };

  /** 商人直觉文本 */
  intuitionText: string;

  /** 物品是否仍在当期 */
  isActive: boolean;
}

// ============================================================================
// 类型守卫
// ============================================================================

export function isRestoreRecipe(recipe: Recipe): recipe is RestoreRecipe {
  return recipe.type === 'RESTORE';
}

export function isReforgeRecipe(recipe: Recipe): recipe is ReforgeRecipe {
  return recipe.type === 'REFORGE';
}
