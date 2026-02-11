/**
 * Perception Tier System (采纳#9, 设计§12.4)
 *
 * Determines how much the player knows about an item before making
 * workshop decisions. Four internal tiers map to three narrative tiers
 * for UI display.
 *
 * Internal tiers:
 *   blind    - 0 appraisals + no insight
 *   glimpse  - 1+ appraisals + no insight
 *   partial  - has insight + 0-1 appraisals
 *   clear    - 2+ appraisals + has insight
 *
 * Narrative tiers (for UI):
 *   lacking  - blind
 *   partial  - glimpse or partial
 *   complete - clear
 */

import type { Item } from '../items/types';

export type PerceptionTier = 'blind' | 'glimpse' | 'partial' | 'clear';
export type NarrativePerceptionTier = 'lacking' | 'partial' | 'complete';

/**
 * Calculate the perception tier for an item based on appraisal count and insight state.
 */
export function calculatePerceptionTier(item: Item): PerceptionTier {
    const appraisalCount = item.appraisalCount ?? 0;
    const hasInsight = item.customerSnapshot ? item.customerSnapshot.insightDepth > 0 : false;

    if (appraisalCount >= 2 && hasInsight) return 'clear';
    if (hasInsight) return 'partial';
    if (appraisalCount >= 1) return 'glimpse';
    return 'blind';
}

/**
 * Map an internal perception tier to the three-level narrative tier for UI display.
 */
export function getNarrativeTier(tier: PerceptionTier): NarrativePerceptionTier {
    switch (tier) {
        case 'blind': return 'lacking';
        case 'glimpse':
        case 'partial': return 'partial';
        case 'clear': return 'complete';
    }
}
