
import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from './store/GameContext';
import { useGameEngine } from './hooks/useGameEngine';
import { useNegotiation } from './hooks/useNegotiation';
import { Dashboard } from './components/Dashboard';
import { CustomerView } from './components/CustomerView';
import { ItemPanel } from './components/ItemPanel';
import { NegotiationPanel } from './components/NegotiationPanel';
import { RedemptionInterface } from './components/RedemptionInterface';
import { EndOfDaySummary } from './components/EndOfDaySummary';
import { InventoryModal } from './components/InventoryModal'; 
import { MailModal } from './components/MailModal';
import { DebugPanel } from './components/DebugPanel';
import { ShopClosedView } from './components/ShopClosedView';
import { Button } from './components/ui/Button';
import { GamePhase } from './types';
import { Sun } from 'lucide-react';

const GameContent: React.FC = () => {
  const { state, dispatch } = useGame();
  const { startNewDay, generateDailyEvent } = useGameEngine();
  const [loadingText, setLoadingText] = useState("");
  
  // Hoist Negotiation State to App Level so ItemPanel and NegotiationPanel can share it
  const negotiation = useNegotiation(state.currentCustomer);

  useEffect(() => {
    if (state.phase === GamePhase.TRADING && !state.isLoading) {
      setLoadingText("Someone is approaching the counter...");
      generateDailyEvent();
    }
  }, [state.phase, state.isLoading, generateDailyEvent]);

  // Sync Patience/Mood back to global state for CustomerView updates (used in Redemption)
  useEffect(() => {
    if (state.currentCustomer && state.currentCustomer.interactionType === 'PAWN') {
        const needsUpdate = 
            state.currentCustomer.patience !== negotiation.patience || 
            state.currentCustomer.mood !== negotiation.mood || 
            state.currentCustomer.currentAskPrice !== negotiation.currentAskPrice;

        if (needsUpdate) {
            dispatch({ 
                type: 'UPDATE_CUSTOMER_STATUS', 
                payload: { 
                  patience: negotiation.patience, 
                  mood: negotiation.mood, 
                  currentAskPrice: negotiation.currentAskPrice 
                } 
            });
        }
    }
  }, [negotiation.patience, negotiation.mood, negotiation.currentAskPrice, state.currentCustomer, dispatch]);


  if (state.phase === GamePhase.START_SCREEN) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555596899-d6444755a3a1?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-20 blur-sm"></div>
        <div className="z-10 text-center max-w-2xl">
          <h1 className="text-6xl font-mono font-bold mb-4 text-pawn-accent tracking-tighter">THE PAWN'S DILEMMA</h1>
          <p className="text-xl text-gray-400 mb-8 font-serif italic">
            "Gold has a price. Conscience costs extra."
          </p>
          <div className="bg-gray-900/80 p-6 rounded-lg border border-gray-700 mb-8 text-left space-y-4">
             <p>欢迎来到当铺柜台。</p>
             <ul className="list-disc list-inside text-gray-300 space-y-2">
               <li><strong className="text-pawn-accent">鉴定</strong>：发现物品的真伪与真实价值。</li>
               <li><strong className="text-pawn-accent">博弈</strong>：压低价格会提升商业信誉，但会损害人性。</li>
               <li><strong className="text-pawn-accent">生存</strong>：每5天缴纳一次房租。</li>
             </ul>
          </div>
          <Button onClick={() => dispatch({ type: 'START_GAME' })} className="text-xl px-8 py-4">OPEN SHOP</Button>
        </div>
      </div>
    );
  }

  if (state.phase === GamePhase.MORNING_BRIEF) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-pawn-dark text-white p-4">
        <div className="max-w-md w-full bg-pawn-panel p-8 border-t-4 border-pawn-accent shadow-2xl">
          <div className="flex items-center gap-3 mb-6 text-pawn-accent">
            <Sun className="w-8 h-8" />
            <h2 className="text-3xl font-mono">DAY {state.stats.day}</h2>
          </div>
          
          <div className="space-y-4 mb-8">
            <p className="text-gray-300">卷帘门拉开，城市苏醒。你清点了一下保险箱。</p>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span>持有现金</span>
              <span className="font-mono text-green-400">${state.stats.cash}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span>预计今日开支</span>
              <span className="font-mono text-red-400">-${state.stats.dailyExpenses}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span>下一次交租 (Day {state.stats.rentDueDate})</span>
              <span className="font-mono text-yellow-500">${state.stats.rentDue}</span>
            </div>
            {state.pendingMails.some(m => m.arrivalDay <= state.stats.day) && (
                 <div className="flex justify-between pt-2 text-pawn-accent animate-pulse">
                    <span>提示</span>
                    <span>有新邮件送达</span>
                 </div>
            )}
          </div>

          <Button onClick={startNewDay} className="w-full">开门营业 (UNLOCK)</Button>
        </div>
      </div>
    );
  }

  if (state.phase === GamePhase.END_OF_DAY) {
    return <EndOfDaySummary />;
  }
  
  if (state.phase === GamePhase.GAME_OVER) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-950 text-white">
        <div className="text-center">
           <h1 className="text-6xl font-black mb-4">破产 (BANKRUPT)</h1>
           <p className="text-xl mb-8">店铺倒闭了。</p>
           <p className="text-md text-red-300 mb-8">{state.dayEvents[state.dayEvents.length - 1]}</p>
           <Button onClick={() => window.location.reload()}>再试一次</Button>
        </div>
      </div>
    )
  }

  const isNegotiating = state.phase === GamePhase.NEGOTIATION;
  const isShopClosed = state.phase === GamePhase.SHOP_CLOSED;
  
  // Detect Redemption Mode
  const isRedemption = isNegotiating && state.currentCustomer?.interactionType === 'REDEEM';

  return (
    <div className="h-screen flex flex-col bg-pawn-dark text-pawn-text overflow-hidden font-sans">
      <Dashboard />
      
      <InventoryModal />
      <MailModal />
      <DebugPanel />

      <main className="flex-1 overflow-hidden relative">
        {state.isLoading && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-pawn-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-mono text-pawn-accent animate-pulse">{loadingText}</p>
          </div>
        )}

        {/* SHOP CLOSED VIEW OVERLAY */}
        {isShopClosed && (
            <div className="absolute inset-0 z-40 animate-in fade-in duration-500">
                <ShopClosedView />
            </div>
        )}

        {/* Layout Grid */}
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 bg-black/20">
            
            {isRedemption ? (
                // REDEMPTION LAYOUT
                <RedemptionInterface />
            ) : (
                // STANDARD PAWN LAYOUT
                <>
                    {/* Column 1: Item & Intel (50%) */}
                    <div className="lg:col-span-6 h-full border-r border-white/10 overflow-hidden relative">
                        {isNegotiating ? (
                        <ItemPanel 
                            applyLeverage={negotiation.applyLeverage} 
                            triggerNarrative={negotiation.triggerNarrative}
                            canInteract={!negotiation.isWalkedAway}
                        />
                        ) : (
                        <div className="h-full flex items-center justify-center text-stone-700 font-mono">
                            <span>...</span>
                        </div>
                        )}
                    </div>

                    {/* Column 2: Negotiation (50%) */}
                    <div className="lg:col-span-6 h-full overflow-hidden">
                        {isNegotiating ? (
                        <NegotiationPanel negotiation={negotiation} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-stone-600 font-mono text-center p-8">
                            {!isShopClosed && <p className="animate-pulse">等待顾客光临...</p>}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
};

export default App;
