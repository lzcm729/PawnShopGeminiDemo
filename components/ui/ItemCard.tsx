
import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { Item, ItemStatus } from '../../types';
import { AlertTriangle, ShieldCheck, Heart, Skull, CalendarClock, DollarSign } from 'lucide-react';
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
  let borderColor = "border-noir-400";

  if (isReforged && isActive) {
    // Reforged active items are treated as owned (breach already occurred)
    statusColor = "bg-purple-600";
    statusText = "REFORGED (OWNED)";
    borderColor = "border-purple-900";
  } else if (isForfeit) {
    statusColor = "bg-red-600";
    statusText = "FORFEIT (OWNED)";
    borderColor = "border-red-900";
  } else if (isSold) {
    statusColor = "bg-noir-500";
    statusText = "SOLD";
    borderColor = "border-noir-500 opacity-60";
  } else if (isRedeemed) {
    statusColor = "bg-green-600";
    statusText = "REDEEMED";
    borderColor = "border-green-900";
  } else if (isActive) {
    if (daysLeft <= 1) {
        statusColor = "bg-red-500 animate-pulse";
        statusText = `CRITICAL: ${daysLeft}D`;
        borderColor = "border-red-500";
    } else if (daysLeft <= 3) {
        statusColor = "bg-amber-600";
        statusText = `WARNING: ${daysLeft}D`;
        borderColor = "border-amber-600";
    } else {
        statusColor = "bg-emerald-600";
        statusText = `ACTIVE: ${daysLeft}D`;
        borderColor = "border-emerald-900";
    }
  }

  // Reforged items are treated as owned for display purposes
  const treatedAsOwned = isReforged && isActive;

  return (
    <div className={cn("relative flex flex-col bg-noir-200 border-l-4 shadow-sm transition-all duration-300 group overflow-hidden font-mono", borderColor)}>
      <div className="p-3 flex-1 flex flex-col gap-2">
        {/* Main Info */}
        <div className="flex gap-3">
          <div className="w-14 h-14 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 overflow-hidden rounded">
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
              <CategoryIcon category={item.category} className="text-noir-txt-secondary w-6 h-6" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-noir-txt-primary truncate text-sm leading-tight font-serif tracking-wide">{getDisplayName(item)}</h3>
              <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider shrink-0", statusColor)}>
                {statusText}
              </div>
            </div>
            <div className="text-[10px] text-noir-txt-muted mb-1">{item.category}</div>
            <div className="flex flex-wrap gap-1">
                {item.isFake && <span className="text-[9px] border border-red-900 text-red-500 px-1 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> FAKE</span>}
                {item.isStolen && <span className="text-[9px] border border-purple-900 text-purple-500 px-1 rounded flex items-center gap-1"><Skull className="w-3 h-3"/> ILLICIT</span>}
                {item.sentimentalValue && <span className="text-[9px] border border-rose-900 text-rose-500 px-1 rounded flex items-center gap-1"><Heart className="w-3 h-3"/> SENTIMENTAL</span>}
                {!item.isFake && !item.isStolen && item.appraised && <span className="text-[9px] border border-green-900 text-green-500 px-1 rounded flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> VERIFIED</span>}
            </div>
          </div>
        </div>

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

        {/* Due Date Indicator (Active Only, not for reforged) */}
        {isActive && item.pawnInfo && !treatedAsOwned && (
            <div className="flex items-center justify-between text-[10px] text-noir-txt-muted bg-noir-300/50 p-1.5 rounded border border-dashed border-noir-400">
                <div className="flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3" />
                    <span>DUE: DAY {item.pawnInfo.dueDate}</span>
                </div>
                {item.pawnInfo.extensionCount ? (
                    <span className="text-amber-500">Ext: {item.pawnInfo.extensionCount}</span>
                ) : null}
            </div>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="bg-black/30 p-2 border-t border-noir-300 flex items-center justify-end gap-2">
            {actions}
        </div>
      )}
    </div>
  );
};
