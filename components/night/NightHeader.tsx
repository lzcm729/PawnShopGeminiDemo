
import React from 'react';
import { cn } from '../../lib/utils';
import { Heart, Activity, AlertCircle, AlertTriangle } from 'lucide-react';
import { GameState } from '../../systems/game/types';

interface NightHeaderProps {
    stats: GameState['stats'];
    isOverdue: boolean;
    daysUntilBill: number;
    dispatch: React.Dispatch<any>;
    ceremony: {
        isSettlementEve: boolean;
        isSettlementDay: boolean;
        canAfford: boolean;
        billAmount: number;
        shortfall: number;
        balanceAfterPayment: number;
        severityTier: string;
        narrativeLine: string;
    };
}

export const NightHeader: React.FC<NightHeaderProps> = ({
    stats,
    isOverdue,
    daysUntilBill,
    dispatch,
    ceremony,
}) => {
    return (
        <div className="mb-auto">
            <h1 className="text-4xl font-serif text-stone-300 mb-2">Night Cycle</h1>
            <p className="text-xs uppercase tracking-widest text-stone-600">
                Day {stats.day} Complete. <br/>
                Store Status: LOCKED.
            </p>

            {/* Mother's Care - Emotional Banner */}
            <div className={cn(
                "mt-8 border rounded-lg overflow-hidden flex items-stretch",
                isOverdue ? "border-red-500/60 bg-red-950/20" : "border-rose-900/40 bg-stone-900/30"
            )}>
                {/* Left: Icon & Title */}
                <div className={cn(
                    "px-6 py-5 flex items-center gap-4 border-r",
                    isOverdue ? "border-red-900/50" : "border-stone-800/50"
                )}>
                    <Heart className={cn(
                        "w-10 h-10 shrink-0",
                        isOverdue ? "text-red-400 animate-pulse" : "text-rose-400"
                    )} />
                    <div>
                        <span className="text-lg uppercase tracking-[0.15em] text-stone-200 font-medium">
                            母亲
                        </span>
                        {isOverdue && (
                            <div className="mt-1 text-[10px] text-red-400 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                医疗账单逾期!
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex-1 flex divide-x divide-stone-800/50">
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_MEDICAL' })}
                        className="flex-1 py-4 px-4 flex items-center justify-center gap-3 hover:bg-stone-800/50 transition-colors group"
                    >
                        <Activity className={cn(
                            "w-6 h-6 group-hover:scale-110 transition-transform shrink-0",
                            isOverdue ? "text-red-400" : "text-teal-400"
                        )} />
                        <div className="text-left">
                            <div className={cn(
                                "text-xs uppercase tracking-wider group-hover:text-white",
                                isOverdue ? "text-red-400" : "text-stone-300"
                            )}>
                                医疗账单
                            </div>
                            <div className={cn(
                                "text-[10px] mt-0.5",
                                isOverdue ? "text-red-500" : "text-stone-500"
                            )}>
                                {isOverdue ? '立即处理' : daysUntilBill > 0 ? `${daysUntilBill} 天后到期` : '查看详情'}
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_VISIT' })}
                        disabled={stats.visitedToday}
                        className={cn(
                            "flex-1 py-4 px-4 flex items-center justify-center gap-3 transition-colors group",
                            stats.visitedToday ? "opacity-40 cursor-not-allowed" : "hover:bg-rose-950/30"
                        )}
                    >
                        <Heart className={cn(
                            "w-6 h-6 transition-transform shrink-0",
                            stats.visitedToday ? "text-stone-600" : "text-rose-400 group-hover:scale-110"
                        )} />
                        <div className="text-left">
                            <div className={cn(
                                "text-xs uppercase tracking-wider",
                                stats.visitedToday ? "text-stone-600" : "text-stone-300 group-hover:text-rose-300"
                            )}>
                                {stats.visitedToday ? '已探望' : '探望母亲'}
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                                {stats.visitedToday ? '明天再来' : '去看看她'}
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* S2-I4: Settlement Eve Banner (Day before medical bill) */}
            {ceremony.isSettlementEve && (
                <div className="mt-4 border border-amber-700/60 bg-amber-950/20 rounded-lg p-4 flex items-start gap-3 animate-in fade-in duration-500">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                            明日账单提醒
                        </div>
                        <div className="text-sm text-stone-300 mt-1">
                            明天需要支付 <span className="text-amber-400 font-mono font-bold">${ceremony.billAmount}</span> 的医疗费用。
                        </div>
                        {ceremony.canAfford ? (
                            <div className="text-[10px] text-stone-500 mt-1">
                                当前余额 ${stats.cash}，{stats.cash >= ceremony.billAmount * 1.5 ? '资金充裕' : '刚好够付'}。
                            </div>
                        ) : (
                            <div className="text-[10px] text-red-400 mt-1 font-bold">
                                当前余额 ${stats.cash}，缺口 ${ceremony.shortfall}！
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* S2-I4: Settlement Day Ceremony (Medical bill due day) */}
            {ceremony.isSettlementDay && ceremony.canAfford && (
                <div className={cn(
                    "mt-4 border rounded-lg p-4 animate-in fade-in duration-700",
                    ceremony.severityTier === 'COMFORTABLE'
                        ? 'border-emerald-800/60 bg-emerald-950/20'
                        : ceremony.severityTier === 'TIGHT'
                        ? 'border-amber-800/60 bg-amber-950/20'
                        : 'border-red-800/60 bg-red-950/20'
                )}>
                    <div className="text-[10px] uppercase tracking-widest text-stone-600 mb-2 font-bold">
                        Settlement // Day {stats.day}
                    </div>
                    <div className={cn(
                        "text-sm italic leading-relaxed",
                        ceremony.severityTier === 'COMFORTABLE'
                            ? 'text-emerald-300/90'
                            : ceremony.severityTier === 'TIGHT'
                            ? 'text-amber-300/90'
                            : 'text-red-300/90'
                    )}>
                        "{ceremony.narrativeLine}"
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] font-mono text-stone-500">
                        <span>已付: -${ceremony.billAmount}</span>
                        <span>余额: ${ceremony.balanceAfterPayment}</span>
                    </div>
                </div>
            )}

            {ceremony.isSettlementDay && !ceremony.canAfford && (
                <div className="mt-4 border border-red-600/80 bg-red-950/30 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="text-xs uppercase tracking-wider text-red-400 font-bold">
                            无法支付医疗账单
                        </span>
                    </div>
                    <div className="text-sm text-red-300">
                        需要 <span className="font-mono font-bold">${ceremony.billAmount}</span>，缺口 <span className="font-mono font-bold">${ceremony.shortfall}</span>。
                    </div>
                </div>
            )}
        </div>
    );
};
