
import React from 'react';
import { OfferRecord, NegotiationStatus } from '../hooks/useNegotiation';
import { Clock } from 'lucide-react';

interface NegotiationHistoryProps {
    history: OfferRecord[];
}

const getStatusColor = (status: NegotiationStatus) => {
    switch (status) {
        case 'ACCEPTED': return 'text-green-500';
        case 'INSULT': return 'text-red-500';
        case 'PRINCIPAL_TOO_LOW': return 'text-orange-400';
        case 'INTEREST_TOO_HIGH': return 'text-purple-400';
        case 'RATE_MISMATCH': return 'text-yellow-500';
        default: return 'text-stone-500';
    }
};

const getStatusText = (status: NegotiationStatus) => {
    switch (status) {
        case 'ACCEPTED': return '成交';
        case 'INSULT': return '侮辱性报价';
        case 'PRINCIPAL_TOO_LOW': return '本金过低';
        case 'INTEREST_TOO_HIGH': return '利息过高';
        case 'RATE_MISMATCH': return '本利不匹配';
        default: return '失败';
    }
};

export const NegotiationHistory: React.FC<NegotiationHistoryProps> = ({ history }) => {
    if (history.length === 0) return null;

    return (
        <div className="bg-[#0c0a09] border border-stone-800 p-2 rounded mb-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-1 text-[10px] text-stone-600 font-mono uppercase tracking-widest mb-1 border-b border-stone-800/50 pb-0.5">
                <Clock className="w-3 h-3" />
                <span>报价历史 (History)</span>
            </div>
            <div className="space-y-1">
                {history.map((record) => (
                    <div key={record.timestamp} className="flex justify-between items-center text-xs font-mono">
                        <span className="text-stone-300">
                            ${record.amount} <span className="text-stone-500">({record.rate * 100}%)</span>
                        </span>
                        <div className="flex gap-2">
                             <span className={getStatusColor(record.status)}>
                                {getStatusText(record.status)}
                             </span>
                             {record.patienceCost > 0 && (
                                 <span className="text-red-500 font-bold">-{record.patienceCost} 耐心</span>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
