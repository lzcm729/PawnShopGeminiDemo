
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
    
    for (const key in context) {
        const placeholder = `{{${key}}}`;
        const value = context[key] !== undefined ? String(context[key]) : '???';
        result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    if (context.recentNews) {
        result = result.replace(/{{recent_news.headline}}/g, context.recentNews.headline);
    }

    if (!context.itemName) result = result.replace(/{{itemName}}/g, "那件物品");
    if (!context.amount) result = result.replace(/{{amount}}/g, "钱");
    if (!context.recentNews) result = result.replace(/{{recent_news.headline}}/g, "最近的新闻");
    
    return result;
};
