/**
 * Full .story File Validation Tests
 *
 * Tests that the DSL files parse correctly and produce valid output.
 * Now that storyRegistry loads from DSL, this validates the parsed results.
 */

import {
    EMMA_CHAIN_INIT, EMMA_EVENTS,
    SUSAN_CHAIN_INIT, SUSAN_EVENTS,
    ZHAO_CHAIN_INIT, ZHAO_EVENTS,
    LIN_CHAIN_INIT, LIN_EVENTS
} from '../../storyRegistry';
import { EventChainState, StoryEvent } from '../../../../types';

export interface FullTestResult {
    story: string;
    passed: boolean;
    chainValid: boolean;
    eventCount: number;
    errors: string[];
    warnings: string[];
}

interface StoryTestConfig {
    name: string;
    chain: EventChainState;
    events: StoryEvent[];
    expectedEventCount: number;
}

const STORY_CONFIGS: StoryTestConfig[] = [
    { name: 'emma', chain: EMMA_CHAIN_INIT, events: EMMA_EVENTS, expectedEventCount: 6 },
    { name: 'susan', chain: SUSAN_CHAIN_INIT, events: SUSAN_EVENTS, expectedEventCount: 1 },
    { name: 'zhao', chain: ZHAO_CHAIN_INIT, events: ZHAO_EVENTS, expectedEventCount: 7 },
    { name: 'lin', chain: LIN_CHAIN_INIT, events: LIN_EVENTS, expectedEventCount: 1 },
];

/**
 * Validate a single story's parsed data
 */
export function testFullStoryFile(config: StoryTestConfig): FullTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate chain
    let chainValid = true;
    if (!config.chain) {
        errors.push('Chain is undefined');
        chainValid = false;
    } else {
        if (!config.chain.id) {
            errors.push('Chain missing id');
            chainValid = false;
        }
        if (!config.chain.npcName) {
            errors.push('Chain missing npcName');
            chainValid = false;
        }
        if (config.chain.variables === undefined) {
            warnings.push('Chain has no variables');
        }
    }

    // Validate events
    const eventCount = config.events?.length || 0;
    if (eventCount !== config.expectedEventCount) {
        errors.push(`Event count mismatch: expected ${config.expectedEventCount}, got ${eventCount}`);
    }

    // Validate each event
    for (const event of config.events || []) {
        if (!event.id) {
            errors.push('Event missing id');
        }
        if (!event.chainId) {
            errors.push(`Event ${event.id}: missing chainId`);
        }
        if (!event.template?.name) {
            warnings.push(`Event ${event.id}: missing customer name`);
        }
    }

    return {
        story: config.name,
        passed: errors.length === 0,
        chainValid,
        eventCount,
        errors,
        warnings
    };
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
        output += `  Chain: ${result.chainValid ? '✓' : '✗'}\n`;
        output += `  Events: ${result.eventCount}/${STORY_CONFIGS.find(c => c.name === result.story)?.expectedEventCount || '?'} ${result.passed ? '✓' : '✗'}\n`;

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
