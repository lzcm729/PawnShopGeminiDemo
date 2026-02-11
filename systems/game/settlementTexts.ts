/**
 * Settlement Ceremony Texts
 *
 * Narrative texts for the weekly medical bill settlement ceremony.
 * Texts loaded from CSV: assets/data/texts/settlement_texts.csv
 *
 * Three severity tiers:
 * - COMFORTABLE: balance is healthy after payment
 * - TIGHT: balance is marginal (can afford but barely)
 * - BARELY_SURVIVED: balance is critically low after payment
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import settlementCSV from '@/assets/data/texts/settlement_texts.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

interface SettlementTextRow {
    category: string;
    key: string;
    text: string;
}

const SETTLEMENT_SCHEMA: CSVSchema = {
    'category': stringCol('category'),
    'key': stringCol('key'),
    'text': stringCol('text'),
};

/** Parsed settlement texts, lazily initialized */
let _settlementTexts: Map<string, string> | null = null;

function loadSettlementTexts(): void {
    if (_settlementTexts) return;

    _settlementTexts = new Map();

    const rows = parseCSV<SettlementTextRow>(settlementCSV, SETTLEMENT_SCHEMA, {
        warnUnknownColumns: false,
    });

    for (const row of rows) {
        if (!row.key || !row.text) continue;
        if (row.category === 'settlement') {
            _settlementTexts.set(row.key, row.text);
        }
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get settlement narrative text by severity tier.
 * Supports ${amount} placeholder in the text, replaced with the provided amount.
 */
export function getSettlementText(
    tier: 'COMFORTABLE' | 'TIGHT' | 'BARELY_SURVIVED',
    amount?: number
): string {
    loadSettlementTexts();

    const text = _settlementTexts!.get(tier);
    if (!text) return '';

    // Replace ${amount} placeholder if present
    if (amount !== undefined) {
        return text.replace('${amount}', '$' + amount);
    }
    return text;
}
