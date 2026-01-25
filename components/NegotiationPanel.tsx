
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { Minus, Plus, Stamp, XCircle, TrendingUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Target, BrainCircuit, ScanEye, User, DollarSign, Activity, Percent, Fingerprint } from 'lucide-react';
import { Customer, TransactionResult, InterestRate, RejectionLines, ItemStatus } from '../types';
import { DealSuccessModal } from './DealSuccessModal';
import { ActionLog, OfferRecord } from '../hooks/useNegotiation';
import { getMerchantInstinct } from '../systems/negotiation/instinct';
import { NegotiationHistory } from './NegotiationHistory';
import { playSfx } from '../systems/game/audio';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { RollingNumber } from './ui/RollingNumber';

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
    }
}

interface LogEntry {
    id: string;
    sender: 'player' | 'customer' | 'system';
    text: string;
    subtext?: string; 
    sentiment?: 'neutral' | 'negative' | 'positive';
    type?: 'INTEL';
    data?: any;
}

const CustomerHeader: React.FC<{ customer: Customer, patience: number, mood: string }> = ({ customer, patience, mood }) => {
    const isAngry = mood === 'Angry';
    
    // Calculate patience percentage for the bar
    const maxPatience = 5; 
    const patiencePercent = (patience / maxPatience) * 100;
    
    let patienceColor = "bg-emerald-500";
    if (patiencePercent <= 40) patienceColor = "bg-amber-500";
    if (patiencePercent <= 20) patienceColor = "bg-red-600";

    return (
        <div className="bg-noir-200 border-b border-noir-400 p-4 flex gap-4 shrink-0 shadow-lg relative overflow-hidden">
             {/* Surveillance Photo Effect */}
             <div className="relative w-16 h-16 shrink-0 border border-noir-400 p-0.5 bg-noir-300">
                 <img 
                    src={`https://picsum.photos/seed/${customer.avatarSeed}/200`} 
                    alt="Subject" 
                    className={cn(
                        "w-full h-full object-cover filter contrast-125 sepia-[0.3]",
                        isAngry ? "grayscale-0" : "grayscale"
                    )}
                 />
                 <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30"></div>
                 {isAngry && <div className="absolute inset-0 border-2 border-red-500 animate-pulse"></div>}
             </div>
             
             <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2">
                              <h2 className="text-lg font-serif font-bold text-noir-txt-primary leading-none tracking-wide">{customer.name}</h2>
                              <Badge variant="outline" className="text-[9px] py-0 h-4">ID: {customer.id.slice(0,4)}</Badge>
                          </div>
                          <div className="flex gap-2 mt-1">
                              <span className="text-[10px] font-mono text-noir-txt-muted uppercase bg-noir-100 px-1.5 rounded border border-noir-300">
                                  {customer.negotiationStyle}
                              </span>
                              <span className="text-[10px] font-mono text-noir-txt-muted uppercase bg-noir-100 px-1.5 rounded border border-noir-300">
                                  Resolve: {customer.redemptionResolve}
                              </span>
                          </div>
                      </div>
                      
                      <div className="text-right">
                          <div className="text-[10px] font-bold text-noir-txt-muted uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                              <Activity className="w-3 h-3" /> Stress Limit
                          </div>
                          <div className="w-24 h-2 bg-noir-400 rounded-sm overflow-hidden border border-noir-500">
                              <div 
                                  className={cn("h-full transition-all duration-500", patienceColor)} 
                                  style={{ width: `${patiencePercent}%` }}
                              />
                          </div>
                      </div>
                  </div>
             </div>
        </div>
    )
}

