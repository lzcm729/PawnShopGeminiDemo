
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Customer, InterestRate, BehaviorTag } from '../types';
import { executePushPull, PushPullResult, PlayerMoveType, getPushPullStyle, NpcPushPullStyle } from '../systems/negotiation/pushPull';
import { GAME_CONFIG } from '../systems/game/config';
import { getAskPriceModifier, getInsultModifier, getConcessionMultiplier } from '../systems/appraisal/precision';
import { INSIGHT_AWARE_RESPONSES, getRandomText } from '../systems/negotiation/data';
import { queryConcessionChance, getConcessionTier, type ConcessionTier } from '../systems/negotiation/probeEffects';

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

  /** Insight-aware NPC response text (null if insight not used) */
  insightAwareText: string | null;

  /** B-10: Current concession probability tier (always computed; UI gates display by skill) */
  concessionTier: ConcessionTier;

  // Round tracking
  roundCount: number;
  isRoundLimitReached: boolean;

  // Heart strike concession bonus
  heartStrikeConcessionBonus: number;
  setHeartStrikeConcessionBonus: React.Dispatch<React.SetStateAction<number>>;

  // Empathy patience loss modifier (set by skill system after successful empathy)
  empathyPatienceModifier: number;
  setEmpathyPatienceModifier: React.Dispatch<React.SetStateAction<number>>;
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
 * P0-7: Apply behavior tag floor modifiers to NPC minimum amount.
 * Multiplicative: effectiveFloor = base * (1 + sum(modifiers)), clamped to [0.70, 1.20] of base.
 */
const getFloorWithBehaviorMods = (behaviorTags: BehaviorTag[], baseMinimum: number): number => {
  const modifiers = GAME_CONFIG.NEGOTIATION.BEHAVIOR_FLOOR_MODIFIERS;
  let totalMod = 0;
  for (const tag of behaviorTags) {
    totalMod += modifiers[tag] || 0;
  }
  const multiplier = Math.max(0.70, Math.min(1.20, 1 + totalMod));
  return Math.floor(baseMinimum * multiplier);
};

/**
 * P0-7: Apply behavior tag patience modifiers to NPC base patience.
 * Additive: finalPatience = base + sum(modifiers), clamped to [1, 5].
 */
const getPatienceWithBehaviorMods = (behaviorTags: BehaviorTag[], basePatience: number): number => {
  const modifiers = GAME_CONFIG.NEGOTIATION.BEHAVIOR_PATIENCE_MODIFIERS;
  let totalMod = 0;
  for (const tag of behaviorTags) {
    totalMod += modifiers[tag] || 0;
  }
  return Math.max(1, Math.min(5, basePatience + totalMod));
};

/**
 * @param insightConcessionModifier (I-7) Optional modifier from insight system
 *   to NPC concession probability. Pass getInsightPushPullModifier result.
 * @param itemUncertainty Current item uncertainty (0.05-0.30). Used for precision payoff modifiers.
 *   Locked at negotiation start — later appraisals don't change the already-reported ask price.
 * @param moraleNegotiationModifier (H-1) Optional modifier from morale buff.
 *   Values < 1.0 reduce patience cost (good morale), > 1.0 increase it (bad morale).
 *   Applied probabilistically: modifier > 1 = higher chance of losing patience.
 * @param newsStolenRisk (P0-2) Aggregate stolen_risk modifier from active news effects.
 *   When > 0, stolen items have a chance to cost extra patience per offer round.
 * @param reputationHumanity Player's current Humanity reputation (0-100).
 *   High values boost NPC concession chance during push-pull negotiation.
 * @param reputationCredibility Player's current Credibility reputation (0-100).
 *   High values reduce patience loss chance during push-pull negotiation.
 */
