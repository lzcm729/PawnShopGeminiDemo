/**
 * B-8: NPC Attitude Shift Based on Appraisal Uncertainty
 *
 * During appraisal, as uncertainty decreases, NPC dialogue attitude changes:
 * - SLY customers: drop their facade
 * - HARD customers: soften when they see serious appraisal
 * - DESPERATE customers: gain hope from reduced uncertainty
 *
 * Text loaded from CSV: assets/data/texts/appraisal_attitude.csv
 * Key format: "{BEHAVIOR_TAG}:high_to_low"
 */

import { createTextRegistry, TextRegistry } from '../utils/textRegistry';
import type { BehaviorTag } from '../core/types';
import appraisalAttitudeCSV from '@/assets/data/texts/appraisal_attitude.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

let attitudeRegistry: TextRegistry | null = null;

function getRegistry(): TextRegistry {
  if (!attitudeRegistry) {
    attitudeRegistry = createTextRegistry('appraisal_attitude', appraisalAttitudeCSV);
  }
  return attitudeRegistry;
}

// ============================================================================
// Uncertainty Thresholds
// ============================================================================

/** Uncertainty above this is considered "high" (no attitude shift) */
const HIGH_UNCERTAINTY_THRESHOLD = 0.20;

/** Uncertainty below this triggers the attitude shift */
const LOW_UNCERTAINTY_THRESHOLD = 0.15;

// ============================================================================
// Public API
// ============================================================================

/**
 * Determine if the NPC's attitude should shift based on uncertainty change.
 *
 * Returns a random attitude shift text if:
 * 1. The previous uncertainty was >= HIGH threshold (NPC was guarded)
 * 2. The new uncertainty is < LOW threshold (player proved expertise)
 *
 * Returns null if no shift occurs.
 *
 * @param behaviorTag The NPC's primary behavior tag
 * @param previousUncertainty Uncertainty before this appraisal
 * @param currentUncertainty Uncertainty after this appraisal
 * @returns Attitude shift text or null
 */
export function getAttitudeShift(
  behaviorTag: BehaviorTag,
  previousUncertainty: number,
  currentUncertainty: number
): string | null {
  // Only trigger when crossing from high to low uncertainty
  if (previousUncertainty < HIGH_UNCERTAINTY_THRESHOLD) return null;
  if (currentUncertainty >= LOW_UNCERTAINTY_THRESHOLD) return null;

  const key = `${behaviorTag}:high_to_low`;
  const registry = getRegistry();

  return registry.getRandom(key) || null;
}

/**
 * Get an attitude shift text for a specific behavior tag without
 * checking thresholds. Useful for forced/scripted attitude reveals.
 *
 * @param behaviorTag The NPC's primary behavior tag
 * @returns Random attitude shift text or null if no text defined
 */
export function getAttitudeShiftText(behaviorTag: BehaviorTag): string | null {
  const key = `${behaviorTag}:high_to_low`;
  return getRegistry().getRandom(key) || null;
}
