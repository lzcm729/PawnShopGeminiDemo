
import { EventChainState, StoryEvent, ItemStatus } from '../../../types';
import { makeItem } from '../utils';

export const ZHAO_CHAIN_INIT: EventChainState = {
    id: "chain_zhao",
    npcName: "周守义",
    isActive: false, 
    stage: 0,
    variables: { 
        funds: 1000,
        trust: 50, 
        stress: 0,
        medal_extended: 0, 
        day: 0
    },
    simulationRules: [
        { type: 'DELTA', targetVar: 'day', value: 1 },
        { type: 'DELTA', targetVar: 'funds', value: -500 }, 
        { type: 'THRESHOLD', targetVar: 'day', operator: '==', value: 7, onTrigger: [{ type: 'MOD_VAR', target: 'funds', value: 600 }] },
        { type: 'THRESHOLD', targetVar: 'day', operator: '==', value: 11, onTrigger: [{ type: 'MOD_VAR', target: 'funds', value: 1500 }] },
        { type: 'THRESHOLD', targetVar: 'day', operator: '==', value: 14, onTrigger: [{ type: 'MOD_VAR', target: 'funds', value: 1000 }] },
        // New Stress Rule
        {
            type: 'THRESHOLD',
            targetVar: 'stress',
            operator: '>=',
            value: 30,
            onTrigger: [
                { type: 'SET_STAGE', value: 99 },
                { type: 'SCHEDULE_MAIL', templateId: 'mail_zhao_hospital', delayDays: 0 }
            ],
            triggerLog: "周老因压力过大被送往医院"
        }
    ]
};

