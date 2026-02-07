/**
 * 格物系统核心逻辑 (Insight System Logic)
 *
 * 提供格物操作的核心函数：
 * - 检查是否可以格物
 * - 执行格物操作
 * - 计算顿悟条件
 * - 生成格物叙事文本
 *
 * v1.1 新增：
 * - 随机化产出 (15-25)
 * - 顿悟暴击比例修正 (25% of capacity)
 * - 格物意外事件（走神/惊人发现）
 * - 窥见事件 (Glimpse)
 * - 共鸣事件 (Resonance)
 * - 精力上限可成长
 * - 顿悟后残留不确定性
 * - 收益递减信息字段
 */

import { Item, ItemStatus, ItemTrait } from '../items/types';
import { KnowledgePool } from '../items/tags';
import { EssenceCost } from '../economy/essence';
import { NightState } from '../game/types';
import { GAME_CONFIG } from '../game/config';
import {
  InsightResult,
  InsightStatus,
  InsightBlockReason,
  InsightNarrative,
  UnexpectedEventType,
  DepletedRewards,
} from './types';
import {
  calculateEssenceYieldFromTags,
  initializeKnowledgePool,
  getRemainingKnowledge,
  isKnowledgePoolDepleted,
  getAttributeTags,
} from '../items/tagUtils';
import { calculateEssenceGain } from '../economy/essenceUtils';

// ============================================================================
// 配置读取
// ============================================================================

const getInsightConfig = () => ({
  energyCost: GAME_CONFIG.NIGHT.INSIGHT_ENERGY_COST,
  extractionRateMin: GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE_MIN,
  extractionRateMax: GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE_MAX,
  epiphanyBonusRatio: GAME_CONFIG.NIGHT.EPIPHANY_BONUS_RATIO,
  defaultCapacity: GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY,
  // 夜间鉴定配置
  rangeShrinkRate: GAME_CONFIG.NIGHT.INSIGHT_RANGE_SHRINK_RATE,
  traitDiscoveryChance: GAME_CONFIG.NIGHT.INSIGHT_TRAIT_DISCOVERY_CHANCE,
  valueLockThreshold: GAME_CONFIG.NIGHT.VALUE_LOCK_THRESHOLD,
  // v1.1 新增配置
  distractionChance: GAME_CONFIG.NIGHT.DISTRACTION_CHANCE,
  remarkableFindChance: GAME_CONFIG.NIGHT.REMARKABLE_FIND_CHANCE,
  glimpseChance: GAME_CONFIG.NIGHT.GLIMPSE_CHANCE,
  resonanceChance: GAME_CONFIG.NIGHT.RESONANCE_CHANCE,
  resonanceBonusRatio: GAME_CONFIG.NIGHT.RESONANCE_BONUS_RATIO,
  epiphanyResidualUncertainty: GAME_CONFIG.NIGHT.EPIPHANY_RESIDUAL_UNCERTAINTY,
});

// ============================================================================
// 随机产出计算 (S3-F1)
// ============================================================================

/**
 * 计算随机格物产出量
 * 范围: [min, max] (inclusive)
 */
