
import { useGame } from '../store/GameContext';
import { runDailySimulation, findEligibleEvent, instantiateStoryCustomer, resolveRedemptionFlow, checkCondition, resolveDialogue } from '../systems/narrative/engine';
import { generateDailyNews } from '../systems/news/engine';
import { generatePawnLog } from '../systems/game/utils/logGenerator';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { Customer, Item, ReputationType, TransactionResult, ItemStatus, StoryEvent, GamePhase, ChainUpdateEffect, MotherCondition } from '../types';
import { usePawnShop } from './usePawnShop';
import { GAME_CONFIG } from '../systems/game/config';
import { evaluateSatisfaction } from '../systems/game/utils/satisfaction';

export const useGameEngine = () => {
  const { state, dispatch } = useGame();
  const { checkDailyExpirations, calculateRedemptionCost } = usePawnShop();

  const performNightCycle = () => {
    // 1. Narrative Side Effects
    const { chains: simulatedChains, sideEffects } = runDailySimulation(state.activeChains);
    
    sideEffects.forEach(({ chainId, op }) => {
        if (op.type === 'SCHEDULE_MAIL' && op.templateId) {
             let metadata: any = {};
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
             dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: op.templateId, delayDays: op.delayDays || 0, metadata } });
        }
    });

    const nextDay = state.stats.day + 1;
    const tempState = { 
        ...state, 
        activeChains: simulatedChains,
        stats: { ...state.stats, day: nextDay }
    };

    dispatch({ type: 'UPDATE_CHAINS', payload: simulatedChains });

    // 2. News Generation
    const newsResult = generateDailyNews(tempState);
    dispatch({ type: 'UPDATE_NEWS', payload: newsResult });
    
    newsResult.scheduledMails.forEach(mailId => {
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: mailId, delayDays: 0 } });
    });

    // 3. Random Night Events
    const rollEvent = Math.random();
    if (rollEvent < 0.3) {
        const events = [
            { text: "Security System Glitch: Maintenance required.", cash: -30 },
            { text: "Street Rat Infestation: Pest control fee.", cash: -20 },
            { text: "Found loose credits in the sofa cushions.", cash: 15 },
            { text: "Local kid returned extra change. (Humanity +1)", reputation: { [ReputationType.HUMANITY]: 1 }, cash: 5 },
            { text: "Vandals cracked the window. Repairs needed.", cash: -50 },
            { text: "Peaceful night. Slept well. (Health +1)", health: 1 },
            { text: "Nightmares about debt. (Health -1)", health: -1 }
        ];
        
        const evt = events[Math.floor(Math.random() * events.length)];
        
        dispatch({ 
            type: 'RESOLVE_TRANSACTION', 
            payload: { 
                cashDelta: evt.cash || 0, 
                reputationDelta: evt.reputation || {}, 
                item: null, 
                log: `[Night Event] ${evt.text}`, 
                customerName: "System" 
            } 
        });

        if (evt.health) {
             const mother = state.stats.motherStatus;
             dispatch({
                 type: 'UPDATE_MOTHER_STATUS',
                 payload: { ...mother, health: Math.min(100, Math.max(0, mother.health + evt.health)) }
             });
        }
    }

    // 4. Rent Check
    if (state.stats.day >= state.stats.rentDueDate) {
        if (state.stats.cash >= state.stats.rentDue) {
            dispatch({ type: 'PAY_RENT' });
        } else {
            dispatch({ type: 'GAME_OVER', payload: "EVICTED: Unable to pay rent." });
            return;
        }
    }

    // 5. Medical Bill Rotation & Status
    if (state.stats.medicalBill.status === 'PAID') {
        dispatch({ type: 'ROTATE_MEDICAL_BILL' });
    } else if (state.stats.day >= state.stats.medicalBill.dueDate) {
        dispatch({ type: 'MARK_BILL_OVERDUE' });
    }

    // 6. Mother Health Calculation (Standard Decay + Status)
    const currentMother = state.stats.motherStatus;
    const { medicalBill, day } = state.stats;
    let newHealth = currentMother.health;
    let newStatus = currentMother.status;
    let newRisk = currentMother.risk;
    let newCareLevel = currentMother.careLevel;
    let logMessage = '';

    const isBillOverdue = day >= medicalBill.dueDate && medicalBill.status !== 'PAID';
    
    if (medicalBill.status === 'PAID') {
        newCareLevel = 'Premium';
        newHealth += 2; 
        newRisk = Math.max(5, newRisk - 5); 
        newStatus = 'Improving';
        // logMessage handled by payment action
    } else if (isBillOverdue) {
        newCareLevel = 'None';
        newHealth -= 15; 
        newRisk = Math.min(100, newRisk + 10); 
        newStatus = 'Worsening';
        logMessage = "警告：医药费断缴！药物已停供，母亲病情急剧恶化。";
    } else {
        newCareLevel = 'Basic';
        newHealth -= 1; 
        newStatus = 'Stable';
    }

    const complicationRoll = Math.random() * 100;
    if (complicationRoll < newRisk) {
        newHealth -= 10;
        newStatus = 'Critical';
        logMessage += " 深夜突发并发症！医生进行了紧急抢救。";
        dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: logMessage, customerName: "Hospital" } });
    } else if (logMessage) {
        dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: logMessage, customerName: "Hospital" } });
    }

    newHealth = Math.max(0, Math.min(100, newHealth));

    const updatedMother: MotherCondition = {
        health: newHealth,
        status: newStatus,
        risk: newRisk,
        careLevel: newCareLevel
    };

    dispatch({ type: 'UPDATE_MOTHER_STATUS', payload: updatedMother });

    // 7. End Day (Transition to Morning)
    dispatch({ type: 'END_DAY' });
  };

  const startNewDay = () => {
    dispatch({ type: 'PROCESS_DAILY_MAIL' });
    checkDailyExpirations();
    dispatch({ type: 'START_DAY' });
  };

  const generateDailyEvent = async () => {
    if (state.isLoading) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const narrativeEvent = findEligibleEvent(state.activeChains, ALL_STORY_EVENTS);
      
      if (narrativeEvent) {
          let targetId = narrativeEvent.targetItemId;
          if (!targetId) {
               const chainState = state.activeChains.find(c => c.id === narrativeEvent.chainId);
               if (chainState && chainState.variables.targetItemId) {
                   targetId = String(chainState.variables.targetItemId);
               }
          }

          if (narrativeEvent.type === 'POST_FORFEIT_VISIT') {
              const forfeitItem = state.inventory.find(i => i.id === targetId && i.status === ItemStatus.FORFEIT);
              if (!forfeitItem) {
                   console.log("Skipping event: Item not forfeit");
                   dispatch({ type: 'SET_LOADING', payload: false });
                   dispatch({ type: 'START_NIGHT' });
                   return;
              }
          }

          if (narrativeEvent.type === 'REDEMPTION_CHECK') {
              if (targetId) {
                  const item = state.inventory.find(i => i.id === targetId);
                  const chainState = state.activeChains.find(c => c.id === narrativeEvent.chainId);
                  const funds = chainState?.variables?.funds || 0;
                  
                  if (item && item.pawnInfo) {
                      const cost = calculateRedemptionCost(item);
                      const isBroke = funds < (cost?.total || 0);
                      const canAffordInterest = funds >= (cost?.interest || 0);
                      
                      if (narrativeEvent.failureMailId && isBroke && !canAffordInterest) {
                           const mailId = narrativeEvent.failureMailId || 'mail_generic_plea';
                           dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: mailId, delayDays: 0, metadata: { relatedItemName: item.name } } });
                           if (narrativeEvent.onFailure) applyChainEffects(narrativeEvent.chainId, narrativeEvent.onFailure);
                           
                           setTimeout(() => {
                                dispatch({ type: 'SET_LOADING', payload: false });
                                dispatch({ type: 'START_NIGHT' });
                           }, 500);
                           return;
                      }
                  }
              }
          }

          const chainState = state.activeChains.find(c => c.id === narrativeEvent.chainId);
          const currentFunds = chainState?.variables?.funds;

          let storyCustomer = instantiateStoryCustomer(narrativeEvent, state.inventory, currentFunds, chainState);

          if (narrativeEvent.type === 'POST_FORFEIT_VISIT' && targetId) {
              const realItem = state.inventory.find(i => i.id === targetId);
              if (realItem) {
                  storyCustomer.item = { ...realItem };
                  storyCustomer.interactionType = 'REDEEM'; 
                  storyCustomer.redemptionIntent = 'REDEEM'; 
                  storyCustomer.allowFreeRedeem = true; 
              }
          }

          if (narrativeEvent.type === 'REDEMPTION_CHECK') {
              const flowResult = resolveRedemptionFlow(narrativeEvent, state.inventory, chainState?.variables?.targetItemId);
              if (flowResult) {
                  const intent = storyCustomer.redemptionIntent;
                  const isItemLost = flowResult.flowKey === 'core_lost';

                  if (isItemLost) {
                       storyCustomer.dialogue.greeting = resolveDialogue(flowResult.flow.dialogue, chainState);
                       (storyCustomer as any)._dynamicEffects = flowResult.flow.outcome;
                  } else if (intent === 'EXTEND') {
                       storyCustomer.dialogue.greeting = "老板... 钱还没凑齐。能不能再宽限几天？我先付利息。";
                  } else {
                       storyCustomer.dialogue.greeting = resolveDialogue(flowResult.flow.dialogue, chainState);
                       storyCustomer.dialogue.accepted.fair = "谢谢。";
                       (storyCustomer as any)._dynamicEffects = flowResult.flow.outcome;
                  }
                  
                  const tId = narrativeEvent.targetItemId || chainState?.variables?.targetItemId;
                  if (tId) {
                      const realItem = state.inventory.find(i => i.id === tId);
                      if (realItem) {
                           storyCustomer.item = { ...realItem };
                           storyCustomer.interactionType = 'REDEEM';
                           
                           if (intent === 'REDEEM') {
                               const cost = calculateRedemptionCost(realItem);
                               if (cost && storyCustomer.currentWallet < cost.total) {
                                   storyCustomer.currentWallet = cost.total + Math.floor(Math.random() * 50);
                               }
                           }
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

      // NO CUSTOMER FOUND (Directly enter Night Phase)
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'START_NIGHT' });

    } catch (error) {
      console.error("Event generation error:", error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'START_NIGHT' });
    }
  };

  const evaluateTransaction = (offer: number, rate: number = 0.05): TransactionResult => {
    const customer = state.currentCustomer;
    if (!customer) throw new Error("No customer to evaluate");

    const item = customer.item;
    const { minimumAmount, desiredAmount } = customer;
    
    let isAccepted = false;
    let refuseReason = "";

    if (offer >= minimumAmount) isAccepted = true;
    else {
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

    const repDelta: any = { [ReputationType.HUMANITY]: 0, [ReputationType.CREDIBILITY]: 0, [ReputationType.UNDERWORLD]: 0 };

    if (offer >= desiredAmount) {
      repDelta[ReputationType.HUMANITY] += 3;
      repDelta[ReputationType.CREDIBILITY] -= 1; 
    } else {
      repDelta[ReputationType.CREDIBILITY] += 1;
    }
    
    if (rate === 0) repDelta[ReputationType.HUMANITY] += 5;
    else if (rate >= 0.20) {
        repDelta[ReputationType.HUMANITY] -= 3;
        repDelta[ReputationType.UNDERWORLD] += 2;
        repDelta[ReputationType.CREDIBILITY] -= 2;
    }

    const currentRisk = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.riskModifier || 0), 0);
    
    if (item.isStolen || (item.category === '违禁品' && !item.isSuspicious)) {
      repDelta[ReputationType.UNDERWORLD] += 5;
      repDelta[ReputationType.CREDIBILITY] -= 2; 
      
      if (currentRisk > 0) {
          repDelta[ReputationType.CREDIBILITY] -= 20; 
          repDelta[ReputationType.UNDERWORLD] += 5;
          dispatch({ type: 'ADD_VIOLATION', payload: 'police_risk_ignored' });
      }
    }
    
    if (item.isFake) repDelta[ReputationType.CREDIBILITY] -= 5; 

    const valuationBasis = item.perceivedValue !== undefined ? item.perceivedValue : item.realValue;
    const termDays = 7;
    const pawnInfo = {
        principal: offer,
        interestRate: rate,
        startDate: state.stats.day,
        termDays: termDays,
        dueDate: state.stats.day + termDays,
        valuation: valuationBasis,
        extensionCount: 0 
    };

    let visitCount = 1;
    if (customer.chainId) {
        const chain = state.activeChains.find(c => c.id === customer.chainId);
        if (chain) visitCount = chain.stage + 1;
    }
    
    const narrativeLog = generatePawnLog(customer, item, state.stats.day, visitCount);
    if ((item.isStolen || item.category === '违禁品') && currentRisk > 0) {
        narrativeLog.content += " [警告] 在严打期间收受违规物品，已被市场监管部门注意！";
    }

    const updatedLogs = [...(item.logs || []), narrativeLog];

    const finalizedItem: Item = {
      ...item,
      pawnAmount: offer,
      pawnInfo: pawnInfo, 
      pawnDate: state.stats.day,
      status: ItemStatus.ACTIVE,
      logs: updatedLogs
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
                         case 'ADD_FUNDS_DEAL': if (transactionResult) newChain.variables.funds = (newChain.variables.funds || 0) + Math.abs(transactionResult.cashDelta); break;
                         case 'ADD_FUNDS': if (effect.value) newChain.variables.funds = (newChain.variables.funds || 0) + effect.value; break;
                         case 'SET_STAGE': if (effect.value !== undefined) newChain.stage = effect.value; break;
                         case 'MODIFY_VAR': 
                            if (effect.variable) {
                                if (effect.delta !== undefined) {
                                    const current = newChain.variables[effect.variable] || 0;
                                    newChain.variables[effect.variable] = Math.max(0, Math.min(100, current + effect.delta));
                                } else if (effect.value !== undefined) {
                                    newChain.variables[effect.variable] = effect.value; 
                                }
                            }
                            break;
                         case 'DEACTIVATE': case 'DEACTIVATE_CHAIN': newChain.isActive = false; break;
                         case 'SCHEDULE_MAIL':
                             if (effect.templateId) {
                                 const meta: any = { relatedItemName: customer?.item.name };
                                 dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: effect.templateId, delayDays: effect.delayDays || 0, metadata: meta } });
                             }
                             break;
                         case 'CONDITIONAL_MAIL':
                             if (effect.condition && effect.templateId) {
                                 if (checkCondition(effect.condition, newChain)) {
                                      const meta: any = { relatedItemName: customer?.item.name };
                                      dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: effect.templateId, delayDays: effect.delayDays || 0, metadata: meta } });
                                 }
                             }
                             break;
                         case 'MODIFY_REP':
                             if (effect.value) dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: { [ReputationType.CREDIBILITY]: effect.value }, item: null, log: "声誉发生变化", customerName: customer?.name || "Event" } });
                             break;
                         case 'REDEEM_ALL':
                             state.inventory.forEach(i => { if (i.relatedChainId === chain.id && i.status !== ItemStatus.REDEEMED && i.status !== ItemStatus.SOLD) itemsToRedeem.push(i.id); });
                             break;
                         case 'REDEEM_TARGET_ONLY':
                             const tId = chainEvent?.targetItemId || chain.variables.targetItemId;
                             if (tId) itemsToRedeem.push(tId);
                             break;
                         case 'ABANDON_OTHERS':
                             state.inventory.forEach(i => { const tid = chainEvent?.targetItemId || chain.variables.targetItemId; if (i.relatedChainId === chain.id && i.id !== tid && i.status !== ItemStatus.SOLD && i.status !== ItemStatus.REDEEMED) itemsToAbandon.push(i.id); });
                             break;
                         case 'ABANDON_ALL':
                             state.inventory.forEach(i => { if (i.relatedChainId === chain.id && i.status !== ItemStatus.SOLD && i.status !== ItemStatus.REDEEMED) itemsToAbandon.push(i.id); });
                             break;
                         case 'FORCE_SELL_ALL':
                             state.inventory.forEach(i => { if (i.relatedChainId === chain.id && i.status !== ItemStatus.REDEEMED && i.status !== ItemStatus.SOLD) itemsToForceSell.push(i.id); });
                             break;
                         case 'FORCE_SELL_TARGET':
                             const targetId = chainEvent?.targetItemId || chain.variables.targetItemId;
                             if (targetId) itemsToForceSell.push(targetId);
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
                 if (itemsToAbandon.length > 0) dispatch({ type: 'EXPIRE_ITEMS', payload: { expiredItemIds: itemsToAbandon, logs: [`${itemsToAbandon.length} 件物品已被原主放弃，归店铺所有。`] } });
                 if (itemsToForceSell.length > 0) {
                     itemsToForceSell.forEach(id => {
                         const item = state.inventory.find(i => i.id === id);
                         if (item) dispatch({ type: 'DEFAULT_SELL_ITEM', payload: { itemId: id, amount: 0, name: item.name } });
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
    
    // 1. Calculate Satisfaction
    if (currentCust) {
        let satisfaction = evaluateSatisfaction(
            result.terms?.principal || 0,
            result.terms?.rate || 0.05,
            currentCust.minimumAmount,
            currentCust.minimumAmount,
            false
        );
        
        // Manual override for logic logic: if charity (rate 0), it is grateful
        if (result.terms?.rate === 0) satisfaction = 'GRATEFUL';
        
        dispatch({ type: 'SET_SATISFACTION', payload: satisfaction });
    }

    if (result.success && result.item && (result.item.category === '违禁品' || result.item.isSuspicious)) {
        const underworldChain = state.activeChains.find(c => c.id === 'chain_underworld');
        if (underworldChain && !underworldChain.isActive) {
             const updatedChains = state.activeChains.map(chain => {
                 if (chain.id === 'chain_underworld') return { ...chain, isActive: true, variables: { ...chain.variables, targetItemId: result.item!.id, days_since_trigger: 0 } };
                 return chain;
             });
             dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
             dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: "系统提示：收受违禁品引起了某些人的注意...", customerName: "System" } });
        }
    }

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
                 if (isPremium) effectsToRun = [...effectsToRun, { type: 'MODIFY_VAR', variable: 'job_chance', value: 100 }];
             }
             if (effectsToRun.length === 0 && chainEvent.onComplete) effectsToRun = chainEvent.onComplete;
             applyChainEffects(currentCust.chainId, effectsToRun, result, currentCust);
        }
    }

    if (result.success) {
        if (result.item) {
             if (result.item.isVirtual) { 
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: null, log: `交易完成: ${result.item.name}。`, customerName: state.currentCustomer?.name || "Customer" } });
             } else {
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: result.item, log: `收购了 ${result.item.name} (支出 $${Math.abs(result.cashDelta)})。`, customerName: state.currentCustomer?.name || "Customer" } });
             }
        } else {
             dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: null, log: result.message || "交易完成", customerName: state.currentCustomer?.name || "Customer" } });
        }
    } else {
      dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: result.reputationDelta, item: null, log: `与 ${state.currentCustomer?.name} 的交易告吹: ${result.message}`, customerName: state.currentCustomer?.name || "Customer" } });
    }
  };

  const rejectCustomer = () => {
     const currentCust = state.currentCustomer;
     
     // Set Satisfaction to DESPERATE
     dispatch({ type: 'SET_SATISFACTION', payload: 'DESPERATE' });

     if (currentCust?.chainId && currentCust?.eventId) {
         const chainEvent = ALL_STORY_EVENTS.find(e => e.id === currentCust.eventId);
         if (chainEvent && chainEvent.onReject) applyChainEffects(currentCust.chainId, chainEvent.onReject, undefined, currentCust);
     }
     dispatch({ type: 'REJECT_DEAL' });
  };
  
  const liquidateItem = (item: Item) => {
      const multiplier = state.activeMarketEffects.filter(mod => mod.categoryTarget === item.category || mod.categoryTarget === 'All').reduce((acc, mod) => acc * (mod.priceMultiplier || 1.0), 1.0);
      const amount = Math.floor(item.realValue * 0.8 * multiplier);
      dispatch({ type: 'LIQUIDATE_ITEM', payload: { itemId: item.id, amount, name: item.name } });
  };

  return { startNewDay, performNightCycle, generateDailyEvent, evaluateTransaction, commitTransaction, rejectCustomer, liquidateItem, applyChainEffects };
};
