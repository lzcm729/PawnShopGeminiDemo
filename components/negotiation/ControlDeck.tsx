
import React, { useMemo, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { RollingNumber } from '../ui/RollingNumber';
import { Stamp, XCircle, TrendingUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, DollarSign, ArrowUpFromLine, Calculator, Calendar, TrendingDown, Lock, Zap, HeartCrack, ArrowDown, ArrowRight, ArrowUp, Crosshair, AlertTriangle, HandMetal } from 'lucide-react';
import { InterestRate, Customer, Item } from '../../types';
import { ContractTierHint } from '../../systems/characterAbility/types';
import type { ProbeRevealResult, ConcessionTier } from '../../systems/negotiation/probeEffects';
import type { PatiencePhase } from '../../hooks/useNegotiation';
import { getConcessionTierLabel } from '../../systems/negotiation/empathyProbeFeedback';
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

    // Character Ability: Heart Strike skill
    canUseHeartStrike?: boolean;
    heartStrikeUsed?: boolean;
    onHeartStrike?: () => void;

    // Character Ability: Contract Tier Hints (因果自见)
    contractTierHints?: ContractTierHint[];

    // Round tracking
    roundCount: number;

    // Probe reveal (trial result from successful probe)
    probeReveal?: ProbeRevealResult | null;
    liveConcessionTier?: ConcessionTier | null;

    // B-10: Hook-computed concession tier (always available)
    concessionTier?: ConcessionTier;

    // E-3: Patience decision gradient
    patiencePhase?: PatiencePhase;

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
    canUseHeartStrike,
    heartStrikeUsed,
    onHeartStrike,
    contractTierHints,
    roundCount,
    probeReveal,
    liveConcessionTier,
    concessionTier,
    patiencePhase = 'normal',
    onOffer,
    onManualReject,
    onBinaryAccept,
}) => {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const repaymentAmount = Math.floor(offerPrincipal * (1 + selectedRate));
    const profit = repaymentAmount - offerPrincipal;
    const estimatedValue = Math.floor((item.currentRange[0] + item.currentRange[1]) / 2);

    const gap = currentAskPrice - offerPrincipal;
    // Trend: compare current gap to previous gap (using lastOfferAmount as proxy)
    const prevGap = lastOfferAmount !== null ? (currentAskPrice - lastOfferAmount) : null;
    const gapTrend: 'shrinking' | 'stable' | 'growing' | null = prevGap !== null
        ? (gap < prevGap ? 'shrinking' : gap === prevGap ? 'stable' : 'growing')
        : null;

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

    const getTierColor = (tier: ConcessionTier): string => {
        if (tier === 'low') return 'text-red-400';
        if (tier === 'medium') return 'text-amber-400';
        return 'text-pawn-green';
    };

    const getTierBgColor = (tier: ConcessionTier): string => {
        if (tier === 'low') return 'bg-red-950/30 border-red-900/40';
        if (tier === 'medium') return 'bg-amber-950/30 border-amber-900/40';
        return 'bg-emerald-950/30 border-emerald-900/40';
    };

    // Map rate to contract tier for hint lookup
    const rateTierMap: Record<number, ContractTierHint['tier']> = {
        0: 'CHARITY',
        0.05: 'AID',
        0.10: 'STANDARD',
        0.20: 'SHARK',
    };

    const getHintColor = (rate: InterestRate): string | null => {
        if (!contractTierHints || contractTierHints.length === 0) return null;
        const tier = rateTierMap[rate];
        if (!tier) return null;
        const hint = contractTierHints.find(h => h.tier === tier);
        if (!hint || hint.hintColor === 'NONE') return null;
        if (hint.hintColor === 'GOLD') return 'bg-amber-400';
        if (hint.hintColor === 'DARK_RED') return 'bg-red-700';
        return null;
    };

    const RateToggle = ({ rate, label }: { rate: InterestRate, label: string }) => {
        const hintDotColor = getHintColor(rate);

        return (
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
                {hintDotColor && (
                    <span className={cn(
                        "absolute top-1 right-1 w-2 h-2 rounded-full z-20 animate-pulse shadow-sm",
                        hintDotColor
                    )} />
                )}
                <span className="text-xs font-black font-mono leading-none z-10">{formatRate(rate)}{unitLabel}</span>
                <span className="text-[8px] uppercase font-bold tracking-wider opacity-80 z-10">{label}</span>
            </button>
        );
    };

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

                   {/* Round Counter + Gap/Trend Row */}
                   <div className="flex justify-between items-center text-xs font-mono bg-black/20 p-1.5 rounded border border-noir-300">
                        {/* Round Counter */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-noir-txt-muted">
                            <span>
                                第 <span className="font-bold">{roundCount}</span> 回合
                            </span>
                        </div>

                        {/* Gap + Trend */}
                        {offerHistoryLength > 0 && gap > 0 && (
                            <div className="flex items-center gap-1.5 text-noir-txt-muted">
                                <span>差距:</span>
                                <span className="font-bold text-noir-txt-primary">${gap}</span>
                                {gapTrend === 'shrinking' && (
                                    <span className="flex items-center gap-0.5 text-pawn-green">
                                        <ArrowDown className="w-3 h-3" />
                                        <span className="text-[10px]">收敛</span>
                                    </span>
                                )}
                                {gapTrend === 'stable' && (
                                    <span className="flex items-center gap-0.5 text-stone-500">
                                        <ArrowRight className="w-3 h-3" />
                                        <span className="text-[10px]">僵持</span>
                                    </span>
                                )}
                                {gapTrend === 'growing' && (
                                    <span className="flex items-center gap-0.5 text-red-400">
                                        <ArrowUp className="w-3 h-3" />
                                        <span className="text-[10px]">扩大</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* B-10: Concession tier badge (when probe indicator is not active) */}
                        {concessionTier && !probeReveal && offerHistoryLength > 0 && (
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-all duration-300",
                                getTierBgColor(concessionTier)
                            )}>
                                <Crosshair className={cn("w-2.5 h-2.5", getTierColor(concessionTier))} />
                                <span className={getTierColor(concessionTier)}>
                                    {getConcessionTierLabel(concessionTier)}
                                </span>
                            </div>
                        )}
                   </div>

                   {/* E-UI-3: Last Chance Warning Banner (patience = 1) */}
                   {patiencePhase === 'last_chance' && (
                       <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/50 rounded p-3 animate-in fade-in duration-300">
                           <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                           <div className="flex-1">
                               <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                                   Last Chance
                               </div>
                               <div className="text-[10px] text-red-300/70 mt-0.5">
                                   再失去耐心就要走了
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button
                                   onClick={() => {
                                       playSfx('CLICK');
                                       // Concede: lower rate by one tier
                                       const rateTiers: InterestRate[] = [0, 0.05, 0.10, 0.20];
                                       const currentIdx = rateTiers.indexOf(selectedRate);
                                       if (currentIdx > 0) {
                                           setSelectedRate(rateTiers[currentIdx - 1]);
                                       }
                                   }}
                                   disabled={!canInteract || selectedRate === 0}
                                   className={cn(
                                       "px-3 py-2 rounded border text-[11px] font-bold transition-all",
                                       selectedRate === 0
                                           ? "bg-noir-400/30 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                           : "bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50 active:scale-95"
                                   )}
                               >
                                   让步
                               </button>
                               <button
                                   onClick={() => {
                                       playSfx('CLICK');
                                       // Stand firm: do nothing, just acknowledge
                                   }}
                                   disabled={!canInteract}
                                   className="px-3 py-2 rounded border bg-amber-950/40 border-amber-800/60 text-amber-400 hover:bg-amber-900/50 text-[11px] font-bold transition-all active:scale-95"
                               >
                                   坚持
                               </button>
                           </div>
                       </div>
                   )}

                   {/* E-UI-3: Final Adjustment Panel (patience = 0) */}
                   {patiencePhase === 'final_adjustment' ? (
                       <div className="space-y-3 animate-in fade-in duration-300">
                           <div className="flex items-center gap-3 bg-red-950/40 border border-red-700/60 rounded p-3">
                               <HandMetal className="w-5 h-5 text-red-400 shrink-0" />
                               <div className="flex-1">
                                   <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                                       Final Adjustment
                                   </div>
                                   <div className="text-[10px] text-red-300/70 mt-0.5">
                                       对方耐心已尽 -- 只能做最后微调
                                   </div>
                               </div>
                           </div>

                           {/* Simplified adjustment: principal +/-5% */}
                           <div className="flex items-center gap-3">
                               <span className="text-[10px] text-noir-txt-muted uppercase tracking-wider w-16 shrink-0">当金</span>
                               <button
                                   onClick={() => {
                                       playSfx('CLICK');
                                       const delta = Math.max(1, Math.round(offerPrincipal * 0.05));
                                       setOfferPrincipal(prev => Math.max(0, prev - delta));
                                   }}
                                   disabled={!canInteract}
                                   className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-red-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                               >
                                   -5%
                               </button>
                               <div className="flex-1 bg-black border border-red-900/50 h-10 flex items-center justify-center rounded overflow-hidden">
                                   <span className="text-2xl font-mono font-bold text-amber-500 tracking-widest">
                                       <RollingNumber value={offerPrincipal} prefix="$" />
                                   </span>
                               </div>
                               <button
                                   onClick={() => {
                                       playSfx('CLICK');
                                       const delta = Math.max(1, Math.round(offerPrincipal * 0.05));
                                       setOfferPrincipal(prev => Math.min(cashAvailable, prev + delta));
                                   }}
                                   disabled={!canInteract}
                                   className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-pawn-green active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                               >
                                   +5%
                               </button>
                           </div>

                           {/* Simplified adjustment: rate +/-1 tier */}
                           <div className="flex items-center gap-3">
                               <span className="text-[10px] text-noir-txt-muted uppercase tracking-wider w-16 shrink-0">利率</span>
                               <button
                                   onClick={() => {
                                       playSfx('CLICK');
                                       const rateTiers: InterestRate[] = [0, 0.05, 0.10, 0.20];
                                       const idx = rateTiers.indexOf(selectedRate);
                                       if (idx > 0) setSelectedRate(rateTiers[idx - 1]);
                                   }}
                                   disabled={!canInteract || selectedRate === 0}
                                   className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-red-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                               >
                                   -1
                               </button>
                               <div className="flex-1 bg-black border border-red-900/50 h-10 flex items-center justify-center rounded overflow-hidden">
                                   <span className="text-lg font-mono font-bold text-amber-500">
                                       {formatRate(selectedRate)}{unitLabel}
                                   </span>
                               </div>
                               <button
                                   onClick={() => {
                                       playSfx('CLICK');
                                       const rateTiers: InterestRate[] = [0, 0.05, 0.10, 0.20];
                                       const idx = rateTiers.indexOf(selectedRate);
                                       if (idx < rateTiers.length - 1) setSelectedRate(rateTiers[idx + 1]);
                                   }}
                                   disabled={!canInteract || selectedRate === 0.20}
                                   className="w-10 h-10 bg-noir-300 border border-noir-400 rounded flex items-center justify-center hover:bg-noir-400 text-pawn-green active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                               >
                                   +1
                               </button>
                           </div>

                           {/* Final action: only Reject + Offer */}
                           <div className="flex gap-3">
                               <Button
                                   variant="danger"
                                   onClick={onManualReject}
                                   disabled={!canInteract}
                                   className="w-16 h-14 border-2 border-red-900/50 hover:bg-red-950/50 flex items-center justify-center"
                                   title="Reject"
                               >
                                   <XCircle className="w-5 h-5"/>
                               </Button>
                               <Button
                                   variant="primary"
                                   onClick={onOffer}
                                   disabled={!canInteract || !canAfford}
                                   className="flex-1 h-14 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center bg-red-700 hover:bg-red-600"
                               >
                                   <div className="flex items-center gap-2">
                                       <Stamp className="w-4 h-4" />
                                       <span className="text-sm font-bold tracking-[0.2em]">Final Offer</span>
                                   </div>
                               </Button>
                           </div>
                       </div>
                   ) : (
                   <>
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

                       {/* Quick-Deal Shortcuts (Chip Presets) */}
                       <div className="flex gap-1.5">
                          <button
                              onClick={handleMatchAsk}
                              disabled={!canInteract}
                              className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 rounded-full px-2 py-1.5 text-[11px] font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                              <span className="text-stone-500 text-[9px]">对方出价</span>
                              <span>${currentAskPrice}</span>
                          </button>

                          <button
                              onClick={handleQuickValuation}
                              disabled={!canInteract}
                              className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 rounded-full px-2 py-1.5 text-[11px] font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                              <span className="text-stone-500 text-[9px]">估值中位</span>
                              <span>${estimatedValue}</span>
                          </button>

                          {(() => {
                              const floorRevealed = revealedMinimum || debugRevealFloor || !!probeReveal;
                              const floorPrice = probeReveal?.floorPrice ?? currentCustomer.minimumAmount;
                              const handleFloorClick = () => {
                                  playSfx('CLICK');
                                  setOfferPrincipal(Math.min(floorPrice, cashAvailable));
                              };
                              return (
                                  <button
                                      onClick={floorRevealed ? handleFloorClick : undefined}
                                      disabled={!floorRevealed || !canInteract}
                                      className={cn(
                                          "flex-1 rounded-full px-2 py-1.5 text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1",
                                          floorRevealed
                                              ? "bg-red-950/30 border border-red-900/50 text-red-400 hover:bg-red-900/40 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed animate-in fade-in"
                                              : "bg-stone-900 border border-stone-800 text-stone-600 cursor-not-allowed"
                                      )}
                                  >
                                      {!floorRevealed && <Lock className="w-2.5 h-2.5" />}
                                      {floorRevealed && probeReveal && <Crosshair className="w-2.5 h-2.5" />}
                                      <span className={cn("text-[9px]", floorRevealed ? "text-red-500/70" : "text-stone-600")}>已知底价</span>
                                      <span>{floorRevealed ? `$${floorPrice}` : '???'}</span>
                                  </button>
                              );
                          })()}
                       </div>

                       {/* Negotiation Range Indicator - shows floor-to-ask spread when floor is known */}
                       {(() => {
                           const floorKnown = revealedMinimum || debugRevealFloor || !!probeReveal;
                           if (!floorKnown) return null;
                           const floorPrice = probeReveal?.floorPrice ?? currentCustomer.minimumAmount;
                           const spread = currentAskPrice - floorPrice;
                           if (spread <= 0) return null;
                           const offerPercent = Math.max(0, Math.min(100,
                               ((offerPrincipal - floorPrice) / spread) * 100
                           ));
                           return (
                               <div className="flex items-center text-[10px] font-mono text-noir-txt-muted h-6 animate-in fade-in duration-300">
                                   <span className="text-red-400/80 whitespace-nowrap">底线 ${floorPrice}</span>
                                   <div className="relative flex-1 h-1.5 bg-stone-800 rounded-full mx-2">
                                       {/* Offer position marker */}
                                       <div
                                           className="absolute h-3.5 w-1 bg-amber-500 -top-[4px] rounded-sm shadow-[0_0_4px_rgba(245,158,11,0.5)] transition-all duration-200"
                                           style={{ left: `${offerPercent}%` }}
                                       />
                                   </div>
                                   <span className="text-stone-500 whitespace-nowrap">要价 ${currentAskPrice}</span>
                               </div>
                           );
                       })()}

                       {/* Probe: Live Concession Tier Indicator */}
                       {probeReveal && liveConcessionTier && (
                           <div className={cn(
                               "flex items-center justify-between text-xs font-mono p-1.5 rounded border animate-in fade-in duration-300",
                               getTierBgColor(liveConcessionTier)
                           )}>
                               <div className="flex items-center gap-1.5">
                                   <Crosshair className={cn("w-3 h-3", getTierColor(liveConcessionTier))} />
                                   <span className="text-noir-txt-muted">{getConcessionTierLabel(liveConcessionTier)}</span>
                               </div>
                               <div className="flex items-center gap-1">
                                   {(['low', 'medium', 'high'] as const).map(t => (
                                       <span
                                           key={t}
                                           className={cn(
                                               "w-2 h-2 rounded-full transition-all duration-300",
                                               t === liveConcessionTier ? cn(
                                                   t === 'low' ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]" :
                                                   t === 'medium' ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" :
                                                   "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                                               ) : "bg-noir-400/50"
                                           )}
                                       />
                                   ))}
                               </div>
                           </div>
                       )}

                       {/* Action Group: Pressure / Heart Strike / Reject / Offer */}
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
                          {onPressure && patiencePhase === 'normal' && (
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

                          {/* Heart Strike Skill Button */}
                          {onHeartStrike && patiencePhase === 'normal' && (
                              <button
                                  onClick={() => {
                                      if (!heartStrikeUsed && canUseHeartStrike && canInteract) {
                                          playSfx('CLICK');
                                          onHeartStrike();
                                      }
                                  }}
                                  disabled={!canInteract || !canUseHeartStrike || heartStrikeUsed}
                                  title={heartStrikeUsed ? "已使用 - 每次议价限用一次" : "攻心: 动摇对方心防，更容易让步，不消耗耐心"}
                                  className={cn(
                                      "w-16 h-16 border-2 rounded flex flex-col items-center justify-center transition-all duration-200",
                                      heartStrikeUsed
                                          ? "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                          : canUseHeartStrike && canInteract
                                          ? "bg-purple-950/40 border-purple-700/60 text-purple-400 hover:bg-purple-900/50 hover:border-purple-500 hover:shadow-[0_0_12px_rgba(147,51,234,0.3)] active:scale-95"
                                          : "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                  )}
                              >
                                  <HeartCrack className={cn("w-5 h-5", heartStrikeUsed && "opacity-40")} />
                                  <span className="text-[9px] font-bold tracking-wider mt-0.5">
                                      {heartStrikeUsed ? "已用" : "攻心"}
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
                   </>
                   )}
               </div>
           )}
        </div>
    );
};
