
import { EventChainState, StoryEvent, ItemStatus, MailTemplate } from '../../../types';
import { makeItem } from '../utils';

// --- UNDERWORLD MAILS ---
export const UNDERWORLD_MAILS: Record<string, MailTemplate> = {
  "mail_underworld_warning": {
    id: "mail_underworld_warning",
    sender: "[未知]",
    subject: "你会后悔的",
    body: `老板，\n\n听说你店里收了一个不该收的东西 ({{relatedItemName}})。\n我们的人很快会来"取回"它。\n\n如果东西还在，我们可以当作什么都没发生。\n如果不在... 夜路走多了，小心影子。\n\n别报警。你知道的。`,
    attachments: { cash: 0 }
  }
};

export const UNDERWORLD_CHAIN_INIT: EventChainState = {
    id: "chain_underworld",
    npcName: "黑帮",
    isActive: false, 
    stage: 0,
    variables: { 
        days_since_trigger: 0,
        targetItemId: 0 
    },
    simulationRules: [
        { type: 'DELTA', targetVar: 'days_since_trigger', value: 1 },
        { type: 'THRESHOLD', targetVar: 'days_since_trigger', operator: '==', value: 2, onTrigger: [{ type: 'SCHEDULE_MAIL', templateId: 'mail_underworld_warning', delayDays: 0 }] }
    ]
};

export const UNDERWORLD_EVENTS: StoryEvent[] = [
    {
        id: "underworld_01_mail",
        chainId: "chain_underworld",
        triggerConditions: [{ variable: "days_since_trigger", operator: "==", value: 2 }],
        template: {
            name: "System", description: "", avatarSeed: "", 
            dialogue: { greeting: "", pawnReason: "", redemptionPlea: "", negotiationDynamic: "", accepted: {fair:"",fleeced:"",premium:""}, rejected: "", rejectionLines: {standard:"",angry:""}, exitDialogues: { grateful: "...", neutral: "...", resentful: "...", desperate: "..." } },
            redemptionResolve: "None", negotiationStyle: "Professional", patience: 0, mood: "Neutral", tags: [], desiredAmount:0, minimumAmount:0, maxRepayment:0, item: {} as any 
        },
        item: {} as any
    },
    {
        id: "underworld_02_retrieval",
        chainId: "chain_underworld",
        type: "REDEMPTION_CHECK",
        triggerConditions: [{ variable: "days_since_trigger", operator: "==", value: 5 }],
        template: {
            name: "刀疤脸",
            description: "穿着皮夹克，脖子上有纹身，眼神凶狠。",
            avatarSeed: "thug_01",
            interactionType: 'REDEEM',
            dialogue: {
                greeting: "老板，生意不错啊。我是来拿回我的东西的。",
                pawnReason: "", 
                redemptionPlea: "别废话。你知道我说的是什么。",
                negotiationDynamic: "...",
                accepted: { fair: "算你识相。", fleeced: "...", premium: "..." },
                rejected: "...",
                rejectionLines: { standard: "...", angry: "...", desperate: "..." },
                exitDialogues: {
                    grateful: "懂事。",
                    neutral: "两清。",
                    resentful: "哼... 走路小心点。",
                    desperate: "[冷冷地看了你一眼，做了一个割喉的手势]"
                }
            },
            redemptionResolve: "Strong", negotiationStyle: "Aggressive", patience: 2, mood: "Angry",
            desiredAmount: 0, minimumAmount: 0, maxRepayment: 0,
            item: makeItem({ id: "thug_dummy", name: "赎回单", realValue: 0, isVirtual: true }, "chain_underworld")
        },
        dynamicFlows: {
            "all_safe": {
                dialogue: "东西还在就好。拿着这点利息，以后招子放亮点。这东西不是你能碰的。",
                outcome: [{ type: "REDEEM_TARGET_ONLY" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -10 }]
            },
            "core_safe": {
                dialogue: "东西还在就好。拿着这点利息，以后招子放亮点。这东西不是你能碰的。",
                outcome: [{ type: "REDEEM_TARGET_ONLY" }, { type: "DEACTIVATE_CHAIN" }, { type: "MODIFY_REP", value: -10 }]
            },
            "core_lost": {
                dialogue: "卖了？... 呵呵。胆子不小啊。那是老大的货，你也敢动？\n兄弟们，给我砸！",
                outcome: [
                    { type: "DEACTIVATE_CHAIN" }, 
                    { type: "ADD_FUNDS", value: -2000 }, 
                    { type: "MODIFY_REP", value: -30 },
                ]
            }
        }
    }
];
