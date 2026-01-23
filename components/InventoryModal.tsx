

import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { X, PackageOpen, AlertTriangle, Clock, Skull, ShieldCheck, Heart, Package, Shirt, ShoppingBag, Smartphone, Gem, Music, Gamepad2, Archive, DollarSign, AlertOctagon, BookOpen } from 'lucide-react';
import { ItemStatus, Item } from '../types';
import { Button } from './ui/Button';

const getCategoryIcon = (category: string) => {
    switch(category) {
        case '服饰': return <Shirt className="w-8 h-8 text-stone-500" />;
        case '奢侈品': return <ShoppingBag className="w-8 h-8 text-stone-500" />;
        case '电子产品': return <Smartphone className="w-8 h-8 text-stone-500" />;
        case '珠宝': return <Gem className="w-8 h-8 text-stone-500" />;
        case '违禁品': return <Skull className="w-8 h-8 text-stone-500" />;
        case '古玩': return <Archive className="w-8 h-8 text-stone-500" />;
        case '玩具': return <Gamepad2 className="w-8 h-8 text-stone-500" />;
        case '乐器': return <Music className="w-8 h-8 text-stone-500" />;
        default: return <Package className="w-8 h-8 text-stone-500" />;
    }
}

const LOG_TYPE_COLORS: Record<string, string> = {
    'ENTRY': 'text-blue-400',
    'REDEEM': 'text-green-400',
    'FORFEIT': 'text-red-400',
    'SOLD': 'text-amber-400',
    'INFO': 'text-stone-400'
};

