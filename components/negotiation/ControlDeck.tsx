
import React, { useMemo, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { RollingNumber } from '../ui/RollingNumber';
import { Stamp, XCircle, TrendingUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, DollarSign, ArrowUpFromLine, Calculator, Calendar, TrendingDown, Lock, Zap } from 'lucide-react';
import { InterestRate, Customer, Item } from '../../types';
import { playSfx } from '../../systems/game/audio';

interface ControlDeckProps {
    // Customer/item data
    currentCustomer: Customer;
    item: Item;
    isBinaryChoice: boolean;
    cashAvailable: number;

    // Negotiation state
    offerPrincipal: number;
    setOfferPrincipal: React.Dispatch<React.SetStateAction<number>>;
    selectedRate: InterestRate;
    setSelectedRate: React.Dispatch<React.SetStateAction<InterestRate>>;
    currentAskPrice: number;
    canInteract: boolean;
    canAfford: boolean;
    isSubmitting: boolean;
    revealedMinimum: boolean;
    debugRevealFloor: boolean;

    // Push-pull state
    lastOfferAmount: number | null;
    askPriceChanged: boolean;
    askChangeAmount: number;

    // Offer history for button text
    offerHistoryLength: number;

    // Instinct
    instinct: { text: string; color: string };

    // Binary choice
    canFulfillDeal: boolean;
    fulfillmentError: string;

    // Rate display
    formatRate: (rate: number) => string;
    unitLabel: string;

    // Character Ability: Pressure skill
    canUsePressure?: boolean;
    pressureUsed?: boolean;
    onPressure?: () => void;

    // Handlers
    onOffer: () => void;
    onManualReject: () => void;
    onBinaryAccept: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
    currentCustomer,
    item,
    isBinaryChoice,
    cashAvailable,
    offerPrincipal,
    setOfferPrincipal,
    selectedRate,
    setSelectedRate,
    currentAskPrice,
    canInteract,
    canAfford,
    isSubmitting,
    revealedMinimum,
    debugRevealFloor,
    lastOfferAmount,
    askPriceChanged,
    askChangeAmount,
    offerHistoryLength,
    instinct,
    canFulfillDeal,
    fulfillmentError,
    formatRate,
    unitLabel,
    canUsePressure,
    pressureUsed,
    onPressure,
    onOffer,
    onManualReject,
    onBinaryAccept,
}) => {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const repaymentAmount = Math.floor(offerPrincipal * (1 + selectedRate));
    const profit = repaymentAmount - offerPrincipal;
    const estimatedValue = Math.floor((item.currentRange[0] + item.currentRange[1]) / 2);

    // Determine submit button text based on player's move
    const getSubmitButtonText = useMemo(() => {
        if (offerHistoryLength === 0) return '报价';
        if (lastOfferAmount === null) return '报价';
        if (offerPrincipal === lastOfferAmount) return '坚持';
        if (offerPrincipal > lastOfferAmount) return '让步';
        return '报价';
    }, [offerHistoryLength, lastOfferAmount, offerPrincipal]);

    const adjustPrincipal = (amount: number) => {
        setOfferPrincipal(prev => {
            const next = prev + amount;
            if (next < 0) return 0;
            if (next > cashAvailable) return cashAvailable;
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

    const handleMatchAsk = () => {
        if (!canInteract) return;
        playSfx('CLICK');
        const target = Math.min(currentAskPrice, cashAvailable);
        setOfferPrincipal(target);
    };

    const handleQuickValuation = () => {
        playSfx('CLICK');
        setOfferPrincipal(Math.min(estimatedValue, cashAvailable));
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

    return (
        <div className="bg-noir-200 border-t border-noir-400 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
           {isBinaryChoice ? (
               <div className="flex flex-col gap-4">
                   <div className="flex justify-between items-end border-b border-noir-300 pb-2">
                      <span className="text-xs font-bold text-noir-txt-muted uppercase tracking-widest">Fixed Offer</span>
                      <span className="text-3xl font-mono font-bold text-noir-txt-primary">${currentAskPrice}</span>
                   </div>

                   <div className="flex gap-3">
                       <Button variant="danger" onClick={onManualReject} disabled={isSubmitting} className="flex-1">
                          REJECT
                       </Button>
                       <Button variant="primary" onClick={onBinaryAccept} disabled={!canFulfillDeal || isSubmitting} className="flex-[2]">
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
                          const floorRevealed = revealedMinimum || debugRevealFloor;
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
                        onClick={onManualReject}
                        disabled={!canInteract}
                        className="w-16 h-16 border-2 border-red-900/50 hover:bg-red-950/50 flex items-center justify-center"
                        title="Reject"
                      >
                        <XCircle className="w-6 h-6"/>
                      </Button>

                      {/* Pressure Skill Button */}
                      {onPressure && (
                          <button
                              onClick={() => {
                                  if (!pressureUsed && canUsePressure && canInteract) {
                                      playSfx('CLICK');
                                      onPressure();
                                  }
                              }}
                              disabled={!canInteract || !canUsePressure || pressureUsed}
                              title={pressureUsed ? "已使用 - 每次议价限用一次" : "施压: 降低客户底价 8%，耐心 -1"}
                              className={cn(
                                  "w-16 h-16 border-2 rounded flex flex-col items-center justify-center transition-all duration-200",
                                  pressureUsed
                                      ? "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                      : canUsePressure && canInteract
                                      ? "bg-orange-950/40 border-orange-700/60 text-orange-400 hover:bg-orange-900/50 hover:border-orange-500 hover:shadow-[0_0_12px_rgba(234,88,12,0.3)] active:scale-95"
                                      : "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                              )}
                          >
                              <Zap className={cn("w-5 h-5", pressureUsed && "opacity-40")} />
                              <span className="text-[9px] font-bold tracking-wider mt-0.5">
                                  {pressureUsed ? "已用" : "施压"}
                              </span>
                          </button>
                      )}

                      <Button
                        variant="primary"
                        onClick={onOffer}
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
    );
};
