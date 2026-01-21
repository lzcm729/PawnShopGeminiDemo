
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
import { GamePhase, NewsCategory } from './types';
import { Sun, Radio, TrendingUp, AlertTriangle } from 'lucide-react';

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
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-white p-4 font-mono relative overflow-hidden">
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none z-20 opacity-30"></div>
        
        <div className="max-w-4xl w-full bg-[#141414] border-2 border-stone-700 shadow-2xl relative z-10 flex flex-col md:flex-row h-[80vh]">
           
           {/* LEFT: System Status */}
           <div className="w-full md:w-1/3 bg-[#0f0f0f] border-r border-stone-700 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-8 text-stone-500 border-b border-stone-800 pb-4">
                <Sun className="w-6 h-6" />
                <h2 className="text-xl font-bold tracking-widest">SYSTEM_WAKE</h2>
              </div>
              
              <div className="space-y-6 flex-1">
                <div className="flex justify-between items-center">
                   <span className="text-stone-500 text-xs uppercase">Cycle</span>
                   <span className="text-3xl font-bold text-white">DAY {state.stats.day}</span>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                      <span className="text-stone-500">LIQUID_ASSETS</span>
                      <span className="text-green-500 font-bold">${state.stats.cash}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-stone-500">EST_EXPENSES</span>
                      <span className="text-red-500">-${state.stats.dailyExpenses}</span>
                   </div>
                   <div className="flex justify-between text-sm border-t border-stone-800 pt-2">
                      <span className="text-stone-500">RENT_DUE (D-{state.stats.rentDueDate - state.stats.day})</span>
                      <span className="text-yellow-500">${state.stats.rentDue}</span>
                   </div>
                </div>

                <div className="bg-stone-900/50 p-4 rounded border border-stone-800 mt-auto">
                    <h3 className="text-stone-500 text-xs font-bold mb-2 flex items-center gap-2">
                        <Radio className="w-3 h-3" /> MAIL_SERVER
                    </h3>
                    {state.pendingMails.some(m => m.arrivalDay <= state.stats.day) ? (
                        <div className="text-green-500 text-xs animate-pulse">
                            [!] NEW MESSAGE RECEIVED
                        </div>
                    ) : (
                        <div className="text-stone-600 text-xs">
                            NO NEW MESSAGES
                        </div>
                    )}
                </div>
              </div>

              <Button onClick={startNewDay} className="w-full mt-6 border-stone-600 hover:border-white text-stone-300">
                  <span className="animate-pulse">INITIALIZE_SHOP()</span>
              </Button>
           </div>

           {/* RIGHT: City News Feed */}
           <div className="flex-1 bg-[#1a1a1a] p-8 overflow-y-auto custom-scrollbar relative">
               <div className="absolute top-0 right-0 p-2 text-[10px] text-stone-600 font-bold uppercase tracking-widest bg-black/20">
                   CITY_NEWS_FEED_V4.2
               </div>

               <h3 className="text-2xl font-black text-stone-300 mb-6 uppercase tracking-tighter border-b-4 border-stone-800 pb-2 inline-block">
                   Morning Brief
               </h3>

               <div className="space-y-6">
                   {state.dailyNews.length === 0 ? (
                       <div className="text-stone-600 italic text-sm">No significant news reports today...</div>
                   ) : (
                       state.dailyNews.map(news => {
                           let borderClass = "border-l-4 border-stone-600 pl-4";
                           let titleClass = "text-stone-300";
                           let icon = null;

                           if (news.category === NewsCategory.NARRATIVE) {
                               borderClass = "border-l-4 border-pawn-accent pl-4 bg-amber-950/10 p-2";
                               titleClass = "text-pawn-accent";
                               icon = <AlertTriangle className="w-4 h-4 text-pawn-accent inline mr-2" />;
                           } else if (news.category === NewsCategory.MARKET) {
                               borderClass = "border-l-4 border-blue-600 pl-4 bg-blue-950/10 p-2";
                               titleClass = "text-blue-400";
                               icon = <TrendingUp className="w-4 h-4 text-blue-400 inline mr-2" />;
                           }

                           return (
                               <div key={news.id} className={`${borderClass} mb-4`}>
                                   <h4 className={`text-lg font-bold font-serif mb-1 ${titleClass}`}>
                                       {icon}{news.headline}
                                   </h4>
                                   <p className="text-sm text-stone-400 leading-relaxed font-sans">
                                       {news.body}
                                   </p>
                                   {news.effect && (
                                       <div className="mt-2 text-[10px] uppercase font-bold text-stone-500 flex gap-2">
                                           <span>Market Impact:</span>
                                           <span className={news.effect.priceMultiplier && news.effect.priceMultiplier < 1 ? 'text-red-500' : 'text-green-500'}>
                                               {news.effect.categoryTarget} Value {news.effect.priceMultiplier && news.effect.priceMultiplier > 1 ? '▲' : '▼'}
                                           </span>
                                       </div>
                                   )}
                               </div>
                           );
                       })
                   )}
               </div>
           </div>

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
