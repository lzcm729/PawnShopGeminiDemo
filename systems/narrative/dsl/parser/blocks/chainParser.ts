/**
 * Chain Block Parser
 * Handles parsing of @chain blocks and nested simulation rules
 */

import { BaseParser } from '../baseParser';
import { DSLParseError, DSLMissingFieldError } from '../errors';
import * as AST from '../ast';
import {
    ChainBlock,
    VariablesBlock,
    SimulationRuleNode,
    FateHintNode,
    ConditionNode,
    ActionNode
} from '../../types';

export class ChainBlockParser extends BaseParser {
    /**
     * Parse a @chain block
     */
    parseChainBlock(): ChainBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@chain');

        const id = this.consumeIdentifier('chain id');
        this.skipNewlines();

        let npcName = '';
        let active = true;
        let stage = 0;
        let variables: VariablesBlock | undefined;
        let simulationRules: SimulationRuleNode[] | undefined;
        let fateHints: FateHintNode[] | undefined;

        // Parse chain properties and nested blocks
        while (!this.isAtEnd() && !this.check('SEPARATOR')) {
            this.skipNewlines();
            if (this.check('SEPARATOR') || this.isAtEnd()) break;

            if (this.check('AT_BLOCK')) {
                const blockType = this.peek().value;
                if (blockType === '@variables') {
                    variables = this.parseVariablesBlock();
                } else if (blockType === '@simulation_rules') {
                    simulationRules = this.parseSimulationRulesBlock();
                } else if (blockType === '@fate_hints') {
                    fateHints = this.parseFateHintsBlock();
                } else if (['@chain', '@mail', '@event', '@story'].includes(blockType)) {
                    break; // New top-level block
                } else {
                    throw new DSLParseError(`Unexpected block in @chain: ${blockType}`, this.currentLocation(), this.source);
                }
            } else if (this.check('IDENTIFIER')) {
                const propName = this.advance().value;
                this.consume('COLON', ':');

                switch (propName) {
                    case 'npc_name':
                        npcName = this.parseStringValue();
                        break;
                    case 'active':
                        active = this.parseBooleanValue();
                        break;
                    case 'stage':
                        stage = this.parseNumberValue();
                        break;
                    default:
                        // Skip unknown property
                        this.skipToNextLine();
                }
                this.skipNewlines();
            } else if (this.check('INDENT')) {
                // Handle unexpected INDENT token - just skip it
                this.advance();
            } else {
                break;
            }
        }

        if (!npcName) {
            throw new DSLMissingFieldError('npc_name', '@chain', location, this.source);
        }

