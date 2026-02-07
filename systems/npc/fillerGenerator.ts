/**
 * Filler Customer Generator (TRANSIENT Event Chains)
 *
 * Generates procedural "filler" customers for typical pawn transactions.
 * These customers use probability-based redemption behavior rather than
 * narrative-driven SimRules.
 *
 * Design Reference: Designer/系统设计文档/填充事件系统 (Filler Event System).md
 */

import { Customer, BehaviorTag, Dialogue } from '../../types';
import { Item, ItemStatus } from '../items/types';
import { Mood } from '../core/types';
import { createItemFromTemplate, getItemTemplate, ItemTemplate, getTraitDefinition, createTraitFromDefinition, getFillerPoolTemplateIds, onCSVDataReload } from '../items/csvLoader';
import { initializeKnowledgePool } from '../items/tagUtils';
import { ContractType, EventChainState } from '../narrative/types';
import { getCharacterPortraits } from '../assets';
import {
  initializeFillerTemplates,
  isFillerTemplatesLoaded,
  getRandomName,
  getRandomAppearanceDescription,
  getRandomMoodDescription,
  getRandomDialogue,
} from './fillerTemplateLoader';
import {
  initializeFillerReasons,
  isReasonsLoaded,
  getMatchingReason,
} from './fillerReasonLoader';

// ============================================================================
// TYPES
// ============================================================================

export type CustomerAge = 'young' | 'middle' | 'elderly';
export type CustomerGender = 'male' | 'female';
export type CustomerAppearance = 'shabby' | 'plain' | 'decent' | 'fancy';
export type CustomerMood = 'anxious' | 'calm' | 'reluctant' | 'eager';
export type RedemptionResolve = 'Strong' | 'Medium' | 'Weak' | 'None';

export interface FillerCustomerProfile {
    age: CustomerAge;
    gender: CustomerGender;
    appearance: CustomerAppearance;
    mood: CustomerMood;
}

export interface ExpiryProbabilities {
    redeem: number;
    renew: number;
    noShow: number;
}

// ============================================================================
// TRANSACTION FEEDBACK (v2.1 - 因果感知强化)
// ============================================================================

export interface TransactionFeedbackItem {
    label: string;       // e.g. "合同类型：标准 (10%)"
    effect: string;      // e.g. "赎回意愿 +/-0%"
    modifier: number;    // numeric modifier value
}

