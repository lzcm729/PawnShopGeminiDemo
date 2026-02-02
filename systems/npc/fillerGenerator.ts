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
import { createItemFromTemplate } from '../items/csvLoader';
import { initializeKnowledgePool } from '../items/tagUtils';
import { ContractType, EventChainState } from '../narrative/types';

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
// CONFIGURATION
// ============================================================================

/**
 * Base redemption probabilities by redemptionResolve level
 * From design doc Section 7.4
 */
const BASE_EXPIRY_PROBABILITIES: Record<RedemptionResolve, ExpiryProbabilities> = {
    'Strong': { redeem: 0.80, renew: 0.12, noShow: 0.08 },
    'Medium': { redeem: 0.65, renew: 0.21, noShow: 0.14 },
    'Weak': { redeem: 0.50, renew: 0.30, noShow: 0.20 },
    'None': { redeem: 0.20, renew: 0.32, noShow: 0.48 }
};

/**
 * Contract type modifiers for expiry probabilities
 * From design doc Section 7.4
 */
const CONTRACT_MODIFIERS: Record<ContractType, { redeemMod: number; noShowMod: number }> = {
    'CHARITY': { redeemMod: 0.15, noShowMod: -0.15 },
    'AID': { redeemMod: 0.05, noShowMod: -0.05 },
    'STANDARD': { redeemMod: 0, noShowMod: 0 },
    'SHARK': { redeemMod: -0.20, noShowMod: 0.50 }  // noShowMod is multiplicative in design, but we use additive for simplicity
};

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
 * Item templates for filler customers
 */
const FILLER_ITEM_TEMPLATES = [
    'item_watch_gambler',
    'item_console_student',
    'item_diamond_mystery'
];

/**
 * Name pools for procedural generation
 */
const NAME_POOLS: Record<CustomerAge, Record<CustomerGender, string[]>> = {
    young: {
        male: ['小李', '阿杰', '小王', '阿明', '小陈', '阿伟'],
        female: ['小美', '阿芳', '小红', '阿静', '小丽', '阿敏']
    },
    middle: {
        male: ['张先生', '李师傅', '王老板', '刘经理', '陈先生', '周师傅'],
        female: ['张女士', '李阿姨', '王太太', '刘小姐', '陈女士', '周阿姨']
    },
    elderly: {
        male: ['张老', '李大爷', '王老伯', '刘老', '陈大爷', '周老伯'],
        female: ['张奶奶', '李老太', '王婆婆', '刘奶奶', '陈老太', '周婆婆']
    }
};

const APPEARANCE_DESCRIPTIONS: Record<CustomerAppearance, string[]> = {
    shabby: ['穿着破旧', '衣服有些邋遢', '明显经济拮据', '穿着寒酸'],
    plain: ['穿着朴素', '衣着普通', '相貌平平', '打扮普通'],
    decent: ['穿着体面', '衣着整洁', '看起来不错', '打扮得体'],
    fancy: ['穿着讲究', '打扮精致', '衣着光鲜', '看起来有钱']
};

const MOOD_DESCRIPTIONS: Record<CustomerMood, string[]> = {
    anxious: ['神情焦虑', '满头是汗', '坐立不安', '眼神慌张'],
    calm: ['神态自若', '面色平静', '不慌不忙', '气定神闲'],
    reluctant: ['一脸不舍', '眼含泪光', '欲言又止', '神情惆怅'],
    eager: ['急不可耐', '迫不及待', '跃跃欲试', '神情急切']
};

// ============================================================================
// PROBABILITY CALCULATION
// ============================================================================

/**
 * Calculate expiry probabilities based on redemptionResolve and contractType
 */
