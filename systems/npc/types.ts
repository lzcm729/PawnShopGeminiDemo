
import { Item } from '../items/types';
import { Mood } from '../core/types';
import { Dialogue, SimLogEntry, CustomerPortraits } from '../narrative/types';

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
  negotiationStyle: 'Aggressive' | 'Desperate' | 'Professional' | 'Deceptive';
  patience: number; 
  mood: Mood; 
  tags: string[]; 
  item: Item;
  
  desiredAmount: number; 
  minimumAmount: number; 
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
}
