


import { EventChainState, StoryEvent, TriggerCondition, ChainVariables, Customer, Item, ItemStatus, DynamicFlowOutcome, SimOperation } from '../types';

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
 * Executes a single simulation operation on the chain state.
 * Returns the modified chain variables/state components.
 */
const executeSimOp = (chain: EventChainState, op: SimOperation): void => {
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
};

/**
 * Iterates through all chains and applies the generic Simulation Rules System.
 * Replaces hardcoded logic like 'dailyCost'.
 */
export const runDailySimulation = (chains: EventChainState[]): EventChainState[] => {
  return chains.map(chain => {
    if (!chain.isActive) return chain;

    // Create a shallow copy so we can modify it in place during the rule pass
    // (We deep copy variables so rules can interact cumulatively)
    const newChain = { 
        ...chain, 
        variables: { ...chain.variables } 
    };

    if (!newChain.simulationRules) return newChain;

    // Process Rules
    newChain.simulationRules.forEach(rule => {
        // TYPE A: DELTA (Fixed modification)
        if (rule.type === 'DELTA') {
            const current = newChain.variables[rule.targetVar] || 0;
            newChain.variables[rule.targetVar] = current + rule.value;
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
                rule.onSuccess.forEach(op => executeSimOp(newChain, op));
            } else if (rule.onFail) {
                rule.onFail.forEach(op => executeSimOp(newChain, op));
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
                rule.onTrigger.forEach(op => executeSimOp(newChain, op));
            }
        }
    });

    return newChain;
  });
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
 */
export const instantiateStoryCustomer = (event: StoryEvent, inventory: Item[] = [], currentFunds?: number): Customer => {
    const template = event.template;
    
    // Ensure deep copy of nested objects (item, dialogue) to prevent mutation
    // Merge event-level item definition if present
    const baseItem = event.item || template.item || {};
    const deepItem = JSON.parse(JSON.stringify(baseItem));
    
    const deepDialogue = JSON.parse(JSON.stringify(template.dialogue));
    
    // Ensure initialValuationRange exists
    if (!deepItem.initialValuationRange && deepItem.valuationRange) {
        deepItem.initialValuationRange = { ...deepItem.valuationRange };
    }
    
    // Use dynamic funds from chain if available, otherwise fallback
    const currentWallet = currentFunds !== undefined 
        ? currentFunds 
        : ((template as any).currentWallet || template.maxRepayment || 1000);
    
    // --- DETERMINE INTENT (Redeem vs Extend) ---
    // If this is a Redemption event, check the math to see what they can afford.
    let intent: 'REDEEM' | 'EXTEND' | 'LEAVE' | undefined;
    
    // Determine which Item to check against logic.
    // If it's a redemption check, we MUST check the REAL item in inventory (because it has the real Principal/Interest),
    // not the dummy template item.
    let logicItem = deepItem;
    if (event.type === 'REDEMPTION_CHECK' && event.targetItemId) {
        const realItem = inventory.find(i => i.id === event.targetItemId);
        if (realItem) {
            logicItem = realItem;
        }
    }
    
    // Priority Check: Does the template force a specific intent? (e.g. Narrative override)
    if (template.redemptionIntent) {
        intent = template.redemptionIntent;
    }
    else if ((template as any).interactionType === 'REDEEM' && logicItem.pawnInfo) {
        const p = logicItem.pawnInfo.principal;
        const rate = logicItem.pawnInfo.interestRate;
        // Logic: Full interest for termDays even if early; actual days if late. But for intent check, simple calc is usually fine.
        // Let's assume standard 1 week extension cost for the check.
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

    return {
        id: crypto.randomUUID(),
        name: template.name || "Unknown",
        description: template.description || "",
        avatarSeed: template.avatarSeed || "default",
        dialogue: deepDialogue,
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
        currentAskPrice: (template as any).currentAskPrice, // Propagate the ask price from template (e.g. 5000 for collector)
        
        chainId: event.chainId,
        eventId: event.id
    };
};

/**
 * Logic to resolve redemption status before generating the customer.
 */
export const resolveRedemptionFlow = (event: StoryEvent, inventory: Item[]): { flowKey: string, flow: DynamicFlowOutcome } | null => {
    if (event.type !== 'REDEMPTION_CHECK' || !event.targetItemId || !event.dynamicFlows) {
        return null;
    }

    // 1. Check Target (Core) Item
    const coreItem = inventory.find(i => i.id === event.targetItemId);
    // Core is safe if it exists AND is not sold. (Active or Forfeit is fine, player still has it)
    const coreSafe = !!coreItem && coreItem.status !== ItemStatus.SOLD && coreItem.status !== ItemStatus.REDEEMED;

    // 2. Check Other Items in Chain
    // Find all items in inventory belonging to this chain (excluding the target itself)
    // Note: Items must be tagged with relatedChainId for this to work robustly.
    const otherChainItems = inventory.filter(i => 
        i.relatedChainId === event.chainId && 
        i.id !== event.targetItemId &&
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