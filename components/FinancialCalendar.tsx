
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { useFinancialProjection } from '../hooks/useFinancialProjection';
import { X, AlertTriangle, Calendar, Mail, Clock, HelpCircle } from 'lucide-react';
import { HelpTooltip } from './ui/Tooltip';
import { CalendarDayData, CalendarEvent, IncomeCertainty } from '../systems/economy/types';

// --- Certainty helpers (S2-I2) ---
const getCertaintyBorderClass = (certainty?: IncomeCertainty): string => {
    switch (certainty) {
        case 'HIGH': return 'border-solid border-cyan-500';
        case 'MEDIUM': return 'border-dashed border-cyan-500/70';
        case 'LOW': return 'border-dotted border-cyan-500/40';
        default: return 'border-solid border-cyan-500';
    }
};

const getCertaintyLabel = (certainty?: IncomeCertainty): string => {
    switch (certainty) {
        case 'HIGH': return '确定';
        case 'MEDIUM': return '可能';
        case 'LOW': return '不确定';
        default: return '';
    }
};

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
                            <HelpTooltip text="查看未来28天的财务预测。红色圆点表示医疗账单到期，时钟表示物品到期。提前规划避免破产。" />
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
                        <div className="w-3 h-3 border border-solid border-cyan-500 rounded-sm"></div> 确定回款
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-dashed border-cyan-500/70 rounded-sm"></div> 可能回款
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-dotted border-cyan-500/40 rounded-sm"></div> 不确定
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> 破产风险
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6 bg-[#0c0a09] grid grid-cols-7 gap-3 auto-rows-fr">
                    {projection.map((day, index) => (
                        <CalendarCell key={day.dayId} data={day} index={index} />
                    ))}
                </div>

                <div className="bg-[#1c1917] p-3 text-center text-[10px] text-stone-600 font-mono">
                    * 回款预测按赎回意愿加权计算。叙事事件取决于玩家选择。
                </div>
            </div>
        </div>
    );
};

