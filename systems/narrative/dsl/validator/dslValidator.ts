/**
 * DSL Validator
 * Validates DSL AST for structural correctness
 */

import {
    StoryFile,
    ChainBlock,
    MailBlock,
    EventBlock,
    ItemBlock,
    CustomerBlock,
    OutcomesBlock,
    ConditionNode,
    ActionNode,
    SimulationRuleNode
} from '../types';
import { ValidationResult, ValidationIssue, createValidationResult } from '../parser/errors';

/**
 * Validate a StoryFile AST
 */
export function validateDSL(ast: StoryFile): ValidationResult {
    const issues: ValidationIssue[] = [];
    const context = new ValidationContext();

    // Collect all IDs first
    for (const chain of ast.chains) {
        context.chainIds.add(chain.id);
    }
    for (const mail of ast.mails) {
        context.mailIds.add(mail.id);
    }
    for (const event of ast.events) {
        context.eventIds.add(event.id);
        if (event.item) {
            context.itemIds.add(event.item.id);
        }
    }

    // Validate story block
    validateStoryBlock(ast, issues);

    // Validate chains
    for (const chain of ast.chains) {
        validateChain(chain, context, issues);
    }

    // Validate mails
    for (const mail of ast.mails) {
        validateMail(mail, context, issues);
    }

    // Validate events
    for (const event of ast.events) {
        validateEvent(event, context, issues);
    }

    // Check for orphaned references
    validateReferences(context, issues);

    return createValidationResult(issues);
}

class ValidationContext {
    chainIds = new Set<string>();
    mailIds = new Set<string>();
    eventIds = new Set<string>();
    itemIds = new Set<string>();
    usedMailIds = new Set<string>();
    usedChainIds = new Set<string>();
    usedItemIds = new Set<string>();
    variablesByChain = new Map<string, Set<string>>();
}

function validateStoryBlock(ast: StoryFile, issues: ValidationIssue[]): void {
    if (!ast.story.id) {
        issues.push({
            severity: 'error',
            message: 'Story must have an id',
            location: ast.story.location
        });
    }

    if (!ast.story.name) {
        issues.push({
            severity: 'warning',
            message: 'Story should have a name',
            location: ast.story.location
        });
    }
}

function validateChain(chain: ChainBlock, context: ValidationContext, issues: ValidationIssue[]): void {
    // Check required fields
    if (!chain.npcName) {
        issues.push({
            severity: 'error',
            message: `Chain '${chain.id}' missing npc_name`,
            location: chain.location
        });
    }

    // Collect variables
    const vars = new Set<string>();
    if (chain.variables) {
        for (const entry of chain.variables.entries) {
            if (vars.has(entry.name)) {
                issues.push({
                    severity: 'error',
                    message: `Duplicate variable '${entry.name}' in chain '${chain.id}'`,
                    location: entry.location
                });
            }
            vars.add(entry.name);
        }
    }
    context.variablesByChain.set(chain.id, vars);

    // Validate simulation rules
    if (chain.simulationRules) {
        for (const rule of chain.simulationRules) {
            validateSimulationRule(rule, chain.id, context, issues);
        }
    }
}

function validateSimulationRule(
    rule: SimulationRuleNode,
    chainId: string,
    context: ValidationContext,
    issues: ValidationIssue[]
): void {
    const vars = context.variablesByChain.get(chainId) || new Set();

    switch (rule.type) {
        case 'DeltaRuleNode':
            if (!vars.has(rule.targetVar) && !isBuiltInVariable(rule.targetVar)) {
                issues.push({
                    severity: 'warning',
                    message: `Variable '${rule.targetVar}' used in @delta but not defined in chain '${chainId}'`,
                    location: rule.location
                });
            }
            if (rule.condition) {
                validateCondition(rule.condition, chainId, context, issues);
            }
            break;

        case 'ThresholdRuleNode':
            if (!vars.has(rule.targetVar) && !isBuiltInVariable(rule.targetVar)) {
                issues.push({
                    severity: 'warning',
                    message: `Variable '${rule.targetVar}' used in @threshold but not defined in chain '${chainId}'`,
                    location: rule.location
                });
            }
            for (const action of rule.onTrigger) {
                validateActionInRule(action, context, issues);
            }
            break;

        case 'CompoundRuleNode':
            if (!vars.has(rule.sourceVar) && !isBuiltInVariable(rule.sourceVar)) {
                issues.push({
                    severity: 'warning',
                    message: `Variable '${rule.sourceVar}' used in @compound but not defined`,
                    location: rule.location
                });
            }
            break;

        case 'ChanceRuleNode':
            if (rule.chanceVar && !vars.has(rule.chanceVar) && !isBuiltInVariable(rule.chanceVar)) {
                issues.push({
                    severity: 'warning',
                    message: `Variable '${rule.chanceVar}' used in @chance but not defined`,
                    location: rule.location
                });
            }
            break;
    }
}

