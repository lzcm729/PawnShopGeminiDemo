/**
 * ItemDerivedEventModal
 *
 * Full-screen immersive event node for item-derived events. Data-driven:
 * all text, choices, and theme come from the ItemDerivedEvent object in state.
 *
 * Supported event types:
 * - THIEF_REGRET: Someone claims they stole the item and wants to return it
 * - ORIGINAL_OWNER: Someone claims to be the original owner
 * - PURCHASE_OFFER: A collector wants to buy the item
 */

import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { TypewriterText } from './ui/TextEffects';
import { cn } from '../lib/utils';
import type { ItemDerivedEventType } from '../systems/npc/types';
import {
    AlertTriangle,
    Heart,
    Handshake,
    Scale,
    UserX,
    Banknote,
    HandHeart,
    ShieldX,
} from 'lucide-react';

/** Header metadata per event type */
const EVENT_HEADER: Record<ItemDerivedEventType, { headerLabel: string; headerSub: string; icon: React.FC<{ className?: string }> }> = {
    THIEF_REGRET: {
        headerLabel: '\u7A83\u8D3C\u5FC3\u6094',
        headerSub: 'STOLEN ITEM CLAIM',
        icon: UserX,
    },
    ORIGINAL_OWNER: {
        headerLabel: '\u539F\u4E3B\u58F0\u7D22',
        headerSub: 'ORIGINAL OWNER CLAIM',
        icon: Scale,
    },
    PURCHASE_OFFER: {
        headerLabel: '\u6536\u8D2D\u9080\u7EA6',
        headerSub: 'PURCHASE OFFER',
        icon: Banknote,
    },
};

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
    emerald: {
        spotlight: 'from-emerald-500/8 to-transparent',
        labelColor: 'text-emerald-400',
        tagBg: 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300',
        itemBorder: 'border-emerald-800/60',
        itemBg: 'bg-emerald-950/20',
        itemIconBg: 'bg-emerald-900/30',
        itemIconBorder: 'border-emerald-700/60',
        itemIconColor: 'text-emerald-400',
        surrenderBorder: 'border-emerald-800/50 hover:border-emerald-500',
        surrenderBg: 'bg-emerald-950/20 hover:bg-emerald-900/30',
        surrenderGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
        surrenderBtnBg: 'bg-emerald-700 hover:bg-emerald-600 border-emerald-600',
        surrenderBtnText: 'text-white',
    },
    red: {
        spotlight: 'from-red-500/8 to-transparent',
        labelColor: 'text-red-400',
        tagBg: 'bg-red-900/40 border-red-700/50 text-red-300',
        itemBorder: 'border-red-800/60',
        itemBg: 'bg-red-950/20',
        itemIconBg: 'bg-red-900/30',
        itemIconBorder: 'border-red-700/60',
        itemIconColor: 'text-red-400',
        surrenderBorder: 'border-red-800/50 hover:border-red-500',
        surrenderBg: 'bg-red-950/20 hover:bg-red-900/30',
        surrenderGlow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]',
        surrenderBtnBg: 'bg-red-700 hover:bg-red-600 border-red-600',
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

