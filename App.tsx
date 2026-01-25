
import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from './store/GameContext';
import { useGameEngine } from './hooks/useGameEngine';
import { useNegotiation } from './hooks/useNegotiation';
import { Dashboard } from './systems/game/ui/Dashboard'; 
import { CustomerView } from './components/CustomerView';
import { ItemPanel } from './components/ItemPanel';
import { NegotiationPanel } from './components/NegotiationPanel';
import { SettlementInterface } from './components/RedemptionInterface';
import { EndOfDaySummary } from './components/EndOfDaySummary';
import { InventoryModal } from './components/InventoryModal'; 
import { MailModal } from './components/MailModal';
import { FinancialCalendar } from './components/FinancialCalendar';
import { DebugPanel } from './components/DebugPanel';
import { ShopClosedView } from './components/ShopClosedView';
import { Button } from './components/ui/Button';
import { GamePhase, NewsCategory, ItemStatus } from './types';
import { Sun, Radio, TrendingUp, Newspaper, CloudRain, Wind, AlertOctagon, Disc, Play } from 'lucide-react';
import { hasSaveGame, loadGame } from './systems/core/persistence';

const GameContent: React.FC = () => {
  const { state, dispatch } = useGame();
  const { startNewDay, generateDailyEvent } = useGameEngine();
  const [loadingText, setLoadingText] = useState("");
  const negotiation = useNegotiation(state.currentCustomer);
  
  const [saveExists, setSaveExists] = useState(false);

  useEffect(() => {
      setSaveExists(hasSaveGame());
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === GamePhase.TRADING && !state.isLoading) {
      setLoadingText("Someone is approaching the counter...");
      generateDailyEvent();
    }
  }, [state.phase, state.isLoading, generateDailyEvent]);

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

  const handleContinue = () => {
      const savedState = loadGame();
      if (savedState) {
          dispatch({ type: 'LOAD_GAME', payload: savedState });
      } else {
          alert("Save file corrupted or missing.");
          setSaveExists(false);
      }
  };

  if (state.phase === GamePhase.START_SCREEN) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555596899-d6444755a3a1?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-20 blur-sm"></div>
        
        {/* Animated Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none z-20"></div>

        <div className="z-30 text-center max-w-2xl animate-in fade-in zoom-in duration-1000">
          <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 border-4 border-pawn-accent rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(217,119,6,0.6)] animate-pulse">
                  <Disc className="w-12 h-12 text-pawn-accent spin-slow" />
              </div>
          </div>
          <h1 className="text-6xl font-mono font-bold mb-4 text-pawn-accent tracking-tighter shadow-black drop-shadow-lg">
              THE PAWN'S DILEMMA
          </h1>
          <p className="text-xl text-gray-400 mb-8 font-serif italic">
            "Gold has a price. Conscience costs extra."
          </p>
          
          <div className="flex flex-col gap-4 items-center">
              {saveExists && (
                  <Button onClick={handleContinue} className="text-lg px-12 py-4 border-2 border-pawn-green text-pawn-green hover:bg-pawn-green hover:text-black w-64">
                      <Play className="w-5 h-5 inline mr-2" />
                      CONTINUE
                  </Button>
              )}
              
              <Button onClick={() => dispatch({ type: 'START_GAME' })} className="text-lg px-12 py-4 w-64">
                  NEW GAME
              </Button>
          </div>

          <div className="mt-12 text-xs text-stone-600 font-mono">
              SYSTEM_VERSION: 1.1.0 (OFFLINE_READY)
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === GamePhase.MORNING_BRIEF) {
    const narratives = state.dailyNews.filter(n => n.category === NewsCategory.NARRATIVE);
    const markets = state.dailyNews.filter(n => n.category === NewsCategory.MARKET);
    const flavors = state.dailyNews.filter(n => n.category === NewsCategory.FLAVOR);
    
    const activeFlavor = flavors[0];
    const isRain = activeFlavor?.headline.includes("雨");

    const expiringItems = state.inventory.filter(i => 
        i.status === ItemStatus.ACTIVE && 
        i.pawnInfo && 
        (i.pawnInfo.dueDate - state.stats.day <= 3)
    ).sort((a,b) => (a.pawnInfo!.dueDate - state.stats.day) - (b.pawnInfo!.dueDate - state.stats.day));

    return (
      <>
        <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-white p-4 font-mono relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none z-20 opacity-30"></div>
          
          <div className="max-w-6xl w-full bg-[#141414] border-2 border-stone-700 shadow-2xl relative z-10 flex flex-col md:flex-row h-[85vh]">
             
             <div className="w-full md:w-1/4 bg-[#0f0f0f] border-r border-stone-700 p-6 flex flex-col relative">
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

                  {expiringItems.length > 0 && (
                      <div className="bg-red-950/20 border border-red-900 p-4 rounded mt-4">
                          <h3 className="text-red-500 text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider animate-pulse">
                              <AlertOctagon className="w-3 h-3" /> Expiry Alert
                          </h3>
                          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar-light">
                              {expiringItems.map(item => {
                                  const days = item.pawnInfo!.dueDate - state.stats.day;
                                  return (
                                      <div key={item.id} className="flex justify-between text-[10px] text-stone-400">
                                          <span className="truncate w-2/3">{item.name}</span>
                                          <span className={days <= 1 ? "text-red-500 font-bold" : "text-yellow-500"}>
                                              {days}d left
                                          </span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}

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

             <div className="flex-1 bg-[#e7e5e4] text-stone-900 relative flex flex-col">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-60 pointer-events-none mix-blend-multiply"></div>

                 <div className="p-6 border-b-2 border-stone-800 flex justify-between items-end relative z-10">
                     <div>
                         <h1 className="text-4xl font-black font-serif uppercase tracking-tight leading-none">The City Chronicle</h1>
                         <div className="text-xs font-mono text-stone-600 mt-1 flex gap-4 uppercase font-bold">
                             <span>Issue #{1000 + state.stats.day}</span>
                             <span>Section 12</span>
                             <span>Price: 5 Credits</span>
                         </div>
                     </div>
                     <div className="text-right">
                         {isRain ? (
                             <div className="flex items-center gap-2 text-stone-700">
                                 <span className="font-bold text-sm uppercase">Heavy Rain</span>
                                 <CloudRain className="w-8 h-8" />
                             </div>
                         ) : (
                             <div className="flex items-center gap-2 text-stone-700">
                                 <span className="font-bold text-sm uppercase">Overcast</span>
                                 <Wind className="w-8 h-8" />
                             </div>
                         )}
                         {activeFlavor && (
                             <div className="text-[10px] text-stone-500 mt-1 max-w-[200px] leading-tight text-right">
                                 {activeFlavor.headline}
                             </div>
                         )}
                     </div>
                 </div>

                 <div className="flex-1 p-6 grid grid-cols-12 gap-6 relative z-10 overflow-y-auto">
                     
                     <div className="col-span-8 space-y-6">
                         <div className="border-b-2 border-stone-800 pb-2 mb-2 flex items-center gap-2">
                             <Newspaper className="w-5 h-5" />
                             <h3 className="font-bold font-sans uppercase tracking-widest text-sm">Top Stories</h3>
                         </div>

                         {narratives.length === 0 ? (
                             <p className="text-stone-500 italic font-serif">City is quiet today...</p>
                         ) : (
                             narratives.map(news => (
                                 <div key={news.id} className="mb-6">
                                     <h2 className="text-2xl font-serif font-bold mb-2 leading-tight hover:text-pawn-red transition-colors cursor-default">
                                         {news.headline}
                                     </h2>
                                     <p className="text-sm font-serif leading-relaxed text-stone-700 text-justify">
                                         <span className="float-left text-3xl font-black mr-2 leading-none mt-[-4px]">
                                             {news.body.charAt(0)}
                                         </span>
                                         {news.body.slice(1)}
                                     </p>
                                 </div>
                             ))
                         )}
                     </div>

                     <div className="col-span-4 bg-stone-200/50 p-4 border border-stone-300 h-fit">
                          <div className="border-b-2 border-stone-400 pb-2 mb-4 flex items-center gap-2 text-stone-600">
                             <TrendingUp className="w-5 h-5" />
                             <h3 className="font-bold font-sans uppercase tracking-widest text-sm">Market Watch</h3>
                          </div>

                          {markets.length === 0 ? (
                              <p className="text-xs text-stone-500">No market alerts.</p>
                          ) : (
                              markets.map(news => (
                                  <div key={news.id} className="mb-4 pb-4 border-b border-stone-300 last:border-0 last:pb-0">
                                      <h4 className="font-bold text-sm mb-1 leading-tight">{news.headline}</h4>
                                      <p className="text-[10px] text-stone-600 leading-snug mb-2">
                                          {news.body}
                                      </p>
                                      
                                      {news.effect && (
                                          <div className="bg-stone-300 px-2 py-1 rounded text-[10px] font-mono font-bold flex justify-between items-center">
                                              <span>{news.effect.categoryTarget || "General"}</span>
                                              <span className={
                                                  (news.effect.priceMultiplier && news.effect.priceMultiplier > 1) ? 'text-green-700' : 'text-red-700'
                                              }>
                                                  {news.effect.priceMultiplier ? (news.effect.priceMultiplier > 1 ? "▲ BULLISH" : "▼ BEARISH") : "RISK ALERT"}
                                              </span>
                                          </div>
                                      )}
                                  </div>
                              ))
                          )}

                          {activeFlavor && activeFlavor.effect && activeFlavor.effect.actionPointsModifier && (
                               <div className="mt-6 pt-4 border-t border-stone-400 text-stone-500">
                                   <h4 className="font-bold text-xs uppercase mb-1 flex items-center gap-1">
                                      <AlertOctagon className="w-3 h-3" /> Advisory
                                   </h4>
                                   <p className="text-[10px]">
                                       Conditions affecting daily efficiency. 
                                       <br/>
                                       <span className="font-bold text-red-600">AP Adjusted: {activeFlavor.effect.actionPointsModifier}</span>
                                   </p>
                               </div>
                          )}
                     </div>
                 </div>
                 
                 <div className="p-2 border-t border-stone-400 text-center text-[10px] text-stone-500 font-mono uppercase tracking-widest relative z-10">
                     The City Chronicle © 2077 - Truth is expensive.
                 </div>

             </div>

          </div>
          <DebugPanel />
        </div>
      </>
    );
  }

  if (state.phase === GamePhase.END_OF_DAY) {
    return (
      <>
        <EndOfDaySummary />
        <DebugPanel />
      </>
    );
  }
  
  if (state.phase === GamePhase.GAME_OVER) {
    return (
      <>
        <div className="h-screen flex items-center justify-center bg-red-950 text-white">
          <div className="text-center">
             <h1 className="text-6xl font-black mb-4">破产 (BANKRUPT)</h1>
             <p className="text-xl mb-8">店铺倒闭了。</p>
             <p className="text-md text-red-300 mb-8">{state.dayEvents[state.dayEvents.length - 1]}</p>
             <Button onClick={() => window.location.reload()}>再试一次</Button>
          </div>
        </div>
        <DebugPanel />
      </>
    )
  }

  const isNegotiating = state.phase === GamePhase.NEGOTIATION;
  const isShopClosed = state.phase === GamePhase.SHOP_CLOSED;
  const isSettlement = isNegotiating && state.currentCustomer?.interactionType === 'REDEEM';

  return (
    <div className="h-screen flex flex-col bg-pawn-dark text-pawn-text overflow-hidden font-sans">
      <Dashboard />
      
      <InventoryModal />
      <MailModal />
      <FinancialCalendar />
      <DebugPanel />

      <main className="flex-1 overflow-hidden relative">
        {state.isLoading && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-pawn-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-mono text-pawn-accent animate-pulse">{loadingText}</p>
          </div>
        )}

        {isShopClosed && (
            <div className="absolute inset-0 z-40 animate-in fade-in duration-500">
                <ShopClosedView />
            </div>
        )}

        <div className="h-full grid grid-cols-1 lg:grid-cols-12 bg-black/20">
            
            {isSettlement ? (
                <SettlementInterface />
            ) : (
                <>
                    <div className="lg:col-span-6 h-full border-r border-white/10 overflow-hidden relative">
                        {isNegotiating ? (
                        <ItemPanel 
                            applyLeverage={negotiation.applyLeverage} 
                            triggerNarrative={negotiation.triggerNarrative}
                            canInteract={!negotiation.isWalkedAway}
                            currentAskPrice={negotiation.currentAskPrice}
                        />
                        ) : (
                        <div className="h-full flex items-center justify-center text-stone-700 font-mono">
                            <span>...</span>
                        </div>
                        )}
                    </div>

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
