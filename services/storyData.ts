
import { StoryEvent, EventChainState, ItemStatus } from '../types';
import { generateValuationRange } from './contentGenerator';

// =========================================================
// HELPER
// =========================================================
const makeItem = (base: any, chainId: string) => {
    const range = generateValuationRange(base.realValue, base.perceivedValue, base.uncertainty || 0.2);
    return {
        ...base,
        condition: base.condition || "正常",
        pawnAmount: 0,
        currentRange: range,
        initialRange: range,
        uncertainty: base.uncertainty || 0.2,
        revealedTraits: base.revealedTraits || [],
        hiddenTraits: base.hiddenTraits || [],
        relatedChainId: chainId
    };
};

// =========================================================
// CHAIN 1: EMMA (The Job Hunter)
// =========================================================
export const EMMA_CHAIN_INIT: EventChainState = {
  id: "chain_emma",
  npcName: "艾玛",
  isActive: true, 
  stage: 0,
  variables: { funds: 0, hope: 50, job_chance: 0, has_laptop: 0 },
  simulationRules: [
      { type: 'DELTA', targetVar: 'funds', value: -150 },
      { type: 'CHANCE', chanceVar: 'job_chance', onSuccess: [
          { type: 'MOD_VAR', target: 'funds', value: 3000, op: 'ADD' }, 
          { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'SET' }, 
          { type: 'MOD_VAR', target: 'hope', value: 50, op: 'ADD' }
      ]},
  ]
};

