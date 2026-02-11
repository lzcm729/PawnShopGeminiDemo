/**
 * 标签工具函数 (Tag Utilities)
 *
 * 提供标签操作的核心函数：
 * - 添加/移除标签
 * - 计算标签加成后的价值
 * - 获取当前应显示的变体
 */

import { Item } from './types';
import { ItemTag, ItemVariant, KnowledgePool, isStateTag, isAttributeTag, isEssenceTag } from './tags';
import { TAG_DEFINITIONS, getTagDefinition } from './tagData';
import { EssenceCost } from '../economy/essence';
import { getItemTemplate } from './csvLoader';

// ============================================================================
// 标签操作
// ============================================================================

/**
 * 添加标签到物品
 *
 * G3 互斥规则：同一物品同一时间只能拥有一个 G3（Essence）标签。
 * 注入新的 G3 标签会自动替换已有的 G3 标签。
 *
 * @returns 新的物品对象（不修改原对象）
 */
export function addTag(item: Item, tag: ItemTag): Item {
  let currentTags = item.tags || [];

  // 如果已有该标签，直接返回
  if (currentTags.includes(tag)) {
    return item;
  }

  // G3 互斥规则：新 Essence 标签替换已有的 Essence 标签
  if (isEssenceTag(tag)) {
    currentTags = currentTags.filter(t => !isEssenceTag(t));
  }

  return {
    ...item,
    tags: [...currentTags, tag],
  };
}

/**
 * 从物品移除标签
 * @returns 新的物品对象（不修改原对象）
 */
export function removeTag(item: Item, tag: ItemTag): Item {
  const currentTags = item.tags || [];

  // 如果没有该标签，直接返回
  if (!currentTags.includes(tag)) {
    return item;
  }

  return {
    ...item,
    tags: currentTags.filter(t => t !== tag),
  };
}

/**
 * 检查物品是否拥有指定的所有标签
 */
export function hasTags(item: Item, tags: ItemTag[]): boolean {
  const currentTags = item.tags || [];
  return tags.every(tag => currentTags.includes(tag));
}

/**
 * 检查物品是否拥有指定的任一标签
 */
export function hasAnyTag(item: Item, tags: ItemTag[]): boolean {
  const currentTags = item.tags || [];
  return tags.some(tag => currentTags.includes(tag));
}

/**
 * 获取物品的所有状态标签
 */
export function getStateTags(item: Item): ItemTag[] {
  return (item.tags || []).filter(isStateTag);
}

/**
 * 获取物品的所有属性标签
 */
export function getAttributeTags(item: Item): ItemTag[] {
  return (item.tags || []).filter(isAttributeTag);
}

/**
 * 获取物品的所有本质标签
 */
export function getEssenceTags(item: Item): ItemTag[] {
  return (item.tags || []).filter(isEssenceTag);
}

/**
 * 获取物品的负面标签
 */
export function getNegativeTagsOnItem(item: Item): ItemTag[] {
  return (item.tags || []).filter(tag => {
    const def = getTagDefinition(tag);
    return def.isNegative;
  });
}

/**
 * 获取物品的可移除标签（可被修复的标签）
 */
export function getRemovableTagsOnItem(item: Item): ItemTag[] {
  return (item.tags || []).filter(tag => {
    const def = getTagDefinition(tag);
    return def.canBeRemoved;
  });
}

// ============================================================================
// G2 标签发现 (Hidden Tag Discovery)
// ============================================================================

/**
 * 揭示物品的一个隐藏 G2 标签
 * 将 hiddenTags 中的第一个标签移动到 tags
 *
 * @returns 新的物品对象和被揭示的标签，如果没有隐藏标签则返回 null
 */
