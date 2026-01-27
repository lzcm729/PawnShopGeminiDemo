
import React from 'react';
import { ExpiryEvent, ExpiryChoice } from '../types';
import { useGame } from '../store/GameContext';

interface ExpiryEventModalProps {
    event: ExpiryEvent;
    onResolve: (choice: ExpiryChoice) => void;
}

export const ExpiryEventModal: React.FC<ExpiryEventModalProps> = ({ event, onResolve }) => {
    const { behavior, itemName, npcName, redemptionCost, isCoreItem } = event;

    const renderSceneDescription = (): JSX.Element => {
        switch (behavior) {
            case 'REDEEM':
                return (
                    <div className="space-y-2">
                        <p className="text-gray-300">
                            <span className="text-pawn-accent font-semibold">{npcName}</span> 推门而入，手里攥着一叠钞票。
                        </p>
                        <p className="text-gray-400 italic">
                            "老板，我凑够钱了。<span className="text-white">{itemName}</span> 可以拿回去了吗？"
                        </p>
                    </div>
                );
            case 'RENEW':
                return (
                    <div className="space-y-2">
                        <p className="text-gray-300">
                            <span className="text-pawn-accent font-semibold">{npcName}</span> 低着头走进店里，神情有些局促。
                        </p>
                        <p className="text-gray-400 italic">
                            "老板，我... 现在还凑不够赎金。能不能再宽限几天？利息我先付着。"
                        </p>
                        {isCoreItem && (
                            <p className="text-yellow-500 text-sm mt-2">
                                * 这件物品对{npcName}很重要
                            </p>
                        )}
                    </div>
                );
            case 'NO_SHOW':
                return (
                    <div className="space-y-2">
                        <p className="text-gray-300">
                            今天是 <span className="text-white font-semibold">{itemName}</span> 的到期日。
                        </p>
                        <p className="text-gray-400">
                            你等了一整天，但 <span className="text-pawn-accent">{npcName}</span> 始终没有出现。
                        </p>
                        {isCoreItem && (
                            <p className="text-red-400 text-sm mt-2">
                                * 这是{npcName}的重要物品，处置需谨慎
                            </p>
                        )}
                    </div>
                );
        }
    };

    const renderCostInfo = (): JSX.Element | null => {
        if (behavior === 'NO_SHOW') return null;

        return (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm text-gray-400 mb-2">费用明细</h4>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">本金</span>
                        <span className="text-white">${redemptionCost.principal}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">利息</span>
                        <span className="text-white">${redemptionCost.interest}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-600">
                        <span className="text-gray-300 font-semibold">合计</span>
                        <span className="text-pawn-green font-bold">${redemptionCost.total}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlayerOptions = (): JSX.Element => {
        switch (behavior) {
            case 'REDEEM':
                return (
                    <div className="space-y-2">
                        <button
                            className="w-full py-3 px-4 bg-pawn-green/20 hover:bg-pawn-green/30 border border-pawn-green/50 rounded-lg text-pawn-green transition-colors text-left"
                            onClick={() => onResolve('redeem_accept')}
                        >
                            <div className="font-semibold">正常赎回</div>
                            <div className="text-sm text-pawn-green/70">收取 ${redemptionCost.total}，归还物品</div>
                        </button>
                        <button
                            className="w-full py-3 px-4 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 rounded-lg text-yellow-500 transition-colors text-left"
                            onClick={() => onResolve('redeem_extra')}
                        >
                            <div className="font-semibold">要求额外费用</div>
                            <div className="text-sm text-yellow-500/70">+20% 保管费 (${Math.ceil(redemptionCost.total * 0.2)})</div>
                        </button>
                        <button
                            className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 transition-colors text-left"
                            onClick={() => onResolve('redeem_refuse')}
                        >
                            <div className="font-semibold">拒绝赎回</div>
                            <div className="text-sm text-red-400/70">物品已被预定/出售 (声誉大幅下降)</div>
                        </button>
                    </div>
                );

            case 'RENEW':
                return (
                    <div className="space-y-2">
                        <button
                            className="w-full py-3 px-4 bg-pawn-green/20 hover:bg-pawn-green/30 border border-pawn-green/50 rounded-lg text-pawn-green transition-colors text-left"
                            onClick={() => onResolve('renew_accept')}
                        >
                            <div className="font-semibold">同意续当</div>
                            <div className="text-sm text-pawn-green/70">延长 7 天，利息继续计算</div>
                        </button>
                        <button
                            className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 transition-colors text-left"
                            onClick={() => onResolve('renew_refuse')}
                        >
                            <div className="font-semibold">拒绝续当</div>
                            <div className="text-sm text-red-400/70">物品立即转为绝当</div>
                        </button>
                    </div>
                );

            case 'NO_SHOW':
                return (
                    <div className="space-y-2">
                        <button
                            className="w-full py-3 px-4 bg-pawn-accent/20 hover:bg-pawn-accent/30 border border-pawn-accent/50 rounded-lg text-pawn-accent transition-colors text-left"
                            onClick={() => onResolve('noshow_sell')}
                        >
                            <div className="font-semibold">挂牌出售</div>
                            <div className="text-sm text-pawn-accent/70">变现回收资金</div>
                        </button>
                        <button
                            className="w-full py-3 px-4 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50 rounded-lg text-gray-300 transition-colors text-left"
                            onClick={() => onResolve('noshow_keep')}
                        >
                            <div className="font-semibold">继续保留</div>
                            <div className="text-sm text-gray-400">等待顾客可能的回头</div>
                        </button>
                    </div>
                );
        }
    };

    const getTitle = (): string => {
        switch (behavior) {
            case 'REDEEM':
                return `${npcName} 来赎回物品`;
            case 'RENEW':
                return `${npcName} 请求续当`;
            case 'NO_SHOW':
                return `物品到期：${itemName}`;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-pawn-dark border border-pawn-accent/30 rounded-xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">
                            {behavior === 'REDEEM' && '💰'}
                            {behavior === 'RENEW' && '🔄'}
                            {behavior === 'NO_SHOW' && '⏰'}
                        </span>
                        <h2 className="text-xl font-bold text-white">{getTitle()}</h2>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Day {event.dueDate} 到期</p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                    {/* Scene Description */}
                    <div className="py-2">
                        {renderSceneDescription()}
                    </div>

                    {/* Cost Info */}
                    {renderCostInfo()}

                    {/* Player Options */}
                    <div className="pt-2">
                        {renderPlayerOptions()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpiryEventModal;
