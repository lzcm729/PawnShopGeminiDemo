/**
 * 物品标签系统 (Item Tag System)
 *
 * 标签是物品的"DNA"，决定了物品的属性、价值和交互选项。
 * 标签分为三组：状态组、材质/属性组、本质/价值组。
 */

// ============================================================================
// 标签类型定义
// ============================================================================

/**
 * G1. 状态组 (State Tags)
 * 描述物品当前的物理状况，通常是负面的。
 * 玩法关联："修复"行为的主要目标是移除此组标签。
 */
export type StateTag = 'BROKEN' | 'DIRTY' | 'RUSTED' | 'MINT';

/**
 * G2. 材质/属性组 (Attribute Tags)
 * 描述物品的固有材质或特性，通常不可移除。
 * 玩法关联：决定"格物"时产出哪种类型的附属货币。
 */
export type AttributeTag =
  | 'GOLD'           // 贵金属 - 产出匠心
  | 'MECHANICAL'     // 精密机械 - 产出匠心
  | 'ARTISTIC'       // 艺术品 - 产出灵韵
  | 'VINTAGE_REAL'   // 真年份/古董 - 产出旧影
  | 'SENTIMENTAL'    // 情感价值 - 产出旧影
  | 'TRENDY';        // 潮流物品 - 产出灵韵

/**
 * G3. 本质/价值组 (Essence Tags)
 * 描述物品的市场定位或虚构故事，通常是高价值的。
 * 玩法关联："重铸"行为的主要目标是注入此组标签。
 */
export type EssenceTag =
  | 'FAKE_HISTORY'   // 伪造历史 - 做旧处理的赝品
  | 'IMPERIAL'       // 御用/宫廷 - 极高溢价
  | 'TRENDING'       // 潮流热点 - 短期价值暴涨
  | 'CURSED'         // 诅咒 - 特殊玩法
  | 'CELEBRITY'      // 名人关联 - 高溢价
  | 'LIMITED';       // 限量版 - 稀缺溢价

/**
 * 所有标签类型的联合
 */
export type ItemTag = StateTag | AttributeTag | EssenceTag;

/**
 * 标签分组类型
 */
export type TagGroup = 'STATE' | 'ATTRIBUTE' | 'ESSENCE';

// ============================================================================
// 标签定义接口
// ============================================================================

/**
 * 标签定义 - 包含标签的元数据
 */
export interface TagDefinition {
  id: ItemTag;
  group: TagGroup;
  valueMultiplier: number;      // 价值系数 (0.1 = 1折, 10.0 = 10倍)
  displayName: string;          // 中文显示名
  description: string;          // 描述
  icon?: string;                // 图标 (emoji 或图片路径)
  isNegative?: boolean;         // 是否为负面标签
  canBeRemoved?: boolean;       // 是否可被移除（修复）
  essenceYield?: {              // 格物时的点数产出配比
    craft?: number;             // 匠心产出权重 (0-1)
    time?: number;              // 旧影产出权重 (0-1)
    vibe?: number;              // 灵韵产出权重 (0-1)
  };
}

// ============================================================================
// 物品变体接口
// ============================================================================

/**
 * 物品变体 - 根据标签状态动态切换的"皮肤"
 *
 * 变体是预先写好的"名字+描述+图片"的组合包，
 * 系统根据当前的标签状态动态决定显示哪一套。
 */
export interface ItemVariant {
  id: string;
  name: string;                 // 变体名称 (如 "宫廷御用怀表")
  description: string;          // 变体描述
  image?: string;               // 变体图片路径
  triggerTags: ItemTag[];       // 触发条件 - 需要拥有的标签
  excludeTags?: ItemTag[];      // 排除条件 - 不能拥有的标签
  priority: number;             // 优先级 (数字越大优先级越高)
}

/**
 * 变体优先级说明：
 * 1. 重铸态 (Essence): priority 100+ - 如果物品变成了"宫廷御用"，它就是御用品
 * 2. 破损态 (State - Negative): priority 50-99 - 如果御用怀表被砸烂了，它首先看起来是"烂的"
 * 3. 修复态 (State - Restored): priority 20-49 - 特指从破损恢复的状态
 * 4. 默认态 (Default): priority 0-19 - 没有任何特殊状态标签时
 */

// ============================================================================
// 知识池接口 (用于格物系统)
// ============================================================================

/**
 * 知识池 - 物品中蕴含的知识储备
 *
 * 每个物品都有固定的"知识总量"，格物时逐步提取。
 * 物品可产出1-3种点数，由G2材质/属性标签决定。
 */
export interface KnowledgePool {
  capacity: number;             // 总容量 (如 100)
  extracted: number;            // 已提取量 (0 表示满的，capacity 表示榨干)
  essenceYield: {               // 产出配比 (总和为1)
    craft?: number;             // 匠心产出比例
    time?: number;              // 旧影产出比例
    vibe?: number;              // 灵韵产出比例
  };
}

// ============================================================================
// 类型守卫
// ============================================================================

export const STATE_TAGS: StateTag[] = ['BROKEN', 'DIRTY', 'RUSTED', 'MINT'];
export const ATTRIBUTE_TAGS: AttributeTag[] = ['GOLD', 'MECHANICAL', 'ARTISTIC', 'VINTAGE_REAL', 'SENTIMENTAL', 'TRENDY'];
export const ESSENCE_TAGS: EssenceTag[] = ['FAKE_HISTORY', 'IMPERIAL', 'TRENDING', 'CURSED', 'CELEBRITY', 'LIMITED'];

export function isStateTag(tag: ItemTag): tag is StateTag {
  return STATE_TAGS.includes(tag as StateTag);
}

export function isAttributeTag(tag: ItemTag): tag is AttributeTag {
  return ATTRIBUTE_TAGS.includes(tag as AttributeTag);
}

export function isEssenceTag(tag: ItemTag): tag is EssenceTag {
  return ESSENCE_TAGS.includes(tag as EssenceTag);
}

export function getTagGroup(tag: ItemTag): TagGroup {
  if (isStateTag(tag)) return 'STATE';
  if (isAttributeTag(tag)) return 'ATTRIBUTE';
  return 'ESSENCE';
}