        return AST.createChainBlock(id, npcName, active, stage, location, {
            variables,
            simulationRules,
            fateHints
        });
    }

    // === VARIABLES BLOCK ===

    private parseVariablesBlock(): VariablesBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@variables');
        this.skipNewlines();

        const entries: AST.VariableEntry[] = [];

        // Expect INDENT
        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK') && !this.check('SEPARATOR')) {
                this.skipNewlines();
                if (this.check('DEDENT') || this.check('AT_BLOCK') || this.check('SEPARATOR')) break;

                if (this.check('IDENTIFIER')) {
                    const entryLoc = this.currentLocation();
                    const name = this.advance().value;

                    this.consume('EQUALS', '=');
                    const value = this.parseNumberValue();

                    entries.push(AST.createVariableEntry(name, value, entryLoc));
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createVariablesBlock(entries, location);
    }

    // === SIMULATION RULES ===

    private parseSimulationRulesBlock(): SimulationRuleNode[] {
        this.consume('AT_BLOCK', '@simulation_rules');
        this.skipNewlines();

        const rules: SimulationRuleNode[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('SEPARATOR')) {
                this.skipNewlines();
                if (this.check('DEDENT') || this.check('SEPARATOR')) break;

                if (this.check('AT_BLOCK')) {
                    const ruleType = this.peek().value;

                    switch (ruleType) {
                        case '@delta':
                            rules.push(this.parseDeltaRule());
                            break;
                        case '@threshold':
                            rules.push(this.parseThresholdRule());
                            break;
                        case '@compound':
                            rules.push(this.parseCompoundRule());
                            break;
                        case '@chance':
                            rules.push(this.parseChanceRule());
                            break;
                        default:
                            throw new DSLParseError(`Unknown rule type: ${ruleType}`, this.currentLocation(), this.source);
                    }
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return rules;
    }

    private parseDeltaRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@delta');

        const targetVar = this.consumeIdentifier('target variable');
        const value = this.parseNumberValue();
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let logMessage: string | undefined;

        // Parse optional properties
        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                // Accept both IDENTIFIER and KEYWORD for property names (e.g., 'when' is a keyword)
                if (this.check('IDENTIFIER') || this.check('KEYWORD')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    if (propName === 'when') {
                        condition = this.parseCondition();
                    } else if (propName === 'log') {
                        logMessage = this.parseStringValue();
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createDeltaRule(targetVar, value, location, { condition, logMessage });
    }

    private parseThresholdRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@threshold');

        const targetVar = this.consumeIdentifier('target variable');
        const operator = this.parseRuleOperator();
        const value = this.parseNumberValue();
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let triggerLog: string | undefined;
        let onTrigger: ActionNode[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                // Accept both IDENTIFIER and KEYWORD for property names (e.g., 'when' is a keyword)
                if (this.check('IDENTIFIER') || this.check('KEYWORD')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    if (propName === 'when') {
                        condition = this.parseCondition();
                    } else if (propName === 'log') {
                        triggerLog = this.parseStringValue();
                    } else if (propName === 'trigger') {
                        onTrigger = this.parseActionList();
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createThresholdRule(targetVar, operator, value, onTrigger, location, { condition, triggerLog });
    }

    private parseCompoundRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@compound');

        const sourceVar = this.consumeIdentifier('source variable');
        const operator = this.parseRuleOperator();
        const threshold = this.parseNumberValue();
        this.consume('ARROW', '->');
        const targetVar = this.consumeIdentifier('target variable');
        const effect = this.parseNumberValue();
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let logMessage: string | undefined;
        let cap: { min?: number; max?: number } | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                // Accept both IDENTIFIER and KEYWORD for property names (e.g., 'when' is a keyword)
                if (this.check('IDENTIFIER') || this.check('KEYWORD')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    if (propName === 'when') {
                        condition = this.parseCondition();
                    } else if (propName === 'log') {
                        logMessage = this.parseStringValue();
                    } else if (propName === 'cap') {
                        cap = this.parseCapRange();
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createCompoundRule(sourceVar, operator, threshold, targetVar, effect, location, {
            condition,
            logMessage,
            cap
        });
    }

    private parseChanceRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@chance');

        let chanceVar: string | undefined;
        let chanceFixed: number | undefined;

        // Parse chance variable or fixed value
        if (this.check('IDENTIFIER')) {
            chanceVar = this.advance().value;
        } else if (this.check('NUMBER')) {
            chanceFixed = this.parseNumberValue();
        }
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let successLog: string | undefined;
        let failLog: string | undefined;
        let onSuccess: ActionNode[] = [];
        let onFail: ActionNode[] | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                // Accept both IDENTIFIER and KEYWORD for property names (e.g., 'when' is a keyword)
                if (this.check('IDENTIFIER') || this.check('KEYWORD')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'when':
                            condition = this.parseCondition();
                            break;
                        case 'success_log':
                            successLog = this.parseStringValue();
                            break;
                        case 'fail_log':
                            failLog = this.parseStringValue();
                            break;
                        case 'on_success':
                            onSuccess = this.parseActionList();
                            break;
                        case 'on_fail':
                            onFail = this.parseActionList();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createChanceRule(onSuccess, location, {
            chanceVar,
            chanceFixed,
            condition,
            onFail,
            successLog,
            failLog
        });
    }

    // === FATE HINTS ===

    private parseFateHintsBlock(): FateHintNode[] {
        this.consume('AT_BLOCK', '@fate_hints');
        this.skipNewlines();

        const hints: FateHintNode[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('AT_BLOCK') && this.peek().value === '@hint') {
                    hints.push(this.parseFateHint());
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return hints;
    }

    private parseFateHint(): FateHintNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@hint');
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let priority = 5;
        const hintTexts: string[] = [];

        // Check for inline [priority:N] attribute
        if (this.check('BRACKET_OPEN')) {
            this.advance();
            if (this.check('IDENTIFIER') && this.peek().value === 'priority') {
                this.advance();
                this.consume('COLON', ':');
                priority = this.parseNumberValue();
            }
            this.consume('BRACKET_CLOSE', ']');
            this.skipNewlines();
        }

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                // Accept both IDENTIFIER and KEYWORD for property names (e.g., 'when' is a keyword)
                if (this.check('IDENTIFIER') || this.check('KEYWORD')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'when':
                            condition = this.parseCondition();
                            break;
                        case 'priority':
                            priority = this.parseNumberValue();
                            break;
                        case 'text':
                            hintTexts.push(this.parseStringValue());
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        if (!condition) {
            throw new DSLMissingFieldError('when', '@hint', location, this.source);
        }

        return AST.createFateHint(condition, priority, hintTexts, location);
    }
}
