/**
 * Black Market Panel
 *
 * Night phase UI for black market trading.
 * Features two tracks:
 * - Market Purchases: Limited daily requests at premium prices (110-140%)
 * - Player Sales: Any forfeit item at lower prices (60-85%)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { useBlackmarket } from '../../hooks/useBlackmarket';
import { useGame } from '../../store/GameContext';
import { Item } from '../../systems/items/types';
import { MarketPurchaseRequest } from '../../systems/blackmarket/types';
import {
  executeCounterfeitSale,
  getRandomSaleMultiplier,
  type CounterfeitSaleResult as ServiceCounterfeitResult,
} from '../../systems/blackmarket';
import { ReputationType } from '../../systems/core/types';
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
import { CounterfeitSaleModal, CounterfeitSaleResult } from './blackmarket/CounterfeitSaleModal';
import { MarketTrendBanner } from './blackmarket/MarketTrendBanner';

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

  // Counterfeit sale modal state
  const [counterfeitSale, setCounterfeitSale] = useState<{
    isOpen: boolean;
    item: Item | null;
    result: CounterfeitSaleResult | null;
    serviceResult: ServiceCounterfeitResult | null;
  }>({ isOpen: false, item: null, result: null, serviceResult: null });

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
    // Route FORGED items through counterfeit sale flow (design doc §6.5)
    if (item.workState === 'FORGED') {
      handleCounterfeitSale(item);
      return;
    }
    const price = getSalePrice(item);
    setConfirmAction({ type: 'sell_direct', item, price });
  };

  // Counterfeit sale: compute result via service, then show progress modal
  const handleCounterfeitSale = useCallback((item: Item) => {
    const underworldRep = 100 - state.reputation[ReputationType.INNOCENCE];
    const saleMultiplier = getRandomSaleMultiplier(
      state.blackmarket.daily, item.id, state.stats.day
    );
    // Counterfeit value multiplier: derive from realValue/baseValue ratio if available,
    // otherwise fall back to 1.0 (the service handles base pricing)
    const valueMultiplier = (item.baseValue && item.baseValue > 0)
      ? item.realValue / item.baseValue
      : 1.0;

    const serviceResult = executeCounterfeitSale(
      item,
      saleMultiplier,
      underworldRep,
      state.forgeryNotoriety,
      valueMultiplier
    );

    // Pre-calculate the original (unpenalized) price for display
    const originalPrice = serviceResult.detected
      ? Math.floor(serviceResult.finalPrice / 0.50)
      : serviceResult.finalPrice;

    const uiResult: CounterfeitSaleResult = {
      detected: serviceResult.detected,
      finalPrice: serviceResult.finalPrice,
      originalPrice,
      heatGain: serviceResult.heatDelta,
      credibilityLoss: Math.abs(serviceResult.reputationDelta.credibility),
      innocenceLoss: Math.abs(serviceResult.reputationDelta.innocence),
      itemName: item.name,
    };

    setCounterfeitSale({
      isOpen: true,
      item,
      result: uiResult,
      serviceResult,
    });
  }, [state.reputation, state.blackmarket.daily, state.stats.day, state.forgeryNotoriety]);

  // Complete counterfeit sale: dispatch action after progress bar finishes
  const handleCounterfeitSaleComplete = useCallback(() => {
    const { item, serviceResult } = counterfeitSale;
    if (!item || !serviceResult) return;

    dispatch({
      type: 'BLACKMARKET_COUNTERFEIT_SALE',
      payload: {
        itemId: item.id,
        itemName: item.name,
        amount: serviceResult.finalPrice,
        detected: serviceResult.detected,
        heatGain: serviceResult.heatDelta,
        credibilityLoss: serviceResult.reputationDelta.credibility,
        innocenceLoss: serviceResult.reputationDelta.innocence,
        updatedNotoriety: serviceResult.updatedNotoriety,
      },
    });

    setCounterfeitSale({ isOpen: false, item: null, result: null, serviceResult: null });
    setSelectedItemId(null);
  }, [counterfeitSale, dispatch]);

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
        <span className="flex items-center gap-2 font-mono text-[#00ff41] animate-crt-flicker">
          <Skull className="w-5 h-5" />
          <span className="tracking-wider">{'>'} BLACK_MARKET_v2.1</span>
          <HelpTooltip text="出售绝当物品获取现金。满足收购订单获得高价，直售价格较低。交易产生热度，热度过高会引来警方行动。" />
        </span>
      }
      size="xl"
      noPadding
      className="border-[#00ff41]/30 shadow-[0_0_50px_rgba(0,255,65,0.1)]"
    >
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.02),rgba(0,0,255,0.04))] bg-[length:100%_3px,6px_100%] pointer-events-none z-40 opacity-15 rounded" />
      {/* CRT Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-40 rounded" />
      <div className="flex flex-col gap-6 p-6 bg-[#0a0f0a] font-mono text-[#00ff41] relative animate-crt-flicker selection:bg-green-900 selection:text-white">
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
          <div className="bg-red-950/20 border border-red-800/50 p-4 rounded flex items-center gap-3">
            <Lock className="w-6 h-6 text-red-500" />
            <div>
              <div className="font-bold text-red-400">{'>'} CHANNEL_LOCKED</div>
              <div className="text-sm text-red-300/70">
                REOPEN_IN: {daysUntilReopen} CYCLES
              </div>
            </div>
          </div>
        )}

        {/* Today's Market Trend (#53) */}
        <MarketTrendBanner
          saleMultiplierMin={blackmarket.daily.saleMultiplierMin}
          saleMultiplierMax={blackmarket.daily.saleMultiplierMax}
        />

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
          <div className="bg-[#0a100a] border border-[#00ff41]/20 rounded p-3">
            <div className="flex items-center gap-2 text-xs text-[#00ff41]/80">
              <Skull className="w-4 h-4" />
              <span className="font-bold tracking-wider">NETWORK_LVL_{upgradeInfo.level}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-[#00ff41]/40">DAILY_CAP</div>
                <div className="text-[#00ff41]">{upgradeInfo.dailyLimit}</div>
              </div>
              <div className="text-center">
                <div className="text-[#00ff41]/40">HEAT_DECAY</div>
                <div className="text-[#00ff41]">-{upgradeInfo.heatDecay}/d</div>
              </div>
              <div className="text-center">
                <div className="text-[#00ff41]/40">PRICE_MOD</div>
                <div className={
                  upgradeInfo.priceBonusPercent > 0 ? "text-[#00ff41]" : "text-[#00ff41]/30"
                }>
                  {upgradeInfo.priceBonusPercent > 0 ? `+${upgradeInfo.priceBonusPercent}%` : '--'}
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
              <div className="px-4 py-2 bg-[#002200] text-[#00ff41] border border-[#00ff41]/30 rounded-t text-sm font-bold tracking-wider">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                {'>'} PURCHASE_ORD [{fulfilledCount}/{totalPurchaseRequests}]
              </div>
              <div className="flex-1 border border-t-0 border-[#00ff41]/20 bg-[#050a05] rounded-b p-3 overflow-y-auto max-h-[500px]">
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
                  commissionRate={commissionInfo.commission}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              <div className="px-4 py-2 bg-[#1a1200] text-amber-400 border border-amber-700/40 rounded-t text-sm font-bold tracking-wider">
                <TrendingDown className="w-4 h-4 inline mr-2" />
                {'>'} DIRECT_SALE [{sellableItems.length}]
              </div>
              <div className="flex-1 border border-t-0 border-amber-700/20 bg-[#0a0800] rounded-b p-3 overflow-y-auto max-h-[500px]">
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
                  commissionRate={commissionInfo.commission}
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

      {/* Counterfeit Sale Modal (synchronous blocking flow) */}
      <CounterfeitSaleModal
        isOpen={counterfeitSale.isOpen}
        itemName={counterfeitSale.item?.name ?? ''}
        onComplete={handleCounterfeitSaleComplete}
        result={counterfeitSale.result}
      />
    </Modal>
  );
};
