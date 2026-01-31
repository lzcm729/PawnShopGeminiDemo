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

        @hint [priority:6]
            when: hope >= 40
            text: "（她努力挤出一个微笑，但眼底的疲惫藏不住）"
            text: "（不时看向手机，像是在等什么重要消息）"

        @hint [priority:8]
            when: hope <= 40
            text: "（她的声音有些沙哑，像是好几天没怎么说话）"
            text: "（肩膀微微塌着，整个人像是被抽走了力气）"
            text: "（手指在不停地绞着衣角，透露出内心的不安）"

        @hint [priority:5]
            when: funds >= 3000
            text: "（换了一件看起来很新的外套，整个人精神了不少）"
            text: "（手里拿着一杯刚买的咖啡，显然手头宽裕了一些）"

        @hint [priority:5]
            when: funds <= 100
            text: "（嘴唇干裂，看起来好像为了省钱连水都舍不得买）"
            text: "（衣服上的污渍比上次更多了，显然生活陷入了困顿）"

        @hint [priority:8]
            when: job_chance >= 50
            text: "（手里紧紧攥着一个文件夹，看起来那是她的希望）"
            text: "（正在整理领口，似乎刚从一个重要的场合回来）"

        @hint [priority:7]
            when: interview_failures >= 2
            text: "（她的眼圈发红，像是刚哭过）"
            text: "（手里攥着一张皱巴巴的纸，上面写着什么联系方式）"
            text: "（指甲被咬得参差不齐，透露着焦虑）"

        @hint [priority:9]
            when: hope <= 30
            text: "（她说话时总是下意识看向地面，好像在躲避什么）"
            text: "（每说完一句话都要停顿一下，像是在确认自己有没有说错）"
            text: "（她的肩膀微微向内缩，整个人看起来比上次更小了）"

        @hint [priority:7]
            when: hope <= 40
            text: "（她的指甲缝有咬过的痕迹，边缘参差不齐）"
            text: "（她不时看一眼手机，又马上把它塞回口袋）"
            text: "（她的笑容持续不到一秒就消失了）"

---

# === MAILS ===

@mail mail_emma_success
    sender: "艾玛"
    subject: "我入职了！"
    body: """老板：

告诉你一个好消息，我被那家跨国公司录取了！

还记得那台{{relatedItemName}}吗？如果那时候你像别人一样狠狠宰我一笔，或者因为我没钱就赶我走，我可能早就崩溃了。

面试官说我"状态很好，很有感染力"。我想，这是因为每次从你店里出来，我都觉得这个世界还有好人。你给我的不只是钱，还有信心。

这笔钱({{amount}})是我多付的利息，或者是... 感谢费。请你务必收下。

另外，那枚婚戒我也不打算卖了。生活好像又有希望了。

祝好，

艾玛"""
    cash: 500

---

@mail mail_emma_hate
    sender: "艾玛"
    subject: "你毁了一切"
    body: """我以为你会帮我... 结果你和其他吸血鬼没什么两样。

你卖掉了我的职业套装。那是我入职第一天必须穿的衣服。

HR说公司有着装要求，让我"准备好了再来"。可是Offer有时限...

我要离开这座城市了。我诅咒你，诅咒这家店永远不得安宁。"""

---

@mail mail_emma_boyfriend_left
    sender: "艾玛"
    subject: "一切都结束了"
    body: """我的男朋友走了。

今早我醒来，发现他的东西都不见了，只留下一张字条，说"你好自为之吧"。

我仔细想了想，从认识他到现在，好像... 我一直都是错的那个人。

之前当在店里的{{relatedItemName}}，我恐怕永远也没能力赎回来了。工作没指望，现在连他也走了。

我觉得好累。这个世界也许真的不需要我。"""

---

@mail mail_emma_plea
    sender: "艾玛"
    subject: "关于那套衣服..."
    body: """老板，

我现在还没凑齐赎金。面试结果还没出来，我还在等通知。

那套衣服对我真的很重要——如果拿到offer，入职第一天必须穿它。请千万不要把它挂牌出售，再宽限我几天。

拜托了。"""

