
import { EventChainState, StoryEvent, TriggerCondition, Dialogue, DialogueText, SimOperation, Customer, Item, ItemStatus, DynamicFlowOutcome } from '../../types';
import { GameState } from '../game/types';
import { generateFateHint } from './fateHints';

// Helper: Evaluate a single condition
export const checkCondition = (condition: TriggerCondition, chain: EventChainState): boolean => {
  let currentVal = 0;
  if (chain.variables && condition.variable in chain.variables) {
      currentVal = chain.variables[condition.variable];
  } else if (condition.variable in chain) {
      const val = (chain as any)[condition.variable];
      if (typeof val === 'number') currentVal = val;
  }

  const targetVal = condition.value;
  switch (condition.operator) {
    case '>': return currentVal > targetVal;
    case '<': return currentVal < targetVal;
    case '>=': return currentVal >= targetVal;
    case '<=': return currentVal <= targetVal;
    case '==': return currentVal === targetVal;
    case '%': return currentVal % targetVal === 0;
    default: return false;
  }
};

// Dialogue Resolution
export const resolveDialogue = (def: DialogueText, chain?: EventChainState): string => {
    if (def === undefined || def === null) return "...";
    if (typeof def === 'string') return def;
    if (!Array.isArray(def) || def.length === 0) return "...";

    if (!chain) {
        return def[def.length - 1].text; 
    }

    for (const variant of def) {
        if (!variant.condition || checkCondition(variant.condition, chain)) {
            return variant.text;
        }
    }
    return def[def.length - 1].text;
};

const resolveCustomerDialogue = (templateDialogue: any, chain?: EventChainState): Dialogue => {
    // Safety check for undefined dialogue template
    const defaultDialogue: Dialogue = {
        greeting: "...",
        pawnReason: "...",
        redemptionPlea: "...",
        negotiationDynamic: "...",
        accepted: { fair: "...", fleeced: "...", premium: "..." },
        rejected: "...",
        rejectionLines: { standard: "...", angry: "..." },
        exitDialogues: { grateful: "...", neutral: "...", resentful: "...", desperate: "..." }
    };

    if (!templateDialogue) {
        return defaultDialogue;
    }

    const resolved: any = {};
    const safeResolve = (key: string) => resolveDialogue(templateDialogue[key], chain);

    resolved.greeting = safeResolve('greeting');
    resolved.pawnReason = safeResolve('pawnReason');
    resolved.redemptionPlea = safeResolve('redemptionPlea');
    resolved.negotiationDynamic = safeResolve('negotiationDynamic');
    resolved.rejected = safeResolve('rejected');
    
    resolved.accepted = {};
    if (templateDialogue.accepted) {
        ['fair', 'fleeced', 'premium'].forEach(key => {
            resolved.accepted[key] = resolveDialogue(templateDialogue.accepted[key], chain);
        });
    } else {
        resolved.accepted = defaultDialogue.accepted;
    }

    resolved.rejectionLines = {};
    if (templateDialogue.rejectionLines) {
        ['standard', 'angry', 'desperate'].forEach(key => {
            if (templateDialogue.rejectionLines[key]) {
                resolved.rejectionLines[key] = resolveDialogue(templateDialogue.rejectionLines[key], chain);
            }
        });
    } else {
        resolved.rejectionLines = defaultDialogue.rejectionLines;
    }
    
    resolved.exitDialogues = {};
    const defaultExits = {
        grateful: "你是我的恩人... 谢谢。",
        neutral: "回见。",
        resentful: "算你狠... 吸血鬼。",
        desperate: "你见死不救！"
    };
    
    if (templateDialogue.exitDialogues) {
        ['grateful', 'neutral', 'resentful', 'desperate'].forEach(key => {
            if (templateDialogue.exitDialogues[key]) {
                resolved.exitDialogues[key] = resolveDialogue(templateDialogue.exitDialogues[key], chain);
            } else {
                resolved.exitDialogues[key] = defaultExits[key as keyof typeof defaultExits];
            }
        });
    } else {
        resolved.exitDialogues = defaultExits;
    }

    return resolved as Dialogue;
};

