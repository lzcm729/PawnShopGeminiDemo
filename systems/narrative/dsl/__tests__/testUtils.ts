/**
 * Common test utilities for DSL comparison tests
 */

import { parseStoryContent, LoadedStory } from '../loader';
import { EventChainState, StoryEvent } from '../../../../types';

export interface TestResult {
    passed: boolean;
    tests: {
        name: string;
        passed: boolean;
        expected?: any;
        actual?: any;
        error?: string;
    }[];
}

export interface StoryTestCase {
    name: string;
    dslContent: string;
    tsChainInit: EventChainState;
    tsEvents: StoryEvent[];
}

/**
 * Run comparison tests between DSL output and TypeScript source
 */
export function runStoryComparison(testCase: StoryTestCase): TestResult {
    const tests: TestResult['tests'] = [];

    const addTest = (name: string, expected: any, actual: any) => {
        const passed = JSON.stringify(expected) === JSON.stringify(actual);
        tests.push({ name, passed, expected, actual });
    };

    const addError = (name: string, error: string) => {
        tests.push({ name, passed: false, error });
    };

    try {
        const result = parseStoryContent(testCase.dslContent, `${testCase.name}.story`, {
            includeAST: false,
            logTiming: false
        });

        // Test chain
        if (result.chains.length > 0) {
            const dslChain = result.chains[0];
            addTest('Chain ID', testCase.tsChainInit.id, dslChain.id);
            addTest('Chain NPC Name', testCase.tsChainInit.npcName, dslChain.npcName);
            addTest('Chain Active', testCase.tsChainInit.isActive, dslChain.isActive);
            addTest('Chain Stage', testCase.tsChainInit.stage, dslChain.stage);
            addTest('Chain Variables', testCase.tsChainInit.variables, dslChain.variables);
            addTest('Chain Simulation Rules Count',
                testCase.tsChainInit.simulationRules?.length || 0,
                dslChain.simulationRules?.length || 0
            );
        }

        // Test events
        if (result.events.length > 0 && testCase.tsEvents.length > 0) {
            const dslEvent = result.events[0];
            const tsEvent = testCase.tsEvents[0];

            addTest('Event ID', tsEvent.id, dslEvent.id);
            addTest('Event Chain ID', tsEvent.chainId, dslEvent.chainId);
            addTest('Event Trigger Conditions', tsEvent.triggerConditions, dslEvent.triggerConditions);

            // Test customer template
            if (tsEvent.template && dslEvent.template) {
                addTest('Customer Name', tsEvent.template.name, dslEvent.template.name);
                addTest('Customer Description', tsEvent.template.description, dslEvent.template.description);
                addTest('Customer Avatar', tsEvent.template.avatarSeed, dslEvent.template.avatarSeed);
                addTest('Customer Desired Amount', tsEvent.template.desiredAmount, dslEvent.template.desiredAmount);
                addTest('Customer Minimum Amount', tsEvent.template.minimumAmount, dslEvent.template.minimumAmount);
                addTest('Customer Patience', tsEvent.template.patience, dslEvent.template.patience);
            }

            // Test outcomes
            const dslOutcomes = dslEvent.outcomes || {};
            const tsOutcomes = tsEvent.outcomes || {};
            for (const key of ['deal_charity', 'deal_aid', 'deal_standard', 'deal_shark']) {
                const dslActions = dslOutcomes[key] || [];
                const tsActions = tsOutcomes[key] || [];
                addTest(`Outcome ${key} count`, tsActions.length, dslActions.length);
            }

            // Test onReject
            addTest('onReject count', tsEvent.onReject?.length || 0, dslEvent.onReject?.length || 0);
        }

    } catch (error) {
        addError('Parse Story', error instanceof Error ? error.message : String(error));
    }

    return {
        passed: tests.every(t => t.passed),
        tests
    };
}

/**
 * Format test results as a string
 */
export function formatTestResults(storyName: string, result: TestResult): string {
    let output = `=== ${storyName} DSL Test ===\n`;

    for (const test of result.tests) {
        const status = test.passed ? '✓' : '✗';
        output += `${status} ${test.name}\n`;
        if (!test.passed) {
            if (test.error) {
                output += `  Error: ${test.error}\n`;
            } else {
                output += `  Expected: ${JSON.stringify(test.expected)}\n`;
                output += `  Actual: ${JSON.stringify(test.actual)}\n`;
            }
        }
    }

    const passedCount = result.tests.filter(t => t.passed).length;
    const totalCount = result.tests.length;
    output += `\n=== Results: ${passedCount}/${totalCount} passed ===`;

    return output;
}
