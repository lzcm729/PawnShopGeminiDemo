
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { useCustomerInsight } from '../hooks/useCustomerInsight';
import { useCharacterAbility } from '../hooks/useCharacterAbility';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { XCircle, Flame } from 'lucide-react';
import { Customer, TransactionResult, InterestRate, RejectionLines, ItemStatus } from '../types';
import { ActionLog, OfferRecord, PatienceWarningLevel, UltimatumState, PatiencePhase } from '../hooks/useNegotiation';
import { getMerchantInstinct } from '../systems/negotiation/instinct';
import { playSfx } from '../systems/game/audio';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../systems/assets';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { PushPullResult } from '../systems/negotiation/pushPull';
import { GAME_CONFIG } from '../systems/game/config';
import { getEmpathyFeedback } from '../systems/negotiation/empathyProbeFeedback';
import { getProbeFeedback, getConcessionTierLabel } from '../systems/negotiation/empathyProbeFeedback';
import { generateProbeReveal, queryConcessionChance, getConcessionTier, type ProbeRevealResult, type ConcessionTier } from '../systems/negotiation/probeEffects';
import { useRateDisplay } from './ui/RateDisplayContext';
import { ChatLog, LogEntry } from './negotiation/ChatLog';
import { ControlDeck } from './negotiation/ControlDeck';
import { StolenWarningOverlay } from './negotiation/StolenWarningOverlay';
import { CustomerHeader } from './negotiation/CustomerHeader';
import { createTextRegistry, TextRegistry } from '../systems/utils/textRegistry';
import floorCapCSV from '../assets/data/texts/floor_cap_hints.csv?raw';

// Floor cap hint text registry (loaded once from CSV)
let floorCapTexts: TextRegistry | null = null;
function getFloorCapTexts(): TextRegistry {
  if (!floorCapTexts) {
    floorCapTexts = createTextRegistry('floor_cap_hints', floorCapCSV);
  }
  return floorCapTexts;
}

interface NegotiationStateProps {
    negotiation: {
        submitOffer: () => any;
        acceptUltimatum: () => { status: 'ACCEPTED'; message: string; patienceRemaining: number; acceptedPrice: number } | null;
        offerPrincipal: number;
        setOfferPrincipal: React.Dispatch<React.SetStateAction<number>>;
        selectedRate: InterestRate;
        setSelectedRate: React.Dispatch<React.SetStateAction<InterestRate>>;
        isWalkedAway: boolean;
        lastAction: ActionLog | null;
        mood: string;
        patience: number;
        currentAskPrice: number;
        offerHistory: OfferRecord[];
        revealedMinimum: boolean;
        // Skill integration
        applyExternalPatienceCost: (cost: number) => void;
        // Push-Pull fields
        lastOfferAmount: number | null;
        persistCount: number;
        npcConcessionCount: number;
        lastPushPullResult: PushPullResult | null;
        // Insight-aware NPC response
        insightAwareText: string | null;
        // B-10: Concession tier (always computed; UI gates display by skill)
        concessionTier: ConcessionTier;
        // Round tracking
        roundCount: number;
        // Empathy patience modifier
        empathyPatienceModifier: number;
        setEmpathyPatienceModifier: React.Dispatch<React.SetStateAction<number>>;
        // Patience warning & ultimatum
        patienceWarningLevel: PatienceWarningLevel;
        ultimatum: UltimatumState | null;
        warningDialogue: string | null;
        // E-3: Patience decision gradient
        patiencePhase: PatiencePhase;
    };
    appraisalFeedbacks?: AppraisalFeedback[];
}

// Appraisal feedback structure passed from ItemPanel
export interface AppraisalFeedback {
    type: 'TRAIT_DISCOVERED' | 'RANGE_NARROWED' | 'BREAKTHROUGH' | 'MISHAP' | 'IMPATIENT' | 'ALREADY_KNOWN' | 'ATTITUDE_SHIFT';
    text: string;
    traitId?: string;
    traitName?: string;
    isBonus?: boolean;  // True if discovered via LUCKY_FIND
}