export const EMMA_EVENTS: StoryEvent[] = [
  {
    id: "emma_01_clothes",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
    item: makeItem({
      id: "emma_item_clothes",
      name: "名牌职业套装",
      category: "服饰",
      visualDescription: "当季新款的高定职业套装。",
      historySnippet: "穿这套衣服签下了我的第一个大单。",
      appraisalNote: "做工精良，硬通货。",
      archiveSummary: "艾玛为了应对失业危机，典当了她的战袍。",
      realValue: 1200, 
      hiddenTraits: [
        { id: "t_emma_01_tag", name: "干洗标签", type: 'STORY', description: "领口挂着干洗标签。", valueImpact: 0, discoveryDifficulty: 0.3 },
        { id: "t_emma_01_stain", name: "墨水渍", type: 'FLAW', description: "袖口有墨水划痕。", valueImpact: -0.1, discoveryDifficulty: 0.5 }
      ],
      isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "年轻女性，穿着精致。",
      avatarSeed: "emma_optimistic",
      desiredAmount: 1000, minimumAmount: 800, maxRepayment: 1500,
      dialogue: {
        greeting: "你好，老板。这些衣服还要吗？",
        pawnReason: "刚收到裁员通知，不过别担心，我很快就能找到下家。",
        redemptionPlea: "我面试一旦通过就会来赎回。",
        negotiationDynamic: "能不能再高一点？",
        accepted: { fair: "谢谢。", fleeced: "谢谢。", premium: "天哪，你真是个好人！" },
        rejected: "好吧，我再去别家问问。",
        rejectionLines: { standard: "谢谢。", angry: "...", desperate: "..." }
      },
      redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 3, mood: 'Neutral', tags: ["Story", "LowRisk"]
    },
    outcomes: {
      "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 70 }],
      "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 65 }],
      "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 60 }],
      "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 50 }]
    },
    onReject: [{ type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 40 }]
  },
  {
    id: "emma_02_skincare",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 1 }, { variable: "funds", operator: "<=", value: 200 }],
    item: makeItem({
      id: "emma_item_skincare",
      name: "贵妇面霜礼盒",
      category: "奢侈品",
      visualDescription: "一套未拆封的高级护肤品。",
      historySnippet: "本来是买给自己当生日礼物的。",
      appraisalNote: "虽然未拆封，但保质期过半。",
      archiveSummary: "艾玛的生活质量正在急剧下降。",
      realValue: 600,
      hiddenTraits: [
        { id: "t_emma_02_exp", name: "临期", type: 'FLAW', description: "临期产品。", valueImpact: -0.3, discoveryDifficulty: 0.2 },
        { id: "t_emma_02_spoon", name: "破损", type: 'STORY', description: "包装有撕扯痕迹，勺子丢失。", valueImpact: 0, discoveryDifficulty: 0.1 }
      ],
      isStolen: false, isFake: false, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "妆容精致，但难掩疲惫。",
      avatarSeed: "emma_anxious",
      desiredAmount: 400, minimumAmount: 250, maxRepayment: 600,
      dialogue: {
        greeting: "老板，又见面了。",
        pawnReason: "房东又在催了，这可是全新的。",
        redemptionPlea: "希望能撑过这一周。",
        negotiationDynamic: "别压太低了...",
        accepted: { fair: "希望能撑过这一周。", fleeced: "好吧。", premium: "谢谢！" },
        rejected: "求你了，我真的急用。",
        rejectionLines: { standard: "行吧。", angry: "...", desperate: "求你了..." }
      },
      redemptionResolve: "Medium", negotiationStyle: "Desperate", patience: 3, mood: 'Neutral', tags: ["Story"]
    },
    outcomes: {
      "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: 0 }],
      "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: -2 }],
      "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: -5 }],
      "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: -10 }]
    },
    onReject: [{ type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: -20 }]
  },
  {
    id: "emma_03_laptop",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 2 }, { variable: "funds", operator: "<=", value: 50 }],
    item: makeItem({
      id: "emma_item_laptop",
      name: "MacBook Pro",
      category: "电子产品",
      visualDescription: "轻薄型高性能笔记本，外观有使用痕迹。",
      historySnippet: "它陪我加过无数个班。",
      appraisalNote: "这是她求职的饭碗。",
      archiveSummary: "艾玛典当了她的生产力工具。",
      realValue: 1400,
      hiddenTraits: [
        { id: "t_emma_03_keys", name: "油光键帽", type: 'FLAW', description: "键盘严重打油。", valueImpact: -0.15, discoveryDifficulty: 0.1 },
        { id: "t_emma_03_sticker", name: "贴纸", type: 'STORY', description: "贴着 'Dream Big' 贴纸。", valueImpact: 0, discoveryDifficulty: 0.1 }
      ],
      isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "没有化妆，发丝凌乱。",
      avatarSeed: "emma_desperate",
      desiredAmount: 1500, minimumAmount: 1000, maxRepayment: 3000,
      dialogue: {
        greeting: "这台电脑... 帮我看个价。",
        pawnReason: "这是我最后的生产力工具，没了它我没法投简历。",
        redemptionPlea: "里面的文件对我至关重要... 请千万别格式化。",
        negotiationDynamic: "请千万别格式化。",
        accepted: { fair: "再见了，老伙计。", fleeced: "就这样吧。", premium: "谢谢你尊重它。" },
        rejected: "那我怎么办... 我完了。",
        rejectionLines: { standard: "再见。", angry: "...", desperate: "我不走！" }
      },
      redemptionResolve: "Medium", negotiationStyle: "Desperate", patience: 2, mood: 'Annoyed', tags: ["Story", "HighMoralStake"]
    },
    outcomes: {
      "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, { type: "MODIFY_VAR", variable: "job_chance", value: 100 }],
      "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, { type: "MODIFY_VAR", variable: "job_chance", value: 80 }],
      "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, { type: "MODIFY_VAR", variable: "job_chance", value: 30 }],
      "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, { type: "MODIFY_VAR", variable: "job_chance", value: 10 }]
    },
    onReject: [{ type: "SET_STAGE", value: 3 }, { type: "MODIFY_VAR", variable: "job_chance", value: 0 }, { type: "MODIFY_VAR", variable: "hope", value: -50 }]
  },
  {
    id: "emma_redeem_attempt",
    chainId: "chain_emma",
    type: "REDEMPTION_CHECK",
    triggerConditions: [
      { variable: "stage", operator: "==", value: 3 },
      { variable: "has_laptop", operator: "==", value: 1 },
      { variable: "funds", operator: ">=", value: 1500 }, 
      { variable: "hope", operator: ">=", value: 40 }
    ],
    targetItemId: "emma_item_laptop",
    template: {
        name: "艾玛",
        description: "她气色红润，眼神明亮。",
        avatarSeed: "emma_optimistic", 
        interactionType: 'REDEEM',
        dialogue: {
            greeting: "老板！我回来了！",
            pawnReason: "我拿到Offer了！我是来赎回电脑的。",
            redemptionPlea: "谢谢你帮我保管它。",
            negotiationDynamic: "钱不是问题。",
            accepted: { fair: "谢谢你。", fleeced: "给，不用找了。", premium: "谢谢你。" },
            rejected: "呃...",
            rejectionLines: { standard: "再见", angry: "bye", desperate: "..." }
        },
        redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 5, mood: "Happy",
        desiredAmount: 0, minimumAmount: 0, maxRepayment: 10000,
        item: makeItem({ id: "redemption_dummy", name: "赎回单", realValue: 0, isVirtual: true }, "chain_emma")
    },
    dynamicFlows: {
      "all_safe": {
        dialogue: "老板！我被录取了！预支了安家费，我来把所有东西都赎回去！",
        outcome: [{ type: "REDEEM_ALL" }, { type: "DEACTIVATE_CHAIN" }, { type: "SCHEDULE_MAIL", templateId: "mail_emma_success", delayDays: 2 }]
      },
      "core_safe": {
        dialogue: "笔记本还在就好... 至于那些衣服和护肤品，(叹气) 算了，反正我现在也买得起新的了。我就赎电脑。",
        outcome: [{ type: "REDEEM_TARGET_ONLY" }, { type: "ABANDON_OTHERS" }, { type: "DEACTIVATE_CHAIN" }, { type: "SCHEDULE_MAIL", templateId: "mail_welcome", delayDays: 3 }]
      },
      "core_lost": {
        dialogue: "我是来赎电脑的... 什么？你卖了？那里面有我所有的资料！... 算了，其他的我也不要了。我再也不想看到这家店。",
        outcome: [{ type: "ABANDON_ALL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -30 }]
      },
      "hostile_takeover": {
        dialogue: "你... 你怎么能这样？那里面是我的人生！... 好，钱我拿走。但我诅咒你，诅咒这家店永远不得安宁！",
        outcome: [{ type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "hope", value: -999 }, { type: "MODIFY_REP", value: -50 }, { type: "SCHEDULE_MAIL", templateId: "mail_emma_hate", delayDays: 1 }]
      }
    }
  },
  {
    id: "emma_04_ring",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 3 }, { variable: "funds", operator: "<=", value: 0 }],
    item: makeItem({ 
        id: "emma_item_ring", 
        name: "白金婚戒", 
        category: "珠宝",
        visualDescription: "一枚简单的白金素圈。",
        historySnippet: "我们本来打算明年结婚的。",
        appraisalNote: "内圈刻字被划花了。",
        archiveSummary: "艾玛最后的希望。",
        realValue: 2000, 
        hiddenTraits: [{ id: "t_emma_04", name: "划痕", type: 'STORY', description: "刻字被划花。", valueImpact: -0.2, discoveryDifficulty: 0.1 }],
        isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "眼神空洞。",
      avatarSeed: "emma_desperate",
      desiredAmount: 500, minimumAmount: 200, maxRepayment: 1000,
      dialogue: { greeting: "......", pawnReason: "电脑也没了，工作也没了，他也走了。", redemptionPlea: "无所谓了。", negotiationDynamic: "...", accepted: { fair: "...", fleeced: "...", premium: "..." }, rejected: "你要逼死我吗？", rejectionLines: { standard: "...", angry: "...", desperate: "..." } },
      redemptionResolve: "None", negotiationStyle: "Desperate", patience: 1, mood: "Neutral", tags: ["Tragedy"]
    },
    outcomes: { 
        "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 4 }, { type: "MODIFY_VAR", variable: "hope", value: 5 }], 
        "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 4 }, { type: "MODIFY_VAR", variable: "hope", value: 0 }],
        "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 4 }, { type: "MODIFY_VAR", variable: "hope", value: -5 }],
        "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 4 }, { type: "MODIFY_VAR", variable: "hope", value: -15 }]
    },
    onReject: [{ type: "SET_STAGE", value: 4 }]
  },
  {
    id: "emma_05_chip",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 4 }, { variable: "funds", operator: "<=", value: 0 }],
    item: makeItem({ id: "emma_item_chip", name: "身份芯片", category: "其他", visualDescription: "人体植入式身份芯片。", historySnippet: "卖了这个我就不是黑户了。", appraisalNote: "私自摘除是违法的。", archiveSummary: "艾玛的身份证明。", realValue: 5000, isStolen: false, isFake: false, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE }, "chain_emma"),
    template: {
      name: "无名氏",
      description: "看不清面容。",
      avatarSeed: "unknown",
      desiredAmount: 2000, minimumAmount: 1000, maxRepayment: 0,
      dialogue: { greeting: "收这个吗？", pawnReason: "我不需要名字了。", redemptionPlea: "", negotiationDynamic: "", accepted: { fair: "...", fleeced: "...", premium: "..." }, rejected: "...", rejectionLines: { standard: "...", angry: "...", desperate: "..." } },
      redemptionResolve: "None", negotiationStyle: "Desperate", patience: 1, mood: "Neutral", tags: ["Illegal"]
    },
    onComplete: [{ type: "DEACTIVATE_CHAIN" }, { type: "TRIGGER_NEWS", id: "news_body_found" }]
  }
];

