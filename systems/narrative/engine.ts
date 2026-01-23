
import { EventChainState, StoryEvent, TriggerCondition, Dialogue, DialogueText, SimOperation, Customer, Item, ItemStatus, DynamicFlowOutcome } from '../../types';

// Helper: Evaluate a single condition
const checkCondition = (condition: TriggerCondition, chain: EventChainState): boolean => {
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
const resolveDialogue = (def: DialogueText, chain?: EventChainState): string => {
    if (typeof def === 'string') return def;
    if (!chain) return def[def.length - 1].text; 

    for (const variant of def) {
        if (checkCondition(variant.condition, chain)) {
            return variant.text;
        }
    }
    return def.length > 0 ? def[def.length - 1].text : "...";
};

const resolveCustomerDialogue = (templateDialogue: any, chain?: EventChainState): Dialogue => {
    const resolved: any = {};
    ['greeting', 'pawnReason', 'redemptionPlea', 'negotiationDynamic', 'rejected'].forEach(key => {
        resolved[key] = resolveDialogue(templateDialogue[key], chain);
    });
    resolved.accepted = {};
    ['fair', 'fleeced', 'premium'].forEach(key => {
        resolved.accepted[key] = resolveDialogue(templateDialogue.accepted[key], chain);
    });
    resolved.rejectionLines = {};
    ['standard', 'angry', 'desperate'].forEach(key => {
        if (templateDialogue.rejectionLines[key]) {
            resolved.rejectionLines[key] = resolveDialogue(templateDialogue.rejectionLines[key], chain);
        }
    });
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

export const instantiateStoryCustomer = (
    event: StoryEvent, 
    inventory: Item[] = [], 
    currentFunds?: number,
    chainState?: EventChainState
): Customer => {
    const template = event.template;
    const baseItem = event.item || template.item || {};
    const deepItem = JSON.parse(JSON.stringify(baseItem));
    
    const resolvedDialogue = resolveCustomerDialogue(template.dialogue, chainState);
    if (!deepItem.initialValuationRange && deepItem.valuationRange) {
        deepItem.initialValuationRange = { ...deepItem.valuationRange };
    }
    
    const currentWallet = currentFunds !== undefined 
        ? currentFunds 
        : ((template as any).currentWallet || template.maxRepayment || 1000);
    
    let intent: 'REDEEM' | 'EXTEND' | 'LEAVE' | undefined;
    let logicItem = deepItem;
    if (event.type === 'REDEMPTION_CHECK' && event.targetItemId) {
        const realItem = inventory.find(i => i.id === event.targetItemId);
        if (realItem) logicItem = realItem;
    }
    
    if (template.redemptionIntent) {
        intent = template.redemptionIntent;
    } else if ((template as any).interactionType === 'REDEEM' && logicItem.pawnInfo) {
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
        interactionType: (template as any).interactionType || 'PAWN',
        redemptionIntent: intent,
        currentWallet: currentWallet, 
        currentAskPrice: (template as any).currentAskPrice,
        chainId: event.chainId,
        eventId: event.id,
        recapLog: chainState?.simulationLog ? chainState.simulationLog.slice(-5) : undefined,
        allowFreeRedeem: template.allowFreeRedeem 
    };
};

export const resolveRedemptionFlow = (event: StoryEvent, inventory: Item[], dynamicTargetId?: string): { flowKey: string, flow: DynamicFlowOutcome } | null => {
    if (event.type !== 'REDEMPTION_CHECK' || !event.dynamicFlows) return null;
    const targetId = event.targetItemId || dynamicTargetId;
    if (!targetId) return null;

    const coreItem = inventory.find(i => i.id === targetId);
    const coreSafe = !!coreItem && coreItem.status !== ItemStatus.SOLD && coreItem.status !== ItemStatus.REDEEMED;
    const otherChainItems = inventory.filter(i => i.relatedChainId === event.chainId && i.id !== targetId && i.status !== ItemStatus.REDEEMED);
    const othersSafe = otherChainItems.every(i => i.status !== ItemStatus.SOLD);

    let flowKey = "core_lost";
    if (coreSafe) {
        flowKey = othersSafe ? "all_safe" : "core_safe";
    }
    const flow = event.dynamicFlows[flowKey];
    return flow ? { flowKey, flow } : null;
};
