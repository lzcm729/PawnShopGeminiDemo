
import { GameState } from '../game/types';
import { SatisfactionLevel } from './types';

export interface InnerVoice {
    id: string;
    text: string;
    priority: number;
    condition: (state: GameState) => boolean;
}

export const BEDTIME_THOUGHTS: InnerVoice[] = [
    // --- CRITICAL SURVIVAL ---
    {
        id: 'bedtime_broke_critical',
        text: "账上的数字变成了红色。如果下周交不上租金，我和妈妈就会被赶到街上... 必须想办法。",
        priority: 100,
        condition: (state) => state.stats.cash < 100
    },
    {
        id: 'bedtime_mother_critical',
        text: "医院刚才发来了催款单。如果停药... 我不敢想下去。在这个城市，命是用钱买的。",
        priority: 95,
        condition: (state) => state.stats.motherStatus.status === 'Critical' || state.stats.medicalBill.status === 'OVERDUE'
    },

    // --- FINANCIAL ---
    {
        id: 'bedtime_rich',
        text: "今天的保险柜比往常沉了一些。但这还不够... 手术费是个天文数字。我不能松懈。",
        priority: 50,
        condition: (state) => state.stats.cash > 5000 && state.stats.cash < state.stats.targetSavings
    },
    {
        id: 'bedtime_surviving',
        text: "又撑过了一天。只要还有明天，就还有希望。",
        priority: 10,
        condition: () => true // Fallback
    },

    // --- MORAL ALIGNMENT ---
    {
        id: 'bedtime_guilt_high',
        text: "我今天看见了那个人离开时的眼神... 我是不是做得太绝了？不，我没得选。为了活下去，良心是奢侈品。",
        priority: 80,
        condition: (state) => state.lastSatisfaction === 'RESENTFUL' || state.lastSatisfaction === 'DESPERATE'
    },
    {
        id: 'bedtime_good_karma',
        text: "那个顾客走的时候笑了。也许即使是在这泥潭里，人也能拉别人一把... 希望好人有好报吧。",
        priority: 80,
        condition: (state) => state.lastSatisfaction === 'GRATEFUL'
    },

    // --- SPECIFIC EVENTS ---
    {
        id: 'bedtime_police_risk',
        text: "警车的声音在街角响了一整晚。那个违禁品... 我是不是该尽早处理掉？手心一直在冒汗。",
        priority: 90,
        condition: (state) => state.violationFlags.includes('police_risk_ignored')
    }
];

export const DEPARTURE_THOUGHTS: Record<SatisfactionLevel, string[]> = {
    'GRATEFUL': [
        "至少这次，我做对了。",
        "希望这点钱能帮到他。",
        "这就是所谓的... 问心无愧吗？",
        "看着他的背影，我竟感到一丝轻松。"
    ],
    'NEUTRAL': [
        "生意就是生意。",
        "下一位。",
        "钱货两清，各取所需。",
        "只是这城市里又一笔普通的交易。"
    ],
    'RESENTFUL': [
        "别怪我... 我也要吃饭。",
        "那种眼神... 我以前见过。",
        "我不是慈善家。",
        "他恨我。但我活下来了。"
    ],
    'DESPERATE': [
        "我是不是... 做得太绝了？",
        "刚才那一瞬间，我看到了自己。",
        "我没办法... 我真的没办法。",
        "抱歉... 在这个世界，同情心会害死人。"
    ]
};

export const getBedtimeMonologue = (state: GameState): string => {
    const candidates = BEDTIME_THOUGHTS.filter(t => t.condition(state));
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates.length > 0 ? candidates[0].text : "......";
};

export const getDepartureMonologue = (satisfaction: SatisfactionLevel): string => {
    const options = DEPARTURE_THOUGHTS[satisfaction];
    if (!options) return "...";
    return options[Math.floor(Math.random() * options.length)];
};
