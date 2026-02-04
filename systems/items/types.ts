import type { ItemTag, ItemVariant, KnowledgePool } from './tags';
export type { ItemTag, ItemVariant, KnowledgePool };

// 物品加工状态（互斥）
export type WorkState = 'DEFAULT' | 'RESTORED' | 'REFORGED';

export enum ItemStatus {
  ACTIVE = 'ACTIVE',       // Formerly PAWNED. In vault, interest accruing.
  REDEEMED = 'REDEEMED',   // Customer paid back. Gone from inventory.
  FORFEIT = 'FORFEIT',     // Formerly DEFAULTED. Shop owns it now.
  SOLD = 'SOLD'            // Sold to third party.
}

export type TraitType = 'FLAW' | 'STORY' | 'FAKE';

export interface ItemTrait {
  id: string;
  name: string; // e.g. "非原装表带"
  type: TraitType;
  description: string;
  valueImpact: number; // e.g. -0.10 for -10%
  discoveryDifficulty: number; // 0.0 - 1.0 (Higher is harder to find)
  // Narrative Trigger
  dialogueTrigger?: {
      playerLine: string;       // Inner monologue when discovering (appraisal)
      customerLine: string;     // Customer's response
      playerUseLine?: string;   // Formal dialogue when using trait (negotiation)
  };
}

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

export interface PawnInfo {
  principal: number;     // Cash given to customer
  interestRate: number;  // Weekly rate (e.g., 0.05, 0.10, 0.20)
  startDate: number;     // Day ID
  termDays: number;      // Agreed term (e.g. 7, 14, 30)
  dueDate: number;       // startDate + termDays
  valuation: number;     // The agreed valuation basis for the contract
  extensionCount?: number; // How many times has this been extended?
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
  isSuspicious?: boolean;
  sentimentalValue: boolean;
  appraised: boolean;
  pawnDate: number;
  status: ItemStatus;

  // --- VALUATION SYSTEM ---
  pawnAmount: number;     // The amount actually paid (Loan Principal)
  pawnInfo?: PawnInfo;    // Detailed contract info

  realValue: number;      // The absolute truth
  perceivedValue?: number;// The illusion/anchor. Undefined means "Truth is known".
  uncertainty: number;    // 0.0 - 1.0

  currentRange: [number, number]; // [Min, Max]
  initialRange: [number, number]; // [Min, Max]

  hiddenTraits: ItemTrait[];    // Traits yet to be discovered
  revealedTraits: ItemTrait[];  // Traits found by player
  usedTraitIds: string[];       // Traits used in negotiation leverage (New)

  logs: ItemLogEntry[];

  // Appraisal State
  appraisalCount?: number;
  hasNegativeAppraisalEvent?: boolean;

  // Chain Linkage
  relatedChainId?: string; // Links item to a specific story chain

  // Logic Flags
  isVirtual?: boolean; // If true, item is never added to inventory

  // --- TAG & VARIANT SYSTEM (夜间玩法) ---
  tags?: ItemTag[];              // 当前标签列表
  variants?: ItemVariant[];      // 变体配置（预设的名字+描述组合）
  baseValue?: number;            // 基础价值（用于标签系数计算）

  // --- KNOWLEDGE POOL (格物系统) ---
  knowledgePool?: KnowledgePool; // 知识池（格物时提取点数）
  insightedTonight?: boolean;    // 今晚是否已格物（每夜重置）

  // --- WORKSHOP FLAGS (工作台系统) ---
  wasRestored?: boolean;         // 是否被修复过
  wasReforged?: boolean;         // 是否被重铸过（用于检测所有权冲突）
  workState?: WorkState;         // 加工状态（DEFAULT | RESTORED | REFORGED）

  // --- NAME & DESC VARIANTS (名称变体系统) ---
  nameDefault?: string;          // 默认名称（典当时）
  nameRestored?: string;         // 修复后名称
  nameReforged?: string;         // 重铸后名称
  descDefault?: string;          // 默认描述
  descRestored?: string;         // 修复后描述
  descReforged?: string;         // 重铸后描述

  // --- CSV TEMPLATE REFERENCE ---
  templateId?: string;           // 关联的 CSV 模板 ID

  // --- BREACH SALE TRACKING ---
  breachSaleDay?: number;        // Day item was sold as breach (while still ACTIVE)
}
