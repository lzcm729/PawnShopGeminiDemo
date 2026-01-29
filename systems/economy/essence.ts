/**
 * 附属货币系统 (Essence System)
 *
 * 三种精魄代表主角脑海中的知识储备：
 * - 匠心 (Craft): 对物理结构、机械原理、材质工艺的理解
 * - 旧影 (Time): 对时间痕迹、历史典故、断代考据的沉淀
 * - 灵韵 (Vibe): 对美学、潮流、情感共鸣、文化符号的感知
 *
 * 设计原则：
 * - 三种点数是中性资源，没有道德属性
 * - 修复和重铸都会消耗三种点数，具体配比由物品决定
 * - 点数无上限，可无限积累
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 精魄类型
 */
export type EssenceType = 'CRAFT' | 'TIME' | 'VIBE';

/**
 * 精魄余额
 * 注意：根据设计调整 D2，不设上限
 */
export interface EssenceBalance {
  craft: number;    // 匠心
  time: number;     // 旧影
  vibe: number;     // 灵韵
}

/**
 * 精魄消耗/产出配方
 * 使用 Partial 允许只指定部分类型
 */
export type EssenceCost = Partial<EssenceBalance>;

// ============================================================================
// 常量
// ============================================================================

/**
 * 初始精魄余额
 */
export const INITIAL_ESSENCE_BALANCE: EssenceBalance = {
  craft: 0,
  time: 0,
  vibe: 0,
};

/**
 * 精魄显示名称
 */
export const ESSENCE_DISPLAY_NAMES: Record<EssenceType, string> = {
  CRAFT: '匠心',
  TIME: '旧影',
  VIBE: '灵韵',
};

/**
 * 精魄图标
 */
export const ESSENCE_ICONS: Record<EssenceType, string> = {
  CRAFT: '🛠️',
  TIME: '📜',
  VIBE: '🎨',
};

/**
 * 精魄描述
 */
export const ESSENCE_DESCRIPTIONS: Record<EssenceType, string> = {
  CRAFT: '对物理结构、机械原理、材质工艺的理解。象征"手的技艺"。',
  TIME: '对时间痕迹、历史典故、断代考据的沉淀。象征"眼的阅历"。',
  VIBE: '对美学、潮流、情感共鸣、文化符号的感知。象征"心的感悟"。',
};

// ============================================================================
// 类型守卫
// ============================================================================

export const ESSENCE_TYPES: EssenceType[] = ['CRAFT', 'TIME', 'VIBE'];

export function isEssenceType(value: string): value is EssenceType {
  return ESSENCE_TYPES.includes(value as EssenceType);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建空的精魄余额
 */
export function createEmptyEssenceBalance(): EssenceBalance {
  return { ...INITIAL_ESSENCE_BALANCE };
}

/**
 * 计算精魄成本总量
 */
export function getTotalEssenceCost(cost: EssenceCost): number {
  return (cost.craft || 0) + (cost.time || 0) + (cost.vibe || 0);
}

/**
 * 合并两个精魄成本
 */
export function mergeEssenceCosts(...costs: EssenceCost[]): EssenceCost {
  return costs.reduce((acc, cost) => ({
    craft: (acc.craft || 0) + (cost.craft || 0),
    time: (acc.time || 0) + (cost.time || 0),
    vibe: (acc.vibe || 0) + (cost.vibe || 0),
  }), {} as EssenceCost);
}

/**
 * 根据比例分配总量
 * @param total 总量
 * @param ratios 比例 (总和应为1)
 * @returns 分配后的精魄成本
 */
export function distributeByRatio(
  total: number,
  ratios: { craft?: number; time?: number; vibe?: number }
): EssenceCost {
  return {
    craft: ratios.craft ? Math.floor(total * ratios.craft) : undefined,
    time: ratios.time ? Math.floor(total * ratios.time) : undefined,
    vibe: ratios.vibe ? Math.floor(total * ratios.vibe) : undefined,
  };
}
