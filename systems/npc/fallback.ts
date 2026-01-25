
import { Customer } from "../../types";
import { ItemStatus } from "../items/types";
import { enrichItemWithTraits } from "../items/utils";

// Hardcoded fallback data for when AI generation fails
export const FALLBACK_CUSTOMERS: Partial<Customer>[] = [
    {
        name: "老张",
        description: "满脸通红，浑身酒气的中年男人。",
        avatarSeed: "drunk_zhang",
        dialogue: {
            greeting: "老板... 嗝！这表... 跟了我十年了。",
            pawnReason: "今晚的手气太差了，就差一把... 就一把我就能翻本！",
            redemptionPlea: "明天... 明天我就来赎！我发誓！",
            negotiationDynamic: "别磨叽了，快点给钱！",
            accepted: { fair: "行！算你爽快！", fleeced: "切... 趁火打劫是吧？拿来！", premium: "老板你真是活菩萨！" },
            rejected: "不识货！我去隔壁！",
            rejectionLines: { standard: "走了。", angry: "晦气！" },
            exitDialogues: {
                grateful: "这就对了！等我发财了请你喝酒！",
                neutral: "走了。回见。",
                resentful: "什么破地方... 也就是老子今天手气背。",
                desperate: "唉... 这一把一定要赢啊..."
            }
        },
        redemptionResolve: "Weak",
        negotiationStyle: "Desperate",
        patience: 2,
        mood: "Annoyed",
        tags: ["HighRisk", "Gambler"],
        desiredAmount: 500,
        minimumAmount: 300,
        maxRepayment: 600,
        item: enrichItemWithTraits({
            id: "fallback_watch",
            name: "金标手表",
            category: "钟表",
            condition: "磨损",
            visualDescription: "表面有划痕，表带有些松动，但分量很足。",
            historySnippet: "这是我赢来的... 以前。",
            appraisalNote: "机芯声音浑浊，可能是进过水。",
            archiveSummary: "老张为了赌资典当的手表。",
            realValue: 400,
            isStolen: false, isFake: false, sentimentalValue: false, status: ItemStatus.ACTIVE
        })
    },
    {
        name: "陈学生",
        description: "背着书包，眼神躲闪的大学生。",
        avatarSeed: "student_chen",
        dialogue: {
            greeting: "你好... 请问这里收电子产品吗？",
            pawnReason: "生活费花超了... 不想让家里人知道。",
            redemptionPlea: "下个月兼职工资发了我就来赎，千万别卖了。",
            negotiationDynamic: "这可是上个月刚买的最新款...",
            accepted: { fair: "谢谢老板！救急了。", fleeced: "啊... 这么少？好吧...", premium: "太感谢了！" },
            rejected: "打扰了...",
            rejectionLines: { standard: "那我再去想想办法。", angry: "..." },
            exitDialogues: {
                grateful: "谢谢老板！您真是帮了大忙了！",
                neutral: "谢谢老板。再见。",
                resentful: "这也太黑了... 不过没办法...",
                desperate: "这下完了... 真的完了..."
            }
        },
        redemptionResolve: "Strong",
        negotiationStyle: "Professional",
        patience: 4,
        mood: "Neutral",
        tags: ["Student"],
        desiredAmount: 1200,
        minimumAmount: 800,
        maxRepayment: 1500,
        item: enrichItemWithTraits({
            id: "fallback_console",
            name: "便携游戏机",
            category: "电子产品",
            condition: "95新",
            visualDescription: "屏幕贴膜完好，按键回弹清脆。",
            historySnippet: "为了买它我吃了两个月泡面。",
            appraisalNote: "系统已被重置，账号已登出。",
            archiveSummary: "学生的生活费周转。",
            realValue: 1000,
            isStolen: false, isFake: false, sentimentalValue: true, status: ItemStatus.ACTIVE
        })
    },
    {
        name: "神秘客",
        description: "戴着墨镜和口罩，看不清面容。",
        avatarSeed: "mystery_guy",
        dialogue: {
            greeting: "收东西吗？不问来源那种。",
            pawnReason: "急需现金，懂的都懂。",
            redemptionPlea: "这东西我不赎了，直接死当。",
            negotiationDynamic: "别废话，一口价。",
            accepted: { fair: "成交。", fleeced: "行吧，算我倒霉。", premium: "爽快。" },
            rejected: "你会后悔的。",
            rejectionLines: { standard: "...", angry: "..." },
            exitDialogues: {
                grateful: "合作愉快。嘴巴严实点。",
                neutral: "两清了。",
                resentful: "啧。算你运气好。",
                desperate: "..."
            }
        },
        redemptionResolve: "None",
        negotiationStyle: "Aggressive",
        patience: 1,
        mood: "Neutral",
        tags: ["Suspicious"],
        desiredAmount: 2000,
        minimumAmount: 1000,
        maxRepayment: 0,
        item: enrichItemWithTraits({
            id: "fallback_diamond",
            name: "裸钻",
            category: "珠宝",
            condition: "全新",
            visualDescription: "一颗约1克拉的裸钻，切工精湛。",
            historySnippet: "路上... 捡的。",
            appraisalNote: "腰码被刻意磨损了。",
            archiveSummary: "来源不明的钻石。",
            realValue: 3000,
            isStolen: true, isFake: false, sentimentalValue: false, status: ItemStatus.ACTIVE
        })
    }
];

export const getFallbackCustomer = (day: number): Customer => {
    const template = FALLBACK_CUSTOMERS[Math.floor(Math.random() * FALLBACK_CUSTOMERS.length)];
    return {
        ...template,
        id: crypto.randomUUID(),
        avatarSeed: template.avatarSeed + "_" + day,
        interactionType: 'PAWN',
        item: {
            ...template.item!,
            id: crypto.randomUUID(),
            pawnDate: day
        }
    } as Customer;
};