const CalendarCell: React.FC<{ data: CalendarDayData; index: number }> = ({ data, index }) => {
    const isCritical = data.riskLevel === 'CRITICAL';
    const isWarning = data.riskLevel === 'WARNING';
    const hasBill = data.events.some(e => e.type === 'BILL');
    const itemDueEvents = data.events.filter(e => e.type === 'ITEM_DUE');
    const hasMail = data.events.some(e => e.type === 'MAIL');
    const narrativeEvents = data.events.filter(e => e.type === 'STORY_MOMENT');

    // Style adjustments for past days
    const isPast = data.isPast;
    const baseBg = isPast
        ? 'bg-[#0a0a0a]'
        : isCritical
            ? 'bg-red-950/20'
            : isWarning
                ? 'bg-yellow-950/20'
                : 'bg-stone-900/40';
    const borderStyle = isPast
        ? 'border-stone-800/50'
        : isCritical
            ? 'border-red-900/60'
            : isWarning
                ? 'border-yellow-800/50'
                : 'border-stone-800';
    const hoverStyle = isPast
        ? ''
        : isCritical
            ? 'hover:bg-red-900/30'
            : isWarning
                ? 'hover:bg-yellow-900/20'
                : 'hover:bg-stone-800/60';
    const textStyle = isPast ? 'text-stone-700' : (data.isToday ? 'text-pawn-accent' : 'text-stone-500');

    // S2-I1: Shortfall amount for CRITICAL cells
    const shortfall = isCritical && !isPast ? Math.abs(data.projectedBalance) : 0;

    // Determine tooltip position based on cell location in grid
    const column = index % 7;
    const row = Math.floor(index / 7);
    const isRightSide = column >= 5;
    const isTopRow = row === 0;

    // Position tooltip to avoid edge cutoff
    const tooltipHorizontal = isRightSide ? 'right-0' : 'left-0';
    const tooltipVertical = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';
    const tooltipOrigin = isTopRow ? 'origin-top' : 'origin-bottom';

    return (
        <div className={`
            relative aspect-square border rounded p-2 flex flex-col justify-between group transition-all duration-300 min-h-[80px]
            ${data.isToday ? 'ring-2 ring-pawn-accent ring-offset-2 ring-offset-black z-10' : ''}
            ${baseBg} ${borderStyle} ${hoverStyle}
        `}>
            {/* Header: Day Number + Risk Icons */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className={`text-xs font-mono font-bold ${textStyle}`}>
                        {data.dayId <= 0 ? '-' : data.dayId}
                    </span>
                    {data.isToday && <span className="text-[8px] uppercase font-bold text-pawn-accent/70 tracking-wider">Today</span>}
                    {isPast && data.dayId > 0 && <span className="text-[8px] uppercase font-bold text-stone-700 tracking-wider">Closed</span>}
                </div>
                <div className="flex items-center gap-1">
                    {isWarning && !isPast && <AlertTriangle className="w-3 h-3 text-yellow-600/70" />}
                    {isCritical && !isPast && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                </div>
            </div>

            {/* S2-I1: Default shortfall display for CRITICAL cells */}
            {shortfall > 0 && (
                <div className="text-center">
                    <span className="text-xs font-mono font-bold text-red-400">-${shortfall}</span>
                </div>
            )}

            {/* Content: Event indicators */}
            <div className="flex gap-1.5 flex-wrap content-end">
                {hasBill && <div className={`w-2.5 h-2.5 rounded-full ${isPast ? 'bg-red-900/50' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`} title="Bill"></div>}

                {/* S2-I2: Item due events with certainty borders */}
                {itemDueEvents.map((evt, i) => (
                    <div
                        key={`due-${i}`}
                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${isPast ? 'border-cyan-900 opacity-50' : getCertaintyBorderClass(evt.certainty)}`}
                        title={`${evt.label} (${getCertaintyLabel(evt.certainty)})`}
                    >
                        <Clock className={`w-2.5 h-2.5 ${isPast ? 'text-cyan-900' : evt.certainty === 'LOW' ? 'text-cyan-500/40' : evt.certainty === 'MEDIUM' ? 'text-cyan-500/70' : 'text-cyan-500'}`} />
                    </div>
                ))}

                {hasMail && (
                    <div className="w-3 h-3 flex items-center justify-center" title="Mail">
                        <Mail className="w-3 h-3 text-blue-500" />
                    </div>
                )}

                {/* S2-I3: Narrative markers */}
                {narrativeEvents.map((evt, i) => (
                    <div
                        key={`story-${i}`}
                        className="w-3 h-3 rounded-sm border border-amber-600/60 bg-amber-950/30 flex items-center justify-center"
                        title={evt.label}
                    >
                        <span className="text-[7px] text-amber-400 font-bold">!</span>
                    </div>
                ))}
            </div>

            {/* Tooltip (Custom Hover) */}
            <div className={`absolute z-50 ${tooltipHorizontal} ${tooltipVertical} w-52 bg-black border border-stone-600 p-3 rounded shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex flex-col gap-2 scale-95 group-hover:scale-100 ${tooltipOrigin}`}>
                <div className="border-b border-stone-800 pb-1 mb-1 text-[10px] uppercase font-bold text-stone-500 flex justify-between">
                    <span>Day {data.dayId} {isPast ? 'Log' : 'Forecast'}</span>
                    {isCritical && !isPast && <span className="text-red-500">CRITICAL</span>}
                    {isWarning && !isPast && <span className="text-yellow-500">WARNING</span>}
                </div>

                {/* Event List */}
                {data.events.length > 0 ? (
                    <div className="space-y-1.5">
                        {data.events.map((e, idx) => {
                            let color = "text-stone-300";
                            let icon = "";
                            let certaintyTag = "";
                            if (e.type === 'BILL') { color = "text-red-400"; icon = ""; }
                            if (e.type === 'ITEM_DUE') {
                                if (e.wasReforged) {
                                    color = "text-purple-400";
                                    icon = "🔮 ";
                                } else {
                                    color = e.certainty === 'LOW' ? 'text-cyan-400/40' : e.certainty === 'MEDIUM' ? 'text-cyan-400/70' : 'text-cyan-400';
                                    icon = "⏰ ";
                                    if (e.certainty) certaintyTag = ` [${getCertaintyLabel(e.certainty)}]`;
                                }
                            }
                            if (e.type === 'MAIL') { color = "text-blue-400"; icon = "✉ "; }
                            if (e.type === 'STORY_MOMENT') { color = "text-amber-400"; icon = "⚡ "; }

                            return (
                                <div key={idx} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between text-[10px] font-mono leading-tight gap-2">
                                        <span className={`${color} truncate flex-1`} title={e.label}>
                                            {icon}{e.label}{certaintyTag}
                                        </span>
                                        {e.amount !== 0 && (
                                            <span className={`shrink-0 ${e.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {e.amount > 0 ? '+' : ''}{e.amount}
                                            </span>
                                        )}
                                    </div>
                                    {e.wasReforged && (
                                        <span className="text-[8px] text-purple-500 italic">
                                            物品已被重铸，客户无法赎回
                                        </span>
                                    )}
                                    {/* S2-I3: Narrative tooltip impact */}
                                    {e.type === 'STORY_MOMENT' && (
                                        <span className="text-[8px] text-amber-500/60 italic">
                                            可能影响客户行为
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-xs text-stone-600 italic text-center py-1">No events</div>
                )}

                {/* Footer Balance */}
                <div className="border-t border-stone-800 pt-2 mt-1">
                     <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-stone-400">{isPast ? 'End Bal' : 'Proj. Bal'}</span>
                        <span className={
                            data.projectedBalance < 0
                                ? "text-red-500"
                                : data.projectedBalance < 500
                                    ? "text-yellow-500"
                                    : "text-white"
                        }>
                            ${data.projectedBalance}
                        </span>
                     </div>
                </div>
            </div>
        </div>
    );
};
