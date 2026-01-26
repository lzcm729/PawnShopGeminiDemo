
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
      playerLine: string;
      customerLine: string;
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
}
