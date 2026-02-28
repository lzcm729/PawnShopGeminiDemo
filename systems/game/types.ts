
import { DailyStats, ReputationProfile, MoraleBuff } from '../core/types';
import { GamePhase } from '../core/phases';
import { Item } from '../items/types';
import { Customer } from '../npc/types';
import { TransactionRecord } from '../economy/types';
import { TransactionFeedback } from '../npc/fillerGenerator';
import { EventChainState, MailInstance, SatisfactionLevel, DepartureSatisfaction, ExpiryEvent, PoliceInvestigationEvent, NpcFateEntry } from '../narrative/types';
import { ActiveNewsInstance, MarketModifier, PendingNewsItem } from '../news/types';
import { EssenceBalance } from '../economy/essence';
import { InProgressRecipe, ForgeryNotorietyState, ReturnResult } from '../workshop/types';
import { ShopUpgradeState, AppointmentBoardState, AppointmentCandidate } from '../upgrades/types';
import { GameNode } from '../../types/node';
import { BlackmarketState } from '../blackmarket/types';
import { CustomerInsightResult, InsightTrainingResult, ForesightInfo } from '../customerInsight';
import { ItemDerivedEvent } from '../npc/types';
import { DailyChallenge } from './dailyChallenge';
import { DailySchedule } from '../npc/customerScheduler';
import { AbilityState, ConsequenceFlashResult } from '../characterAbility/types';

// === NIGHT PHASE TYPES ===
export interface NightState {
  energy: number;              // 当前精力
  maxEnergy: number;           // 精力上限
  actionsThisNight: string[];  // 本夜已执行的操作
  energyLevel: number;         // 精力等级 (0-indexed: 0=3, 1=4, 2=5)
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
  interestRate: number;  // Decimal fraction (0, 0.05, 0.10, 0.20) for skill eligibility checks
  merchantMonologue?: string;  // Filler customer merchant monologue (v2.1 Section 10)
  transactionFeedback?: TransactionFeedback;  // Redemption rate impact feedback (v2.1)
}

export interface GameState {
  /**
   * Game phase represented as a discriminated union.
   * Includes subphase information for more precise state tracking.
   */
  phase: GamePhase;
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
  pendingNews: PendingNewsItem[];         // v1.2: 延迟/溢出新闻队列
  
  financialHistory: DailyFinancialSnapshot[]; // History of past days
  
  lastSatisfaction: SatisfactionLevel | null; // Tracks the emotional outcome of the last deal
  lastDepartureSatisfaction: DepartureSatisfaction | null; // Scene-specific departure satisfaction for UI
  lastDealSummary: DealSummary | null; // Summary of the last deal for departure view
  activeMilestones: string[];

  // === EXPIRY SYSTEM ===
  currentExpiryEvent: ExpiryEvent | null;  // 当前正在处理的到期事件
  expiryQueue: ExpiryEvent[];              // 待处理的到期事件队列
  coreLostItems: string[];                 // 已丢失的核心物品 ID 列表
  unseenForfeitItemIds: string[];           // 未查看的绝当物品ID列表（红点提示用）

  // === NIGHT PHASE (夜间玩法) ===
  essenceBalance: EssenceBalance;          // 精魄余额（匠心/旧影/灵韵）
  nightState: NightState;                  // 夜间状态（精力/已执行操作）
  inProgressRecipes: InProgressRecipe[];   // 进行中的多夜工序

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

  // === FORGERY NOTORIETY (伪造声名系统) ===
  forgeryNotoriety: ForgeryNotorietyState; // 伪造声名追踪（累计次数、鉴伪概率）

  // === NIGHT PANELS (夜间面板) ===
  showWorkshop: boolean;                   // 工作台面板显示状态
  showInsight: boolean;                    // 格物面板显示状态

  // === PENDING ITEM SELECTION (待选中物品) ===
  pendingSelectedItemId: string | null;    // 从库存跳转时预选的物品ID

  // === CUSTOMER INSIGHT (洞察客户) ===
  currentCustomerInsight: CustomerInsightResult | null;  // 当前客户的洞察结果
  currentForesightInfo: ForesightInfo | null;  // 洞若观火预测结果（洞察时生成，送客界面显示）
  lastInsightTrainingResult: InsightTrainingResult | null;  // 上一次交易的洞察训练反馈（夜间复盘用）

  // === POLICE INVESTIGATION (警方调查) ===
  currentPoliceInvestigation: PoliceInvestigationEvent | null;  // 当前警方调查事件

  // === ITEM-DERIVED EVENTS (统一物品衍生节点: 窃贼忏悔/原物主认领/收藏家收购) ===
  currentItemDerivedEvent: ItemDerivedEvent | null;

  // === DAILY CHALLENGE (每日挑战 v2.1) ===
  dailyChallenge: DailyChallenge | null;
  rejectedCustomersToday: number;        // Track rejected customers for challenge
  hadMistakeToday: boolean;              // Track if any 打眼 occurred today
  hadHighRiskItemToday: boolean;         // Track if accepted high-risk item today

  // === CUSTOMER SCHEDULE (出场顺序 v2.1) ===
  dailyCustomerSchedule: DailySchedule | null;
  scheduleSlotIndex: number;             // Current slot being served

  // === CHARACTER ABILITY (人物能力升级系统) ===
  abilityState: AbilityState;               // 修行系统状态
  showAbilityPanel: boolean;                // 修行面板显示状态
  lastConsequenceFlash: ConsequenceFlashResult | null;  // 因果自见：上次交易后的后果闪念

  // === MORALE BUFF (探望 → 次日心态) ===
  moraleBuff: MoraleBuff | null;

  // === MORAL ECHO (道德回声) ===
  /** Pending monologue/NPC reaction echo texts from moral echo delivery */
  pendingEchoTexts: { channel: 'MONOLOGUE' | 'NPC_REACTION'; text: string }[];

  // === NPC FATE LOG (Victory Screen: Bitter Victory) ===
  npcFateLog: NpcFateEntry[];

  // === WORKSHOP (工作台归还结果) ===
  lastReturnResult: ReturnResult | null; // 最近一次重铸归还结果（DepartureView 显示用）
  workshopUsageCount: number;           // 工作台累计使用次数（用于渐退脚手架）

  // === WORD OF MOUTH REFERRAL (口口相传推荐客户) ===
  pendingReferralCustomer: boolean;  // 次日是否有推荐客户到来

  // === CULTIVATION LOCK (修行锁定) ===
  cultivationLocked: boolean;  // true = 技能树可查看但不可学习

  // === MORAL QUAKE (道德地震) ===
  /** Tracks first-time rate tier crossings for moral quake events */
  moralQuakeTriggered: { HIGH: boolean; SHARK: boolean };

  // === DEBUG FLAGS ===
  debugRevealFloor: boolean;  // 调试：显示客户底价
  debugDisableFiller: boolean;  // 调试：禁用填充客户生成
}
