
import { Customer, Item, ItemLogEntry, VisitTier, EchoTrigger, PlayerChoiceType } from '../../../types';

// === S3-F3: Visit tier calculation (5-tier system, design doc F) ===

export const getVisitTier = (visitCount: number): VisitTier => {
    if (visitCount <= 1) return 1;
    if (visitCount === 2) return 2;
    if (visitCount === 3) return 3;
    if (visitCount === 4) return 4;
    return 5; // 5+
};

// === S3-F3 + S3-C1 + S3-C2: Five-tier pawn log templates ===
// Tone tiers (design doc K): 事务性(30-40%), 观察性(30-40%), 情感性(15-20%), 戏剧性(5-10%)
// Visit tiers (design doc F): 1=客观记录, 2=识别回忆, 3=关切观察, 4=命运纠缠, 5+=终局氛围
// Non-linear variation (design doc F): NPC behavior changes, not monotonic descent

const TIER_TEMPLATES: Record<VisitTier, (customer: Customer, item: Item) => string[]> = {
    // Tier 1: 客观记录 — 中性/好奇 (mostly 事务性 + 观察性)
    1: (customer, item) => {
        const moodDesc = customer.mood === 'Happy' ? "语气轻快" : (customer.mood === 'Angry' ? "有些急躁" : "神色平静");
        return [
            // 事务性
            `标准质押。${customer.description}。${item.name}，状况良好。`,
            `${customer.description}，${moodDesc}。${customer.dialogue.pawnReason}。`,
            // 观察性
            `一位${customer.description}的顾客将${item.name}放在柜台上。${moodDesc}。`,
            `${customer.description}。她把${item.name}从包里取出来时很小心，像是怕弄坏什么。`,
        ];
    },
    // Tier 2: 识别回忆 — 轻微担忧 (观察性为主, 加入矛盾信号)
    2: (customer, item) => [
        // 观察性 + 矛盾信号
        `那位之前来过的${customer.name}又来了。这次带来了${item.name}。${customer.dialogue.pawnReason}。`,
        `${customer.name}。有印象，之前来过一次。她笑着说只是短期周转，但开口前犹豫了很久。`,
        // 事务性
        `${customer.name}再次到访。典当物品：${item.name}。`,
        // 观察性
        `${customer.name}推门进来的时候，步子比上次快了些。她把${item.name}放下，没怎么讨价还价。`,
    ],
    // Tier 3: 关切观察 — 明确忧虑 (观察性 + 情感性, 矛盾信号加深)
    3: (customer, item) => [
        // 观察性 + 矛盾信号
        `${customer.name}穿着整洁的衣服，但袖口已经磨出了毛边。这件${item.name}似乎是她为数不多的资产了。`,
        `第三次见到${customer.name}了。她说最近在找工作，语气听起来比上次平静，但眼睛一直在看门口。`,
        // 情感性
        `${customer.name}又来了。${item.name}被轻轻放在柜台上，像是在和它告别。`,
        // 事务性
        `${customer.name}，第三次来访。${customer.dialogue.pawnReason}。`,
    ],
    // Tier 4: 命运纠缠 — 沉重/无力 (情感性 + 戏剧性, 行为变化代替形容词)
    4: (customer, item) => [
        // 戏剧性
        `她几乎是摔进店里的，手在发抖。${item.name}被随意丢在柜台上。`,
        // 情感性 + 矛盾信号
        `${customer.name}说不需要收据了。她把${item.name}推过来，手指在颤。`,
        // 观察性 (行为变化: 更冷淡/机械)
        `${customer.name}。已经不需要寒暄了。她把${item.name}推过来，甚至没有开口。`,
        // 情感性
        `${customer.name}进来时低着头。${item.name}轻轻放在柜台上，她站在那里等，像是已经不在乎结果了。`,
    ],
    // Tier 5+: 终局氛围 — 哀伤/释然 (戏剧性 + 情感性, 极简/留白)
    5: (customer, item) => [
        // 戏剧性
        `她什么也没说，直接把${item.name}放在柜台上。`,
        `${customer.name}进来时，店里的空气仿佛凝固了。又一件东西。`,
        // 情感性 (释然)
        `${customer.name}把${item.name}放下的时候，表情很平静。太平静了。`,
        // 戏剧性 (反讽)
        `她说这是最后一次了。她上次也这么说的。`,
    ],
};

