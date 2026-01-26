
import React from 'react';
import { useGame } from '../store/GameContext';
import { Customer } from '../systems/npc/types';
import { Button } from './ui/Button';
import { Heart, DollarSign, XCircle, HandHeart } from 'lucide-react';
import { playSfx } from '../systems/game/audio';

interface PostForfeitPanelProps {
    customer: Customer;
}

export const PostForfeitPanel: React.FC<PostForfeitPanelProps> = ({ customer }) => {
    const { dispatch } = useGame();
    const item = customer.item;
    
    // Calculate values
    // Sell Low: Break even (real value or principal)
    const principal = item.pawnInfo?.principal || 0;
    const lowPrice = Math.floor(principal * 1.1); // Small profit to cover ops
    
    const handleSellLow = () => {
        dispatch({ 
            type: 'RESOLVE_POST_FORFEIT', 
            payload: { itemId: item.id, action: 'SELL_LOW', name: customer.name, value: lowPrice } 
        });
    };

    const handleGift = () => {
        dispatch({ 
            type: 'RESOLVE_POST_FORFEIT', 
            payload: { itemId: item.id, action: 'GIFT', name: customer.name, value: 0 } 
        });
    };

    const handleRefuse = () => {
        dispatch({ 
            type: 'RESOLVE_POST_FORFEIT', 
            payload: { itemId: item.id, action: 'REFUSE', name: customer.name, value: 0 } 
        });
    };

    return (
        <div className="h-full bg-noir-200 border-l border-noir-400 p-6 flex flex-col justify-center items-center">
            
            <div className="w-full max-w-md bg-stone-900 border border-stone-700 p-6 rounded shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 mb-6 text-stone-300 border-b border-stone-700 pb-4">
                    <span className="text-lg font-bold tracking-widest uppercase">绝当回购请求</span>
                </div>

                <div className="text-center mb-8 space-y-4">
                    <p className="text-stone-400 font-serif italic text-sm">
                        "{customer.dialogue.redemptionPlea || "我知道这东西已经归你了... 但它对我真的有特殊意义。"}"
                    </p>
                    
                    <div className="bg-black/30 p-3 rounded border border-stone-800 text-xs font-mono text-stone-500">
                        <div className="flex justify-between mb-1">
                            <span>ITEM STATUS</span>
                            <span className="text-red-500 font-bold">SHOP PROPERTY (FORFEIT)</span>
                        </div>
                        <div className="flex justify-between">
                            <span>ORIGINAL DEBT</span>
                            <span>${principal}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Button 
                        variant="secondary" 
                        onClick={handleSellLow}
                        className="h-14 flex justify-between items-center px-4 hover:border-amber-500 hover:text-amber-500"
                    >
                        <span className="flex items-center gap-2 font-bold"><DollarSign className="w-4 h-4"/> 成本价回售</span>
                        <div className="flex flex-col items-end">
                            <span className="text-lg font-mono">${lowPrice}</span>
                            <span className="text-[9px] uppercase opacity-70">Small Profit / Human+</span>
                        </div>
                    </Button>

                    <Button 
                        variant="primary" 
                        onClick={handleGift}
                        className="h-14 flex justify-between items-center px-4 bg-rose-900/30 border-rose-800 text-rose-400 hover:bg-rose-900/50 hover:border-rose-500"
                    >
                        <span className="flex items-center gap-2 font-bold"><HandHeart className="w-4 h-4"/> 赠予 (Charity)</span>
                        <div className="flex flex-col items-end">
                            <span className="text-lg font-mono">FREE</span>
                            <span className="text-[9px] uppercase opacity-70">Humanity+++ / Credibility-</span>
                        </div>
                    </Button>
                    
                    <Button 
                        variant="danger" 
                        onClick={handleRefuse}
                        className="h-12 mt-2 bg-stone-800 border-stone-600 text-stone-400 hover:bg-stone-700 hover:text-white"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <XCircle className="w-4 h-4" /> 拒绝 (Business is Business)
                        </span>
                    </Button>
                </div>
            </div>

        </div>
    );
};