export const NegotiationPanel: React.FC<NegotiationStateProps> = ({ negotiation }) => {
  const { state } = useGame();
  const { evaluateTransaction, commitTransaction, rejectCustomer } = useGameEngine();
  const { currentCustomer } = state;
  const item = currentCustomer?.item;

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
    revealedMinimum
  } = negotiation;

  const [chatLog, setChatLog] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rejectionState, setRejectionState] = useState<{show: boolean, text: string}>({show: false, text: ''});
  const [successModalData, setSuccessModalData] = useState<{result: TransactionResult, customer: Customer} | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setSuccessModalData(null);
      
      const logs: LogEntry[] = [
          {
              id: 'init-1',
              sender: 'customer',
              text: currentCustomer.dialogue.greeting,
              sentiment: 'neutral'
          }
      ];

      if (currentCustomer.dialogue.pawnReason) {
          logs.push({
              id: 'init-2',
              sender: 'customer',
              text: currentCustomer.dialogue.pawnReason,
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

  const getRejectionText = (customer: Customer, isAngry: boolean) => {
      const defaultLines = { standard: "行吧，那我走了。", angry: "浪费时间！", desperate: "求求你了..." };
      const lines: RejectionLines = customer.dialogue.rejectionLines || defaultLines;
      if (isAngry) return lines.angry || lines.standard;
      if (customer.negotiationStyle === 'Desperate') return lines.desperate || lines.standard;
      return lines.standard || customer.dialogue.rejected || "再见。";
  };

  useEffect(() => {
      if (isWalkedAway && !rejectionState.show && currentCustomer && !successModalData) {
          const text = getRejectionText(currentCustomer, mood === 'Angry');
          setRejectionState({ show: true, text });
      }
  }, [isWalkedAway, mood, currentCustomer, rejectionState.show, successModalData]);

  if (!currentCustomer || !item) return null;

  const handleOffer = () => {
    if (isWalkedAway) return;

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
        const txResult = evaluateTransaction(offerPrincipal, selectedRate);
        setTimeout(() => {
            setSuccessModalData({
                result: txResult,
                customer: currentCustomer
            });
        }, 800);
    }
  };

  const handleBinaryAccept = () => {
      const mockResult: TransactionResult = {
          success: true,
          message: currentCustomer.dialogue.accepted.fair || "成交。",
          cashDelta: currentAskPrice, 
          reputationDelta: {},
          item: currentCustomer.item,
          dealQuality: 'fair',
          terms: { principal: 0, rate: 0.10 } 
      };
      
      setSuccessModalData({
          result: mockResult,
          customer: currentCustomer
      });
  };

  const handleConfirmDeal = () => {
      if (successModalData) {
          commitTransaction(successModalData.result);
      }
  };

  const handleManualReject = () => {
      if (!currentCustomer) return;
      const text = getRejectionText(currentCustomer, mood === 'Angry');
      setRejectionState({ show: true, text });
  };

  const completeRejection = () => {
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
  const canInteract = !isWalkedAway && !rejectionState.show && !successModalData;
  const repaymentAmount = Math.floor(offerPrincipal * (1 + selectedRate));
  const profit = repaymentAmount - offerPrincipal;

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

  return (
    <div className="flex flex-col h-full relative bg-noir-100 border-l border-noir-400">
      <CustomerHeader customer={currentCustomer} patience={patience} mood={mood} />

      {successModalData && (
          <DealSuccessModal 
             customer={successModalData.customer}
             result={successModalData.result}
             onClose={handleConfirmDeal}
          />
      )}

      {/* Rejection Overlay */}
      {rejectionState.show && !successModalData && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-300">
                <div className="bg-noir-200 border-2 border-red-900/50 p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center">
                    <div className="text-6xl font-serif text-noir-txt-muted opacity-20 absolute top-4 left-4">“</div>
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
              return (
                  <div key={log.id} className={cn("flex flex-col max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300", isPlayer ? "items-end ml-auto" : "items-start")}>
                      <div className={cn(
                          "px-4 py-3 rounded-lg relative shadow-sm text-sm border",
                          isPlayer 
                              ? "bg-noir-300 border-noir-400 text-noir-txt-primary font-mono text-right rounded-br-none" 
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

      {/* Instinct HUD */}
      {instinct.text && !isBinaryChoice && (
        <div className="bg-black/60 border-y border-noir-400 p-2 backdrop-blur-sm flex justify-center">
            <div className={cn("text-xs font-mono flex items-center gap-2", instinct.color)}>
                <BrainCircuit className="w-3 h-3 animate-pulse" />
                <span className="uppercase font-bold tracking-wider mr-2">Instinct:</span>
                <span className="italic font-serif">"{instinct.text}"</span>
            </div>
        </div>
      )}

      {/* Control Deck */}
      <div className="bg-noir-200 border-t border-noir-400 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
         
         {isBinaryChoice ? (
             <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-end border-b border-noir-300 pb-2">
                    <span className="text-xs font-bold text-noir-txt-muted uppercase tracking-widest">Fixed Offer</span>
                    <span className="text-3xl font-mono font-bold text-noir-txt-primary">${currentAskPrice}</span>
                 </div>
                 
                 <div className="flex gap-3">
                     <Button variant="danger" onClick={handleManualReject} className="flex-1">
                        REJECT
                     </Button>
                     <Button variant="primary" onClick={handleBinaryAccept} disabled={!canFulfillDeal} className="flex-[2]">
                        {canFulfillDeal ? "ACCEPT DEAL" : fulfillmentError}
                     </Button>
                 </div>
             </div>
         ) : (
             <div className="space-y-4">
                 {/* Financials Row */}
                 <div className="flex justify-between items-center text-xs font-mono bg-black/20 p-2 rounded border border-noir-300">
                      <div className="flex items-center gap-2 text-noir-txt-muted">
                          <DollarSign className="w-3 h-3" />
                          <span>ASK: <span className="text-noir-txt-primary font-bold">${currentAskPrice}</span></span>
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
                         <span className="relative z-10 text-3xl font-mono font-bold text-amber-500 tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
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
                 <div className="flex justify-center gap-2">
                    <button onClick={handleMatchAsk} disabled={!canInteract} className="text-[10px] font-mono uppercase text-noir-txt-muted hover:text-noir-accent border-b border-transparent hover:border-noir-accent transition-colors">
                        Match Ask
                    </button>
                    <span className="text-noir-400">|</span>
                    <button onClick={handleQuickValuation} disabled={!canInteract} className="text-[10px] font-mono uppercase text-noir-txt-muted hover:text-noir-accent border-b border-transparent hover:border-noir-accent transition-colors">
                        Est. Value
                    </button>
                    {revealedMinimum && (
                        <>
                            <span className="text-noir-400">|</span>
                            <button onClick={handleQuickFloor} disabled={!canInteract} className="text-[10px] font-mono uppercase text-red-400 hover:text-red-300 border-b border-transparent hover:border-red-400 transition-colors animate-in fade-in">
                                Reveal Floor
                            </button>
                        </>
                    )}
                 </div>

                 {/* Main Action */}
                 <div className="flex gap-3">
                    <Button 
                      variant="danger" 
                      onClick={handleManualReject}
                      disabled={!canInteract}
                      className="w-16 h-14 border-2 border-red-900/50 hover:bg-red-950/50 flex items-center justify-center"
                      title="Reject"
                    >
                      <XCircle className="w-6 h-6"/>
                    </Button>

                    <Button 
                      variant="primary" 
                      onClick={handleOffer} 
                      disabled={!canInteract || !canAfford}
                      className="flex-1 h-14 text-xl tracking-[0.2em] relative overflow-hidden shadow-[0_0_20px_rgba(217,119,6,0.3)]"
                    >
                       <Stamp className="w-5 h-5 mr-3" />
                       SUBMIT
                    </Button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
