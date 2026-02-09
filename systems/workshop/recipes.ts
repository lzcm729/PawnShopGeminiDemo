/**
 * 工作台配方定义 (Workshop Recipes)
 *
 * 定义所有可用的修复和重铸配方。
 * 参考设计文档 3.2/3.3节。
 *
 * 修复配方：清洁仅消耗精力；除锈/机械修复/艺术修复消耗精魄+精力；全面翻新移除全部负面标签。
 * 重铸配方：做旧伪造/宫廷御制/艺术升华/潮流改装，成本为3-5天积累。
 */

import { RestoreRecipe, ReforgeRecipe, Recipe } from './types';

// ============================================================================
// 修复配方（设计文档 3.2节）
// ============================================================================

export const RESTORE_RECIPES: RestoreRecipe[] = [
  {
    id: 'restore_clean',
    type: 'RESTORE',
    name: '清洁',
    description: '深度清洁物品，去除岁月的污垢。最低门槛操作，仅消耗精力。',
    targetTag: 'DIRTY',
    baseCost: {},             // 0精魄
    energyCost: 1,
  },
  {
    id: 'restore_derust',
    type: 'RESTORE',
    name: '除锈',
    description: '去除锈蚀，恢复金属光泽。基础金属修复。',
    targetTag: 'RUSTED',
    baseCost: { craft: 15, time: 5 },
    energyCost: 1,
  },
  {
    id: 'restore_broken_mechanical',
    type: 'RESTORE',
    name: '机械修复',
    description: '修复物理损坏，恢复精密机械的完整性。需要了解内部结构。',
    targetTag: 'BROKEN',
    baseCost: { craft: 30, time: 10 },
    energyCost: 2,
  },
  {
    id: 'restore_broken_artistic',
    type: 'RESTORE',
    name: '艺术修复',
    description: '以审美判断修复艺术品的破损，恢复其美感与完整性。',
    targetTag: 'BROKEN',
    requiredTags: ['ARTISTIC'],
    baseCost: { craft: 10, time: 15, vibe: 20 },
    energyCost: 2,
  },
  {
    id: 'restore_full_refurbish',
    type: 'RESTORE',
    name: '全面翻新',
    description: '一次性清除所有瑕疵，高阶修复操作。',
    targetAll: true,
    baseCost: { craft: 40, time: 20, vibe: 10 },
    energyCost: 3,
  },
];

// ============================================================================
// 重铸配方（设计文档 3.3节）
// ============================================================================

export const REFORGE_RECIPES: ReforgeRecipe[] = [
  // ---- EARLY RECIPES (Day 1+): Deterministic, guaranteed results ----
  {
    id: 'reforge_fake_history',
    type: 'REFORGE',
    name: '做旧伪造',
    description: '通过做旧处理，让物品看起来更有年代感。伪造历史痕迹。',
    resultTag: 'FAKE_HISTORY',
    baseCost: { craft: 30, time: 80 },
    energyCost: 3,
    requiredTags: ['VINTAGE_REAL'],
    excludedTags: ['FAKE_HISTORY', 'IMPERIAL'],
    riskNote: '如果被识破，物品价值会大幅下降。',
  },
  {
    id: 'reforge_art_enhanced',
    type: 'REFORGE',
    name: '艺术升华',
    description: '对物品进行艺术再创作，赋予其全新的艺术灵魂。',
    resultTag: 'ART_ENHANCED',
    baseCost: { craft: 20, time: 20, vibe: 70 },
    energyCost: 3,
    requiredTags: ['ARTISTIC'],
    excludedTags: ['ART_ENHANCED'],
    riskNote: '艺术品的价值高度主观，市场评价可能因人而异。',
    surpriseDiscoveryChance: 0.05,
  },

  // ---- MID-GAME RECIPES (Day 15+): Probabilistic, quality variance ----
  {
    id: 'reforge_imperial',
    type: 'REFORGE',
    name: '宫廷御制',
    description: '为物品编造皇室或宫廷的出处。这是最高级的"故事"，也是最危险的。需要Day 15后解锁。',
    resultTag: 'IMPERIAL',
    baseCost: { craft: 50, time: 60, vibe: 30 },
    energyCost: 3,
    requiredTags: ['VINTAGE_REAL', 'ARTISTIC'],
    excludedTags: ['IMPERIAL', 'FAKE_HISTORY'],
    riskNote: '宫廷物品有严格的档案记录，编造故事风险极高。品质可能浮动。',
    minDay: 15,
    probabilistic: true,
    qualityOutcomes: [
      { quality: 'MASTERWORK', probability: 0.15, valueMultiplier: 1.35 },
      { quality: 'NORMAL',     probability: 0.55, valueMultiplier: 1.0  },
      { quality: 'FLAWED',     probability: 0.20, valueMultiplier: 0.70 },
      { quality: 'FAILED',     probability: 0.10, valueMultiplier: 0.0  },
    ],
    surpriseDiscoveryChance: 0.08,
  },

  // ---- LATE-GAME RECIPES (Day 22+): High risk, high reward ----
  {
    id: 'reforge_master_forgery',
    type: 'REFORGE',
    name: '大师级伪造',
    description: '倾注全部技艺，打造足以欺骗专家的顶级赝品。极高收益，但失败风险不容忽视。需要两夜连续操作。',
    resultTag: 'IMPERIAL',
    baseCost: { craft: 80, time: 100, vibe: 60 },
    energyCost: 3,
    nightsRequired: 2,
    requiredTags: ['VINTAGE_REAL'],
    excludedTags: ['IMPERIAL', 'FAKE_HISTORY'],
    riskNote: '大师级伪造需要极高的精魄积累。成功则暴利，失败则血本无归。需要连续两夜操作。',
    minDay: 22,
    probabilistic: true,
    qualityOutcomes: [
      { quality: 'MASTERWORK', probability: 0.20, valueMultiplier: 1.40 },
      { quality: 'NORMAL',     probability: 0.40, valueMultiplier: 1.0  },
      { quality: 'FLAWED',     probability: 0.25, valueMultiplier: 0.65 },
      { quality: 'FAILED',     probability: 0.15, valueMultiplier: 0.0  },
    ],
    surpriseDiscoveryChance: 0.12,
  },
];

// ============================================================================
// 配方查询
// ============================================================================

export const ALL_RECIPES: Recipe[] = [...RESTORE_RECIPES, ...REFORGE_RECIPES];

export function getRecipeById(id: string): Recipe | undefined {
  return ALL_RECIPES.find(r => r.id === id);
}

