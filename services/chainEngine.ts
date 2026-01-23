

import { EventChainState, StoryEvent, TriggerCondition, ChainVariables, Customer, Item, ItemStatus, DynamicFlowOutcome, SimOperation, Dialogue, DialogueText, SimLogEntry, SimRule } from '../types';

// Helper: Evaluate a single condition against current variables and chain state
const checkCondition = (condition: TriggerCondition, chain: EventChainState): boolean => {
  let currentVal = 0;

  // Priority 1: Check if the variable exists explicitly in the variables map
  if (chain.variables && condition.variable in chain.variables) {
      currentVal = chain.variables[condition.variable];
  } 
  // Priority 2: Check if it matches a top-level property (like 'stage')
  else if (condition.variable in chain) {
      const val = (chain as any)[condition.variable];
      if (typeof val === 'number') {
          currentVal = val;
      }
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

/**
 * Resolves a dialogue definition which can be a string or a list of conditional variants.
 */
const resolveDialogue = (def: DialogueText, chain?: EventChainState): string => {
    if (typeof def === 'string') return def;
    if (!chain) return def[def.length - 1].text; // Fallback to last if no chain context

    for (const variant of def) {
        if (checkCondition(variant.condition, chain)) {
            return variant.text;
        }
    }
    
    // Fallback to the last item as default if no conditions match
    return def.length > 0 ? def[def.length - 1].text : "...";
};

/**
 * Resolves the full dialogue object from template to final strings.
 */
const resolveCustomerDialogue = (templateDialogue: any, chain?: EventChainState): Dialogue => {
    const resolved: any = {};
    
    // Top Level Fields
    ['greeting', 'pawnReason', 'redemptionPlea', 'negotiationDynamic', 'rejected'].forEach(key => {
        resolved[key] = resolveDialogue(templateDialogue[key], chain);
    });

    // Nested: Accepted
    resolved.accepted = {};
    ['fair', 'fleeced', 'premium'].forEach(key => {
        resolved.accepted[key] = resolveDialogue(templateDialogue.accepted[key], chain);
    });

    // Nested: RejectionLines
    resolved.rejectionLines = {};
    ['standard', 'angry', 'desperate'].forEach(key => {
        if (templateDialogue.rejectionLines[key]) {
            resolved.rejectionLines[key] = resolveDialogue(templateDialogue.rejectionLines[key], chain);
        }
    });

    return resolved as Dialogue;
};

/**
 * Executes a single simulation operation on the chain state.
 * Returns the modified chain variables/state components.
 */
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

/**
 * Iterates through all chains and applies the generic Simulation Rules System.
 * Replaces hardcoded logic like 'dailyCost'.
 */
export const runDailySimulation = (chains: EventChainState[]): { chains: EventChainState[], sideEffects: { chainId: string, op: SimOperation }[] } => {
  const sideEffects: { chainId: string, op: SimOperation }[] = [];

  const newChains = chains.map(chain => {
    if (!chain.isActive) return chain;

    // Create a shallow copy so we can modify it in place during the rule pass
    // (We deep copy variables so rules can interact cumulatively)
    const newChain = { 
        ...chain, 
        variables: { ...chain.variables },
        simulationLog: chain.simulationLog ? [...chain.simulationLog] : [] // Clone logs
    };

    if (!newChain.simulationRules) return newChain;

    // Process Rules
    newChain.simulationRules.forEach(rule => {
        // TYPE A: DELTA (Fixed modification)
        if (rule.type === 'DELTA') {
            const current = newChain.variables[rule.targetVar] || 0;
            newChain.variables[rule.targetVar] = current + rule.value;
            
            if (rule.logMessage) {
                 newChain.simulationLog!.push({
                     day: 0, // Day injected by caller usually, or we use a placeholder
                     content: rule.logMessage,
                     type: 'DAILY'
                 });
            }
        }
        
        // TYPE B: CHANCE (Probability Check)
        else if (rule.type === 'CHANCE') {
            let probability = 0;
            
            if (rule.chanceFixed !== undefined) {
                probability = rule.chanceFixed;
            } else if (rule.chanceVar && rule.chanceVar in newChain.variables) {
                probability = newChain.variables[rule.chanceVar];
            }

            const roll = Math.random() * 100;
            
            if (roll < probability) {
                rule.onSuccess.forEach(op => executeSimOp(newChain, op, sideEffects));
                if (rule.successLog) {
                    newChain.simulationLog!.push({ day: 0, content: rule.successLog, type: 'MILESTONE' });
                }
            } else if (rule.onFail) {
                rule.onFail.forEach(op => executeSimOp(newChain, op, sideEffects));
                 if (rule.failLog) {
                    newChain.simulationLog!.push({ day: 0, content: rule.failLog, type: 'CRISIS' });
                }
            }
        }

        // TYPE C: THRESHOLD (Conditional Trigger)
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
                if (rule.triggerLog) {
                    newChain.simulationLog!.push({ day: 0, content: rule.triggerLog, type: 'CRISIS' });
                }
            }
        }

        // TYPE D: COMPOUND (Variable Interaction)
        // e.g., IF Hope < 30 THEN JobChance += -5
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
                newChain.variables[rule.targetVar] = targetCurrent + rule.effect;
                
                if (rule.logMessage) {
                    newChain.simulationLog!.push({ day: 0, content: rule.logMessage, type: 'DAILY' });
                }
            }
        }
    });

    return newChain;
  });

  return { chains: newChains, sideEffects };
};

/**
 * Scans all active chains to see if any event triggers are met.
 * Returns the StoryEvent if found, or null.
 */
