
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { X, PackageOpen, AlertTriangle, Clock, Skull, ShieldCheck, Heart, Package, Shirt, ShoppingBag, Smartphone, Gem, Music, Gamepad2, Archive, DollarSign, RefreshCw, AlertOctagon } from 'lucide-react';
import { ItemStatus, Item } from '../types';
import { Button } from './ui/Button';
import { RedemptionModal } from './RedemptionModal';

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

export const InventoryModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const { sellActivePawn } = usePawnShop();
  
  const [redemptionItem, setRedemptionItem] = useState<Item | null>(null);
  const [forceSellConfirm, setForceSellConfirm] = useState<string | null>(null);

  if (!state.showInventory) return null;

  // Show ACTIVE, FORFEIT, and SOLD (to allow seeing breach status)
  // Filter out REDEEMED as they are gone.
  const items = state.inventory.filter(i => i.status !== ItemStatus.REDEEMED);

  const calculateDaysLeft = (item: Item) => {
    if (item.status === ItemStatus.FORFEIT) return 0;
    if (!item.pawnInfo) return 0;
    return Math.max(0, item.pawnInfo.dueDate - state.stats.day);
  };

  const handleForceSell = (item: Item) => {
      sellActivePawn(item);
      setForceSellConfirm(null);
  };

  return (
    <>
    {redemptionItem && (
        <RedemptionModal item={redemptionItem} onClose={() => setRedemptionItem(null)} />
    )}

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

                      {!isSold && !isForfeit && (
                        <div className="flex items-center gap-2 text-xs text-stone-400 bg-stone-900/50 p-1.5 rounded mb-2">
                           <Clock className="w-3 h-3" />
                           <span>到期: {daysLeft} 天</span>
                        </div>
                      )}
                    </div>

                    {/* Action Footer */}
                    <div className="bg-[#141211] p-2 border-t border-[#292524] grid grid-cols-2 gap-2">
                        
                        {/* LEFT: Redemption / Manage */}
                        <Button 
                            variant="secondary" 
                            className="h-8 text-xs px-1"
                            onClick={() => setRedemptionItem(item)}
                        >
                            <RefreshCw className="w-3 h-3 mr-1 inline" />
                            {isSold ? '违约处理' : '客户赎回'}
                        </Button>

                        {/* RIGHT: Force Sell (Active) or Liquidate (Forfeit) */}
                        {isForfeit && (
                             <Button 
                                variant="primary" 
                                className="h-8 text-xs px-1"
                                onClick={() => {/* Existing Logic in EndOfDay, maybe duplicate here later? */}}
                                disabled={true} // Keep Liquidation in EndOfDay only for now as per design
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

                        {isSold && (
                            <div className="flex items-center justify-center text-[10px] text-stone-600 font-mono bg-stone-900 rounded">
                                已售出
                            </div>
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
    </>
  );
};
