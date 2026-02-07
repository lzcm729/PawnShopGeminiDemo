/**
 * Daily Challenge System
 *
 * Design Reference: 填充事件系统 Section 11.3 (每日挑战)
 *
 * Provides optional daily goals with small rewards to combat mid-game
 * repetition fatigue (Day 10-20). Challenges guide players to try
 * different strategies and add short-term goal variety.
 */

import { ReputationType } from '../core/types';

// ============================================================================
// TYPES
// ============================================================================

export type ChallengeType =
    | 'PROFIT_TARGET'      // 利润目标
    | 'ZERO_MISTAKE'       // 零打眼
    | 'ACTIVE_REJECT'      // 主动拒绝
    | 'EFFICIENT_OPS'      // 高效运营
    | 'RISK_CHALLENGE';    // 风险挑战

export interface ChallengeReward {
    cash?: number;
    reputation?: { axis: string; amount: number };
}

export interface DailyChallenge {
    type: ChallengeType;
    title: string;           // Short display title
    description: string;     // Completion condition description
    reward: ChallengeReward;
    isCompleted: boolean;
}

// ============================================================================
// CHALLENGE POOL (Design doc Section 11.3)
// ============================================================================

interface ChallengeTemplate {
    type: ChallengeType;
    title: string;
    description: string;
    reward: ChallengeReward;
}

const CHALLENGE_POOL: ChallengeTemplate[] = [
    {
        type: 'PROFIT_TARGET',
        title: '今日利润目标',
        description: '今天总利润超过 $500',
        reward: { cash: 50 }
    },
    {
        type: 'ZERO_MISTAKE',
        title: '零失误',
        description: '今天不打眼（绝当揭晓不计入当日）',
        reward: { reputation: { axis: ReputationType.CREDIBILITY, amount: 1 } }
    },
    {
        type: 'ACTIVE_REJECT',
        title: '有所取舍',
        description: '今天拒绝至少一个客户',
        reward: { cash: 30 }
    },
    {
        type: 'EFFICIENT_OPS',
        title: '高效经营',
        description: '今天在 3 个 AP 内完成所有交易',
        reward: { reputation: { axis: ReputationType.CREDIBILITY, amount: 1 } }
    },
    {
        type: 'RISK_CHALLENGE',
        title: '冒险家',
        description: '今天收一件高风险物品',
        reward: { cash: 80 }
    }
];

// ============================================================================
// GENERATION
// ============================================================================

/** Probability of having a daily challenge (80% per design doc) */
const CHALLENGE_PROBABILITY = 0.80;

/**
 * Generate a daily challenge for the morning briefing.
 * 80% chance of getting a challenge, 20% no challenge today.
 */
export function generateDailyChallenge(): DailyChallenge | null {
    if (Math.random() > CHALLENGE_PROBABILITY) {
        return null;
    }

    const template = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];

    return {
        type: template.type,
        title: template.title,
        description: template.description,
        reward: { ...template.reward },
        isCompleted: false
    };
}

// ============================================================================
// COMPLETION CHECKING
// ============================================================================

export interface DayChallengeContext {
    totalProfit: number;        // Net profit from all transactions today
    hadMistake: boolean;        // Whether any "打眼" occurred today
    rejectedCustomers: number;  // Number of customers sent away
    apUsed: number;             // Total AP consumed today
    hadHighRiskItem: boolean;   // Whether player accepted a high-risk item
}

/**
 * Check if a daily challenge has been completed based on today's activity.
 */
export function checkChallengeCompletion(
    challenge: DailyChallenge,
    context: DayChallengeContext
): boolean {
    switch (challenge.type) {
        case 'PROFIT_TARGET':
            return context.totalProfit >= 500;
        case 'ZERO_MISTAKE':
            return !context.hadMistake;
        case 'ACTIVE_REJECT':
            return context.rejectedCustomers >= 1;
        case 'EFFICIENT_OPS':
            return context.apUsed <= 3;
        case 'RISK_CHALLENGE':
            return context.hadHighRiskItem;
        default:
            return false;
    }
}
