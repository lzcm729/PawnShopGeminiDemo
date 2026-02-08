
// ... existing imports ...
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { useCustomerInsight } from '../hooks/useCustomerInsight';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { Minus, Plus, Stamp, XCircle, TrendingUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Target, BrainCircuit, ScanEye, User, DollarSign, Flame, Percent, Fingerprint, ArrowUpFromLine, Calculator, Calendar, Search, Eye, EyeOff, Heart, TrendingDown, AlertTriangle, ShieldAlert, ShieldCheck, ShieldX, Lock } from 'lucide-react';
import { Customer, TransactionResult, InterestRate, RejectionLines, ItemStatus } from '../types';
import { ActionLog, OfferRecord } from '../hooks/useNegotiation';
import { getMerchantInstinct } from '../systems/negotiation/instinct';
import { NegotiationHistory } from './NegotiationHistory';
import { playSfx } from '../systems/game/audio';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { RollingNumber } from './ui/RollingNumber';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../systems/assets';
import { DISPOSITION_INFO, SHOW_DISPOSITION_LABEL_IN_NEGOTIATION } from '../systems/customerInsight';
import { PushPullResult } from '../systems/negotiation/pushPull';
import { useRateDisplay } from './ui/RateDisplayContext';

// ... existing interfaces ...
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
        // Push-Pull fields
        lastOfferAmount: number | null;
        persistCount: number;
        npcConcessionCount: number;
        lastPushPullResult: PushPullResult | null;
    };
    appraisalFeedbacks?: AppraisalFeedback[];
}

interface LogEntry {
    id: string;
    sender: 'player' | 'customer' | 'system';
    text: string;
    subtext?: string;
    sentiment?: 'neutral' | 'negative' | 'positive';
    type?: 'INTEL' | 'INNER_MONOLOGUE' | 'INSIGHT_RESULT';
    data?: any;
}

// Appraisal feedback structure passed from ItemPanel
export interface AppraisalFeedback {
    type: 'TRAIT_DISCOVERED' | 'RANGE_NARROWED' | 'BREAKTHROUGH' | 'MISHAP' | 'IMPATIENT' | 'ALREADY_KNOWN';
    text: string;
    traitId?: string;
    traitName?: string;
    isBonus?: boolean;  // True if discovered via LUCKY_FIND
}

interface InsightResultData {
    disposition: string;
    dispositionText: string;
    floorHint: string;
    moralContext?: string;
}