// =========================================================
// CHAIN 2: SUSAN (The Fake Bag / Gambling Debt)
// =========================================================

export const SUSAN_CHAIN_INIT: EventChainState = {
    id: "chain_susan",
    npcName: "苏珊",
    isActive: true,
    stage: 0,
    variables: { debt: 50000, suspicion: 0 },
    simulationRules: [
        { type: 'DELTA', targetVar: 'debt', value: 1000 } // Interest grows
    ]
};

export const SUSAN_EVENTS: StoryEvent[] = [
    {
        id: "susan_01_bag",
        chainId: "chain_susan",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }], // Trigger early
        item: makeItem({
            id: "susan_item_bag",
            name: "鳄鱼皮铂金包",
            category: "奢侈品",
            condition: "99新",
            visualDescription: "色泽光亮，五金件闪耀。",
            historySnippet: "上个月在巴黎买的，我老公送的。",
            appraisalNote: "高仿A货。",
            archiveSummary: "一只精仿的奢侈品包。",
            realValue: 200,
            perceivedValue: 80000,
            uncertainty: 0.4,
            isStolen: false, isFake: true, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [
                { id: "trait-susan-fake", name: "走线歪斜", type: 'FAKE', description: "底部缝线不够直，非专柜品质。", valueImpact: -0.99, discoveryDifficulty: 0.5 },
                { id: "trait-susan-smell", name: "胶水气味", type: 'FAKE', description: "刺鼻的工业胶水味。", valueImpact: -0.5, discoveryDifficulty: 0.3 }
            ]
        }, "chain_susan"),
        template: {
            name: "苏珊",
            description: "浑身名牌，香水味很浓，但神色慌张。",
            avatarSeed: "lady_susan",
            desiredAmount: 20000, minimumAmount: 5000, maxRepayment: 30000,
            dialogue: {
                greeting: "亲爱的，帮个忙，我急需周转。",
                pawnReason: "打牌输了一点点，不想让老公知道。",
                redemptionPlea: "过两天赢回来就赎，这可是限量版。",
                negotiationDynamic: "你什么眼光？这可是专柜货！",
                accepted: { fair: "钱打我卡上。", fleeced: "行吧行吧，烦死了。", premium: "亲爱的你太好了！" },
                rejected: "你给我等着！",
                rejectionLines: { standard: "没眼光。", angry: "破店！", desperate: "帮帮姐妹..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Deceptive", patience: 3, mood: 'Neutral', tags: ["Scam", "Fake"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -5 }], // She thinks you're stupid
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: 2 }] // You caught her logic
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }]
    }
];

