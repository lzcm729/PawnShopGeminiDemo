/**
 * HoldingPeriodEventModal
 *
 * Modal that appears when someone claims ownership of a pawned item
 * during the holding period. Player must choose to surrender or refuse.
 *
 * Two event types:
 * - THIEF_REGRET: Someone claims they stole the item and wants to return it
 * - ORIGINAL_OWNER: Someone claims to be the original owner
 */

import React from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
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
        headerBg: 'from-purple-900/40 via-purple-800/30 to-purple-900/40',
        headerBorder: 'border-purple-800/50',
        accentColor: 'purple',
        description: (itemName: string) =>
            `一个人来到店里，声称自己曾偷窃了「${itemName}」，现在良心不安，请求你归还原物。`,
        quote: '"我做了错事... 这东西不该出现在这里。能还给我吗？我想把它物归原主。"',
        surrenderLabel: '归还物品',
        surrenderSub: 'COOPERATE',
        surrenderEffects: ['归还物品给声称者', 'Humanity +2'],
        surrenderEffectColors: ['text-purple-300/80', 'text-rose-400'],
        refuseLabel: '拒绝归还',
        refuseSub: 'DENY',
        refuseEffects: ['保留物品', 'Innocence -1'],
        refuseEffectColors: ['text-stone-300/80', 'text-red-400'],
    },
    ORIGINAL_OWNER: {
        title: 'OWNERSHIP CLAIM',
        headerLabel: '原主声索',
        headerSub: 'ORIGINAL OWNER CLAIM',
        icon: Scale,
        headerBg: 'from-amber-900/40 via-amber-800/30 to-amber-900/40',
        headerBorder: 'border-amber-800/50',
        accentColor: 'amber',
        description: (itemName: string) =>
            `一位来访者声称自己是「${itemName}」的原主人，拿出了一些证明文件，要求你归还物品。`,
        quote: '"这是我的东西！我有证据。它是被人偷走后典当到你这里的。请你做个好人，还给我吧。"',
        surrenderLabel: '归还原主',
        surrenderSub: 'RETURN TO OWNER',
        surrenderEffects: ['归还物品给原主人', 'Humanity +5', 'Credibility +2'],
        surrenderEffectColors: ['text-amber-300/80', 'text-rose-400', 'text-teal-400'],
        refuseLabel: '拒绝归还',
        refuseSub: 'DENY',
        refuseEffects: ['保留物品但损害声誉', 'Humanity -3', 'Credibility -2'],
        refuseEffectColors: ['text-stone-300/80', 'text-red-400', 'text-red-400'],
    },
} as const;

