
import { GamePhase, DailyStats, ReputationProfile } from '../core/types';
import { Item } from '../items/types';
import { Customer } from '../npc/types';
import { TransactionRecord } from '../economy/types';
import { EventChainState, MailInstance, SatisfactionLevel, ExpiryEvent } from '../narrative/types';
import { ActiveNewsInstance, MarketModifier } from '../news/types';
import { EssenceBalance } from '../economy/essence';

// === NIGHT PHASE TYPES ===
export interface NightState {
  energy: number;              // 当前精力
  maxEnergy: number;           // 精力上限
  actionsThisNight: string[];  // 本夜已执行的操作
}

export interface DailyFinancialSnapshot {
  day: number;
  startingCash: number;
  endingCash: number;
  netChange: number;
  events: { type: 'INCOME' | 'EXPENSE'; amount: number; label: string }[];
}

// Summary of a completed deal for display in departure view
export interface DealSummary {
  cashDelta: number;
  reputationDelta: Partial<ReputationProfile>;
  itemName: string;
  itemCategory: string;
  dealQuality: 'fleeced' | 'fair' | 'premium';
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
  showFinancials: boolean; 
  showMedical: boolean; 
  showVisit: boolean; // New Flag for Hospital Visit
  activeChains: EventChainState[]; 
  inbox: MailInstance[];
  pendingMails: MailInstance[];
  completedScenarioIds: string[];
  
  dailyNews: ActiveNewsInstance[]; 
  activeMarketEffects: MarketModifier[]; 
  violationFlags: string[]; 
  
  financialHistory: DailyFinancialSnapshot[]; // History of past days
  
  lastSatisfaction: SatisfactionLevel | null; // Tracks the emotional outcome of the last deal
  lastDealSummary: DealSummary | null; // Summary of the last deal for departure view
  activeMilestones: string[];

  // === EXPIRY SYSTEM ===
  currentExpiryEvent: ExpiryEvent | null;  // 当前正在处理的到期事件
  expiryQueue: ExpiryEvent[];              // 待处理的到期事件队列
  coreLostItems: string[];                 // 已丢失的核心物品 ID 列表

  // === NIGHT PHASE (夜间玩法) ===
  essenceBalance: EssenceBalance;          // 精魄余额（匠心/旧影/灵韵）
  nightState: NightState;                  // 夜间状态（精力/已执行操作）
}
