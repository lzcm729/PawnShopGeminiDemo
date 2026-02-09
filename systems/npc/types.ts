
import { Item } from '../items/types';
import { Mood, BehaviorTag } from '../core/types';
import { Dialogue, SimLogEntry, CustomerPortraits } from '../narrative/types';

// Re-export BehaviorTag for backward compatibility
export type { BehaviorTag };

export interface RenewalProposal {
    itemId: string;
    itemName: string;
    currentDueDate: number;
    proposedExtensionDays: number;
    currentInterestRate: number;
    proposedInterestBonus: number; // e.g. 0.05 for +5%
}

export interface Customer {
  id: string;
  name: string;
  description: string;
  avatarSeed: string;
  portraits?: CustomerPortraits;
  dialogue: Dialogue;
  redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None';

  // === 行为系统（统一） ===
  behaviorTags: BehaviorTag[];           // 替代 negotiationStyle
  patience: number;
  mood: Mood;

  // === 身份系统（分离） ===
  identityTags: string[];                // 替代混用的 tags

  item: Item;

  desiredAmount: number;
  minimumAmount: number;
  survivalMinimum?: number;    // Lowest amount NPC accepts at 0% charity rate (below floor)
  maxRepayment: number;

  interactionType: 'PAWN' | 'REDEEM' | 'NEGOTIATION' | 'RENEWAL' | 'POST_FORFEIT'; // Added POST_FORFEIT
  redemptionIntent?: 'REDEEM' | 'EXTEND' | 'LEAVE';
  renewalProposal?: RenewalProposal; // Added proposal data

  currentWallet?: number;
  currentAskPrice?: number;

  chainId?: string;
  eventId?: string;

  recapLog?: SimLogEntry[];

  allowFreeRedeem?: boolean;
  pawnTermDays?: number;  // 自定义典当期限（默认7天）

  observation?: string; // Narrative observation/hint
}