---

@mail mail_emma_01_charity
    sender: "艾玛"
    subject: "谢谢你"
    body: """老板，

真的很感谢你。这个价格比我预期的高很多。

回去告诉他，他松了口气说"看吧，天无绝人之路"。

等我找到工作，第一个来赎！

艾玛"""

---

@mail mail_emma_01_shark
    sender: "艾玛"
    subject: "（无主题）"
    body: """好吧。有总比没有好。

回去他问我拿了多少，听完叹了口气没说话。

希望面试顺利吧。"""

---

@mail mail_emma_02_charity
    sender: "艾玛"
    subject: "撑过这周"
    body: """老板，

谢谢你又帮了我一把。这周的房租有着落了。

我把钱交给他，他数了数说"勉强够吧"。然后问我"你今天出门化妆了？给谁看？"

我说是去当铺... 他就不说话了。

面试还在继续，我不会放弃的。

艾玛"""

---

@mail mail_emma_02_shark
    sender: "艾玛"
    subject: "..."
    body: """这点钱... 也就够买几天泡面。

他看了一眼说"就这么点？你那破瓶子不是挺贵的吗"。

我没解释。解释也没用。"""

---

@mail mail_emma_03_charity
    sender: "艾玛"
    subject: "电脑的事"
    body: """老板，

谢谢你给了一个公道的价格。我知道这台电脑对我意味着什么，你也知道。

回去告诉他，他只是"哦"了一声就继续玩手机。

我会回来赎它的。一定。

艾玛"""

---

@mail mail_emma_03_shark
    sender: "艾玛"
    subject: "再见，老伙计"
    body: """这个价格... 算了，我没得选。

他说"你连台破电脑都卖不出好价钱"。

也许他说得对。我什么都做不好。"""

---

@mail mail_emma_03b_charity
    sender: "艾玛"
    subject: "也许还有希望"
    body: """老板，

谢谢你还愿意收这块表。

我本来已经放弃了。从你店里出来那一刻，我甚至想过去桥上吹吹风。

但你愿意帮我，哪怕是在我最落魄的时候。也许... 还有希望。

我决定再试一次。投简历、准备面试... 从头开始。

谢谢你没有放弃我。

艾玛"""

---

@mail mail_emma_03b_shark
    sender: "艾玛"
    subject: "（无主题）"
    body: """连这个价都压... 算了。

我已经不在乎了。"""

---

@mail mail_emma_redeem_failed
    sender: "艾玛"
    subject: "电脑的事..."
    body: """老板，

我凑不够赎金。

说好的 Offer 黄了，HR 说预算调整，岗位取消了。男朋友也开始抱怨我拖累他。

但我不想就这样放弃。明天我会再来，看看还有什么能换点钱的。

别放弃我。

艾玛"""

---

@mail mail_emma_coming_for_ring
    sender: "艾玛"
    subject: "他说要走了"
    body: """老板，

他跟我摊牌了。

他说受够了"和一个只会拖后腿的人在一起"。说我让他"每天都很压抑"。说当初就不该"可怜我"。

我求他再给我一点时间。他说"给你时间就是在浪费我的时间"。

也许... 他说得对。

如果他真的走了，我不知道还能撑多久。

艾玛"""

---

@mail mail_emma_got_job
    sender: "艾玛"
    subject: "我拿到 Offer 了！！！"
    body: """老板！！！

我拿到 Offer 了！！！是那家跨国公司！

下周一入职，我得穿那套衣服去报到。等我入职拿了安家费，马上来赎！千万帮我留着！

艾玛"""

---

@mail mail_emma_interview_failed_3x
    sender: "艾玛"
    subject: "我是不是真的不行"
    body: """老板，

又被拒了。这已经是第三次了。

HR说我"气质不够自信"。

也许他说得对。也许面试官说得对。也许所有人都对。只有我自己是错的。

我好累。"""

---