// Simulation Execution
const executeSimOp = (chain: EventChainState, op: SimOperation, sideEffects: { chainId: string, op: SimOperation }[]): void => {
    if (op.type === 'DEACTIVATE') {
        chain.isActive = false;
    } 
    else if (op.type === 'SET_STAGE') {
        if (op.value !== undefined) chain.stage = op.value;
    } 
    else if (op.type === 'MOD_VAR' && op.target) {
        const val = op.value || 0;
        const current = chain.variables[op.target] || 0;
        switch (op.op || 'ADD') {
            case 'ADD': chain.variables[op.target] = current + val; break;
            case 'SUB': chain.variables[op.target] = current - val; break;
            case 'SET': chain.variables[op.target] = val; break;
        }
    }
    else if (op.type === 'SCHEDULE_MAIL') {
        sideEffects.push({ chainId: chain.id, op });
    }
};

export const runDailySimulation = (chains: EventChainState[]): { chains: EventChainState[], sideEffects: { chainId: string, op: SimOperation }[] } => {
  const sideEffects: { chainId: string, op: SimOperation }[] = [];

  const newChains = chains.map(chain => {
    if (!chain.isActive) return chain;
    const newChain = { ...chain, variables: { ...chain.variables }, simulationLog: chain.simulationLog ? [...chain.simulationLog] : [] };

    if (!newChain.simulationRules) return newChain;

    newChain.simulationRules.forEach(rule => {
        // Check generic condition if present
        if (rule.condition && !checkCondition(rule.condition, newChain)) {
            return;
        }

        if (rule.type === 'DELTA') {
            const current = newChain.variables[rule.targetVar] || 0;
            newChain.variables[rule.targetVar] = current + rule.value;
            if (rule.logMessage) newChain.simulationLog!.push({ day: 0, content: rule.logMessage, type: 'DAILY' });
        }
        else if (rule.type === 'CHANCE') {
            let probability = rule.chanceFixed !== undefined ? rule.chanceFixed : (rule.chanceVar && rule.chanceVar in newChain.variables ? newChain.variables[rule.chanceVar] : 0);
            if (Math.random() * 100 < probability) {
                rule.onSuccess.forEach(op => executeSimOp(newChain, op, sideEffects));
                if (rule.successLog) newChain.simulationLog!.push({ day: 0, content: rule.successLog, type: 'MILESTONE' });
            } else if (rule.onFail) {
                rule.onFail.forEach(op => executeSimOp(newChain, op, sideEffects));
                if (rule.failLog) newChain.simulationLog!.push({ day: 0, content: rule.failLog, type: 'CRISIS' });
            }
        }
        else if (rule.type === 'THRESHOLD') {
            const currentVal = newChain.variables[rule.targetVar] || 0;
            let triggered = false;
            switch (rule.operator) {
                case '>': triggered = currentVal > rule.value; break;
                case '<': triggered = currentVal < rule.value; break;
                case '>=': triggered = currentVal >= rule.value; break;
                case '<=': triggered = currentVal <= rule.value; break;
                case '==': triggered = currentVal === rule.value; break;
            }
            if (triggered) {
                rule.onTrigger.forEach(op => executeSimOp(newChain, op, sideEffects));
                if (rule.triggerLog) newChain.simulationLog!.push({ day: 0, content: rule.triggerLog, type: 'CRISIS' });
            }
        }
        else if (rule.type === 'COMPOUND') {
             const sourceVal = newChain.variables[rule.sourceVar] || 0;
             let triggered = false;
             switch (rule.operator) {
                case '>': triggered = sourceVal > rule.threshold; break;
                case '<': triggered = sourceVal < rule.threshold; break;
                case '>=': triggered = sourceVal >= rule.threshold; break;
                case '<=': triggered = sourceVal <= rule.threshold; break;
                case '==': triggered = sourceVal === rule.threshold; break;
            }
            if (triggered) {
                const targetCurrent = newChain.variables[rule.targetVar] || 0;
                let newVal = targetCurrent + rule.effect;
                if (rule.cap) {
                    if (rule.cap.max !== undefined) newVal = Math.min(newVal, rule.cap.max);
                    if (rule.cap.min !== undefined) newVal = Math.max(newVal, rule.cap.min);
                }
                newChain.variables[rule.targetVar] = newVal;
                if (rule.logMessage) newChain.simulationLog!.push({ day: 0, content: rule.logMessage, type: 'DAILY' });
            }
        }
    });
    return newChain;
  });
  return { chains: newChains, sideEffects };
};

