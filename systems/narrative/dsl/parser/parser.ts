/**
 * DSL Parser (Refactored)
 *
 * Main parser entry point that coordinates specialized block parsers.
 * The actual parsing logic for each block type has been extracted to:
 * - blocks/storyParser.ts  - @story block parsing
 * - blocks/chainParser.ts  - @chain block parsing (includes @variables, @simulation_rules, @fate_hints)
 * - blocks/mailParser.ts   - @mail block parsing
 * - blocks/eventParser.ts  - @event block parsing (includes @item, @customer, @dialogue, @outcomes, etc.)
 *
 * Common parsing utilities are in baseParser.ts
 */

import { Token, tokenize } from './lexer';
import { DSLParseError, DSLMissingFieldError } from './errors';
import * as AST from './ast';
import {
    StoryFile,
    StoryBlock,
    ChainBlock,
    MailBlock,
    EventBlock
} from '../types';

import { StoryBlockParser } from './blocks/storyParser';
import { ChainBlockParser } from './blocks/chainParser';
import { MailBlockParser } from './blocks/mailParser';
import { EventBlockParser } from './blocks/eventParser';

/**
 * Main Parser class that orchestrates parsing of DSL story files
 *
 * Uses composition to delegate block parsing to specialized parsers.
 * This class handles:
 * - Token stream management
 * - Top-level block routing
 * - StoryFile AST construction
 */
export class Parser {
    private tokens: Token[] = [];
    private current: number = 0;
    private source: string;
    private filename?: string;

    // Specialized block parsers (created lazily)
    private storyParser?: StoryBlockParser;
    private chainParser?: ChainBlockParser;
    private mailParser?: MailBlockParser;
    private eventParser?: EventBlockParser;

    constructor(source: string, filename?: string) {
        this.source = source;
        this.filename = filename;
    }

    /**
     * Parse the source into a StoryFile AST
     */
    parse(): StoryFile {
        this.tokens = tokenize(this.source);

        const location = this.currentLocation();
        let story: StoryBlock | null = null;
        const chains: ChainBlock[] = [];
        const mails: MailBlock[] = [];
        const events: EventBlock[] = [];

        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (this.isAtEnd()) break;

            if (this.check('SEPARATOR')) {
                this.advance();
                this.skipNewlines();
                continue;
            }

            // Handle stray DEDENT tokens at top level
            if (this.check('DEDENT')) {
                this.advance();
                continue;
            }

            if (this.check('AT_BLOCK')) {
                const blockType = this.peek().value;

                switch (blockType) {
                    case '@story':
                        if (story) {
                            throw new DSLParseError('Duplicate @story block', this.currentLocation(), this.source);
                        }
                        story = this.delegateToStoryParser();
                        break;
                    case '@chain':
                        chains.push(this.delegateToChainParser());
                        break;
                    case '@mail':
                        mails.push(this.delegateToMailParser());
                        break;
                    case '@event':
                        events.push(this.delegateToEventParser());
                        break;
                    default:
                        throw new DSLParseError(`Unexpected top-level block: ${blockType}`, this.currentLocation(), this.source);
                }
            } else {
                throw new DSLParseError(`Expected block directive, got ${this.peek().type}`, this.currentLocation(), this.source);
            }
        }

        if (!story) {
            throw new DSLMissingFieldError('@story', 'file', location, this.source);
        }

        return AST.createStoryFile(story, chains, mails, events, location);
    }

    // === DELEGATION METHODS ===

    /**
     * Create a block parser instance with shared token state
     */
    private createBlockParser<T>(
        ParserClass: new (source: string, filename?: string) => T
    ): T {
        const parser = new ParserClass(this.source, this.filename);
        // Share token state with the block parser
        // Using 'any' cast because tokens/current are protected in base class
        (parser as any).tokens = this.tokens;
        (parser as any).current = this.current;
        return parser;
    }

    /**
     * Sync token position after block parser finishes
     */
    private syncPosition(parser: unknown): void {
        this.current = (parser as any).current;
    }

    private delegateToStoryParser(): StoryBlock {
        if (!this.storyParser) {
            this.storyParser = this.createBlockParser(StoryBlockParser);
        } else {
            (this.storyParser as any).current = this.current;
        }
        const result = this.storyParser.parseStoryBlock();
        this.syncPosition(this.storyParser);
        return result;
    }

    private delegateToChainParser(): ChainBlock {
        if (!this.chainParser) {
            this.chainParser = this.createBlockParser(ChainBlockParser);
        } else {
            (this.chainParser as any).current = this.current;
        }
        const result = this.chainParser.parseChainBlock();
        this.syncPosition(this.chainParser);
        return result;
    }

    private delegateToMailParser(): MailBlock {
        if (!this.mailParser) {
            this.mailParser = this.createBlockParser(MailBlockParser);
        } else {
            (this.mailParser as any).current = this.current;
        }
        const result = this.mailParser.parseMailBlock();
        this.syncPosition(this.mailParser);
        return result;
    }

    private delegateToEventParser(): EventBlock {
        if (!this.eventParser) {
            this.eventParser = this.createBlockParser(EventBlockParser);
        } else {
            (this.eventParser as any).current = this.current;
        }
        const result = this.eventParser.parseEventBlock();
        this.syncPosition(this.eventParser);
        return result;
    }

    // === TOKEN HELPERS ===

    private check(type: string, values?: string[]): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        if (token.type !== type) return false;
        if (values && !values.includes(token.value)) return false;
        return true;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.tokens[this.current - 1];
    }

    private isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    private currentLocation() {
        return this.peek().location;
    }

    private skipNewlines(): void {
        while (this.check('NEWLINE')) {
            this.advance();
        }
    }
}

/**
 * Parse DSL source code into an AST
 */
export function parse(source: string, filename?: string): StoryFile {
    const parser = new Parser(source, filename);
    return parser.parse();
}

// Re-export block parsers for direct use if needed
export { StoryBlockParser } from './blocks/storyParser';
export { ChainBlockParser } from './blocks/chainParser';
export { MailBlockParser } from './blocks/mailParser';
export { EventBlockParser } from './blocks/eventParser';
export { HintBlockParser } from './blocks/hintParser';
export { BaseParser } from './baseParser';
