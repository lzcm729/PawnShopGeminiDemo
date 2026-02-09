/**
 * 格物系统类型定义 (Insight System Types)
 *
 * 格物是夜间的核心操作，玩家通过研究物品提取知识，
 * 转化为三种精魄（匠心/旧影/灵韵）。
 *
 * 设计原则：
 * - 每件物品每晚只能格物一次
 * - 格物消耗精力（默认1点）
 * - 知识池耗尽时触发"顿悟"，返还精力并获得额外奖励
 */

import { EssenceCost } from '../economy/essence';
import { Item, ItemTrait, ItemTag } from '../items/types';

// ============================================================================
// 格物意外事件类型
// ============================================================================

/** 格物意外事件类型 */
export type UnexpectedEventType = 'DISTRACTION' | 'REMARKABLE_FIND';

// ============================================================================
// 格物结果
// ============================================================================

/**
 * 格物结果 - 单次格物操作的输出
 */
export interface InsightResult {
  /** 本次获得的精魄 */
  essenceGained: EssenceCost;

  /** 是否触发顿悟（知识池耗尽） */
  isEpiphany: boolean;

  /** 是否返还精力（顿悟时返还） */
  energyRefunded: boolean;

  /** 顿悟时的额外奖励精魄 */
  bonusEssence?: EssenceCost;

  /** 本次揭示的特质（可能在格物时发现） */
  revealedTraits?: string[];

  /** 顿悟后锁定的价值（物品变成"已被研究透"） */
  lockedValue?: number;

  /** 提取的知识量 */
  extractedAmount: number;

  /** 剩余知识量 */
  remainingKnowledge: number;

  // --- 夜间鉴定新增字段 ---

  /** 估价区间是否收窄 */
  rangeNarrowed?: boolean;

  /** 新的估价区间（如果收窄） */
  newRange?: [number, number];

  /** 估价是否锁定为真值 */
  valueLocked?: boolean;

  /** 本次发现的特征（概率触发，单个） */
  traitDiscovered?: ItemTrait;

  // --- v1.1 新增字段 ---

  /** 格物意外事件（走神/惊人发现） */
  unexpectedEvent?: UnexpectedEventType;

  /** 窥见事件 - 物品故事碎片闪现 */
  glimpse?: { text: string };

  /** 共鸣事件 - 跨物品共鸣 */
  resonance?: {
    text: string;
    bonusEssence: EssenceCost;
    pairedItemId: string;
    pairedItemName: string;
  };

  /** G2 hidden tags revealed during insight */
  revealedHiddenTags?: ItemTag[];
}

// ============================================================================
// 收益递减状态
// ============================================================================

/** 收益递减状态 - 标记哪些收益已完成 */
export interface DepletedRewards {
  /** 估价已锁定 */
  valueLocked: boolean;
  /** 特征已全开 */
  allTraitsRevealed: boolean;
  /** 只剩点数收益 */
  onlyEssenceRemaining: boolean;
}

// ============================================================================
// 格物状态
// ============================================================================

/**
 * 物品的格物状态 - 用于UI显示
 */
export interface InsightStatus {
  /** 是否可以格物 */
  canInsight: boolean;

  /** 不可格物的原因 */
  reason?: InsightBlockReason;

  /** 知识池进度 (0-1) */
  progress: number;

  /** 剩余知识量 */
  remainingKnowledge: number;

  /** 预估产出配比 */
  estimatedYield: EssenceCost;

  /** 是否接近顿悟 */
  nearEpiphany: boolean;

  // --- 夜间鉴定状态字段 ---

  /** 估价是否已锁定为真值 */
  isValueLocked: boolean;

  /** 未发现的隐藏特征数量 */
  hiddenTraitCount: number;

  /** 已发现的特征数量 */
  revealedTraitCount: number;

  // --- v1.1 收益递减字段 ---

  /** 收益递减状态 */
  depletedRewards: DepletedRewards;

  /** 距顿悟次数（基于最大产出的乐观估计） */
  insightsToEpiphany: number;
}

/**
 * 格物受阻原因
 */
export type InsightBlockReason =
  | 'NO_ENERGY'           // 精力不足
  | 'ALREADY_INSIGHTED'   // 今晚已格物
  | 'DEPLETED'            // 知识池已耗尽
  | 'NOT_IN_INVENTORY'    // 物品不在库存中
  | 'ITEM_REDEEMED'       // 物品已被赎回
  | 'ITEM_SOLD';          // 物品已卖出

// ============================================================================
// 格物配置
// ============================================================================

/**
 * 格物配置 - 从 GAME_CONFIG.NIGHT 读取
 */
export interface InsightConfig {
  /** 每次格物消耗的精力 */
  energyCost: number;

  /** 每次格物提取的知识量（最小值） */
  extractionRateMin: number;

  /** 每次格物提取的知识量（最大值） */
  extractionRateMax: number;

  /** 顿悟时的额外奖励比例 */
  epiphanyBonusRatio: number;

  /** 默认知识池容量 */
  defaultCapacity: number;
}

// ============================================================================
// 格物叙事
// ============================================================================

/**
 * 格物叙事文本 - 用于UI显示的描述性文字
 */
export interface InsightNarrative {
  /** 行为描述（如 "你仔细研究了这块怀表的机芯..."） */
  actionText: string;

  /** 发现描述（如 "它精密的齿轮让你对机械工艺有了更深的理解"） */
  discoveryText: string;

  /** 顿悟描述（仅在触发顿悟时） */
  epiphanyText?: string;
}

// ============================================================================
// 格物历史记录
// ============================================================================

/**
 * 格物记录 - 用于追踪历史
 */
export interface InsightRecord {
  /** 物品ID */
  itemId: string;

  /** 物品名称（快照） */
  itemName: string;

  /** 发生的天数 */
  day: number;

  /** 获得的精魄 */
  essenceGained: EssenceCost;

  /** 是否为顿悟 */
  isEpiphany: boolean;
}
