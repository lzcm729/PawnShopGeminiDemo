/**
 * 工作台配方定义 (Workshop Recipes)
 *
 * 定义所有可用的修复和重铸配方。
 *
 * 设计原则（来自D5）：
 * - 修复成本较低（约半个晚上的产出）
 * - 重铸成本较高（约3-5天的积累）
 * - 成本配比由物品属性决定，配方只定义基础成本
 */

import { RestoreRecipe, ReforgeRecipe, Recipe } from './types';

// ============================================================================
// 修复配方
// ============================================================================

/**
 * 修复配方列表
 *
 * 每个修复配方针对一种负面状态标签。
 * 基础成本设计为约半个晚上的格物产出（10点左右）。
 */
export const RESTORE_RECIPES: RestoreRecipe[] = [
  {
    id: 'restore_broken',
    type: 'RESTORE',
    name: '修复破损',
    description: '修复物理损坏，恢复物品的完整性。',
    targetTag: 'BROKEN',
    resultTag: undefined, // 只移除 BROKEN，不添加新标签
    baseCost: { craft: 8, time: 2 },
    energyCost: 1,
  },
  {
    id: 'restore_dirty',
    type: 'RESTORE',
    name: '清洁脏污',
    description: '深度清洁物品，去除岁月的污垢。',
    targetTag: 'DIRTY',
    resultTag: undefined,
    baseCost: { craft: 3, vibe: 5 },
    energyCost: 1,
  },
  {
    id: 'restore_rusted',
    type: 'RESTORE',
    name: '除锈保养',
    description: '去除锈蚀，恢复金属光泽。',
    targetTag: 'RUSTED',
    resultTag: undefined,
    baseCost: { craft: 6, time: 4 },
    energyCost: 1,
  },
];

// ============================================================================
// 重铸配方
// ============================================================================

/**
 * 重铸配方列表
 *
 * 重铸是更高阶的操作，注入新的"故事"给物品。
 * 基础成本设计为约3-5天的积累（50-80点）。
 *
 * 设计原则（来自C3, C4）：
 * - 重铸本身是中性操作，不带道德判断
 * - 成本配比反映操作所需的知识类型
 */
export const REFORGE_RECIPES: ReforgeRecipe[] = [
  // === 时间类重铸 ===
  {
    id: 'reforge_fake_history',
    type: 'REFORGE',
    name: '伪造年份',
    description: '通过做旧处理，让物品看起来更有年代感。需要了解历史风化的痕迹。',
    resultTag: 'FAKE_HISTORY',
    baseCost: { time: 40, craft: 20 },
    energyCost: 2,
    requiredTags: ['VINTAGE_REAL'],
    excludedTags: ['FAKE_HISTORY', 'IMPERIAL'],
    riskNote: '如果被识破，物品价值会大幅下降。',
  },

  // === 名人类重铸 ===
  {
    id: 'reforge_celebrity',
    type: 'REFORGE',
    name: '名人关联',
    description: '为物品编造一个与名人相关的故事。需要了解名人轶事和时代背景。',
    resultTag: 'CELEBRITY',
    baseCost: { vibe: 35, time: 25 },
    energyCost: 2,
    excludedTags: ['CELEBRITY', 'IMPERIAL'],
    riskNote: '故事需要令人信服，否则可能被质疑。',
  },

  // === 稀缺性重铸 ===
  {
    id: 'reforge_limited',
    type: 'REFORGE',
    name: '限量版标记',
    description: '添加限量版的标识和编号。需要了解品牌的限量发行规律。',
    resultTag: 'LIMITED',
    baseCost: { craft: 30, vibe: 30 },
    energyCost: 2,
    requiredCategories: ['手表', '首饰', '艺术品', '收藏品'],
    excludedTags: ['LIMITED'],
    riskNote: '专业买家可能会核实编号真伪。',
  },

  // === 潮流类重铸 ===
  {
    id: 'reforge_trending',
    type: 'REFORGE',
    name: '潮流改造',
    description: '将物品改造成符合当下潮流审美的样式。需要敏锐的时尚嗅觉。',
    resultTag: 'TRENDING',
    baseCost: { vibe: 50, craft: 10 },
    energyCost: 2,
    requiredTags: ['TRENDY'],
    excludedTags: ['TRENDING', 'VINTAGE_REAL'],
    riskNote: '潮流瞬息万变，价值可能随时下跌。',
  },

  // === 高级重铸（解锁条件更严格）===
  {
    id: 'reforge_imperial',
    type: 'REFORGE',
    name: '宫廷御用',
    description: '为物品编造皇室或宫廷的出处。这是最高级的"故事"，也是最危险的。',
    resultTag: 'IMPERIAL',
    baseCost: { time: 50, vibe: 30, craft: 20 },
    energyCost: 3,
    requiredTags: ['VINTAGE_REAL', 'ARTISTIC'],
    excludedTags: ['IMPERIAL', 'FAKE_HISTORY', 'TRENDING'],
    riskNote: '宫廷物品有严格的档案记录，编造故事风险极高。',
  },
];

// ============================================================================
// 配方查询
// ============================================================================

/**
 * 所有配方
 */
export const ALL_RECIPES: Recipe[] = [...RESTORE_RECIPES, ...REFORGE_RECIPES];

/**
 * 根据ID获取配方
 */
export function getRecipeById(id: string): Recipe | undefined {
  return ALL_RECIPES.find(r => r.id === id);
}

/**
 * 获取所有修复配方
 */
export function getRestoreRecipes(): RestoreRecipe[] {
  return RESTORE_RECIPES;
}

/**
 * 获取所有重铸配方
 */
export function getReforgeRecipes(): ReforgeRecipe[] {
  return REFORGE_RECIPES;
}

/**
 * 根据目标标签获取修复配方
 */
export function getRestoreRecipeForTag(tag: string): RestoreRecipe | undefined {
  return RESTORE_RECIPES.find(r => r.targetTag === tag);
}

/**
 * 根据结果标签获取重铸配方
 */
export function getReforgeRecipeForResult(tag: string): ReforgeRecipe | undefined {
  return REFORGE_RECIPES.find(r => r.resultTag === tag);
}
