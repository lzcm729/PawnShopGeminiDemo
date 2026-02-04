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

@mail mail_zhao_offer
    sender: "匿名收藏顾问"
    subject: "关于那套勋章的报价"
    body: """老板，

我看到你店里收了一张立功证书。如果我没猜错，那枚编号029的勋章也在你手里吧？

单卖勋章不值钱，但如果证书和勋章能凑成一套，那就是另一回事了。

我代表一位海外买家出价：$38,000 收购整套（勋章+证书+合影）。

我会在 Day 10 左右再次登门。届时离婚礼（27号）只剩一周多，那老头应该急着要东西。

希望到时候东西还在你店里。"""

---

@mail mail_zhao_good
    sender: "小孙子"
    subject: "爷爷的婚礼致辞"
    body: """当铺老板：

爷爷让我给您发这封邮件。昨天的婚礼上，爷爷穿着旧军装，胸前戴着那枚勋章给我们证婚。虽然他腿脚不好，但那天他站得比谁都直。

他说那是他这辈子最体面的一天。谢谢您没让他把荣誉给卖了。

附上几张喜糖的照片，和一点心意（{{amount}}）。"""
    cash: 200

---

@mail mail_zhao_good_extended
    sender: "小孙子"
    subject: "爷爷说你是好人"
    body: """当铺老板：

爷爷让我特别感谢你当时同意延期。他说如果不是你通融，勋章早就没了。

婚礼上爷爷戴着那枚勋章，站得笔直。他说那是他这辈子最体面的一天。

附上喜糖和一点心意（{{amount}}）。爷爷说，做生意讲究诚信，但更难得的是讲义气。

祝生意兴隆！"""
    cash: 300

---

@mail mail_zhao_evil
    sender: "匿名"
    subject: "无题"
    body: """听说那个老兵在孙子的婚礼上晕倒了。因为没钱买药，也没脸见人。

而你赚了三万八，对吧？

这钱花得安心吗？这附近的老街坊都在议论这件事。我看你这店也没必要开下去了。"""

---

@mail mail_zhao_hostile
    sender: "孙子 小周"
    subject: "严正抗议"
    body: """关于我爷爷的勋章被贵店强制扣留一事，我们已经咨询了律师。

虽然你们的合同条款可能在法律上能够站住脚，但在道德上你们已经破产了。

爷爷现在精神状态很差，如果他有什么三长两短，我们绝对不会善罢甘休。"""

---

@mail mail_zhao_sold_generic
    sender: "孙子 小周"
    subject: "遗憾"
    body: """爷爷昨天再次进了ICU。

知道勋章已经找不回来了，他一句话也没说，只是默默流眼泪。

那是他一辈子的念想。也许对你来说那只是一件商品，但对我们来说，那是无价之宝。

你不懂尊重，也不配做这行生意。"""

---

@mail mail_zhao_plea
    sender: "周守义"
    subject: "请再宽限几天"
    body: """老板，

实在对不住。没能凑齐钱把老伙计赎回去，甚至连利息都交不上。

单位的退休金还没发下来，医院这边又催着缴费，我实在是走投无路了。

我知道规矩，东西现在归您处置。但我求求你，千万别把那东西卖了。那不是铁片，那是我的命。

再给我几天时间，我就是去卖血也会把钱凑齐的。求你了。

老周"""

---

@mail mail_zhao_rumor
    sender: "同行老李"
    subject: "有人在打听老物件"
    body: """老弟：

最近有个穿西装的在咱们这片转悠，专门打听老军功章的事。听说他背后是个大买家，出手很阔绰。

你店里如果有这类东西，可得留个心眼。这种人看着体面，背后的道道多着呢。

对了，听说那老兵的孙子婚礼是27号。你可得把东西保管好了。

老李"""

---

@mail mail_zhao_hospital
    sender: "孙子 小周"
    subject: "爷爷住院了"
    body: """当铺老板：

我爷爷昨晚突然昏倒了，现在在医院抢救。医生说是心脏问题，可能跟最近压力太大有关。

他一直念叨着什么勋章和欠债的事。我不知道你们之间发生了什么，但我想你应该知道这件事。

婚礼推迟了。爷爷说过"不能让老伙计在外面过夜"，可现在他自己都不知道能不能出院了。

我会尽快联系你处理那些东西的。"""

