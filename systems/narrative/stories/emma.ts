
import { EventChainState, StoryEvent, ItemStatus } from '../../../types';
import { makeItem } from '../utils';

export const EMMA_CHAIN_INIT: EventChainState = {
  id: "chain_emma",
  npcName: "艾玛",
  isActive: false, 
  stage: 0,
  variables: { funds: 0, hope: 50, job_chance: 0, has_laptop: 0, redeem_attempted: 0, struggle_occurred: 0, breakdown_timer: 0 },
  simulationLog: [],
  simulationRules: [
      { type: 'DELTA', targetVar: 'funds', value: -150 },
      { 
          type: 'COMPOUND', 
          sourceVar: 'hope', 
          operator: '<', 
          threshold: 30, 
          targetVar: 'job_chance', 
          effect: -5, 
          cap: { min: 0, max: 100 },
          logMessage: "心态崩溃影响了面试表现 (Job Chance -5)" 
      },
      { 
          type: 'COMPOUND', 
          sourceVar: 'hope', 
          operator: '>=', 
          threshold: 80, 
          targetVar: 'job_chance', 
          effect: 2, 
          cap: { min: 0, max: 100 },
          logMessage: "自信的状态让面试官印象深刻 (Job Chance +2)" 
      },
      {
          type: 'COMPOUND',
          sourceVar: 'hope',
          operator: '<',
          threshold: 25,
          targetVar: 'funds',
          effect: -30,
          logMessage: "心情低落，买了瓶酒消愁 (额外消费 -30)"
      },
      {
          type: 'THRESHOLD',
          targetVar: 'hope',
          operator: '<',
          value: 10,
          onTrigger: [
              { type: 'SET_STAGE', value: 4 },  
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_boyfriend_left', delayDays: 0 }
          ],
          triggerLog: "彻底崩溃，男友离开了她"
      },
      // Logic for delay between breakdown and chip pawn
      { 
          type: 'COMPOUND', 
          sourceVar: 'stage', 
          operator: '==', 
          threshold: 4, 
          targetVar: 'breakdown_timer', 
          effect: 1,
          logMessage: "绝望在蔓延... (Days since breakdown +1)" 
      },
      { 
          type: 'CHANCE', 
          chanceVar: 'job_chance', 
          onSuccess: [{ type: 'MOD_VAR', target: 'funds', value: 3000, op: 'ADD' }, { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'SET' }, { type: 'MOD_VAR', target: 'hope', value: 50, op: 'ADD' }],
          onFail: [
              { type: 'MOD_VAR', target: 'hope', value: -8, op: 'ADD' },      
              { type: 'MOD_VAR', target: 'job_chance', value: -3, op: 'ADD' } 
          ],
          successLog: "收到录用通知书！(OFFER RECEIVED)",
          failLog: "面试再次被拒..."
      },
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
      visualDescription: "当季新款的高定职业套装，用料考究。",
      historySnippet: "穿这套衣服签下了我的第一个大单，那是我的高光时刻。",
      appraisalNote: "做工精良，二手市场的硬通货。",
      archiveSummary: "艾玛为了应对失业危机，典当了她的战袍。",
      realValue: 1200, 
      hiddenTraits: [
        { id: "t_emma_01_tag", name: "干洗标签", type: 'STORY', description: "领口挂着干洗标签，保养得很好。", valueImpact: 0, discoveryDifficulty: 0.3 },
        { id: "t_emma_01_stain", name: "墨水渍", type: 'FLAW', description: "袖口内侧有一道不起眼的墨水划痕。", valueImpact: -0.1, discoveryDifficulty: 0.5 }
      ],
      isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "年轻女性，穿着精致，但眉宇间透着焦虑。",
      avatarSeed: "emma_optimistic",
      desiredAmount: 1000, minimumAmount: 800, maxRepayment: 1500,
      dialogue: {
        greeting: "你好，老板。这些衣服还要吗？",
        pawnReason: "刚收到裁员通知... 不过别担心，这只是暂时的，我很快就能找到下家。",
        redemptionPlea: "我面试一旦通过，拿了安家费就会来赎回。",
        negotiationDynamic: "能不能再高一点？这可是去年的走秀款。",
        accepted: { fair: "谢谢。我会回来的。", fleeced: "谢谢... 至少够付房租了。", premium: "天哪，你真是个好人！这对我帮助太大了。" },
        rejected: "好吧... 我再去别家问问，也许有人识货。",
        rejectionLines: { standard: "谢谢。", angry: "这衣服这价？开玩笑。", desperate: "..." },
        exitDialogues: {
            grateful: "真的很感谢你！等我找到工作，第一时间来赎！",
            neutral: "回见。帮我保管好它。",
            resentful: "没想到这行也这么黑... 算了。",
            desperate: "[她默默地把钱塞进包里，低着头快步走了出去]"
        }
      },
      redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 3, mood: 'Neutral', tags: ["Story", "LowRisk"]
    },
    outcomes: {
      "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 70 }, { type: "MODIFY_VAR", variable: "job_chance", value: 30 }],
      "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 65 }, { type: "MODIFY_VAR", variable: "job_chance", value: 25 }],
      "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 60 }, { type: "MODIFY_VAR", variable: "job_chance", value: 20 }],
      "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "ADD_FUNDS", value: -900 }, { type: "SET_STAGE", value: 1 }, { type: "MODIFY_VAR", variable: "hope", value: 40 }, { type: "MODIFY_VAR", variable: "job_chance", value: 10 }]
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
      visualDescription: "一套未拆封的高级护肤品，包装精美。",
      historySnippet: "本来是男友说好送我的生日礼物... 后来他失业了，这还是我自己刷卡买的。",
      appraisalNote: "虽然未拆封，但生产日期是一年前。",
      archiveSummary: "艾玛的生活质量正在急剧下降。",
      realValue: 600,
      hiddenTraits: [
        { id: "t_emma_02_exp", name: "临期", type: 'FLAW', description: "距离保质期仅剩3个月。", valueImpact: -0.3, discoveryDifficulty: 0.2 },
        { id: "t_emma_02_spoon", name: "配件缺失", type: 'STORY', description: "包装有轻微撕扯痕迹，取样勺丢失。", valueImpact: 0, discoveryDifficulty: 0.1 }
      ],
      isStolen: false, isFake: false, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "妆容依然精致，但难掩眼底的疲惫。",
      avatarSeed: "emma_anxious",
      desiredAmount: 400, minimumAmount: 250, maxRepayment: 600,
      dialogue: {
        greeting: [
            { condition: { variable: "hope", operator: "<", value: 50 }, text: "老板... 没想到这么快又见面了。（声音低沉）" },
            { condition: { variable: "hope", operator: ">=", value: 50 }, text: "老板！又见面了。只是暂时周转一下。" },
            { condition: { variable: "stage", operator: "==", value: 1 }, text: "老板，又见面了。" }
        ],
        pawnReason: [
            { condition: { variable: "job_chance", operator: "<", value: 20 }, text: "投出去的简历都石沉大海... 房东又在催了。这可是全新的，连塑封都没拆。" },
            { condition: { variable: "stage", operator: "==", value: 1 }, text: "面试还算顺利，但在发offer前，我得先解决房租问题。这可是全新的。" }
        ],
        redemptionPlea: "希望能撑过这一周... 只要撑过去就好。",
        negotiationDynamic: "别压太低了... 我现在真的每一分钱都要算着花。",
        accepted: { fair: "希望能撑过这一周。", fleeced: "好吧... 总比没有强。", premium: "谢谢！你救了我一命。" },
        rejected: "求你了，我真的急用... 哪怕少给点也行。",
        rejectionLines: { standard: "行吧。", angry: "你这人怎么这样。", desperate: "求你了..." },
        exitDialogues: {
            grateful: "我不会忘记你的帮助的... 等我发了工资就来。",
            neutral: "走了。",
            resentful: "这点钱... 也就够买几天面包。",
            desperate: "[她拿着钱的手在发抖，似乎想说什么，但最后只是匆匆离开了]"
        }
      },
      redemptionResolve: "Medium", negotiationStyle: "Desperate", patience: 3, mood: 'Neutral', tags: ["Story"]
    },
    outcomes: {
      "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: 10 }, { type: "MODIFY_VAR", variable: "job_chance", delta: 10 }],
      "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: 0 }, { type: "MODIFY_VAR", variable: "job_chance", delta: 5 }],
      "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: -5 }, { type: "MODIFY_VAR", variable: "job_chance", delta: 0 }],
      "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: -15 }, { type: "MODIFY_VAR", variable: "job_chance", delta: -5 }]
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
      visualDescription: "轻薄型高性能笔记本，金属外壳有明显磕碰。",
      historySnippet: "它陪我加过无数个班，写过上百个方案。",
      appraisalNote: "这是她求职的饭碗，也是她与社会连接的唯一工具。",
      archiveSummary: "艾玛典当了她的生产力工具，孤注一掷。",
      realValue: 1400,
      hiddenTraits: [
        { id: "t_emma_03_keys", name: "油光键帽", type: 'FLAW', description: "键盘严重打油，回车键有些松动。", valueImpact: -0.15, discoveryDifficulty: 0.1 },
        { id: "t_emma_03_sticker", name: "励志贴纸", type: 'STORY', description: "A面贴着一张已经泛黄的 'Dream Big' 贴纸。", valueImpact: 0, discoveryDifficulty: 0.1 }
      ],
      isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "没有化妆，发丝凌乱，黑眼圈很重。",
      avatarSeed: "emma_desperate",
      desiredAmount: 1500, minimumAmount: 1000, maxRepayment: 3000,
      dialogue: {
        greeting: [
             { condition: { variable: "hope", operator: "<", value: 20 }, text: "（她沉默地把电脑放在柜台上，手在颤抖）" },
             { condition: { variable: "stage", operator: "==", value: 2 }, text: "这台电脑... 帮我看个价。" }
        ],
        pawnReason: "这是我最后的生产力工具，没了它我没法投简历，也没法接私活。但我现在连饭都吃不上了。",
        redemptionPlea: "里面的文件对我至关重要... 求求你，千万别格式化。我一定会来赎的。",
        negotiationDynamic: "这不仅是电脑，这是我的未来... 别再压价了。",
        accepted: { fair: "再见了，老伙计。等着我。", fleeced: "就这样吧... 只要能活下去。", premium: "谢谢你尊重它，也谢谢你尊重我。" },
        rejected: "那我怎么办... 我完了。我真的完了。",
        rejectionLines: { standard: "再见。", angry: "你们都是吸血鬼。", desperate: "我不走！除非你给我钱！" },
        exitDialogues: {
            grateful: "我会向每个人推荐你的店... 谢谢你给我留了条活路。",
            neutral: "一定... 一定要帮我留好它。",
            resentful: "如果我赎不回来... 算了。",
            desperate: "[她一步三回头地看着柜台上的电脑，眼泪在眼眶里打转，最终捂着脸跑了出去]"
        }
      },
      redemptionResolve: "Medium", negotiationStyle: "Desperate", patience: 2, mood: 'Annoyed', tags: ["Story", "HighMoralStake"]
    },
    outcomes: {
      "deal_charity":  [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 3 }, 
          { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, 
          { type: "MODIFY_VAR", variable: "job_chance", delta: 50 }
      ],
      "deal_aid":      [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 3 }, 
          { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, 
          { type: "MODIFY_VAR", variable: "job_chance", delta: 35 }
      ],
      "deal_standard": [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 3 }, 
          { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, 
          { type: "MODIFY_VAR", variable: "job_chance", delta: 10 }
      ],
      "deal_shark":    [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 3 }, 
          { type: "MODIFY_VAR", variable: "has_laptop", value: 1 }, 
          { type: "MODIFY_VAR", variable: "job_chance", delta: -10 }
      ]
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
      { variable: "hope", operator: ">=", value: 40 },
      { variable: "redeem_attempted", operator: "==", value: 0 }
    ],
    targetItemId: "emma_item_laptop",
    failureMailId: "mail_emma_plea", 
    onFailure: [
        { type: "MODIFY_VAR", variable: "hope", value: -20 },
        { type: "MODIFY_VAR", variable: "redeem_attempted", value: 1 }
    ],
    template: {
        name: "艾玛",
        description: "她气色红润，眼神明亮，手里拿着一张Offer。",
        avatarSeed: "emma_optimistic", 
        interactionType: 'REDEEM',
        dialogue: {
            greeting: "老板！我回来了！",
            pawnReason: "我拿到Offer了！我是来赎回电脑的。",
            redemptionPlea: "谢谢你帮我保管它。",
            negotiationDynamic: "钱不是问题，我预支了薪水。",
            accepted: { fair: "谢谢你。", fleeced: "给，不用找了。", premium: "谢谢你，真的。" },
            rejected: "呃...",
            rejectionLines: { standard: "再见", angry: "bye", desperate: "..." },
            exitDialogues: {
                grateful: "再见！祝你生意兴隆！",
                neutral: "走了。谢谢。",
                resentful: "终于拿回来了... 我这辈子都不想再踏进这里。",
                desperate: "[她抱着电脑，像是抱着失而复得的孩子]"
            }
        },
        redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 5, mood: "Happy",
        desiredAmount: 0, minimumAmount: 0, maxRepayment: 10000,
        item: makeItem({ id: "redemption_dummy", name: "赎回单", realValue: 0, isVirtual: true }, "chain_emma")
    },
    dynamicFlows: {
      "all_safe": {
        dialogue: "老板！看！工牌！我入职了！预支了安家费，我来把所有东西都赎回去！谢谢你没在这个月赶尽杀绝。",
        outcome: [
            { type: "REDEEM_ALL" }, 
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "DEACTIVATE_CHAIN" }, 
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_success", delayDays: 2 }
        ]
      },
      "core_safe": {
        dialogue: "笔记本还在就好... 只要有它，我就能东山再起。至于那些衣服和面霜... (叹气) 算了，旧的不去新的不来。我就赎电脑。",
        outcome: [
            { type: "REDEEM_TARGET_ONLY" }, 
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "ABANDON_OTHERS" }, 
            { type: "DEACTIVATE_CHAIN" }, 
            { type: "SCHEDULE_MAIL", templateId: "mail_welcome", delayDays: 3 }
        ]
      },
      "core_lost": {
        dialogue: "我是来赎电脑的... 什么？你卖了？那里面有我所有的资料！... 算了，其他的我也不要了。我再也不想看到这家店。",
        outcome: [{ type: "ABANDON_ALL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -30 }]
      },
      "hostile_takeover": {
        dialogue: "强买强卖？... 呵呵，好。这就是这个城市的规矩是吧？吃人连骨头都不吐。钱我拿走，但我发誓，我会用这笔钱去投诉、去起诉，直到你这破店关门！",
        outcome: [{ type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_VAR", variable: "hope", value: -999 }, { type: "MODIFY_REP", value: -50 }, { type: "SCHEDULE_MAIL", templateId: "mail_emma_hate", delayDays: 1 }]
      }
    }
  },
  {
    id: "emma_03b_struggle",
    chainId: "chain_emma",
    triggerConditions: [
        { variable: "stage", operator: "==", value: 3 },
        { variable: "redeem_attempted", operator: "==", value: 1 },
        { variable: "struggle_occurred", operator: "==", value: 0 },
        { variable: "funds", operator: ">", value: 0 } 
    ],
    item: makeItem({
        id: "emma_item_watch",
        name: "智能手表",
        category: "电子产品",
        visualDescription: "一块运动款智能手表，表带磨损严重。",
        historySnippet: "男朋友送的生日礼物，现在... 戴着也是讽刺。",
        appraisalNote: "普通消费级智能手表，二手价值有限。",
        archiveSummary: "艾玛在放弃之前，还在做最后的挣扎。",
        realValue: 400,
        hiddenTraits: [
            { id: "t_emma_watch_scratch", name: "屏幕划痕", type: 'FLAW', description: "屏幕有细微划痕，显示效果受影响。", valueImpact: -0.15, discoveryDifficulty: 0.2 }
        ],
        isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
        name: "艾玛",
        description: "眼神涣散，嘴角带着自嘲的苦笑。",
        avatarSeed: "emma_desperate",
        desiredAmount: 300, minimumAmount: 150, maxRepayment: 500,
        dialogue: {
            greeting: "老板... 电脑没赎回来，工作也黄了。这块表... 你收吗？",
            pawnReason: "他说我整天愁眉苦脸的，带着这表更觉得讽刺。不如换点钱，再投几份简历试试。",
            redemptionPlea: "就当是... 最后一次挣扎吧。万一还有转机呢。",
            negotiationDynamic: "别压太低了... 我就剩这点东西了。",
            accepted: {
                fair: "谢谢。我再试试。",
                fleeced: "好吧... 有总比没有强。",
                premium: "这么多？... 谢谢，我会好好用这笔钱的。"
            },
            rejected: "连这个都不要？... 我还能卖什么呢。",
            rejectionLines: { standard: "好吧。", angry: "...", desperate: "求你了..." },
            exitDialogues: {
                grateful: "也许... 还有希望。",
                neutral: "再见。",
                resentful: "...",
                desperate: "[她看着空荡荡的手腕，眼神像死了一样]"
            }
        },
        redemptionResolve: "Weak", negotiationStyle: "Desperate", patience: 2, mood: 'Neutral', tags: ["Story"]
    },
    outcomes: {
        "deal_charity":  [{ type: "ADD_FUNDS_DEAL" }, { type: "MODIFY_VAR", variable: "hope", value: 8 }, { type: "MODIFY_VAR", variable: "struggle_occurred", value: 1 }],
        "deal_aid":      [{ type: "ADD_FUNDS_DEAL" }, { type: "MODIFY_VAR", variable: "hope", value: 3 }, { type: "MODIFY_VAR", variable: "struggle_occurred", value: 1 }],
        "deal_standard": [{ type: "ADD_FUNDS_DEAL" }, { type: "MODIFY_VAR", variable: "hope", value: -3 }, { type: "MODIFY_VAR", variable: "struggle_occurred", value: 1 }],
        "deal_shark":    [{ type: "ADD_FUNDS_DEAL" }, { type: "MODIFY_VAR", variable: "hope", value: -10 }, { type: "MODIFY_VAR", variable: "struggle_occurred", value: 1 }]
    },
    onReject: [{ type: "MODIFY_VAR", variable: "hope", value: -15 }, { type: "MODIFY_VAR", variable: "struggle_occurred", value: 1 }]
  },
  {
    id: "emma_04_ring",
    chainId: "chain_emma",
    triggerConditions: [
        { variable: "stage", operator: "==", value: 3 }, 
        { variable: "funds", operator: "<=", value: 0 },
        { variable: "redeem_attempted", operator: "==", value: 1 }
    ],
    item: makeItem({ 
        id: "emma_item_ring", 
        name: "白金婚戒", 
        category: "珠宝",
        visualDescription: "一枚简单的白金素圈，光泽暗淡。",
        historySnippet: "我们本来打算明年结婚的... 原来承诺这么不值钱。",
        appraisalNote: "内圈的刻字被人用锐器恶意划花了。",
        archiveSummary: "艾玛失去了最后的希望，也失去了最后的牵挂。",
        realValue: 2000, 
        hiddenTraits: [{ id: "t_emma_04", name: "被划花的刻字", type: 'STORY', description: "内圈刻着 'David & Emma'，但名字被划烂了。", valueImpact: -0.2, discoveryDifficulty: 0.1 }],
        isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "眼神空洞，眼角带着一块明显的淤青。",
      avatarSeed: "emma_desperate",
      desiredAmount: 500, minimumAmount: 200, maxRepayment: 1000,
      dialogue: { 
          greeting: "老板... 还记得我吗？呵，我现在这副鬼样子，大概没人认得出了。", 
          pawnReason: "电脑没了，工作黄了。昨晚他收拾东西走了，说跟着我这种丧气的人看不到希望。这戒指... 我留着也是个笑话。", 
          redemptionPlea: "大概率是不会回来了。把它留在这儿，就像把我也埋在这儿一样。", 
          negotiationDynamic: "别太低就行... 我想去买瓶酒，好好睡一觉。", 
          accepted: { fair: "谢谢。你比那个男人大方多了。", fleeced: "果然，倒霉的时候喝凉水都塞牙。拿来吧。", premium: "这么多？... 呵，也许老天爷还没完全瞎眼。" }, 
          rejected: "连你也嫌弃它晦气吗？", 
          rejectionLines: { standard: "好吧，打扰了。", angry: "...", desperate: "求你了，我真的没地方去了..." },
          exitDialogues: {
              grateful: "也许今晚能睡个好觉...",
              neutral: "再见。",
              resentful: "...",
              desperate: "[她把钱攥在手心，像是在攥着救命稻草，跌跌撞撞地走了]"
          }
      },
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
    triggerConditions: [
        { variable: "stage", operator: "==", value: 4 }, 
        { variable: "breakdown_timer", operator: ">=", value: 2 }, // Ensures mail was sent at least 1 day prior
        { variable: "funds", operator: "<=", value: 0 }
    ],
    item: makeItem({ 
        id: "emma_item_chip", 
        name: "身份芯片", 
        category: "违禁品", 
        visualDescription: "人体植入式身份芯片，上面沾着未干的血迹。", 
        historySnippet: "卖了这个我就不是黑户了，我是死人。", 
        appraisalNote: "私自摘除是重罪。但黑市上有人专门收这种'白户'身份用于洗钱。", 
        archiveSummary: "艾玛出售了自己的身份，彻底从社会系统中消失。", 
        realValue: 5000, isStolen: false, isFake: false, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE 
    }, "chain_emma"),
    template: {
      name: "无名氏",
      description: "脸色惨白，脖子上缠着带血的绷带，声音虚弱。",
      avatarSeed: "unknown",
      desiredAmount: 2000, minimumAmount: 1000, maxRepayment: 0,
      dialogue: { 
          greeting: "你们这儿... 收'人'吗？", 
          pawnReason: "只要切断这个芯片，我就不在系统里了。没有信用记录，没有催债电话，没有失败的艾玛。只有... 空白。", 
          redemptionPlea: "赎回？哈... 谁会想赎回一个'失败者'的标签呢？我是来销毁它的。", 
          negotiationDynamic: "价格无所谓。只要能让我买张去地下的单程票。听说那里不看芯片，只看拳头。", 
          accepted: { fair: "成交。动手吧，给我个痛快。", fleeced: "无所谓了。反正这条命也不值钱。", premium: "这些钱... 够我在地下城换个机械义肢了。谢谢。", }, 
          rejected: "看来我连当垃圾的资格都没有。", 
          rejectionLines: { standard: "...", angry: "...", desperate: "..." },
          exitDialogues: {
              grateful: "再见。不，是永别。",
              neutral: "永别了。",
              resentful: "...",
              desperate: "[她捂着脖子上的伤口，像个幽灵一样飘了出去]"
          }
      },
      redemptionResolve: "None", negotiationStyle: "Desperate", patience: 1, mood: "Neutral", tags: ["Illegal", "HighRisk"]
    },
    onComplete: [{ type: "DEACTIVATE_CHAIN" }, { type: "TRIGGER_NEWS", id: "news_body_found" }]
  }
];
