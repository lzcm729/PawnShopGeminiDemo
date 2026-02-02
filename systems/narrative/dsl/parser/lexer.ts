/**
 * DSL Lexer (Tokenizer)
 * Converts DSL source text into a stream of tokens
 */

import { SourceLocation } from '../types';
import { DSLParseError } from './errors';

// === TOKEN TYPES ===

export type TokenType =
    | 'AT_BLOCK'        // @story, @chain, @mail, @event, etc.
    | 'SEPARATOR'       // ---
    | 'STRING'          // "..." or """..."""
    | 'NUMBER'          // 123, -45, 3.14
    | 'IDENTIFIER'      // variable names, keywords
    | 'COLON'           // :
    | 'EQUALS'          // =
    | 'PLUS_EQUALS'     // +=
    | 'MINUS_EQUALS'    // -=
    | 'BRACKET_OPEN'    // [
    | 'BRACKET_CLOSE'   // ]
    | 'PAREN_OPEN'      // (
    | 'PAREN_CLOSE'     // )
    | 'COMMA'           // ,
    | 'DOT'             // .
    | 'DOT_DOT'         // ..
    | 'ARROW'           // ->
    | 'OPERATOR'        // >, <, >=, <=, ==, %
    | 'KEYWORD'         // true, false, when, etc.
    | 'NEWLINE'         // Line break
    | 'INDENT'          // Increase in indentation
    | 'DEDENT'          // Decrease in indentation
    | 'COMMENT'         // # comment
    | 'EOF';            // End of file

export interface Token {
    type: TokenType;
    value: string;
    location: SourceLocation;
    raw?: string;       // Original text for multiline strings
}

// === LEXER CLASS ===

export class Lexer {
    private source: string;
    private pos: number = 0;
    private line: number = 1;
    private column: number = 1;
    private tokens: Token[] = [];
    private indentStack: number[] = [0];
    private pendingDedents: number = 0;
    private atLineStart: boolean = true;

    constructor(source: string) {
        this.source = source;
    }

    /**
     * Tokenize the entire source and return all tokens
     */
    tokenize(): Token[] {
        while (!this.isAtEnd()) {
            this.scanToken();
        }

        // Emit remaining dedents at EOF
        while (this.indentStack.length > 1) {
            this.indentStack.pop();
            this.addToken('DEDENT', '');
        }

        this.addToken('EOF', '');
        return this.tokens;
    }

    private scanToken(): void {
        // Handle line start indentation
        if (this.atLineStart) {
            this.handleIndentation();
            this.atLineStart = false;
        }

        // Skip whitespace (but not newlines)
        this.skipInlineWhitespace();

        if (this.isAtEnd()) return;

        const char = this.peek();

        // Handle newlines
        if (char === '\n' || char === '\r') {
            this.handleNewline();
            return;
        }

        // Handle comments
        if (char === '#') {
            this.skipComment();
            return;
        }

        // Handle separator ---
        if (char === '-' && this.peekAhead(1) === '-' && this.peekAhead(2) === '-') {
            this.addToken('SEPARATOR', '---');
            this.advance();
            this.advance();
            this.advance();
            return;
        }

        // Handle @ blocks
        if (char === '@') {
            this.scanAtBlock();
            return;
        }

        // Handle strings
        if (char === '"') {
            this.scanString();
            return;
        }

        // Handle numbers (including +N and -N prefixes)
        if (this.isDigit(char) ||
            (char === '-' && this.isDigit(this.peekAhead(1))) ||
            (char === '+' && this.isDigit(this.peekAhead(1)))) {
            this.scanNumber();
            return;
        }

        // Handle operators and punctuation
        if (this.scanOperator()) return;
        if (this.scanPunctuation()) return;

        // Handle identifiers and keywords
        if (this.isAlpha(char) || char === '_') {
            this.scanIdentifier();
            return;
        }

        // Unknown character
        throw new DSLParseError(
            `Unexpected character: '${char}'`,
            this.currentLocation(),
            this.source
        );
    }

    private handleIndentation(): void {
        // Emit pending dedents first
        while (this.pendingDedents > 0) {
            this.addToken('DEDENT', '');
            this.pendingDedents--;
        }

        // Count spaces at start of line
        let indent = 0;
        while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
            if (this.peek() === '\t') {
                indent += 4; // Treat tabs as 4 spaces
            } else {
                indent++;
            }
            this.advance();
        }

