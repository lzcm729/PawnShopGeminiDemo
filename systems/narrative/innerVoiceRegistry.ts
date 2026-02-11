
import { GameState } from '../game/types';
import { SatisfactionLevel, DepartureSatisfaction, RedeemSatisfaction, RenewalSatisfaction, PostForfeitSatisfaction } from './types';
import { parseCSV, CSVSchema, stringCol, numberCol } from '../utils/csvReader';
import departureTextsCSV from '@/assets/data/texts/departure_texts.csv?raw';

export interface InnerVoice {
    id: string;
    text: string;
    priority: number;
    condition: (state: GameState) => boolean;
}

// ============================================================================
// CSV Loading
// ============================================================================

interface DepartureTextRow {
    category: string;
    key: string;
    text: string;
    priority: number;
    condition: string;
}

const DEPARTURE_TEXT_SCHEMA: CSVSchema = {
    'category': stringCol('category'),
    'key': stringCol('key'),
    'text': stringCol('text'),
    'priority': numberCol('priority', 0),
    'condition': stringCol('condition', ''),
};

/** Parsed departure texts, lazily initialized */
let _bedtimeTexts: Map<string, { text: string; priority: number }> | null = null;
let _departureThoughts: Record<string, string[]> | null = null;
let _sceneThoughts: {
    REDEEM: Record<string, string[]>;
    RENEWAL: Record<string, string[]>;
    POST_FORFEIT: Record<string, string[]>;
} | null = null;

function loadDepartureTexts(): void {
    if (_bedtimeTexts) return;

    _bedtimeTexts = new Map();
    _departureThoughts = {};
    _sceneThoughts = { REDEEM: {}, RENEWAL: {}, POST_FORFEIT: {} };

    const rows = parseCSV<DepartureTextRow>(departureTextsCSV, DEPARTURE_TEXT_SCHEMA, {
        warnUnknownColumns: false,
    });

    for (const row of rows) {
        if (!row.category || !row.text) continue;

        if (row.category === 'bedtime') {
            _bedtimeTexts.set(row.key, { text: row.text, priority: row.priority });
        } else if (row.category === 'departure') {
            if (!_departureThoughts[row.key]) {
                _departureThoughts[row.key] = [];
            }
            _departureThoughts[row.key].push(row.text);
        } else if (row.category === 'scene_redeem') {
            if (!_sceneThoughts.REDEEM[row.key]) {
                _sceneThoughts.REDEEM[row.key] = [];
            }
            _sceneThoughts.REDEEM[row.key].push(row.text);
        } else if (row.category === 'scene_renewal') {
            if (!_sceneThoughts.RENEWAL[row.key]) {
                _sceneThoughts.RENEWAL[row.key] = [];
            }
            _sceneThoughts.RENEWAL[row.key].push(row.text);
        } else if (row.category === 'scene_post_forfeit') {
            if (!_sceneThoughts.POST_FORFEIT[row.key]) {
                _sceneThoughts.POST_FORFEIT[row.key] = [];
            }
            _sceneThoughts.POST_FORFEIT[row.key].push(row.text);
        }
    }
}

function getBedtimeText(key: string): { text: string; priority: number } | undefined {
    loadDepartureTexts();
    return _bedtimeTexts!.get(key);
}

function getDepartureThoughtsMap(): Record<string, string[]> {
    loadDepartureTexts();
    return _departureThoughts!;
}

function getSceneThoughtsMap(): typeof _sceneThoughts {
    loadDepartureTexts();
    return _sceneThoughts!;
}

// ============================================================================
// Bedtime Thoughts (conditions stay in code, text from CSV)
// ============================================================================

/**
 * Bedtime condition registry: maps bedtime keys to their condition functions.
 * Text and priority come from CSV; conditions must remain in code (they reference GameState).
 */
