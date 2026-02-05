/**
 * Base Parser Class
 * Common parsing utilities and token operations used by all block parsers
 */

import { Token, TokenType, tokenize } from './lexer';
import { DSLParseError, DSLUnexpectedTokenError } from './errors';
import * as AST from './ast';
import { SourceLocation, ConditionNode, ActionNode } from '../types';

/**
 * Base parser class providing common token operations and utility methods
 * Extended by specialized block parsers
 */
export class BaseParser {
    protected tokens: Token[] = [];
    protected current: number = 0;
    protected source: string;
    protected filename?: string;

    constructor(source: string, filename?: string) {
        this.source = source;
        this.filename = filename;
    }

    /**
     * Initialize tokens from source
     */
    protected initTokens(): void {
        this.tokens = tokenize(this.source);
    }

    // === TOKEN HELPERS ===

    protected check(type: TokenType, values?: string[]): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        if (token.type !== type) return false;
        if (values && !values.includes(token.value)) return false;
        return true;
    }

    protected peek(): Token {
        return this.tokens[this.current];
    }

    protected peekNext(): Token | undefined {
        return this.tokens[this.current + 1];
    }

    protected advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.tokens[this.current - 1];
    }

    protected isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    protected consume(type: TokenType, expected: string): Token {
        if (this.check(type)) {
            return this.advance();
        }
        throw new DSLUnexpectedTokenError(expected, this.peek().value || this.peek().type, this.currentLocation(), this.source);
    }

    protected consumeIdentifier(context: string): string {
        if (this.check('IDENTIFIER')) {
            return this.advance().value;
        }
        throw new DSLUnexpectedTokenError(context, this.peek().type, this.currentLocation(), this.source);
    }

    protected currentLocation(): SourceLocation {
        return this.peek().location;
    }

    protected skipNewlines(): void {
        while (this.check('NEWLINE')) {
            this.advance();
        }
    }

    protected skipToNextLine(): void {
        while (!this.isAtEnd() && !this.check('NEWLINE')) {
            this.advance();
        }
    }

    // === VALUE PARSING ===

    protected parseStringValue(): string {
        if (this.check('STRING')) {
            return this.advance().value;
        }
        // Also accept identifiers as bare strings
        if (this.check('IDENTIFIER')) {
            return this.advance().value;
        }
        throw new DSLUnexpectedTokenError('string', this.peek().type, this.currentLocation(), this.source);
    }

    protected parseNumberValue(): number {
        if (this.check('NUMBER')) {
            return parseFloat(this.advance().value);
        }
        // Handle negative numbers
        if (this.check('OPERATOR') && this.peek().value === '-') {
            this.advance();
            if (this.check('NUMBER')) {
                return -parseFloat(this.advance().value);
            }
        }
        // Handle positive numbers with + prefix
        if (this.check('OPERATOR') && this.peek().value === '+') {
            this.advance();
            if (this.check('NUMBER')) {
                return parseFloat(this.advance().value);
            }
        }
        throw new DSLUnexpectedTokenError('number', this.peek().type, this.currentLocation(), this.source);
    }

    protected parseBooleanValue(): boolean {
        if (this.check('KEYWORD')) {
            const val = this.advance().value;
            return val === 'true';
        }
        if (this.check('IDENTIFIER')) {
            const val = this.advance().value.toLowerCase();
            return val === 'true' || val === 'yes';
        }
        throw new DSLUnexpectedTokenError('boolean', this.peek().type, this.currentLocation(), this.source);
    }

    protected parseTagsList(): string[] {
        const tags: string[] = [];

        if (this.check('BRACKET_OPEN')) {
            this.advance();

            while (!this.check('BRACKET_CLOSE') && !this.isAtEnd()) {
                if (this.check('STRING')) {
                    tags.push(this.advance().value);
                } else if (this.check('IDENTIFIER')) {
                    tags.push(this.advance().value);
                }

                if (this.check('COMMA')) {
                    this.advance();
                }
            }

            this.consume('BRACKET_CLOSE', ']');
        }

        return tags;
    }

    // === CONDITION PARSING ===

    protected parseCondition(): ConditionNode {
        const location = this.currentLocation();
        const variable = this.consumeIdentifier('variable');
        const operator = this.parseOperator();
        const value = this.parseNumberValue();

        return AST.createCondition(variable, operator, value, location);
    }

    protected parseOperator(): '>' | '<' | '>=' | '<=' | '==' | '%' {
        if (this.check('OPERATOR')) {
            const op = this.advance().value;
            if (['>', '<', '>=', '<=', '==', '%'].includes(op)) {
                return op as '>' | '<' | '>=' | '<=' | '==' | '%';
            }
        }
        throw new DSLParseError('Expected comparison operator', this.currentLocation(), this.source);
    }

    protected parseRuleOperator(): '>' | '<' | '>=' | '<=' | '==' {
        const op = this.parseOperator();
        if (op === '%') {
            throw new DSLParseError('Operator % is not valid in simulation rules', this.currentLocation(), this.source);
        }
        return op;
    }

    protected parseCapRange(): { min?: number; max?: number } {
        const min = this.parseNumberValue();
        this.consume('DOT_DOT', '..');
        const max = this.parseNumberValue();
        return { min, max };
    }

    // === ACTION PARSING ===

    protected parseActionList(): ActionNode[] {
        const actions: ActionNode[] = [];
        this.skipNewlines();

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                this.skipNewlines();
                if (this.check('DEDENT') || this.check('AT_BLOCK')) break;

                const startPos = this.current;
                const action = this.parseAction();
                if (action) {
                    actions.push(action);
                }
                this.skipNewlines();

                // Safety: if no progress made, break to prevent infinite loop
                if (this.current === startPos) {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        } else {
            // Single-line action list
            const action = this.parseAction();
            if (action) {
                actions.push(action);
            }
        }

        return actions;
    }

    protected parseAction(): ActionNode | null {
        const location = this.currentLocation();

        if (this.check('IDENTIFIER')) {
            const actionName = this.advance().value;

            // Handle assignment operators
            if (this.check('EQUALS')) {
                this.advance();
                const value = this.parseNumberValue();
                return AST.createSetVarAction(actionName, value, location);
            }

            if (this.check('PLUS_EQUALS')) {
                this.advance();
                const delta = this.parseNumberValue();
                return AST.createModifyVarAction(actionName, delta, location);
            }

            if (this.check('MINUS_EQUALS')) {
                this.advance();
                const delta = -this.parseNumberValue();
                return AST.createModifyVarAction(actionName, delta, location);
            }

            // Handle built-in actions
            switch (actionName) {
                case 'add_funds_deal':
                    return AST.createAddFundsDealAction(location);

                case 'add_funds':
                    this.consume('COLON', ':');
                    return AST.createAddFundsAction(this.parseNumberValue(), location);

                case 'set_stage':
                    this.consume('COLON', ':');
                    return AST.createSetStageAction(this.parseNumberValue(), location);

                case 'mail': {
                    this.consume('COLON', ':');
                    const mailId = this.consumeIdentifier('mail id');
                    let delay = 0;
                    // Accept both IDENTIFIER and KEYWORD for 'delay' (delay is a keyword)
                    if ((this.check('IDENTIFIER') || this.check('KEYWORD')) && this.peek().value === 'delay') {
                        this.advance();
                        this.consume('COLON', ':');
                        delay = this.parseNumberValue();
                    }
                    return AST.createScheduleMailAction(mailId, delay, location);
                }

                case 'mail_if': {
                    this.consume('COLON', ':');
                    const condMailId = this.consumeIdentifier('mail id');
                    let condDelay = 0;
                    let condMailCondition: ConditionNode | undefined;
                    // Parse optional delay and required when clause
                    // Accept both IDENTIFIER and KEYWORD (delay/when are keywords)
                    while (this.check('IDENTIFIER') || this.check('KEYWORD')) {
                        const keyword = this.peek().value;
                        if (keyword === 'delay') {
                            this.advance();
                            this.consume('COLON', ':');
                            condDelay = this.parseNumberValue();
                        } else if (keyword === 'when') {
                            this.advance();
                            this.consume('COLON', ':');
                            condMailCondition = this.parseCondition();
                        } else {
                            break;
                        }
                    }
                    if (!condMailCondition) {
                        throw new DSLParseError('mail_if requires a when clause', location, this.source);
                    }
                    return AST.createConditionalMailAction(condMailId, condDelay, condMailCondition, location);
                }

                case 'modify_var': {
                    this.consume('COLON', ':');
                    const varName = this.consumeIdentifier('variable');
                    const varDelta = this.parseNumberValue();
                    return AST.createModifyVarAction(varName, varDelta, location);
                }

                case 'modify_rep':
                    this.consume('COLON', ':');
                    return AST.createModifyRepAction(this.parseNumberValue(), location, 'humanity');

                case 'modify_rep_humanity':
                    this.consume('COLON', ':');
                    return AST.createModifyRepAction(this.parseNumberValue(), location, 'humanity');

                case 'modify_rep_credibility':
                    this.consume('COLON', ':');
                    return AST.createModifyRepAction(this.parseNumberValue(), location, 'credibility');

                case 'modify_rep_innocence':
                    this.consume('COLON', ':');
                    return AST.createModifyRepAction(this.parseNumberValue(), location, 'innocence');

                case 'deactivate':
                    return AST.createDeactivateAction(location);

                case 'deactivate_chain':
                    return AST.createDeactivateChainAction(location);

                case 'redeem_all':
                    return AST.createRedeemAllAction(location);

                case 'redeem_target':
                    return AST.createRedeemTargetOnlyAction(location);

                case 'force_sell_all':
                    return AST.createForceSellAllAction(location);

                case 'force_sell_target': {
                    let targetId: string | undefined;
                    if (this.check('COLON')) {
                        this.advance();
                        targetId = this.consumeIdentifier('item id');
                    }
                    return AST.createForceSellTargetAction(location, targetId);
                }

                case 'mark_core_lost':
                    return AST.createMarkCoreLostAction(location);
            }
        }

        return null;
    }
}
