
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { runDailySimulation, findEligibleEvent, instantiateStoryCustomer, resolveRedemptionFlow, checkCondition, resolveDialogue, checkRenewalRequests } from '../systems/narrative/engine';
import { generateDailyNews } from '../systems/news/engine';
import { generatePawnLog, generatePlayerChoiceLog } from '../systems/game/utils/logGenerator';
import { detectEchoEntries } from '../systems/game/utils/echoDetector';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { Customer, Item, ReputationType, TransactionResult, ItemStatus, StoryEvent, ChainUpdateEffect, MotherCondition, ExpiryEvent } from '../types';
import { usePawnShop } from './usePawnShop';
import { GAME_CONFIG } from '../systems/game/config';
import { evaluateSatisfaction } from '../systems/game/utils/satisfaction';
import { REPUTATION_MILESTONES } from '../systems/reputation/milestones';
import { Dialogue, SatisfactionLevel } from '../systems/narrative/types';
import { generateCustomerFromCandidate } from '../systems/appointment/customerGenerator';
import { createTransientChain, getContractTypeFromRate, generateFillerCustomer } from '../systems/npc/fillerGenerator';
import { checkRiskEvent, processStartOfDay as processBlackmarketStartOfDay } from '../systems/blackmarket/blackmarketService';
import { PhaseEvent } from '../systems/core/phases/types';
import { checkForPoliceInvestigation } from '../systems/police';
import { calculateRedemptionTotal } from '../systems/economy/interest';
import { resolveMailDelay } from '../systems/narrative/mailUtils';
import { getMailTemplate } from '../systems/narrative/mailRegistry';
import { detectSimConsequences, dispatchConsequence, createChannelTimingState } from '../systems/narrative/consequenceDispatcher';
import type { DispatchAction } from '../systems/narrative/consequenceDispatcher';
import { processExternalTrigger } from '../systems/narrative/externalTrigger';
import type { ExternalChainTrigger } from '../systems/narrative/externalTrigger';