@mail mail_emma_stage1_hopeful
    sender: "艾玛"
    subject: "近况汇报"
    body: """老板，

这几天投了很多简历，有几家已经约了面试。感觉事情在往好的方向发展。

他说让我专心准备，家务他来做。也许... 一切都会好起来的。

艾玛"""

---

@mail mail_emma_stage1_anxious
    sender: "艾玛"
    subject: "有点焦虑"
    body: """老板，

简历投了很多，但都石沉大海。房东又开始催租了。

昨晚他翻了一下我的手机，说"你是不是偷偷买咖啡了"。我解释了半天...

如果这周还没消息，我可能还要来找你...

艾玛"""

---

@mail mail_emma_stage2_struggling
    sender: "艾玛"
    subject: "快撑不住了"
    body: """老板，

他开始抱怨我整天愁眉苦脸，说"你能不能振作点，我每天回来看你这张脸也很累"。

我也知道这样不好。但我控制不住。

冰箱空了，他说让我自己解决午饭。

艾玛"""

---

@mail mail_emma_stage3_desperate
    sender: "艾玛"
    subject: "（无主题）"
    body: """老板，

我不知道还能撑多久。

他最近总是很晚回家，回来也不怎么说话。我问他是不是在外面有事，他说"你管那么多干嘛，先把自己的事搞定"。

也许他也在想办法离开我吧。"""

---

@mail mail_emma_stage3_waiting
    sender: "艾玛"
    subject: "还在等"
    body: """老板，

面试已经过去三天了，还没收到回复。

我每天都在刷新邮箱。网吧的电脑太卡了，但我还是每天去。

他问我"有消息了吗"，我说还没，他就不再说话了。

那种沉默比骂我还难受。

艾玛"""

---

@mail mail_emma_stage3_nervous
    sender: "艾玛"
    subject: "是不是没戏了"
    body: """老板，

还是没消息。网上说如果一周没回复基本就凉了。

昨晚回去，他在收拾行李。我问他要去哪，他说"出差"。

可是他从来没出过差。

我没敢再问。

艾玛"""

---

@mail mail_emma_interview_failed_once
    sender: "艾玛"
    subject: "今天的面试"
    body: """老板，

今天的面试没过。HR说我"经验不够匹配"。

没关系，还有其他机会。我不会放弃的。

回去跟他说了，他说"意料之中"。

艾玛"""

---

@mail mail_emma_interview_failed_twice
    sender: "艾玛"
    subject: "又被拒了"
    body: """老板，

又被拒了。这次HR说我"状态不太好"。

也许他们说得对。最近确实睡不好，黑眼圈都遮不住了。

昨晚他说："你看你现在这样，谁敢要你？"

我知道他是在陈述事实。

艾玛"""

---

@mail mail_emma_expiry_plea
    sender: "艾玛"
    subject: "关于那套衣服..."
    body: """老板，

我知道典当期快到了。

我现在还没凑齐赎金。面试结果还没出来，我还在等通知。

那套衣服对我真的很重要——如果拿到offer，入职第一天必须穿它。请千万不要把它挂牌出售，再宽限我几天。

拜托了。

艾玛"""

---

@mail mail_emma_renewal_thanks
    sender: "艾玛"
    subject: "谢谢你愿意等我"
    body: """老板，

谢谢你同意续当。

我知道这不符合规矩，但你还是愿意帮我。这个世界上好人不多了。

我会努力的。一定会回来赎的。

艾玛"""

---

@mail mail_emma_renewal_rejected
    sender: "艾玛"
    subject: "我理解..."
    body: """老板，

我理解你的决定。毕竟这是生意。

只是... 那套衣服对我真的很重要。如果它被卖掉了...

算了，也许这就是我的命。

艾玛"""

---

@mail mail_emma_01_rejected
    sender: "艾玛"
    subject: "也许我太骄傲了"
    body: """老板，

我带着衣服去了别家。

那家给的更少。老板娘上下打量我，说"这种衣服现在不好卖"。

我最后还是当了。比你开的价低30%。

也许... 我不该那么骄傲。

艾玛"""

