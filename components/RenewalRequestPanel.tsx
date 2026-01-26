
import React from 'react';
import { useGame } from '../store/GameContext';
import { Customer } from '../systems/npc/types';
import { Button } from './ui/Button';
import { CalendarClock, ArrowRight, ShieldAlert, XCircle, CheckCircle2 } from 'lucide-react';
import { playSfx } from '../systems/game/audio';

interface RenewalRequestPanelProps {
    customer: Customer;
}

export const RenewalRequestPanel: React.FC<RenewalRequestPanelProps> = ({ customer }) => {
    const { dispatch } = useGame();
    const proposal = customer.renewalProposal!;
    
    const handleAccept = () => {
        playSfx('SUCCESS');
        dispatch({ 
            type: 'ACCEPT_RENEWAL', 
            payload: { 
                itemId: proposal.itemId,
                extensionDays: proposal.proposedExtensionDays,
                interestBonus: proposal.proposedInterestBonus,
                name: customer.name
            } 
        });
    };

    const handleReject = () => {
        playSfx('CLICK');
        dispatch({ 
            type: 'REJECT_RENEWAL', 
            payload: { 
                itemId: proposal.itemId,
                name: customer.name 
            } 
        });
    };

    return (
        <div className="h-full bg-noir-200 border-l border-noir-400 p-6 flex flex-col justify-center items-center">
            
            <div className="w-full max-w-md bg-stone-900 border border-stone-700 p-6 rounded shadow-xl relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-6 text-stone-300 border-b border-stone-700 pb-4">
                    <CalendarClock className="w-6 h-6 text-amber-500" />
                    <span className="text-lg font-bold tracking-widest uppercase">续当请求 (Extension)</span>
                </div>

                {/* Proposal Details */}
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-sm font-mono text-stone-400">
                        <span>标的物</span>
                        <span className="text-white font-bold">{proposal.itemName}</span>
                    </div>
                    
                    <div className="bg-black/30 p-4 rounded border border-stone-800 space-y-3">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-stone-500 uppercase">Current Due Date</span>
                            <span className="text-red-400">Day {proposal.currentDueDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-stone-500 uppercase">Proposed Extension</span>
                            <span className="text-green-400 font-bold">+{proposal.proposedExtensionDays} Days</span>
                        </div>
                        <div className="border-t border-stone-700 my-2"></div>
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-stone-500 uppercase">Current Interest</span>
                            <span>{(proposal.currentInterestRate * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-stone-500 uppercase">Penalty Interest Offer</span>
                            <span className="text-amber-500 font-bold">+{(proposal.proposedInterestBonus * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-xs text-stone-500 italic">"只要再给我一周时间，我愿意多付利息。"</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 gap-3">
                    <Button 
                        variant="primary" 
                        onClick={handleAccept}
                        className="h-14 text-sm font-bold tracking-widest"
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> 接受提案 (Accept)
                    </Button>
                    
                    <Button 
                        variant="secondary" 
                        onClick={handleReject}
                        className="h-12 text-xs text-stone-500 hover:text-red-500 hover:border-red-900 border-stone-800"
                    >
                        <XCircle className="w-4 h-4 mr-2" /> 拒绝 (Let it expire)
                    </Button>
                </div>
            </div>

        </div>
    );
};
