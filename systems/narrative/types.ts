
import { Item } from '../items/types';
import { Mood } from '../core/types';

export type SatisfactionLevel = 'GRATEFUL' | 'NEUTRAL' | 'RESENTFUL' | 'DESPERATE' | 'CONFLICTED';

// === POLICE INVESTIGATION TYPES ===
export interface PoliceInvestigationEvent {
    itemId: string;
    itemName: string;
}

// === EXPIRY SYSTEM TYPES ===
export type ExpiryBehavior = 'REDEEM' | 'RENEW' | 'NO_SHOW' | 'BREACH_DISCOVERED';

export interface ExpiryEvent {
    type: 'EXPIRY_CHECK';
    chainId: string;
    npcName: string;
    itemId: string;
    itemName: string;
    behavior: ExpiryBehavior;
    redemptionCost: {
        principal: number;
        interest: number;
        total: number;
    };
    valuation: number;      // 物品估值（用于计算拒绝赎回的赔偿金）
    interestRate: number;   // 利率（用于计算续当利息）
    realValue: number;      // 实际价值（用于 NO_SHOW 出售价格显示）
    dueDate: number;
    isCoreItem: boolean;    // 是否为核心物品（丢失会触发坏结局）
}

export type ExpiryChoice =
    | 'redeem_accept'      // 正常赎回
    | 'redeem_refuse'      // 拒绝赎回（需支付200%赔偿）
    | 'renew_accept'       // 同意续当（收取当期利息）
    | 'renew_refuse'       // 拒绝续当
    | 'noshow_sell'        // 挂牌出售
    | 'noshow_keep'        // 继续保留
    | 'breach_discovered'; // 违约被发现（客户来赎回发现物品已被卖掉）

export interface ExpiryFlowDefinition {
    // 赎回场景的玩家选项
    redemption?: {
        accept?: ChainUpdateEffect[];      // 正常赎回
        refuse?: ChainUpdateEffect[];      // 拒绝赎回
    };
    // 续当场景的玩家选项
    renewal?: {
        accept?: ChainUpdateEffect[];      // 同意续当
        refuse?: ChainUpdateEffect[];      // 拒绝续当
    };
    // 绝当场景的玩家选项
    noShow?: {
        sell?: ChainUpdateEffect[];        // 挂牌出售
        keep?: ChainUpdateEffect[];        // 继续保留
    };
}

// --- DIALOGUE SYSTEM ---
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

export interface ExitLines {
  grateful: string;
  neutral: string;
  resentful: string;
  desperate: string;
  conflicted?: string;
  // Silent variants (Actions instead of words)
  resentful_silent?: string;
  desperate_silent?: string;
  conflicted_silent?: string;
}

export interface TriggerCondition {
  variable: string; 
  operator: '>' | '<' | '>=' | '<=' | '==' | '%';
  value: number;
}

export interface DialogueVariant {
    condition?: TriggerCondition;
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
  exitDialogues?: {
      grateful: DialogueText;
      neutral: DialogueText;
      resentful: DialogueText;
      desperate: DialogueText;
      conflicted?: DialogueText;
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
  exitDialogues: ExitLines;
}

// --- MAIL SYSTEM ---
export type MailDelay = 'immediate' | 'standard' | 'slow' | 'surprise';

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
  delay?: MailDelay;  // 投递延迟级别，默认 'standard'
}

export interface MailInstance {
  uniqueId: string;
  templateId: string; 
  arrivalDay: number; 
  isRead: boolean;
  isClaimed: boolean; 
  metadata?: any; 
}

// --- SIMULATION RULES ---
export interface SimOperation {
  type: 'MOD_VAR' | 'SET_STAGE' | 'DEACTIVATE' | 'SCHEDULE_MAIL';
  target?: string; // e.g. "funds"
  value?: number;  // e.g. 150
  op?: 'ADD' | 'SUB' | 'SET'; 
  templateId?: string;
  delayDays?: number;
}

export interface RuleBase {
    condition?: TriggerCondition;
}

export interface RuleDelta extends RuleBase {
  type: 'DELTA';
  targetVar: string;
  value: number; 
  logMessage?: string;
}

export interface RuleChance extends RuleBase {
  type: 'CHANCE';
  chanceVar?: string; 
  chanceFixed?: number; 
  onSuccess: SimOperation[];
  onFail?: SimOperation[];
  successLog?: string; 
  failLog?: string; 
}

export interface RuleThreshold extends RuleBase {
  type: 'THRESHOLD';
  targetVar: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  onTrigger: SimOperation[];
  triggerLog?: string; 
}

export interface RuleCompound extends RuleBase {
    type: 'COMPOUND';
    sourceVar: string;      
    operator: '>' | '<' | '>=' | '<=' | '==';
    threshold: number;      
    targetVar: string;      
    effect: number;         
    cap?: { min?: number; max?: number };
    logMessage?: string;
}

export type SimRule = RuleDelta | RuleChance | RuleThreshold | RuleCompound;

export interface SimLogEntry {
    day: number;
    content: string;
    type: 'DAILY' | 'MILESTONE' | 'CRISIS';
}

// --- CHAIN STATE ---
export interface ChainVariables {
  [key: string]: any;
}

export interface FateHintDefinition {
    condition: TriggerCondition;
    hints: string[];
    priority: number;
}

export interface EventChainState {
  id: string;
  npcName: string;
  isActive: boolean;
  stage: number;
  variables: ChainVariables;
  simulationRules: SimRule[];
  simulationLog?: SimLogEntry[];
  fateHints?: FateHintDefinition[]; // NEW: Character specific hints

