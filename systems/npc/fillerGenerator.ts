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
import { GAME_CONFIG } from '../game/config';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import fillerTextsCSV from '@/assets/data/texts/filler_texts.csv?raw';

// ============================================================================
// CSV TEXT LOADING
// ============================================================================

interface FillerTextRow {
    category: string;
    key: string;
    text: string;
}

const FILLER_TEXT_SCHEMA: CSVSchema = {
    'category': stringCol('category'),
    'key': stringCol('key'),
    'text': stringCol('text'),
};

/** Parsed filler texts grouped by category+key, lazily initialized */
let fillerTextMap: Map<string, string[]> | null = null;

function getFillerTextMap(): Map<string, string[]> {
    if (!fillerTextMap) {
        fillerTextMap = new Map();
        const rows = parseCSV<FillerTextRow>(fillerTextsCSV, FILLER_TEXT_SCHEMA, {
            warnUnknownColumns: false,
        });
        for (const row of rows) {
            if (!row.category || !row.text) continue;
            const mapKey = row.key ? `${row.category}:${row.key}` : row.category;
            const existing = fillerTextMap.get(mapKey);
            if (existing) {
                existing.push(row.text);
            } else {
                fillerTextMap.set(mapKey, [row.text]);
            }
        }
    }
    return fillerTextMap;
}

/** Get all text variants for a category+key combo */
function getFillerTexts(category: string, key: string): string[] {
    const mapKey = key ? `${category}:${key}` : category;
    return getFillerTextMap().get(mapKey) || [];
}

/** Get a single text for a category+key combo (first match) */
function getFillerText(category: string, key: string, fallback: string): string {
    const texts = getFillerTexts(category, key);
    return texts.length > 0 ? texts[0] : fallback;
}

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

export type PawnRatioCategory = 'HIGH' | 'LOW' | 'NORMAL';

/**
 * Get pawn ratio modifier category
 */
export function getPawnRatioCategory(pawnRatio: number): PawnRatioCategory {
    if (pawnRatio > PAWN_RATIO_THRESHOLDS.HIGH) return 'HIGH';
    if (pawnRatio < PAWN_RATIO_THRESHOLDS.LOW) return 'LOW';
    return 'NORMAL';
}

/**
 * Contract type display labels (Chinese) - loaded from CSV
 */
const CONTRACT_LABEL_FALLBACKS: Record<ContractType, string> = {
    'CHARITY': '慈善 (0%)',
    'AID': '援助 (5%)',
    'STANDARD': '标准 (10%)',
    'SHARK': '鲨鱼 (20%)'
};

function getContractLabel(type: ContractType): string {
    return getFillerText('contract_label', type, CONTRACT_LABEL_FALLBACKS[type]);
}

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
        label: `合同类型：${getContractLabel(contractType)}`,
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

/**
 * Monologue accessors - text loaded from CSV (filler_texts.csv)
 * Fallback arrays used when CSV data is not available.
 */

/** Get monologues by contract tier from CSV */
function getMonologuesByContract(contractType: ContractType): string[] {
    const texts = getFillerTexts('monologue_contract', contractType);
    return texts.length > 0 ? texts : ['...'];
}

/** Get monologues by pawn ratio from CSV */
function getMonologuesByPawnRatio(category: PawnRatioCategory): string[] {
    const texts = getFillerTexts('monologue_pawn_ratio', category);
    return texts.length > 0 ? texts : ['...'];
}

/** Get monologues by redemption prediction from CSV */
function getMonologuesByRedemption(resolve: RedemptionResolve): string[] {
    const texts = getFillerTexts('monologue_redemption', resolve);
    return texts.length > 0 ? texts : ['...'];
}

/**
 * Exported accessors for backward compatibility.
 * These are lazy getters so that CSV is only parsed on first access.
 */
export function getFillerMonologuesByContract(): Record<ContractType, string[]> {
    return {
        'CHARITY': getMonologuesByContract('CHARITY'),
        'AID': getMonologuesByContract('AID'),
        'STANDARD': getMonologuesByContract('STANDARD'),
        'SHARK': getMonologuesByContract('SHARK'),
    };
}

export function getFillerMonologuesByPawnRatio(): Record<PawnRatioCategory, string[]> {
    return {
        'HIGH': getMonologuesByPawnRatio('HIGH'),
        'NORMAL': getMonologuesByPawnRatio('NORMAL'),
        'LOW': getMonologuesByPawnRatio('LOW'),
    };
}

