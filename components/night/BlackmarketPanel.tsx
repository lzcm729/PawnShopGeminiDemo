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
import { Button } from '../ui/Button';
import { useBlackmarket } from '../../hooks/useBlackmarket';
import { useGame } from '../../store/GameContext';
import { cn } from '../../lib/utils';
import { Item } from '../../systems/items/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import { getItemIcon } from '../../systems/assets';
import { MarketPurchaseRequest } from '../../systems/blackmarket/types';
import { TAG_DEFINITIONS } from '../../systems/items/tagData';
import { getDisplayName } from '../../systems/items/tagUtils';
import {
  Skull,
  AlertTriangle,
  Lock,
  Tag,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Banknote,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { UNDERWORLD_COMMISSION_TIERS } from '../../systems/blackmarket/types';

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
    getEligibleItems,
    getSellableItems,
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

  const [selectedTab, setSelectedTab] = useState<'purchase' | 'sale'>('purchase');
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
        // Switch to sale tab since the item is sellable
        setSelectedTab('sale');
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
          <HeatIndicator heatInfo={heatInfo} />
          <CommissionIndicator commissionInfo={commissionInfo} />
        </div>

        {/* Tab Selector */}
        {isMarketOpen && !hasRiskEvent && (
          <>
            <div className="flex gap-2 border-b border-noir-400 pb-2">
              <button
                onClick={() => setSelectedTab('purchase')}
                className={cn(
                  'px-4 py-2 rounded-t text-sm font-bold transition-colors',
                  selectedTab === 'purchase'
                    ? 'bg-green-900/50 text-green-400 border border-green-700 border-b-0'
                    : 'text-stone-500 hover:text-stone-300'
                )}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                今日收购 ({remainingPurchaseSlots}/{blackmarket.daily.purchaseLimit})
              </button>
              <button
                onClick={() => setSelectedTab('sale')}
                className={cn(
                  'px-4 py-2 rounded-t text-sm font-bold transition-colors',
                  selectedTab === 'sale'
                    ? 'bg-amber-900/50 text-amber-400 border border-amber-700 border-b-0'
                    : 'text-stone-500 hover:text-stone-300'
                )}
              >
                <TrendingDown className="w-4 h-4 inline mr-2" />
                自由出售 ({sellableItems.length})
              </button>
            </div>

            {/* Tab Content */}
            {selectedTab === 'purchase' ? (
              <PurchaseTab
                requests={blackmarket.daily.purchaseRequests}
                canPurchase={canPurchase}
                remainingSlots={remainingPurchaseSlots}
                getEligibleItems={getEligibleItems}
                getPurchasePrice={getPurchasePrice}
                checkBreach={checkBreach}
                onSell={handleSellToPurchase}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
              />
            ) : (
              <SaleTab
                items={sellableItems}
                getSalePrice={getSalePrice}
                checkBreach={checkBreach}
                getCompensation={getCompensation}
                getProfit={getProfit}
                onSell={handleSellDirect}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
              />
            )}
          </>
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

// ============================================================================
// Sub-components
// ============================================================================

interface HeatIndicatorProps {
  heatInfo: {
    level: string;
    heat: number;
    riskPercent: number;
    displayName: string;
    description: string;
  };
}

const HeatIndicator: React.FC<HeatIndicatorProps> = ({ heatInfo }) => {
  const levelColors: Record<string, string> = {
    SAFE: 'text-green-500 border-green-700 bg-green-950/30',
    WATCHED: 'text-yellow-500 border-yellow-700 bg-yellow-950/30',
    WARNING: 'text-orange-500 border-orange-700 bg-orange-950/30',
    DANGER: 'text-red-500 border-red-700 bg-red-950/30',
  };

  return (
    <div className={cn('p-4 rounded border', levelColors[heatInfo.level])}>
      <div className="flex items-center gap-3">
        <Thermometer className="w-6 h-6" />
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">热度</div>
          <div className="text-xl font-bold">{heatInfo.displayName}</div>
        </div>
      </div>
      <div className="mt-2 text-sm opacity-70">{heatInfo.description}</div>
      <div className="mt-1 text-xs text-stone-500">每件出售 +2 热度</div>
      {heatInfo.riskPercent > 0 && (
        <div className="mt-1 text-xs flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          每日风险: {heatInfo.riskPercent}%
        </div>
      )}
    </div>
  );
};

interface CommissionIndicatorProps {
  commissionInfo: {
    commission: number;
    label: string;
    currentRep: number;
  };
}

/**
 * Individual segment in the segmented progress bar
 */
interface SegmentProps {
  tier: typeof UNDERWORLD_COMMISSION_TIERS[0];
  isReached: boolean;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
}

const CommissionSegment: React.FC<SegmentProps> = ({
  tier,
  isReached,
  isCurrent,
  isFirst,
  isLast,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Commission display: positive = fee charged, negative = bonus (player gets more)
  const commissionText = tier.commission > 0
    ? `${Math.round(tier.commission * 100)}%`
    : tier.commission < 0
    ? `${Math.round(tier.commission * 100)}%` // Shows negative as bonus
    : '0%';

  return (
    <div
      className="relative flex-1 h-3"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Segment bar */}
      <div
        className={cn(
          'h-full transition-colors duration-300 cursor-pointer',
          isFirst ? 'rounded-l' : '',
          isLast ? 'rounded-r' : '',
          isReached
            ? isCurrent
              ? 'bg-purple-500 ring-1 ring-purple-400 ring-inset'
              : 'bg-purple-700'
            : 'bg-noir-400'
        )}
      />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-noir-200 border border-purple-700 rounded px-3 py-2 shadow-lg whitespace-nowrap text-sm">
            <div className="font-bold text-purple-300">{tier.label}</div>
            <div className="text-xs text-stone-400 mt-1">
              声誉: {tier.minRep} - {tier.maxRep}
            </div>
            <div className={cn(
              'text-xs font-mono mt-1',
              tier.commission > 0 ? 'text-red-400' :
              tier.commission < 0 ? 'text-green-400' :
              'text-stone-400'
            )}>
              手续费: {commissionText}
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-purple-700" />
          </div>
        </div>
      )}
    </div>
  );
};

const CommissionIndicator: React.FC<CommissionIndicatorProps> = ({ commissionInfo }) => {
  // For commission: positive = fee charged (bad), negative = bonus (good)
  const isBonus = commissionInfo.commission < 0;
  const isFee = commissionInfo.commission > 0;

  // Find current tier index
  const currentTierIndex = UNDERWORLD_COMMISSION_TIERS.findIndex(
    tier => commissionInfo.currentRep >= tier.minRep && commissionInfo.currentRep <= tier.maxRep
  );

  return (
    <div className={cn(
      'p-4 rounded border',
      isBonus ? 'border-purple-700 bg-purple-950/30 text-purple-400' :
      isFee ? 'border-stone-700 bg-stone-900/30 text-stone-400' :
      'border-stone-600 bg-stone-900/30 text-stone-300'
    )}>
      <div className="flex items-center gap-3">
        <Skull className="w-6 h-6" />
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider opacity-70">黑道声誉</div>
          <div className="text-xl font-bold">{commissionInfo.label}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold">{commissionInfo.currentRep}</div>
          <div className="text-xs opacity-70">/ 100</div>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div className="mt-3 flex gap-1">
        {UNDERWORLD_COMMISSION_TIERS.map((tier, index) => (
          <CommissionSegment
            key={index}
            tier={tier}
            isReached={index <= currentTierIndex}
            isCurrent={index === currentTierIndex}
            isFirst={index === 0}
            isLast={index === UNDERWORLD_COMMISSION_TIERS.length - 1}
          />
        ))}
      </div>

      {/* Commission rate */}
      <div className="mt-3 text-sm flex items-center justify-between">
        <span className="opacity-70">手续费:</span>
        <span className={cn(
          'font-mono font-bold',
          isBonus ? 'text-green-400' : isFee ? 'text-red-400' : 'text-stone-400'
        )}>
          {Math.round(commissionInfo.commission * 100)}%
        </span>
      </div>

      {/* Explanation */}
      <div className="mt-2 pt-2 border-t border-purple-800/30 text-xs opacity-60">
        黑道声誉越高，手续费越低 (悬停查看各等级详情)
      </div>
    </div>
  );
};

interface PurchaseTabProps {
  requests: MarketPurchaseRequest[];
  canPurchase: boolean;
  remainingSlots: number;
  getEligibleItems: (request: MarketPurchaseRequest) => Item[];
  getPurchasePrice: (item: Item, request: MarketPurchaseRequest) => number;
  checkBreach: (item: Item) => boolean;
  onSell: (item: Item, request: MarketPurchaseRequest) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
}

const PurchaseTab: React.FC<PurchaseTabProps> = ({
  requests,
  canPurchase,
  remainingSlots,
  getEligibleItems,
  getPurchasePrice,
  checkBreach,
  onSell,
  selectedItemId,
  onSelectItem,
}) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>今日无收购需求</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canPurchase && (
        <div className="bg-amber-950/30 border border-amber-700 p-3 rounded text-amber-400 text-sm">
          今日收购限额已满 (3件)
        </div>
      )}

      {requests.map((request, index) => {
        const eligibleItems = getEligibleItems(request);
        const tagDef = TAG_DEFINITIONS[request.tag];

        return (
          <div key={index} className="border border-green-900 rounded overflow-hidden">
            {/* Request Header */}
            <div className="bg-green-950/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-bold text-green-400">
                    收购: {tagDef?.displayName ?? request.tag}
                  </div>
                  <div className="text-xs text-green-300/70">
                    {tagDef?.description ?? ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-green-300/70">收购价格</div>
                <div className="font-mono font-bold text-green-400">
                  {Math.round(request.priceMultiplier * 100)}% 真实价值
                </div>
              </div>
            </div>

            {/* Eligible Items */}
            <div className="p-4 space-y-2">
              {eligibleItems.length === 0 ? (
                <div className="text-sm text-stone-500 py-4 text-center">
                  库存中没有符合条件的物品
                </div>
              ) : (
                eligibleItems.map(item => {
                  const price = getPurchasePrice(item, request);
                  const isSelected = selectedItemId === item.id;
                  const isBreach = checkBreach(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => canPurchase && onSelectItem(isSelected ? null : item.id)}
                      className={cn(
                        'p-3 rounded border transition-all',
                        canPurchase ? 'cursor-pointer hover:bg-noir-200' : 'opacity-50 cursor-not-allowed',
                        isBreach ? 'border-red-700 bg-red-950/20' : '',
                        isSelected ? 'border-green-500 bg-green-950/30' : !isBreach ? 'border-noir-400' : ''
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-noir-300 border border-noir-400 flex items-center justify-center rounded overflow-hidden">
                          <img
                            src={getItemIcon(item)}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className="hidden items-center justify-center w-full h-full">
                            <CategoryIcon category={item.category} className="w-7 h-7 text-stone-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{getDisplayName(item)}</div>
                          <div className="text-xs text-stone-500">
                            真实价值: ${item.realValue}
                          </div>
                          {isBreach && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>仍在典当期（客户赎回时扣减声誉）</span>
                            </div>
                          )}
                          {/* Underworld reputation gain indicator */}
                          <div className="flex items-center gap-1 mt-1 text-xs text-purple-400">
                            <Skull className="w-3 h-3" />
                            <span>出售获得：黑道 +2</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-mono font-bold text-green-400">
                            ${price}
                          </div>
                        </div>
                        {isSelected && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSell(item, request);
                            }}
                            className="h-8 px-3 text-xs bg-green-900 hover:bg-green-800 border-green-700"
                          >
                            出售
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface SaleTabProps {
  items: Item[];
  getSalePrice: (item: Item) => number;
  checkBreach: (item: Item) => boolean;
  getCompensation: (item: Item) => number;
  getProfit: (item: Item, salePrice: number) => number;
  onSell: (item: Item) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
}

const SaleTab: React.FC<SaleTabProps> = ({
  items,
  getSalePrice,
  checkBreach,
  getCompensation,
  getProfit,
  onSell,
  selectedItemId,
  onSelectItem,
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <Banknote className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>没有可出售的物品</p>
        <p className="text-xs mt-1">只有绝当物品 (FORFEIT) 可以出售</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const salePrice = getSalePrice(item);
        const isSelected = selectedItemId === item.id;
        const isBreach = checkBreach(item);
        const compensation = getCompensation(item);
        const profit = getProfit(item, salePrice);
        const [estMin, estMax] = item.currentRange;

        return (
          <div
            key={item.id}
            onClick={() => onSelectItem(isSelected ? null : item.id)}
            className={cn(
              'p-3 rounded border transition-all cursor-pointer hover:bg-noir-200',
              isBreach ? 'border-red-700 bg-red-950/20' : '',
              isSelected ? 'border-amber-500 bg-amber-950/30' : !isBreach ? 'border-noir-400' : ''
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-noir-300 border border-noir-400 flex items-center justify-center rounded overflow-hidden">
                <img
                  src={getItemIcon(item)}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = (e.target as HTMLImageElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
                <div className="hidden items-center justify-center w-full h-full">
                  <CategoryIcon category={item.category} className="w-7 h-7 text-stone-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{getDisplayName(item)}</div>
                <div className="text-xs text-stone-500">
                  估价: ${estMin} - ${estMax}
                </div>
                <div className="text-xs text-stone-500">
                  当金: <span className="text-stone-400 font-mono">${item.pawnAmount}</span>
                </div>
                {isBreach && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>仍在典当期（客户赎回时扣减声誉），赔偿 ${compensation}</span>
                  </div>
                )}
                {/* Underworld reputation gain indicator */}
                <div className="flex items-center gap-1 mt-1 text-xs text-purple-400">
                  <Skull className="w-3 h-3" />
                  <span>出售获得：黑道 +2</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-500">售价</div>
                <div className="text-lg font-mono font-bold text-amber-400">
                  ${salePrice}
                </div>
                <div className="text-xs text-stone-500">
                  利润: <span className={cn(
                    'font-mono',
                    profit >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>{profit >= 0 ? '+' : ''}${profit}</span>
                </div>
              </div>
              {isSelected && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSell(item);
                  }}
                  className="h-8 px-3 text-xs bg-amber-900 hover:bg-amber-800 border-amber-700"
                >
                  出售
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface RiskEventBannerProps {
  event: {
    type: string;
    message: string;
    penalty?: number;
    lockDays?: number;
  };
  onPayFine: () => void;
  onAcceptLockdown: () => void;
}

const RiskEventBanner: React.FC<RiskEventBannerProps> = ({
  event,
  onPayFine,
  onAcceptLockdown,
}) => {
  const hasPenalty = event.penalty !== undefined;
  const hasLockdown = event.lockDays !== undefined;

  return (
    <div className="bg-red-950/50 border-2 border-red-700 p-6 rounded animate-pulse">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
        <div className="flex-1">
          <div className="font-bold text-red-400 text-lg mb-2">警方行动！</div>
          <div className="text-stone-300 mb-4">{event.message}</div>

          {hasPenalty && hasLockdown && (
            <div className="flex gap-3">
              <Button
                onClick={onPayFine}
                className="bg-green-900 hover:bg-green-800 border-green-700"
              >
                <Banknote className="w-4 h-4 mr-2" />
                支付 ${event.penalty}
              </Button>
              <Button
                onClick={onAcceptLockdown}
                className="bg-red-900 hover:bg-red-800 border-red-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                接受关闭 {event.lockDays} 天
              </Button>
            </div>
          )}

          {!hasPenalty && hasLockdown && (
            <Button
              onClick={onAcceptLockdown}
              className="bg-red-900 hover:bg-red-800 border-red-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              接受 ({event.lockDays} 天关闭)
            </Button>
          )}

          {hasPenalty && !hasLockdown && (
            <Button
              onClick={onPayFine}
              className="bg-amber-900 hover:bg-amber-800 border-amber-700"
            >
              <Banknote className="w-4 h-4 mr-2" />
              支付 ${event.penalty}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface TodaySalesSummaryProps {
  sales: { itemName: string; amount: number; type: 'PURCHASE' | 'SALE' }[];
}

const TodaySalesSummary: React.FC<TodaySalesSummaryProps> = ({ sales }) => {
  const total = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="border-t border-noir-400 pt-4">
      <div className="text-xs uppercase text-stone-500 tracking-wider mb-2">今日交易</div>
      <div className="space-y-1">
        {sales.map((sale, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-stone-400">
              {sale.type === 'PURCHASE' ? (
                <TrendingUp className="w-3 h-3 inline mr-1 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 inline mr-1 text-amber-500" />
              )}
              {sale.itemName}
            </span>
            <span className={cn(
              'font-mono',
              sale.type === 'PURCHASE' ? 'text-green-400' : 'text-amber-400'
            )}>
              +${sale.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-noir-400 font-bold">
        <span>总计</span>
        <span className="text-green-400 font-mono">+${total}</span>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  action: {
    type: 'sell_purchase' | 'sell_direct' | 'pay_fine' | 'accept_lockdown';
    item?: Item;
    price?: number;
  };
  checkBreach: (item: Item) => boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ action, checkBreach, onConfirm, onCancel }) => {
  let title = '';
  let message = '';
  let confirmText = '';
  let isDanger = false;
  let isBreach = false;

  // Check if this sale would be a breach
  if (action.item && (action.type === 'sell_purchase' || action.type === 'sell_direct')) {
    isBreach = checkBreach(action.item);
    if (isBreach) {
      isDanger = true;
    }
  }

  switch (action.type) {
    case 'sell_purchase':
      title = isBreach ? '违约警告' : '确认出售';
      message = `以 $${action.price} 出售 "${action.item?.name}"？\n(热度 +1)`;
      confirmText = isBreach ? '确认违约出售' : '确认出售';
      break;
    case 'sell_direct':
      title = isBreach ? '违约警告' : '确认出售';
      message = `以约 $${action.price} 出售 "${action.item?.name}"？\n(热度 +2)`;
      confirmText = isBreach ? '确认违约出售' : '确认出售';
      break;
    case 'pay_fine':
      title = '支付罚款';
      message = `支付 $${action.price} 以避免黑市关闭？`;
      confirmText = '支付';
      break;
    case 'accept_lockdown':
      title = '接受关闭';
      message = '黑市将关闭，期间无法进行任何交易。';
      confirmText = '接受';
      isDanger = true;
      break;
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        {isBreach && (
          <div className="bg-amber-950/50 border border-amber-700 p-3 rounded flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-400 text-sm">典当期内出售</div>
              <div className="text-xs text-amber-300/80 mt-1">
                此物品仍在典当期内。若客户来赎回时发现物品已售出，将扣减声誉。
              </div>
              <div className="text-xs text-amber-400 mt-1 font-mono">
                出售即获得：黑道 +2 | 客户赎回时：人情 -3, 商誉 -1
              </div>
            </div>
          </div>
        )}
        {!isBreach && (action.type === 'sell_purchase' || action.type === 'sell_direct') && (
          <div className="bg-purple-950/50 border border-purple-700 p-3 rounded flex items-start gap-2">
            <Skull className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-purple-400 text-sm">声誉变化</div>
              <div className="text-xs text-purple-300/80 mt-1 font-mono">
                出售获得：黑道 +2
              </div>
            </div>
          </div>
        )}
        <p className="text-stone-300 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} variant="secondary">
            <XCircle className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              isDanger
                ? 'bg-red-900 hover:bg-red-800 border-red-700'
                : 'bg-green-900 hover:bg-green-800 border-green-700'
            )}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
