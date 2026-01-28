
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { PackageOpen, DollarSign, ShieldAlert } from 'lucide-react';
import { ItemStatus, Item } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ItemCard } from './ui/ItemCard';
import { playSfx } from '../systems/game/audio';
import { cn } from '../lib/utils';

export const InventoryModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const { sellActivePawn, sellForfeitItem } = usePawnShop();

  const [forceSellConfirm, setForceSellConfirm] = useState<string | null>(null);
  const [liquidateConfirm, setLiquidateConfirm] = useState<string | null>(null);

  if (!state.showInventory) return null;

  const currentDay = state.stats.day;

  // Get items that are still in inventory (exclude REDEEMED and SOLD - they left the shop)
  const inventoryItems = state.inventory.filter(i =>
      i.status === ItemStatus.ACTIVE || i.status === ItemStatus.FORFEIT
  );

  // Count categories for stats
  const activeItems = inventoryItems.filter(i => i.status === ItemStatus.ACTIVE);
  const forfeitItems = inventoryItems.filter(i => i.status === ItemStatus.FORFEIT);
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

  const handleForceSell = (item: Item) => {
      sellActivePawn(item);
      setForceSellConfirm(null);
  };

  const handleLiquidate = (item: Item) => {
      sellForfeitItem(item);
      setLiquidateConfirm(null);
  };

  const renderActions = (item: Item) => {
      const isForfeit = item.status === ItemStatus.FORFEIT;
      const isActive = item.status === ItemStatus.ACTIVE;
      const isSold = item.status === ItemStatus.SOLD;
      const isRedeemed = item.status === ItemStatus.REDEEMED;
      const confirmingSell = forceSellConfirm === item.id;
      const confirmingLiquidate = liquidateConfirm === item.id;

      if (isForfeit) {
          if (confirmingLiquidate) {
              return (
                <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-[10px] h-7"
                    onClick={() => handleLiquidate(item)}
                >
                    CONFIRM LIQUIDATE +${item.realValue}
                </Button>
              );
          }
          return (
            <Button
                variant="ghost"
                size="sm"
                className="w-full text-[10px] h-7 text-amber-500 hover:text-amber-400 hover:bg-amber-950/20 border border-amber-900/30"
                onClick={() => { setLiquidateConfirm(item.id); playSfx('CLICK'); }}
                title="Sell this forfeited item for its real value"
            >
                <DollarSign className="w-3 h-3 mr-1" />
                LIQUIDATE NOW
            </Button>
          );
      }

      if (isSold || isRedeemed) {
          return null; // No actions for closed transactions
      }

      if (isActive) {
          if (confirmingSell) {
              return (
                <Button
                    variant="danger"
                    size="sm"
                    className="w-full text-[10px] h-7"
                    onClick={() => handleForceSell(item)}
                >
                    CONFIRM BREACH?
                </Button>
              );
          }
          return (
            <Button
                variant="ghost"
                size="sm"
                className="w-full text-[10px] h-7 text-noir-txt-muted hover:text-red-500 hover:bg-red-950/10 border border-transparent hover:border-red-900/30"
                onClick={() => { setForceSellConfirm(item.id); playSfx('WARNING'); }}
                title="Sell item before due date (Breach of Contract)"
            >
                <ShieldAlert className="w-3 h-3 mr-1" />
                BREACH & SELL
            </Button>
          );
      }
      return null;
  };

  // Stats
  const totalActiveValue = activeItems.reduce((acc, i) => acc + i.pawnAmount, 0);
  const potentialProfit = activeItems.reduce((acc, i) => {
      const interest = i.pawnInfo ? Math.ceil(i.pawnInfo.principal * i.pawnInfo.interestRate) : 0;
      return acc + interest;
  }, 0);

  return (
    <Modal
      isOpen={state.showInventory}
      onClose={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
      title={<span className="font-mono tracking-widest flex items-center gap-2"><PackageOpen className="w-5 h-5" /> VAULT_MANAGEMENT_SYS</span>}
      size="xl"
      noPadding
    >
      <div className="flex flex-col h-[700px] bg-noir-100">
          
          {/* Dashboard Header */}
          <div className="bg-black border-b border-noir-400 p-4 grid grid-cols-4 gap-4 shadow-md z-10">
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Active Pawns</span>
                  <span className="text-lg font-mono font-bold text-noir-txt-primary">{activeItems.length}</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Owned (Forfeit)</span>
                  <span className={cn("text-lg font-mono font-bold", forfeitItems.length > 0 ? "text-amber-500" : "text-noir-txt-muted")}>{forfeitItems.length}</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pb-10">
                      {displayItems.map(item => (
                          <ItemCard
                              key={item.id}
                              item={item}
                              currentDay={currentDay}
                              actions={renderActions(item)}
                          />
                      ))}
                  </div>
              )}
          </div>
      </div>
    </Modal>
  );
};
