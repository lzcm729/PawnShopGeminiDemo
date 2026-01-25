
import { SatisfactionLevel } from '../../narrative/types';

/**
 * Determines the emotional state of the customer upon departure
 * based on the terms of the deal or rejection.
 */
export const evaluateSatisfaction = (
    offer: number,
    rate: number,
    valuation: number, // The 'Real Value' or 'Minimum Acceptable' depending on context. Usually item.realValue or customer.minimumAmount
    minAcceptable: number,
    isRejected: boolean
): SatisfactionLevel => {
    
    if (isRejected) {
        return 'DESPERATE';
    }

    // Charity Case: No Interest
    if (rate === 0) {
        return 'GRATEFUL';
    }

    // High Premium: Offer is significantly higher than valuation basis
    // We use minAcceptable as the baseline for "what they needed"
    if (offer >= minAcceptable * 1.5) {
        return 'GRATEFUL';
    }

    // Shark Rate
    if (rate >= 0.20) {
        return 'RESENTFUL';
    }

    // Lowball: Offer is technically accepted but very low (fleeced)
    if (offer <= minAcceptable * 1.05) {
        // Only resentful if it wasn't a shark rate (covered above)
        // Actually if they accepted a lowball, they might be resentful or just relieved.
        // Let's say if it's barely above minimum, they are neutral/relieved unless rate is high.
        return 'NEUTRAL';
    }

    return 'NEUTRAL';
};