function rollExtractionAmount(): number {
  const config = getInsightConfig();
  const min = config.extractionRateMin;
  const max = config.extractionRateMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// 格物意外事件判定 (S3-F3)
// ============================================================================

/**
 * 判定格物意外事件
 * 走神 (5%): 产出减半
 * 惊人发现 (5%): 产出翻倍
 * 互斥：先掷一次随机数
 */
function rollUnexpectedEvent(): UnexpectedEventType | undefined {
  const config = getInsightConfig();
  const roll = Math.random();
  if (roll < config.distractionChance) {
    return 'DISTRACTION';
  }
  if (roll > 1 - config.remarkableFindChance) {
    return 'REMARKABLE_FIND';
  }
  return undefined;
}

/**
 * 应用意外事件对产出量的影响
 */
function applyUnexpectedEvent(
  baseAmount: number,
  event: UnexpectedEventType | undefined
): number {
  if (!event) return baseAmount;
  if (event === 'DISTRACTION') return Math.floor(baseAmount / 2);
  if (event === 'REMARKABLE_FIND') return baseAmount * 2;
  return baseAmount;
}

// ============================================================================
// 窥见事件 (S3-F4)
// ============================================================================

/**
 * 尝试触发窥见事件
 * 条件：物品有未解锁的故事（知识池未清空），概率触发
 */
function tryGlimpse(item: Item): { text: string } | undefined {
  const config = getInsightConfig();

  // 已顿悟的物品不触发窥见
  if (isKnowledgePoolDepleted(item)) return undefined;

  // 概率检查
  if (Math.random() > config.glimpseChance) return undefined;

  // S3-C2: 从丰富的窥见文案库中随机选择
  const tags = item.tags || [];
  const glimpses = getGlimpseTexts(item, tags);
  const index = Math.floor(Math.random() * glimpses.length);
  return { text: glimpses[index] };
}

// ============================================================================
// 共鸣事件 (S3-F5)
// ============================================================================

/**
 * 尝试触发共鸣事件
 * 条件：库存中存在共享 G2 属性标签的其他物品
 */
function tryResonance(
  item: Item,
  inventory: Item[]
): { text: string; bonusEssence: EssenceCost; pairedItemId: string; pairedItemName: string } | undefined {
  const config = getInsightConfig();

  const itemAttrTags = getAttributeTags(item);
  if (itemAttrTags.length === 0) return undefined;

  // 查找库存中共享 G2 属性标签的其他物品
  const pairedItem = inventory.find(other => {
    if (other.id === item.id) return false;
    if (other.status !== ItemStatus.ACTIVE && other.status !== ItemStatus.FORFEIT) return false;
    const otherAttrTags = getAttributeTags(other);
    return otherAttrTags.some(tag => itemAttrTags.includes(tag));
  });

  if (!pairedItem) return undefined;

  // 概率检查
  if (Math.random() > config.resonanceChance) return undefined;

  // 计算共鸣奖励精魄
  const pool = item.knowledgePool;
  const yieldRatios = pool?.essenceYield || calculateEssenceYieldFromTags(item);
  const bonusAmount = Math.floor(config.extractionRateMin * config.resonanceBonusRatio);
  const bonusEssence = calculateEssenceGain(bonusAmount, yieldRatios);

  return {
    text: `${item.name}与${pairedItem.name}之间产生了微妙的共鸣...它们之间似乎有着不为人知的联系。`,
    bonusEssence,
    pairedItemId: pairedItem.id,
    pairedItemName: pairedItem.name,
  };
}

// ============================================================================
// 夜间鉴定辅助函数
// ============================================================================

/**
 * 检查物品估价是否已锁定（区间足够小）
 */
export function isValueLocked(item: Item): boolean {
  const config = getInsightConfig();
  const [min, max] = item.currentRange;
  const width = max - min;
  const realValue = item.realValue;

  // 区间宽度 / 真值 < 阈值时视为锁定
  // 或者区间宽度小于 100（绝对值兜底）
  return (width / realValue < config.valueLockThreshold) || (width < 100);
}

/**
 * 收窄估价区间，向真值靠拢
 */
function shrinkRange(item: Item): [number, number] {
  const config = getInsightConfig();
  const [min, max] = item.currentRange;
  const realValue = item.realValue;

  // Lerp 向真值收窄
  const newMin = min + (realValue - min) * config.rangeShrinkRate;
  const newMax = max - (max - realValue) * config.rangeShrinkRate;

  return [Math.round(newMin), Math.round(newMax)];
}

/**
 * 检查收窄后的区间是否应该锁定
 */
function shouldLockAfterShrink(newRange: [number, number], realValue: number): boolean {
  const config = getInsightConfig();
  const [min, max] = newRange;
  const width = max - min;

  return (width / realValue < config.valueLockThreshold) || (width < 100);
}

/**
 * 尝试发现一个隐藏特征
 */
function tryDiscoverTrait(item: Item): ItemTrait | undefined {
  const config = getInsightConfig();
  const hiddenTraits = item.hiddenTraits || [];

  if (hiddenTraits.length === 0) return undefined;
  if (Math.random() > config.traitDiscoveryChance) return undefined;

  const index = Math.floor(Math.random() * hiddenTraits.length);
  return hiddenTraits[index];
}

// ============================================================================
// 检查函数
// ============================================================================

/**
 * 检查物品是否可以被格物
 */
export function getInsightStatus(item: Item, nightState: NightState): InsightStatus {
  const config = getInsightConfig();

  // 确保物品有知识池
  const pool = item.knowledgePool || {
    capacity: config.defaultCapacity,
    extracted: 0,
    essenceYield: calculateEssenceYieldFromTags(item),
  };

  const remaining = pool.capacity - pool.extracted;
  const progress = pool.extracted / pool.capacity;
  // 使用最大产出判断是否接近顿悟（最乐观估计）
  const nearEpiphany = remaining > 0 && remaining <= config.extractionRateMax;

  // 检查各种阻止条件
  let canInsight = true;
  let reason: InsightBlockReason | undefined;

  if (item.status === ItemStatus.REDEEMED) {
    canInsight = false;
    reason = 'ITEM_REDEEMED';
  } else if (item.status === ItemStatus.SOLD) {
    canInsight = false;
    reason = 'ITEM_SOLD';
  } else if (isKnowledgePoolDepleted(item)) {
    canInsight = false;
    reason = 'DEPLETED';
  } else if (item.insightedTonight) {
    canInsight = false;
    reason = 'ALREADY_INSIGHTED';
  } else if (nightState.energy < config.energyCost) {
    canInsight = false;
    reason = 'NO_ENERGY';
  }

  // 夜间鉴定状态
  const valueLocked = isValueLocked(item);
  const hiddenTraitCount = (item.hiddenTraits || []).length;
  const revealedTraitCount = (item.revealedTraits || []).length;

  // 收益递减状态 (S3-F8)
  const allTraitsRevealed = hiddenTraitCount === 0;
  const depletedRewards: DepletedRewards = {
    valueLocked,
    allTraitsRevealed,
    onlyEssenceRemaining: valueLocked && allTraitsRevealed,
  };

  // 距顿悟次数（基于最大产出的乐观估计）
  const insightsToEpiphany = remaining <= 0
    ? 0
    : Math.ceil(remaining / config.extractionRateMax);

  return {
    canInsight,
    reason,
    progress,
    remainingKnowledge: remaining,
    estimatedYield: pool.essenceYield,
    nearEpiphany,
    isValueLocked: valueLocked,
    hiddenTraitCount,
    revealedTraitCount,
    depletedRewards,
    insightsToEpiphany,
  };
}

/**
 * 简化的可格物检查
 */
export function canInsight(item: Item, nightState: NightState): boolean {
  return getInsightStatus(item, nightState).canInsight;
}

// ============================================================================
// 执行格物
// ============================================================================

/**
 * 执行格物操作
 *
 * 格物产出三项收益：
 * 1. 点数（必得）- 直到知识池清空
 * 2. 估价收窄 ~20%（必得）- 直到估价锁定
 * 3. 特征发现 25%（概率）- 直到特征全开
 *
 * v1.1 新增：
 * - 随机产出 15-25（S3-F1）
 * - 顿悟暴击基于知识池上限的25%（S3-F2）
 * - 意外事件（S3-F3）
 * - 窥见事件（S3-F4）
 * - 共鸣事件（S3-F5）
 * - 顿悟残留不确定性（S3-F7）
 */
export function performInsight(
  item: Item,
  nightState: NightState,
  inventory?: Item[]
): { result: InsightResult; updatedItem: Item } | null {
  const status = getInsightStatus(item, nightState);

  if (!status.canInsight) {
    return null;
  }

  const config = getInsightConfig();

  // 确保物品有知识池
  let workingItem = item.knowledgePool
    ? item
    : initializeKnowledgePool(item, config.defaultCapacity);

  const pool = workingItem.knowledgePool!;
  const remaining = getRemainingKnowledge(workingItem);

  // S3-F1: 随机产出量
  const baseExtraction = rollExtractionAmount();

  // S3-F3: 格物意外事件判定
  const unexpectedEvent = rollUnexpectedEvent();
  const modifiedExtraction = applyUnexpectedEvent(baseExtraction, unexpectedEvent);

  // 计算实际提取量（不超过剩余量）
  const extractedAmount = Math.min(modifiedExtraction, remaining);

  // 计算产出精魄
  const essenceGained = calculateEssenceGain(extractedAmount, pool.essenceYield);

  // 检查是否触发顿悟
  const newExtracted = pool.extracted + extractedAmount;
  const isEpiphany = newExtracted >= pool.capacity;

  // S3-F2: 顿悟暴击基于知识池上限的25%（而非提取量）
  let bonusEssence: EssenceCost | undefined;
  if (isEpiphany) {
    const bonusAmount = Math.floor(pool.capacity * config.epiphanyBonusRatio);
    bonusEssence = calculateEssenceGain(bonusAmount, pool.essenceYield);
  }

  // =========================================================================
  // 夜间鉴定：估价收窄逻辑
  // =========================================================================
  let rangeNarrowed = false;
  let newRange: [number, number] | undefined;
  let valueLocked = false;
  let updatedCurrentRange = workingItem.currentRange;
  let updatedPerceivedValue = workingItem.perceivedValue;

  const wasValueLocked = isValueLocked(workingItem);

  if (isEpiphany) {
    // S3-F7: 顿悟兜底 — 强制收窄，但保留微量不确定性
    if (!wasValueLocked) {
      rangeNarrowed = true;
      const halfUncertainty = config.epiphanyResidualUncertainty / 2;
      const residualMin = Math.round(workingItem.realValue * (1 - halfUncertainty));
      const residualMax = Math.round(workingItem.realValue * (1 + halfUncertainty));
      newRange = [residualMin, residualMax];
      valueLocked = true;
      updatedCurrentRange = newRange;
      updatedPerceivedValue = undefined;
    }
  } else if (!wasValueLocked) {
    // 普通格物：收窄估价区间
    const shrunkRange = shrinkRange(workingItem);
    rangeNarrowed = true;
    newRange = shrunkRange;
    updatedCurrentRange = shrunkRange;

    if (shouldLockAfterShrink(shrunkRange, workingItem.realValue)) {
      valueLocked = true;
      newRange = [workingItem.realValue, workingItem.realValue];
      updatedCurrentRange = newRange;
      updatedPerceivedValue = undefined;
    }
  }

  // =========================================================================
  // 夜间鉴定：特征发现逻辑
  // =========================================================================
  let traitDiscovered: ItemTrait | undefined;
  let updatedHiddenTraits = [...(workingItem.hiddenTraits || [])];
  let updatedRevealedTraits = [...(workingItem.revealedTraits || [])];
  let allNewlyDiscoveredTraits: ItemTrait[] = [];

  if (isEpiphany) {
    // 顿悟兜底：强制全开所有隐藏特征
    if (updatedHiddenTraits.length > 0) {
      allNewlyDiscoveredTraits = [...updatedHiddenTraits];
      updatedRevealedTraits = [...updatedRevealedTraits, ...updatedHiddenTraits];
      if (updatedHiddenTraits.length === 1) {
        traitDiscovered = updatedHiddenTraits[0];
      }
      updatedHiddenTraits = [];
    }
  } else {
    // 普通格物：概率发现特征
    const discovered = tryDiscoverTrait(workingItem);
    if (discovered) {
      traitDiscovered = discovered;
      allNewlyDiscoveredTraits = [discovered];
      updatedHiddenTraits = updatedHiddenTraits.filter(t => t.id !== discovered.id);
      updatedRevealedTraits = [...updatedRevealedTraits, discovered];
    }
  }

  // =========================================================================
  // FAKE/JACKPOT 价值跳变：发现时立即触发
  // =========================================================================
  const discoveredFakeOrJackpot = allNewlyDiscoveredTraits.find(
    t => t.type === 'FAKE' || t.type === 'JACKPOT'
  );

  if (discoveredFakeOrJackpot && !wasValueLocked) {
    rangeNarrowed = true;
    valueLocked = true;
    newRange = [workingItem.realValue, workingItem.realValue];
    updatedCurrentRange = newRange;
    updatedPerceivedValue = undefined;
  }

  // =========================================================================
  // S3-F4: 窥见事件
  // =========================================================================
  const glimpse = !isEpiphany ? tryGlimpse(workingItem) : undefined;

  // =========================================================================
  // S3-F5: 共鸣事件
  // =========================================================================
  const resonance = !isEpiphany && inventory
    ? tryResonance(workingItem, inventory)
    : undefined;

  // =========================================================================
  // 更新物品状态
  // =========================================================================
  const updatedItem: Item = {
    ...workingItem,
    knowledgePool: {
      ...pool,
      extracted: newExtracted,
    },
    insightedTonight: true,
    currentRange: updatedCurrentRange,
    perceivedValue: updatedPerceivedValue,
    hiddenTraits: updatedHiddenTraits,
    revealedTraits: updatedRevealedTraits,
  };

  const result: InsightResult = {
    essenceGained,
    isEpiphany,
    energyRefunded: isEpiphany,
    bonusEssence,
    extractedAmount,
    remainingKnowledge: pool.capacity - newExtracted,
    rangeNarrowed,
    newRange,
    valueLocked,
    traitDiscovered,
    lockedValue: valueLocked ? workingItem.realValue : undefined,
    // v1.1 新增
    unexpectedEvent,
    glimpse,
    resonance,
  };

  return { result, updatedItem };
}

// ============================================================================
// 顿悟系统
// ============================================================================

/**
 * 检查物品是否即将触发顿悟
 */
export function isNearEpiphany(item: Item): boolean {
  if (!item.knowledgePool) return false;

  const config = getInsightConfig();
  const remaining = getRemainingKnowledge(item);

  return remaining > 0 && remaining <= config.extractionRateMax;
}

/**
 * 计算达到顿悟还需要多少次格物
 * 使用最大产出的乐观估计
 */
export function getInsightsToEpiphany(item: Item): number {
  if (!item.knowledgePool) {
    const config = getInsightConfig();
    return Math.ceil(config.defaultCapacity / config.extractionRateMax);
  }

  const remaining = getRemainingKnowledge(item);
  if (remaining <= 0) return 0;

  const config = getInsightConfig();
  return Math.ceil(remaining / config.extractionRateMax);
}

// ============================================================================
// 叙事生成
// ============================================================================

/**
 * 根据物品和结果生成格物叙事
 */
export function getInsightNarrative(
  item: Item,
  result: InsightResult
): InsightNarrative {
  const tags = item.tags || [];

  // 基础行为描述
  let actionText = `你在灯下仔细端详着${item.name}...`;

  // S3-C3: 意外事件覆盖行为描述（从多样化文案中随机选择）
  if (result.unexpectedEvent === 'DISTRACTION') {
    const texts = getDistractionTexts();
    actionText = texts[Math.floor(Math.random() * texts.length)];
  } else if (result.unexpectedEvent === 'REMARKABLE_FIND') {
    const texts = getRemarkableFindTexts(item);
    actionText = texts[Math.floor(Math.random() * texts.length)];
  }

  // 根据标签生成发现描述
  let discoveryText: string;

  if (tags.includes('MECHANICAL')) {
    discoveryText = '精密的机械结构让你对工艺有了更深的理解。';
  } else if (tags.includes('GOLD')) {
    discoveryText = '贵金属的质感与重量，让你对材质工艺有了新的认识。';
  } else if (tags.includes('VINTAGE_REAL')) {
    discoveryText = '岁月在这件物品上留下的痕迹，诉说着一段无声的历史。';
  } else if (tags.includes('SENTIMENTAL')) {
    discoveryText = '你仿佛能感受到物品主人曾经的情感寄托。';
  } else if (tags.includes('ARTISTIC')) {
    discoveryText = '艺术的美感让你的感知变得更加敏锐。';
  } else {
    discoveryText = '你从中获得了一些领悟。';
  }

  // 顿悟描述 (S3-C1: 物品类型专属独白)
  let epiphanyText: string | undefined;
  if (result.isEpiphany) {
    epiphanyText = getEpiphanyMonologue(item, tags);

    if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
      epiphanyText += '\n...只是，这件物品的主人还在等着它。';
    }
  }

  return {
    actionText,
    discoveryText,
    epiphanyText,
  };
}

