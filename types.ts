

export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  MORNING_BRIEF = 'MORNING_BRIEF',
  TRADING = 'TRADING',
  NEGOTIATION = 'NEGOTIATION',
  SHOP_CLOSED = 'SHOP_CLOSED', 
  END_OF_DAY = 'END_OF_DAY',
  GAME_OVER = 'GAME_OVER'
}

export enum ReputationType {
  HUMANITY = 'Humanity', // Heart - Empathy
  CREDIBILITY = 'Credibility', // Business - Professionalism
  UNDERWORLD = 'Underworld' // Shadow - Illicit
}

// NEW: Core Business Lifecycle States
export enum ItemStatus {
  ACTIVE = 'ACTIVE',       // Formerly PAWNED. In vault, interest accruing.
  REDEEMED = 'REDEEMED',   // Customer paid back. Gone from inventory.
  FORFEIT = 'FORFEIT',     // Formerly DEFAULTED. Shop owns it now.
  SOLD = 'SOLD'            // Sold to third party.
}

// NEW: Appraisal System Types
export type TraitType = 'FLAW' | 'STORY' | 'FAKE';

export interface ItemTrait {
  id: string;
  name: string; // e.g. "非原装表带"
  type: TraitType;
  description: string;
  valueImpact: number; // e.g. -0.10 for -10%
  discoveryDifficulty: number; // 0.0 - 1.0 (Higher is harder to find)
  // NEW: Narrative Trigger
  dialogueTrigger?: {
      playerLine: string;
      customerLine: string;
  };
}

// NEW: Narrative Log System
export interface ItemLogEntry {
  id: string;
  day: number;
  content: string;
  type: 'ENTRY' | 'REDEEM' | 'FORFEIT' | 'SOLD' | 'INFO' | 'APPRAISAL';
  metadata?: {
      visitCount?: number;
      moodState?: string;
      // REDEEM related
      payment?: number;
      // SOLD related
      amount?: number;
      // General
      reason?: string;
      // APPRAISAL related
      isNegative?: boolean;
  };
}

// NEW: Contract Information
export interface PawnInfo {
  principal: number;     // Cash given to customer
  interestRate: number;  // Weekly rate (e.g., 0.05, 0.10, 0.20)
  startDate: number;     // Day ID
  termDays: number;      // Agreed term (e.g. 7, 14, 30)
  dueDate: number;       // startDate + termDays
  valuation: number;     // NEW: The agreed valuation basis for the contract (used for penalty calc)
  extensionCount?: number; // NEW: How many times has this been extended?
}

export interface Item {
  id: string;
  name: string;
  category: string;
  condition: string;
  visualDescription: string;
  historySnippet: string;
  appraisalNote: string;
  archiveSummary: string;
  
  isStolen: boolean;
  isFake: boolean;
  isSuspicious?: boolean; // NEW: Triggers underworld events
  sentimentalValue: boolean;
  appraised: boolean; 
  pawnDate: number; 
  status: ItemStatus;

  // --- NEW VALUATION SYSTEM ---
  pawnAmount: number;     // The amount actually paid (Loan Principal) - Legacy field, kept for compatibility, sync with pawnInfo.principal
  pawnInfo?: PawnInfo;    // NEW: Detailed contract info
  
  realValue: number;      // The absolute truth (Used for Liquidation/End Game)
  perceivedValue?: number;// The illusion/anchor. Undefined means "Truth is known".
  uncertainty: number;    // 0.0 - 1.0. Width of the range relative to anchor.
  
  currentRange: [number, number]; // [Min, Max] - Runtime generated
  initialRange: [number, number]; // [Min, Max] - Frozen at start for UI comparison
  
  hiddenTraits: ItemTrait[];    // Traits yet to be discovered
  revealedTraits: ItemTrait[];  // Traits found by player
  
  logs: ItemLogEntry[]; // NEW: Narrative History Logs
  
  // NEW: Appraisal State
  appraisalCount?: number;
  hasNegativeAppraisalEvent?: boolean;

  // NEW: Chain Linkage
  relatedChainId?: string; // Links item to a specific story chain (e.g., "chain_emma")
  
  // NEW: Logic Flags
  isVirtual?: boolean; // If true, item is never added to inventory (used for checks/narrative only)
}

export interface RejectionLines {
  standard: string; 
  angry: string;    
  desperate?: string; 
}

export interface AcceptedLines {
  fair: string;     
  fleeced: string;  
  premium: string;  
}

// DYNAMIC DIALOGUE SYSTEM
export interface DialogueVariant {
    condition: TriggerCondition;
    text: string;
}

export type DialogueText = string | DialogueVariant[];

export interface DialogueTemplate {
  greeting: DialogueText;
  pawnReason: DialogueText;
  redemptionPlea: DialogueText;
  negotiationDynamic: DialogueText;
  accepted: {
      fair: DialogueText;
      fleeced: DialogueText;
      premium: DialogueText;
  };
  rejected: DialogueText;
  rejectionLines: {
      standard: DialogueText;
      angry: DialogueText;
      desperate?: DialogueText;
  };
}

