
import { EventChainState, StoryEvent, ItemStatus } from '../../../types';
import { makeItem } from '../utils';

export const LIN_CHAIN_INIT: EventChainState = {
    id: "chain_lin",
    npcName: "小林",
    isActive: true, 
    stage: 0,
    variables: { tuition: 0, days_waiting: 0, funds: 5000 },
    simulationRules: [
        { type: 'DELTA', targetVar: 'days_waiting', value: 1, condition: { variable: 'stage', operator: '==', value: 1 } }
    ]
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
                rejectionLines: { standard: "那我拿回家吧。", angry: "怎么这样...", desperate: "少给点也行啊..." },
                exitDialogues: {
                    grateful: "谢谢老板！学费有着落了！",
                    neutral: "那我先走了，谢谢。",
                    resentful: "......",
                    desperate: "[他背起书包，肩膀垮了下来，像是个做错事的孩子]"
                }
            },
            redemptionResolve: "Weak", negotiationStyle: "Deceptive", patience: 5, mood: 'Neutral', tags: ["Opportunity"]
        },
        outcomes: {
            "deal_charity": [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }], 
            "deal_aid":     [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }],
            "deal_standard":[{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }],
            "deal_shark":   [{ type: "ADD_FUNDS_DEAL" }, { type: "SET_STAGE", value: 1 }] 
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }]
    },
    {
        id: "lin_02_redeem",
        chainId: "chain_lin",
        type: "REDEMPTION_CHECK",
        // Removed days_waiting check to guarantee trigger if Stage is 1.
        triggerConditions: [{ variable: "stage", operator: "==", value: 1 }],
        targetItemId: "lin_item_watch",
        template: {
            name: "小林",
            description: "气喘吁吁，满头大汗。",
            avatarSeed: "student_lin",
            interactionType: 'REDEEM',
            dialogue: {
                greeting: "老板！等等！我不卖了！",
                pawnReason: "",
                redemptionPlea: "我回去查了一下，那好像是真的很重要的东西... 而且我把显卡退了，钱都在这。",
                negotiationDynamic: "...",
                accepted: { fair: "太好了！吓死我了。", fleeced: "...", premium: "..." },
                rejected: "...",
                rejectionLines: { standard: "...", angry: "...", desperate: "..." },
                exitDialogues: {
                    grateful: "以后再也不乱动爷爷的东西了...",
                    neutral: "走了。",
                    resentful: "...",
                    desperate: "..."
                }
            },
            redemptionResolve: "Strong", negotiationStyle: "Desperate", patience: 3, mood: "Neutral",
            desiredAmount: 0, minimumAmount: 0, maxRepayment: 0,
            item: makeItem({ id: "lin_redeem_dummy", name: "赎回单", realValue: 0, isVirtual: true }, "chain_lin")
        },
        dynamicFlows: {
            "all_safe": {
                dialogue: "钱都在这，连本带利。快把表还给我吧，我还要赶着放回去，不然被爸妈发现就死定了。",
                outcome: [
                    { type: "REDEEM_TARGET_ONLY" }, 
                    { type: "DEACTIVATE_CHAIN" }, 
                    { type: "MODIFY_REP", value: 5 }
                ]
            },
            "core_safe": {
                dialogue: "钱都在这，连本带利。快把表还给我吧，我还要赶着放回去，不然被爸妈发现就死定了。",
                outcome: [
                    { type: "REDEEM_TARGET_ONLY" }, 
                    { type: "DEACTIVATE_CHAIN" }, 
                    { type: "MODIFY_REP", value: 5 }
                ]
            },
            "core_lost": {
                dialogue: "什么？卖了？！... 才过了一天啊！你... 你怎么能这样！那是我爷爷的遗物啊！",
                outcome: [
                    { type: "DEACTIVATE_CHAIN" }, 
                    { type: "MODIFY_REP", value: -20 }
                ]
            }
        }
    }
];