const BEDTIME_CONDITIONS: Record<string, (state: GameState) => boolean> = {
    'broke_critical': (state) => state.stats.cash < 100,
    'mother_critical': (state) => state.stats.motherStatus.status === 'Critical' || state.stats.medicalBill.status === 'OVERDUE',
    'rich': (state) => state.stats.cash > 5000 && state.stats.cash < state.stats.targetSavings,
    'surviving': () => true,
    'guilt_high': (state) => state.lastSatisfaction === 'RESENTFUL' || state.lastSatisfaction === 'DESPERATE',
    'good_karma': (state) => state.lastSatisfaction === 'GRATEFUL',
    'police_risk': (state) => state.violationFlags.includes('police_risk_ignored'),
};

export function buildBedtimeThoughts(): InnerVoice[] {
    const thoughts: InnerVoice[] = [];
    for (const [key, conditionFn] of Object.entries(BEDTIME_CONDITIONS)) {
        const entry = getBedtimeText(key);
        if (entry) {
            thoughts.push({
                id: `bedtime_${key}`,
                text: entry.text,
                priority: entry.priority,
                condition: conditionFn,
            });
        }
    }
    return thoughts;
}

/** @deprecated Use buildBedtimeThoughts() for lazy CSV loading. Kept for backward compatibility. */
export const BEDTIME_THOUGHTS: InnerVoice[] = [];

// ============================================================================
// Departure Thoughts (all from CSV)
// ============================================================================

/** @deprecated Access via getDepartureThoughtsMap(). Kept for type compatibility. */
export const DEPARTURE_THOUGHTS: Record<SatisfactionLevel, string[]> = {
    'GRATEFUL': [],
    'NEUTRAL': [],
    'RESENTFUL': [],
    'DESPERATE': [],
    'CONFLICTED': [],
};

/** @deprecated Access via getSceneThoughtsMap(). Kept for type compatibility. */
export const SCENE_DEPARTURE_THOUGHTS: {
    REDEEM: Record<RedeemSatisfaction, string[]>;
    RENEWAL: Record<RenewalSatisfaction, string[]>;
    POST_FORFEIT: Record<PostForfeitSatisfaction, string[]>;
} = {
    REDEEM: { RELIEVED: [], GRATEFUL: [], BITTER: [], BITTERSWEET: [] },
    RENEWAL: { WEARY: [], ANXIOUS: [], NUMB: [], HOPEFUL: [] },
    POST_FORFEIT: { GRIEF: [], RESIGNED: [], HOSTILE: [], PLEADING: [] },
};

// ============================================================================
// Public API
// ============================================================================

export const getBedtimeMonologue = (state: GameState): string => {
    const thoughts = buildBedtimeThoughts();
    const candidates = thoughts.filter(t => t.condition(state));
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates.length > 0 ? candidates[0].text : "......";
};

/**
 * Get departure monologue text.
 * When departureSatisfaction is provided and scene-specific, uses scene-specific thoughts.
 * Otherwise falls back to base satisfaction thoughts.
 */
export const getDepartureMonologue = (
    satisfaction: SatisfactionLevel,
    departureSatisfaction?: DepartureSatisfaction | null
): string => {
    // Try scene-specific thoughts when available
    if (departureSatisfaction && departureSatisfaction.scene !== 'PAWN') {
        const sceneMap = getSceneThoughtsMap();
        if (sceneMap) {
            const sceneKey = departureSatisfaction.scene as keyof typeof sceneMap;
            const sceneThoughts = sceneMap[sceneKey];
            if (sceneThoughts) {
                const options = (sceneThoughts as Record<string, string[]>)[departureSatisfaction.level];
                if (options && options.length > 0) {
                    return options[Math.floor(Math.random() * options.length)];
                }
            }
        }
    }

    // Fallback to base satisfaction thoughts
    const thoughtsMap = getDepartureThoughtsMap();
    const options = thoughtsMap[satisfaction];
    if (!options || options.length === 0) return "...";
    return options[Math.floor(Math.random() * options.length)];
};
