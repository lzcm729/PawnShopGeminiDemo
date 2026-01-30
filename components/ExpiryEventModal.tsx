
import React from 'react';
import { ExpiryEvent, ExpiryChoice } from '../types';

interface ExpiryEventModalProps {
    event: ExpiryEvent;
    onResolve: (choice: ExpiryChoice) => void;
}

// 结算节点只处理 REDEEM 和 RENEW 场景
// NO_SHOW 场景不触发结算节点，物品自动绝当
export const ExpiryEventModal: React.FC<ExpiryEventModalProps> = ({ event, onResolve }) => {
    const { behavior, itemName, npcName, redemptionCost, isCoreItem, valuation, interestRate } = event;

    // 计算金额
    const compensationAmount = Math.ceil(valuation * 2);  // 200% 赔偿金
    const renewalInterest = Math.ceil(redemptionCost.principal * interestRate);  // 续当利息

    const renderSceneDescription = (): React.ReactNode => {
        if (behavior === 'REDEEM') {
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
        }
        // RENEW
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
    };

    const renderCostInfo = (): React.ReactNode => {
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

    const renderPlayerOptions = (): React.ReactNode => {
        if (behavior === 'REDEEM') {
            return (
                <div className="space-y-2">
                    <button
                        className="w-full py-3 px-4 bg-pawn-green/20 hover:bg-pawn-green/30 border border-pawn-green/50 rounded-lg text-pawn-green transition-colors text-left"
                        onClick={() => onResolve('redeem_accept')}
                    >
                        <div className="font-semibold">同意赎回</div>
                        <div className="text-sm text-pawn-green/70">收取 ${redemptionCost.total}，归还物品</div>
                    </button>
                    <button
                        className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 transition-colors text-left"
                        onClick={() => onResolve('redeem_refuse')}
                    >
                        <div className="font-semibold">拒绝赎回 (违约)</div>
                        <div className="text-sm text-red-400/70">物品已售，需支付 200% 赔偿金 ${compensationAmount}</div>
                    </button>
                </div>
            );
        }
        // RENEW
        return (
            <div className="space-y-2">
                <button
                    className="w-full py-3 px-4 bg-pawn-green/20 hover:bg-pawn-green/30 border border-pawn-green/50 rounded-lg text-pawn-green transition-colors text-left"
                    onClick={() => onResolve('renew_accept')}
                >
                    <div className="font-semibold">同意续当</div>
                    <div className="text-sm text-pawn-green/70">收取利息 ${renewalInterest}，延长 7 天</div>
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
    };

    const getTitle = (): string => {
        return behavior === 'REDEEM'
            ? `${npcName} 来赎回物品`
            : `${npcName} 请求续当`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-pawn-dark border border-pawn-accent/30 rounded-xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">
                            {behavior === 'REDEEM' ? '💰' : '🔄'}
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
