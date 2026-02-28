/**
 * Instinct Tone System (E-1)
 *
 * Six-tier tone + modifier architecture for merchant instinct text.
 * Each tier has a base tone (e.g., CHARITY="gratitude", SHARK="fear").
 * Modifiers (e.g., "desperate") provide specialized variants.
 * All text loaded from CSV.
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import tonesCsv from '@/assets/data/texts/instinct_tones.csv?raw';
import type { ContractTier } from '../characterAbility/essenceSystem';

// ============================================================================
// CSV Loading
// ============================================================================

interface ToneRow {
  tier: string;
  tone: string;
  modifier: string;
  text: string;
}

const TONE_SCHEMA: CSVSchema = {
  'tier': stringCol('tier'),
  'tone': stringCol('tone'),
  'modifier': stringCol('modifier'),
  'text': stringCol('text'),
};

/**
 * Texts grouped by lookup key: "TIER" or "TIER:modifier"
 * Lazily initialized.
 */
let toneMap: Map<string, string[]> | null = null;

function getToneMap(): Map<string, string[]> {
  if (!toneMap) {
    toneMap = new Map();
    const rows = parseCSV<ToneRow>(tonesCsv, TONE_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.tier || !row.text) continue;

      // Base key (no modifier)
      const baseKey = row.tier;
      const baseList = toneMap.get(baseKey);
      if (baseList) {
        baseList.push(row.text);
      } else {
        toneMap.set(baseKey, [row.text]);
      }

      // Modifier-specific key
      if (row.modifier) {
        const modKey = `${row.tier}:${row.modifier}`;
        const modList = toneMap.get(modKey);
        if (modList) {
          modList.push(row.text);
        } else {
          toneMap.set(modKey, [row.text]);
        }
      }
    }
  }
  return toneMap;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get instinct tone texts for a given contract tier and optional modifier.
 * If modifier is provided and has specific texts, returns those.
 * Otherwise falls back to the tier's base texts.
 */
export function getInstinctToneTexts(tier: ContractTier, modifier?: string): string[] | undefined {
  const map = getToneMap();

  // Try modifier-specific texts first
  if (modifier) {
    const modTexts = map.get(`${tier}:${modifier}`);
    if (modTexts && modTexts.length > 0) return modTexts;
  }

  // Fall back to base tier texts
  return map.get(tier);
}
