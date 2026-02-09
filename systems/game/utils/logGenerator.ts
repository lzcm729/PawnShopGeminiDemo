
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

// === S3-D: Natural decay log generation (design doc D) ===
// Category-specific decay text templates keyed by threshold day.
// Tone: mostly 事务性 + 观察性 (low emotional density, factual observation).

type DecayTemplates = Record<number, string[]>;

const DECAY_BY_CATEGORY: Record<string, DecayTemplates> = {
    // Electronics / digital / camera
    '电子产品': {
        7:  ["屏幕上落了一层细灰。", "待机指示灯已经不再闪烁了。"],
        14: ["电池已完全耗尽，无法开机。", "接口处开始氧化，接触不良。"],
        21: ["内部结构可能因长期不通电而老化。", "外壳塑料开始发黄。"],
        28: ["已经很久没有通电了。这类电子产品不适合长时间闲置。", "灰尘渗入了散热口，清理起来会很麻烦。"],
    },
    '相机': {
        7:  ["镜头盖上积了灰。", "取景器里能看到几粒细尘。"],
        14: ["快门帘幕似乎比入库时迟钝了一些。", "电池仓已经完全没电了。"],
        21: ["镜头内部隐约可见雾气凝结的痕迹。", "机身橡胶握把开始变硬。"],
        28: ["长期未使用的机械部件可能需要专业保养了。", "镜头镀膜表面出现了微小的霉斑。"],
    },
    // Textiles / clothing / leather
    '服饰': {
        7:  ["衣料上落了一些灰尘。", "折痕处开始变硬。"],
        14: ["隐约有一股霉味。", "纤维边缘开始起毛。"],
        21: ["发现了一两个蛀虫咬过的小洞。", "颜色似乎比入库时暗淡了一些。"],
        28: ["布料的弹性明显下降了。", "长期折叠导致了不可逆的褶皱。"],
    },
    '皮具': {
        7:  ["皮面上落了一层细灰。", "皮革表面开始变干。"],
        14: ["出现了轻微的裂纹。", "金属配件表面有些氧化。"],
        21: ["皮革已经明显干燥，需要上油保养。", "缝线处出现了松动的迹象。"],
        28: ["皮面龟裂加深了。再不处理就回不来了。", "霉斑从内衬蔓延到了外层。"],
    },
    // Jewelry / precious metals
    '首饰': {
        7:  ["金属表面的光泽暗了一点。", "细缝里积了些灰尘。"],
        14: ["表面开始氧化，失去了原有的光泽。", "宝石座的爪镶有些松动。"],
        21: ["氧化层加深了，需要抛光才能恢复。", "链节之间积了不少污垢。"],
        28: ["没有保养的贵金属看起来就像普通金属了。", "这件首饰需要专业清洗了。"],
    },
    '珠宝': {
        7:  ["光泽微微变暗。", "放置在柜台的绒布上，没人来过问。"],
        14: ["金属底座表面出现了氧化迹象。", "宝石上落了灰，折射不如从前。"],
        21: ["需要抛光处理了。", "链扣处有轻微的锈蚀。"],
        28: ["长期无人佩戴的珠宝会慢慢失去它应有的光彩。", "密封不好，内部已经开始受潮。"],
    },
    // Watches
    '钟表': {
        7:  ["表盘上积了一层薄灰。", "上弦已经停止走动了。"],
        14: ["表冠处有轻微的氧化痕迹。", "表面玻璃上出现了静电吸附的细尘。"],
        21: ["机芯长时间未运转，润滑油可能已经凝固。", "表壳金属开始变色。"],
        28: ["这块表需要全面检修了。", "防水圈已经失去弹性，不宜再接触水。"],
    },
    // Art / antiques / collectibles
    '艺术品': {
        7:  ["画框角落积了灰尘。", "画布表面没有明显变化。"],
        14: ["颜料边缘开始轻微起翘。", "画框接缝处有些松动。"],
        21: ["湿度变化导致画布出现了微小的褶皱。", "背面开始发黄。"],
        28: ["如果不做专业装裱保护，颜料层可能会继续剥落。", "虫蛀的痕迹出现在画框木料上。"],
    },
    '古董': {
        7:  ["表面开始积灰。", "放置处留下了一圈浅浅的印记。"],
        14: ["金属部件有轻微的锈蚀。", "木质表面干燥开裂的征兆。"],
        21: ["氧化加速了。年代久远的物件需要恒温恒湿保存。", "部分装饰件出现了松脱。"],
        28: ["老化速度在加快。这件东西不应该在柜台上放这么久。", "表面包浆被灰尘覆盖，已经看不出原来的色泽了。"],
    },
    '古玩': {
        7:  ["表面落了一层薄灰。", "安静地躺在架子上。"],
        14: ["铜质部件开始发绿。", "底部有些潮气渗入的痕迹。"],
        21: ["需要擦拭保养了。", "接缝处的粘合剂开始老化。"],
        28: ["再这样放下去，品相会明显下降。", "细微的裂纹正在扩展。"],
    },
    '收藏品': {
        7:  ["塑封包装有些积灰。", "边角的保护套有些松了。"],
        14: ["纸质部分开始泛黄。", "阳光照射导致色彩略有褪去。"],
        21: ["品相在悄悄下降。", "包装材料开始脆化。"],
        28: ["收藏品的保存条件不够理想。", "再不处理，品相等级要降一档了。"],
    },
    // Musical instruments
    '乐器': {
        7:  ["琴弦（或簧片）松弛了一些。", "表面积了灰。"],
        14: ["弦轴有些生涩，不太好拧。", "木质部件因湿度变化出现了轻微形变。"],
        21: ["音准已经完全跑掉了。", "金属配件出现锈斑。"],
        28: ["长期不演奏的乐器在默默老去。", "需要全面调校和保养了。"],
    },
    // Books / stationery
    '书籍': {
        7:  ["书页边缘微微发黄。", "封面上积了薄灰。"],
        14: ["纸张变脆了一些。", "书脊处有轻微开裂。"],
        21: ["部分页面粘连在了一起。", "霉斑出现在书页角落。"],
        28: ["这本书需要干燥保存了。再这样下去会严重损坏。", "虫蛀的细孔出现在几页上。"],
    },
    '文房': {
        7:  ["墨迹干涸了。", "表面积了一层灰。"],
        14: ["笔毫有些散开。", "砚台边缘的墨痕开始剥落。"],
        21: ["木质笔杆出现了干裂。", "保存状态不太理想。"],
        28: ["文房用品讲究'气'。长期不用，气韵就散了。", "漆面开始龟裂。"],
    },
    // Luxury goods / wine
    '奢侈品': {
        7:  ["包装盒上落了灰。", "外观没有明显变化。"],
        14: ["金属配件光泽变暗了。", "皮质部分有些干燥。"],
        21: ["品牌标识处积了灰，不太显眼了。", "拉链或扣件手感变硬。"],
        28: ["奢侈品也需要定期保养。再放下去成色会越来越差。", "没有专业保存条件，品相在持续下降。"],
    },
    '酒类': {
        7:  ["瓶身上积了灰。", "酒标完好。"],
        14: ["软木塞有些干缩。", "储藏温度不够理想。"],
        21: ["瓶内液面似乎比入库时低了一点。", "酒标边缘开始翘起。"],
        28: ["不合适的存放条件可能影响了酒的品质。", "瓶底出现了轻微的沉淀。"],
    },
};

