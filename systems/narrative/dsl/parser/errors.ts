/**
 * DSL Error Types
 * Custom error classes for DSL parsing and validation
 */

import { SourceLocation } from '../types';

/**
 * Error thrown during DSL parsing
 */
export class DSLParseError extends Error {
    constructor(
        message: string,
        public location: SourceLocation,
        public source?: string
    ) {
        super(formatErrorMessage(message, location, source));
        this.name = 'DSLParseError';
    }
}

/**
 * Error thrown during DSL validation
 */
export class DSLValidationError extends Error {
    constructor(
        message: string,
        public errors: Array<{ message: string; location?: SourceLocation }>
    ) {
        super(formatValidationErrors(message, errors));
        this.name = 'DSLValidationError';
    }
}

/**
 * Error thrown when a required field is missing
 */
export class DSLMissingFieldError extends DSLParseError {
    constructor(
        fieldName: string,
        blockType: string,
        location: SourceLocation,
        source?: string
    ) {
        super(`Missing required field '${fieldName}' in ${blockType}`, location, source);
        this.name = 'DSLMissingFieldError';
    }
}

/**
 * Error thrown when an unexpected token is encountered
 */
export class DSLUnexpectedTokenError extends DSLParseError {
    constructor(
        expected: string,
        got: string,
        location: SourceLocation,
        source?: string
    ) {
        super(`Expected ${expected}, got '${got}'`, location, source);
        this.name = 'DSLUnexpectedTokenError';
    }
}

/**
 * Error thrown when a reference cannot be resolved
 */
export class DSLReferenceError extends DSLParseError {
    constructor(
        refType: string,
        refId: string,
        location: SourceLocation,
        source?: string
    ) {
        super(`Unknown ${refType} reference: '${refId}'`, location, source);
        this.name = 'DSLReferenceError';
    }
}

// === Helper Functions ===

function formatErrorMessage(
    message: string,
    location: SourceLocation,
    source?: string
): string {
    let formatted = `[Line ${location.line}, Col ${location.column}] ${message}`;

    if (source) {
        const lines = source.split('\n');
        const errorLine = lines[location.line - 1];
        if (errorLine) {
            formatted += `\n\n  ${location.line} | ${errorLine}`;
            formatted += `\n    ${' '.repeat(String(location.line).length)} | ${' '.repeat(location.column - 1)}^`;
        }
    }

    return formatted;
}

function formatValidationErrors(
    message: string,
    errors: Array<{ message: string; location?: SourceLocation }>
): string {
    let formatted = `${message}\n\nErrors (${errors.length}):`;

    for (const error of errors) {
        if (error.location) {
            formatted += `\n  - [Line ${error.location.line}] ${error.message}`;
        } else {
            formatted += `\n  - ${error.message}`;
        }
    }

    return formatted;
}

// === Validation Result Types ===

export interface ValidationIssue {
    severity: 'error' | 'warning';
    message: string;
    location?: SourceLocation;
    code?: string;
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}

export function createValidationResult(issues: ValidationIssue[]): ValidationResult {
    return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues
    };
}
