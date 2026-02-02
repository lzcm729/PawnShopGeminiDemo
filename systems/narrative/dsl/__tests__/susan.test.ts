/**
 * Susan Story DSL Test
 * Verifies that the DSL parser produces output matching the TypeScript source
 */

import { parseStoryContent, LoadedStory } from '../loader';
import { SUSAN_CHAIN_INIT, SUSAN_EVENTS } from '../../stories/susan';

// Susan story DSL content
export const SUSAN_DSL = `
@story susan
    name: "苏珊"

---

@chain chain_susan
    npc_name: "苏珊"
    active: false
    stage: 0

    @variables
        debt = 50000
        suspicion = 0

    @simulation_rules
        @delta debt 1000

---

@event susan_01_bag
    chain: chain_susan
    trigger: stage == 0

    @item susan_item_bag
        name: "鳄鱼皮铂金包"
        category: "奢侈品"
        condition: "99新"
        visual_description: "色泽光亮，五金件闪耀。"
        history: "上个月在巴黎买的，我老公送的。"
        appraisal_note: "高仿A货。"
        archive_summary: "一只精仿的奢侈品包。"
        real_value: 200
        perceived_value: 80000
        uncertainty: 0.4
        stolen: false
        fake: true
        sentimental: false

        @traits
            @trait trait-susan-fake
                name: "走线歪斜"
                type: FAKE
                description: "底部缝线不够直，非专柜品质。"
                value_impact: -0.99
                discovery: 0.5

            @trait trait-susan-smell
                name: "胶水气味"
                type: FAKE
                description: "刺鼻的工业胶水味。"
                value_impact: -0.5
                discovery: 0.3

    @customer
        name: "苏珊"
        description: "浑身名牌，香水味很浓，但神色慌张。"
        avatar: "lady_susan"
        desired: 20000
        minimum: 5000
        max_repayment: 30000
        patience: 3
        mood: "Neutral"
        identity_tags: [Scam, Fake]
        behavior_tags: [SUSPICIOUS]
        redemption_resolve: Strong

        @dialogue
            greeting: "亲爱的，帮个忙，我急需周转。"
            pawn_reason: "打牌输了一点点，不想让老公知道。"
            redemption_plea: "过两天赢回来就赎，这可是限量版。"
            negotiation_dynamic: "你什么眼光？这可是专柜货！"

            @accepted
                fair: "钱打我卡上。"
                fleeced: "行吧行吧，烦死了。"
                premium: "亲爱的你太好了！"

            rejected: "你给我等着！"

            @rejection_lines
                standard: "没眼光。"
                angry: "破店！"
                desperate: "帮帮姐妹..."

            @exit
                grateful: "亲爱的你真是救星！下次请你喝茶。"
                neutral: "谢了。钱这就转走了。"
                resentful: "这点钱... 算了，我不跟你计较。"
                desperate: "[她焦急地看着手机屏幕，也不理你，匆匆跑向门口]"

    @outcomes
        deal_charity:
            add_funds_deal
            deactivate_chain
            modify_rep: -5

        deal_aid:
            add_funds_deal
            deactivate_chain

        deal_standard:
            add_funds_deal
            deactivate_chain

        deal_shark:
            add_funds_deal
            deactivate_chain
            modify_rep: 2

    @on_reject
        deactivate_chain
`;

/**
 * Test result structure
 */
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

/**
 * Test that DSL parsing produces correct output
 */
export function testSusanDSL(): TestResult {
    const tests: TestResult['tests'] = [];

    const addTest = (name: string, expected: any, actual: any) => {
        const passed = JSON.stringify(expected) === JSON.stringify(actual);
        tests.push({ name, passed, expected, actual });
    };

    const addError = (name: string, error: string) => {
        tests.push({ name, passed: false, error });
    };

    try {
        const result = parseStoryContent(SUSAN_DSL, 'susan.story', {
            includeAST: true,
            logTiming: false
        });

        // Test chain
        const dslChain = result.chains[0];
        addTest('Chain ID', SUSAN_CHAIN_INIT.id, dslChain.id);
        addTest('Chain NPC Name', SUSAN_CHAIN_INIT.npcName, dslChain.npcName);
        addTest('Chain Active', SUSAN_CHAIN_INIT.isActive, dslChain.isActive);
        addTest('Chain Stage', SUSAN_CHAIN_INIT.stage, dslChain.stage);
        addTest('Chain Variables', SUSAN_CHAIN_INIT.variables, dslChain.variables);
        addTest('Chain Simulation Rules Count', SUSAN_CHAIN_INIT.simulationRules.length, dslChain.simulationRules.length);

        // Test event
        const dslEvent = result.events[0];
        const tsEvent = SUSAN_EVENTS[0];
        addTest('Event ID', tsEvent.id, dslEvent.id);
        addTest('Event Chain ID', tsEvent.chainId, dslEvent.chainId);
        addTest('Event Trigger Conditions', tsEvent.triggerConditions, dslEvent.triggerConditions);

        // Test customer template
        addTest('Customer Name', tsEvent.template.name, dslEvent.template.name);
        addTest('Customer Description', tsEvent.template.description, dslEvent.template.description);
        addTest('Customer Avatar', tsEvent.template.avatarSeed, dslEvent.template.avatarSeed);
        addTest('Customer Desired Amount', tsEvent.template.desiredAmount, dslEvent.template.desiredAmount);
        addTest('Customer Minimum Amount', tsEvent.template.minimumAmount, dslEvent.template.minimumAmount);
        addTest('Customer Patience', tsEvent.template.patience, dslEvent.template.patience);

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

    } catch (error) {
        addError('Parse Story', error instanceof Error ? error.message : String(error));
    }

    return {
        passed: tests.every(t => t.passed),
        tests
    };
}

/**
 * Run tests and log results
 */
export function runSusanTests(): void {
    console.log('=== Susan DSL Test Suite ===\n');

    const result = testSusanDSL();

    for (const test of result.tests) {
        const status = test.passed ? 'PASS' : 'FAIL';
        console.log(`[${status}] ${test.name}`);
        if (!test.passed) {
            if (test.error) {
                console.log(`  Error: ${test.error}`);
            } else {
                console.log(`  Expected: ${JSON.stringify(test.expected)}`);
                console.log(`  Actual: ${JSON.stringify(test.actual)}`);
            }
        }
    }

    console.log(`\n=== Results: ${result.tests.filter(t => t.passed).length}/${result.tests.length} passed ===`);
}

// Export for browser DevTools testing
(window as any).testSusanDSL = testSusanDSL;
(window as any).runSusanTests = runSusanTests;
