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
        condition: "99新"
        history: "上个月在巴黎买的，我老公送的。"
        appraisal_note: "高仿A货。"
        archive_summary: "一只精仿的奢侈品包。"
        fake: true

    @customer
        name: "苏珊"
        description: "浑身名牌，香水味很浓，但神色慌张。"
        avatar: "lady_susan"
        desired: 20000
        minimum: 5000
        max_repayment: 30000
        patience: 3
        mood: "Neutral"
        tags: [Scam, Fake]
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
