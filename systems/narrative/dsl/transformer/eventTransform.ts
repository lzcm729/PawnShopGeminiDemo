/**
 * Event Transformer
 * Transforms EventBlock AST nodes into StoryEvent objects
 */

import {
    EventBlock,
    CustomerBlock,
    DialogueBlock,
    OutcomesBlock,
    ActionNode,
    ConditionNode,
    DialogueTextNode,
    ExpiryFlowsNode,
    DynamicFlowsNode,
    AcceptedDialogueNode,
    RejectionLinesNode,
    ExitDialoguesNode,
    DialogueVariantNode,
    InteractionBlock
} from '../types';
import {
    StoryEvent,
    CustomerTemplate,
    DialogueTemplate,
    TriggerCondition,
    ChainUpdateEffect,
    ExpiryFlowDefinition,
    DynamicFlowOutcome,
    DialogueText,
    DialogueVariant,
    AcceptedLines,
    RejectionLines,
    ExitLines,
    Interaction
} from '../../types';
import { Item, ItemStatus } from '../../../items/types';
import { transformCondition } from './chainTransform';
import { createItemTemplate } from './itemTransform';
import { makeItem } from '../../utils';

/**
 * Transform an EventBlock AST node into a StoryEvent
 */
export function transformEvent(ast: EventBlock, chainId: string): StoryEvent {
    const event: StoryEvent = {
        id: ast.id,
        chainId: ast.chainId || chainId,
        triggerConditions: ast.triggerConditions.map(transformCondition),
        template: transformCustomer(ast.customer!)
    };

    // Event type
    if (ast.eventType) {
        event.type = ast.eventType;
    }

    // Transform item if present (mutually exclusive with interaction)
    if (ast.item) {
        const itemTemplate = createItemTemplate(ast.item, ast.chainId || chainId);
        event.item = makeItem(itemTemplate.base, itemTemplate.chainId);
    }

    // Transform interaction if present (mutually exclusive with item)
    if (ast.interaction) {
        event.interaction = transformInteraction(ast.interaction);
    }

    // Transform outcomes
    if (ast.outcomes) {
        event.outcomes = transformOutcomes(ast.outcomes);
    }

    // Transform action blocks
    if (ast.onReject) {
        event.onReject = ast.onReject.map(transformAction);
    }

    if (ast.onExtend) {
        event.onExtend = ast.onExtend.map(transformAction);
    }

    if (ast.onFailure) {
        event.onFailure = ast.onFailure.map(transformAction);
    }

    // String references
    if (ast.failureMailId) {
        event.failureMailId = ast.failureMailId;
    }

    if (ast.coreItemId) {
        event.coreItemId = ast.coreItemId;
    }

    if (ast.targetItemId) {
        event.targetItemId = ast.targetItemId;
    }

    // Transform expiry flows
    if (ast.expiryFlows) {
        event.expiryFlows = transformExpiryFlows(ast.expiryFlows);
    }

    // Transform dynamic flows
    if (ast.dynamicFlows) {
        event.dynamicFlows = transformDynamicFlows(ast.dynamicFlows);
    }

    return event;
}

/**
 * Transform InteractionBlock into Interaction
 */
function transformInteraction(ast: InteractionBlock): Interaction {
    const interaction: Interaction = {
        type: ast.interactionType,
        title: ast.title,
        description: ast.description
    };

    if (ast.targetItemId) {
        interaction.targetItemId = ast.targetItemId;
    }

    if (ast.reason) {
        interaction.reason = ast.reason;
    }

    if (ast.note) {
        interaction.note = ast.note;
    }

    if (ast.offerValue !== undefined) {
        interaction.offerValue = ast.offerValue;
    }

    return interaction;
}

/**
 * Transform CustomerBlock into CustomerTemplate
 */
