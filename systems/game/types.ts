
import { GamePhase, DailyStats, ReputationProfile } from '../core/types';
import { Item } from '../items/types';
import { Customer } from '../npc/types';
import { TransactionRecord } from '../economy/types';
import { EventChainState, MailInstance, SatisfactionLevel } from '../narrative/types';
import { ActiveNewsInstance, MarketModifier } from '../news/types';

export interface DailyFinancialSnapshot {
  day: number;
  startingCash: number;
  endingCash: number;
  netChange: number;
  events: { type: 'INCOME' | 'EXPENSE'; amount: number; label: string }[];
}

export interface GameState {
  phase: GamePhase;
  stats: DailyStats;
  reputation: ReputationProfile;
  inventory: Item[];
  currentCustomer: Customer | null;
  dayEvents: string[]; 
  todayTransactions: TransactionRecord[]; 
  customersServedToday: number;
  maxCustomersPerDay: number;
  isLoading: boolean;
  showInventory: boolean;
  showMail: boolean; 
  showDebug: boolean; 
  showFinancials: boolean; // New Flag for Calendar
  activeChains: EventChainState[]; 
  inbox: MailInstance[];
  pendingMails: MailInstance[];
  completedScenarioIds: string[];
  
  dailyNews: ActiveNewsInstance[]; 
  activeMarketEffects: MarketModifier[]; 
  violationFlags: string[]; 
  
  financialHistory: DailyFinancialSnapshot[]; // History of past days
  
  lastSatisfaction: SatisfactionLevel | null; // Tracks the emotional outcome of the last deal
}
