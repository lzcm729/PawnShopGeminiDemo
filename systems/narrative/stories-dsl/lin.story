@story lin
    name: "小林"

---

@chain chain_lin
    npc_name: "小林"
    active: false
    stage: 0

    @variables
        funds = 10000
        hope = 80

---

@event lin_01_watch
    chain: chain_lin
    trigger: stage == 0

    @item lin_item_watch
        condition: "需保养"
        history: "爷爷留下的，我也不懂表。"
        appraisal_note: "劳力士'保罗纽曼'迪通拿，极品捡漏！"
        archive_summary: "价值连城的古董表。"

    @customer
        name: "小林"
        description: "背着书包的大学生，眼神清澈。"
        avatar: "student_lin"
        desired: 2000
        minimum: 800
        max_repayment: 4000
        pawn_term_days: 1
        patience: 5
        mood: "Neutral"
        tags: [Opportunity]
        behavior_tags: [NAIVE]
        redemption_resolve: Weak

        @dialogue
            greeting: "你好，请问这里收旧东西吗？"
            pawn_reason: "想买显卡，拿爷爷的旧表换点钱。"
            redemption_plea: "应该没人要了吧，不赎了。"
            negotiation_dynamic: "啊？这破表这么值钱吗？"

            @accepted
                fair: "太棒了！"
                fleeced: "够买入门卡了，谢谢！"
                premium: "老板你是大善人！"

            rejected: "哦，那我再去问问。"

            @rejection_lines
                standard: "那我拿回家吧。"
                angry: "怎么这样..."
                desperate: "少给点也行啊..."

            @exit
                grateful: "谢谢老板！明天我就来赎回！"
                neutral: "那我先走了，明天见。"
                resentful: "......"
                desperate: "[他背起书包，肩膀垮了下来，像是个做错事的孩子]"

    @outcomes
        deal_charity:
            set_stage: 1

        deal_aid:
            set_stage: 1

        deal_standard:
            set_stage: 1

        deal_shark:
            set_stage: 1

    @on_reject
        deactivate_chain

    core_item: lin_item_watch

    @expiry_flows
        @redemption
            @accept
                deactivate_chain

            @refuse
                hope -= 50
                deactivate_chain

        @renewal
            @accept
                hope += 10

            @refuse
                hope -= 30
                deactivate_chain

        @no_show
            @keep
                deactivate_chain