export function getFillerMonologuesByRedemption(): Record<RedemptionResolve, string[]> {
    return {
        'Strong': getMonologuesByRedemption('Strong'),
        'Medium': getMonologuesByRedemption('Medium'),
        'Weak': getMonologuesByRedemption('Weak'),
        'None': getMonologuesByRedemption('None'),
    };
}

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

/**
 * Redemption visit text accessors - all loaded from CSV (filler_texts.csv)
 */

/** Get action/expression fragments by mood from CSV */
function getRedemptionActionsByMood(mood: CustomerMood): string[] {
    const texts = getFillerTexts('redemption_action', mood);
    return texts.length > 0 ? texts : [''];
}

/** Get item interaction fragments by category from CSV */
function getRedemptionItemInteractions(category: string): string[] {
    const texts = getFillerTexts('redemption_item', category);
    return texts.length > 0 ? texts : [];
}

/** Get generic item interactions (fallback) from CSV */
function getGenericItemInteractions(): string[] {
    const texts = getFillerTexts('redemption_item_generic', '');
    return texts.length > 0 ? texts : ['{item}'];
}

/** Get appearance hints from CSV */
function getAppearanceHints(appearance: CustomerAppearance): string[] {
    const texts = getFillerTexts('appearance_hint', appearance);
    return texts.length > 0 ? texts : ['来客'];
}

/** Get age hints from CSV */
function getAgeHints(age: CustomerAge): string[] {
    const texts = getFillerTexts('age_hint', age);
    return texts.length > 0 ? texts : ['来客'];
}

/** Get gendered age hints from CSV */
function getGenderedAgeHints(age: CustomerAge, gender: CustomerGender): string[] {
    const texts = getFillerTexts('age_hint_gendered', `${age}_${gender}`);
    return texts.length > 0 ? texts : getAgeHints(age);
}

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
    // Pick customer description from CSV
    const descPool = getAppearanceHints(appearance);
    // Use gendered age hints for young/elderly from CSV
    let agePool: string[];
    if (age === 'young' || age === 'elderly') {
        agePool = getGenderedAgeHints(age, gender);
    } else {
        agePool = getAgeHints(age);
    }

    // 50% chance to use appearance-based or age-based description
    const useAppearance = Math.random() < 0.5;
    const customerDesc = useAppearance
        ? descPool[Math.floor(Math.random() * descPool.length)]
        : agePool[Math.floor(Math.random() * agePool.length)];

    // Pick action/expression from CSV
    const actionPool = getRedemptionActionsByMood(mood);
    const action = actionPool[Math.floor(Math.random() * actionPool.length)];

    // Pick item interaction from CSV
    const categoryPool = getRedemptionItemInteractions(itemCategory);
    const finalPool = categoryPool.length > 0 ? categoryPool : getGenericItemInteractions();
    const itemInteraction = finalPool[Math.floor(Math.random() * finalPool.length)]
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
            pool = getMonologuesByContract(contractType || 'STANDARD');
            break;
        case 'pawnRatio':
            pool = getMonologuesByPawnRatio(pawnRatioCategory || 'NORMAL');
            break;
        case 'redemption':
            pool = getMonologuesByRedemption(redemptionResolve || 'Medium');
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
// H-2: MORAL ACTIONS → CUSTOMER POOL QUALITY BIAS
// ============================================================================

/**
 * Customer quality bias computed from player reputation.
 * Positive trustworthyBias attracts more reliable customers.
 * Positive riskyBias attracts more risky/shady customers.
 * These are NOT mutually exclusive -- a player with moderate stats has both near zero.
 */
export interface CustomerQualityBias {
    /** Bias toward trustworthy customers (0.0 - cap) */
    trustworthyBias: number;
    /** Bias toward risky customers (0.0 - cap) */
    riskyBias: number;
}

/**
 * Compute customer quality bias from player reputation.
 *
 * H-2 Design (核心设定 v1.4, Section H, Connection 2):
 * - High humanity → attracts trustworthy customers (STORY traits, strong redeem, patient)
 * - Low innocence → attracts risky customers (STOLEN items, weak redeem, impatient)
 *
 * The bias is subtle and gradual -- it shifts probabilities, not guarantees.
 *
 * @param humanity Player's Humanity reputation (0-100)
 * @param innocence Player's Innocence reputation (0-100)
 * @returns CustomerQualityBias with trustworthy and risky weights
 */
