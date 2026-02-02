/**
 * Story Block Parser
 * Handles parsing of @story blocks
 */

import { BaseParser } from '../baseParser';
import * as AST from '../ast';
import { StoryBlock } from '../../types';

export class StoryBlockParser extends BaseParser {
    /**
     * Parse a @story block
     */
    parseStoryBlock(): StoryBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@story');

        const id = this.consumeIdentifier('story id');
        this.skipNewlines();

        let name = id;

        // Parse properties
        while (!this.isAtEnd() && !this.check('SEPARATOR') && !this.check('AT_BLOCK')) {
            this.skipNewlines();
            if (this.check('SEPARATOR') || this.check('AT_BLOCK') || this.isAtEnd()) break;

            if (this.check('IDENTIFIER')) {
                const propName = this.advance().value;
                this.consume('COLON', ':');

                if (propName === 'name') {
                    name = this.parseStringValue();
                }

                this.skipNewlines();
            } else {
                break;
            }
        }

        return AST.createStoryBlock(id, name, location);
    }
}
