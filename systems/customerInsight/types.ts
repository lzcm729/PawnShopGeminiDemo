/**
 * Customer Insight System Types (洞察客户系统)
 *
 * Allows players to "read" customer psychology during negotiation phase.
 * This is distinct from the nighttime item insight (格物) system.
 *
 * Design document: 洞察系统 (Customer Insight System).md
 */

import { BehaviorTag } from '../npc/types';

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
 */
export interface DispositionInfo {
  label: string;        // Chinese label
  icon: string;         // Emoji icon
  color: string;        // Tailwind color class
  description: string;  // Short description
}

// ============================================================================
// Insight Result
// ============================================================================

/**
 * Result of using customer insight ability
 */
export interface CustomerInsightResult {
  /** Detected psychological disposition */
  disposition: Disposition;

  /** Descriptive text about customer's psychological state */
  dispositionText: string;

  /** Hint about customer's price floor (bottom line) */
  floorHint: string;

  /** Moral context information (only for story customers) */
  moralContext: string | null;

  /** Amount of patience consumed (0 or 1) */
  patienceCost: number;
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

  /** Expected patience cost based on customer behavior */
  expectedPatienceCost: number;
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
 * BehaviorTags that cause patience loss when insight is used
 */
export const PATIENCE_COST_TAGS: BehaviorTag[] = ['STUBBORN', 'SUSPICIOUS', 'SAVVY'];

/**
 * Display information for each disposition
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
  VERY_LOW: 0.5,    // < 50%: "底线比表面价格低得多"
  LOW: 0.7,         // 50-70%: "有一定的谈判空间"
  MEDIUM: 0.9,      // 70-90%: "底线接近开口价"
  // > 90%: "几乎没有让步余地"
};
