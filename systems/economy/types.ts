
import { ReputationProfile } from '../core/types';
import { Item } from '../items/types';

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
  type: 'PAWN' | 'SELL' | 'RENT' | 'EXPENSE' | 'REWARD' | 'REDEEM' | 'EXTEND' | 'PENALTY' | 'CHARITY' | 'MEDICAL' | 'SURGERY' | 'UPGRADE';
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
}

// Three-level risk assessment per design doc Section 2.C
// SAFE: balance >= 500 (no display)
// WARNING: balance 0-499 (yellow hint - tight but survivable)
// CRITICAL: balance < 0 (red warning + shortfall amount)
export type RiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

// 500 buffer threshold: covers max random small expense (300) + safety margin
export const WARNING_THRESHOLD = 500;

export interface CalendarDayData {
  dayId: number;
  events: CalendarEvent[];
  projectedBalance: number; // End of day balance
  riskLevel: RiskLevel;
  isToday: boolean;
  isPast?: boolean;
}
