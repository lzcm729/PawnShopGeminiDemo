
import React from 'react';
import { cn } from '../../lib/utils';
import { Flame, Eye, EyeOff, Heart, Lock, AlertTriangle } from 'lucide-react';
import { Customer } from '../../types';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../../systems/assets';
import { DISPOSITION_INFO, SHOW_DISPOSITION_LABEL_IN_NEGOTIATION, InsightLayer, Disposition } from '../../systems/customerInsight';

interface InsightResultData {
    disposition: string;
    dispositionText: string;
    floorHint: string;
    moralContext?: string;
    revealedLayer: InsightLayer;
    secondaryDisposition?: Disposition;
    timeOrderWarning?: boolean;
}

interface CustomerHeaderProps {
    customer: Customer;
    patience: number;
    mood: string;
    onInsightClick?: () => void;
    canUseInsight?: boolean;
    hasUsedInsight?: boolean;
    insightBlockReason?: string;
    insightResult?: InsightResultData | null;
    /** Deep insight (layer 2) */
    canDeepInsight?: boolean;
    onDeepInsightClick?: () => void;
    /** Full insight (layer 3) */
    canFullInsight?: boolean;
    onFullInsightClick?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
    customer,
    patience,
    mood,
    onInsightClick,
    canUseInsight = false,
    hasUsedInsight = false,
    insightBlockReason,
    insightResult,
    canDeepInsight = false,
    onDeepInsightClick,
    canFullInsight = false,
    onFullInsightClick,
}) => {
    const isAngry = mood === 'Angry';

    return (
        <div className="bg-gradient-to-b from-noir-300 to-noir-200 border-b border-noir-400 shrink-0 shadow-lg relative overflow-hidden">
            {/* Main Row: Portrait Left + Info Center + Stress Right */}
            <div className="flex items-stretch gap-4 p-4">
                {/* Left: Portrait + Name */}
                <div className="flex flex-col items-center shrink-0 justify-center">
                    {/* Portrait Container with Enhanced Visual Treatment */}
                    <div className={cn(
                        "relative w-[144px] h-[144px] rounded-full overflow-hidden border-2 transition-all duration-300",
                        "shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                        isAngry
                            ? "border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-[pulse_1s_ease-in-out_infinite]"
                            : "border-amber-600/60 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                    )}>
                        {/* Outer Glow Ring */}
                        <div className={cn(
                            "absolute -inset-1 rounded-full opacity-50 blur-sm",
                            isAngry ? "bg-red-500" : "bg-amber-600/30"
                        )} />

                        <img
                            src={(() => {
                              const emotion = 'neutral' as const;
                              if (customer.portraits?.[emotion]) return customer.portraits[emotion];
                              if (customer.chainId) {
                                const charId = customer.chainId.replace(/^chain_/, '');
                                return getCharacterPortraitPath(charId, emotion);
                              }
                              return PORTRAIT_PLACEHOLDER;
                            })()}
                            alt="Subject"
                            className="w-full h-full object-cover relative z-10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PORTRAIT_PLACEHOLDER;
                            }}
                        />

                        {/* Vignette Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-20 pointer-events-none" />

                        {isAngry && <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-pulse z-30"></div>}
                    </div>

                    {/* Customer Name - Below Portrait */}
                    <div className="mt-2 text-center">
                        <h2 className="text-base font-serif font-bold text-noir-txt-primary leading-none tracking-wide">{customer.name}</h2>
                    </div>
                </div>

                {/* Center: Observation + Insight Area */}
                <div className="flex-1 min-w-0 flex flex-col border border-noir-400/50 rounded bg-noir-100/30">
                    {/* Top: Customer Observation + Insight Button */}
                    <div className="px-3 py-2 border-b border-noir-400/30 min-h-[32px] flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                            {customer.observation ? (
                                <p className="text-xs text-amber-500/90 font-serif italic leading-snug line-clamp-1" title={customer.observation}>
                                    {customer.observation}
                                </p>
                            ) : (
                                <p className="text-xs text-noir-txt-muted font-serif italic opacity-50">
                                    (观察客户行为...)
                                </p>
                            )}
                        </div>
                        {/* Insight Buttons - Inline with observation */}
                        <div className="shrink-0 flex items-center gap-1">
                            {!hasUsedInsight ? (
                                <button
                                    onClick={onInsightClick}
                                    disabled={!canUseInsight}
                                    title={canUseInsight ? "洞察客户心理 (消耗 1 AP)" : insightBlockReason}
                                    className={cn(
                                        "flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border transition-all duration-200 shadow-sm",
                                        canUseInsight
                                            ? "bg-pawn-accent text-black border-amber-400 hover:scale-105 hover:shadow-md"
                                            : "bg-stone-800/80 text-stone-500 border-stone-600 cursor-not-allowed"
                                    )}
                                >
                                    <Eye className="w-3 h-3" />
                                    <span>洞察</span>
                                    <span className="text-[8px] opacity-80">1AP</span>
                                </button>
                            ) : (
                                <>
                                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border bg-pawn-green/20 text-pawn-green border-pawn-green/50">
                                        <Eye className="w-3 h-3" />
                                        <span>L{insightResult?.revealedLayer ?? 1}</span>
                                    </div>
                                    {/* Deep Insight button (layer 2) */}
                                    {canDeepInsight && onDeepInsightClick && (
                                        <button
                                            onClick={onDeepInsightClick}
                                            title="深度洞察 - 揭示底线提示 (消耗 1 AP)"
                                            className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border transition-all duration-200 shadow-sm bg-purple-600 text-white border-purple-400 hover:scale-105 hover:shadow-md"
                                        >
                                            <Eye className="w-3 h-3" />
                                            <span>深度</span>
                                            <span className="text-[8px] opacity-80">1AP</span>
                                        </button>
                                    )}
                                    {/* Full Insight button (layer 3) */}
                                    {canFullInsight && onFullInsightClick && (
                                        <button
                                            onClick={onFullInsightClick}
                                            title="完全洞察 - 揭示道德背景 (需要共情技能)"
                                            className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border transition-all duration-200 shadow-sm bg-red-700 text-white border-red-400 hover:scale-105 hover:shadow-md"
                                        >
                                            <Heart className="w-3 h-3" />
                                            <span>完全</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom: Insight Result Area */}
                    <div className="flex-1 flex flex-col items-stretch">
                        {insightResult ? (
                            /* Insight Result - layer-gated behavioral descriptions */
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Time-order warning banner */}
                                {insightResult.timeOrderWarning && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-900/30 border-b border-yellow-700/30">
                                        <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                                        <p className="text-[10px] text-yellow-400 font-mono leading-snug">
                                            你已经动摇了他的底线。以下是对他最初状态的判断。
                                        </p>
                                    </div>
                                )}

                                <div className="flex-1 flex min-w-0">
                                    {/* Left Column: Disposition Type - only show if labels are enabled */}
                                    {SHOW_DISPOSITION_LABEL_IN_NEGOTIATION && (
                                        <div className="flex flex-col items-center justify-center px-4 py-2 border-r border-noir-400/30 min-w-[80px]">
                                            <span className="text-2xl mb-1">{DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.icon || '?'}</span>
                                            <span className={cn("text-xs font-bold text-center", DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.color || 'text-amber-400')}>
                                                {DISPOSITION_INFO[insightResult.disposition as keyof typeof DISPOSITION_INFO]?.label || insightResult.disposition}
                                            </span>
                                        </div>
                                    )}

                                    {/* Right Column: Layer-gated behavioral observations */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        {/* Row 1 (Layer 1): Behavioral description (dispositionText) - always shown */}
                                        <div className="flex-1 px-3 py-1.5 border-b border-noir-400/20 flex flex-col justify-center min-w-0">
                                            <div className="flex items-start gap-1.5 min-w-0">
                                                <Eye className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" />
                                                <p className="font-serif text-xs text-noir-txt-secondary leading-snug italic break-words min-w-0">
                                                    "{insightResult.dispositionText}"
                                                </p>
                                            </div>
                                            {/* Secondary disposition hint */}
                                            {insightResult.secondaryDisposition && (
                                                <p className="ml-[18px] text-[10px] text-purple-400/70 font-serif italic leading-snug mt-0.5">
                                                    矛盾信号：此人同时表现出{DISPOSITION_INFO[insightResult.secondaryDisposition]?.label || insightResult.secondaryDisposition}倾向
                                                </p>
                                            )}
                                        </div>

                                        {/* Row 2 (Layer 2): Floor hint behavioral description */}
                                        <div className="flex-1 px-3 py-1.5 border-b border-noir-400/20 flex items-start min-w-0">
                                            {insightResult.revealedLayer >= 2 ? (
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <Eye className="w-3 h-3 text-purple-500/60 shrink-0 mt-0.5" />
                                                    <p className="font-serif text-[11px] text-amber-500/90 leading-snug italic break-words min-w-0">
                                                        "{insightResult.floorHint}"
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <Lock className="w-3 h-3 text-noir-txt-muted shrink-0" />
                                                    <span className="text-[10px] text-noir-txt-muted font-mono">需要深度洞察</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 3 (Layer 3): Moral context */}
                                        <div className="flex-1 px-3 py-1.5 flex items-start min-w-0">
                                            {insightResult.revealedLayer >= 3 ? (
                                                insightResult.moralContext ? (
                                                    <div className="flex items-start gap-1.5 min-w-0">
                                                        <Heart className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                                        <p className="font-serif text-[10px] text-red-300/80 leading-snug italic break-words min-w-0">
                                                            {insightResult.moralContext}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-noir-txt-muted/30 font-mono">---</span>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <Lock className="w-3 h-3 text-noir-txt-muted shrink-0" />
                                                    <span className="text-[10px] text-noir-txt-muted font-mono">需要共情技能</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Locked state - Placeholder with visual hint */
                            <div className="flex-1 flex items-center justify-center p-3">
                                <div className="flex flex-col items-center gap-1.5 opacity-40">
                                    <div className="flex items-center gap-2">
                                        <EyeOff className="w-6 h-6 text-noir-txt-muted" />
                                        <span className="text-sm text-noir-txt-muted font-mono">???</span>
                                    </div>
                                    <span className="text-xs text-noir-txt-muted font-serif italic">
                                        点击洞察了解客户心理
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Stress Flames */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-3 min-w-[48px]">
                    <div className="flex flex-col-reverse items-center gap-0.5">
                        {Array.from({length: 5}).map((_, i) => (
                            <Flame
                                key={i}
                                className={`w-3.5 h-3.5 transition-all duration-300 ${
                                    i < patience
                                        ? (isAngry ? 'text-red-600 fill-red-600 animate-pulse' : 'text-orange-500 fill-orange-500')
                                        : 'text-stone-800'
                                }`}
                            />
                        ))}
                    </div>
                    <span className="text-[9px] font-mono text-noir-txt-muted tracking-wider">耐心</span>
                </div>
            </div>
        </div>
    )
}
