import { MailDelay, MailTemplate, MailAttachment } from './types';

export interface InterpolationContext {
    itemName?: string;
    amount?: number;
    playerName?: string;
    dayCount?: number;
    recentNews?: {
        headline: string;
        body: string;
    };
    [key: string]: any;
}

const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
};

export const interpolateMailBody = (templateBody: string, context: InterpolationContext = {}): string => {
    let result = templateBody;
    
    // Default replacements
    const safeContext = {
        itemName: "那件物品",
        amount: 0,
        playerName: "老板",
        npcName: "顾客",
        daysPassed: 0,
        ...context
    };

    // Replace strict double curly braces
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (key === 'amount' && typeof safeContext.amount === 'number') {
            return formatCurrency(safeContext.amount);
        }
        if (key === 'recent_news.headline' && safeContext.recentNews) {
            return safeContext.recentNews.headline;
        }
        return safeContext[key] !== undefined ? String(safeContext[key]) : match;
    });
    
    return result;
};

/**
 * Resolve a MailDelay level to a concrete number of delay days.
 * Adds randomness so delivery timing is not perfectly predictable.
 *
 * - immediate: 0 days (arrives same night)
 * - standard: 2-3 days (default)
 * - slow: 5-7 days
 * - surprise: 10-15 days
 */
export const resolveMailDelay = (level: MailDelay = 'standard'): number => {
    switch (level) {
        case 'immediate': return 0;
        case 'standard': return 2 + Math.floor(Math.random() * 2); // 2-3
        case 'slow': return 5 + Math.floor(Math.random() * 3); // 5-7
        case 'surprise': return 10 + Math.floor(Math.random() * 6); // 10-15
    }
};

/** Non-monetary reward types for善行 mails */
export type NonMonetaryRewardType = 'REFERRAL' | 'INTEL' | 'NPC_HELP';

/**
 * Resolve the actual reward for a mail template.
 * For system-generated善行 reward mails (those with cashRange), applies the
 * 30-40% probability rule. DSL-authored mails with explicit cash amounts
 * are passed through unchanged.
 */
export const resolveMailReward = (template: MailTemplate): MailAttachment | undefined => {
    if (!template.attachments) return undefined;

    // DSL-authored mails with explicit cash: pass through unchanged
    if (template.attachments.cash !== undefined && template.attachments.cash > 0) {
        return template.attachments;
    }

    // System mails with cashRange: apply probabilistic reward
    if (template.attachments.cashRange) {
        const { min, max } = template.attachments.cashRange;
        const rewardChance = 0.3 + Math.random() * 0.1; // 30-40%
        if (Math.random() < rewardChance) {
            return { cash: min + Math.floor(Math.random() * (max - min + 1)) };
        }
        // No cash reward — may still have non-monetary reward
        if (template.attachments.rewardType) {
            return { rewardType: template.attachments.rewardType };
        }
        return undefined;
    }

    // Items or other attachments: pass through
    return template.attachments;
};
