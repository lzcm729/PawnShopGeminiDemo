
import { Item } from '../items/types';
import { Mood } from '../core/types';

export type SatisfactionLevel = 'GRATEFUL' | 'NEUTRAL' | 'RESENTFUL' | 'DESPERATE';

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
  // Silent variants (Actions instead of words)
  resentful_silent?: string;
  desperate_silent?: string;
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
  | 'FORCE_SELL_TARGET'; 

export interface ChainUpdateEffect {
  type: EffectType;
  variable?: string; 
  value?: number;    
  delta?: number;
  templateId?: string; 
  delayDays?: number; 
  id?: string; 
  condition?: TriggerCondition;
}

export interface DynamicFlowOutcome {
  dialogue: DialogueText;
  outcome: ChainUpdateEffect[];
}

export interface CustomerPortraits {
    neutral?: string;
    grateful?: string;
    resentful?: string;
    desperate?: string;
    angry?: string;
}

export interface CustomerTemplate {
    name: string;
    description: string;
    avatarSeed: string;
    portraits?: CustomerPortraits; // NEW: Specific emotional portraits
    dialogue: DialogueTemplate; 
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
    item?: Partial<Item>; 
    allowFreeRedeem?: boolean; 
}

export interface StoryEvent {
  id: string; 
  chainId: string; 
  type?: 'STANDARD' | 'REDEMPTION_CHECK' | 'POST_FORFEIT_VISIT';
  
  triggerConditions: TriggerCondition[];
  
  template: CustomerTemplate; 
  item?: Partial<Item>; 
  
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
}