export function revealNextHiddenTag(item: Item): { item: Item; revealedTag: ItemTag } | null {
  const hidden = item.hiddenTags || [];
  if (hidden.length === 0) return null;

  const tagToReveal = hidden[0];
  const remainingHidden = hidden.slice(1);
  const currentTags = item.tags || [];

  return {
    item: {
      ...item,
      tags: [...currentTags, tagToReveal],
      hiddenTags: remainingHidden.length > 0 ? remainingHidden : undefined,
    },
    revealedTag: tagToReveal,
  };
}

/**
 * 揭示物品的所有隐藏 G2 标签
 * 将 hiddenTags 中的所有标签移动到 tags
 *
 * @returns 新的物品对象和所有被揭示的标签
 */
export function revealAllHiddenTags(item: Item): { item: Item; revealedTags: ItemTag[] } {
  const hidden = item.hiddenTags || [];
  if (hidden.length === 0) return { item, revealedTags: [] };

  const currentTags = item.tags || [];

  return {
    item: {
      ...item,
      tags: [...currentTags, ...hidden],
      hiddenTags: undefined,
    },
    revealedTags: [...hidden],
  };
}

/**
 * 获取物品的未发现 G2 标签数量
 */
export function getHiddenTagCount(item: Item): number {
  return (item.hiddenTags || []).length;
}

// ============================================================================
// 价值计算
// ============================================================================

/**
 * 计算标签加成后的物品价值
 *
 * 公式：最终价值 = clamp(基础价值 × ∏(标签系数), 基础价值 × 0.05, 基础价值 × 20)
 *
 * 价值边界：最终价值限制在基础价值的 5% 到 20 倍范围内，
 * 防止标签叠加产生极端值。
 *
 * @param item 物品
 * @returns 计算后的价值
 */
export function calculateTaggedValue(item: Item): number {
  // 使用 baseValue 或 realValue 作为基础
  const baseValue = item.baseValue ?? item.realValue;
  const tags = item.tags || [];

  if (tags.length === 0) {
    return baseValue;
  }

  // 计算所有标签的价值系数乘积
  const multiplier = tags.reduce((acc, tag) => {
    const def = getTagDefinition(tag);
    return acc * def.valueMultiplier;
  }, 1);

  const rawValue = baseValue * multiplier;
  const minValue = baseValue * 0.05;
  const maxValue = baseValue * 20;

  return Math.round(Math.max(minValue, Math.min(maxValue, rawValue)));
}

/**
 * 获取物品的价值系数（所有标签的乘积）
 */
export function getValueMultiplier(item: Item): number {
  const tags = item.tags || [];

  if (tags.length === 0) {
    return 1;
  }

  return tags.reduce((acc, tag) => {
    const def = getTagDefinition(tag);
    return acc * def.valueMultiplier;
  }, 1);
}

// ============================================================================
// 变体系统
// ============================================================================

/**
 * 获取当前应显示的变体
 *
 * 优先级顺序（设计文档 v1.0）：
 * 1. 破损态 (State - Negative): priority 100+
 * 2. 重铸态 (Essence): priority 50-99
 * 3. 修复态 (State - Restored): priority 20-49
 * 4. 默认态 (Default): priority 0-19
 *
 * @param item 物品
 * @returns 匹配的变体，如果没有匹配返回 null
 */
export function getActiveVariant(item: Item): ItemVariant | null {
  const variants = item.variants || [];
  const tags = item.tags || [];

  if (variants.length === 0) {
    return null;
  }

  // 筛选满足条件的变体
  const matchingVariants = variants.filter(variant => {
    // 检查触发条件
    const hasTriggerTags = variant.triggerTags.every(t => tags.includes(t));
    if (!hasTriggerTags) return false;

    // 检查排除条件
    if (variant.excludeTags) {
      const hasExcludeTags = variant.excludeTags.some(t => tags.includes(t));
      if (hasExcludeTags) return false;
    }

    return true;
  });

  if (matchingVariants.length === 0) {
    return null;
  }

  // 返回优先级最高的变体
  return matchingVariants.reduce((best, current) =>
    current.priority > best.priority ? current : best
  );
}