export function computeCustomerQualityBias(humanity: number, innocence: number): CustomerQualityBias {
    const cfg = GAME_CONFIG.NPC_FILLER;
    const cap = cfg.QUALITY_BIAS_CAP;

    // Trustworthy bias: increases as humanity exceeds 50
    // Each 10 points above 50 adds the configured bonus
    const humanityAbove50 = Math.max(0, humanity - 50);
    const rawTrustworthy = (humanityAbove50 / 10) * cfg.HUMANITY_QUALITY_BONUS_PER_10;

    // Risky bias: increases as innocence drops below 50
    // Each 10 points below 50 adds the configured penalty
    const innocenceBelow50 = Math.max(0, 50 - innocence);
    const rawRisky = (innocenceBelow50 / 10) * cfg.LOW_INNOCENCE_RISK_PER_10;

    return {
        trustworthyBias: Math.min(cap, rawTrustworthy),
        riskyBias: Math.min(cap, rawRisky)
    };
}

/**
 * Apply quality bias to a filler customer's profile and attributes.
 * Modifies the profile generation weights, redemption resolve, patience, and item flags.
 *
 * "Trustworthy" customers:
 * - Shift appearance toward 'decent'/'plain' (away from 'shabby')
 * - Boost redemption resolve by one tier
 * - Add patience bonus
 * - More likely to have SENTIMENTAL behavior tag
 *
 * "Risky" customers:
 * - Shift appearance toward 'shabby' (away from 'decent'/'fancy')
 * - Lower redemption resolve by one tier
 * - Reduce patience
 * - Chance to mark item as stolen
 * - More likely to have SUSPICIOUS/DESPERATE behavior tags
 */
function applyQualityBiasToProfile(
    bias: CustomerQualityBias,
    profile: FillerCustomerProfile
): FillerCustomerProfile {
    const netBias = bias.trustworthyBias - bias.riskyBias;

    // Only modify if there's a meaningful bias
    if (Math.abs(netBias) < 0.01) return profile;

    // Probabilistic shift: roll against the bias magnitude
    if (Math.random() >= Math.abs(netBias) * 3) return profile; // Most of the time, no change

    if (netBias > 0) {
        // Trustworthy shift: upgrade appearance
        const upgradeMap: Record<CustomerAppearance, CustomerAppearance> = {
            'shabby': 'plain',
            'plain': 'decent',
            'decent': 'decent',
            'fancy': 'fancy'
        };
        return { ...profile, appearance: upgradeMap[profile.appearance] };
    } else {
        // Risky shift: downgrade appearance
        const downgradeMap: Record<CustomerAppearance, CustomerAppearance> = {
            'fancy': 'decent',
            'decent': 'plain',
            'plain': 'shabby',
            'shabby': 'shabby'
        };
        return { ...profile, appearance: downgradeMap[profile.appearance], mood: 'anxious' };
    }
}

/**
 * Apply quality bias to redemption resolve.
 */
function applyQualityBiasToResolve(
    bias: CustomerQualityBias,
    resolve: RedemptionResolve
): RedemptionResolve {
    const netBias = bias.trustworthyBias - bias.riskyBias;

    // Probabilistic: only sometimes shifts the resolve
    if (Math.random() >= Math.abs(netBias) * 2) return resolve;

    const resolveOrder: RedemptionResolve[] = ['None', 'Weak', 'Medium', 'Strong'];
    const currentIdx = resolveOrder.indexOf(resolve);

    if (netBias > 0 && currentIdx < resolveOrder.length - 1) {
        return resolveOrder[currentIdx + 1]; // upgrade
    } else if (netBias < 0 && currentIdx > 0) {
        return resolveOrder[currentIdx - 1]; // downgrade
    }

    return resolve;
}

/**
 * Apply quality bias to patience.
 */