export interface Dialogue {
  greeting: string;
  pawnReason: string;
  redemptionPlea: string;
  negotiationDynamic: string;
  accepted: AcceptedLines; 
  rejected: string; 
  rejectionLines: RejectionLines;
}

export type Mood = 'Happy' | 'Neutral' | 'Annoyed' | 'Angry';

export type InterestRate = 0 | 0.05 | 0.10 | 0.20;

export interface Customer {
  id: string;
  name: string;
  description: string;
  avatarSeed: string;
  dialogue: Dialogue;
  redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None'; 
  negotiationStyle: 'Aggressive' | 'Desperate' | 'Professional' | 'Deceptive';
  patience: number; 
  mood: Mood; 
  tags: string[]; 
  item: Item;
  
  desiredAmount: number; 
  minimumAmount: number; 
  maxRepayment: number;  
  
  // NEW: Redemption Logic Fields
  interactionType: 'PAWN' | 'REDEEM' | 'NEGOTIATION'; 
  redemptionIntent?: 'REDEEM' | 'EXTEND' | 'LEAVE'; // What the customer WANTS to do based on their wallet

  currentWallet?: number; // How much cash the customer has on hand for redemption
  
  currentAskPrice?: number; 
  
  chainId?: string; 
  eventId?: string; 
  
  // NEW: Narrative Recap Log (What happened to them while they were gone)
  recapLog?: SimLogEntry[];
  
  // NEW: Special Redemption Options
  allowFreeRedeem?: boolean;
}

export interface DailyStats {
  day: number;
  cash: number;
  rentDue: number;
  rentDueDate: number;
  dailyExpenses: number; 
  actionPoints: number; // NEW: Resource for appraisal
  maxActionPoints: number; // NEW: Daily cap (e.g., 5 or 10)
}

export interface ReputationProfile {
  [ReputationType.HUMANITY]: number;
  [ReputationType.CREDIBILITY]: number;
  [ReputationType.UNDERWORLD]: number;
}

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

// Mail & Event Types remain unchanged...
export interface MailAttachment {
  cash?: number;
  item?: Item;
}

export interface MailTemplate {
  id: string;
  sender: string;
  subject: string;
  body: string;
  attachments?: MailAttachment;
}

export interface MailInstance {
  uniqueId: string;
  templateId: string; 
  arrivalDay: number; 
  isRead: boolean;
  isClaimed: boolean; 
  metadata?: any; // Changed from specific object to any for flexibility
}

export interface ChainVariables {
  [key: string]: any; // Changed to any to support storing itemIds strings
}

// --- NEW SIMULATION RULES SYSTEM ---

export interface SimOperation {
  type: 'MOD_VAR' | 'SET_STAGE' | 'DEACTIVATE' | 'SCHEDULE_MAIL';
  target?: string; // e.g. "funds", "job_chance"
  value?: number;  // e.g. 150, 1
  op?: 'ADD' | 'SUB' | 'SET'; // Default 'ADD' for numeric vars
  templateId?: string; // used for SCHEDULE_MAIL
  delayDays?: number; // used for SCHEDULE_MAIL
}

export interface RuleDelta {
  type: 'DELTA';
  targetVar: string;
  value: number; // e.g. -150
  logMessage?: string; // Optional: Log this change if it happens
}

export interface RuleChance {
  type: 'CHANCE';
  chanceVar?: string; // Read probability from this variable
  chanceFixed?: number; // Or use this fixed probability
  onSuccess: SimOperation[];
  onFail?: SimOperation[];
  successLog?: string; // Log message on success
  failLog?: string; // Log message on fail
}

export interface RuleThreshold {
  type: 'THRESHOLD';
  targetVar: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  onTrigger: SimOperation[];
  triggerLog?: string; // Log message when triggered
}

export interface RuleCompound {
    type: 'COMPOUND';
    sourceVar: string;      // IF hope
    operator: '>' | '<' | '>=' | '<=' | '==';
    threshold: number;      // < 30
    targetVar: string;      // THEN job_chance
    effect: number;         // += -5
    logMessage?: string;
}

export type SimRule = RuleDelta | RuleChance | RuleThreshold | RuleCompound;

export interface SimLogEntry {
    day: number;
    content: string;
    type: 'DAILY' | 'MILESTONE' | 'CRISIS';
}

export interface EventChainState {
  id: string; 
  npcName: string;
  isActive: boolean;
  stage: number; 
  variables: ChainVariables;
  simulationRules: SimRule[]; // NEW: The engine driving the NPC's life
  simulationLog?: SimLogEntry[]; // NEW: Backstage history
}

// -----------------------------------

export interface TriggerCondition {
  variable: string; 
  operator: '>' | '<' | '>=' | '<=' | '==' | '%';
  value: number;
}

