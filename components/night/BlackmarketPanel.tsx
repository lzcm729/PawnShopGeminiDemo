/**
 * Black Market Panel
 *
 * Night phase UI for black market trading.
 * Features two tracks:
 * - Market Purchases: Limited daily requests at premium prices (110-140%)
 * - Player Sales: Any forfeit item at lower prices (60-85%)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { useBlackmarket } from '../../hooks/useBlackmarket';
import { useGame } from '../../store/GameContext';
import { Item } from '../../systems/items/types';
import { MarketPurchaseRequest } from '../../systems/blackmarket/types';
import {
  Skull,
  Lock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { HeatIndicator } from './blackmarket/HeatIndicator';
import { CommissionIndicator } from './blackmarket/CommissionIndicator';
import { PurchaseTab } from './blackmarket/PurchaseTab';
import { SaleTab } from './blackmarket/SaleTab';
import { RiskEventBanner } from './blackmarket/RiskEventBanner';
import { TodaySalesSummary } from './blackmarket/TodaySalesSummary';
import { ProtectionFeePanel } from './blackmarket/ProtectionFeePanel';
import { LowHeatRewardBanner } from './blackmarket/LowHeatRewardBanner';
import { ConfirmDialog } from './blackmarket/ConfirmDialog';

interface BlackmarketPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BlackmarketPanel: React.FC<BlackmarketPanelProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useGame();
  const {
    blackmarket,
    heatInfo,
    commissionInfo,
    isMarketOpen,
    daysUntilReopen,
    canPurchase,
    remainingPurchaseSlots,
    fulfilledCount,
    totalPurchaseRequests,
    upgradeInfo,
    marketIndicators,
    lowHeatReward,
    protectionFeeInfo,
    getEligibleItems,
    getSellableItems,
    hasUnfulfilledPurchaseMatch,
    checkBreach,
    getCompensation,
    getProfit,
    getPurchasePrice,
    getSalePrice,
    getSalePriceRange,
    sellToPurchase,
    sellDirect,
    payFine,
    acceptLockdown,
  } = useBlackmarket();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'sell_purchase' | 'sell_direct' | 'pay_fine' | 'accept_lockdown';
    item?: Item;
    request?: MarketPurchaseRequest;
    price?: number;
  } | null>(null);

  // Get sellable items
  const sellableItems = useMemo(() => getSellableItems(), [getSellableItems]);

  // Auto-select item from pending selection when panel opens
  useEffect(() => {
    if (isOpen && state.pendingSelectedItemId) {
      // Check if the pending item exists in sellable items
      const existsInSellable = sellableItems.some(
        item => item.id === state.pendingSelectedItemId
      );
      if (existsInSellable) {
        setSelectedItemId(state.pendingSelectedItemId);
      }
      // Clear the pending selection
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: null });
    }
  }, [isOpen, state.pendingSelectedItemId, sellableItems, dispatch]);

  // Handle risk event response
  const hasRiskEvent = blackmarket.lastRiskEvent !== null;
  const riskEvent = blackmarket.lastRiskEvent;

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleSellToPurchase = (item: Item, request: MarketPurchaseRequest) => {
    const price = getPurchasePrice(item, request);
    setConfirmAction({ type: 'sell_purchase', item, request, price });
  };

  const handleSellDirect = (item: Item) => {
    const price = getSalePrice(item);
    setConfirmAction({ type: 'sell_direct', item, price });
  };

  const handlePayFine = () => {
    if (riskEvent?.penalty) {
      setConfirmAction({ type: 'pay_fine', price: riskEvent.penalty });
    }
  };

  const handleAcceptLockdown = () => {
    if (riskEvent?.lockDays) {
      setConfirmAction({ type: 'accept_lockdown' });
    }
  };

  // Protection fee handlers
  const handlePayProtectionFee = () => {
    if (protectionFeeInfo.currentAmount > 0 && state.stats.cash >= protectionFeeInfo.currentAmount) {
      dispatch({ type: 'BLACKMARKET_PAY_PROTECTION_FEE', payload: { amount: protectionFeeInfo.currentAmount } });
    }
  };

  const handleRefuseProtectionFee = () => {
    dispatch({ type: 'BLACKMARKET_REFUSE_PROTECTION_FEE' });
  };

  const executeConfirmAction = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'sell_purchase':
        if (confirmAction.item && confirmAction.request) {
          sellToPurchase(confirmAction.item, confirmAction.request);
        }
        break;
      case 'sell_direct':
        if (confirmAction.item) {
          sellDirect(confirmAction.item);
        }
        break;
      case 'pay_fine':
        if (confirmAction.price) {
          payFine(confirmAction.price);
        }
        break;
      case 'accept_lockdown':
        if (riskEvent?.lockDays) {
          acceptLockdown(riskEvent.lockDays);
        }
        break;
    }

    setConfirmAction(null);
    setSelectedItemId(null);
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Skull className="w-5 h-5" />
          黑市 (Black Market)
          <HelpTooltip text="出售绝当物品获取现金。满足收购订单获得高价，直售价格较低。交易产生热度，热度过高会引来警方行动。" />
        </span>
      }
      size="xl"
    >
      <div className="flex flex-col gap-6">
        {/* Risk Event Banner */}
        {hasRiskEvent && riskEvent && (
          <RiskEventBanner
            event={riskEvent}
            onPayFine={handlePayFine}
            onAcceptLockdown={handleAcceptLockdown}
          />
        )}

        {/* Market Locked Banner */}
        {!isMarketOpen && !hasRiskEvent && (
          <div className="bg-red-950/30 border border-red-800 p-4 rounded flex items-center gap-3">
            <Lock className="w-6 h-6 text-red-500" />
            <div>
              <div className="font-bold text-red-400">黑市已关闭</div>
              <div className="text-sm text-red-300/70">
                {daysUntilReopen} 天后重新开放
              </div>
            </div>
          </div>
        )}

        {/* Heat & Reputation Status */}
        <div className="grid grid-cols-2 gap-4">
          <HeatIndicator heatInfo={heatInfo} heatDecay={upgradeInfo.heatDecay} />
          <CommissionIndicator commissionInfo={commissionInfo} />
        </div>

        {/* UI-6: Low Heat Reward Banner */}
        {lowHeatReward.rewardActive && lowHeatReward.rewardType && (
          <LowHeatRewardBanner rewardType={lowHeatReward.rewardType} consecutiveDays={lowHeatReward.consecutiveSafeDays} />
        )}

        {/* UI-5: Protection Fee Panel */}
        {protectionFeeInfo.shouldRequest && (
          <ProtectionFeePanel
            currentAmount={protectionFeeInfo.currentAmount}
            timesPaid={protectionFeeInfo.timesPaid}
            inCooldown={protectionFeeInfo.inCooldown}
            onPay={handlePayProtectionFee}
            onRefuse={handleRefuseProtectionFee}
            canAfford={state.stats.cash >= protectionFeeInfo.currentAmount}
          />
        )}

        {/* Upgrade Effects Display */}
        {upgradeInfo.level > 0 && (
          <div className="bg-purple-950/30 border border-purple-800 rounded p-3">
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Skull className="w-4 h-4" />
              <span className="font-bold">黑市联络网 Lv{upgradeInfo.level}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-stone-500">每日收购</div>
                <div className="font-mono text-purple-400">{upgradeInfo.dailyLimit} 件</div>
              </div>
              <div className="text-center">
                <div className="text-stone-500">热度衰减</div>
                <div className="font-mono text-purple-400">-{upgradeInfo.heatDecay}/天</div>
              </div>
              <div className="text-center">
                <div className="text-stone-500">收购价加成</div>
                <div className={
                  upgradeInfo.priceBonusPercent > 0 ? "font-mono text-green-400" : "font-mono text-stone-500"
                }>
                  {upgradeInfo.priceBonusPercent > 0 ? `+${upgradeInfo.priceBonusPercent}%` : '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Layout: Purchase & Sale */}
        {isMarketOpen && !hasRiskEvent && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="flex flex-col">
              <div className="px-4 py-2 bg-green-900/50 text-green-400 border border-green-700 rounded-t text-sm font-bold">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                今日收购 ({fulfilledCount}/{totalPurchaseRequests})
              </div>
              <div className="flex-1 border border-t-0 border-green-900 rounded-b p-3 overflow-y-auto max-h-[500px]">
                <PurchaseTab
                  requests={blackmarket.daily.purchaseRequests}
                  getEligibleItems={getEligibleItems}
                  getPurchasePrice={getPurchasePrice}
                  checkBreach={checkBreach}
                  getCompensation={getCompensation}
                  onSell={handleSellToPurchase}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  marketIndicators={marketIndicators}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              <div className="px-4 py-2 bg-amber-900/50 text-amber-400 border border-amber-700 rounded-t text-sm font-bold">
                <TrendingDown className="w-4 h-4 inline mr-2" />
                自由出售 ({sellableItems.length})
              </div>
              <div className="flex-1 border border-t-0 border-amber-900 rounded-b p-3 overflow-y-auto max-h-[500px]">
                <SaleTab
                  items={sellableItems}
                  getSalePrice={getSalePrice}
                  checkBreach={checkBreach}
                  getCompensation={getCompensation}
                  getProfit={getProfit}
                  hasUnfulfilledPurchaseMatch={hasUnfulfilledPurchaseMatch}
                  onSell={handleSellDirect}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Today's Sales Summary */}
        {blackmarket.todaySales.length > 0 && (
          <TodaySalesSummary sales={blackmarket.todaySales} />
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          checkBreach={checkBreach}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </Modal>
  );
};