/**
 * 获取物品的显示名称
 * 优先级：WorkState 名称变体 > CSV模板 > 旧变体系统 > 原始名称
 *
 * 当物品被修复/重铸且有新名称时，显示格式为："新名称 (原：原始名称)"
 * 如果新名称和原始名称相同，则不显示括号部分
 */
export function getDisplayName(item: Item): string {
  // 确定实际的工作状态（兼容旧存档：wasReforged/wasRestored/wasForged 为 true 但 workState 未设置）
  let workState = item.workState || 'DEFAULT';
  if (workState === 'DEFAULT' && item.wasReforged) {
    workState = 'REFORGED';
  } else if (workState === 'DEFAULT' && item.wasForged) {
    workState = 'FORGED';
  } else if (workState === 'DEFAULT' && item.wasRestored) {
    workState = 'RESTORED';
  }

  // 尝试从 CSV 模板获取（兼容旧存档）
  const template = item.templateId ? getItemTemplate(item.templateId) :
                   item.id ? getItemTemplate(item.id) : undefined;

  // 获取原始名称（用于括号显示）
  const originalName = item.nameDefault || template?.nameDefault || item.name;

  // 辅助函数：格式化带原始名称的显示
  const formatWithOriginal = (newName: string): string => {
    if (newName === originalName) {
      return newName;
    }
    return `${newName} (原：${originalName})`;
  };

  // 破损态 + 重铸态组合：保留 G3 信息（设计文档 v1.0 变体名称规则）
  const isBroken = (item.tags || []).includes('BROKEN');
  if (workState === 'REFORGED' && isBroken) {
    const reforgedName = item.nameReforged || template?.nameReforged;
    if (reforgedName) {
      return formatWithOriginal(`破损的${reforgedName}`);
    }
  }

  if (workState === 'REFORGED') {
    const reforgedName = item.nameReforged || template?.nameReforged;
    if (reforgedName) return formatWithOriginal(reforgedName);
  }
  if (workState === 'FORGED') {
    const counterfeitName = item.nameCounterfeit || template?.nameCounterfeit;
    if (counterfeitName) return formatWithOriginal(counterfeitName);
  }
  if (workState === 'RESTORED') {
    const restoredName = item.nameRestored || template?.nameRestored;
    if (restoredName) return formatWithOriginal(restoredName);
  }

  // 默认名称
  if (item.nameDefault) {
    return item.nameDefault;
  }
  if (template?.nameDefault) {
    return template.nameDefault;
  }

  // 2. 备选：旧的变体系统
  const variant = getActiveVariant(item);
  if (variant?.name) {
    return variant.name;
  }

  // 3. 最终回退：原始名称
  return item.name;
}

/**
 * 获取物品的显示描述
 * 优先级：WorkState 描述变体 > CSV模板 > 旧变体系统 > 原始描述
 */
export function getDisplayDescription(item: Item): string {
  // 确定实际的工作状态（兼容旧存档：wasReforged/wasRestored/wasForged 为 true 但 workState 未设置）
  let workState = item.workState || 'DEFAULT';
  if (workState === 'DEFAULT' && item.wasReforged) {
    workState = 'REFORGED';
  } else if (workState === 'DEFAULT' && item.wasForged) {
    workState = 'FORGED';
  } else if (workState === 'DEFAULT' && item.wasRestored) {
    workState = 'RESTORED';
  }

  // 尝试从 CSV 模板获取（兼容旧存档）
  const template = item.templateId ? getItemTemplate(item.templateId) :
                   item.id ? getItemTemplate(item.id) : undefined;

  // 破损态 + 重铸态组合：保留 G3 信息（设计文档 v1.0 变体名称规则）
  const isBrokenDesc = (item.tags || []).includes('BROKEN');
  if (workState === 'REFORGED' && isBrokenDesc) {
    const reforgedDesc = item.descReforged || template?.descReforged;
    if (reforgedDesc) {
      return `物品严重损坏，但仍可辨认出其不凡的来历。${reforgedDesc}`;
    }
  }

  if (workState === 'REFORGED') {
    const reforgedDesc = item.descReforged || template?.descReforged;
    if (reforgedDesc) return reforgedDesc;
  }
  if (workState === 'FORGED') {
    const counterfeitDesc = item.descCounterfeit || template?.descCounterfeit;
    if (counterfeitDesc) return counterfeitDesc;
  }
  if (workState === 'RESTORED') {
    const restoredDesc = item.descRestored || template?.descRestored;
    if (restoredDesc) return restoredDesc;
  }

  // 默认描述
  if (item.descDefault) {
    return item.descDefault;
  }
  if (template?.descDefault) {
    return template.descDefault;
  }

  // 2. 备选：旧的变体系统
  const variant = getActiveVariant(item);
  if (variant?.description) {
    return variant.description;
  }

  // 3. 最终回退：原始描述
  return item.visualDescription;
}

