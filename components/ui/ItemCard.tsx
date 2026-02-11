
import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { Item, ItemStatus } from '../../types';
import { AlertTriangle, ShieldCheck, Heart, Skull, DollarSign, User, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getDisplayName, getItemTagsDisplay, getHiddenTagCount } from '../../systems/items/tagUtils';
import { getItemIcon } from '../../systems/assets';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../../systems/assets';
import { isStateTag } from '../../systems/items/tags';

// #9: Generate a consistent HSL color from a string identifier
const getNpcBorderColor = (identifier: string): string => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
};

interface ItemCardProps {
  item: Item;
  currentDay: number;
  actions?: React.ReactNode;
  /** #22: Callback when NPC avatar badge is clicked */
  onNpcClick?: (chainId: string) => void;
  /** #9/#22: Chain ID currently highlighted for NPC grouping */
  highlightChainId?: string | null;
}

// S3-I4: Visual state based on days in storage (design doc D - Natural Decay)
const getItemVisualFilter = (item: Item, currentDay: number): string => {
    const daysInStorage = currentDay - (item.pawnDate || 0);

    if (item.status === ItemStatus.SOLD || item.status === ItemStatus.REDEEMED) {
        return 'grayscale(50%) opacity(70%)';
    }

    if (daysInStorage >= 21) return 'sepia(40%) brightness(80%)';
    if (daysInStorage >= 14) return 'sepia(25%) brightness(90%)';
    if (daysInStorage >= 7) return 'sepia(10%) brightness(95%)';
    return 'none';
};

// Design doc E: Derive NPC portrait from relatedChainId
const getNpcAvatarUrl = (item: Item): string | null => {
    // Prefer snapshot portrait (captured at transaction time, always correct)
    if (item.customerSnapshot?.portraitUrl) return item.customerSnapshot.portraitUrl;
    // Fall back to deriving from relatedChainId (old saves without snapshot)
    if (!item.relatedChainId) return null;
    const charId = item.relatedChainId.replace(/^chain_/, '');
    return getCharacterPortraitPath(charId, 'neutral');
};

// S3-C3: NPC badge tooltip text - derive readable name from chain ID
const getNpcBadgeTooltip = (item: Item): string => {
    if (item.customerSnapshot?.customerName) {
        return `${item.customerSnapshot.customerName} 的物品`;
    }
    if (!item.relatedChainId) return '';
    const charId = item.relatedChainId.replace(/^chain_/, '');
    const displayName = charId.charAt(0).toUpperCase() + charId.slice(1);
    return `${displayName} 的物品`;
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, currentDay, actions, onNpcClick, highlightChainId }) => {

  const isForfeit = item.status === ItemStatus.FORFEIT;
  const isActive = item.status === ItemStatus.ACTIVE;
  const isSold = item.status === ItemStatus.SOLD;
  const isRedeemed = item.status === ItemStatus.REDEEMED;
  const isReforged = item.wasReforged === true;

  const daysLeft = item.pawnInfo ? Math.max(0, item.pawnInfo.dueDate - currentDay) : 0;

  let statusColor = "bg-stone-600";
  let statusText = "UNKNOWN";

  if (isReforged && isActive) {
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

  const treatedAsOwned = isReforged && isActive;

  // S3-I4: Visual filter for aging effect
  const visualFilter = getItemVisualFilter(item, currentDay);

  // Design doc E: NPC avatar badge
  const npcAvatarUrl = getNpcAvatarUrl(item);
  const npcBadgeTooltip = getNpcBadgeTooltip(item);

  // #9: NPC-source border color from relatedChainId
  const npcBorderColor = item.relatedChainId ? getNpcBorderColor(item.relatedChainId) : null;
  // #22: Whether this card is highlighted via NPC filter
  const isNpcHighlighted = highlightChainId != null && item.relatedChainId === highlightChainId;
  const isNpcDimmed = highlightChainId != null && item.relatedChainId !== highlightChainId;

  return (
    <div
      className={cn(
        "relative flex flex-col bg-noir-200 shadow-sm transition-all duration-300 group overflow-hidden font-mono",
        isNpcHighlighted && "ring-2 ring-offset-1 ring-offset-noir-100 scale-[1.01]",
        isNpcDimmed && "opacity-40"
      )}
      style={{
        ...(isNpcHighlighted && npcBorderColor ? { '--tw-ring-color': npcBorderColor } as React.CSSProperties : {}),
      }}
    >
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Header: Status Badge */}
        <div className="flex items-center">
          <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider", statusColor)}>
            {statusText}
          </div>
        </div>

        {/* Centered Large Icon with S3-I4 visual decay + Design doc E NPC badge */}
        <div className="flex justify-center py-2">
          <div className="relative w-24 h-24 bg-noir-300 border border-noir-400 flex items-center justify-center overflow-hidden rounded-lg shadow-inner">
            <img
              src={getItemIcon(item)}
              alt={item.name}
              className="w-full h-full object-contain p-1"
              style={{ filter: visualFilter }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-full h-full">
              <CategoryIcon category={item.category} className="text-noir-txt-secondary w-10 h-10" />
            </div>

            {/* Design doc E: NPC avatar badge - small corner overlay (#22: clickable for filtering) */}
            {npcAvatarUrl && (
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full border-2 border-noir-200 bg-noir-300 overflow-hidden shadow-md",
                    onNpcClick && "cursor-pointer hover:ring-2 hover:ring-amber-400 transition-shadow"
                  )}
                  title={npcBadgeTooltip + (onNpcClick ? ' (点击筛选)' : '')}
                  onClick={onNpcClick && item.relatedChainId ? (e) => {
                    e.stopPropagation();
                    onNpcClick(item.relatedChainId!);
                  } : undefined}
                >
                    <img
                        src={npcAvatarUrl}
                        alt="NPC"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                    />
                    <div className="hidden items-center justify-center w-full h-full">
                        <User className="w-4 h-4 text-noir-txt-muted" />
                    </div>
                </div>
            )}
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
          {/* Item Tags (G1 State as warning, G2 Attribute as info) */}
          {(getItemTagsDisplay(item).length > 0 || getHiddenTagCount(item) > 0) && (
            <div className="flex flex-wrap justify-center gap-1 mt-0.5">
              {getItemTagsDisplay(item).map(({ tag, name, icon, isNegative }) => (
                <span
                  key={tag}
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5",
                    isNegative
                      ? "border border-red-800/60 bg-red-950/30 text-red-400"
                      : isStateTag(tag)
                        ? "border border-stone-700 bg-stone-900/30 text-stone-400"
                        : "border border-cyan-800/50 bg-cyan-950/20 text-cyan-400"
                  )}
                  title={name}
                >
                  <span>{icon}</span> {name}
                </span>
              ))}
              {getHiddenTagCount(item) > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-stone-700/50 bg-stone-900/20 text-stone-500" title="未发现的隐藏属性">
                  <HelpCircle className="w-3 h-3" /> ?x{getHiddenTagCount(item)}
                </span>
              )}
            </div>
          )}
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
