
import { Item } from '../items/types';
import { Mood } from '../core/types';
import { Dialogue, SimLogEntry, CustomerPortraits } from '../narrative/types';

export interface Customer {
  id: string;
  name: string;
  description: string;
  avatarSeed: string;
  portraits?: CustomerPortraits; // NEW
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
  
  interactionType: 'PAWN' | 'REDEEM' | 'NEGOTIATION'; 
  redemptionIntent?: 'REDEEM' | 'EXTEND' | 'LEAVE'; 

  currentWallet?: number; 
  currentAskPrice?: number; 
  
  chainId?: string; 
  eventId?: string; 
  
  recapLog?: SimLogEntry[];
  
  allowFreeRedeem?: boolean;
}
