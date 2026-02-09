/**
 * Character Ability System - Moral Echo Narrative Texts
 *
 * Provides narrative content for the moral echo system.
 * Texts are loaded from CSV: assets/data/texts/echo_texts.csv
 *
 * CSV key format: {SOURCE}:{CHANNEL}:{SEVERITY}
 * Each key can have multiple rows for variant support.
 *
 * Severity mapping (based on current innocence):
 *   LOW  (innocence >= 50): fleeting unease, quickly rationalized
 *   MEDIUM (innocence 30-49): persistent moral conflict, hard to shake
 *   HIGH (innocence < 30): deep guilt, behavioral consequences
 *
 * Design doc: v1.4 section 8.5
 */

import { MoralEchoEvent } from './types';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import echoTextsCSV from '@/assets/data/texts/echo_texts.csv?raw';

// ============================================================================
// Types
// ============================================================================

export interface EchoText {
  text: string;
  /** Only for MAIL channel */
  mailSubject?: string;
  /** Only for MAIL channel */
  mailSender?: string;
  /** Only for NEWS channel */
  newsHeadline?: string;
}

// ============================================================================
// CSV Loading
// ============================================================================

interface EchoTextRow {
  key: string;
  text: string;
  mailSubject: string;
  mailSender: string;
  newsHeadline: string;
}

const ECHO_TEXT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
  'mailSubject': stringCol('mailSubject'),
  'mailSender': stringCol('mailSender'),
  'newsHeadline': stringCol('newsHeadline'),
};

/** Parsed echo texts grouped by key, lazily initialized */
let echoTextMap: Map<string, EchoText[]> | null = null;

function getEchoTextMap(): Map<string, EchoText[]> {
  if (!echoTextMap) {
    echoTextMap = new Map();
    const rows = parseCSV<EchoTextRow>(echoTextsCSV, ECHO_TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;

      const entry: EchoText = { text: row.text };
      if (row.mailSubject) entry.mailSubject = row.mailSubject;
      if (row.mailSender) entry.mailSender = row.mailSender;
      if (row.newsHeadline) entry.newsHeadline = row.newsHeadline;

      const existing = echoTextMap.get(row.key);
      if (existing) {
        existing.push(entry);
      } else {
        echoTextMap.set(row.key, [entry]);
      }
    }
  }
  return echoTextMap;
}

// ============================================================================
// Query Function
// ============================================================================

/**
 * Look up a narrative text for a given moral echo event.
 *
 * Selects randomly from available variants for the matching
 * source + channel + severity combination.
 *
 * Falls back to a generic text if no match is found (should not happen
 * if all triggered combinations are covered in CSV).
 */
export function getEchoText(echo: MoralEchoEvent): EchoText {
  const key = `${echo.source}:${echo.channel}:${echo.severity}`;
  const variants = getEchoTextMap().get(key);

  if (!variants || variants.length === 0) {
    return { text: '......' };
  }

  const index = Math.floor(Math.random() * variants.length);
  return variants[index];
}
