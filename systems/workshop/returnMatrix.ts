/**
 * Return Matrix System (采纳#15, 设计§7.4, 附录D)
 *
 * Determines the outcome when a reforged item is returned to its original owner.
 * The result depends on the customer's emotional weight and personality type.
 *
 * Four possible outcomes:
 *   ADMIRATION  - Customer is impressed by the improvement
 *   ACCEPTANCE  - Customer accepts the changes
 *   UNEASE     - Customer is uncomfortable with the alterations
 *   ANGER      - Customer is furious about unauthorized modifications
 *
 * Personality inference from behaviorTags (design §7.4):
 *   OPEN_MINDED / PRAGMATIC / NAIVE       -> open (more accepting)
 *   SENTIMENTAL / EMOTIONAL               -> emotional (more hostile)
 *   SAVVY / SUSPICIOUS                    -> neutral (quality-dependent)
 *   DESPERATE                             -> emotion-dependent (open if low, emotional if high)
 *   others                                -> neutral (moderate)
 */

import type { ReturnResult } from './types';
import type { EmotionalWeight } from './emotionalWeight';
import { GAME_CONFIG } from '../game/config';

export type CustomerPersonality = 'open' | 'neutral' | 'emotional';

interface ReturnProbabilities {
    ADMIRATION: number;
    ACCEPTANCE: number;
    UNEASE: number;
    ANGER: number;
}

/**
 * Infer customer personality from behavior tags.
 * Design §7.4 mapping:
 *   NAIVE / DESPERATE(low emotion) -> open
 *   SENTIMENTAL / EMOTIONAL / DESPERATE(high emotion) -> emotional
 *   SAVVY / SUSPICIOUS -> neutral (quality-dependent)
 *   OPEN_MINDED / PRAGMATIC -> open
 *
 * DESPERATE is context-dependent: maps to 'open' when emotionalWeight is low,
 * 'emotional' when emotionalWeight is high. When emotionalWeight is not provided,
 * defaults to 'neutral'.
 */
export function inferPersonality(
    behaviorTags: string[],
    emotionalWeight?: EmotionalWeight,
): CustomerPersonality {
    // Check for explicit personality tags first
    for (const tag of behaviorTags) {
        if (tag === 'OPEN_MINDED' || tag === 'PRAGMATIC') return 'open';
        if (tag === 'SENTIMENTAL' || tag === 'EMOTIONAL') return 'emotional';
    }

    // NAIVE -> open (accepting, trusting)
    if (behaviorTags.includes('NAIVE')) return 'open';

    // SAVVY / SUSPICIOUS -> neutral (quality-dependent, judge by results)
    if (behaviorTags.includes('SAVVY') || behaviorTags.includes('SUSPICIOUS')) return 'neutral';

    // DESPERATE -> emotion-dependent per design §7.4:
    // low emotion = open ("变好了更容易赎"), high emotion = emotional ("这是我唯一的东西")
    if (behaviorTags.includes('DESPERATE')) {
        if (emotionalWeight === 'low') return 'open';
        if (emotionalWeight === 'high' || emotionalWeight === 'mid') return 'emotional';
        // unknown or not provided -> neutral
        return 'neutral';
    }

    return 'neutral';
}

/**
 * Get the probability distribution for a given emotional weight and personality combination.
 * When emotionalWeight is 'unknown', returns uniform distribution (25% each).
 */
export function getReturnProbabilities(
    emotionalWeight: EmotionalWeight,
    personality: CustomerPersonality,
): ReturnProbabilities {
    if (emotionalWeight === 'unknown') {
        return { ADMIRATION: 0.25, ACCEPTANCE: 0.25, UNEASE: 0.25, ANGER: 0.25 };
    }

    const matrix = GAME_CONFIG.WORKSHOP.RETURN_MATRIX;

    // Map (emotionalWeight, personality) to matrix key
    const isHighEmotion = emotionalWeight === 'high' || emotionalWeight === 'mid';
    const isLowEmotion = emotionalWeight === 'low';

    let probs: ReturnProbabilities;

    if (isLowEmotion && personality === 'open') {
        probs = matrix.LOW_OPEN;
    } else if (isLowEmotion) {
        // low + neutral or low + emotional -> use low_neutral
        probs = matrix.LOW_NEUTRAL;
    } else if (isHighEmotion && personality === 'emotional') {
        probs = matrix.HIGH_EMOTIONAL;
    } else {
        // high/mid + open or neutral -> use high_neutral
        probs = matrix.HIGH_NEUTRAL;
    }

    return probs;
}

/**
 * Roll a return result based on emotional weight and customer personality.
 */
export function rollReturnResult(
    emotionalWeight: EmotionalWeight,
    personality: CustomerPersonality,
): ReturnResult {
    const probs = getReturnProbabilities(emotionalWeight, personality);
    const roll = Math.random();

    let cumulative = 0;
    cumulative += probs.ADMIRATION;
    if (roll < cumulative) return 'ADMIRATION';

    cumulative += probs.ACCEPTANCE;
    if (roll < cumulative) return 'ACCEPTANCE';

    cumulative += probs.UNEASE;
    if (roll < cumulative) return 'UNEASE';

    return 'ANGER';
}

/**
 * Get the reputation delta for a return result.
 * Values are loaded from TOML config.
 */
export function getReturnReputationDelta(result: ReturnResult): { humanity: number; credibility: number } {
    const rep = GAME_CONFIG.WORKSHOP.REPUTATION;

    switch (result) {
        case 'ADMIRATION':
            return {
                humanity: rep.reforge_return_admiration_humanity,
                credibility: rep.reforge_return_admiration_credibility,
            };
        case 'ACCEPTANCE':
            return {
                humanity: 0,
                credibility: rep.reforge_return_acceptance_credibility,
            };
        case 'UNEASE':
            return {
                humanity: rep.reforge_return_unease_humanity,
                credibility: rep.reforge_return_unease_credibility,
            };
        case 'ANGER':
            return {
                humanity: rep.reforge_return_anger_humanity,
                credibility: rep.reforge_return_anger_credibility,
            };
    }
}
