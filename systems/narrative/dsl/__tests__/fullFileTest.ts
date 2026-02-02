/**
 * Full .story File Validation Tests
 * Tests the actual .story files against TypeScript source
 */

import { parseStoryContent } from '../loader';
import { EMMA_CHAIN_INIT, EMMA_EVENTS } from '../../stories/emma';
import { SUSAN_CHAIN_INIT, SUSAN_EVENTS } from '../../stories/susan';
import { ZHAO_CHAIN_INIT, ZHAO_EVENTS } from '../../stories/zhao';
import { LIN_CHAIN_INIT, LIN_EVENTS } from '../../stories/lin';
import { EventChainState, StoryEvent } from '../../../../types';

// Import raw .story files
import emmaStoryRaw from '../../stories-dsl/emma.story?raw';
import susanStoryRaw from '../../stories-dsl/susan.story?raw';
import zhaoStoryRaw from '../../stories-dsl/zhao.story?raw';
import linStoryRaw from '../../stories-dsl/lin.story?raw';

export interface FullTestResult {
    story: string;
    passed: boolean;
    chainMatch: boolean;
    eventCount: { expected: number; actual: number; match: boolean };
    errors: string[];
    warnings: string[];
}

interface StoryTestConfig {
    name: string;
    content: string;
    tsChain: EventChainState;
    tsEvents: StoryEvent[];
}

const STORY_CONFIGS: StoryTestConfig[] = [
    { name: 'emma', content: emmaStoryRaw, tsChain: EMMA_CHAIN_INIT, tsEvents: EMMA_EVENTS },
    { name: 'susan', content: susanStoryRaw, tsChain: SUSAN_CHAIN_INIT, tsEvents: SUSAN_EVENTS },
    { name: 'zhao', content: zhaoStoryRaw, tsChain: ZHAO_CHAIN_INIT, tsEvents: ZHAO_EVENTS },
    { name: 'lin', content: linStoryRaw, tsChain: LIN_CHAIN_INIT, tsEvents: LIN_EVENTS },
];

/**
 * Test a single story file
 */
export function testFullStoryFile(config: StoryTestConfig): FullTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const parsed = parseStoryContent(config.content, `${config.name}.story`, {
            includeAST: false,
            logTiming: false
        });

        // Check chain
        let chainMatch = true;
        if (parsed.chains.length === 0) {
            errors.push('No chains found in parsed result');
            chainMatch = false;
        } else {
            const dslChain = parsed.chains[0];

            if (dslChain.id !== config.tsChain.id) {
                errors.push(`Chain ID mismatch: expected "${config.tsChain.id}", got "${dslChain.id}"`);
                chainMatch = false;
            }
            if (dslChain.npcName !== config.tsChain.npcName) {
                errors.push(`Chain NPC name mismatch: expected "${config.tsChain.npcName}", got "${dslChain.npcName}"`);
                chainMatch = false;
            }
            if (dslChain.isActive !== config.tsChain.isActive) {
                warnings.push(`Chain active mismatch: expected ${config.tsChain.isActive}, got ${dslChain.isActive}`);
            }

            // Check variables
            const tsVarKeys = Object.keys(config.tsChain.variables || {});
            const dslVarKeys = Object.keys(dslChain.variables || {});
            if (tsVarKeys.length !== dslVarKeys.length) {
                warnings.push(`Variable count mismatch: expected ${tsVarKeys.length}, got ${dslVarKeys.length}`);
            }

            // Check simulation rules count
            const tsRuleCount = config.tsChain.simulationRules?.length || 0;
            const dslRuleCount = dslChain.simulationRules?.length || 0;
            if (tsRuleCount !== dslRuleCount) {
                warnings.push(`Simulation rules count mismatch: expected ${tsRuleCount}, got ${dslRuleCount}`);
            }
        }

        // Check events
        const expectedEventCount = config.tsEvents.length;
        const actualEventCount = parsed.events.length;
        const eventCountMatch = expectedEventCount === actualEventCount;

        if (!eventCountMatch) {
            errors.push(`Event count mismatch: expected ${expectedEventCount}, got ${actualEventCount}`);
        }

        // Check each event exists with correct ID
        for (const tsEvent of config.tsEvents) {
            const dslEvent = parsed.events.find(e => e.id === tsEvent.id);
            if (!dslEvent) {
                errors.push(`Missing event: ${tsEvent.id}`);
            } else {
                // Check basic properties
                if (dslEvent.chainId !== tsEvent.chainId) {
                    errors.push(`Event ${tsEvent.id}: chainId mismatch`);
                }
                if (!dslEvent.template?.name) {
                    warnings.push(`Event ${tsEvent.id}: missing customer name`);
                }
            }
        }

        // Check mails
        const dslMailCount = Object.keys(parsed.mails || {}).length;
        if (dslMailCount > 0) {
            // Good - has mails
        }

        return {
            story: config.name,
            passed: errors.length === 0,
            chainMatch,
            eventCount: { expected: expectedEventCount, actual: actualEventCount, match: eventCountMatch },
            errors,
            warnings
        };

    } catch (error) {
        return {
            story: config.name,
            passed: false,
            chainMatch: false,
            eventCount: { expected: config.tsEvents.length, actual: 0, match: false },
            errors: [`Parse error: ${error instanceof Error ? error.message : String(error)}`],
            warnings
        };
    }
}

/**
 * Test all story files
 */
export function testAllFullStoryFiles(): FullTestResult[] {
    return STORY_CONFIGS.map(config => testFullStoryFile(config));
}

/**
 * Test a specific story by name
 */
export function testFullStoryByName(name: string): FullTestResult | null {
    const config = STORY_CONFIGS.find(c => c.name === name);
    if (!config) return null;
    return testFullStoryFile(config);
}

/**
 * Format test results for display
 */
export function formatFullTestResults(results: FullTestResult[]): string {
    let output = '=== Full .story File Validation ===\n\n';

    let totalPassed = 0;

    for (const result of results) {
        const status = result.passed ? '✓' : '✗';
        output += `${status} ${result.story}.story\n`;
        output += `  Chain: ${result.chainMatch ? '✓' : '✗'}\n`;
        output += `  Events: ${result.eventCount.actual}/${result.eventCount.expected} ${result.eventCount.match ? '✓' : '✗'}\n`;

        if (result.errors.length > 0) {
            output += `  Errors:\n`;
            for (const err of result.errors) {
                output += `    - ${err}\n`;
            }
        }

        if (result.warnings.length > 0) {
            output += `  Warnings:\n`;
            for (const warn of result.warnings) {
                output += `    - ${warn}\n`;
            }
        }

        output += '\n';
        if (result.passed) totalPassed++;
    }

    output += `=== Total: ${totalPassed}/${results.length} passed ===`;
    return output;
}
