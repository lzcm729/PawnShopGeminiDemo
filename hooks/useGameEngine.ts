

import { useGame } from '../store/GameContext';
import { runDailySimulation, findEligibleEvent, instantiateStoryCustomer, resolveRedemptionFlow } from '../services/chainEngine';
import { generateDailyNews } from '../services/newsEngine';
import { generatePawnLog } from '../services/logGenerator';
import { ALL_STORY_EVENTS } from '../services/storyData';
import { Customer, Item, ReputationType, TransactionResult, ItemStatus, StoryEvent, GamePhase, ChainUpdateEffect } from '../types';
import { usePawnShop } from './usePawnShop';

export const useGameEngine = () => {
  const { state, dispatch } = useGame();
  const { checkDailyExpirations, calculateRedemptionCost } = usePawnShop();

  // NEW: Run this when the player clicks "Sleep/End Day"
  // It calculates everything that happens "overnight" so the Morning Brief is ready.
  const performNightCycle = () => {
    // 1. Simulate active chains (NPCs spending money, life moving on)
    // Destructure to get sideEffects
    const { chains: simulatedChains, sideEffects } = runDailySimulation(state.activeChains);
    
    // Process Side Effects (e.g. Scheduled Mails from Rules)
    sideEffects.forEach(({ chainId, op }) => {
        if (op.type === 'SCHEDULE_MAIL' && op.templateId) {
             let metadata: any = {};
             
             // Specific logic for underworld warning to inject context
             if (op.templateId === 'mail_underworld_warning') {
                 const chain = simulatedChains.find(c => c.id === chainId);
                 const itemId = chain?.variables?.targetItemId;
                 if (itemId) {
                    const item = state.inventory.find(i => i.id === String(itemId));
                    metadata.relatedItemName = item?.name || "Unknown Item";
                 } else {
                    metadata.relatedItemName = "Unknown Item";
                 }
             }

             dispatch({ 
                type: 'SCHEDULE_MAIL', 
                payload: { 
                    templateId: op.templateId, 
                    delayDays: op.delayDays || 0,
                    metadata
                } 
            });
        }
    });

    // Create a temp state context that includes the simulated chains AND the "next day" index
    // This allows news like "Day 5" to trigger correctly for the upcoming morning
    const nextDay = state.stats.day + 1;
    const tempState = { 
        ...state, 
        activeChains: simulatedChains,
        stats: {
            ...state.stats,
            day: nextDay
        }
    };

    dispatch({ type: 'UPDATE_CHAINS', payload: simulatedChains });

    // 2. Generate News & Market Effects for the UPCOMING morning
    const newsResult = generateDailyNews(tempState);
    dispatch({ type: 'UPDATE_NEWS', payload: newsResult });

    // 3. Transition to Morning Brief (and increment day integer in reducer)
    dispatch({ type: 'END_DAY' });
  };

  // UPDATED: Now only handles the transition from Brief -> Trading
  const startNewDay = () => {
    // 1. Deliver Mail (Mail logic checks "arrivalDay <= currentDay")
    // Since performNightCycle has already run 'END_DAY', state.stats.day is now correct for the new day.
    dispatch({ type: 'PROCESS_DAILY_MAIL' });

    // 2. Check for expired pawn items (Core Business Lifecycle)
    checkDailyExpirations();

    const isRentDue = state.stats.day > 0 && state.stats.day % 5 === 0;
    
    if (isRentDue && state.stats.cash < state.stats.rentDue) {
       dispatch({ 
         type: 'GAME_OVER', 
         payload: "资金链断裂。你交不起房租，被房东赶了出去。" 
       });
       return;
    }

    if (isRentDue) {
       dispatch({ type: 'PAY_RENT' });
    }

    dispatch({ type: 'START_DAY' });
  };

  const generateDailyEvent = async () => {
    if (state.isLoading) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Step A: Priority Check - Narrative Chains (All Characters)
      const narrativeEvent = findEligibleEvent(state.activeChains, ALL_STORY_EVENTS);
      
      if (narrativeEvent) {
          
          // --- FAILURE MAIL CHECK ---
          // Before instantiating the customer, check if they are "broke"
          // If so, send a mail and skip the physical visit.
          if (narrativeEvent.type === 'REDEMPTION_CHECK') {
              // DYNAMIC TARGET ITEM ID RESOLUTION
              let targetId = narrativeEvent.targetItemId;
              // If not on event, check chain variables (Underworld Logic)
              if (!targetId) {
                  const chainState = state.activeChains.find(c => c.id === narrativeEvent.chainId);
                  if (chainState && chainState.variables.targetItemId) {
                      targetId = String(chainState.variables.targetItemId); // Ensure string
                  }
              }

              if (targetId) {
                  const item = state.inventory.find(i => i.id === targetId);
                  const chainState = state.activeChains.find(c => c.id === narrativeEvent.chainId);
                  const funds = chainState?.variables?.funds || 0;
                  
                  if (item && item.pawnInfo) {
                      const cost = calculateRedemptionCost(item);
                      const isBroke = funds < (cost?.total || 0);
                      const canAffordInterest = funds >= (cost?.interest || 0);
                      
                      // LOGIC: If they can't afford full redeem, AND can't afford interest (i.e. truly broke)
                      // ALSO: If it's underworld, they never pay, so skip check? 
                      // No, underworld event doesn't use failureMailId usually.
                      if (narrativeEvent.failureMailId && isBroke && !canAffordInterest) {
                           console.log(`Customer ${narrativeEvent.chainId} is sending plea mail instead of visiting.`);
                           
                           const mailId = narrativeEvent.failureMailId || 'mail_generic_plea';
                           
                           // 1. Send Mail with context
                           dispatch({ 
                               type: 'SCHEDULE_MAIL', 
                               payload: { 
                                   templateId: mailId, 
                                   delayDays: 0,
                                   metadata: { relatedItemName: item.name }
                               } 
                           });

                           // 2. Execute Failure Effects (e.g. Advance Stage, Reduce Hope) to prevent loop
                           if (narrativeEvent.onFailure) {
                               applyChainEffects(narrativeEvent.chainId, narrativeEvent.onFailure);
                           }
                           
                           // Skip this event by returning early (and effectively closing shop if no other events)
                           // We need to simulate the day ending quickly or transitioning to closed.
                           setTimeout(() => {
                                dispatch({ type: 'SET_LOADING', payload: false });
                                dispatch({ type: 'SET_PHASE', payload: GamePhase.SHOP_CLOSED });
                           }, 500);
                           return;
                      }
                  }
              }
          }

          console.log("Triggering Narrative Event:", narrativeEvent.id);
          
          // --- GET DYNAMIC FUNDS ---
          const chainState = state.activeChains.find(c => c.id === narrativeEvent.chainId);
          const currentFunds = chainState?.variables?.funds;

          // --- INSTANTIATE CUSTOMER WITH CONTEXT ---
          // Pass inventory, funds AND chainState so dynamic dialogue and logs can be resolved
          let storyCustomer = instantiateStoryCustomer(
              narrativeEvent, 
              state.inventory, 
              currentFunds,
              chainState // NEW: Pass chain state
          );

          // --- DYNAMIC REDEMPTION FLOW ---
          if (narrativeEvent.type === 'REDEMPTION_CHECK') {
              const flowResult = resolveRedemptionFlow(narrativeEvent, state.inventory, chainState?.variables?.targetItemId);
              if (flowResult) {
                  console.log(`Dynamic Redemption Flow: ${flowResult.flowKey}`);
                  
                  const intent = storyCustomer.redemptionIntent;
                  const isItemLost = flowResult.flowKey === 'core_lost';

                  if (isItemLost) {
                       // Priority: If item is gone, play the drama regardless of money
                       storyCustomer.dialogue.greeting = flowResult.flow.dialogue;
                       (storyCustomer as any)._dynamicEffects = flowResult.flow.outcome;
                  } else if (intent === 'EXTEND') {
                       // If item is safe but customer is poor, play generic extend dialogue
                       storyCustomer.dialogue.greeting = "老板... 钱还没凑齐。能不能再宽限几天？我先付利息。";
                       // Note: No _dynamicEffects here, as 'Extend' uses event.onExtend logic, not flow outcomes.
                  } else {
                       // Default: Item safe + Has Money -> Play flow dialogue (usually "I'm here to redeem")
                       storyCustomer.dialogue.greeting = flowResult.flow.dialogue;
                       storyCustomer.dialogue.accepted.fair = "谢谢。";
                       (storyCustomer as any)._dynamicEffects = flowResult.flow.outcome;
                  }
                  
                  // Important: Replace the dummy item with the REAL item from inventory for the UI
                  // Resolve Target Item ID again
                  const tId = narrativeEvent.targetItemId || chainState?.variables?.targetItemId;
                  if (tId) {
                      const realItem = state.inventory.find(i => i.id === tId);
                      if (realItem) {
                           storyCustomer.item = { ...realItem };
                           storyCustomer.interactionType = 'REDEEM';
                      }
                  }
              }
          }

          setTimeout(() => {
              dispatch({ type: 'SET_CUSTOMER', payload: storyCustomer });
              dispatch({ type: 'SET_LOADING', payload: false });
          }, 800);
          return;
      }

      // Step B: Fallback (Closed)
      // Since all presets are now Chains, if no chain event triggers, we have no content.
      console.log("No customers available today.");
      setTimeout(() => {
          dispatch({ type: 'SET_LOADING', payload: false });
          // Transition to SHOP_CLOSED to prevent infinite loop in App.tsx
          dispatch({ type: 'SET_PHASE', payload: GamePhase.SHOP_CLOSED });
      }, 500);

    } catch (error) {
      console.error("Event generation error:", error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_PHASE', payload: GamePhase.SHOP_CLOSED });
    }
  };

  const evaluateTransaction = (offer: number, rate: number = 0.05): TransactionResult => {
    const customer = state.currentCustomer;
    if (!customer) throw new Error("No customer to evaluate");

    const item = customer.item;
    const { minimumAmount, desiredAmount } = customer;
    
    let isAccepted = false;
    let refuseReason = "";

    if (offer >= minimumAmount) {
      isAccepted = true;
    } else {
      isAccepted = false;
      refuseReason = "出价太低了。";
    }

    if (!isAccepted) {
       return {
         success: false,
         message: refuseReason || customer.dialogue.rejected,
         cashDelta: 0,
         reputationDelta: { [ReputationType.CREDIBILITY]: -1 }
       };
    }

    const repDelta: any = {
      [ReputationType.HUMANITY]: 0,
      [ReputationType.CREDIBILITY]: 0,
      [ReputationType.UNDERWORLD]: 0
    };

    // Standard Rep Logic
    if (offer >= desiredAmount) {
      repDelta[ReputationType.HUMANITY] += 3;
      repDelta[ReputationType.CREDIBILITY] -= 1; 
    } else {
      repDelta[ReputationType.CREDIBILITY] += 1;
    }
    
    if (rate === 0) {
        repDelta[ReputationType.HUMANITY] += 5;
    } else if (rate >= 0.20) {
        repDelta[ReputationType.HUMANITY] -= 3;
        repDelta[ReputationType.UNDERWORLD] += 2;
        repDelta[ReputationType.CREDIBILITY] -= 2;
    }

    // RISK MODIFIER LOGIC
    // Check for active Police Raid or similar high-risk events
    const currentRisk = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.riskModifier || 0), 0);
    
    if (item.isStolen) {
      // Base logic
      repDelta[ReputationType.UNDERWORLD] += 5;
      repDelta[ReputationType.CREDIBILITY] -= 2; 
      
      // Multiplier logic
      if (currentRisk > 0) {
          // Massive penalty to Credibility if caught taking stolen goods during a raid
          repDelta[ReputationType.CREDIBILITY] -= 20; 
          // But maybe extra underworld rep for being bold?
          repDelta[ReputationType.UNDERWORLD] += 5;
      }
    }
    
    if (item.isFake) {
       repDelta[ReputationType.CREDIBILITY] -= 5; 
    }

    const valuationBasis = item.perceivedValue !== undefined ? item.perceivedValue : item.realValue;
    const termDays = 7;
    const pawnInfo = {
        principal: offer,
        interestRate: rate,
        startDate: state.stats.day,
        termDays: termDays,
        dueDate: state.stats.day + termDays,
        valuation: valuationBasis,
        extensionCount: 0 // Initialize extension count
    };

    // --- ITEM LOG GENERATION ---
    // Calculate Visit Count based on Chain Stage
    let visitCount = 1;
    if (customer.chainId) {
        const chain = state.activeChains.find(c => c.id === customer.chainId);
        if (chain) {
            // Usually Stage 0 is first visit, so Visit = Stage + 1
            visitCount = chain.stage + 1;
        }
    }
    
    const narrativeLog = generatePawnLog(customer, item, state.stats.day, visitCount);
    
    // Add Warning Log if High Risk Trade
    if (item.isStolen && currentRisk > 0) {
        narrativeLog.content += " [警告] 在严打期间收受赃物，风声走漏。信誉大幅下降！";
    }

    const updatedLogs = [...(item.logs || []), narrativeLog];

    const finalizedItem: Item = {
      ...item,
      pawnAmount: offer,
      pawnInfo: pawnInfo, 
      pawnDate: state.stats.day,
      status: ItemStatus.ACTIVE,
      logs: updatedLogs // Attach Log
    };

    let quality: 'fair' | 'fleeced' | 'premium' = 'fair';
    const ratio = offer / desiredAmount;
    if (ratio < 0.85) quality = 'fleeced';
    if (ratio > 1.05) quality = 'premium';

    return {
      success: true,
      message: customer.dialogue.accepted[quality],
      cashDelta: -offer,
      reputationDelta: repDelta,
      item: finalizedItem,
      dealQuality: quality,
      terms: { principal: offer, rate: rate }
    };
  };

  // EXTRACTED LOGIC: Can be used by Commit or manually by UI (e.g. Hostile Takeover)
  const applyChainEffects = (chainId: string, effects: ChainUpdateEffect[], transactionResult?: TransactionResult, customer?: Customer) => {
        const chainEvent = customer?.eventId ? ALL_STORY_EVENTS.find(e => e.id === customer.eventId) : null;

        const updatedChains = state.activeChains.map(chain => {
             if (chain.id === chainId) {
                 let newChain = { ...chain, variables: { ...chain.variables } };
                 
                 let itemsToRedeem: string[] = [];
                 let itemsToAbandon: string[] = [];
                 let itemsToForceSell: string[] = [];

                 effects.forEach(effect => {
                     switch (effect.type) {
                         case 'ADD_FUNDS_DEAL':
                             if (transactionResult) {
                                newChain.variables.funds = (newChain.variables.funds || 0) + Math.abs(transactionResult.cashDelta);
                             }
                             break;
                         case 'ADD_FUNDS': 
                             if (effect.value) newChain.variables.funds = (newChain.variables.funds || 0) + effect.value;
                             break;
                         case 'SET_STAGE':
                             if (effect.value !== undefined) newChain.stage = effect.value;
                             break;
                         case 'MODIFY_VAR':
                             if (effect.variable && effect.value !== undefined) {
                                 newChain.variables[effect.variable] = effect.value;
                             }
                             break;
                         case 'DEACTIVATE':
                         case 'DEACTIVATE_CHAIN':
                             newChain.isActive = false;
                             break;
                         case 'SCHEDULE_MAIL':
                             if (effect.templateId) {
                                 // Inject Metadata for interpolation (e.g. relatedItemName)
                                 const meta: any = { relatedItemName: customer?.item.name };
                                 if (effect.templateId === 'mail_underworld_warning') {
                                    // Special logic for underworld? No, customer item name is enough
                                 }

                                 dispatch({ 
                                    type: 'SCHEDULE_MAIL', 
                                    payload: { 
                                        templateId: effect.templateId, 
                                        delayDays: effect.delayDays || 0,
                                        metadata: meta
                                    } 
                                 });
                             }
                             break;
                         case 'MODIFY_REP':
                             if (effect.value) {
                                 dispatch({ 
                                     type: 'RESOLVE_TRANSACTION', 
                                     payload: { 
                                         cashDelta: 0, 
                                         reputationDelta: { [ReputationType.CREDIBILITY]: effect.value }, 
                                         item: null, 
                                         log: "声誉发生变化", 
                                         customerName: customer?.name || "Event" 
                                     } 
                                 });
                             }
                             break;
                         case 'REDEEM_ALL':
                             state.inventory.forEach(i => {
                                 if (i.relatedChainId === chain.id && i.status !== ItemStatus.REDEEMED && i.status !== ItemStatus.SOLD) {
                                     itemsToRedeem.push(i.id);
                                 }
                             });
                             break;
                         case 'REDEEM_TARGET_ONLY':
                             const tId = chainEvent?.targetItemId || chain.variables.targetItemId;
                             if (tId) itemsToRedeem.push(tId);
                             break;
                         case 'ABANDON_OTHERS':
                             state.inventory.forEach(i => {
                                 const tId = chainEvent?.targetItemId || chain.variables.targetItemId;
                                 if (i.relatedChainId === chain.id && i.id !== tId && i.status !== ItemStatus.SOLD && i.status !== ItemStatus.REDEEMED) {
                                     itemsToAbandon.push(i.id);
                                 }
                             });
                             break;
                         case 'ABANDON_ALL':
                             state.inventory.forEach(i => {
                                 if (i.relatedChainId === chain.id && i.status !== ItemStatus.SOLD && i.status !== ItemStatus.REDEEMED) {
                                     itemsToAbandon.push(i.id);
                                 }
                             });
                             break;
                         case 'FORCE_SELL_ALL':
                             state.inventory.forEach(i => {
                                 if (i.relatedChainId === chain.id && i.status !== ItemStatus.REDEEMED && i.status !== ItemStatus.SOLD) {
                                     itemsToForceSell.push(i.id);
                                 }
                             });
                             break;
                         case 'FORCE_SELL_TARGET':
                             const targetId = chainEvent?.targetItemId || chain.variables.targetItemId;
                             if (targetId) itemsToForceSell.push(targetId);
                             break;
                         case 'TRIGGER_NEWS':
                             console.log("News Triggered:", effect.id);
                             break;
                     }
                 });
                 
                 if (itemsToRedeem.length > 0) {
                     itemsToRedeem.forEach(id => {
                        const item = state.inventory.find(i => i.id === id);
                        if (item && item.pawnInfo) {
                            const cost = item.pawnInfo.principal * (1 + item.pawnInfo.interestRate); 
                            dispatch({ type: 'REDEEM_ITEM', payload: { itemId: id, paymentAmount: Math.floor(cost), name: item.name } });
                        }
                     });
                 }
                 
                 if (itemsToAbandon.length > 0) {
                     dispatch({ type: 'EXPIRE_ITEMS', payload: { expiredItemIds: itemsToAbandon, logs: [`${itemsToAbandon.length} 件物品已被原主放弃，归店铺所有。`] } });
                 }

                 if (itemsToForceSell.length > 0) {
                     itemsToForceSell.forEach(id => {
                         const item = state.inventory.find(i => i.id === id);
                         // Use Default Sell (Liquidation logic) to mark as SOLD
                         // Amount is irrelevant as the "Sale" money is usually added via ADD_FUNDS in the event logic
                         if (item) {
                             dispatch({ 
                                type: 'DEFAULT_SELL_ITEM', 
                                payload: { itemId: id, amount: 0, name: item.name } // Amount 0 here because event ADD_FUNDS handles the cash
                             });
                         }
                     });
                 }

                 return newChain;
             }
             return chain;
         });
         
         dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
  };

  const commitTransaction = (result: TransactionResult) => {
    const currentCust = state.currentCustomer;
    
    // -------------------------------------------------------------------------
    // NEW: UNDERWORLD TRIGGER LOGIC
    // If player accepts a suspicious/contraband item, trigger the Underworld Chain
    // -------------------------------------------------------------------------
    if (result.success && result.item && (result.item.category === '违禁品' || result.item.isSuspicious)) {
        // Find if chain exists
        const underworldChain = state.activeChains.find(c => c.id === 'chain_underworld');
        
        if (underworldChain && !underworldChain.isActive) {
             console.log("TRIGGERING UNDERWORLD CHAIN for item:", result.item.id);
             
             // Activate chain and store item ID in variables
             const updatedChains = state.activeChains.map(chain => {
                 if (chain.id === 'chain_underworld') {
                     return { 
                         ...chain, 
                         isActive: true, 
                         variables: { ...chain.variables, targetItemId: result.item!.id, days_since_trigger: 0 } 
                     };
                 }
                 return chain;
             });
             
             // We dispatch immediately. This might cause a slight race if `commitTransaction` also does `UPDATE_CHAINS` below via effects.
             // But usually `commitTransaction` runs effects via `applyChainEffects` which reads `state.activeChains`.
             // To be safe, we should combine logic or ensure applyChainEffects sees the updated state? 
             // Actually, `applyChainEffects` uses `state.activeChains` from closure. 
             // Ideally we should pass this update to applyChainEffects or do it separately.
             // Since underworld is likely orthogonal to the current customer chain, we can just dispatch.
             dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
             
             // Inject a log
             dispatch({ 
                 type: 'RESOLVE_TRANSACTION', 
                 payload: { 
                    cashDelta: 0, 
                    reputationDelta: {}, 
                    item: null, 
                    log: "系统提示：收受违禁品引起了某些人的注意...", 
                    customerName: "System" 
                 } 
            });
        }
    }
    // -------------------------------------------------------------------------


    if (result.success && currentCust?.chainId && currentCust?.eventId) {
        const chainEvent = ALL_STORY_EVENTS.find(e => e.id === currentCust.eventId);
        if (chainEvent) {
             let effectsToRun: ChainUpdateEffect[] = (currentCust as any)._dynamicEffects || [];

             if (effectsToRun.length === 0 && chainEvent.outcomes) {
                 const { principal, rate } = result.terms || { principal: 0, rate: 0.05 };
                 
                 let outcomeKey = 'deal_standard';
                 if (rate === 0) outcomeKey = 'deal_charity';
                 else if (rate === 0.05) outcomeKey = 'deal_aid';
                 else if (rate === 0.10) outcomeKey = 'deal_standard';
                 else if (rate >= 0.20) outcomeKey = 'deal_shark';

                 effectsToRun = chainEvent.outcomes[outcomeKey] || chainEvent.outcomes['deal_standard'] || [];

                 const realValue = result.item?.realValue || 0;
                 const isPremium = principal >= 2000 || (realValue > 0 && principal >= realValue * 1.5);

                 if (isPremium) {
                     effectsToRun = [
                         ...effectsToRun,
                         { type: 'MODIFY_VAR', variable: 'job_chance', value: 100 }
                     ];
                 }
             }
             
             if (effectsToRun.length === 0 && chainEvent.onComplete) {
                 effectsToRun = chainEvent.onComplete;
             }

             // Apply Logic
             applyChainEffects(currentCust.chainId, effectsToRun, result, currentCust);
        }
    }

    if (result.success) {
        // SUCCESS CASE
        if (result.item) {
             // Logic for adding item (Pawn/Buy)
             if (result.item.isVirtual) { 
                 dispatch({ 
                    type: 'RESOLVE_TRANSACTION', 
                    payload: { 
                      cashDelta: result.cashDelta, 
                      reputationDelta: result.reputationDelta, 
                      item: null, 
                      log: `交易完成: ${result.item.name}。`,
                      customerName: state.currentCustomer?.name || "Customer"
                    } 
                });
             } else {
                 dispatch({ 
                    type: 'RESOLVE_TRANSACTION', 
                    payload: { 
                      cashDelta: result.cashDelta, 
                      reputationDelta: result.reputationDelta, 
                      item: result.item,
                      log: `收购了 ${result.item.name} (支出 $${Math.abs(result.cashDelta)})。`,
                      customerName: state.currentCustomer?.name || "Customer"
                    } 
                });
             }
        } else {
             // Logic for success WITHOUT item (e.g. Redemption via effects)
             dispatch({ 
                type: 'RESOLVE_TRANSACTION', 
                payload: { 
                  cashDelta: result.cashDelta, 
                  reputationDelta: result.reputationDelta, 
                  item: null, // Ensure NO ITEM is added
                  log: result.message || "交易完成", 
                  customerName: state.currentCustomer?.name || "Customer"
                } 
            });
        }
    } else {
      // FAILURE CASE
      dispatch({ 
        type: 'RESOLVE_TRANSACTION', 
        payload: { 
          cashDelta: 0, 
          reputationDelta: result.reputationDelta, 
          item: null, 
          log: `与 ${state.currentCustomer?.name} 的交易告吹: ${result.message}`,
          customerName: state.currentCustomer?.name || "Customer"
        } 
      });
    }
  };

  const rejectCustomer = () => {
     const currentCust = state.currentCustomer;
     
     if (currentCust?.chainId && currentCust?.eventId) {
         const chainEvent = ALL_STORY_EVENTS.find(e => e.id === currentCust.eventId);
         
         if (chainEvent && chainEvent.onReject) {
             applyChainEffects(currentCust.chainId, chainEvent.onReject, undefined, currentCust);
         }
     }

     dispatch({ type: 'REJECT_DEAL' });
  };
  
  const liquidateItem = (item: Item) => {
      const amount = Math.floor(item.realValue * 0.8);
      dispatch({ 
          type: 'LIQUIDATE_ITEM', 
          payload: { itemId: item.id, amount, name: item.name } 
      });
  };

  return {
    startNewDay,
    performNightCycle,
    generateDailyEvent,
    evaluateTransaction,
    commitTransaction,
    rejectCustomer,
    liquidateItem,
    applyChainEffects
  };
};