// Desperate override templates (used regardless of tier when DESPERATE tag present)
// Tone: 情感性 + 戏剧性 (override uses high emotional density)
const DESPERATE_TEMPLATES = (customer: Customer, item: Item): string[] => [
    `她把${item.name}放在柜台上时手在抖。这是一笔沉重的交易。`,
    `这似乎是她最后的体面。${customer.description}，眼神游离。`,
    `急需用钱。${customer.dialogue.pawnReason}。她甚至没有仔细看合同条款。`,
    `${item.name}被推过来。她的指甲里嵌着泥，但衣服还是干净的。`,
];

export const generatePawnLog = (customer: Customer, item: Item, day: number, visitCount: number): ItemLogEntry => {
    const tier = getVisitTier(visitCount);
    let content = "";

    // DESPERATE behavior overrides tier logic for extreme situations
    if (customer.behaviorTags.includes('DESPERATE') || customer.identityTags.includes('HighRisk')) {
        const templates = DESPERATE_TEMPLATES(customer, item);
        content = templates[Math.floor(Math.random() * templates.length)];
    } else {
        const templates = TIER_TEMPLATES[tier](customer, item);
        content = templates[Math.floor(Math.random() * templates.length)];
    }

    content += ` [死当估值: $${item.pawnInfo?.valuation}]`;

    return {
        id: crypto.randomUUID(),
        day: day,
        content: content,
        type: 'ENTRY',
        metadata: { visitCount, visitTier: tier, moodState: customer.mood }
    };
};

// === S3-F1: Player choice log generation (design doc A) ===

const CONTRACT_RATE_LABELS: Record<string, string> = {
    '0': '0% 慈善利率',
    '0.05': '5% 援助利率',
    '0.1': '10% 标准利率',
    '0.2': '20% 高利贷',
};

export const generatePlayerChoiceLog = (
    day: number,
    choiceType: PlayerChoiceType,
    options: {
        rate?: number;
        principal?: number;
        satisfaction?: string;
        decision?: string;
        customerName?: string;
    }
): ItemLogEntry => {
    let content = "";

    // S3-C1: Player choice text follows tone tiers
    if (choiceType === 'CONTRACT_RATE' && options.rate !== undefined && options.principal !== undefined) {
        const rateLabel = CONTRACT_RATE_LABELS[String(options.rate)] || `${(options.rate * 100).toFixed(0)}%`;
        if (options.rate === 0) {
            // 情感性: charity rate
            content = `当金 $${options.principal}（${rateLabel}）。她几乎不敢相信地看着收据。`;
        } else if (options.rate >= 0.2) {
            // 戏剧性: shark rate
            content = `当金 $${options.principal}（${rateLabel}）。她犹豫了很久，最终还是签了。`;
        } else {
            // 事务性: standard/aid rate
            content = `当金 $${options.principal}（${rateLabel}）。`;
        }
    } else if (choiceType === 'DEPARTURE' && options.satisfaction) {
        switch (options.satisfaction) {
            // 情感性
            case 'GRATEFUL': content = "她离开时，我说了句'保重'。"; break;
            // 观察性
            case 'NEUTRAL': content = "我目送她离开，什么也没说。"; break;
            // 观察性
            case 'RESENTFUL': content = "她头也不回地走了。"; break;
            // 戏剧性
            case 'DESPERATE': content = "她在门口停了一下，最终还是走进了雨里。"; break;
            // 事务性
            default: content = "交易结束。";
        }
    } else if (choiceType === 'EXPIRY_DECISION' && options.decision) {
        switch (options.decision) {
            // 情感性
            case 'redeem_accept': content = `${options.customerName || '她'}回来赎回了。`; break;
            // 戏剧性
            case 'redeem_refuse': content = "我拒绝了赎回请求。合同就是合同。"; break;
            // 事务性
            case 'renew_accept': content = "我延长了赎回期限。"; break;
            // 观察性
            case 'renew_refuse': content = "我拒绝了续当请求。她站了一会儿才离开。"; break;
            // 观察性
            case 'noshow_sell': content = "合同到期，她没有出现。挂牌出售。"; break;
            // 情感性
            case 'noshow_keep': content = "合同到期，她没有出现。我决定再等等。"; break;
            // 事务性
            default: content = `到期处理：${options.decision}。`;
        }
    }

    return {
        id: crypto.randomUUID(),
        day,
        content,
        type: 'PLAYER_CHOICE',
        metadata: {
            playerChoice: {
                type: choiceType,
                rate: options.rate,
                satisfaction: options.satisfaction,
                decision: options.decision,
            }
        }
    };
};

