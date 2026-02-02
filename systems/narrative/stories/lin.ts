
import { EventChainState, StoryEvent, ItemStatus } from '../../../types';
import { makeItem } from '../utils';

export const LIN_CHAIN_INIT: EventChainState = {
    id: "chain_lin",
    npcName: "小林",
    isActive: false,
    stage: 0,
    variables: {
        funds: 10000,  // 小林有足够的钱来赎回（会触发 REDEEM 行为）
        hope: 80       // 高希望值确保他会来赎回
    },
    simulationRules: []
};

export const LIN_EVENTS: StoryEvent[] = [
    {
        id: "lin_01_watch",
        chainId: "chain_lin",
        triggerConditions: [{ variable: "stage", operator: "==", value: 0 }],
        coreItemId: "lin_item_watch",  // 标记核心物品
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
            pawnTermDays: 1,  // 1天期限，典当后第二天就会到期
            dialogue: {
                greeting: "你好，请问这里收旧东西吗？",
                pawnReason: "想买显卡，拿爷爷的旧表换点钱。",
                redemptionPlea: "应该没人要了吧，不赎了。",
                negotiationDynamic: "啊？这破表这么值钱吗？",
                accepted: { fair: "太棒了！", fleeced: "够买入门卡了，谢谢！", premium: "老板你是大善人！" },
                rejected: "哦，那我再去问问。",
                rejectionLines: { standard: "那我拿回家吧。", angry: "怎么这样...", desperate: "少给点也行啊..." },
                exitDialogues: {
                    grateful: "谢谢老板！明天我就来赎回！",
                    neutral: "那我先走了，明天见。",
                    resentful: "......",
                    desperate: "[他背起书包，肩膀垮了下来，像是个做错事的孩子]"
                }
            },
            redemptionResolve: "Weak", behaviorTags: ["NAIVE"], patience: 5, mood: 'Neutral', identityTags: ["Opportunity"]
        },
        // 典当成功后，进入 stage 1，等待到期结算
        outcomes: {
            "deal_charity": [{ type: "SET_STAGE", value: 1 }],
            "deal_aid":     [{ type: "SET_STAGE", value: 1 }],
            "deal_standard":[{ type: "SET_STAGE", value: 1 }],
            "deal_shark":   [{ type: "SET_STAGE", value: 1 }]
        },
        onReject: [{ type: "DEACTIVATE_CHAIN" }],
        // 到期结算流程
        expiryFlows: {
            redemption: {
                accept: [
                    // 正常赎回，小林拿回手表
                    { type: "DEACTIVATE_CHAIN" }
                ],
                refuse: [
                    // 玩家拒绝赎回（支付200%赔偿），小林失去手表
                    { type: "MODIFY_VAR", variable: "hope", value: -50 },
                    { type: "DEACTIVATE_CHAIN" }
                ]
            },
            renewal: {
                accept: [
                    { type: "MODIFY_VAR", variable: "hope", value: 10 }
                ],
                refuse: [
                    { type: "MODIFY_VAR", variable: "hope", value: -30 },
                    { type: "DEACTIVATE_CHAIN" }
                ]
            },
            noShow: {
                keep: [
                    // 小林没来，物品绝当
                    { type: "DEACTIVATE_CHAIN" }
                ]
            }
        }
    }
];
