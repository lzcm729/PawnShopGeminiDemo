
import { GameState } from '../game/types';
import {
    NewsItem, ActiveNewsInstance, MarketModifier, NewsCategory, NewsEffect,
    PendingNewsItem, ViolationSeverity, ExternalChainTrigger, DailyNewsResult
} from './types';
import { ConsequenceSeverity, CHANNEL_ALLOCATION_MATRIX } from '../narrative/channelProtocol';
import { ALL_NEWS_DATA, getViolationNewsTemplate } from './registry';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// Condition Checking (unchanged from v1.0)
// ============================================================================

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

// ============================================================================
// S3-F3: Input Interfaces (other systems → news)
// ============================================================================

/**
 * S3-F3 + S3-F6: Trigger a narrative echo news item from event chain results.
 * Applies channel protocol (S3-F6): severity determines whether news is generated.
 */
export function triggerNarrativeEcho(
    chainId: string,
    severity: ConsequenceSeverity,
    delayDays: number,
    currentDay: number
): PendingNewsItem | null {
    // S3-F6: Channel protocol — severity determines if news is generated
    const allocation = CHANNEL_ALLOCATION_MATRIX.find(a => a.severity === severity);
    if (!allocation) return null;

    const hasNewsPrimary = allocation.primaryChannels.includes('NEWS');
    const hasNewsSecondary = allocation.secondaryChannels.includes('NEWS');

    if (!hasNewsPrimary && !hasNewsSecondary) {
        // MINOR severity: no news
        return null;
    }

    if (!hasNewsPrimary && hasNewsSecondary) {
        // MODERATE severity: optional, 50% chance
        if (Math.random() > 0.5) return null;
    }

    // S3-F6: Negative events 80% chance, positive events 40% chance
    // We treat SEVERE/EXTREME as "negative" by default
    const isNegative = severity === 'SEVERE' || severity === 'EXTREME';
    const genChance = isNegative ? 0.8 : 0.4;
    if (Math.random() > genChance) return null;

    const displayDay = currentDay + Math.max(1, delayDays);
    const isExtreme = severity === 'EXTREME';

    return {
        headline: isExtreme ? `紧急通报：第12区发生重大事件` : `社会观察：第12区近期异动`,
        body: isExtreme
            ? `据多方消息证实，第12区近日发生了一起引人关注的事件。当局已介入调查。更多详情待确认。`
            : `有市民反映，第12区近期出现了一些值得关注的变化。相关情况仍在了解中。`,
        category: NewsCategory.NARRATIVE_ECHO,
        priority: isExtreme ? 100 : 80,
        sourceLabel: isExtreme ? '[紧急通报]' : '[社会观察]',
        tags: [chainId, severity.toLowerCase()],
        effects: [],
        relatedChainId: chainId,
        displayDay,
        duration: isExtreme ? 2 : 1
    };
}

/**
 * S3-F3: Trigger market intelligence news from world events.
 */
export function triggerMarketIntel(
    eventType: string,
    effects: NewsEffect[],
    duration: number,
    currentDay: number
): PendingNewsItem {
    return {
        headline: `市场快讯：${eventType}`,
        body: `市场消息人士透露，${eventType}可能对近期交易产生影响。请商家密切关注。`,
        category: NewsCategory.MARKET_INTEL,
        priority: 50,
        sourceLabel: '[市场快讯]',
        tags: ['market', eventType.toLowerCase()],
        effects,
        displayDay: currentDay + 1,
        duration
    };
}

/**
 * S3-F3: Trigger expiry reminder news.
 */
export function triggerExpiryReminder(
    itemCount: number,
    currentDay: number
): PendingNewsItem {
    return {
        headline: `库存提醒：${itemCount}件物品即将到期`,
        body: `您的库存中有${itemCount}件典当物品即将到达赎回期限。请及时处理以避免纠纷。`,
        category: NewsCategory.MARKET_INTEL,
        priority: 55,
        sourceLabel: '[库存提醒]',
        tags: ['expiry', 'reminder'],
        effects: [],
        displayDay: currentDay + 1,
        duration: 1
    };
}

// ============================================================================
// S3-F3: Output Interfaces (news → other systems)
// ============================================================================

/**
 * S3-F1/F3: Get all active modifiers from current news effects.
 * Returns v1.2 NewsEffect[] for systems that support it.
 */
export function getActiveModifiers(activeNews: ActiveNewsInstance[]): NewsEffect[] {
    return activeNews.flatMap(n => n.effects || []);
}

/**
 * S3-F3: Get all tags from current day's news.
 */
export function getCurrentNewsTags(activeNews: ActiveNewsInstance[]): string[] {
    return [...new Set(activeNews.flatMap(n => n.tags || []))];
}

/**
 * S3-F3: Get calendar markers from active news (multi-day events).
 */
export function getNewsMarkers(activeNews: ActiveNewsInstance[]): { day: number; label: string }[] {
    return activeNews
        .filter(n => n.expiresDay !== undefined)
        .map(n => ({ day: n.expiresDay!, label: n.sourceLabel }));
}

