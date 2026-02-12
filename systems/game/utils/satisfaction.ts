
import { SatisfactionLevel, RedeemSatisfaction, RenewalSatisfaction, PostForfeitSatisfaction, DepartureSatisfaction, ExitLines } from '../../narrative/types';

/**
 * Determines the emotional state of the customer upon departure
 * using a 2D satisfaction matrix (contract tier x pawn ratio).
 *
 * @param offer - The pawn amount (当金)
 * @param rate - Contract interest rate (0, 0.05, 0.10, 0.20)
 * @param valuation - The customer's reference value (minimumAmount or desiredAmount)
 * @param minAcceptable - Minimum amount NPC would accept
 * @param isRejected - Whether the deal was rejected
 * @param pawnRatio - offer / reference value, defaults to 0.7
 */
export const evaluateSatisfaction = (
    offer: number,
    rate: number,
    valuation: number,
    minAcceptable: number,
    isRejected: boolean,
    pawnRatio?: number
): SatisfactionLevel => {

    if (isRejected) {
        return 'DESPERATE';
    }

    // Calculate pawn ratio if not provided
    const ratio = pawnRatio ?? (valuation > 0 ? offer / valuation : 0.7);

    // Classify pawn ratio tier
    const ratioTier: 'HIGH' | 'MID' | 'LOW' =
        ratio >= 0.8 ? 'HIGH' :
        ratio >= 0.5 ? 'MID' :
        'LOW';

    // Classify contract tier
    const contractTier: 'CHARITY' | 'AID' | 'STANDARD' | 'SHARK' =
        rate === 0 ? 'CHARITY' :
        rate <= 0.05 ? 'AID' :
        rate <= 0.10 ? 'STANDARD' :
        'SHARK';

    // 2D Satisfaction Matrix
    // Rows: contract tier, Columns: pawn ratio tier
    const matrix: Record<string, Record<string, SatisfactionLevel>> = {
        CHARITY: {
            HIGH: 'GRATEFUL',
            MID: 'GRATEFUL',
            LOW: 'CONFLICTED',
        },
        AID: {
            HIGH: 'GRATEFUL',
            MID: 'NEUTRAL',
            LOW: 'CONFLICTED',
        },
        STANDARD: {
            HIGH: 'NEUTRAL',
            MID: 'NEUTRAL',
            LOW: 'RESENTFUL',
        },
        SHARK: {
            HIGH: 'RESENTFUL',
            MID: 'RESENTFUL',
            LOW: 'DESPERATE',
        },
    };

    return matrix[contractTier][ratioTier];
};

/**
 * Evaluate satisfaction for REDEEM scenario.
 * Based on redemption cost burden relative to original principal.
 */
export const evaluateRedeemSatisfaction = (
    interestRate: number,
    totalCost: number,
    originalPrincipal: number
): RedeemSatisfaction => {
    const costRatio = originalPrincipal > 0 ? totalCost / originalPrincipal : 1;

    // Low interest + low cost ratio → player was generous originally
    if (interestRate <= 0.05 && costRatio <= 1.1) {
        return 'GRATEFUL';
    }
    // Normal redemption within expectations
    if (costRatio <= 1.2) {
        return 'RELIEVED';
    }
    // High accumulated interest
    if (costRatio > 1.4 || interestRate >= 0.20) {
        return 'BITTER';
    }
    // Default: mixed feelings
    return 'BITTERSWEET';
};

/**
 * Evaluate satisfaction for RENEWAL scenario.
 * Based on renewal count and interest rate burden.
 */
export const evaluateRenewalSatisfaction = (
    renewalCount: number,
    interestRate: number
): RenewalSatisfaction => {
    // Multiple renewals → numbness
    if (renewalCount >= 3) {
        return 'NUMB';
    }
    // High interest rate → anxiety
    if (interestRate >= 0.20) {
        return 'ANXIOUS';
    }
    // First renewal with reasonable rate → hope
    if (renewalCount <= 1 && interestRate <= 0.10) {
        return 'HOPEFUL';
    }
    // Default
    return 'WEARY';
};

/**
 * Evaluate satisfaction for POST_FORFEIT scenario.
 * Based on item emotional value and relationship history.
 */
export const evaluatePostForfeitSatisfaction = (
    isCoreItem: boolean,
    interestRate: number
): PostForfeitSatisfaction => {
    // Core item lost → deepest grief
    if (isCoreItem && interestRate >= 0.20) {
        return 'HOSTILE';
    }
    if (isCoreItem) {
        return 'GRIEF';
    }
    // Non-core, player was exploitative
    if (interestRate >= 0.20) {
        return 'HOSTILE';
    }
    // Default
    return 'RESIGNED';
};

/**
 * Map scene-specific satisfaction to the base SatisfactionLevel
 * for backward compatibility with existing systems.
 */
export const mapToBaseSatisfaction = (
    scene: 'REDEEM' | 'RENEWAL' | 'POST_FORFEIT',
    level: string
): SatisfactionLevel => {
    const mapping: Record<string, SatisfactionLevel> = {
        // REDEEM
        RELIEVED: 'NEUTRAL',
        GRATEFUL: 'GRATEFUL',
        BITTER: 'RESENTFUL',
        BITTERSWEET: 'CONFLICTED',
        // RENEWAL
        WEARY: 'NEUTRAL',
        ANXIOUS: 'RESENTFUL',
        NUMB: 'NEUTRAL',
        HOPEFUL: 'GRATEFUL',
        // POST_FORFEIT
        GRIEF: 'DESPERATE',
        RESIGNED: 'NEUTRAL',
        HOSTILE: 'RESENTFUL',
        PLEADING: 'DESPERATE',
    };
    return mapping[level] || 'NEUTRAL';
};

/**
 * Select the appropriate exit line from ExitLines based on departure satisfaction.
 * Falls back to base satisfaction keys (grateful/neutral/resentful/desperate/conflicted)
 * when scene-specific keys are not defined in the ExitLines.
 */
export const getSceneExitLine = (
    exitLines: ExitLines,
    departureSatisfaction: DepartureSatisfaction
): string => {
    const { scene, level } = departureSatisfaction;

    // For PAWN scene, use the base keys directly
    if (scene === 'PAWN') {
        const key = level.toLowerCase() as keyof ExitLines;
        return (exitLines[key] as string) ?? exitLines.neutral;
    }

    // For multi-scene departures, try scene-specific key first
    const sceneKey = level.toLowerCase() as keyof ExitLines;
    const sceneSpecificLine = exitLines[sceneKey] as string | undefined;
    if (sceneSpecificLine) {
        return sceneSpecificLine;
    }

    // Fallback: map to base satisfaction and use those keys
    const baseSatisfaction = mapToBaseSatisfaction(scene, level);
    const baseKey = baseSatisfaction.toLowerCase() as keyof ExitLines;
    return (exitLines[baseKey] as string) ?? exitLines.neutral;
};
