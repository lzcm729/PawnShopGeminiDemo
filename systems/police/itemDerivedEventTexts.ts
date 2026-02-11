/**
 * Item-Derived Event Text Loader & Builder
 *
 * Loads THIEF_REGRET and ORIGINAL_OWNER event texts from CSV.
 * PURCHASE_OFFER texts come from DSL story files (already data-driven).
 *
 * CSV: assets/data/texts/item_derived_events.csv
 * Format: eventType, field, value (pivot format)
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import rawCsv from '@/assets/data/texts/item_derived_events.csv?raw';
import type { ItemDerivedEvent, ItemDerivedChoice, ItemDerivedEventType } from '../npc/types';

// ============================================================================
// CSV Parsing
// ============================================================================

interface EventTextRow {
    eventType: string;
    field: string;
    value: string;
}

const SCHEMA: CSVSchema = {
    'eventType': stringCol('eventType'),
    'field': stringCol('field'),
    'value': stringCol('value'),
};

type AccentColor = 'purple' | 'amber' | 'emerald' | 'red';

interface ParsedEventTexts {
    sceneNarrative: string;
    situationDesc: string;
    npcQuote: string;
    npcName: string;
    accentColor: AccentColor;
    acceptLabel: string;
    acceptSubLabel: string;
    acceptDesc: string;
    acceptEffects: string[];
    refuseLabel: string;
    refuseSubLabel: string;
    refuseDesc: string;
    refuseEffects: string[];
}

const VALID_ACCENT_COLORS: AccentColor[] = ['purple', 'amber', 'emerald', 'red'];

/** Lazily initialized text lookup */
let _textMap: Map<string, ParsedEventTexts> | null = null;

function getTextMap(): Map<string, ParsedEventTexts> {
    if (_textMap) return _textMap;

    _textMap = new Map();

    const rows = parseCSV<EventTextRow>(rawCsv, SCHEMA, {
        warnUnknownColumns: false,
    });

    // Build pivot: group rows by eventType, then map field -> value
    const pivot = new Map<string, Map<string, string>>();
    for (const row of rows) {
        if (!row.eventType || !row.field) continue;
        let fieldMap = pivot.get(row.eventType);
        if (!fieldMap) {
            fieldMap = new Map();
            pivot.set(row.eventType, fieldMap);
        }
        fieldMap.set(row.field, row.value);
    }

    // Convert pivot to ParsedEventTexts
    for (const [eventType, fieldMap] of pivot) {
        const get = (key: string, fallback: string = '') => fieldMap.get(key) || fallback;
        const rawColor = get('accentColor', 'purple');
        const accentColor: AccentColor = VALID_ACCENT_COLORS.includes(rawColor as AccentColor)
            ? (rawColor as AccentColor)
            : 'purple';

        _textMap.set(eventType, {
            sceneNarrative: get('sceneNarrative'),
            situationDesc: get('situationDesc'),
            npcQuote: get('npcQuote'),
            npcName: get('npcName', eventType),
            accentColor,
            acceptLabel: get('acceptLabel', '接受'),
            acceptSubLabel: get('acceptSubLabel', 'ACCEPT'),
            acceptDesc: get('acceptDesc'),
            acceptEffects: get('acceptEffects').split(',').filter(Boolean),
            refuseLabel: get('refuseLabel', '拒绝'),
            refuseSubLabel: get('refuseSubLabel', 'REFUSE'),
            refuseDesc: get('refuseDesc'),
            refuseEffects: get('refuseEffects').split(',').filter(Boolean),
        });
    }

    return _textMap;
}

// ============================================================================
// Event Builders
// ============================================================================

/**
 * Build a complete ItemDerivedEvent for random holding-period events.
 * Text content comes from CSV.
 */
export function buildRandomItemDerivedEvent(
    eventType: 'THIEF_REGRET' | 'ORIGINAL_OWNER',
    item: { id: string; name: string; relatedChainId?: string },
    currentDay: number,
): ItemDerivedEvent {
    const texts = getTextMap().get(eventType);

    // Fallback texts if CSV loading fails
    const fallbackScene = eventType === 'THIEF_REGRET'
        ? '一位来客推开了店门...'
        : '一位声称自己是原主人的来客推开了店门...';
    const fallbackNpcName = eventType === 'THIEF_REGRET' ? '窃贼' : '原物主';

    const situationDesc = (texts?.situationDesc || '{itemName}').replace('{itemName}', item.name);

    const acceptChoice: ItemDerivedChoice = {
        id: 'accept',
        label: texts?.acceptLabel || '接受',
        subLabel: texts?.acceptSubLabel || 'ACCEPT',
        description: texts?.acceptDesc || '',
        effectLabels: texts?.acceptEffects || [],
    };

    const refuseChoice: ItemDerivedChoice = {
        id: 'refuse',
        label: texts?.refuseLabel || '拒绝',
        subLabel: texts?.refuseSubLabel || 'REFUSE',
        description: texts?.refuseDesc || '',
        effectLabels: texts?.refuseEffects || [],
    };

    return {
        eventType,
        itemId: item.id,
        itemName: item.name,
        npcName: texts?.npcName || fallbackNpcName,
        sceneNarrative: texts?.sceneNarrative || fallbackScene,
        npcQuote: texts?.npcQuote || '',
        situationDesc,
        choices: [acceptChoice, refuseChoice],
        accentColor: texts?.accentColor || 'purple',
        chainId: item.relatedChainId,
        triggerDay: currentDay,
    };
}

/**
 * Build a complete ItemDerivedEvent for DSL PURCHASE_OFFER events.
 * Text content comes from the DSL story data (already data-driven).
 */
export function buildPurchaseOfferEvent(params: {
    itemId: string;
    itemName: string;
    npcName: string;
    npcDescription?: string;
    npcAvatar?: string;
    sceneNarrative: string;
    npcQuote: string;
    situationDesc: string;
    offerValue: number;
    chainId: string;
    storyEventId: string;
    triggerDay: number;
    acceptEffects?: string[];
    refuseEffects?: string[];
}): ItemDerivedEvent {
    const acceptChoice: ItemDerivedChoice = {
        id: 'accept',
        label: '出售物品',
        subLabel: 'SELL',
        description: `以 $${params.offerValue.toLocaleString()} 出售物品给收藏家。`,
        effectLabels: params.acceptEffects || [`+$${params.offerValue.toLocaleString()}`, '物品将被出售'],
    };

    const refuseChoice: ItemDerivedChoice = {
        id: 'refuse',
        label: '拒绝出售',
        subLabel: 'KEEP',
        description: '拒绝收购提议，保留物品在库存中。',
        effectLabels: params.refuseEffects || ['保留物品'],
    };

    return {
        eventType: 'PURCHASE_OFFER',
        itemId: params.itemId,
        itemName: params.itemName,
        npcName: params.npcName,
        npcDescription: params.npcDescription,
        npcAvatar: params.npcAvatar,
        sceneNarrative: params.sceneNarrative,
        npcQuote: params.npcQuote,
        situationDesc: params.situationDesc,
        choices: [acceptChoice, refuseChoice],
        accentColor: 'emerald',
        chainId: params.chainId,
        storyEventId: params.storyEventId,
        offerValue: params.offerValue,
        triggerDay: params.triggerDay,
    };
}
