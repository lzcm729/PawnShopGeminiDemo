
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, InterestRate, BehaviorTag } from '../types';
import { executePushPull, PushPullResult, PlayerMoveType } from '../systems/negotiation/pushPull';

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

export interface StolenLeverageResult {
  askReduction: number;
  minReduction: number;
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
  applyStolenLeverage: (power: number, description: string, label?: string) => StolenLeverageResult;
  triggerNarrative: (playerLine: string, customerLine: string, impact?: number) => void;
  resetNegotiation: () => void;
  lastAction: ActionLog | null;
  currentAskPrice: number;

  // New Fields
  offerHistory: OfferRecord[];
  revealedMinimum: boolean;

  // Push-Pull Fields
  lastOfferAmount: number | null;
  persistCount: number;
  npcConcessionCount: number;
  lastPushPullResult: PushPullResult | null;
}

/**
 * Insult threshold modifiers by behavior tag
 * These define how tolerant each customer type is to lowball offers
 */
const BEHAVIOR_INSULT_MODIFIERS: Record<BehaviorTag, number> = {
  DESPERATE: -0.10,    // Very tolerant - needs money badly
  STUBBORN: 0.0,       // Standard tolerance
  SUSPICIOUS: 0.10,    // Less tolerant - easily insulted
  NAIVE: -0.05,        // Slightly more tolerant
  SAVVY: 0.05,         // Slightly less tolerant
  SENTIMENTAL: 0.05,   // Slightly less tolerant
};

