/**
 * Character Ability System - Essence Gain from Transactions
 *
 * Moral alignment bonus: transactions generate extra essence based on
 * the contract tier chosen. This creates a feedback loop where behavior
 * shapes ability growth.
 *
 * Design doc: v1.4 section 7 "精魄获取道德加成"
 */

import { TransactionEssenceGain } from './types';

// ============================================================================
// Contract Tier Types
// ============================================================================

/**
 * Contract interest rate tiers that affect essence gain.
 * These correspond to the game's InterestRate type.
 */
export type ContractTier = 'CHARITY' | 'AID' | 'STANDARD' | 'SHARK';

/**
 * Map interest rate percentage to contract tier.
 * 0% = Charity, 5% = Aid, 10% = Standard, 20% = Shark
 */
export function getContractTier(interestRate: number): ContractTier {
  if (interestRate <= 0) return 'CHARITY';
  if (interestRate <= 5) return 'AID';
  if (interestRate <= 10) return 'STANDARD';
  return 'SHARK';
}

// ============================================================================
// Essence Gain Table (Design doc v1.4 section 7)
// ============================================================================

/**
 * Essence gain from each contract tier.
 *
 * | Tier      | Craft | Time | Vibe | Notes                   |
 * |-----------|-------|------|------|-------------------------|
 * | Charity   |   0   |   0  |  +4  | Pure vibe gain          |
 * | Aid       |   0   |   0  |  +2  | Moderate vibe gain      |
 * | Standard  |  +2   |   0  |   0  | Craft gain              |
 * | Shark     |   0   |  +4  |   0  | Pure time gain          |
 */
const TIER_ESSENCE_GAINS: Record<ContractTier, { craft: number; time: number; vibe: number }> = {
  CHARITY:  { craft: 0, time: 0, vibe: 4 },
  AID:      { craft: 0, time: 0, vibe: 2 },
  STANDARD: { craft: 2, time: 0, vibe: 0 },
  SHARK:    { craft: 0, time: 4, vibe: 0 },
};

/** Essence gain from receiving stolen goods */
const STOLEN_GOODS_GAIN = { craft: 0, time: 2, vibe: 0 };

// ============================================================================
// Tier Display Names
// ============================================================================

const TIER_NAMES: Record<ContractTier, string> = {
  CHARITY: '慈善档(0%)',
  AID: '援助档(5%)',
  STANDARD: '标准档(10%)',
  SHARK: '高利贷档(20%)',
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Calculate essence gain from a completed transaction.
 *
 * @param interestRate The interest rate chosen (0, 5, 10, or 20)
 * @returns Essence gain breakdown
 */
export function calculateTransactionEssenceGain(interestRate: number): TransactionEssenceGain {
  const tier = getContractTier(interestRate);
  const gains = TIER_ESSENCE_GAINS[tier];

  return {
    ...gains,
    reason: `${TIER_NAMES[tier]}成交`,
  };
}

/**
 * Calculate essence gain from accepting stolen goods.
 */
export function calculateStolenGoodsEssenceGain(): TransactionEssenceGain {
  return {
    ...STOLEN_GOODS_GAIN,
    reason: '收购赃物',
  };
}

/**
 * Aggregate multiple essence gains into a single total.
 */
export function aggregateEssenceGains(gains: TransactionEssenceGain[]): TransactionEssenceGain {
  const total = { craft: 0, time: 0, vibe: 0 };
  const reasons: string[] = [];

  for (const gain of gains) {
    total.craft += gain.craft;
    total.time += gain.time;
    total.vibe += gain.vibe;
    if (gain.reason) reasons.push(gain.reason);
  }

  return {
    ...total,
    reason: reasons.join('; '),
  };
}