function validateCondition(
    condition: ConditionNode,
    chainId: string,
    context: ValidationContext,
    issues: ValidationIssue[]
): void {
    const vars = context.variablesByChain.get(chainId) || new Set();

    if (!vars.has(condition.variable) && !isBuiltInVariable(condition.variable)) {
        issues.push({
            severity: 'warning',
            message: `Condition references undefined variable '${condition.variable}'`,
            location: condition.location
        });
    }

    const validOperators = ['>', '<', '>=', '<=', '==', '%'];
    if (!validOperators.includes(condition.operator)) {
        issues.push({
            severity: 'error',
            message: `Invalid operator '${condition.operator}' in condition`,
            location: condition.location
        });
    }
}

function validateActionInRule(action: ActionNode, context: ValidationContext, issues: ValidationIssue[]): void {
    if (action.type === 'ScheduleMailAction') {
        context.usedMailIds.add(action.templateId);
    }
}

function validateMail(mail: MailBlock, context: ValidationContext, issues: ValidationIssue[]): void {
    if (!mail.sender) {
        issues.push({
            severity: 'error',
            message: `Mail '${mail.id}' missing sender`,
            location: mail.location
        });
    }

    if (!mail.subject) {
        issues.push({
            severity: 'error',
            message: `Mail '${mail.id}' missing subject`,
            location: mail.location
        });
    }

    if (!mail.body) {
        issues.push({
            severity: 'error',
            message: `Mail '${mail.id}' missing body`,
            location: mail.location
        });
    }

    // Check for variable interpolation syntax
    const varPattern = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = varPattern.exec(mail.body)) !== null) {
        const varName = match[1];
        // These are template variables, not chain variables
        // Just note them for documentation
    }
}

function validateEvent(event: EventBlock, context: ValidationContext, issues: ValidationIssue[]): void {
    // Check chain reference
    if (!event.chainId) {
        issues.push({
            severity: 'error',
            message: `Event '${event.id}' missing chain reference`,
            location: event.location
        });
    } else if (!context.chainIds.has(event.chainId)) {
        issues.push({
            severity: 'error',
            message: `Event '${event.id}' references unknown chain '${event.chainId}'`,
            location: event.location
        });
    } else {
        context.usedChainIds.add(event.chainId);
    }

    // Check trigger conditions
    if (event.triggerConditions.length === 0) {
        issues.push({
            severity: 'warning',
            message: `Event '${event.id}' has no trigger conditions`,
            location: event.location
        });
    }

    for (const condition of event.triggerConditions) {
        if (event.chainId) {
            validateCondition(condition, event.chainId, context, issues);
        }
    }

    // Validate item
    if (event.item) {
        validateItem(event.item, issues);
    }

    // Validate customer
    if (event.customer) {
        validateCustomer(event.customer, issues);
    }

    // Validate outcomes
    if (event.outcomes) {
        validateOutcomes(event.outcomes, event.id, context, issues);
    }

    // Validate action lists
    if (event.onReject) {
        for (const action of event.onReject) {
            validateAction(action, context, issues);
        }
    }

    // Check core item reference
    if (event.coreItemId && !context.itemIds.has(event.coreItemId)) {
        issues.push({
            severity: 'warning',
            message: `Event '${event.id}' references unknown core item '${event.coreItemId}'`,
            location: event.location
        });
    }

    // Check target item reference
    if (event.targetItemId && !context.itemIds.has(event.targetItemId)) {
        issues.push({
            severity: 'warning',
            message: `Event '${event.id}' references unknown target item '${event.targetItemId}'`,
            location: event.location
        });
    }
}

