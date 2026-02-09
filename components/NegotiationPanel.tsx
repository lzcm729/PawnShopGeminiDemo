
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { useCustomerInsight } from '../hooks/useCustomerInsight';
import { useCharacterAbility } from '../hooks/useCharacterAbility';
import { Button } from './ui/Button';
import { XCircle } from 'lucide-react';
import { Customer, TransactionResult, InterestRate, RejectionLines, ItemStatus } from '../types';
import { ActionLog, OfferRecord } from '../hooks/useNegotiation';
import { getMerchantInstinct } from '../systems/negotiation/instinct';
import { playSfx } from '../systems/game/audio';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { PushPullResult } from '../systems/negotiation/pushPull';
import { useRateDisplay } from './ui/RateDisplayContext';
import { ChatLog, LogEntry } from './negotiation/ChatLog';
import { ControlDeck } from './negotiation/ControlDeck';
import { StolenWarningOverlay } from './negotiation/StolenWarningOverlay';
import { CustomerHeader } from './negotiation/CustomerHeader';

interface NegotiationStateProps {
    negotiation: {
        submitOffer: () => any;
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
    };
    appraisalFeedbacks?: AppraisalFeedback[];
}

// Appraisal feedback structure passed from ItemPanel
export interface AppraisalFeedback {
    type: 'TRAIT_DISCOVERED' | 'RANGE_NARROWED' | 'BREAKTHROUGH' | 'MISHAP' | 'IMPATIENT' | 'ALREADY_KNOWN';
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
  const { canUseInNegotiation, applyPressure, applyHeartStrike, isUnlocked } = useCharacterAbility();
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

  // Customer Insight hook
  const {
    insightResult,
    status: insightStatus,
    canUseInsight,
    useInsight,
    getBlockReasonText,
    getInsightReward,
  } = useCustomerInsight();

  // Insight Interaction state (EMPATHY / PROBE)
  const [empathyUsed, setEmpathyUsed] = useState(false);
  const [probeUsed, setProbeUsed] = useState(false);
  const insightReward = getInsightReward();
  const hasEmpathyInteraction = insightReward?.unlockedInteractions.includes('EMPATHY') ?? false;
  const hasProbeInteraction = insightReward?.unlockedInteractions.includes('PROBE') ?? false;

  const {
    offerPrincipal,
    setOfferPrincipal,
    selectedRate,
    setSelectedRate,
    submitOffer,
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
    lastPushPullResult
  } = negotiation;

