/**
 * Hint Block Parser
 * Handles parsing of @hint blocks (standalone, not within @fate_hints)
 *
 * Note: Most @hint parsing is done within ChainBlockParser as part of @fate_hints.
 * This file is for potential future standalone hint parsing needs.
 */

import { BaseParser } from '../baseParser';
import { DSLMissingFieldError } from '../errors';
import * as AST from '../ast';
import { FateHintNode, ConditionNode } from '../../types';

export class HintBlockParser extends BaseParser {
    /**
     * Parse a standalone @hint block
     */
    parseHintBlock(): FateHintNode {
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
                if (this.check('IDENTIFIER')) {
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
