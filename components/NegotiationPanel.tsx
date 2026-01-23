
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Button } from './ui/Button';
import { Minus, Plus, Stamp, XCircle, LogOut, MessageCircle, TrendingUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Target, AlertCircle, ChevronDown, ChevronUp, Flame, Handshake, BrainCircuit, AlertTriangle } from 'lucide-react';
import { Customer, TransactionResult, InterestRate, RejectionLines, ItemStatus } from '../types';
import { DealSuccessModal } from './DealSuccessModal';
import { ActionLog, OfferRecord } from '../hooks/useNegotiation';
import { getMerchantInstinct } from '../systems/negotiation/instinct';
import { NegotiationHistory } from './NegotiationHistory';
import { playSfx } from '../systems/game/audio';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';

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
    sender: 'player' | 'customer';
    text: string;
    subtext?: string; 
    sentiment?: 'neutral' | 'negative' | 'positive';
}

const CustomerHeader: React.FC<{ customer: Customer, patience: number, mood: string }> = ({ customer, patience, mood }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        playSfx('CLICK');
        setExpanded(!expanded);
    };

    const isAngry = mood === 'Angry';
    const isHappy = mood === 'Happy';
    
    let borderColor = "border-[#44403c]";
    let shadowColor = "";
    
    if (isAngry) {
        borderColor = "border-red-600";
        shadowColor = "shadow-[0_0_10px_rgba(220,38,38,0.5)]";
    } else if (isHappy) {
        borderColor = "border-pawn-green";
        shadowColor = "shadow-[0_0_10px_rgba(16,185,129,0.3)]";
    }

    const resolveText: Record<string, string> = {
        Strong: '坚决', Medium: '犹豫', Weak: '动摇', None: '放弃'
    };
    const resolveColor: Record<string, string> = {
        Strong: 'text-red-500 border-red-900 bg-red-950/20',
        Medium: 'text-yellow-500 border-yellow-900 bg-yellow-950/20',
        Weak: 'text-stone-500 border-stone-800 bg-stone-900/20',
        None: 'text-stone-700 border-stone-800'
    };

    return (
        <div className="bg-[#141211] border-b border-[#292524] p-4 flex flex-col gap-3 flex-shrink-0">
             <div className="flex gap-4 items-center">
                 <div className={`w-14 h-14 rounded-full border-2 overflow-hidden flex-shrink-0 bg-stone-800 transition-colors duration-300 ${borderColor} ${shadowColor}`}>
                     <img 
                        src={`https://picsum.photos/seed/${customer.avatarSeed}/200`} 
                        alt="Customer" 
                        className={`w-full h-full object-cover transition-all duration-700 ${isAngry ? 'grayscale-0 contrast-125' : 'grayscale opacity-90'}`}
                     />
                 </div>
                 
                 <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                          <div>
                              <h2 className="text-base font-bold text-stone-200 leading-none truncate pr-2">{customer.name}</h2>
                              <span className="text-[10px] font-mono text-stone-500 tracking-widest">{customer.id.slice(0,8)}</span>
                          </div>
                          <div className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${resolveColor[customer.redemptionResolve]}`}>
                              {resolveText[customer.redemptionResolve]}
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                           <div className="flex gap-0.5">
                               {Array.from({length: 5}).map((_, i) => (
                                  <Flame 
                                    key={i} 
                                    className={`w-3 h-3 transition-all duration-300 ${
                                        i < patience 
                                            ? (isAngry ? 'text-red-600 fill-red-600 animate-pulse' : 'text-orange-500 fill-orange-500') 
                                            : 'text-stone-800'
                                    }`} 
                                  />
                               ))}
                           </div>
                           <span className={`text-[9px] uppercase font-bold tracking-wider ${isAngry ? 'text-red-500' : 'text-stone-600'}`}>
                                {isAngry ? "ANGRY" : "PATIENCE"}
                           </span>
                      </div>
                 </div>
             </div>
             
             <button 
                onClick={toggleExpand} 
                className="flex items-center justify-between text-[10px] text-stone-500 bg-stone-900/40 border border-stone-800 px-2 py-1.5 rounded hover:bg-stone-800 hover:text-stone-300 transition-colors w-full"
             >
                  <span className="flex items-center gap-2 uppercase tracking-wider font-bold"><AlertCircle className="w-3 h-3"/> 客户档案 (INTEL)</span>
                  {expanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
             </button>
             
             {expanded && (
                 <div className="text-xs text-stone-400 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="bg-black/20 p-2 rounded border-l-2 border-stone-600">
                          <span className="block text-[9px] uppercase text-stone-600 mb-0.5 font-bold">Pawn Reason</span>
                          <span className="font-serif italic">"{customer.dialogue.pawnReason}"</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded border-l-2 border-stone-600">
                          <span className="block text-[9px] uppercase text-stone-600 mb-0.5 font-bold">Redemption Plea</span>
                          <span className="font-serif italic">"{customer.dialogue.redemptionPlea}"</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded border-l-2 border-stone-600">
                          <span className="block text-[9px] uppercase text-stone-600 mb-0.5 font-bold">Negotiation Dynamic</span>
                          <span className="font-serif italic">"{customer.dialogue.negotiationDynamic}"</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded border-l-2 border-stone-600">
                          <span className="block text-[9px] uppercase text-stone-600 mb-0.5 font-bold">Negotiation Style</span>
                          <span className="font-serif font-bold text-pawn-accent">{customer.negotiationStyle}</span>
                      </div>
                 </div>
             )}
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

  // Validate Deal Availability (For binary negotiation events that require item possession)
  const event = currentCustomer?.eventId ? ALL_STORY_EVENTS.find(e => e.id === currentCustomer.eventId) : null;
  let canFulfillDeal = true;
  let fulfillmentError = "";

  if (isBinaryChoice && event) {
      // 1. Check if specific target item exists in inventory (Active or Forfeit)
      if (event.targetItemId) {
          const target = state.inventory.find(i => i.id === event.targetItemId);
          if (!target || (target.status !== ItemStatus.ACTIVE && target.status !== ItemStatus.FORFEIT)) {
              canFulfillDeal = false;
              fulfillmentError = "标的物缺失 (Item Missing)";
          }
      }
      
      // 2. Check FORCE_SELL_ALL constraint
      if (canFulfillDeal) {
          const standardOutcome = event.outcomes?.['deal_standard'];
          if (standardOutcome && standardOutcome.some(e => e.type === 'FORCE_SELL_ALL')) {
               const hasItems = state.inventory.some(i => 
                   i.relatedChainId === currentCustomer!.chainId && 
                   (i.status === ItemStatus.ACTIVE || i.status === ItemStatus.FORFEIT)
               );
               if (!hasItems) {
                   canFulfillDeal = false;
                   fulfillmentError = "无货可交 (Stock Empty)";
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
      setChatLog([
          {
              id: 'init-1',
              sender: 'customer',
              text: currentCustomer.dialogue.greeting,
              sentiment: 'neutral'
          }
      ]);
    }
  }, [currentCustomer?.id]);

  useEffect(() => {
      if (!lastAction) return;

      if (lastAction.type === 'LEVERAGE') {
          setChatLog(prev => [...prev, {
              id: `lev-${lastAction.id}`,
              sender: 'player',
              text: lastAction.text,
              sentiment: 'neutral'
          }, {
              id: `lev-react-${lastAction.id}`,
              sender: 'customer',
              text: "...",
              subtext: lastAction.subtext || "心情变差 (Mood Worsened)",
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
                  subtext: lastAction.subtext || "深层交流 (Deep Talk)",
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
    if (result.status === 'PRINCIPAL_TOO_LOW') penaltyLabel = "本金过低 (Too Low)";
    if (result.status === 'INSULT') penaltyLabel = "侮辱性报价 (Insult)";
    if (result.status === 'INTEREST_TOO_HIGH') penaltyLabel = "总利息过高 (Usury)";
    if (result.status === 'RATE_MISMATCH') penaltyLabel = "利率/本金不匹配 (Mismatch)";

    const playerLog: LogEntry = {
        id: `offer-${Date.now()}`,
        sender: 'player',
        text: `报价: $${offerPrincipal} (${selectedRate * 100}% 利息)`,
        sentiment: 'neutral'
    };

    const patienceLoss = prevPatience - result.patienceRemaining;
    const subtext = patienceLoss > 0 ? `-${patienceLoss} 耐心 [${penaltyLabel}]` : undefined;
    
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
      // For binary offers (like acquisition offers), the currentAskPrice is the amount offered to the player.
      // Therefore cashDelta should be positive.
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

  const handleQuickDesired = () => {
      playSfx('CLICK');
      setOfferPrincipal(Math.min(currentAskPrice, cashAvailable));
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

  const RateCard = ({ rate, label }: { rate: InterestRate, label: string }) => (
      <button 
        onClick={() => { playSfx('CLICK'); setSelectedRate(rate); }}
        disabled={!canInteract}
        className={`
            flex-1 py-2 px-1 rounded border transition-all duration-200 flex flex-col items-center justify-center gap-0.5
            ${selectedRate === rate 
                ? 'bg-pawn-accent text-black border-pawn-accent shadow-[0_0_10px_rgba(217,119,6,0.4)] scale-105 z-10' 
                : 'bg-[#292524] border-[#44403c] text-stone-400 hover:border-stone-500 hover:bg-[#333]'
            }
        `}
      >
          <span className="text-lg font-black font-mono leading-none">{rate * 100}%</span>
          <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">{label}</span>
      </button>
  );

  const AdjustButton = ({ amount, icon, label }: { amount: number, icon: React.ReactNode, label?: string }) => (
      <button
          onMouseDown={() => startAdjusting(amount)}
          onMouseUp={stopAdjusting}
          onMouseLeave={stopAdjusting}
          onTouchStart={() => startAdjusting(amount)}
          onTouchEnd={stopAdjusting}
          disabled={!canInteract}
          className="w-10 h-12 bg-[#1c1917] hover:bg-stone-800 border border-[#292524] rounded flex items-center justify-center text-stone-400 active:scale-95 transition-colors select-none"
          title={label}
      >
          {icon}
      </button>
  );

  return (
    <div className="flex flex-col h-full relative bg-[#1c1917] border-l border-[#44403c]">
      <CustomerHeader customer={currentCustomer} patience={patience} mood={mood} />

      {successModalData && (
          <DealSuccessModal 
             customer={successModalData.customer}
             result={successModalData.result}
             onClose={handleConfirmDeal}
          />
      )}

      {rejectionState.show && !successModalData && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300 rounded-sm">
                <div className="bg-[#1c1917] border-2 border-red-900/50 p-6 max-w-md w-full shadow-2xl relative">
                    <div className="mb-8 mt-6">
                        <MessageCircle className="w-10 h-10 text-stone-600 mb-4 mx-auto"/>
                        <p className="font-serif text-xl text-center text-stone-300 italic leading-relaxed px-4">
                            "{rejectionState.text}"
                        </p>
                    </div>
                    <Button 
                        variant="danger" 
                        onClick={completeRejection}
                        className="w-full h-14 text-lg tracking-widest border-red-800 hover:bg-red-950 flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        送 客 (DISMISS)
                    </Button>
                </div>
            </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/20" ref={scrollRef}>
          {chatLog.map(log => {
              const isPlayer = log.sender === 'player';
              return (
                  <div key={log.id} className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                      <div className={`
                          max-w-[90%] px-3 py-2 rounded text-sm relative border shadow-sm
                          ${isPlayer 
                              ? 'bg-amber-950/20 border-amber-900/40 text-amber-100 rounded-br-none' 
                              : 'bg-[#292524] border-[#44403c] text-stone-200 rounded-bl-none'
                          }
                      `}>
                          {log.text}
                      </div>
                      {log.subtext && (
                          <span className={`text-[10px] font-mono font-bold mt-1 px-1 ${log.sentiment === 'negative' ? 'text-red-500' : 'text-stone-500'}`}>
                              {log.subtext}
                          </span>
                      )}
                  </div>
              );
          })}
          
          {!isBinaryChoice && <NegotiationHistory history={offerHistory} />}
      </div>

      {!isBinaryChoice && (
          <div className="bg-[#0c0a09] border-t border-b border-[#292524] p-3 shadow-md grid grid-cols-2 gap-4">
              <div className="flex flex-col border-r border-[#292524] pr-4">
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Customer Ask</span>
                  <div className="flex items-center gap-3">
                      <span className="text-xl font-mono font-bold text-stone-200">
                         ${currentAskPrice}
                      </span>
                      {currentCustomer.desiredAmount > currentAskPrice && (
                          <span className="text-sm font-mono text-stone-500 line-through decoration-stone-500 decoration-2">
                              ${currentCustomer.desiredAmount}
                          </span>
                      )}
                      <span className="text-[9px] text-stone-600 bg-stone-900 px-1 rounded ml-auto">ASK</span>
                  </div>
              </div>
              
              <div className="flex flex-col pl-2">
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Projected Profit</span>
                  <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-pawn-green" />
                      <span className="text-xl font-mono font-bold text-pawn-green">
                         +${profit}
                      </span>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-[#1c1917] p-4 border-t border-[#44403c] shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-10 flex flex-col gap-3">
         
         {isBinaryChoice ? (
             <div className="flex flex-col gap-4 py-2">
                 <div className="text-center">
                    <span className="text-stone-500 text-xs font-bold uppercase tracking-widest block mb-2">OFFER RECEIVED</span>
                    <div className="inline-block px-6 py-2 bg-[#0c0a09] border border-stone-700 rounded-lg relative">
                        <span className="text-4xl font-mono font-black text-white tracking-widest">${currentAskPrice}</span>
                        <div className="absolute -top-3 -right-3">
                            <Stamp className="w-6 h-6 text-pawn-accent rotate-[15deg]" />
                        </div>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 items-center">
                     <Button 
                        variant="danger" 
                        onClick={handleManualReject} 
                        className="flex-1 h-14 flex flex-col items-center justify-center gap-1 border-red-900 hover:bg-red-950"
                     >
                        <span className="font-bold text-lg">拒绝</span>
                        <span className="text-[10px] opacity-70">REJECT OFFER</span>
                     </Button>
                     
                     <Button 
                        variant="primary" 
                        onClick={handleBinaryAccept}
                        disabled={!canFulfillDeal} 
                        className={`flex-[2] h-14 flex flex-col items-center justify-center gap-1 border-pawn-accent shadow-[0_0_15px_rgba(217,119,6,0.3)] ${!canFulfillDeal ? 'grayscale opacity-50 cursor-not-allowed border-stone-600 shadow-none' : ''}`}
                     >
                        <span className="font-bold text-lg flex items-center gap-2">
                            {canFulfillDeal ? <Handshake className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5 text-red-500"/>} 
                            {canFulfillDeal ? "成交" : "无法成交"}
                        </span>
                        <span className={`text-[10px] opacity-70 ${!canFulfillDeal ? 'text-red-400 font-bold' : 'text-black'}`}>
                            {canFulfillDeal ? "ACCEPT DEAL" : (fulfillmentError || "ITEM MISSING")}
                        </span>
                     </Button>
                 </div>
             </div>
         ) : (
             <>
                 <div>
                     <div className="flex gap-2">
                        <RateCard rate={0} label="Charity" />
                        <RateCard rate={0.05} label="Standard" />
                        <RateCard rate={0.10} label="High" />
                        <RateCard rate={0.20} label="Shark" />
                     </div>
                 </div>

                 <div>
                     <div className="flex items-center gap-1 bg-[#0c0a09] border border-[#292524] rounded p-1 justify-between">
                         
                         <div className="flex gap-1">
                             <AdjustButton amount={-100} icon={<ChevronsLeft className="w-4 h-4"/>} label="-100" />
                             <AdjustButton amount={-10} icon={<ChevronLeft className="w-4 h-4"/>} label="-10" />
                         </div>
                         
                         <div className="flex-1 flex flex-col items-center justify-center min-w-[80px]">
                             <button 
                                 onClick={handleMatchAsk}
                                 disabled={!canInteract}
                                 className="text-[10px] text-pawn-accent/80 hover:text-pawn-accent hover:underline uppercase font-bold tracking-widest mb-1 flex items-center gap-1 transition-all active:scale-95"
                                 title={`Set to $${currentAskPrice}`}
                             >
                                 <Target className="w-3 h-3" />
                                 MATCH
                             </button>
                             <span className="text-2xl font-mono font-bold text-white tracking-wider">
                                ${offerPrincipal}
                             </span>
                         </div>

                         <div className="flex gap-1">
                             <AdjustButton amount={10} icon={<ChevronRight className="w-4 h-4"/>} label="+10" />
                             <AdjustButton amount={100} icon={<ChevronsRight className="w-4 h-4"/>} label="+100" />
                         </div>
                     </div>
                     
                     <div className="flex justify-center gap-2 mt-2">
                        <button 
                            onClick={handleQuickDesired}
                            disabled={!canInteract}
                            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-400 rounded border border-stone-700 transition-colors"
                        >
                            [期望]
                        </button>
                        <button 
                            onClick={handleQuickValuation}
                            disabled={!canInteract}
                            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-400 rounded border border-stone-700 transition-colors"
                        >
                            [估值]
                        </button>
                        {revealedMinimum && (
                            <button 
                                onClick={handleQuickFloor}
                                disabled={!canInteract}
                                className="px-2 py-1 bg-red-950/30 hover:bg-red-900/50 text-[10px] font-mono text-red-400 rounded border border-red-900/50 transition-colors animate-in fade-in"
                            >
                                [底价]
                            </button>
                        )}
                     </div>
                 </div>

                 {instinct.text && (
                    <div className="py-2 -mx-2 flex flex-col items-center justify-center min-h-[3rem] animate-in fade-in duration-300">
                        <div className={`flex items-center gap-2 opacity-80 mb-1 ${instinct.color}`}>
                             <BrainCircuit className="w-3 h-3" />
                             <span className="text-[9px] font-mono uppercase tracking-widest font-bold">
                                 直觉
                             </span>
                        </div>
                        <p className={`text-center font-serif italic text-sm ${instinct.color} leading-snug transition-all`}>
                            "{instinct.text}"
                        </p>
                    </div>
                 )}

                 <div className="flex gap-3 mt-1">
                    <Button 
                      variant="danger" 
                      onClick={handleManualReject}
                      disabled={!canInteract}
                      className="w-16 h-14 border-2 hover:bg-red-900/40 flex items-center justify-center group opacity-80 hover:opacity-100"
                      title="Reject"
                    >
                      <XCircle className="w-6 h-6 group-hover:rotate-90 transition-transform"/>
                    </Button>

                    <Button 
                      variant="primary" 
                      onClick={handleOffer} 
                      disabled={!canInteract || !canAfford}
                      className={`flex-1 h-14 text-xl tracking-[0.2em] relative overflow-hidden flex items-center justify-center gap-3 shadow-lg ${!canInteract || !canAfford ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                    >
                       <Stamp className="w-5 h-5" />
                       SUBMIT OFFER
                    </Button>
                 </div>
             </>
         )}
      </div>
    </div>
  );
};
