
import { EventChainState, StoryEvent, ItemStatus } from '../../../types';
import { makeItem } from '../utils';

export const SUSAN_CHAIN_INIT: EventChainState = {
    id: "chain_susan",
    npcName: "苏珊",
    isActive: false, 
    stage: 0,
    variables: { debt: 50000, suspicion: 0 },
    simulationRules: [
        { type: 'DELTA', targetVar: 'debt', value: 1000 }
    ]
};

export const SUSAN_EVENTS: StoryEvent[] = [
    {
        id: "susan_01_bag",
        chainId: "chain_susan",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
        item: makeItem({
            id: "susan_item_bag",
            name: "鳄鱼皮铂金包",
            category: "奢侈品",
            condition: "99新",
            visualDescription: "色泽光亮，五金件闪耀。",
            historySnippet: "上个月在巴黎买的，我老公送的。",
            appraisalNote: "高仿A货。",
            archiveSummary: "一只精仿的奢侈品包。",
            realValue: 200,
            perceivedValue: 80000,
            uncertainty: 0.4,
            isStolen: false, isFake: true, sentimentalValue: false, appraised: false, status: ItemStatus.ACTIVE,
            hiddenTraits: [
                { id: "trait-susan-fake", name: "走线歪斜", type: 'FAKE', description: "底部缝线不够直，非专柜品质。", valueImpact: -0.99, discoveryDifficulty: 0.5 },
                { id: "trait-susan-smell", name: "胶水气味", type: 'FAKE', description: "刺鼻的工业胶水味。", valueImpact: -0.5, discoveryDifficulty: 0.3 }
            ]
        }, "chain_susan"),
        template: {
            name: "苏珊",
            description: "浑身名牌，香水味很浓，但神色慌张。",
            avatarSeed: "lady_susan",
            desiredAmount: 20000, minimumAmount: 5000, maxRepayment: 30000,
            dialogue: {
                greeting: "亲爱的，帮个忙，我急需周转。",
                pawnReason: "打牌输了一点点，不想让老公知道。",
                redemptionPlea: "过两天赢回来就赎，这可是限量版。",
                negotiationDynamic: "你什么眼光？这可是专柜货！",
                accepted: { fair: "钱打我卡上。", fleeced: "行吧行吧，烦死了。", premium: "亲爱的你太好了！" },
                rejected: "你给我等着！",
                rejectionLines: { standard: "没眼光。", angry: "破店！", desperate: "帮帮姐妹..." }
            },
            redemptionResolve: "Strong", negotiationStyle: "Deceptive", patience: 3, mood: 'Neutral', tags: ["Scam", "Fake"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -5 }], 
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: 2 }] 
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }]
    }
];
