/**
 * HoldingPeriodEventModal
 *
 * Full-screen immersive event node that appears when someone claims ownership
 * of a pawned item during the holding period. Redesigned as an item-derived
 * event node with narrative focus, typewriter text, and vertical choice cards.
 *
 * Two event types:
 * - THIEF_REGRET: Someone claims they stole the item and wants to return it
 * - ORIGINAL_OWNER: Someone claims to be the original owner
 */

import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { TypewriterText } from './ui/TextEffects';
import { cn } from '../lib/utils';
import {
    AlertTriangle,
    HandHeart,
    ShieldX,
    Heart,
    Handshake,
    UserX,
    Scale,
} from 'lucide-react';

const EVENT_CONFIG = {
    THIEF_REGRET: {
        title: 'THIEF CONFESSION',
        headerLabel: '窃贼忏悔',
        headerSub: 'STOLEN ITEM CLAIM',
        icon: UserX,
        accentColor: 'purple' as const,
        sceneNarrative: (itemName: string) =>
            `门铃响了。一个低着头的年轻人走进店里，目光躲闪，双手紧攥着衣角。他的声音很轻，像是怕被什么人听见——`,
        description: (itemName: string) =>
            `他声称自己曾偷窃了「${itemName}」，现在良心不安，请求你归还原物。`,
        quote: '"我做了错事... 这东西不该出现在这里。能还给我吗？我想把它物归原主。"',
        surrenderLabel: '归还物品',
        surrenderSub: 'COOPERATE',
        surrenderDesc: '配合声称者，将物品归还。你会损失这件库存，但做了正确的事。',
        surrenderEffects: ['归还物品给声称者', 'Humanity +2'],
        surrenderEffectIcons: ['item', 'humanity'] as const,
        refuseLabel: '拒绝归还',
        refuseSub: 'DENY CLAIM',
        refuseDesc: '你没有义务配合一个自称小偷的人。物品是合法收当的。',
        refuseEffects: ['保留物品', 'Innocence -1'],
        refuseEffectIcons: ['item', 'innocence'] as const,
    },
    ORIGINAL_OWNER: {
        title: 'OWNERSHIP CLAIM',
        headerLabel: '原主声索',
        headerSub: 'ORIGINAL OWNER CLAIM',
        icon: Scale,
        accentColor: 'amber' as const,
        sceneNarrative: (itemName: string) =>
            `一位衣着得体的来访者推开了店门，手里攥着几份文件。他的目光锁定在柜台后方的某件物品上，随即大步走向你——`,
        description: (itemName: string) =>
            `他声称自己是「${itemName}」的原主人，拿出了一些证明文件，要求你归还物品。`,
        quote: '"这是我的东西！我有证据。它是被人偷走后典当到你这里的。请你做个好人，还给我吧。"',
        surrenderLabel: '归还原主',
        surrenderSub: 'RETURN TO OWNER',
        surrenderDesc: '对方持有证据。归还物品意味着经济损失，但能赢得尊重和信誉。',
        surrenderEffects: ['归还物品给原主人', 'Humanity +5', 'Credibility +2'],
        surrenderEffectIcons: ['item', 'humanity', 'credibility'] as const,
        refuseLabel: '拒绝归还',
        refuseSub: 'DENY CLAIM',
        refuseDesc: '物品是通过正规渠道收当的，你没有法律义务归还。但这会损害你的名声。',
        refuseEffects: ['保留物品但损害声誉', 'Humanity -3', 'Credibility -2'],
        refuseEffectIcons: ['item', 'humanity', 'credibility'] as const,
    },
} as const;

