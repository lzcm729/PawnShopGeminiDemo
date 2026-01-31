@story underworld
    name: "黑帮"

---

@chain chain_underworld
    npc_name: "黑帮"
    active: false
    stage: 0

    @variables
        days_since_trigger = 0
        targetItemId = 0

    @simulation_rules
        @delta days_since_trigger 1

        @threshold days_since_trigger == 2
            log: "黑帮发来威胁邮件"
            trigger:
                mail: mail_underworld_warning

---

@mail mail_underworld_warning
    sender: "[未知]"
    subject: "你会后悔的"
    body: """老板，

听说你店里收了一个不该收的东西 ({{relatedItemName}})。
我们的人很快会来"取回"它。

如果东西还在，我们可以当作什么都没发生。
如果不在... 夜路走多了，小心影子。

别报警。你知道的。"""

---

# Event 1: Mail trigger event (system event, no real interaction)
@event underworld_01_mail
    chain: chain_underworld
    trigger: days_since_trigger == 2

    @item underworld_dummy_mail
        name: "系统邮件触发"
        category: "其他"
        visual_description: ""
        history: ""
        appraisal_note: ""
        archive_summary: ""
        real_value: 0
        virtual: true

    @customer
        name: "System"
        description: ""
        avatar: ""
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 0
        mood: "Neutral"
        redemption_resolve: None
        negotiation_style: Professional

        @dialogue
            greeting: ""
            pawn_reason: ""
            redemption_plea: ""
            negotiation_dynamic: ""
            rejected: ""

            @accepted
                fair: ""
                fleeced: ""
                premium: ""

            @rejection_lines
                standard: ""
                angry: ""
                desperate: ""

            @exit
                grateful: "..."
                neutral: "..."
                resentful: "..."
                desperate: "..."

---

# Event 2: Thug comes to retrieve the item
@event underworld_02_retrieval
    chain: chain_underworld
    type: REDEMPTION_CHECK
    trigger: days_since_trigger == 5

    @item thug_dummy
        name: "赎回单"
        category: "其他"
        visual_description: ""
        history: ""
        appraisal_note: ""
        archive_summary: ""
        real_value: 0
        virtual: true

    @customer
        name: "刀疤脸"
        description: "穿着皮夹克，脖子上有纹身，眼神凶狠。"
        avatar: "thug_01"
        interaction_type: REDEEM
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 2
        mood: "Angry"
        tags: [HighRisk]
        redemption_resolve: Strong
        negotiation_style: Aggressive

        @dialogue
            greeting: "老板，生意不错啊。我是来拿回我的东西的。"
            pawn_reason: ""
            redemption_plea: "别废话。你知道我说的是什么。"
            negotiation_dynamic: "..."
            rejected: "..."

            @accepted
                fair: "算你识相。"
                fleeced: "..."
                premium: "..."

            @rejection_lines
                standard: "..."
                angry: "..."
                desperate: "..."

            @exit
                grateful: "懂事。"
                neutral: "两清。"
                resentful: "哼... 走路小心点。"
                desperate: "[冷冷地看了你一眼，做了一个割喉的手势]"

    @dynamic_flows
        all_safe:
            dialogue: "东西还在就好。拿着这点利息，以后招子放亮点。这东西不是你能碰的。"
            outcome:
                redeem_target
                deactivate_chain
                modify_rep: -10

        core_safe:
            dialogue: "东西还在就好。拿着这点利息，以后招子放亮点。这东西不是你能碰的。"
            outcome:
                redeem_target
                deactivate_chain
                modify_rep: -10

        core_lost:
            dialogue: "卖了？... 呵呵。胆子不小啊。那是老大的货，你也敢动？\n兄弟们，给我砸！"
            outcome:
                deactivate_chain
                add_funds: -2000
                modify_rep: -30
