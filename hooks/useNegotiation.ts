
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, InterestRate } from '../types';

export type NegotiationMood = 'Happy' | 'Neutral' | 'Annoyed' | 'Angry';

export type NegotiationStatus = 'ACCEPTED' | 'PRINCIPAL_TOO_LOW' | 'INSULT' | 'INTEREST_TOO_HIGH' | 'RATE_MISMATCH' | 'WALK_AWAY' | 'LEVERAGE';

export interface NegotiationResult {
  status: NegotiationStatus;
  message: string;
  patienceRemaining: number;
}

export interface ActionLog {
    type: 'LEVERAGE' | 'NARRATIVE'; 
    text: string;
    subtext?: string;
    customerResponse?: string; 
    id: number;
}

export interface OfferRecord {
  amount: number;
  rate: InterestRate;
  status: NegotiationStatus;
  patienceCost: number;
  timestamp: number;
}

interface UseNegotiationReturn {
  patience: number;
  mood: NegotiationMood;
  offerPrincipal: number;
  setOfferPrincipal: React.Dispatch<React.SetStateAction<number>>;
  selectedRate: InterestRate;
  setSelectedRate: React.Dispatch<React.SetStateAction<InterestRate>>;
  
  isWalkedAway: boolean;
  submitOffer: () => NegotiationResult;
  applyLeverage: (power: number, description: string) => void;
  triggerNarrative: (playerLine: string, customerLine: string, impact?: number) => void;
  resetNegotiation: () => void;
  lastAction: ActionLog | null; 
  currentAskPrice: number;
  
  // New Fields
  offerHistory: OfferRecord[];
  revealedMinimum: boolean;
}

const getInsultThreshold = (style: string, minPrincipal: number) => {
  switch (style) {
    case 'Aggressive': return minPrincipal * 0.8;
    case 'Desperate': return minPrincipal * 0.6;
    case 'Deceptive': return minPrincipal * 0.75;
    default: return minPrincipal * 0.7; // Professional
  }
};

