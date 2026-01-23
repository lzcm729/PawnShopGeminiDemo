
import { GameState, NewsItem, ActiveNewsInstance, MarketModifier, NewsCategory } from '../../types';
import { ALL_NEWS_DATA } from './registry';

const checkNewsCondition = (condition: any, state: GameState): boolean => {
    let currentVal = 0;
    const variablePath = condition.variable.split('.'); 

    if (variablePath[0] === 'day') currentVal = state.stats.day;
    else if (variablePath[0] === 'cash') currentVal = state.stats.cash;
    else if (variablePath[0] === 'reputation') {
        const type = variablePath[1] as any;
        if (state.reputation[type] !== undefined) currentVal = state.reputation[type];
    }
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

    if (condition.operator === '%') return currentVal % condition.value === 0;

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

export const generateDailyNews = (state: GameState): { news: ActiveNewsInstance[], modifiers: MarketModifier[], scheduledMails: string[] } => {
    const { dailyNews, violationFlags } = state;

    const persistedNews: ActiveNewsInstance[] = dailyNews
        .map(n => ({ ...n, daysRemaining: n.daysRemaining - 1 }))
        .filter(n => n.daysRemaining > 0);

    const potentialNews = ALL_NEWS_DATA.filter(template => {
        if (persistedNews.some(p => p.id === template.id)) return false;
        return template.triggers.every(cond => checkNewsCondition(cond, state));
    });

    const narratives = potentialNews.filter(n => n.category === NewsCategory.NARRATIVE).sort((a,b) => b.priority - a.priority);
    const markets = potentialNews.filter(n => n.category === NewsCategory.MARKET).sort((a,b) => b.priority - a.priority);
    const flavors = potentialNews.filter(n => n.category === NewsCategory.FLAVOR).sort((a,b) => b.priority - a.priority);

    const selectedNew: NewsItem[] = [];
    const MAX_NEW_SLOTS = 4; 

    if (narratives.length > 0) selectedNew.push(narratives[0]);
    if (narratives.length > 1) selectedNew.push(narratives[1]);

    if (markets.length > 0) {
        selectedNew.push(markets[0]);
    } else if (narratives.length > 2) {
        selectedNew.push(narratives[2]);
    }

    if (selectedNew.length < MAX_NEW_SLOTS) {
        if (markets.length > 1) selectedNew.push(markets[1]);
        else if (flavors.length > 0) selectedNew.push(flavors[0]);
    }

    const newInstances: ActiveNewsInstance[] = selectedNew.map(n => ({ ...n, daysRemaining: n.duration }));

    if (violationFlags.includes('police_risk_ignored')) {
        const consequence = ALL_NEWS_DATA.find(n => n.id === 'news_consequence_police_investigation');
        if (consequence && !persistedNews.some(p => p.id === consequence.id) && !newInstances.some(n => n.id === consequence.id)) {
             newInstances.push({ ...consequence, daysRemaining: consequence.duration });
        }
    }

    const allActive = [...persistedNews, ...newInstances];
    const modifiers: MarketModifier[] = allActive.filter(n => n.effect !== undefined).map(n => n.effect!);
    const scheduledMails: string[] = [];
    newInstances.forEach(n => { if (n.triggerMailId) scheduledMails.push(n.triggerMailId); });

    return { news: allActive, modifiers, scheduledMails };
};