/** Infer icon type from effect label text */
const getEffectIconType = (effect: string): string => {
    if (effect.includes('Humanity')) return 'humanity';
    if (effect.includes('Credibility')) return 'credibility';
    if (effect.includes('Innocence')) return 'innocence';
    return 'default';
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

/** Determine the trailing badge for the accept choice */
const getAcceptBadge = (eventType: ItemDerivedEventType): { label: string; color: string; dotColor: string } | null => {
    switch (eventType) {
        case 'THIEF_REGRET':
        case 'ORIGINAL_OWNER':
            return { label: '\u7269\u54C1\u88AB\u5F52\u8FD8', color: 'text-red-400', dotColor: 'bg-red-500' };
        case 'PURCHASE_OFFER':
            return { label: '\u7269\u54C1\u51FA\u552E', color: 'text-emerald-400', dotColor: 'bg-emerald-500' };
        default:
            return null;
    }
};

export const ItemDerivedEventModal: React.FC = () => {
    const { state } = useGame();
    const { resolveItemDerivedEvent } = useGameEngine();
    const [narrativeComplete, setNarrativeComplete] = useState(false);

    const event = state.currentItemDerivedEvent;
    if (!event) return null;

    const header = EVENT_HEADER[event.eventType];
    const IconComponent = header.icon;
    const accent = ACCENT_STYLES[event.accentColor];
    const acceptBadge = getAcceptBadge(event.eventType);

    const choiceA = event.choices[0];
    const choiceB = event.choices[1];

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
                    {header.headerSub}
                </div>

                {/* Scene Narrative -- typewriter for immersion */}
                <div className="w-full mb-6 text-center">
                    <p className="font-serif italic text-stone-400 text-sm leading-relaxed">
                        <TypewriterText
                            text={event.sceneNarrative}
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

                    {/* Offer Value (PURCHASE_OFFER only) */}
                    {event.offerValue != null && (
                        <div className={cn(
                            "w-full text-center py-3 mb-4 rounded-lg border",
                            accent.itemBorder, accent.itemBg,
                        )}>
                            <span className="text-stone-400 text-sm">{'\u62A5\u4EF7: '}</span>
                            <span className="text-emerald-400 font-bold text-xl">${event.offerValue.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Situation Description */}
                    <p className="text-sm text-stone-300 leading-relaxed text-center mb-4">
                        {event.situationDesc}
                    </p>

                    {/* Quote */}
                    <blockquote className="w-full text-center font-serif italic text-stone-400/90 text-base leading-relaxed mb-8 px-4">
                        {event.npcQuote}
                    </blockquote>

                    {/* Choices -- vertical stacked narrative cards */}
                    <div className="w-full space-y-4 mb-6">

                        {/* Choice A: Accept (themed) */}
                        <button
                            onClick={() => resolveItemDerivedEvent(choiceA.id)}
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
                                        {choiceA.label}
                                    </div>
                                    <div className={cn("text-[10px] font-mono uppercase tracking-[0.15em]", accent.labelColor)}>
                                        {choiceA.subLabel}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-stone-400 leading-relaxed mb-3 pl-[52px]">
                                {choiceA.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                                {choiceA.effectLabels.map((effect, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/30 border border-stone-800/50",
                                            getEffectColor(effect),
                                        )}
                                    >
                                        <EffectIcon type={getEffectIconType(effect)} />
                                        {effect}
                                    </span>
                                ))}
                                {acceptBadge && (
                                    <span className={cn(
                                        "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/30 border border-stone-800/50",
                                        acceptBadge.color,
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full", acceptBadge.dotColor)} />
                                        {acceptBadge.label}
                                    </span>
                                )}
                            </div>
                        </button>

                        {/* Choice B: Refuse (gray/neutral) */}
                        <button
                            onClick={() => resolveItemDerivedEvent(choiceB.id)}
                            className="w-full text-left rounded-lg border p-5 transition-all duration-300 group cursor-pointer border-stone-700/50 bg-stone-950/30 hover:bg-stone-900/30 hover:border-stone-500 hover:shadow-[0_0_20px_rgba(120,113,108,0.1)]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 transition-colors bg-stone-800/50 border-stone-600 group-hover:border-stone-500">
                                    <ShieldX className="w-5 h-5 text-stone-400 group-hover:text-stone-300 transition-colors" />
                                </div>
                                <div>
                                    <div className="text-base font-bold text-stone-300 group-hover:text-stone-100 transition-colors">
                                        {choiceB.label}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-stone-500">
                                        {choiceB.subLabel}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-stone-500 leading-relaxed mb-3 pl-[52px]">
                                {choiceB.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                                {choiceB.effectLabels.map((effect, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black/30 border border-stone-800/50",
                                            getEffectColor(effect),
                                        )}
                                    >
                                        <EffectIcon type={getEffectIconType(effect)} />
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