function transformCustomer(ast: CustomerBlock): CustomerTemplate {
    const template: CustomerTemplate = {
        name: ast.name,
        description: ast.description,
        avatarSeed: ast.avatarSeed !== undefined ? ast.avatarSeed : ast.name,
        dialogue: transformDialogue(ast.dialogue)
    };

    // Optional fields
    if (ast.desiredAmount !== undefined) template.desiredAmount = ast.desiredAmount;
    if (ast.minimumAmount !== undefined) template.minimumAmount = ast.minimumAmount;
    if (ast.maxRepayment !== undefined) template.maxRepayment = ast.maxRepayment;
    if (ast.patience !== undefined) template.patience = ast.patience;
    if (ast.mood) template.mood = ast.mood as any;
    if (ast.identityTags) template.identityTags = ast.identityTags;
    if (ast.behaviorTags) template.behaviorTags = ast.behaviorTags;
    if (ast.redemptionResolve) template.redemptionResolve = ast.redemptionResolve;
    if (ast.interactionType) template.interactionType = ast.interactionType;
    if (ast.currentAskPrice !== undefined) template.currentAskPrice = ast.currentAskPrice;

    return template;
}

/**
 * Transform DialogueBlock into DialogueTemplate
 */
function transformDialogue(ast: DialogueBlock): DialogueTemplate {
    const dialogue: DialogueTemplate = {
        greeting: transformDialogueText(ast.greeting),
        pawnReason: transformDialogueText(ast.pawnReason),
        redemptionPlea: ast.redemptionPlea ? transformDialogueText(ast.redemptionPlea) : '',
        negotiationDynamic: ast.negotiationDynamic ? transformDialogueText(ast.negotiationDynamic) : '',
        accepted: ast.accepted ? transformAcceptedDialogue(ast.accepted) : {
            fair: '',
            fleeced: '',
            premium: ''
        },
        rejected: ast.rejected ? transformDialogueText(ast.rejected) : '',
        rejectionLines: ast.rejectionLines ? transformRejectionLines(ast.rejectionLines) : {
            standard: '',
            angry: ''
        }
    };

    if (ast.exitDialogues) {
        dialogue.exitDialogues = transformExitDialogues(ast.exitDialogues);
    }

    return dialogue;
}

/**
 * Transform DialogueTextNode into DialogueText
 */
function transformDialogueText(text: DialogueTextNode): DialogueText {
    if (typeof text === 'string') {
        return text;
    }

    if (Array.isArray(text)) {
        return text.map((variant: DialogueVariantNode): DialogueVariant => ({
            condition: variant.condition ? transformCondition(variant.condition) : undefined,
            text: variant.text
        }));
    }

    return '';
}

function transformAcceptedDialogue(ast: AcceptedDialogueNode): {
    fair: DialogueText;
    fleeced: DialogueText;
    premium: DialogueText;
} {
    return {
        fair: transformDialogueText(ast.fair),
        fleeced: transformDialogueText(ast.fleeced),
        premium: transformDialogueText(ast.premium)
    };
}

function transformRejectionLines(ast: RejectionLinesNode): {
    standard: DialogueText;
    angry: DialogueText;
    desperate?: DialogueText;
} {
    const result: {
        standard: DialogueText;
        angry: DialogueText;
        desperate?: DialogueText;
    } = {
        standard: transformDialogueText(ast.standard),
        angry: transformDialogueText(ast.angry)
    };

    if (ast.desperate) {
        result.desperate = transformDialogueText(ast.desperate);
    }

    return result;
}

function transformExitDialogues(ast: ExitDialoguesNode): {
    grateful: DialogueText;
    neutral: DialogueText;
    resentful: DialogueText;
    desperate: DialogueText;
} {
    return {
        grateful: transformDialogueText(ast.grateful),
        neutral: transformDialogueText(ast.neutral),
        resentful: transformDialogueText(ast.resentful),
        desperate: transformDialogueText(ast.desperate)
    };
}

/**
 * Transform OutcomesBlock into outcomes object
 */
function transformOutcomes(ast: OutcomesBlock): { [key: string]: ChainUpdateEffect[] } {
    const outcomes: { [key: string]: ChainUpdateEffect[] } = {};

    if (ast.dealCharity) {
        outcomes['deal_charity'] = ast.dealCharity.map(transformAction);
    }

    if (ast.dealAid) {
        outcomes['deal_aid'] = ast.dealAid.map(transformAction);
    }

    if (ast.dealStandard) {
        outcomes['deal_standard'] = ast.dealStandard.map(transformAction);
    }

    if (ast.dealShark) {
        outcomes['deal_shark'] = ast.dealShark.map(transformAction);
    }

    return outcomes;
}

