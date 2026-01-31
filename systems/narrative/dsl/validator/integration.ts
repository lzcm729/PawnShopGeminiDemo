/**
 * Integration Validator
 * Validates transformed DSL output against existing game data
 */

import { TransformedStory } from '../transformer/toTypeScript';
import { EventChainState, StoryEvent, MailTemplate } from '../../types';
import { ValidationResult, ValidationIssue, createValidationResult } from '../parser/errors';
import { validateEvents, ValidationErrorType } from '../../validator';
import { MAIL_TEMPLATES } from '../../mailRegistry';

/**
 * Validate transformed story data against existing game registries
 */
export function validateTransformed(
    transformed: TransformedStory,
    existingChains: Map<string, EventChainState>,
    existingMails: Map<string, MailTemplate>
): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check for ID conflicts with existing data
    for (const chain of transformed.chains) {
        if (existingChains.has(chain.id)) {
            issues.push({
                severity: 'warning',
                message: `Chain '${chain.id}' will override existing chain`,
                code: 'CHAIN_OVERRIDE'
            });
        }
    }

    for (const [mailId] of Object.entries(transformed.mails)) {
        if (existingMails.has(mailId)) {
            issues.push({
                severity: 'warning',
                message: `Mail '${mailId}' will override existing mail template`,
                code: 'MAIL_OVERRIDE'
            });
        }
    }

    // Run the existing validator on the events
    const existingValidation = validateEvents(transformed.events);

    // Convert existing validation issues
    for (const issue of existingValidation.issues) {
        issues.push({
            severity: issue.type === ValidationErrorType.CONTRACT_GAP ? 'warning' : 'error',
            message: issue.message,
            code: issue.type
        });
    }

    // Check mail references against combined registries
    const allMails = new Set([
        ...Object.keys(transformed.mails),
        ...Object.keys(MAIL_TEMPLATES)
    ]);

    for (const event of transformed.events) {
        checkMailReferences(event, allMails, issues);
    }

    // Check for stage continuity
    validateStageContinuity(transformed, issues);

    return createValidationResult(issues);
}

/**
 * Check that all mail references in an event are valid
 */
function checkMailReferences(
    event: StoryEvent,
    validMails: Set<string>,
    issues: ValidationIssue[]
): void {
    const checkEffects = (effects: any[] | undefined, context: string) => {
        if (!effects) return;

        for (const effect of effects) {
            if (effect.type === 'SCHEDULE_MAIL' || effect.type === 'CONDITIONAL_MAIL') {
                if (effect.templateId && !validMails.has(effect.templateId)) {
                    issues.push({
                        severity: 'error',
                        message: `Event '${event.id}' ${context} references unknown mail '${effect.templateId}'`,
                        code: 'UNKNOWN_MAIL'
                    });
                }
            }
        }
    };

    // Check outcomes
    if (event.outcomes) {
        for (const [key, effects] of Object.entries(event.outcomes)) {
            checkEffects(effects, `outcome '${key}'`);
        }
    }

    // Check other effect lists
    checkEffects(event.onReject, 'onReject');
    checkEffects(event.onExtend, 'onExtend');
    checkEffects(event.onFailure, 'onFailure');
    checkEffects(event.onComplete, 'onComplete');

    // Check dynamic flows
    if (event.dynamicFlows) {
        for (const [key, flow] of Object.entries(event.dynamicFlows)) {
            checkEffects(flow.outcome, `dynamicFlow '${key}'`);
        }
    }

    // Check expiry flows
    if (event.expiryFlows) {
        if (event.expiryFlows.redemption) {
            checkEffects(event.expiryFlows.redemption.accept, 'expiryFlows.redemption.accept');
            checkEffects(event.expiryFlows.redemption.refuse, 'expiryFlows.redemption.refuse');
        }
        if (event.expiryFlows.renewal) {
            checkEffects(event.expiryFlows.renewal.accept, 'expiryFlows.renewal.accept');
            checkEffects(event.expiryFlows.renewal.refuse, 'expiryFlows.renewal.refuse');
        }
        if (event.expiryFlows.noShow) {
            checkEffects(event.expiryFlows.noShow.sell, 'expiryFlows.noShow.sell');
            checkEffects(event.expiryFlows.noShow.keep, 'expiryFlows.noShow.keep');
        }
    }
}

/**
 * Validate that stage transitions are continuous
 */
function validateStageContinuity(
    transformed: TransformedStory,
    issues: ValidationIssue[]
): void {
    // Group events by chain
    const eventsByChain = new Map<string, StoryEvent[]>();

    for (const event of transformed.events) {
        if (!eventsByChain.has(event.chainId)) {
            eventsByChain.set(event.chainId, []);
        }
        eventsByChain.get(event.chainId)!.push(event);
    }

    // Check each chain
    for (const [chainId, events] of eventsByChain) {
        // Collect all stage listeners (what stages trigger events)
        const stageListeners = new Set<number>();

        for (const event of events) {
            for (const condition of event.triggerConditions) {
                if (condition.variable === 'stage' && condition.operator === '==') {
                    stageListeners.add(condition.value);
                }
            }
        }

        // Collect all stage setters (what stages are set by effects)
        const collectSetStages = (effects: any[] | undefined): number[] => {
            if (!effects) return [];
            return effects
                .filter(e => e.type === 'SET_STAGE' && e.value !== undefined)
                .map(e => e.value);
        };

        const allSetStages = new Set<number>();

        for (const event of events) {
            if (event.outcomes) {
                for (const effects of Object.values(event.outcomes)) {
                    for (const stage of collectSetStages(effects)) {
                        allSetStages.add(stage);
                    }
                }
            }
            for (const stage of collectSetStages(event.onReject)) {
                allSetStages.add(stage);
            }
            for (const stage of collectSetStages(event.onExtend)) {
                allSetStages.add(stage);
            }
        }

        // Check for dead ends (stages set but not listened to)
        for (const stage of allSetStages) {
            // Skip terminal stages (commonly 99 or high numbers)
            if (stage >= 90) continue;

            if (!stageListeners.has(stage)) {
                issues.push({
                    severity: 'warning',
                    message: `Chain '${chainId}': Stage ${stage} is set but no event triggers on it (possible dead end)`,
                    code: 'DEAD_END_STAGE'
                });
            }
        }
    }
}

/**
 * Quick validation for runtime loading
 */
export function quickValidate(transformed: TransformedStory): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that we have at least one chain
    if (transformed.chains.length === 0) {
        errors.push('No chains defined');
    }

    // Check that all events have a valid chain reference
    const chainIds = new Set(transformed.chains.map(c => c.id));
    for (const event of transformed.events) {
        if (!chainIds.has(event.chainId)) {
            errors.push(`Event '${event.id}' references unknown chain '${event.chainId}'`);
        }
    }

    // Check required event fields
    for (const event of transformed.events) {
        if (!event.template) {
            errors.push(`Event '${event.id}' missing customer template`);
        }
        if (event.triggerConditions.length === 0) {
            errors.push(`Event '${event.id}' has no trigger conditions`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
