import React from 'react';
import {
  AlertTriangle,
  Lock,
  Skull,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Item } from '../../../systems/items/types';
import { CategoryIcon } from '../../ui/CategoryIcon';
import { getItemIcon } from '../../../systems/assets';
import { Button } from '../../ui/Button';
import { getDisplayName } from '../../../systems/items/tagUtils';

export interface BlackmarketItemCardProps {
  item: Item;
  price: number;
  profit: number;
  isSelected: boolean;
  isBreach: boolean;
  compensation: number;
  variant: 'purchase' | 'sale';
  disabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
  onSell: () => void;
}

export const BlackmarketItemCard: React.FC<BlackmarketItemCardProps> = ({
  item,
  price,
  profit,
  isSelected,
  isBreach,
  compensation,
  variant,
  disabled = false,
  disabledReason,
  onSelect,
  onSell,
}) => {
  const [estMin, estMax] = item.currentRange;
  const isCounterfeit = item.workState === 'FORGED';
  const colorScheme = variant === 'purchase'
    ? { selected: 'border-green-500 bg-green-950/30', price: 'text-green-400', btn: 'bg-green-900 hover:bg-green-800 border-green-700' }
    : isCounterfeit
      ? { selected: 'border-purple-500 bg-purple-950/30', price: 'text-purple-400', btn: 'bg-purple-900 hover:bg-purple-800 border-purple-700' }
      : { selected: 'border-amber-500 bg-amber-950/30', price: 'text-amber-400', btn: 'bg-amber-900 hover:bg-amber-800 border-amber-700' };

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={cn(
        'p-3 rounded border transition-all',
        disabled
          ? 'border-stone-700 bg-stone-900/50 opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-noir-200',
        !disabled && isBreach ? 'border-red-700 bg-red-950/20' : '',
        !disabled && isSelected ? colorScheme.selected : !disabled && !isBreach ? 'border-noir-400' : ''
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
          <div className="font-bold text-sm flex items-center gap-1.5">
            {getDisplayName(item)}
            {isCounterfeit && (
              <span className="text-[9px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded border border-purple-700 inline-flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" />
                伪造
              </span>
            )}
          </div>
          <div className="text-xs text-stone-500">
            估价: ${estMin} - ${estMax}
          </div>
          <div className="text-xs text-stone-500">
            当金: <span className="text-stone-400 font-mono">${item.pawnAmount}</span>
          </div>
          {!disabled && isBreach && (
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              <span>仍在典当期，赔偿 ${compensation}</span>
            </div>
          )}
          {!disabled && isCounterfeit && (
            <div className="flex items-center gap-1 mt-1 text-xs text-purple-400">
              <Eye className="w-3 h-3" />
              <span>伪造品出售 | 清白 -4 | 鉴伪风险</span>
            </div>
          )}
          {!disabled && !isCounterfeit && (
            <div className="flex items-center gap-1 mt-1 text-xs text-purple-400">
              <Skull className="w-3 h-3" />
              <span>出售获得：黑道 +2</span>
            </div>
          )}
          {disabled && disabledReason && (
            <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
              <Lock className="w-3 h-3" />
              <span>{disabledReason}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-500">售价</div>
          <div className={cn('text-lg font-mono font-bold', disabled ? 'text-stone-500' : colorScheme.price)}>
            ${price}
          </div>
          <div className="text-xs text-stone-500">
            利润: <span className={cn(
              'font-mono',
              disabled ? 'text-stone-500' : profit >= 0 ? 'text-green-400' : 'text-red-400'
            )}>{profit >= 0 ? '+' : ''}${profit}</span>
          </div>
        </div>
        {isSelected && !disabled && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSell();
            }}
            className={cn('h-8 px-3 text-xs', colorScheme.btn)}
          >
            出售
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
