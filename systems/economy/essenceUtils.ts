/**
 * 精魄工具函数 (Essence Utilities)
 *
 * 提供精魄操作的核心函数：
 * - 增加/消耗精魄
 * - 检查是否能支付
 * - 根据物品标签计算产出
 */

import { EssenceBalance, EssenceType, EssenceCost, ESSENCE_TYPES } from './essence';
import { Item } from '../items/types';
import { calculateEssenceYieldFromTags } from '../items/tagUtils';

// ============================================================================
// 余额操作
// ============================================================================

/**
 * 增加精魄
 * @returns 新的余额对象（不修改原对象）
 */
export function addEssence(
  balance: EssenceBalance,
  type: EssenceType,
  amount: number
): EssenceBalance {
  if (amount < 0) {
    console.warn('addEssence: amount should be positive');
    return balance;
  }

  const key = type.toLowerCase() as keyof EssenceBalance;
  return {
    ...balance,
    [key]: balance[key] + amount,
  };
}

/**
 * 批量增加精魄
 * @returns 新的余额对象（不修改原对象）
 */
export function addEssenceBatch(
  balance: EssenceBalance,
  gains: EssenceCost
): EssenceBalance {
  return {
    craft: balance.craft + (gains.craft || 0),
    time: balance.time + (gains.time || 0),
    vibe: balance.vibe + (gains.vibe || 0),
  };
}

/**
 * 消耗精魄
 * @returns 新的余额对象，如果余额不足返回 null
 */
export function spendEssence(
  balance: EssenceBalance,
  type: EssenceType,
  amount: number
): EssenceBalance | null {
  if (amount < 0) {
    console.warn('spendEssence: amount should be positive');
    return balance;
  }

  const key = type.toLowerCase() as keyof EssenceBalance;
  if (balance[key] < amount) {
    return null; // 余额不足
  }

  return {
    ...balance,
    [key]: balance[key] - amount,
  };
}

/**
 * 批量消耗精魄
 * @returns 新的余额对象，如果余额不足返回 null
 */
export function spendEssenceBatch(
  balance: EssenceBalance,
  costs: EssenceCost
): EssenceBalance | null {
  // 先检查是否能支付
  if (!canAfford(balance, costs)) {
    return null;
  }

  return {
    craft: balance.craft - (costs.craft || 0),
    time: balance.time - (costs.time || 0),
    vibe: balance.vibe - (costs.vibe || 0),
  };
}

// ============================================================================
// 检查函数
// ============================================================================

/**
 * 检查是否能支付指定的精魄成本
 */
export function canAfford(balance: EssenceBalance, costs: EssenceCost): boolean {
  if (costs.craft && balance.craft < costs.craft) return false;
  if (costs.time && balance.time < costs.time) return false;
  if (costs.vibe && balance.vibe < costs.vibe) return false;
  return true;
}

/**
 * 计算缺少多少精魄
 * @returns 每种类型缺少的数量（0 表示足够）
 */
export function getDeficit(balance: EssenceBalance, costs: EssenceCost): EssenceCost {
  return {
    craft: costs.craft ? Math.max(0, costs.craft - balance.craft) : 0,
    time: costs.time ? Math.max(0, costs.time - balance.time) : 0,
    vibe: costs.vibe ? Math.max(0, costs.vibe - balance.vibe) : 0,
  };
}

/**
 * 获取总精魄数量
 */
export function getTotalEssence(balance: EssenceBalance): number {
  return balance.craft + balance.time + balance.vibe;
}

// ============================================================================
// 格物相关
// ============================================================================

/**
 * 根据物品标签计算格物的产出配比
 * 这是 calculateEssenceYieldFromTags 的别名，方便从 essenceUtils 导入
 */
export function getEssenceYieldFromTags(item: Item): EssenceCost {
  return calculateEssenceYieldFromTags(item);
}

/**
 * 根据产出配比和提取量计算实际获得的精魄
 * @param extractedAmount 提取的知识量
 * @param yieldRatios 产出配比 (总和为1)
 * @returns 实际获得的各类精魄（向下取整）
 */
export function calculateEssenceGain(
  extractedAmount: number,
  yieldRatios: EssenceCost
): EssenceCost {
  return {
    craft: yieldRatios.craft ? Math.floor(extractedAmount * yieldRatios.craft) : 0,
    time: yieldRatios.time ? Math.floor(extractedAmount * yieldRatios.time) : 0,
    vibe: yieldRatios.vibe ? Math.floor(extractedAmount * yieldRatios.vibe) : 0,
  };
}

// ============================================================================
// 显示与格式化
// ============================================================================

/**
 * 格式化精魄余额为显示字符串
 */
export function formatEssenceBalance(balance: EssenceBalance): string {
  return `匠心: ${balance.craft} | 旧影: ${balance.time} | 灵韵: ${balance.vibe}`;
}

/**
 * 格式化精魄成本为显示字符串
 */
export function formatEssenceCost(cost: EssenceCost): string {
  const parts: string[] = [];
  if (cost.craft) parts.push(`匠心 ${cost.craft}`);
  if (cost.time) parts.push(`旧影 ${cost.time}`);
  if (cost.vibe) parts.push(`灵韵 ${cost.vibe}`);
  return parts.join(' + ') || '无消耗';
}

/**
 * 将精魄成本转换为数组格式（方便 UI 渲染）
 */
export function essenceCostToArray(cost: EssenceCost): Array<{
  type: EssenceType;
  amount: number;
  name: string;
  icon: string;
}> {
  const result: Array<{ type: EssenceType; amount: number; name: string; icon: string }> = [];

  if (cost.craft && cost.craft > 0) {
    result.push({ type: 'CRAFT', amount: cost.craft, name: '匠心', icon: '🛠️' });
  }
  if (cost.time && cost.time > 0) {
    result.push({ type: 'TIME', amount: cost.time, name: '旧影', icon: '📜' });
  }
  if (cost.vibe && cost.vibe > 0) {
    result.push({ type: 'VIBE', amount: cost.vibe, name: '灵韵', icon: '🎨' });
  }

  return result;
}

// ============================================================================
// 修复/重铸成本计算
// ============================================================================

/**
 * 根据物品计算修复某个负面标签的成本
 *
 * 设计原则：修复成本由物品的属性标签决定，而非固定值
 * 修复成本较低（约半个晚上的产出）
 *
 * @param item 物品
 * @param baseCost 基础成本（由配方定义）
 * @returns 实际成本（可能根据物品属性调整）
 */
export function calculateRestoreCost(
  item: Item,
  baseCost: EssenceCost
): EssenceCost {
  // 目前直接返回基础成本
  // 未来可以根据物品的属性标签进行调整
  return baseCost;
}

/**
 * 根据物品计算重铸的成本
 *
 * 设计原则：重铸成本由物品和目标配方共同决定
 * 重铸成本较高（约3-5天的积累）
 *
 * @param item 物品
 * @param baseCost 基础成本（由配方定义）
 * @returns 实际成本（可能根据物品属性调整）
 */
export function calculateReforgeCost(
  item: Item,
  baseCost: EssenceCost
): EssenceCost {
  // 目前直接返回基础成本
  // 未来可以根据物品的基础价值进行缩放
  return baseCost;
}