// ============================================================================
// S3-F5: External Chain Trigger
// ============================================================================

/**
 * S3-F5: Create an external chain trigger signal.
 * News system emits this; event chain system (S4) consumes it.
 */
export function createTransientChainTrigger(
    newsId: string,
    penaltyType: ViolationSeverity,
    severity: ConsequenceSeverity,
    sourceDay: number
): ExternalChainTrigger {
    return {
        type: 'NEWS_VERIFICATION_PENALTY',
        payload: { newsId, penaltyType, severity, sourceDay }
    };
}

// ============================================================================
// S3-F4: Violation Detection & Probabilistic Verification
// ============================================================================

/** Map violation flags to severity levels */
function classifyViolation(flag: string): ViolationSeverity {
    if (flag === 'police_risk_ignored' || flag.startsWith('multiple_stolen')) return 'HIGH';
    if (flag === 'stolen_valuable' || flag.startsWith('stolen_')) return 'MEDIUM';
    return 'LOW';
}

/** Map ViolationSeverity to ConsequenceSeverity for chain triggers */
function violationToConsequence(vs: ViolationSeverity): ConsequenceSeverity {
    switch (vs) {
        case 'HIGH': return 'SEVERE';
        case 'MEDIUM': return 'MODERATE';
        case 'LOW': return 'MINOR';
    }
}

/**
 * S3-F4: Process violations with probabilistic detection.
 * Returns pending news items and external chain triggers.
 */
function processViolations(
    violationFlags: string[],
    currentDay: number,
    existingPending: PendingNewsItem[]
): { pendingNews: PendingNewsItem[]; triggers: ExternalChainTrigger[] } {
    const pendingNews: PendingNewsItem[] = [];
    const triggers: ExternalChainTrigger[] = [];

    for (const flag of violationFlags) {
        const severity = classifyViolation(flag);

        // S3-F4: Detection probability from config
        const detectionChance = GAME_CONFIG.NEWS.VIOLATION_DETECTION_MIN + Math.random() * GAME_CONFIG.NEWS.VIOLATION_DETECTION_RANGE;
        if (Math.random() > detectionChance) continue;

        // S3-F4: Delay 1-3 days
        const delayDays = Math.floor(Math.random() * 3) + 1;
        const displayDay = currentDay + delayDays;

        // Check if already have a pending violation news for this display day
        const alreadyHas = existingPending.some(p =>
            p.tags.includes('violation') && p.displayDay === displayDay
        ) || pendingNews.some(p =>
            p.tags.includes('violation') && p.displayDay === displayDay
        );
        if (alreadyHas) continue;

        const template = getViolationNewsTemplate(severity);
        if (!template) continue;

        pendingNews.push({
            headline: template.headline,
            body: template.body,
            category: template.category,
            priority: template.priority,
            sourceLabel: template.sourceLabel,
            tags: [...template.tags, 'violation_consequence'],
            effects: template.effects,
            displayDay,
            duration: template.duration
        });

        // S3-F5: Emit trigger signal instead of directly modifying reputation
        const consequenceSeverity = violationToConsequence(severity);
        const newsId = `news_violation_${severity.toLowerCase()}_day${currentDay}`;
        triggers.push(createTransientChainTrigger(newsId, severity, consequenceSeverity, currentDay));
    }

    return { pendingNews, triggers };
}

// ============================================================================
// S3-F2: Priority Algorithm with Guaranteed Slots
// ============================================================================

const MAX_DISPLAY_SLOTS = GAME_CONFIG.NEWS.MAX_DISPLAY_SLOTS;
const MAX_NARRATIVE_SLOTS = GAME_CONFIG.NEWS.MAX_NARRATIVE_SLOTS;

/**
 * S3-F2: Select news for display following priority algorithm.
 * Returns selected news and any deferred (overflow) news.
 */
