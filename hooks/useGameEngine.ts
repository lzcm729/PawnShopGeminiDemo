
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { runDailySimulation, findEligibleEvent, instantiateStoryCustomer, resolveRedemptionFlow, checkCondition, resolveDialogue, checkRenewalRequests } from '../systems/narrative/engine';
import { generateDailyNews } from '../systems/news/engine';
import { generatePawnLog, generatePlayerChoiceLog, generateDecayLog, generateSpectrometerLog, getWorkshopMorningHint } from '../systems/game/utils/logGenerator';
import { detectEchoEntries } from '../systems/game/utils/echoDetector';
import { ALL_STORY_EVENTS } from '../systems/narrative/storyRegistry';
import { Customer, Item, ReputationType, TransactionResult, ItemStatus, StoryEvent, ChainUpdateEffect, MotherCondition, ExpiryEvent, MoraleBuff } from '../types';
import type { ItemTag } from '../systems/items/types';
import { usePawnShop } from './usePawnShop';
import { GAME_CONFIG } from '../systems/game/config';
import { evaluateSatisfaction } from '../systems/game/utils/satisfaction';
import { REPUTATION_MILESTONES } from '../systems/reputation/milestones';
import { Dialogue, SatisfactionLevel } from '../systems/narrative/types';
import { generateCustomerFromCandidate } from '../systems/appointment/customerGenerator';
import { createTransientChain, getContractTypeFromRate, generateFillerCustomer, generateReferralCustomer, generateRedemptionVisitDialogue, getFillerMerchantMonologue, isTransientChain, calculateTransactionFeedback } from '../systems/npc/fillerGenerator';
import type { CustomerAppearance, CustomerMood, CustomerAge, CustomerGender } from '../systems/npc/fillerGenerator';
import { generateDailyChallenge, checkChallengeCompletion } from '../systems/game/dailyChallenge';
import type { DayChallengeContext } from '../systems/game/dailyChallenge';
import { checkRiskEvent, processStartOfDay as processBlackmarketStartOfDay } from '../systems/blackmarket/blackmarketService';
import { PhaseEvent } from '../systems/core/phases/types';
import { checkForPoliceInvestigation, checkForHoldingPeriodEvent } from '../systems/police';
import { buildRandomItemDerivedEvent, buildPurchaseOfferEvent } from '../systems/police/itemDerivedEventTexts';
import { calculateRedemptionTotal } from '../systems/economy/interest';
import { resolveMailDelay } from '../systems/narrative/mailUtils';
import { getMailTemplate } from '../systems/narrative/mailRegistry';
import { detectSimConsequences, dispatchConsequence, createChannelTimingState } from '../systems/narrative/consequenceDispatcher';
import type { DispatchAction } from '../systems/narrative/consequenceDispatcher';
import { processExternalTrigger } from '../systems/narrative/externalTrigger';
import type { ExternalChainTrigger } from '../systems/narrative/externalTrigger';
import { getEchoesForDay } from '../systems/characterAbility/moralEcho';
import { getEchoText } from '../systems/characterAbility/moralEchoTexts';
import { calculateTransactionEssenceGain, calculateStolenGoodsEssenceGain } from '../systems/characterAbility/essenceSystem';
import { processWordOfMouthChecks } from '../systems/characterAbility/abilityEngine';
import { generateTrainingResult, determineDisposition } from '../systems/customerInsight';
import { registerRuntimeMailTemplate } from '../systems/narrative/mailRegistry';
import { NewsCategory } from '../systems/news/types';
import { getEffectiveInventoryCapacity, hasPrecisionBench, checkItemAnomaly } from '../systems/upgrades/utils';
import { getAnomalyMessage, getAnomalySeverity, getNormalConfirmationMessage } from '../systems/upgrades/spectrometerFeedback';
import { playSfx } from '../systems/game/audio';
import { getCharacterPortraits } from '../systems/assets';
import type { CustomerPortraits } from '../systems/narrative/types';

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

  // #43: Check reputation thresholds and schedule feedback mails
  // Uses milestones as proxy for "first time crossing threshold" detection
  const checkReputationMails = () => {
    const rep = state.reputation;
    const milestones = state.activeMilestones;

    // Humanity first exceeds 60: "社区感谢信"
    if (rep[ReputationType.HUMANITY] >= 60 && !milestones.includes('rep_mail_hum_60')) {
        dispatch({ type: 'UNLOCK_MILESTONE', payload: 'rep_mail_hum_60' });
        registerRuntimeMailTemplate({
            id: 'mail_rep_humanity_thanks',
            sender: '街坊邻居',
            subject: '社区感谢信',
            body: '亲爱的老板：\n\n我们是附近的居民，写这封信是想感谢你一直以来对街坊的照顾。你的善心和厚道，大家都看在眼里。\n\n希望你的生意越来越好。\n\n——你的邻居们',
            attachments: { cash: 0 },
        });
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: 'mail_rep_humanity_thanks', delayDays: 1 } });
    }

    // Credibility first exceeds 60: "业界认可函"
    if (rep[ReputationType.CREDIBILITY] >= 60 && !milestones.includes('rep_mail_cred_60')) {
        dispatch({ type: 'UNLOCK_MILESTONE', payload: 'rep_mail_cred_60' });
        registerRuntimeMailTemplate({
            id: 'mail_rep_credibility_recognition',
            sender: '同业公会',
            subject: '业界认可函',
            body: '尊敬的典当行经营者：\n\n经同业评议，您的经营水准已获得行业认可。您的鉴定能力和公平交易原则为行业树立了标杆。\n\n特此致函，以示嘉许。\n\n——同业公会',
            attachments: { cash: 0 },
        });
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: 'mail_rep_credibility_recognition', delayDays: 1 } });
    }

    // Innocence first drops below 30: "匿名警告信"
    if (rep[ReputationType.INNOCENCE] < 30 && !milestones.includes('rep_mail_inn_30')) {
        dispatch({ type: 'UNLOCK_MILESTONE', payload: 'rep_mail_inn_30' });
        registerRuntimeMailTemplate({
            id: 'mail_rep_innocence_warning',
            sender: '匿名',
            subject: '一封匿名警告',
            body: '我知道你在做什么。\n\n警察也开始注意到了。如果不想惹上麻烦，趁早收手。\n\n——一个好心人',
            attachments: { cash: 0 },
        });
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: 'mail_rep_innocence_warning', delayDays: 0 } });
    }

    // #33: Credibility drops to exclusion threshold: "行业排斥警告"
    const credExclusionThreshold = GAME_CONFIG.REPUTATION_THRESHOLDS.CREDIBILITY_EXCLUSION_THRESHOLD;
    if (rep[ReputationType.CREDIBILITY] <= credExclusionThreshold && !milestones.includes('rep_mail_cred_exclusion')) {
        dispatch({ type: 'UNLOCK_MILESTONE', payload: 'rep_mail_cred_exclusion' });
        registerRuntimeMailTemplate({
            id: 'mail_rep_credibility_exclusion',
            sender: '同业公会',
            subject: '行业排斥警告',
            body: '致典当行经营者：\n\n经同业评议，您的商业信誉已降至不可接受的水平。多位同行反映您的经营行为严重损害了行业声誉。\n\n如果情况不能在短期内得到改善，公会将考虑正式将您从行业名录中除名。届时您将失去同业间的信息共享和客户推荐资格。\n\n请务必认真对待此警告。\n\n——同业公会执行委员会',
            attachments: { cash: 0 },
        });
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: 'mail_rep_credibility_exclusion', delayDays: 1 } });
    }

    // Any axis first drops below 20: "危机警告"
    const anyBelow20 = rep[ReputationType.HUMANITY] < 20 ||
                        rep[ReputationType.CREDIBILITY] < 20 ||
                        rep[ReputationType.INNOCENCE] < 20;
    if (anyBelow20 && !milestones.includes('rep_mail_crisis')) {
        dispatch({ type: 'UNLOCK_MILESTONE', payload: 'rep_mail_crisis' });
        const axisName = rep[ReputationType.HUMANITY] < 20 ? '人情' :
                         rep[ReputationType.CREDIBILITY] < 20 ? '商誉' : '清白';
        registerRuntimeMailTemplate({
            id: 'mail_rep_crisis_warning',
            sender: '自我反省',
            subject: '危机警告',
            body: `你的${axisName}声誉已经跌至危险水平。\n\n再这样下去，后果不堪设想。也许是时候改变做事的方式了。\n\n——你内心的声音`,
            attachments: { cash: 0 },
        });
        dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: 'mail_rep_crisis_warning', delayDays: 0 } });
    }
  };

  const performNightCycle = () => {
    // startAmbience('NIGHT'); // Removed per user request

    // 0. Maintenance costs are now included in stats.dailyExpenses (synced on upgrade purchase/toggle)
    // and deducted via END_DAY reducer. No separate DEDUCT_MAINTENANCE_COST dispatch needed.

    // 1. Narrative Side Effects
    const { chains: simulatedChains, sideEffects } = runDailySimulation(state.activeChains);
    
    sideEffects.forEach(({ chainId, op }) => {
        if (op.type === 'SCHEDULE_MAIL' && op.templateId) {
             let metadata: Record<string, unknown> = {};
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
    let tempState = {
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

    // 1d. S3-D: Natural decay logs for items stored beyond threshold days
    const decayThresholds = GAME_CONFIG.INVENTORY_DECAY.THRESHOLDS;
    const decayLogEntries: { itemId: string; log: import('../types').ItemLogEntry }[] = [];
    for (const item of state.inventory) {
        if (item.status !== ItemStatus.ACTIVE) continue;
        if (item.pawnDate === undefined || item.pawnDate === null) continue;
        const daysStored = nextDay - item.pawnDate;
        for (const threshold of decayThresholds) {
            if (daysStored >= threshold) {
                // Check if a decay log for this threshold already exists
                const alreadyLogged = item.logs.some(
                    log => log.type === 'DECAY' && log.metadata?.reason === `storage_day_${threshold}`
                );
                if (!alreadyLogged) {
                    decayLogEntries.push({
                        itemId: item.id,
                        log: generateDecayLog(nextDay, threshold, item.category),
                    });
                }
            }
        }
    }
    if (decayLogEntries.length > 0) {
        dispatch({ type: 'APPEND_ITEM_LOGS', payload: decayLogEntries });
    }

    // #12: Workshop morning hint (inject into tempState so generateDailyNews picks it up)
    if (hasPrecisionBench(state.shopUpgrades) && Math.random() < GAME_CONFIG.WORKSHOP.MORNING_HINT_CHANCE) {
        const hint = getWorkshopMorningHint();
        if (hint) {
            const workshopNewsItem = {
                headline: hint,
                body: '',
                category: NewsCategory.FLAVOR,
                priority: 30,
                sourceLabel: '[工坊]',
                tags: ['workshop_hint'],
                effects: [],
                displayDay: nextDay,
                duration: 1,
            };
            tempState = {
                ...tempState,
                pendingNews: [...(tempState.pendingNews || []), workshopNewsItem],
            };
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
    // Convert news triggers to narrative ExternalChainTrigger format and execute
    if (newsResult.externalTriggers.length > 0) {
        for (const newsTrigger of newsResult.externalTriggers) {
            // Map ViolationSeverity (LOW/MEDIUM/HIGH) → penaltyType for narrative system
            const penaltyTypeMap: Record<string, 'STOLEN_GOODS' | 'COUNTERFEIT' | 'REGULATION'> = {
                'HIGH': 'STOLEN_GOODS',
                'MEDIUM': 'STOLEN_GOODS',
                'LOW': 'REGULATION',
            };
            // Map ConsequenceSeverity → narrative severity (MINOR/MAJOR)
            const severityMap: Record<string, 'MINOR' | 'MAJOR'> = {
                'MINOR': 'MINOR',
                'MODERATE': 'MINOR',
                'SEVERE': 'MAJOR',
                'EXTREME': 'MAJOR',
            };

            const narrativeTrigger: ExternalChainTrigger = {
                type: 'NEWS_VERIFICATION',
                payload: {
                    type: 'NEWS_VERIFICATION',
                    newsId: newsTrigger.payload.newsId,
                    penaltyType: penaltyTypeMap[newsTrigger.payload.penaltyType] || 'REGULATION',
                    severity: severityMap[newsTrigger.payload.severity] || 'MINOR',
                },
            };
            handleExternalTrigger(narrativeTrigger);
        }
    }

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

    // 3b. Inventory Overflow Damage (gap #37)
    // When inventory exceeds capacity, excess items risk damage (BROKEN/DIRTY) or loss
    {
        const capacity = getEffectiveInventoryCapacity(state.shopUpgrades);
        const activeItems = state.inventory.filter(i => i.status === ItemStatus.ACTIVE || i.status === ItemStatus.FORFEIT);
        const overflow = activeItems.length - capacity;

        if (overflow > 0) {
            const overflowConfig = GAME_CONFIG.INVENTORY_OVERFLOW;
            // Sort by value ascending — cheapest items are most vulnerable
            const sortedItems = [...activeItems].sort((a, b) => a.realValue - b.realValue);
            const vulnerableItems = sortedItems.slice(0, overflow);
            const damageTags: ItemTag[] = ['BROKEN', 'DIRTY'];

            for (let i = 0; i < vulnerableItems.length; i++) {
                const vulnItem = vulnerableItems[i];
                const existingTags = vulnItem.tags || [];

                // Items beyond loss_threshold may be lost entirely
                if (i >= overflowConfig.LOSS_THRESHOLD && Math.random() < overflowConfig.LOSS_CHANCE) {
                    dispatch({
                        type: 'RESOLVE_TRANSACTION',
                        payload: {
                            cashDelta: 0,
                            reputationDelta: {},
                            item: null,
                            log: `[库存溢出] ${vulnItem.name} 因存储空间不足而遗失。`,
                            customerName: 'System',
                        },
                    });
                    dispatch({ type: 'EXPIRE_ITEMS', payload: { expiredItemIds: [vulnItem.id], logs: [`库存溢出遗失: ${vulnItem.name}`] } });
                } else if (Math.random() < overflowConfig.DAMAGE_CHANCE) {
                    // Add a random damage tag (BROKEN or DIRTY) if not already present
                    const candidateTags = damageTags.filter(t => !existingTags.includes(t));
                    if (candidateTags.length > 0) {
                        const tagToAdd = candidateTags[Math.floor(Math.random() * candidateTags.length)];
                        dispatch({
                            type: 'UPDATE_ITEM_TAGS',
                            payload: {
                                itemId: vulnItem.id,
                                tags: [...existingTags, tagToAdd],
                            },
                        });
                        dispatch({
                            type: 'RESOLVE_TRANSACTION',
                            payload: {
                                cashDelta: 0,
                                reputationDelta: {},
                                item: null,
                                log: `[库存溢出] ${vulnItem.name} 因存储拥挤而受损 (${tagToAdd})。`,
                                customerName: 'System',
                            },
                        });
                    }
                }
            }
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

    // P1-6: Check if purchased care is still active, expire it if needed
    let purchasedCare = currentMother.purchasedCare;
    if (purchasedCare && day >= purchasedCare.expiresDay) {
        purchasedCare = null;
        logMessage += "护理服务已到期。";
    }

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
        newHealth -= GAME_CONFIG.MOTHER.OVERDUE_HEALTH_DECAY;  // Rapid decay
        newRisk = Math.min(100, newRisk + GAME_CONFIG.MOTHER.OVERDUE_RISK_INCREASE);
        newStatus = 'Declining';
        logMessage = "警告：医药费断缴！药物已停供，母亲病情急剧恶化。";
    } else {
        // PENDING status: health remains stable (no change)
        newCareLevel = 'Basic';
        newStatus = 'Stable';
    }

    // P1-6: Apply purchased care effects (overrides passive care if higher)
    // Purchased care reduces risk even when passive care level is lower
    if (purchasedCare) {
        const careRiskReduction = purchasedCare.level === 'Premium'
            ? GAME_CONFIG.MOTHER.CARE_PREMIUM_RISK_REDUCTION
            : GAME_CONFIG.MOTHER.CARE_STANDARD_RISK_REDUCTION;
        newRisk = Math.max(0, newRisk - careRiskReduction);

        // Upgrade effective care level if purchased care is higher
        if (purchasedCare.level === 'Premium' && newCareLevel !== 'Premium') {
            newCareLevel = 'Premium';
        } else if (purchasedCare.level === 'Standard' && newCareLevel === 'None') {
            newCareLevel = 'Basic'; // Standard purchased care = at least Basic
        }
    }

    const complicationRoll = Math.random() * 100;
    if (complicationRoll < newRisk) {
        newHealth -= GAME_CONFIG.MOTHER.COMPLICATION_HEALTH_LOSS;
        newStatus = 'Critical';
        logMessage += " 深夜突发并发症！医生进行了紧急抢救。";
        dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: logMessage, customerName: "Hospital" } });
    } else if (logMessage) {
        dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: logMessage, customerName: "Hospital" } });
    }

    newHealth = Math.max(0, Math.min(100, newHealth));

    // Map status based on health thresholds per design doc
    if (newHealth >= GAME_CONFIG.MOTHER.HEALTH_STABLE_THRESHOLD) newStatus = 'Stable';
    else if (newHealth >= GAME_CONFIG.MOTHER.HEALTH_DECLINING_THRESHOLD) newStatus = 'Declining';
    else newStatus = 'Critical';

    const updatedMother: MotherCondition = {
        health: newHealth,
        status: newStatus,
        risk: newRisk,
        careLevel: newCareLevel,
        purchasedCare: purchasedCare
    };

    dispatch({ type: 'UPDATE_MOTHER_STATUS', payload: updatedMother });

    // 6b. H-1: Morale Buff from Hospital Visit
    // After visiting mother at night, compute next-day mood buff based on health
    if (state.stats.visitedToday) {
        const moraleHealth = newHealth;
        const anxiousSevereThreshold = GAME_CONFIG.MOTHER.MORALE_ANXIOUS_HEALTH_THRESHOLD;
        let moraleBuff: MoraleBuff;

        if (moraleHealth >= 60) {
            // Good health: positive buff
            // "Good conversation" approximated by health being high (>= 60)
            moraleBuff = {
                type: 'MOTIVATED',
                appraisalModifier: GAME_CONFIG.MOTHER.MORALE_MOTIVATED_APPRAISAL,
                negotiationModifier: GAME_CONFIG.MOTHER.MORALE_MOTIVATED_NEGOTIATION,
                expiresDay: nextDay + 1 // expires at end of next business day
            };
        } else if (moraleHealth >= anxiousSevereThreshold) {
            // Moderate health: calm or mild anxiety
            if (moraleHealth >= 50) {
                moraleBuff = {
                    type: 'CALM',
                    appraisalModifier: GAME_CONFIG.MOTHER.MORALE_CALM_APPRAISAL,
                    negotiationModifier: GAME_CONFIG.MOTHER.MORALE_CALM_NEGOTIATION,
                    expiresDay: nextDay + 1
                };
            } else {
                moraleBuff = {
                    type: 'ANXIOUS',
                    appraisalModifier: GAME_CONFIG.MOTHER.MORALE_ANXIOUS_APPRAISAL,
                    negotiationModifier: GAME_CONFIG.MOTHER.MORALE_ANXIOUS_NEGOTIATION,
                    expiresDay: nextDay + 1
                };
            }
        } else {
            // Severe anxiety: mother in critical condition
            moraleBuff = {
                type: 'ANXIOUS',
                appraisalModifier: GAME_CONFIG.MOTHER.MORALE_ANXIOUS_SEVERE_APPRAISAL,
                negotiationModifier: GAME_CONFIG.MOTHER.MORALE_ANXIOUS_SEVERE_NEGOTIATION,
                expiresDay: nextDay + 1
            };
        }

        dispatch({ type: 'SET_MORALE_BUFF', payload: moraleBuff });
    }

    // 6c. Clear expired morale buff
    if (state.moraleBuff && nextDay >= state.moraleBuff.expiresDay) {
        dispatch({ type: 'CLEAR_MORALE_BUFF' });
    }

    // 7. Prepare Appointments for Tomorrow
    // This copies selected candidate IDs to pendingAppointedCustomerIds and clears selections
    dispatch({ type: 'PREPARE_DAILY_APPOINTMENTS' });

    // 8. Black Market - Check for risk events and refresh daily state
    const blackmarketRiskEvent = checkRiskEvent(state.blackmarket?.heat ?? 0);
    dispatch({ type: 'BLACKMARKET_PROCESS_DAY_END', payload: { riskEvent: blackmarketRiskEvent } });

    // 9. Daily Challenge Completion Check (v2.1 Section 11.3)
    // Check if today's challenge was completed before generating tomorrow's
    if (state.dailyChallenge && !state.dailyChallenge.isCompleted) {
        // Calculate AP used today: maxAP - remaining AP
        const maxAP = state.stats.maxActionPoints;
        const remainingAP = state.stats.actionPoints;
        const apUsed = maxAP - remainingAP;

        // Approximate total profit from today's transactions
        const totalProfit = state.todayTransactions
            .filter(t => t.type === 'PAWN')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const challengeContext: DayChallengeContext = {
            totalProfit,
            hadMistake: state.hadMistakeToday,
            rejectedCustomers: state.rejectedCustomersToday,
            apUsed,
            hadHighRiskItem: state.hadHighRiskItemToday
        };

        const completed = checkChallengeCompletion(state.dailyChallenge, challengeContext);
        if (completed) {
            dispatch({ type: 'COMPLETE_DAILY_CHALLENGE' });
            // Apply challenge reward
            const reward = state.dailyChallenge.reward;
            if (reward.cash) {
                dispatch({
                    type: 'RESOLVE_TRANSACTION',
                    payload: {
                        cashDelta: reward.cash,
                        reputationDelta: {},
                        item: null,
                        log: `[每日挑战] "${state.dailyChallenge.title}" 完成！奖励 +$${reward.cash}`,
                        customerName: 'System'
                    }
                });
            }
            if (reward.reputation) {
                dispatch({
                    type: 'RESOLVE_TRANSACTION',
                    payload: {
                        cashDelta: 0,
                        reputationDelta: { [reward.reputation.axis as ReputationType]: reward.reputation.amount },
                        item: null,
                        log: `[每日挑战] "${state.dailyChallenge.title}" 完成！声誉 +${reward.reputation.amount}`,
                        customerName: 'System'
                    }
                });
            }
        }
    }

    // 10. Generate Daily Challenge for Tomorrow (v2.1 Section 11.3)
    const tomorrowChallenge = generateDailyChallenge();
    dispatch({ type: 'SET_DAILY_CHALLENGE', payload: tomorrowChallenge });

    // 11. Process word-of-mouth checks (口口相传)
    // If WORD_OF_MOUTH skill is unlocked and there are pending checks for today,
    // roll to see if a referral customer should appear tomorrow.
    {
        const womResult = processWordOfMouthChecks(nextDay, state.abilityState.wordOfMouth);
        if (womResult.triggered || womResult.updatedTracker !== state.abilityState.wordOfMouth) {
            dispatch({ type: 'UPDATE_WORD_OF_MOUTH', payload: womResult.updatedTracker });
        }
        if (womResult.triggered) {
            dispatch({ type: 'SET_PENDING_REFERRAL', payload: true });
            dispatch({
                type: 'RESOLVE_TRANSACTION',
                payload: {
                    cashDelta: 0,
                    reputationDelta: {},
                    item: null,
                    log: '[口口相传] 你的好名声传开了，明天可能会有慕名而来的客人。',
                    customerName: 'System',
                },
            });
        }
    }

    // 11b. #50: Dark path enforcement - low innocence triggers law enforcement search
    {
        const enforcementThreshold = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_ENFORCEMENT_THRESHOLD;
        const enforcementChance = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_ENFORCEMENT_CHANCE;
        const currentInnocence = state.reputation[ReputationType.INNOCENCE];

        if (currentInnocence < enforcementThreshold && Math.random() < enforcementChance) {
            const fineBase = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_ENFORCEMENT_FINE_BASE;
            const fineRange = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_ENFORCEMENT_FINE_RANGE;
            const fine = fineBase + Math.floor(Math.random() * fineRange);
            const credLoss = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_ENFORCEMENT_CREDIBILITY;
            const innLoss = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_ENFORCEMENT_INNOCENCE;

            dispatch({
                type: 'RESOLVE_TRANSACTION',
                payload: {
                    cashDelta: -fine,
                    reputationDelta: {
                        [ReputationType.CREDIBILITY]: credLoss,
                        [ReputationType.INNOCENCE]: innLoss,
                    },
                    item: null,
                    log: `[执法搜查] 执法人员突击搜查了店铺，以涉嫌违规经营为由罚款 $${fine}。(商誉 ${credLoss}, 清白 ${innLoss})`,
                    customerName: 'System',
                },
            });
        }
    }

    // 12. Check reputation threshold mails (#43)
    checkReputationMails();

    // 13. Night cycle complete - transition to EVALUATING via state machine
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

      // For TRANSIENT chains (filler customers), generate a richer redemption dialogue
      // using stored customer metadata from the original pawn transaction
      if (chain && isTransientChain(chain) && event.behavior === 'REDEEM') {
          const appearance = (chain.variables?.customerAppearance as CustomerAppearance) || 'plain';
          const mood = (chain.variables?.customerMood as CustomerMood) || 'calm';
          const age = (chain.variables?.customerAge as CustomerAge) || 'middle';
          const gender = (chain.variables?.customerGender as CustomerGender) || 'male';
          const itemName = item.name;
          const itemCategory = item.category;
          greeting = generateRedemptionVisitDialogue(appearance, mood, age, gender, itemName, itemCategory);
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

      // Derive portraits for the expiry customer
      let portraits: CustomerPortraits | undefined;
      if (item.customerSnapshot?.portraitUrl) {
          // Extract character folder from the neutral portrait URL
          // e.g., "/characters/generic_male_old/neutral.png" -> "generic_male_old"
          const match = item.customerSnapshot.portraitUrl.match(/\/characters\/([^/]+)\//);
          if (match) {
              portraits = getCharacterPortraits(match[1]);
          }
      } else if (chain && isTransientChain(chain)) {
          // For transient chains, derive from stored customer metadata
          const age = (chain.variables?.customerAge as string) || 'middle';
          const gender = (chain.variables?.customerGender as string) || 'male';
          const genderPart = gender === 'male' ? 'male' : 'female';
          const agePart = age === 'young' ? 'young' : age === 'middle' ? 'middle' : 'old';
          portraits = getCharacterPortraits(`generic_${genderPart}_${agePart}`);
      } else if (templateSource?.portraits) {
          portraits = templateSource.portraits;
      }

      const customer: Customer = {
          id: crypto.randomUUID(),
          name: event.npcName,
          description: templateSource?.description || "到期结算",
          avatarSeed: templateSource?.avatarSeed || "default",
          portraits,
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
    // startAmbience('DAY'); // Removed per user request

    // NOTE: Blackmarket refresh and mail processing are handled
    // by the state machine effects when OPEN_SHOP transitions to DAY_START.EXPIRY_CHECK.
    // Maintenance cost is deducted at night closing (END_DAY transition).
    // These dispatch calls are kept for backward compatibility during migration.

    // 0.5. Refresh Black Market daily state (check lock expiration)
    dispatch({ type: 'BLACKMARKET_REFRESH_DAILY' });

    // 1. Process daily mail
    dispatch({ type: 'PROCESS_DAILY_MAIL' });

    // 1.2. Deliver moral echoes (道德回声投递)
    // Check queue for echoes that should be delivered today
    const echoQueue = state.abilityState.moralEchoQueue;
    const currentDay = state.stats.day;
    const dueEchoes = getEchoesForDay(echoQueue, currentDay);
    if (dueEchoes.length > 0) {
        const echoTexts: { channel: 'MONOLOGUE' | 'NPC_REACTION'; text: string }[] = [];

        for (const echo of dueEchoes) {
            const resolved = getEchoText(echo);
            if (!resolved.text || resolved.text === '......') continue;

            switch (echo.channel) {
                case 'MONOLOGUE':
                case 'NPC_REACTION':
                    echoTexts.push({ channel: echo.channel, text: resolved.text });
                    break;
                case 'NEWS':
                    dispatch({
                        type: 'ADD_PENDING_NEWS',
                        payload: {
                            headline: resolved.newsHeadline || '社区消息',
                            body: resolved.text,
                            category: NewsCategory.NARRATIVE_ECHO,
                            priority: echo.severity === 'HIGH' ? 90 : echo.severity === 'MEDIUM' ? 70 : 50,
                            sourceLabel: '[道德回声]',
                            tags: ['moral_echo', echo.source.toLowerCase()],
                            effects: [],
                            displayDay: currentDay,
                            duration: 1,
                        },
                    });
                    break;
                case 'MAIL': {
                    // Register a runtime mail template and schedule delivery
                    const echoMailId = `_echo_${echo.source.toLowerCase()}_${currentDay}_${Math.random().toString(36).slice(2, 6)}`;
                    registerRuntimeMailTemplate({
                        id: echoMailId,
                        sender: resolved.mailSender || '匿名',
                        subject: resolved.mailSubject || '一封信',
                        body: resolved.text,
                        attachments: { cash: 0 },
                    });
                    dispatch({
                        type: 'SCHEDULE_MAIL',
                        payload: { templateId: echoMailId, delayDays: 0 },
                    });
                    break;
                }
            }
        }

        if (echoTexts.length > 0) {
            dispatch({ type: 'SET_ECHO_TEXTS', payload: echoTexts });
        }

        // Remove delivered echoes from queue
        dispatch({ type: 'PROCESS_MORAL_ECHOES', payload: { day: currentDay } });
    }

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

    // 1.6. Check for holding period risk events (#32, #33)
    if (!stolenItemToInvestigate) {  // Don't stack with police investigation
        const holdingEvent = checkForHoldingPeriodEvent(state.inventory, currentDay);
        if (holdingEvent) {
            const derivedEvent = buildRandomItemDerivedEvent(
                holdingEvent.type,
                holdingEvent.item,
                currentDay
            );
            dispatch({
                type: 'TRIGGER_ITEM_DERIVED_EVENT',
                payload: derivedEvent
            });
        }
    }

    // 2. Check for expiry events (REDEEM/RENEW only, NO_SHOW auto-forfeits)
    const { expiryEvents, noShowForfeits } = checkDailyExpirations();

    // 3. Apply expiryFlows.noShow.keep effects for auto-forfeited items
    noShowForfeits.forEach(({ itemId, chainId, itemName }) => {
        const storyEvent = ALL_STORY_EVENTS.find(e =>
            e.coreItemId === itemId || e.item?.id === itemId
        );
        let hasMailEffect = false;
        if (storyEvent?.expiryFlows?.noShow?.keep) {
            storyEvent.expiryFlows.noShow.keep.forEach(effect => {
                if (effect.type === 'MODIFY_VAR' && effect.variable && effect.value !== undefined) {
                    dispatch({
                        type: 'UPDATE_CHAIN_VAR',
                        payload: { chainId, variable: effect.variable, value: effect.value }
                    });
                } else if (effect.type === 'SCHEDULE_MAIL' && effect.templateId) {
                    hasMailEffect = true;
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
        // #17: Generate system mail for NO_SHOW forfeits that lack story-specific mail
        if (!hasMailEffect) {
            dispatch({
                type: 'SCHEDULE_MAIL',
                payload: {
                    templateId: 'mail_generic_plea',
                    delayDays: 1,
                    metadata: { relatedItemName: itemName },
                    sourceChainId: chainId
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
            const customer = createExpiryCustomer(normalEvents[0]);
            if (customer) {
                // Order matters: send phase transition FIRST (resetDailyCounters clears currentCustomer),
                // then set queue and customer so they survive the reset.
                send({ type: 'EXPIRY_CHECK_DONE', hasExpiry: true });
                dispatch({ type: 'SET_EXPIRY_QUEUE', payload: normalEvents });
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

  // Process next expiry event in queue or continue to normal day.
  // Called from DepartureView after DISMISS; the state machine DISMISS transition
  // already handles phase changes (DEPARTURE -> NEGOTIATION.REDEEM if more events,
  // or DEPARTURE -> BUSINESS.IDLE if done), so this function only manages
  // customer creation and queue cleanup.
  const processNextExpiryEvent = () => {
      const queue = state.expiryQueue;
      if (queue.length > 1) {
          // More events to process - create customer for next event.
          // The DISMISS transition already popped the queue and moved to NEGOTIATION.REDEEM.
          const remaining = queue.slice(1);
          dispatch({ type: 'SET_EXPIRY_QUEUE', payload: remaining });
          const customer = createExpiryCustomer(remaining[0]);
          if (customer) {
              dispatch({ type: 'SET_CUSTOMER', payload: customer });
          }
          // If no valid customer, the state machine is already in NEGOTIATION.REDEEM
          // but with no customer - the UI will show an error state from SettlementInterface.
      } else {
          // All expiry events handled. The DISMISS transition already moved to BUSINESS.IDLE
          // and cleared the queue via clearExpiryQueue + clearCustomer effects.
          dispatch({ type: 'SET_EXPIRY_QUEUE', payload: [] });
      }
  };

  const generateDailyEvent = async () => {
    if (state.isLoading) return;
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

          // Intercept PURCHASE_OFFER: render as ItemDerivedEvent (immersive binary choice)
          if (narrativeEvent.interaction?.type === 'PURCHASE_OFFER') {
              const targetItemId = narrativeEvent.interaction.targetItemId || narrativeEvent.targetItemId;
              const targetItem = targetItemId ? state.inventory.find(i => i.id === targetItemId) : null;

              if (targetItem) {
                  const template = narrativeEvent.template;
                  const dialogue = template.dialogue;

                  const derivedEvent = buildPurchaseOfferEvent({
                      itemId: targetItem.id,
                      itemName: targetItem.name,
                      npcName: template.name || '收藏家',
                      npcDescription: template.description,
                      npcAvatar: template.avatarSeed,
                      sceneNarrative: template.description || (typeof dialogue.greeting === 'string' ? dialogue.greeting : '') || '一位神秘的来客推开了门——',
                      npcQuote: (typeof dialogue.pawnReason === 'string' ? dialogue.pawnReason : '') || narrativeEvent.interaction.reason || '"这件东西，我的客户非常想要。"',
                      situationDesc: narrativeEvent.interaction.description || '一份收购合同。',
                      offerValue: narrativeEvent.interaction.offerValue || 0,
                      chainId: narrativeEvent.chainId,
                      storyEventId: narrativeEvent.id,
                      triggerDay: state.stats.day,
                  });

                  dispatch({ type: 'TRIGGER_ITEM_DERIVED_EVENT', payload: derivedEvent });
                  dispatch({ type: 'SET_LOADING', payload: false });
                  return;
              }
          }

          let storyCustomer = instantiateStoryCustomer(narrativeEvent, state.inventory, currentFunds, chainState);

          if (narrativeEvent.type === 'POST_FORFEIT_VISIT' && targetId) {
              const realItem = state.inventory.find(i => i.id === targetId);
              if (realItem) {
                  storyCustomer.item = { ...realItem };
                  storyCustomer.interactionType = 'REDEEM';
                  storyCustomer.redemptionIntent = 'REDEEM';
                  storyCustomer.allowFreeRedeem = true;
                  // #23: Assign post-forfeit variant based on NPC emotional state
                  const hope = chainState?.variables?.hope as number | undefined;
                  const funds = chainState?.variables?.funds as number | undefined;
                  if (hope !== undefined && hope <= 20) {
                      storyCustomer.postForfeitVariant = 'resigned';
                  } else if (funds !== undefined && funds <= 0) {
                      storyCustomer.postForfeitVariant = 'angry';
                  } else {
                      storyCustomer.postForfeitVariant = 'pleading';
                  }
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
                       storyCustomer._dynamicEffects = flowResult.flow.outcome;
                  } else if (intent === 'EXTEND') {
                       storyCustomer.dialogue.greeting = "老板... 钱还没凑齐。能不能再宽限几天？我先付利息。";
                  } else {
                       storyCustomer.dialogue.greeting = resolveDialogue(flowResult.flow.dialogue, chainState);
                       storyCustomer.dialogue.accepted.fair = "谢谢。";
                       storyCustomer._dynamicEffects = flowResult.flow.outcome;
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
      // Debug: skip filler generation if disabled
      if (state.debugDisableFiller) {
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'MARK_NO_MORE_CUSTOMERS' });
          return;
      }
      // Generate filler customers when no story events are available
      // Logic: filler + narrative total cap is MAX_CUSTOMERS_PER_DAY (4)
      // If narrative >= 4, no filler (all slots taken by narrative)
      const narrativeServed = state.narrativeCustomersServedToday;
      const fillerServed = state.customersServedToday - narrativeServed;

      // #49: Dark path - innocence below threshold reduces daily customer count by 1
      const darkPathThreshold = GAME_CONFIG.REPUTATION_THRESHOLDS.DARK_PATH_CUSTOMER_REDUCTION_THRESHOLD;
      const customerReduction = state.reputation[ReputationType.INNOCENCE] < darkPathThreshold ? 1 : 0;
      const effectiveMaxCustomers = Math.max(1, state.maxCustomersPerDay - customerReduction);

      const fillerAllowedCount = Math.max(0, effectiveMaxCustomers - narrativeServed);
      const canGenerateFiller = fillerServed < fillerAllowedCount;

      // #25: Word-of-mouth referral customer (first filler slot of the day)
      if (canGenerateFiller && state.pendingReferralCustomer && fillerServed === 0) {
          const excludeTemplateIds = new Set<string>(
              state.inventory
                  .filter(item => item.status === ItemStatus.ACTIVE && item.templateId)
                  .map(item => item.templateId!)
          );
          const referral = generateReferralCustomer(state.stats.day, excludeTemplateIds, {
              humanity: state.reputation[ReputationType.HUMANITY],
              innocence: state.reputation[ReputationType.INNOCENCE],
              credibility: state.reputation[ReputationType.CREDIBILITY],
              activeMilestones: state.activeMilestones,
          });
          if (referral) {
              dispatch({ type: 'SET_PENDING_REFERRAL', payload: false });
              setTimeout(() => {
                  dispatch({ type: 'SET_CUSTOMER', payload: referral });
                  dispatch({ type: 'SET_LOADING', payload: false });
              }, 200);
              return;
          }
      }

      if (canGenerateFiller) {
          // Collect template IDs from inventory to avoid duplicate items
          // Only consider ACTIVE items (pawned, not yet redeemed/forfeited/sold)
          const excludeTemplateIds = new Set<string>(
              state.inventory
                  .filter(item => item.status === ItemStatus.ACTIVE && item.templateId)
                  .map(item => item.templateId!)
          );
          const fillerCustomer = generateFillerCustomer(state.stats.day, undefined, excludeTemplateIds, null, {
              humanity: state.reputation[ReputationType.HUMANITY],
              innocence: state.reputation[ReputationType.INNOCENCE],
              credibility: state.reputation[ReputationType.CREDIBILITY],
              activeMilestones: state.activeMilestones,
          });
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

    // Contract tier reputation effects (design doc - 声誉系统):
    // Generous = offer exceeds customer's ask price (desiredAmount)
    const isGenerous = offer > desiredAmount;
    if (rate === 0) {
        // 0% Charity: flat +5 Humanity (generous/normal values both 5 in TOML)
        repDelta[ReputationType.HUMANITY] += isGenerous ? GAME_CONFIG.REPUTATION_DELTAS.CHARITY_GENEROUS_HUMANITY : GAME_CONFIG.REPUTATION_DELTAS.CHARITY_NORMAL_HUMANITY;
    } else if (rate > 0 && rate < 0.10) {
        // 5% Aid: neutral — no reputation changes (all values 0 in TOML)
        repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.AID_CREDIBILITY;
        repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.AID_EXTRA_CREDIBILITY;
        if (isGenerous) {
            repDelta[ReputationType.HUMANITY] += GAME_CONFIG.REPUTATION_DELTAS.AID_GENEROUS_HUMANITY;
        }
    } else if (rate >= 0.10 && rate < 0.20) {
        // 10% Standard: Credibility (no humanity bonus even if generous)
        repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.STANDARD_CREDIBILITY;
    } else if (rate >= 0.20) {
        // >=20% Shark: Humanity, Credibility, Innocence penalties (generous doesn't help)
        repDelta[ReputationType.HUMANITY] += GAME_CONFIG.REPUTATION_DELTAS.SHARK_HUMANITY;
        repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.SHARK_CREDIBILITY;
        repDelta[ReputationType.INNOCENCE] += GAME_CONFIG.REPUTATION_DELTAS.SHARK_INNOCENCE;
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
          // 知情收赃 + 压价 (明知 + 趁火打劫)
          repDelta[ReputationType.INNOCENCE] += GAME_CONFIG.REPUTATION_DELTAS.STOLEN_KNOWN_LEVERAGE_INNOCENCE;
        } else {
          // 知情收赃 (未压价, 明知故犯)
          repDelta[ReputationType.INNOCENCE] += GAME_CONFIG.REPUTATION_DELTAS.STOLEN_KNOWN_NO_LEVERAGE_INNOCENCE;
        }
      }
      // 不知情收赃: 0 Innocence (but item is still stolen - risk deferred to police investigation)
    }

    // Other illicit goods (contraband but not stolen): reduce INNOCENCE
    if (!item.isStolen && item.category === '违禁品' && !item.isSuspicious) {
      repDelta[ReputationType.INNOCENCE] += GAME_CONFIG.REPUTATION_DELTAS.CONTRABAND_INNOCENCE;
      repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.CONTRABAND_CREDIBILITY;
    }

    // During crackdown, additional penalties for any illicit goods
    if ((item.isStolen || (item.category === '违禁品' && !item.isSuspicious)) && currentRisk > 0) {
        // Additional immediate rep penalty for risk taking during crackdown
        repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.CRACKDOWN_CREDIBILITY;
        repDelta[ReputationType.INNOCENCE] += GAME_CONFIG.REPUTATION_DELTAS.CRACKDOWN_INNOCENCE;
    }
    
    if (item.isFake) repDelta[ReputationType.CREDIBILITY] += GAME_CONFIG.REPUTATION_DELTAS.FAKE_CREDIBILITY;

    const valuationBasis = item.perceivedValue !== undefined ? item.perceivedValue : item.realValue;
    const termDays = customer.pawnTermDays || GAME_CONFIG.ECONOMY.DEFAULT_PAWN_TERM_DAYS;
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
                                 const meta: Record<string, unknown> = { relatedItemName: customer?.item.name };
                                 const ed = effect.delayDays || 0;
                                 const mt = getMailTemplate(effect.templateId);
                                 const fd = ed > 0 ? ed : resolveMailDelay(mt?.delay);
                                 dispatch({ type: 'SCHEDULE_MAIL', payload: { templateId: effect.templateId, delayDays: fd, metadata: meta, sourceChainId: chainId } });
                             }
                             break;
                         case 'CONDITIONAL_MAIL':
                             if (effect.condition && effect.templateId) {
                                 if (checkCondition(effect.condition, newChain)) {
                                      const meta: Record<string, unknown> = { relatedItemName: customer?.item.name };
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

    // Play doorbell as customer leaves after transaction
    playSfx('DOORBELL');

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
             let effectsToRun: ChainUpdateEffect[] = currentCust._dynamicEffects || [];
             if (effectsToRun.length === 0 && chainEvent.outcomes) {
                 const { principal, rate } = result.terms || { principal: 0, rate: 0.05 };
                 let outcomeKey = 'deal_standard';
                 if (rate === 0) outcomeKey = 'deal_charity';
                 else if (rate === 0.05) outcomeKey = 'deal_aid';
                 else if (rate === 0.10) outcomeKey = 'deal_standard';
                 else if (rate >= 0.20) outcomeKey = 'deal_shark';

                 effectsToRun = chainEvent.outcomes[outcomeKey] || chainEvent.outcomes['deal_standard'] || [];
                 const realValue = result.item?.realValue || 0;
                 const isPremium = principal >= GAME_CONFIG.REPUTATION_DELTAS.PREMIUM_THRESHOLD || (realValue > 0 && principal >= realValue * GAME_CONFIG.REPUTATION_DELTAS.PREMIUM_VALUE_RATIO);
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
             let isFillerDeal = false;
             if (!currentCust?.chainId && result.terms && !result.item.isVirtual) {
                 isFillerDeal = true;
                 const contractType = getContractTypeFromRate(result.terms.rate);
                 const transientChain = createTransientChain(
                     currentCust!,
                     result.item,
                     contractType
                 );
                 // Store age/gender in chain variables for redemption visit dialogue
                 const ageTag = currentCust!.identityTags?.find(t => ['young', 'middle', 'elderly'].includes(t));
                 const genderTag = currentCust!.id.includes('filler_')
                     ? (currentCust!.description.includes('男性') ? 'male' : currentCust!.description.includes('女性') ? 'female' : 'male')
                     : 'male';
                 transientChain.variables.customerAge = ageTag || 'middle';
                 transientChain.variables.customerGender = genderTag;
                 // Link item to the transient chain
                 result.item.relatedChainId = transientChain.id;
                 // Add chain to active chains
                 dispatch({ type: 'UPDATE_CHAINS', payload: [...state.activeChains, transientChain] });
             }

             // Generate merchant monologue for filler customer deals (v2.1 Section 10)
             let fillerMonologue: string | undefined;
             if (isFillerDeal && result.terms) {
                 const contractType = getContractTypeFromRate(result.terms.rate);
                 fillerMonologue = getFillerMerchantMonologue('contract', contractType);
             }

             // Calculate transaction feedback (redemption rate impact display)
             let txFeedback = null;
             if (result.terms && result.item) {
                 const feedbackContractType = getContractTypeFromRate(result.terms.rate);
                 txFeedback = calculateTransactionFeedback(
                     feedbackContractType,
                     result.terms.principal,
                     result.item.realValue
                 );
             }

             if (result.item.isVirtual) {
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: null, log: `交易完成: ${result.item.name}。`, customerName: state.currentCustomer?.name || "Customer", dealQuality: result.dealQuality, interestRate: result.terms?.rate, merchantMonologue: fillerMonologue, transactionFeedback: txFeedback } });
             } else {
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: result.item, log: `收购了 ${result.item.name} (支出 $${Math.abs(result.cashDelta)})。`, customerName: state.currentCustomer?.name || "Customer", dealQuality: result.dealQuality, interestRate: result.terms?.rate, merchantMonologue: fillerMonologue, transactionFeedback: txFeedback } });
             }
        } else {
             dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: result.cashDelta, reputationDelta: result.reputationDelta, item: null, log: result.message || "交易完成", customerName: state.currentCustomer?.name || "Customer", dealQuality: result.dealQuality, interestRate: result.terms?.rate } });
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

    // #3: Record departure attitude to item log
    if (result.success && result.item && !result.item.isVirtual && currentCust) {
        const satisfaction = evaluateSatisfaction(
            result.terms?.principal || 0,
            result.terms?.rate || 0.05,
            currentCust.minimumAmount,
            currentCust.minimumAmount,
            false,
            currentCust.minimumAmount > 0
                ? (result.terms?.principal || 0) / currentCust.minimumAmount
                : 0.7
        );
        const departureLog = generatePlayerChoiceLog(
            state.stats.day,
            'DEPARTURE',
            { satisfaction }
        );
        dispatch({
            type: 'APPEND_ITEM_LOGS',
            payload: [{ itemId: result.item.id, log: departureLog }]
        });
    }

    // #21: Record spectrometer anomaly/confirmation to item log
    if (result.success && result.item && !result.item.isVirtual) {
        const isAnomaly = checkItemAnomaly(result.item.perceivedValue, result.item.realValue, state.shopUpgrades);
        if (hasPrecisionBench(state.shopUpgrades)) {
            let feedbackText: string;
            if (isAnomaly) {
                const visualValue = result.item.perceivedValue ?? result.item.realValue;
                const pctDiff = result.item.realValue > 0
                    ? (Math.abs(visualValue - result.item.realValue) / result.item.realValue) * 100
                    : 0;
                const severity = getAnomalySeverity(pctDiff);
                feedbackText = getAnomalyMessage(severity).text;
            } else {
                feedbackText = getNormalConfirmationMessage();
            }
            const spectroLog = generateSpectrometerLog(state.stats.day, feedbackText, isAnomaly);
            dispatch({
                type: 'APPEND_ITEM_LOGS',
                payload: [{ itemId: result.item.id, log: spectroLog }]
            });
        }
    }

    // NPC Fate Tracking: Record initial pawn entry for narrative customers
    if (result.success && currentCust?.chainId && result.terms && result.item) {
        const chain = state.activeChains.find(c => c.id === currentCust.chainId);
        if (chain) {
            dispatch({ type: 'RECORD_NPC_FATE', payload: {
                npcId: chain.id,
                npcName: chain.npcName || currentCust.name,
                principalGiven: result.terms.principal,
                interestRate: result.terms.rate,
                wasRedeemed: false,
                wasForfeited: false,
                wasReforged: false,
                wasSoldBlackmarket: false,
            }});
        }
    }

    // P0-5: Essence gain from transaction (道德精魄获取)
    // Interest rate is stored as decimal fraction (0, 0.05, 0.10, 0.20)
    // but essenceSystem expects percentage integer (0, 5, 10, 20)
    if (result.success && result.terms) {
        const ratePercent = result.terms.rate * 100;
        const essenceGain = calculateTransactionEssenceGain(ratePercent);
        if (essenceGain.craft > 0 || essenceGain.time > 0 || essenceGain.vibe > 0) {
            dispatch({ type: 'ADD_ESSENCE_BATCH', payload: { craft: essenceGain.craft, time: essenceGain.time, vibe: essenceGain.vibe } });
        }

        // Stolen goods bonus essence
        if (result.item?.isStolen) {
            const stolenGain = calculateStolenGoodsEssenceGain();
            if (stolenGain.craft > 0 || stolenGain.time > 0 || stolenGain.vibe > 0) {
                dispatch({ type: 'ADD_ESSENCE_BATCH', payload: { craft: stolenGain.craft, time: stolenGain.time, vibe: stolenGain.vibe } });
            }
        }
    }

    // I-11: Generate training feedback for night review
    if (result.success && currentCust && result.terms) {
        const insightUsed = state.currentCustomerInsight !== null;
        const disposition = insightUsed && state.currentCustomerInsight
            ? state.currentCustomerInsight.disposition
            : determineDisposition(currentCust.behaviorTags);
        const trainingResult = generateTrainingResult(
            result.terms.principal,
            currentCust.minimumAmount,
            currentCust.desiredAmount,
            disposition,
            insightUsed
        );
        dispatch({ type: 'SET_INSIGHT_TRAINING_RESULT', payload: trainingResult });
    }
  };

  const rejectCustomer = (satisfaction: SatisfactionLevel = 'DESPERATE') => {
     const currentCust = state.currentCustomer;

     // Play doorbell as customer leaves
     playSfx('DOORBELL');

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
      const amount = Math.floor(item.realValue * GAME_CONFIG.ECONOMY.LIQUIDATION_RATE * multiplier);
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

  // H-3: Get mother's dialogue variant based on player's moral standing
  // Returns dialogue text that reflects mother's reaction to player's business practices
  const getMotherVisitDialogue = (): { greeting: string; mood: 'proud' | 'neutral' | 'concerned' } => {
      const humanity = state.reputation[ReputationType.HUMANITY];
      const motherHealth = state.stats.motherStatus.health;

      if (humanity >= GAME_CONFIG.MOTHER.MOTHER_PROUD_HUMANITY_THRESHOLD) {
          // High humanity: mother is proud but worried about finances
          const lines = [
              "孩子，听说你帮了不少人...妈妈很骄傲。不过你自己的钱够用吗？",
              "邻居说你是个好人...别光顾着帮别人，也照顾好自己。",
              "妈妈听说了你做的好事，心里很欣慰。但别把自己亏了。",
          ];
          return {
              greeting: lines[Math.floor(Math.random() * lines.length)],
              mood: 'proud'
          };
      } else if (humanity < GAME_CONFIG.MOTHER.MOTHER_CONCERN_HUMANITY_THRESHOLD) {
          // Low humanity: mother has heard rumors
          const lines = [
              "孩子...外面有些不好的传闻。你没在做什么过分的事吧？",
              "妈妈听人说了一些事...你做生意，不能太黑心啊。",
              "有人跟我说你铺子里的利息很高...孩子，做人要有良心。",
          ];
          return {
              greeting: lines[Math.floor(Math.random() * lines.length)],
              mood: 'concerned'
          };
      } else {
          // Normal range: neutral conversation
          if (motherHealth < 40) {
              return {
                  greeting: "咳咳...你来了。别担心妈妈，我还撑得住。",
                  mood: 'neutral'
              };
          }
          const lines = [
              "你来了啊，今天生意怎么样？",
              "看你这么辛苦，妈妈心疼你。",
              "别太累了，身体要紧。",
          ];
          return {
              greeting: lines[Math.floor(Math.random() * lines.length)],
              mood: 'neutral'
          };
      }
  };

  // P1-6: Purchase care for mother
  const purchaseCare = (level: 'Standard' | 'Premium') => {
      const cost = level === 'Premium'
          ? GAME_CONFIG.MOTHER.CARE_PREMIUM_COST
          : GAME_CONFIG.MOTHER.CARE_STANDARD_COST;
      const duration = GAME_CONFIG.MOTHER.CARE_DURATION;

      if (state.stats.cash < cost) return false;

      dispatch({
          type: 'PURCHASE_CARE',
          payload: { level, cost, duration }
      });
      return true;
  };

  // Resolve an item-derived event (unified: thief regret / original owner / purchase offer)
  const resolveItemDerivedEvent = useCallback((choiceId: string) => {
      const event = state.currentItemDerivedEvent;
      if (!event) return;

      dispatch({
          type: 'RESOLVE_ITEM_DERIVED_EVENT',
          payload: {
              eventType: event.eventType,
              itemId: event.itemId,
              choiceId,
              storyEventId: event.storyEventId,
              chainId: event.chainId,
          }
      });

      // Apply chain effects for DSL events (PURCHASE_OFFER)
      if (event.chainId && event.storyEventId) {
          const storyEvent = ALL_STORY_EVENTS.find(e => e.id === event.storyEventId);
          if (storyEvent) {
              if (choiceId === 'accept' && storyEvent.outcomes) {
                  // DSL outcomes use deal-tier keys (deal_standard, deal_charity, etc.), not 'accept'
                  const acceptEffects = storyEvent.outcomes['accept']
                      || storyEvent.outcomes['deal_standard']
                      || storyEvent.outcomes['deal_charity']
                      || storyEvent.outcomes['deal_aid']
                      || storyEvent.outcomes['deal_shark']
                      || storyEvent.onComplete;
                  if (acceptEffects) applyChainEffects(event.chainId, acceptEffects);
              } else if (choiceId === 'refuse') {
                  if (storyEvent.onReject) {
                      applyChainEffects(event.chainId, storyEvent.onReject);
                  }
              }
          }
      }
  }, [state.currentItemDerivedEvent, dispatch]);

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
      handleExternalTrigger,
      // P1-6: Care purchase
      purchaseCare,
      // H-3: Mother visit dialogue
      getMotherVisitDialogue,
      // Item-derived event resolution
      resolveItemDerivedEvent
  };
};
