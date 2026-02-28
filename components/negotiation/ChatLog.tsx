
import React from 'react';
import { cn } from '../../lib/utils';
import { Search } from 'lucide-react';
import { NegotiationHistory } from '../NegotiationHistory';
import { OfferRecord } from '../../hooks/useNegotiation';

export interface LogEntry {
    id: string;
    sender: 'player' | 'customer' | 'system';
    text: string;
    subtext?: string;
    sentiment?: 'neutral' | 'negative' | 'positive';
    type?: 'INTEL' | 'INNER_MONOLOGUE' | 'INSIGHT_RESULT';
    data?: any;
}

interface ChatLogProps {
    chatLog: LogEntry[];
    offerHistory?: OfferRecord[];
    isBinaryChoice?: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatLog: React.FC<ChatLogProps> = ({ chatLog, offerHistory, isBinaryChoice, scrollRef }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40 relative" ref={scrollRef}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

            {chatLog.map((log, idx) => {
                const isPlayer = log.sender === 'player';
                const isSystem = log.sender === 'system';

                // Regular system message (divider style)
                if (isSystem) {
                    return (
                      <div key={log.id} className="flex items-center justify-center my-3 gap-3 opacity-0 animate-[fadeIn_0.2s_ease-out_forwards]">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-noir-400" />
                          <span className="text-[10px] text-noir-txt-muted font-mono uppercase tracking-wider px-2">
                              {log.text}
                          </span>
                          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-noir-400" />
                      </div>
                    );
                }

                // Inner monologue (appraisal feedback) - subtle styling, lower visual priority
                if (log.type === 'INNER_MONOLOGUE') {
                    // Generate result label based on feedback type
                    const getResultLabel = () => {
                        const feedbackType = log.data?.feedbackType;
                        const traitName = log.data?.traitName;
                        const isBonus = log.data?.isBonus;
                        switch (feedbackType) {
                            case 'TRAIT_DISCOVERED': {
                                const label = traitName ? `发现线索：${traitName}` : '发现线索';
                                return isBonus ? `✦ ${label}` : label;
                            }
                            case 'RANGE_NARROWED': return '估值范围收缩';
                            case 'BREAKTHROUGH': return '灵光一闪';
                            case 'MISHAP': return '鉴定失误';
                            case 'IMPATIENT': return '客户不耐烦';
                            case 'ALREADY_KNOWN': return '暂无新发现';
                            case 'EMPATHY_SUCCESS': return '共情成功';
                            case 'EMPATHY_FAIL': return '共情失败';
                            case 'PROBE_SUCCESS': return '试探成功';
                            case 'PROBE_FAIL': return '试探失败';
                            default: return null;
                        }
                    };
                    const resultLabel = getResultLabel();

                    return (
                        <div key={log.id} className="flex flex-col max-w-[85%] items-end ml-auto animate-in fade-in slide-in-from-bottom-2 duration-300 opacity-70 hover:opacity-90 transition-opacity">
                            <div className={cn(
                                "px-3 py-2 rounded relative text-xs flex items-start gap-1.5 border-l-2 bg-stone-900/20",
                                log.sentiment === 'positive' ? "border-l-pawn-green/40" :
                                log.sentiment === 'negative' ? "border-l-red-500/40" :
                                "border-stone-600/30"
                            )}>
                                <Search className={cn(
                                    "w-3 h-3 shrink-0 mt-0.5",
                                    log.sentiment === 'positive' ? "text-pawn-green/60" :
                                    log.sentiment === 'negative' ? "text-red-500/60" :
                                    "text-stone-500"
                                )} />
                                <div className="flex flex-col gap-1">
                                    <span className="font-serif italic text-stone-400/80 leading-relaxed">
                                        {log.text}
                                    </span>
                                    {resultLabel && (
                                        <span className="text-[10px] text-stone-500/70 font-mono">
                                            &rarr; {resultLabel}
                                        </span>
                                    )}
                                    {log.subtext && (
                                        <span className={cn(
                                            "text-[10px] font-mono mt-0.5",
                                            log.sentiment === 'positive' ? "text-pawn-green/70" :
                                            log.sentiment === 'negative' ? "text-red-500/70" :
                                            "text-stone-500/70"
                                        )}>
                                            {log.subtext}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={log.id} className={cn("flex flex-col max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300", isPlayer ? "items-end ml-auto" : "items-start")}>
                        <div className={cn(
                            "px-4 py-3 rounded-lg relative shadow-sm text-sm border",
                            isPlayer
                                ? "bg-noir-300 border-noir-400 text-noir-txt-primary font-mono text-right rounded-br-none border-l-[3px] border-l-amber-600"
                                : cn(
                                    "bg-noir-200 border-noir-400 text-stone-300 font-serif leading-relaxed rounded-bl-none",
                                    log.sentiment === 'positive' && "border-l-[3px] border-l-pawn-green/60",
                                    log.sentiment === 'negative' && "border-l-[3px] border-l-red-500/60"
                                )
                        )}>
                            {log.text}
                        </div>
                        {log.subtext && (
                            <span className={cn(
                                "text-[9px] font-mono font-bold mt-1 px-1 uppercase tracking-wider",
                                log.sentiment === 'negative' ? "text-red-500"
                                : log.sentiment === 'positive' ? "text-pawn-green"
                                : "text-noir-txt-muted"
                            )}>
                                {log.subtext}
                            </span>
                        )}
                    </div>
                );
            })}

            {offerHistory && offerHistory.length > 0 && !isBinaryChoice && <NegotiationHistory history={offerHistory} />}
        </div>
    );
};
