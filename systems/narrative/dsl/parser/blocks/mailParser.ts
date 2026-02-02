/**
 * Mail Block Parser
 * Handles parsing of @mail blocks
 */

import { BaseParser } from '../baseParser';
import { DSLMissingFieldError } from '../errors';
import * as AST from '../ast';
import { MailBlock } from '../../types';

export class MailBlockParser extends BaseParser {
    /**
     * Parse a @mail block
     */
    parseMailBlock(): MailBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@mail');

        const id = this.consumeIdentifier('mail id');
        this.skipNewlines();

        let sender = '';
        let subject = '';
        let body = '';
        let cash: number | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('SEPARATOR')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'sender':
                            sender = this.parseStringValue();
                            break;
                        case 'subject':
                            subject = this.parseStringValue();
                            break;
                        case 'body':
                            body = this.parseStringValue();
                            break;
                        case 'cash':
                            cash = this.parseNumberValue();
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

        if (!sender) throw new DSLMissingFieldError('sender', '@mail', location, this.source);
        if (!subject) throw new DSLMissingFieldError('subject', '@mail', location, this.source);
        if (!body) throw new DSLMissingFieldError('body', '@mail', location, this.source);

        return AST.createMailBlock(id, sender, subject, body, location, cash ? { cash } : undefined);
    }
}
