
import React from 'react';
import { useGame } from '../store/GameContext';
import { useFinancialProjection } from '../hooks/useFinancialProjection';
import { X, AlertTriangle, TrendingDown, DollarSign, Calendar, History, Mail, Star } from 'lucide-react';
import { CalendarDayData } from '../systems/economy/types';

export const FinancialCalendar: React.FC = () => {
    const { state, dispatch } = useGame();
    const projection = useFinancialProjection();

    if (!state.showFinancials) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-[#141211] border-2 border-stone-700 shadow-2xl flex flex-col relative overflow-hidden rounded-lg">
                
                {/* Header */}
                <div className="bg-[#1c1917] p-6 border-b border-stone-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-mono font-bold text-stone-200 flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-pawn-accent" />
                            综合日程预测 (SCHEDULE_OS)
                        </h2>
                        <p className="text-stone-500 text-xs font-mono mt-1 uppercase tracking-widest">
                            Rolling Horizon: 28 Days // T-2 to T+25
                        </p>
                    </div>
                    
                    <div className="flex gap-6 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-stone-500 uppercase font-bold">Current Cash</span>
                            <span className="text-2xl font-mono text-pawn-green">${state.stats.cash}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-stone-500 uppercase font-bold">Daily Burn</span>
                            <span className="text-xl font-mono text-red-500">-${state.stats.dailyExpenses}</span>
                        </div>
                        <button 
                            onClick={() => dispatch({ type: 'TOGGLE_FINANCIALS' })}
                            className="ml-4 text-stone-500 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-[#0c0a09] px-6 py-2 border-b border-stone-800 flex flex-wrap gap-4 md:gap-6 text-[10px] font-mono uppercase text-stone-500">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> 硬性支出 (Bill)
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-pawn-green"></div> 潜在回款 (Income)
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> 剧情节点 (Story)
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> 信件 (Mail)
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> 破产风险
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6 bg-[#0c0a09] grid grid-cols-7 gap-3 auto-rows-fr">
                    {projection.map((day) => (
                        <CalendarCell key={day.dayId} data={day} />
                    ))}
                </div>

                <div className="bg-[#1c1917] p-3 text-center text-[10px] text-stone-600 font-mono">
                    * Projection assumes 100% redemption rate. Narrative events subject to player choice.
                </div>
            </div>
        </div>
    );
};

const CalendarCell: React.FC<{ data: CalendarDayData }> = ({ data }) => {
    const isCritical = data.riskLevel === 'CRITICAL';
    const hasBill = data.events.some(e => e.type === 'BILL');
    const hasIncome = data.events.some(e => e.type === 'INCOME_POTENTIAL');
    const hasStory = data.events.some(e => e.type === 'STORY_MOMENT');
    const hasMail = data.events.some(e => e.type === 'MAIL');
    
    // Style adjustments for past days
    const isPast = data.isPast;
    const baseBg = isPast ? 'bg-[#0a0a0a]' : (isCritical ? 'bg-red-950/20' : 'bg-stone-900/40');
    const borderStyle = isPast ? 'border-stone-800/50' : (isCritical ? 'border-red-900/60' : 'border-stone-800');
    const hoverStyle = isPast ? '' : (isCritical ? 'hover:bg-red-900/30' : 'hover:bg-stone-800/60');
    const textStyle = isPast ? 'text-stone-700' : (data.isToday ? 'text-pawn-accent' : 'text-stone-500');

    return (
        <div className={`
            relative aspect-square border rounded p-2 flex flex-col justify-between group transition-all duration-300 min-h-[80px]
            ${data.isToday ? 'ring-2 ring-pawn-accent ring-offset-2 ring-offset-black z-10' : ''}
            ${baseBg} ${borderStyle} ${hoverStyle}
        `}>
            {/* Header: Day Number */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className={`text-xs font-mono font-bold ${textStyle}`}>
                        {data.dayId <= 0 ? '-' : data.dayId}
                    </span>
                    {data.isToday && <span className="text-[8px] uppercase font-bold text-pawn-accent/70 tracking-wider">Today</span>}
                    {isPast && data.dayId > 0 && <span className="text-[8px] uppercase font-bold text-stone-700 tracking-wider">Closed</span>}
                </div>
                {isCritical && !isPast && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
            </div>

            {/* Content Dots */}
            <div className="flex gap-1.5 flex-wrap content-end">
                {hasBill && <div className={`w-2.5 h-2.5 rounded-full ${isPast ? 'bg-red-900/50' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`} title="Bill"></div>}
                
                {hasStory && (
                    <div className="w-3 h-3 flex items-center justify-center animate-pulse" title="Story Event">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </div>
                )}
                
                {hasMail && (
                    <div className="w-3 h-3 flex items-center justify-center" title="Mail">
                        <Mail className="w-3 h-3 text-blue-500" />
                    </div>
                )}

                {hasIncome && !hasStory && <div className={`w-2.5 h-2.5 rounded-full ${isPast ? 'bg-green-900/50' : 'bg-pawn-green shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`} title="Income"></div>}
            </div>

            {/* Tooltip (Custom Hover) */}
            <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-black border border-stone-600 p-3 rounded shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex flex-col gap-2 scale-95 group-hover:scale-100 origin-bottom">
                <div className="border-b border-stone-800 pb-1 mb-1 text-[10px] uppercase font-bold text-stone-500 flex justify-between">
                    <span>Day {data.dayId} {isPast ? 'Log' : 'Forecast'}</span>
                    {isCritical && !isPast && <span className="text-red-500">CRITICAL</span>}
                </div>

                {/* Event List */}
                {data.events.length > 0 ? (
                    <div className="space-y-1.5">
                        {data.events.map((e, idx) => {
                            let color = "text-stone-300";
                            let icon = null;
                            if (e.type === 'BILL') color = "text-red-400";
                            if (e.type === 'INCOME_POTENTIAL') color = "text-green-400";
                            if (e.type === 'STORY_MOMENT') { color = "text-amber-400 font-bold"; icon = "★ "; }
                            if (e.type === 'MAIL') { color = "text-blue-400"; icon = "✉ "; }

                            return (
                                <div key={idx} className="flex justify-between text-[10px] font-mono leading-tight">
                                    <span className={`${color} truncate max-w-[140px]`} title={e.label}>
                                        {icon}{e.label}
                                    </span>
                                    {e.amount !== 0 && (
                                        <span className={e.amount > 0 ? 'text-green-500' : 'text-red-500'}>
                                            {e.amount > 0 ? '+' : ''}{e.amount}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-xs text-stone-600 italic text-center py-1">No significant events</div>
                )}

                {/* Footer Balance */}
                <div className="border-t border-stone-800 pt-2 mt-1">
                     <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-stone-400">{isPast ? 'End Bal' : 'Proj. Bal'}</span>
                        <span className={data.projectedBalance < 0 ? "text-red-500" : "text-white"}>
                            ${data.projectedBalance}
                        </span>
                     </div>
                </div>
            </div>
        </div>
    );
};
