
import { NewsItem, NewsCategory } from '../types';

export const ALL_NEWS_DATA: NewsItem[] = [
    // --- NARRATIVE ECHOES (EMMA) ---
    {
        id: "news_emma_laptop_rejected",
        headline: "街头见闻：第12区的崩溃",
        body: "昨夜，一名年轻女性在网吧门口因无力支付终端租用费而被驱逐。目击者称，她一直在哭诉自己的笔记本电脑没能卖出去，导致错过了最后的面试邮件投递时间。在这个城市，失去连接就等于失去生命。",
        category: NewsCategory.NARRATIVE,
        priority: 100,
        duration: 1,
        triggers: [
            { variable: "chain_emma.stage", operator: "==", value: 3 }, // Stage 3 = After Laptop event
            { variable: "chain_emma.has_laptop", operator: "==", value: 0 } // 0 = Shop didn't take it (Rejected)
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
             { variable: "chain_emma.stage", operator: "==", value: 99 }, // Dead End / Bad Ending
             { variable: "chain_emma.hope", operator: "<=", value: -50 }
        ]
    },

    // --- NARRATIVE ECHOES (VETERAN ZHAO) ---
    {
        id: "news_zhao_wedding_good",
        headline: "社区趣闻：最特殊的证婚人",
        body: "昨日老街区一场婚礼引发关注。一位坐轮椅的老兵身着旧军装，佩戴一枚极为罕见的古董勋章为新人证婚。邻里称那是'真正的荣耀'。",
        category: NewsCategory.NARRATIVE,
        priority: 90,
        duration: 1,
        triggers: [
            { variable: "chain_zhao.stage", operator: "==", value: 99 }, // Happy Ending flag (implicit)
            { variable: "chain_zhao.trust", operator: ">=", value: 50 }   // High trust derived var
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
            { variable: "chain_zhao.trust", operator: "<=", value: 0 } // Bad ending flag
        ]
    },

    // --- MARKET INTELLIGENCE ---
    {
        id: "news_market_police_raid",
        headline: "治安整顿：销赃渠道严打",
        body: "市警局宣布启动'雷霆行动'，重点打击电子产品和珠宝的非法交易。据传地下黑市收货价格已暴跌。",
        category: NewsCategory.MARKET,
        priority: 50,
        duration: 3,
        triggers: [
            { variable: "reputation.Underworld", operator: ">=", value: 30 } // High underworld rep triggers scrutiny
        ],
        effect: {
            categoryTarget: "电子产品",
            priceMultiplier: 0.7, // Prices drop
            riskModifier: 20 // Risk increases (not implemented in logic yet, but good for flavor)
        }
    },
    {
        id: "news_market_luxury_hype",
        headline: "时尚风向：复古风潮回归",
        body: "某一线女星近日佩戴中古奢侈品出街，引发抢购热潮。典当行此类物品估值有望水涨船高。",
        category: NewsCategory.MARKET,
        priority: 45,
        duration: 2,
        triggers: [
            { variable: "day", operator: ">", value: 3 } // Randomly after day 3
        ],
        effect: {
            categoryTarget: "奢侈品",
            priceMultiplier: 1.2
        }
    },

    // --- FLAVOR / ATMOSPHERE ---
    {
        id: "news_flavor_rain",
        headline: "城市通告：酸性降雨持续",
        body: "气象局发布橙色预警。受工业区回流气流影响，未来24小时本市将迎来持续酸雨。街道排水系统不堪重负，底层街区已被污水倒灌。这种天气，连霓虹灯都显得格外无力。",
        category: NewsCategory.FLAVOR,
        priority: 10,
        duration: 1,
        triggers: [
             { variable: "day", operator: "%", value: 3 } // Every 3rd day roughly
        ]
    },
    {
        id: "news_flavor_inflation",
        headline: "经济简报：房租指数上涨",
        body: "由于中心区改造计划搁置，边缘街区租金并未如期下调。对于小微企业主来说，这个冬天依然寒冷。",
        category: NewsCategory.FLAVOR,
        priority: 10,
        duration: 1,
        triggers: [
             { variable: "day", operator: "%", value: 5 } // Rent day
        ]
    }
];