        // Skip blank lines and comment-only lines
        if (this.peek() === '\n' || this.peek() === '\r' || this.peek() === '#') {
            return;
        }

        const currentIndent = this.indentStack[this.indentStack.length - 1];

        if (indent > currentIndent) {
            this.indentStack.push(indent);
            this.addToken('INDENT', '');
        } else if (indent < currentIndent) {
            // Dedent possibly multiple levels
            while (this.indentStack.length > 1 && indent < this.indentStack[this.indentStack.length - 1]) {
                this.indentStack.pop();
                this.addToken('DEDENT', '');
            }
        }
    }

    private handleNewline(): void {
        this.addToken('NEWLINE', '\\n');
        if (this.peek() === '\r') this.advance();
        if (this.peek() === '\n') this.advance();
        this.line++;
        this.column = 1;
        this.atLineStart = true;
    }

    private skipInlineWhitespace(): void {
        while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
            this.advance();
        }
    }

    private skipComment(): void {
        // Skip until end of line
        while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
            this.advance();
        }
    }

    private scanAtBlock(): void {
        const start = this.currentLocation();
        this.advance(); // Skip @

        let value = '@';
        while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
            value += this.advance();
        }

        this.tokens.push({
            type: 'AT_BLOCK',
            value,
            location: start
        });
    }

    private scanString(): void {
        const start = this.currentLocation();
        this.advance(); // Skip opening quote

        // Check for multiline string """..."""
        if (this.peek() === '"' && this.peekAhead(1) === '"') {
            this.advance(); // Skip second "
            this.advance(); // Skip third "
            this.scanMultilineString(start);
            return;
        }

        let value = '';
        while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== '\n') {
            if (this.peek() === '\\') {
                this.advance();
                value += this.scanEscapeSequence();
            } else {
                value += this.advance();
            }
        }

        if (this.peek() !== '"') {
            throw new DSLParseError('Unterminated string', start, this.source);
        }
        this.advance(); // Skip closing quote

        this.tokens.push({
            type: 'STRING',
            value,
            location: start
        });
    }

    private scanMultilineString(start: SourceLocation): void {
        let value = '';
        const raw: string[] = [];

        while (!this.isAtEnd()) {
            if (this.peek() === '"' && this.peekAhead(1) === '"' && this.peekAhead(2) === '"') {
                break;
            }

            if (this.peek() === '\n' || this.peek() === '\r') {
                if (this.peek() === '\r') this.advance();
                if (this.peek() === '\n') this.advance();
                value += '\n';
                this.line++;
                this.column = 1;
            } else if (this.peek() === '\\') {
                this.advance();
                value += this.scanEscapeSequence();
            } else {
                value += this.advance();
            }
        }

        if (this.isAtEnd()) {
            throw new DSLParseError('Unterminated multiline string', start, this.source);
        }

        // Skip closing """
        this.advance();
        this.advance();
        this.advance();

        // Trim leading/trailing newlines
        value = value.replace(/^\n/, '').replace(/\n$/, '');

        this.tokens.push({
            type: 'STRING',
            value,
            location: start,
            raw: value
        });
    }

    private scanEscapeSequence(): string {
        const char = this.advance();
        switch (char) {
            case 'n': return '\n';
            case 't': return '\t';
            case 'r': return '\r';
            case '"': return '"';
            case '\\': return '\\';
            default: return char;
        }
    }

    private scanNumber(): void {
        const start = this.currentLocation();
        let value = '';

        // Handle both - and + prefixes
        if (this.peek() === '-' || this.peek() === '+') {
            value += this.advance();
        }

        while (!this.isAtEnd() && this.isDigit(this.peek())) {
            value += this.advance();
        }

        // Handle decimals
        if (this.peek() === '.' && this.isDigit(this.peekAhead(1))) {
            value += this.advance(); // .
            while (!this.isAtEnd() && this.isDigit(this.peek())) {
                value += this.advance();
            }
        }

        this.tokens.push({
            type: 'NUMBER',
            value,
            location: start
        });
    }

    private scanOperator(): boolean {
        const start = this.currentLocation();
        const char = this.peek();
        const next = this.peekAhead(1);

        // Two-character operators
        if (char === '>' && next === '=') {
            this.addToken('OPERATOR', '>=');
            this.advance();
            this.advance();
            return true;
        }
        if (char === '<' && next === '=') {
            this.addToken('OPERATOR', '<=');
            this.advance();
            this.advance();
            return true;
        }
        if (char === '=' && next === '=') {
            this.addToken('OPERATOR', '==');
            this.advance();
            this.advance();
            return true;
        }
        if (char === '+' && next === '=') {
            this.addToken('PLUS_EQUALS', '+=');
            this.advance();
            this.advance();
            return true;
        }
        if (char === '-' && next === '=') {
            this.addToken('MINUS_EQUALS', '-=');
            this.advance();
            this.advance();
            return true;
        }
        if (char === '-' && next === '>') {
            this.addToken('ARROW', '->');
            this.advance();
            this.advance();
            return true;
        }
        if (char === '.' && next === '.') {
            this.addToken('DOT_DOT', '..');
            this.advance();
            this.advance();
            return true;
        }

        // Single-character operators
        if (char === '>' || char === '<' || char === '%') {
            this.addToken('OPERATOR', char);
            this.advance();
            return true;
        }
        if (char === '=') {
            this.addToken('EQUALS', char);
            this.advance();
            return true;
        }

        return false;
    }

    private scanPunctuation(): boolean {
        const char = this.peek();

        switch (char) {
            case ':':
                this.addToken('COLON', char);
                this.advance();
                return true;
            case '[':
                this.addToken('BRACKET_OPEN', char);
                this.advance();
                return true;
            case ']':
                this.addToken('BRACKET_CLOSE', char);
                this.advance();
                return true;
            case '(':
                this.addToken('PAREN_OPEN', char);
                this.advance();
                return true;
            case ')':
                this.addToken('PAREN_CLOSE', char);
                this.advance();
                return true;
            case ',':
                this.addToken('COMMA', char);
                this.advance();
                return true;
            case '.':
                this.addToken('DOT', char);
                this.advance();
                return true;
            default:
                return false;
        }
    }

    private scanIdentifier(): void {
        const start = this.currentLocation();
        let value = '';

        while (!this.isAtEnd()) {
            const char = this.peek();
            if (this.isAlphaNumeric(char) || char === '_') {
                value += this.advance();
            } else if (char === '-' && this.isAlphaNumeric(this.peekAhead(1))) {
                // Allow hyphens in middle of identifiers (e.g., trait-lin-rare)
                // but only if followed by alphanumeric character
                value += this.advance();
            } else {
                break;
            }
        }

        // Check for keywords
        const keywords = new Set(['true', 'false', 'when', 'default', 'and', 'or', 'not', 'if', 'delay']);
        if (keywords.has(value.toLowerCase())) {
            this.tokens.push({
                type: 'KEYWORD',
                value: value.toLowerCase(),
                location: start
            });
        } else {
            this.tokens.push({
                type: 'IDENTIFIER',
                value,
                location: start
            });
        }
    }

    // === Helper Methods ===

    private peek(): string {
        if (this.isAtEnd()) return '\0';
        return this.source[this.pos];
    }

    private peekAhead(n: number): string {
        if (this.pos + n >= this.source.length) return '\0';
        return this.source[this.pos + n];
    }

    private advance(): string {
        const char = this.source[this.pos];
        this.pos++;
        this.column++;
        return char;
    }

    private isAtEnd(): boolean {
        return this.pos >= this.source.length;
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isAlpha(char: string): boolean {
        return (char >= 'a' && char <= 'z') ||
               (char >= 'A' && char <= 'Z') ||
               char === '_' ||
               // Support Chinese characters
               /[\u4e00-\u9fa5]/.test(char);
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private currentLocation(): SourceLocation {
        return {
            line: this.line,
            column: this.column,
            offset: this.pos
        };
    }

    private addToken(type: TokenType, value: string): void {
        this.tokens.push({
            type,
            value,
            location: this.currentLocation()
        });
    }
}

/**
 * Convenience function to tokenize source code
 */
export function tokenize(source: string): Token[] {
    const lexer = new Lexer(source);
    return lexer.tokenize();
}