export type EffectType = 
  | 'SET_STAGE' 
  | 'ADD_FUNDS_DEAL' // Funds += Transaction Cash
  | 'ADD_FUNDS' // Funds += Specific Amount (not used often, mostly ADD_FUNDS_DEAL)
  | 'MODIFY_VAR' 
  | 'DEACTIVATE' 
  | 'DEACTIVATE_CHAIN' // Alias for DEACTIVATE
  | 'SCHEDULE_MAIL'
  | 'MODIFY_REP' // Direct rep modification
  | 'TRIGGER_NEWS'
  // NEW REDEMPTION ACTIONS
  | 'REDEEM_ALL'
  | 'REDEEM_TARGET_ONLY'
  | 'ABANDON_OTHERS'
  | 'ABANDON_ALL'
  | 'FORCE_SELL_ALL' // NEW: Mark all chain items as SOLD
  | 'FORCE_SELL_TARGET'; // NEW: Mark target item as SOLD

export interface ChainUpdateEffect {
  type: EffectType;
  variable?: string; // used for MODIFY_VAR
  value?: number;    // used for SET_STAGE, MODIFY_VAR
  templateId?: string; // used for SCHEDULE_MAIL
  delayDays?: number; // used for SCHEDULE_MAIL, defaults to 0
  id?: string; // used for TRIGGER_NEWS
}

// NEW: Structure for Dynamic Redemption Logic
export interface DynamicFlowOutcome {
  dialogue: string;
  outcome: ChainUpdateEffect[];
}

// Interface for Defining Story Events in Data files (supports dynamic dialogue definitions)
export interface CustomerTemplate {
    name: string;
    description: string;
    avatarSeed: string;
    dialogue: DialogueTemplate; // Uses flexible DialogueTemplate
    redemptionResolve?: 'Strong' | 'Medium' | 'Weak' | 'None';
    negotiationStyle?: 'Aggressive' | 'Desperate' | 'Professional' | 'Deceptive';
    patience?: number;
    mood?: Mood;
    tags?: string[];
    desiredAmount?: number;
    minimumAmount?: number;
    maxRepayment?: number;
    interactionType?: 'PAWN' | 'REDEEM' | 'NEGOTIATION';
    currentWallet?: number;
    currentAskPrice?: number;
    redemptionIntent?: 'REDEEM' | 'EXTEND' | 'LEAVE';
    item?: Partial<Item>; // Added item to template as it was used in instantiation
    allowFreeRedeem?: boolean; // NEW: Allow returning for free
}

export interface StoryEvent {
  id: string; 
  chainId: string; 
  // NEW: Special event type for advanced logic
  type?: 'STANDARD' | 'REDEMPTION_CHECK' | 'POST_FORFEIT_VISIT';
  
  triggerConditions: TriggerCondition[];
  
  // Standard Event Props
  template: CustomerTemplate; 
  item?: Partial<Item>; // Base item template to merge
  
  // Logic
  onComplete?: ChainUpdateEffect[]; // Fallback generic completion
  outcomes?: {
      [key: string]: ChainUpdateEffect[]; // Mapped by deal type: "deal_charity", "deal_standard", etc.
  };
  onReject?: ChainUpdateEffect[];
  onExtend?: ChainUpdateEffect[]; // NEW: Effect to run when player extends the pawn
  onFailure?: ChainUpdateEffect[]; // NEW: Effect to run when automated checks fail (e.g. Plea Mail sent)
  failureMailId?: string; // NEW: Mail to send if redemption fails and cannot extend

  // Redemption Specifics
  targetItemId?: string; 
  dynamicFlows?: {
      [key: string]: DynamicFlowOutcome; // "all_safe", "core_lost", etc.
  };
}

// --- NEWS & RUMOR SYSTEM ---

export enum NewsCategory {
  NARRATIVE = 'NARRATIVE', // 剧情回响 (High Priority)
  MARKET = 'MARKET',       // 商业情报 (Medium Priority, affects prices)
  FLAVOR = 'FLAVOR'        // 环境噪音 (Low Priority, world building)
}

export interface MarketModifier {
  categoryTarget?: string; // e.g. "电子产品", "All"
  priceMultiplier?: number; // e.g. 0.8 (Depreciation), 1.2 (Appreciation)
  riskModifier?: number; // e.g. +20 (Police risk increase)
  actionPointsModifier?: number; // NEW: Flavor text having real gameplay impact (Rain = tired = less AP)
}

export interface NewsItem {
  id: string;
  headline: string; // Title
  body: string; // Content
  category: NewsCategory;
  priority: number; // 100=Critical Narrative, 50=Market, 10=Flavor
  triggers: TriggerCondition[]; // Uses same logic as StoryEvent
  effect?: MarketModifier; // Optional market impact
  duration: number; // How many days it stays active/effective
}

export interface ActiveNewsInstance extends NewsItem {
  daysRemaining: number;
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
  activeChains: EventChainState[]; 
  inbox: MailInstance[];
  pendingMails: MailInstance[];
  completedScenarioIds: string[];
  
  // NEW: News System State
  dailyNews: ActiveNewsInstance[]; // The news shown TODAY
  activeMarketEffects: MarketModifier[]; // Flattened list of active modifiers
}