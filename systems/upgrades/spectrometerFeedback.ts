/**
 * Spectrometer Feedback Templates
 *
 * Message pools for the spectrometer anomaly detection system.
 * Texts loaded from CSV: assets/data/texts/spectrometer_feedback.csv
 *
 * Design doc 3.6 requires balanced positive/negative anomaly messages:
 * - At least 40% of alerts should point to "bargain" opportunities
 * - Provide "equipment confirms: item normal" positive feedback when no anomaly
 * - Avoid punishment-heavy messaging that makes the spectrometer feel like an anxiety source
 *
 * Severity tiers based on deviation percentage:
 * - Mild: just above threshold (e.g., 21-40% for Lv3)
 * - Moderate: clearly above threshold (e.g., 41-80%)
 * - Severe: far above threshold (e.g., >80%)
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import spectrometerCSV from '@/assets/data/texts/spectrometer_feedback.csv?raw';

// ============================================================================
// Types
// ============================================================================

export type AnomalySeverity = 'mild' | 'moderate' | 'severe';

export interface AnomalyMessage {
  text: string;
  /** Whether this message leans positive (bargain hint) or negative (fake/overvalued hint) or neutral */
  tone: 'positive' | 'negative' | 'neutral';
}

// ============================================================================
// CSV Loading
// ============================================================================

interface SpectrometerRow {
  key: string;
  text: string;
  tone: string;
}

const SPECTROMETER_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
  'tone': stringCol('tone'),
};

/** Parsed spectrometer messages grouped by key, lazily initialized */
let messageMap: Map<string, AnomalyMessage[]> | null = null;
let normalMessages: string[] | null = null;

function loadMessages(): void {
  if (messageMap) return;

  messageMap = new Map();
  normalMessages = [];

  const rows = parseCSV<SpectrometerRow>(spectrometerCSV, SPECTROMETER_SCHEMA, {
    warnUnknownColumns: false,
  });

  for (const row of rows) {
    if (!row.key || !row.text) continue;

    if (row.key === 'normal') {
      normalMessages.push(row.text);
    } else {
      const tone = (row.tone === 'positive' || row.tone === 'negative' || row.tone === 'neutral')
        ? row.tone
        : 'neutral';
      const entry: AnomalyMessage = { text: row.text, tone };
      const existing = messageMap.get(row.key);
      if (existing) {
        existing.push(entry);
      } else {
        messageMap.set(row.key, [entry]);
      }
    }
  }
}

function getMessageMap(): Map<string, AnomalyMessage[]> {
  loadMessages();
  return messageMap!;
}

function getNormalMessages(): string[] {
  loadMessages();
  return normalMessages!;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a random anomaly message for the given severity.
 */
export function getAnomalyMessage(severity: AnomalySeverity): AnomalyMessage {
  const key = `anomaly_${severity}`;
  const pool = getMessageMap().get(key);

  if (!pool || pool.length === 0) {
    return { text: '...', tone: 'neutral' };
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a random normal confirmation message.
 */
export function getNormalConfirmationMessage(): string {
  const msgs = getNormalMessages();
  if (msgs.length === 0) return '...';
  return msgs[Math.floor(Math.random() * msgs.length)];
}

/**
 * Determine anomaly severity based on percentage deviation.
 */
export function getAnomalySeverity(percentDiff: number): AnomalySeverity {
  if (percentDiff > 80) return 'severe';
  if (percentDiff > 40) return 'moderate';
  return 'mild';
}
