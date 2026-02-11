/**
 * Invisible Training / Scaffolding System (采纳#20, 设计§12.7)
 *
 * Tracks player workshop usage and determines the scaffolding level:
 *   Phase 1 (0 to guide threshold):   Full guidance monologue
 *   Phase 2 (guide to hint threshold): Vague hints
 *   Phase 3 (beyond hint threshold):   No scaffolding (player is trained)
 */

import { GAME_CONFIG } from '../game/config';

export type ScaffoldingPhase = 'guide' | 'hint' | 'none';

/**
 * Determine the current scaffolding phase based on workshop usage count.
 */
export function getScaffoldingPhase(usageCount: number): ScaffoldingPhase {
    const cfg = GAME_CONFIG.WORKSHOP.INFO_FLOW;
    if (usageCount < cfg.TRAINING_GUIDE_THRESHOLD) return 'guide';
    if (usageCount < cfg.TRAINING_HINT_THRESHOLD) return 'hint';
    return 'none';
}

/**
 * Check if scaffolding should be shown for the current usage count.
 */
export function shouldShowScaffolding(usageCount: number): boolean {
    return getScaffoldingPhase(usageCount) !== 'none';
}