function applyQualityBiasToPatience(
    bias: CustomerQualityBias,
    patience: number
): number {
    const cfg = GAME_CONFIG.NPC_FILLER;

    if (bias.trustworthyBias > 0.05) {
        patience += cfg.TRUSTWORTHY_PATIENCE_BONUS;
    }
    if (bias.riskyBias > 0.05) {
        patience += cfg.RISKY_PATIENCE_PENALTY;
    }

    return Math.max(1, Math.min(5, patience));
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

// ============================================================================
// #42: REPUTATION-BASED GREETING OVERRIDES
// ============================================================================

/** Get reputation-based greeting texts from CSV */
function getReputationGreetingTexts(reputationType: string): string[] {
    return getFillerTexts('reputation_greeting', reputationType);
}

/**
 * Get a reputation-based greeting override, if applicable.
 * Returns null if no override should be applied.
 */
function getReputationGreeting(qualityOptions?: CustomerQualityOptions): string | null {
    if (!qualityOptions) return null;

    // 20% chance to show reputation-based greeting (not every customer)
    if (Math.random() > 0.20) return null;

    const { humanity, credibility, innocence } = qualityOptions;
    const cred = credibility ?? 50;

    // Priority: low innocence > high humanity > high credibility
    if (innocence < 30) {
        const pool = getReputationGreetingTexts('low_innocence');
        if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
    }
    if (humanity > 60) {
        const pool = getReputationGreetingTexts('high_humanity');
        if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
    }
    if (cred > 60) {
        const pool = getReputationGreetingTexts('high_credibility');
        if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
    }

    return null;
}

/**
 * Generate generic dialogue for filler customers
 */
function generateFillerDialogue(profile: FillerCustomerProfile, qualityOptions?: CustomerQualityOptions): Dialogue {
    // Ensure templates are loaded
    if (!isFillerTemplatesLoaded()) {
        initializeFillerTemplates();
    }

    const mood = profile.mood;

    // #42: Reputation-based greeting override
    const reputationGreeting = getReputationGreeting(qualityOptions);

    // Get dialogue from CSV templates with fallbacks
    const greeting = reputationGreeting || getRandomDialogue(mood, 'greeting') || '老板，帮我看看这个。';
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
 * Calculate tier weight multiplier for an item template based on game day.
 *
 * Items are divided into value tiers by Visual_Value:
 * - T1 (<=threshold_t2): Always available, weight 1.0
 * - T2 (threshold_t2..threshold_t3): Unlocks at tier_t2_unlock_day
 * - T3 (threshold_t3..threshold_t4): Unlocks at tier_t3_unlock_day
 * - T4 (>threshold_t4): Unlocks at tier_t4_unlock_day
 *
 * Unlocked tiers get a weight multiplier; locked tiers return 0 (filtered out).
 */
function getTierWeight(template: ItemTemplate, day: number): number {
    const visualValue = template.visualValue;
    const cfg = GAME_CONFIG.NPC_FILLER;

    if (visualValue > cfg.TIER_T4_THRESHOLD) {
        return day >= cfg.TIER_T4_UNLOCK_DAY ? cfg.TIER_T4_WEIGHT : 0;
    }
    if (visualValue > cfg.TIER_T3_THRESHOLD) {
        return day >= cfg.TIER_T3_UNLOCK_DAY ? cfg.TIER_T3_WEIGHT : 0;
    }
    if (visualValue > cfg.TIER_T2_THRESHOLD) {
        return day >= cfg.TIER_T2_UNLOCK_DAY ? cfg.TIER_T2_WEIGHT : 0;
    }
    // T1: always available
    return 1.0;
}

/**
 * Select an item template using weighted random based on profile and day-based tier.
 *
 * @param profile Customer profile for weight calculation
 * @param day Current game day (used for tier unlock gating)
 * @param excludeTemplateIds Template IDs to exclude (items already in inventory)
 *                           If all templates are excluded, falls back to allowing duplicates
 */
function selectWeightedTemplate(
    profile: FillerCustomerProfile,
    day: number,
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
            const tierWeight = getTierWeight(template, day);
            // Skip items in locked tiers
            if (tierWeight <= 0) continue;
            const weight = calculateItemWeight(template, profile) * tierWeight;
            weightedTemplates.push({ templateId, template, weight });
        }
    }

    // If all templates are excluded (or all locked), fall back to allowing duplicates
    // but still respect tier locks
    if (weightedTemplates.length === 0) {
        for (const templateId of getFillerItemTemplates()) {
            const template = getItemTemplate(templateId);
            if (template) {
                const tierWeight = getTierWeight(template, day);
                if (tierWeight <= 0) continue;
                const weight = calculateItemWeight(template, profile) * tierWeight;
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
    // Day is used for tier-based item gating
    const selection = selectWeightedTemplate(profile, day, excludeTemplateIds);

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

/** Rare encounter probability per filler customer */
const RARE_ENCOUNTER_PROBABILITY = GAME_CONFIG.NPC_FILLER.RARE_ENCOUNTER_CHANCE;

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
 * Options for customer quality bias from player reputation.
 * H-2: Moral actions affect the customer pool quality.
 * #34-39: Milestones affect customer pool composition.
 */
export interface CustomerQualityOptions {
    humanity: number;
    innocence: number;
    credibility?: number;
    activeMilestones?: string[];
}

/**
 * Generate a filler customer with TRANSIENT event chain metadata
 *
 * @param day Current game day
 * @param profile Optional specific profile (random if not provided)
 * @param excludeTemplateIds Template IDs to exclude (items already in inventory).
 *                           Pass this to avoid generating duplicate items.
 * @param forceJumpTrait Optional: Force a specific jump trait type (for testing)
 * @param qualityOptions Optional: Player reputation for H-2 customer quality bias
 * @returns Customer with inferred behavior tags and redemption resolve
 */
export function generateFillerCustomer(
    day: number,
    profile?: FillerCustomerProfile,
    excludeTemplateIds?: Set<string>,
    forceJumpTrait: ForcedJumpTrait = null,
    qualityOptions?: CustomerQualityOptions
): Customer {
    // H-2: Compute quality bias from reputation
    const qualityBias = qualityOptions
        ? computeCustomerQualityBias(qualityOptions.humanity, qualityOptions.innocence)
        : { trustworthyBias: 0, riskyBias: 0 };

    // Roll for rare encounter (v2.1 Section 11.2)
    const rareEncounter = rollRareEncounter();

    let customerProfile = profile || generateRandomProfile();

    // H-2: Apply quality bias to profile (before behavior tag inference)
    customerProfile = applyQualityBiasToProfile(qualityBias, customerProfile);

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

    // H-2: Apply quality bias to redemption resolve
    redemptionResolve = applyQualityBiasToResolve(qualityBias, redemptionResolve);

    // #34-39: Milestone-based customer pool modifications
    const milestones = qualityOptions?.activeMilestones || [];
    // hum_saint (Humanity >= 70): increase emotional story-line customers
    // -> Shift mood toward 'reluctant' (sentimental customers) with 30% probability
    if (milestones.includes('hum_saint') && Math.random() < 0.30) {
        customerProfile = { ...customerProfile, mood: 'reluctant' };
        // Re-infer tags after mood change to pick up SENTIMENTAL
        behaviorTags = inferBehaviorTags(customerProfile);
    }
    // #32: Credibility -> high-end customers
    // High credibility directly biases appearance toward higher tiers (independent of milestone)
    const credibility = qualityOptions?.credibility ?? 50;
    const credThreshold = GAME_CONFIG.NEGOTIATION.CREDIBILITY_HIGH_END_THRESHOLD;
    const credBoost = GAME_CONFIG.NEGOTIATION.CREDIBILITY_HIGH_END_VALUE_BOOST;
    if (credibility > credThreshold && Math.random() < credBoost) {
        const upgradeMap: Record<CustomerAppearance, CustomerAppearance> = {
            'shabby': 'plain',
            'plain': 'decent',
            'decent': 'fancy',
            'fancy': 'fancy'
        };
        customerProfile = { ...customerProfile, appearance: upgradeMap[customerProfile.appearance] };
    }
    // cred_expert milestone (Credibility >= 60): additional high-value customer boost
    // Stacks with the direct credibility check above for stronger effect at milestone
    if (milestones.includes('cred_expert') && Math.random() < 0.25) {
        const upgradeMap2: Record<CustomerAppearance, CustomerAppearance> = {
            'shabby': 'plain',
            'plain': 'decent',
            'decent': 'fancy',
            'fancy': 'fancy'
        };
        customerProfile = { ...customerProfile, appearance: upgradeMap2[customerProfile.appearance] };
    }

    // #48: Low innocence -> cautious customers (harder to negotiate with)
    const innocence = qualityOptions?.innocence ?? 50;
    const cautiousThresholds = GAME_CONFIG.REPUTATION_THRESHOLDS.CAUTIOUS_CUSTOMER_THRESHOLDS;
    const cautiousChances = GAME_CONFIG.REPUTATION_THRESHOLDS.CAUTIOUS_CUSTOMER_CHANCES;
    let cautiousChance = 0;
    for (let i = cautiousThresholds.length - 1; i >= 0; i--) {
        if (innocence < cautiousThresholds[i]) {
            cautiousChance = cautiousChances[i];
            break;
        }
    }
    if (cautiousChance > 0 && Math.random() < cautiousChance) {
        // Make customer suspicious and stubborn
        if (!behaviorTags.includes('SUSPICIOUS')) {
            behaviorTags = [...behaviorTags.filter(t => t !== 'NAIVE'), 'SUSPICIOUS'];
        }
        if (!behaviorTags.includes('STUBBORN')) {
            behaviorTags = [...behaviorTags.filter(t => t !== 'DESPERATE'), 'STUBBORN'];
        }
        redemptionResolve = 'Medium'; // cautious customers are less likely to redeem
    }

    const name = generateName(customerProfile);
    const description = generateDescription(customerProfile);
    const dialogue = generateFillerDialogue(customerProfile, qualityOptions);

    // Create item with profile-based selection, excluding items already in inventory
    const { item, isUnexpected, attrTags } = createFillerItem(day, customerProfile, excludeTemplateIds, forceJumpTrait);

    // H-2: Risky bias can mark items as stolen
    if (qualityBias.riskyBias > 0.05 && !item.isStolen) {
        const stolenChance = GAME_CONFIG.NPC_FILLER.RISKY_STOLEN_CHANCE * (qualityBias.riskyBias / GAME_CONFIG.NPC_FILLER.QUALITY_BIAS_CAP);
        if (Math.random() < stolenChance) {
            item.isStolen = true;
        }
    }

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
    const baseDesired = Math.floor(customerPerceivedValue * GAME_CONFIG.NPC_FILLER.DESIRED_RATIO);
    const baseMinimum = Math.floor(customerPerceivedValue * GAME_CONFIG.NPC_FILLER.MINIMUM_RATIO);
    const basePatience = GAME_CONFIG.NPC_FILLER.BASE_PATIENCE;
    const baseInsultThreshold = baseMinimum * GAME_CONFIG.NPC_FILLER.INSULT_RATIO;

    const { floor, patience, insultThreshold } = applyBehaviorTagEffects(
        behaviorTags,
        baseMinimum,
        basePatience,
        baseInsultThreshold
    );

    // H-2: Apply quality bias to patience
    const finalPatience = applyQualityBiasToPatience(qualityBias, patience);

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
        patience: Math.round(finalPatience),
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

/**
 * Get a random referral greeting text from CSV (filler_texts.csv, category: referral_greeting)
 */
function getReferralGreeting(): string {
    const texts = getFillerTexts('referral_greeting', 'default');
    if (texts.length === 0) return '有人跟我提起过你的店，所以来看看。';
    return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * #25: Generate a word-of-mouth referral customer.
 * These customers carry higher-value items (within TOML-configured range)
 * and are flagged as referrals for narrative presentation (#26).
 *
 * Strategy: Generate with decent/fancy profile (biased toward higher-value items),
 * then filter by value range. Falls back to standard filler if no matching item found.
 * Prepends a referral greeting to the customer's dialogue.
 */
export function generateReferralCustomer(
    day: number,
    excludeTemplateIds: Set<string> = new Set(),
    qualityOptions?: CustomerQualityOptions
): Customer {
    const minValue = GAME_CONFIG.ABILITY.WOM_REFERRAL_MIN_VALUE;
    const maxValue = GAME_CONFIG.ABILITY.WOM_REFERRAL_MAX_VALUE;

    // Use decent/fancy profile to bias toward higher-value items
    const referralProfile: FillerCustomerProfile = {
        age: Math.random() < 0.5 ? 'middle' : 'young',
        gender: Math.random() < 0.5 ? 'male' : 'female',
        appearance: Math.random() < 0.6 ? 'decent' : 'fancy',
        mood: 'calm',
    };

    // Try up to 3 times to get an item within value range
    for (let attempt = 0; attempt < 3; attempt++) {
        const customer = generateFillerCustomer(
            day,
            attempt === 0 ? referralProfile : undefined,
            excludeTemplateIds,
            null,
            qualityOptions
        );
        const itemValue = customer.item.perceivedValue ?? customer.item.realValue;
        if (itemValue >= minValue && itemValue <= maxValue) {
            applyReferralMarkers(customer);
            return customer;
        }
    }

    // Fallback: use whatever we get, still mark as referral
    const fallback = generateFillerCustomer(day, referralProfile, excludeTemplateIds, null, qualityOptions);
    applyReferralMarkers(fallback);
    return fallback;
}

/** Apply referral flag and greeting to a customer */
function applyReferralMarkers(customer: Customer): void {
    customer.isReferral = true;
    // #26: Prepend referral greeting to customer's dialogue
    const referralGreeting = getReferralGreeting();
    const originalGreeting = customer.dialogue.greeting;
    customer.dialogue.greeting = `${referralGreeting}\n\n${originalGreeting}`;
}
