
import { Customer, Item, ItemLogEntry, VisitTier, EchoTrigger, PlayerChoiceType } from '../../../types';
import { createTextRegistry, TextRegistry } from '../../utils/textRegistry';
import logTemplatesCSV from '@/assets/data/texts/log_templates.csv?raw';

// ============================================================================
// CSV Text Registry (lazy-loaded)
// ============================================================================

let logTexts: TextRegistry | null = null;

function getTexts(): TextRegistry {
    if (!logTexts) {
        logTexts = createTextRegistry('log_templates', logTemplatesCSV);
    }
    return logTexts;
}

/** Pick a random string from an array */
function pickRandom(arr: string[]): string {
    if (arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

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

/** Build template vars from customer/item context */
function buildPawnVars(customer: Customer, item: Item): Record<string, string> {
    const moodDesc = customer.mood === 'Happy' ? "语气轻快" : (customer.mood === 'Angry' ? "有些急躁" : "神色平静");
    return {
        name: customer.name,
        description: customer.description,
        item_name: item.name,
        mood_desc: moodDesc,
        pawn_reason: customer.dialogue.pawnReason,
    };
}

/** Get tier key prefixes for CSV lookup */
const TIER_KEY_PREFIXES: Record<VisitTier, string[]> = {
    1: ['tier1_factual', 'tier1_observational'],
    2: ['tier2_observational', 'tier2_factual'],
    3: ['tier3_observational', 'tier3_emotional', 'tier3_factual'],
    4: ['tier4_dramatic', 'tier4_emotional', 'tier4_observational'],
    5: ['tier5_dramatic', 'tier5_emotional'],
};

export const generatePawnLog = (customer: Customer, item: Item, day: number, visitCount: number, valuation?: number): ItemLogEntry => {
    const tier = getVisitTier(visitCount);
    const vars = buildPawnVars(customer, item);
    const texts = getTexts();
    let content = "";

    // DESPERATE behavior overrides tier logic for extreme situations
    if (customer.behaviorTags.includes('DESPERATE') || customer.identityTags.includes('HighRisk')) {
        const templates = texts.getAllWithVars('desperate', vars);
        content = templates.length > 0 ? pickRandom(templates) : `${item.name}被推过来。`;
    } else {
        const keys = TIER_KEY_PREFIXES[tier];
        const allTemplates = keys.flatMap(key => texts.getAllWithVars(key, vars));
        content = allTemplates.length > 0 ? pickRandom(allTemplates) : `标准质押。${item.name}。`;
    }

    content += ` [死当估值: $${valuation ?? item.pawnInfo?.valuation ?? '未知'}]`;

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
    const texts = getTexts();
    let content = "";

    // S3-C1: Player choice text follows tone tiers
    if (choiceType === 'CONTRACT_RATE' && options.rate !== undefined && options.principal !== undefined) {
        const rateLabel = CONTRACT_RATE_LABELS[String(options.rate)] || `${(options.rate * 100).toFixed(0)}%`;
        const vars = { principal: String(options.principal), rate_label: rateLabel };

        if (options.rate === 0) {
            content = texts.getWithVars('contract_charity', vars) || `当金 $${options.principal}（${rateLabel}）。`;
        } else if (options.rate >= 0.2) {
            content = texts.getWithVars('contract_shark', vars) || `当金 $${options.principal}（${rateLabel}）。`;
        } else {
            content = texts.getWithVars('contract_standard', vars) || `当金 $${options.principal}（${rateLabel}）。`;
        }
    } else if (choiceType === 'DEPARTURE' && options.satisfaction) {
        const key = `departure_${options.satisfaction}`;
        content = texts.get(key) || texts.get('departure_DEFAULT') || "交易结束。";
    } else if (choiceType === 'EXPIRY_DECISION' && options.decision) {
        const key = `expiry_${options.decision}`;
        const vars = {
            customer_name: options.customerName || '她',
            decision: options.decision,
        };
        content = texts.getWithVars(key, vars) || texts.getWithVars('expiry_default', vars) || `到期处理：${options.decision}。`;
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

export const generateEchoLog = (
    day: number,
    trigger: EchoTrigger,
    chainId: string,
): ItemLogEntry => {
    const texts = getTexts();
    const key = `echo_${trigger}`;
    const templates = texts.getAll(key);
    const content = templates.length > 0 ? pickRandom(templates) : "......";

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
// NOTE: Decay templates remain in-code because their structure (category x threshold)
// doesn't map cleanly to simple key/text CSV. Future: dedicated decay_templates.csv

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

// === Existing log generators (loaded from CSV) ===

export const generateRedeemLog = (customerName: string, item: Item, day: number, payment: number): ItemLogEntry => {
    const texts = getTexts();
    const vars = { customer_name: customerName, item_name: item.name, payment: String(payment) };
    const templates = texts.getAllWithVars('redeem', vars);
    const content = templates.length > 0 ? pickRandom(templates) : `${customerName}回来赎回了${item.name}。`;
    return { id: crypto.randomUUID(), day, content, type: 'REDEEM', metadata: { payment } };
};

export const generateForfeitLog = (item: Item, day: number, reason?: string): ItemLogEntry => {
    const texts = getTexts();
    const vars = { item_name: item.name, reason: reason || '' };
    let content: string;
    if (reason) {
        content = texts.getWithVars('forfeit_reason', vars) || `${reason}。${item.name}归入库存。`;
    } else {
        content = texts.getWithVars('forfeit_default', vars) || `无人来赎。${item.name}正式成为店铺资产。`;
    }
    return { id: crypto.randomUUID(), day, content, type: 'FORFEIT', metadata: { reason } };
};

export const generateSoldLog = (item: Item, day: number, amount: number): ItemLogEntry => {
    const texts = getTexts();
    const vars = { item_name: item.name, amount: String(amount) };
    const content = texts.getWithVars('sold', vars) || `${item.name}以$${amount}的价格售出。`;
    return { id: crypto.randomUUID(), day, content, type: 'SOLD', metadata: { amount } };
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
    const texts = getTexts();
    let content: string;

    if (options?.valueJump === 'FAKE') {
        const rangeText = options.newRange
            ? ` 估值修正: $${options.newRange[0]} - $${options.newRange[1]}`
            : '';
        const vars = { discovery, range_text: rangeText };
        content = texts.getWithVars('appraisal_fake', vars) || `价值崩塌！发现: ${discovery}。${rangeText}`;
    } else if (options?.valueJump === 'JACKPOT') {
        const rangeText = options.newRange
            ? ` 估值修正: $${options.newRange[0]} - $${options.newRange[1]}`
            : '';
        const vars = { discovery, range_text: rangeText };
        content = texts.getWithVars('appraisal_jackpot', vars) || `价值发现！发现: ${discovery}。${rangeText}`;
    } else {
        const vars = { discovery };
        const key = isNegative ? 'appraisal_negative' : 'appraisal_positive';
        content = texts.getWithVars(key, vars) || `${isNegative ? "发现" : "确认"}: ${discovery}`;
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

// === #21: Spectrometer anomaly log ===

export const generateSpectrometerLog = (
    day: number,
    feedbackText: string,
    isAnomaly: boolean,
): ItemLogEntry => {
    const texts = getTexts();
    const vars = { feedback: feedbackText };
    const key = isAnomaly ? 'spectrometer_anomaly' : 'spectrometer_normal';
    const content = texts.getWithVars(key, vars) || `光谱仪: ${feedbackText}`;

    return {
        id: crypto.randomUUID(),
        day,
        content,
        type: 'INFO',
        metadata: {
            reason: isAnomaly ? 'spectrometer_anomaly' : 'spectrometer_normal',
        }
    };
};

// === #11: Workshop insight hint ===

export const getWorkshopInsightHint = (): string | undefined => {
    const texts = getTexts();
    return texts.getRandom('workshop_insight_hint');
};

// === #12: Workshop morning hint ===

export const getWorkshopMorningHint = (): string | undefined => {
    const texts = getTexts();
    return texts.getRandom('workshop_morning_hint');
};
