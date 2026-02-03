
import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { Item, ItemStatus } from '../../types';
import { AlertTriangle, ShieldCheck, Heart, Skull, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getDisplayName } from '../../systems/items/tagUtils';
import { getItemIcon } from '../../systems/assets';

interface ItemCardProps {
  item: Item;
  currentDay: number;
  actions?: React.ReactNode;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, currentDay, actions }) => {

  const isForfeit = item.status === ItemStatus.FORFEIT;
  const isActive = item.status === ItemStatus.ACTIVE;
  const isSold = item.status === ItemStatus.SOLD;
  const isRedeemed = item.status === ItemStatus.REDEEMED;
  const isReforged = item.wasReforged === true;

  const daysLeft = item.pawnInfo ? Math.max(0, item.pawnInfo.dueDate - currentDay) : 0;

  let statusColor = "bg-stone-600";
  let statusText = "UNKNOWN";

  if (isReforged && isActive) {
    // Reforged active items are treated as owned (breach already occurred)
    statusColor = "bg-purple-600";
    statusText = "REFORGED (OWNED)";
  } else if (isForfeit) {
    statusColor = "bg-red-600";
    statusText = "FORFEIT (OWNED)";
  } else if (isSold) {
    statusColor = "bg-noir-500";
    statusText = "SOLD";
  } else if (isRedeemed) {
    statusColor = "bg-green-600";
    statusText = "REDEEMED";
  } else if (isActive) {
    if (daysLeft <= 1) {
        statusColor = "bg-red-500 animate-pulse";
        statusText = `CRITICAL: ${daysLeft}D`;
    } else if (daysLeft <= 3) {
        statusColor = "bg-amber-600";
        statusText = `WARNING: ${daysLeft}D`;
    } else {
        statusColor = "bg-emerald-600";
        statusText = `ACTIVE: ${daysLeft}D`;
    }
  }

  // Reforged items are treated as owned for display purposes
  const treatedAsOwned = isReforged && isActive;

  return (
    <div className="relative flex flex-col bg-noir-200 shadow-sm transition-all duration-300 group overflow-hidden font-mono">
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Header: Status Badge */}
        <div className="flex items-center">
          <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider", statusColor)}>
            {statusText}
          </div>
        </div>

        {/* Centered Large Icon */}
        <div className="flex justify-center py-2">
          <div className="w-24 h-24 bg-noir-300 border border-noir-400 flex items-center justify-center overflow-hidden rounded-lg shadow-inner">
            <img
              src={getItemIcon(item)}
              alt={item.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-full h-full">
              <CategoryIcon category={item.category} className="text-noir-txt-secondary w-10 h-10" />
            </div>
          </div>
        </div>

        {/* Item Name - Centered */}
        <div className="text-center">
          <h3 className="font-bold text-noir-txt-primary text-sm leading-tight font-serif tracking-wide">
            {getDisplayName(item)}
          </h3>
        </div>

        {/* Category and Trait Tags - Centered */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[10px] text-noir-txt-muted">{item.category}</div>
          <div className="flex flex-wrap justify-center gap-1">
            {item.isFake && (
              <span className="text-[9px] border border-red-900 text-red-500 px-1 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3"/> FAKE
              </span>
            )}
            {item.isStolen && (
              <span className="text-[9px] border border-purple-900 text-purple-500 px-1 rounded flex items-center gap-1">
                <Skull className="w-3 h-3"/> ILLICIT
              </span>
            )}
            {item.sentimentalValue && (
              <span className="text-[9px] border border-rose-900 text-rose-500 px-1 rounded flex items-center gap-1">
                <Heart className="w-3 h-3"/> SENTIMENTAL
              </span>
            )}
            {!item.isFake && !item.isStolen && item.appraised && (
              <span className="text-[9px] border border-green-900 text-green-500 px-1 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3"/> VERIFIED
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-noir-400/50 my-1"></div>

        {/* Value Info */}
        <div className="flex items-center justify-between text-[10px] bg-noir-300/50 px-2 py-1.5 rounded">
          {treatedAsOwned ? (
            <>
              <span className="text-noir-txt-muted">MARKET VALUE</span>
              <span className="text-purple-400 font-bold">${item.realValue}</span>
            </>
          ) : isForfeit ? (
            <>
              <span className="text-noir-txt-muted">MARKET VALUE</span>
              <span className="text-amber-400 font-bold">${item.realValue}</span>
            </>
          ) : (
            <>
              <span className="text-noir-txt-muted flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> PRINCIPAL
              </span>
              <span className="text-noir-txt-primary font-bold">${item.pawnAmount}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="bg-black/30 p-2 border-t border-noir-300 flex items-center justify-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