---

@mail mail_zhao_tragedy
    sender: "社区通知"
    subject: "关于周守义老人的情况"
    body: """致相关人士：

周守义老人因经济困难和精神压力，于昨日被送往医院。他的孙子婚礼已推迟。

老人在病床上一直念叨着什么"勋章"和"老伙计"。如果您知道相关情况，请与我们联系。"""

---

@mail mail_zhao_01_charity
    sender: "周守义"
    subject: "谢谢你，老板"
    body: """老板，

今天多谢你帮忙。这个价格比我预想的好。

孙子的婚礼是27号，我得抓紧时间把红包凑齐。等退休金一到账，我第一时间来赎。

你是个公道人。

老周"""

---

@mail mail_zhao_01_shark
    sender: "周守义"
    subject: "（无主题）"
    body: """老板，

钱是少了点，但有总比没有好。

我得去医院看看腿了。这老毛病，一受气就犯。

老周"""

---

@mail mail_zhao_03_charity
    sender: "周守义"
    subject: "住院押金交了"
    body: """老板，

多亏你今天帮我一把，住院押金总算交上了。医生说要观察几天。

证书放你那，我放心。千万别跟勋章拆散了。

老周"""

---

@mail mail_zhao_03_shark
    sender: "周守义"
    subject: "..."
    body: """老板，

这点钱... 也就够交一半押金。剩下的我再想办法吧。

腿疼得厉害，心里也堵得慌。

老周"""

---

@mail mail_zhao_stress_warning
    sender: "孙子 小周"
    subject: "关于我爷爷"
    body: """当铺老板：

我是周守义的孙子。最近爷爷的状态不太好，血压一直高。

他不愿意告诉我发生了什么，但我看到他整夜整夜睡不着，嘴里念叨着什么勋章的事。

如果你知道什么，请告诉我。谢谢。

小周"""

---

@mail mail_zhao_health_warning
    sender: "社区医院"
    subject: "患者周守义的健康提醒"
    body: """致相关人士：

患者周守义近日血压持续偏高，情绪波动较大。

医生建议患者减少压力，避免剧烈情绪起伏。如有相关事宜，请尽量给予老人关照。

此致"""

---

@mail mail_zhao_hospital_update
    sender: "孙子 小周"
    subject: "爷爷的情况"
    body: """当铺老板：

爷爷的腿犯了老毛病，这两天一直在医院。医生说是老伤复发，加上最近压力大。

他一直念叨着什么勋章的事，说那是老战友的命。我不太懂你们之间的事，但爷爷说你是个好人。

等爷爷好点了，他会去你那取东西的。拜托照顾好那些东西。

小周"""

---

@mail mail_zhao_redeem_success
    sender: "周守义"
    subject: "老伙计回家了"
    body: """老板，

勋章拿回来了，放在枕头底下，心里踏实多了。

孙子的婚礼定在27号。我想穿着军装、戴着这枚勋章去证婚。这是我这辈子最体面的事。

等证书也赎回来，我请你喝喜酒。

老周"""

---

# Event 1: First pawn - the medal
@event zhao_01_medal
    chain: chain_zhao
    trigger: stage == 0

    @item zhao_item_medal
        condition: "磨损"
        history: "79年那会儿，全连就剩下三个人。"
        appraisal_note: "背刻名字与持有人不符，疑似战友遗物。"
        archive_summary: "周老为了给孙子攒婚礼红包，典当了生死之交的遗物。"
        sentimental: true

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

---

