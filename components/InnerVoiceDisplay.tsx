
import React, { useState, useEffect } from 'react';
import { TypewriterText } from './ui/TextEffects';
import { ArrowRight, Moon, Users, TrendingUp, TrendingDown, Heart, Shield, Scale } from 'lucide-react';
import { playSfx } from '../systems/game/audio';
import { useGame } from '../store/GameContext';
import { ReputationType } from '../types';
import { cn } from '../lib/utils';

interface InnerVoiceDisplayProps {
    text: string;
    onComplete: () => void;
}

export const InnerVoiceDisplay: React.FC<InnerVoiceDisplayProps> = ({ text, onComplete }) => {
    const { state } = useGame();
    const [canProceed, setCanProceed] = useState(false);

    const { todayTransactions, stats, reputation, customersServedToday } = state;

    // Calculate financial summary
    const income = todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expenses = todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const netChange = income - expenses - stats.dailyExpenses;

    const fmt = (n: number) => Math.abs(n).toLocaleString();

    // Auto-enable proceed after a short delay to prevent accidental double-clicks
    useEffect(() => {
        const timer = setTimeout(() => setCanProceed(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        if (canProceed) {
            playSfx('CLICK');
            onComplete();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 cursor-pointer animate-in fade-in duration-1000"
            onClick={handleClick}
        >
            <div className="max-w-2xl w-full">
                {/* Day Summary - Minimal Style */}
                <div className="mb-12 border border-stone-800 rounded-lg p-6 bg-stone-950/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="text-center mb-4">
                        <span className="text-xs font-mono uppercase tracking-[0.3em] text-stone-600">
                            Day {stats.day} Summary
                        </span>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-8 text-sm">
                        {/* Customers */}
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-stone-600" />
                            <span className="font-mono text-stone-400">{customersServedToday}</span>
                            <span className="text-[10px] text-stone-600 uppercase">served</span>
                        </div>

                        {/* Divider */}
                        <div className="h-6 w-px bg-stone-800"></div>

                        {/* Net Change */}
                        <div className="flex items-center gap-2">
                            {netChange >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={cn(
                                "font-mono",
                                netChange >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                                {netChange >= 0 ? '+' : '-'}${fmt(netChange)}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="h-6 w-px bg-stone-800"></div>

                        {/* Reputation */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1" title="Humanity">
                                <Heart className="w-3 h-3 text-rose-600" />
                                <span className="font-mono text-stone-500 text-xs">{reputation[ReputationType.HUMANITY]}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Credibility">
                                <Shield className="w-3 h-3 text-blue-600" />
                                <span className="font-mono text-stone-500 text-xs">{reputation[ReputationType.CREDIBILITY]}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Innocence">
                                <Scale className="w-3 h-3 text-blue-500" />
                                <span className="font-mono text-stone-500 text-xs">{reputation[ReputationType.INNOCENCE]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Financial Detail (smaller) */}
                    <div className="mt-4 pt-4 border-t border-stone-800 flex justify-center gap-6 text-[10px] text-stone-600 font-mono uppercase">
                        <span>Income: <span className="text-green-600">+${fmt(income)}</span></span>
                        <span>Expenses: <span className="text-red-600">-${fmt(expenses + stats.dailyExpenses)}</span></span>
                        <span>Balance: <span className="text-stone-400">${fmt(stats.cash)}</span></span>
                    </div>
                </div>

                {/* Moon Icon */}
                <div className="mb-8 flex justify-center opacity-50">
                    <Moon className="w-8 h-8 text-stone-600 animate-pulse-slow" />
                </div>

                {/* Inner Monologue */}
                <div className="text-xl md:text-2xl font-serif text-stone-400 italic leading-loose text-center min-h-[120px]">
                    " <TypewriterText text={text} speed={30} onComplete={() => setCanProceed(true)} /> "
                </div>

                {/* Click to Sleep */}
                <div className={`mt-12 flex justify-center transition-opacity duration-1000 ${canProceed ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-stone-600 animate-bounce">
                        Click to Sleep <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </div>
    );
};
