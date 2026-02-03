
import { GamePhase, DailyStats, ReputationProfile } from '../core/types';
import { GamePhase2 } from '../core/phases';
import { Item } from '../items/types';
import { Customer } from '../npc/types';
import { TransactionRecord } from '../economy/types';
import { EventChainState, MailInstance, SatisfactionLevel, ExpiryEvent } from '../narrative/types';
import { ActiveNewsInstance, MarketModifier } from '../news/types';
import { EssenceBalance } from '../economy/essence';
import { ShopUpgradeState, AppointmentBoardState, AppointmentCandidate } from '../upgrades/types';
import { GameNode } from '../../types/node';
import { BlackmarketState } from '../blackmarket/types';

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
  /**
   * New state machine phase (migration period: coexists with `phase`)
   * Will replace `phase` after migration is complete.
   */
  phase2: GamePhase2;
  stats: DailyStats;
  reputation: ReputationProfile;
  inventory: Item[];
  currentCustomer: Customer | null;  // @deprecated Use currentNode instead
  currentNode: GameNode | null;      // NEW: Unified node interface for daytime interactions
  dayEvents: string[];
  todayTransactions: TransactionRecord[];
  customersServedToday: number;
  narrativeCustomersServedToday: number;  // Tracks narrative customers served (no limit)
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

  // === SHOP UPGRADES (典当行升级) ===
  shopUpgrades: ShopUpgradeState;          // 店铺设施升级状态
  showUpgradeShop: boolean;                // 升级商店界面显示状态
  showFacilityControl: boolean;            // 设施开关控制界面显示状态

  // === APPOINTMENT BOARD (预约板系统) ===
  appointmentBoard: AppointmentBoardState; // 预约板状态
  showAppointmentBoard: boolean;           // 预约板界面显示状态
  pendingAppointedCandidates: AppointmentCandidate[];  // 今日待接待的预约客户候选

  // === BLACK MARKET (黑市系统) ===
  blackmarket: BlackmarketState;           // 黑市状态（热度、每日收购、锁定）
  showBlackmarket: boolean;                // 黑市界面显示状态

  // === NIGHT PANELS (夜间面板) ===
  showWorkshop: boolean;                   // 工作台面板显示状态
  showInsight: boolean;                    // 格物面板显示状态

  // === PENDING ITEM SELECTION (待选中物品) ===
  pendingSelectedItemId: string | null;    // 从库存跳转时预选的物品ID
}
