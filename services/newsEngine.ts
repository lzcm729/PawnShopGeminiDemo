

import { GameState, NewsItem, ActiveNewsInstance, MarketModifier, NewsCategory } from '../types';
import { ALL_NEWS_DATA } from './newsData';

const checkNewsCondition = (condition: any, state: GameState): boolean => {
    let currentVal = 0;
    const variablePath = condition.variable.split('.'); 

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
            return false;
        }
    }

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
    const persistedNews: ActiveNewsInstance[] = dailyNews
        .map(n => ({ ...n, daysRemaining: n.daysRemaining - 1 }))
        .filter(n => n.daysRemaining > 0);

    // 2. Collect New Candidates
    const potentialNews = ALL_NEWS_DATA.filter(template => {
        if (persistedNews.some(p => p.id === template.id)) return false;
        return template.triggers.every(cond => checkNewsCondition(cond, state));
    });

    // 3. Categorized Selection (Guaranteed Representation)
    // We want a daily paper of roughly 4-5 items total.
    
    const narratives = potentialNews.filter(n => n.category === NewsCategory.NARRATIVE).sort((a,b) => b.priority - a.priority);
    const markets = potentialNews.filter(n => n.category === NewsCategory.MARKET).sort((a,b) => b.priority - a.priority);
    const flavors = potentialNews.filter(n => n.category === NewsCategory.FLAVOR).sort((a,b) => b.priority - a.priority);

    const selectedNew: NewsItem[] = [];
    const MAX_NEW_SLOTS = 4; // Add up to 4 new items per day

    // SLOT 1 & 2: Top Narratives (Story progression is key)
    if (narratives.length > 0) selectedNew.push(narratives[0]);
    if (narratives.length > 1) selectedNew.push(narratives[1]);

    // SLOT 3: GUARANTEED MARKET INTEL (If available)
    if (markets.length > 0) {
        selectedNew.push(markets[0]);
    } else if (narratives.length > 2) {
        // Fallback to 3rd narrative if no market news
        selectedNew.push(narratives[2]);
    }

    // SLOT 4: FLAVOR / EXTRA MARKET
    // If we have room, add flavor or another market
    if (selectedNew.length < MAX_NEW_SLOTS) {
        // Prefer a 2nd Market item if available
        if (markets.length > 1) {
            selectedNew.push(markets[1]);
        } else if (flavors.length > 0) {
            selectedNew.push(flavors[0]);
        }
    }

    // 4. Convert to Active Instances
    const newInstances: ActiveNewsInstance[] = selectedNew.map(n => ({
        ...n,
        daysRemaining: n.duration
    }));

    // 5. Merge
    const allActive = [...persistedNews, ...newInstances];
    
    // 6. Extract Modifiers from ALL active news
    const modifiers: MarketModifier[] = allActive
        .filter(n => n.effect !== undefined)
        .map(n => n.effect!);

    return {
        news: allActive,
        modifiers
    };
};