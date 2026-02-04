/**
 * 资源加载系统
 *
 * 提供物品图标和人物头像的路径解析
 */

import type { Item } from '../items/types';
import type { CustomerPortraits } from '../narrative/types';

// 资源基础路径 (Vite publicDir: 'assets' 会将内容直接放在根路径)
const ASSETS_BASE = '';

// ============================================================================
// 物品图标
// ============================================================================

export type ItemState = 'default' | 'restored' | 'reforged';

/**
 * 获取物品图标路径
 *
 * 目录结构: assets/items/{itemId}/{state}.png
 * 例如: assets/items/item_watch_01/default.png
 *
 * ID 直接用作目录名，不做转换。
 */
export function getItemIconPath(itemId: string, state: ItemState = 'default'): string {
  return `${ASSETS_BASE}/items/${itemId}/${state}.png`;
}

/**
 * 根据物品当前状态自动获取正确的图标
 */
export function getItemIcon(item: Item): string {
  let state: ItemState = 'default';

  if (item.workState === 'REFORGED' || item.wasReforged) {
    state = 'reforged';
  } else if (item.workState === 'RESTORED' || item.wasRestored) {
    state = 'restored';
  }

  // 提取 templateId 或 id 用于查找图标
  const baseId = item.templateId || item.id;
  return getItemIconPath(baseId, state);
}

/**
 * 检查物品图标是否存在 (运行时检查)
 */
export async function checkItemIconExists(itemId: string, state: ItemState = 'default'): Promise<boolean> {
  const path = getItemIconPath(itemId, state);
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// 人物头像
// ============================================================================

export type EmotionType = 'neutral' | 'grateful' | 'resentful' | 'desperate' | 'angry';

/**
 * 获取人物头像路径
 */
export function getCharacterPortraitPath(characterId: string, emotion: EmotionType = 'neutral'): string {
  return `${ASSETS_BASE}/characters/${characterId}/${emotion}.png`;
}

/**
 * 获取人物所有头像路径
 */
export function getCharacterPortraits(characterId: string): CustomerPortraits {
  return {
    neutral: getCharacterPortraitPath(characterId, 'neutral'),
    grateful: getCharacterPortraitPath(characterId, 'grateful'),
    resentful: getCharacterPortraitPath(characterId, 'resentful'),
    desperate: getCharacterPortraitPath(characterId, 'desperate'),
    angry: getCharacterPortraitPath(characterId, 'angry'),
  };
}

/**
 * 从 mood 映射到 emotion type
 * Mood 类型: 'Happy' | 'Neutral' | 'Annoyed' | 'Angry'
 */
export function moodToEmotion(mood: string): EmotionType {
  const moodMap: Record<string, EmotionType> = {
    // PascalCase (actual Mood type values)
    Happy: 'grateful',
    Neutral: 'neutral',
    Annoyed: 'resentful',
    Angry: 'angry',
    // UPPERCASE (legacy/fallback)
    HAPPY: 'grateful',
    GRATEFUL: 'grateful',
    NEUTRAL: 'neutral',
    ANXIOUS: 'desperate',
    ANGRY: 'angry',
    RESENTFUL: 'resentful',
    DESPERATE: 'desperate',
  };
  return moodMap[mood] || 'neutral';
}

// ============================================================================
// 通用占位符
// ============================================================================

/**
 * 人物头像占位图路径
 * 使用 generic_male_middle 的 neutral 头像作为通用占位符
 */
export const PORTRAIT_PLACEHOLDER = '/characters/generic_male_middle/neutral.png';

/**
 * 生成 placeholder 图标 (当资源不存在时使用)
 * 使用 data URI 生成一个带文字的占位图
 */
export function getPlaceholderIcon(text: string, size: number = 64): string {
  // 简单的 SVG 占位符
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="#374151"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9CA3AF" font-size="${size / 4}px" font-family="sans-serif">
        ${text.slice(0, 2).toUpperCase()}
      </text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

/**
 * 带回退的图片 URL
 */
export function withFallback(primaryUrl: string, fallbackText: string): string {
  // 这个函数返回主 URL，组件层面应该处理 onError
  return primaryUrl;
}

// ============================================================================
// 预定义资源映射
// ============================================================================

// 物品分类到默认图标的映射
export const CATEGORY_ICONS: Record<string, string> = {
  钟表: getPlaceholderIcon('钟'),
  首饰: getPlaceholderIcon('饰'),
  艺术品: getPlaceholderIcon('艺'),
  古董: getPlaceholderIcon('古'),
  书籍: getPlaceholderIcon('书'),
  电子产品: getPlaceholderIcon('电'),
  珠宝: getPlaceholderIcon('珠'),
  服饰: getPlaceholderIcon('服'),
  奢侈品: getPlaceholderIcon('奢'),
  古玩: getPlaceholderIcon('玩'),
  测试物品: getPlaceholderIcon('测'),
  Misc: getPlaceholderIcon('杂'),
};

/**
 * 获取分类的默认图标
 */
export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || getPlaceholderIcon(category);
}

// 核心 NPC ID 列表
export const CORE_CHARACTER_IDS = [
  'emma',
  'zhao',
  'lin',
  'susan',
  'generic_male_young',
  'generic_male_middle',
  'generic_male_old',
  'generic_female_young',
  'generic_female_middle',
  'generic_female_old',
] as const;

export type CoreCharacterId = typeof CORE_CHARACTER_IDS[number];
