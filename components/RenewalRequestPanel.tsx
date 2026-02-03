
import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameMachine } from '../hooks/useGameMachine';
import { Customer, RenewalProposal } from '../systems/npc/types';
import { Button } from './ui/Button';
import { CalendarClock, ArrowRight, ShieldAlert, XCircle, CheckCircle2, Package, FileText, RefreshCw } from 'lucide-react';
import { playSfx } from '../systems/game/audio';

interface RenewalRequestPanelProps {
    customer: Customer;
}

/**
 * Left panel showing the pawn ticket info for renewal requests
 */
export const RenewalTicketPanel: React.FC<{ proposal: RenewalProposal }> = ({ proposal }) => {
    return (
        <div className="h-full bg-[#1c1917] border-r border-[#44403c] flex flex-col relative overflow-hidden">
            {/* Item Display Area */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-[#0c0a09]">
                <div className="w-48 h-48 bg-stone-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-700 relative z-10">
                    <Package className="w-24 h-24 text-stone-600 opacity-50" />
                    {/* Renewal Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-amber-600 text-black font-bold text-xs px-2 py-1 rounded-full border border-amber-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        续当
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-stone-200 z-10 text-center">
                    {proposal.itemName}
                </h2>
                <div className="text-sm text-stone-500 font-mono z-10 mt-2 text-center">
                    Ticket #{proposal.itemId.slice(0, 6)}
                </div>

                <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zaDBw8PDgk8yAgBRHhOOdaaFmwAAAABJRU5ErkJggg==')] opacity-10 pointer-events-none"></div>
            </div>

            {/* Ticket Info */}
            <div className="p-6 border-t-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 relative bg-[#e7e5e4] border-stone-300 text-stone-900">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-40 pointer-events-none mix-blend-multiply"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 border-b border-current pb-2 opacity-50">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Extension Request</span>
                    </div>

                    <div className="space-y-2 font-mono text-stone-800">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Current Due Date</span>
                            <span className="font-bold text-red-600">Day {proposal.currentDueDate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Extension Request</span>
                            <span className="font-bold text-green-600">+{proposal.proposedExtensionDays} Days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Current Interest</span>
                            <span className="font-bold">{(proposal.currentInterestRate * 100).toFixed(0)}%</span>
                        </div>

                        <div className="mt-2 pt-2 flex justify-between items-center border-t border-stone-400">
                            <span className="text-sm font-black text-stone-900 uppercase">Bonus Offer</span>
                            <span className="text-2xl font-black text-amber-600 bg-black px-2 py-0.5 rounded transform rotate-[-1deg] shadow-lg">
                                +{(proposal.proposedInterestBonus * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const RenewalRequestPanel: React.FC<RenewalRequestPanelProps> = ({ customer }) => {
    const { dispatch } = useGame();
    const { send } = useGameMachine();
    const proposal = customer.renewalProposal!;

    const handleAccept = () => {
        playSfx('SUCCESS');
        // Send state machine event for phase2 sync (transaction complete)
        send({ type: 'TRANSACTION_COMPLETE' });
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
        // Send state machine event for phase2 sync (customer rejected)
        send({ type: 'CUSTOMER_REJECTED' });
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
