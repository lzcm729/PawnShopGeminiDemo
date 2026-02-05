/**
 * Customer Insight System Exports (洞察客户系统)
 *
 * This system allows players to "read" customer psychology during negotiation.
 * Distinct from the nighttime item insight (格物) system.
 */

// Type exports
export type {
  Disposition,
  DispositionInfo,
  CustomerInsightResult,
  CustomerInsightStatus,
  InsightBlockReason,
} from './types';

// Constant exports
export {
  BEHAVIOR_TO_DISPOSITION,
  PATIENCE_COST_TAGS,
  DISPOSITION_INFO,
  FLOOR_HINT_THRESHOLDS,
} from './types';

// Generator function exports
export {
  generateCustomerInsight,
  determineDisposition,
  calculatePatienceCost,
} from './generator';
