
import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { GameProvider, useGame } from './store/GameContext';
import { useGameEngine } from './hooks/useGameEngine';
import { useNegotiation } from './hooks/useNegotiation';
import { useGameMachine } from './hooks/useGameMachine';
import { PhaseIs, PhaseMatch } from './systems/core/phases';
import { Dashboard } from './systems/game/ui/Dashboard';
import { CustomerView } from './components/CustomerView';
import { ItemPanel } from './components/ItemPanel';
import { NegotiationPanel } from './components/NegotiationPanel';
import { SettlementInterface } from './components/RedemptionInterface';
import { RenewalRequestPanel, RenewalTicketPanel } from './components/RenewalRequestPanel';
import { PostForfeitPanel } from './components/PostForfeitPanel';
import { InventoryModal } from './components/InventoryModal';
import { MailModal } from './components/MailModal';
import { FinancialCalendar } from './components/FinancialCalendar';
import { MedicalModal } from './components/MedicalModal';
import { HospitalVisitModal } from './components/HospitalVisitModal';
import { DebugPanel } from './components/DebugPanel';
import { DevConsole } from './components/DevConsole';
import { DepartureView } from './components/ShopClosedView';
import { StartScreen } from './components/StartScreen';
import { MorningBrief } from './components/MorningBrief';
import { NightDashboard } from './components/NightDashboard';
import { GameOverScreen } from './components/GameOverScreen';
import { VictoryScreen } from './components/VictoryScreen';
import { playSfx } from './systems/game/audio';
import { GAME_CONFIG } from './systems/game/config';
import { Button } from './components/ui/Button';
import { Moon } from 'lucide-react';
import { DayToNightTransition } from './components/transitions/DayToNightTransition';
import { NightToDayTransition } from './components/transitions/NightToDayTransition';