  // === 新增字段 ===
  chainType?: ChainType;                        // 'NARRATIVE' | 'TRANSIENT'，默认 'NARRATIVE'
  redemptionResolve?: 'Strong' | 'Medium' | 'Weak' | 'None'; // TRANSIENT 用于概率计算
  contractType?: ContractType;                  // 签订的合同类型
  renewalCount?: number;                        // 已续当次数（TRANSIENT）
}

// --- EFFECTS & EVENTS ---
export type EffectType =
  | 'SET_STAGE'
  | 'ADD_FUNDS_DEAL'
  | 'ADD_FUNDS'
  | 'MODIFY_VAR'
  | 'DEACTIVATE'
  | 'DEACTIVATE_CHAIN'
  | 'SCHEDULE_MAIL'
  | 'CONDITIONAL_MAIL'
  | 'MODIFY_REP'
  | 'TRIGGER_NEWS'
  | 'REDEEM_ALL'
  | 'REDEEM_TARGET_ONLY'
  | 'ABANDON_OTHERS'
  | 'ABANDON_ALL'
  | 'FORCE_SELL_ALL'
  | 'FORCE_SELL_TARGET'
  // === EXPIRY EFFECTS ===
  | 'REDEEM_ITEM'         // 赎回物品
  | 'EXTEND_PAWN'         // 续当延期
  | 'FORFEIT_ITEM'        // 物品绝当
  | 'SELL_ITEM'           // 出售物品
  | 'KEEP_FORFEIT'        // 保留绝当物品
  | 'MARK_CORE_LOST';     // 标记核心物品丢失 

export type ReputationAxis = 'humanity' | 'credibility' | 'innocence';

export interface ChainUpdateEffect {
  type: EffectType;
  variable?: string;
  value?: number;
  delta?: number;
  templateId?: string;
  delayDays?: number;
  id?: string;
  condition?: TriggerCondition;
  // === EXPIRY EFFECT PARAMS ===
  days?: number;           // 续当延期天数
  extraFee?: number;       // 额外费用百分比 (0.2 = 20%)
  // === REPUTATION EFFECT PARAMS ===
  axis?: ReputationAxis;   // 声誉轴（humanity/credibility/innocence），默认 humanity
}

// NEW: Explicit item condition for dynamicFlows
export interface ItemCondition {
  targetItemId?: string;           // 要检查的核心物品 ID（可选，默认使用 event.targetItemId）
  targetStatus: 'SAFE' | 'SOLD';   // 期望的核心物品状态
  otherItemsStatus?: 'ALL_SAFE' | 'ANY_LOST' | 'IRRELEVANT';  // 其他物品状态
}

export interface DynamicFlowOutcome {
  itemCondition?: ItemCondition;   // 显式条件（可选，用于明确匹配逻辑）
  dialogue: DialogueText;
  outcome: ChainUpdateEffect[];
}

export interface CustomerPortraits {
    neutral?: string;
    grateful?: string;
    resentful?: string;
    desperate?: string;
    angry?: string;
    conflicted?: string;
}

// Import and re-export BehaviorTag from npc/types for backward compatibility
import type { BehaviorTag } from '../npc/types';
export type { BehaviorTag };

// === 事件链类型 ===
export type ChainType = 'NARRATIVE' | 'TRANSIENT';

// === 合同类型 ===
export type ContractType = 'CHARITY' | 'AID' | 'STANDARD' | 'SHARK';

export interface CustomerTemplate {
    name: string;
    description: string;
    avatarSeed: string;
    portraits?: CustomerPortraits; // NEW: Specific emotional portraits
    dialogue: DialogueTemplate;
    redemptionResolve?: 'Strong' | 'Medium' | 'Weak' | 'None';

    // === 行为系统 ===
    behaviorTags?: BehaviorTag[];           // 新增
    patience?: number;
    mood?: Mood;

    // === 身份系统 ===
    identityTags?: string[];                // 替代 tags

    desiredAmount?: number;
    minimumAmount?: number;
    maxRepayment?: number;
    interactionType?: 'PAWN' | 'REDEEM' | 'NEGOTIATION';
    currentWallet?: number;
    currentAskPrice?: number;
    redemptionIntent?: 'REDEEM' | 'EXTEND' | 'LEAVE';
    item?: Partial<Item>;
    allowFreeRedeem?: boolean;
    pawnTermDays?: number;  // 自定义典当期限（默认7天）
}

// === INTERACTION TYPES ===

export type InteractionType = 'BORROW_REQUEST' | 'PURCHASE_OFFER' | 'RETURN_VISIT';

export interface Interaction {
    type: InteractionType;
    targetItemId?: string;      // 引用的真实物品 ID
    title: string;              // 显示标题
    description: string;        // 描述
    reason?: string;            // 顾客的理由
    note?: string;              // 备注（显示在鉴定区域）
    offerValue?: number;        // 收购出价（仅 PURCHASE_OFFER）
}

export interface StoryEvent {
  id: string;
  chainId: string;
  type?: 'STANDARD' | 'REDEMPTION_CHECK' | 'POST_FORFEIT_VISIT';

  triggerConditions: TriggerCondition[];

  template: CustomerTemplate;
  item?: Partial<Item>;
  interaction?: Interaction;    // 新增：与 item 互斥

  onComplete?: ChainUpdateEffect[];
  outcomes?: {
      [key: string]: ChainUpdateEffect[];
  };
  onReject?: ChainUpdateEffect[];
  onExtend?: ChainUpdateEffect[];
  onFailure?: ChainUpdateEffect[];
  failureMailId?: string;

  targetItemId?: string;
  dynamicFlows?: {
      [key: string]: DynamicFlowOutcome;
  };

  // === EXPIRY SYSTEM ===
  coreItemId?: string;              // 标记此事件关联的核心物品（丢失会触发坏结局）
  expiryFlows?: ExpiryFlowDefinition;  // 到期处理流程定义
}