export const useGameEngine = () => {
  const { state, dispatch } = useGame();

  // Helper to send state machine events
  const send = useCallback((event: PhaseEvent) => {
    dispatch({ type: 'PHASE_TRANSITION', payload: event });
  }, [dispatch]);
  const { checkDailyExpirations, calculateRedemptionCost } = usePawnShop();

  // Helper to check for new milestones
  const checkMilestones = (reputation: any) => {
      REPUTATION_MILESTONES.forEach(ms => {
          if (state.activeMilestones.includes(ms.id)) return;
          
          const currentVal = reputation[ms.trigger.type];
          let met = false;
          if (ms.trigger.operator === '>=') met = currentVal >= ms.trigger.value;
          else if (ms.trigger.operator === '<=') met = currentVal <= ms.trigger.value;
          
          if (met) {
              dispatch({ type: 'UNLOCK_MILESTONE', payload: ms.id });
          }
      });
  };

  const performNightCycle = () => {
    // 0. Deduct maintenance costs for enabled COUNTER upgrades (night closing)
    dispatch({ type: 'DEDUCT_MAINTENANCE_COST' });

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
             // S2-F2: Use template delay level when effect doesn't specify explicit days
             const effectDelay = op.delayDays || 0;
             const tpl = getMailTemplate(op.templateId);
             const finalDelay = effectDelay > 0 ? effectDelay : resolveMailDelay(tpl?.delay);
             dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: op.templateId, delayDays: finalDelay, metadata, sourceChainId: chainId } });
        }
    });

    const nextDay = state.stats.day + 1;
    const tempState = { 
        ...state, 
        activeChains: simulatedChains,
        stats: { ...state.stats, day: nextDay }
    };

    dispatch({ type: 'UPDATE_CHAINS', payload: simulatedChains });

    // 1b. S3-F2: Echo detection - compare chain states before/after simulation
    const echoEntries = detectEchoEntries(state.activeChains, simulatedChains, state.inventory, nextDay);
    if (echoEntries.length > 0) {
        dispatch({ type: 'APPEND_ITEM_LOGS', payload: echoEntries });
    }

    // 1c. S4-F3: Consequence detection & channel dispatch
    const simConsequences = detectSimConsequences(state.activeChains, simulatedChains, nextDay);
    if (simConsequences.length > 0) {
        const timingState = createChannelTimingState();
        for (const consequence of simConsequences) {
            const dispatchActions = dispatchConsequence(consequence, timingState, nextDay);
            executeDispatchActions(dispatchActions, nextDay);
        }
    }

    // 2. News Generation (S3-F1~F6: v1.2 with priority algorithm, pending queue, violation detection)
    const newsResult = generateDailyNews(tempState);
    dispatch({ type: 'UPDATE_NEWS', payload: {
        news: newsResult.news,
        modifiers: newsResult.modifiers,
        deferredNews: newsResult.deferredNews
    }});

    newsResult.scheduledMails.forEach(mailId => {
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: mailId, delayDays: 0 } });
    });

    // S3-F5: External chain triggers from violation detection
    // Collected but not executed here — event chain system (S4-F2) will consume these
    // Future: dispatch({ type: 'PROCESS_EXTERNAL_TRIGGERS', payload: newsResult.externalTriggers });

    // 3. Random Night Events
    const rollEvent = Math.random();
    
    // Milestone Effect: The Fixer (Reduces negative night events)
    const hasFixer = state.activeMilestones.includes('und_fixer');
    const hasSoftTarget = state.activeMilestones.includes('und_target');
    
    let eventChance = 0.3;
    if (hasFixer) eventChance = 0.15;
    if (hasSoftTarget) eventChance = 0.5;

    if (rollEvent < eventChance) {
        const events = [
            { text: "Security System Glitch: Maintenance required.", cash: -30 },
            { text: "Street Rat Infestation: Pest control fee.", cash: -20 },
            { text: "Found loose credits in the sofa cushions.", cash: 15 },
            { text: "Local kid returned extra change. (Humanity +1)", reputation: { [ReputationType.HUMANITY]: 1 }, cash: 5 },
            { text: "Vandals cracked the window. Repairs needed.", cash: -50 },
            { text: "Peaceful night. Slept well. (Health +1)", health: 1 },
            { text: "Nightmares about debt. (Health -1)", health: -1 }
        ];
        
        // Filter negative events if Fixer
        let pool = events;
        if (hasFixer) {
            pool = events.filter(e => !e.text.includes("Vandals") && !e.text.includes("Security"));
        }

        const evt = pool[Math.floor(Math.random() * pool.length)];
        
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

    // 4. Rent Check - REMOVED (Legacy mechanic disabled in favor of Medical Bill pressure)
    /*
    if (state.stats.day >= state.stats.rentDueDate) {
        if (state.stats.cash >= state.stats.rentDue) {
            dispatch({ type: 'PAY_RENT' });
        } else {
            dispatch({ type: 'GAME_OVER', payload: "EVICTED: Unable to pay rent." });
            return;
        }
    }
    */

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
    
    // Milestone Effect: Saint (Health decay reduced)
    const hasSaint = state.activeMilestones.includes('hum_saint');
    const decayModifier = hasSaint ? 1 : 0; // +1 health offset (reduces decay)

    if (medicalBill.status === 'PAID') {
        newCareLevel = 'Premium';
        newHealth = Math.min(100, newHealth + 2 + decayModifier);  // Recovery +2% (+3% with saint_guardian), capped at 100
        newRisk = Math.max(5, newRisk - 5);
        newStatus = 'Stable';
        // logMessage handled by payment action
    } else if (isBillOverdue) {
        newCareLevel = 'None';
        newHealth -= 15;  // Rapid decay -15%
        newRisk = Math.min(100, newRisk + 10);
        newStatus = 'Declining';
        logMessage = "警告：医药费断缴！药物已停供，母亲病情急剧恶化。";
    } else {
        // PENDING status: health remains stable (no change)
        newCareLevel = 'Basic';
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

    // Map status based on health thresholds per design doc
    if (newHealth >= 70) newStatus = 'Stable';
    else if (newHealth >= 40) newStatus = 'Declining';
    else newStatus = 'Critical';

    const updatedMother: MotherCondition = {
        health: newHealth,
        status: newStatus,
        risk: newRisk,
        careLevel: newCareLevel
    };

    dispatch({ type: 'UPDATE_MOTHER_STATUS', payload: updatedMother });

    // 7. Prepare Appointments for Tomorrow
    // This copies selected candidate IDs to pendingAppointedCustomerIds and clears selections
    dispatch({ type: 'PREPARE_DAILY_APPOINTMENTS' });

    // 8. Black Market - Check for risk events and refresh daily state
    const blackmarketRiskEvent = checkRiskEvent(state.blackmarket?.heat ?? 0);
    dispatch({ type: 'BLACKMARKET_PROCESS_DAY_END', payload: { riskEvent: blackmarketRiskEvent } });

    // 9. Night cycle complete - transition to EVALUATING via state machine
    // Note: END_DAY was already sent by NightDashboard.completeNight() to enter PROCESSING
    send({ type: 'NIGHT_CYCLE_DONE' });
  };

  // Helper: Create a Customer from an ExpiryEvent for the settlement interface
  const createExpiryCustomer = (event: ExpiryEvent): Customer | null => {
      const item = state.inventory.find(i => i.id === event.itemId);
      if (!item) return null;

      const chain = state.activeChains.find(c => c.id === event.chainId);

      // Find the original pawn event (for description/avatar fallback)
      const originalPawnEvent = ALL_STORY_EVENTS.find(e =>
          e.coreItemId === event.itemId || e.item?.id === event.itemId
      );

      // Try to find a dedicated redemption event for this chain (type: REDEMPTION_CHECK or interactionType: REDEEM)
      const redemptionEvent = ALL_STORY_EVENTS.find(e =>
          e.chainId === event.chainId &&
          (e.type === 'REDEMPTION_CHECK' || e.template?.interactionType === 'REDEEM')
      );

      // Determine redemptionIntent based on behavior
      const intent = event.behavior === 'REDEEM' ? 'REDEEM' :
                     event.behavior === 'BREACH_DISCOVERED' ? 'REDEEM' : 'EXTEND';

      // Build greeting based on behavior - use generic defaults
      let greeting = "";
      if (event.behavior === 'BREACH_DISCOVERED') {
          greeting = `老板，我来赎东西了... 等等，我的东西呢？！`;
      } else if (event.behavior === 'REDEEM') {
          greeting = `老板，我来赎东西了。钱都在这，连本带利。`;
      } else {
          greeting = `老板，我... 现在还凑不够赎金。能不能再宽限几天？利息我先付着。`;
      }

      // If there's a dedicated redemption event with a greeting, use it
      if (redemptionEvent?.template?.dialogue) {
          const tpl = redemptionEvent.template.dialogue;
          if (typeof tpl.greeting === 'string' && tpl.greeting) {
              greeting = tpl.greeting;
          }
      }

      // Note: redemptionPlea is for pawn time ("I promise to come back"), not redemption time
      // So we leave it empty for settlement scenarios
      const dialogue: Dialogue = {
          greeting,
          pawnReason: "",
          redemptionPlea: "", // Not shown during redemption - it's a pawn-time promise
          negotiationDynamic: "",
          accepted: { fair: "谢谢。", fleeced: "谢谢...", premium: "太感谢了！" },
          rejected: "...",
          rejectionLines: { standard: "...", angry: "你怎么能这样...", desperate: "..." },
          exitDialogues: {
              grateful: "谢谢老板！",
              neutral: "那我走了。",
              resentful: "......",
              desperate: "[沉默地离开]"
          }
      };

      // Use redemption event's template if available, otherwise fall back to original pawn event
      const templateSource = redemptionEvent?.template || originalPawnEvent?.template;
      const eventSource = redemptionEvent || originalPawnEvent;

      const customer: Customer = {
          id: crypto.randomUUID(),
          name: event.npcName,
          description: templateSource?.description || "到期结算",
          avatarSeed: templateSource?.avatarSeed || "default",
          dialogue,
          redemptionResolve: intent === 'REDEEM' ? 'Strong' : 'Medium',
          behaviorTags: ['SAVVY'],
          patience: 3,
          mood: 'Neutral',
          identityTags: ['Settlement'],
          item: { ...item },
          desiredAmount: 0,
          minimumAmount: 0,
          maxRepayment: event.redemptionCost.total,
          interactionType: 'REDEEM',
          redemptionIntent: intent,
          currentWallet: chain?.variables?.funds as number || event.redemptionCost.total + 100,
          chainId: event.chainId,
          eventId: eventSource?.id
      };

      return customer;
  };

  const startNewDay = () => {
    // NOTE: Blackmarket refresh and mail processing are handled
    // by the state machine effects when OPEN_SHOP transitions to DAY_START.EXPIRY_CHECK.
    // Maintenance cost is deducted at night closing (END_DAY transition).
    // These dispatch calls are kept for backward compatibility during migration.

    // 0.5. Refresh Black Market daily state (check lock expiration)
    dispatch({ type: 'BLACKMARKET_REFRESH_DAILY' });

    // 1. Process daily mail
    dispatch({ type: 'PROCESS_DAILY_MAIL' });

    // 1.5. Check for police investigation (if stolen items in inventory)
    const stolenItemToInvestigate = checkForPoliceInvestigation(
        state.inventory,
        state.reputation[ReputationType.INNOCENCE]
    );
    if (stolenItemToInvestigate) {
        dispatch({
            type: 'TRIGGER_POLICE_INVESTIGATION',
            payload: {
                itemId: stolenItemToInvestigate.id,
                itemName: stolenItemToInvestigate.name
            }
        });
        // Note: The UI will display the investigation prompt
        // The game flow continues after player makes a decision
        // Police investigation doesn't block expiry events - they can happen same day
    }

    // 2. Check for expiry events (REDEEM/RENEW only, NO_SHOW auto-forfeits)
    const { expiryEvents, noShowForfeits } = checkDailyExpirations();

    // 3. Apply expiryFlows.noShow.keep effects for auto-forfeited items
    noShowForfeits.forEach(({ itemId, chainId }) => {
        const storyEvent = ALL_STORY_EVENTS.find(e =>
            e.coreItemId === itemId || e.item?.id === itemId
        );
        if (storyEvent?.expiryFlows?.noShow?.keep) {
            storyEvent.expiryFlows.noShow.keep.forEach(effect => {
                if (effect.type === 'MODIFY_VAR' && effect.variable && effect.value !== undefined) {
                    dispatch({
                        type: 'UPDATE_CHAIN_VAR',
                        payload: { chainId, variable: effect.variable, value: effect.value }
                    });
                } else if (effect.type === 'SCHEDULE_MAIL' && effect.templateId) {
                    const effectDelay = effect.delayDays || 0;
                    const tpl = getMailTemplate(effect.templateId);
                    const finalDelay = effectDelay > 0 ? effectDelay : resolveMailDelay(tpl?.delay);
                    dispatch({
                        type: 'SCHEDULE_MAIL',
                        payload: { templateId: effect.templateId, delayDays: finalDelay, sourceChainId: chainId }
                    });
                }
            });
        }
    });

    // 4. If there are expiry events (REDEEM/RENEW/BREACH_DISCOVERED), process them
    if (expiryEvents.length > 0) {
        // Separate breach discovery events (auto-resolve) from normal events (need player decision)
        const breachEvents = expiryEvents.filter(e => e.behavior === 'BREACH_DISCOVERED');
        const normalEvents = expiryEvents.filter(e => e.behavior !== 'BREACH_DISCOVERED');

        // Auto-resolve all breach discovery events first
        breachEvents.forEach(event => {
            dispatch({
                type: 'RESOLVE_EXPIRY',
                payload: {
                    choice: 'breach_discovered',
                    itemId: event.itemId
                }
            });
        });

        // If there are normal events, create settlement interface
        if (normalEvents.length > 0) {
            dispatch({ type: 'SET_EXPIRY_QUEUE', payload: normalEvents });
            const customer = createExpiryCustomer(normalEvents[0]);
            if (customer) {
                dispatch({ type: 'SET_CUSTOMER', payload: customer });
            } else {
                // No valid customer created, signal expiry check done with no expiry
                send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: false });
            }
            return;
        }

        // If only breach events, continue to normal day
        if (breachEvents.length > 0 && normalEvents.length === 0) {
            // Signal expiry check done, no player-facing expiry events
            send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: false });
            return;
        }
    }

    // 5. No expiry events, proceed normally via state machine
    send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: false });
  };

  // Process next expiry event in queue or continue to normal day
  const processNextExpiryEvent = () => {
      const queue = state.expiryQueue;
      if (queue.length > 1) {
          // More events to process
          const remaining = queue.slice(1);
          dispatch({ type: 'SET_EXPIRY_QUEUE', payload: remaining });
          const customer = createExpiryCustomer(remaining[0]);
          if (customer) {
              dispatch({ type: 'SET_CUSTOMER', payload: customer });
          } else {
              // No valid customer, signal expiry check done
              send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: false });
          }
      } else {
          // All expiry events handled, continue to normal day via state machine
          dispatch({ type: 'SET_EXPIRY_QUEUE', payload: [] });
          send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: false });
      }
  };

  const generateDailyEvent = async () => {
    console.log('[generateDailyEvent] Called, isLoading:', state.isLoading);
    if (state.isLoading) return;
    console.log('[generateDailyEvent] Starting...');
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // 1. Check for Renewal Requests FIRST (Priority: Expiring Items)
      const renewalCustomer = checkRenewalRequests(state);
      if (renewalCustomer) {
          setTimeout(() => {
              dispatch({ type: 'SET_CUSTOMER', payload: renewalCustomer });
              dispatch({ type: 'SET_LOADING', payload: false });
          }, 200);
          return;
      }

      // 2. Check for Appointed Customers (after story events are processed)
      // Appointed customers appear after random customers have been handled
      const pendingAppointedCandidates = state.pendingAppointedCandidates;
      if (pendingAppointedCandidates.length > 0) {
          const candidate = pendingAppointedCandidates[0];
          const appointedCustomer = generateCustomerFromCandidate(candidate, state.stats.day);
          dispatch({ type: 'POP_APPOINTED_CANDIDATE' });
          setTimeout(() => {
              dispatch({ type: 'SET_CUSTOMER', payload: appointedCustomer });
              dispatch({ type: 'SET_LOADING', payload: false });
          }, 200);
          return;
      }

      // 3. Standard Story Events (NARRATIVE PRIORITY - NO LIMIT)
      // Narrative customers always come if eligible, regardless of customersServedToday
      const narrativeEvent = findEligibleEvent(state.activeChains, ALL_STORY_EVENTS);

      if (narrativeEvent) {
          // Track this as a narrative customer (for closing logic)
          dispatch({ type: 'INCREMENT_NARRATIVE_CUSTOMER' });
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
                   // Signal no customer generated, then close shop via state machine
                   send({ type: 'CUSTOMER_GENERATED', hasCustomer: false });
                   send({ type: 'CLOSE_SHOP' });
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
                           const failTpl = getMailTemplate(mailId);
                           dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: mailId, delayDays: resolveMailDelay(failTpl?.delay), metadata: { relatedItemName: item.name }, sourceChainId: narrativeEvent.chainId } });
                           if (narrativeEvent.onFailure) applyChainEffects(narrativeEvent.chainId, narrativeEvent.onFailure);

                           setTimeout(() => {
                                dispatch({ type: 'SET_LOADING', payload: false });
                                // Signal no customer generated, then close shop via state machine
                                send({ type: 'CUSTOMER_GENERATED', hasCustomer: false });
                                send({ type: 'CLOSE_SHOP' });
                           }, 200);
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
              // Determine if forced sale happened (Sold while active)
              let forceSold = false;
              const tId = narrativeEvent.targetItemId || chainState?.variables?.targetItemId;
              
              if (tId) {
                  const item = state.inventory.find(i => i.id === tId);
                  if (item && item.status === ItemStatus.SOLD) {
                      // Check logs to see if it was forfeit. If NO 'FORFEIT' log, it was a breach sale.
                      const wasForfeit = item.logs.some(l => l.type === 'FORFEIT');
                      if (!wasForfeit) {
                          forceSold = true;
                      }
                  }
              }

              const flowResult = resolveRedemptionFlow(narrativeEvent, state.inventory, chainState?.variables?.targetItemId, forceSold);
              
              if (flowResult) {
                  const intent = storyCustomer.redemptionIntent;
                  const isItemLost = flowResult.flowKey === 'core_lost';
                  const isHostile = flowResult.flowKey === 'hostile_takeover';

                  if (isItemLost || isHostile) {
                       storyCustomer.dialogue.greeting = resolveDialogue(flowResult.flow.dialogue, chainState);
                       (storyCustomer as any)._dynamicEffects = flowResult.flow.outcome;
                  } else if (intent === 'EXTEND') {
                       storyCustomer.dialogue.greeting = "老板... 钱还没凑齐。能不能再宽限几天？我先付利息。";
                  } else {
                       storyCustomer.dialogue.greeting = resolveDialogue(flowResult.flow.dialogue, chainState);
                       storyCustomer.dialogue.accepted.fair = "谢谢。";
                       (storyCustomer as any)._dynamicEffects = flowResult.flow.outcome;
                  }
                  
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
          }, 200);
          return;
      }

      // 4. Filler Customers (填充客户)
      // Generate filler customers when no story events are available
      // Logic: filler + narrative total cap is MAX_CUSTOMERS_PER_DAY (4)
      // If narrative >= 4, no filler (all slots taken by narrative)
      const narrativeServed = state.narrativeCustomersServedToday;
      const fillerServed = state.customersServedToday - narrativeServed;
      const fillerAllowedCount = Math.max(0, state.maxCustomersPerDay - narrativeServed);
      const canGenerateFiller = fillerServed < fillerAllowedCount;

      if (canGenerateFiller) {
          // Collect template IDs from inventory to avoid duplicate items
          // Only consider ACTIVE items (pawned, not yet redeemed/forfeited/sold)
          const excludeTemplateIds = new Set<string>(
              state.inventory
                  .filter(item => item.status === ItemStatus.ACTIVE && item.templateId)
                  .map(item => item.templateId!)
          );
          const fillerCustomer = generateFillerCustomer(state.stats.day, undefined, excludeTemplateIds);
          if (fillerCustomer) {
              setTimeout(() => {
                  dispatch({ type: 'SET_CUSTOMER', payload: fillerCustomer });
                  dispatch({ type: 'SET_LOADING', payload: false });
              }, 200);
              return;
          }
      }

      // NO CUSTOMER FOUND - Show "打烊" button instead of auto-transitioning to night
      // This gives the user a chance to review their day and manually close the shop
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'MARK_NO_MORE_CUSTOMERS' });

    } catch (error) {
      console.error("Event generation error:", error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'MARK_NO_MORE_CUSTOMERS' });
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

    const repDelta: any = { [ReputationType.HUMANITY]: 0, [ReputationType.CREDIBILITY]: 0, [ReputationType.INNOCENCE]: 0 };

    // Contract tier × generosity matrix (design doc v2.2 - 声誉系统):
    // Generous = offer exceeds customer's ask price (desiredAmount)
    // Only ≤5% rates get humanity bonus for generous offers
    const isGenerous = offer > desiredAmount;
    if (rate === 0) {
        // 0% Charity: Humanity +1 (normal) or +2 (generous)
        repDelta[ReputationType.HUMANITY] += isGenerous ? 2 : 1;
    } else if (rate > 0 && rate < 0.10) {
        // 5% Aid: Credibility +1 always; Humanity +1 if generous
        repDelta[ReputationType.CREDIBILITY] += 1;
        if (isGenerous) {
            repDelta[ReputationType.HUMANITY] += 1;
        }
    } else if (rate >= 0.10 && rate < 0.20) {
        // 10% Standard: Credibility +1 (no humanity bonus even if generous)
        repDelta[ReputationType.CREDIBILITY] += 1;
    } else if (rate >= 0.20) {
        // ≥20% Shark: Humanity -1 (generous doesn't help)
        repDelta[ReputationType.HUMANITY] -= 1;
    }

    const currentRisk = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.riskModifier || 0), 0);

    // Stolen goods: "Knowledge Theory" (知情论) from design doc
    // - Innocence penalty depends on whether player KNEW it was stolen (via appraisal)
    // - Leveraging STOLEN trait for price reduction adds extra penalty
    if (item.isStolen) {
      repDelta[ReputationType.CREDIBILITY] += 1;  // Good business deal regardless of knowledge

      // Check if player discovered STOLEN trait (知情判定)
      const knewStolen = item.revealedTraits?.some(t => t.type === 'STOLEN') ?? false;

      if (knewStolen) {
        // Player knew it was stolen - check if they leveraged it for price reduction
        const stolenTrait = item.revealedTraits?.find(t => t.type === 'STOLEN');
        const usedStolenLeverage = stolenTrait && (item.usedTraitIds?.includes(stolenTrait.id) ?? false);

        if (usedStolenLeverage) {
          // 知情收赃 + 压价: -3 Innocence (明知 + 趁火打劫)
          repDelta[ReputationType.INNOCENCE] -= 3;
        } else {
          // 知情收赃 (未压价): -2 Innocence (明知故犯)
          repDelta[ReputationType.INNOCENCE] -= 2;
        }
      }
      // 不知情收赃: 0 Innocence (but item is still stolen - risk deferred to police investigation)
    }

    // Other illicit goods (contraband but not stolen): reduce INNOCENCE
    if (!item.isStolen && item.category === '违禁品' && !item.isSuspicious) {
      repDelta[ReputationType.INNOCENCE] -= 3;  // Accepting contraband: -3 Innocence
      repDelta[ReputationType.CREDIBILITY] -= 2;
    }

    // During crackdown, additional penalties for any illicit goods
    if ((item.isStolen || (item.category === '违禁品' && !item.isSuspicious)) && currentRisk > 0) {
        // Additional immediate rep penalty for risk taking during crackdown
        repDelta[ReputationType.CREDIBILITY] -= 20;
        repDelta[ReputationType.INNOCENCE] -= 5;  // Additional innocence loss during crackdown
    }
    
    if (item.isFake) repDelta[ReputationType.CREDIBILITY] -= 5; 

    const valuationBasis = item.perceivedValue !== undefined ? item.perceivedValue : item.realValue;
    const termDays = customer.pawnTermDays || 7;
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

    // S3-F1: Append player choice log (contract rate)
    const contractChoiceLog = generatePlayerChoiceLog(state.stats.day, 'CONTRACT_RATE', {
        rate: rate,
        principal: offer,
    });

    const updatedLogs = [...(item.logs || []), narrativeLog, contractChoiceLog];

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
                                 const ed = effect.delayDays || 0;
                                 const mt = getMailTemplate(effect.templateId);
                                 const fd = ed > 0 ? ed : resolveMailDelay(mt?.delay);
                                 dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: effect.templateId, delayDays: fd, metadata: meta, sourceChainId: chainId } });
                             }
                             break;
                         case 'CONDITIONAL_MAIL':
                             if (effect.condition && effect.templateId) {
                                 if (checkCondition(effect.condition, newChain)) {
                                      const meta: any = { relatedItemName: customer?.item.name };
                                      const ed2 = effect.delayDays || 0;
                                      const mt2 = getMailTemplate(effect.templateId);
                                      const fd2 = ed2 > 0 ? ed2 : resolveMailDelay(mt2?.delay);
                                      dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: effect.templateId, delayDays: fd2, metadata: meta, sourceChainId: chainId } });
                                 }
                             }
                             break;
                         case 'MODIFY_REP':
                             if (effect.value) {
                                 // Map axis string to ReputationType enum
                                 const axisMap: Record<string, ReputationType> = {
                                     'humanity': ReputationType.HUMANITY,
                                     'credibility': ReputationType.CREDIBILITY,
                                     'innocence': ReputationType.INNOCENCE
                                 };
                                 const repType = axisMap[effect.axis || 'humanity'] || ReputationType.HUMANITY;
                                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: { [repType]: effect.value }, item: null, log: "声誉发生变化", customerName: customer?.name || "Event" } });
                             }
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
                            const cost = calculateRedemptionTotal(item.pawnInfo.principal, item.pawnInfo.interestRate, item.pawnInfo.termDays);
                            dispatch({ type: 'REDEEM_ITEM', payload: { itemId: id, paymentAmount: cost, name: item.name } });
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
    
    // 1. Calculate Satisfaction (2D matrix: contract tier x pawn ratio)
    if (currentCust) {
        const principal = result.terms?.principal || 0;
        const rate = result.terms?.rate || 0.05;
        const valuation = currentCust.minimumAmount;
        const pawnRatio = valuation > 0 ? principal / valuation : 0.7;

        const satisfaction = evaluateSatisfaction(
            principal,
            rate,
            valuation,
            valuation,
            false,
            pawnRatio
        );

        dispatch({ type: 'SET_SATISFACTION', payload: satisfaction });
        dispatch({ type: 'SET_DEPARTURE_SATISFACTION', payload: { scene: 'PAWN', level: satisfaction } });
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
             // Create TRANSIENT chain for filler customers (no existing chainId)
             // This enables probability-based expiry behavior tracking
             if (!currentCust?.chainId && result.terms && !result.item.isVirtual) {
                 const contractType = getContractTypeFromRate(result.terms.rate);
                 const transientChain = createTransientChain(
                     currentCust!,
                     result.item,
                     contractType
                 );
                 // Link item to the transient chain
                 result.item.relatedChainId = transientChain.id;
                 // Add chain to active chains
                 dispatch({ type: 'UPDATE_CHAINS', payload: [...state.activeChains, transientChain] });
             }

             if (result.item.isVirtual) {
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: null, log: `交易完成: ${result.item.name}。`, customerName: state.currentCustomer?.name || "Customer", dealQuality: result.dealQuality } });
             } else {
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: result.item, log: `收购了 ${result.item.name} (支出 $${Math.abs(result.cashDelta)})。`, customerName: state.currentCustomer?.name || "Customer", dealQuality: result.dealQuality } });
             }
        } else {
             dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: null, log: result.message || "交易完成", customerName: state.currentCustomer?.name || "Customer", dealQuality: result.dealQuality } });
        }
    } else {
      dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: result.reputationDelta, item: null, log: `与 ${state.currentCustomer?.name} 的交易告吹: ${result.message}`, customerName: state.currentCustomer?.name || "Customer" } });
    }

    // NEW: Check Milestones based on updated reputation
    // We construct a projected reputation object
    const currentRep = state.reputation;
    const projectedRep = {
        [ReputationType.HUMANITY]: currentRep[ReputationType.HUMANITY] + (result.reputationDelta[ReputationType.HUMANITY] || 0),
        [ReputationType.CREDIBILITY]: currentRep[ReputationType.CREDIBILITY] + (result.reputationDelta[ReputationType.CREDIBILITY] || 0),
        [ReputationType.INNOCENCE]: currentRep[ReputationType.INNOCENCE] + (result.reputationDelta[ReputationType.INNOCENCE] || 0)
    };
    checkMilestones(projectedRep);
  };

  const rejectCustomer = (satisfaction: SatisfactionLevel = 'DESPERATE') => {
     const currentCust = state.currentCustomer;

     // Set Satisfaction based on parameter (default DESPERATE for manual reject)
     dispatch({ type: 'SET_SATISFACTION', payload: satisfaction });

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

  // Helper to check if current customer's item has a revealed STOLEN trait (for UI decision prompt)
  // Only triggers stolen goods warning if the player has discovered the STOLEN trait through appraisal
  const isCurrentItemStolen = (): boolean => {
      const item = state.currentCustomer?.item;
      if (!item) return false;
      return item.revealedTraits?.some(trait => trait.type === 'STOLEN') ?? false;
  };

  // Helper to handle stolen item decision
  const handleStolenItemDecision = (accept: boolean) => {
      dispatch({ type: 'STOLEN_ITEM_DECISION', payload: { accept } });
  };

  // Helper to handle police investigation decision
  const handlePoliceInvestigationDecision = (surrender: boolean) => {
      if (!state.currentPoliceInvestigation) return;
      dispatch({
          type: 'POLICE_INVESTIGATION_DECISION',
          payload: {
              surrender,
              itemId: state.currentPoliceInvestigation.itemId
          }
      });
  };

  // S4-F3: Execute dispatch actions from the consequence dispatcher
  const executeDispatchActions = (actions: DispatchAction[], currentDay: number) => {
      for (const action of actions) {
          switch (action.action.type) {
              case 'SCHEDULE_NEWS':
                  // News dispatch is handled by the news engine during generation
                  // We store the hint for the next news generation cycle
                  // (The news system in S3 will consume these via triggerNarrativeEcho)
                  break;
              case 'SCHEDULE_MAIL':
                  dispatch({
                      type: 'SCHEDULE_MAIL',
                      payload: {
                          templateId: action.action.templateId,
                          delayDays: action.action.delayDays,
                          sourceChainId: action.action.sourceChainId,
                          relatedEventId: action.action.relatedEventId,
                      }
                  });
                  break;
              case 'MARK_RETROSPECTIVE':
                  // Store retrospective content on the chain for NPC's next visit
                  dispatch({
                      type: 'UPDATE_CHAIN_VAR',
                      payload: {
                          chainId: action.action.sourceChainId,
                          variable: 'pending_retrospective',
                          value: 1, // Flag that retrospective content is available
                      }
                  });
                  break;
              case 'APPEND_ITEM_LOG':
                  dispatch({
                      type: 'APPEND_ITEM_LOGS',
                      payload: [{
                          itemId: action.action.itemId,
                          log: {
                              id: crypto.randomUUID(),
                              day: currentDay,
                              content: action.action.entry,
                              type: 'ECHO' as const,
                          }
                      }]
                  });
                  break;
          }
      }
  };

  // S4-F1/F2: Handle external trigger events from other systems
  const handleExternalTrigger = (trigger: ExternalChainTrigger) => {
      const result = processExternalTrigger(trigger, state.activeChains, state.stats.day);

      // Apply updated chains
      dispatch({ type: 'UPDATE_CHAINS', payload: result.updatedChains });

      // Apply reputation deltas through RESOLVE_TRANSACTION (unified pipeline)
      for (const delta of result.reputationDeltas) {
          const axisMap: Record<string, ReputationType> = {
              'humanity': ReputationType.HUMANITY,
              'credibility': ReputationType.CREDIBILITY,
              'innocence': ReputationType.INNOCENCE,
          };
          dispatch({
              type: 'RESOLVE_TRANSACTION',
              payload: {
                  cashDelta: 0,
                  reputationDelta: { [axisMap[delta.axis]]: delta.value },
                  item: null,
                  log: `Regulatory action: ${delta.axis} ${delta.value > 0 ? '+' : ''}${delta.value}`,
                  customerName: 'System',
              }
          });
      }

      // Dispatch consequences through the channel protocol
      if (result.consequences.length > 0) {
          const timingState = createChannelTimingState();
          for (const consequence of result.consequences) {
              const dispatchActions = dispatchConsequence(consequence, timingState, state.stats.day);
              executeDispatchActions(dispatchActions, state.stats.day);
          }
      }

      // Schedule any mails
      for (const mail of result.scheduledMails) {
          dispatch({
              type: 'SCHEDULE_MAIL',
              payload: {
                  templateId: mail.templateId,
                  delayDays: mail.delayDays,
                  sourceChainId: mail.sourceChainId,
              }
          });
      }
  };

  return {
      startNewDay,
      performNightCycle,
      generateDailyEvent,
      evaluateTransaction,
      commitTransaction,
      rejectCustomer,
      liquidateItem,
      applyChainEffects,
      processNextExpiryEvent,
      // New stolen goods helpers
      isCurrentItemStolen,
      handleStolenItemDecision,
      handlePoliceInvestigationDecision,
      // S4-F1/F2: External trigger handler
      handleExternalTrigger
  };
};