/** Color schemes keyed by accent */
const ACCENT_STYLES = {
    purple: {
        spotlight: 'from-purple-500/8 to-transparent',
        labelColor: 'text-purple-400',
        tagBg: 'bg-purple-900/40 border-purple-700/50 text-purple-300',
        itemBorder: 'border-purple-800/60',
        itemBg: 'bg-purple-950/20',
        itemIconBg: 'bg-purple-900/30',
        itemIconBorder: 'border-purple-700/60',
        itemIconColor: 'text-purple-400',
        surrenderBorder: 'border-purple-800/50 hover:border-purple-500',
        surrenderBg: 'bg-purple-950/20 hover:bg-purple-900/30',
        surrenderGlow: 'hover:shadow-[0_0_30px_rgba(147,51,234,0.2)]',
        surrenderBtnBg: 'bg-purple-700 hover:bg-purple-600 border-purple-600',
        surrenderBtnText: 'text-white',
    },
    amber: {
        spotlight: 'from-amber-500/8 to-transparent',
        labelColor: 'text-amber-400',
        tagBg: 'bg-amber-900/40 border-amber-700/50 text-amber-300',
        itemBorder: 'border-amber-800/60',
        itemBg: 'bg-amber-950/20',
        itemIconBg: 'bg-amber-900/30',
        itemIconBorder: 'border-amber-700/60',
        itemIconColor: 'text-amber-400',
        surrenderBorder: 'border-amber-800/50 hover:border-amber-500',
        surrenderBg: 'bg-amber-950/20 hover:bg-amber-900/30',
        surrenderGlow: 'hover:shadow-[0_0_30px_rgba(217,119,6,0.2)]',
        surrenderBtnBg: 'bg-amber-700 hover:bg-amber-600 border-amber-600',
        surrenderBtnText: 'text-white',
    },
};

/** Map effect icon type to rendered icon */
const EffectIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
    switch (type) {
        case 'humanity':
            return <Heart className={cn("w-3 h-3", className)} />;
        case 'credibility':
            return <Handshake className={cn("w-3 h-3", className)} />;
        case 'innocence':
            return <Scale className={cn("w-3 h-3", className)} />;
        default:
            return <span className={cn("w-1.5 h-1.5 rounded-full bg-current inline-block", className)} />;
    }
};

/** Color for each effect based on content */
const getEffectColor = (effect: string): string => {
    if (effect.includes('+')) {
        if (effect.includes('Humanity')) return 'text-rose-400';
        if (effect.includes('Credibility')) return 'text-teal-400';
        if (effect.includes('Innocence')) return 'text-blue-400';
    }
    if (effect.includes('-')) {
        if (effect.includes('Humanity')) return 'text-rose-600';
        if (effect.includes('Credibility')) return 'text-teal-600';
        if (effect.includes('Innocence')) return 'text-red-400';
    }
    return 'text-stone-400';
};

