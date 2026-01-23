
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

export const interpolateMailBody = (templateBody: string, context: InterpolationContext = {}): string => {
    let result = templateBody;
    
    // Replace {{variable}} with context values
    for (const key in context) {
        const placeholder = `{{${key}}}`;
        const value = context[key] !== undefined ? String(context[key]) : '???';
        result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Handle nested news objects (simple implementation)
    if (context.recentNews) {
        result = result.replace(/{{recent_news.headline}}/g, context.recentNews.headline);
    }

    // Fallback for known common placeholders if missing in context to prevent ugly braces
    // This handles cases where metadata might be incomplete
    if (!context.itemName) result = result.replace(/{{itemName}}/g, "那件物品");
    if (!context.amount) result = result.replace(/{{amount}}/g, "钱");
    if (!context.recentNews) result = result.replace(/{{recent_news.headline}}/g, "最近的新闻");
    
    return result;
};