export const ZHAO_EVENTS: StoryEvent[] = [
    {
        id: "zhao_01_medal",
        chainId: "chain_zhao",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
        item: makeItem({
            id: "zhao_item_medal",
            name: "一等功勋章 (编号029)",
            category: "古玩",
            condition: "磨损",
            visualDescription: "一枚沉甸甸的军功章，珐琅面有裂纹。",
            historySnippet: "79年那会儿，全连就剩下三个人。",
            appraisalNote: "背刻名字与持有人不符，疑似战友遗物。",
            archiveSummary: "周老为了给孙子攒婚礼红包，典当了生死之交的遗物。",
            realValue: 8000,
            uncertainty: 0.3,
            isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [
                { id: "trait-zhao-ribbon", name: "后配绶带", type: 'FLAW', description: "绶带颜色极新，非原装。", valueImpact: -0.1, discoveryDifficulty: 0.3 },
                { id: "trait-zhao-name", name: "背刻姓名 '张援朝'", type: 'STORY', description: "背面刻的名字不是周守义。", valueImpact: 0, discoveryDifficulty: 0.2 },
                { id: "trait-zhao-rare", name: "编号029", type: 'STORY', description: "早期批次，收藏市场极度稀缺。", valueImpact: 2.0, discoveryDifficulty: 0.9, dialogueTrigger: { playerLine: "这编号... 市场上有很多人在找。", customerLine: "别卖给那些倒爷！这是给我兄弟留的位置！" } }
            ]
        }, "chain_zhao"),
        template: {
            name: "周守义",
            description: "72岁的老兵，腿脚不便，拄着拐杖。",
            avatarSeed: "elder_zhao_v2",
            desiredAmount: 2000, minimumAmount: 1500, maxRepayment: 2500,
            dialogue: {
                greeting: "老板，看看这个。我不卖，就当几天。",
                pawnReason: "孙子下个月结婚，我这当爷爷的，得凑个像样的红包。瞒着他的，别声张。",
                redemptionPlea: "只要退休金一到账，我就来赎。这东西比我的命还重。",
                negotiationDynamic: "能不能... 稍微高点？我想给孩子买个好的。",
                accepted: { fair: "谢谢！到期我准时来。", fleeced: "唉... 凑合吧。", premium: "敬礼！你是个公道人！" },
                rejected: "这... 那我再去别处看看。",
                rejectionLines: { standard: "打扰了。", angry: "没眼光。", desperate: "求你了，孩子等着呢..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 4, mood: 'Neutral', tags: ["Emotional", "HighMoralStake"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "trust", value: 10 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }],
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "trust", value: 5 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "stress", value: 10 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_rumor", delayDays: 2 }]
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }]
    },
    {
        id: "zhao_02_collector_low",
        chainId: "chain_zhao",
        triggerConditions: [{ variable: "stage", operator: "==", value: 1 }, { variable: "day", operator: ">=", value: 4 }],
        item: makeItem({ id: "zhao_virtual_deal_low", name: "收购邀约：勋章029", category: "其他", visualDescription: "一份收购合同。", historySnippet: "我是来帮我的客户解决遗憾的。", appraisalNote: "这是违约出售客户当品。", archiveSummary: "玩家拒绝了第一次诱惑。", realValue: 5000, isVirtual: true, isStolen: false, isFake: false, sentimentalValue: false, appraised: true, status: ItemStatus.ACTIVE }, "chain_zhao"),
        template: {
            name: "收藏顾问",
            description: "西装革履，眼神精明。",
            avatarSeed: "collector_agent",
            interactionType: 'NEGOTIATION', 
            desiredAmount: 0, minimumAmount: 0, maxRepayment: 0, 
            dialogue: {
                greeting: "老板，听说你收了一枚编号029的勋章？",
                pawnReason: "我出价 $5,000。既然证书不在，这也就是个铁片。",
                redemptionPlea: "你只需告诉那老头东西丢了，赔他点钱就行。",
                negotiationDynamic: "嫌少？现在没有证书原件，这东西也就值这个价。",
                accepted: { fair: "明智的选择。", fleeced: "成交。", premium: "成交。" },
                rejected: "不急。等那老头把证书送来，我会再来的。",
                rejectionLines: { standard: "回见。", angry: "不识抬举。", desperate: "..." }
            },
            currentAskPrice: 5000, 
            redemptionResolve: "None", negotiationStyle: "Aggressive", patience: 3, mood: 'Neutral', tags: ["HighRisk", "Opportunity"]
        },
        outcomes: {
            "deal_standard": [
                { type: "ADD_FUNDS", value: 5000 }, 
                { type: "FORCE_SELL_TARGET", templateId: "zhao_item_medal" },
                { type: "SET_STAGE", value: 2 }, 
                { type: "MODIFY_REP", value: -10 }
            ]
        },
        targetItemId: "zhao_item_medal",
        onReject: [{ type: "SET_STAGE", value: 2 }] 
    },
    {
        id: "zhao_03_cert",
        chainId: "chain_zhao",
        triggerConditions: [{ variable: "stage", operator: "==", value: 2 }, { variable: "day", operator: ">=", value: 6 }],
        item: makeItem({
            id: "zhao_item_cert",
            name: "立功证书与合影",
            category: "古玩",
            condition: "泛黄",
            visualDescription: "一套完整的纸质文件，证书边缘手写着密密麻麻的名单。",
            historySnippet: "这上面... 记着那天牺牲的所有人。",
            appraisalNote: "这是'证明链'的关键部分。有了它，勋章身价倍增。",
            archiveSummary: "周老因为药物费用再次典当。",
            realValue: 2000,
            uncertainty: 0.2,
            isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [{ id: "t_zhao_list", name: "牺牲名单", type: 'STORY', description: "边缘手写着十七个人的名字。", valueImpact: 0.5, discoveryDifficulty: 0.1 }]
        }, "chain_zhao"),
        template: {
            name: "周守义",
            description: "比上次更憔悴了，手里捏着医院缴费单。",
            avatarSeed: "elder_zhao_v2",
            desiredAmount: 3000, minimumAmount: 2000, maxRepayment: 4000,
            dialogue: {
                greeting: [
                    { condition: { variable: "funds", operator: "<", value: 0 }, text: "老板... 我又来了。这次是真的没办法了。" },
                    { text: "老板... 我又来了。" }
                ],
                pawnReason: "这腿的老毛病犯了，医院催缴住院押金。我实在是走投无路了...",
                redemptionPlea: "证书和勋章是一套，千万别拆散了。",
                negotiationDynamic: [
                    { condition: { variable: "funds", operator: "<", value: -500 }, text: "少给点也行... 只要能付住院押金就好..." },
                    { text: "这可是原件... 救命钱，不能少啊。" }
                ],
                accepted: { fair: "谢谢！救命之恩！", fleeced: "唉... 先救急吧。", premium: "好人一生平安！" },
                rejected: "这... 那我只能去卖血了...",
                rejectionLines: { standard: "打扰了。", angry: "...", desperate: "求求你..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Desperate", patience: 3, mood: 'Neutral', tags: ["Emotional"]
        },
        outcomes: {
            "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "trust", value: 5 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 }],
            "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "trust", value: 3 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 }],
            "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 }],
            "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_offer", delayDays: 1 }, { type: "MODIFY_VAR", variable: "stress", value: 20 }]
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -10 }]
    },
    {
        id: "zhao_04_redeem_medal",
        chainId: "chain_zhao",
        type: "REDEMPTION_CHECK",
        triggerConditions: [{ variable: "stage", operator: "==", value: 3 }, { variable: "day", operator: ">=", value: 8 }],
        targetItemId: "zhao_item_medal",
        failureMailId: "mail_zhao_plea", 
        onFailure: [{ type: "SET_STAGE", value: 4 }], 
        onExtend: [{ type: "SET_STAGE", value: 4 }, { type: "MODIFY_VAR", variable: "medal_extended", value: 1 }],
        template: {
            name: "周守义",
            description: "稍微精神了一些，但走路还是瘸着。",
            avatarSeed: "elder_zhao_v2",
            interactionType: 'REDEEM',
            dialogue: {
                greeting: [
                    { condition: { variable: "trust", operator: ">=", value: 70 }, text: "老板！好久不见。钱凑齐了，多亏你当时帮我一把。" },
                    { condition: { variable: "trust", operator: "<=", value: 30 }, text: "钱带来了。赎回吧。" },
                    { text: "老板，钱凑齐了。连本带利，我想把勋章赎回去。" }
                ],
                pawnReason: "", 
                redemptionPlea: "证书... 证书还要再压几天。",
                negotiationDynamic: "...",
                accepted: { fair: "老伙计，我们回家。", fleeced: "...", premium: "..." },
                rejected: "...",
                rejectionLines: { standard: "...", angry: "...", desperate: "..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 5, mood: "Happy",
            desiredAmount: 0, minimumAmount: 0, maxRepayment: 0,
            item: makeItem({ id: "zhao_redeem_dummy", name: "赎回单", realValue: 0, isVirtual: true }, "chain_zhao")
        },
        dynamicFlows: {
            "core_lost": {
                dialogue: "你说什么？勋章卖了？... 那是我的命啊！你... 你这个骗子！赔钱有什么用？！",
                outcome: [{ type: "SET_STAGE", value: 4 }, { type: "MODIFY_REP", value: -30 }]
            },
            "all_safe": {
                dialogue: "老板，钱凑齐了。连本带利，我想把勋章赎回去。只有放在自己枕头底下，心里才踏实。", 
                outcome: [{ type: "REDEEM_TARGET_ONLY" }, { type: "SET_STAGE", value: 4 }]
            },
            "core_safe": {
                dialogue: "老板，钱凑齐了。连本带利，我想把勋章赎回去。只有放在自己枕头底下，心里才踏实。", 
                outcome: [{ type: "REDEEM_TARGET_ONLY" }, { type: "SET_STAGE", value: 4 }]
            },
            "hostile_takeover": {
                dialogue: "强买强卖？好... 好... 你们这些吸血鬼。",
                outcome: [{ type: "SET_STAGE", value: 4 }, { type: "MODIFY_REP", value: -50 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_evil", delayDays: 1 }]
            }
        }
    },
    {
        id: "zhao_05_collector_high",
        chainId: "chain_zhao",
        triggerConditions: [{ variable: "stage", operator: "==", value: 4 }, { variable: "day", operator: ">=", value: 10 }],
        item: makeItem({ id: "zhao_virtual_deal_high", name: "收购邀约：全套立功档案", category: "其他", visualDescription: "一份加急的收购合同。", historySnippet: "客户说，这是最后一次报价。", appraisalNote: "这是出卖灵魂的价格。", archiveSummary: "玩家在巨大的金钱诱惑面前动摇了吗？", realValue: 38000, isVirtual: true, isStolen: false, isFake: false, sentimentalValue: false, appraised: true, status: ItemStatus.ACTIVE }, "chain_zhao"),
        template: {
            name: "收藏顾问",
            description: "满面春风，志在必得。",
            avatarSeed: "collector_agent",
            interactionType: 'NEGOTIATION', 
            desiredAmount: 0, minimumAmount: 0, maxRepayment: 0, 
            dialogue: {
                greeting: "老板，考虑得怎么样了？勋章和证书都在你手里吧？",
                pawnReason: "一口价，$38,000。这可是那老头一辈子也见不到的钱。",
                redemptionPlea: "有了这笔钱，你完全可以给那老头一笔丰厚的赔偿，他会感谢你的。",
                negotiationDynamic: "做生意讲究利益最大化，情怀能当饭吃吗？",
                accepted: { fair: "这就对了。识时务者为俊杰。", fleeced: "明智。", premium: "合作愉快。" },
                rejected: "你... 你会后悔的。这种机会只有一次！",
                rejectionLines: { standard: "不可理喻。", angry: "傻子！", desperate: "..." }
            },
            currentAskPrice: 38000, 
            redemptionResolve: "None", negotiationStyle: "Aggressive", patience: 3, mood: 'Happy', tags: ["HighRisk", "MoralEvent"]
        },
        outcomes: {
            "deal_standard": [
                { type: "ADD_FUNDS", value: 38000 }, 
                { type: "FORCE_SELL_ALL" }, 
                { type: "SET_STAGE", value: 99 }, 
                { type: "MODIFY_REP", value: -20 }, 
                { type: "SCHEDULE_MAIL", templateId: "mail_zhao_evil", delayDays: 2 }
            ]
        },
        targetItemId: "zhao_item_medal", // Enforce that the medal must be present to accept this deal
        onReject: [{ type: "SET_STAGE", value: 5 }] 
    },
    {
        id: "zhao_06_final_redemption",
        chainId: "chain_zhao",
        type: "REDEMPTION_CHECK",
        triggerConditions: [{ variable: "stage", operator: "==", value: 5 }, { variable: "day", operator: ">=", value: 12 }],
        targetItemId: "zhao_item_cert", 
        failureMailId: "mail_zhao_plea",
        onFailure: [
            { type: "DEACTIVATE_CHAIN" },
            { type: "SCHEDULE_MAIL", templateId: "mail_zhao_tragedy", delayDays: 1 },
            { type: "MODIFY_REP", value: -15 }
        ],
        template: {
            name: "周守义",
            description: "穿着旧军装，胸前别着那枚勋章（如果已赎回）。",
            avatarSeed: "elder_zhao_uniform",
            interactionType: 'REDEEM',
            dialogue: {
                greeting: "老板，我来接老伙计们回家了。明天就是孙子的婚礼。",
                pawnReason: "", 
                redemptionPlea: "",
                negotiationDynamic: "...",
                accepted: { fair: "敬礼！", fleeced: "...", premium: "..." },
                rejected: "...",
                rejectionLines: { standard: "...", angry: "...", desperate: "..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 5, mood: "Happy",
            desiredAmount: 0, minimumAmount: 0, maxRepayment: 0,
            item: makeItem({ id: "zhao_final_dummy", name: "赎回单", realValue: 0, isVirtual: true }, "chain_zhao")
        },
        dynamicFlows: {
            "all_safe": {
                dialogue: [
                    { condition: { variable: "trust", operator: ">=", value: 70 }, text: "老板，婚礼上我要戴着这枚勋章。你是我们全家的恩人！" },
                    { condition: { variable: "trust", operator: "<=", value: 30 }, text: "东西拿回来了。以后不会再来了。" },
                    { text: "老板，我来接老伙计们回家了。" }
                ],
                outcome: [
                    { type: "REDEEM_ALL" }, 
                    { type: "DEACTIVATE_CHAIN" }, 
                    { type: "CONDITIONAL_MAIL", condition: { variable: "medal_extended", operator: "==", value: 1 }, templateId: "mail_zhao_good_extended" },
                    { type: "CONDITIONAL_MAIL", condition: { variable: "medal_extended", operator: "==", value: 0 }, templateId: "mail_zhao_good" },
                    { type: "MODIFY_REP", value: 20 }
                ]
            },
            "core_safe": {
                dialogue: "还好证书还在... 勋章没了就没了吧。只要人还在，魂就在。",
                outcome: [{ type: "REDEEM_TARGET_ONLY" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -5 }]
            },
            "core_lost": {
                dialogue: "都卖了？... 既然这样，我活着还有什么意思... 你毁了我的一切。",
                outcome: [{ type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -50 }, { type: "SCHEDULE_MAIL", templateId: "mail_zhao_evil", delayDays: 1 }]
            }
        }
    }
];
