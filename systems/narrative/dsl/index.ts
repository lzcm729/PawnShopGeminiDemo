/**
 * DSL Module Index
 * Public API for the story DSL system
 */

// Main loader functions
export {
    parseStoryContent,
    loadStoryFile,
    loadStoryFiles,
    validateStoryContent
} from './loader';
export type { LoadedStory, LoadOptions } from './loader';

// Parser exports (for advanced usage)
export { parse } from './parser/parser';
export { tokenize } from './parser/lexer';
export type { Token, TokenType } from './parser/lexer';

// Transformer exports
export {
    transformStoryFile,
    generateTypeScriptCode,
    mergeIntoRegistries
} from './transformer/toTypeScript';
export type { TransformedStory } from './transformer/toTypeScript';

// Validator exports
export { validateDSL } from './validator/dslValidator';
export { validateTransformed, quickValidate } from './validator/integration';

// Error types
export {
    DSLParseError,
    DSLValidationError,
    DSLMissingFieldError,
    DSLUnexpectedTokenError,
    DSLReferenceError,
    createValidationResult
} from './parser/errors';
export type { ValidationResult, ValidationIssue } from './parser/errors';

// AST types (for tooling/debugging)
export type * from './types';
