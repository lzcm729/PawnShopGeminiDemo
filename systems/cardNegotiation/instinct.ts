/**
 * Card Negotiation System - Instinct Text Loader
 *
 * Loads instinct/monologue texts for the card negotiation system.
 * Text is loaded from CSV, following the data-driven principle.
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import cardInstinctCsv from '@/assets/data/texts/card_instinct.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

interface InstinctTextRow {
  key: string;
  text: string;
}

const INSTINCT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

let _textMap: Map<string, string[]> | null = null;

function getTextMap(): Map<string, string[]> {
  if (!_textMap) {
    _textMap = new Map();
    const rows = parseCSV<InstinctTextRow>(cardInstinctCsv, INSTINCT_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;
      const existing = _textMap.get(row.key);
      if (existing) {
        existing.push(row.text);
      } else {
        _textMap.set(row.key, [row.text]);
      }
    }
  }
  return _textMap;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get an instinct text by key.
 * If multiple variants exist, returns a random one based on seed.
 */
export function getCardInstinctText(key: string, seed?: number): string | null {
  const texts = getTextMap().get(key);
  if (!texts || texts.length === 0) return null;

  if (seed !== undefined) {
    const index = Math.floor(Math.abs(seed)) % texts.length;
    return texts[index];
  }

  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * Get all instinct text variants for a key.
 */
export function getCardInstinctTexts(key: string): string[] | undefined {
  return getTextMap().get(key);
}
