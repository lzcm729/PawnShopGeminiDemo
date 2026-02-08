/**
 * Insight Data Contract (I-13: 数据消费/供给契约)
 *
 * Defines the data format that the insight system supplies to the event chain system.
 * Insight registers as the 5th information channel alongside NEWS, MAIL, RETROSPECTIVE, ITEM_LOG.
 *
 * Design: 洞察§10 + 事件链§2.L
 */

import { Disposition, CustomerInsightResult, InsightLayer } from './types';

// ============================================================================
// Extended Channel Type
// ============================================================================

/**
 * Extended information channel type including INSIGHT as 5th channel.
 * The base InformationChannel type in channelProtocol.ts defines 4 channels.
 * INSIGHT is added as a supplementary channel with different semantics:
 * - Not triggered by consequences, but by player action
 * - Does not follow severity-based allocation rules
 * - Provides data TO event chain, not FROM event chain
 */
export type ExtendedInformationChannel =
  | 'NEWS'
  | 'MAIL'
  | 'RETROSPECTIVE'
  | 'ITEM_LOG'
  | 'INSIGHT';

// ============================================================================
// Data Supply Contract (洞察 -> 事件链)
// ============================================================================

/**
 * Data that the insight system supplies to the event chain system.
 * This is the "output" side of the insight system's data contract.
 */
export interface InsightSupplyData {
  /** Customer ID this insight is for */
  customerId: string;

  /** Chain ID if customer is a story customer */
  chainId?: string;

  /** The detected disposition */
  disposition: Disposition;

  /** Maximum layer that was revealed */
  revealedLayer: InsightLayer;

  /** Whether player used insight (vs. auto-reveal from compendium) */
  wasActiveInsight: boolean;

  /** Whether patience was consumed */
  patienceCost: number;

  /** Day this insight was performed */
  dayPerformed: number;
}

// ============================================================================
// Data Consumption Contract (外部 -> 洞察)
// ============================================================================

/**
 * Data that the insight system requires from external sources.
 * Documents the dependency contract per design §10.
 */
export interface InsightConsumptionContract {
  /** Required: BehaviorTag[] from NPC generation/event chain */
  behaviorTags: 'REQUIRED';

  /** Required: minimumAmount from NPC/negotiation (floor hint anchor) */
  minimumAmount: 'REQUIRED';

  /** Required: desiredAmount from NPC generation */
  desiredAmount: 'REQUIRED';

  /** Enhanced: pawnReason from NPC dialogue (moral context layer 3) */
  pawnReason: 'ENHANCED';

  /** Enhanced: chainState variables (hope, funds) from event chain SimRules */
  chainStateVariables: 'ENHANCED';

  /** Interaction: originalFloor vs currentFloor after push/pull operations */
  originalFloor: 'INTERACTION';
}

// ============================================================================
// Moral Context Degradation Levels (四级降级方案)
// ============================================================================

/**
 * Moral context depth based on data availability.
 * Per design §10: degradation should not feel "broken" - each level is complete.
 */
export type MoralContextDepth =
  | 'FULL'      // pawnReason + hope + funds -> deepest moral dilemma
  | 'PARTIAL'   // pawnReason only -> has background, no state
  | 'MINIMAL'   // behaviorTags=DESPERATE only -> behavioral observation
  | 'NONE';     // TRANSIENT, no tags/reason -> no layer 3

/**
 * Determine moral context depth based on available data
 */
export function determineMoralContextDepth(
  pawnReason: string | undefined,
  chainVariables: Record<string, number> | undefined,
  hasDesperate: boolean
): MoralContextDepth {
  if (pawnReason && chainVariables && ('hope' in chainVariables || 'funds' in chainVariables)) {
    return 'FULL';
  }
  if (pawnReason) {
    return 'PARTIAL';
  }
  if (hasDesperate) {
    return 'MINIMAL';
  }
  return 'NONE';
}

/**
 * Create an InsightSupplyData packet for the event chain system
 */
export function createInsightSupplyData(
  customerId: string,
  result: CustomerInsightResult,
  currentDay: number,
  chainId?: string
): InsightSupplyData {
  return {
    customerId,
    chainId,
    disposition: result.disposition,
    revealedLayer: result.revealedLayer,
    wasActiveInsight: true,
    patienceCost: result.patienceCost,
    dayPerformed: currentDay,
  };
}
