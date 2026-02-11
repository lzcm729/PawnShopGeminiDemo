/**
 * Emotional Weight Scoring System (采纳#8, 设计§12.3)
 *
 * Calculates how emotionally attached a customer is to their pawned item.
 * This score influences return outcome probabilities when a reforged item
 * is returned to its original owner.
 *
 * Scoring sources:
 *   - Item traits (SENTIMENTAL, STORY)
 *   - Insight depth (layer 3+ reveals moral info)
 *   - Dialogue keywords (emotional expression)
 *   - Behavior tags (SENTIMENTAL)
 */

import type { Item } from '../items/types';
import { GAME_CONFIG } from '../game/config';

export type EmotionalWeight = 'unknown' | 'low' | 'mid' | 'high';

export interface EmotionalWeightResult {
    score: number;
    weight: EmotionalWeight;
}

/**
 * Map a raw emotional score to a discrete weight tier.
 */
export function getEmotionalWeightFromScore(score: number): EmotionalWeight {
    const cfg = GAME_CONFIG.WORKSHOP.INFO_FLOW;
    if (score >= cfg.WEIGHT_HIGH_MIN) return 'high';
    if (score >= cfg.WEIGHT_MID_MIN && score <= cfg.WEIGHT_MID_MAX) return 'mid';
    if (score >= cfg.WEIGHT_LOW_MIN && score <= cfg.WEIGHT_LOW_MAX) return 'low';
    return 'unknown';
}

/**
 * Calculate the emotional weight of an item based on all available information.
 *
 * Scoring rules (config-driven):
 *   - SENTIMENTAL trait revealed: +TRAIT_SENTIMENTAL_SCORE
 *   - STORY trait revealed: +TRAIT_STORY_SCORE
 *   - insightDepth >= 3 (moral layer): +INSIGHT_EMOTIONAL_SCORE
 *   - BehaviorTag SENTIMENTAL on customer snapshot: +BEHAVIOR_SENTIMENTAL_SCORE
 *   - emotionalAttachment flag on snapshot: +DIALOGUE_EMOTIONAL_SCORE
 */
export function calculateEmotionalWeight(item: Item): EmotionalWeightResult {
    const cfg = GAME_CONFIG.WORKSHOP.INFO_FLOW;
    let score = 0;

    // 1. Check revealed traits for SENTIMENTAL and STORY types
    if (item.revealedTraits && item.revealedTraits.length > 0) {
        for (const trait of item.revealedTraits) {
            if (trait.type === 'STORY') {
                score += cfg.TRAIT_STORY_SCORE;
            }
        }
        // Check for sentimental value via item flag (set when SENTIMENTAL trait is revealed)
        if (item.sentimentalValue) {
            score += cfg.TRAIT_SENTIMENTAL_SCORE;
        }
    }

    // 2. Check insight depth from customer snapshot
    const snapshot = item.customerSnapshot;
    if (snapshot) {
        // Insight layer 3+ contributes emotional information
        if (snapshot.insightDepth >= 3) {
            score += cfg.INSIGHT_EMOTIONAL_SCORE;
        }

        // 3. BehaviorTag: SENTIMENTAL
        if (snapshot.behaviorTags.includes('SENTIMENTAL')) {
            score += cfg.BEHAVIOR_SENTIMENTAL_SCORE;
        }

        // 4. Dialogue/emotional attachment (designer-marked or captured from dialogue)
        if (snapshot.emotionalAttachment) {
            score += cfg.DIALOGUE_EMOTIONAL_SCORE;
        }
    }

    return {
        score,
        weight: getEmotionalWeightFromScore(score),
    };
}
