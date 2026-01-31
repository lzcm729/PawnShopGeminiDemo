/**
 * Chain Transformer
 * Transforms ChainBlock AST nodes into EventChainState objects
 */

import {
    ChainBlock,
    SimulationRuleNode,
    FateHintNode,
    ConditionNode,
    ActionNode,
    DeltaRuleNode,
    ThresholdRuleNode,
    CompoundRuleNode,
    ChanceRuleNode
} from '../types';
import {
    EventChainState,
    SimRule,
    RuleDelta,
    RuleThreshold,
    RuleCompound,
    RuleChance,
    SimOperation,
    TriggerCondition,
    FateHintDefinition,
    ChainVariables
} from '../../types';

/**
 * Transform a ChainBlock AST node into EventChainState
 */
export function transformChain(ast: ChainBlock): EventChainState {
    const state: EventChainState = {
        id: ast.id,
        npcName: ast.npcName,
        isActive: ast.active,
        stage: ast.stage,
        variables: transformVariables(ast),
        simulationRules: transformSimulationRules(ast.simulationRules || [])
    };

    // Add fate hints if present
    if (ast.fateHints && ast.fateHints.length > 0) {
        state.fateHints = ast.fateHints.map(transformFateHint);
    }

    return state;
}

/**
 * Transform variables block into ChainVariables
 */
function transformVariables(ast: ChainBlock): ChainVariables {
    const variables: ChainVariables = {};

    if (ast.variables) {
        for (const entry of ast.variables.entries) {
            variables[entry.name] = entry.value;
        }
    }

    return variables;
}

/**
 * Transform simulation rules
 */
function transformSimulationRules(rules: SimulationRuleNode[]): SimRule[] {
    return rules.map(transformSimulationRule);
}

function transformSimulationRule(rule: SimulationRuleNode): SimRule {
    switch (rule.type) {
        case 'DeltaRuleNode':
            return transformDeltaRule(rule);
        case 'ThresholdRuleNode':
            return transformThresholdRule(rule);
        case 'CompoundRuleNode':
            return transformCompoundRule(rule);
        case 'ChanceRuleNode':
            return transformChanceRule(rule);
        default:
            throw new Error(`Unknown simulation rule type: ${(rule as any).type}`);
    }
}

function transformDeltaRule(rule: DeltaRuleNode): RuleDelta {
    const result: RuleDelta = {
        type: 'DELTA',
        targetVar: rule.targetVar,
        value: rule.value
    };

    if (rule.condition) {
        result.condition = transformCondition(rule.condition);
    }

    if (rule.logMessage) {
        result.logMessage = rule.logMessage;
    }

    return result;
}

function transformThresholdRule(rule: ThresholdRuleNode): RuleThreshold {
    const result: RuleThreshold = {
        type: 'THRESHOLD',
        targetVar: rule.targetVar,
        operator: rule.operator,
        value: rule.value,
        onTrigger: rule.onTrigger.map(transformSimOperation)
    };

    if (rule.condition) {
        result.condition = transformCondition(rule.condition);
    }

    if (rule.triggerLog) {
        result.triggerLog = rule.triggerLog;
    }

    return result;
}

function transformCompoundRule(rule: CompoundRuleNode): RuleCompound {
    const result: RuleCompound = {
        type: 'COMPOUND',
        sourceVar: rule.sourceVar,
        operator: rule.operator,
        threshold: rule.threshold,
        targetVar: rule.targetVar,
        effect: rule.effect
    };

    if (rule.cap) {
        result.cap = {
            min: rule.cap.min,
            max: rule.cap.max
        };
    }

    if (rule.condition) {
        result.condition = transformCondition(rule.condition);
    }

    if (rule.logMessage) {
        result.logMessage = rule.logMessage;
    }

    return result;
}

function transformChanceRule(rule: ChanceRuleNode): RuleChance {
    const result: RuleChance = {
        type: 'CHANCE',
        onSuccess: rule.onSuccess.map(transformSimOperation)
    };

    if (rule.chanceVar) {
        result.chanceVar = rule.chanceVar;
    }

    if (rule.chanceFixed !== undefined) {
        result.chanceFixed = rule.chanceFixed;
    }

    if (rule.condition) {
        result.condition = transformCondition(rule.condition);
    }

    if (rule.onFail) {
        result.onFail = rule.onFail.map(transformSimOperation);
    }

    if (rule.successLog) {
        result.successLog = rule.successLog;
    }

    if (rule.failLog) {
        result.failLog = rule.failLog;
    }

    return result;
}

/**
 * Transform action nodes into SimOperation for simulation rules
 */
function transformSimOperation(action: ActionNode): SimOperation {
    switch (action.type) {
        case 'SetStageAction':
            return {
                type: 'SET_STAGE',
                value: action.value
            };

        case 'ModifyVarAction':
            return {
                type: 'MOD_VAR',
                target: action.variable,
                value: action.delta,
                op: action.delta >= 0 ? 'ADD' : 'SUB'
            };

        case 'SetVarAction':
            return {
                type: 'MOD_VAR',
                target: action.variable,
                value: action.value,
                op: 'SET'
            };

        case 'ScheduleMailAction':
            return {
                type: 'SCHEDULE_MAIL',
                templateId: action.templateId,
                delayDays: action.delayDays
            };

        case 'DeactivateAction':
        case 'DeactivateChainAction':
            return {
                type: 'DEACTIVATE'
            };

        default:
            throw new Error(`Cannot convert action type ${action.type} to SimOperation`);
    }
}

/**
 * Transform condition node
 */
export function transformCondition(cond: ConditionNode): TriggerCondition {
    return {
        variable: cond.variable,
        operator: cond.operator,
        value: cond.value
    };
}

/**
 * Transform fate hint
 */
function transformFateHint(hint: FateHintNode): FateHintDefinition {
    return {
        condition: transformCondition(hint.condition),
        priority: hint.priority,
        hints: hint.hints
    };
}