// ============================================================================
// 知识池相关
// ============================================================================

/**
 * 根据物品的属性标签计算知识池的产出配比
 */
export function calculateEssenceYieldFromTags(item: Item): EssenceCost {
  const attributeTags = getAttributeTags(item);

  if (attributeTags.length === 0) {
    // 没有属性标签，默认平均分配
    return { craft: 0.34, time: 0.33, vibe: 0.33 };
  }

  // 收集所有属性标签的产出配比
  let totalCraft = 0;
  let totalTime = 0;
  let totalVibe = 0;
  let count = 0;

  for (const tag of attributeTags) {
    const def = getTagDefinition(tag);
    if (def.essenceYield) {
      totalCraft += def.essenceYield.craft || 0;
      totalTime += def.essenceYield.time || 0;
      totalVibe += def.essenceYield.vibe || 0;
      count++;
    }
  }

  if (count === 0) {
    return { craft: 0.34, time: 0.33, vibe: 0.33 };
  }

  // 平均并归一化
  const total = totalCraft + totalTime + totalVibe;
  if (total === 0) {
    return { craft: 0.34, time: 0.33, vibe: 0.33 };
  }

  return {
    craft: totalCraft / total,
    time: totalTime / total,
    vibe: totalVibe / total,
  };
}

/**
 * 初始化物品的知识池
 * @param item 物品
 * @param capacity 知识池容量（默认100）
 */
export function initializeKnowledgePool(item: Item, capacity: number = 100): Item {
  const essenceYield = calculateEssenceYieldFromTags(item);

  return {
    ...item,
    knowledgePool: {
      capacity,
      extracted: 0,
      essenceYield,
    },
  };
}

/**
 * 检查物品是否已被完全"榨干"（知识池耗尽）
 */
export function isKnowledgePoolDepleted(item: Item): boolean {
  if (!item.knowledgePool) return false;
  return item.knowledgePool.extracted >= item.knowledgePool.capacity;
}

/**
 * 获取知识池剩余量
 */
export function getRemainingKnowledge(item: Item): number {
  if (!item.knowledgePool) return 0;
  return item.knowledgePool.capacity - item.knowledgePool.extracted;
}

// ============================================================================
// 标签显示
// ============================================================================

/**
 * 获取标签的显示信息
 */
export function getTagDisplayInfo(tag: ItemTag): {
  name: string;
  icon: string;
  description: string;
  isNegative: boolean;
} {
  const def = getTagDefinition(tag);
  return {
    name: def.displayName,
    icon: def.icon || '🏷️',
    description: def.description,
    isNegative: def.isNegative || false,
  };
}

/**
 * 获取物品所有标签的显示信息
 */
export function getItemTagsDisplay(item: Item): Array<{
  tag: ItemTag;
  name: string;
  icon: string;
  isNegative: boolean;
}> {
  return (item.tags || []).map(tag => {
    const def = getTagDefinition(tag);
    return {
      tag,
      name: def.displayName,
      icon: def.icon || '🏷️',
      isNegative: def.isNegative || false,
    };
  });
}
