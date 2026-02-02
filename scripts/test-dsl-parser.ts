/**
 * DSL Parser Compatibility Test
 * Tests all .story files against the parser and reports issues
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { parse } from '../systems/narrative/dsl/parser/parser';
import { tokenize } from '../systems/narrative/dsl/parser/lexer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function getErrorContext(source: string, line?: number): string {
    if (!line) return '';

    const lines = source.split('\n');
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);

    let context = '';
    for (let i = start; i < end; i++) {
        const prefix = i === line - 1 ? '>>> ' : '    ';
        context += `${prefix}${i + 1}: ${lines[i]}\n`;
    }
    return context;
}

function main() {
    const storyDir = join(projectRoot, 'systems/narrative/stories-dsl');
    const storyFiles = readdirSync(storyDir).filter(f => f.endsWith('.story'));

    console.log('='.repeat(80));
    console.log('DSL Parser Compatibility Test');
    console.log('='.repeat(80));
    console.log(`\nFound ${storyFiles.length} story files to test\n`);

    const results: {
        file: string;
        status: 'PASS' | 'LEXER_ERROR' | 'PARSER_ERROR';
        error?: string;
        errorLine?: number;
        errorContext?: string;
    }[] = [];

    for (const file of storyFiles) {
        const filePath = join(storyDir, file);
        const source = readFileSync(filePath, 'utf-8');

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`Testing: ${file}`);
        console.log('─'.repeat(60));

        // Step 1: Test Lexer
        let tokens;
        try {
            tokens = tokenize(source);
            console.log(`  ✓ Lexer: ${tokens.length} tokens generated`);
        } catch (e: any) {
            console.log(`  ✗ Lexer Error: ${e.message}`);
            results.push({
                file,
                status: 'LEXER_ERROR',
                error: e.message,
                errorLine: e.location?.line,
                errorContext: getErrorContext(source, e.location?.line)
            });
            continue;
        }

        // Step 2: Test Parser
        try {
            const ast = parse(source, file);
            console.log(`  ✓ Parser: Successfully parsed`);
            console.log(`    - Story: ${ast.story?.id || 'N/A'}`);
            console.log(`    - Chains: ${ast.chains?.length || 0}`);
            console.log(`    - Mails: ${ast.mails?.length || 0}`);
            console.log(`    - Events: ${ast.events?.length || 0}`);
            results.push({ file, status: 'PASS' });
        } catch (e: any) {
            console.log(`  ✗ Parser Error: ${e.message}`);
            results.push({
                file,
                status: 'PARSER_ERROR',
                error: e.message,
                errorLine: e.location?.line,
                errorContext: getErrorContext(source, e.location?.line)
            });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.status === 'PASS');
    const failed = results.filter(r => r.status !== 'PASS');

    console.log(`\nTotal Files: ${results.length}`);
    console.log(`  ✓ Passed: ${passed.length}`);
    console.log(`  ✗ Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log('\n' + '─'.repeat(60));
        console.log('DETAILED FAILURES');
        console.log('─'.repeat(60));

        for (const failure of failed) {
            console.log(`\n[${failure.status}] ${failure.file}`);
            console.log(`  Error: ${failure.error}`);
            if (failure.errorLine) {
                console.log(`  Line: ${failure.errorLine}`);
            }
            if (failure.errorContext) {
                console.log(`  Context:\n${failure.errorContext}`);
            }
        }
    }

    // Return exit code
    process.exit(failed.length > 0 ? 1 : 0);
}

main();
