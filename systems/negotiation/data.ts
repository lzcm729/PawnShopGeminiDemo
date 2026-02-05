
export type InstinctRateZone = 'charity' | 'aid' | 'standard' | 'shark';
export type InstinctPriceZone = 'insult' | 'haggling' | 'fair' | 'premium';
export type InstinctNpcStyle = 'Desperate' | 'Aggressive' | 'Professional' | 'Deceptive';

export const getMatrixKey = (rate: InstinctRateZone, price: InstinctPriceZone, style: InstinctNpcStyle) => {
    return `${rate}_${price}_${style}`;
};

export const INSTINCT_MATRIX: Record<string, string[]> = {
    // --- SHARK (20%) ---
    'shark_insult_Desperate': [
        "这是在往伤口上撒盐... 但他只能吞下去。",
        "我几乎能听到他心碎的声音。",
        "我在利用他的绝望，这很残酷，但很有效。"
    ],
    'shark_insult_Aggressive': [
        "小心，这种人被逼急了什么都干得出来。",
        "这简直是在挑衅。他可能会直接翻脸。",
        "他在压抑怒火... 贪婪让我变得愚蠢。"
    ],
    'shark_haggling_Desperate': [
        "他在发抖。这笔高利贷会压垮他，但他别无选择。",
        "这笔钱带着血腥味。但我饿了。",
        "他在计算还能撑几天。我赢了。"
    ],
    'shark_fair_Deceptive': [
        "即使是骗子也得在这个利率面前低头。",
        "高风险，高回报。他在权衡利弊。",
        "他在掩饰，但我知道他动心了。"
    ],

    // --- CHARITY (0%) ---
    'charity_fair_Desperate': [
        "不赚钱，但这是他最后的救命稻草。",
        "也许这能让他今晚睡个好觉。",
        "我在用本金购买片刻的安宁。"
    ],
    'charity_fair_Professional': [
        "不赚钱，但这笔交易干净利落。",
        "专业人士之间的体面。",
        "这就是所谓的'结善缘'。"
    ],
    'charity_insult_Aggressive': [
        "即使我不收利息，他还是觉得我在侮辱他。",
        "这人贪得无厌。我的好心被当成了驴肝肺。",
        "给他免息都嫌少？这人没救了。"
    ],

    // --- STANDARD (10%) ---
    'standard_haggling_Professional': [
        "正常的商业拉锯。他在试探我的底线。",
        "只差一点了。保持耐心。",
        "他在计算得失。还没触到底。"
    ],
    'standard_haggling_Deceptive': [
        "他在演戏，别被骗了——但也别太过分。",
        "虚张声势。他其实很想成交。",
        "他在等我让步，但我看穿了他的把戏。"
    ],
    'standard_premium_Desperate': [
        "给得太多了。这简直是意外之喜。",
        "他在发抖... 他没想到我会给这么多。",
        "这价格足以让他对我感激涕零。"
    ],

    // --- AID (5%) ---
    'aid_fair_Desperate': [
        "微薄的利息，巨大的帮助。",
        "这不仅仅是生意，这是援手。",
        "希望能帮他渡过难关。"
    ],
    
    // --- FALLBACK GENERIC ---
    'generic_insult': [
        "这价格是在羞辱对方。",
        "他在压抑怒火。",
        "再低就要谈崩了。"
    ],
    'generic_haggling': [
        "还在拉锯战。",
        "他在犹豫。",
        "也许再加一点？"
    ],
    'generic_premium': [
        "极其慷慨的出价。",
        "这完全溢价了。",
        "他无法拒绝这个数字。"
    ],
    'generic_fake_bargain': [
        "虽然是假货，但这价格收来玩玩也不亏。",
        "明知是假的还收... 这就是所谓的捡漏？",
        "他在撒谎，我在压价。公平的游戏。"
    ],

    // --- PUSH-PULL: 坚持场景 ---
    'persist_1_Desperate': [
        "他在犹豫...再坚持一下可能有戏。",
        "眼神闪烁，他快要妥协了。",
        "坚持住，他比我更着急。"
    ],
    'persist_2_Desperate': [
        "他快要妥协了！",
        "崩溃边缘，再推一下。",
        "他的防线正在瓦解。"
    ],
    'persist_1_Aggressive': [
        "他很固执，但我也不是软柿子。",
        "硬碰硬。看谁先眨眼。",
        "他在虚张声势，别上当。"
    ],
    'persist_2_Aggressive': [
        "意外，他开始动摇了。",
        "铁石心肠也有裂缝。",
        "继续施压，有门！"
    ],
    'persist_1_Deceptive': [
        "他在演戏，但演技开始露馅了。",
        "狐狸尾巴快藏不住了。",
        "我看穿了他的把戏。"
    ],
    'persist_2_Deceptive': [
        "他的伪装在瓦解。",
        "真面目快要暴露了。",
        "压力之下现原形。"
    ],
    'persist_1_Professional': [
        "专业对专业，谁也别想糊弄谁。",
        "他在权衡，我在等待。",
        "这是耐心的较量。"
    ],
    'persist_2_Professional': [
        "他的态度开始软化。",
        "专业人士也要吃饭。",
        "价格正在松动。"
    ],

    // --- PUSH-PULL: NPC 让步场景 ---
    'npc_conceded_Desperate': [
        "他让步了。这种人好说话。",
        "果然，走投无路的人没有底线。",
        "预料之中的退让。"
    ],
    'npc_conceded_Aggressive': [
        "意外！他居然让步了。",
        "强硬的外表下是空虚的内心。",
        "没想到他会退这一步。"
    ],
    'npc_conceded_Deceptive': [
        "面具终于摘下来了。",
        "他的狡猾挡不住现实。",
        "假话说多了，自己也信了。"
    ],
    'npc_conceded_Professional': [
        "专业的选择。他知道行情。",
        "识时务者为俊杰。",
        "理性战胜了情绪。"
    ],

    // --- PUSH-PULL: NPC 到底场景 ---
    'npc_at_limit': [
        "他不会再让了，这是真底价。",
        "到头了。再压也没用。",
        "他的眼神告诉我，到此为止。"
    ],
    'npc_at_limit_Desperate': [
        "即使走投无路，他也不能再退了。",
        "这是他最后的尊严底线。",
        "再低他就活不下去了。"
    ],
    'npc_at_limit_Aggressive': [
        "他真的怒了。这是真底线。",
        "火药味很浓，别再试了。",
        "再逼就要翻脸了。"
    ]
};

export const getRandomText = (texts: string[], seed: number) => {
    if (!texts || texts.length === 0) return "...";
    const index = Math.floor(Math.abs(seed)) % texts.length;
    return texts[index];
};
