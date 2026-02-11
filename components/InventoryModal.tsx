
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { PackageOpen, Moon, Archive, Wrench, Hammer, Eye, Skull, Lock, Search, Package } from 'lucide-react';
import { Item, ItemStatus } from '../types';
import { PhaseIs } from '../systems/core/phases';
import { Modal } from './ui/Modal';
import { HelpTooltip } from './ui/Tooltip';
import { ItemCard } from './ui/ItemCard';
import { ItemDetailModal } from './ui/ItemDetailModal';
import { playSfx } from '../systems/game/audio';
import { cn } from '../lib/utils';
import { getEffectiveInventoryCapacity, hasBlackMarketContact, hasPrecisionBench, getUpgradeLevel } from '../systems/upgrades';
import { calculateInterest } from '../systems/economy/interest';


// S1-I5: Storage level visual configs per design doc 3.1
const STORAGE_LEVEL_VISUALS: Record<number, { label: string; color: string; borderColor: string }> = {
    0: { label: 'Capacity', color: 'text-stone-500', borderColor: 'border-stone-700' },
    1: { label: '小木架', color: 'text-stone-400', borderColor: 'border-stone-600' },
    2: { label: '铁制货架', color: 'text-zinc-400', borderColor: 'border-zinc-600' },
    3: { label: '玻璃展柜', color: 'text-cyan-400', borderColor: 'border-cyan-800' },
    4: { label: '金属保险柜', color: 'text-blue-400', borderColor: 'border-blue-800' },
    5: { label: '专业保险柜', color: 'text-amber-400', borderColor: 'border-amber-800' },
};

