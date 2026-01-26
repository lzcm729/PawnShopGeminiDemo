
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
    body: `我的男朋友走了。\n\n今早我醒来，发现他的东西都不见了，只留下一张字条，说"你好自为之吧"。\n\n我仔细想了想，从认识他到现在，好像... 我一直都是错的那个人。\n\n之前当在店里的{{relatedItemName}}，我恐怕永远也没能力赎回来了。工作没指望，现在连他也走了。\n\n我觉得好累。这个世界也许真的不需要我。`,
    attachments: { cash: 0 }
  },
  "mail_emma_plea": {
    id: "mail_emma_plea",
    sender: "艾玛",
    subject: "关于那套衣服...",
    body: `老板，\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那套衣服对我真的很重要——如果拿到offer，入职第一天必须穿它。请千万不要把它挂牌出售，再宽限我几天。\n\n拜托了。`,
    attachments: { cash: 0 }
  },
  "mail_emma_01_charity": {
    id: "mail_emma_01_charity",
    sender: "艾玛",
    subject: "谢谢你",
    body: `老板，\n\n真的很感谢你。这个价格比我预期的高很多。\n\n回去告诉他，他松了口气说"看吧，天无绝人之路"。\n\n等我找到工作，第一个来赎！\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_01_shark": {
    id: "mail_emma_01_shark",
    sender: "艾玛",
    subject: "（无主题）",
    body: `好吧。有总比没有好。\n\n回去他问我拿了多少，听完叹了口气没说话。\n\n希望面试顺利吧。`,
    attachments: { cash: 0 }
  },
  "mail_emma_02_charity": {
    id: "mail_emma_02_charity",
    sender: "艾玛",
    subject: "撑过这周",
    body: `老板，\n\n谢谢你又帮了我一把。这周的房租有着落了。\n\n我把钱交给他，他数了数说"勉强够吧"。\n\n面试还在继续，我不会放弃的。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_02_shark": {
    id: "mail_emma_02_shark",
    sender: "艾玛",
    subject: "...",
    body: `这点钱... 也就够买几天泡面。\n\n他看了一眼说"就这么点？你那破瓶子不是挺贵的吗"。\n\n我没解释。解释也没用。`,
    attachments: { cash: 0 }
  },
  "mail_emma_03_charity": {
    id: "mail_emma_03_charity",
    sender: "艾玛",
    subject: "电脑的事",
    body: `老板，\n\n谢谢你给了一个公道的价格。我知道这台电脑对我意味着什么，你也知道。\n\n回去告诉他，他只是"哦"了一声就继续玩手机。\n\n我会回来赎它的。一定。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_03_shark": {
    id: "mail_emma_03_shark",
    sender: "艾玛",
    subject: "再见，老伙计",
    body: `这个价格... 算了，我没得选。\n\n他说"你连台破电脑都卖不出好价钱"。\n\n也许他说得对。我什么都做不好。`,
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
    subject: "他说要走了",
    body: `老板，\n\n他跟我摊牌了。\n\n他说受够了"和一个只会拖后腿的人在一起"。说我让他"每天都很压抑"。说当初就不该"可怜我"。\n\n我求他再给我一点时间。他说"给你时间就是在浪费我的时间"。\n\n也许... 他说得对。\n\n如果他真的走了，我不知道还能撑多久。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_got_job": {
    id: "mail_emma_got_job",
    sender: "艾玛",
    subject: "我拿到 Offer 了！！！",
    body: `老板！！！\n\n我拿到 Offer 了！！！是那家跨国公司！\n\n下周一入职，我得穿那套衣服去报到。等我入职拿了安家费，马上来赎！千万帮我留着！\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_interview_failed_3x": {
    id: "mail_emma_interview_failed_3x",
    sender: "艾玛",
    subject: "我是不是真的不行",
    body: `老板，\n\n又被拒了。这已经是第三次了。\n\nHR说我"气质不够自信"。\n\n也许他说得对。也许面试官说得对。也许所有人都对。只有我自己是错的。\n\n我好累。`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage1_hopeful": {
    id: "mail_emma_stage1_hopeful",
    sender: "艾玛",
    subject: "近况汇报",
    body: `老板，\n\n这几天投了很多简历，有几家已经约了面试。感觉事情在往好的方向发展。\n\n他说让我专心准备，家务他来做。也许... 一切都会好起来的。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage1_anxious": {
    id: "mail_emma_stage1_anxious",
    sender: "艾玛",
    subject: "有点焦虑",
    body: `老板，\n\n简历投了很多，但都石沉大海。房东又开始催租了。\n\n昨晚他翻了一下我的手机，说"你是不是偷偷买咖啡了"。我解释了半天...\n\n如果这周还没消息，我可能还要来找你...\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage2_struggling": {
    id: "mail_emma_stage2_struggling",
    sender: "艾玛",
    subject: "快撑不住了",
    body: `老板，\n\n他开始抱怨我整天愁眉苦脸，说"你能不能振作点，我每天回来看你这张脸也很累"。\n\n我也知道这样不好。但我控制不住。\n\n冰箱空了，他说让我自己解决午饭。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage3_desperate": {
    id: "mail_emma_stage3_desperate",
    sender: "艾玛",
    subject: "（无主题）",
    body: `老板，\n\n我不知道还能撑多久。\n\n他最近总是很晚回家，回来也不怎么说话。我问他是不是在外面有事，他说"你管那么多干嘛，先把自己的事搞定"。\n\n也许他也在想办法离开我吧。`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage3_waiting": {
    id: "mail_emma_stage3_waiting",
    sender: "艾玛",
    subject: "还在等",
    body: `老板，\n\n面试已经过去三天了，还没收到回复。\n\n我每天都在刷新邮箱。网吧的电脑太卡了，但我还是每天去。\n\n他问我"有消息了吗"，我说还没，他就不再说话了。\n\n那种沉默比骂我还难受。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_stage3_nervous": {
    id: "mail_emma_stage3_nervous",
    sender: "艾玛",
    subject: "是不是没戏了",
    body: `老板，\n\n还是没消息。网上说如果一周没回复基本就凉了。\n\n昨晚回去，他在收拾行李。我问他要去哪，他说"出差"。\n\n可是他从来没出过差。\n\n我没敢再问。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_interview_failed_once": {
    id: "mail_emma_interview_failed_once",
    sender: "艾玛",
    subject: "今天的面试",
    body: `老板，\n\n今天的面试没过。HR说我"经验不够匹配"。\n\n没关系，还有其他机会。我不会放弃的。\n\n回去跟他说了，他说"意料之中"。\n\n艾玛`,
    attachments: { cash: 0 }
  },
  "mail_emma_interview_failed_twice": {
    id: "mail_emma_interview_failed_twice",
    sender: "艾玛",
    subject: "又被拒了",
    body: `老板，\n\n又被拒了。这次HR说我"状态不太好"。\n\n也许他们说得对。最近确实睡不好，黑眼圈都遮不住了。\n\n昨晚他说："你看你现在这样，谁敢要你？"\n\n我知道他是在陈述事实。\n\n艾玛`,
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
  fateHints: [
      // --- HOPE ---
      {
          condition: { variable: 'hope', operator: '>=', value: 80 },
          priority: 10,
          hints: [
              '（她的步伐轻快，嘴角甚至带着一丝若有若无的微笑）',
              '（看起来即使在阴雨天，他的心情也很不错）',
              '（眼神里有了光彩，不再像上次那样躲闪）'
          ]
      },
      {
          condition: { variable: 'hope', operator: '<=', value: 20 },
          priority: 10,
          hints: [
              '（她的眼神空洞，仿佛灵魂已经被抽走了一半）',
              '（他长时间地盯着地板，手指在无意识地抽搐）',
              '（身上带着一股好几天没洗澡的颓废气息）'
          ]
      },
      // Mid Hope (40-60 roughly, utilizing priority to filter out high/low)
      {
          condition: { variable: 'hope', operator: '>=', value: 40 },
          priority: 6,
          hints: [
              '（她努力挤出一个微笑，但眼底的疲惫藏不住）',
              '（不时看向手机，像是在等什么重要消息）'
          ]
      },
      // Low but not broken (20-40)
      {
          condition: { variable: 'hope', operator: '<=', value: 40 },
          priority: 8,
          hints: [
              '（她的声音有些沙哑，像是好几天没怎么说话）',
              '（肩膀微微塌着，整个人像是被抽走了力气）',
              '（手指在不停地绞着衣角，透露出内心的不安）'
          ]
      },

      // --- FUNDS ---
      {
          condition: { variable: 'funds', operator: '>=', value: 3000 },
          priority: 5,
          hints: [
              '（换了一件看起来很新的外套，整个人精神了不少）',
              '（手里拿着一杯刚买的咖啡，显然手头宽裕了一些）'
          ]
      },
      {
          condition: { variable: 'funds', operator: '<=', value: 100 },
          priority: 5,
          hints: [
              '（嘴唇干裂，看起来好像为了省钱连水都舍不得买）',
              '（衣服上的污渍比上次更多了，显然生活陷入了困顿）'
          ]
      },

      // --- JOB CHANCE ---
      {
          condition: { variable: 'job_chance', operator: '>=', value: 50 },
          priority: 8,
          hints: [
              '（手里紧紧攥着一个文件夹，看起来那是她的希望）',
              '（正在整理领口，似乎刚从一个重要的场合回来）'
          ]
      },

      // --- FAILURES ---
      {
          condition: { variable: 'interview_failures', operator: '>=', value: 2 },
          priority: 7,
          hints: [
              '（她的眼圈发红，像是刚哭过）',
              '（手里攥着一张皱巴巴的纸，上面写着什么联系方式）',
              '（指甲被咬得参差不齐，透露着焦虑）'
          ]
      },

      // --- PSYCHOLOGICAL STATE (隐性压力暗示) ---
      {
          condition: { variable: 'hope', operator: '<=', value: 30 },
          priority: 9,
          hints: [
              '（她说话时总是下意识看向地面，好像在躲避什么）',
              '（每说完一句话都要停顿一下，像是在确认自己有没有说错）',
              '（她的肩膀微微向内缩，整个人看起来比上次更小了）'
          ]
      },
      {
          condition: { variable: 'hope', operator: '<=', value: 40 },
          priority: 7,
          hints: [
              '（她的指甲缝有咬过的痕迹，边缘参差不齐）',
              '（她不时看一眼手机，又马上把它塞回口袋）',
              '（她的笑容持续不到一秒就消失了）'
          ]
      }
  ],
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
      },
      // Single Failure Mail (New)
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '==', value: 3 },
          targetVar: 'interview_failures',
          operator: '==',
          value: 1,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_once', delayDays: 0 }
          ],
          triggerLog: "第一次面试失败"
      },
      // Second Failure Mail (New)
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '==', value: 3 },
          targetVar: 'interview_failures',
          operator: '==',
          value: 2,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_twice', delayDays: 0 }
          ],
          triggerLog: "第二次面试失败"
      },
      // Pre-breakdown Warning Mail (男友即将离开的预警)
      {
          type: 'THRESHOLD',
          condition: { variable: 'stage', operator: '<', value: 5 },
          targetVar: 'hope',
          operator: '<=',
          value: 15,
          onTrigger: [
              { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_coming_for_ring', delayDays: 0 }
          ],
          triggerLog: "男友即将离开的预警"
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
        pawnReason: "刚收到裁员通知... 不过别担心，这只是暂时的周转。他说让我放轻松，反正房租他能撑一个月。这套衣服是我的战袍，面试和入职都得穿它。",
        redemptionPlea: "我面试一旦通过，拿了安家费就会来赎。入职第一天必须穿这套，这是我的幸运战袍。",
        negotiationDynamic: "能不能再高一点？这可是去年的走秀款。",
        accepted: { fair: "谢谢。我会回来的。", fleeced: "谢谢... 至少够付房租了。", premium: "天哪，你真是个好人！这对我帮助太大了。" },
        rejected: "好吧... 我再去别家问问，也许有人识货。",
        rejectionLines: { standard: "谢谢。", angry: "这衣服这价？开玩笑。", desperate: "..." },
        exitDialogues: {
            grateful: [
                { condition: { variable: "hope", operator: ">=", value: 65 }, text: "谢谢！回去告诉他这个好消息，他最近也挺烦的。" },
                { text: "真的很感谢你！等我找到工作，第一时间来赎！" }
            ],
            neutral: "回见。帮我保管好它。",
            resentful: [
                { condition: { variable: "hope", operator: "<", value: 45 }, text: "算了... 回去再想办法吧。" },
                { text: "没想到这行也这么黑... 算了。" }
            ],
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
      historySnippet: "去年生日他说要送我这个，结果到了那天说'最近手头紧，你先垫一下，回头给你'。后来... 算了，不重要了。",
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
            { condition: { variable: "hope", operator: "<", value: 50 }, text: "投出去的简历都石沉大海... 房东又在催了。他说我得自己想办法，他已经帮了很多了。这可是全新的，连塑封都没拆。" },
            { text: "面试还算顺利，但在发offer前，我得先解决房租问题。他说这两个月已经超支了。这可是全新的。" }
        ],
        redemptionPlea: "希望能撑过这一周... 只要撑过去就好。",
        negotiationDynamic: "别压太狠了，专柜卖两千多的。",
        accepted: { fair: "太好了。谢谢。", fleeced: "好吧... 能买几包泡面。", premium: "谢谢！你真是我的救星！" },
        rejected: "求你了... 再看看吧...",
        rejectionLines: { standard: "打扰了。", angry: "...", desperate: "哪怕少给点也行啊..." },
        exitDialogues: {
            grateful: [
                { condition: { variable: "hope", operator: ">=", value: 60 }, text: "谢谢你！这下能撑过这周了。回去... 应该不会再被念叨了。" },
                { text: "谢谢你，真的。我会记住你的恩情。" }
            ],
            neutral: "走了。",
            resentful: [
                { condition: { variable: "hope", operator: "<", value: 35 }, text: "[攥着钱，嘴唇颤抖] 我... 我得赶紧回去，他在等..." },
                { text: "..." }
            ],
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
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
        ],
        "deal_aid": [
            { type: "ADD_FUNDS_DEAL" },
            { type: "SET_STAGE", value: 2 },
            { type: "MODIFY_VAR", variable: "hope", value: 60 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
        ],
        "deal_standard": [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 2 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_charity", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 2 }
        ],
        "deal_shark":    [
            { type: "ADD_FUNDS_DEAL" }, 
            { type: "SET_STAGE", value: 2 }, 
            { type: "MODIFY_VAR", variable: "hope", value: 30 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_02_shark", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage2_struggling", delayDays: 1 }
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
      description: "头发凌乱，黑眼圈很重。说话时目光总是往下看，声音比上次小了很多。",
      avatarSeed: "emma_desperate",
      desiredAmount: 1200, minimumAmount: 800, maxRepayment: 2000,
      dialogue: {
        greeting: "老板... 这是我最后值钱的东西了。",
        pawnReason: "下周一就要交最终测试作品了... 但是我现在连电费都交不起了。昨晚给他打了几个电话，都没接。我只能先把电脑当了，去网吧做完作业。",
        redemptionPlea: "千万千万别开机，别动里面的文件！我只要凑够钱马上来赎！",
        negotiationDynamic: "求你了，这里面是我的命... 虽然也许不值什么钱。",
        accepted: { fair: "谢谢！我发誓一定会回来的！", fleeced: "好... 只要能撑过这一周...", premium: "你是天使吗？谢谢！" },
        rejected: "不... 不行... 没有这个钱我会死的...",
        rejectionLines: { standard: "...", angry: "...", desperate: "求求你... 救救我..." },
        exitDialogues: {
            grateful: [
                { condition: { variable: "hope", operator: ">=", value: 55 }, text: "谢谢... 他说只要我找到工作，一切都会好起来的。一定会的。" },
                { text: "谢谢... 谢谢... (语无伦次)" }
            ],
            neutral: "我会回来的。",
            resentful: [
                { condition: { variable: "hope", operator: "<", value: 25 }, text: "[眼神空洞] 也许... 他说得对，我就是个拖累。" },
                { text: "..." }
            ],
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
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_waiting", delayDays: 3 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 5 }
        ],
        "deal_aid": [
            { type: "ADD_FUNDS_DEAL" },
            { type: "SET_STAGE", value: 3 },
            { type: "MODIFY_VAR", variable: "hope", value: 55 },
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_waiting", delayDays: 3 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 5 }
        ],
        "deal_standard": [
            { type: "ADD_FUNDS_DEAL" },
            { type: "SET_STAGE", value: 3 },
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_charity", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_waiting", delayDays: 3 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 5 }
        ],
        "deal_shark":    [
            { type: "ADD_FUNDS_DEAL" },
            { type: "SET_STAGE", value: 3 },
            { type: "MODIFY_VAR", variable: "hope", value: 20 },
            { type: "MODIFY_VAR", variable: "job_chance", value: -10 },
            { type: "MODIFY_VAR", variable: "has_laptop", value: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_03_shark", delayDays: 0 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_nervous", delayDays: 2 },
            { type: "SCHEDULE_MAIL", templateId: "mail_emma_stage3_desperate", delayDays: 4 }
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
        { id: "t_emma_04_engrave", name: "刻字", type: 'STORY', description: "表盖背面刻着 'To E, Forever'。但'Forever'被刮花了，像是故意划掉的。", valueImpact: 0.1, discoveryDifficulty: 0.2 }
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
        pawnReason: "他走了。这是他没带走的东西。他说这不值钱。也许他说得对。我也不值什么钱。",
        redemptionPlea: "随便吧。也许哪天我会想把它拿回来砸了。",
        negotiationDynamic: "给多少都行。我想买张车票。",
        accepted: { fair: "行。", fleeced: "哦。", premium: "呵... 谢谢。" },
        rejected: "连这个都不值钱吗...",
        rejectionLines: { standard: "...", angry: "滚。", desperate: "..." },
        exitDialogues: {
            grateful: "谢谢你。你是这个城市唯一... 愿意好好跟我说话的人。",
            neutral: "走了。",
            resentful: "...",
            desperate: "[她的眼神空洞，像是已经放弃了什么]"
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
