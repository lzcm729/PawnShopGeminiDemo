
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
  type: 'PAWN' | 'SELL' | 'RENT' | 'EXPENSE' | 'REWARD' | 'REDEEM' | 'EXTEND' | 'PENALTY' | 'CHARITY';
}
