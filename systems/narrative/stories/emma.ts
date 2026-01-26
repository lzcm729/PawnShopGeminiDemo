
import { EventChainState, StoryEvent, ItemStatus, MailTemplate } from '../../../types';
import { makeItem } from '../utils';

// --- EMMA MAILS ---
export const EMMA_MAILS: Record<string, MailTemplate> = {
  "mail_emma_success": {
    id: "mail_emma_success",
    sender: "艾玛",
    subject: "我入职了！",
    body: `老板：\n\n告诉你一个好消息，我被那家跨国公司录取了！\n\n还记得那台{{relatedItemName}}吗？如果那时候你像别人一样狠狠宰我一笔，或者因为我没钱就赶我走，我可能早就崩溃了。\n\n这笔钱({{amount}})是我多付的利息，或者是... 感谢费。请你务必收下。\n\n另外，那枚婚戒我也不打算卖了。生活好像又有希望了。\n\n祝好，\n\n艾玛`,
    attachments: { cash: 500 }
  },
  "mail_emma_hate": {
    id: "mail_emma_hate",
    sender: "艾玛",
    subject: "你毁了一切",
    body: `我以为你会帮我... 结果你和其他吸血鬼没什么两样。\n\n因为没有电脑，我错过了入职提交材料的截止日期。工作没了，还要背负你的违约金债务。\n\n我要离开这座城市了。拿着我的电脑烂在手里吧。我诅咒你，诅咒这家店永远不得安宁。`,
    attachments: { cash: 0 }
  },
  "mail_emma_boyfriend_left": {
    id: "mail_emma_boyfriend_left",
    sender: "艾玛",
    subject: "一切都结束了",
    body: `我的男朋友走了。\n\n今早我醒来，发现他的东西都不见了，只留下一张字条，说受够了这种和我一起还要背债、看不到希望的日子。\n\n之前当在店里的{{relatedItemName}}，我恐怕永远也没能力赎回来了。工作没指望，现在连他也走了。\n\n我觉得好累。这个世界也许真的不适合我。`,
    attachments: { cash: 0 }
  },
  "mail_emma_plea": {
    id: "mail_emma_plea",
    sender: "艾玛",
    subject: "关于电脑...",
    body: `老板，\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那台{{relatedItemName}}对我真的很重要，里面的资料是我所有的心血。请千万不要把它挂牌出售，再宽限我几天，我一定想办法凑钱。\n\n拜托了。`,
    attachments: { cash: 0 }
  },
  "mail_emma_01_charity": {
    id: "mail_emma_01_charity",
    sender: "艾玛",
    subject: "谢谢你",
    body: `老板，\n\n真的很感谢你。这个价格比我预期的高很多。\n\n有你这样的人在，也许这个世界还没那么糟。等我找到工作，第一个来赎！\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_01_shark": {
    id: "mail_emma_01_shark",
    sender: "艾玛",
    subject: "（无主题）",
    body: `好吧。有总比没有好。\n\n希望面试顺利，不然下次见面可能更惨。`,
    attachments: { cash: 0 }
  },
  "mail_emma_02_charity": {
    id: "mail_emma_02_charity",
    sender: "艾玛",
    subject: "撑过这周",
    body: `老板，\n\n谢谢你又帮了我一把。这周的房租有着落了。\n\n面试还在继续，我不会放弃的。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_02_shark": {
    id: "mail_emma_02_shark",
    sender: "艾玛",
    subject: "...",
    body: `这点钱... 也就够买几天泡面。\n\n算了，有总比没有强。`,
    attachments: { cash: 0 }
  },
  "mail_emma_03_charity": {
    id: "mail_emma_03_charity",
    sender: "艾玛",
    subject: "电脑的事",
    body: `老板，\n\n谢谢你给了一个公道的价格。我知道这台电脑对我意味着什么，你也知道。\n\n我会回来赎它的。一定。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_03_shark": {
    id: "mail_emma_03_shark",
    sender: "艾玛",
    subject: "再见，老伙计",
    body: `这个价格... 算了，我没得选。\n\n希望你对它好一点。里面有我五年的心血。`,
    attachments: { cash: 0 }
  },
  "mail_emma_03b_charity": {
    id: "mail_emma_03b_charity",
    sender: "艾玛",
    subject: "最后的挣扎",
    body: `老板，\n\n谢谢你还愿意收这块表。也许... 还有希望。\n\n我再试试。`,
    attachments: { cash: 0 }
  },
  "mail_emma_03b_shark": {
    id: "mail_emma_03b_shark",
    sender: "艾玛",
    subject: "（无主题）",
    body: `连这个价都压... 算了。\n\n我已经不在乎了。`,
    attachments: { cash: 0 }
  },
  "mail_emma_redeem_failed": {
    id: "mail_emma_redeem_failed",
    sender: "艾玛",
    subject: "电脑的事...",
    body: `老板，\n\n我凑不够赎金。\n\n说好的 Offer 黄了，HR 说预算调整，岗位取消了。男朋友也开始抱怨我拖累他。\n\n但我不想就这样放弃。明天我会再来，看看还有什么能换点钱的。\n\n别放弃我。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_coming_for_ring": {
    id: "mail_emma_coming_for_ring",
    sender: "艾玛",
    subject: "他走了",
    body: `老板，\n\n他走了。今天早上醒来，他的东西都不见了。\n\n我手上还有一枚戒指。明天我会来的。\n\n也许这是最后一次了。`,
    attachments: { cash: 0 }
  },
  "mail_emma_got_job": {
    id: "mail_emma_got_job",
    sender: "艾玛",
    subject: "我拿到 Offer 了！！！",
    body: `老板！！！\n\n我拿到 Offer 了！！！是那家跨国公司！\n\n等我入职拿了安家费，我马上来赎东西！谢谢你一直没放弃我！\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_interview_failed_3x": {
    id: "mail_emma_interview_failed_3x",
    sender: "艾玛",
    subject: "我是不是真的不行",
    body: `老板，\n\n又被拒了。这已经是第三次了。\n\nHR 说我"气质不够自信"。也许他们说得对。\n\n我开始怀疑自己了。`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage1_hopeful": {
    id: "mail_emma_stage1_hopeful",
    sender: "艾玛",
    subject: "近况汇报",
    body: `老板，\n\n这几天投了很多简历，有几家已经约了面试。感觉事情在往好的方向发展。\n\n等我有好消息，第一时间告诉你！\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage1_anxious": {
    id: "mail_emma_stage1_anxious",
    sender: "艾玛",
    subject: "有点焦虑",
    body: `老板，\n\n简历投了很多，但都石沉大海。房东又开始催租了。\n\n如果这周还没消息，我可能还要来找你...\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage2_struggling": {
    id: "mail_emma_stage2_struggling",
    sender: "艾玛",
    subject: "快撑不住了",
    body: `老板，\n\n男朋友开始抱怨我整天愁眉苦脸。我也知道这样不好，但我控制不住。\n\n冰箱空了，存款也快见底了。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage3_desperate": {
    id: "mail_emma_stage3_desperate",
    sender: "艾玛",
    subject: "（无主题）",
    body: `老板，\n\n我不知道还能撑多久。\n\n他最近总是很晚回家，回来也不怎么说话。\n\n也许他也在想办法离开我吧。`,
    attachments: { cash: 0 }
  }
};