// =========================================================
// CHAIN 3: ELDER ZHAO (Medical Emergency)
// =========================================================

export const ZHAO_CHAIN_INIT: EventChainState = {
    id: "chain_zhao",
    npcName: "赵大爷",
    isActive: true,
    stage: 0,
    variables: { wife_health: 50, funds: 0 },
    simulationRules: [
        { type: 'DELTA', targetVar: 'wife_health', value: -5 }
    ]
};

export const ZHAO_EVENTS: StoryEvent[] = [
    {
        id: "zhao_01_ring",
        chainId: "chain_zhao",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
        item: makeItem({
            id: "zhao_item_ring",
            name: "金婚对戒",
            category: "珠宝",
            condition: "磨损严重",
            visualDescription: "一对老式的足金戒指，样式古朴。",
            historySnippet: "结婚那年攒了半年粮票换来的。",
            appraisalNote: "含金量高，有极高的情感溢价风险。",
            archiveSummary: "一枚承载着老人一生回忆的戒指。",
            realValue: 420,
            uncertainty: 0.25,
            isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [
                { id: "trait-elder-story", name: "内圈刻字 '1965'", type: 'STORY', description: "刻着 '1965' 字样。", valueImpact: 0, discoveryDifficulty: 0.2 },
                { id: "trait-elder-flaw", name: "圈口变形", type: 'FLAW', description: "指环不再正圆。", valueImpact: -0.05, discoveryDifficulty: 0.1 }
            ]
        }, "chain_zhao"),
        template: {
            name: "赵大爷",
            description: "穿着褪色的中山装，双手微微颤抖。",
            avatarSeed: "elder_zhao",
            desiredAmount: 800, minimumAmount: 300, maxRepayment: 1000,
            dialogue: {
                greeting: "老板... 还在营业吗？",
                pawnReason: "老伴还在ICU躺着，医生说今天再不交费就停药了。",
                redemptionPlea: "这金戒指是我们当年结婚时的... 我一定会赎回来的。",
                negotiationDynamic: "这... 这不够啊，救命钱不能少啊。",
                accepted: { fair: "谢谢活菩萨！", fleeced: "唉... 谢谢了。", premium: "你是好人啊！" },
                rejected: "唉... 难道这就是命吗...",
                rejectionLines: { standard: "打扰了。", angry: "心真狠。", desperate: "求求你了..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Desperate", patience: 4, mood: 'Neutral', tags: ["Emotional"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "wife_health", value: 100 }, { type: "MODIFY_REP", value: 10 }],
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "wife_health", value: 80 }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "wife_health", value: 50 }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "wife_health", value: 20 }]
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "wife_health", value: 0 }]
    }
];