export const NegotiationPanel: React.FC<NegotiationStateProps> = ({ negotiation, appraisalFeedbacks = [] }) => {
  const { state, dispatch } = useGame();
  const { evaluateTransaction, commitTransaction, rejectCustomer, isCurrentItemStolen, handleStolenItemDecision } = useGameEngine();
  const { send } = useGameMachine();
  const { formatRate, unitLabel } = useRateDisplay();
  const { canUseInNegotiation, applyPressure, applyHeartStrike, isUnlocked, hasSeeConsequence, getContractHints, isCapReached } = useCharacterAbility();
  const { currentCustomer } = state;
  const item = currentCustomer?.item;

  // Stolen goods decision UI state
  const [showStolenWarning, setShowStolenWarning] = useState(false);
  const [stolenDecisionMade, setStolenDecisionMade] = useState(false);

  // Pressure skill state
  const [pressureUsed, setPressureUsed] = useState(false);
  const pressureSkillAvailable = isUnlocked('APPLY_PRESSURE');
  const canUsePressureNow = pressureSkillAvailable && !pressureUsed && canUseInNegotiation('APPLY_PRESSURE');

  // Heart Strike skill state
  const [heartStrikeUsed, setHeartStrikeUsed] = useState(false);
  const heartStrikeSkillAvailable = isUnlocked('HEART_STRIKE');
  const canUseHeartStrikeNow = heartStrikeSkillAvailable && !heartStrikeUsed && canUseInNegotiation('HEART_STRIKE');

  // Cumulative floor reduction tracking (fraction of original floor)
  const cumulativeReductionRef = useRef<number>(0);
  const floorCapShownRef = useRef<boolean>(false);

  // Customer Insight hook
  const {
    insightResult,
    status: insightStatus,
    canUseInsight,
    useInsight,
    performDeepInsight,
    canDeepInsight,
    performFullInsight,
    canFullInsight,
    getBlockReasonText,
    getInsightReward,
    foresightInfo,
  } = useCustomerInsight();

  // Insight Interaction state (EMPATHY / PROBE)
  const [empathyUsed, setEmpathyUsed] = useState(false);
  const [probeUsed, setProbeUsed] = useState(false);
  const [probeReveal, setProbeReveal] = useState<ProbeRevealResult | null>(null);
  const insightReward = getInsightReward();
  const hasEmpathyInteraction = insightReward?.unlockedInteractions.includes('EMPATHY') ?? false;
  const hasProbeInteraction = insightReward?.unlockedInteractions.includes('PROBE') ?? false;

  // Contract tier hints (因果自见 skill)
  const contractTierHints = useMemo(() => {
      if (!hasSeeConsequence() || !currentCustomer) return undefined;
      const chain = currentCustomer.chainId
          ? state.activeChains.find(c => c.id === currentCustomer.chainId)
          : undefined;
      const npcHope = chain?.variables.hope as number | undefined;
      const isDesperateTag = currentCustomer.behaviorTags.includes('DESPERATE');
      return getContractHints(npcHope, isDesperateTag);
  }, [hasSeeConsequence, currentCustomer, state.activeChains, getContractHints]);

  // Live concession tier: recomputed after each push-pull round when probe is active
  const liveConcessionTier = useMemo(() => {
      if (!probeReveal || !currentCustomer) return null;
      const chance = queryConcessionChance(
          currentCustomer.behaviorTags,
          negotiation.offerPrincipal,
          currentCustomer.minimumAmount,
          negotiation.persistCount,
          negotiation.npcConcessionCount,
      );
      return getConcessionTier(chance);
  }, [probeReveal, currentCustomer, negotiation.offerPrincipal, negotiation.persistCount, negotiation.npcConcessionCount]);

  const {
    offerPrincipal,
    setOfferPrincipal,
    selectedRate,
    setSelectedRate,
    submitOffer,
    acceptUltimatum,
    isWalkedAway,
    lastAction,
    mood,
    patience,
    currentAskPrice,
    offerHistory,
    revealedMinimum,
    // Push-Pull fields
    lastOfferAmount,
    persistCount,
    npcConcessionCount,
    lastPushPullResult,
    // Insight-aware NPC response
    insightAwareText,
    // B-10: Concession tier
    concessionTier,
    // Round tracking
    roundCount,
    // Empathy patience modifier
    empathyPatienceModifier,
    setEmpathyPatienceModifier,
    // Patience warning & ultimatum
    patienceWarningLevel,
    ultimatum,
    warningDialogue,
    // E-3: Patience decision gradient
    patiencePhase,
  } = negotiation;

  const [chatLog, setChatLog] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rejectionState, setRejectionState] = useState<{show: boolean, text: string}>({show: false, text: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // #6: Screen shake state on insult offers
  const [isShaking, setIsShaking] = useState(false);

  // E-UI-1: Golden glow on 0% charity deal
  const [showCharityGlow, setShowCharityGlow] = useState(false);

  // #32: Push-pull instinct overlay text
  const [pushPullOverlay, setPushPullOverlay] = useState<{ text: string; color: string } | null>(null);
  const pushPullOverlayKeyRef = useRef(0);

  // Push-Pull: Track previous ask price for animation
  const [prevAskPrice, setPrevAskPrice] = useState<number>(currentAskPrice);
  const [askPriceChanged, setAskPriceChanged] = useState(false);
  const askChangeAmount = prevAskPrice - currentAskPrice;

  // Track Ask price changes for animation
  useEffect(() => {
    if (currentAskPrice !== prevAskPrice && currentAskPrice < prevAskPrice) {
      setAskPriceChanged(true);
      const timer = setTimeout(() => {
        setPrevAskPrice(currentAskPrice);
        setAskPriceChanged(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentAskPrice !== prevAskPrice) {
      setPrevAskPrice(currentAskPrice);
    }
  }, [currentAskPrice, prevAskPrice]);

  const isBinaryChoice = currentCustomer?.interactionType === 'NEGOTIATION';

  const instinct = currentCustomer && item && !isBinaryChoice
      ? getMerchantInstinct(offerPrincipal, selectedRate, currentCustomer, item)
      : { text: "", color: "" };

  const event = currentCustomer?.eventId ? ALL_STORY_EVENTS.find(e => e.id === currentCustomer.eventId) : null;
  let canFulfillDeal = true;
  let fulfillmentError = "";

  if (isBinaryChoice && event) {
      if (event.targetItemId) {
          const target = state.inventory.find(i => i.id === event.targetItemId);
          if (!target || (target.status !== ItemStatus.ACTIVE && target.status !== ItemStatus.FORFEIT)) {
              canFulfillDeal = false;
              fulfillmentError = "ITEM MISSING";
          }
      }

      if (canFulfillDeal) {
          const standardOutcome = event.outcomes?.['deal_standard'];
          if (standardOutcome && standardOutcome.some(e => e.type === 'FORCE_SELL_ALL')) {
               const hasItems = state.inventory.some(i =>
                   i.relatedChainId === currentCustomer!.chainId &&
                   (i.status === ItemStatus.ACTIVE || i.status === ItemStatus.FORFEIT)
               );
               if (!hasItems) {
                   canFulfillDeal = false;
                   fulfillmentError = "STOCK EMPTY";
               }
          }
      }
  }

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog, offerHistory]);

  // Initialize chat on new customer
  useEffect(() => {
    if (currentCustomer) {
      setRejectionState({show: false, text: ''});
      setIsSubmitting(false);

      const greetingText = currentCustomer.dialogue?.greeting || "...";
      const pawnReasonText = currentCustomer.dialogue?.pawnReason;

      const logs: LogEntry[] = [
          { id: 'init-1', sender: 'customer', text: greetingText, sentiment: 'neutral' }
      ];

      if (pawnReasonText) {
          logs.push({ id: 'init-2', sender: 'customer', text: pawnReasonText, sentiment: 'neutral' });
      }

      setChatLog(logs);
    }
  }, [currentCustomer?.id]);

  // Handle leverage/narrative actions
  useEffect(() => {
      if (!lastAction) return;

      if (lastAction.type === 'LEVERAGE') {
          setChatLog(prev => [...prev, {
              id: `lev-${lastAction.id}`,
              sender: 'player',
              text: `[INTEL USED] ${lastAction.text}`,
              sentiment: 'neutral'
          }, {
              id: `lev-react-${lastAction.id}`,
              sender: 'customer',
              text: "...",
              subtext: lastAction.subtext || "Mood Worsened",
              sentiment: 'negative'
          }]);
      } else if (lastAction.type === 'NARRATIVE') {
          const newEntries: LogEntry[] = [];
          newEntries.push({
              id: `narrative-p-${lastAction.id}`,
              sender: 'player',
              text: lastAction.text,
              sentiment: 'neutral'
          });

          if (lastAction.customerResponse) {
               newEntries.push({
                  id: `narrative-c-${lastAction.id}`,
                  sender: 'customer',
                  text: lastAction.customerResponse,
                  subtext: lastAction.subtext || "Deep Talk",
                  sentiment: 'positive'
               });
          }

          setChatLog(prev => [...prev, ...newEntries]);
      }
  }, [lastAction]);

  // Track discovered trait IDs to avoid duplicate trait entries
  const discoveredTraitIdsRef = useRef<Set<string>>(new Set());
  const processedCountRef = useRef<number>(0);
  const lastInsightAwareTextRef = useRef<string | null>(null);

  // Convert appraisal feedbacks to inner monologue entries
  useEffect(() => {
      if (appraisalFeedbacks.length === 0) return;
      if (appraisalFeedbacks.length <= processedCountRef.current) return;

      const newEntries: LogEntry[] = [];

      for (let i = processedCountRef.current; i < appraisalFeedbacks.length; i++) {
          const feedback = appraisalFeedbacks[i];
          const feedbackId = `inner-${feedback.type}-${Date.now()}-${i}`;

          if (feedback.type === 'TRAIT_DISCOVERED' && feedback.traitId) {
              if (discoveredTraitIdsRef.current.has(feedback.traitId)) continue;
              discoveredTraitIdsRef.current.add(feedback.traitId);
          }

          // B-8: Attitude shift appears as customer speech, not inner monologue
          if (feedback.type === 'ATTITUDE_SHIFT') {
              newEntries.push({
                  id: feedbackId,
                  sender: 'customer',
                  text: feedback.text,
                  sentiment: 'positive',
                  data: { feedbackType: 'ATTITUDE_SHIFT' },
              });
              continue;
          }

          newEntries.push({
              id: feedbackId,
              sender: 'player',
              text: feedback.text,
              sentiment: feedback.type === 'MISHAP' || feedback.type === 'IMPATIENT'
                  ? 'negative'
                  : feedback.type === 'TRAIT_DISCOVERED' || feedback.type === 'BREAKTHROUGH'
                  ? 'positive'
                  : 'neutral',
              type: 'INNER_MONOLOGUE',
              data: {
                  feedbackType: feedback.type,
                  traitName: feedback.traitName,
                  isBonus: feedback.isBonus,
              },
          });
      }

      processedCountRef.current = appraisalFeedbacks.length;

      if (newEntries.length > 0) {
          setChatLog(prev => [...prev, ...newEntries]);
      }
  }, [appraisalFeedbacks]);

  // Clear tracking refs when customer changes
  useEffect(() => {
      discoveredTraitIdsRef.current.clear();
      processedCountRef.current = 0;
      lastInsightAwareTextRef.current = null;
      setShowStolenWarning(false);
      setStolenDecisionMade(false);
      setPressureUsed(false);
      setHeartStrikeUsed(false);
      setEmpathyUsed(false);
      setProbeUsed(false);
      setProbeReveal(null);
      cumulativeReductionRef.current = 0;
      floorCapShownRef.current = false;
  }, [currentCustomer?.id]);

  const getRejectionText = (customer: Customer, isAngry: boolean) => {
      const defaultLines = { standard: "行吧，那我走了。", angry: "浪费时间！", desperate: "求求你了..." };
      const lines: RejectionLines = customer.dialogue?.rejectionLines || defaultLines;
      const rejectedText = customer.dialogue?.rejected || "再见。";

      if (isAngry) return lines.angry || lines.standard;
      if (customer.behaviorTags.includes('DESPERATE')) return lines.desperate || lines.standard;
      return lines.standard || rejectedText;
  };

  if (!currentCustomer || !item) return null;

  // Handle insight button click
  const handleInsightClick = () => {
    if (!canUseInsight()) return;
    playSfx('CLICK');
    useInsight();
  };

  // Handle deep insight (layer 2) button click
  const handleDeepInsightClick = () => {
    if (!canDeepInsight) return;
    playSfx('CLICK');
    performDeepInsight();
  };

  // Handle full insight (layer 3) button click
  const handleFullInsightClick = () => {
    if (!canFullInsight) return;
    playSfx('CLICK');
    performFullInsight();
  };

  // Track whether the latest offer was a COUNTER (push-pull zone)
  const lastOfferWasCounterRef = useRef<boolean>(false);

  // Generate push-pull feedback in chat when lastPushPullResult changes
  useEffect(() => {
      if (!lastPushPullResult || !lastOfferWasCounterRef.current) return;
      lastOfferWasCounterRef.current = false;

      const { conceded, patienceLost, concessionAmount } = lastPushPullResult;

      let counterMessage: string;
      let counterSentiment: 'neutral' | 'negative' | 'positive';
      let counterSubtext: string | undefined;

      if (conceded && !patienceLost) {
          counterMessage = "...好吧，我可以少要点。";
          counterSentiment = 'positive';
          counterSubtext = `让步 -$${concessionAmount}`;
      } else if (conceded && patienceLost) {
          counterMessage = "行，就这样吧...别再磨了。";
          counterSentiment = 'neutral';
          counterSubtext = `让步 -$${concessionAmount} | Patience -1`;
      } else if (!conceded && !patienceLost) {
          counterMessage = "这个价我接受不了，但咱们可以再谈谈。";
          counterSentiment = 'neutral';
          counterSubtext = undefined;
      } else {
          counterMessage = "不行，而且我没多少耐心了。";
          counterSentiment = 'negative';
          counterSubtext = `Patience -1`;
      }

      // In danger zone, override counter message with warning dialogue
      const displayCounterMessage = (patienceWarningLevel === 'danger' && warningDialogue)
          ? warningDialogue
          : counterMessage;

      setChatLog(prev => [...prev, {
          id: `counter-${Date.now()}`,
          sender: 'customer' as const,
          text: displayCounterMessage,
          subtext: counterSubtext,
          sentiment: patienceWarningLevel === 'danger' ? 'negative' : counterSentiment
      }]);

      // #32: Show push-pull instinct overlay
      let overlayText = '';
      let overlayColor = 'text-stone-400';
      if (conceded && !patienceLost) {
          overlayText = '他松口了...还能再压一压';
          overlayColor = 'text-pawn-green';
      } else if (conceded && patienceLost) {
          overlayText = '松口了，但他快没耐心了';
          overlayColor = 'text-amber-400';
      } else if (!conceded && !patienceLost) {
          overlayText = '没有动摇，再试试';
          overlayColor = 'text-stone-400';
      } else {
          overlayText = '对方很不耐烦了';
          overlayColor = 'text-red-400';
      }
      pushPullOverlayKeyRef.current += 1;
      setPushPullOverlay({ text: overlayText, color: overlayColor });
      setTimeout(() => setPushPullOverlay(null), 2500);
  }, [lastPushPullResult]);

  // Add insightAwareText to chat log when it changes
  useEffect(() => {
      if (!insightAwareText || insightAwareText === lastInsightAwareTextRef.current) return;
      lastInsightAwareTextRef.current = insightAwareText;

      setChatLog(prev => [...prev, {
          id: `insight-aware-${Date.now()}`,
          sender: 'customer' as const,
          text: insightAwareText,
          sentiment: 'neutral' as const,
          type: 'INNER_MONOLOGUE' as const,
          data: { feedbackType: 'INSIGHT_AWARE' },
      }]);
  }, [insightAwareText]);

  // warningDialogue is available but NOT pushed to chat log separately.
  // Visual warnings (flame color + "危险" label) are sufficient.
  // Adding a second chat bubble would break the "one response per action" pattern.

  // Handle pressure skill activation
  const handlePressure = () => {
      if (!currentCustomer || pressureUsed || !canUsePressureNow) return;

      // Determine if customer has just conceded (for timing bonus)
      const afterConcession = lastPushPullResult?.conceded ?? false;

      // Calculate existing floor reduction (difference from original minimumAmount)
      // Note: originalFloor is approximated as current minimumAmount since we don't track original separately
      const originalFloor = currentCustomer.minimumAmount;
      const currentFloor = currentCustomer.minimumAmount;
      const existingReduction = 0; // First use in this negotiation

      const result = applyPressure(originalFloor, currentFloor, afterConcession, existingReduction);

      // Update cumulative reduction tracking
      cumulativeReductionRef.current += result.effectiveReduction;

      // Mark as used
      setPressureUsed(true);
      dispatch({ type: 'MARK_SKILL_USED', payload: { skillId: 'APPLY_PRESSURE' } });

      // Add feedback to chat log
      const bonusText = result.timingBonusApplied ? " (时机加成!)" : "";
      const reductionAmount = currentFloor - result.newFloor;

      const newEntries: LogEntry[] = [{
          id: `pressure-${Date.now()}`,
          sender: 'player' as const,
          text: `[施压] 你施加了心理压力，迫使对方降低底线。${bonusText}`,
          subtext: `底价 -$${reductionAmount} | 耐心 -${result.patienceCost}`,
          sentiment: 'neutral' as const,
          type: 'INNER_MONOLOGUE' as const,
      }];

      // Check if floor cap is reached after this skill use
      if (isCapReached(cumulativeReductionRef.current) && !floorCapShownRef.current) {
          floorCapShownRef.current = true;
          const hintText = getFloorCapTexts().getRandom('floor_cap_reached');
          if (hintText) {
              newEntries.push({
                  id: `floor-cap-${Date.now()}`,
                  sender: 'player' as const,
                  text: hintText,
                  sentiment: 'neutral' as const,
                  type: 'INNER_MONOLOGUE' as const,
                  data: { feedbackType: 'FLOOR_CAP' },
              });
          }
      }

      setChatLog(prev => [...prev, ...newEntries]);

      // Apply floor reduction via dedicated action (sets exact newFloor value)
      if (reductionAmount > 0) {
          dispatch({ type: 'APPLY_SKILL_FLOOR_REDUCTION', payload: { newFloor: result.newFloor } });
      }

      // Sync patience cost to the hook's local state (which then auto-syncs to global state via App.tsx effect)
      if (result.patienceCost > 0) {
          negotiation.applyExternalPatienceCost(result.patienceCost);
          // If patience will drop to 0, trigger walk-away flow to avoid stuck UI
          if (patience <= result.patienceCost) {
              send({ type: 'CUSTOMER_REJECTED' });
              rejectCustomer('RESENTFUL');
          }
      }

      playSfx('CLICK');
  };

  // Handle heart strike skill activation
  const handleHeartStrike = () => {
      if (!currentCustomer || heartStrikeUsed || !canUseHeartStrikeNow) return;

      const afterConcession = lastPushPullResult?.conceded ?? false;
      const originalFloor = currentCustomer.minimumAmount;
      const currentFloor = currentCustomer.minimumAmount;
      const existingReduction = 0;

      const result = applyHeartStrike(originalFloor, currentFloor, currentCustomer.behaviorTags, afterConcession, existingReduction);

      // Update cumulative reduction tracking (heart strike currently returns 0 reduction)
      cumulativeReductionRef.current += result.effectiveReduction;

      setHeartStrikeUsed(true);
      dispatch({ type: 'MARK_SKILL_USED', payload: { skillId: 'HEART_STRIKE' } });

      const bonusText = result.timingBonusApplied ? " (时机加成!)" : "";
      const reductionAmount = currentFloor - result.newFloor;

      const hsEntries: LogEntry[] = [{
          id: `heartstrike-${Date.now()}`,
          sender: 'player' as const,
          text: `[攻心] 你抓住了对方的心理弱点，轻描淡写地提了一句。${bonusText}`,
          subtext: `对方心防动摇，更容易让步 | 不消耗耐心`,
          sentiment: 'neutral' as const,
          type: 'INNER_MONOLOGUE' as const,
      }];

      // Check if floor cap is reached after this skill use
      if (isCapReached(cumulativeReductionRef.current) && !floorCapShownRef.current) {
          floorCapShownRef.current = true;
          const hintText = getFloorCapTexts().getRandom('floor_cap_reached');
          if (hintText) {
              hsEntries.push({
                  id: `floor-cap-hs-${Date.now()}`,
                  sender: 'player' as const,
                  text: hintText,
                  sentiment: 'neutral' as const,
                  type: 'INNER_MONOLOGUE' as const,
                  data: { feedbackType: 'FLOOR_CAP' },
              });
          }
      }

      setChatLog(prev => [...prev, ...hsEntries]);

      if (reductionAmount > 0) {
          dispatch({ type: 'APPLY_SKILL_FLOOR_REDUCTION', payload: { newFloor: result.newFloor } });
      }

      // Heart strike does NOT cost patience (patienceCost = 0)

      playSfx('CLICK');
  };

  // Handle Empathy interaction
  const handleEmpathy = () => {
      if (!currentCustomer || empathyUsed || !insightResult) return;

      // Check AP availability
      if (state.stats.actionPoints < 1) return;

      // Consume 1 AP (same cost as Insight)
      dispatch({ type: 'CONSUME_AP', payload: 1 });

      setEmpathyUsed(true);

      // Determine correctness based on disposition
      // EMPATHY is effective on emotional/sincere NPCs: 'desperate' | 'sincere'
      // Incorrect on shrewd/calculating NPCs: 'bluffing' | 'firm'
      const disposition = insightResult.disposition as 'desperate' | 'sincere' | 'bluffing' | 'firm';
      const isCorrect = disposition === 'desperate' || disposition === 'sincere';
      const feedback = getEmpathyFeedback(disposition, isCorrect);

      if (isCorrect) {
          // Correct: apply patience loss modifier for remaining rounds
          setEmpathyPatienceModifier(GAME_CONFIG.NEGOTIATION.EMPATHY.PATIENCE_LOSS_MODIFIER);

          setChatLog(prev => [...prev, {
              id: `empathy-${Date.now()}`,
              sender: 'player' as const,
              text: `[共情] ${feedback.text}`,
              subtext: feedback.subtext || undefined,
              sentiment: 'positive' as const,
              type: 'INNER_MONOLOGUE' as const,
              data: { feedbackType: 'EMPATHY_SUCCESS' },
          }]);
      } else {
          // Incorrect: negative feedback only, no patience penalty
          setChatLog(prev => [...prev, {
              id: `empathy-${Date.now()}`,
              sender: 'player' as const,
              text: `[共情] ${feedback.text}`,
              subtext: feedback.subtext || undefined,
              sentiment: 'negative' as const,
              type: 'INNER_MONOLOGUE' as const,
              data: { feedbackType: 'EMPATHY_FAIL' },
          }]);
      }

      playSfx('CLICK');
  };

  // Handle Probe interaction
  const handleProbe = () => {
      if (!currentCustomer || probeUsed || !insightResult) return;

      setProbeUsed(true);

      // Determine correctness based on disposition
      // PROBE is effective on bluffing/shrewd NPCs: 'bluffing' | 'firm'
      // Incorrect on emotional/vulnerable NPCs: 'desperate' | 'sincere'
      const disposition = insightResult.disposition as 'desperate' | 'sincere' | 'bluffing' | 'firm';
      const isCorrect = disposition === 'bluffing' || disposition === 'firm';
      const feedback = getProbeFeedback(disposition, isCorrect);

      if (isCorrect) {
          // Correct: generate probe reveal with floor range and concession tier
          const reveal = generateProbeReveal(
              currentCustomer.minimumAmount,
              currentCustomer.behaviorTags,
              offerPrincipal,
              persistCount,
              npcConcessionCount,
          );
          setProbeReveal(reveal);

          const tierLabel = getConcessionTierLabel(reveal.concessionTier);

          setChatLog(prev => [...prev, {
              id: `probe-${Date.now()}`,
              sender: 'player' as const,
              text: `[试探] ${feedback.text}`,
              subtext: `底价 $${reveal.floorPrice} | ${tierLabel}`,
              sentiment: 'positive' as const,
              type: 'INNER_MONOLOGUE' as const,
              data: { feedbackType: 'PROBE_SUCCESS' },
          }]);
      } else {
          // Incorrect: negative feedback only, no patience penalty
          setChatLog(prev => [...prev, {
              id: `probe-${Date.now()}`,
              sender: 'player' as const,
              text: `[试探] ${feedback.text}`,
              subtext: feedback.subtext || undefined,
              sentiment: 'negative' as const,
              type: 'INNER_MONOLOGUE' as const,
              data: { feedbackType: 'PROBE_FAIL' },
          }]);
      }

      playSfx('CLICK');
  };

  const handleOffer = () => {
    if (isWalkedAway || isSubmitting) return;

    const prevPatience = patience;
    const result = submitOffer();

    const playerLog: LogEntry = {
        id: `offer-${Date.now()}`,
        sender: 'player',
        text: `OFFER: $${offerPrincipal} @ ${formatRate(selectedRate)}${unitLabel}`,
        sentiment: 'neutral'
    };

    const patienceLoss = prevPatience - result.patienceRemaining;

    if (result.status === 'WALK_AWAY') {
        setChatLog(prev => [...prev, playerLog]);
        send({ type: 'CUSTOMER_REJECTED' });
        rejectCustomer('RESENTFUL');
        return;
    }

    if (result.status === 'ULTIMATUM') {
        // NPC fires ultimatum: add their ultimatum dialogue to chat
        setChatLog(prev => [...prev, playerLog, {
            id: `ultimatum-${Date.now()}`,
            sender: 'customer' as const,
            text: result.message,
            sentiment: 'negative' as const,
        }]);
        return;
    }

    if (result.status === 'COUNTER') {
        lastOfferWasCounterRef.current = true;
        setChatLog(prev => [...prev, playerLog]);
    } else {
        let penaltyLabel = "";
        if (result.status === 'PRINCIPAL_TOO_LOW') penaltyLabel = "LOWBALL";
        if (result.status === 'INSULT') {
          penaltyLabel = "INSULT";
          // #6: Trigger screen shake on insulting offer
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }
        if (result.status === 'TOTAL_REPAYMENT_EXCEEDED') penaltyLabel = "USURY";

        const subtext = patienceLoss > 0 ? `Patience -${patienceLoss} [${penaltyLabel}]` : undefined;

        // In danger zone, override NPC response with warning dialogue
        const displayMessage = (patienceWarningLevel === 'danger' && warningDialogue)
            ? warningDialogue
            : result.message;

        const customerLog: LogEntry = {
            id: `resp-${Date.now()}`,
            sender: 'customer',
            text: displayMessage,
            subtext: subtext,
            sentiment: patienceLoss > 0 ? 'negative' : 'neutral'
        };

        setChatLog(prev => [...prev, playerLog, customerLog]);
    }

    if (result.status === 'ACCEPTED') {
        if (isCurrentItemStolen() && !stolenDecisionMade) {
            setShowStolenWarning(true);
            return;
        }

        setIsSubmitting(true);
        // E-UI-1: Trigger golden glow for 0% charity deals
        if (selectedRate === 0) {
            setShowCharityGlow(true);
            setTimeout(() => setShowCharityGlow(false), 2000);
        }
        const txResult = evaluateTransaction(offerPrincipal, selectedRate, currentAskPrice);
        setTimeout(() => {
            send({ type: 'TRANSACTION_COMPLETE' });
            commitTransaction(txResult);
        }, 800);
    }
  };

  const handleStolenAccept = () => {
      playSfx('CLICK');
      setStolenDecisionMade(true);
      setShowStolenWarning(false);
      handleStolenItemDecision(true);

      setIsSubmitting(true);
      // E-UI-1: Trigger golden glow for 0% charity deals
      if (selectedRate === 0) {
          setShowCharityGlow(true);
          setTimeout(() => setShowCharityGlow(false), 2000);
      }
      const txResult = evaluateTransaction(offerPrincipal, selectedRate, currentAskPrice);
      setTimeout(() => {
          send({ type: 'TRANSACTION_COMPLETE' });
          commitTransaction(txResult);
      }, 800);
  };

  const handleStolenReject = () => {
      playSfx('FAIL');
      setStolenDecisionMade(true);
      setShowStolenWarning(false);
      handleStolenItemDecision(false);
  };

  const handleBinaryAccept = () => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const acceptedMsg = currentCustomer.dialogue?.accepted?.fair || "成交。";

      const mockResult: TransactionResult = {
          success: true,
          message: acceptedMsg,
          cashDelta: currentAskPrice,
          reputationDelta: {},
          item: currentCustomer.item,
          dealQuality: 'fair',
          terms: { principal: 0, rate: 0.10 }
      };

      send({ type: 'TRANSACTION_COMPLETE' });
      commitTransaction(mockResult);
  };

  const handleManualReject = () => {
      if (!currentCustomer) return;
      const text = getRejectionText(currentCustomer, mood === 'Angry');
      setRejectionState({ show: true, text });
  };

  const completeRejection = () => {
    send({ type: 'CUSTOMER_REJECTED' });
    rejectCustomer();
  };

  const cashAvailable = state.stats.cash;
  const canAfford = cashAvailable >= offerPrincipal;
  const canInteract = !isWalkedAway && !rejectionState.show && !isSubmitting;

  return (
    <div className={cn(
      "flex flex-col h-full relative bg-noir-100 border-l border-noir-400",
      isShaking && "animate-shake"
    )}>
      {/* E-UI-1: Golden glow overlay for 0% charity deal */}
      {showCharityGlow && (
          <div className="absolute inset-0 z-[70] pointer-events-none">
              <style>
                  {`
                      @keyframes charityGlowPulse {
                          0% { opacity: 0; box-shadow: inset 0 0 30px rgba(251, 191, 36, 0); }
                          20% { opacity: 1; box-shadow: inset 0 0 80px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2); }
                          50% { opacity: 0.8; box-shadow: inset 0 0 60px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.15); }
                          100% { opacity: 0; box-shadow: inset 0 0 0px rgba(251, 191, 36, 0); }
                      }
                      @keyframes charityRing {
                          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                      }
                  `}
              </style>
              {/* Full-panel golden border glow */}
              <div
                  className="absolute inset-0 rounded"
                  style={{ animation: 'charityGlowPulse 2s ease-out forwards' }}
              />
              {/* Central expanding ring */}
              <div
                  className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border-2 border-amber-400/60"
                  style={{ animation: 'charityRing 1.5s ease-out forwards' }}
              />
              <div
                  className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border border-amber-300/40"
                  style={{ animation: 'charityRing 1.5s ease-out 0.2s forwards', opacity: 0 }}
              />
          </div>
      )}

      <CustomerHeader
          customer={currentCustomer}
          patience={patience}
          mood={mood}
          patienceWarningLevel={patienceWarningLevel}
          insightResult={insightResult}
          canUseInsight={canUseInsight()}
          hasUsedInsight={insightResult !== null}
          insightBlockReason={insightStatus.blockReason ? getBlockReasonText(insightStatus.blockReason) : undefined}
          insightRevealedLayer={insightResult?.revealedLayer}
          onInsightClick={handleInsightClick}
          foresightInfo={foresightInfo}
          canDeepInsight={canDeepInsight}
          onDeepInsightClick={handleDeepInsightClick}
          canFullInsight={canFullInsight}
          onFullInsightClick={handleFullInsightClick}
          canInteract={canInteract}
          canUseEmpathy={hasEmpathyInteraction && !empathyUsed && state.stats.actionPoints >= 1}
          empathyUsed={empathyUsed}
          onEmpathy={hasEmpathyInteraction ? handleEmpathy : undefined}
          canUseProbe={false /* DISABLED: probe interaction pending redesign */}
          probeUsed={true /* DISABLED */}
          onProbe={undefined /* DISABLED */}
        />

      {/* Rejection Overlay */}
      {rejectionState.show && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-300">
                <div className="bg-noir-200 border-2 border-red-900/50 p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center">
                    <div className="text-6xl font-serif text-noir-txt-muted opacity-20 absolute top-4 left-4">"</div>
                    <p className="font-serif text-xl text-center text-noir-txt-primary italic leading-relaxed z-10 my-6">
                        {rejectionState.text}
                    </p>
                    <Button
                        variant="danger"
                        onClick={completeRejection}
                        className="w-full h-14 text-lg tracking-widest mt-4"
                    >
                        <XCircle className="w-5 h-5 mr-2" />
                        DISMISS
                    </Button>
                </div>
            </div>
      )}

      {/* Stolen Goods Warning Overlay */}
      {showStolenWarning && (
          <StolenWarningOverlay
              onAccept={handleStolenAccept}
              onReject={handleStolenReject}
          />
      )}

      {/* Ultimatum Overlay */}
      {ultimatum?.active && ultimatum.price !== null && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-300">
              <div className="bg-noir-200 border-2 border-red-800/70 p-6 max-w-md w-full shadow-2xl relative flex flex-col items-center">
                  {/* Warning Icon */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-red-950/80 rounded-full flex items-center justify-center border-4 border-red-700 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                      <Flame className="w-8 h-8 text-red-400 animate-pulse" />
                  </div>

                  {/* Title */}
                  <div className="mt-8 mb-4 text-center">
                      <h3 className="text-lg font-bold text-red-500 uppercase tracking-widest mb-1">
                          ULTIMATUM
                      </h3>
                      <p className="text-xs text-noir-txt-muted font-mono">
                          FINAL OFFER
                      </p>
                  </div>

                  {/* Customer portrait + dialogue */}
                  <div className="flex items-start gap-3 bg-black/40 border border-red-900/50 rounded p-4 mb-4 w-full">
                      <img
                          src={(() => {
                              if (currentCustomer.portraits?.neutral) return currentCustomer.portraits.neutral;
                              if (currentCustomer.chainId) {
                                  const charId = currentCustomer.chainId.replace(/^chain_/, '');
                                  return getCharacterPortraitPath(charId, 'neutral');
                              }
                              return PORTRAIT_PLACEHOLDER;
                          })()}
                          alt={currentCustomer.name}
                          className="w-12 h-12 rounded-full object-cover border border-red-700/50 shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = PORTRAIT_PLACEHOLDER; }}
                      />
                      <p className="font-serif text-sm text-noir-txt-primary leading-relaxed italic">
                          "{chatLog.filter(e => e.sender === 'customer').slice(-1)[0]?.text || '...'}"
                      </p>
                  </div>

                  {/* Price Display */}
                  <div className="bg-red-950/30 border border-red-900/50 rounded p-4 mb-6 w-full text-center">
                      <p className="text-xs text-red-400/70 font-mono uppercase tracking-wider mb-1">
                          FINAL PRICE
                      </p>
                      <p className="text-3xl font-bold text-amber-400 font-mono">
                          ${ultimatum.price}
                      </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 w-full">
                      <Button
                          variant="danger"
                          onClick={() => {
                              playSfx('FAIL');
                              // Reject ultimatum: submit offer at 0 to trigger walk-away logic
                              setOfferPrincipal(0);
                              const result = submitOffer();
                              setChatLog(prev => [...prev, {
                                  id: `ult-reject-${Date.now()}`,
                                  sender: 'customer' as const,
                                  text: result.message,
                                  sentiment: 'negative' as const,
                              }]);
                              send({ type: 'CUSTOMER_REJECTED' });
                              rejectCustomer('RESENTFUL');
                          }}
                          className="flex-1 h-12 bg-red-900/50 hover:bg-red-800/60 border-red-700"
                      >
                          <XCircle className="w-4 h-4 mr-2" />
                          REFUSE
                      </Button>
                      <Button
                          variant="primary"
                          onClick={() => {
                              playSfx('CLICK');
                              // Accept ultimatum: use dedicated method to avoid stale closure race
                              const result = acceptUltimatum();
                              if (!result) return;

                              // Add acceptance dialogue to chat log
                              setChatLog(prev => [...prev, {
                                  id: `ultimatum-accept-${Date.now()}`,
                                  sender: 'customer' as const,
                                  text: result.message,
                                  sentiment: 'positive' as const,
                              }]);

                              // Check stolen goods
                              if (isCurrentItemStolen() && !stolenDecisionMade) {
                                  setShowStolenWarning(true);
                                  return;
                              }

                              // Complete transaction using result.acceptedPrice (not state)
                              setIsSubmitting(true);
                              const txResult = evaluateTransaction(result.acceptedPrice, selectedRate, currentAskPrice);
                              setTimeout(() => {
                                  send({ type: 'TRANSACTION_COMPLETE' });
                                  commitTransaction(txResult);
                              }, 800);
                          }}
                          className="flex-1 h-12 bg-pawn-green/80 hover:bg-pawn-green border-green-700 text-white"
                      >
                          ACCEPT ${ultimatum.price}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* #32: Push-pull instinct overlay */}
      {pushPullOverlay && (
        <div
          key={pushPullOverlayKeyRef.current}
          className="absolute left-1/2 top-1/3 -translate-x-1/2 z-50 pointer-events-none animate-fade-in-up"
        >
          <span className={cn(
            "font-serif italic text-sm px-4 py-2 rounded bg-black/70 backdrop-blur-sm shadow-lg whitespace-nowrap",
            pushPullOverlay.color
          )}>
            "{pushPullOverlay.text}"
          </span>
        </div>
      )}

      {/* Chat Log */}
      <ChatLog
          chatLog={chatLog}
          offerHistory={offerHistory}
          isBinaryChoice={isBinaryChoice}
          scrollRef={scrollRef}
      />

      {/* Control Deck */}
      <ControlDeck
          currentCustomer={currentCustomer}
          item={item}
          isBinaryChoice={isBinaryChoice}
          cashAvailable={cashAvailable}
          offerPrincipal={offerPrincipal}
          setOfferPrincipal={setOfferPrincipal}
          selectedRate={selectedRate}
          setSelectedRate={setSelectedRate}
          currentAskPrice={currentAskPrice}
          canInteract={canInteract}
          canAfford={canAfford}
          isSubmitting={isSubmitting}
          revealedMinimum={revealedMinimum}
          debugRevealFloor={state.debugRevealFloor}
          lastOfferAmount={lastOfferAmount}
          askPriceChanged={askPriceChanged}
          askChangeAmount={askChangeAmount}
          offerHistoryLength={offerHistory.length}
          instinct={instinct}
          canFulfillDeal={canFulfillDeal}
          fulfillmentError={fulfillmentError}
          formatRate={formatRate}
          unitLabel={unitLabel}
          contractTierHints={contractTierHints}
          canUsePressure={canUsePressureNow}
          pressureUsed={pressureUsed}
          onPressure={pressureSkillAvailable ? handlePressure : undefined}
          canUseHeartStrike={canUseHeartStrikeNow}
          heartStrikeUsed={heartStrikeUsed}
          onHeartStrike={heartStrikeSkillAvailable ? handleHeartStrike : undefined}
          roundCount={roundCount}
          probeReveal={probeReveal}
          liveConcessionTier={liveConcessionTier}
          concessionTier={concessionTier}
          patiencePhase={patiencePhase}
          onOffer={handleOffer}
          onManualReject={handleManualReject}
          onBinaryAccept={handleBinaryAccept}
      />
    </div>
  );
};