---

@mail mail_emma_laptop_rejected
    sender: "艾玛"
    subject: "我完了"
    body: """老板，

你不收我的电脑，我理解。也许它真的不值什么钱。

可是没有它，我做不了面试作业。
下周一就是截止日期了。

我想过去网吧，但网吧的电脑没有我需要的软件。
我想过借，但我不知道还能向谁开口。

也许这就是命吧。

艾玛"""

---

@mail mail_emma_laptop_sold
    sender: "艾玛"
    subject: "你怎么能...！"
    body: """你卖了我的电脑？！

里面有我所有的作品集！有我三年的心血！
我说过千万别动里面的文件！

我求过你的... 我求过你的...

你和其他人没什么两样。这个世界从来就不会帮我。"""

---

@mail mail_emma_laptop_plea
    sender: "艾玛"
    subject: "千万别卖电脑"
    body: """老板，

我算了一下，电脑的典当期快到了。

我知道我还没凑够赎金。面试结果还没出来。

但求你千万别把它卖掉。我的作品集还在里面。那是我唯一的机会了。

再等我几天。求你了。

艾玛"""

---

@mail mail_emma_laptop_renewal_thanks
    sender: "艾玛"
    subject: "谢谢你等我"
    body: """老板，

谢谢你同意续当。

我知道按规矩你不该等我，但你还是愿意帮我。

电脑对我真的很重要。我会努力的。

艾玛"""

---

@mail mail_emma_laptop_renewal_refused
    sender: "艾玛"
    subject: "我理解..."
    body: """老板，

我理解你的决定。毕竟这是生意。

只是... 那台电脑里有我所有的东西。

也许这就是我的命。

艾玛"""

---

@mail mail_emma_laptop_borrow_thanks
    sender: "艾玛"
    subject: "作品集弄好了"
    body: """老板，

谢谢你让我用电脑！

作品集终于导出来了，U盘里存了一份。网吧的电脑连压缩包都解不开，我差点绝望了。

面试官说三天内会有消息。我在等。

艾玛"""

---

@mail mail_emma_laptop_borrow_refused
    sender: "艾玛"
    subject: "还是谢谢你"
    body: """老板，

我理解你的难处。这是你的店，你有权拒绝。

我会想其他办法的。也许可以找图书馆...

艾玛"""

---

@mail mail_emma_left_city_laptop
    sender: "艾玛"
    subject: "再见"
    body: """老板，

我要离开这座城市了。

你还记得那天吗？我带着电脑来找你，求你帮帮我。你说不收。

我理解，也许它真的不值什么钱。但那是我最后的机会了。

没有电脑，我错过了面试作业的截止日期。没有面试，就没有工作。没有工作... 他也走了。

我不怪你。这个世界本来就是这样的。

再见。

艾玛"""

---

@mail mail_emma_breaking_point
    sender: "艾玛"
    subject: "快撑不住了"
    body: """老板，

我算了一下账。

当铺的利息、房租、水电... 每一笔都在催命。

有时候我会想，如果你当初给的价格再高一点，利息再低一点... 也许我不用这么拼命。

但我也知道，这不能怪你。毕竟你也是做生意的。

只是... 我快撑不住了。

艾玛"""

---

# === EVENTS ===

# Event 1: Professional Suit
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
        redemption_resolve: Strong
        negotiation_style: Professional

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

    @expiry_flows
        @redemption
            accept:
                hope += 20
                mail: mail_emma_renewal_thanks
            refuse:
                hope -= 30
                mail: mail_emma_renewal_rejected

        @renewal
            accept:
                hope += 15
                mail: mail_emma_renewal_thanks
            refuse:
                hope -= 25
                mail: mail_emma_renewal_rejected

        @no_show
            sell:
                hope -= 40
            keep:
                mail: mail_emma_expiry_plea delay: 1

---

