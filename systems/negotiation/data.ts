
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import instinctCSV from '@/assets/data/texts/negotiation_instinct.csv?raw';

export type InstinctRateZone = 'charity' | 'aid' | 'standard' | 'shark';
export type InstinctPriceZone = 'insult' | 'haggling' | 'fair' | 'premium';
export type InstinctNpcStyle = 'Desperate' | 'Aggressive' | 'Professional' | 'Deceptive';

export const getMatrixKey = (rate: InstinctRateZone, price: InstinctPriceZone, style: InstinctNpcStyle) => {
    return `${rate}_${price}_${style}`;
};

// ============================================================================
// CSV Loading
// ============================================================================

interface InstinctTextRow {
  key: string;
  text: string;
}

const INSTINCT_TEXT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

/** All text entries grouped by key, lazily initialized */
let textMap: Map<string, string[]> | null = null;

function getTextMap(): Map<string, string[]> {
  if (!textMap) {
    textMap = new Map();
    const rows = parseCSV<InstinctTextRow>(instinctCSV, INSTINCT_TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;

      const existing = textMap.get(row.key);
      if (existing) {
        existing.push(row.text);
      } else {
        textMap.set(row.key, [row.text]);
      }
    }
  }
  return textMap;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get instinct text variants for a given matrix key.
 * Returns the array of variant strings, or undefined if key not found.
 */
export function getInstinctTexts(key: string): string[] | undefined {
  return getTextMap().get(key);
}

/**
 * Get insight-aware response text variants for a given key.
 * Insight keys are prefixed with "insight_" in the same CSV.
 */
export function getInsightTexts(key: string): string[] | undefined {
  return getTextMap().get(key);
}

/**
 * Backward-compatible INSTINCT_MATRIX accessor.
 * Returns a Proxy that lazily reads from the CSV-backed Map.
 */
export const INSTINCT_MATRIX: Record<string, string[]> = new Proxy({} as Record<string, string[]>, {
  get(_target, prop: string) {
    return getTextMap().get(prop);
  },
  has(_target, prop: string) {
    return getTextMap().has(prop);
  },
});

/**
 * Backward-compatible INSIGHT_AWARE_RESPONSES accessor.
 * Returns a Proxy that lazily reads from the CSV-backed Map.
 */
export const INSIGHT_AWARE_RESPONSES: Record<string, string[]> = new Proxy({} as Record<string, string[]>, {
  get(_target, prop: string) {
    return getTextMap().get(prop);
  },
  has(_target, prop: string) {
    return getTextMap().has(prop);
  },
});

export const getRandomText = (texts: string[], seed: number) => {
    if (!texts || texts.length === 0) return "...";
    const index = Math.floor(Math.abs(seed)) % texts.length;
    return texts[index];
};
