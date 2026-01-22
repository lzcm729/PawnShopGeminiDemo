
import { ItemTrait } from '../types';

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
    // First appraisal is always safe
    if (appraisalCount === 0) return { type: 'NORMAL' };

    // Don't double punish with negative events
    if (hasNegativeEvent) {
         // Still allow Lucky Find (Positive)
         const roll = Math.random();
         if (roll < 0.10) return { type: 'LUCKY_FIND', message: "意外发现！(Lucky Find)" };
         return { type: 'NORMAL' };
    }

    const roll = Math.random();

    // 5% Mishap (Only if uncertainty is low enough to bounce back, e.g. < 15%)
    if (roll < 0.05 && uncertainty < 0.15) {
        return { type: 'MISHAP', message: "等等...我刚才看错了？(Mishap: Range Widened)" };
    }

    // 10% Impatient (If appraised 2+ times)
    if (roll < 0.15 && roll >= 0.05 && appraisalCount >= 2) {
        return { type: 'IMPATIENT', message: "你到底买不买？(Customer Impatient: Patience -1)" };
    }

    // 5% Lucky Find
    if (roll < 0.20 && roll >= 0.15) {
        return { type: 'LUCKY_FIND', message: "意外发现！(Lucky Find)" };
    }

    return { type: 'NORMAL' };
};
