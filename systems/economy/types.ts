
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
  type: 'PAWN' | 'SELL' | 'RENT' | 'EXPENSE' | 'REWARD' | 'REDEEM' | 'EXTEND' | 'PENALTY' | 'CHARITY' | 'MEDICAL' | 'SURGERY';
}

// --- FINANCIAL PROJECTION SYSTEM ---

export type CalendarEventType = 'BILL' | 'INCOME_POTENTIAL' | 'NARRATIVE';

export interface CalendarEvent {
  type: CalendarEventType;
  amount: number; // Positive for income, Negative for expense
  label: string;
  isCertain: boolean; // True for Bills, False for Redemptions
  relatedId?: string;
}

export interface CalendarDayData {
  dayId: number;
  events: CalendarEvent[];
  projectedBalance: number; // End of day balance
  riskLevel: 'SAFE' | 'CRITICAL';
  isToday: boolean;
  isPast?: boolean;
}