# Event 2: Skincare Set
@event emma_02_skincare
    chain: chain_emma
    trigger: stage == 1
    trigger: funds <= 400

    @item emma_item_skincare
        name: "贵妇面霜礼盒"
        category: "奢侈品"
        visual_description: "一套未拆封的高级护肤品，包装精美。"
        history: "去年生日他说要送我这个，结果到了那天说'最近手头紧，你先垫一下，回头给你'。后来... 算了，不重要了。"
        appraisal_note: "虽然未拆封，但生产日期是一年前。"
        archive_summary: "艾玛的生活质量正在急剧下降。"
        real_value: 600
        stolen: false
        fake: false
        sentimental: false

        @traits
            @trait t_emma_02_exp
                name: "临期"
                type: FLAW
                description: "距离保质期仅剩3个月。"
                value_impact: -0.3
                discovery: 0.2

            @trait t_emma_02_spoon
                name: "配件缺失"
                type: STORY
                description: "包装有轻微撕扯痕迹，取样勺丢失。"
                value_impact: 0
                discovery: 0.1

    @customer
        name: "艾玛"
        description: "妆容依然精致，但难掩眼底的疲惫。"
        avatar: "emma_anxious"
        desired: 400
        minimum: 250
        max_repayment: 600
        patience: 2
        mood: "Neutral"
        tags: [Story]
        redemption_resolve: Medium
        negotiation_style: Desperate

        @dialogue
            greeting:
                when hope < 50: "老板... 没想到这么快又见面了。（声音低沉）"
                when hope >= 50: "老板！又见面了。只是暂时周转一下。"
                when hope < 60: "老板，又见面了。（她下意识看了眼手机）他问我几点回去..."
                default: "老板，又见面了。"
            pawn_reason:
                when hope < 50: "投出去的简历都石沉大海... 房东又在催了。他说我得自己想办法，他已经帮了很多了。这可是全新的，连塑封都没拆。"
                default: "面试还算顺利，但在发offer前，我得先解决房租问题。他说这两个月已经超支了。这可是全新的。"
            redemption_plea: "希望能撑过这一周... 只要撑过去就好。"
            negotiation_dynamic: "别压太狠了，专柜卖两千多的。"
            rejected: "求你了... 再看看吧..."

            @accepted
                fair: "太好了。谢谢。"
                fleeced: "好吧... 能买几包泡面。"
                premium: "谢谢！你真是我的救星！"

            @rejection_lines
                standard: "打扰了。"
                angry: "..."
                desperate: "哪怕少给点也行啊..."

            @exit
                grateful:
                    when hope >= 60: "谢谢你！这下能撑过这周了。回去... 应该不会再被念叨了。"
                    default: "谢谢你，真的。我会记住你的恩情。"
                neutral: "走了。"
                resentful:
                    when hope < 35: "[攥着钱，嘴唇颤抖] 我... 我得赶紧回去，他在等..."
                    default: "..."
                desperate: "[她紧紧攥着那几张钞票，像是抓着最后一根稻草]"

    @outcomes
        deal_charity:
            add_funds_deal
            set_stage: 2
            hope = 65
            mail: mail_emma_02_charity
            mail: mail_emma_stage2_struggling delay: 2

        deal_aid:
            add_funds_deal
            set_stage: 2
            hope = 60
            mail: mail_emma_02_charity
            mail: mail_emma_stage2_struggling delay: 2

        deal_standard:
            add_funds_deal
            set_stage: 2
            hope = 55
            mail: mail_emma_02_charity
            mail: mail_emma_stage2_struggling delay: 2

        deal_shark:
            add_funds_deal
            set_stage: 2
            hope = 30
            mail: mail_emma_02_shark
            mail: mail_emma_stage2_struggling delay: 1

    @on_reject
        set_stage: 2
        hope = 30

    @expiry_flows
        @redemption
            accept:
                hope += 10
            refuse:
                hope -= 15

        @renewal
            accept:
                hope += 8
            refuse:
                hope -= 10

        @no_show
            sell:
                hope -= 20
            keep:

---