export const EMMA_CHAIN_INIT: EventChainState = {
  id: "chain_emma",
  npcName: "艾玛",
  isActive: true, 
  stage: 0,
  variables: { 
      funds: 500, 
      hope: 50, 
      job_chance: 0, 
      has_laptop: 1, 
      redeem_attempted: 0, 
      struggle_occurred: 0, 
      breakdown_timer: 0,
      interview_failures: 0,
      days_since_interview: 0
  },
  simulationLog: [],
  simulationRules: [
      { type: 'DELTA', targetVar: 'funds', value: -50 }, // Daily burn
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
      // Breakdown Logic (Only if not already succeeded or failed hard)
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '<', value: 5 }, // Prevent breakdown if she already has the job
          targetVar: 'hope',
          operator: '<',
          value: 10,
          onTrigger: [
              { type: 'SET_STAGE', value: 4 },  
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_boyfriend_left', delayDays: 0 }
          ],
          triggerLog: "彻底崩溃，男友离开了她"
      },
      // Job Interview Outcome Logic (Triggered ONLY at Stage 3 - Waiting)
      { 
          type: 'CHANCE', 
          condition: { variable: 'stage', operator: '==', value: 3 }, // Critical fix: Only run simulation when waiting for results
          chanceVar: 'job_chance', 
          onSuccess: [
              { type: 'MOD_VAR', target: 'funds', value: 3000, op: 'ADD' }, 
              { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'SET' }, 
              { type: 'MOD_VAR', target: 'hope', value: 50, op: 'ADD' },
              { type: 'SET_STAGE', value: 5 }, // Success Stage
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_got_job', delayDays: 1 }
          ],
          onFail: [
              { type: 'MOD_VAR', target: 'hope', value: -15, op: 'ADD' },      
              { type: 'MOD_VAR', target: 'job_chance', value: 0, op: 'ADD' }, // Reset isn't needed if we keep rolling, but let's just penalty
              { type: 'MOD_VAR', target: 'interview_failures', value: 1, op: 'ADD' }
          ],
          successLog: "收到录用通知书！(OFFER RECEIVED)",
          failLog: "面试再次被拒..."
      },
      // Consecutive Failure Mail
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '==', value: 3 }, // Only trigger in Stage 3
          targetVar: 'interview_failures',
          operator: '>=',
          value: 3,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_3x', delayDays: 0 },
              { type: 'MOD_VAR', target: 'interview_failures', value: 0, op: 'SET' } 
          ],
          triggerLog: "连续面试失败，信心受挫"
      }
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
      "deal_charity":  [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 1 }, 
          { type: "MODIFY_VAR", variable: "hope", value: 70 }, 
          { type: "MODIFY_VAR", variable: "job_chance", value: 30 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_charity", delayDays: 0 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage1_hopeful", delayDays: 2 }
      ],
      "deal_aid":      [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 1 }, 
          { type: "MODIFY_VAR", variable: "hope", value: 65 }, 
          { type: "MODIFY_VAR", variable: "job_chance", value: 25 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_charity", delayDays: 0 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage1_hopeful", delayDays: 2 }
      ],
      "deal_standard": [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 1 }, 
          { type: "MODIFY_VAR", variable: "hope", value: 60 }, 
          { type: "MODIFY_VAR", variable: "job_chance", value: 20 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage1_anxious", delayDays: 2 }
      ],
      "deal_shark":    [
          { type: "ADD_FUNDS_DEAL" }, 
          { type: "SET_STAGE", value: 1 }, 
          { type: "MODIFY_VAR", variable: "hope", value: 40 }, 
          { type: "MODIFY_VAR", variable: "job_chance", value: 10 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_shark", delayDays: 0 },
          { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage1_anxious", delayDays: 2 }
      ]
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
            { text: "老板，又见面了。" }
        ],
        pawnReason: [
            { condition: { variable: "job_chance", operator: "<", value: 20 }, text: "投出去的简历都石沉大海... 房东又在催了。这可是全新的，连塑封都没拆。" },
            { text: "面试还算顺利，但在发offer前，我得先解决房租问题。这可是全新的。" }
        ],
        redemptionPlea: "希望能撑过这一周... 只要撑过去就好。",
        negotiationDynamic: "别压太狠了，专柜卖两千多的。",
        accepted: { fair: "太好了。谢谢。", fleeced: "好吧... 能买几包泡面。", premium: "谢谢！你真是我的救星！" },
        rejected: "求你了... 再看看吧...",
        rejectionLines: { standard: "打扰了。", angry: "...", desperate: "哪怕少给点也行啊..." },
        exitDialogues: {
            grateful: "谢谢你，真的。我会记住你的恩情。",
            neutral: "走了。",
            resentful: "...",
            desperate: "[她紧紧攥着那几张钞票，像是抓着最后一根稻草]"
        }
      },
      redemptionResolve: "Medium", negotiationStyle: "Desperate", patience: 2, mood: 'Neutral', tags: ["Story"]
    },
    outcomes: {
        "deal_charity":  [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 2 }, 
            { type: "MODIFY_VAR", variable: "hope", value: 65 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 }
        ],
        "deal_standard": [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 2 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 }
        ],
        "deal_shark":    [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 2 }, 
            { type: "MODIFY_VAR", variable: "hope", value: 30 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_shark", delayDays: 0 }
        ]
    },
    onReject: [{ type: "SET_STAGE", value: 2 }, { type: "MODIFY_VAR", variable: "hope", value: 30 }]
  },
  {
    id: "emma_03_laptop",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 2 }, { variable: "funds", operator: "<", value: 100 }],
    item: makeItem({
      id: "emma_item_laptop",
      name: "轻薄笔记本",
      category: "电子产品",
      visualDescription: "贴满贴纸的旧款笔记本，键盘磨损严重。",
      historySnippet: "这台电脑里存着我所有的作品集，还有未完成的面试作业。",
      appraisalNote: "硬盘数据未清除，包含了大量个人隐私。",
      archiveSummary: "为了生存，艾玛放弃了她最后的生产工具。",
      realValue: 1500,
      hiddenTraits: [
        { id: "t_emma_03_data", name: "重要资料", type: 'STORY', description: "桌面上有个名为'2077面试终稿'的文件夹。", valueImpact: 0.2, discoveryDifficulty: 0.1 },
        { id: "t_emma_03_batt", name: "电池鼓包", type: 'FLAW', description: "电池轻微鼓包，续航堪忧。", valueImpact: -0.2, discoveryDifficulty: 0.3 }
      ],
      isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "头发有些凌乱，黑眼圈很重。",
      avatarSeed: "emma_desperate",
      desiredAmount: 1200, minimumAmount: 800, maxRepayment: 2000,
      dialogue: {
        greeting: "老板... 这是我最后值钱的东西了。",
        pawnReason: "下周一就要交最终测试作品了... 但是我现在连电费都交不起了。我只能先把电脑当了，去网吧做完作业。",
        redemptionPlea: "千万千万别开机，别动里面的文件！我只要凑够钱马上来赎！",
        negotiationDynamic: "求你了，这里面是我的命...",
        accepted: { fair: "谢谢！我发誓一定会回来的！", fleeced: "好... 只要能撑过这一周...", premium: "你是天使吗？谢谢！" },
        rejected: "不... 不行... 没有这个钱我会死的...",
        rejectionLines: { standard: "...", angry: "...", desperate: "求求你... 救救我..." },
        exitDialogues: {
            grateful: "谢谢... 谢谢... (语无伦次)",
            neutral: "我会回来的。",
            resentful: "...",
            desperate: "[她一步三回头地看着那台电脑，眼神里充满了恐惧]"
        }
      },
      redemptionResolve: "Strong", negotiationStyle: "Desperate", patience: 2, mood: 'Neutral', tags: ["HighStakes"]
    },
    outcomes: {
        "deal_charity":  [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 3 }, 
            { type: "MODIFY_VAR", variable: "hope", value: 60 },
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 }
        ],
        "deal_standard": [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 3 },
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 }
        ],
        "deal_shark":    [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 3 }, 
            { type: "MODIFY_VAR", variable: "hope", value: 20 }, 
            { type: "MODIFY_VAR", variable: "job_chance", value: -10 },
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_shark", delayDays: 0 }
        ]
    },
    onReject: [
        { type: "SET_STAGE", value: 3 }, 
        { type: "MODIFY_VAR", variable: "hope", value: 10 }, 
        { type: "MODIFY_VAR", variable: "has_laptop", value: 1 } // She keeps laptop but has no money
    ]
  },
  {
    id: "emma_04_watch_final",
    chainId: "chain_emma",
    triggerConditions: [{ variable: "stage", operator: "==", value: 4 }],
    item: makeItem({
      id: "emma_item_watch",
      name: "男士机械表",
      category: "钟表",
      visualDescription: "一块看起来有些年头的男表，表带断了一半。",
      historySnippet: "这是他留下的... 他说这不值钱，让我扔了。",
      appraisalNote: "虽然旧，但机芯是原装进口的，有一定价值。",
      archiveSummary: "艾玛为了最后一点希望，典当了前男友的遗弃物。",
      realValue: 800,
      hiddenTraits: [
        { id: "t_emma_04_engrave", name: "刻字", type: 'STORY', description: "表盖背面刻着 'To E, Forever'。", valueImpact: 0.1, discoveryDifficulty: 0.2 }
      ],
      isStolen: false, isFake: false, sentimentalValue: true, appraised: false, status: ItemStatus.ACTIVE
    }, "chain_emma"),
    template: {
      name: "艾玛",
      description: "面容枯槁，眼神空洞。",
      avatarSeed: "emma_broken",
      desiredAmount: 500, minimumAmount: 200, maxRepayment: 1000,
      dialogue: {
        greeting: "老板... 还要表吗？",
        pawnReason: "他走了。这是他没带走的东西。我不想要了。",
        redemptionPlea: "随便吧。也许哪天我会想把它拿回来砸了。",
        negotiationDynamic: "给多少都行。我想买张车票。",
        accepted: { fair: "行。", fleeced: "哦。", premium: "呵... 谢谢。" },
        rejected: "连这个都不值钱吗...",
        rejectionLines: { standard: "...", angry: "滚。", desperate: "..." },
        exitDialogues: {
            grateful: "谢谢你。你是这个城市唯一对我好的人。",
            neutral: "走了。",
            resentful: "...",
            desperate: "..."
        }
      },
      redemptionResolve: "Weak", negotiationStyle: "Desperate", patience: 1, mood: 'Annoyed', tags: ["Breakdown"]
    },
    outcomes: {
        "deal_charity":  [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 3 }, // Revert to waiting stage (give her a 2nd chance)
            { type: "MODIFY_VAR", variable: "hope", value: 40 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_charity", delayDays: 0 }
        ],
        "deal_standard": [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 99 }, // End chain (leaves city)
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03b_shark", delayDays: 0 }
        ]
    },
    onReject: [{ type: "SET_STAGE", value: 99 }, { type: "MODIFY_VAR", variable: "hope", value: 0 }]
  },
  {
    id: "emma_05_redemption",
    chainId: "chain_emma",
    type: "REDEMPTION_CHECK",
    triggerConditions: [{ variable: "stage", operator: "==", value: 5 }],
    targetItemId: "emma_item_clothes", // Primary redemption target
    failureMailId: "mail_emma_plea",
    onFailure: [{ type: "MODIFY_VAR", variable: "hope", value: -10 }],
    template: {
      name: "艾玛",
      description: "焕然一新，穿着得体的职业装（借来的），眼神坚定。",
      avatarSeed: "emma_success",
      interactionType: 'REDEEM',
      dialogue: {
        greeting: "老板！我回来了！",
        pawnReason: "",
        redemptionPlea: "",
        negotiationDynamic: "...",
        accepted: { fair: "太好了！", fleeced: "...", premium: "..." },
        rejected: "...",
        rejectionLines: { standard: "...", angry: "...", desperate: "..." },
        exitDialogues: {
            grateful: "再见！希望下次来是光顾你的生意，而不是典当！",
            neutral: "再见。",
            resentful: "...",
            desperate: "..."
        }
      },
      redemptionResolve: "Strong", negotiationStyle: "Professional", patience: 5, mood: 'Happy',
      desiredAmount: 0, minimumAmount: 0, maxRepayment: 0,
      item: makeItem({ id: "emma_redeem_dummy", name: "赎回清单", realValue: 0, isVirtual: true }, "chain_emma")
    },
    dynamicFlows: {
        "all_safe": {
            dialogue: "太好了，都在！老板，我想把东西都赎回去。这笔钱是我预支的工资。",
            outcome: [
                { type: "REDEEM_ALL" }, 
                { type: "DEACTIVATE_CHAIN" }, 
                { type: "MODIFY_REP", value: 20 },
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_success", delayDays: 1 }
            ]
        },
        "core_safe": {
            dialogue: "只要这套衣服还在就行... 其他的没了就没了吧，旧的不去新的不来。",
            outcome: [
                { type: "REDEEM_TARGET_ONLY" }, 
                { type: "DEACTIVATE_CHAIN" },
                { type: "MODIFY_REP", value: 5 },
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_success", delayDays: 1 }
            ]
        },
        "core_lost": {
            dialogue: "衣服... 卖了？那我明天穿什么去入职？！你... 你毁了我的机会！",
            outcome: [
                { type: "DEACTIVATE_CHAIN" }, 
                { type: "MODIFY_REP", value: -30 }, 
                { type: "SCHEDULE_MAIL", templateId: "mail_emma_hate", delayDays: 1 }
            ]
        }
    }
  }
];
