
// ... existing imports ...
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { useCustomerInsight } from '../hooks/useCustomerInsight';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { Minus, Plus, Stamp, XCircle, TrendingUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Target, BrainCircuit, ScanEye, User, DollarSign, Activity, Percent, Fingerprint, ArrowUpFromLine, Calculator, Calendar, Search, Eye, EyeOff, Heart, TrendingDown } from 'lucide-react';
import { Customer, TransactionResult, InterestRate, RejectionLines, ItemStatus } from '../types';
import { ActionLog, OfferRecord } from '../hooks/useNegotiation';
import { getMerchantInstinct } from '../systems/negotiation/instinct';
import { NegotiationHistory } from './NegotiationHistory';
import { playSfx } from '../systems/game/audio';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { RollingNumber } from './ui/RollingNumber';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../systems/assets';
import { DISPOSITION_INFO } from '../systems/customerInsight';
import { PushPullResult } from '../systems/negotiation/pushPull';

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
    type: 'TRAIT_DISCOVERED' | 'RANGE_NARROWED' | 'MISHAP' | 'IMPATIENT' | 'ALREADY_KNOWN';
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

    // Calculate patience percentage for the bar
    const maxPatience = 5;
    const patiencePercent = (patience / maxPatience) * 100;

    let patienceColor = "bg-emerald-500";
    if (patiencePercent <= 40) patienceColor = "bg-amber-500";
    if (patiencePercent <= 20) patienceColor = "bg-red-600";

    return (
        <div className="bg-gradient-to-b from-noir-300 to-noir-200 border-b border-noir-400 shrink-0 shadow-lg relative overflow-hidden">
            {/* Main Row: Portrait Left + Info Right */}
            <div className="flex items-start gap-4 p-4">
                {/* Left: Portrait + Name */}
                <div className="flex flex-col items-center shrink-0">
                    {/* Portrait Container with Enhanced Visual Treatment */}
                    <div className={cn(
                        "relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all duration-300",
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

                    {/* Customer Name & ID - Below Portrait */}
                    <div className="mt-2 text-center">
                        <h2 className="text-base font-serif font-bold text-noir-txt-primary leading-none tracking-wide">{customer.name}</h2>
                        <Badge variant="outline" className="text-[8px] py-0 h-3.5 mt-1">ID: {customer.id.slice(0,4)}</Badge>
                    </div>
                </div>

                {/* Right: Insight Result or Observation + Controls */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Top Row: Insight Button + Stress Bar */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Insight Button */}
                        {!hasUsedInsight ? (
                            <button
                                onClick={onInsightClick}
                                disabled={!canUseInsight}
                                title={canUseInsight ? "洞察客户心理 (消耗 1 AP)" : insightBlockReason}
                                className={cn(
                                    "flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded border-2 transition-all duration-200 shadow-lg",
                                    canUseInsight
                                        ? "bg-pawn-accent text-black border-white hover:scale-[1.02]"
                                        : "bg-stone-800 text-stone-500 border-stone-600 cursor-not-allowed"
                                )}
                            >
                                <Eye className="w-4 h-4" />
                                <span>洞察 1AP</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded border-2 bg-pawn-green text-black border-white shadow-lg">
                                <EyeOff className="w-4 h-4" />
                                <span>已洞察</span>
                            </div>
                        )}

                        {/* Patience/Stress Bar */}
                        <div className="text-right shrink-0">
                            <div className="text-[10px] font-bold text-noir-txt-muted uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                                <Activity className="w-3 h-3" /> Stress
                            </div>
                            <div className="w-20 h-2 bg-noir-400 rounded-sm overflow-hidden border border-noir-500">
                                <div
                                    className={cn("h-full transition-all duration-500", patienceColor)}
                                    style={{ width: `${patiencePercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Area: Insight Result or Observation */}
                    {insightResult ? (
                        /* Insight Result - Displayed inline */
                        <div className="bg-noir-100/50 border border-amber-600/30 rounded p-2 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex items-start gap-3">
                                {/* Disposition Icon + Label */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-lg">{DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.icon || '?'}</span>
                                    <div>
                                        <div className="text-[8px] text-noir-txt-muted uppercase tracking-wider">心理</div>
                                        <div className={cn("text-xs font-bold", DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.color || 'text-amber-400')}>
                                            {DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.label || insightResult.disposition}
                                        </div>
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className="font-serif text-[11px] text-noir-txt-secondary leading-snug italic truncate" title={insightResult.dispositionText}>
                                        "{insightResult.dispositionText}"
                                    </p>
                                    <p className="font-serif text-[11px] text-amber-500/90 leading-snug truncate" title={insightResult.floorHint}>
                                        {insightResult.floorHint}
                                    </p>
                                </div>

                                {/* Moral Context (if available) */}
                                {insightResult.moralContext && (
                                    <div className="shrink-0 flex items-center gap-1 bg-red-950/30 border border-red-900/40 rounded px-1.5 py-1 max-w-[140px]">
                                        <Heart className="w-3 h-3 text-red-400 shrink-0" />
                                        <p className="font-serif text-[9px] text-red-300/90 leading-snug italic line-clamp-2">
                                            {insightResult.moralContext}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Observation - When no insight yet */
                        <div className="flex-1">
                            {customer.observation ? (
                                <div className="text-[11px] text-amber-500/80 font-serif italic leading-snug animate-in fade-in">
                                    {customer.observation}
                                </div>
                            ) : (
                                <div className="text-[11px] text-noir-txt-muted font-serif italic opacity-50">
                                    (观察客户行为...)
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export const NegotiationPanel: React.FC<NegotiationStateProps> = ({ negotiation, appraisalFeedbacks = [] }) => {
  const { state } = useGame();
  const { evaluateTransaction, commitTransaction, rejectCustomer } = useGameEngine();
  const { send } = useGameMachine();
  const { currentCustomer } = state;
  const item = currentCustomer?.item;

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
                  : feedback.type === 'TRAIT_DISCOVERED'
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
  }, [currentCustomer?.id]);

  const getRejectionText = (customer: Customer, isAngry: boolean) => {
      const defaultLines = { standard: "行吧，那我走了。", angry: "浪费时间！", desperate: "求求你了..." };
      const lines: RejectionLines = customer.dialogue?.rejectionLines || defaultLines;
      const rejectedText = customer.dialogue?.rejected || "再见。";
      
      if (isAngry) return lines.angry || lines.standard;
      if (customer.behaviorTags.includes('DESPERATE')) return lines.desperate || lines.standard;
      return lines.standard || rejectedText;
  };

  useEffect(() => {
      if (isWalkedAway && !rejectionState.show && currentCustomer) {
          const text = getRejectionText(currentCustomer, mood === 'Angry');
          setRejectionState({ show: true, text });
      }
  }, [isWalkedAway, mood, currentCustomer, rejectionState.show]);

  if (!currentCustomer || !item) return null;

  // Handle insight button click - result is displayed in the dedicated panel above chat
  const handleInsightClick = () => {
    if (!canUseInsight()) return;
    playSfx('CLICK');
    useInsight();
    // Result is now displayed in the dedicated InsightResult panel above the chat log
    // No longer added to chatLog since it has its own UI area
  };

  const handleOffer = () => {
    if (isWalkedAway || isSubmitting) return;

    const prevPatience = patience;
    const result = submitOffer();

    let penaltyLabel = "";
    if (result.status === 'PRINCIPAL_TOO_LOW') penaltyLabel = "LOWBALL";
    if (result.status === 'INSULT') penaltyLabel = "INSULT";
    if (result.status === 'INTEREST_TOO_HIGH') penaltyLabel = "USURY";
    if (result.status === 'RATE_MISMATCH') penaltyLabel = "RISK MISMATCH";

    const playerLog: LogEntry = {
        id: `offer-${Date.now()}`,
        sender: 'player',
        text: `OFFER: $${offerPrincipal} @ ${selectedRate * 100}%`,
        sentiment: 'neutral'
    };

    const patienceLoss = prevPatience - result.patienceRemaining;
    const subtext = patienceLoss > 0 ? `Patience -${patienceLoss} [${penaltyLabel}]` : undefined;

    const customerLog: LogEntry = {
        id: `resp-${Date.now()}`,
        sender: 'customer',
        text: result.message,
        subtext: subtext,
        sentiment: patienceLoss > 0 ? 'negative' : 'neutral'
    };

    setChatLog(prev => [...prev, playerLog, customerLog]);

    if (result.status === 'ACCEPTED') {
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
    if (offerHistory.length === 0) return 'SUBMIT';
    if (lastOfferAmount === null) return 'SUBMIT';
    if (offerPrincipal === lastOfferAmount) return 'PERSIST';
    if (offerPrincipal > lastOfferAmount) return 'YIELD';
    return 'SUBMIT';
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
          <span className="text-xs font-black font-mono leading-none z-10">{rate * 100}%</span>
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
                              : "bg-noir-200 border-noir-400 text-stone-300 font-serif leading-relaxed rounded-bl-none"
                      )}>
                          {log.text}
                      </div>
                      {log.subtext && (
                          <span className={cn(
                              "text-[9px] font-mono font-bold mt-1 px-1 uppercase tracking-wider",
                              log.sentiment === 'negative' ? "text-red-500" : "text-noir-txt-muted"
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

                    {revealedMinimum && (
                        <button
                            onClick={handleQuickFloor}
                            disabled={!canInteract}
                            className="flex-1 bg-red-950/20 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500 text-red-500 transition-all p-2 rounded flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group animate-in fade-in"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5">Floor</span>
                            <span className="font-mono font-bold text-sm">${currentCustomer.minimumAmount}</span>
                        </button>
                    )}
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
                        getSubmitButtonText === 'PERSIST' && "bg-amber-700 hover:bg-amber-600",
                        getSubmitButtonText === 'YIELD' && "bg-emerald-700 hover:bg-emerald-600"
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