# Event 3: Laptop
@event emma_03_laptop
    chain: chain_emma
    trigger: stage == 2
    trigger: funds < 100

    @item emma_item_laptop
        name: "轻薄笔记本"
        category: "电子产品"
        visual_description: "贴满贴纸的旧款笔记本，键盘磨损严重。"
        history: "这台电脑里存着我所有的作品集，还有未完成的面试作业。"
        appraisal_note: "硬盘数据未清除，包含了大量个人隐私。"
        archive_summary: "为了生存，艾玛放弃了她最后的生产工具。"
        real_value: 1500
        stolen: false
        fake: false
        sentimental: true

        @traits
            @trait t_emma_03_data
                name: "重要资料"
                type: STORY
                description: "桌面上有个名为'2077面试终稿'的文件夹。"
                value_impact: 0.2
                discovery: 0.1

            @trait t_emma_03_batt
                name: "电池鼓包"
                type: FLAW
                description: "电池轻微鼓包，续航堪忧。"
                value_impact: -0.2
                discovery: 0.3

    @customer
        name: "艾玛"
        description: "头发凌乱，黑眼圈很重。说话时目光总是往下看，声音比上次小了很多。"
        avatar: "emma_desperate"
        desired: 1200
        minimum: 800
        max_repayment: 2000
        patience: 2
        mood: "Neutral"
        tags: [HighStakes]
        redemption_resolve: Strong
        negotiation_style: Desperate

        @dialogue
            greeting: "老板... 这是我最后值钱的东西了。"
            pawn_reason: "下周一就要交最终测试作品了... 但是我现在连电费都交不起了。昨晚给他打了几个电话，都没接。我只能先把电脑当了，去网吧做完作业。"
            redemption_plea: "千万千万别开机，别动里面的文件！我只要凑够钱马上来赎！"
            negotiation_dynamic: "求你了，这里面是我的命... 虽然也许不值什么钱。"
            rejected: "不... 不行... 没有这个钱我会死的..."

            @accepted
                fair: "谢谢！我发誓一定会回来的！"
                fleeced: "好... 只要能撑过这一周..."
                premium: "你是天使吗？谢谢！"

            @rejection_lines
                standard: "..."
                angry: "..."
                desperate: "求求你... 救救我..."

            @exit
                grateful:
                    when hope >= 55: "谢谢... 他说只要我找到工作，一切都会好起来的。一定会的。"
                    default: "谢谢... 谢谢... (语无伦次)"
                neutral: "我会回来的。"
                resentful:
                    when hope < 25: "[眼神空洞] 也许... 他说得对，我就是个拖累。什么都做不好。"
                    when hope < 40: "[低声] 他总说我太敏感... 也许真的是我想太多了。"
                    default: "..."
                desperate: "[她一步三回头地看着那台电脑，眼神里充满了恐惧]"

    @outcomes
        deal_charity:
            add_funds_deal
            set_stage: 3
            hope = 60
            has_laptop = 0
            mail: mail_emma_03_charity
            mail: mail_emma_stage3_waiting delay: 3
            mail: mail_emma_stage3_desperate delay: 5

        deal_aid:
            add_funds_deal
            set_stage: 3
            hope = 55
            has_laptop = 0
            mail: mail_emma_03_charity
            mail: mail_emma_stage3_waiting delay: 3
            mail: mail_emma_stage3_desperate delay: 5

        deal_standard:
            add_funds_deal
            set_stage: 3
            hope = 50
            has_laptop = 0
            mail: mail_emma_03_charity
            mail: mail_emma_stage3_waiting delay: 3
            mail: mail_emma_stage3_desperate delay: 5

        deal_shark:
            add_funds_deal
            set_stage: 3
            hope = 20
            job_chance -= 10
            has_laptop = 0
            mail: mail_emma_03_shark
            mail: mail_emma_stage3_nervous delay: 2
            mail: mail_emma_stage3_desperate delay: 4

    @on_reject
        set_stage: 4
        hope = 10
        has_laptop = 1
        mail: mail_emma_laptop_rejected

    core_item: emma_item_laptop

    @expiry_flows
        @redemption
            accept:
                hope += 20
                mail: mail_emma_laptop_renewal_thanks
            refuse:
                hope -= 40
                set_stage: 4
                mail: mail_emma_laptop_renewal_refused

        @renewal
            accept:
                hope += 15
                mail: mail_emma_laptop_renewal_thanks
            refuse:
                hope -= 35
                set_stage: 4
                mail: mail_emma_laptop_renewal_refused

        @no_show
            sell:
                hope -= 60
                set_stage: 4
                mail: mail_emma_laptop_sold
            keep:
                mail: mail_emma_laptop_plea

