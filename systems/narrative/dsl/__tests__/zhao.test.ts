/**
 * Zhao Story DSL Test
 * Uses a simplified chain-only test due to story length
 */

import { runStoryComparison, formatTestResults, TestResult } from './testUtils';
import { ZHAO_CHAIN_INIT, ZHAO_EVENTS } from '../../stories/zhao';

// Simplified DSL for chain structure test
export const ZHAO_DSL_CHAIN = `
@story zhao
    name: "周守义"

---

@chain chain_zhao
    npc_name: "周守义"
    active: false
    stage: 0

    @variables
        funds = 1000
        trust = 50
        stress = 0
        medal_extended = 0
        medal_sold_early = 0
        day = 0

    @simulation_rules
        @delta day 1

        @delta funds -500

        @threshold day == 7
            trigger:
                funds += 600

        @threshold day == 11
            trigger:
                funds += 1500

        @threshold day == 14
            trigger:
                funds += 1000

        @threshold stress >= 15
            log: "周老压力初显，孙子发来担忧"
            trigger:
                mail: mail_zhao_stress_warning

        @threshold stress >= 25
            log: "周老健康状况恶化，医院发来警告"
            trigger:
                mail: mail_zhao_health_warning

        @threshold stress >= 35
            when: stage < 99
            log: "周老因压力过大被送往医院"
            trigger:
                set_stage: 99
                mail: mail_zhao_hospital

---

@event zhao_01_medal
    chain: chain_zhao
    trigger: stage == 0

    @item zhao_item_medal
        name: "一等功勋章 (编号029)"
        category: "古玩"
        condition: "磨损"
        visual_description: "一枚沉甸甸的军功章，珐琅面有裂纹。"
        history: "79年那会儿，全连就剩下三个人。"
        appraisal_note: "背刻名字与持有人不符，疑似战友遗物。"
        archive_summary: "周老为了给孙子攒婚礼红包，典当了生死之交的遗物。"
        real_value: 8000
        uncertainty: 0.3
        stolen: false
        fake: false
        sentimental: true

        @traits
            @trait trait_zhao_ribbon
                name: "后配绶带"
                type: FLAW
                description: "绶带颜色极新，非原装。"
                value_impact: -0.1
                discovery: 0.3

            @trait trait_zhao_name
                name: "背刻姓名 '张援朝'"
                type: STORY
                description: "背面刻的名字不是周守义。"
                value_impact: 0
                discovery: 0.2

            @trait trait_zhao_rare
                name: "编号029"
                type: STORY
                description: "早期批次，收藏市场极度稀缺。"
                value_impact: 2.0
                discovery: 0.9
                @dialogue_trigger
                    player: "这编号... 市场上有很多人在找。"
                    customer: "别卖给那些倒爷！这是给我兄弟留的位置！"

    @customer
        name: "周守义"
        description: "72岁的老兵，腿脚不便，拄着拐杖。"
        avatar: "elder_zhao_v2"
        desired: 2000
        minimum: 1500
        max_repayment: 2500
        patience: 4
        mood: "Neutral"
        tags: [Emotional, HighMoralStake]
        behavior_tags: [SAVVY, SENTIMENTAL]
        redemption_resolve: Strong

        @dialogue
            greeting: "老板，看看这个。我不卖，就当几天。"
            pawn_reason: "孙子下个月结婚，我这当爷爷的，得凑个像样的红包。瞒着他的，别声张。"
            redemption_plea: "只要退休金一到账，我就来赎。这东西比我的命还重。"
            negotiation_dynamic: "能不能... 稍微高点？我想给孩子买个好的。"
            rejected: "这... 那我再去别处看看。"

            @accepted
                fair: "谢谢！到期我准时来。"
                fleeced: "唉... 凑合吧。"
                premium: "敬礼！你是个公道人！"

            @rejection_lines
                standard: "打扰了。"
                angry: "没眼光。"
                desperate: "求你了，孩子等着呢..."

            @exit
                grateful: "谢谢... 谢谢。东西放你这，我放心。"
                neutral: "回见。保管好啊。"
                resentful: "唉... 世风日下。"
                desperate: "[老人拄着拐杖，颤颤巍巍地转身，背影显得格外佝偻]"

    @outcomes
        deal_charity:
            add_funds_deal
            set_stage: 1
            trust += 10
            mail: mail_zhao_rumor delay: 2
            mail: mail_zhao_01_charity

        deal_aid:
            add_funds_deal
            set_stage: 1
            trust += 5
            mail: mail_zhao_rumor delay: 2
            mail: mail_zhao_01_charity

        deal_standard:
            add_funds_deal
            set_stage: 1
            mail: mail_zhao_rumor delay: 2

        deal_shark:
            add_funds_deal
            set_stage: 1
            stress += 10
            mail: mail_zhao_rumor delay: 2
            mail: mail_zhao_01_shark
            mail: mail_zhao_hospital_update delay: 4

    @on_reject
        deactivate_chain
`;

export function testZhaoDSL(): TestResult {
    return runStoryComparison({
        name: 'Zhao',
        dslContent: ZHAO_DSL_CHAIN,
        tsChainInit: ZHAO_CHAIN_INIT,
        tsEvents: ZHAO_EVENTS
    });
}

export function runZhaoTests(): void {
    const result = testZhaoDSL();
    console.log(formatTestResults('Zhao', result));
}
