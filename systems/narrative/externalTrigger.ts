/**
 * External Chain Trigger System (S4-F1, S4-F2)
 *
 * Handles event chains triggered by external systems (mail delivery, news verification, etc.)
 * This ensures all game state changes (reputation, NPC fate) flow through the event chain
 * system's unified pipeline rather than being directly modified by individual systems.
 *
 * Design doc: 动态事件链系统 v1.5 - 2.K (External System Triggered Chains)
 */

import type { EventChainState, SimRule, ChainType } from './types';
import { runDailySimulation } from './engine';
import type { ConsequenceDispatchRequest, ConsequenceSeverity } from './channelProtocol';

// ========== S4-F1: External Chain Trigger Types ==========

/** External trigger source types */
export type ExternalTriggerType =
    | 'MAIL_DELIVERED'        // Mail system: a specific mail was delivered
    | 'NEWS_VERIFICATION'     // News system: intel verification failed -> penalty
    | 'ITEM_ACTION'           // Inventory system: player performed action on item
    | 'DEADLINE_REACHED';     // Calendar system: a deadline has been reached

/** External chain trigger interface */
export interface ExternalChainTrigger {
    type: ExternalTriggerType;
    payload: ExternalTriggerPayload;
}

/** Discriminated union for trigger payloads */
export type ExternalTriggerPayload =
    | MailDeliveredPayload
    | NewsVerificationPayload
    | ItemActionPayload
    | DeadlineReachedPayload;

export interface MailDeliveredPayload {
    type: 'MAIL_DELIVERED';
    mailTemplateId: string;       // The delivered mail's template ID
    sourceChainId?: string;       // Related chain (if any)
}

export interface NewsVerificationPayload {
    type: 'NEWS_VERIFICATION';
    newsId: string;               // The news item that triggered verification
    penaltyType: 'STOLEN_GOODS' | 'COUNTERFEIT' | 'REGULATION';
    severity: 'MINOR' | 'MAJOR';
    relatedItemId?: string;       // Associated item (if any)
}

export interface ItemActionPayload {
    type: 'ITEM_ACTION';
    actionId: string;             // e.g., "return_stolen_goods"
    itemId: string;
    chainId: string;              // The chain this action relates to
}

export interface DeadlineReachedPayload {
    type: 'DEADLINE_REACHED';
    deadlineId: string;           // e.g., "gang_threat_deadline"
    chainId: string;
}

// ========== S4-F2: TRANSIENT Chain Processing ==========

/** Penalty configuration for NEWS_VERIFICATION triggers */
interface PenaltyConfig {
    credibilityDelta: number;
    innocenceDelta: number;
    consequenceSeverity: ConsequenceSeverity;
}

/** Penalty lookup table based on type x severity */
const PENALTY_TABLE: Record<string, PenaltyConfig> = {
    'STOLEN_GOODS_MINOR':   { credibilityDelta: -3,  innocenceDelta: -2,  consequenceSeverity: 'MODERATE' },
    'STOLEN_GOODS_MAJOR':   { credibilityDelta: -5,  innocenceDelta: -5,  consequenceSeverity: 'SEVERE' },
    'COUNTERFEIT_MINOR':    { credibilityDelta: -3,  innocenceDelta: -1,  consequenceSeverity: 'MODERATE' },
    'COUNTERFEIT_MAJOR':    { credibilityDelta: -5,  innocenceDelta: -3,  consequenceSeverity: 'SEVERE' },
    'REGULATION_MINOR':     { credibilityDelta: -2,  innocenceDelta: 0,   consequenceSeverity: 'MINOR' },
    'REGULATION_MAJOR':     { credibilityDelta: -4,  innocenceDelta: -2,  consequenceSeverity: 'MODERATE' },
};

/**
 * Create a TRANSIENT event chain for a news verification penalty.
 * The chain has SimRules that execute immediately (one tick) and deactivate.
 */
function createTransientPenaltyChain(
    payload: NewsVerificationPayload
): EventChainState {
    const key = `${payload.penaltyType}_${payload.severity}`;
    const penalty = PENALTY_TABLE[key] || PENALTY_TABLE['REGULATION_MINOR'];

    const simRules: SimRule[] = [
        // Apply credibility penalty
        {
            type: 'DELTA',
            targetVar: 'credibility_delta',
            value: penalty.credibilityDelta,
            logMessage: `News verification penalty: credibility ${penalty.credibilityDelta}`
        },
        // Apply innocence penalty (if any)
        ...(penalty.innocenceDelta !== 0
            ? [{
                type: 'DELTA' as const,
                targetVar: 'innocence_delta',
                value: penalty.innocenceDelta,
                logMessage: `News verification penalty: innocence ${penalty.innocenceDelta}`
            }]
            : []),
        // Auto-deactivate after one tick
        {
            type: 'THRESHOLD' as const,
            targetVar: 'ticks',
            operator: '>=' as const,
            value: 1,
            onTrigger: [{ type: 'DEACTIVATE' as const }],
            triggerLog: 'TRANSIENT chain completed'
        }
    ];

    return {
        id: `transient_penalty_${payload.newsId}_${Date.now()}`,
        npcName: 'System',
        isActive: true,
        stage: 1,
        variables: {
            ticks: 0,
            credibility_delta: 0,
            innocence_delta: 0,
            penalty_type: 0,       // stored as metadata, 0 = placeholder
        },
        simulationRules: simRules,
        simulationLog: [],
        chainType: 'TRANSIENT' as ChainType,
    };
}