---

# Event 3b: Laptop Borrow Request
@event emma_03b_laptop_request
    chain: chain_emma
    trigger: stage == 3
    trigger: days_since_interview >= 3

    @item emma_laptop_request
        name: "借用请求"
        category: "其他"
        visual_description: "艾玛想借用她之前典当的电脑。"
        history: "网吧的电脑太卡了，作品集打不开..."
        appraisal_note: "这是一个人情请求，不涉及金钱交易。"
        archive_summary: "艾玛在最困难的时候请求帮助。"
        real_value: 0
        virtual: true
        stolen: false
        fake: false
        sentimental: false

    @customer
        name: "艾玛"
        description: "神色疲惫但眼中有光。"
        avatar: "emma_hopeful"
        interaction_type: NEGOTIATION
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 3
        mood: "Neutral"
        tags: [Story, Request]
        redemption_resolve: Strong
        negotiation_style: Desperate

        @dialogue
            greeting: "老板... 不好意思又来打扰你。"
            pawn_reason: "网吧的电脑太卡了，我的作品集根本打不开。能不能让我借用一下我的电脑？就半小时，我保证不动其他东西。"
            redemption_plea: ""
            negotiation_dynamic: "求你了... 这是我最后的机会。"
            rejected: "我理解... 这是你的店，你有权拒绝。"

            @accepted
                fair: "谢谢！谢谢你！"
                fleeced: "..."
                premium: "..."

            @rejection_lines
                standard: "好吧..."
                angry: "..."
                desperate: "..."

            @exit
                grateful: "谢谢你！我现在就去用！"
                neutral: "..."
                resentful: "[低头离开]"
                desperate: "[眼眶泛红，默默转身]"

    @outcomes
        deal_charity:
            hope += 15
            job_chance += 5
            mail: mail_emma_laptop_borrow_thanks

        deal_aid:
            hope += 10
            job_chance += 3
            mail: mail_emma_laptop_borrow_thanks

        deal_standard:
            add_funds: 20
            hope += 5

        deal_shark:
            add_funds: 50
            hope -= 5

    @on_reject
        hope -= 5
        mail: mail_emma_laptop_borrow_refused

---

