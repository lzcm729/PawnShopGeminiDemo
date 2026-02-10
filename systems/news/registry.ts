
import { NewsItem, NewsCategory, NewsEffect, MarketModifier } from './types';
import { TriggerCondition } from '../narrative/types';
import { parseCSV, CSVSchema, stringCol, numberCol, listCol } from '../utils/csvReader';
import newsCsv from '@/assets/data/texts/news_content.csv?raw';

// ============================================================================
// CSV Schema
// ============================================================================

interface NewsRow {
    id: string;
    headline: string;
    body: string;
    category: string;
    priority: number;
    duration: number;
    sourceLabel: string;
    tags: string[];
    effects: string;
    triggers: string;
    relatedChainId: string;
    triggerMailId: string;
    effectCategoryTarget: string;
    effectPriceMultiplier: number;
    effectRiskModifier: number;
    effectActionPointsModifier: number;
}

const NEWS_SCHEMA: CSVSchema = {
    'id': stringCol('id'),
    'headline': stringCol('headline'),
    'body': stringCol('body'),
    'category': stringCol('category'),
    'priority': numberCol('priority'),
    'duration': numberCol('duration'),
    'sourceLabel': stringCol('sourceLabel'),
    'tags': listCol('tags', ';'),
    'effects': stringCol('effects'),
    'triggers': stringCol('triggers'),
    'relatedChainId': stringCol('relatedChainId'),
    'triggerMailId': stringCol('triggerMailId'),
    'effectCategoryTarget': stringCol('effectCategoryTarget'),
    'effectPriceMultiplier': numberCol('effectPriceMultiplier', 0),
    'effectRiskModifier': numberCol('effectRiskModifier', 0),
    'effectActionPointsModifier': numberCol('effectActionPointsModifier', 0),
};

// ============================================================================
// Parsing Helpers
// ============================================================================

/** Parse a single effect entry: "targetSystem|parameter|modifier|modifierType|duration" */
function parseEffect(s: string): NewsEffect | null {
    const parts = s.split('|');
    if (parts.length < 5) return null;
    return {
        targetSystem: parts[0],
        parameter: parts[1],
        modifier: parseFloat(parts[2]),
        modifierType: parts[3] as 'ABSOLUTE' | 'PERCENTAGE',
        duration: parseInt(parts[4], 10),
    };
}

/** Parse effects column: semicolon-separated effect entries */
function parseEffects(raw: string): NewsEffect[] {
    if (!raw) return [];
    return raw.split(';').map(s => parseEffect(s.trim())).filter((e): e is NewsEffect => e !== null);
}

/**
 * Parse a single trigger condition string.
 * Formats: "variable==value", "variable>=value", "variable%value", etc.
 */
function parseTrigger(s: string): TriggerCondition | null {
    const operators: Array<TriggerCondition['operator']> = ['>=', '<=', '==', '>', '<', '%'];
    for (const op of operators) {
        const idx = s.indexOf(op);
        if (idx > 0) {
            return {
                variable: s.slice(0, idx),
                operator: op,
                value: parseFloat(s.slice(idx + op.length)),
            };
        }
    }
    return null;
}

/** Parse triggers column: semicolon-separated trigger conditions */
function parseTriggers(raw: string): TriggerCondition[] {
    if (!raw) return [];
    return raw.split(';').map(s => parseTrigger(s.trim())).filter((t): t is TriggerCondition => t !== null);
}

/** Parse category string to NewsCategory enum */
function parseCategory(raw: string): NewsCategory {
    switch (raw) {
        case 'MARKET_INTEL': return NewsCategory.MARKET_INTEL;
        case 'FLAVOR': return NewsCategory.FLAVOR;
        case 'NARRATIVE_ECHO':
        default:
            return NewsCategory.NARRATIVE_ECHO;
    }
}

/** Build legacy MarketModifier from row fields (if any are set) */
function buildLegacyEffect(row: NewsRow): MarketModifier | undefined {
    const hasTarget = !!row.effectCategoryTarget;
    const hasMult = row.effectPriceMultiplier !== 0;
    const hasRisk = row.effectRiskModifier !== 0;
    const hasAP = row.effectActionPointsModifier !== 0;
    if (!hasTarget && !hasMult && !hasRisk && !hasAP) return undefined;

    const eff: MarketModifier = {};
    if (hasTarget) eff.categoryTarget = row.effectCategoryTarget;
    if (hasMult) eff.priceMultiplier = row.effectPriceMultiplier;
    if (hasRisk) eff.riskModifier = row.effectRiskModifier;
    if (hasAP) eff.actionPointsModifier = row.effectActionPointsModifier;
    return eff;
}

// ============================================================================
// Load and Build
// ============================================================================

function loadNewsData(): NewsItem[] {
    const rows = parseCSV<NewsRow>(newsCsv, NEWS_SCHEMA);
    return rows.map(row => {
        const item: NewsItem = {
            id: row.id,
            headline: row.headline,
            body: row.body,
            category: parseCategory(row.category),
            priority: row.priority,
            duration: row.duration,
            sourceLabel: row.sourceLabel,
            tags: row.tags,
            effects: parseEffects(row.effects),
            triggers: parseTriggers(row.triggers),
        };

        if (row.relatedChainId) item.relatedChainId = row.relatedChainId;
        if (row.triggerMailId) item.triggerMailId = row.triggerMailId;

        const legacyEffect = buildLegacyEffect(row);
        if (legacyEffect) item.effect = legacyEffect;

        return item;
    });
}

export const ALL_NEWS_DATA: NewsItem[] = loadNewsData();

/** Get violation consequence news template by severity */
export function getViolationNewsTemplate(severity: 'LOW' | 'MEDIUM' | 'HIGH'): NewsItem | undefined {
    const idMap = { LOW: 'news_violation_low', MEDIUM: 'news_violation_medium', HIGH: 'news_violation_high' };
    return ALL_NEWS_DATA.find(n => n.id === idMap[severity]);
}
