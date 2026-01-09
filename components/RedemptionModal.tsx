
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { Item, ItemStatus } from '../types';
import { Button } from './ui/Button';
import { Calculator, CalendarClock, AlertTriangle, Skull, Banknote, ArrowRight, X, AlertOctagon } from 'lucide-react';

interface RedemptionModalProps {
    item: Item;
    onClose: () => void;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({ item, onClose }) => {
    const { state } = useGame();
    const { calculateRedemptionCost, calculatePenalty, processRedemption, processExtension } = usePawnShop();
    
    // Calculate Costs
    const costs = calculateRedemptionCost(item);
    const penalty = calculatePenalty(item);
    
    const isBreach = item.status === ItemStatus.SOLD;
    const canAffordPenalty = state.stats.cash >= penalty;

    // Extension State
    const [extendDays, setExtendDays] = useState(7);

    if (!costs && !isBreach) return null;

    const handleRedeem = () => {
        processRedemption(item);
        onClose();
    };

    const handleExtend = () => {
        processExtension(item, extendDays);
        onClose();
    };

    // --- BREACH UI (High Tension) ---
    if (isBreach) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-red-950/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
                <div className="w-full max-w-lg bg-[#1c0000] border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] p-8 relative overflow-hidden flex flex-col items-center text-center">
                    
                    {/* Background Noise */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none"></div>

                    <div className="w-20 h-20 bg-red-900/50 rounded-full flex items-center justify-center mb-6 animate-pulse border-2 border-red-500">
                        <AlertOctagon className="w-10 h-10 text-red-500" />
                    </div>

                    <h2 className="text-3xl font-black text-red-500 tracking-widest uppercase mb-2">严重违约</h2>
                    <h3 className="text-sm font-mono text-red-300 mb-6">CONTRACT VIOLATION DETECTED</h3>

                    <div className="bg-black/40 border border-red-900/50 p-4 rounded w-full mb-6">
                        <p className="text-stone-300 font-serif italic mb-4">
                            "顾客 <span className="text-white font-bold">{item.name}</span> 回来赎当了，但你已经把东西卖了。"
                        </p>
                        <div className="flex justify-between items-center text-sm font-mono border-t border-red-900/30 pt-4">
                            <span className="text-red-400">违约赔偿金 (双倍估值)</span>
                            <span className="text-2xl font-bold text-red-500">-${penalty}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono mt-2">
                             <span className="text-stone-500">当前现金</span>
                             <span className={canAffordPenalty ? "text-stone-300" : "text-red-500 font-bold"}>${state.stats.cash}</span>
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        <Button 
                            variant="danger" 
                            onClick={handleRedeem}
                            disabled={!canAffordPenalty}
                            className="w-full h-14 text-lg border-2 border-red-500 bg-red-900/20 hover:bg-red-800"
                        >
                            {canAffordPenalty ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Skull className="w-5 h-5" /> 支付赔偿并结案
                                </span>
                            ) : (
                                <span>资金不足 (GAME OVER)</span>
                            )}
                        </Button>
                        <button onClick={onClose} className="text-red-900/50 text-xs hover:text-red-700 uppercase font-bold tracking-widest">
                            逃避现实 (Cancel)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- STANDARD REDEMPTION UI ---
    if (!costs) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#1c1917] border border-[#44403c] shadow-2xl rounded-lg overflow-hidden flex flex-col md:flex-row h-auto md:h-[500px]">
                
                {/* LEFT: Item Info */}
                <div className="w-full md:w-1/3 bg-[#0c0a09] p-6 border-b md:border-b-0 md:border-r border-[#292524] flex flex-col items-center text-center relative">
                    <button onClick={onClose} className="absolute top-4 left-4 md:hidden text-stone-500">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="w-24 h-24 bg-stone-800 rounded-full flex items-center justify-center mb-4 border border-stone-700 shadow-inner">
                        <Banknote className="w-10 h-10 text-stone-500" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-200 mb-1">{item.name}</h2>
                    <span className="text-xs font-mono text-pawn-accent bg-pawn-accent/10 px-2 py-1 rounded border border-pawn-accent/20 mb-6">
                        {item.status === ItemStatus.FORFEIT ? '已逾期 (OVERDUE)' : '典当期内 (ACTIVE)'}
                    </span>

                    <div className="w-full text-left space-y-4 text-xs font-mono text-stone-500 mt-auto">
                        <div className="flex justify-between border-b border-stone-800 pb-1">
                            <span>立契日期</span>
                            <span>Day {item.pawnInfo!.startDate}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-800 pb-1">
                            <span>到期日期</span>
                            <span className={item.status === ItemStatus.FORFEIT ? "text-red-500" : ""}>Day {item.pawnInfo!.dueDate}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-800 pb-1">
                            <span>当前日期</span>
                            <span>Day {state.stats.day}</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Financials & Actions */}
                <div className="flex-1 bg-[#1c1917] p-8 flex flex-col relative">
                     <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white hidden md:block">
                        <X className="w-6 h-6" />
                    </button>

                    <h3 className="text-lg font-mono font-bold text-stone-400 mb-6 flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> 费用结算
                    </h3>

                    {/* Bill Breakdown */}
                    <div className="space-y-3 mb-8 bg-black/20 p-4 rounded border border-[#292524]">
                        <div className="flex justify-between items-center text-stone-400 font-mono text-sm">
                            <span>本金 (Principal)</span>
                            <span>${costs.principal}</span>
                        </div>
                        <div className="flex justify-between items-center text-stone-400 font-mono text-sm">
                            <span>计息天数 (Days)</span>
                            <span>{costs.daysPassed} 天</span>
                        </div>
                        <div className="flex justify-between items-center text-pawn-accent font-mono text-sm border-b border-[#44403c] pb-2">
                            <span>利息 (Interest)</span>
                            <span>+${costs.interest}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-stone-200 font-bold uppercase tracking-widest">总计应收</span>
                            <span className="text-2xl font-mono font-bold text-green-500">${costs.total}</span>
                        </div>
                    </div>

                    {/* Actions Tabs */}
                    <div className="mt-auto grid grid-cols-1 gap-4">
                        
                        {/* Option 1: Redeem */}
                        <div className="group relative">
                            <Button 
                                variant="primary" 
                                onClick={handleRedeem}
                                className="w-full h-16 flex justify-between items-center px-6 text-lg tracking-widest border border-green-500/50 hover:bg-green-900/20"
                            >
                                <span className="flex items-center gap-2"><Banknote className="w-5 h-5"/> 赎回物品</span>
                                <span className="font-mono text-green-400">+${costs.total}</span>
                            </Button>
                        </div>

                        {/* Option 2: Extend */}
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="secondary" 
                                onClick={handleExtend}
                                className="flex-1 h-12 flex justify-between items-center px-4 text-sm border-stone-600 hover:border-pawn-accent"
                            >
                                <span className="flex items-center gap-2"><CalendarClock className="w-4 h-4"/> 仅付利息续期</span>
                                <span className="font-mono text-pawn-accent">+${costs.interest}</span>
                            </Button>
                        </div>
                        
                        <p className="text-[10px] text-center text-stone-600 font-mono mt-2">
                            续期将收取利息，并将到期日延长 {extendDays} 天。
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};