export const findEligibleEvent = (chains: EventChainState[], events: StoryEvent[]): StoryEvent | null => {
  // Shuffle chains slightly so we don't always pick the same order if multiple trigger
  const shuffledChains = [...chains].sort(() => Math.random() - 0.5);

  for (const chain of shuffledChains) {
    if (!chain.isActive) continue;

    // Find events belonging to this chain
    const chainEvents = events.filter(e => e.chainId === chain.id);
    
    // Check conditions
    for (const event of chainEvents) {
       const allMet = event.triggerConditions.every(cond => checkCondition(cond, chain));
       if (allMet) {
         return event;
       }
    }
  }
  return null;
};

/**
 * Converts a StoryEvent template into a full Customer object.
 * NOTE: If event has 'item', it merges it.
 * UPDATED: Now accepts inventory and currentFunds to calculate accurate redemption intent.
 * UPDATED: Resolves Dynamic Dialogue based on chain state.
 */
export const instantiateStoryCustomer = (
    event: StoryEvent, 
    inventory: Item[] = [], 
    currentFunds?: number,
    chainState?: EventChainState // Pass chain state for dialogue resolution
): Customer => {
    const template = event.template;
    
    // Ensure deep copy of nested objects (item, dialogue) to prevent mutation
    // Merge event-level item definition if present
    const baseItem = event.item || template.item || {};
    const deepItem = JSON.parse(JSON.stringify(baseItem));
    
    // RESOLVE DYNAMIC DIALOGUE
    const resolvedDialogue = resolveCustomerDialogue(template.dialogue, chainState);
    
    // Ensure initialValuationRange exists
    if (!deepItem.initialValuationRange && deepItem.valuationRange) {
        deepItem.initialValuationRange = { ...deepItem.valuationRange };
    }
    
    // Use dynamic funds from chain if available, otherwise fallback
    const currentWallet = currentFunds !== undefined 
        ? currentFunds 
        : ((template as any).currentWallet || template.maxRepayment || 1000);
    
    // --- DETERMINE INTENT (Redeem vs Extend) ---
    let intent: 'REDEEM' | 'EXTEND' | 'LEAVE' | undefined;
    let logicItem = deepItem;
    if (event.type === 'REDEMPTION_CHECK' && event.targetItemId) {
        const realItem = inventory.find(i => i.id === event.targetItemId);
        if (realItem) {
            logicItem = realItem;
        }
    }
    
    if (template.redemptionIntent) {
        intent = template.redemptionIntent;
    }
    else if ((template as any).interactionType === 'REDEEM' && logicItem.pawnInfo) {
        const p = logicItem.pawnInfo.principal;
        const rate = logicItem.pawnInfo.interestRate;
        const interest = Math.ceil(p * rate); 
        const total = p + interest;

        if (currentWallet >= total) {
            intent = 'REDEEM';
        } else if (currentWallet >= interest) {
            intent = 'EXTEND';
        } else {
            intent = 'LEAVE';
        }
    }

    // EXTRACT LOGS (If any) for Recap
    // We only show logs generated since last visit? Or last 5?
    // For now, let's take the last 5 logs from the chain state.
    const recapLog = chainState?.simulationLog ? chainState.simulationLog.slice(-5) : undefined;

    return {
        id: crypto.randomUUID(),
        name: template.name || "Unknown",
        description: template.description || "",
        avatarSeed: template.avatarSeed || "default",
        dialogue: resolvedDialogue, // Use resolved string-only dialogue
        redemptionResolve: template.redemptionResolve || "Medium",
        negotiationStyle: template.negotiationStyle || "Professional",
        patience: template.patience || 3,
        mood: template.mood || "Neutral",
        tags: template.tags || [],
        item: {
            ...deepItem,
            id: deepItem.id || crypto.randomUUID() // Use predefined ID if exists (critical for story items)
        },
        desiredAmount: template.desiredAmount || 0,
        minimumAmount: template.minimumAmount || 0,
        maxRepayment: template.maxRepayment || ((template.minimumAmount || 0) * 1.5),
        
        interactionType: (template as any).interactionType || 'PAWN',
        redemptionIntent: intent, // STORE THE INTENT

        currentWallet: currentWallet, 
        currentAskPrice: (template as any).currentAskPrice,
        
        chainId: event.chainId,
        eventId: event.id,
        recapLog // Attach logs
    };
};

/**
 * Logic to resolve redemption status before generating the customer.
 * Updated to accept dynamic targetId override.
 */
export const resolveRedemptionFlow = (event: StoryEvent, inventory: Item[], dynamicTargetId?: string): { flowKey: string, flow: DynamicFlowOutcome } | null => {
    if (event.type !== 'REDEMPTION_CHECK' || !event.dynamicFlows) {
        return null;
    }
    
    const targetId = event.targetItemId || dynamicTargetId;
    if (!targetId) return null;

    // 1. Check Target (Core) Item
    const coreItem = inventory.find(i => i.id === targetId);
    // Core is safe if it exists AND is not sold. (Active or Forfeit is fine, player still has it)
    const coreSafe = !!coreItem && coreItem.status !== ItemStatus.SOLD && coreItem.status !== ItemStatus.REDEEMED;

    // 2. Check Other Items in Chain
    const otherChainItems = inventory.filter(i => 
        i.relatedChainId === event.chainId && 
        i.id !== targetId &&
        i.status !== ItemStatus.REDEEMED
    );

    const othersSafe = otherChainItems.every(i => i.status !== ItemStatus.SOLD);

    // 3. Determine Flow Key
    let flowKey = "core_lost"; // Default worst case
    if (coreSafe) {
        if (othersSafe) {
            flowKey = "all_safe";
        } else {
            flowKey = "core_safe";
        }
    }

    const flow = event.dynamicFlows[flowKey];
    if (!flow) return null;

    return { flowKey, flow };
};