// ============================================================================
// 叙事内容 (Content Layer)
// ============================================================================

/**
 * S3-C1: 顿悟专属感悟独白
 * 根据物品类型/标签生成具体洞察，而非泛泛的"我明白了"
 */
function getEpiphanyMonologue(item: Item, tags: string[]): string {
  // 钟表类
  if (tags.includes('MECHANICAL') && (item.category === '钟表' || item.name.includes('表'))) {
    return `原来如此...每一个齿轮的咬合角度，每一根游丝的弹性系数——它们不是零件，是凝固的时间本身。${item.name}的秘密，全在那永不停歇的嘀嗒声里。`;
  }
  // 珠宝/贵金属
  if (tags.includes('GOLD') && !tags.includes('MECHANICAL')) {
    return `金属不会说谎。成色、密度、折光率——${item.name}把答案刻在每一个分子里。你只需要足够安静，就能听见它的低语。`;
  }
  // 艺术品
  if (tags.includes('ARTISTIC') && !tags.includes('VINTAGE_REAL')) {
    return `笔触之间藏着呼吸的节奏，色彩的叠加记录着犹豫与决断。${item.name}不只是一件作品——它是创作者灵魂的切片。`;
  }
  // 古董/年代物
  if (tags.includes('VINTAGE_REAL') && tags.includes('ARTISTIC')) {
    return `岁月和技艺在这里交汇。你终于读懂了${item.name}表面每一道裂纹的含义——那不是瑕疵，是时间亲笔写下的签名。`;
  }
  if (tags.includes('VINTAGE_REAL')) {
    return `握着${item.name}，你看到了它流经的所有手掌。一百年的悲欢离合浓缩在这方寸之间，而你是最后一个读懂它的人。`;
  }
  // 情感物
  if (tags.includes('SENTIMENTAL')) {
    return `这不只是一件物品。${item.name}承载着某个人最珍贵的记忆——那些无法用金钱衡量的时刻。你触碰到了它的灵魂。`;
  }
  // 潮流/电子
  if (tags.includes('TRENDY')) {
    return `在批量生产的外壳之下，你发现了独一无二的痕迹。${item.name}的真正价值不在标价，而在使用它的人赋予它的意义。`;
  }
  // 乐器
  if (item.category === '乐器') {
    return `你的指尖拂过琴弦时，仿佛听到了所有曾在它上面演奏过的旋律。${item.name}记住了每一首歌——而现在，你也记住了。`;
  }
  // 书籍/文房
  if (item.category === '书籍' || item.category === '文房') {
    return `字里行间，你找到了那个写下它们的人。墨迹的深浅、笔锋的转折——${item.name}是一封跨越时空的信，而你终于读完了。`;
  }
  // 酒类
  if (item.category === '酒类') {
    return `封口之下是凝固的时光。${item.name}的每一滴都在诉说酿造那年的阳光、土壤和匠人的等待。真正的佳酿，从不急于被打开。`;
  }
  // 收藏品
  if (item.category === '收藏品') {
    return `表面的旧迹之下，是被忽略的珍贵。${item.name}的真正价值，只有愿意花时间去看的人才能发现。而你，看到了。`;
  }
  // 通用兜底
  return `你已经完全理解了${item.name}的一切秘密。表象之下的真实，此刻在你眼中清晰如镜。`;
}