export function calculateExpiryProbabilities(
    redemptionResolve: RedemptionResolve,
    contractType?: ContractType
): ExpiryProbabilities {
    const base = { ...BASE_EXPIRY_PROBABILITIES[redemptionResolve] };

    if (contractType) {
        const mod = CONTRACT_MODIFIERS[contractType];
        base.redeem = Math.max(0, Math.min(1, base.redeem + mod.redeemMod));
        base.noShow = Math.max(0, Math.min(1, base.noShow + mod.noShowMod));

        // Normalize to ensure sum = 1
        const total = base.redeem + base.renew + base.noShow;
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

    const probs = calculateExpiryProbabilities(redemptionResolve, contractType);
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
    const pool = NAME_POOLS[profile.age][profile.gender];
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generate description based on profile
 */
function generateDescription(profile: FillerCustomerProfile): string {
    const appearanceDesc = APPEARANCE_DESCRIPTIONS[profile.appearance][
        Math.floor(Math.random() * APPEARANCE_DESCRIPTIONS[profile.appearance].length)
    ];
    const moodDesc = MOOD_DESCRIPTIONS[profile.mood][
        Math.floor(Math.random() * MOOD_DESCRIPTIONS[profile.mood].length)
    ];

    const ageDesc = profile.age === 'young' ? '年轻' : profile.age === 'middle' ? '中年' : '年迈';
    const genderDesc = profile.gender === 'male' ? '男性' : '女性';

    return `一位${appearanceDesc}的${ageDesc}${genderDesc}，${moodDesc}。`;
}

/**
 * Generate generic dialogue for filler customers
 */
function generateFillerDialogue(profile: FillerCustomerProfile): Dialogue {
    const greetings: Record<CustomerMood, string[]> = {
        anxious: ['老板，这个能当多少钱？急用...', '请问收不收这个？我急着用钱。', '能帮帮忙吗？我急需周转...'],
        calm: ['你好，想问一下这个能当多少？', '老板，帮我看看这个值多少。', '请问收不收这类东西？'],
        reluctant: ['这个... 能当吗？我实在是没办法了...', '老板，我想当这个... 能出多少？', '这东西我不太想当，但是...'],
        eager: ['老板！收这个吗？给个好价钱！', '快帮我看看这个值多少！', '这东西绝对值钱，老板看看！']
    };

    const greetingPool = greetings[profile.mood];
    const greeting = greetingPool[Math.floor(Math.random() * greetingPool.length)];

    return {
        greeting,
        pawnReason: '需要周转一下。',
        redemptionPlea: '到期我会来赎的。',
        negotiationDynamic: '能不能再加点？',
        accepted: {
            fair: '行，就这样吧。',
            fleeced: '这也太低了... 算了，急用。',
            premium: '谢谢老板！'
        },
        rejected: '那我再想想...',
        rejectionLines: {
            standard: '那我去别家问问。',
            angry: '太黑了吧？'
        },
        exitDialogues: {
            grateful: '谢谢老板！到期我会来赎的。',
            neutral: '好的，那我先走了。',
            resentful: '唉... 算了...',
            desperate: '...'
        }
    };
}

/**
 * Create a fallback item for filler customers
 */
function createFillerItem(day: number): Item {
    // Try to use a random template
    const templateId = FILLER_ITEM_TEMPLATES[Math.floor(Math.random() * FILLER_ITEM_TEMPLATES.length)];
    let item = createItemFromTemplate(templateId, {
        pawnDate: day,
        status: ItemStatus.ACTIVE
    });

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

    return initializeKnowledgePool(item);
}

/**
 * Generate a filler customer with TRANSIENT event chain metadata
 *
 * @param day Current game day
 * @param profile Optional specific profile (random if not provided)
 * @returns Customer with inferred behavior tags and redemption resolve
 */
export function generateFillerCustomer(day: number, profile?: FillerCustomerProfile): Customer {
    const customerProfile = profile || generateRandomProfile();
    const behaviorTags = inferBehaviorTags(customerProfile);
    const redemptionResolve = inferRedemptionResolve(customerProfile, behaviorTags);

    const name = generateName(customerProfile);
    const description = generateDescription(customerProfile);
    const dialogue = generateFillerDialogue(customerProfile);

    const item = createFillerItem(day);

    // Calculate negotiation parameters based on item value and tags
    const baseDesired = Math.floor(item.realValue * 0.70);
    const baseMinimum = Math.floor(item.realValue * 0.50);
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
        eager: 'Friendly'
    };

    const customer: Customer = {
        id: `filler_${crypto.randomUUID()}`,
        name,
        description,
        avatarSeed: `filler_${customerProfile.age}_${customerProfile.gender}_${day}`,
        dialogue,
        redemptionResolve,
        behaviorTags,
        patience: Math.round(patience),
        mood: moodMap[customerProfile.mood],
        identityTags: ['Filler', customerProfile.appearance, customerProfile.mood],
        item,
        desiredAmount: baseDesired,
        minimumAmount: Math.floor(floor),
        maxRepayment: Math.floor(item.realValue * 1.5),
        interactionType: 'PAWN',
        pawnTermDays: 3 + Math.floor(Math.random() * 8)  // 3-10 days for filler
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

    return {
        id: chainId,
        npcName: customer.name,
        isActive: true,
        stage: 1,  // Stage 0 is pawn completion, Stage 1 is waiting for expiry
        variables: {
            itemId: item.id,
            itemName: item.name,
            pawnAmount: item.pawnAmount,
            realValue: item.realValue
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