export const InventoryModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  // #22: NPC chain filter - clicking NPC avatar toggles highlight
  const [filterChainId, setFilterChainId] = useState<string | null>(null);

  if (!state.showInventory) return null;

  const currentDay = state.stats.day;

  // Get items that are still in inventory (exclude REDEEMED and SOLD - they left the shop)
  const inventoryItems = state.inventory.filter(i =>
      i.status === ItemStatus.ACTIVE || i.status === ItemStatus.FORFEIT
  );

  // Count categories for stats
  // Reforged active items are treated as owned, not as active pawns
  const activeItems = inventoryItems.filter(i => i.status === ItemStatus.ACTIVE && !i.wasReforged);
  const reforgedItems = inventoryItems.filter(i => i.status === ItemStatus.ACTIVE && i.wasReforged);
  const forfeitItems = inventoryItems.filter(i => i.status === ItemStatus.FORFEIT);
  const ownedItems = [...forfeitItems, ...reforgedItems]; // All owned items
  const expiringItems = activeItems.filter(i =>
      i.pawnInfo && (i.pawnInfo.dueDate - currentDay <= 2)
  );

  // Sort: FORFEIT first (owned, can liquidate), then ACTIVE by due date (urgent first)
  const displayItems = [...inventoryItems].sort((a, b) => {
      // FORFEIT items first
      if (a.status === ItemStatus.FORFEIT && b.status !== ItemStatus.FORFEIT) return -1;
      if (b.status === ItemStatus.FORFEIT && a.status !== ItemStatus.FORFEIT) return 1;

      // Within same status, sort by due date (ACTIVE) or pawn date (FORFEIT)
      if (a.status === ItemStatus.ACTIVE && b.status === ItemStatus.ACTIVE) {
          const aDue = a.pawnInfo?.dueDate || 999;
          const bDue = b.pawnInfo?.dueDate || 999;
          return aDue - bDue;
      }

      return (a.pawnDate || 0) - (b.pawnDate || 0);
  });

  const isNightPhase = PhaseIs.night(state.phase);

  // S1-I5: Storage level for visual differentiation
  const storageLevel = getUpgradeLevel('storage_expansion', state.shopUpgrades);
  const storageVisual = STORAGE_LEVEL_VISUALS[storageLevel] || STORAGE_LEVEL_VISUALS[0];
  const hasBlackMarket = hasBlackMarketContact(state.shopUpgrades);
  const hasWorkshop = hasPrecisionBench(state.shopUpgrades);

  // Handle opening Workshop panel with pre-selected item
  const handleOpenWorkshop = (itemId: string) => {
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: itemId });
      dispatch({ type: 'TOGGLE_INVENTORY' }); // Close inventory first
      dispatch({ type: 'TOGGLE_WORKSHOP' });  // Open workshop
      playSfx('CLICK');
  };

  // Handle opening Insight panel with pre-selected item
  const handleOpenInsight = (itemId: string) => {
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: itemId });
      dispatch({ type: 'TOGGLE_INVENTORY' }); // Close inventory first
      dispatch({ type: 'TOGGLE_INSIGHT' });   // Open insight
      playSfx('CLICK');
  };

  // Handle opening Black Market panel with pre-selected item
  const handleOpenBlackmarket = (itemId: string) => {
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: itemId });
      dispatch({ type: 'TOGGLE_INVENTORY' });   // Close inventory first
      dispatch({ type: 'TOGGLE_BLACKMARKET' }); // Open black market
      playSfx('CLICK');
  };

  // Handle opening item detail modal
  const handleOpenDetail = (item: Item) => {
      setDetailItem(item);
      playSfx('CLICK');
  };

  // #22: Toggle NPC chain filter
  const handleNpcClick = (chainId: string) => {
      setFilterChainId(prev => prev === chainId ? null : chainId);
      playSfx('CLICK');
  };

  const renderActions = (item: Item) => {
      const isSold = item.status === ItemStatus.SOLD;
      const isRedeemed = item.status === ItemStatus.REDEEMED;

      // Closed transactions have no actions
      if (isSold || isRedeemed) {
          return null;
      }

      // Action button base styles
      const baseButtonClass = "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded text-[9px] transition-all";
      const disabledClass = "opacity-40 cursor-not-allowed";
      const enabledClass = "cursor-pointer hover:bg-noir-300";

      // All 4 action buttons layout
      return (
          <div className="flex flex-col gap-2">
              {/* Night-only indicator when daytime */}
              {!isNightPhase && (
                  <div className="flex items-center justify-center text-noir-txt-muted text-[9px] gap-1 py-0.5 border-b border-noir-400/30 mb-1">
                      <Moon className="w-3 h-3" />
                      <span>仅夜间可操作</span>
                  </div>
              )}

              {/* Action buttons grid */}
              <div className="grid grid-cols-5 gap-1">
                  {/* Detail Button - Always available */}
                  <button
                      onClick={() => handleOpenDetail(item)}
                      className={cn(
                          baseButtonClass,
                          enabledClass,
                          "border border-cyan-900/50 text-cyan-400 hover:border-cyan-700 hover:bg-cyan-950/30"
                      )}
                      title="查看物品详情"
                  >
                      <Search className="w-3.5 h-3.5" />
                      <span>详情</span>
                  </button>

                  {/* Repair Button */}
                  <button
                      onClick={isNightPhase && hasWorkshop ? () => handleOpenWorkshop(item.id) : undefined}
                      disabled={!isNightPhase || !hasWorkshop}
                      className={cn(
                          baseButtonClass,
                          "border border-emerald-900/50",
                          isNightPhase && hasWorkshop
                              ? cn(enabledClass, "text-emerald-400 hover:border-emerald-700 hover:bg-emerald-950/30")
                              : cn(disabledClass, "text-emerald-600/50")
                      )}
                      title={!hasWorkshop ? "需要解锁「工坊扩建」" : isNightPhase ? "修复物品 (Workshop)" : "仅夜间可用"}
                  >
                      <Hammer className="w-3.5 h-3.5" />
                      <span>修复</span>
                      {(!isNightPhase || !hasWorkshop) && <Lock className="w-2 h-2 opacity-50" />}
                  </button>

                  {/* Reforge Button */}
                  <button
                      onClick={isNightPhase && hasWorkshop ? () => handleOpenWorkshop(item.id) : undefined}
                      disabled={!isNightPhase || !hasWorkshop}
                      className={cn(
                          baseButtonClass,
                          "border border-purple-900/50",
                          isNightPhase && hasWorkshop
                              ? cn(enabledClass, "text-purple-400 hover:border-purple-700 hover:bg-purple-950/30")
                              : cn(disabledClass, "text-purple-600/50")
                      )}
                      title={!hasWorkshop ? "需要解锁「工坊扩建」" : isNightPhase ? "重铸物品 (Workshop)" : "仅夜间可用"}
                  >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>重铸</span>
                      {(!isNightPhase || !hasWorkshop) && <Lock className="w-2 h-2 opacity-50" />}
                  </button>

                  {/* Insight/Appraise Button */}
                  <button
                      onClick={isNightPhase ? () => handleOpenInsight(item.id) : undefined}
                      disabled={!isNightPhase}
                      className={cn(
                          baseButtonClass,
                          "border border-blue-900/50",
                          isNightPhase
                              ? cn(enabledClass, "text-blue-400 hover:border-blue-700 hover:bg-blue-950/30")
                              : cn(disabledClass, "text-blue-600/50")
                      )}
                      title={isNightPhase ? "格物研究 (Insight)" : "仅夜间可用"}
                  >
                      <Eye className="w-3.5 h-3.5" />
                      <span>格物</span>
                      {!isNightPhase && <Lock className="w-2 h-2 opacity-50" />}
                  </button>

                  {/* Sell Button */}
                  <button
                      onClick={isNightPhase && hasBlackMarket ? () => handleOpenBlackmarket(item.id) : undefined}
                      disabled={!isNightPhase || !hasBlackMarket}
                      className={cn(
                          baseButtonClass,
                          "border border-amber-900/50",
                          isNightPhase && hasBlackMarket
                              ? cn(enabledClass, "text-amber-400 hover:border-amber-700 hover:bg-amber-950/30")
                              : cn(disabledClass, "text-amber-600/50")
                      )}
                      title={!hasBlackMarket ? "需要解锁「黑市联络电话」" : isNightPhase ? "黑市出售 (Black Market)" : "仅夜间可用"}
                  >
                      <Skull className="w-3.5 h-3.5" />
                      <span>出售</span>
                      {(!isNightPhase || !hasBlackMarket) && <Lock className="w-2 h-2 opacity-50" />}
                  </button>
              </div>
          </div>
      );
  };

  // Stats
  const totalActiveValue = activeItems.reduce((acc, i) => acc + i.pawnAmount, 0);
  const potentialProfit = activeItems.reduce((acc, i) => {
      const interest = i.pawnInfo ? calculateInterest(i.pawnInfo.principal, i.pawnInfo.interestRate, i.pawnInfo.termDays) : 0;
      return acc + interest;
  }, 0);

  // Inventory capacity
  const inventoryCapacity = getEffectiveInventoryCapacity(state.shopUpgrades);
  const currentInventoryCount = displayItems.length;
  const isAtCapacity = currentInventoryCount >= inventoryCapacity;
  const isNearCapacity = currentInventoryCount >= inventoryCapacity - 1;

  return (
    <Modal
      isOpen={state.showInventory}
      onClose={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
      title={<span className="font-mono tracking-widest flex items-center gap-2"><PackageOpen className="w-5 h-5" /> VAULT_MANAGEMENT_SYS <HelpTooltip text="管理库存物品。查看当品详情、到期日期、物品历史。夜间可进行格物研究、修复重铸、黑市出售。" /></span>}
      size="xl"
      noPadding
    >
      <div className="flex flex-col h-[700px] bg-noir-100">
          
          {/* Dashboard Header */}
          <div className="bg-black border-b border-noir-400 p-4 grid grid-cols-5 gap-4 shadow-md z-10">
              <div className={cn(
                  "bg-noir-200 border p-2 rounded flex flex-col items-center justify-center",
                  isAtCapacity ? "border-red-500" : isNearCapacity ? "border-amber-500" : storageVisual.borderColor
              )}>
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Package className="w-3 h-3" /> {storageVisual.label}
                  </span>
                  <span className={cn(
                      "text-lg font-mono font-bold",
                      isAtCapacity ? "text-red-500" : isNearCapacity ? "text-amber-500" : storageVisual.color
                  )}>
                      {currentInventoryCount}/{inventoryCapacity}
                  </span>
                  {storageLevel > 0 && (
                      <span className={cn("text-[8px] mt-0.5 font-mono", storageVisual.color)}>
                          Lv{storageLevel}
                      </span>
                  )}
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Active Pawns</span>
                  <span className="text-lg font-mono font-bold text-noir-txt-primary">{activeItems.length}</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Owned</span>
                  <span className={cn("text-lg font-mono font-bold", ownedItems.length > 0 ? "text-amber-500" : "text-noir-txt-muted")}>{ownedItems.length}</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Active Principal</span>
                  <span className="text-lg font-mono font-bold text-noir-txt-primary">${totalActiveValue}</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Expiring Soon</span>
                  <span className={cn("text-lg font-mono font-bold", expiringItems.length > 0 ? "text-red-500 animate-pulse" : "text-noir-txt-muted")}>
                      {expiringItems.length}
                  </span>
              </div>
          </div>


          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] relative">
              <div className="absolute inset-0 bg-black/50 pointer-events-none fixed"></div>
              
              {displayItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-noir-400 font-mono relative z-10">
                      <div className="w-20 h-20 border-2 border-dashed border-noir-400 rounded-full flex items-center justify-center mb-4">
                          <PackageOpen className="w-10 h-10 opacity-50" />
                      </div>
                      <p className="text-sm tracking-widest uppercase">NO ASSETS FOUND IN SECTOR</p>
                  </div>
              ) : (
                  <>
                    {/* #22: NPC filter active indicator */}
                    {filterChainId && (
                      <div className="mb-3 flex items-center gap-2 relative z-10">
                        <span className="text-xs text-amber-400 font-mono tracking-wider">
                          {'>'} NPC_FILTER_ACTIVE
                        </span>
                        <button
                          onClick={() => setFilterChainId(null)}
                          className="text-[10px] text-stone-400 hover:text-white border border-stone-600 hover:border-stone-400 px-2 py-0.5 rounded transition-colors"
                        >
                          CLEAR
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pb-10">
                        {displayItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                currentDay={currentDay}
                                actions={renderActions(item)}
                                onNpcClick={handleNpcClick}
                                highlightChainId={filterChainId}
                            />
                        ))}
                    </div>
                  </>
              )}
          </div>
      </div>

      {/* Item Detail Modal */}
      {detailItem && (
          <ItemDetailModal
              item={detailItem}
              currentDay={currentDay}
              isOpen={!!detailItem}
              onClose={() => setDetailItem(null)}
          />
      )}
    </Modal>
  );
};
