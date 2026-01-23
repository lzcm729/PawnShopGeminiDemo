
import { EventChainState, StoryEvent, ItemStatus } from '../../../types';
import { makeItem } from '../utils';

export const LIN_CHAIN_INIT: EventChainState = {
    id: "chain_lin",
    npcName: "小林",
    isActive: false, 
    stage: 0,
    variables: { tuition: 0 },
    simulationRules: []
};

export const LIN_EVENTS: StoryEvent[] = [
    {
        id: "lin_01_watch",
        chainId: "chain_lin",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
        item: makeItem({
            id: "lin_item_watch",
            name: "古董机械表",
            category: "钟表",
            condition: "需保养",
            visualDescription: "表盘泛黄，看起来像地摊货。",
            historySnippet: "爷爷留下的，我也不懂表。",
            appraisalNote: "劳力士'保罗纽曼'迪通拿，极品捡漏！",
            archiveSummary: "价值连城的古董表。",
            realValue: 150000,
            perceivedValue: 300, 
            uncertainty: 0.5,
            isStolen: false, isFake: false, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [
                { id: "trait-lin-rare", name: "保罗纽曼盘面", type: 'STORY', description: "独特的'Exotic'表盘设计。", valueImpact: 500.0, discoveryDifficulty: 0.9 },
                { id: "trait-lin-flaw", name: "表蒙划痕", type: 'FLAW', description: "划痕。", valueImpact: -0.01, discoveryDifficulty: 0.1 }
            ]
        }, "chain_lin"),
        template: {
            name: "小林",
            description: "背着书包的大学生，眼神清澈。",
            avatarSeed: "student_lin",
            desiredAmount: 2000, minimumAmount: 800, maxRepayment: 4000,
            dialogue: {
                greeting: "你好，请问这里收旧东西吗？",
                pawnReason: "想买显卡，拿爷爷的旧表换点钱。",
                redemptionPlea: "应该没人要了吧，不赎了。",
                negotiationDynamic: "啊？这破表这么值钱吗？",
                accepted: { fair: "太棒了！", fleeced: "够买入门卡了，谢谢！", premium: "老板你是大善人！" },
                rejected: "哦，那我再去问问。",
                rejectionLines: { standard: "那我拿回家吧。", angry: "怎么这样...", desperate: "少给点也行啊..." }
            },
            redemptionResolve: "Weak", negotiationStyle: "Deceptive", patience: 5, mood: 'Neutral', tags: ["Opportunity"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }], 
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }] 
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }]
    }
];