export const HoldingPeriodEventModal: React.FC = () => {
    const { state, dispatch } = useGame();
    const [narrativeComplete, setNarrativeComplete] = useState(false);

    const event = state.currentHoldingPeriodEvent;
    if (!event) return null;

    const config = EVENT_CONFIG[event.type];
    const IconComponent = config.icon;
    const accent = ACCENT_STYLES[config.accentColor];

    const handleSurrender = () => {
        dispatch({
            type: 'RESOLVE_HOLDING_PERIOD_EVENT',
            payload: {
                eventType: event.type,
                itemId: event.itemId,
                decision: 'SURRENDER',
            },
        });
    };

    const handleRefuse = () => {
        dispatch({
            type: 'RESOLVE_HOLDING_PERIOD_EVENT',
            payload: {
                eventType: event.type,
                itemId: event.itemId,
                decision: 'REFUSE',
            },
        });
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-700">

            {/* Background Spotlight */}
            <div className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b rounded-full blur-3xl pointer-events-none",
                accent.spotlight,
            )} />

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 w-full max-w-xl flex flex-col items-center px-6 overflow-y-auto max-h-[90vh] scrollbar-thin">

                {/* Event Type Tag */}
                <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-[0.2em] font-bold mb-6",
                    accent.tagBg,
                )}>
                    <AlertTriangle className="w-3 h-3" />
                    {config.headerSub}
                </div>

                {/* Scene Narrative -- typewriter for immersion */}
                <div className="w-full mb-6 text-center">
                    <p className="font-serif italic text-stone-400 text-sm leading-relaxed">
                        <TypewriterText
                            text={config.sceneNarrative(event.itemName)}
                            speed={25}
                            onComplete={() => setNarrativeComplete(true)}
                        />
                    </p>
                </div>

                {/* The rest fades in after narrative completes */}
                <div className={cn(
                    "w-full flex flex-col items-center transition-all duration-700",
                    narrativeComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
                )}>

                    {/* Claimed Item Card */}
                    <div className={cn(
                        "w-full border rounded-lg p-4 flex items-center gap-4 mb-5",
                        accent.itemBorder, accent.itemBg,
                    )}>
                        <div className={cn(
                            "w-14 h-14 rounded-lg border flex items-center justify-center shrink-0",
                            accent.itemIconBg, accent.itemIconBorder,
                        )}>
                            <IconComponent className={cn("w-7 h-7", accent.itemIconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={cn(
                                "text-[10px] font-mono uppercase tracking-[0.15em] mb-0.5",
                                accent.labelColor,
                            )}>
                                CLAIMED ITEM
                            </div>
                            <div className="text-lg text-white font-bold truncate">
                                {event.itemName}
                            </div>
                        </div>
                    </div>

                    {/* Situation Description */}
                    <p className="text-sm text-stone-300 leading-relaxed text-center mb-4">
                        {config.description(event.itemName)}
                    </p>

                    {/* Quote */}
                    <blockquote className="w-full text-center font-serif italic text-stone-400/90 text-base leading-relaxed mb-8 px-4">
                        {config.quote}
                    </blockquote>

                    {/* Choices -- vertical stacked narrative cards */}
                    <div className="w-full space-y-4 mb-6">

                        {/* Choice A: Surrender */}
                        <button
                            onClick={handleSurrender}
                            className={cn(
                                "w-full text-left rounded-lg border p-5 transition-all duration-300 group cursor-pointer",
                                accent.surrenderBorder, accent.surrenderBg, accent.surrenderGlow,
                            )}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border shrink-0 transition-colors",
                                    accent.itemIconBg, accent.itemIconBorder,
                                    "group-hover:border-opacity-100",
                                )}>
                                    <HandHeart className={cn("w-5 h-5", accent.labelColor)} />
                                </div>
                                <div>
                                    <div className="text-base font-bold text-stone-200 group-hover:text-white transition-colors">
                                        {config.surrenderLabel}
                                    </div>
                                    <div className={cn("text-[10px] font-mono uppercase tracking-[0.15em]", accent.labelColor)}>
                                        {config.surrenderSub}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-stone-400 leading-relaxed mb-3 pl-[52px]">
                                {config.surrenderDesc}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                                {config.surrenderEffects.map((effect, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/30 border border-stone-800/50",
                                            getEffectColor(effect),
                                        )}
                                    >
                                        <EffectIcon type={config.surrenderEffectIcons[i]} />
                                        {effect}
                                    </span>
                                ))}
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/30 border border-stone-800/50 text-red-400">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    物品被归还
                                </span>
                            </div>
                        </button>

                        {/* Choice B: Refuse */}
                        <button
                            onClick={handleRefuse}
                            className="w-full text-left rounded-lg border p-5 transition-all duration-300 group cursor-pointer border-stone-700/50 bg-stone-950/30 hover:bg-stone-900/30 hover:border-stone-500 hover:shadow-[0_0_20px_rgba(120,113,108,0.1)]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 transition-colors bg-stone-800/50 border-stone-600 group-hover:border-stone-500">
                                    <ShieldX className="w-5 h-5 text-stone-400 group-hover:text-stone-300 transition-colors" />
                                </div>
                                <div>
                                    <div className="text-base font-bold text-stone-300 group-hover:text-stone-100 transition-colors">
                                        {config.refuseLabel}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-stone-500">
                                        {config.refuseSub}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-stone-500 leading-relaxed mb-3 pl-[52px]">
                                {config.refuseDesc}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                                {config.refuseEffects.map((effect, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/30 border border-stone-800/50",
                                            getEffectColor(effect),
                                        )}
                                    >
                                        <EffectIcon type={config.refuseEffectIcons[i]} />
                                        {effect}
                                    </span>
                                ))}
                            </div>
                        </button>
                    </div>

                    {/* Footer Warning */}
                    <div className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-stone-600 pb-4">
                        THIS DECISION CANNOT BE UNDONE
                    </div>
                </div>
            </div>
        </div>
    );
};