/**
 * S3-C2: 窥见碎片文案
 * 根据物品标签生成多样化的故事片段
 */
function getGlimpseTexts(item: Item, tags: string[]): string[] {
  const glimpses: string[] = [];

  // 钟表类窥见
  if (tags.includes('MECHANICAL') && (item.category === '钟表' || item.name.includes('表'))) {
    glimpses.push(
      `...恍惚间，你听到了嘀嗒声背后更深沉的节奏。仿佛有人在用${item.name}计算着什么重要的日子...`,
      `...表盘上的数字忽然变得模糊，你看到了一双苍老的手，在反复校准着指针...`,
      `...机芯的齿轮在微光下闪烁，每一个咬合似乎都在低语着制表师的执念...`,
    );
  }

  // 贵金属/珠宝窥见
  if (tags.includes('GOLD')) {
    glimpses.push(
      `...金属表面映出了一张模糊的脸。不是你的——是很久以前的某个人...`,
      `...指尖传来一阵温热。这种金属的温度，不应该来自物质本身...`,
      `...光线掠过${item.name}时，你瞥见了一丝不属于这个时代的光泽...`,
    );
  }

  // 年代物窥见
  if (tags.includes('VINTAGE_REAL')) {
    glimpses.push(
      `...岁月的包浆下，隐约浮现出一个模糊的场景：有人在昏暗的灯下仔细擦拭着${item.name}...`,
      `...你闻到了一股陈旧的气息——不是霉味，而是某个时代特有的空气...`,
      `...旧日的痕迹在灯下若隐若现，像是有人在低声诉说着一段往事...`,
    );
  }

  // 情感物窥见
  if (tags.includes('SENTIMENTAL')) {
    glimpses.push(
      `...模糊的画面闪过...有人将${item.name}紧紧攥在手里，低声说着"一定会回来取的"...`,
      `...一个短暂的幻觉：小小的房间，温暖的灯光，${item.name}被小心翼翼地放在显眼的位置...`,
      `...你仿佛听到了一声叹息。不是来自风，是来自物品本身...`,
    );
  }

  // 艺术品窥见
  if (tags.includes('ARTISTIC')) {
    glimpses.push(
      `...一瞬间，色彩变得异常鲜明。你似乎看到了创作者下笔时的犹豫与坚定...`,
      `...画面深处有一个被刻意遮盖的细节。是修改？还是秘密？...`,
      `...你的目光穿透了表面，看到了最初的底稿。原来的构思和最终呈现截然不同...`,
    );
  }

  // 潮流物窥见
  if (tags.includes('TRENDY')) {
    glimpses.push(
      `...使用痕迹描绘出主人的轮廓——年轻的手指，急切的操作，和某些深夜的独处时光...`,
      `...批量制品的缝隙里，藏着一点点独特。某个人曾试图让${item.name}变得与众不同...`,
    );
  }

  // 乐器窥见
  if (item.category === '乐器') {
    glimpses.push(
      `...指尖触碰琴身时，木纹仿佛在振动。很轻，像是遥远的回声...`,
      `...恍惚间你听到了一段旋律的残片。不是幻觉——是共鸣腔里残留的记忆...`,
      `...琴弦的张力中藏着无数次调音的痕迹。每一次微调，都是演奏者与乐器的对话...`,
    );
  }

  // 书籍/文房窥见
  if (item.category === '书籍' || item.category === '文房') {
    glimpses.push(
      `...翻动间，你瞥见了页边空白处的铅笔痕迹。有人曾在这里停留很久...`,
      `...墨渍的分布不是随机的。细看之下，像是某种刻意留下的标记...`,
    );
  }

  // 酒类窥见
  if (item.category === '酒类') {
    glimpses.push(
      `...封蜡上的指纹已经模糊，但你能感受到封瓶那一刻的郑重...`,
      `...酒液在灯光下折射出琥珀色的光。时间在瓶中流得比外面慢...`,
    );
  }

  // 收藏品窥见
  if (item.category === '收藏品') {
    glimpses.push(
      `...收藏者留下的痕迹比物品本身更有故事——保护套上的磨损说明它曾被反复取出欣赏...`,
      `...一闪而过的画面：某个柜子的深处，${item.name}被小心地包裹在绸布中...`,
    );
  }

  // 通用兜底
  if (glimpses.length === 0) {
    glimpses.push(
      `...恍惚间，你似乎看到了${item.name}过去的影子...`,
      `...一段模糊的记忆从${item.name}中浮现，转瞬即逝...`,
    );
  }

  return glimpses;
}

