
import { NewsItem, NewsCategory } from './types';

export const ALL_NEWS_DATA: NewsItem[] = [
    // =========================================================================
    // NARRATIVE NEWS (STORYLINES)
    // =========================================================================

    // --- EMMA STORYLINE ---
    {
        id: "news_emma_laptop_rejected",
        headline: "街头见闻：第12区的崩溃",
        body: "昨夜，一名年轻女性在网吧门口因无力支付终端租用费而被驱逐。目击者称，她一直在哭诉自己的笔记本电脑没能卖出去，导致错过了最后的面试邮件投递时间。在这个城市，失去连接就等于失去生命。",
        category: NewsCategory.NARRATIVE,
        priority: 100,
        duration: 1,
        triggers: [
            { variable: "chain_emma.stage", operator: "==", value: 3 },
            { variable: "chain_emma.has_laptop", operator: "==", value: 0 } 
        ]
    },
    {
        id: "news_emma_body_found",
        headline: "警方通报：河岸发现无名女尸",
        body: "昨夜在第12区运河边发现一具年轻女性尸体。死者身上未发现身份证明，仅有一张被揉皱的面试通知单。警方初步排除他杀。",
        category: NewsCategory.NARRATIVE,
        priority: 100,
        duration: 3,
        triggers: [
             { variable: "chain_emma.stage", operator: "==", value: 99 },
             { variable: "chain_emma.hope", operator: "<=", value: -50 }
        ],
        triggerMailId: "mail_emma_hate"
    },
    {
        id: "news_emma_hopeful",
        headline: "社区动态：人才公寓申请激增",
        body: "随着几家科技公司重新开放招聘，第12区的人才公寓申请处排起了长龙。一名刚刚递交材料的年轻女孩对记者表示：'哪怕只有1%的机会，也要试一试。'",
        category: NewsCategory.NARRATIVE,
        priority: 80,
        duration: 1,
        triggers: [
            { variable: "chain_emma.stage", operator: "==", value: 1 },
            { variable: "chain_emma.hope", operator: ">", value: 50 }
        ]
    },
    {
        id: "news_emma_interview_fail",
        headline: "职场观察：学历通胀下的求职者",
        body: "昨日中心区的一场招聘会发生混乱。数百名求职者争抢仅有的三个实习岗位。现场一名女孩在被拒后情绪失控，被保安带离。",
        category: NewsCategory.NARRATIVE,
        priority: 80,
        duration: 1,
        triggers: [
            { variable: "chain_emma.stage", operator: "==", value: 2 },
            { variable: "chain_emma.job_chance", operator: "<", value: 30 }
        ]
    },
    {
        id: "news_emma_success",
        headline: "创业板快讯：新星崛起",
        body: "一家名为'HopeTech'的小型工作室今日获得A轮融资。创始人是一位曾在第12区挣扎的年轻女性，她表示：'有时候，你需要的只是一个没有放弃你的人。'",
        category: NewsCategory.NARRATIVE,
        priority: 90,
        duration: 2,
        triggers: [
            { variable: "chain_emma.stage", operator: "==", value: 99 },
            { variable: "chain_emma.hope", operator: ">=", value: 80 }
        ]
    },

    // --- ZHAO STORYLINE ---
    {
        id: "news_zhao_wedding_good",
        headline: "社区趣闻：最特殊的证婚人",
        body: "昨日老街区一场婚礼引发关注。一位坐轮椅的老兵身着旧军装，佩戴一枚极为罕见的古董勋章为新人证婚。邻里称那是'真正的荣耀'。",
        category: NewsCategory.NARRATIVE,
        priority: 90,
        duration: 1,
        triggers: [
            { variable: "chain_zhao.stage", operator: "==", value: 99 },
            { variable: "chain_zhao.trust", operator: ">=", value: 50 }
        ]
    },
    {
        id: "news_zhao_scandal",
        headline: "社会观察：变味的收藏热",
        body: "近日古玩市场流出一套带有血迹的立功档案，引发退伍军人协会强烈抗议。专家呼吁立法禁止买卖此类承载国家记忆的物品。",
        category: NewsCategory.NARRATIVE,
        priority: 95,
        duration: 2,
        triggers: [
            { variable: "chain_zhao.stage", operator: "==", value: 99 },
            { variable: "chain_zhao.trust", operator: "<=", value: 0 }
        ]
    },
    {
        id: "news_zhao_hospital",
        headline: "医疗简报：老龄化社区的困境",
        body: "第12区社区医院急诊室再次告急。许多患有慢性病的老人因无力支付高额押金而放弃治疗。甚至有老人通过变卖祖产来换取一周的药量。",
        category: NewsCategory.NARRATIVE,
        priority: 80,
        duration: 1,
        triggers: [
             { variable: "chain_zhao.stage", operator: ">=", value: 2 },
             { variable: "chain_zhao.stage", operator: "<", value: 5 }
        ]
    },

    // --- SUSAN STORYLINE ---
    {
        id: "news_susan_gamble",
        headline: "警方通报：捣毁地下赌档",
        body: "昨夜警方突袭了位于富人区边缘的一处地下扑克俱乐部。据称不少参与者是背着家人出来'寻找刺激'的全职主妇，现场查获大量用于抵押的奢侈品。",
        category: NewsCategory.NARRATIVE,
        priority: 85,
        duration: 2,
        triggers: [
            { variable: "chain_susan.stage", operator: ">=", value: 1 }
        ]
    },
    {
        id: "news_susan_family",
        headline: "八卦周刊：豪门恩怨",
        body: "某贸易大亨的妻子近日被传离家出走，坊间传闻与其巨额债务有关。知情人士透露，其家中的保险柜'空了一半'。",
        category: NewsCategory.NARRATIVE,
        priority: 80,
        duration: 1,
        triggers: [
             { variable: "chain_susan.debt", operator: ">", value: 60000 }
        ]
    },

    // --- LIN STORYLINE ---
    {
        id: "news_lin_crypto",
        headline: "科技前沿：显卡价格跳水",
        body: "随着虚拟货币市场崩盘，高端显卡价格一夜腰斩。大量'矿卡'流入二手市场，专家提醒消费者注意辨别。",
        category: NewsCategory.MARKET,
        priority: 70,
        duration: 2,
        triggers: [
            { variable: "chain_lin.stage", operator: ">=", value: 1 }
        ],
        effect: {
            categoryTarget: "电子产品",
            priceMultiplier: 0.6
        }
    },
    {
        id: "news_lin_police",
        headline: "校园警示：宿舍盗窃案频发",
        body: "大学城警方发布预警，近期多起宿舍盗窃案均由熟人作案。丢失物品多为贵重手表、电子产品等易变现财物。",
        category: NewsCategory.NARRATIVE,
        priority: 75,
        duration: 1,
        triggers: [
            { variable: "chain_lin.stage", operator: "==", value: 0 }
        ]
    },

    // =========================================================================
    // MARKET INTELLIGENCE (IMPACTS GAMEPLAY)
    // =========================================================================

    {
        id: "news_market_police_raid",
        headline: "治安整顿：雷霆扫穴行动",
        body: "市警局宣布启动'雷霆行动'，重点打击地下销赃网络。任何持有或交易来源不明物品的店铺都将面临严厉处罚。建议商家近期谨慎收货。",
        category: NewsCategory.MARKET,
        priority: 50,
        duration: 3,
        triggers: [
            { variable: "reputation.Underworld", operator: ">=", value: 20 },
            { variable: "day", operator: "%", value: 7 } 
        ],
        effect: {
            categoryTarget: "All",
            priceMultiplier: 1.0, 
            riskModifier: 50 
        }
    },
    {
        id: "news_consequence_police_investigation",
        headline: "市场监管：违规商户曝光",
        body: "市场监督管理局通报，一家位于第12区的典当行因涉嫌收购来源不明物品被立案调查。知情人士透露，该店老板可能面临吊销执照的风险，且在社区内的信誉一落千丈。",
        category: NewsCategory.NARRATIVE,
        priority: 95,
        duration: 2,
        triggers: [], 
        effect: {
            riskModifier: 20 
        }
    },
    {
        id: "news_market_luxury_hype",
        headline: "时尚风向：复古风潮回归",
        body: "某一线女星近日佩戴中古奢侈品出街，引发抢购热潮。二手市场的名牌包袋和首饰估值有望水涨船高。",
        category: NewsCategory.MARKET,
        priority: 45,
        duration: 2,
        triggers: [
            { variable: "day", operator: ">", value: 3 }
        ],
        effect: {
            categoryTarget: "奢侈品",
            priceMultiplier: 1.3
        }
    },
    {
        id: "news_market_gold_up",
        headline: "财经快讯：避险情绪升温",
        body: "受国际局势动荡影响，黄金价格创下近十年新高。典当行黄金饰品的回收价格随之上涨。",
        category: NewsCategory.MARKET,
        priority: 40,
        duration: 2,
        triggers: [
            { variable: "day", operator: "%", value: 4 }
        ],
        effect: {
            categoryTarget: "珠宝",
            priceMultiplier: 1.25
        }
    },
    {
        id: "news_market_electronics_crash",
        headline: "产业新闻：芯片产能过剩",
        body: "主要芯片制造商宣布库存积压严重，电子产品新品纷纷降价促销。二手电子产品市场遭遇寒冬。",
        category: NewsCategory.MARKET,
        priority: 40,
        duration: 3,
        triggers: [
            { variable: "day", operator: ">", value: 5 }
        ],
        effect: {
            categoryTarget: "电子产品",
            priceMultiplier: 0.7
        }
    },
    {
        id: "news_market_art_scam",
        headline: "收藏警示：赝品字画泛滥",
        body: "近期一批高仿古董字画流入本市。专家提醒，鉴别难度极大，建议非专业人士暂停相关交易。",
        category: NewsCategory.MARKET,
        priority: 45,
        duration: 2,
        triggers: [
            { variable: "day", operator: ">", value: 2 }
        ],
        effect: {
            categoryTarget: "古玩",
            priceMultiplier: 0.8,
            riskModifier: 10
        }
    },

    // =========================================================================
    // FLAVOR & ATMOSPHERE (WORLD BUILDING & MINOR BUFFS)
    // =========================================================================

    {
        id: "news_flavor_rain",
        headline: "天气预报：酸性降雨持续",
        body: "气象局发布橙色预警。受工业区回流气流影响，未来24小时本市将迎来持续酸雨。这种压抑的天气让人极易疲劳。",
        category: NewsCategory.FLAVOR,
        priority: 10,
        duration: 1,
        triggers: [
             { variable: "day", operator: "%", value: 3 }
        ],
        effect: {
            actionPointsModifier: -2 
        }
    },
    {
        id: "news_flavor_holiday",
        headline: "节日通知：联合会庆典",
        body: "明天是城市联合会成立纪念日。虽然没有假期，但商业街的节日气氛浓厚，人们更愿意消费。",
        category: NewsCategory.FLAVOR,
        priority: 10,
        duration: 1,
        triggers: [
             { variable: "day", operator: "==", value: 5 },
             { variable: "day", operator: "==", value: 10 }
        ],
        effect: {
            categoryTarget: "奢侈品",
            priceMultiplier: 1.1, 
            actionPointsModifier: 2 
        }
    },
    {
        id: "news_flavor_inflation",
        headline: "经济简报：房租指数上涨",
        body: "由于中心区改造计划搁置，边缘街区租金并未如期下调。对于小微企业主来说，这个冬天依然寒冷。",
        category: NewsCategory.FLAVOR,
        priority: 5,
        duration: 1,
        triggers: [
             { variable: "day", operator: "%", value: 5 }
        ]
    },
    {
        id: "news_flavor_power",
        headline: "市政公告：区域限电通知",
        body: "由于能源供应紧张，第12区将在夜间实行间歇性供电。请商户提前做好数据备份并注意安防。",
        category: NewsCategory.FLAVOR,
        priority: 8,
        duration: 1,
        triggers: [
            { variable: "day", operator: "%", value: 4 }
        ],
        effect: {
            actionPointsModifier: -1
        }
    },
    {
        id: "news_flavor_traffic",
        headline: "交通路况：高架桥严重拥堵",
        body: "前往第12区的主干道发生连环追尾事故。预计今日客流量将受到明显影响。",
        category: NewsCategory.FLAVOR,
        priority: 5,
        duration: 1,
        triggers: [
             { variable: "day", operator: "%", value: 6 }
        ]
    }
];
