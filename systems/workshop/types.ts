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
// 重铸品质 (Reforge Quality)
// ============================================================================

/**
 * 重铸品质等级
 *
 * 设计文档 8.2节：后期配方引入结果不确定性。
 * - MASTERWORK: 精品，价值系数提升
 * - NORMAL: 正常品质，无额外修正
 * - FLAWED: 次品，价值系数降低
 * - FAILED: 失败，材料消耗但物品未变化
 */
export type ReforgeQuality = 'MASTERWORK' | 'NORMAL' | 'FLAWED' | 'FAILED';

/**
 * 品质结果定义
 */
export interface QualityOutcome {
  /** 品质等级 */
  quality: ReforgeQuality;
  /** 出现概率 (0-1)，所有 outcomes 的概率之和应为 1 */
  probability: number;
  /** 价值系数修正 (乘以最终价值系数，如 1.3 = +30%，0.7 = -30%) */
  valueMultiplier: number;
}

/**
 * 意外发现结果
 */
export interface SurpriseDiscovery {
  /** 发现的标签 */
  tag: ItemTag;
  /** 发现描述 */
  description: string;
}

// ============================================================================
// 配方类型
// ============================================================================

/**
 * 配方类型
 */
export type RecipeType = 'RESTORE' | 'COUNTERFEIT' | 'REFORGE';

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

  /** 需要的夜间工序次数（默认 1，多夜配方需连续操作） */
  nightsRequired?: number;
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

  // --- PROBABILISTIC FIELDS (设计文档 8.2节) ---

  /** 是否为概率配方（false/undefined = 确定性结果） */
  probabilistic?: boolean;

  /** 品质结果分布（仅当 probabilistic=true 时有效） */
  qualityOutcomes?: QualityOutcome[];

  /** 意外发现几率 (0-1)，如 0.05 = 5%。重铸时小概率发现隐藏特征 */
  surpriseDiscoveryChance?: number;

  /** 最低解锁日（0 = 初始可用） */
  minDay?: number;
}

/**
 * 伪造配方 - 添加虚假标签，切换 variant 到 forged_state
 * 每件物品仅一个伪造配方，效果由物品属性在数据层预定义
 */
export interface CounterfeitRecipe extends RecipeBase {
  type: 'COUNTERFEIT';

  /** 伪造后添加的标签（如 FAKE_HISTORY, IMPERIAL） */
  resultTag: string;

  /** 伪造后的物品变体 ID */
  resultVariant: string;

  /** 伪造价值系数（x2.5~x4.0） */
  valueMultiplier: number;

  /** 适用物品类别限制 */
  requiredCategories?: string[];

  /** 排除已有这些标签的物品 */
  excludedTags?: string[];
}

/**
 * 所有配方的联合类型
 */
export type Recipe = RestoreRecipe | CounterfeitRecipe | ReforgeRecipe;

// ============================================================================
// 伪造声名系统 (Forgery Notoriety)
// ============================================================================

/** 伪造声名阶段 */
export type ForgeryNotorietyStage = 'NOVICE' | 'PRACTITIONER' | 'VETERAN' | 'NOTORIOUS';

/** 伪造声名状态 */
export interface ForgeryNotorietyState {
  /** 累计伪造出售次数（不可衰减） */
  totalCounterfeitSales: number;
  /** 当前鉴伪概率（15%~33%） */
  currentDetectionRate: number;
}

/** 归还结果类型 */
export type ReturnResult = 'ADMIRATION' | 'ACCEPTANCE' | 'UNEASE' | 'ANGER';

// ============================================================================
// 多夜工序进度追踪 (Multi-Night Recipe Progress)
// ============================================================================

/**
 * 进行中的工序
 * 追踪需要多夜完成的配方的进度
 */
export interface InProgressRecipe {
  /** 配方ID */
  recipeId: string;
  /** 目标物品ID */
  itemId: string;
  /** 已完成的夜数 */
  nightsCompleted: number;
  /** 总共需要的夜数 */
  nightsRequired: number;
  /** 启动时消耗的精魄（记录用，已扣除） */
  essenceSpent: EssenceCost;
}

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

  // --- PROBABILISTIC RESULT FIELDS ---

  /** 重铸品质结果（仅概率配方） */
  reforgeQuality?: ReforgeQuality;

  /** 品质对应的价值系数修正 */
  qualityMultiplier?: number;

  /** 意外发现（小概率触发） */
  surpriseDiscovery?: SurpriseDiscovery;

  /** 是否为伪造操作 */
  isCounterfeit?: boolean;

  /** 伪造价值系数 */
  counterfeitValueMultiplier?: number;
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
  | 'ITEM_SOLD'           // 物品已卖出
  | 'NOT_UNLOCKED';       // 配方未解锁（未达到最低天数）

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

  /** 是否为概率配方 */
  isProbabilistic?: boolean;

  /** 品质分布预览（供UI显示，仅概率配方） */
  qualityOutcomes?: QualityOutcome[];
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
  reputationLoss: { humanity: number; credibility: number; innocence?: number };

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

export function isCounterfeitRecipe(recipe: Recipe): recipe is CounterfeitRecipe {
  return recipe.type === 'COUNTERFEIT';
}

export function isReforgeRecipe(recipe: Recipe): recipe is ReforgeRecipe {
  return recipe.type === 'REFORGE';
}