export const findEligibleEvent = (chains: EventChainState[], events: StoryEvent[]): StoryEvent | null => {
  const shuffledChains = [...chains].sort(() => Math.random() - 0.5);
  for (const chain of shuffledChains) {
    if (!chain.isActive) continue;
    const chainEvents = events.filter(e => e.chainId === chain.id);
    for (const event of chainEvents) {
       const allMet = event.triggerConditions.every(cond => checkCondition(cond, chain));
       if (allMet) return event;
    }
  }
  return null;
};

// NEW: Renewal Request Logic
export const checkRenewalRequests = (state: GameState): Customer | null => {
    const { inventory, activeChains, stats } = state;
    const day = stats.day;

    const expiringItems = inventory.filter(item => 
        item.status === ItemStatus.ACTIVE &&
        item.pawnInfo &&
        item.pawnInfo.dueDate - day <= 2 && 
        item.pawnInfo.dueDate - day >= 0 &&
        item.relatedChainId
    );

    if (expiringItems.length === 0) return null;

    // Pick one candidate randomly
    const candidateItem = expiringItems[Math.floor(Math.random() * expiringItems.length)];
    const chain = activeChains.find(c => c.id === candidateItem.relatedChainId);

    if (!chain || !chain.isActive) return null;

    // Logic: Do they want to renew?
    // Basic heuristics based on common variables. 
    // If specific logic is needed, we could add 'renewal_desire' to chain vars.
    // For now: High Hope or Trust + Low Funds = Renewal Request
    const funds = chain.variables.funds || 0;
    const hope = chain.variables.hope || 50;
    const trust = chain.variables.trust || 50;
    const debt = chain.variables.debt || 0;

    // Default "Desperate but hopeful" check
    const wantsToRenew = (funds < 500 && hope > 20) || (trust > 60 && funds < 1000) || (debt > 1000);

    if (!wantsToRenew) return null;

    // Construct Renewal Customer
    return generateRenewalCustomer(candidateItem, chain, day);
};

const generateRenewalCustomer = (item: Item, chain: EventChainState, currentDay: number): Customer => {
    // Generate avatar seed consistent with NPC
    const avatarSeed = `${chain.npcName}_renewal`;
    
    return {
        id: crypto.randomUUID(),
        name: chain.npcName,
        description: "行色匆匆，面带难色。",
        avatarSeed: avatarSeed,
        interactionType: 'RENEWAL',
        dialogue: {
            greeting: `老板，打扰了。关于那个${item.name}...`,
            pawnReason: "最近手头实在太紧了，眼看就要到期了，但我真的凑不齐赎金。",
            redemptionPlea: "那东西对我真的很重要，绝对不能死当。能不能... 再宽限我几天？",
            negotiationDynamic: "我也知道规矩... 我愿意加点利息。",
            accepted: { fair: "谢谢！大恩大德！", fleeced: "谢谢老板通融。", premium: "你是个好人。" },
            rejected: "好吧... 看来是留不住了。",
            rejectionLines: { standard: "打扰了。", angry: "...", desperate: "求你了..." },
            exitDialogues: {
                grateful: "谢谢老板！",
                neutral: "走了。",
                resentful: "...",
                desperate: "..."
            }
        },
        item: item,
        redemptionResolve: "Strong",
        negotiationStyle: "Desperate",
        patience: 3,
        mood: "Neutral",
        tags: ["Renewal"],
        desiredAmount: 0,
        minimumAmount: 0,
        maxRepayment: 0,
        chainId: chain.id,
        renewalProposal: {
            itemId: item.id,
            itemName: item.name,
            currentDueDate: item.pawnInfo!.dueDate,
            proposedExtensionDays: 7,
            currentInterestRate: item.pawnInfo!.interestRate,
            proposedInterestBonus: 0.05 // +5% penalty interest offer
        }
    };
};

