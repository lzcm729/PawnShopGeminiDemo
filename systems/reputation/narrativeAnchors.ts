/**
 * Three-axis Narrative Anchors (三轴叙事锚点)
 *
 * Each reputation axis has 5 tiers of narrative descriptions that help players
 * understand their current standing. These are atmospheric flavor text and
 * do NOT affect mechanical judgments.
 *
 * Source: reputation system design doc v2.3 (P2-21)
 */

import { ReputationType } from '../core/types';

/** Narrative anchor for a reputation tier */
export interface NarrativeAnchor {
    /** Reputation axis */
    type: ReputationType;
    /** Lower bound of the range (inclusive) */
    min: number;
    /** Upper bound of the range (inclusive) */
    max: number;
    /** Tier label (Chinese) */
    tierLabel: string;
    /** Narrative description shown to the player */
    description: string;
}

/** All narrative anchors, organized by axis and tier */
export const NARRATIVE_ANCHORS: NarrativeAnchor[] = [
    // === HUMANITY (人情) ===
    {
        type: ReputationType.HUMANITY,
        min: 80, max: 100,
        tierLabel: '善人',
        description: '街坊称你为"善人"。',
    },
    {
        type: ReputationType.HUMANITY,
        min: 60, max: 79,
        tierLabel: '友善',
        description: '邻居们提到你时会点点头。',
    },
    {
        type: ReputationType.HUMANITY,
        min: 40, max: 59,
        tierLabel: '普通',
        description: '人们对你没什么特别的印象。',
    },
    {
        type: ReputationType.HUMANITY,
        min: 20, max: 39,
        tierLabel: '冷漠',
        description: '没人再向你求助了。',
    },
    {
        type: ReputationType.HUMANITY,
        min: 1, max: 19,
        tierLabel: '冷血',
        description: '孩子们被告诫不要靠近你的店。',
    },

    // === CREDIBILITY (商誉) ===
    {
        type: ReputationType.CREDIBILITY,
        min: 80, max: 100,
        tierLabel: '金字招牌',
        description: '业内无人质疑你的判断。',
    },
    {
        type: ReputationType.CREDIBILITY,
        min: 60, max: 79,
        tierLabel: '可靠',
        description: '同行愿意和你打交道。',
    },
    {
        type: ReputationType.CREDIBILITY,
        min: 40, max: 59,
        tierLabel: '一般',
        description: '你在行业里只是个普通面孔。',
    },
    {
        type: ReputationType.CREDIBILITY,
        min: 20, max: 39,
        tierLabel: '可疑',
        description: '有人开始在背后议论你的信用。',
    },
    {
        type: ReputationType.CREDIBILITY,
        min: 1, max: 19,
        tierLabel: '骗子',
        description: '没有供货商愿意接你的电话了。',
    },

    // === INNOCENCE (清白) ===
    {
        type: ReputationType.INNOCENCE,
        min: 80, max: 100,
        tierLabel: '守法模范',
        description: '你还记得自己的底线。',
    },
    {
        type: ReputationType.INNOCENCE,
        min: 60, max: 79,
        tierLabel: '清白',
        description: '你的手还算干净。',
    },
    {
        type: ReputationType.INNOCENCE,
        min: 40, max: 59,
        tierLabel: '灰色',
        description: '灰色地带已经不那么刺眼了。',
    },
    {
        type: ReputationType.INNOCENCE,
        min: 20, max: 39,
        tierLabel: '嫌疑',
        description: '黑暗已经不再陌生。',
    },
    {
        type: ReputationType.INNOCENCE,
        min: 1, max: 19,
        tierLabel: '罪犯',
        description: '你已经分不清哪些是你不愿做的事了。',
    },
];

/**
 * Get the narrative anchor for a given reputation axis and value.
 * Returns undefined if value is 0 or below (game over state).
 */
export function getNarrativeAnchor(type: ReputationType, value: number): NarrativeAnchor | undefined {
    return NARRATIVE_ANCHORS.find(
        a => a.type === type && value >= a.min && value <= a.max
    );
}
