/**
 * Customer Insight System Types (洞察客户系统)
 *
 * Allows players to "read" customer psychology during negotiation phase.
 * This is distinct from the nighttime item insight (格物) system.
 *
 * Design document: 洞察系统 (Customer Insight System).md v1.4
 */

import { BehaviorTag } from '../core/types';

// ============================================================================
// Disposition Types (心理倾向)
// ============================================================================

/**
 * Customer psychological disposition
 * Mapped from BehaviorTag system
 */
export type Disposition = 'desperate' | 'firm' | 'bluffing' | 'sincere';

/**
 * Display information for each disposition type
 * NOTE: Icons/labels are for customer compendium only, NOT for negotiation UI (I-9)
 */
export interface DispositionInfo {
  label: string;        // Chinese label
  icon: string;         // Emoji icon
  color: string;        // Tailwind color class
  description: string;  // Short description
}

/**
 * Ratio tier for floor hint matrix (底价/期望价比例档位)
 */
export type RatioTier = 'veryLow' | 'low' | 'medium' | 'high';

// ============================================================================
// Insight Layer Types (I-1: 三层揭示模型)
// ============================================================================

/**
 * Insight reveal layer level
 * Layer 1: Basic - psychological state behavior description (1 AP)
 * Layer 2: Advanced - floor hint behavior description (extra conditions)
 * Layer 3: Complete - moral context (full unlock or empathy skill)
 */
export type InsightLayer = 1 | 2 | 3;

/**
 * Result of using customer insight ability (v1.4 three-layer model)
 */
export interface CustomerInsightResult {
  /** Detected psychological disposition (internal, not shown as label) */
  disposition: Disposition;

  /** Secondary disposition from multi-tag customers (e.g., DESPERATE+SAVVY) */
  secondaryDisposition?: Disposition;

  /** Layer 1: Behavioral description of customer's psychological state */
  dispositionText: string;

  /** Layer 2: Behavioral description hinting at floor price range */
  floorHint: string;

  /** Layer 3: Moral context information (only for story customers) */
  moralContext: string | null;

  /** Amount of patience consumed (0 or 1, probabilistic per I-3) */
  patienceCost: number;

  /** Maximum layer revealed in this insight */
  revealedLayer: InsightLayer;

  /** Whether patience was consumed (for UI feedback) */
  patienceTriggered: boolean;

  /** Warning flag: if pressure/heartstrike was used before insight */
  timeOrderWarning?: boolean;
}

// ============================================================================
// Dual-Channel Reward (I-4: 双通道奖励模型)
// ============================================================================

/**
 * Interaction option unlocked after insight
 * Channel B: Delayed mechanical reward
 */
export type InsightInteraction = 'EMPATHY' | 'PROBE';

/**
 * Reward signal from insight usage
 */
export interface InsightReward {
  /** Channel A: Narrative reward - behavioral description provides "intimacy" */
  narrativeReward: boolean;

  /** Channel B: Interaction options unlocked */
  unlockedInteractions: InsightInteraction[];

  /** AP efficiency score: ratio of information gained to AP spent */
  apEfficiency: number;
}

// ============================================================================
// Insight Status
// ============================================================================

/**
 * Reason why insight cannot be used
 */
export type InsightBlockReason =
  | 'NO_AP'              // Not enough action points
  | 'ALREADY_USED'       // Already used insight on this customer
  | 'NO_CUSTOMER'        // No customer present
  | 'WRONG_PHASE';       // Not in negotiation phase

/**
 * Status of insight ability for current customer
 */
export interface CustomerInsightStatus {
  /** Whether insight can be used */
  canUse: boolean;

  /** Reason if cannot use */
  blockReason?: InsightBlockReason;

  /** AP cost (always 1) */
  apCost: number;

  /** Expected patience cost probability based on customer behavior */
  patienceCostProbability: number;
}

// ============================================================================
// Post-Insight Negotiation State (I-6: 洞察后议价差异化)
// ============================================================================

/**
 * State tracking whether insight has been used and results are visible
 */
export interface InsightNegotiationState {
  /** Whether insight has been performed for this customer */
  insightPerformed: boolean;

  /** Insight result (null if not performed) */
  result: CustomerInsightResult | null;

  /** Whether insight result panel is visible in negotiation UI */
  isInsightVisible: boolean;
}

// ============================================================================
// Push-Pull Modifier (I-7: 推拉坚持概率修正)
// ============================================================================

/**
 * Modifier to NPC persistence probability after insight
 * Negative value = lower persistence = easier to negotiate
 */
export interface InsightPushPullModifier {
  /** Modifier to NPC concession chance (added, not multiplied) */
  concessionModifier: number;
  /** Description for debug/logging */
  reason: string;
}