export const useNegotiation = (customer: Customer | null): UseNegotiationReturn => {
  // Logic State
  const [patience, setPatience] = useState<number>(3);
  const [mood, setMood] = useState<NegotiationMood>('Neutral');
  const [isWalkedAway, setIsWalkedAway] = useState(false);
  const [lastAction, setLastAction] = useState<ActionLog | null>(null);
  
  // UI State
  const [offerPrincipal, setOfferPrincipal] = useState(0);
  const [selectedRate, setSelectedRate] = useState<InterestRate>(0.05);
  const [currentAskPrice, setCurrentAskPrice] = useState<number>(0);
  
  // History & Intel
  const [offerHistory, setOfferHistory] = useState<OfferRecord[]>([]);
  const [revealedMinimum, setRevealedMinimum] = useState(false);
  
  const lastCustomerId = useRef<string | undefined>(undefined);

  // Initialize
  useEffect(() => {
    if (!customer) {
        setLastAction(null);
        setIsWalkedAway(false);
        setMood('Neutral');
        setOfferHistory([]);
        setRevealedMinimum(false);
        return;
    }

    if (customer.id !== lastCustomerId.current) {
      lastCustomerId.current = customer.id;
      
      setPatience(customer.patience);
      setMood('Neutral');
      setIsWalkedAway(false);
      setLastAction(null);
      setOfferHistory([]);
      setRevealedMinimum(false);
      setOfferPrincipal(Math.floor(customer.desiredAmount * 0.8));
      setSelectedRate(0.05);
      setCurrentAskPrice(customer.currentAskPrice ?? customer.desiredAmount);
    }
  }, [customer]);

  const resetNegotiation = useCallback(() => {
    if (customer) {
      setPatience(customer.patience);
      setMood('Neutral');
      setIsWalkedAway(false);
      setLastAction(null);
      setOfferHistory([]);
      setRevealedMinimum(false);
      setOfferPrincipal(Math.floor(customer.desiredAmount * 0.8));
      setSelectedRate(0.05);
      setCurrentAskPrice(customer.currentAskPrice ?? customer.desiredAmount);
    }
  }, [customer]);

  // Helper to reduce price
  const reducePrice = (power: number): number => {
      if (power <= 0) return 0;
      const reduction = Math.floor(currentAskPrice * power);
      const newAsk = Math.max(customer?.minimumAmount || 0, currentAskPrice - reduction);
      setCurrentAskPrice(newAsk);
      return currentAskPrice - newAsk; 
  };

  const applyLeverage = useCallback((power: number, description: string) => {
    if (!customer || isWalkedAway) return;

    const actualDrop = reducePrice(power);

    setMood('Annoyed');
    setLastAction({
        type: 'LEVERAGE',
        text: `情报压制: ${description}`,
        subtext: actualDrop > 0 ? `报价降低 $${actualDrop}` : '对方无动于衷',
        id: Date.now()
    });
  }, [customer, isWalkedAway, currentAskPrice]);

  const triggerNarrative = useCallback((playerLine: string, customerLine: string, impact: number = 0) => {
      if (!customer || isWalkedAway) return;

      const actualDrop = reducePrice(impact);

      setLastAction({
          type: 'NARRATIVE',
          text: playerLine,
          customerResponse: customerLine,
          subtext: actualDrop > 0 ? `报价降低 $${actualDrop}` : undefined,
          id: Date.now()
      });
  }, [customer, isWalkedAway, currentAskPrice]);

  const submitOffer = useCallback((): NegotiationResult => {
    if (!customer || isWalkedAway) {
      return { status: 'WALK_AWAY', message: "客户已经离开了。", patienceRemaining: 0 };
    }

    const minPrincipal = customer.minimumAmount;
    const maxRepayment = customer.maxRepayment || (minPrincipal * 1.2); 
    const totalRepayment = offerPrincipal * (1 + selectedRate);
    const insultThreshold = getInsultThreshold(customer.negotiationStyle, minPrincipal);
    
    let status: NegotiationStatus;
    let costPatience = 0;
    let message = "";
    let nextMood: NegotiationMood = mood;

    // --- LOGIC GATES ---

    if (offerPrincipal < insultThreshold) {
        status = 'INSULT';
        costPatience = 2; // Dynamic penalty could be added here later
        nextMood = 'Angry';
        message = "你这是在打发叫花子吗？太离谱了！";
    }
    else if (offerPrincipal < minPrincipal) {
        status = 'PRINCIPAL_TOO_LOW';
        costPatience = 1;
        nextMood = 'Annoyed';
        message = "这点钱不够应急啊，再加点吧。";
        // Reveal Minimum Logic
        setRevealedMinimum(true);
    }
    else if (selectedRate > 0 && totalRepayment > maxRepayment) {
        status = 'INTEREST_TOO_HIGH';
        costPatience = 1;
        nextMood = 'Annoyed';
        message = "连本带利要还这么多？我以后哪还得起！";
    }
    else if (selectedRate >= 0.10 && offerPrincipal < minPrincipal * 1.1) {
        status = 'RATE_MISMATCH';
        costPatience = 1;
        nextMood = 'Annoyed';
        message = "你要收这么高的利息，那这点本金可不够。";
    }
    else {
        status = 'ACCEPTED';
        costPatience = 0;
        nextMood = 'Happy';
        
        let acceptMsg = customer.dialogue.accepted.fair;
        const ratio = offerPrincipal / customer.desiredAmount;
        if (ratio < 0.85) acceptMsg = customer.dialogue.accepted.fleeced;
        else if (ratio > 1.05) acceptMsg = customer.dialogue.accepted.premium;
        
        message = acceptMsg;
    }

    const remaining = Math.max(0, patience - costPatience);
    setPatience(remaining);
    setMood(nextMood);
    
    // Add to History
    setOfferHistory(prev => [
        { amount: offerPrincipal, rate: selectedRate, status, patienceCost: costPatience, timestamp: Date.now() },
        ...prev.slice(0, 2) // Keep last 3 (current + 2 old)
    ]);

    if (status !== 'ACCEPTED' && remaining <= 0) {
        return {
            status: 'WALK_AWAY',
            message: customer.dialogue.rejected || "我不卖了！再见！",
            patienceRemaining: 0
        };
    }

    return {
        status,
        message,
        patienceRemaining: remaining
    };

  }, [customer, patience, offerPrincipal, selectedRate, mood, isWalkedAway]);

  return {
    patience,
    mood,
    offerPrincipal,
    setOfferPrincipal,
    selectedRate,
    setSelectedRate,
    isWalkedAway,
    submitOffer,
    applyLeverage,
    triggerNarrative,
    resetNegotiation,
    lastAction,
    currentAskPrice,
    offerHistory,
    revealedMinimum
  };
};
