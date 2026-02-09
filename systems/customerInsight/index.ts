/**
 * Customer Insight System Exports (洞察客户系统) v1.4
 *
 * This system allows players to "read" customer psychology during negotiation.
 * Distinct from the nighttime item insight (格物) system.
 */

// Type exports
export type {
  Disposition,
  DispositionInfo,
  RatioTier,
  InsightLayer,
  CustomerInsightResult,
  InsightInteraction,
  InsightReward,
  CustomerInsightStatus,
  InsightBlockReason,
  InsightNegotiationState,
  InsightPushPullModifier,
  ForesightInfo,
  InsightTrainingResult,
} from './types';

// Constant exports
export {
  BEHAVIOR_TO_DISPOSITION,
  PATIENCE_COST_TAGS,
  PATIENCE_COST_PROBABILITY,
  SHOW_DISPOSITION_LABEL_IN_NEGOTIATION,
  DISPOSITION_INFO,
  FLOOR_HINT_THRESHOLDS,
  INSIGHT_CONCESSION_MODIFIERS,
} from './types';

// Generator function exports
export {
  generateCustomerInsight,
  determineDisposition,
  calculatePatienceCost,
  getPatienceCostProbability,
  calculateInsightReward,
  getInsightPushPullModifier,
} from './generator';

// Behavior matrix exports
export {
  selectBehaviorDescription,
  BEHAVIOR_MATRIX,
} from './behaviorMatrix';

// Data contract exports
export type {
  ExtendedInformationChannel,
  InsightSupplyData,
  InsightConsumptionContract,
  MoralContextDepth,
} from './dataContract';

export {
  determineMoralContextDepth,
  createInsightSupplyData,
} from './dataContract';