export const useNegotiation = (customer: Customer | null, insightConcessionModifier: number = 0, itemUncertainty: number = 0.3, moraleNegotiationModifier: number = 1.0, newsStolenRisk: number = 0, reputationHumanity: number = 50, reputationCredibility: number = 50, insightUsed: boolean = false): UseNegotiationReturn => {
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

  // Round tracking
  const [roundCount, setRoundCount] = useState<number>(0);

  // Heart strike concession bonus (set by ability system)
  const [heartStrikeConcessionBonus, setHeartStrikeConcessionBonus] = useState<number>(0);

  // Empathy patience loss modifier (e.g., -0.20 after successful empathy)
  const [empathyPatienceModifier, setEmpathyPatienceModifier] = useState<number>(0);

  // Insult flag for probability-based patience loss
  const [isInsult, setIsInsult] = useState<boolean>(false);

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
        setRoundCount(0);
        setHeartStrikeConcessionBonus(0);
        setEmpathyPatienceModifier(0);
        setIsInsult(false);
        return;
    }

    if (customer.id !== lastCustomerId.current) {
      lastCustomerId.current = customer.id;
      // A1: Lock uncertainty at negotiation start
      lockedUncertaintyRef.current = itemUncertainty;

      // P0-7: Apply behavior tag patience modifiers at initialization
      setPatience(getPatienceWithBehaviorMods(customer.behaviorTags, customer.patience));
      setMood('Neutral');
      setIsWalkedAway(false);
      setLastAction(null);
      setOfferHistory([]);
      setRevealedMinimum(false);

      // A1: Apply ask price precision modifier
      // NaN guard: nullish coalescing doesn't catch NaN, so explicitly check with Number.isFinite
      const rawAsk = customer.currentAskPrice ?? customer.desiredAmount;
      const baseAsk = Number.isFinite(rawAsk) ? rawAsk : (Number.isFinite(customer.desiredAmount) ? customer.desiredAmount : 0);
      const safeUncertainty = Number.isFinite(itemUncertainty) ? itemUncertainty : 0.3;
      const askModifier = getAskPriceModifier(safeUncertainty);
      let adjustedAsk = Math.round(baseAsk * askModifier);
      if (!Number.isFinite(adjustedAsk)) adjustedAsk = baseAsk;

      // #46: SLY NPC inflated ask — "会演戏，初始 Ask 虚高"
      const npcStyle: NpcPushPullStyle = getPushPullStyle(customer.behaviorTags);
      if (npcStyle === 'SLY') {
        const inflation = GAME_CONFIG.NEGOTIATION.SLY_ASK_INFLATION;
        adjustedAsk = Math.round(adjustedAsk * (1 + inflation));
      }

      setOfferPrincipal(adjustedAsk);
      setSelectedRate(0.05);
      setCurrentAskPrice(adjustedAsk);
      // Reset push-pull state
      setLastOfferAmount(null);
      setPersistCount(0);
      setNpcConcessionCount(0);
      setLastPushPullResult(null);
      setRoundCount(0);
      setHeartStrikeConcessionBonus(0);
      setEmpathyPatienceModifier(0);
      setIsInsult(false);
    }
  }, [customer?.id, itemUncertainty]);

  const resetNegotiation = useCallback(() => {
    if (customer) {
      lockedUncertaintyRef.current = itemUncertainty;
      // P0-7: Apply behavior tag patience modifiers on reset too
      setPatience(getPatienceWithBehaviorMods(customer.behaviorTags, customer.patience));
      setMood('Neutral');
      setIsWalkedAway(false);
      setLastAction(null);
      setOfferHistory([]);
      setRevealedMinimum(false);
      // A1: Apply ask price precision modifier on reset too
      // NaN guard: nullish coalescing doesn't catch NaN, so explicitly check with Number.isFinite
      const rawAsk = customer.currentAskPrice ?? customer.desiredAmount;
      const baseAsk = Number.isFinite(rawAsk) ? rawAsk : (Number.isFinite(customer.desiredAmount) ? customer.desiredAmount : 0);
      const safeUncertainty = Number.isFinite(itemUncertainty) ? itemUncertainty : 0.3;
      const askModifier = getAskPriceModifier(safeUncertainty);
      let adjustedAsk = Math.round(baseAsk * askModifier);
      if (!Number.isFinite(adjustedAsk)) adjustedAsk = baseAsk;

      // #46: SLY NPC inflated ask on reset too
      const npcStyle: NpcPushPullStyle = getPushPullStyle(customer.behaviorTags);
      if (npcStyle === 'SLY') {
        const inflation = GAME_CONFIG.NEGOTIATION.SLY_ASK_INFLATION;
        adjustedAsk = Math.round(adjustedAsk * (1 + inflation));
      }

      setOfferPrincipal(adjustedAsk);
      setSelectedRate(0.05);
      setCurrentAskPrice(adjustedAsk);
      // Reset push-pull state
      setLastOfferAmount(null);
      setPersistCount(0);
      setNpcConcessionCount(0);
      setLastPushPullResult(null);
      setRoundCount(0);
      setHeartStrikeConcessionBonus(0);
      setEmpathyPatienceModifier(0);
      setIsInsult(false);
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

    // P0-7: Apply behavior tag floor modifiers to NPC minimum amount
    const minPrincipal = getFloorWithBehaviorMods(customer.behaviorTags, customer.minimumAmount);
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
    let currentIsInsult = false;

    // --- LOGIC GATES (hit-and-return priority) ---
    // 1. INSULT — offer far below floor
    // 2. PRINCIPAL_TOO_LOW — offer below floor (with survivalMinimum for 0% charity)
    // 3. TOTAL_REPAYMENT_EXCEEDED — total repayment too high for customer
    // 4. ACCEPTED — offer >= currentAskPrice (NPC's current asking price)
    // 5. Otherwise — triggers push-pull negotiation

    // For 0% charity rate, use survivalMinimum as the effective floor (lower than minimumAmount)
    // P0-7: survivalMinimum also gets floor modifier applied
    const effectiveFloor = selectedRate === 0
        ? getFloorWithBehaviorMods(customer.behaviorTags, customer.survivalMinimum ?? customer.minimumAmount)
        : minPrincipal;

    if (offerPrincipal < insultThreshold) {
        // #4: Insult is now probability-based, not fixed -2 patience
        status = 'INSULT';
        costPatience = 0; // No fixed patience cost; insult adds to patience loss probability
        currentIsInsult = true;
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
        isPushPullZone = true;
        status = 'COUNTER';
        costPatience = 0; // Will be set by push-pull result below
        nextMood = mood;
        message = "再考虑考虑吧...";
    }

    // --- PUSH-PULL LOGIC (after non-accepted offers) ---
    let pushPullResult: PushPullResult | null = null;

    if (status !== 'ACCEPTED') {
        // Execute push-pull judgment (I-7: pass combined modifier, D: precision multiplier)
        const concessionMult = getConcessionMultiplier(lockedUncertaintyRef.current);

        // Combine all concession modifiers: insight + reputation + heart strike + mercy
        let totalConcessionMod = insightConcessionModifier;

        // #33: Reputation-based concession bonus
        const repMods = GAME_CONFIG.NEGOTIATION.REPUTATION_MODIFIERS;
        if (reputationHumanity > 70) {
            totalConcessionMod += repMods.HUMANITY_70_CONCESSION_BONUS;
        } else if (reputationHumanity > 60) {
            totalConcessionMod += repMods.HUMANITY_60_CONCESSION_BONUS;
        }

        // #2: Heart strike concession bonus
        if (heartStrikeConcessionBonus > 0) {
            totalConcessionMod += heartStrikeConcessionBonus;
        }

        // #5: Mercy mechanic — patience < mercy_threshold → concession chance + bonus
        if (patience < GAME_CONFIG.NEGOTIATION.MERCY_THRESHOLD) {
            totalConcessionMod += GAME_CONFIG.NEGOTIATION.MERCY_CONCESSION_BONUS;
        }

        // #47: Insult = 0% concession (NPC won't concede on insulting offers)
        if (currentIsInsult) {
            totalConcessionMod = -10;
        }

        pushPullResult = executePushPull(
            customer.behaviorTags,
            offerPrincipal,
            lastOfferAmount,
            currentAskPrice,
            minPrincipal,
            persistCount,
            npcConcessionCount,
            totalConcessionMod,
            concessionMult,
            empathyPatienceModifier
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

        // Apply probabilistic patience cost
        // #4: If insult, add insult_patience_loss_bonus to the patience loss chance
        if (isPushPullZone || currentIsInsult) {
            let effectivePatienceLossChance = pushPullResult.patienceLossChance;

            // #4: Insult adds +25% to patience loss probability
            if (currentIsInsult) {
                effectivePatienceLossChance = Math.min(1.0, effectivePatienceLossChance + GAME_CONFIG.NEGOTIATION.INSULT_PATIENCE_LOSS_BONUS);
            }

            // Re-roll patience with adjusted chance (for insult case; push-pull zone uses original roll)
            if (currentIsInsult) {
                const insultPatienceLost = Math.random() < effectivePatienceLossChance;
                if (insultPatienceLost) {
                    costPatience = 1;
                }
            } else if (pushPullResult.patienceLost) {
                costPatience = 1;
            }
        }

        setLastPushPullResult(pushPullResult);
    } else {
        // Reset persist count on accept
        setPersistCount(0);
        setLastPushPullResult(null);
    }

    // #3: Increment round count (all offer types count as a round)
    setRoundCount(prev => prev + 1);

    // Track insult state for subsequent push-pull interactions
    setIsInsult(currentIsInsult);

    // Update last offer amount
    setLastOfferAmount(offerPrincipal);

    // H-1: Apply morale negotiation modifier to patience cost
    let adjustedCostPatience = costPatience;
    if (costPatience > 0 && moraleNegotiationModifier !== 1.0) {
        if (moraleNegotiationModifier < 1.0) {
            const saveChance = 1.0 - moraleNegotiationModifier;
            if (Math.random() < saveChance) {
                adjustedCostPatience = Math.max(0, costPatience - 1);
            }
        } else {
            const extraChance = moraleNegotiationModifier - 1.0;
            if (Math.random() < extraChance) {
                adjustedCostPatience = costPatience + 1;
            }
        }
    }

    // P0-2: News stolen_risk effect
    if (newsStolenRisk > 0 && customer.item.isStolen && adjustedCostPatience > 0) {
        const extraRiskChance = Math.min(newsStolenRisk / 100, 0.5);
        if (Math.random() < extraRiskChance) {
            adjustedCostPatience += 1;
        }
    }

    // #33: High Credibility reduces patience loss chance
    // Customers trust a reputable shopkeeper more, so they're less likely to lose patience
    if (adjustedCostPatience > 0 && reputationCredibility > 60) {
        const saveChance = GAME_CONFIG.NEGOTIATION.REPUTATION_MODIFIERS.CREDIBILITY_60_PATIENCE_REDUCTION;
        if (Math.random() < saveChance) {
            adjustedCostPatience = Math.max(0, adjustedCostPatience - 1);
        }
    }

    const remaining = Math.max(0, patience - adjustedCostPatience);
    setPatience(remaining);
    setMood(nextMood);

    // Add to History
    setOfferHistory(prev => [
        { amount: offerPrincipal, rate: selectedRate, status, patienceCost: adjustedCostPatience, timestamp: Date.now() },
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

  }, [customer, patience, offerPrincipal, selectedRate, mood, isWalkedAway, lastOfferAmount, currentAskPrice, persistCount, npcConcessionCount, insightConcessionModifier, moraleNegotiationModifier, newsStolenRisk, roundCount, heartStrikeConcessionBonus, empathyPatienceModifier]);

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

  // B-10: Compute concession probability tier for skill-gated display
  // When offer >= ask price, NPC will directly accept (no concession tier needed), return null
  const concessionTier = useMemo((): ConcessionTier => {
    if (!customer) return 'low';

    // If offer >= currentAskPrice, NPC will accept directly - no concession tier
    if (offerPrincipal >= currentAskPrice) {
      return null;
    }

    const chance = queryConcessionChance(
      customer.behaviorTags,
      offerPrincipal,
      customer.minimumAmount,
      persistCount,
      npcConcessionCount,
      insightConcessionModifier
    );
    return getConcessionTier(chance);
  }, [customer, offerPrincipal, currentAskPrice, persistCount, npcConcessionCount, insightConcessionModifier]);

  // #34: Generate insight-aware NPC response text when insight is active
  const insightAwareText = useMemo((): string | null => {
    if (!insightUsed || !lastPushPullResult || !customer) return null;

    const npcStyle = getPushPullStyle(customer.behaviorTags);
    const seed = Date.now();

    if (lastPushPullResult.conceded) {
      const key = `insight_conceded_${npcStyle}`;
      const texts = INSIGHT_AWARE_RESPONSES[key];
      if (texts && texts.length > 0) {
        return getRandomText(texts, seed);
      }
    } else if (lastPushPullResult.playerMove === 'PERSIST') {
      const key = `insight_persist_${npcStyle}`;
      const texts = INSIGHT_AWARE_RESPONSES[key];
      if (texts && texts.length > 0) {
        return getRandomText(texts, seed);
      }
    }

    return null;
  }, [insightUsed, lastPushPullResult, customer]);

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
    lastPushPullResult,
    insightAwareText,
    // B-10: Concession tier
    concessionTier,
    // Round tracking
    roundCount,
    isRoundLimitReached: false, // Round hard limit removed; patience system is the sole pacing mechanism
    // Heart strike concession bonus
    heartStrikeConcessionBonus,
    setHeartStrikeConcessionBonus,
    // Empathy patience loss modifier
    empathyPatienceModifier,
    setEmpathyPatienceModifier,
  };
};
