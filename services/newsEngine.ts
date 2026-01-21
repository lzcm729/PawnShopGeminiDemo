
import { GameState, NewsItem, ActiveNewsInstance, MarketModifier, EventChainState } from '../types';
import { ALL_NEWS_DATA } from './newsData';

// Re-implement basic check logic to avoid circular dependency with chainEngine if possible,
// or just import carefully. We need to check conditions against GameState AND ChainState.
const checkNewsCondition = (condition: any, state: GameState): boolean => {
    let currentVal = 0;
    const variablePath = condition.variable.split('.'); // e.g. "chain_emma.stage" or "day" or "reputation.Humanity"

    // 1. Global Stats
    if (variablePath[0] === 'day') currentVal = state.stats.day;
    else if (variablePath[0] === 'cash') currentVal = state.stats.cash;
    
    // 2. Reputation
    else if (variablePath[0] === 'reputation') {
        const type = variablePath[1] as any;
        if (state.reputation[type] !== undefined) currentVal = state.reputation[type];
    }
    
    // 3. Chain Variables
    else if (variablePath[0].startsWith('chain_')) {
        const chainId = variablePath[0];
        const varName = variablePath[1];
        const chain = state.activeChains.find(c => c.id === chainId);
        
        if (chain) {
            if (varName === 'stage') currentVal = chain.stage;
            else if (chain.variables && varName in chain.variables) currentVal = chain.variables[varName];
        } else {
            return false; // Chain not found
        }
    }

    // modulo operator support for periodic events
    if (condition.operator === '%') {
        return currentVal % condition.value === 0;
    }

    const targetVal = condition.value;
    switch (condition.operator) {
        case '>': return currentVal > targetVal;
        case '<': return currentVal < targetVal;
        case '>=': return currentVal >= targetVal;
        case '<=': return currentVal <= targetVal;
        case '==': return currentVal === targetVal;
        default: return false;
    }
};

export const generateDailyNews = (state: GameState): { news: ActiveNewsInstance[], modifiers: MarketModifier[] } => {
    const { dailyNews } = state;

    // 1. Process Existing News (Persistence)
    // Filter out expired news, decrement duration
    const persistedNews: ActiveNewsInstance[] = dailyNews
        .map(n => ({ ...n, daysRemaining: n.daysRemaining - 1 }))
        .filter(n => n.daysRemaining > 0);

    // 2. Collect New Triggers
    const potentialNews = ALL_NEWS_DATA.filter(template => {
        // Prevent duplicates: Don't trigger if already in persisted news
        if (persistedNews.some(p => p.id === template.id)) return false;

        // Check Logic
        return template.triggers.every(cond => checkNewsCondition(cond, state));
    });

    // 3. Convert to Active Instances
    const newInstances: ActiveNewsInstance[] = potentialNews.map(n => ({
        ...n,
        daysRemaining: n.duration
    }));

    // 4. Merge & Sort
    const allActive = [...persistedNews, ...newInstances];
    
    // Sort by Priority DESC, then randomly shuffle same-priority for variety
    allActive.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return Math.random() - 0.5;
    });

    // 5. Cap (Max 4 items to fit UI)
    const finalNews = allActive.slice(0, 4);

    // 6. Extract Modifiers
    const modifiers: MarketModifier[] = finalNews
        .filter(n => n.effect !== undefined)
        .map(n => n.effect!);

    return {
        news: finalNews,
        modifiers
    };
};
