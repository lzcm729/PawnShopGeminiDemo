/**
 * DSL Loader
 * Entry point for loading and parsing .story files
 */

import { parse } from './parser/parser';
import { transformStoryFile, TransformedStory } from './transformer/toTypeScript';
import { validateDSL } from './validator/dslValidator';
import { quickValidate } from './validator/integration';
import { DSLParseError, DSLValidationError, ValidationResult } from './parser/errors';
import { StoryFile } from './types';

/**
 * Result of loading a story file
 */
export interface LoadedStory extends TransformedStory {
    filename?: string;
    ast?: StoryFile;
    parseTime?: number;
    transformTime?: number;
}

/**
 * Options for loading story files
 */
export interface LoadOptions {
    /** Include AST in result for debugging */
    includeAST?: boolean;
    /** Skip validation (faster but unsafe) */
    skipValidation?: boolean;
    /** Log timing information */
    logTiming?: boolean;
}

/**
 * Parse and transform DSL content into typed story data
 */
export function parseStoryContent(
    content: string,
    filename?: string,
    options: LoadOptions = {}
): LoadedStory {
    const startParse = performance.now();

    // Step 1: Parse to AST
    let ast: StoryFile;
    try {
        ast = parse(content, filename);
    } catch (error) {
        if (error instanceof DSLParseError) {
            throw error;
        }
        throw new DSLParseError(
            `Failed to parse story: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { line: 1, column: 1 },
            content
        );
    }

    const parseTime = performance.now() - startParse;

    // Step 2: Validate AST
    if (!options.skipValidation) {
        const validation = validateDSL(ast);
        const errors = validation.issues.filter(i => i.severity === 'error');

        if (errors.length > 0) {
            throw new DSLValidationError(
                `Story validation failed with ${errors.length} error(s)`,
                errors.map(e => ({ message: e.message, location: e.location }))
            );
        }

        // Log warnings
        const warnings = validation.issues.filter(i => i.severity === 'warning');
        if (warnings.length > 0 && options.logTiming) {
            console.warn(`[DSL] ${filename || 'story'}: ${warnings.length} warning(s)`);
            for (const warning of warnings) {
                console.warn(`  - ${warning.message}`);
            }
        }
    }

    const startTransform = performance.now();

    // Step 3: Transform to TypeScript types
    const transformed = transformStoryFile(ast);

    const transformTime = performance.now() - startTransform;

    // Step 4: Quick validation of transformed data
    if (!options.skipValidation) {
        const quickResult = quickValidate(transformed);
        if (!quickResult.valid) {
            throw new DSLValidationError(
                'Transformed story validation failed',
                quickResult.errors.map(e => ({ message: e }))
            );
        }
    }

    if (options.logTiming) {
        console.log(`[DSL] ${filename || 'story'}: parse=${parseTime.toFixed(1)}ms, transform=${transformTime.toFixed(1)}ms`);
    }

    const result: LoadedStory = {
        ...transformed,
        filename,
        parseTime,
        transformTime
    };

    if (options.includeAST) {
        result.ast = ast;
    }

    return result;
}

/**
 * Load a story file from a path (browser-compatible via fetch)
 */
export async function loadStoryFile(
    path: string,
    options: LoadOptions = {}
): Promise<LoadedStory> {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load story file: ${response.statusText}`);
        }

        const content = await response.text();
        const filename = path.split('/').pop();

        return parseStoryContent(content, filename, options);
    } catch (error) {
        if (error instanceof DSLParseError || error instanceof DSLValidationError) {
            throw error;
        }
        throw new Error(`Failed to load story file '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Load multiple story files
 */
export async function loadStoryFiles(
    paths: string[],
    options: LoadOptions = {}
): Promise<LoadedStory[]> {
    const results = await Promise.all(
        paths.map(path => loadStoryFile(path, options))
    );
    return results;
}

/**
 * Validate DSL content without transforming
 */
export function validateStoryContent(content: string, filename?: string): ValidationResult {
    try {
        const ast = parse(content, filename);
        return validateDSL(ast);
    } catch (error) {
        if (error instanceof DSLParseError) {
            return {
                valid: false,
                issues: [{
                    severity: 'error',
                    message: error.message,
                    location: error.location
                }]
            };
        }
        return {
            valid: false,
            issues: [{
                severity: 'error',
                message: error instanceof Error ? error.message : 'Unknown parse error'
            }]
        };
    }
}

// Re-export types for convenience
export type { StoryFile } from './types';
export type { TransformedStory } from './transformer/toTypeScript';
export { DSLParseError, DSLValidationError } from './parser/errors';
export type { ValidationResult } from './parser/errors';
