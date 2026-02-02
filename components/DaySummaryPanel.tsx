/**
 * DaySummaryPanel - End of day summary before sleep
 *
 * Displays a summary of the day's activities:
 * - Customers served and transactions
 * - Financial changes (income, expenses, net)
 * - Reputation changes (if available)
 * - Key events
 */

import React from 'react';
import { useGame } from '../store/GameContext';
import { ChevronDown, ChevronUp, Users, DollarSign, TrendingUp, Star, ScrollText, Heart, Shield, Skull } from 'lucide-react';
import { cn } from '../lib/utils';
import { ReputationType } from '../types';

interface DaySummaryPanelProps {
    isExpanded: boolean;
    onToggle: () => void;
}

export const DaySummaryPanel: React.FC<DaySummaryPanelProps> = ({ isExpanded, onToggle }) => {
    const { state } = useGame();
    const { todayTransactions, dayEvents, stats, reputation, customersServedToday } = state;

    // Calculate financial summary
    const income = todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expenses = todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const netChange = income - expenses - stats.dailyExpenses;

    // Filter important events (exclude routine ones)
    const importantEvents = dayEvents.filter(e =>
        !e.includes('店铺运营') &&
        !e.includes('Operating Cost')
    );

    const fmt = (n: number) => Math.abs(n).toLocaleString();

    return (
        <div className="bg-stone-900/80 border border-stone-700 rounded-lg overflow-hidden backdrop-blur-sm">
            {/* Header - Always visible */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
            >
                <div className="flex items-center gap-2 text-stone-300">
                    <ScrollText className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium uppercase tracking-wider">Day {stats.day} Summary</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Quick stats */}
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-stone-400">
                            <Users className="w-3 h-3" />
                            {customersServedToday}
                        </span>
                        <span className={cn(
                            "flex items-center gap-1 font-mono",
                            netChange >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                            {netChange >= 0 ? '+' : '-'}${fmt(netChange)}
                        </span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-stone-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-stone-500" />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="border-t border-stone-700 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Transactions Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Left: Transaction List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                                <DollarSign className="w-3 h-3" /> Transactions
                            </h4>

                            {todayTransactions.length === 0 ? (
                                <p className="text-xs text-stone-600 italic">No transactions today</p>
                            ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                    {todayTransactions.map(t => (
                                        <div
                                            key={t.id}
                                            className="flex justify-between items-center text-xs py-1 border-b border-stone-800 last:border-0"
                                        >
                                            <span className="text-stone-400 truncate mr-2">{t.description}</span>
                                            <span className={cn(
                                                "font-mono shrink-0",
                                                t.amount >= 0 ? "text-green-400" : "text-red-400"
                                            )}>
                                                {t.amount >= 0 ? '+' : '-'}${fmt(t.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Financial Overview */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Financial Overview
                            </h4>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Income</span>
                                    <span className="text-green-400 font-mono">+${fmt(income)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Expenses</span>
                                    <span className="text-red-400 font-mono">-${fmt(expenses)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Operating Costs</span>
                                    <span className="text-red-400 font-mono">-${fmt(stats.dailyExpenses)}</span>
                                </div>
                                <div className="border-t border-stone-700 pt-2 flex justify-between font-medium">
                                    <span className="text-stone-300">Net Change</span>
                                    <span className={cn(
                                        "font-mono",
                                        netChange >= 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                        {netChange >= 0 ? '+' : '-'}${fmt(netChange)}
                                    </span>
                                </div>
                            </div>

                            {/* Reputation Display */}
                            <div className="pt-2 border-t border-stone-800">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-2">
                                    <Star className="w-3 h-3" /> Current Reputation
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="flex items-center gap-1">
                                        <Heart className="w-3 h-3 text-rose-500" />
                                        <span className="text-stone-400">{reputation[ReputationType.HUMANITY]}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Shield className="w-3 h-3 text-blue-500" />
                                        <span className="text-stone-400">{reputation[ReputationType.CREDIBILITY]}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Skull className="w-3 h-3 text-purple-500" />
                                        <span className="text-stone-400">{reputation[ReputationType.UNDERWORLD]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Important Events */}
                    {importantEvents.length > 0 && (
                        <div className="pt-2 border-t border-stone-700">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-2">
                                <ScrollText className="w-3 h-3" /> Key Events
                            </h4>
                            <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-2">
                                {importantEvents.map((event, idx) => (
                                    <div key={idx} className="text-xs text-stone-400 py-0.5 border-l-2 border-amber-600/50 pl-2">
                                        {event}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
