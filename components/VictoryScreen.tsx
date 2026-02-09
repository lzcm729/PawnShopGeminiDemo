
import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { Heart, Shield, Calendar, DollarSign, RotateCcw, Sun, Users, CheckCircle, XCircle, Hammer, Skull, ChevronDown, ChevronUp } from 'lucide-react';
import { ReputationType, NpcFateEntry } from '../types';
import { playSfx } from '../systems/game/audio';
import { summarizeFates, evaluateVerdict, type FateVerdict } from '../systems/narrative/fateEvaluator';

interface VictoryScreenProps {
    onRestart: () => void;
}

// --- Verdict Display Helpers ---

const VERDICT_CONFIG: Record<FateVerdict, { label: string; subtitle: string; color: string; borderColor: string; bgColor: string }> = {
    SAINT: { label: '圣人之路', subtitle: 'Path of the Saint', color: 'text-amber-600', borderColor: 'border-amber-300', bgColor: 'bg-amber-50' },
    FAIR: { label: '公正经营', subtitle: 'Fair Dealing', color: 'text-stone-500', borderColor: 'border-stone-300', bgColor: 'bg-stone-50' },
    RUTHLESS: { label: '冷酷无情', subtitle: 'Ruthless Efficiency', color: 'text-red-600', borderColor: 'border-red-300', bgColor: 'bg-red-50' },
    BETRAYER: { label: '背信弃义', subtitle: 'Betrayer of Trust', color: 'text-purple-700', borderColor: 'border-purple-300', bgColor: 'bg-purple-50' },
};

function getInterestTierLabel(rate: number): { label: string; color: string } {
    if (rate <= 0) return { label: '慈善', color: 'text-rose-500' };
    if (rate <= 0.05) return { label: '援助', color: 'text-sky-500' };
    if (rate <= 0.10) return { label: '标准', color: 'text-stone-500' };
    return { label: '高利贷', color: 'text-red-600' };
}