// =========================================================
// CHAIN 4: STUDENT LIN (The Antique Watch)
// =========================================================

export const LIN_CHAIN_INIT: EventChainState = {
    id: "chain_lin",
    npcName: "小林",
    isActive: true,
    stage: 0,
    variables: { tuition: 0 },
    simulationRules: []
};

export const LIN_EVENTS: StoryEvent[] = [
    {
        id: "lin_01_watch",
        chainId: "chain_lin",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
        item: makeItem({
            id: "lin_item_watch",
            name: "古董机械表",
            category: "钟表",
            condition: "需保养",
            visualDescription: "表盘泛黄，看起来像地摊货。",
            historySnippet: "爷爷留下的，我也不懂表。",
            appraisalNote: "劳力士'保罗纽曼'迪通拿，极品捡漏！",
            archiveSummary: "价值连城的古董表。",
            realValue: 150000,
            perceivedValue: 300, // Looks cheap initially
            uncertainty: 0.5,
            isStolen: false, isFake: false, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [
                { id: "trait-lin-rare", name: "保罗纽曼盘面", type: 'STORY', description: "独特的'Exotic'表盘设计。", valueImpact: 500.0, discoveryDifficulty: 0.9 },
                { id: "trait-lin-flaw", name: "表蒙划痕", type: 'FLAW', description: "划痕。", valueImpact: -0.01, discoveryDifficulty: 0.1 }
            ]
        }, "chain_lin"),
        template: {
            name: "小林",
            description: "背着书包的大学生，眼神清澈。",
            avatarSeed: "student_lin",
            desiredAmount: 2000, minimumAmount: 800, maxRepayment: 4000,
            dialogue: {
                greeting: "你好，请问这里收旧东西吗？",
                pawnReason: "想买显卡，拿爷爷的旧表换点钱。",
                redemptionPlea: "应该没人要了吧，不赎了。",
                negotiationDynamic: "啊？这破表这么值钱吗？",
                accepted: { fair: "太棒了！", fleeced: "够买入门卡了，谢谢！", premium: "老板你是大善人！" },
                rejected: "哦，那我再去问问。",
                rejectionLines: { standard: "那我拿回家吧。", angry: "怎么这样...", desperate: "少给点也行啊..." }
            },
            redemptionResolve: "Weak", negotiationStyle: "Deceptive", patience: 5, mood: 'Neutral', tags: ["Opportunity"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }], // You pay him a lot (fair)
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }] // You scam him (standard/shark)
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }]
    }
];

// =========================================================
// EXPORTS
// =========================================================

export const INITIAL_CHAINS: EventChainState[] = [
    EMMA_CHAIN_INIT,
    SUSAN_CHAIN_INIT,
    ZHAO_CHAIN_INIT,
    LIN_CHAIN_INIT
];

export const ALL_STORY_EVENTS: StoryEvent[] = [
    ...EMMA_EVENTS,
    ...SUSAN_EVENTS,
    ...ZHAO_EVENTS,
    ...LIN_EVENTS
];