// Fallback for categories not explicitly listed
const DECAY_GENERAL: DecayTemplates = {
    7:  ["表面积了一层灰尘。", "没有人来过问它。"],
    14: ["开始显出老化的迹象。", "放置久了，总会有些变化。"],
    21: ["保存状况在变差。", "它安静地待在架子上，无人问津。"],
    28: ["长期存放的物品需要定期检查。", "岁月不饶人，也不饶物。"],
};

/**
 * Get decay templates for a given item category.
 * Falls back to DECAY_GENERAL for unknown categories.
 */
const getDecayTemplates = (category: string): DecayTemplates => {
    return DECAY_BY_CATEGORY[category] || DECAY_GENERAL;
};

/**
 * Generate a decay log entry for an item at a specific storage milestone.
 * @param day Current game day
 * @param daysStored Number of days item has been in storage
 * @param category Item category string
 */
export const generateDecayLog = (
    day: number,
    daysStored: number,
    category: string,
): ItemLogEntry => {
    const templates = getDecayTemplates(category);
    const texts = templates[daysStored] || DECAY_GENERAL[daysStored] || ["物品状况有所变化。"];
    const content = texts[Math.floor(Math.random() * texts.length)];

    return {
        id: crypto.randomUUID(),
        day,
        content,
        type: 'DECAY',
        metadata: {
            reason: `storage_day_${daysStored}`,
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
