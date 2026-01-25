
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { PackageOpen, AlertOctagon, DollarSign, Archive, Clock, ShieldAlert, FileOutput } from 'lucide-react';
import { ItemStatus, Item } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ItemCard } from './ui/ItemCard';
import { playSfx } from '../systems/game/audio';
import { cn } from '../lib/utils';

type InventoryTab = 'ACTIVE' | 'EXPIRING' | 'ARCHIVE';

export const InventoryModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const { sellActivePawn } = usePawnShop();
  
  const [activeTab, setActiveTab] = useState<InventoryTab>('ACTIVE');
  const [forceSellConfirm, setForceSellConfirm] = useState<string | null>(null);

  if (!state.showInventory) return null;

  const currentDay = state.stats.day;

  // Filter Logic
  const allItems = state.inventory;
  
  const expiringItems = allItems.filter(i => 
      i.status === ItemStatus.ACTIVE && 
      i.pawnInfo && 
      (i.pawnInfo.dueDate - currentDay <= 2)
  );

  const activeItems = allItems.filter(i => i.status === ItemStatus.ACTIVE);
  
  const archiveItems = allItems.filter(i => 
      i.status === ItemStatus.SOLD || 
      i.status === ItemStatus.FORFEIT || 
      i.status === ItemStatus.REDEEMED
  );

  let displayItems: Item[] = [];
  if (activeTab === 'ACTIVE') displayItems = activeItems;
  if (activeTab === 'EXPIRING') displayItems = expiringItems;
  if (activeTab === 'ARCHIVE') displayItems = archiveItems;

  // Sort Logic: Default to Day Ascending (Oldest first)
  displayItems.sort((a, b) => {
      // Prioritize Forfeit in Archive
      if (activeTab === 'ARCHIVE') {
          if (a.status === ItemStatus.FORFEIT && b.status !== ItemStatus.FORFEIT) return -1;
          if (b.status === ItemStatus.FORFEIT && a.status !== ItemStatus.FORFEIT) return 1;
      }
      return (a.pawnDate || 0) - (b.pawnDate || 0);
  });

  const handleForceSell = (item: Item) => {
      sellActivePawn(item);
      setForceSellConfirm(null);
  };

  const renderActions = (item: Item) => {
      const isForfeit = item.status === ItemStatus.FORFEIT;
      const isActive = item.status === ItemStatus.ACTIVE;
      const isSold = item.status === ItemStatus.SOLD;
      const confirmingSell = forceSellConfirm === item.id;

      if (isForfeit) {
          return (
            <div className="flex items-center text-amber-500 text-[10px] font-bold">
                <DollarSign className="w-3 h-3 mr-1" />
                LIQUIDATE IN E.O.D.
            </div>
          );
      }

      if (isSold) {
          return (
            <span className="text-[10px] text-noir-txt-muted w-full text-center py-1 font-mono uppercase">
                Transaction Closed
            </span>
          );
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
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Total Active Principal</span>
                  <span className="text-lg font-mono font-bold text-noir-txt-primary">${totalActiveValue}</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Proj. Interest</span>
                  <span className="text-lg font-mono font-bold text-green-500">+${potentialProfit}</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Vault Capacity</span>
                  <span className="text-lg font-mono font-bold text-noir-txt-primary">{activeItems.length} / 50</span>
              </div>
              <div className="bg-noir-200 border border-noir-300 p-2 rounded flex flex-col items-center justify-center">
                  <span className="text-[9px] text-noir-txt-muted uppercase tracking-wider mb-1">Critical Alerts</span>
                  <span className={cn("text-lg font-mono font-bold", expiringItems.length > 0 ? "text-red-500 animate-pulse" : "text-noir-txt-muted")}>
                      {expiringItems.length}
                  </span>
              </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-noir-400 bg-noir-200">
              {[
                  { id: 'ACTIVE', label: 'ACTIVE PAWNS', icon: Clock, count: activeItems.length },
                  { id: 'EXPIRING', label: 'CRITICAL / DUE', icon: AlertOctagon, count: expiringItems.length, color: 'text-red-500' },
                  { id: 'ARCHIVE', label: 'ARCHIVE / LOGS', icon: Archive, count: archiveItems.length }
              ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as InventoryTab); playSfx('CLICK'); }}
                    className={cn(
                        "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all relative overflow-hidden",
                        activeTab === tab.id 
                            ? "bg-noir-100 text-noir-txt-primary" 
                            : "bg-noir-300 text-noir-txt-muted hover:bg-noir-200 hover:text-noir-txt-secondary"
                    )}
                  >
                      {activeTab === tab.id && <div className="absolute top-0 left-0 right-0 h-0.5 bg-pawn-accent shadow-[0_0_10px_var(--accent-primary)]"></div>}
                      <tab.icon className={cn("w-4 h-4", tab.color)} />
                      {tab.label} 
                      <span className="bg-black/30 px-1.5 py-0.5 rounded text-[9px] ml-1">{tab.count}</span>
                  </button>
              ))}
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