/**
 * Transform ActionNode into ChainUpdateEffect
 */
export function transformAction(action: ActionNode): ChainUpdateEffect {
    switch (action.type) {
        case 'AddFundsDealAction':
            return { type: 'ADD_FUNDS_DEAL' };

        case 'AddFundsAction':
            return { type: 'ADD_FUNDS', value: action.value };

        case 'SetStageAction':
            return { type: 'SET_STAGE', value: action.value };

        case 'ModifyVarAction':
            return {
                type: 'MODIFY_VAR',
                variable: action.variable,
                delta: action.delta
            };

        case 'SetVarAction':
            return {
                type: 'MODIFY_VAR',
                variable: action.variable,
                value: action.value
            };

        case 'ScheduleMailAction':
            return {
                type: 'SCHEDULE_MAIL',
                templateId: action.templateId,
                delayDays: action.delayDays
            };

        case 'ConditionalMailAction':
            return {
                type: 'CONDITIONAL_MAIL',
                templateId: action.templateId,
                delayDays: action.delayDays,
                condition: transformCondition(action.condition)
            };

        case 'DeactivateAction':
            return { type: 'DEACTIVATE' };

        case 'DeactivateChainAction':
            return { type: 'DEACTIVATE_CHAIN' };

        case 'ModifyRepAction':
            return { type: 'MODIFY_REP', value: action.value, axis: action.axis || 'humanity' };

        case 'RedeemAllAction':
            return { type: 'REDEEM_ALL' };

        case 'RedeemTargetOnlyAction':
            return { type: 'REDEEM_TARGET_ONLY' };

        case 'ForceSellAllAction':
            return { type: 'FORCE_SELL_ALL' };

        case 'ForceSellTargetAction':
            return {
                type: 'FORCE_SELL_TARGET',
                templateId: action.targetId
            };

        case 'MarkCoreLostAction':
            return { type: 'MARK_CORE_LOST' };

        default:
            throw new Error(`Unknown action type: ${(action as any).type}`);
    }
}

/**
 * Transform ExpiryFlowsNode into ExpiryFlowDefinition
 */
function transformExpiryFlows(ast: ExpiryFlowsNode): ExpiryFlowDefinition {
    const flows: ExpiryFlowDefinition = {};

    if (ast.redemption) {
        flows.redemption = {};
        if (ast.redemption.accept) {
            flows.redemption.accept = ast.redemption.accept.map(transformAction);
        }
        if (ast.redemption.refuse) {
            flows.redemption.refuse = ast.redemption.refuse.map(transformAction);
        }
    }

    if (ast.renewal) {
        flows.renewal = {};
        if (ast.renewal.accept) {
            flows.renewal.accept = ast.renewal.accept.map(transformAction);
        }
        if (ast.renewal.refuse) {
            flows.renewal.refuse = ast.renewal.refuse.map(transformAction);
        }
    }

    if (ast.noShow) {
        flows.noShow = {};
        if (ast.noShow.sell) {
            flows.noShow.sell = ast.noShow.sell.map(transformAction);
        }
        if (ast.noShow.keep) {
            flows.noShow.keep = ast.noShow.keep.map(transformAction);
        }
    }

    return flows;
}

/**
 * Transform DynamicFlowsNode into dynamicFlows object
 */
function transformDynamicFlows(ast: DynamicFlowsNode): { [key: string]: DynamicFlowOutcome } {
    const flows: { [key: string]: DynamicFlowOutcome } = {};

    for (const flow of ast.flows) {
        const outcome: DynamicFlowOutcome = {
            dialogue: transformDialogueText(flow.dialogue),
            outcome: flow.outcome.map(transformAction)
        };

        if (flow.itemCondition) {
            outcome.itemCondition = {
                targetItemId: flow.itemCondition.targetItemId,
                targetStatus: flow.itemCondition.targetStatus,
                otherItemsStatus: flow.itemCondition.otherItemsStatus
            };
        }

        flows[flow.key] = outcome;
    }

    return flows;
}