function validateItem(item: ItemBlock, issues: ValidationIssue[]): void {
    if (!item.name) {
        issues.push({
            severity: 'error',
            message: `Item '${item.id}' missing name`,
            location: item.location
        });
    }

    if (item.realValue <= 0 && !item.isVirtual) {
        issues.push({
            severity: 'warning',
            message: `Item '${item.id}' has non-positive real_value: ${item.realValue}`,
            location: item.location
        });
    }
}

function validateCustomer(customer: CustomerBlock, issues: ValidationIssue[]): void {
    if (!customer.name) {
        issues.push({
            severity: 'error',
            message: 'Customer missing name',
            location: customer.location
        });
    }

    if (!customer.description) {
        issues.push({
            severity: 'warning',
            message: 'Customer missing description',
            location: customer.location
        });
    }

    if (!customer.dialogue) {
        issues.push({
            severity: 'error',
            message: 'Customer missing dialogue block',
            location: customer.location
        });
    }

    // Validate amounts
    if (customer.minimumAmount !== undefined && customer.desiredAmount !== undefined) {
        if (customer.minimumAmount > customer.desiredAmount) {
            issues.push({
                severity: 'error',
                message: 'Customer minimum_amount cannot be greater than desired_amount',
                location: customer.location
            });
        }
    }
}

function validateOutcomes(
    outcomes: OutcomesBlock,
    eventId: string,
    context: ValidationContext,
    issues: ValidationIssue[]
): void {
    const requiredOutcomes = ['dealCharity', 'dealAid', 'dealStandard', 'dealShark'] as const;
    const presentOutcomes = new Set<string>();

    if (outcomes.dealCharity) presentOutcomes.add('dealCharity');
    if (outcomes.dealAid) presentOutcomes.add('dealAid');
    if (outcomes.dealStandard) presentOutcomes.add('dealStandard');
    if (outcomes.dealShark) presentOutcomes.add('dealShark');

    // Check if any outcomes are present
    if (presentOutcomes.size === 0) {
        issues.push({
            severity: 'warning',
            message: `Event '${eventId}' has empty outcomes block`,
            location: outcomes.location
        });
        return;
    }

    // Check for missing required outcomes
    for (const required of requiredOutcomes) {
        if (!presentOutcomes.has(required)) {
            issues.push({
                severity: 'warning',
                message: `Event '${eventId}' missing outcome '${required}'`,
                location: outcomes.location
            });
        }
    }

    // Validate actions in each outcome
    const allOutcomes = [
        outcomes.dealCharity,
        outcomes.dealAid,
        outcomes.dealStandard,
        outcomes.dealShark
    ].filter(Boolean) as ActionNode[][];

    for (const outcomeActions of allOutcomes) {
        for (const action of outcomeActions) {
            validateAction(action, context, issues);
        }
    }
}

function validateAction(action: ActionNode, context: ValidationContext, issues: ValidationIssue[]): void {
    switch (action.type) {
        case 'ScheduleMailAction':
        case 'ConditionalMailAction':
            context.usedMailIds.add(action.templateId);
            if (!context.mailIds.has(action.templateId)) {
                issues.push({
                    severity: 'warning',
                    message: `Action references unknown mail template '${action.templateId}'`,
                    location: action.location,
                    code: 'UNKNOWN_MAIL_REF'
                });
            }
            break;

        case 'SetStageAction':
            if (action.value < 0) {
                issues.push({
                    severity: 'warning',
                    message: `set_stage with negative value: ${action.value}`,
                    location: action.location
                });
            }
            break;

        case 'ForceSellTargetAction':
            if (action.targetId) {
                context.usedItemIds.add(action.targetId);
            }
            break;
    }
}

function validateReferences(context: ValidationContext, issues: ValidationIssue[]): void {
    // Check for unused chains
    for (const chainId of context.chainIds) {
        if (!context.usedChainIds.has(chainId)) {
            issues.push({
                severity: 'warning',
                message: `Chain '${chainId}' is defined but never referenced by events`,
                code: 'UNUSED_CHAIN'
            });
        }
    }

    // Check for unused mails
    for (const mailId of context.mailIds) {
        if (!context.usedMailIds.has(mailId)) {
            issues.push({
                severity: 'warning',
                message: `Mail '${mailId}' is defined but never scheduled`,
                code: 'UNUSED_MAIL'
            });
        }
    }
}

function isBuiltInVariable(name: string): boolean {
    const builtIns = ['stage', 'day', 'funds', 'hope', 'trust', 'stress'];
    return builtIns.includes(name);
}
