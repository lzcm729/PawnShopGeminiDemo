import React from 'react';
import { Banknote } from 'lucide-react';
import { Item } from '../../../systems/items/types';
import { BlackmarketItemCard } from './BlackmarketItemCard';

export interface SaleTabProps {
  items: Item[];
  getSalePrice: (item: Item) => number;
  checkBreach: (item: Item) => boolean;
  getCompensation: (item: Item) => number;
  getProfit: (item: Item, salePrice: number) => number;
  hasUnfulfilledPurchaseMatch: (item: Item) => boolean;
  onSell: (item: Item) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  commissionRate?: number;
}

export const SaleTab: React.FC<SaleTabProps> = ({
  items,
  getSalePrice,
  checkBreach,
  getCompensation,
  getProfit,
  hasUnfulfilledPurchaseMatch,
  onSell,
  selectedItemId,
  onSelectItem,
  commissionRate,
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
        const inPurchaseList = hasUnfulfilledPurchaseMatch(item);

        return (
          <BlackmarketItemCard
            key={item.id}
            item={item}
            price={salePrice}
            profit={profit}
            isSelected={isSelected && !inPurchaseList}
            isBreach={isBreach}
            compensation={compensation}
            variant="sale"
            disabled={inPurchaseList}
            disabledReason="在收购清单中"
            commissionRate={commissionRate}
            hasPrecisionModifier={true}
            onSelect={() => !inPurchaseList && onSelectItem(isSelected ? null : item.id)}
            onSell={() => onSell(item)}
          />
        );
      })}
    </div>
  );
};
