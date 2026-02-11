/**
 * Empathy/Probe Feedback Text Loader (共情/试探反馈文本)
 *
 * Loads feedback text from CSV for empathy and probe skill results.
 * CSV location: assets/data/texts/empathy_probe_feedback.csv
 *
 * CSV columns:
 *   skill       - EMPATHY | PROBE
 *   disposition  - desperate | sincere | bluffing | firm
 *   result       - success | failure
 *   text         - Main feedback text
 *   subtext      - Secondary text (optional, e.g., mechanical effect description)
 *
 * Same (skill, disposition, result) can have multiple rows for variant support.
 */

import { createTextRegistry, TextRegistry } from '../utils/textRegistry';
import type { Disposition } from '../customerInsight/types';
import type { ConcessionTier } from './probeEffects';
import empathyProbeFeedbackCSV from '@/assets/data/texts/empathy_probe_feedback.csv?raw';

// ============================================================================
// CSV Loading (standard pattern: import ?raw + createTextRegistry)
// ============================================================================

let feedbackRegistry: TextRegistry | null = null;

function getRegistry(): TextRegistry {
  if (!feedbackRegistry) {
    feedbackRegistry = createTextRegistry('empathy_probe_feedback', empathyProbeFeedbackCSV);
  }
  return feedbackRegistry;
}

// ============================================================================
// Feedback Query Functions
// ============================================================================

type SkillType = 'EMPATHY' | 'PROBE';
type ResultType = 'success' | 'failure';

/**
 * Build a registry key from skill, disposition, and result.
 * Format: "EMPATHY:desperate:success"
 */
function buildKey(skill: SkillType, disposition: Disposition, result: ResultType): string {
  return `${skill}:${disposition}:${result}`;
}

/** Feedback text pair returned to UI */
export interface SkillFeedback {
  /** Main feedback text */
  text: string;
  /** Secondary text (mechanical effect description, optional) */
  subtext: string;
}

// English placeholder fallbacks (no Chinese — CSV provides localized text)
const FALLBACK_TEXT: Record<string, string> = {
  'EMPATHY:desperate:success': '[EMPATHY_SUCCESS_DESPERATE]',
  'EMPATHY:sincere:success': '[EMPATHY_SUCCESS_SINCERE]',
  'EMPATHY:bluffing:failure': '[EMPATHY_FAIL_BLUFFING]',
  'EMPATHY:firm:failure': '[EMPATHY_FAIL_FIRM]',
  'PROBE:bluffing:success': '[PROBE_SUCCESS_BLUFFING]',
  'PROBE:firm:success': '[PROBE_SUCCESS_FIRM]',
  'PROBE:desperate:failure': '[PROBE_FAIL_DESPERATE]',
  'PROBE:sincere:failure': '[PROBE_FAIL_SINCERE]',
};

function getFallbackText(key: string): string {
  return FALLBACK_TEXT[key] || `[${key}]`;
}

/**
 * Get feedback text for empathy skill usage.
 *
 * @param disposition Customer's actual disposition
 * @param isCorrect Whether the empathy matched (desperate/sincere = correct)
 * @returns SkillFeedback with text and subtext
 */
export function getEmpathyFeedback(
  disposition: Disposition,
  isCorrect: boolean
): SkillFeedback {
  const result: ResultType = isCorrect ? 'success' : 'failure';
  const key = buildKey('EMPATHY', disposition, result);
  const subtextKey = `${key}:subtext`;

  const registry = getRegistry();
  const text = registry.getRandom(key) || getFallbackText(key);
  const subtext = registry.getRandom(subtextKey) || '';

  return { text, subtext };
}

/**
 * Get feedback text for probe skill usage.
 *
 * @param disposition Customer's actual disposition
 * @param isCorrect Whether the probe matched (bluffing/firm = correct)
 * @returns SkillFeedback with text and subtext
 */
export function getProbeFeedback(
  disposition: Disposition,
  isCorrect: boolean
): SkillFeedback {
  const result: ResultType = isCorrect ? 'success' : 'failure';
  const key = buildKey('PROBE', disposition, result);
  const subtextKey = `${key}:subtext`;

  const registry = getRegistry();
  const text = registry.getRandom(key) || getFallbackText(key);
  const subtext = registry.getRandom(subtextKey) || '';

  return { text, subtext };
}

/**
 * Get localized label for a concession tier.
 * Returns empty string if tier is null (offer >= ask price, direct acceptance).
 * Falls back to English placeholder if CSV not loaded.
 */
export function getConcessionTierLabel(tier: ConcessionTier): string {
  if (tier === null) return ''; // No concession tier needed when offer >= ask price
  const registry = getRegistry();
  const key = `PROBE:concession_tier:${tier}`;
  return registry.get(key) || `[CONCESSION_${tier.toUpperCase()}]`;
}