# Event 2: First collector visit - low offer
@event zhao_02_collector_low
    chain: chain_zhao
    trigger: stage == 1
    trigger: day >= 4
    target_item: zhao_item_medal

    @interaction
        type: PURCHASE_OFFER
        target_item: zhao_item_medal
        title: "收购邀约：勋章029"
        description: "一份收购合同。"
        reason: "我是来帮我的客户解决遗憾的。"
        note: "这是违约出售客户当品。"
        offer_value: 5000

    @customer
        name: "收藏顾问"
        description: "西装革履，眼神精明。"
        avatar: "collector_agent"
        interaction_type: NEGOTIATION
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 3
        mood: "Neutral"
        tags: [HighRisk, Opportunity]
        redemption_resolve: None
        negotiation_style: Aggressive
        ask_price: 5000

        @dialogue
            greeting: "老板，听说你收了一枚编号029的勋章？"
            pawn_reason: "我出价 $5,000。既然证书不在，这也就是个铁片。"
            redemption_plea: "你只需告诉那老头东西丢了，赔他点钱就行。"
            negotiation_dynamic: "嫌少？现在没有证书原件，这东西也就值这个价。"
            rejected: "不急。等那老头把证书送来，我会再来的。"

            @accepted
                fair: "明智的选择。"
                fleeced: "成交。"
                premium: "成交。"

            @rejection_lines
                standard: "回见。"
                angry: "不识抬举。"
                desperate: "..."

            @exit
                grateful: "合作愉快。钱货两清。"
                neutral: "回见。"
                resentful: "你会后悔的。"
                desperate: "..."

    @outcomes
        deal_standard:
            add_funds: 5000
            force_sell_target: zhao_item_medal
            set_stage: 2
            medal_sold_early = 1
            modify_rep: -10

    @on_reject
        set_stage: 2

---

# Event 3: Second pawn - certificate
@event zhao_03_cert
    chain: chain_zhao
    trigger: stage == 2
    trigger: day >= 6

    @item zhao_item_cert
        condition: "泛黄"
        history: "这上面... 记着那天牺牲的所有人。"
        appraisal_note: "这是'证明链'的关键部分。有了它，勋章身价倍增。"
        archive_summary: "周老因为药物费用再次典当。"
        sentimental: true

    @customer
        name: "周守义"
        description: "比上次更憔悴了，手里捏着医院缴费单。"
        avatar: "elder_zhao_v2"
        desired: 3000
        minimum: 2000
        max_repayment: 4000
        patience: 3
        mood: "Neutral"
        tags: [Emotional]
        redemption_resolve: Strong
        negotiation_style: Desperate

        @dialogue
            greeting:
                when stress >= 20: "老板... [老人的手在发抖，脸色发白] 我... 我又来了..."
                when stress >= 10: "老板... [老人脸色不太好] 我又来了。"
                when funds < 0: "老板... 我又来了。这次是真的没办法了。"
                default: "老板... 我又来了。"
            pawn_reason: "这腿的老毛病犯了，医院催缴住院押金。我实在是走投无路了..."
            redemption_plea: "证书和勋章是一套，千万别拆散了。"
            negotiation_dynamic:
                when funds < -500: "少给点也行... 只要能付住院押金就好..."
                default: "这可是原件... 救命钱，不能少啊。"
            rejected: "这... 那我只能去卖血了..."

            @accepted
                fair: "谢谢！救命之恩！"
                fleeced: "唉... 先救急吧。"
                premium: "好人一生平安！"

            @rejection_lines
                standard: "打扰了。"
                angry: "..."
                desperate: "求求你..."

            @exit
                grateful: "大恩不言谢。我去交钱了。"
                neutral: "回见。"
                resentful: "..."
                desperate: "[老人擦了擦眼角，紧紧攥着钱，像是怕它飞了一样]"

    @outcomes
        deal_charity:
            add_funds_deal
            set_stage: 3
            trust += 5
            mail_if: mail_zhao_offer delay: 1 when: medal_sold_early == 0
            mail: mail_zhao_03_charity

        deal_aid:
            add_funds_deal
            set_stage: 3
            trust += 3
            mail_if: mail_zhao_offer delay: 1 when: medal_sold_early == 0
            mail: mail_zhao_03_charity

        deal_standard:
            add_funds_deal
            set_stage: 3
            mail_if: mail_zhao_offer delay: 1 when: medal_sold_early == 0

        deal_shark:
            add_funds_deal
            set_stage: 3
            mail_if: mail_zhao_offer delay: 1 when: medal_sold_early == 0
            stress += 20
            mail: mail_zhao_03_shark

    @on_reject
        deactivate_chain
        modify_rep: -10

---

