
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, InterestRate, BehaviorTag } from '../types';
import { executePushPull, PushPullResult, PlayerMoveType } from '../systems/negotiation/pushPull';
import { GAME_CONFIG } from '../systems/game/config';
import { getAskPriceModifier, getInsultModifier, getConcessionMultiplier } from '../systems/appraisal/precision';

export type NegotiationMood = 'Happy' | 'Neutral' | 'Annoyed' | 'Angry';

export type NegotiationStatus = 'ACCEPTED' | 'PRINCIPAL_TOO_LOW' | 'INSULT' | 'TOTAL_REPAYMENT_EXCEEDED' | 'WALK_AWAY' | 'LEVERAGE' | 'COUNTER';

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

  // Skill integration
  applyExternalPatienceCost: (cost: number) => void;

  // New Fields
  offerHistory: OfferRecord[];
  revealedMinimum: boolean;

  // Push-Pull Fields
  lastOfferAmount: number | null;
  persistCount: number;
  npcConcessionCount: number;
  lastPushPullResult: PushPullResult | null;
}

const getInsultThreshold = (behaviorTags: BehaviorTag[], minPrincipal: number, insultPrecisionModifier: number = 1.0) => {
  let threshold = GAME_CONFIG.NEGOTIATION.BASE_INSULT_THRESHOLD;

  // Apply modifiers from all behavior tags
  const modifiers = GAME_CONFIG.NEGOTIATION.BEHAVIOR_INSULT_MODIFIERS;
  for (const tag of behaviorTags) {
    threshold += modifiers[tag] || 0;
  }

  // Clamp threshold
  threshold = Math.max(GAME_CONFIG.NEGOTIATION.INSULT_CLAMP_MIN, Math.min(GAME_CONFIG.NEGOTIATION.INSULT_CLAMP_MAX, threshold));

  // A2: Apply precision modifier (low uncertainty = lower insult line)
  return minPrincipal * threshold * insultPrecisionModifier;
};

/**
 * @param insightConcessionModifier (I-7) Optional modifier from insight system
 *   to NPC concession probability. Pass getInsightPushPullModifier result.
 * @param itemUncertainty Current item uncertainty (0.05-0.30). Used for precision payoff modifiers.
 *   Locked at negotiation start — later appraisals don't change the already-reported ask price.
 */
