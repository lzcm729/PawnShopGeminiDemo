import React from 'react';
import {
  ShoppingCart,
  Tag,
  CheckCircle2,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Item } from '../../../systems/items/types';
import { MarketPurchaseRequest, MarketIndicator } from '../../../systems/blackmarket/types';
import { TAG_DEFINITIONS } from '../../../systems/items/tagData';
import { BlackmarketItemCard } from './BlackmarketItemCard';

export interface PurchaseTabProps {
  requests: MarketPurchaseRequest[];
  getEligibleItems: (request: MarketPurchaseRequest) => Item[];
  getPurchasePrice: (item: Item, request: MarketPurchaseRequest) => number;
  checkBreach: (item: Item) => boolean;
  getCompensation: (item: Item) => number;
  onSell: (item: Item, request: MarketPurchaseRequest) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  marketIndicators?: MarketIndicator[];
  commissionRate?: number;
}

export const PurchaseTab: React.FC<PurchaseTabProps> = ({
  requests,
  getEligibleItems,
  getPurchasePrice,
  checkBreach,
  getCompensation,
  onSell,
  selectedItemId,
  onSelectItem,
  marketIndicators = [],
  commissionRate,
}) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>今日无收购需求</p>
      </div>
    );
  }

  const sortedRequests = [...requests].sort((a, b) => b.priceMultiplier - a.priceMultiplier);

  return (
    <div className="space-y-6">
      {sortedRequests.map((request, index) => {
        const eligibleItems = getEligibleItems(request);
        const tagDef = TAG_DEFINITIONS[request.tag];
        const isFulfilled = request.fulfilled;

        return (
          <div
            key={index}
            className={cn(
              'border rounded overflow-hidden',
              isFulfilled ? 'border-stone-700 opacity-60' : 'border-green-900'
            )}
          >
            {/* Request Header */}
            <div className={cn(
              'p-4 flex items-center justify-between',
              isFulfilled ? 'bg-stone-900/50' : 'bg-green-950/50'
            )}>
              <div className="flex items-center gap-3">
                {isFulfilled ? (
                  <CheckCircle2 className="w-5 h-5 text-stone-500" />
                ) : (
                  <Tag className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <div className={cn(
                    'font-bold flex items-center gap-1.5',
                    isFulfilled ? 'text-stone-500' : 'text-green-400'
                  )}>
                    <span>收购: {tagDef?.displayName ?? request.tag}</span>
                    {!isFulfilled && (() => {
                      const indicator = marketIndicators.find(m => m.tag === request.tag);
                      if (!indicator) return null;
                      if (indicator.trend === 'RISING') return <ArrowUp className="w-3.5 h-3.5 text-green-400" />;
                      if (indicator.trend === 'FALLING') return <ArrowDown className="w-3.5 h-3.5 text-red-400" />;
                      return <ArrowRight className="w-3.5 h-3.5 text-stone-500" />;
                    })()}
                    {isFulfilled && <span className="ml-1 text-xs">(已完成)</span>}
                  </div>
                  <div className={cn(
                    'text-xs',
                    isFulfilled ? 'text-stone-600' : 'text-green-300/70'
                  )}>
                    {tagDef?.description ?? ''}
                  </div>
                </div>
              </div>
              <div className={cn(
                'font-mono font-bold',
                isFulfilled ? 'text-stone-500' : 'text-green-400'
              )}>
                溢价 +{Math.round((request.priceMultiplier - 1) * 100)}%
              </div>
            </div>

            {/* Eligible Items */}
            {!isFulfilled && (
              <div className="p-4 space-y-2">
                {eligibleItems.length === 0 ? (
                  <div className="text-sm text-stone-500 py-4 text-center">
                    库存中没有符合条件的物品
                  </div>
                ) : (
                  eligibleItems.map(item => {
                    const price = getPurchasePrice(item, request);
                    const selectionKey = `${item.id}:${request.tag}`;
                    const isSelected = selectedItemId === selectionKey;
                    const isBreach = checkBreach(item);
                    const compensation = getCompensation(item);
                    const profit = isBreach ? price - compensation : price - item.pawnAmount;

                    return (
                      <BlackmarketItemCard
                        key={selectionKey}
                        item={item}
                        price={price}
                        profit={profit}
                        isSelected={isSelected}
                        isBreach={isBreach}
                        compensation={compensation}
                        variant="purchase"
                        commissionRate={commissionRate}
                        onSelect={() => onSelectItem(isSelected ? null : selectionKey)}
                        onSell={() => onSell(item, request)}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
