/**
 * Forgery Notoriety System
 *
 * Tracks the player's counterfeit sale history and drives three risk channels:
 * A. Mechanical: Detection probability escalation (15% -> 33%)
 * B. Reputation: Innocence erosion (-4 per sale)
 * C. Narrative: Gaze moment evolution (tone shifts with experience)
 *
 * Design doc: Workshop System v2.1, §8
 */

import { GAME_CONFIG } from '../game/config';
import { ForgeryNotorietyStage, ForgeryNotorietyState } from './types';

// ============================================================================
// Stage Definitions
// ============================================================================

interface NotorietyStageConfig {
  stage: ForgeryNotorietyStage;
  minSales: number;
  maxSales: number;
  /** Gaze duration in seconds */
  gazeSeconds: number;
  /** Whether the gaze can be skipped */
  gazeSkippable: boolean;
  /** Narrative tone for gaze text selection */
  gazeTone: string;
}

const NOTORIETY_STAGES: NotorietyStageConfig[] = [
  { stage: 'NOVICE', minSales: 0, maxSales: 3, gazeSeconds: 5, gazeSkippable: false, gazeTone: 'moral_unease' },
  { stage: 'PRACTITIONER', minSales: 4, maxSales: 7, gazeSeconds: 3, gazeSkippable: true, gazeTone: 'self_rationalization' },
  { stage: 'VETERAN', minSales: 8, maxSales: 12, gazeSeconds: 2, gazeSkippable: true, gazeTone: 'professional_numbness' },
  { stage: 'NOTORIOUS', minSales: 13, maxSales: Infinity, gazeSeconds: 2, gazeSkippable: true, gazeTone: 'silence' },
];

// ============================================================================
// Initial State
// ============================================================================

export const INITIAL_FORGERY_NOTORIETY: ForgeryNotorietyState = {
  totalCounterfeitSales: 0,
  currentDetectionRate: GAME_CONFIG.WORKSHOP.FORGERY.BASE_DETECTION_RATE,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the notoriety stage based on total counterfeit sales.
 * Design doc §8.2: Four progressive stages.
 */
export function getNotorietyStage(totalSales: number): ForgeryNotorietyStage {
  const config = NOTORIETY_STAGES.find(
    s => totalSales >= s.minSales && totalSales <= s.maxSales
  );
  return config?.stage ?? 'NOTORIOUS';
}

/**
 * Calculate the current detection rate based on total counterfeit sales.
 * Formula: base_detection_rate + detection_increment * totalSales, capped at detection_cap.
 * Design doc §6.5 & §8.3 Channel A.
 */
export function getDetectionRate(totalSales: number): number {
  const { BASE_DETECTION_RATE, DETECTION_INCREMENT, DETECTION_CAP } = GAME_CONFIG.WORKSHOP.FORGERY;
  return Math.min(DETECTION_CAP, BASE_DETECTION_RATE + DETECTION_INCREMENT * totalSales);
}

/**
 * Get gaze configuration for the current notoriety level.
 * Used by UI to control gaze moment duration, skip behavior, and tone.
 * Design doc §9.3: Gaze evolution sequence.
 */
export function getGazeConfig(totalSales: number): {
  seconds: number;
  skippable: boolean;
  tone: string;
  stage: ForgeryNotorietyStage;
} {
  const stageConfig = NOTORIETY_STAGES.find(
    s => totalSales >= s.minSales && totalSales <= s.maxSales
  ) ?? NOTORIETY_STAGES[NOTORIETY_STAGES.length - 1];

  return {
    seconds: stageConfig.gazeSeconds,
    skippable: stageConfig.gazeSkippable,
    tone: stageConfig.gazeTone,
    stage: stageConfig.stage,
  };
}

/**
 * Create an updated notoriety state after a counterfeit sale.
 * Increments totalCounterfeitSales and recalculates detection rate.
 */
export function advanceNotoriety(current: ForgeryNotorietyState): ForgeryNotorietyState {
  const newTotal = current.totalCounterfeitSales + 1;
  return {
    totalCounterfeitSales: newTotal,
    currentDetectionRate: getDetectionRate(newTotal),
  };
}

/**
 * Get the full stage config for a given number of sales.
 * Useful for narrative systems that need all stage details.
 */
export function getNotorietyStageConfig(totalSales: number): NotorietyStageConfig {
  return NOTORIETY_STAGES.find(
    s => totalSales >= s.minSales && totalSales <= s.maxSales
  ) ?? NOTORIETY_STAGES[NOTORIETY_STAGES.length - 1];
}