export const useNegotiation = (customer: Customer | null, insightConcessionModifier: number = 0, itemUncertainty: number = 0.3): UseNegotiationReturn => {
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
  // Lock uncertainty at negotiation start (A1/A2: one-time calculation)
  const lockedUncertaintyRef = useRef<number>(0.3);

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
      // A1: Lock uncertainty at negotiation start
      lockedUncertaintyRef.current = itemUncertainty;

      setPatience(customer.patience);
      setMood('Neutral');
      setIsWalkedAway(false);
      setLastAction(null);
      setOfferHistory([]);
      setRevealedMinimum(false);

      // A1: Apply ask price precision modifier
      const baseAsk = customer.currentAskPrice ?? customer.desiredAmount;
      const askModifier = getAskPriceModifier(itemUncertainty);
      const adjustedAsk = Math.round(baseAsk * askModifier);
      setOfferPrincipal(adjustedAsk);
      setSelectedRate(0.05);
      setCurrentAskPrice(adjustedAsk);
      // Reset push-pull state
      setLastOfferAmount(null);
      setPersistCount(0);
      setNpcConcessionCount(0);
      setLastPushPullResult(null);
    }
  }, [customer, itemUncertainty]);

  const resetNegotiation = useCallback(() => {
    if (customer) {
      lockedUncertaintyRef.current = itemUncertainty;
      setPatience(customer.patience);
      setMood('Neutral');
      setIsWalkedAway(false);
      setLastAction(null);
      setOfferHistory([]);
      setRevealedMinimum(false);
      // A1: Apply ask price precision modifier on reset too
      const baseAsk = customer.currentAskPrice ?? customer.desiredAmount;
      const askModifier = getAskPriceModifier(itemUncertainty);
      const adjustedAsk = Math.round(baseAsk * askModifier);
      setOfferPrincipal(adjustedAsk);
      setSelectedRate(0.05);
      setCurrentAskPrice(adjustedAsk);
      // Reset push-pull state
      setLastOfferAmount(null);
      setPersistCount(0);
      setNpcConcessionCount(0);
      setLastPushPullResult(null);
    }
  }, [customer, itemUncertainty]);

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
    // A2: Apply precision-based insult modifier (locked at negotiation start)
    const insultPrecisionMod = getInsultModifier(lockedUncertaintyRef.current);
    const insultThreshold = getInsultThreshold(customer.behaviorTags, minPrincipal, insultPrecisionMod);

    let status: NegotiationStatus;
    let costPatience = 0;
    let message = "";
    let nextMood: NegotiationMood = mood;
    let isPushPullZone = false;

    // --- LOGIC GATES (hit-and-return priority) ---
    // 1. INSULT — offer far below floor
    // 2. PRINCIPAL_TOO_LOW — offer below floor (with survivalMinimum for 0% charity)
    // 3. TOTAL_REPAYMENT_EXCEEDED — total repayment too high for customer
    // 4. ACCEPTED — offer >= currentAskPrice (NPC's current asking price)
    // 5. Otherwise — triggers push-pull negotiation

    // For 0% charity rate, use survivalMinimum as the effective floor (lower than minimumAmount)
    const effectiveFloor = selectedRate === 0
        ? (customer.survivalMinimum ?? minPrincipal)
        : minPrincipal;

    if (offerPrincipal < insultThreshold) {
        status = 'INSULT';
        costPatience = 2;
        nextMood = 'Angry';
        message = "你这是在打发叫花子吗？太离谱了！";
    }
    else if (offerPrincipal < effectiveFloor) {
        status = 'PRINCIPAL_TOO_LOW';
        costPatience = 1;
        nextMood = 'Annoyed';
        message = selectedRate === 0
            ? "这点钱...真的不够我活命的..."
            : "这点钱不够应急啊，再加点吧。";
        // TODO: 底价揭示功能暂时禁用，之后可能通过其他机制（如洞察技能）解锁
        // setRevealedMinimum(true);
    }
    else if (selectedRate > 0 && totalRepayment > maxRepayment) {
        status = 'TOTAL_REPAYMENT_EXCEEDED';
        costPatience = 1;
        nextMood = 'Annoyed';
        message = "连本带利要还这么多？我以后哪还得起！";
    }
    else if (offerPrincipal >= currentAskPrice) {
        status = 'ACCEPTED';
        costPatience = 0;
        nextMood = 'Happy';

        let acceptMsg = customer.dialogue.accepted.fair;
        const ratio = offerPrincipal / customer.desiredAmount;
        if (ratio < 0.85) acceptMsg = customer.dialogue.accepted.fleeced;
        else if (ratio > 1.05) acceptMsg = customer.dialogue.accepted.premium;

        message = acceptMsg;
    }
    else {
        // Offer is between effectiveFloor and currentAskPrice — enter push-pull phase
        // Patience cost is probabilistic, determined by push-pull result below
        isPushPullZone = true;
        status = 'COUNTER'; // NPC countering, negotiation in progress
        costPatience = 0; // Will be set by push-pull result below
        nextMood = mood; // Mood unchanged until push-pull resolves
        message = "再考虑考虑吧...";
    }

    // --- PUSH-PULL LOGIC (after non-accepted, non-insult offers) ---
    let pushPullResult: PushPullResult | null = null;

    if (status !== 'ACCEPTED' && status !== 'INSULT') {
        // Execute push-pull judgment (I-7: pass insight modifier, D: precision multiplier)
        const concessionMult = getConcessionMultiplier(lockedUncertaintyRef.current);
        pushPullResult = executePushPull(
            customer.behaviorTags,
            offerPrincipal,
            lastOfferAmount,
            currentAskPrice,
            minPrincipal,
            persistCount,
            npcConcessionCount,
            insightConcessionModifier,
            concessionMult
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

        // Apply probabilistic patience cost only in push-pull zone
        // Hard rejections (INSULT, below-floor PRINCIPAL_TOO_LOW, TOTAL_REPAYMENT_EXCEEDED)
        // keep their fixed costPatience values
        if (isPushPullZone && pushPullResult.patienceLost) {
            costPatience = 1;
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
        setIsWalkedAway(true);
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

  }, [customer, patience, offerPrincipal, selectedRate, mood, isWalkedAway, lastOfferAmount, currentAskPrice, persistCount, npcConcessionCount, insightConcessionModifier]);

  // Allow external systems (ability skills) to deduct patience from the hook's local state.
  // This keeps the hook's patience in sync when skills like "施压" cost patience.
  const applyExternalPatienceCost = useCallback((cost: number) => {
    if (cost <= 0) return;
    setPatience(prev => {
      const remaining = Math.max(0, prev - cost);
      if (remaining <= 0) {
        setIsWalkedAway(true);
      }
      return remaining;
    });
  }, []);

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
    applyExternalPatienceCost,
    offerHistory,
    revealedMinimum,
    // Push-Pull exports
    lastOfferAmount,
    persistCount,
    npcConcessionCount,
    lastPushPullResult
  };
};
