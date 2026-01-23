

import { Customer, Item, ItemLogEntry } from '../types';

export const generatePawnLog = (customer: Customer, item: Item, day: number, visitCount: number): ItemLogEntry => {
    
    const appearance = customer.description;
    const mood = customer.mood;
    const negotiationStyle = customer.negotiationStyle;
    
    let content = "";

    // --- LOGIC: BRANCHING NARRATIVES ---

    if (negotiationStyle === 'Desperate' || customer.tags.includes('HighRisk')) {
        // DESPERATE CASE
        const templates = [
            `"${item.name}"... 她把它放在柜台上时手在抖。这是一笔沉重的交易。`,
            `这似乎是她最后的体面。${appearance}，眼神游离。`,
            `急需用钱。${customer.dialogue.pawnReason} 她甚至没有仔细看合同条款。`
        ];
        content = templates[Math.floor(Math.random() * templates.length)];
    } 
    else if (visitCount === 1) {
        // FIRST VISIT CASE
        const moodDesc = mood === 'Happy' ? "充满自信" : (mood === 'Angry' ? "有些不耐烦" : "神色平静");
        content = `一位${appearance}的顾客。典当这件${item.name}时，${moodDesc}。${customer.dialogue.pawnReason}。`;
    } 
    else {
        // RETURNING CASE (Visit > 1)
        if (mood === 'Annoyed' || mood === 'Angry') {
            // WORSE STATE
            content = `那个${customer.name}又回来了。比上次${appearance}。这件${item.name}似乎是她为数不多的资产了。`;
        } else {
            // NEUTRAL/BETTER STATE
            content = `熟客。${customer.name}再次光顾。${customer.dialogue.pawnReason}。交易过程很顺利。`;
        }
    }

    // Add financial note implicitly
    content += ` [死当估值: $${item.pawnInfo?.valuation}]`;

    return {
        id: crypto.randomUUID(),
        day: day,
        content: content,
        type: 'ENTRY',
        metadata: {
            visitCount,
            moodState: mood
        }
    };
};

/**
 * Generate Redeem Log
 */
export const generateRedeemLog = (
    customerName: string,
    item: Item,
    day: number,
    payment: number
): ItemLogEntry => {
    const templates = [
        `${customerName}回来赎回了这件${item.name}。支付了$${payment}。物归原主。`,
        `赎回。${customerName}带走了${item.name}，留下了$${payment}。`,
        `交易完结。${customerName}取回${item.name}，柜台多了$${payment}。`
    ];

    return {
        id: crypto.randomUUID(),
        day,
        content: templates[Math.floor(Math.random() * templates.length)],
        type: 'REDEEM',
        metadata: { payment }
    };
};

/**
 * Generate Forfeit Log
 */
export const generateForfeitLog = (
    item: Item,
    day: number,
    reason?: string
): ItemLogEntry => {
    const content = reason
        ? `${reason}。${item.name}归入库存。`
        : `无人来赎。${item.name}正式成为店铺资产。`;

    return {
        id: crypto.randomUUID(),
        day,
        content,
        type: 'FORFEIT',
        metadata: { reason }
    };
};

/**
 * Generate Sold Log
 */
export const generateSoldLog = (
    item: Item,
    day: number,
    amount: number
): ItemLogEntry => {
    return {
        id: crypto.randomUUID(),
        day,
        content: `${item.name}以$${amount}的价格售出。这段故事结束了。`,
        type: 'SOLD',
        metadata: { amount }
    };
};

/**
 * Generate Appraisal Log
 */
export const generateAppraisalLog = (
    item: Item,
    day: number,
    discovery: string,
    isNegative: boolean
): ItemLogEntry => {
    const prefix = isNegative ? "⚠️ 发现: " : "✓ 确认: ";
    return {
        id: crypto.randomUUID(),
        day,
        content: `${prefix}${discovery}`,
        type: 'APPRAISAL',
        metadata: { isNegative }
    };
};