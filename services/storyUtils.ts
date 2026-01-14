
import { generateValuationRange } from './contentGenerator';

export const makeItem = (base: any, chainId: string) => {
    const range = generateValuationRange(base.realValue, base.perceivedValue, base.uncertainty || 0.2);
    return {
        ...base,
        condition: base.condition || "正常",
        pawnAmount: 0,
        currentRange: range,
        initialRange: range,
        uncertainty: base.uncertainty || 0.2,
        revealedTraits: base.revealedTraits || [],
        hiddenTraits: base.hiddenTraits || [],
        relatedChainId: chainId,
        // Removed maxExtensions
    };
};
