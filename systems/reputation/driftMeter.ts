/**
 * Drift Meter (E-5) — Moral Drift Retrospection
 *
 * Tracks cumulative interest rate deviation across a day's transactions.
 * At night, if the average rate exceeds a threshold, triggers a reflective
 * monologue event. Text loaded from CSV.
 *
 * Design principle: The player doesn't see a "drift warning" during the day —
 * the realization comes at night, mirroring the "boiling frog" effect of
 * moral drift (Breaking Bad pattern).
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import driftCsv from '@/assets/data/texts/drift_meter.csv?raw';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// Types
// ============================================================================

export interface DriftEntry {
  /** Interest rate in percentage form (e.g., 5 = 5%) */
  ratePercent: number;
}

export type DriftLevel = 'none' | 'charity' | 'mild' | 'severe';

export interface DriftSummary {
  /** Number of transactions today */
  count: number;
  /** Average interest rate in percentage form */
  avgRate: number;
  /** Drift level based on thresholds */
  level: DriftLevel;
  /** Summary text (with placeholders filled) */
  summaryText: string;
  /** Monologue text for night reflection (null if level is 'none') */
  monologueText: string | null;
}

// ============================================================================
// CSV Loading
// ============================================================================

interface DriftTextRow {
  key: string;
  text: string;
}

const DRIFT_TEXT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

let driftTextMap: Map<string, string[]> | null = null;

function getDriftTextMap(): Map<string, string[]> {
  if (!driftTextMap) {
    driftTextMap = new Map();
    const rows = parseCSV<DriftTextRow>(driftCsv, DRIFT_TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;
      const existing = driftTextMap.get(row.key);
      if (existing) {
        existing.push(row.text);
      } else {
        driftTextMap.set(row.key, [row.text]);
      }
    }
  }
  return driftTextMap;
}

function getRandomDriftText(key: string, seed: number): string | null {
  const texts = getDriftTextMap().get(key);
  if (!texts || texts.length === 0) return null;
  const index = Math.floor(Math.abs(seed)) % texts.length;
  return texts[index];
}

// ============================================================================
// Drift Meter State (per-day, reset each morning)
// ============================================================================

let dailyEntries: DriftEntry[] = [];

/**
 * Record a transaction's interest rate into the drift meter.
 * Call this when a deal is finalized.
 * @param ratePercent Interest rate in percentage form (e.g., 5 for 5%)
 */
export function updateDriftMeter(ratePercent: number): void {
  dailyEntries.push({ ratePercent });
}

/**
 * Reset the drift meter. Call at the start of each day.
 */
export function resetDriftMeter(): void {
  dailyEntries = [];
}

/**
 * Get current drift meter entries (for debug/inspection).
 */
export function getDriftEntries(): readonly DriftEntry[] {
  return dailyEntries;
}

/**
 * Compute the drift summary for the current day.
 * Returns the average rate, drift level, and appropriate text.
 */
export function getDriftSummary(): DriftSummary {
  const count = dailyEntries.length;

  if (count === 0) {
    return {
      count: 0,
      avgRate: 0,
      level: 'none',
      summaryText: '',
      monologueText: null,
    };
  }

  const totalRate = dailyEntries.reduce((sum, e) => sum + e.ratePercent, 0);
  const avgRate = totalRate / count;

  const level = getDriftLevel(avgRate);

  // Generate summary text
  const summaryTemplate = getRandomDriftText('drift_summary', count * 7 + Math.round(avgRate * 13));
  const summaryText = summaryTemplate
    ? summaryTemplate
        .replace('{count}', String(count))
        .replace('{avgRate}', avgRate.toFixed(1))
    : '';

  // Generate monologue text based on drift level
  let monologueText: string | null = null;
  const seed = Math.round(avgRate * 100) + count;

  if (level === 'severe') {
    monologueText = getRandomDriftText('drift_severe', seed);
  } else if (level === 'mild') {
    monologueText = getRandomDriftText('drift_mild', seed);
  } else if (level === 'charity') {
    monologueText = getRandomDriftText('drift_charity', seed);
  }

  return {
    count,
    avgRate,
    level,
    summaryText,
    monologueText,
  };
}

/**
 * Check if the drift threshold has been exceeded.
 * Convenience function for triggering night events.
 */
export function checkDriftThreshold(): boolean {
  const { level } = getDriftSummary();
  return level === 'mild' || level === 'severe' || level === 'charity';
}

// ============================================================================
// Internal
// ============================================================================

function getDriftLevel(avgRate: number): DriftLevel {
  const { DRIFT_THRESHOLD, SEVERE_DRIFT_THRESHOLD } = GAME_CONFIG.DRIFT_METER;

  if (avgRate >= SEVERE_DRIFT_THRESHOLD) return 'severe';
  if (avgRate >= DRIFT_THRESHOLD) return 'mild';
  if (avgRate <= 1) return 'charity'; // Average rate <= 1% is very charitable
  return 'none';
}
