
import React from 'react';
import { OfferRecord, NegotiationStatus } from '../hooks/useNegotiation';
import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRateDisplay } from './ui/RateDisplayContext';

interface NegotiationHistoryProps {
    history: OfferRecord[];
}

const getStatusColor = (status: NegotiationStatus, patienceCost: number = 0) => {
    switch (status) {
        case 'ACCEPTED': return 'text-green-500';
        case 'INSULT': return 'text-red-500';
        case 'PRINCIPAL_TOO_LOW': return 'text-amber-500';
        case 'TOTAL_REPAYMENT_EXCEEDED': return 'text-purple-400';
        case 'COUNTER': return patienceCost > 0 ? 'text-amber-400' : 'text-blue-400';
        default: return 'text-stone-500';
    }
};

const getStatusText = (status: NegotiationStatus) => {
    switch (status) {
        case 'ACCEPTED': return 'ACCEPTED';
        case 'INSULT': return 'INSULT';
        case 'PRINCIPAL_TOO_LOW': return 'LOWBALL';
        case 'TOTAL_REPAYMENT_EXCEEDED': return 'REPAYMENT';
        case 'COUNTER': return 'COUNTER';
        default: return 'FAILED';
    }
};

export const NegotiationHistory: React.FC<NegotiationHistoryProps> = ({ history }) => {
    const { formatRate, unitLabel } = useRateDisplay();

    if (history.length === 0) return null;

    return (
        <div className="mt-4 border-t-2 border-dotted border-noir-400 pt-2 opacity-80">
            <div className="flex items-center gap-2 text-[10px] text-noir-txt-muted font-mono uppercase tracking-widest mb-2">
                <Clock className="w-3 h-3" />
                <span>Transaction Log</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
                {history.map((record) => (
                    <div key={record.timestamp} className="flex justify-between items-center bg-black/20 px-2 py-1 rounded border border-transparent hover:border-noir-400 transition-colors">
                        <div className="flex items-center gap-2 text-noir-txt-secondary">
                            <span>${record.amount}</span>
                            <span className="text-[10px] bg-noir-300 px-1 rounded text-noir-txt-muted">
                                {formatRate(record.rate)}{unitLabel}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <ArrowRight className="w-3 h-3 text-noir-500" />
                             <span className={cn("font-bold uppercase text-[10px]", getStatusColor(record.status, record.patienceCost))}>
                                {getStatusText(record.status)}
                             </span>
                             {record.patienceCost > 0 && (
                                 <span className={cn(
                                     "font-bold text-[10px]",
                                     record.status === 'COUNTER' ? "text-amber-500" : "text-red-600"
                                 )}>
                                     {record.status === 'COUNTER' ? `[-${record.patienceCost} STRESS]` : `[-${record.patienceCost} HP]`}
                                 </span>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
