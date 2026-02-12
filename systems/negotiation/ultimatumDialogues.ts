
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import ultimatumCSV from '@/assets/data/texts/ultimatum_dialogues.csv?raw';

// ============================================================================
// Types
// ============================================================================

type UltimatumTextType = 'caution' | 'danger' | 'ultimatum' | 'reject';

interface UltimatumTextRow {
  id: string;
  type: string;
  text: string;
}

// ============================================================================
// CSV Loading
// ============================================================================

const ULTIMATUM_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'type': stringCol('type'),
  'text': stringCol('text'),
};

let textsByType: Map<UltimatumTextType, string[]> | null = null;

function getTextsByType(): Map<UltimatumTextType, string[]> {
  if (!textsByType) {
    textsByType = new Map();
    const rows = parseCSV<UltimatumTextRow>(ultimatumCSV, ULTIMATUM_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.type || !row.text) continue;
      const t = row.type as UltimatumTextType;
      const existing = textsByType.get(t);
      if (existing) {
        existing.push(row.text);
      } else {
        textsByType.set(t, [row.text]);
      }
    }
  }
  return textsByType;
}

// ============================================================================
// Query Functions
// ============================================================================

function pickRandom(texts: string[]): string {
  if (!texts || texts.length === 0) return '...';
  return texts[Math.floor(Math.random() * texts.length)];
}

/** Get a random caution-level warning dialogue */
export function getCautionDialogue(): string {
  const texts = getTextsByType().get('caution');
  return pickRandom(texts || []);
}

/** Get a random danger-level warning dialogue */
export function getDangerDialogue(): string {
  const texts = getTextsByType().get('danger');
  return pickRandom(texts || []);
}

/** Get a random ultimatum dialogue, with {price} replaced */
export function getUltimatumDialogue(price: number): string {
  const texts = getTextsByType().get('ultimatum');
  const raw = pickRandom(texts || []);
  return raw.replace('{price}', String(price));
}

/** Get a random rejection dialogue (after ultimatum is rejected) */
export function getRejectDialogue(): string {
  const texts = getTextsByType().get('reject');
  return pickRandom(texts || []);
}
