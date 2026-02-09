
import React from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '../ui/Button';

interface StolenWarningOverlayProps {
    onAccept: () => void;
    onReject: () => void;
}

export const StolenWarningOverlay: React.FC<StolenWarningOverlayProps> = ({ onAccept, onReject }) => {
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-300">
            <div className="bg-noir-200 border-2 border-amber-700/70 p-6 max-w-md w-full shadow-2xl relative flex flex-col items-center">
                {/* Warning Icon */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-amber-900/80 rounded-full flex items-center justify-center border-4 border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.5)]">
                    <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>

                {/* Title */}
                <div className="mt-8 mb-4 text-center">
                    <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest mb-1">
                        SUSPICIOUS ITEM
                    </h3>
                    <p className="text-xs text-noir-txt-muted font-mono">
                        ORIGIN VERIFICATION FAILED
                    </p>
                </div>

                {/* Warning Message */}
                <div className="bg-black/40 border border-amber-900/50 rounded p-4 mb-6 w-full">
                    <p className="font-serif text-base text-center text-noir-txt-primary leading-relaxed">
                        这件物品来路不明，<span className="text-amber-400 font-bold">可能是赃物</span>。
                    </p>
                    <p className="font-serif text-sm text-center text-noir-txt-secondary mt-2 italic">
                        收下它可能会引来警方的注意...
                    </p>
                </div>

                {/* Consequences Preview */}
                <div className="grid grid-cols-2 gap-3 w-full mb-6 text-xs">
                    <div className="bg-amber-950/30 border border-amber-900/50 rounded p-3">
                        <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                            <ShieldX className="w-4 h-4" />
                            <span>收下</span>
                        </div>
                        <p className="text-amber-300/70 text-[10px]">
                            Credibility +1
                        </p>
                        <p className="text-amber-300/70 text-[10px]">
                            可能触发警方调查
                        </p>
                    </div>
                    <div className="bg-slate-950/30 border border-slate-700/50 rounded p-3">
                        <div className="flex items-center gap-2 text-slate-400 font-bold mb-1">
                            <ShieldCheck className="w-4 h-4" />
                            <span>拒绝</span>
                        </div>
                        <p className="text-slate-300/70 text-[10px]">
                            无声誉影响
                        </p>
                        <p className="text-slate-300/70 text-[10px]">
                            客户将离开
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full">
                    <Button
                        variant="outline"
                        onClick={onReject}
                        className="flex-1 h-12 border-teal-700 text-teal-400 hover:bg-teal-900/30 hover:border-teal-500"
                    >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        REFUSE
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onAccept}
                        className="flex-1 h-12 bg-red-900/50 hover:bg-red-800/60 border-red-700"
                    >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        ACCEPT
                    </Button>
                </div>
            </div>
        </div>
    );
};