export const instantiateStoryCustomer = (
    event: StoryEvent, 
    inventory: Item[] = [], 
    currentFunds?: number,
    chainState?: EventChainState
): Customer => {
    const template = event.template;
    const baseItem = event.item || template.item || {};
    const deepItem = JSON.parse(JSON.stringify(baseItem));
    
    // Fate Hint Logic: Inject observation, do NOT modify dialogue
    let dialogue = template.dialogue;
    let observation: string | undefined;

    if (chainState) {
        const fateHint = generateFateHint(chainState.variables);
        if (fateHint) {
            observation = fateHint;
        }
    }

    const resolvedDialogue = resolveCustomerDialogue(dialogue, chainState);
    if (!deepItem.initialValuationRange && deepItem.valuationRange) {
        deepItem.initialValuationRange = { ...deepItem.valuationRange };
    }
    
    const currentWallet = currentFunds !== undefined 
        ? currentFunds 
        : ((template as any).currentWallet || template.maxRepayment || 1000);
    
    let intent: 'REDEEM' | 'EXTEND' | 'LEAVE' | undefined;
    let interactionType = (template as any).interactionType || 'PAWN';

    // POST_FORFEIT OVERRIDE
    if (event.type === 'POST_FORFEIT_VISIT') {
        interactionType = 'POST_FORFEIT';
    }

    let logicItem = deepItem;
    if (event.type === 'REDEMPTION_CHECK' && event.targetItemId) {
        const realItem = inventory.find(i => i.id === event.targetItemId);
        if (realItem) logicItem = realItem;
    }
    
    if (template.redemptionIntent) {
        intent = template.redemptionIntent;
    } else if (interactionType === 'REDEEM' && logicItem.pawnInfo) {
        const p = logicItem.pawnInfo.principal;
        const rate = logicItem.pawnInfo.interestRate;
        const interest = Math.ceil(p * rate); 
        const total = p + interest;
        if (currentWallet >= total) intent = 'REDEEM';
        else if (currentWallet >= interest) intent = 'EXTEND';
        else intent = 'LEAVE';
    }

    return {
        id: crypto.randomUUID(),
        name: template.name || "Unknown",
        description: template.description || "",
        avatarSeed: template.avatarSeed || "default",
        portraits: template.portraits, 
        dialogue: resolvedDialogue,
        redemptionResolve: template.redemptionResolve || "Medium",
        negotiationStyle: template.negotiationStyle || "Professional",
        patience: template.patience || 3,
        mood: template.mood || "Neutral",
        tags: template.tags || [],
        item: { ...deepItem, id: deepItem.id || crypto.randomUUID() },
        desiredAmount: template.desiredAmount || 0,
        minimumAmount: template.minimumAmount || 0,
        maxRepayment: template.maxRepayment || ((template.minimumAmount || 0) * 1.5),
        interactionType: interactionType,
        redemptionIntent: intent,
        currentWallet: currentWallet, 
        currentAskPrice: (template as any).currentAskPrice,
        chainId: event.chainId,
        eventId: event.id,
        recapLog: chainState?.simulationLog ? chainState.simulationLog.slice(-5) : undefined,
        allowFreeRedeem: template.allowFreeRedeem,
        observation // New Field
    };
};

export const resolveRedemptionFlow = (
    event: StoryEvent, 
    inventory: Item[], 
    dynamicTargetId?: string,
    forceSoldBeforeDue?: boolean
): { flowKey: string, flow: DynamicFlowOutcome } | null => {
    if (event.type !== 'REDEMPTION_CHECK' || !event.dynamicFlows) return null;
    const targetId = event.targetItemId || dynamicTargetId;
    if (!targetId) return null;

    const coreItem = inventory.find(i => i.id === targetId);
    const coreSafe = !!coreItem && coreItem.status !== ItemStatus.SOLD && coreItem.status !== ItemStatus.REDEEMED;
    const otherChainItems = inventory.filter(i => i.relatedChainId === event.chainId && i.id !== targetId && i.status !== ItemStatus.REDEEMED);
    const othersSafe = otherChainItems.every(i => i.status !== ItemStatus.SOLD);

    let flowKey = "core_lost";
    
    if (forceSoldBeforeDue && event.dynamicFlows["hostile_takeover"]) {
        flowKey = "hostile_takeover";
    } else if (coreSafe) {
        flowKey = othersSafe ? "all_safe" : "core_safe";
    }
    
    const flow = event.dynamicFlows[flowKey];
    return flow ? { flowKey, flow } : null;
};
