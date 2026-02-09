
import { Item, ItemTrait } from './types';
import { GAME_CONFIG } from '../game/config';

// ==========================================
// Valuation Logic
// ==========================================

export const generateValuationRange = (
    realValue: number, 
    perceivedValue: number | undefined, 
    uncertainty: number
): [number, number] => {
    const anchor = perceivedValue !== undefined ? perceivedValue : realValue;
    const width = anchor * uncertainty;
    
    // Asymmetric Skew
    const skewFactor = GAME_CONFIG.APPRAISAL.SKEW_MIN + (Math.random() * GAME_CONFIG.APPRAISAL.SKEW_RANGE);

    let min = anchor - (width * skewFactor);
    let max = anchor + (width * (1 - skewFactor));

    min = Math.max(0, min);
    max = Math.max(min, max);

    const roundToHuman = (val: number): number => {
        if (val === 0) return 0;
        if (val < 50) return Math.round(val); 
        if (val < 200) return Math.round(val / 10) * 10; 
        if (val < 1000) return Math.round(val / 50) * 50; 
        return Math.round(val / 100) * 100; 
    };

    return [roundToHuman(min), roundToHuman(max)];
};

export const enrichItemWithTraits = (item: any): Item => {
    const realValue = item.realValue || item.values?.realValue || 0;
    
    let hidden = item.hiddenTraits || [];
    // Default Traits logic
    if (hidden.length === 0) {
        if (item.isFake) {
            hidden.push({
                id: `trait-${item.id}-fake`,
                name: "工艺伪造痕迹",
                type: 'FAKE',
                description: item.appraisalNote || "明显的仿造细节。",
                valueImpact: -0.9,
                discoveryDifficulty: 0.6
            });
        }
        if (item.isStolen) {
            hidden.push({
                id: `trait-${item.id}-stolen`,
                name: "序列号异常",
                type: 'FLAW',
                description: "物品序列号被抹去或挂失。",
                valueImpact: -0.5,
                discoveryDifficulty: 0.7
            });
        }
        hidden.push({
            id: `trait-${item.id}-story`,
            name: "岁月痕迹",
            type: 'STORY',
            description: "这件物品似乎被精心保存过。",
            valueImpact: 0.05,
            discoveryDifficulty: 0.4
        });
    }

    const uncertainty = item.uncertainty ?? 0.3;
    const perceived = item.perceivedValue; 
    const range = generateValuationRange(realValue, perceived, uncertainty);

    return {
        ...item,
        realValue,
        perceivedValue: perceived,
        uncertainty,
        currentRange: range,
        initialRange: range, 
        hiddenTraits: hidden,
        revealedTraits: item.revealedTraits || [],
        usedTraitIds: [], // Initialize empty
        logs: item.logs || [], 
        pawnAmount: 0, 
        appraisalCount: item.appraisalCount || 0,
        hasNegativeAppraisalEvent: item.hasNegativeAppraisalEvent || false
    } as Item;
};

// ==========================================
// Appraisal Logic
// ==========================================

export type UncertaintyRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export const getUncertaintyRisk = (min: number, max: number): UncertaintyRisk => {
    if (min <= 0) return 'HIGH'; 
    const ratio = max / min;
    if (ratio > 3.0) return 'HIGH';
    if (ratio > 2.0) return 'MEDIUM';
    return 'LOW';
};

export type AppraisalEventType = 'NORMAL' | 'BREAKTHROUGH' | 'MISHAP' | 'IMPATIENT' | 'LUCKY_FIND';

export interface AppraisalEvent {
    type: AppraisalEventType;
    message?: string;
}

/**
 * d100 single-die mutually exclusive appraisal event roll (v1.7).
 *
 * Dice ranges (from GAME_CONFIG.APPRAISAL_EVENTS):
 *   1  ~ BREAKTHROUGH_MAX(10)  : 灵光一闪
 *   11 ~ MISHAP_MAX(15)        : 鉴定失误
 *   16 ~ IMPATIENT_MAX(25)     : 客户不耐烦
 *   26 ~ LUCKY_FIND_MAX(30)    : 意外发现
 *   31 ~ 100                   : 无事件
 *
 * Filter rules (condition not met → treat as "no event", no re-roll):
 *  - First appraisal (appraisalCount===0): no negative events (MISHAP, IMPATIENT)
 *  - Max 1 negative event per item (hasNegativeEvent)
 *  - FAKE items never trigger MISHAP (isFake)
 */
export const rollAppraisalEvent = (
    appraisalCount: number,
    _uncertainty: number,
    hasNegativeEvent: boolean,
    isFake: boolean = false,
    config?: {
        BREAKTHROUGH_MAX: number;
        MISHAP_MAX: number;
        IMPATIENT_MAX: number;
        LUCKY_FIND_MAX: number;
    }
): AppraisalEvent => {
    // Default ranges match game.toml defaults
    const cfg = config ?? {
        BREAKTHROUGH_MAX: 10,
        MISHAP_MAX: 15,
        IMPATIENT_MAX: 25,
        LUCKY_FIND_MAX: 30,
    };

    // d100: 1-100
    const roll = Math.floor(Math.random() * 100) + 1;

    // --- 1 ~ BREAKTHROUGH_MAX: 灵光一闪 ---
    if (roll <= cfg.BREAKTHROUGH_MAX) {
        return { type: 'BREAKTHROUGH', message: "灵光一闪！(Breakthrough)" };
    }

    // --- BREAKTHROUGH_MAX+1 ~ MISHAP_MAX: 鉴定失误 ---
    if (roll <= cfg.MISHAP_MAX) {
        // Filters: first appraisal, already had negative, or fake item
        if (appraisalCount === 0 || hasNegativeEvent || isFake) {
            return { type: 'NORMAL' };
        }
        return { type: 'MISHAP', message: "等等...我刚才看错了？(Mishap: Range Widened)" };
    }

    // --- MISHAP_MAX+1 ~ IMPATIENT_MAX: 客户不耐烦 ---
    if (roll <= cfg.IMPATIENT_MAX) {
        // Filters: first appraisal, already had negative, or not enough appraisals
        if (appraisalCount === 0 || hasNegativeEvent || appraisalCount < 2) {
            return { type: 'NORMAL' };
        }
        return { type: 'IMPATIENT', message: "你到底买不买？(Customer Impatient: Patience -1)" };
    }

    // --- IMPATIENT_MAX+1 ~ LUCKY_FIND_MAX: 意外发现 ---
    if (roll <= cfg.LUCKY_FIND_MAX) {
        return { type: 'LUCKY_FIND', message: "意外发现！(Lucky Find)" };
    }

    // --- 31~100: 无事件 ---
    return { type: 'NORMAL' };
};
