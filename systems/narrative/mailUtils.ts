
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
