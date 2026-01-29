/**
 * 标签数据表 (Tag Data Registry)
 *
 * 定义所有标签的元数据，包括价值系数、显示名、描述等。
 * 这是标签系统的配置中心。
 */

import { ItemTag, TagDefinition, TagGroup } from './tags';

// ============================================================================
// 标签定义数据表
// ============================================================================

export const TAG_DEFINITIONS: Record<ItemTag, TagDefinition> = {
  // -------------------------------------------------------------------------
  // G1. 状态组 (State Tags) - 描述物品物理状况
  // -------------------------------------------------------------------------

  BROKEN: {
    id: 'BROKEN',
    group: 'STATE',
    valueMultiplier: 0.1,       // 1折 - 破损严重降价
    displayName: '破损',
    description: '物品严重损坏，无法正常使用。',
    icon: '💔',
    isNegative: true,
    canBeRemoved: true,         // 可通过修复移除
  },

  DIRTY: {
    id: 'DIRTY',
    group: 'STATE',
    valueMultiplier: 0.7,       // 7折 - 脏污轻微降价
    displayName: '脏污',
    description: '物品表面有污渍或锈迹，需要清洁。',
    icon: '🧹',
    isNegative: true,
    canBeRemoved: true,
  },

  RUSTED: {
    id: 'RUSTED',
    group: 'STATE',
    valueMultiplier: 0.5,       // 5折 - 锈蚀中等降价
    displayName: '锈蚀',
    description: '金属部件生锈，影响美观和功能。',
    icon: '🔧',
    isNegative: true,
    canBeRemoved: true,
  },

  MINT: {
    id: 'MINT',
    group: 'STATE',
    valueMultiplier: 1.2,       // 1.2倍 - 完美状态溢价
    displayName: '完美',
    description: '物品状态完美，如同全新。',
    icon: '✨',
    isNegative: false,
    canBeRemoved: false,        // 完美状态不应被"移除"
  },

  // -------------------------------------------------------------------------
  // G2. 材质/属性组 (Attribute Tags) - 决定格物产出
  // -------------------------------------------------------------------------

  GOLD: {
    id: 'GOLD',
    group: 'ATTRIBUTE',
    valueMultiplier: 1.0,       // 基础价值，不额外加成
    displayName: '贵金属',
    description: '含有金、银、铂等贵金属材质。',
    icon: '🥇',
    isNegative: false,
    canBeRemoved: false,        // 材质固有，不可移除
    essenceYield: {
      craft: 0.8,               // 主要产出匠心
      time: 0.1,
      vibe: 0.1,
    },
  },

  MECHANICAL: {
    id: 'MECHANICAL',
    group: 'ATTRIBUTE',
    valueMultiplier: 1.0,
    displayName: '精密机械',
    description: '包含精密机械结构，如钟表机芯、相机快门。',
    icon: '⚙️',
    isNegative: false,
    canBeRemoved: false,
    essenceYield: {
      craft: 0.9,               // 主要产出匠心
      time: 0.05,
      vibe: 0.05,
    },
  },

  ARTISTIC: {
    id: 'ARTISTIC',
    group: 'ATTRIBUTE',
    valueMultiplier: 1.0,
    displayName: '艺术品',
    description: '具有艺术价值，如绘画、雕塑、工艺品。',
    icon: '🎨',
    isNegative: false,
    canBeRemoved: false,
    essenceYield: {
      craft: 0.1,
      time: 0.2,
      vibe: 0.7,                // 主要产出灵韵
    },
  },

  VINTAGE_REAL: {
    id: 'VINTAGE_REAL',
    group: 'ATTRIBUTE',
    valueMultiplier: 1.5,       // 真古董有基础溢价
    displayName: '真年份',
    description: '确认为真正的古董，具有历史价值。',
    icon: '📜',
    isNegative: false,
    canBeRemoved: false,
    essenceYield: {
      craft: 0.1,
      time: 0.8,                // 主要产出旧影
      vibe: 0.1,
    },
  },

  SENTIMENTAL: {
    id: 'SENTIMENTAL',
    group: 'ATTRIBUTE',
    valueMultiplier: 1.0,       // 情感价值不直接影响市场价
    displayName: '情感价值',
    description: '承载着个人或家族的情感记忆。',
    icon: '💝',
    isNegative: false,
    canBeRemoved: false,
    essenceYield: {
      craft: 0.1,
      time: 0.6,                // 主要产出旧影
      vibe: 0.3,
    },
  },

  TRENDY: {
    id: 'TRENDY',
    group: 'ATTRIBUTE',
    valueMultiplier: 1.0,
    displayName: '潮流物品',
    description: '当前流行文化中的热门物品。',
    icon: '🔥',
    isNegative: false,
    canBeRemoved: false,
    essenceYield: {
      craft: 0.1,
      time: 0.1,
      vibe: 0.8,                // 主要产出灵韵
    },
  },

  // -------------------------------------------------------------------------
  // G3. 本质/价值组 (Essence Tags) - 重铸目标
  // -------------------------------------------------------------------------

  FAKE_HISTORY: {
    id: 'FAKE_HISTORY',
    group: 'ESSENCE',
    valueMultiplier: 3.0,       // 3倍 - 伪造历史有溢价，但有风险
    displayName: '伪造历史',
    description: '经过做旧处理，被赋予了虚构的历史背景。',
    icon: '🎭',
    isNegative: false,          // 不是"负面"，是"灰色"
    canBeRemoved: false,
  },

  IMPERIAL: {
    id: 'IMPERIAL',
    group: 'ESSENCE',
    valueMultiplier: 10.0,      // 10倍 - 御用极高溢价
    displayName: '御用/宫廷',
    description: '被认定为皇室或宫廷使用的珍品。',
    icon: '👑',
    isNegative: false,
    canBeRemoved: false,
  },

  TRENDING: {
    id: 'TRENDING',
    group: 'ESSENCE',
    valueMultiplier: 5.0,       // 5倍 - 潮流热点高溢价
    displayName: '潮流热点',
    description: '当前市场上的热门追捧对象。',
    icon: '📈',
    isNegative: false,
    canBeRemoved: false,
  },

  CURSED: {
    id: 'CURSED',
    group: 'ESSENCE',
    valueMultiplier: 0.5,       // 0.5倍 - 诅咒降价，但特殊玩法
    displayName: '诅咒',
    description: '据说持有者会遭遇厄运。',
    icon: '☠️',
    isNegative: true,           // 这是负面标签
    canBeRemoved: false,        // 诅咒不可解除（或需要特殊方式）
  },

  CELEBRITY: {
    id: 'CELEBRITY',
    group: 'ESSENCE',
    valueMultiplier: 8.0,       // 8倍 - 名人关联高溢价
    displayName: '名人关联',
    description: '与知名人物有关联的物品。',
    icon: '⭐',
    isNegative: false,
    canBeRemoved: false,
  },

  LIMITED: {
    id: 'LIMITED',
    group: 'ESSENCE',
    valueMultiplier: 4.0,       // 4倍 - 限量版溢价
    displayName: '限量版',
    description: '限量发行的稀缺物品。',
    icon: '🏷️',
    isNegative: false,
    canBeRemoved: false,
  },
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取标签定义
 */
export function getTagDefinition(tag: ItemTag): TagDefinition {
  return TAG_DEFINITIONS[tag];
}

/**
 * 获取指定分组的所有标签
 */
export function getTagsByGroup(group: TagGroup): ItemTag[] {
  return Object.values(TAG_DEFINITIONS)
    .filter(def => def.group === group)
    .map(def => def.id);
}

/**
 * 获取所有负面标签
 */
export function getNegativeTags(): ItemTag[] {
  return Object.values(TAG_DEFINITIONS)
    .filter(def => def.isNegative)
    .map(def => def.id);
}

/**
 * 获取所有可移除的标签
 */
export function getRemovableTags(): ItemTag[] {
  return Object.values(TAG_DEFINITIONS)
    .filter(def => def.canBeRemoved)
    .map(def => def.id);
}

/**
 * 获取标签的格物产出配比
 * 返回 null 表示该标签不产出点数（非 ATTRIBUTE 标签）
 */
export function getTagEssenceYield(tag: ItemTag): { craft?: number; time?: number; vibe?: number } | null {
  const def = TAG_DEFINITIONS[tag];
  return def.essenceYield || null;
}