const NpcFateCard: React.FC<{ entry: NpcFateEntry }> = ({ entry }) => {
    const tier = getInterestTierLabel(entry.interestRate);

    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-white/80 border border-stone-200 rounded-md hover:border-stone-300 transition-colors">
            {/* NPC Name */}
            <div className="flex-1 min-w-0">
                <span className="font-bold text-stone-700 text-sm truncate block">{entry.npcName}</span>
                <span className="text-xs text-stone-400">${entry.principalGiven.toLocaleString()}</span>
            </div>

            {/* Interest Tier */}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tier.color} border-current/20 bg-current/5 shrink-0`}>
                {tier.label}
            </span>

            {/* Fate Icons */}
            <div className="flex items-center gap-1.5 shrink-0">
                {entry.wasRedeemed && (
                    <span title="已赎回" className="text-emerald-500">
                        <CheckCircle className="w-4 h-4" />
                    </span>
                )}
                {entry.wasForfeited && (
                    <span title="已绝当" className="text-stone-400">
                        <XCircle className="w-4 h-4" />
                    </span>
                )}
                {entry.wasReforged && (
                    <span title="已改造" className="text-amber-500">
                        <Hammer className="w-4 h-4" />
                    </span>
                )}
                {entry.wasSoldBlackmarket && (
                    <span title="黑市出售" className="text-red-600">
                        <Skull className="w-4 h-4" />
                    </span>
                )}
            </div>
        </div>
    );
}

// --- Main Component ---

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ onRestart }) => {
    const { state } = useGame();
    const { stats, reputation } = state;
    const [reveal, setReveal] = useState(false);
    const [showFates, setShowFates] = useState(false);

    const fateSummary = useMemo(() => summarizeFates(state.npcFateLog ?? []), [state.npcFateLog]);
    const verdict = useMemo(() => evaluateVerdict(fateSummary), [fateSummary]);
    const verdictConfig = VERDICT_CONFIG[verdict];
    const hasFateData = fateSummary.totalNpcs > 0;

    useEffect(() => {
        const timer = setTimeout(() => setReveal(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-reveal fate section after main reveal animation
    useEffect(() => {
        if (reveal && hasFateData) {
            const timer = setTimeout(() => setShowFates(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [reveal, hasFateData]);

    // Determine Ending Flavor
    let endingTitle = "Surviving the Night";
    let endingDesc = "手术成功了。在这个残酷的城市里，你不仅救回了母亲，也活了下来。";
    let colorTheme = "text-stone-600";

    const humanity = reputation[ReputationType.HUMANITY];
    const innocence = reputation[ReputationType.INNOCENCE];

    if (humanity > 60) {
        endingTitle = "The Saint of Sector 12";
        endingDesc = "手术非常成功。你证明了即使在最黑暗的角落，良心依然是有价值的。街坊邻里会永远记住你的善意。";
        colorTheme = "text-rose-600";
    } else if (innocence < 30) {
        endingTitle = "A Deal with the Devil";
        endingDesc = "手术成功了，母亲活了下来。但你看着镜子里的自己，眼神已经变得陌生。为了这笔钱，你弄脏了手，也失去了回头的路。";
        colorTheme = "text-purple-600";
    } else {
        endingTitle = "A Hard-Fought Dawn";
        endingDesc = "手术室的灯灭了，医生带来了好消息。你长舒一口气，看着窗外的日出。这是一场艰难的战役，但你赢了。";
        colorTheme = "text-amber-600";
    }

    const [fateExpanded, setFateExpanded] = useState(true);

    return (
        <div className="h-screen w-full flex flex-col items-center bg-[#f5f5f4] text-stone-800 relative overflow-y-auto font-mono transition-colors duration-1000">
            {/* Light Ambience (Contrast to the dark game) */}
            <div className="fixed inset-0 bg-gradient-to-b from-white via-[#f5f5f4] to-[#e7e5e4] pointer-events-none"></div>

            {/* Particle Dust / Sunbeams */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-20 pointer-events-none"></div>

            <div className={`relative z-10 max-w-3xl w-full text-center p-8 py-16 transition-all duration-1000 transform ${reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                <div className="mb-8 flex justify-center">
                    <div className="p-6 bg-white rounded-full shadow-xl border border-stone-200 animate-in zoom-in duration-700 delay-300">
                        <Sun className="w-16 h-16 text-amber-500 animate-pulse-slow" />
                    </div>
                </div>

                <h2 className="text-xs font-bold tracking-[0.5em] text-stone-400 uppercase mb-4">Operation Status: Successful</h2>

                <h1 className={`text-5xl md:text-7xl font-serif font-black mb-6 ${colorTheme}`}>
                    {endingTitle}
                </h1>

                <p className="text-lg md:text-xl text-stone-600 font-serif italic leading-relaxed max-w-2xl mx-auto mb-12">
                    "{endingDesc}"
                </p>

                {/* Stats Card */}
                <div className="bg-white p-8 rounded-lg shadow-lg border border-stone-200 mb-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="flex flex-col items-center">
                        <Calendar className="w-5 h-5 text-stone-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">{stats.day}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Days Taken</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <DollarSign className="w-5 h-5 text-stone-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">${stats.cash}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Remaining Funds</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Heart className="w-5 h-5 text-rose-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">{humanity}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Humanity Score</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Shield className="w-5 h-5 text-blue-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">{reputation[ReputationType.CREDIBILITY]}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Credibility</span>
                    </div>
                </div>

                {/* NPC Fate Section — "Bitter Victory" */}
                {hasFateData && (
                    <div className={`mb-12 transition-all duration-1000 transform ${showFates ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-stone-300"></div>
                            <span className="text-[10px] uppercase tracking-[0.4em] text-stone-400">The Ledger of Souls</span>
                            <div className="flex-1 h-px bg-stone-300"></div>
                        </div>

                        {/* Verdict Headline */}
                        <div className={`${verdictConfig.bgColor} border ${verdictConfig.borderColor} rounded-lg p-6 mb-6`}>
                            <h3 className={`text-3xl font-serif font-black ${verdictConfig.color} mb-1`}>
                                {verdictConfig.label}
                            </h3>
                            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">{verdictConfig.subtitle}</p>
                        </div>

                        {/* Aggregate Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="bg-white border border-stone-200 rounded p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Users className="w-3.5 h-3.5 text-stone-400" />
                                    <span className="text-lg font-bold">{fateSummary.totalNpcs}</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider text-stone-400">Clients Served</span>
                            </div>
                            <div className="bg-white border border-stone-200 rounded p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-lg font-bold">{Math.round(fateSummary.redemptionRate * 100)}%</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider text-stone-400">Redemption Rate</span>
                            </div>
                            <div className="bg-white border border-stone-200 rounded p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                                    <span className="text-lg font-bold">${fateSummary.totalPrincipal.toLocaleString()}</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider text-stone-400">Total Lent</span>
                            </div>
                            <div className="bg-white border border-stone-200 rounded p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <XCircle className="w-3.5 h-3.5 text-stone-400" />
                                    <span className="text-lg font-bold">{fateSummary.lostItems}</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider text-stone-400">Items Lost</span>
                            </div>
                        </div>

                        {/* NPC Fate List */}
                        <div className="text-left">
                            <button
                                onClick={() => setFateExpanded(!fateExpanded)}
                                className="flex items-center gap-2 w-full text-left mb-3 text-stone-500 hover:text-stone-700 transition-colors"
                            >
                                {fateExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                <span className="text-xs uppercase tracking-wider font-bold">
                                    Individual Fates ({fateSummary.totalNpcs})
                                </span>
                            </button>
                            {fateExpanded && (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {(state.npcFateLog ?? []).map((entry) => (
                                        <NpcFateCard key={entry.npcId} entry={entry} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-center pb-8">
                    <Button
                        onClick={() => { playSfx('CLICK'); onRestart(); }}
                        className="h-16 px-12 text-lg tracking-[0.2em] bg-stone-900 text-white hover:bg-stone-800 shadow-2xl"
                    >
                        <RotateCcw className="w-5 h-5 mr-3" /> RETURN TO TITLE
                    </Button>
                </div>
            </div>
        </div>
    );
};
