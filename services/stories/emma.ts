
import { EventChainState, StoryEvent, ItemStatus } from '../../types';
import { makeItem } from '../storyUtils';

export const EMMA_CHAIN_INIT: EventChainState = {
  id: "chain_emma",
  npcName: "艾玛",
  isActive: false, // Default: Not Triggered
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
      // REMOVED: { variable: "funds", operator: ">=", value: 1500 }, 
      { variable: "hope", operator: ">=", value: 40 }
    ],
    targetItemId: "emma_item_laptop",
    failureMailId: "mail_emma_plea", 
    // NEW: Reduce hope on failure so she eventually stops spamming mail or triggers the "Give Up" event
    onFailure: [{ type: "MODIFY_VAR", variable: "hope", value: -20 }],
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