# Event 4: First redemption check - medal
@event zhao_04_redeem_medal
    chain: chain_zhao
    type: REDEMPTION_CHECK
    trigger: stage == 3
    trigger: day >= 8
    target_item: zhao_item_medal
    failure_mail: mail_zhao_plea

    @customer
        name: "周守义"
        description: "稍微精神了一些，但走路还是瘸着。"
        avatar: "elder_zhao_v2"
        interaction_type: REDEEM
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 5
        mood: "Happy"
        redemption_resolve: Strong
        negotiation_style: Professional

        @dialogue
            greeting:
                when trust >= 70: "老板！好久不见。钱凑齐了，多亏你当时帮我一把。"
                when trust <= 30: "钱带来了。赎回吧。"
                default: "老板，钱凑齐了。连本带利，我想把勋章赎回去。"
            pawn_reason: ""
            redemption_plea: "证书... 证书还要再压几天。"
            negotiation_dynamic: "..."
            rejected: "..."

            @accepted
                fair: "老伙计，我们回家。"
                fleeced: "..."
                premium: "..."

            @rejection_lines
                standard: "..."
                angry: "..."
                desperate: "..."

            @exit
                grateful: "敬礼！"
                neutral: "走了。"
                resentful: "..."
                desperate: "..."

    @on_failure
        set_stage: 4

    @on_extend
        set_stage: 4
        medal_extended = 1

    @dynamic_flows
        core_lost:
            dialogue: "你说什么？勋章卖了？... 那是我的命啊！你... 你这个骗子！赔钱有什么用？！"
            outcome:
                set_stage: 4
                modify_rep: -30

        all_safe:
            dialogue: "老板，钱凑齐了。连本带利，我想把勋章赎回去。只有放在自己枕头底下，心里才踏实。"
            outcome:
                redeem_target
                set_stage: 4
                mail: mail_zhao_redeem_success

        core_safe:
            dialogue: "老板，钱凑齐了。连本带利，我想把勋章赎回去。只有放在自己枕头底下，心里才踏实。"
            outcome:
                redeem_target
                set_stage: 4
                mail: mail_zhao_redeem_success

        hostile_takeover:
            dialogue: "强买强卖？好... 好... 你们这些吸血鬼。"
            outcome:
                set_stage: 4
                modify_rep: -50
                mail: mail_zhao_hostile delay: 1

---

# Event 5a: Second collector visit - certificate only (if medal was sold early)
@event zhao_05_collector_cert_only
    chain: chain_zhao
    trigger: stage == 4
    trigger: day >= 10
    trigger: medal_sold_early == 1
    target_item: zhao_item_cert

    @interaction
        type: PURCHASE_OFFER
        target_item: zhao_item_cert
        title: "收购邀约：证书与合影"
        description: "一份收购合同。"
        reason: "勋章已经到手了，现在只差证书。"
        note: "只买证书，价格自然低得多。"
        offer_value: 8000

    @customer
        name: "收藏顾问"
        description: "满面春风，手里拿着上次买的勋章。"
        avatar: "collector_agent"
        interaction_type: NEGOTIATION
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 3
        mood: "Happy"
        tags: [HighRisk]
        redemption_resolve: None
        negotiation_style: Aggressive
        ask_price: 8000

        @dialogue
            greeting: "老板，勋章我已经收到了。现在只差那张证书和合影就能凑齐整套了。"
            pawn_reason: "证书单卖不值钱，$8,000，我已经很厚道了。"
            redemption_plea: "配合一下，大家都方便。"
            negotiation_dynamic: "没有勋章，这证书也就是张废纸。想想清楚。"
            rejected: "随便你。没有证书，那勋章也不完整。"

            @accepted
                fair: "明智。"
                fleeced: "成交。"
                premium: "合作愉快。"

            @rejection_lines
                standard: "可惜了。"
                angry: "不识抬举。"
                desperate: "..."

            @exit
                grateful: "这下整套齐了。"
                neutral: "回见。"
                resentful: "你会后悔的。"
                desperate: "..."

    @outcomes
        deal_standard:
            add_funds: 8000
            force_sell_target: zhao_item_cert
            set_stage: 99
            modify_rep: -15
            mail: mail_zhao_evil delay: 2

    @on_reject
        set_stage: 5

---