export const InventoryModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const { sellActivePawn } = usePawnShop();
  
  const [forceSellConfirm, setForceSellConfirm] = useState<string | null>(null);

  if (!state.showInventory) return null;

  // Show ACTIVE, FORFEIT, and SOLD (to allow seeing breach status)
  // Filter out REDEEMED as they are gone.
  let items = state.inventory.filter(i => i.status !== ItemStatus.REDEEMED);

  const calculateDaysLeft = (item: Item) => {
    if (item.status === ItemStatus.FORFEIT) return 0;
    if (!item.pawnInfo) return 0;
    return Math.max(0, item.pawnInfo.dueDate - state.stats.day);
  };

  // Sort: Active with low days left -> Forfeit -> Active with high days -> Sold
  items.sort((a, b) => {
      const aDays = calculateDaysLeft(a);
      const bDays = calculateDaysLeft(b);
      
      const aPriority = a.status === ItemStatus.FORFEIT ? 1 : a.status === ItemStatus.ACTIVE ? 0 : 2;
      const bPriority = b.status === ItemStatus.FORFEIT ? 1 : b.status === ItemStatus.ACTIVE ? 0 : 2;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // If both active, sort by days left asc
      if (a.status === ItemStatus.ACTIVE && b.status === ItemStatus.ACTIVE) {
          return aDays - bDays;
      }
      return 0;
  });

  const handleForceSell = (item: Item) => {
      sellActivePawn(item);
      setForceSellConfirm(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[85vh] bg-[#1c1917] border-2 border-[#44403c] rounded-lg shadow-2xl flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#292524] p-4 flex justify-between items-center border-b border-[#44403c]">
          <h2 className="text-xl font-mono font-bold text-pawn-accent flex items-center gap-3">
            <PackageOpen className="w-6 h-6" />
            库存管理 (INVENTORY CONTROL)
          </h2>
          <button 
            onClick={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-900/50 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-600 font-mono">
              <PackageOpen className="w-16 h-16 mb-4 opacity-20" />
              <p>保险柜是空的。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => {
                const isForfeit = item.status === ItemStatus.FORFEIT;
                const isActive = item.status === ItemStatus.ACTIVE;
                const isSold = item.status === ItemStatus.SOLD;
                
                const daysLeft = calculateDaysLeft(item);
                const confirmingSell = forceSellConfirm === item.id;
                
                let statusColor = 'bg-yellow-600';
                let statusText = 'ACTIVE';
                let borderColor = 'border-[#292524]';
                
                // Urgency Styling for Active Items
                if (isActive) {
                    if (daysLeft <= 1) {
                        borderColor = 'border-red-500 animate-pulse';
                    } else if (daysLeft <= 3) {
                        borderColor = 'border-yellow-500';
                    }
                }

                if (isForfeit) { statusColor = 'bg-red-600'; statusText = 'FORFEIT'; }
                if (isSold) { statusColor = 'bg-stone-600'; statusText = 'SOLD'; borderColor = 'border-red-900/30 bg-red-950/10'; }

                return (
                  <div key={item.id} className={`bg-[#0c0a09] border ${borderColor} rounded group hover:border-stone-500 transition-colors relative overflow-hidden flex flex-col`}>
                    
                    {/* Status Stripe */}
                    <div className={`h-1 w-full ${statusColor}`}></div>
                    
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-stone-200 truncate pr-2 w-2/3">{item.name}</h3>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isForfeit 
                            ? 'bg-red-950 text-red-500 border-red-900' 
                            : isSold 
                            ? 'bg-stone-800 text-stone-500 border-stone-600'
                            : 'bg-yellow-950 text-yellow-500 border-yellow-900'
                        }`}>
                          {statusText}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                         <div className="w-16 h-16 bg-stone-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-700 relative">
                           {getCategoryIcon(item.category)}
                           {isSold && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-stone-500 font-black rotate-[-15deg] border-2 border-stone-500 m-1">SOLD</div>}
                         </div>
                         <div className="text-xs text-stone-500 space-y-1">
                            <p>类别: {item.category}</p>
                            <p>成色: {item.condition}</p>
                            <div className="flex gap-1 mt-1">
                               {item.isFake && <AlertTriangle className="w-3 h-3 text-red-500"/>}
                               {item.isStolen && <Skull className="w-3 h-3 text-purple-500"/>}
                               {item.sentimentalValue && <Heart className="w-3 h-3 text-rose-500"/>}
                               {!item.isFake && !item.isStolen && item.appraised && <ShieldCheck className="w-3 h-3 text-green-500"/>}
                            </div>
                         </div>
                      </div>

                      {/* Financials */}
                      <div className="bg-[#1c1917] p-2 rounded text-xs font-mono grid grid-cols-2 gap-2 border border-[#292524] mb-3">
                         <div>
                            <span className="block text-stone-600">已付当金</span>
                            <span className="text-stone-300">${item.pawnAmount}</span>
                         </div>
                         <div>
                            <span className="block text-stone-600">真实估值</span>
                            {item.appraised || isSold ? (
                                <span className="text-pawn-green">${item.realValue}</span>
                            ) : (
                                <span className="text-stone-700">???</span>
                            )}
                         </div>
                      </div>
                      
                      {/* NARRATIVE LOG DISPLAY (New Feature) */}
                      {item.logs && item.logs.length > 0 ? (
                          <div className="mb-3">
                              <div className="flex items-center gap-1 text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">
                                  <BookOpen className="w-3 h-3"/> 档案记录 (Journal)
                              </div>
                              <div className="bg-stone-900/30 border border-stone-800 rounded p-2 text-[10px] text-stone-400 font-serif leading-relaxed h-20 overflow-y-auto custom-scrollbar-light">
                                  {item.logs.map(log => (
                                      <div key={log.id} className="mb-2 last:mb-0 border-b border-stone-800/50 pb-1 last:border-0">
                                          <span className="text-stone-600 font-sans mr-1">[Day {log.day}]</span>
                                          <span className={LOG_TYPE_COLORS[log.type] || 'text-stone-400'}>
                                              {log.content}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          // Fallback to description if no logs
                          <div className="mb-3 text-[10px] text-stone-600 italic border-l-2 border-stone-700 pl-2">
                             "{item.historySnippet}"
                          </div>
                      )}

                      {!isSold && !isForfeit && (
                        <div className={`flex items-center gap-2 text-xs bg-stone-900/50 p-1.5 rounded mb-2 ${daysLeft <= 3 ? 'text-red-400 font-bold border border-red-900/30' : 'text-stone-400'}`}>
                           <Clock className="w-3 h-3" />
                           <span>到期: {daysLeft} 天</span>
                           {daysLeft <= 1 && <span className="text-[10px] bg-red-600 text-white px-1 rounded animate-pulse">EXPIRING</span>}
                        </div>
                      )}
                    </div>

                    {/* Action Footer */}
                    <div className="bg-[#141211] p-2 border-t border-[#292524] grid grid-cols-2 gap-2">
                        
                        {/* LEFT: Status Info (No Interactions) */}
                        <div className="flex items-center justify-center">
                            {isSold && (
                                <span className="text-[10px] text-stone-600 font-mono bg-stone-900/50 px-2 py-1 rounded w-full text-center">
                                    等待事件触发
                                </span>
                            )}
                        </div>

                        {/* RIGHT: Force Sell (Active) or Liquidate (Forfeit) */}
                        {isForfeit && (
                             <Button 
                                variant="primary" 
                                className="h-8 text-xs px-1"
                                onClick={() => {/* Handled in EndOfDay */}}
                                disabled={true} 
                                title="请在每日结算时处理绝当"
                            >
                                <DollarSign className="w-3 h-3 mr-1 inline" />
                                待结算
                            </Button>
                        )}
                        
                        {isActive && !confirmingSell && (
                            <Button 
                                variant="danger" 
                                className="h-8 text-xs px-1 border-stone-700 text-stone-500 hover:text-red-500 hover:border-red-500 bg-transparent"
                                onClick={() => setForceSellConfirm(item.id)}
                            >
                                <AlertOctagon className="w-3 h-3 mr-1 inline" />
                                违约出售
                            </Button>
                        )}

                        {isActive && confirmingSell && (
                             <Button 
                                variant="danger" 
                                className="h-8 text-xs px-1 animate-pulse"
                                onClick={() => handleForceSell(item)}
                            >
                                确定卖出?
                            </Button>
                        )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer Summary */}
        <div className="bg-[#1c1917] p-3 border-t border-[#44403c] text-xs font-mono text-stone-500 flex justify-between px-6">
           <span>库存: {items.length}</span>
           <span>本金占用: ${items.filter(i => i.status === 'ACTIVE').reduce((acc, i) => acc + i.pawnAmount, 0)}</span>
        </div>
      </div>
    </div>
  );
};