export interface TransactionFeedback {
    items: TransactionFeedbackItem[];
    totalModifier: number;
    summary: string;     // e.g. "综合影响：赎回意愿 +10%"
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Base redemption probabilities by redemptionResolve level
 * From design doc Section 7.4 (v2.1: lowered renewal rates)
 */
const BASE_EXPIRY_PROBABILITIES: Record<RedemptionResolve, ExpiryProbabilities> = {
    'Strong': { redeem: 0.80, renew: 0.08, noShow: 0.12 },
    'Medium': { redeem: 0.65, renew: 0.14, noShow: 0.21 },
    'Weak': { redeem: 0.50, renew: 0.20, noShow: 0.30 },
    'None': { redeem: 0.20, renew: 0.20, noShow: 0.60 }
};

/**
 * Contract type modifiers for expiry probabilities
 * From design doc Section 7.4 (v2.1)
 */
export const CONTRACT_MODIFIERS: Record<ContractType, { redeemMod: number; noShowMod: number }> = {
    'CHARITY': { redeemMod: 0.15, noShowMod: -0.15 },
    'AID': { redeemMod: 0.05, noShowMod: -0.05 },
    'STANDARD': { redeemMod: 0, noShowMod: 0 },
    'SHARK': { redeemMod: -0.20, noShowMod: 0.50 }
};

/**
 * Pawn ratio modifiers for expiry probabilities
 * From design doc Section 4.3 (v2.1)
 *
 * Layer 2 of the two-layer redemption rate system:
 * - High pawn ratio (>75%): customer feels better deal, more likely to redeem
 * - Low pawn ratio (<60%): customer feels squeezed, less likely to redeem
 */
export const PAWN_RATIO_THRESHOLDS = {
    HIGH: 0.75,
    LOW: 0.60
} as const;

export const PAWN_RATIO_MODIFIERS = {
    HIGH: { redeemMod: 0.10, noShowMod: -0.10 },
    LOW: { redeemMod: -0.15, noShowMod: 0.15 },
    NORMAL: { redeemMod: 0, noShowMod: 0 }
} as const;

/**
 * Behavior tag probabilities by appearance
 * From design doc Section 8.2
 */
const APPEARANCE_TAG_PROBABILITIES: Record<CustomerAppearance, Record<BehaviorTag, number>> = {
    'shabby': { DESPERATE: 0.60, STUBBORN: 0, SUSPICIOUS: 0.20, NAIVE: 0.20, SAVVY: 0, SENTIMENTAL: 0 },
    'plain': { DESPERATE: 0.15, STUBBORN: 0.15, SUSPICIOUS: 0.15, NAIVE: 0.15, SAVVY: 0.15, SENTIMENTAL: 0.15 },
    'decent': { DESPERATE: 0, STUBBORN: 0.30, SUSPICIOUS: 0, NAIVE: 0, SAVVY: 0.30, SENTIMENTAL: 0.20 },
    'fancy': { DESPERATE: 0, STUBBORN: 0.30, SUSPICIOUS: 0.20, NAIVE: 0, SAVVY: 0.50, SENTIMENTAL: 0 }
};

/**
 * Mood modifiers for behavior tags
 * From design doc Section 8.3
 */
const MOOD_TAG_MODIFIERS: Record<CustomerMood, Partial<Record<BehaviorTag, number>>> = {
    'anxious': { DESPERATE: 0.20 },
    'calm': { STUBBORN: 0.10, SAVVY: 0.10 },
    'reluctant': { SENTIMENTAL: 0.30 },
    'eager': { DESPERATE: 0.15, NAIVE: 0.15 }
};

/**
 * Mutually exclusive tag pairs
 * From design doc Section 8.4
 */
const EXCLUSIVE_TAG_PAIRS: [BehaviorTag, BehaviorTag][] = [
    ['NAIVE', 'SAVVY'],
    ['DESPERATE', 'STUBBORN']
];

/**
 * Behavior tag effects on negotiation
 * From design doc Section 8.1
 */
const TAG_EFFECTS: Record<BehaviorTag, { floorMod: number; patienceMod: number; insultThresholdMod: number }> = {
    'DESPERATE': { floorMod: -0.15, patienceMod: -1, insultThresholdMod: -0.10 },
    'STUBBORN': { floorMod: 0, patienceMod: 1, insultThresholdMod: 0 },
    'SUSPICIOUS': { floorMod: 0.05, patienceMod: -1, insultThresholdMod: 0.10 },
    'NAIVE': { floorMod: -0.10, patienceMod: 0, insultThresholdMod: -0.05 },
    'SAVVY': { floorMod: 0.10, patienceMod: 0, insultThresholdMod: 0.05 },
    'SENTIMENTAL': { floorMod: 0, patienceMod: 1, insultThresholdMod: 0.05 }
};

/**
 * Cached filler item template IDs
 * Loaded from CSV via getFillerPoolTemplateIds() on first access
 */
let cachedFillerTemplateIds: string[] | null = null;

/**
 * Get filler item template IDs from CSV registry
 * Caches result for performance
 */
function getFillerItemTemplates(): string[] {
    if (cachedFillerTemplateIds === null) {
        cachedFillerTemplateIds = getFillerPoolTemplateIds();
    }
    return cachedFillerTemplateIds;
}

/**
 * Clear the cached filler template IDs
 * Call this after CSV data is reloaded
 */
export function clearFillerTemplateCache(): void {
    cachedFillerTemplateIds = null;
}

// Register callback to clear cache when CSV data is reloaded
onCSVDataReload(() => {
    clearFillerTemplateCache();
    console.log('[fillerGenerator] Filler template cache cleared after CSV reload');
});

// ============================================================================
// VALUE JUMP TRAITS (捡漏/打眼)
// ============================================================================

/**
 * Category-specific jump trait configuration
 *
 * Jump traits make realValue significantly different from visualValue.
 * - Bargain (捡漏): STORY trait with large positive impact -> real >> visual
 * - Mistake (打眼): FAKE trait with large negative impact -> real << visual
 *
 * Most items have NO jump traits (normal transaction).
 * Only a small percentage get jump traits (surprise element).
 */
interface JumpTraitConfig {
    /** Probability of having ANY jump trait (0-1) */
    jumpProbability: number;
    /** Within jump items, ratio of mistakes vs bargains (0-1, higher = more mistakes) */
    mistakeRatio: number;
    /** Bargain trait ID for this category */
    bargainTraitId: string;
    /** Mistake trait ID for this category */
    mistakeTraitId: string;
}

/**
 * Jump trait configuration by category
 *
 * Design decisions:
 * - Antiques/Art: High probability, high magnitude (historical uncertainty)
 * - Jewelry: Medium-high probability (gemstone complexity)
 * - Watches: Medium probability (mechanical complexity)
 * - Books: Low-medium probability (authenticity clearer)
 * - Electronics: Low probability (specs are verifiable)
 *
 * Mistake ratio slightly higher (打眼略多) as per design doc.
 */
const JUMP_TRAIT_CONFIG: Record<string, JumpTraitConfig> = {
    '古董': {
        jumpProbability: 0.15,
        mistakeRatio: 0.55,
        bargainTraitId: 'trait_filler_antique_bargain',
        mistakeTraitId: 'trait_filler_antique_mistake',
    },
    '艺术品': {
        jumpProbability: 0.12,
        mistakeRatio: 0.55,
        bargainTraitId: 'trait_filler_art_bargain',
        mistakeTraitId: 'trait_filler_art_mistake',
    },
    '珠宝': {
        jumpProbability: 0.10,
        mistakeRatio: 0.55,
        bargainTraitId: 'trait_filler_jewelry_bargain',
        mistakeTraitId: 'trait_filler_jewelry_mistake',
    },
    '首饰': {
        jumpProbability: 0.10,
        mistakeRatio: 0.55,
        bargainTraitId: 'trait_filler_jewelry_bargain',
        mistakeTraitId: 'trait_filler_jewelry_mistake',
    },
    '钟表': {
        jumpProbability: 0.08,
        mistakeRatio: 0.55,
        bargainTraitId: 'trait_filler_watch_bargain',
        mistakeTraitId: 'trait_filler_watch_mistake',
    },
    '书籍': {
        jumpProbability: 0.06,
        mistakeRatio: 0.55,
        bargainTraitId: 'trait_filler_book_bargain',
        mistakeTraitId: 'trait_filler_book_mistake',
    },
    '电子产品': {
        jumpProbability: 0.04,
        mistakeRatio: 0.60,
        bargainTraitId: 'trait_filler_electronics_bargain',
        mistakeTraitId: 'trait_filler_electronics_mistake',
    },
};

/** Default config for categories not in the map */
const DEFAULT_JUMP_CONFIG: JumpTraitConfig = {
    jumpProbability: 0.03,
    mistakeRatio: 0.55,
    bargainTraitId: 'trait_filler_art_bargain',  // Fallback to art traits
    mistakeTraitId: 'trait_filler_art_mistake',
};

// ============================================================================
// PROBABILITY CALCULATION
// ============================================================================

/**
 * Get pawn ratio modifier category
 */
export function getPawnRatioCategory(pawnRatio: number): 'HIGH' | 'LOW' | 'NORMAL' {
    if (pawnRatio > PAWN_RATIO_THRESHOLDS.HIGH) return 'HIGH';
    if (pawnRatio < PAWN_RATIO_THRESHOLDS.LOW) return 'LOW';
    return 'NORMAL';
}

/**
 * Contract type display labels (Chinese)
 */
const CONTRACT_LABELS: Record<ContractType, string> = {
    'CHARITY': '慈善 (0%)',
    'AID': '援助 (5%)',
    'STANDARD': '标准 (10%)',
    'SHARK': '鲨鱼 (20%)'
};

/**
 * Calculate transaction feedback for UI display
 * Shows how contract type and pawn ratio affect redemption probability
 *
 * Design doc Section 4.3: 交易反馈设计
 */
export function calculateTransactionFeedback(
    contractType: ContractType,
    pawnAmount: number,
    itemValue: number
): TransactionFeedback {
    const items: TransactionFeedbackItem[] = [];
    let totalModifier = 0;

    // Contract type modifier
    const contractMod = CONTRACT_MODIFIERS[contractType];
    const contractModPercent = Math.round(contractMod.redeemMod * 100);
    items.push({
        label: `合同类型：${CONTRACT_LABELS[contractType]}`,
        effect: contractModPercent === 0
            ? '赎回意愿 +/-0%'
            : `赎回意愿 ${contractModPercent > 0 ? '+' : ''}${contractModPercent}%`,
        modifier: contractMod.redeemMod
    });
    totalModifier += contractMod.redeemMod;

    // Pawn ratio modifier
    const pawnRatio = itemValue > 0 ? pawnAmount / itemValue : 0;
    const ratioCategory = getPawnRatioCategory(pawnRatio);
    const ratioMod = PAWN_RATIO_MODIFIERS[ratioCategory];
    const ratioPercent = Math.round(pawnRatio * 100);
    const ratioModPercent = Math.round(ratioMod.redeemMod * 100);

    let ratioLabel: string;
    if (ratioCategory === 'HIGH') {
        ratioLabel = `当金比例：${ratioPercent}%（高）`;
    } else if (ratioCategory === 'LOW') {
        ratioLabel = `当金比例：${ratioPercent}%（低）`;
    } else {
        ratioLabel = `当金比例：${ratioPercent}%`;
    }

    items.push({
        label: ratioLabel,
        effect: ratioModPercent === 0
            ? '赎回意愿 +/-0%'
            : `赎回意愿 ${ratioModPercent > 0 ? '+' : ''}${ratioModPercent}%`,
        modifier: ratioMod.redeemMod
    });
    totalModifier += ratioMod.redeemMod;

    // Summary
    const totalPercent = Math.round(totalModifier * 100);
    const summary = totalPercent === 0
        ? '综合影响：赎回意愿不变'
        : `综合影响：赎回意愿 ${totalPercent > 0 ? '+' : ''}${totalPercent}%`;

    return { items, totalModifier, summary };
}

// ============================================================================
// v2.1 FILLER-SPECIFIC MERCHANT MONOLOGUES (Section 10)
// ============================================================================

/**
 * Merchant inner monologues for filler customers
 * Tone: professional, pragmatic, occasionally humorous
 * Contrast with narrative customer monologues (heavy, moral, fate-laden)
 *
 * Design doc Section 10: 填充专属文案风格
 */

/** Monologues by contract tier - shopkeeper's reaction to the deal type */
export const FILLER_MONOLOGUES_BY_CONTRACT: Record<ContractType, string[]> = {
    'CHARITY': [
        '算了，就当做个顺水人情。',
        '不赚这点钱了，图个心安。',
        '就当积德行善吧。',
        '反正也不亏本，帮一把。',
    ],
    'AID': [
        '合理的价格，大家都不亏。',
        '中规中矩，公平交易。',
        '这价钱，双方都能接受。',
        '本分生意，求的就是个稳。',
    ],
    'STANDARD': [
        '标准行情，公平交易。',
        '这才是做生意该有的样子。',
        '规矩价，赚个辛苦费。',
        '利润合理，心里踏实。',
    ],
    'SHARK': [
        '做生意嘛，不吃亏是本事。',
        '嗯... 这笔不错。',
        '低买高卖，天经地义。',
        '这利润... 满意。',
    ],
};

/** Monologues by pawn ratio - shopkeeper's assessment of the deal risk */
export const FILLER_MONOLOGUES_BY_PAWN_RATIO: Record<PawnRatioCategory, string[]> = {
    'HIGH': [
        '出这么多... 最好能来赎。',
        '价出高了，赌他回来赎。',
        '万一不来赎，我可亏了。',
        '给多了... 但愿不走眼。',
    ],
    'NORMAL': [
        '价钱合适，赚多赚少看运气。',
        '不高不低，稳妥。',
        '差不多得了，稳稳当当。',
        '这价位，我心里有数。',
    ],
    'LOW': [
        '这东西到我手里，值得冒这个险。',
        '低价收进来，不亏。',
        '捡了个便宜... 嘿。',
        '就算不来赎，也不亏本。',
    ],
};

/** Monologues by redemption prediction - shopkeeper's gut feeling */
export const FILLER_MONOLOGUES_BY_REDEMPTION: Record<RedemptionResolve, string[]> = {
    'Strong': [
        '利息到手，稳稳的。',
        '这人一看就会回来赎。',
        '铁定回来，安心。',
        '有来有往，好生意。',
    ],
    'Medium': [
        '赎不赎... 走着看吧。',
        '五五开，看他造化。',
        '来不来赎都无所谓。',
        '看情况再说。',
    ],
    'Weak': [
        '看这人的样子，八成不会来赎了。',
        '悬... 可能得砸手里。',
        '来赎的话算惊喜。',
        '做好砸手里的准备了。',
    ],
    'None': [
        '这十有八九是卖了。',
        '不会来赎的... 好在东西不亏。',
        '就当直接收了件货。',
        '来赎我还奇怪呢。',
    ],
};

// ============================================================================
// v2.1 REDEMPTION VISIT DIALOGUE TEMPLATES (Section 7.5)
// ============================================================================

/**
 * Redemption visit dialogue templates
 * Template format: [customer description fragment] + [action/expression] + [item interaction]
 *
 * Design doc Section 7.5: 赎回回访台词
 * - Based on original customer tags (appearance, mood, item), no new variables
 * - 1-2 sentences, minimal, no complete stories
 * - Hint at customer situation change, no definitive answers
 * - Consistent with "minimum info, maximum imagination" philosophy
 */

/** Action/expression fragments by mood */
const REDEMPTION_ACTIONS_BY_MOOD: Record<CustomerMood, string[]> = {
    'anxious': [
        '急匆匆地',
        '松了口气地',
        '手还在微微发抖地',
        '长舒一口气地',
    ],
    'calm': [
        '不慌不忙地',
        '从容地',
        '点了点头，',
        '面带微笑地',
    ],
    'reluctant': [
        '小心翼翼地',
        '眼眶微红地',
        '轻声地',
        '小心地',
    ],
    'eager': [
        '兴冲冲地',
        '迫不及待地',
        '满脸笑容地',
        '大步走来，',
    ],
};

/** Item interaction fragments by item category */
const REDEMPTION_ITEM_INTERACTIONS: Record<string, string[]> = {
    '珠宝首饰': [
        '把{item}戴回了手上。',
        '仔细检查了{item}，满意地收好了。',
        '将{item}贴在胸口，转身离去。',
    ],
    '钟表': [
        '把{item}重新戴上了手腕。',
        '检查了一下{item}的时间，还是准的。',
        '将{item}放进口袋，脚步轻快地离开了。',
    ],
    '电子产品': [
        '接过{item}检查了一下，松了口气。',
        '打开{item}确认一切正常后离开了。',
        '抱着{item}走了，嘴里念叨着什么。',
    ],
    '古董': [
        '用布仔细包好{item}，小心翼翼地抱走了。',
        '端详了{item}一会儿，像是在重逢。',
        '将{item}裹好，步履蹒跚地离去。',
    ],
    '乐器': [
        '接过{item}拨了两下弦，笑了。',
        '把{item}背在肩上，哼着曲子走了。',
        '紧紧抱着{item}，像找回了老朋友。',
    ],
    '服饰': [
        '将{item}叠好放进袋子里。',
        '拿起{item}比划了一下，满意地笑了。',
        '把{item}搭在臂弯里离开了。',
    ],
    '箱包': [
        '检查了{item}一遍，然后提着走了。',
        '把{item}擦了又擦，背上离开了。',
        '接过{item}，看了看里面，点点头走了。',
    ],
    '数码相机': [
        '接过{item}检查了一下镜头，点了点头就走了。',
        '按了两下{item}的快门，确认没问题后离开。',
        '将{item}挂在脖子上，脚步比来时轻快多了。',
    ],
    '游戏设备': [
        '抱着{item}两眼放光地走了。',
        '接过{item}后摁了两下按键，露出笑容。',
        '把{item}塞进背包，头也不回地走了。',
    ],
};

/** Generic item interactions (fallback for unmatched categories) */
const GENERIC_ITEM_INTERACTIONS: string[] = [
    '拿走了{item}，头也不回地离开了。',
    '接过{item}检查了一遍，放心地走了。',
    '收好{item}后，道了声谢便离开了。',
    '将{item}仔细收好，转身离去。',
    '拿起{item}看了看，满意地点点头。',
];

/** Appearance hints for customer description reconstruction */
const APPEARANCE_HINTS: Record<CustomerAppearance, string[]> = {
    'shabby': ['穿着破旧的人', '衣衫褴褛的来客', '那个穿得寒酸的人'],
    'plain': ['穿着朴素的人', '那个普通打扮的人', '衣着平常的来客'],
    'decent': ['穿着体面的人', '那个衣着整洁的人', '打扮得体的来客'],
    'fancy': ['穿着讲究的人', '那个衣着光鲜的人', '打扮精致的来客'],
};

/** Age hints for customer description */
const AGE_HINTS: Record<CustomerAge, string[]> = {
    'young': ['年轻人', '小伙子', '姑娘'],
    'middle': ['中年人', '那位先生', '那位女士'],
    'elderly': ['老人', '大爷', '大妈'],
};

/**
 * Generate a redemption visit dialogue line for a filler customer
 *
 * Uses customer metadata stored in chain variables during pawn transaction.
 * Template: [customer desc] + [action/expression] + [item interaction]
 *
 * @param appearance - Customer appearance tag
 * @param mood - Customer mood tag (from original pawn visit)
 * @param age - Customer age tag
 * @param gender - Customer gender tag
 * @param itemName - Name of the item being redeemed
 * @param itemCategory - Category of the item
 * @returns A 1-2 sentence redemption visit dialogue
 */
export function generateRedemptionVisitDialogue(
    appearance: CustomerAppearance,
    mood: CustomerMood,
    age: CustomerAge,
    gender: CustomerGender,
    itemName: string,
    itemCategory: string
): string {
    // Pick customer description
    const descPool = APPEARANCE_HINTS[appearance] || APPEARANCE_HINTS['plain'];
    // Use gendered age hints for young/elderly
    let agePool = AGE_HINTS[age] || AGE_HINTS['middle'];
    if (age === 'young') {
        agePool = gender === 'female' ? ['姑娘', '年轻女子'] : ['小伙子', '年轻人'];
    } else if (age === 'elderly') {
        agePool = gender === 'female' ? ['老太太', '大妈'] : ['老人', '大爷'];
    }

    // 50% chance to use appearance-based or age-based description
    const useAppearance = Math.random() < 0.5;
    const customerDesc = useAppearance
        ? descPool[Math.floor(Math.random() * descPool.length)]
        : agePool[Math.floor(Math.random() * agePool.length)];

    // Pick action/expression
    const actionPool = REDEMPTION_ACTIONS_BY_MOOD[mood] || REDEMPTION_ACTIONS_BY_MOOD['calm'];
    const action = actionPool[Math.floor(Math.random() * actionPool.length)];

    // Pick item interaction
    const categoryPool = REDEMPTION_ITEM_INTERACTIONS[itemCategory] || GENERIC_ITEM_INTERACTIONS;
    const itemInteraction = categoryPool[Math.floor(Math.random() * categoryPool.length)]
        .replace('{item}', itemName);

    return `${customerDesc}${action}${itemInteraction}`;
}

/**
 * Get a random filler merchant monologue based on transaction context
 * Returns a monologue string from the appropriate pool
 */
export function getFillerMerchantMonologue(
    dimension: 'contract' | 'pawnRatio' | 'redemption',
    contractType?: ContractType,
    pawnRatioCategory?: PawnRatioCategory,
    redemptionResolve?: RedemptionResolve
): string {
    let pool: string[] = [];
    switch (dimension) {
        case 'contract':
            pool = FILLER_MONOLOGUES_BY_CONTRACT[contractType || 'STANDARD'];
            break;
        case 'pawnRatio':
            pool = FILLER_MONOLOGUES_BY_PAWN_RATIO[pawnRatioCategory || 'NORMAL'];
            break;
        case 'redemption':
            pool = FILLER_MONOLOGUES_BY_REDEMPTION[redemptionResolve || 'Medium'];
            break;
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Calculate expiry probabilities based on redemptionResolve, contractType, and pawnRatio
 *
 * v2.1 two-layer system:
 *   Final rate = redemptionResolve base + transaction modifiers (contract + pawnRatio)
 */
export function calculateExpiryProbabilities(
    redemptionResolve: RedemptionResolve,
    contractType?: ContractType,
    pawnRatio?: number
): ExpiryProbabilities {
    const base = { ...BASE_EXPIRY_PROBABILITIES[redemptionResolve] };

    // Apply contract type modifier
    if (contractType) {
        const mod = CONTRACT_MODIFIERS[contractType];
        base.redeem += mod.redeemMod;
        base.noShow += mod.noShowMod;
    }

    // Apply pawn ratio modifier
    if (pawnRatio !== undefined) {
        const category = getPawnRatioCategory(pawnRatio);
        const mod = PAWN_RATIO_MODIFIERS[category];
        base.redeem += mod.redeemMod;
        base.noShow += mod.noShowMod;
    }

    // Clamp individual values
    base.redeem = Math.max(0, Math.min(1, base.redeem));
    base.noShow = Math.max(0, Math.min(1, base.noShow));
    base.renew = Math.max(0, base.renew);

    // Normalize to ensure sum = 1
    const total = base.redeem + base.renew + base.noShow;
    if (total > 0) {
        base.redeem /= total;
        base.renew /= total;
        base.noShow /= total;
    }

    return base;
}

/**
 * Determine expiry behavior based on probability roll
 * For TRANSIENT chains, this replaces the condition-based determination
 */
export function determineTransientExpiryBehavior(
    chain: EventChainState
): 'REDEEM' | 'RENEW' | 'NO_SHOW' {
    const redemptionResolve = chain.redemptionResolve || 'Medium';
    const contractType = chain.contractType;
    const pawnRatio = chain.variables?.pawnRatio as number | undefined;

    const probs = calculateExpiryProbabilities(redemptionResolve, contractType, pawnRatio);
    const roll = Math.random();

    if (roll < probs.redeem) {
        return 'REDEEM';
    } else if (roll < probs.redeem + probs.renew) {
        return 'RENEW';
    } else {
        return 'NO_SHOW';
    }
}

// ============================================================================
// BEHAVIOR TAG INFERENCE
// ============================================================================

/**
 * Infer behavior tags from customer appearance and mood
 * From design doc Sections 8.2-8.4
 */
export function inferBehaviorTags(profile: FillerCustomerProfile): BehaviorTag[] {
    const baseProbabilities = { ...APPEARANCE_TAG_PROBABILITIES[profile.appearance] };

    // Apply mood modifiers
    const moodMods = MOOD_TAG_MODIFIERS[profile.mood];
    for (const [tag, mod] of Object.entries(moodMods)) {
        baseProbabilities[tag as BehaviorTag] = (baseProbabilities[tag as BehaviorTag] || 0) + mod;
    }

    // Roll for each tag
    const selectedTags: BehaviorTag[] = [];
    const allTags: BehaviorTag[] = ['DESPERATE', 'STUBBORN', 'SUSPICIOUS', 'NAIVE', 'SAVVY', 'SENTIMENTAL'];

    for (const tag of allTags) {
        const prob = baseProbabilities[tag] || 0;
        if (Math.random() < prob) {
            // Check exclusivity before adding
            let canAdd = true;
            for (const [tagA, tagB] of EXCLUSIVE_TAG_PAIRS) {
                if ((tag === tagA && selectedTags.includes(tagB)) ||
                    (tag === tagB && selectedTags.includes(tagA))) {
                    canAdd = false;
                    break;
                }
            }
            if (canAdd) {
                selectedTags.push(tag);
            }
        }
    }

    // Limit to 0-2 tags (design doc Section 8.4)
    // Distribution: 20% none, 60% one, 20% two
    const countRoll = Math.random();
    if (countRoll < 0.20) {
        return [];  // No tags
    } else if (countRoll < 0.80 && selectedTags.length > 1) {
        return [selectedTags[0]];  // One tag
    } else {
        return selectedTags.slice(0, 2);  // Up to two tags
    }
}

/**
 * Apply behavior tag effects to negotiation parameters
 */
export function applyBehaviorTagEffects(
    tags: BehaviorTag[],
    baseFloor: number,
    basePatience: number,
    baseInsultThreshold: number
): { floor: number; patience: number; insultThreshold: number } {
    let floor = baseFloor;
    let patience = basePatience;
    let insultThreshold = baseInsultThreshold;

    for (const tag of tags) {
        const effects = TAG_EFFECTS[tag];
        floor *= (1 + effects.floorMod);
        patience += effects.patienceMod;
        insultThreshold *= (1 + effects.insultThresholdMod);
    }

    // Apply limits from design doc Section 8.5
    floor = Math.max(baseFloor * 0.70, Math.min(baseFloor * 1.20, floor));
    patience = Math.max(1, Math.min(5, patience));
    insultThreshold = Math.max(baseFloor * 0.50, Math.min(baseFloor * 0.90, insultThreshold));

    return { floor, patience, insultThreshold };
}

// ============================================================================
// REDEMPTION RESOLVE INFERENCE
// ============================================================================

/**
 * Infer redemption resolve from customer profile
 */
export function inferRedemptionResolve(profile: FillerCustomerProfile, tags: BehaviorTag[]): RedemptionResolve {
    // Base resolve by appearance
    const baseByAppearance: Record<CustomerAppearance, RedemptionResolve> = {
        'shabby': 'Weak',
        'plain': 'Medium',
        'decent': 'Medium',
        'fancy': 'Strong'
    };

    let resolve = baseByAppearance[profile.appearance];

    // Modify by mood
    if (profile.mood === 'anxious' || profile.mood === 'eager') {
        // Anxious/eager customers less likely to come back
        if (resolve === 'Strong') resolve = 'Medium';
        else if (resolve === 'Medium') resolve = 'Weak';
    } else if (profile.mood === 'reluctant') {
        // Reluctant customers more attached to items
        if (resolve === 'Weak') resolve = 'Medium';
        else if (resolve === 'Medium') resolve = 'Strong';
    }

    // Modify by tags
    if (tags.includes('SENTIMENTAL')) {
        if (resolve === 'Weak') resolve = 'Medium';
        else if (resolve === 'Medium') resolve = 'Strong';
    }
    if (tags.includes('DESPERATE')) {
        if (resolve === 'Strong') resolve = 'Medium';
        else if (resolve === 'Medium') resolve = 'Weak';
    }

    return resolve;
}

// ============================================================================
// FILLER CUSTOMER GENERATION
// ============================================================================

/**
 * Generate a random filler customer profile
 *
 * v2.1 Emergence Calibration (涌现组合数校准):
 *
 * Variables are split into two layers:
 *
 * **Atmosphere Variables** (affect narrative presentation only):
 *   - age: 3 values (young/middle/elderly) -- uniform
 *   - gender: 2 values (male/female) -- uniform
 *   - appearance: 4 values (shabby/plain/decent/fancy) -- weighted
 *   - mood: 4 values (anxious/calm/reluctant/eager) -- uniform
 *
 * **Mechanic Variables** (affect gameplay decisions):
 *   - riskLevel: derived from item template, not profile
 *   - redemptionResolve: inferred from appearance + mood + tags
 *   - behaviorTags: 0-2 tags, inferred from appearance + mood
 *
 * Effective distinguishable combinations depend on whether atmosphere
 * variables produce perceivably different narrative/visual outcomes.
 * Focus should be on high-recognition combos (see design doc 2.4).
 *
 * Note: skewType is NOT stored as an explicit field. It is derived
 * at runtime from the relationship between realValue and appraisalRange
 * (see design doc Section 6.3 adjustment).
 */
export function generateRandomProfile(): FillerCustomerProfile {
    const ages: CustomerAge[] = ['young', 'middle', 'elderly'];
    const genders: CustomerGender[] = ['male', 'female'];
    const appearances: CustomerAppearance[] = ['shabby', 'plain', 'decent', 'fancy'];
    const moods: CustomerMood[] = ['anxious', 'calm', 'reluctant', 'eager'];

    // Weighted distribution for appearance (design doc: more plain/decent)
    const appearanceWeights = { shabby: 0.15, plain: 0.40, decent: 0.30, fancy: 0.15 };
    let appearanceRoll = Math.random();
    let appearance: CustomerAppearance = 'plain';
    for (const [app, weight] of Object.entries(appearanceWeights)) {
        if (appearanceRoll < weight) {
            appearance = app as CustomerAppearance;
            break;
        }
        appearanceRoll -= weight;
    }

    return {
        age: ages[Math.floor(Math.random() * ages.length)],
        gender: genders[Math.floor(Math.random() * genders.length)],
        appearance,
        mood: moods[Math.floor(Math.random() * moods.length)]
    };
}

/**
 * Generate name based on profile
 */
function generateName(profile: FillerCustomerProfile): string {
    // Ensure templates are loaded
    if (!isFillerTemplatesLoaded()) {
        initializeFillerTemplates();
    }

    const name = getRandomName(profile.age, profile.gender);
    // Fallback to generic name if template not found
    return name || '来客';
}

/**
 * Generate description based on profile
 */
function generateDescription(profile: FillerCustomerProfile): string {
    // Ensure templates are loaded
    if (!isFillerTemplatesLoaded()) {
        initializeFillerTemplates();
    }

    const appearanceDesc = getRandomAppearanceDescription(profile.appearance) || '普通';
    const moodDesc = getRandomMoodDescription(profile.mood) || '神态一般';

    const ageDesc = profile.age === 'young' ? '年轻' : profile.age === 'middle' ? '中年' : '年迈';
    const genderDesc = profile.gender === 'male' ? '男性' : '女性';

    return `一位${appearanceDesc}的${ageDesc}${genderDesc}，${moodDesc}。`;
}

/**
 * Generate generic dialogue for filler customers
 */
function generateFillerDialogue(profile: FillerCustomerProfile): Dialogue {
    // Ensure templates are loaded
    if (!isFillerTemplatesLoaded()) {
        initializeFillerTemplates();
    }

    const mood = profile.mood;

    // Get dialogue from CSV templates with fallbacks
    const greeting = getRandomDialogue(mood, 'greeting') || '老板，帮我看看这个。';
    const acceptedFair = getRandomDialogue(mood, 'accepted_fair') || '行，就这样吧。';
    const acceptedFleeced = getRandomDialogue(mood, 'accepted_fleeced') || '有点低，算了。';
    const acceptedPremium = getRandomDialogue(mood, 'accepted_premium') || '谢谢老板！';
    const rejected = getRandomDialogue(mood, 'rejected') || '我再想想。';
    const rejectionStandard = getRandomDialogue(mood, 'rejection_standard') || '我再看看别家。';
    const rejectionAngry = getRandomDialogue(mood, 'rejection_angry') || '太低了。';
    const exitGrateful = getRandomDialogue(mood, 'exit_grateful') || '谢谢老板！';
    const exitNeutral = getRandomDialogue(mood, 'exit_neutral') || '好的，再见。';
    const exitResentful = getRandomDialogue(mood, 'exit_resentful') || '唉...';
    const exitDesperate = getRandomDialogue(mood, 'exit_desperate') || '...';

    return {
        greeting,
        pawnReason: '需要周转一下。',
        redemptionPlea: '到期我会来赎的。',
        negotiationDynamic: '能不能再加点？',
        accepted: {
            fair: acceptedFair,
            fleeced: acceptedFleeced,
            premium: acceptedPremium
        },
        rejected,
        rejectionLines: {
            standard: rejectionStandard,
            angry: rejectionAngry
        },
        exitDialogues: {
            grateful: exitGrateful,
            neutral: exitNeutral,
            resentful: exitResentful,
            desperate: exitDesperate
        }
    };
}

// ============================================================================
// ITEM SELECTION WITH PROFILE MATCHING
// ============================================================================

/**
 * Calculate weight for an item template based on profile match
 * Higher weight = more likely to be selected
 */
function calculateItemWeight(template: ItemTemplate, profile: FillerCustomerProfile): number {
    const fitTags = template.fitTags;
    if (fitTags.length === 0) {
        // No fit tags defined, use base weight
        return 1;
    }

    const profileTags: string[] = [profile.age, profile.appearance, profile.gender];
    let matchScore = 0;

    for (const tag of fitTags) {
        if (profileTags.includes(tag)) {
            matchScore++;
        }
    }

    // Base weight 1, add 0.5 for each matching tag
    return 1 + matchScore * 0.5;
}

/**
 * Check if this is an "unexpected" item-profile combination
 * Used to determine if we need a narrative reason
 */
function isUnexpectedCombo(template: ItemTemplate, profile: FillerCustomerProfile): boolean {
    const fitTags = template.fitTags;
    if (fitTags.length === 0) {
        // No fit tags defined, not unexpected
        return false;
    }

    const profileTags: string[] = [profile.age, profile.appearance, profile.gender];

    // Check if ANY profile tag matches
    for (const tag of fitTags) {
        if (profileTags.includes(tag)) {
            return false; // Found a match, not unexpected
        }
    }

    // No matches at all - this is unexpected
    return true;
}

/**
 * Select an item template using weighted random based on profile
 *
 * @param profile Customer profile for weight calculation
 * @param excludeTemplateIds Template IDs to exclude (items already in inventory)
 *                           If all templates are excluded, falls back to allowing duplicates
 */
function selectWeightedTemplate(
    profile: FillerCustomerProfile,
    excludeTemplateIds: Set<string> = new Set()
): { templateId: string; template: ItemTemplate } | null {
    // Build weighted list, excluding templates already in inventory
    const weightedTemplates: { templateId: string; template: ItemTemplate; weight: number }[] = [];

    for (const templateId of getFillerItemTemplates()) {
        // Skip templates already in inventory (deduplication)
        if (excludeTemplateIds.has(templateId)) {
            continue;
        }
        const template = getItemTemplate(templateId);
        if (template) {
            const weight = calculateItemWeight(template, profile);
            weightedTemplates.push({ templateId, template, weight });
        }
    }

    // If all templates are excluded, fall back to allowing duplicates
    // This ensures generation is never blocked
    if (weightedTemplates.length === 0) {
        for (const templateId of getFillerItemTemplates()) {
            const template = getItemTemplate(templateId);
            if (template) {
                const weight = calculateItemWeight(template, profile);
                weightedTemplates.push({ templateId, template, weight });
            }
        }
    }

    if (weightedTemplates.length === 0) {
        return null;
    }

    // Weighted random selection
    const totalWeight = weightedTemplates.reduce((sum, t) => sum + t.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of weightedTemplates) {
        roll -= entry.weight;
        if (roll <= 0) {
            return { templateId: entry.templateId, template: entry.template };
        }
    }

    // Fallback to last entry
    const last = weightedTemplates[weightedTemplates.length - 1];
    return { templateId: last.templateId, template: last.template };
}

export interface FillerItemResult {
    item: Item;
    isUnexpected: boolean;
    attrTags: string[];
}

/** Forced jump trait type for debug/testing */
export type ForcedJumpTrait = 'MISTAKE' | 'BARGAIN' | null;

/**
 * Attach a jump trait to an item and adjust realValue accordingly.
 *
 * Jump traits create a significant gap between realValue and perceivedValue:
 * - Bargain (捡漏): realValue becomes much HIGHER than perceivedValue
 * - Mistake (打眼): realValue becomes much LOWER than perceivedValue
 *
 * @param item The item to potentially modify
 * @param forceType Optional: Force a specific jump trait type (for testing)
 * @returns The modified item (or original if no jump trait attached)
 */
function attachJumpTrait(item: Item, forceType: ForcedJumpTrait = null): Item {
    const config = JUMP_TRAIT_CONFIG[item.category] || DEFAULT_JUMP_CONFIG;

    // If not forcing a specific type, use normal probability
    if (forceType === null) {
        // Most items have no jump trait (normal transaction)
        if (Math.random() > config.jumpProbability) {
            return item;
        }
    }

    // Decide between bargain (捡漏) and mistake (打眼)
    const isMistake = forceType === 'MISTAKE' ? true : (forceType === 'BARGAIN' ? false : Math.random() < config.mistakeRatio);
    const traitId = isMistake ? config.mistakeTraitId : config.bargainTraitId;

    // Load the trait definition
    const traitDef = getTraitDefinition(traitId);
    if (!traitDef) {
        console.warn(`[fillerGenerator] Jump trait not found: ${traitId}`);
        return item;
    }

    // Create the trait instance
    const jumpTrait = createTraitFromDefinition(traitDef);

    // Calculate new realValue based on perceivedValue and trait impact
    // For STORY traits with positive impact: realValue = perceived * (1 + impact)
    // For FAKE traits with negative impact: realValue = perceived * (1 + impact) [impact is negative]
    const baseValue = item.perceivedValue ?? item.realValue;

    let newRealValue: number;
    if (isMistake) {
        // Mistake: realValue much lower than visual
        // e.g., impact = -0.85 means realValue = baseValue * 0.15
        newRealValue = Math.max(10, Math.floor(baseValue * (1 + traitDef.valueImpact)));
    } else {
        // Bargain: realValue much higher than visual
        // e.g., impact = 8.0 means realValue = baseValue * 9.0
        newRealValue = Math.floor(baseValue * (1 + traitDef.valueImpact));
    }

    // Add the jump trait to hidden traits
    const updatedHiddenTraits = [...item.hiddenTraits, jumpTrait];

    // For mistake items, set isFake flag for visual feedback when revealed
    const updatedItem: Item = {
        ...item,
        realValue: newRealValue,
        hiddenTraits: updatedHiddenTraits,
        isFake: isMistake ? true : item.isFake,
    };

    return updatedItem;
}

/**
 * Create a fallback item for filler customers with profile-based selection
 *
 * @param day Current game day
 * @param profile Customer profile
 * @param excludeTemplateIds Template IDs to exclude (items already in inventory)
 * @param forceJumpTrait Optional: Force a specific jump trait type (for testing)
 */
function createFillerItem(
    day: number,
    profile: FillerCustomerProfile,
    excludeTemplateIds: Set<string> = new Set(),
    forceJumpTrait: ForcedJumpTrait = null
): FillerItemResult {
    // Ensure reasons are loaded
    if (!isReasonsLoaded()) {
        initializeFillerReasons();
    }

    // Select template using weighted random, excluding templates in inventory
    const selection = selectWeightedTemplate(profile, excludeTemplateIds);

    let item: Item | null = null;
    let isUnexpected = false;
    let attrTags: string[] = [];

    if (selection) {
        item = createItemFromTemplate(selection.templateId, {
            pawnDate: day,
            status: ItemStatus.ACTIVE
        });
        isUnexpected = isUnexpectedCombo(selection.template, profile);
        attrTags = selection.template.attrTags;

        // Potentially attach a jump trait (捡漏/打眼)
        if (item) {
            item = attachJumpTrait(item, forceJumpTrait);
        }
    }

    if (!item) {
        // Fallback to basic item
        item = {
            id: crypto.randomUUID(),
            name: '普通物品',
            nameDefault: '普通物品',
            category: '其他',
            condition: '良好',
            visualDescription: '一件普通的物品。',
            descDefault: '一件普通的物品。',
            historySnippet: '',
            appraisalNote: '',
            archiveSummary: '填充客户典当的物品',
            isStolen: false,
            isFake: false,
            sentimentalValue: false,
            appraised: false,
            pawnDate: day,
            status: ItemStatus.ACTIVE,
            pawnAmount: 0,
            realValue: 200 + Math.floor(Math.random() * 800),  // $200-$1000
            perceivedValue: undefined,
            baseValue: 500,
            uncertainty: 0.3,
            currentRange: [0, 0],
            initialRange: [0, 0],
            hiddenTraits: [],
            revealedTraits: [],
            usedTraitIds: [],
            logs: [],
            tags: [],
            workState: 'DEFAULT'
        };
        // Set range based on realValue
        const spread = item.realValue * 0.3;
        item.currentRange = [Math.floor(item.realValue - spread), Math.ceil(item.realValue + spread)];
        item.initialRange = [...item.currentRange];
    }

    return {
        item: initializeKnowledgePool(item),
        isUnexpected,
        attrTags
    };
}

/**
 * Get the generic portrait ID based on customer profile
 * Maps profile (age, gender) to available generic portrait folders
 */
function getGenericPortraitId(profile: FillerCustomerProfile): string {
    const genderPart = profile.gender === 'male' ? 'male' : 'female';
    const agePart = profile.age === 'young' ? 'young' :
                    profile.age === 'middle' ? 'middle' : 'old';
    return `generic_${genderPart}_${agePart}`;
}

// ============================================================================
// RARE ENCOUNTER (v2.1 - 稀有遭遇)
// Design doc Section 11.2
// ============================================================================

/** Rare encounter probability: 5-10% per filler customer */
const RARE_ENCOUNTER_PROBABILITY = 0.075; // 7.5% average

export type RareEncounterType = 'HIDDEN_VALUE' | 'CONTRADICTORY_BEHAVIOR' | 'UNUSUAL_ITEM';

/**
 * Roll for a rare encounter and apply modifications to the profile/generation
 *
 * Rare encounters are NOT labeled as rare -- player discovers through observation.
 * Three types:
 * - HIDDEN_VALUE: Item has undiscovered high value (jump trait BARGAIN forced)
 * - CONTRADICTORY_BEHAVIOR: Profile-tag mismatch (decent + DESPERATE + None resolve)
 * - UNUSUAL_ITEM: Young person with antique, etc. (inverted item selection)
 */
function rollRareEncounter(): RareEncounterType | null {
    if (Math.random() > RARE_ENCOUNTER_PROBABILITY) return null;

    const types: RareEncounterType[] = ['HIDDEN_VALUE', 'CONTRADICTORY_BEHAVIOR', 'UNUSUAL_ITEM'];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Apply CONTRADICTORY_BEHAVIOR rare encounter to a profile:
 * Force contradictory appearance-tag combinations
 */
function applyContradictoryBehavior(
    profile: FillerCustomerProfile,
    tags: BehaviorTag[]
): { profile: FillerCustomerProfile; tags: BehaviorTag[]; resolve: RedemptionResolve } {
    // Contradictory combos:
    // decent/fancy appearance + DESPERATE tag + None/Weak resolve
    // shabby appearance + SAVVY tag + Strong resolve
    if (profile.appearance === 'decent' || profile.appearance === 'fancy') {
        return {
            profile: { ...profile, mood: 'anxious' },
            tags: ['DESPERATE'],
            resolve: 'None'
        };
    } else {
        return {
            profile: { ...profile, appearance: 'shabby', mood: 'calm' },
            tags: ['SAVVY'],
            resolve: 'Strong'
        };
    }
}

/**
 * Create a profile for UNUSUAL_ITEM rare encounter:
 * Invert the typical profile-item fit (young+antique, elderly+electronics)
 */
function createUnusualItemProfile(): FillerCustomerProfile {
    const combos: FillerCustomerProfile[] = [
        { age: 'young', gender: 'male', appearance: 'plain', mood: 'calm' },     // Young with antiques
        { age: 'young', gender: 'female', appearance: 'decent', mood: 'calm' },  // Young with antiques
        { age: 'elderly', gender: 'male', appearance: 'plain', mood: 'eager' },  // Elderly with electronics
        { age: 'elderly', gender: 'female', appearance: 'decent', mood: 'calm' }, // Elderly with electronics
    ];
    return combos[Math.floor(Math.random() * combos.length)];
}

/**
 * Generate a filler customer with TRANSIENT event chain metadata
 *
 * @param day Current game day
 * @param profile Optional specific profile (random if not provided)
 * @param excludeTemplateIds Template IDs to exclude (items already in inventory).
 *                           Pass this to avoid generating duplicate items.
 * @param forceJumpTrait Optional: Force a specific jump trait type (for testing)
 * @returns Customer with inferred behavior tags and redemption resolve
 */
export function generateFillerCustomer(
    day: number,
    profile?: FillerCustomerProfile,
    excludeTemplateIds?: Set<string>,
    forceJumpTrait: ForcedJumpTrait = null
): Customer {
    // Roll for rare encounter (v2.1 Section 11.2)
    const rareEncounter = rollRareEncounter();

    let customerProfile = profile || generateRandomProfile();
    let behaviorTags = inferBehaviorTags(customerProfile);
    let redemptionResolve = inferRedemptionResolve(customerProfile, behaviorTags);

    // Apply rare encounter modifications
    if (rareEncounter === 'CONTRADICTORY_BEHAVIOR') {
        const result = applyContradictoryBehavior(customerProfile, behaviorTags);
        customerProfile = result.profile;
        behaviorTags = result.tags;
        redemptionResolve = result.resolve;
    } else if (rareEncounter === 'UNUSUAL_ITEM') {
        customerProfile = profile || createUnusualItemProfile();
        behaviorTags = inferBehaviorTags(customerProfile);
        redemptionResolve = inferRedemptionResolve(customerProfile, behaviorTags);
    } else if (rareEncounter === 'HIDDEN_VALUE') {
        // Force a bargain jump trait -- item will have hidden high value
        forceJumpTrait = 'BARGAIN';
    }

    const name = generateName(customerProfile);
    const description = generateDescription(customerProfile);
    const dialogue = generateFillerDialogue(customerProfile);

    // Create item with profile-based selection, excluding items already in inventory
    const { item, isUnexpected, attrTags } = createFillerItem(day, customerProfile, excludeTemplateIds, forceJumpTrait);

    // If this is an unexpected combination, get a narrative reason
    if (isUnexpected) {
        const category = item.category;
        const reason = getMatchingReason(attrTags, category, customerProfile);
        if (reason) {
            dialogue.pawnReason = reason;
        }
    }

    // Customer prices based on perceived (surface) value, not hidden real value.
    // This makes jump-trait items work as intended: bargains are underpriced by the customer,
    // and mistakes are overpriced -- the player discovers the truth through appraisal.
    const customerPerceivedValue = item.perceivedValue ?? item.realValue;
    const baseDesired = Math.floor(customerPerceivedValue * 0.70);
    const baseMinimum = Math.floor(customerPerceivedValue * 0.50);
    const basePatience = 3;
    const baseInsultThreshold = baseMinimum * 0.70;

    const { floor, patience, insultThreshold } = applyBehaviorTagEffects(
        behaviorTags,
        baseMinimum,
        basePatience,
        baseInsultThreshold
    );

    // Convert profile mood to game Mood type
    const moodMap: Record<CustomerMood, Mood> = {
        anxious: 'Annoyed',
        calm: 'Neutral',
        reluctant: 'Neutral',
        eager: 'Happy'
    };

    // Get generic portrait based on profile
    const portraitId = getGenericPortraitId(customerProfile);
    const portraits = getCharacterPortraits(portraitId);

    const customer: Customer = {
        id: `filler_${crypto.randomUUID()}`,
        name,
        description,
        avatarSeed: `filler_${customerProfile.age}_${customerProfile.gender}_${day}`,
        portraits,
        dialogue,
        redemptionResolve,
        behaviorTags,
        patience: Math.round(patience),
        mood: moodMap[customerProfile.mood],
        identityTags: ['Filler', customerProfile.appearance, customerProfile.mood],
        item,
        desiredAmount: baseDesired,
        minimumAmount: Math.floor(floor),
        survivalMinimum: Math.floor(floor * 0.7),
        maxRepayment: Math.floor(customerPerceivedValue * 1.5),
        interactionType: 'PAWN',
        // Skewed distribution: take min of two rolls → biased toward shorter terms
        // Distribution: 1-3 days ~51%, 4-6 days ~33%, 7-10 days ~16%
        pawnTermDays: Math.min(
            1 + Math.floor(Math.random() * 10),
            1 + Math.floor(Math.random() * 10)
        )
    };

    return customer;
}

/**
 * Create a TRANSIENT event chain for a filler customer after pawn completion
 *
 * @param customer The filler customer
 * @param item The pawned item
 * @param contractType The contract type selected during negotiation
 * @returns EventChainState for the TRANSIENT chain
 */
export function createTransientChain(
    customer: Customer,
    item: Item,
    contractType: ContractType
): EventChainState {
    const chainId = `transient_${item.id}`;
    const itemValue = item.perceivedValue ?? item.realValue;
    const pawnRatio = itemValue > 0 ? item.pawnAmount / itemValue : 0;

    return {
        id: chainId,
        npcName: customer.name,
        isActive: true,
        stage: 1,  // Stage 0 is pawn completion, Stage 1 is waiting for expiry
        variables: {
            itemId: item.id,
            itemName: item.name,
            pawnAmount: item.pawnAmount,
            realValue: item.realValue,
            pawnRatio,                  // v2.1: stored for redemption rate calculation
            customerDescription: customer.description,  // v2.1: for redemption visit dialogue
            customerAppearance: customer.identityTags?.find(t => ['shabby', 'plain', 'decent', 'fancy'].includes(t)) || 'plain',
            customerMood: customer.identityTags?.find(t => ['anxious', 'calm', 'reluctant', 'eager'].includes(t)) || 'calm',
        },
        simulationRules: [],  // TRANSIENT chains do not use SimRules
        chainType: 'TRANSIENT',
        redemptionResolve: customer.redemptionResolve,
        contractType,
        renewalCount: 0
    };
}

/**
 * Check if a chain is a TRANSIENT chain
 */
export function isTransientChain(chain: EventChainState): boolean {
    return chain.chainType === 'TRANSIENT';
}

/**
 * Get the contract type from an interest rate
 */
export function getContractTypeFromRate(rate: number): ContractType {
    if (rate === 0) return 'CHARITY';
    if (rate <= 0.05) return 'AID';
    if (rate <= 0.10) return 'STANDARD';
    return 'SHARK';
}