# Event 5b: Second collector visit - full set (if medal not sold)
@event zhao_05_collector_high
    chain: chain_zhao
    trigger: stage == 4
    trigger: day >= 10
    trigger: medal_sold_early == 0
    target_item: zhao_item_medal

    @interaction
        type: PURCHASE_OFFER
        target_item: zhao_item_medal
        title: "收购邀约：全套立功档案"
        description: "一份加急的收购合同。"
        reason: "客户说，这是最后一次报价。"
        note: "这是出卖灵魂的价格。"
        offer_value: 38000

    @customer
        name: "收藏顾问"
        description: "满面春风，志在必得。"
        avatar: "collector_agent"
        interaction_type: NEGOTIATION
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 3
        mood: "Happy"
        tags: [HighRisk, MoralEvent]
        redemption_resolve: None
        negotiation_style: Aggressive
        ask_price: 38000

        @dialogue
            greeting: "老板，考虑得怎么样了？勋章和证书都在你手里吧？"
            pawn_reason: "一口价，$38,000。这可是那老头一辈子也见不到的钱。"
            redemption_plea: "有了这笔钱，你完全可以给那老头一笔丰厚的赔偿，他会感谢你的。"
            negotiation_dynamic: "做生意讲究利益最大化，情怀能当饭吃吗？"
            rejected: "你... 你会后悔的。这种机会只有一次！"

            @accepted
                fair: "这就对了。识时务者为俊杰。"
                fleeced: "明智。"
                premium: "合作愉快。"

            @rejection_lines
                standard: "不可理喻。"
                angry: "傻子！"
                desperate: "..."

            @exit
                grateful: "你会感谢我的。"
                neutral: "合作愉快。"
                resentful: "不可理喻。"
                desperate: "..."

    @outcomes
        deal_standard:
            add_funds: 38000
            force_sell_all
            set_stage: 99
            modify_rep: -20
            mail: mail_zhao_evil delay: 2

    @on_reject
        set_stage: 5

---

# Event 6: Final redemption - certificate
@event zhao_06_final_redemption
    chain: chain_zhao
    type: REDEMPTION_CHECK
    trigger: stage == 5
    trigger: day >= 12
    target_item: zhao_item_cert
    failure_mail: mail_zhao_plea

    @customer
        name: "周守义"
        description: "穿着旧军装，胸前别着那枚勋章（如果已赎回）。"
        avatar: "elder_zhao_uniform"
        interaction_type: REDEEM
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 5
        mood: "Happy"
        redemption_resolve: Strong
        negotiation_style: Professional

        @dialogue
            greeting: "老板，我来接老伙计们回家了。明天就是孙子的婚礼。"
            pawn_reason: ""
            redemption_plea: ""
            negotiation_dynamic: "..."
            rejected: "..."

            @accepted
                fair: "敬礼！"
                fleeced: "..."
                premium: "..."

            @rejection_lines
                standard: "..."
                angry: "..."
                desperate: "..."

            @exit
                grateful: "[老人挺直腰板，行了一个标准的军礼]"
                neutral: "走了。"
                resentful: "..."
                desperate: "[老人什么也没说，只是默默地流着泪走了]"

    @on_failure
        deactivate_chain
        mail: mail_zhao_tragedy delay: 1
        modify_rep: -15

    @dynamic_flows
        all_safe:
            dialogue:
                when trust >= 70: "老板，婚礼上我要戴着这枚勋章。你是我们全家的恩人！"
                when trust <= 30: "东西拿回来了。以后不会再来了。"
                default: "老板，我来接老伙计们回家了。"
            outcome:
                redeem_all
                deactivate_chain
                mail_if: mail_zhao_good_extended when: medal_extended == 1
                mail_if: mail_zhao_good when: medal_extended == 0
                modify_rep: 20

        core_safe:
            dialogue: "还好证书还在... 勋章没了就没了吧。只要人还在，魂就在。"
            outcome:
                redeem_target
                deactivate_chain
                modify_rep: -5

        core_lost:
            dialogue: "都卖了？... 既然这样，我活着还有什么意思... 你毁了我的一切。"
            outcome:
                deactivate_chain
                modify_rep: -50
                mail: mail_zhao_sold_generic delay: 1