/**
 * Result of processing an external trigger.
 * Contains the side effects that the caller must dispatch.
 */
export interface ExternalTriggerResult {
    /** Updated active chains (with new TRANSIENT chain added if applicable) */
    updatedChains: EventChainState[];
    /** Reputation deltas to apply */
    reputationDeltas: { axis: 'credibility' | 'humanity' | 'innocence'; value: number }[];
    /** Consequence dispatch requests for the channel protocol */
    consequences: ConsequenceDispatchRequest[];
    /** Mail templates to schedule */
    scheduledMails: { templateId: string; delayDays: number; sourceChainId: string }[];
}

/**
 * Process an external trigger event.
 * This is the main entry point for external systems to trigger event chains.
 *
 * For MAIL_DELIVERED: Checks if any chain is waiting for this mail trigger.
 *   (Actual chain activation is handled by the chain's trigger conditions in story DSL.)
 *
 * For NEWS_VERIFICATION: Creates and immediately executes a TRANSIENT penalty chain.
 *   All reputation changes go through SimRules for traceability.
 *
 * For ITEM_ACTION / DEADLINE_REACHED: Marks the corresponding chain variable
 *   so the next daily tick can pick up the branch.
 */
export function processExternalTrigger(
    trigger: ExternalChainTrigger,
    activeChains: EventChainState[],
    currentDay: number
): ExternalTriggerResult {
    const result: ExternalTriggerResult = {
        updatedChains: [...activeChains],
        reputationDeltas: [],
        consequences: [],
        scheduledMails: [],
    };

    switch (trigger.payload.type) {
        case 'MAIL_DELIVERED': {
            const payload = trigger.payload as MailDeliveredPayload;
            // Set a variable on related chains to indicate mail was delivered
            // Chain's SimRules/trigger conditions can then check this variable
            result.updatedChains = activeChains.map(chain => {
                if (chain.id === payload.sourceChainId && chain.isActive) {
                    return {
                        ...chain,
                        variables: {
                            ...chain.variables,
                            [`mail_delivered_${payload.mailTemplateId}`]: 1,
                            last_mail_delivered: payload.mailTemplateId,
                            mail_delivered_day: currentDay,
                        }
                    };
                }
                return chain;
            });
            break;
        }

        case 'NEWS_VERIFICATION': {
            const payload = trigger.payload as NewsVerificationPayload;
            // Create and immediately execute a TRANSIENT penalty chain
            const penaltyChain = createTransientPenaltyChain(payload);

            // Run one simulation tick to execute the penalty rules
            const { chains: executedChains } = runDailySimulation([{
                ...penaltyChain,
                variables: { ...penaltyChain.variables, ticks: 1 }
            }]);

            const executed = executedChains[0];

            // Extract reputation deltas from the executed chain's variables
            const credDelta = executed.variables.credibility_delta || 0;
            const innoDelta = executed.variables.innocence_delta || 0;

            if (credDelta !== 0) {
                result.reputationDeltas.push({ axis: 'credibility', value: credDelta });
            }
            if (innoDelta !== 0) {
                result.reputationDeltas.push({ axis: 'innocence', value: innoDelta });
            }

            // Build consequence dispatch request
            const key = `${payload.penaltyType}_${payload.severity}`;
            const penaltyConfig = PENALTY_TABLE[key] || PENALTY_TABLE['REGULATION_MINOR'];

            result.consequences.push({
                sourceChainId: penaltyChain.id,
                eventId: `penalty_${payload.newsId}`,
                severity: penaltyConfig.consequenceSeverity,
                dayGenerated: currentDay,
                relatedItemId: payload.relatedItemId,
                newsHint: `Recent regulatory action affects local businesses`,
                itemLogEntry: payload.relatedItemId
                    ? `This item was flagged during a regulatory check`
                    : undefined,
            });

            // Add the deactivated TRANSIENT chain to the chain list for audit trail
            result.updatedChains = [...activeChains, { ...executed, isActive: false }];
            break;
        }

        case 'ITEM_ACTION': {
            const payload = trigger.payload as ItemActionPayload;
            // Set a variable on the target chain indicating the player's action
            result.updatedChains = activeChains.map(chain => {
                if (chain.id === payload.chainId && chain.isActive) {
                    return {
                        ...chain,
                        variables: {
                            ...chain.variables,
                            [`item_action_${payload.actionId}`]: 1,
                            last_item_action: payload.actionId,
                            item_action_day: currentDay,
                        }
                    };
                }
                return chain;
            });
            break;
        }

        case 'DEADLINE_REACHED': {
            const payload = trigger.payload as DeadlineReachedPayload;
            // Set a variable on the target chain indicating the deadline was reached
            result.updatedChains = activeChains.map(chain => {
                if (chain.id === payload.chainId && chain.isActive) {
                    return {
                        ...chain,
                        variables: {
                            ...chain.variables,
                            [`deadline_${payload.deadlineId}`]: 1,
                            deadline_reached_day: currentDay,
                        }
                    };
                }
                return chain;
            });
            break;
        }
    }

    return result;
}
