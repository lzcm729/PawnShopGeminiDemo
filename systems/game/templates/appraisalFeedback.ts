/**
 * Appraisal Feedback Templates
 *
 * Standard text templates for appraisal-related inner monologues.
 * These appear in the chat panel during negotiation phase.
 * Texts loaded from CSV: assets/data/texts/appraisal_feedback.csv
 */

import { parseCSV, CSVSchema, stringCol } from '../../utils/csvReader';
import feedbackCSV from '@/assets/data/texts/appraisal_feedback.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

interface FeedbackRow {
  key: string;
  text: string;
}

const FEEDBACK_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

/** Parsed feedback texts, lazily initialized */
let feedbackMap: Map<string, string> | null = null;

function getFeedbackMap(): Map<string, string> {
  if (!feedbackMap) {
    feedbackMap = new Map();
    const rows = parseCSV<FeedbackRow>(feedbackCSV, FEEDBACK_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;
      // First occurrence wins (single text per key for now)
      if (!feedbackMap.has(row.key)) {
        feedbackMap.set(row.key, row.text);
      }
    }
  }
  return feedbackMap;
}

// ============================================================================
// Exports
// ============================================================================

export type AppraisalTemplateKey = 'MISHAP' | 'RANGE_NARROWED' | 'IMPATIENT' | 'ALREADY_KNOWN' | 'BREAKTHROUGH' | 'MASTERED';

/**
 * Backward-compatible APPRAISAL_TEMPLATES accessor.
 * Consumers can still use APPRAISAL_TEMPLATES.MISHAP etc.
 */
export const APPRAISAL_TEMPLATES: Record<AppraisalTemplateKey, string> = new Proxy(
  {} as Record<AppraisalTemplateKey, string>,
  {
    get(_target, prop: string) {
      return getFeedbackMap().get(prop) ?? '';
    },
  }
);

/**
 * Get appraisal feedback text by key
 */
export function getAppraisalFeedbackText(key: AppraisalTemplateKey): string {
  return getFeedbackMap().get(key) ?? '';
}
