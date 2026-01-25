
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

const GameContent: React.FC = () => {
  const { state, dispatch } = useGame();
  const { generateDailyEvent } = useGameEngine();
  const [loadingText, setLoadingText] = useState("");
  const negotiation = useNegotiation(state.currentCustomer);
  
  // Phase: BUSINESS -> Automatically trigger event if no customer
  useEffect(() => {
    if (state.phase === GamePhase.BUSINESS && !state.isLoading && !state.currentCustomer) {
      setLoadingText("Someone is approaching the counter...");
      generateDailyEvent();
    }
  }, [state.phase, state.isLoading, state.currentCustomer, generateDailyEvent]);

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
                    {/* Left Panel: Item / Contract */}
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
                            {state.phase === GamePhase.BUSINESS && <span className="animate-pulse">Waiting for customer...</span>}
                        </div>
                        )}
                    </div>

                    {/* Right Panel: Customer / Negotiation */}
                    <div className="lg:col-span-6 h-full overflow-hidden">
                        {isNegotiating ? (
                        <NegotiationPanel negotiation={negotiation} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-stone-600 font-mono text-center p-8">
                                <p className="opacity-50">COUNTER CLOSED</p>
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