function selectNewsForDisplay(
    candidates: NewsItem[],
    currentDay: number
): { selected: NewsItem[]; deferred: PendingNewsItem[] } {
    // Step 1: Sort all candidates by priority descending
    const sorted = [...candidates].sort((a, b) => b.priority - a.priority);

    const narratives = sorted.filter(n => n.category === NewsCategory.NARRATIVE_ECHO);
    const markets = sorted.filter(n => n.category === NewsCategory.MARKET_INTEL);
    const flavors = sorted.filter(n => n.category === NewsCategory.FLAVOR);

    const selected: NewsItem[] = [];
    const deferred: PendingNewsItem[] = [];

    // Step 2: Pick top candidates respecting NARRATIVE cap
    const pickedNarratives: NewsItem[] = [];
    const pickedMarkets: NewsItem[] = [];
    const pickedFlavors: NewsItem[] = [];

    for (const n of narratives) {
        if (pickedNarratives.length < MAX_NARRATIVE_SLOTS) {
            pickedNarratives.push(n);
        } else {
            // S3-F2: Overflow narratives deferred to next day
            deferred.push({
                headline: n.headline,
                body: n.body,
                category: n.category,
                priority: n.priority,
                sourceLabel: n.sourceLabel,
                tags: n.tags,
                effects: n.effects,
                relatedChainId: n.relatedChainId,
                displayDay: currentDay + 1,
                duration: n.duration,
                triggerMailId: n.triggerMailId
            });
        }
    }

    // Combine all eligible picks by priority
    const allPicks = [
        ...pickedNarratives.map(n => ({ item: n, cat: 'narrative' as const })),
        ...markets.map(n => ({ item: n, cat: 'market' as const })),
        ...flavors.map(n => ({ item: n, cat: 'flavor' as const }))
    ].sort((a, b) => b.item.priority - a.item.priority);

    // Step 3: Fill slots with priority, respecting constraints
    for (const pick of allPicks) {
        if (selected.length >= MAX_DISPLAY_SLOTS) break;
        selected.push(pick.item);
    }

    // Step 4: Guarantee at least 1 MARKET_INTEL (保底规则)
    const hasMarket = selected.some(n => n.category === NewsCategory.MARKET_INTEL);
    if (!hasMarket && markets.length > 0) {
        // Replace lowest priority item in selected with highest priority market
        if (selected.length >= MAX_DISPLAY_SLOTS) {
            // Replace last slot (lowest priority among selected)
            const lastIdx = selected.length - 1;
            // Defer the replaced item if it's narrative
            const replaced = selected[lastIdx];
            if (replaced.category === NewsCategory.NARRATIVE_ECHO) {
                deferred.push({
                    headline: replaced.headline,
                    body: replaced.body,
                    category: replaced.category,
                    priority: replaced.priority,
                    sourceLabel: replaced.sourceLabel,
                    tags: replaced.tags,
                    effects: replaced.effects,
                    relatedChainId: replaced.relatedChainId,
                    displayDay: currentDay + 1,
                    duration: replaced.duration,
                    triggerMailId: replaced.triggerMailId
                });
            }
            selected[lastIdx] = markets[0];
        } else {
            selected.push(markets[0]);
        }
    }

    return { selected, deferred };
}

// ============================================================================
// Main: generateDailyNews (S3-F1~F6 integrated)
// ============================================================================

export const generateDailyNews = (state: GameState): DailyNewsResult => {
    const currentDay = state.stats.day;
    const { violationFlags } = state;

    // 1. Persist existing news, decrement remaining days
    const persistedNews: ActiveNewsInstance[] = (state.dailyNews || [])
        .map(n => ({ ...n, daysRemaining: n.daysRemaining - 1 }))
        .filter(n => n.daysRemaining > 0);

    // 2. Materialize pending news that should display today
    const pendingToday: NewsItem[] = (state.pendingNews || [])
        .filter(p => p.displayDay <= currentDay)
        .map((p, idx) => ({
            id: `news-${currentDay}-pending-${idx}`,
            ...p,
            triggers: []
        }));

    // 3. Remaining pending (not yet ready)
    const remainingPending: PendingNewsItem[] = (state.pendingNews || [])
        .filter(p => p.displayDay > currentDay);

    // 4. Find eligible registry news (condition-based)
    const potentialNews = ALL_NEWS_DATA.filter(template => {
        // Skip if already active
        if (persistedNews.some(p => p.id === template.id)) return false;
        // Skip violation templates (they're triggered dynamically)
        if (template.id.startsWith('news_violation_')) return false;
        // Check all trigger conditions
        if (template.triggers.length === 0) return false;
        return template.triggers.every(cond => checkNewsCondition(cond, state));
    });

    // 5. Combine pending-today + registry candidates
    const allCandidates = [...pendingToday, ...potentialNews];

    // 6. S3-F2: Select with priority algorithm
    const { selected, deferred: overflowDeferred } = selectNewsForDisplay(allCandidates, currentDay);

    // 7. Convert selected to ActiveNewsInstance
    const newInstances: ActiveNewsInstance[] = selected.map((n, idx) => ({
        ...n,
        id: n.id || `news-${currentDay}-${idx}`,
        daysRemaining: n.duration,
        generatedDay: currentDay
    }));

    // 8. S3-F4: Process violations (probabilistic detection)
    const { pendingNews: violationPending, triggers: violationTriggers } =
        processViolations(violationFlags, currentDay, remainingPending);

    // 9. Combine all active news
    const allActive = [...persistedNews, ...newInstances];

    // 10. Legacy modifiers (backward compat with MarketModifier)
    const modifiers: MarketModifier[] = allActive
        .filter(n => n.effect !== undefined)
        .map(n => n.effect!);

    // 11. Scheduled mails from new instances
    const scheduledMails: string[] = [];
    newInstances.forEach(n => {
        if (n.triggerMailId) scheduledMails.push(n.triggerMailId);
    });

    // 12. Combine deferred news
    const allDeferred = [...remainingPending, ...overflowDeferred, ...violationPending];

    return {
        news: allActive,
        modifiers,
        scheduledMails,
        externalTriggers: violationTriggers,
        deferredNews: allDeferred
    };
};