// === S3-F2: Echo entry generation (design doc J) ===

// S3-C1: Echo templates follow tone tiers (mostly 情感性 + 戏剧性, brief and restrained)
const ECHO_TEMPLATES: Record<EchoTrigger, string[]> = {
    HOPE_COLLAPSE: [
        "......很久没有人来问起这件东西了。",
        "尘埃落在上面，像是在替它的主人叹气。",
        "它安静地待在架子上。外面的世界似乎已经忘记了它。",
    ],
    JOB_SUCCESS: [
        "也许它的主人不再需要它了——以一种好的方式。",
        "外面传来了好消息。这件东西也许很快就能回家了。",
    ],
    EXPIRED_NO_REDEEM: [
        "赎回期已过。它现在属于这里了。",
        "没有人来。合同上的日期已经过了。",
    ],
    FUNDS_DEPLETED: [
        "她大概已经没有余力再想起这件东西了。",
        "......",
    ],
    NPC_REDEEMED: [
        "她回来了。她拿走了它，就像拿回了自己丢失的一部分。",
        "她来赎回的时候，手里攥着刚好够的钱。",
    ],
};

export const generateEchoLog = (
    day: number,
    trigger: EchoTrigger,
    chainId: string,
): ItemLogEntry => {
    const templates = ECHO_TEMPLATES[trigger];
    const content = templates[Math.floor(Math.random() * templates.length)];

    return {
        id: crypto.randomUUID(),
        day,
        content,
        type: 'ECHO',
        metadata: {
            echoTrigger: trigger,
            echoChainId: chainId,
        }
    };
};

// === Existing log generators (unchanged) ===

export const generateRedeemLog = (customerName: string, item: Item, day: number, payment: number): ItemLogEntry => {
    const templates = [
        `${customerName}回来赎回了这件${item.name}。支付了$${payment}。物归原主。`,
        `赎回。${customerName}带走了${item.name}，留下了$${payment}。`,
        `交易完结。${customerName}取回${item.name}，柜台多了$${payment}。`
    ];
    return { id: crypto.randomUUID(), day, content: templates[Math.floor(Math.random() * templates.length)], type: 'REDEEM', metadata: { payment } };
};

export const generateForfeitLog = (item: Item, day: number, reason?: string): ItemLogEntry => {
    const content = reason ? `${reason}。${item.name}归入库存。` : `无人来赎。${item.name}正式成为店铺资产。`;
    return { id: crypto.randomUUID(), day, content, type: 'FORFEIT', metadata: { reason } };
};

export const generateSoldLog = (item: Item, day: number, amount: number): ItemLogEntry => {
    return { id: crypto.randomUUID(), day, content: `${item.name}以$${amount}的价格售出。这段故事结束了。`, type: 'SOLD', metadata: { amount } };
};

interface AppraisalLogOptions {
    valueJump?: 'FAKE' | 'JACKPOT';
    newRange?: [number, number];
}

export const generateAppraisalLog = (
    item: Item,
    day: number,
    discovery: string,
    isNegative: boolean,
    options?: AppraisalLogOptions
): ItemLogEntry => {
    let content: string;

    if (options?.valueJump === 'FAKE') {
        const rangeText = options.newRange
            ? ` 估值修正: $${options.newRange[0]} - $${options.newRange[1]}`
            : '';
        content = `价值崩塌！发现: ${discovery}。${rangeText}`;
    } else if (options?.valueJump === 'JACKPOT') {
        const rangeText = options.newRange
            ? ` 估值修正: $${options.newRange[0]} - $${options.newRange[1]}`
            : '';
        content = `价值发现！发现: ${discovery}。${rangeText}`;
    } else {
        const prefix = isNegative ? "发现: " : "确认: ";
        content = `${prefix}${discovery}`;
    }

    return {
        id: crypto.randomUUID(),
        day,
        content,
        type: 'APPRAISAL',
        metadata: {
            isNegative,
            valueJump: options?.valueJump,
            newRange: options?.newRange
        }
    };
};
