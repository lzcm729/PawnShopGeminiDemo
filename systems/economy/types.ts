
import { ReputationProfile } from '../core/types';
import { Item } from '../items/types';
import { GAME_CONFIG } from '../game/config';

export type InterestRate = 0 | 0.05 | 0.10 | 0.20;

export interface TransactionResult {
  success: boolean;
  message: string;
  cashDelta: number;
  reputationDelta: Partial<ReputationProfile>;
  item?: Item;
  dealQuality?: 'fair' | 'fleeced' | 'premium';
  terms?: { principal: number; rate: number };
}

export interface TransactionRecord {
  id: string;
  description: string;
  amount: number;
  type: 'PAWN' | 'SELL' | 'RENT' | 'EXPENSE' | 'REWARD' | 'REDEEM' | 'EXTEND' | 'PENALTY' | 'CHARITY' | 'MEDICAL' | 'SURGERY' | 'UPGRADE' | 'MAINTENANCE';
}

// --- FINANCIAL PROJECTION SYSTEM ---

export type CalendarEventType = 'BILL' | 'INCOME_POTENTIAL' | 'STORY_MOMENT' | 'MAIL' | 'ITEM_DUE';

// Certainty tier for soft income (redemption payments)
// Derived from NPC redemptionResolve in EventChainState
export type IncomeCertainty = 'HIGH' | 'MEDIUM' | 'LOW';

// Weight applied to soft income when calculating projected balance
export const CERTAINTY_WEIGHTS: Record<IncomeCertainty, number> = {
  HIGH: 1.0,    // STRONG resolve -> full amount counted
  MEDIUM: 0.5,  // MEDIUM resolve -> half amount counted
  LOW: 0.0      // WEAK/NONE resolve -> not counted
};

export interface CalendarEvent {
  type: CalendarEventType;
  amount: number; // Positive for income, Negative for expense
  label: string;
  isCertain: boolean; // True for Bills, False for Redemptions
  relatedId?: string;
  wasReforged?: boolean; // True if the related item has been reforged
  certainty?: IncomeCertainty; // Soft income certainty tier (S2-F2/F4)
  tooltip?: string; // Per-marker gameplay-impact tooltip (STORY_MOMENT events)
}

// Three-level risk assessment per design doc Section 2.C
// SAFE: balance >= 500 (no display)
// WARNING: balance 0-499 (yellow hint - tight but survivable)
// CRITICAL: balance < 0 (red warning + shortfall amount)
export type RiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

// Buffer threshold: covers max random small expense + safety margin
export const WARNING_THRESHOLD = GAME_CONFIG.ECONOMY.WARNING_THRESHOLD;

export interface CalendarDayData {
  dayId: number;
  events: CalendarEvent[];
  projectedBalance: number; // End of day balance
  riskLevel: RiskLevel;
  isToday: boolean;
  isPast?: boolean;
}

// --- PROFIT CALCULATION SYSTEM (B-14) ---

/**
 * Unified profit calculation structure for item-level P&L analysis.
 * Used by filler generator, financial projection, and inventory analytics.
 */
export interface ProfitCalculation {
  /** Cash given to customer (loan principal) */
  pawnAmount: number;
  /** Actual or projected sale price */
  salePrice: number;
  /** Accumulated storage cost (daily rate * days held) */
  storageCost: number;
  /** Workshop costs (repair/reforge/counterfeit) */
  workshopCost: number;
  /** Gross profit = salePrice - pawnAmount */
  grossProfit: number;
  /** Net profit = grossProfit - storageCost - workshopCost */
  netProfit: number;
  /** Profit margin = netProfit / pawnAmount (0 if pawnAmount is 0) */
  profitMargin: number;
}

/**
 * Calculate profit metrics for an item transaction.
 *
 * @param pawnAmount   Cash given to customer (loan principal)
 * @param salePrice    Actual or projected sale price
 * @param storageCost  Accumulated storage cost (default 0)
 * @param workshopCost Workshop processing cost (default 0)
 * @returns Complete ProfitCalculation with derived fields
 */
export function calculateProfit(
  pawnAmount: number,
  salePrice: number,
  storageCost: number = 0,
  workshopCost: number = 0
): ProfitCalculation {
  const grossProfit = salePrice - pawnAmount;
  const netProfit = grossProfit - storageCost - workshopCost;
  const profitMargin = pawnAmount > 0 ? netProfit / pawnAmount : 0;

  return {
    pawnAmount,
    salePrice,
    storageCost,
    workshopCost,
    grossProfit,
    netProfit,
    profitMargin,
  };
}
