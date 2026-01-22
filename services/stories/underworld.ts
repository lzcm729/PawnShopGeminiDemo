

import { EventChainState, StoryEvent, ItemStatus } from '../../types';
import { makeItem } from '../storyUtils';

export const UNDERWORLD_CHAIN_INIT: EventChainState = {
    id: "chain_underworld",
    npcName: "黑帮",
    isActive: false, 
    stage: 0,
    variables: { 
        days_since_trigger: 0,
        targetItemId: 0 // Will be set dynamically by engine when chain is activated
    },
    simulationRules: [
        { type: 'DELTA', targetVar: 'days_since_trigger', value: 1 }
    ]
};

export const UNDERWORLD_EVENTS: StoryEvent[] = [
    // EVENT 1: The Warning Mail (Triggered 2 days after taking the item)
    {
        id: "underworld_01_mail",
        chainId: "chain_underworld",
        triggerConditions: [{ variable: "days_since_trigger", operator: "==", value: 2 }],
        template: {
            name: "System", description: "", avatarSeed: "", 
            dialogue: { greeting: "", pawnReason: "", redemptionPlea: "", negotiationDynamic: "", accepted: {fair:"",fleeced:"",premium:""}, rejected: "", rejectionLines: {standard:"",angry:""} },
            redemptionResolve: "None", negotiationStyle: "Professional", patience: 0, mood: "Neutral", tags: [], desiredAmount:0, minimumAmount:0, maxRepayment:0, item: {} as any // Dummy template, only used for logic
        },
        // We need a dummy template to satisfy the type, but this event is purely logic-driven
        // The engine handles "pure logic" events if we make sure it doesn't try to instantiate a customer
        // However, the current engine design expects events to be customer visits unless handled specially.
        // We will rely on "SCHEDULE_MAIL" effect and a very short logic burst.
        // Or we can add a 'logic' type event in future. For now, we will use a dummy customer that doesn't really appear if we skip it?
        // Actually, logic-only events are not fully supported without a visit.
        // WORKAROUND: We will assume this event fires, but we filter it out in `useGameEngine` if it has a special flag? 
        // OR: We can use a Simulation Rule to schedule mail? 
        // Simulation Rules run daily. Let's use Simulation Rules for the mail!
        // Wait, Simulation Rules are generic math. 
        // Let's modify UNDERWORLD_CHAIN_INIT to use a THRESHOLD rule to schedule mail.
        // That is cleaner.
        // So this file might only need the VISIT event.
        item: {} as any
    },

    // EVENT 2: The Consequence Visit (Triggered 5 days after taking item)
    {
        id: "underworld_02_retrieval",
        chainId: "chain_underworld",
        type: "REDEMPTION_CHECK",
        triggerConditions: [{ variable: "days_since_trigger", operator: "==", value: 5 }],
        // targetItemId will be injected dynamically by resolveRedemptionFlow logic based on chain variable
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
                rejectionLines: { standard: "...", angry: "...", desperate: "..." }
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
                    // We can add a specialized log event here if engine supports it, or just funds deduction
                ]
            }
        }
    }
];

// RE-DEFINE SIMULATION RULES to handle Mail scheduling without a visit event
UNDERWORLD_CHAIN_INIT.simulationRules = [
    { type: 'DELTA', targetVar: 'days_since_trigger', value: 1 },
    { 
        type: 'THRESHOLD', 
        targetVar: 'days_since_trigger', 
        operator: '==', 
        value: 2, 
        onTrigger: [{ type: 'SCHEDULE_MAIL', templateId: 'mail_underworld_warning', delayDays: 0 }] 
    }
];
