/**
 * Emma Story DSL Test
 * Tests chain structure and first event only due to story complexity
 */

import { runStoryComparison, formatTestResults, TestResult } from './testUtils';
import { EMMA_CHAIN_INIT, EMMA_EVENTS } from '../../stories/emma';

// Simplified DSL for chain + first event test
export const EMMA_DSL_PARTIAL = `
@story emma
    name: "艾玛"

---

@chain chain_emma
    npc_name: "艾玛"
    active: true
    stage: 0

    @variables
        funds = 500
        hope = 50
        job_chance = 0
        has_laptop = 1
        redeem_attempted = 0
        struggle_occurred = 0
        breakdown_timer = 0
        interview_failures = 0
        days_since_interview = 0
        breaking_point_sent = 0

    @simulation_rules
        @delta funds -50
            log: "日常开销"

        @delta days_since_interview 1
            when: stage == 3
            log: "等待面试结果中..."

        @compound hope < 30 -> job_chance -5
            cap: 0..100
            log: "心态崩溃影响了面试表现 (Job Chance -5)"

        @compound hope >= 80 -> job_chance +2
            cap: 0..100
            log: "自信的状态让面试官印象深刻 (Job Chance +2)"

        @threshold hope < 10
            when: stage < 5
            log: "彻底崩溃，男友离开了她"
            trigger:
                set_stage: 4
                mail: mail_emma_boyfriend_left

        @chance job_chance
            when: stage == 3
            on_success:
                funds += 3000
                job_chance = 0
                hope += 50
                set_stage: 5
                mail: mail_emma_got_job delay: 1
            on_fail:
                hope -= 15
                interview_failures += 1
            success_log: "收到录用通知书！(OFFER RECEIVED)"
            fail_log: "面试再次被拒..."

        @threshold interview_failures >= 3
            when: stage == 3
            log: "连续面试失败，信心受挫"
            trigger:
                mail: mail_emma_interview_failed_3x

        @threshold interview_failures == 1
            when: stage == 3
            log: "第一次面试失败"
            trigger:
                mail: mail_emma_interview_failed_once

        @threshold interview_failures == 2
            when: stage == 3
            log: "第二次面试失败"
            trigger:
                mail: mail_emma_interview_failed_twice

        @threshold hope <= 15
            when: breakdown_timer == 0
            log: "男友即将离开的预警"
            trigger:
                mail: mail_emma_coming_for_ring
                breakdown_timer = 1

        @threshold hope <= 25
            when: breaking_point_sent == 0
            log: "艾玛发来崩溃预警邮件"
            trigger:
                mail: mail_emma_breaking_point
                breaking_point_sent = 1

    @fate_hints
        @hint [priority:10]
            when: hope >= 80
            text: "（她的步伐轻快，嘴角甚至带着一丝若有若无的微笑）"
            text: "（看起来即使在阴雨天，她的心情也很不错）"
            text: "（眼神里有了光彩，不再像上次那样躲闪）"

        @hint [priority:10]
            when: hope <= 20
            text: "（她的眼神空洞，仿佛灵魂已经被抽走了一半）"
            text: "（她长时间地盯着地板，手指在无意识地抽搐）"
            text: "（身上带着一股好几天没洗澡的颓废气息）"

---

@event emma_01_clothes
    chain: chain_emma
    trigger: stage == 0

    @item emma_item_clothes
        name: "名牌职业套装"
        category: "服饰"
        visual_description: "当季新款的高定职业套装，用料考究。"
        history: "穿这套衣服签下了我的第一个大单，那是我的高光时刻。"
        appraisal_note: "做工精良，二手市场的硬通货。"
        archive_summary: "艾玛为了应对失业危机，典当了她的战袍。"
        real_value: 1200
        stolen: false
        fake: false
        sentimental: true

        @traits
            @trait t_emma_01_tag
                name: "干洗标签"
                type: STORY
                description: "领口挂着干洗标签，保养得很好。"
                value_impact: 0
                discovery: 0.3

            @trait t_emma_01_stain
                name: "墨水渍"
                type: FLAW
                description: "袖口内侧有一道不起眼的墨水划痕。"
                value_impact: -0.1
                discovery: 0.5

    @customer
        name: "艾玛"
        description: "年轻女性，穿着精致，但眉宇间透着焦虑。"
        avatar: "emma_optimistic"
        desired: 1000
        minimum: 800
        max_repayment: 1500
        patience: 3
        mood: "Neutral"
        tags: [Story, LowRisk]
        behavior_tags: [SAVVY]
        redemption_resolve: Strong

        @dialogue
            greeting: "你好，老板。这些衣服还要吗？"
            pawn_reason: "刚收到裁员通知... 不过别担心，这只是暂时的周转。他说让我放轻松，反正房租他能撑一个月。这套衣服是我的战袍，面试和入职都得穿它。"
            redemption_plea: "我面试一旦通过，拿了安家费就会来赎。入职第一天必须穿这套，这是我的幸运战袍。"
            negotiation_dynamic: "能不能再高一点？这可是去年的走秀款。"
            rejected: "好吧... 我再去别家问问，也许有人识货。"

            @accepted
                fair: "谢谢。我会回来的。"
                fleeced: "谢谢... 至少够付房租了。"
                premium: "天哪，你真是个好人！这对我帮助太大了。"

            @rejection_lines
                standard: "谢谢。"
                angry: "这衣服这价？开玩笑。"
                desperate: "..."

            @exit
                grateful:
                    when hope >= 65: "谢谢！回去告诉他这个好消息，他最近也挺烦的。"
                    default: "真的很感谢你！等我找到工作，第一时间来赎！"
                neutral: "回见。帮我保管好它。——啊，得赶紧回去了，他不喜欢我在外面待太久。"
                resentful:
                    when hope < 45: "二十的利... 算了，能拿多少是多少吧。回头还得算算怎么还得起。"
                    default: "没想到这行也这么黑... 算了。"
                desperate: "[她默默地把钱塞进包里，低着头快步走了出去]"

    @outcomes
        deal_charity:
            add_funds_deal
            set_stage: 1
            hope = 70
            job_chance = 30
            mail: mail_emma_01_charity
            mail: mail_emma_stage1_hopeful delay: 2

        deal_aid:
            add_funds_deal
            set_stage: 1
            hope = 65
            job_chance = 25
            mail: mail_emma_01_charity
            mail: mail_emma_stage1_hopeful delay: 2

        deal_standard:
            add_funds_deal
            set_stage: 1
            hope = 60
            job_chance = 20
            mail: mail_emma_stage1_anxious delay: 2

        deal_shark:
            add_funds_deal
            set_stage: 1
            hope = 40
            job_chance = 10
            mail: mail_emma_01_shark
            mail: mail_emma_stage1_anxious delay: 2

    @on_reject
        set_stage: 1
        hope = 40
        mail: mail_emma_01_rejected

    core_item: emma_item_clothes
`;

export function testEmmaDSL(): TestResult {
    return runStoryComparison({
        name: 'Emma',
        dslContent: EMMA_DSL_PARTIAL,
        tsChainInit: EMMA_CHAIN_INIT,
        tsEvents: EMMA_EVENTS
    });
}

export function runEmmaTests(): void {
    const result = testEmmaDSL();
    console.log(formatTestResults('Emma', result));
}
