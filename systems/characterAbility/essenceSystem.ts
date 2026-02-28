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
import { GAME_CONFIG } from '../game/config';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import essenceTextsCsv from '@/assets/data/texts/essence_system.csv?raw';

// ============================================================================
// Contract Tier Types
// ============================================================================

/**
 * Contract interest rate tiers that affect essence gain and reputation.
 * Six tiers from charitable to predatory, supporting continuous interest rates.
 */
export type ContractTier = 'CHARITY' | 'AID' | 'STANDARD' | 'ELEVATED' | 'HIGH' | 'SHARK';

/**
 * Map interest rate percentage to contract tier.
 * interestRate is in percentage form (e.g., 5 = 5%, not 0.05).
 *
 * 0%     = CHARITY  (恩惠)
 * 1%-4%  = AID      (公道)
 * 5%-9%  = STANDARD (精明)
 * 10%-14% = ELEVATED (偏高)
 * 15%-19% = HIGH     (贪婪)
 * 20%+   = SHARK    (掠夺)
 */
export function getContractTier(interestRate: number): ContractTier {
  if (interestRate <= 0) return 'CHARITY';
  if (interestRate < 5) return 'AID';
  if (interestRate < 10) return 'STANDARD';
  if (interestRate < 15) return 'ELEVATED';
  if (interestRate < 20) return 'HIGH';
  return 'SHARK';
}

// ============================================================================
// CSV Text Loading
// ============================================================================

interface EssenceTextRow {
  key: string;
  text: string;
}

const ESSENCE_TEXT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

let _textMap: Map<string, string> | null = null;

function getTextMap(): Map<string, string> {
  if (!_textMap) {
    _textMap = new Map();
    const rows = parseCSV<EssenceTextRow>(essenceTextsCsv, ESSENCE_TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });
    for (const row of rows) {
      if (row.key) _textMap.set(row.key, row.text);
    }
  }
  return _textMap;
}

function getText(key: string, fallback: string = ''): string {
  return getTextMap().get(key) ?? fallback;
}

// ============================================================================
// Tier Display Names (from CSV)
// ============================================================================

const TIER_NAME_KEYS: Record<ContractTier, string> = {
  CHARITY: 'CHARITY_NAME',
  AID: 'AID_NAME',
  STANDARD: 'STANDARD_NAME',
  ELEVATED: 'ELEVATED_NAME',
  HIGH: 'HIGH_NAME',
  SHARK: 'SHARK_NAME',
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
  const gains = GAME_CONFIG.ESSENCE.TIER_GAINS[tier] ?? { craft: 0, time: 0, vibe: 0 };
  const tierName = getText(TIER_NAME_KEYS[tier], tier);
  const reasonSuffix = getText('REASON_SUFFIX', '成交');

  return {
    craft: gains.craft,
    time: gains.time,
    vibe: gains.vibe,
    reason: `${tierName}${reasonSuffix}`,
  };
}

/**
 * Calculate essence gain from accepting stolen goods.
 */
export function calculateStolenGoodsEssenceGain(): TransactionEssenceGain {
  const gains = GAME_CONFIG.ESSENCE.STOLEN_GOODS_GAIN;

  return {
    craft: gains.craft,
    time: gains.time,
    vibe: gains.vibe,
    reason: getText('STOLEN_GOODS_REASON', '收购赃物'),
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
