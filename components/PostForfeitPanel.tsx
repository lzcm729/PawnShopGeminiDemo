
import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameMachine } from '../hooks/useGameMachine';
import { Customer, PostForfeitVariant } from '../systems/npc/types';
import { Button } from './ui/Button';
import { Heart, DollarSign, XCircle, HandHeart, Flame, Frown } from 'lucide-react';
import { playSfx } from '../systems/game/audio';
import { GAME_CONFIG } from '../systems/game/config';
import { cn } from '../lib/utils';

// #23: Variant-specific styling and default dialogue
const VARIANT_CONFIG: Record<PostForfeitVariant, {
    borderAccent: string;
    headerAccent: string;
    bgAccent: string;
    defaultPlea: string;
    headerLabel: string;
}> = {
    pleading: {
        borderAccent: 'border-stone-700',
        headerAccent: 'text-stone-300',
        bgAccent: '',
        defaultPlea: '我知道这东西已经归你了... 但它对我真的有特殊意义。',
        headerLabel: '绝当回购请求',
    },
    angry: {
        borderAccent: 'border-red-800',
        headerAccent: 'text-red-400',
        bgAccent: 'bg-red-950/10',
        defaultPlea: '你就是个骗子！那是我的东西！你不能就这么占为己有！',
        headerLabel: '绝当回购请求 - 激愤',
    },
    resigned: {
        borderAccent: 'border-stone-600',
        headerAccent: 'text-stone-500',
        bgAccent: 'bg-stone-950/20',
        defaultPlea: '算了... 我知道没什么用。但我还是想来试试。',
        headerLabel: '绝当回购请求 - 无奈',
    },
};

interface PostForfeitPanelProps {
    customer: Customer;
}

export const PostForfeitPanel: React.FC<PostForfeitPanelProps> = ({ customer }) => {
    const { dispatch } = useGame();
    const { send } = useGameMachine();
    const item = customer.item;

    // #23: Determine variant (default to pleading for backward compatibility)
    const variant: PostForfeitVariant = customer.postForfeitVariant || 'pleading';
    const variantConfig = VARIANT_CONFIG[variant];

    // Calculate values
    // Sell Low: Break even (real value or principal)
    const principal = item.pawnInfo?.principal || 0;
    const lowPrice = Math.floor(principal * GAME_CONFIG.ECONOMY.RESALE_PREMIUM); // Small profit to cover ops

    const handleSellLow = () => {
        // Send state machine event for phase2 sync (transaction complete)
        send({ type: 'TRANSACTION_COMPLETE' });
        dispatch({
            type: 'RESOLVE_POST_FORFEIT',
            payload: { itemId: item.id, action: 'SELL_LOW', name: customer.name, value: lowPrice }
        });
    };

    const handleGift = () => {
        // Send state machine event for phase2 sync (transaction complete)
        send({ type: 'TRANSACTION_COMPLETE' });
        dispatch({
            type: 'RESOLVE_POST_FORFEIT',
            payload: { itemId: item.id, action: 'GIFT', name: customer.name, value: 0 }
        });
    };

    const handleRefuse = () => {
        // Send state machine event for phase2 sync (customer rejected)
        send({ type: 'CUSTOMER_REJECTED' });
        dispatch({
            type: 'RESOLVE_POST_FORFEIT',
            payload: { itemId: item.id, action: 'REFUSE', name: customer.name, value: 0 }
        });
    };

    return (
        <div className="h-full bg-noir-200 border-l border-noir-400 p-6 flex flex-col justify-center items-center">

            <div className={cn(
                "w-full max-w-md bg-stone-900 border p-6 rounded shadow-xl relative overflow-hidden",
                variantConfig.borderAccent,
                variantConfig.bgAccent
            )}>
                {/* #23: Variant-specific header accent */}
                <div className={cn("flex items-center justify-center gap-2 mb-6 border-b pb-4", variantConfig.borderAccent)}>
                    {variant === 'angry' && <Flame className="w-5 h-5 text-red-500" />}
                    {variant === 'resigned' && <Frown className="w-5 h-5 text-stone-500" />}
                    <span className={cn("text-lg font-bold tracking-widest uppercase", variantConfig.headerAccent)}>
                        {variantConfig.headerLabel}
                    </span>
                </div>

                <div className="text-center mb-8 space-y-4">
                    <p className={cn(
                        "font-serif italic text-sm",
                        variant === 'angry' ? 'text-red-400' :
                        variant === 'resigned' ? 'text-stone-500' :
                        'text-stone-400'
                    )}>
                        "{customer.dialogue.redemptionPlea || variantConfig.defaultPlea}"
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
