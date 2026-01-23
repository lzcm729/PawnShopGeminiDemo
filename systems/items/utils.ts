
import { Item, ItemTrait } from './types';

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
    
    // Asymmetric Skew (0.2 to 0.8)
    const skewFactor = 0.2 + (Math.random() * 0.6);

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

export type AppraisalEventType = 'NORMAL' | 'MISHAP' | 'IMPATIENT' | 'LUCKY_FIND';

export interface AppraisalEvent {
    type: AppraisalEventType;
    message?: string;
}

export const rollAppraisalEvent = (
    appraisalCount: number,
    uncertainty: number,
    hasNegativeEvent: boolean
): AppraisalEvent => {
    if (appraisalCount === 0) return { type: 'NORMAL' };

    if (hasNegativeEvent) {
         const roll = Math.random();
         if (roll < 0.10) return { type: 'LUCKY_FIND', message: "意外发现！(Lucky Find)" };
         return { type: 'NORMAL' };
    }

    const roll = Math.random();

    if (roll < 0.05 && uncertainty < 0.15) {
        return { type: 'MISHAP', message: "等等...我刚才看错了？(Mishap: Range Widened)" };
    }
    if (roll < 0.15 && roll >= 0.05 && appraisalCount >= 2) {
        return { type: 'IMPATIENT', message: "你到底买不买？(Customer Impatient: Patience -1)" };
    }
    if (roll < 0.20 && roll >= 0.15) {
        return { type: 'LUCKY_FIND', message: "意外发现！(Lucky Find)" };
    }

    return { type: 'NORMAL' };
};