const GameContent: React.FC = () => {
  const { state, dispatch } = useGame();
  const { generateDailyEvent, processNextExpiryEvent, startNewDay } = useGameEngine();
  const { send } = useGameMachine();
  const [loadingText, setLoadingText] = useState("");
  const negotiation = useNegotiation(state.currentCustomer);
  
  // Transition State
  const prevPhaseType = useRef<string>(state.phase.type);
  const [showDayToNight, setShowDayToNight] = useState(false);
  const [showNightToDay, setShowNightToDay] = useState(false);

  // Manual Trigger for Day -> Night Transition
  const handleStartNight = () => {
      // 1. Start the visual transition (Shutter Down) while still in BUSINESS phase
      setShowDayToNight(true);

      // 2. Delay the actual logical phase change until the shutter has covered the screen
      // Shutter animation takes ~1.5s to fully close
      setTimeout(() => {
          // State machine requires: BUSINESS.IDLE -> CUSTOMER_GENERATED(false) -> BUSINESS.CLOSED -> CLOSE_SHOP -> NIGHT
          // First transition IDLE -> CLOSED (if in IDLE), then CLOSED -> NIGHT
          send({ type: 'CUSTOMER_GENERATED', hasCustomer: false });
          send({ type: 'CLOSE_SHOP' });
          dispatch({ type: 'START_NIGHT' });
      }, 1500);
  };

  useLayoutEffect(() => {
      const currentType = state.phase.type;
      const previousType = prevPhaseType.current;

      // Auto-trigger Night -> Morning Transition (This one fades OUT from black, so it triggers AFTER phase change)
      if (previousType === 'NIGHT' && currentType === 'MORNING_BRIEF') {
          setShowNightToDay(true);
      }

      prevPhaseType.current = currentType;
  }, [state.phase]);

  // Phase: DAY_START.EXPIRY_CHECK -> Automatically execute startNewDay logic
  // This useEffect ensures startNewDay runs AFTER the state machine has transitioned,
  // avoiding timing issues where startNewDay reads stale state.
  useEffect(() => {
      if (PhaseIs.dayStart(state.phase) && state.phase.subphase === 'EXPIRY_CHECK') {
          startNewDay();
      }
  }, [state.phase, startNewDay]);

  // Phase: NIGHT.EVALUATING -> Automatically evaluate game outcome
  // This triggers after performNightCycle() completes and sends NIGHT_CYCLE_DONE
  useEffect(() => {
      if (PhaseMatch.nightEvaluating(state.phase)) {
          // Determine outcome based on current game state
          let outcome: 'continue' | 'bankrupt' | 'mother_died' | 'victory';

          if (state.stats.cash >= GAME_CONFIG.GOAL_AMOUNT) {
              outcome = 'victory';
          } else if (state.stats.cash < 0) {
              outcome = 'bankrupt';
          } else if (state.stats.motherStatus.health <= 0) {
              outcome = 'mother_died';
          } else {
              outcome = 'continue';
          }

          send({ type: 'EVALUATION_DONE', outcome });
      }
  }, [state.phase, state.stats.cash, state.stats.motherStatus.health, send]);

  // Phase: BUSINESS -> Automatically trigger event if no customer
  // Note: canServe is always true now - the generateDailyEvent handles the logic internally
  // It will call MARK_NO_MORE_CUSTOMERS when done
  useEffect(() => {
    const isBusiness = PhaseIs.business(state.phase);
    const isIdle = !state.isLoading && !state.currentCustomer;
    // Effective max = max(4, narrativeServed) to allow all narrative customers
    const narrativeServed = state.narrativeCustomersServedToday;
    const effectiveMax = Math.max(state.maxCustomersPerDay, narrativeServed);
    const canServe = state.customersServedToday < effectiveMax;

    // DEBUG: Log conditions
    console.log('[App] generateDailyEvent check:', {
      phase: state.phase,
      isBusiness,
      isLoading: state.isLoading,
      currentCustomer: !!state.currentCustomer,
      isIdle,
      customersServedToday: state.customersServedToday,
      narrativeServed,
      effectiveMax,
      canServe,
      shouldTrigger: isBusiness && isIdle && canServe
    });

    if (isBusiness && isIdle && canServe) {
      setLoadingText("Someone is approaching the counter...");
      generateDailyEvent();
    }
  }, [state.phase, state.isLoading, state.currentCustomer, state.customersServedToday, state.narrativeCustomersServedToday, state.maxCustomersPerDay, generateDailyEvent]);

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

  // Auto-trigger BUSINESS -> NEGOTIATION when customer is set
  // This bridges the gap between SET_CUSTOMER action and state machine transition
  // The state machine expects: BUSINESS.IDLE -> CUSTOMER_GENERATED -> BUSINESS.SERVING -> SET_CUSTOMER_EVENT -> NEGOTIATION
  // But since generateDailyEvent doesn't send CUSTOMER_GENERATED, we handle both transitions here
  const prevCustomerRef = useRef<typeof state.currentCustomer>(null);
  useEffect(() => {
    const hadNoCustomer = prevCustomerRef.current === null;
    const hasCustomer = state.currentCustomer !== null;

    // Only trigger when customer changes from null to non-null while in BUSINESS phase
    if (hadNoCustomer && hasCustomer && PhaseIs.business(state.phase)) {
        // Determine negotiation mode based on interactionType
        const interactionType = state.currentCustomer!.interactionType;
        const mode = interactionType === 'REDEEM' ? 'REDEEM'
                   : interactionType === 'RENEWAL' ? 'RENEWAL'
                   : interactionType === 'POST_FORFEIT' ? 'POST_FORFEIT'
                   : 'PAWN';

        if (state.phase.subphase === 'IDLE') {
            // First transition IDLE -> SERVING, then SERVING -> NEGOTIATION
            send({ type: 'CUSTOMER_GENERATED', hasCustomer: true });
            // Note: React batches state updates, so we need to send the next event
            // The PHASE_TRANSITION reducer should handle consecutive events correctly
            send({ type: 'SET_CUSTOMER_EVENT', mode });
        } else if (state.phase.subphase === 'SERVING') {
            // Already in SERVING, just transition to NEGOTIATION
            send({ type: 'SET_CUSTOMER_EVENT', mode });
        }
    }

    prevCustomerRef.current = state.currentCustomer;
  }, [state.currentCustomer, state.phase, send]);

  // Stabilize callbacks to prevent re-triggering effects in transition components
  const onDayToNightComplete = useCallback(() => {
      setShowDayToNight(false);
  }, []);

  const onNightToDayComplete = useCallback(() => {
      setShowNightToDay(false);
  }, []);

  // --- TRANSITION OVERLAYS ---
  const transitionOverlay = (
      <>
        {showDayToNight && <DayToNightTransition onComplete={onDayToNightComplete} />}
        {showNightToDay && <NightToDayTransition onComplete={onNightToDayComplete} />}
      </>
  );

  // Helper booleans
  const isNegotiating = PhaseIs.negotiation(state.phase);
  const isDeparture = PhaseIs.departure(state.phase);
  const isBusiness = PhaseIs.business(state.phase);
  
  const interactionType = state.currentCustomer?.interactionType;
  const isSettlement = isNegotiating && interactionType === 'REDEEM';
  const isRenewal = isNegotiating && interactionType === 'RENEWAL';
  const isPostForfeit = isNegotiating && interactionType === 'POST_FORFEIT';
  
  // Shop is "closed" (show 打烊 button) when:
  // - All narrative customers served AND filler quota reached (total >= max(4, narrativeServed))
  // - OR MARK_NO_MORE_CUSTOMERS was called (customersServedToday >= maxCustomersPerDay)
  const narrativeServed = state.narrativeCustomersServedToday;
  const effectiveMax = Math.max(state.maxCustomersPerDay, narrativeServed);
  const isShopClosed = isBusiness && state.customersServedToday >= effectiveMax;
  const hasExpiryQueue = state.expiryQueue && state.expiryQueue.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-pawn-dark text-pawn-text overflow-hidden font-sans relative">
      {/* Transitions live at the top level to persist across phase renders */}
      {transitionOverlay}
      
      {state.isLoading && (
          <div className="absolute inset-0 z-[150] bg-black/80 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-pawn-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-mono text-pawn-accent animate-pulse">{loadingText}</p>
          </div>
      )}

      {/* Expiry events now use SettlementInterface instead of modal */}

      {PhaseIs.startScreen(state.phase) && <StartScreen />}

      {PhaseIs.morningBrief(state.phase) && <MorningBrief />}

      {PhaseIs.night(state.phase) && (
          <>
            <NightDashboard />
            <InventoryModal />
            <MailModal />
            <FinancialCalendar />
            <MedicalModal />
            <HospitalVisitModal />
          </>
      )}

      {PhaseIs.gameOver(state.phase) && (
          <GameOverScreen
              reason={state.phase.reason || state.dayEvents[state.dayEvents.length - 1] || "Unknown Error"}
              onRestart={() => window.location.reload()}
          />
      )}

      {PhaseIs.victory(state.phase) && (
          <VictoryScreen onRestart={() => window.location.reload()} />
      )}

      {(isBusiness || isNegotiating || isDeparture) && (
        <>
            <Dashboard />
            <InventoryModal />
            <MailModal />
            <FinancialCalendar />
            <MedicalModal />
            <HospitalVisitModal />

            <main className="flex-1 overflow-hidden relative">
                {isDeparture && (
                    <div className="absolute inset-0 z-40 animate-in fade-in duration-500">
                        <DepartureView />
                    </div>
                )}

                <div className="h-full grid grid-cols-1 lg:grid-cols-12 bg-black/20">
                    
                    {isSettlement ? (
                        <SettlementInterface />
                    ) : (isRenewal || isPostForfeit) ? (
                        <>
                            <div className="lg:col-span-6 h-full border-r border-white/10 overflow-hidden relative">
                                {isRenewal && state.currentCustomer?.renewalProposal ? (
                                    <RenewalTicketPanel proposal={state.currentCustomer.renewalProposal} />
                                ) : (
                                    <div className="h-full bg-[#1c1917] flex flex-col items-center justify-center text-stone-600">
                                        <span className="text-4xl font-serif opacity-30 tracking-widest rotate-90">ARCHIVE</span>
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-6 h-full overflow-hidden relative">
                                <div className="flex flex-col h-full bg-[#1c1917] border-l border-[#44403c]">
                                    <div className="flex-1 overflow-hidden relative border-b border-[#44403c]">
                                        <CustomerView />
                                    </div>
                                    <div className="flex-1 relative z-10">
                                        {state.currentCustomer && (
                                            isRenewal
                                                ? <RenewalRequestPanel customer={state.currentCustomer} />
                                                : <PostForfeitPanel customer={state.currentCustomer} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Left Panel */}
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

                            {/* Right Panel */}
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
                                                    onClick={handleStartNight} 
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
        </>
      )}

      {/* Debug Panel - 始终渲染在最顶层 */}
      <DebugPanel />

      {/* Developer Console - Press ` or F1 to toggle */}
      <DevConsole />
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
