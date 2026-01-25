
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
import { DepartureView } from './components/ShopClosedView'; // Renamed file export
import { StartScreen } from './components/StartScreen';
import { MorningBrief } from './components/MorningBrief';
import { NightDashboard } from './components/NightDashboard'; // New Component
import { GameOverScreen } from './components/GameOverScreen';
import { GamePhase } from './types';
import { playSfx } from './systems/game/audio';
import { Button } from './components/ui/Button';
import { Moon } from 'lucide-react';

const GameContent: React.FC = () => {
  const { state, dispatch } = useGame();
  const { generateDailyEvent } = useGameEngine();
  const [loadingText, setLoadingText] = useState("");
  const negotiation = useNegotiation(state.currentCustomer);
  
  // Phase: BUSINESS -> Automatically trigger event if no customer AND limit not reached
  useEffect(() => {
    const isBusiness = state.phase === GamePhase.BUSINESS;
    const isIdle = !state.isLoading && !state.currentCustomer;
    const canServe = state.customersServedToday < state.maxCustomersPerDay;

    if (isBusiness && isIdle && canServe) {
      setLoadingText("Someone is approaching the counter...");
      generateDailyEvent();
    }
  }, [state.phase, state.isLoading, state.currentCustomer, state.customersServedToday, state.maxCustomersPerDay, generateDailyEvent]);

  // Sync Customer Status
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

  // --- PHASE ROUTING ---

  if (state.phase === GamePhase.START_SCREEN) {
    return <StartScreen />;
  }

  if (state.phase === GamePhase.MORNING_BRIEF) {
    return (
      <>
        <MorningBrief />
        <DebugPanel />
      </>
    );
  }

  if (state.phase === GamePhase.NIGHT) {
    return (
      <>
        <NightDashboard />
        {/* Modals are available in Night Mode */}
        <InventoryModal />
        <MailModal />
        <FinancialCalendar />
        <DebugPanel />
      </>
    );
  }
  
  if (state.phase === GamePhase.GAME_OVER) {
    const failureReason = state.dayEvents[state.dayEvents.length - 1] || "Unknown Error";
    return (
      <>
        <GameOverScreen 
            reason={failureReason} 
            onRestart={() => window.location.reload()} 
        />
        <DebugPanel />
      </>
    )
  }

  if (state.phase === GamePhase.VICTORY) {
      return (
          <div className="h-screen flex items-center justify-center bg-white text-black font-serif text-3xl">
              VICTORY - MOTHER SAVED
          </div>
      )
  }

  // --- BUSINESS / NEGOTIATION / DEPARTURE ---

  const isNegotiating = state.phase === GamePhase.NEGOTIATION;
  const isDeparture = state.phase === GamePhase.DEPARTURE;
  const isSettlement = isNegotiating && state.currentCustomer?.interactionType === 'REDEEM';
  const isBusiness = state.phase === GamePhase.BUSINESS;
  const isShopClosed = isBusiness && state.customersServedToday >= state.maxCustomersPerDay;

  return (
    <div className="h-screen flex flex-col bg-pawn-dark text-pawn-text overflow-hidden font-sans">
      <Dashboard />
      
      {/* Universal Modals (accessible during day via Dashboard) */}
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

        {isDeparture && (
            <div className="absolute inset-0 z-40 animate-in fade-in duration-500">
                <DepartureView />
            </div>
        )}

        <div className="h-full grid grid-cols-1 lg:grid-cols-12 bg-black/20">
            
            {isSettlement ? (
                <SettlementInterface />
            ) : (
                <>
                    {/* Left Panel: Item / Contract / Closed Sign */}
                    <div className="lg:col-span-6 h-full border-r border-white/10 overflow-hidden relative">
                        {isNegotiating ? (
                        <ItemPanel 
                            applyLeverage={negotiation.applyLeverage} 
                            triggerNarrative={negotiation.triggerNarrative}
                            canInteract={!negotiation.isWalkedAway}
                            currentAskPrice={negotiation.currentAskPrice}
                        />
                        ) : (
                        <div className="h-full flex flex-col items-center justify-center text-stone-700 font-mono relative bg-[#0c0a09]">
                             {/* Carbon Texture */}
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                             
                             {isShopClosed ? (
                                 <div className="z-10 p-8 border-4 border-stone-700 rounded opacity-80 transform -rotate-6 backdrop-blur-sm bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                     <h2 className="text-6xl font-black text-stone-500 uppercase tracking-widest border-b-4 border-stone-500 pb-2 mb-2">CLOSED</h2>
                                     <p className="text-stone-400 font-mono text-sm tracking-[0.5em] text-center">NO ENTRY</p>
                                 </div>
                             ) : (
                                 <span className="animate-pulse">Waiting for customer...</span>
                             )}
                        </div>
                        )}
                    </div>

                    {/* Right Panel: Customer / Negotiation / Close Button */}
                    <div className="lg:col-span-6 h-full overflow-hidden relative">
                        {isNegotiating ? (
                        <NegotiationPanel negotiation={negotiation} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-stone-600 font-mono text-center p-8 bg-[#1c1917]">
                                {isShopClosed ? (
                                    <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-md">
                                        <div>
                                            <h3 className="text-2xl font-serif text-white mb-2">本日营业结束</h3>
                                            <p className="text-xs uppercase tracking-widest text-stone-500">Daily Operations Complete</p>
                                        </div>
                                        
                                        <Button 
                                            onClick={() => { playSfx('CLICK'); dispatch({ type: 'START_NIGHT' }); }} 
                                            className="h-20 w-full text-xl tracking-[0.3em] shadow-[0_0_30px_rgba(217,119,6,0.3)] animate-pulse-slow"
                                            variant="primary"
                                        >
                                            <span className="flex items-center justify-center gap-3">
                                                <Moon className="w-6 h-6" /> 打 烊 (CLOSE)
                                            </span>
                                        </Button>
                                        
                                        <div className="text-stone-600 text-[10px] uppercase mt-4 border-t border-stone-800 pt-4 w-full">
                                            Proceed to Night Shift for Accounting & Mail
                                        </div>
                                    </div>
                                ) : (
                                    <p className="opacity-50">COUNTER CLOSED</p>
                                )}
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
