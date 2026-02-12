
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Flame, Eye, EyeOff, Heart, Lock, AlertTriangle, HeartHandshake, ScanSearch, Sparkles } from 'lucide-react';
import { Customer } from '../../types';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../../systems/assets';
import { DISPOSITION_INFO, SHOW_DISPOSITION_LABEL_IN_NEGOTIATION, InsightLayer, Disposition, ForesightInfo } from '../../systems/customerInsight';
import { PatienceWarningLevel } from '../../hooks/useNegotiation';
import { playSfx } from '../../systems/game/audio';

export interface InsightResultData {
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
    patienceWarningLevel?: PatienceWarningLevel;
    insightResult?: InsightResultData | null;
    // Insight skill
    canUseInsight?: boolean;
    hasUsedInsight?: boolean;
    insightBlockReason?: string;
    insightRevealedLayer?: number;
    onInsightClick?: () => void;
    canDeepInsight?: boolean;
    onDeepInsightClick?: () => void;
    canFullInsight?: boolean;
    onFullInsightClick?: () => void;
    // Foresight (Layer 4)
    foresightInfo?: ForesightInfo | null;
    // Empathy & Probe
    canInteract?: boolean;
    canUseEmpathy?: boolean;
    empathyUsed?: boolean;
    onEmpathy?: () => void;
    canUseProbe?: boolean;
    probeUsed?: boolean;
    onProbe?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
    customer,
    patience,
    mood,
    patienceWarningLevel = 'normal',
    insightResult,
    canUseInsight,
    hasUsedInsight,
    insightBlockReason,
    insightRevealedLayer,
    onInsightClick,
    canDeepInsight,
    onDeepInsightClick,
    canFullInsight,
    onFullInsightClick,
    foresightInfo,
    canInteract = true,
    canUseEmpathy,
    empathyUsed,
    onEmpathy,
    canUseProbe,
    probeUsed,
    onProbe,
}) => {
    const isAngry = mood === 'Angry';

    // Track patience changes for floating delta animation
    const prevPatienceRef = useRef(patience);
    const [patienceDelta, setPatienceDelta] = useState<number | null>(null);
    const deltaKeyRef = useRef(0);

    useEffect(() => {
        const delta = patience - prevPatienceRef.current;
        if (delta !== 0) {
            deltaKeyRef.current += 1;
            setPatienceDelta(delta);
            const timer = setTimeout(() => setPatienceDelta(null), 1200);
            prevPatienceRef.current = patience;
            return () => clearTimeout(timer);
        }
        prevPatienceRef.current = patience;
    }, [patience]);

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
                    {/* Top: Customer Observation */}
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

                                        {/* Row 4 (Layer 4): Foresight - 洞若观火 */}
                                        {foresightInfo && (
                                            <div className={cn(
                                                "px-3 py-1.5 border-t border-noir-400/20 flex items-start min-w-0",
                                                foresightInfo.confidence === 'high' ? 'bg-amber-950/10' :
                                                foresightInfo.confidence === 'medium' ? 'bg-indigo-950/10' :
                                                'bg-stone-900/10'
                                            )}>
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <Sparkles className={cn(
                                                        "w-3 h-3 shrink-0 mt-0.5",
                                                        foresightInfo.confidence === 'high' ? 'text-amber-400' :
                                                        foresightInfo.confidence === 'medium' ? 'text-indigo-400' :
                                                        'text-stone-500'
                                                    )} />
                                                    <p className={cn(
                                                        "font-serif text-[10px] leading-snug italic break-words min-w-0",
                                                        foresightInfo.confidence === 'high' ? 'text-amber-300/90' :
                                                        foresightInfo.confidence === 'medium' ? 'text-indigo-300/80' :
                                                        'text-stone-400/70'
                                                    )}>
                                                        {foresightInfo.predictionText}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
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
                                        使用洞察技能了解客户心理
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Skill Buttons Column: Insight / Empathy / Probe */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-1">
                    {/* Insight Button (multi-layer) */}
                    {(() => {
                        const used = hasUsedInsight ?? false;
                        const layer = insightRevealedLayer ?? 0;
                        const canDeep = canDeepInsight && onDeepInsightClick;
                        const canFull = canFullInsight && onFullInsightClick;
                        let insightLabel: string;
                        let insightEnabled: boolean;
                        let insightHandler: (() => void) | undefined;
                        let insightActiveColor: string;
                        let insightIcon: React.ReactNode;

                        if (!used) {
                            insightLabel = '洞察';
                            insightEnabled = !!canUseInsight;
                            insightHandler = onInsightClick;
                            insightActiveColor = 'bg-amber-950/40 border-amber-700/60 text-amber-400 hover:bg-amber-900/50 hover:border-amber-500 hover:shadow-[0_0_8px_rgba(217,119,6,0.3)] active:scale-95';
                            insightIcon = <Eye className="w-4 h-4" />;
                        } else if (canFull) {
                            insightLabel = '完全';
                            insightEnabled = true;
                            insightHandler = onFullInsightClick;
                            insightActiveColor = 'bg-red-950/40 border-red-700/60 text-red-400 hover:bg-red-900/50 hover:border-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.3)] active:scale-95';
                            insightIcon = <Heart className="w-4 h-4" />;
                        } else if (canDeep) {
                            insightLabel = '深度';
                            insightEnabled = true;
                            insightHandler = onDeepInsightClick;
                            insightActiveColor = 'bg-purple-950/40 border-purple-700/60 text-purple-400 hover:bg-purple-900/50 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(147,51,234,0.3)] active:scale-95';
                            insightIcon = <Eye className="w-4 h-4" />;
                        } else {
                            insightLabel = `L${layer}`;
                            insightEnabled = false;
                            insightHandler = undefined;
                            insightActiveColor = '';
                            insightIcon = <Eye className="w-4 h-4 opacity-40" />;
                        }

                        const isDisabled = !insightEnabled || !canInteract;

                        return (
                            <button
                                onClick={() => {
                                    if (!isDisabled && insightHandler) {
                                        playSfx('CLICK');
                                        insightHandler();
                                    }
                                }}
                                disabled={isDisabled}
                                title={
                                    !used
                                        ? (canUseInsight ? "洞察客户心理 (消耗 1 AP)" : (insightBlockReason || "洞察不可用"))
                                        : canFull
                                        ? "完全洞察 - 揭示道德背景"
                                        : canDeep
                                        ? "深度洞察 - 揭示底线提示 (消耗 1 AP)"
                                        : `洞察 L${layer} - 已完成`
                                }
                                className={cn(
                                    "w-11 h-11 border rounded flex flex-col items-center justify-center transition-all duration-200",
                                    isDisabled
                                        ? "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                        : insightActiveColor
                                )}
                            >
                                {insightIcon}
                                <span className="text-[8px] font-bold tracking-wider mt-0.5 leading-none">
                                    {insightLabel}
                                </span>
                            </button>
                        );
                    })()}

                    {/* Empathy Button */}
                    <button
                        onClick={() => {
                            if (!empathyUsed && canUseEmpathy && canInteract && onEmpathy) {
                                playSfx('CLICK');
                                onEmpathy();
                            }
                        }}
                        disabled={!canInteract || !canUseEmpathy || empathyUsed || !onEmpathy}
                        title={empathyUsed ? "已使用 - 每次议价限用一次" : !onEmpathy ? "需要先洞察客户" : "共情: 对客户表达理解与关怀"}
                        className={cn(
                            "w-11 h-11 border rounded flex flex-col items-center justify-center transition-all duration-200",
                            empathyUsed || !onEmpathy
                                ? "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                : canUseEmpathy && canInteract
                                ? "bg-rose-950/40 border-rose-700/60 text-rose-400 hover:bg-rose-900/50 hover:border-rose-500 hover:shadow-[0_0_8px_rgba(244,63,94,0.3)] active:scale-95"
                                : "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                        )}
                    >
                        <HeartHandshake className={cn("w-4 h-4", (empathyUsed || !onEmpathy) && "opacity-40")} />
                        <span className="text-[8px] font-bold tracking-wider mt-0.5 leading-none">
                            {empathyUsed ? "已用" : "共情"}
                        </span>
                    </button>

                    {/* Probe Button */}
                    <button
                        onClick={() => {
                            if (!probeUsed && canUseProbe && canInteract && onProbe) {
                                playSfx('CLICK');
                                onProbe();
                            }
                        }}
                        disabled={!canInteract || !canUseProbe || probeUsed || !onProbe}
                        title={probeUsed ? "已使用 - 每次议价限用一次" : !onProbe ? "需要先洞察客户" : "试探: 试探客户的真实底线"}
                        className={cn(
                            "w-11 h-11 border rounded flex flex-col items-center justify-center transition-all duration-200",
                            probeUsed || !onProbe
                                ? "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                                : canUseProbe && canInteract
                                ? "bg-cyan-950/40 border-cyan-700/60 text-cyan-400 hover:bg-cyan-900/50 hover:border-cyan-500 hover:shadow-[0_0_8px_rgba(6,182,212,0.3)] active:scale-95"
                                : "bg-noir-400/50 border-noir-400 text-noir-txt-muted opacity-50 cursor-not-allowed"
                        )}
                    >
                        <ScanSearch className={cn("w-4 h-4", (probeUsed || !onProbe) && "opacity-40")} />
                        <span className="text-[8px] font-bold tracking-wider mt-0.5 leading-none">
                            {probeUsed ? "已用" : "试探"}
                        </span>
                    </button>
                </div>

                {/* Right: Stress Flames */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-3 min-w-[48px] relative">
                    {/* Floating patience delta */}
                    {patienceDelta !== null && (
                        <span
                            key={deltaKeyRef.current}
                            className={cn(
                                "absolute -top-1 left-1/2 -translate-x-1/2 text-sm font-bold font-mono animate-float-up pointer-events-none z-10",
                                patienceDelta < 0 ? "text-red-400" : "text-green-400"
                            )}
                        >
                            {patienceDelta > 0 ? `+${patienceDelta}` : patienceDelta}
                        </span>
                    )}
                    <div className="flex flex-col-reverse items-center gap-0.5">
                        {Array.from({length: 5}).map((_, i) => (
                            <Flame
                                key={i}
                                className={cn(
                                    "w-3.5 h-3.5 transition-all duration-300",
                                    i < patience
                                        ? patienceWarningLevel === 'danger'
                                            ? 'text-red-500 fill-red-500 animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                                            : patienceWarningLevel === 'caution'
                                            ? 'text-amber-400 fill-amber-400 animate-[pulse_1.5s_ease-in-out_infinite]'
                                            : isAngry
                                            ? 'text-red-600 fill-red-600 animate-pulse'
                                            : 'text-orange-500 fill-orange-500'
                                        : 'text-stone-800'
                                )}
                            />
                        ))}
                    </div>
                    <span className={cn(
                        "text-[9px] font-mono tracking-wider transition-colors duration-300",
                        patienceWarningLevel === 'danger'
                            ? 'text-red-400 animate-pulse font-bold'
                            : patienceWarningLevel === 'caution'
                            ? 'text-amber-400'
                            : 'text-noir-txt-muted'
                    )}>
                        {patienceWarningLevel === 'danger' ? '危险' : '耐心'}
                    </span>
                </div>
            </div>
        </div>
    )
}
