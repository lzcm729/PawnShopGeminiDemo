
import { ReputationType } from '../core/types';

/**
 * Clamp a number to [min, max]
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Reputation modulation -- implicit emergence mechanism
 *
 * Used by insight, black market, and character ability systems.
 * Effect = base_effect x getReputationModifier(reputation, axis)
 *
 * Range: 0.8 (reputation=0) ~ 1.2 (reputation=100)
 * Formula: 0.8 + 0.4 x (reputation / 100)
 *
 * @param reputation - The reputation score (0-100) on the given axis
 * @param _axis - The reputation axis (reserved for future per-axis tuning)
 * @returns Modifier in range [0.8, 1.2]
 */
export function getReputationModifier(reputation: number, _axis?: ReputationType): number {
    return 0.8 + 0.4 * (clamp(reputation, 0, 100) / 100);
}