export const HoldingPeriodEventModal: React.FC = () => {
    const { state, dispatch } = useGame();

    const event = state.currentHoldingPeriodEvent;
    if (!event) return null;

    const config = EVENT_CONFIG[event.type];
    const IconComponent = config.icon;

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

    const accentMap = {
        purple: {
            modalBorder: 'border-purple-900/50',
            modalBg: 'bg-[#0a0618]',
            modalShadow: 'shadow-[0_0_50px_rgba(147,51,234,0.2)]',
            gridBg: 'bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)]',
            textColor: 'text-purple-400',
            itemBorder: 'border-purple-800/50',
            itemBg: 'bg-purple-950/20',
            itemIconBg: 'bg-purple-900/30',
            itemIconBorder: 'border-purple-700',
            itemIconColor: 'text-purple-400',
            itemLabel: 'text-purple-400',
            surrenderBtnBg: 'bg-purple-700 hover:bg-purple-600 border-purple-600',
            footerBorder: 'border-purple-900/30',
            footerText: 'text-purple-600/60',
        },
        amber: {
            modalBorder: 'border-amber-900/50',
            modalBg: 'bg-[#0a0800]',
            modalShadow: 'shadow-[0_0_50px_rgba(217,119,6,0.2)]',
            gridBg: 'bg-[linear-gradient(rgba(217,119,6,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(217,119,6,0.03)_1px,transparent_1px)]',
            textColor: 'text-amber-400',
            itemBorder: 'border-amber-800/50',
            itemBg: 'bg-amber-950/20',
            itemIconBg: 'bg-amber-900/30',
            itemIconBorder: 'border-amber-700',
            itemIconColor: 'text-amber-400',
            itemLabel: 'text-amber-400',
            surrenderBtnBg: 'bg-amber-700 hover:bg-amber-600 border-amber-600',
            footerBorder: 'border-amber-900/30',
            footerText: 'text-amber-600/60',
        },
    };

    const accent = accentMap[config.accentColor];

    return (
        <Modal
            isOpen={true}
            onClose={() => {}}
            title={
                <div className="flex items-center gap-2">
                    <IconComponent className={cn("w-5 h-5", accent.textColor)} />
                    <span>{config.title}</span>
                </div>
            }
            size="md"
            className={cn(accent.modalBorder, accent.modalBg, accent.modalShadow)}
            noPadding
        >
            <div className={cn("flex flex-col font-mono relative overflow-hidden", accent.textColor)}>
                {/* Background Pattern */}
                <div className={cn("absolute inset-0 bg-[length:20px_20px] pointer-events-none", accent.gridBg)}></div>

                {/* Header Alert */}
                <div className={cn("relative z-10 border-b p-4", `bg-gradient-to-r ${config.headerBg}`, config.headerBorder)}>
                    <div className="flex items-center justify-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                        <div className="text-center">
                            <div className={cn("text-xs uppercase tracking-widest font-bold", accent.textColor)}>
                                {config.headerSub}
                            </div>
                            <div className="text-lg text-white font-bold mt-0.5">
                                {config.headerLabel}
                            </div>
                        </div>
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 space-y-6">
                    {/* Situation Description */}
                    <div className={cn("border rounded-lg p-4", accent.itemBorder, accent.itemBg)}>
                        <p className="text-sm text-stone-200 leading-relaxed">
                            {config.description(event.itemName)}
                        </p>
                    </div>

                    {/* Item Display */}
                    <div className={cn("border-2 rounded-lg p-4 flex items-center gap-4", accent.itemBorder, accent.itemBg)}>
                        <div className={cn("w-12 h-12 rounded border flex items-center justify-center", accent.itemIconBg, accent.itemIconBorder)}>
                            <IconComponent className={cn("w-6 h-6", accent.itemIconColor)} />
                        </div>
                        <div className="flex-1">
                            <div className={cn("text-xs uppercase tracking-wider mb-0.5", accent.itemLabel)}>
                                CLAIMED ITEM
                            </div>
                            <div className="text-lg text-white font-bold">
                                {event.itemName}
                            </div>
                        </div>
                    </div>

                    {/* Quote */}
                    <div className="text-center text-sm text-stone-400 font-serif italic">
                        {config.quote}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option A: Surrender */}
                        <div className={cn("rounded-lg p-4 hover:bg-opacity-50 transition-all group", accent.itemBg, "border", accent.itemBorder)}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border transition-colors", accent.itemIconBg, accent.itemIconBorder)}>
                                    <HandHeart className={cn("w-5 h-5", accent.textColor)} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-stone-200">
                                        {config.surrenderLabel}
                                    </div>
                                    <div className={cn("text-[10px] uppercase", accent.textColor)}>
                                        {config.surrenderSub}
                                    </div>
                                </div>
                            </div>
                            <ul className="text-xs space-y-1.5 mb-4">
                                {config.surrenderEffects.map((effect, i) => (
                                    <li key={i} className={cn("flex items-center gap-2", config.surrenderEffectColors[i])}>
                                        {i === 0 ? (
                                            <span className={cn("w-1.5 h-1.5 rounded-full", `bg-${config.accentColor}-500`)}></span>
                                        ) : (
                                            <Heart className="w-3 h-3" />
                                        )}
                                        {effect}
                                    </li>
                                ))}
                                <li className="flex items-center gap-2 text-red-400">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                    物品被归还
                                </li>
                            </ul>
                            <Button
                                variant="primary"
                                onClick={handleSurrender}
                                className={cn("w-full h-10 text-sm", accent.surrenderBtnBg)}
                            >
                                <HandHeart className="w-4 h-4 mr-2" />
                                {config.surrenderLabel}
                            </Button>
                        </div>

                        {/* Option B: Refuse */}
                        <div className="bg-stone-950/30 border border-stone-700/50 rounded-lg p-4 hover:bg-stone-900/30 hover:border-stone-600/50 transition-all group">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 bg-stone-800/50 rounded-full flex items-center justify-center border border-stone-600 group-hover:border-stone-500 transition-colors">
                                    <ShieldX className="w-5 h-5 text-stone-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-stone-200">
                                        {config.refuseLabel}
                                    </div>
                                    <div className="text-[10px] text-stone-500 uppercase">
                                        {config.refuseSub}
                                    </div>
                                </div>
                            </div>
                            <ul className="text-xs space-y-1.5 mb-4">
                                {config.refuseEffects.map((effect, i) => (
                                    <li key={i} className={cn("flex items-center gap-2", config.refuseEffectColors[i])}>
                                        {i === 0 ? (
                                            <span className="w-1.5 h-1.5 bg-stone-500 rounded-full"></span>
                                        ) : (
                                            <ShieldX className="w-3 h-3" />
                                        )}
                                        {effect}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                variant="outline"
                                onClick={handleRefuse}
                                className="w-full h-10 border-stone-600 text-stone-300 hover:bg-stone-800/50 hover:border-stone-500 text-sm"
                            >
                                <ShieldX className="w-4 h-4 mr-2" />
                                拒绝归还
                            </Button>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className={cn("text-center text-[10px] uppercase tracking-wider pt-2 border-t", accent.footerBorder, accent.footerText)}>
                        THIS DECISION CANNOT BE UNDONE
                    </div>
                </div>
            </div>
        </Modal>
    );
};