const getInsultThreshold = (behaviorTags: BehaviorTag[], minPrincipal: number) => {
  // Base threshold is 0.7 (70% of minimum)
  let threshold = 0.7;

  // Apply modifiers from all behavior tags
  for (const tag of behaviorTags) {
    threshold += BEHAVIOR_INSULT_MODIFIERS[tag] || 0;
  }

  // Clamp threshold between 0.5 and 0.9
  threshold = Math.max(0.5, Math.min(0.9, threshold));

  return minPrincipal * threshold;
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

  // Push-Pull State
  const [lastOfferAmount, setLastOfferAmount] = useState<number | null>(null);
  const [persistCount, setPersistCount] = useState<number>(0);
  const [npcConcessionCount, setNpcConcessionCount] = useState<number>(0);
  const [lastPushPullResult, setLastPushPullResult] = useState<PushPullResult | null>(null);

  const lastCustomerId = useRef<string | undefined>(undefined);

  // Initialize
  useEffect(() => {
    if (!customer) {
        setLastAction(null);
        setIsWalkedAway(false);
        setMood('Neutral');
        setOfferHistory([]);
        setRevealedMinimum(false);
        // Reset push-pull state
        setLastOfferAmount(null);
        setPersistCount(0);
        setNpcConcessionCount(0);
        setLastPushPullResult(null);
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
      // Reset push-pull state
      setLastOfferAmount(null);
      setPersistCount(0);
      setNpcConcessionCount(0);
      setLastPushPullResult(null);
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
      // Reset push-pull state
      setLastOfferAmount(null);
      setPersistCount(0);
      setNpcConcessionCount(0);
      setLastPushPullResult(null);
    }
  }, [customer]);

  // FIX: Use functional state update to avoid stale closure bugs
  const reducePrice = useCallback((power: number): number => {
      if (power <= 0) return 0;
      let actualDrop = 0;
      setCurrentAskPrice(prev => {
          const reduction = Math.floor(prev * power);
          const newAsk = Math.max(customer?.minimumAmount || 0, prev - reduction);
          actualDrop = prev - newAsk;
          return newAsk;
      });
      return actualDrop;
  }, [customer?.minimumAmount]);

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
  }, [customer, isWalkedAway, reducePrice]);

  // Deep leverage: reduces both ask price AND minimum amount (floor)
  // Used for "handle-level" discoveries like STOLEN and FAKE traits
  // This is stronger than regular leverage because it also lowers the floor
  const applyStolenLeverage = useCallback((power: number, description: string, label: string = '赃物压价'): StolenLeverageResult => {
    if (!customer || isWalkedAway) return { askReduction: 0, minReduction: 0 };

    // Calculate reductions before applying (for display purposes)
    const askReduction = Math.floor(currentAskPrice * power);
    const minReduction = Math.floor(customer.minimumAmount * power);

    // Apply the leverage to ask price (local state)
    reducePrice(power);

    // Note: The minimum amount reduction must be handled by the component
    // via dispatch({ type: 'APPLY_STOLEN_LEVERAGE', payload: { reductionPercent: power } })
    // This function returns the calculated values for display

    setMood('Angry'); // Stronger emotional reaction than regular leverage
    setLastAction({
        type: 'LEVERAGE',
        text: `${label}: ${description}`,
        subtext: `报价降低 $${askReduction}，底价降低 $${minReduction}`,
        id: Date.now()
    });

    return { askReduction, minReduction };
  }, [customer, isWalkedAway, reducePrice, currentAskPrice]);

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
  }, [customer, isWalkedAway, reducePrice]);

  const submitOffer = useCallback((): NegotiationResult => {
    if (!customer || isWalkedAway) {
      return { status: 'WALK_AWAY', message: "客户已经离开了。", patienceRemaining: 0 };
    }

    const minPrincipal = customer.minimumAmount;
    const maxRepayment = customer.maxRepayment || (minPrincipal * 1.2);
    const totalRepayment = offerPrincipal * (1 + selectedRate);
    const insultThreshold = getInsultThreshold(customer.behaviorTags, minPrincipal);

    let status: NegotiationStatus;
    let costPatience = 0;
    let message = "";
    let nextMood: NegotiationMood = mood;

    // --- LOGIC GATES ---

    if (offerPrincipal < insultThreshold) {
        status = 'INSULT';
        costPatience = 2;
        nextMood = 'Angry';
        message = "你这是在打发叫花子吗？太离谱了！";
    }
    else if (offerPrincipal < minPrincipal) {
        status = 'PRINCIPAL_TOO_LOW';
        costPatience = 1;
        nextMood = 'Annoyed';
        message = "这点钱不够应急啊，再加点吧。";
        // TODO: 底价揭示功能暂时禁用，之后可能通过其他机制（如洞察技能）解锁
        // setRevealedMinimum(true);
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

    // --- PUSH-PULL LOGIC (after non-accepted, non-insult offers) ---
    let pushPullResult: PushPullResult | null = null;

    if (status !== 'ACCEPTED' && status !== 'INSULT') {
        // Execute push-pull judgment
        pushPullResult = executePushPull(
            customer.behaviorTags,
            offerPrincipal,
            lastOfferAmount,
            currentAskPrice,
            minPrincipal,
            persistCount,
            npcConcessionCount
        );

        // Update persist count based on player move
        if (pushPullResult.playerMove === 'PERSIST') {
            setPersistCount(prev => prev + 1);
        } else {
            setPersistCount(0);
        }

        // If NPC conceded, update ask price and concession count
        if (pushPullResult.conceded) {
            setCurrentAskPrice(pushPullResult.newAskPrice);
            setNpcConcessionCount(prev => prev + 1);
        }

        setLastPushPullResult(pushPullResult);
    } else {
        // Reset persist count on accept or insult
        setPersistCount(0);
        setLastPushPullResult(null);
    }

    // Update last offer amount
    setLastOfferAmount(offerPrincipal);

    const remaining = Math.max(0, patience - costPatience);
    setPatience(remaining);
    setMood(nextMood);

    // Add to History
    setOfferHistory(prev => [
        { amount: offerPrincipal, rate: selectedRate, status, patienceCost: costPatience, timestamp: Date.now() },
        ...prev.slice(0, 2)
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

  }, [customer, patience, offerPrincipal, selectedRate, mood, isWalkedAway, lastOfferAmount, currentAskPrice, persistCount, npcConcessionCount]);

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
    applyStolenLeverage,
    triggerNarrative,
    resetNegotiation,
    lastAction,
    currentAskPrice,
    offerHistory,
    revealedMinimum,
    // Push-Pull exports
    lastOfferAmount,
    persistCount,
    npcConcessionCount,
    lastPushPullResult
  };
};