// ============================================================================
// Foresight Integration (I-10: 洞若观火功能边界)
// ============================================================================

/**
 * Foresight layer (Layer 4) appended to insight panel during departure
 * Distinct from insight layers in narrative tone:
 *   Insight = second person observation ("你注意到...")
 *   Foresight = first person intuition ("你感觉到...")
 */
export interface ForesightInfo {
  /** Redemption willingness prediction text */
  predictionText: string;
  /** Confidence level */
  confidence: 'low' | 'medium' | 'high';
}

// ============================================================================
// Training Mechanism (I-11: 训练机制)
// ============================================================================

/**
 * Post-transaction training feedback shown during night review
 */
export interface InsightTrainingResult {
  /** 3-tier deal position: gave too much / just right / squeezed hard */
  dealPosition: 'generous' | 'fair' | 'harsh';

  /** Narrative feedback text (叙事化方向性反馈) */
  feedbackText: string;

  /** Whether the insight judgment was accurate (hidden hint in review) */
  insightAccuracyHint: string | null;

  /** Whether the player used the insight ability during this transaction */
  insightUsed: boolean;
}

// ============================================================================
// Mapping Constants
// ============================================================================

/**
 * Maps BehaviorTag to Disposition
 * Priority order: first matching tag determines disposition
 */
export const BEHAVIOR_TO_DISPOSITION: Record<BehaviorTag, Disposition> = {
  DESPERATE: 'desperate',
  STUBBORN: 'firm',
  SUSPICIOUS: 'bluffing',
  SAVVY: 'bluffing',
  NAIVE: 'sincere',
  SENTIMENTAL: 'sincere',
};

/**
 * BehaviorTag patience cost probabilities for insight usage (I-3)
 * Design: probabilistic patience consumption based on BehaviorTag
 *
 * NAIVE/SENTIMENTAL/DESPERATE: 0% - won't notice being observed
 * STUBBORN: 40% - may notice being scrutinized
 * SUSPICIOUS: 60% - alert, likely to notice
 * SAVVY: 80% - knows you're reading them
 */
export const PATIENCE_COST_PROBABILITY: Record<BehaviorTag, number> = {
  NAIVE: 0,
  SENTIMENTAL: 0,
  DESPERATE: 0,
  STUBBORN: 0.40,
  SUSPICIOUS: 0.60,
  SAVVY: 0.80,
};

/**
 * @deprecated Use PATIENCE_COST_PROBABILITY instead.
 * Kept for backward compatibility during transition.
 */
export const PATIENCE_COST_TAGS: BehaviorTag[] = [];

/**
 * Disposition label should NOT be shown in negotiation UI.
 * Labels are only visible in customer compendium (I-9).
 */
export const SHOW_DISPOSITION_LABEL_IN_NEGOTIATION = false;

/**
 * Display information for each disposition
 * NOTE: Only used in customer compendium, NOT in negotiation UI (I-9)
 */
export const DISPOSITION_INFO: Record<Disposition, DispositionInfo> = {
  desperate: {
    label: '绝望',
    icon: '💧',
    color: 'text-red-400',
    description: '急需资金，几乎接受任何价格'
  },
  firm: {
    label: '坚定',
    icon: '🛡️',
    color: 'text-blue-400',
    description: '有底线的人，不会轻易妥协'
  },
  bluffing: {
    label: '虚张声势',
    icon: '🎭',
    color: 'text-purple-400',
    description: '装作从容，实际上比表面更急'
  },
  sincere: {
    label: '真诚',
    icon: '🕊️',
    color: 'text-gray-300',
    description: '所见即所得，开价即合理价'
  },
};

// ============================================================================
// Floor Hint Thresholds
// ============================================================================

/**
 * Thresholds for generating floor hints
 * Based on minimumAmount / desiredAmount ratio
 */
export const FLOOR_HINT_THRESHOLDS = {
  VERY_LOW: 0.5,    // < 50%: huge margin
  LOW: 0.75,        // 50-75%: some space
  MEDIUM: 0.9,      // 75-90%: close
  // > 90%: almost no margin
};

// ============================================================================
// Push-Pull Insight Modifiers (I-7)
// ============================================================================

/**
 * Concession probability modifiers when insight has been performed.
 * These are ADDED to the base concession chance.
 *
 * Design rationale:
 * - desperate: much easier to get concession (+20%)
 * - sincere: slightly easier (+5%)
 * - bluffing: moderately easier (+15%) - you see through the act
 * - firm: no change (0%) - knowing they're firm doesn't help
 */
export const INSIGHT_CONCESSION_MODIFIERS: Record<Disposition, number> = {
  desperate: 0.20,
  sincere: 0.05,
  bluffing: 0.15,
  firm: 0.00,
};