  const [chatLog, setChatLog] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rejectionState, setRejectionState] = useState<{show: boolean, text: string}>({show: false, text: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setShowStolenWarning(false);
      setStolenDecisionMade(false);
      setPressureUsed(false);
      setHeartStrikeUsed(false);
      setEmpathyUsed(false);
      setProbeUsed(false);
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

      setChatLog(prev => [...prev, {
          id: `counter-${Date.now()}`,
          sender: 'customer' as const,
          text: counterMessage,
          subtext: counterSubtext,
          sentiment: counterSentiment
      }]);
  }, [lastPushPullResult]);

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

      // Mark as used
      setPressureUsed(true);
      dispatch({ type: 'MARK_SKILL_USED', payload: { skillId: 'APPLY_PRESSURE' } });

      // Add feedback to chat log
      const bonusText = result.timingBonusApplied ? " (时机加成!)" : "";
      const reductionAmount = currentFloor - result.newFloor;

      setChatLog(prev => [...prev, {
          id: `pressure-${Date.now()}`,
          sender: 'player' as const,
          text: `[施压] 你施加了心理压力，迫使对方降低底线。${bonusText}`,
          subtext: `底价 -$${reductionAmount} | 耐心 -${result.patienceCost}`,
          sentiment: 'neutral' as const,
          type: 'INNER_MONOLOGUE' as const,
      }]);

      // Apply floor reduction via dedicated action (sets exact newFloor value)
      if (reductionAmount > 0) {
          dispatch({ type: 'APPLY_SKILL_FLOOR_REDUCTION', payload: { newFloor: result.newFloor } });
      }

      // Sync patience cost to the hook's local state (which then auto-syncs to global state via App.tsx effect)
      if (result.patienceCost > 0) {
          negotiation.applyExternalPatienceCost(result.patienceCost);
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

      setHeartStrikeUsed(true);
      dispatch({ type: 'MARK_SKILL_USED', payload: { skillId: 'HEART_STRIKE' } });

      const bonusText = result.timingBonusApplied ? " (时机加成!)" : "";
      const reductionAmount = currentFloor - result.newFloor;

      setChatLog(prev => [...prev, {
          id: `heartstrike-${Date.now()}`,
          sender: 'player' as const,
          text: `[攻心] 你抓住了对方的心理弱点，轻描淡写地提了一句。${bonusText}`,
          subtext: `底价 -$${reductionAmount} | 不消耗耐心`,
          sentiment: 'neutral' as const,
          type: 'INNER_MONOLOGUE' as const,
      }]);

      if (reductionAmount > 0) {
          dispatch({ type: 'APPLY_SKILL_FLOOR_REDUCTION', payload: { newFloor: result.newFloor } });
      }

      // Heart strike does NOT cost patience (patienceCost = 0)

      playSfx('CLICK');
  };

  // Handle Empathy interaction
  const handleEmpathy = () => {
      if (!currentCustomer || empathyUsed || !insightResult) return;

      setEmpathyUsed(true);

      // Determine correctness based on disposition
      // EMPATHY is effective on emotional/sincere NPCs: 'desperate' | 'sincere'
      // Incorrect on shrewd/calculating NPCs: 'bluffing' | 'firm'
      const disposition = insightResult.disposition;
      const isCorrect = disposition === 'desperate' || disposition === 'sincere';

      if (isCorrect) {
          // Correct: positive feedback, no patience cost
          // NOTE: "reduce patience cost for remaining rounds" would require framework
          // changes to applyExternalPatienceCost (currently rejects negative values).
          // For now, correct match gives zero cost + positive feedback.
          setChatLog(prev => [...prev, {
              id: `empathy-${Date.now()}`,
              sender: 'player' as const,
              text: '[共情] 你表达了对对方处境的理解，氛围变得温和了一些。',
              subtext: '好感上升',
              sentiment: 'positive' as const,
              type: 'INNER_MONOLOGUE' as const,
          }]);
      } else {
          // Incorrect: extra patience cost, negative reaction
          negotiation.applyExternalPatienceCost(2);

          setChatLog(prev => [...prev, {
              id: `empathy-${Date.now()}`,
              sender: 'player' as const,
              text: '[共情] 你试图表示理解，但对方似乎觉得你在套近乎。',
              subtext: '耐心 -2 | 好感下降',
              sentiment: 'negative' as const,
              type: 'INNER_MONOLOGUE' as const,
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
      const disposition = insightResult.disposition;
      const isCorrect = disposition === 'bluffing' || disposition === 'firm';

      if (isCorrect) {
          // Correct: positive feedback, no patience cost
          // NOTE: "reveal more bottom-line information" would require framework
          // changes. For now, correct match gives zero cost + positive feedback.
          setChatLog(prev => [...prev, {
              id: `probe-${Date.now()}`,
              sender: 'player' as const,
              text: '[试探] 你巧妙地试探了对方的底线，对方的虚张声势被你看穿了。',
              subtext: '底线信息增加',
              sentiment: 'positive' as const,
              type: 'INNER_MONOLOGUE' as const,
          }]);
      } else {
          // Incorrect: lose affinity, patience penalty
          negotiation.applyExternalPatienceCost(2);

          setChatLog(prev => [...prev, {
              id: `probe-${Date.now()}`,
              sender: 'player' as const,
              text: '[试探] 你的试探让对方感到不被信任，关系变得紧张。',
              subtext: '耐心 -2 | 好感下降',
              sentiment: 'negative' as const,
              type: 'INNER_MONOLOGUE' as const,
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

    if (result.status === 'COUNTER') {
        lastOfferWasCounterRef.current = true;
        setChatLog(prev => [...prev, playerLog]);
    } else {
        let penaltyLabel = "";
        if (result.status === 'PRINCIPAL_TOO_LOW') penaltyLabel = "LOWBALL";
        if (result.status === 'INSULT') penaltyLabel = "INSULT";
        if (result.status === 'TOTAL_REPAYMENT_EXCEEDED') penaltyLabel = "USURY";

        const subtext = patienceLoss > 0 ? `Patience -${patienceLoss} [${penaltyLabel}]` : undefined;

        const customerLog: LogEntry = {
            id: `resp-${Date.now()}`,
            sender: 'customer',
            text: result.message,
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
        const txResult = evaluateTransaction(offerPrincipal, selectedRate);
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
      const txResult = evaluateTransaction(offerPrincipal, selectedRate);
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
    <div className="flex flex-col h-full relative bg-noir-100 border-l border-noir-400">
      <CustomerHeader
          customer={currentCustomer}
          patience={patience}
          mood={mood}
          onInsightClick={handleInsightClick}
          canUseInsight={canUseInsight()}
          hasUsedInsight={insightResult !== null}
          insightBlockReason={insightStatus.blockReason ? getBlockReasonText(insightStatus.blockReason) : undefined}
          insightResult={insightResult}
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
          canUsePressure={canUsePressureNow}
          pressureUsed={pressureUsed}
          onPressure={pressureSkillAvailable ? handlePressure : undefined}
          canUseHeartStrike={canUseHeartStrikeNow}
          heartStrikeUsed={heartStrikeUsed}
          onHeartStrike={heartStrikeSkillAvailable ? handleHeartStrike : undefined}
          canUseEmpathy={hasEmpathyInteraction && !empathyUsed}
          empathyUsed={empathyUsed}
          onEmpathy={hasEmpathyInteraction ? handleEmpathy : undefined}
          canUseProbe={hasProbeInteraction && !probeUsed}
          probeUsed={probeUsed}
          onProbe={hasProbeInteraction ? handleProbe : undefined}
          onOffer={handleOffer}
          onManualReject={handleManualReject}
          onBinaryAccept={handleBinaryAccept}
      />
    </div>
  );
};
