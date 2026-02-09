import { ReputationProfile, ReputationType } from './types';

/**
 * Clamp all reputation values to [0, 100] range.
 * Mutates the profile in place and returns it for convenience.
 */
export function clampReputation(rep: ReputationProfile): ReputationProfile {
    for (const key of Object.keys(rep)) {
        rep[key as ReputationType] = Math.max(0, Math.min(100, rep[key as ReputationType]));
    }
    return rep;
}
