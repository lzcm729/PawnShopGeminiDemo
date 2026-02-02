/**
 * Single story file parser test
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { parse } from '../systems/narrative/dsl/parser/parser';
import { tokenize } from '../systems/narrative/dsl/parser/lexer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const file = process.argv[2] || 'lin.story';
const storyDir = join(projectRoot, 'systems/narrative/stories-dsl');
const filePath = join(storyDir, file);

console.log(`Testing: ${file}`);
console.log('─'.repeat(60));

try {
    const source = readFileSync(filePath, 'utf-8');

    console.log('Starting lexer...');
    const tokens = tokenize(source);
    console.log(`✓ Lexer: ${tokens.length} tokens`);

    console.log('Starting parser...');
    const ast = parse(source, file);
    console.log('✓ Parser: Success!');
    console.log(`  Story: ${ast.story?.id}`);
    console.log(`  Chains: ${ast.chains?.length || 0}`);
    console.log(`  Mails: ${ast.mails?.length || 0}`);
    console.log(`  Events: ${ast.events?.length || 0}`);
} catch (e: any) {
    console.log(`✗ Error: ${e.message}`);
    if (e.location) {
        console.log(`  Line: ${e.location.line}, Col: ${e.location.column}`);
    }
    process.exit(1);
}