interface CustomerHeaderProps {
    customer: Customer;
    patience: number;
    mood: string;
    onInsightClick?: () => void;
    canUseInsight?: boolean;
    hasUsedInsight?: boolean;
    insightBlockReason?: string;
    insightResult?: InsightResultData | null;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({
    customer,
    patience,
    mood,
    onInsightClick,
    canUseInsight = false,
    hasUsedInsight = false,
    insightBlockReason,
    insightResult
}) => {
    const isAngry = mood === 'Angry';

    const maxPatience = 5;

    return (
        <div className="bg-gradient-to-b from-noir-300 to-noir-200 border-b border-noir-400 shrink-0 shadow-lg relative overflow-hidden">
            {/* Main Row: Portrait Left + Info Center + Stress Right */}
            <div className="flex items-stretch gap-4 p-4">
                {/* Left: Portrait + Name */}
                <div className="flex flex-col items-center shrink-0 justify-center">
                    {/* Portrait Container with Enhanced Visual Treatment */}
                    <div className={cn(
                        "relative w-[144px] h-[144px] rounded-full overflow-hidden border-2 transition-all duration-300",
                        "shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                        isAngry
                            ? "border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-[pulse_1s_ease-in-out_infinite]"
                            : "border-amber-600/60 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                    )}>
                        {/* Outer Glow Ring */}
                        <div className={cn(
                            "absolute -inset-1 rounded-full opacity-50 blur-sm",
                            isAngry ? "bg-red-500" : "bg-amber-600/30"
                        )} />

                        <img
                            src={(() => {
                              const emotion = 'neutral' as const;
                              if (customer.portraits?.[emotion]) return customer.portraits[emotion];
                              if (customer.chainId) {
                                const charId = customer.chainId.replace(/^chain_/, '');
                                return getCharacterPortraitPath(charId, emotion);
                              }
                              return PORTRAIT_PLACEHOLDER;
                            })()}
                            alt="Subject"
                            className="w-full h-full object-cover relative z-10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PORTRAIT_PLACEHOLDER;
                            }}
                        />

                        {/* Vignette Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-20 pointer-events-none" />

                        {isAngry && <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-pulse z-30"></div>}
                    </div>

                    {/* Customer Name - Below Portrait */}
                    <div className="mt-2 text-center">
                        <h2 className="text-base font-serif font-bold text-noir-txt-primary leading-none tracking-wide">{customer.name}</h2>
                    </div>
                </div>

                {/* Center: Observation + Insight Area */}
                <div className="flex-1 min-w-0 flex flex-col border border-noir-400/50 rounded bg-noir-100/30">
                    {/* Top: Customer Observation + Insight Button */}
                    <div className="px-3 py-2 border-b border-noir-400/30 min-h-[32px] flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                            {customer.observation ? (
                                <p className="text-xs text-amber-500/90 font-serif italic leading-snug line-clamp-1" title={customer.observation}>
                                    {customer.observation}
                                </p>
                            ) : (
                                <p className="text-xs text-noir-txt-muted font-serif italic opacity-50">
                                    (观察客户行为...)
                                </p>
                            )}
                        </div>
                        {/* Insight Button - Inline with observation */}
                        <div className="shrink-0">
                            {!hasUsedInsight ? (
                                <button
                                    onClick={onInsightClick}
                                    disabled={!canUseInsight}
                                    title={canUseInsight ? "洞察客户心理 (消耗 1 AP)" : insightBlockReason}
                                    className={cn(
                                        "flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border transition-all duration-200 shadow-sm",
                                        canUseInsight
                                            ? "bg-pawn-accent text-black border-amber-400 hover:scale-105 hover:shadow-md"
                                            : "bg-stone-800/80 text-stone-500 border-stone-600 cursor-not-allowed"
                                    )}
                                >
                                    <Eye className="w-3 h-3" />
                                    <span>洞察</span>
                                    <span className="text-[8px] opacity-80">1AP</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border bg-pawn-green/20 text-pawn-green border-pawn-green/50">
                                    <Eye className="w-3 h-3" />
                                    <span>已洞察</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom: Insight Result Area */}
                    <div className="flex-1 flex items-stretch min-h-[94px]">
                        {insightResult ? (
                            /* Insight Result - behavioral descriptions (I-9: no explicit labels) */
                            <div className="flex-1 flex animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Left Column: Disposition Type - only show if labels are enabled */}
                                {SHOW_DISPOSITION_LABEL_IN_NEGOTIATION && (
                                    <div className="flex flex-col items-center justify-center px-4 py-2 border-r border-noir-400/30 min-w-[80px]">
                                        <span className="text-2xl mb-1">{DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.icon || '?'}</span>
                                        <span className={cn("text-xs font-bold text-center", DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.color || 'text-amber-400')}>
                                            {DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.label || insightResult.disposition}
                                        </span>
                                    </div>
                                )}

                                {/* Right Column: Behavioral observations */}
                                <div className="flex-1 flex flex-col">
                                    {/* Row 1: Behavioral description (dispositionText) */}
                                    <div className="flex-1 px-3 py-1.5 border-b border-noir-400/20 flex items-center">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Eye className="w-3 h-3 text-amber-500/60 shrink-0" />
                                            <p className="font-serif text-xs text-noir-txt-secondary leading-snug italic line-clamp-1 truncate" title={insightResult.dispositionText}>
                                                "{insightResult.dispositionText}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 2: Floor hint behavioral description */}
                                    <div className="flex-1 px-3 py-1.5 border-b border-noir-400/20 flex items-center">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Eye className="w-3 h-3 text-purple-500/60 shrink-0" />
                                            <p className="font-serif text-[11px] text-amber-500/90 leading-snug italic line-clamp-1 truncate" title={insightResult.floorHint}>
                                                "{insightResult.floorHint}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 3: Moral context (or empty placeholder) */}
                                    <div className="flex-1 px-3 py-1.5 flex items-center">
                                        {insightResult.moralContext ? (
                                            <div className="flex items-center gap-1.5">
                                                <Heart className="w-3 h-3 text-red-400 shrink-0" />
                                                <p className="font-serif text-[10px] text-red-300/80 leading-snug italic line-clamp-1" title={insightResult.moralContext}>
                                                    {insightResult.moralContext}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-noir-txt-muted/30 font-mono">---</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Locked state - Placeholder with visual hint */
                            <div className="flex-1 flex items-center justify-center p-3">
                                <div className="flex flex-col items-center gap-1.5 opacity-40">
                                    <div className="flex items-center gap-2">
                                        <EyeOff className="w-6 h-6 text-noir-txt-muted" />
                                        <span className="text-sm text-noir-txt-muted font-mono">???</span>
                                    </div>
                                    <span className="text-xs text-noir-txt-muted font-serif italic">
                                        点击洞察了解客户心理
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Stress Flames */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-3 min-w-[48px]">
                    <div className="flex flex-col-reverse items-center gap-0.5">
                        {Array.from({length: 5}).map((_, i) => (
                            <Flame
                                key={i}
                                className={`w-3.5 h-3.5 transition-all duration-300 ${
                                    i < patience
                                        ? (isAngry ? 'text-red-600 fill-red-600 animate-pulse' : 'text-orange-500 fill-orange-500')
                                        : 'text-stone-800'
                                }`}
                            />
                        ))}
                    </div>
                    <span className="text-[9px] font-mono text-noir-txt-muted tracking-wider">耐心</span>
                </div>
            </div>
        </div>
    )
}

export const NegotiationPanel: React.FC<NegotiationStateProps> = ({ negotiation, appraisalFeedbacks = [] }) => {
  const { state } = useGame();
  const { evaluateTransaction, commitTransaction, rejectCustomer, isCurrentItemStolen, handleStolenItemDecision } = useGameEngine();
  const { send } = useGameMachine();
  const { formatRate, unitLabel } = useRateDisplay();
  const { currentCustomer } = state;
  const item = currentCustomer?.item;

  // Stolen goods decision UI state
  const [showStolenWarning, setShowStolenWarning] = useState(false);
  const [stolenDecisionMade, setStolenDecisionMade] = useState(false);

  // Customer Insight hook
  const {
    insightResult,
    status: insightStatus,
    canUseInsight,
    useInsight,
    getBlockReasonText
  } = useCustomerInsight();

  // ... (destructure negotiation) ...
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FIX: Clean up interval on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Track Ask price changes for animation
  useEffect(() => {
    if (currentAskPrice !== prevAskPrice && currentAskPrice < prevAskPrice) {
      // NPC conceded - trigger animation
      setAskPriceChanged(true);
      const timer = setTimeout(() => {
        setPrevAskPrice(currentAskPrice);
        setAskPriceChanged(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentAskPrice !== prevAskPrice) {
      // Just update without animation (e.g., new customer)
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

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog, offerHistory]);

  useEffect(() => {
    if (currentCustomer) {
      setRejectionState({show: false, text: ''});
      setIsSubmitting(false); // Reset submission state for new customer

      // SAFEGUARD: Provide default dialogue if missing
      const greetingText = currentCustomer.dialogue?.greeting || "...";
      const pawnReasonText = currentCustomer.dialogue?.pawnReason;

      const logs: LogEntry[] = [
          {
              id: 'init-1',
              sender: 'customer',
              text: greetingText,
              sentiment: 'neutral'
          }
      ];

      if (pawnReasonText) {
          logs.push({
              id: 'init-2',
              sender: 'customer',
              text: pawnReasonText,
              sentiment: 'neutral'
          });
      }

      setChatLog(logs);
    }
  }, [currentCustomer?.id]);

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
  // Track how many feedbacks we've already processed
  const processedCountRef = useRef<number>(0);

  // Convert appraisal feedbacks to inner monologue entries
  useEffect(() => {
      if (appraisalFeedbacks.length === 0) return;
      // Only process new feedbacks (skip already processed ones)
      if (appraisalFeedbacks.length <= processedCountRef.current) return;

      const newEntries: LogEntry[] = [];

      for (let i = processedCountRef.current; i < appraisalFeedbacks.length; i++) {
          const feedback = appraisalFeedbacks[i];
          const feedbackId = `inner-${feedback.type}-${Date.now()}-${i}`;

          // Only dedupe TRAIT_DISCOVERED to prevent same trait showing twice
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
      // Reset stolen decision state for new customer
      setShowStolenWarning(false);
      setStolenDecisionMade(false);
  }, [currentCustomer?.id]);

  const getRejectionText = (customer: Customer, isAngry: boolean) => {
      const defaultLines = { standard: "行吧，那我走了。", angry: "浪费时间！", desperate: "求求你了..." };
      const lines: RejectionLines = customer.dialogue?.rejectionLines || defaultLines;
      const rejectedText = customer.dialogue?.rejected || "再见。";
      
      if (isAngry) return lines.angry || lines.standard;
      if (customer.behaviorTags.includes('DESPERATE')) return lines.desperate || lines.standard;
      return lines.standard || rejectedText;
  };

  // NOTE: isWalkedAway (patience zero) now handled directly in handleOffer
  // Manual reject button uses handleManualReject which sets rejectionState directly

  if (!currentCustomer || !item) return null;

  // Handle insight button click - result is displayed in the dedicated panel above chat
  const handleInsightClick = () => {
    if (!canUseInsight()) return;
    playSfx('CLICK');
    useInsight();
    // Result is now displayed in the dedicated InsightResult panel above the chat log
    // No longer added to chatLog since it has its own UI area
  };

  // Track whether the latest offer was a COUNTER (push-pull zone)
  const lastOfferWasCounterRef = useRef<boolean>(false);

  // Generate push-pull feedback in chat when lastPushPullResult changes (COUNTER status only)
  useEffect(() => {
      if (!lastPushPullResult || !lastOfferWasCounterRef.current) return;

      // Reset the flag so this only fires once per COUNTER offer
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

    // Patience exhausted: skip rejection overlay, go directly to departure
    if (result.status === 'WALK_AWAY') {
        setChatLog(prev => [...prev, playerLog]);
        send({ type: 'CUSTOMER_REJECTED' });
        rejectCustomer('RESENTFUL');  // 耐心耗尽 → 愤怒离开
        return;
    }

    if (result.status === 'COUNTER') {
        // Push-pull zone: player log only; NPC response added by useEffect on lastPushPullResult
        lastOfferWasCounterRef.current = true;
        setChatLog(prev => [...prev, playerLog]);
    } else {
        // Hard rejection or acceptance: use penalty labels
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
        // Check if item is stolen and decision hasn't been made yet
        if (isCurrentItemStolen() && !stolenDecisionMade) {
            // Show stolen goods warning before completing transaction
            setShowStolenWarning(true);
            return;
        }

        // Prevent double-click by setting submitting flag immediately
        setIsSubmitting(true);
        const txResult = evaluateTransaction(offerPrincipal, selectedRate);
        // Directly commit transaction - deal summary shown in departure view
        setTimeout(() => {
            // Send state machine event for phase2 sync
            send({ type: 'TRANSACTION_COMPLETE' });
            commitTransaction(txResult);
        }, 800);
    }
  };

  // Handle stolen item decision
  const handleStolenAccept = () => {
      playSfx('CLICK');
      setStolenDecisionMade(true);
      setShowStolenWarning(false);
      handleStolenItemDecision(true);

      // Now complete the transaction
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
      // The reducer will handle transitioning to departure
  };

  const handleBinaryAccept = () => {
      if (isSubmitting) return;

      // Prevent double-click by setting submitting flag immediately
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

      // Send state machine event for phase2 sync
      send({ type: 'TRANSACTION_COMPLETE' });
      // Directly commit transaction - deal summary shown in departure view
      commitTransaction(mockResult);
  };

  const handleManualReject = () => {
      if (!currentCustomer) return;
      const text = getRejectionText(currentCustomer, mood === 'Angry');
      setRejectionState({ show: true, text });
  };

  const completeRejection = () => {
    // Send state machine event for phase2 sync
    send({ type: 'CUSTOMER_REJECTED' });
    rejectCustomer();
  };

  const adjustPrincipal = (amount: number) => {
      setOfferPrincipal(prev => {
          const next = prev + amount;
          if (next < 0) return 0;
          if (next > state.stats.cash) return state.stats.cash;
          return next;
      });
  };

  const startAdjusting = (amount: number) => {
      if (intervalRef.current) return;
      playSfx('CLICK');
      adjustPrincipal(amount); 
      intervalRef.current = setInterval(() => {
          adjustPrincipal(amount);
      }, 100);
  };

  const stopAdjusting = () => {
      if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
      }
  };

  const cashAvailable = state.stats.cash;
  const canAfford = cashAvailable >= offerPrincipal;
  const canInteract = !isWalkedAway && !rejectionState.show && !isSubmitting;
  const repaymentAmount = Math.floor(offerPrincipal * (1 + selectedRate));
  const profit = repaymentAmount - offerPrincipal;

  // Determine submit button text based on player's move
  const getSubmitButtonText = useMemo(() => {
    if (offerHistory.length === 0) return '报价';
    if (lastOfferAmount === null) return '报价';
    if (offerPrincipal === lastOfferAmount) return '坚持';
    if (offerPrincipal > lastOfferAmount) return '让步';
    return '报价';
  }, [offerHistory.length, lastOfferAmount, offerPrincipal]);

  const handleMatchAsk = () => {
      if (!canInteract) return;
      playSfx('CLICK');
      const target = Math.min(currentAskPrice, cashAvailable);
      setOfferPrincipal(target);
  };

  const handleQuickValuation = () => {
      playSfx('CLICK');
      const min = item.currentRange[0];
      const max = item.currentRange[1];
      setOfferPrincipal(Math.min(Math.floor((min + max) / 2), cashAvailable));
  };
  
  const handleQuickFloor = () => {
      playSfx('CLICK');
      setOfferPrincipal(Math.min(currentCustomer.minimumAmount, cashAvailable));
  };

  const RateToggle = ({ rate, label }: { rate: InterestRate, label: string }) => (
      <button 
        onClick={() => { playSfx('CLICK'); setSelectedRate(rate); }}
        disabled={!canInteract}
        className={cn(
            "flex-1 py-1 px-1 rounded-sm border transition-all duration-200 flex flex-col items-center justify-center relative overflow-hidden group",
            selectedRate === rate 
                ? "bg-amber-600 border-amber-500 text-black shadow-[0_0_10px_rgba(217,119,6,0.4)]" 
                : "bg-noir-300 border-noir-400 text-noir-txt-muted hover:bg-noir-200 hover:text-noir-txt-primary"
        )}
      >
          <span className="text-xs font-black font-mono leading-none z-10">{formatRate(rate)}{unitLabel}</span>
          <span className="text-[8px] uppercase font-bold tracking-wider opacity-80 z-10">{label}</span>
      </button>
  );

  const estimatedValue = Math.floor((item.currentRange[0] + item.currentRange[1]) / 2);

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
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-300">
                <div className="bg-noir-200 border-2 border-amber-700/70 p-6 max-w-md w-full shadow-2xl relative flex flex-col items-center">
                    {/* Warning Icon */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-amber-900/80 rounded-full flex items-center justify-center border-4 border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.5)]">
                        <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>

                    {/* Title */}
                    <div className="mt-8 mb-4 text-center">
                        <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest mb-1">
                            SUSPICIOUS ITEM
                        </h3>
                        <p className="text-xs text-noir-txt-muted font-mono">
                            ORIGIN VERIFICATION FAILED
                        </p>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-black/40 border border-amber-900/50 rounded p-4 mb-6 w-full">
                        <p className="font-serif text-base text-center text-noir-txt-primary leading-relaxed">
                            这件物品来路不明，<span className="text-amber-400 font-bold">可能是赃物</span>。
                        </p>
                        <p className="font-serif text-sm text-center text-noir-txt-secondary mt-2 italic">
                            收下它可能会引来警方的注意...
                        </p>
                    </div>

                    {/* Consequences Preview */}
                    <div className="grid grid-cols-2 gap-3 w-full mb-6 text-xs">
                        <div className="bg-amber-950/30 border border-amber-900/50 rounded p-3">
                            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                                <ShieldX className="w-4 h-4" />
                                <span>收下</span>
                            </div>
                            <p className="text-amber-300/70 text-[10px]">
                                Credibility +1
                            </p>
                            <p className="text-amber-300/70 text-[10px]">
                                可能触发警方调查
                            </p>
                        </div>
                        <div className="bg-slate-950/30 border border-slate-700/50 rounded p-3">
                            <div className="flex items-center gap-2 text-slate-400 font-bold mb-1">
                                <ShieldCheck className="w-4 h-4" />
                                <span>拒绝</span>
                            </div>
                            <p className="text-slate-300/70 text-[10px]">
                                无声誉影响
                            </p>
                            <p className="text-slate-300/70 text-[10px]">
                                客户将离开
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={handleStolenReject}
                            className="flex-1 h-12 border-teal-700 text-teal-400 hover:bg-teal-900/30 hover:border-teal-500"
                        >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            REFUSE
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleStolenAccept}
                            className="flex-1 h-12 bg-red-900/50 hover:bg-red-800/60 border-red-700"
                        >
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            ACCEPT
                        </Button>
                    </div>
                </div>
            </div>
      )}

      {/* Chat Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40 relative" ref={scrollRef}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
          
          {chatLog.map((log, idx) => {
              const isPlayer = log.sender === 'player';
              const isSystem = log.sender === 'system';

              // Regular system message (divider style)
              if (isSystem) {
                  return (
                    <div key={log.id} className="flex items-center justify-center my-3 gap-3 opacity-0 animate-[fadeIn_0.2s_ease-out_forwards]">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-noir-400" />
                        <span className="text-[10px] text-noir-txt-muted font-mono uppercase tracking-wider px-2">
                            {log.text}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-noir-400" />
                    </div>
                  );
              }

              // Inner monologue (appraisal feedback) - subtle styling, lower visual priority
              if (log.type === 'INNER_MONOLOGUE') {
                  // Generate result label based on feedback type
                  const getResultLabel = () => {
                      const feedbackType = log.data?.feedbackType;
                      const traitName = log.data?.traitName;
                      const isBonus = log.data?.isBonus;
                      switch (feedbackType) {
                          case 'TRAIT_DISCOVERED': {
                              const label = traitName ? `发现线索：${traitName}` : '发现线索';
                              return isBonus ? `✦ ${label}` : label;
                          }
                          case 'RANGE_NARROWED': return '估值范围收缩';
                          case 'BREAKTHROUGH': return '灵光一闪';
                          case 'MISHAP': return '鉴定失误';
                          case 'IMPATIENT': return '客户不耐烦';
                          case 'ALREADY_KNOWN': return '暂无新发现';
                          default: return null;
                      }
                  };
                  const resultLabel = getResultLabel();

                  return (
                      <div key={log.id} className="flex flex-col max-w-[85%] items-end ml-auto animate-in fade-in slide-in-from-bottom-2 duration-300 opacity-70 hover:opacity-90 transition-opacity">
                          <div className="px-3 py-2 rounded relative text-xs flex items-start gap-1.5 border-l-2 border-stone-600/30 bg-stone-900/20">
                              <Search className="w-3 h-3 text-stone-500 shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-1">
                                  <span className="font-serif italic text-stone-400/80 leading-relaxed">
                                      {log.text}
                                  </span>
                                  {resultLabel && (
                                      <span className="text-[10px] text-stone-500/70 font-mono">
                                          → {resultLabel}
                                      </span>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              }

              return (
                  <div key={log.id} className={cn("flex flex-col max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300", isPlayer ? "items-end ml-auto" : "items-start")}>
                      <div className={cn(
                          "px-4 py-3 rounded-lg relative shadow-sm text-sm border",
                          isPlayer
                              ? "bg-noir-300 border-noir-400 text-noir-txt-primary font-mono text-right rounded-br-none border-l-[3px] border-l-amber-600"
                              : cn(
                                  "bg-noir-200 border-noir-400 text-stone-300 font-serif leading-relaxed rounded-bl-none",
                                  log.sentiment === 'positive' && "border-l-[3px] border-l-pawn-green/60",
                                  log.sentiment === 'negative' && "border-l-[3px] border-l-red-500/60"
                              )
                      )}>
                          {log.text}
                      </div>
                      {log.subtext && (
                          <span className={cn(
                              "text-[9px] font-mono font-bold mt-1 px-1 uppercase tracking-wider",
                              log.sentiment === 'negative' ? "text-red-500"
                              : log.sentiment === 'positive' ? "text-pawn-green"
                              : "text-noir-txt-muted"
                          )}>
                              {log.subtext}
                          </span>
                      )}
                  </div>
              );
          })}
          
          {!isBinaryChoice && <NegotiationHistory history={offerHistory} />}
      </div>

      {/* Control Deck */}
      <div className="bg-noir-200 border-t border-noir-400 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
         {isBinaryChoice ? (
             <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-end border-b border-noir-300 pb-2">
                    <span className="text-xs font-bold text-noir-txt-muted uppercase tracking-widest">Fixed Offer</span>
                    <span className="text-3xl font-mono font-bold text-noir-txt-primary">${currentAskPrice}</span>
                 </div>
                 
                 <div className="flex gap-3">
                     <Button variant="danger" onClick={handleManualReject} disabled={isSubmitting} className="flex-1">
                        REJECT
                     </Button>
                     <Button variant="primary" onClick={handleBinaryAccept} disabled={!canFulfillDeal || isSubmitting} className="flex-[2]">
                        {canFulfillDeal ? "ACCEPT DEAL" : fulfillmentError}
                     </Button>
                 </div>
             </div>
         ) : (
             <div className="space-y-4">
                 {/* Financials Row */}
                 <div className="flex justify-between items-center text-xs font-mono bg-black/20 p-2 rounded border border-noir-300">
                      <div className="flex items-center gap-2 text-noir-txt-muted relative">
                          <DollarSign className="w-3 h-3" />
                          <span className="flex items-center gap-1">ASK:
                              {currentAskPrice < currentCustomer.desiredAmount && (
                                  <span className="text-stone-500 line-through">${currentCustomer.desiredAmount}</span>
                              )}
                              <span className={cn(
                                  "font-bold transition-all duration-300",
                                  askPriceChanged ? "text-pawn-green scale-110" : (currentAskPrice < currentCustomer.desiredAmount ? "text-pawn-green" : "text-noir-txt-primary")
                              )}>
                                  ${currentAskPrice}
                              </span>
                              {/* Concession indicator */}
                              {askPriceChanged && askChangeAmount > 0 && (
                                  <span className="flex items-center gap-0.5 text-pawn-green animate-in fade-in slide-in-from-left-2 duration-300">
                                      <TrendingDown className="w-3 h-3" />
                                      <span className="font-bold">-${askChangeAmount}</span>
                                  </span>
                              )}
                          </span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-500/80">
                          <Calendar className="w-3 h-3" />
                          <span>TERM: <span className="font-bold">{currentCustomer.pawnTermDays ?? 7}d</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-pawn-green">
                          <TrendingUp className="w-3 h-3" />
                          <span>PROFIT: <span className="font-bold">+${profit}</span></span>
                      </div>
                 </div>

                 {/* Rate Selectors */}
                 <div className="flex gap-2">
                    <RateToggle rate={0} label="Charity" />
                    <RateToggle rate={0.05} label="Std" />
                    <RateToggle rate={0.10} label="High" />
                    <RateToggle rate={0.20} label="Shark" />
                 </div>

                 {/* Principal Dial */}
                 <div className="flex items-center gap-2">
                     <button
                         onMouseDown={() => startAdjusting(-100)}
                         onMouseUp={stopAdjusting}
                         onMouseLeave={stopAdjusting}
                         className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-noir-txt-secondary active:scale-95"
                     >
                         <ChevronsLeft className="w-4 h-4"/>
                     </button>
                     <button
                         onMouseDown={() => startAdjusting(-10)}
                         onMouseUp={stopAdjusting}
                         onMouseLeave={stopAdjusting}
                         className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-noir-txt-secondary active:scale-95"
                     >
                         <ChevronLeft className="w-4 h-4"/>
                     </button>
                     
                     <div className="flex-1 bg-black border border-noir-400 h-12 flex items-center justify-center relative rounded overflow-hidden">
                         <div className="absolute inset-0 bg-amber-900/10 animate-pulse"></div>
                         <span className="relative z-10 text-3xl font-mono font-bold text-amber-500 tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                            <RollingNumber value={offerPrincipal} prefix="$" />
                         </span>
                     </div>

                     <button
                         onMouseDown={() => startAdjusting(10)}
                         onMouseUp={stopAdjusting}
                         onMouseLeave={stopAdjusting}
                         className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-noir-txt-secondary active:scale-95"
                     >
                         <ChevronRight className="w-4 h-4"/>
                     </button>
                     <button
                         onMouseDown={() => startAdjusting(100)}
                         onMouseUp={stopAdjusting}
                         onMouseLeave={stopAdjusting}
                         className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-noir-txt-secondary active:scale-95"
                     >
                         <ChevronsRight className="w-4 h-4"/>
                     </button>
                 </div>
                 
                 {/* Quick Setters */}
                 <div className="flex gap-2">
                    <button
                        onClick={handleMatchAsk}
                        disabled={!canInteract}
                        className="flex-1 bg-noir-300 border border-noir-400 hover:bg-noir-200 hover:border-noir-txt-primary hover:text-noir-txt-primary text-noir-txt-secondary transition-all p-2 rounded flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider mb-0.5 opacity-80">
                            <ArrowUpFromLine className="w-3 h-3"/> Match Ask
                        </div>
                        <span className="font-mono font-bold text-sm group-hover:text-pawn-accent transition-colors">${currentAskPrice}</span>
                    </button>

                    <button
                        onClick={handleQuickValuation}
                        disabled={!canInteract}
                        className="flex-1 bg-noir-300 border border-noir-400 hover:bg-noir-200 hover:border-noir-txt-primary hover:text-noir-txt-primary text-noir-txt-secondary transition-all p-2 rounded flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider mb-0.5 opacity-80">
                            <Calculator className="w-3 h-3"/> Est. Value
                        </div>
                        <span className="font-mono font-bold text-sm group-hover:text-blue-400 transition-colors">${estimatedValue}</span>
                    </button>

                    {(() => {
                        const floorRevealed = revealedMinimum || state.debugRevealFloor;
                        return (
                            <button
                                onClick={floorRevealed ? handleQuickFloor : undefined}
                                disabled={!floorRevealed || !canInteract}
                                className={cn(
                                    "flex-1 border transition-all p-2 rounded flex flex-col items-center justify-center disabled:cursor-not-allowed group",
                                    floorRevealed
                                        ? "bg-red-950/20 border-red-900/50 hover:bg-red-900/40 hover:border-red-500 text-red-500 disabled:opacity-50 animate-in fade-in"
                                        : "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                                    {!floorRevealed && <Lock className="w-3 h-3" />}
                                    <span>Floor</span>
                                </div>
                                <span className="font-mono font-bold text-sm">
                                    {floorRevealed ? `$${currentCustomer.minimumAmount}` : '???'}
                                </span>
                            </button>
                        );
                    })()}
                 </div>

                 {/* Main Action */}
                 <div className="flex gap-3">
                    <Button 
                      variant="danger" 
                      onClick={handleManualReject}
                      disabled={!canInteract}
                      className="w-16 h-16 border-2 border-red-900/50 hover:bg-red-950/50 flex items-center justify-center"
                      title="Reject"
                    >
                      <XCircle className="w-6 h-6"/>
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleOffer}
                      disabled={!canInteract || !canAfford}
                      className={cn(
                        "flex-1 h-16 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center gap-0.5",
                        getSubmitButtonText === '坚持' && "bg-amber-700 hover:bg-amber-600",
                        getSubmitButtonText === '让步' && "bg-emerald-700 hover:bg-emerald-600"
                      )}
                    >
                       <div className="flex items-center gap-2">
                           <Stamp className="w-4 h-4" />
                           <span className="text-sm font-bold tracking-[0.2em]">{getSubmitButtonText}</span>
                       </div>
                       {instinct.text && (
                           <span className="text-[10px] font-serif italic text-black/80 font-bold max-w-[95%] truncate px-2">
                               "{instinct.text}"
                           </span>
                       )}
                    </Button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
