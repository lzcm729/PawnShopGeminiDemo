

import { Item, ItemStatus } from '../types';

// ==========================================
// Core Algorithm: Asymmetric Anchor Range
// ==========================================

export const generateValuationRange = (
    realValue: number, 
    perceivedValue: number | undefined, 
    uncertainty: number
): [number, number] => {
    // 1. Determine Anchor
    // If perceivedValue is present (e.g. a fake item looking expensive), use it.
    // Otherwise, use the real truth.
    const anchor = perceivedValue !== undefined ? perceivedValue : realValue;

    // 2. Determine Width
    const width = anchor * uncertainty;

    // 3. Asymmetric Skew (0.2 to 0.8)
    // This ensures the anchor is inside the range, but rarely dead center.
    // skewFactor of 0.2 means anchor is close to Min.
    // skewFactor of 0.8 means anchor is close to Max.
    const skewFactor = 0.2 + (Math.random() * 0.6);

    let min = anchor - (width * skewFactor);
    let max = anchor + (width * (1 - skewFactor));

    // Ensure non-negative
    min = Math.max(0, min);
    max = Math.max(min, max);

    // 4. Humanized Rounding
    const roundToHuman = (val: number): number => {
        if (val === 0) return 0;
        if (val < 50) return Math.round(val); // 1-49: Exact
        if (val < 200) return Math.round(val / 10) * 10; // 50-199: Nearest 10
        if (val < 1000) return Math.round(val / 50) * 50; // 200-999: Nearest 50
        return Math.round(val / 100) * 100; // 1000+: Nearest 100
    };

    return [roundToHuman(min), roundToHuman(max)];
};

// ==========================================
// Helper: Trait Generation
// ==========================================

// Updates existing items to have traits if missing, but respects new fields
export const enrichItemWithTraits = (item: any): Item => {
    const realValue = item.realValue || item.values?.realValue || 0;
    
    // Default Traits logic if missing
    let hidden = item.hiddenTraits || [];
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

    // Initial Range Calculation
    // Use existing uncertainty or default to 0.3 (High uncertainty for initial)
    const uncertainty = item.uncertainty ?? 0.3;
    const perceived = item.perceivedValue; // might be undefined
    const range = generateValuationRange(realValue, perceived, uncertainty);

    return {
        ...item,
        realValue,
        perceivedValue: perceived,
        uncertainty,
        currentRange: range,
        initialRange: range, // Freeze start state
        hiddenTraits: hidden,
        revealedTraits: item.revealedTraits || [],
        logs: item.logs || [], // Initialize Logs
        pawnAmount: 0 // Reset for new transaction
    } as Item;
};