# Event 4: Watch (Breakdown Stage)
@event emma_04_watch_final
    chain: chain_emma
    trigger: stage == 4

    @item emma_item_watch
        name: "男士机械表"
        category: "钟表"
        visual_description: "一块看起来有些年头的男表，表带断了一半。"
        history: "这是他留下的... 他说这不值钱，让我扔了。"
        appraisal_note: "虽然旧，但机芯是原装进口的，有一定价值。"
        archive_summary: "艾玛为了最后一点希望，典当了前男友的遗弃物。"
        real_value: 800
        stolen: false
        fake: false
        sentimental: true

        @traits
            @trait t_emma_04_engrave
                name: "刻字"
                type: STORY
                description: "表盖背面刻着 'To E, Forever'。但'Forever'被刮花了，像是故意划掉的。"
                value_impact: 0.1
                discovery: 0.2

    @customer
        name: "艾玛"
        description: "面容枯槁，眼神空洞。"
        avatar: "emma_broken"
        desired: 500
        minimum: 200
        max_repayment: 1000
        patience: 1
        mood: "Annoyed"
        tags: [Breakdown]
        redemption_resolve: Weak
        negotiation_style: Desperate

        @dialogue
            greeting: "老板... 还要表吗？"
            pawn_reason: "他走了。这是他没带走的东西。他说这不值钱。也许他说得对。我也不值什么钱。"
            redemption_plea: "随便吧。也许哪天我会想把它拿回来砸了。"
            negotiation_dynamic: "给多少都行。我想买张车票。"
            rejected: "连这个都不值钱吗..."

            @accepted
                fair: "行。"
                fleeced: "哦。"
                premium: "呵... 谢谢。"

            @rejection_lines
                standard: "..."
                angry: "滚。"
                desperate: "..."

            @exit
                grateful:
                    when has_laptop == 0: "谢谢你。你是这个城市唯一... 愿意好好跟我说话的人。那天电脑的事... 算了，不提了。"
                    default: "谢谢你。你是这个城市唯一... 愿意好好跟我说话的人。"
                neutral: "走了。"
                resentful: "..."
                desperate: "[她的眼神空洞，像是已经放弃了什么]"

    @outcomes
        deal_charity:
            add_funds_deal
            set_stage: 3
            hope = 40
            mail: mail_emma_03b_charity

        deal_aid:
            add_funds_deal
            set_stage: 3
            hope = 30
            mail: mail_emma_03b_charity

        deal_standard:
            add_funds_deal
            set_stage: 99
            mail_if: mail_emma_left_city_laptop when: has_laptop == 0
            mail_if: mail_emma_03b_shark when: has_laptop == 1

        deal_shark:
            add_funds_deal
            set_stage: 99
            hope = 0
            mail_if: mail_emma_left_city_laptop when: has_laptop == 0
            mail_if: mail_emma_03b_shark when: has_laptop == 1

    @on_reject
        set_stage: 99
        hope = 0

---

# Event 5: Redemption Check
@event emma_05_redemption
    chain: chain_emma
    type: REDEMPTION_CHECK
    trigger: stage == 5
    target_item: emma_item_clothes
    failure_mail: mail_emma_plea

    @customer
        name: "艾玛"
        description: "焕然一新，穿着得体的职业装（借来的），眼神坚定。"
        avatar: "emma_success"
        interaction_type: REDEEM
        desired: 0
        minimum: 0
        max_repayment: 0
        patience: 5
        mood: "Happy"
        redemption_resolve: Strong
        negotiation_style: Professional

        @dialogue
            greeting: "老板！我回来了！"
            pawn_reason: ""
            redemption_plea: ""
            negotiation_dynamic: "..."
            rejected: "..."

            @accepted
                fair: "太好了！"
                fleeced: "..."
                premium: "..."

            @rejection_lines
                standard: "..."
                angry: "..."
                desperate: "..."

            @exit
                grateful: "再见！希望下次来是光顾你的生意，而不是典当！"
                neutral: "再见。"
                resentful: "..."
                desperate: "..."

    @on_failure
        hope -= 10
        mail: mail_emma_redeem_failed

    @dynamic_flows
        all_safe:
            item_condition: target=emma_item_clothes status=SAFE others=ALL_SAFE
            dialogue: "太好了，都在！老板，我想把东西都赎回去。这笔钱是我预支的工资。"
            outcome:
                redeem_all
                deactivate_chain
                modify_rep: 20
                mail: mail_emma_success delay: 1

        core_safe:
            item_condition: target=emma_item_clothes status=SAFE others=ANY_LOST
            dialogue: "只要这套衣服还在就行... 其他的没了就没了吧，旧的不去新的不来。"
            outcome:
                redeem_target
                deactivate_chain
                modify_rep: 5
                mail: mail_emma_success delay: 1

        core_lost:
            item_condition: target=emma_item_clothes status=SOLD
            dialogue: "衣服... 卖了？那我明天穿什么去入职？！你... 你毁了我的机会！"
            outcome:
                deactivate_chain
                modify_rep: -30
                mail: mail_emma_hate delay: 1