/**
 * S3-C3: 格物意外叙事文案
 * 走神和惊人发现的多样化描述
 */
function getDistractionTexts(): string[] {
  return [
    '今晚心不在焉...窗外的雨声搅乱了思绪，只捕捉到了一些浅层的信息。',
    '疲倦不知不觉地袭来。你发现自己盯着同一个细节看了很久，却什么也没看出来。',
    '脑海里浮现出母亲的面容，注意力被牵走了...等回过神时，精力已经耗散大半。',
    '不知为何，今晚的灯光让你觉得刺眼。勉强维持的专注，只换来了有限的收获。',
    '手指触碰的瞬间，思绪飘到了白天的某个场景...等你拉回注意力，已经错过了最佳观察窗口。',
  ];
}

function getRemarkableFindTexts(item: Item): string[] {
  return [
    `等等...这个细节——普通人绝对会忽略——但你注意到了${item.name}上一处极其微妙的痕迹！`,
    `灵光一闪！你从一个完全意想不到的角度看到了${item.name}的隐藏线索，所有碎片突然串联起来。`,
    `你的手指滑过一个不起眼的凹陷...不对，这不是瑕疵——这是故意留下的标记！收获翻倍！`,
    `今晚的状态出奇地好。${item.name}表层下的秘密像潮水一样涌来，你几乎来不及记录。`,
    `一个极其细微的温差变化引起了你的注意。深入探查后，你发现了远超预期的信息量。`,
  ];
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取格物受阻原因的显示文本
 */
export function getBlockReasonText(reason: InsightBlockReason): string {
  switch (reason) {
    case 'NO_ENERGY':
      return '精力不足';
    case 'ALREADY_INSIGHTED':
      return '今晚已研究过';
    case 'DEPLETED':
      return '已被研究透彻';
    case 'NOT_IN_INVENTORY':
      return '物品不在库存中';
    case 'ITEM_REDEEMED':
      return '物品已被赎回';
    case 'ITEM_SOLD':
      return '物品已售出';
    default:
      return '无法研究';
  }
}

/**
 * 获取物品可以产出的主要精魄类型
 */
export function getPrimaryEssenceType(
  item: Item
): 'CRAFT' | 'TIME' | 'VIBE' | 'BALANCED' {
  const pool = item.knowledgePool;
  const yieldRatios = pool?.essenceYield || calculateEssenceYieldFromTags(item);

  const craft = yieldRatios.craft || 0;
  const time = yieldRatios.time || 0;
  const vibe = yieldRatios.vibe || 0;

  if (craft >= 0.5) return 'CRAFT';
  if (time >= 0.5) return 'TIME';
  if (vibe >= 0.5) return 'VIBE';

  return 'BALANCED';
}

/**
 * 批量重置物品的"今晚已格物"标记
 * 在新的夜晚开始时调用
 */
export function resetInsightedFlags(items: Item[]): Item[] {
  return items.map(item => ({
    ...item,
    insightedTonight: false,
  }));
}
