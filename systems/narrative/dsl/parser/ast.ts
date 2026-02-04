/**
 * AST Node Constructors
 * Factory functions for creating AST nodes with proper defaults
 */

import {
    SourceLocation,
    StoryFile,
    StoryBlock,
    ChainBlock,
    MailBlock,
    EventBlock,
    ItemBlock,
    InteractionBlock,
    InteractionType,
    CustomerBlock,
    DialogueBlock,
    OutcomesBlock,
    ConditionNode,
    ActionNode,
    DeltaRuleNode,
    ThresholdRuleNode,
    CompoundRuleNode,
    ChanceRuleNode,
    FateHintNode,
    TraitBlock,
    VariablesBlock,
    VariableEntry,
    ExpiryFlowsNode,
    DynamicFlowsNode,
    DynamicFlowEntry,
    ItemConditionNode,
    DialogueTextNode,
    DialogueVariantNode,
    AcceptedDialogueNode,
    RejectionLinesNode,
    ExitDialoguesNode,
    SimulationRuleNode
} from '../types';

// Re-export types for parser usage
export type { VariableEntry } from '../types';

// === LOCATION HELPERS ===

export function createLocation(line: number, column: number, offset?: number): SourceLocation {
    return { line, column, offset };
}

export function unknownLocation(): SourceLocation {
    return { line: 0, column: 0 };
}

// === STORY FILE ===

export function createStoryFile(
    story: StoryBlock,
    chains: ChainBlock[],
    mails: MailBlock[],
    events: EventBlock[],
    location: SourceLocation
): StoryFile {
    return {
        type: 'StoryFile',
        story,
        chains,
        mails,
        events,
        location
    };
}

// === STORY BLOCK ===

export function createStoryBlock(
    id: string,
    name: string,
    location: SourceLocation
): StoryBlock {
    return {
        type: 'StoryBlock',
        id,
        name,
        location
    };
}

// === CHAIN BLOCK ===

export function createChainBlock(
    id: string,
    npcName: string,
    active: boolean,
    stage: number,
    location: SourceLocation,
    options?: {
        variables?: VariablesBlock;
        simulationRules?: SimulationRuleNode[];
        fateHints?: FateHintNode[];
    }
): ChainBlock {
    return {
        type: 'ChainBlock',
        id,
        npcName,
        active,
        stage,
        location,
        ...options
    };
}

// === VARIABLES ===

export function createVariablesBlock(
    entries: VariableEntry[],
    location: SourceLocation
): VariablesBlock {
    return {
        type: 'VariablesBlock',
        entries,
        location
    };
}

export function createVariableEntry(
    name: string,
    value: number,
    location: SourceLocation
): VariableEntry {
    return {
        type: 'VariableEntry',
        name,
        value,
        location
    };
}

// === SIMULATION RULES ===

export function createDeltaRule(
    targetVar: string,
    value: number,
    location: SourceLocation,
    options?: {
        condition?: ConditionNode;
        logMessage?: string;
    }
): DeltaRuleNode {
    return {
        type: 'DeltaRuleNode',
        targetVar,
        value,
        location,
        ...options
    };
}

export function createThresholdRule(
    targetVar: string,
    operator: '>' | '<' | '>=' | '<=' | '==',
    value: number,
    onTrigger: ActionNode[],
    location: SourceLocation,
    options?: {
        condition?: ConditionNode;
        triggerLog?: string;
    }
): ThresholdRuleNode {
    return {
        type: 'ThresholdRuleNode',
        targetVar,
        operator,
        value,
        onTrigger,
        location,
        ...options
    };
}

export function createCompoundRule(
    sourceVar: string,
    operator: '>' | '<' | '>=' | '<=' | '==',
    threshold: number,
    targetVar: string,
    effect: number,
    location: SourceLocation,
    options?: {
        cap?: { min?: number; max?: number };
        condition?: ConditionNode;
        logMessage?: string;
    }
): CompoundRuleNode {
    return {
        type: 'CompoundRuleNode',
        sourceVar,
        operator,
        threshold,
        targetVar,
        effect,
        location,
        ...options
    };
}

export function createChanceRule(
    onSuccess: ActionNode[],
    location: SourceLocation,
    options?: {
        chanceVar?: string;
        chanceFixed?: number;
        condition?: ConditionNode;
        onFail?: ActionNode[];
        successLog?: string;
        failLog?: string;
    }
): ChanceRuleNode {
    return {
        type: 'ChanceRuleNode',
        onSuccess,
        location,
        ...options
    };
}

// === FATE HINTS ===

export function createFateHint(
    condition: ConditionNode,
    priority: number,
    hints: string[],
    location: SourceLocation
): FateHintNode {
    return {
        type: 'FateHintNode',
        condition,
        priority,
        hints,
        location
    };
}

// === CONDITION ===

export function createCondition(
    variable: string,
    operator: '>' | '<' | '>=' | '<=' | '==' | '%',
    value: number,
    location: SourceLocation
): ConditionNode {
    return {
        type: 'ConditionNode',
        variable,
        operator,
        value,
        location
    };
}

// === MAIL BLOCK ===

export function createMailBlock(
    id: string,
    sender: string,
    subject: string,
    body: string,
    location: SourceLocation,
    attachments?: { cash?: number }
): MailBlock {
    return {
        type: 'MailBlock',
        id,
        sender,
        subject,
        body,
        location,
        attachments: attachments ? {
            type: 'MailAttachmentNode',
            ...attachments,
            location
        } : undefined
    };
}

// === EVENT BLOCK ===

export function createEventBlock(
    id: string,
    chainId: string,
    triggerConditions: ConditionNode[],
    location: SourceLocation,
    options?: {
        eventType?: 'STANDARD' | 'REDEMPTION_CHECK' | 'POST_FORFEIT_VISIT';
        item?: ItemBlock;
        interaction?: InteractionBlock;
        customer?: CustomerBlock;
        outcomes?: OutcomesBlock;
        onReject?: ActionNode[];
        onExtend?: ActionNode[];
        onFailure?: ActionNode[];
        failureMailId?: string;
        coreItemId?: string;
        targetItemId?: string;
        expiryFlows?: ExpiryFlowsNode;
        dynamicFlows?: DynamicFlowsNode;
    }
): EventBlock {
    return {
        type: 'EventBlock',
        id,
        chainId,
        triggerConditions,
        location,
        ...options
    };
}

// === ITEM BLOCK ===

export function createItemBlock(
    id: string,
    name: string,
    realValue: number,
    location: SourceLocation,
    options?: {
        category?: string;
        condition?: string;
        visualDescription?: string;
        historySnippet?: string;
        appraisalNote?: string;
        archiveSummary?: string;
        perceivedValue?: number;
        uncertainty?: number;
        isStolen?: boolean;
        isFake?: boolean;
        sentimentalValue?: boolean;
        isVirtual?: boolean;
        traits?: TraitBlock[];
    }
): ItemBlock {
    return {
        type: 'ItemBlock',
        id,
        name,
        realValue,
        location,
        ...options
    };
}

// === INTERACTION BLOCK ===

export function createInteractionBlock(
    interactionType: InteractionType,
    title: string,
    description: string,
    location: SourceLocation,
    options?: {
        targetItemId?: string;
        reason?: string;
        note?: string;
        offerValue?: number;
    }
): InteractionBlock {
    return {
        type: 'InteractionBlock',
        interactionType,
        title,
        description,
        location,
        ...options
    };
}

// === TRAIT BLOCK ===

export function createTraitBlock(
    id: string,
    name: string,
    traitType: 'FLAW' | 'STORY' | 'FAKE',
    description: string,
    valueImpact: number,
    discoveryDifficulty: number,
    location: SourceLocation,
    dialogueTrigger?: { playerLine: string; customerLine: string }
): TraitBlock {
    return {
        type: 'TraitBlock',
        id,
        name,
        traitType,
        description,
        valueImpact,
        discoveryDifficulty,
        location,
        dialogueTrigger
    };
}

// === CUSTOMER BLOCK ===

export function createCustomerBlock(
    name: string,
    description: string,
    dialogue: DialogueBlock,
    location: SourceLocation,
    options?: {
        avatarSeed?: string;
        desiredAmount?: number;
        minimumAmount?: number;
        maxRepayment?: number;
        patience?: number;
        mood?: string;
        redemptionResolve?: 'Strong' | 'Medium' | 'Weak' | 'None';
        behaviorTags?: ('DESPERATE' | 'STUBBORN' | 'SUSPICIOUS' | 'NAIVE' | 'SAVVY' | 'SENTIMENTAL')[];
        identityTags?: string[];
        interactionType?: 'PAWN' | 'REDEEM' | 'NEGOTIATION';
        currentAskPrice?: number;
    }
): CustomerBlock {
    return {
        type: 'CustomerBlock',
        name,
        description,
        dialogue,
        location,
        ...options
    };
}

// === DIALOGUE BLOCK ===

export function createDialogueBlock(
    greeting: DialogueTextNode,
    pawnReason: DialogueTextNode,
    location: SourceLocation,
    options?: {
        redemptionPlea?: DialogueTextNode;
        negotiationDynamic?: DialogueTextNode;
        accepted?: AcceptedDialogueNode;
        rejected?: DialogueTextNode;
        rejectionLines?: RejectionLinesNode;
        exitDialogues?: ExitDialoguesNode;
    }
): DialogueBlock {
    return {
        type: 'DialogueBlock',
        greeting,
        pawnReason,
        location,
        ...options
    };
}

export function createDialogueVariant(
    text: string,
    location: SourceLocation,
    condition?: ConditionNode
): DialogueVariantNode {
    return {
        type: 'DialogueVariantNode',
        text,
        location,
        condition
    };
}

export function createAcceptedDialogue(
    fair: DialogueTextNode,
    fleeced: DialogueTextNode,
    premium: DialogueTextNode,
    location: SourceLocation
): AcceptedDialogueNode {
    return {
        type: 'AcceptedDialogueNode',
        fair,
        fleeced,
        premium,
        location
    };
}

export function createRejectionLines(
    standard: DialogueTextNode,
    angry: DialogueTextNode,
    location: SourceLocation,
    desperate?: DialogueTextNode
): RejectionLinesNode {
    return {
        type: 'RejectionLinesNode',
        standard,
        angry,
        location,
        desperate
    };
}

export function createExitDialogues(
    grateful: DialogueTextNode,
    neutral: DialogueTextNode,
    resentful: DialogueTextNode,
    desperate: DialogueTextNode,
    location: SourceLocation
): ExitDialoguesNode {
    return {
        type: 'ExitDialoguesNode',
        grateful,
        neutral,
        resentful,
        desperate,
        location
    };
}

// === OUTCOMES BLOCK ===

export function createOutcomesBlock(
    location: SourceLocation,
    options?: {
        dealCharity?: ActionNode[];
        dealAid?: ActionNode[];
        dealStandard?: ActionNode[];
        dealShark?: ActionNode[];
    }
): OutcomesBlock {
    return {
        type: 'OutcomesBlock',
        location,
        ...options
    };
}

// === EXPIRY FLOWS ===

export function createExpiryFlows(
    location: SourceLocation,
    options?: {
        redemption?: { accept?: ActionNode[]; refuse?: ActionNode[] };
        renewal?: { accept?: ActionNode[]; refuse?: ActionNode[] };
        noShow?: { sell?: ActionNode[]; keep?: ActionNode[] };
    }
): ExpiryFlowsNode {
    return {
        type: 'ExpiryFlowsNode',
        location,
        ...options
    };
}

// === DYNAMIC FLOWS ===

export function createDynamicFlows(
    flows: DynamicFlowEntry[],
    location: SourceLocation
): DynamicFlowsNode {
    return {
        type: 'DynamicFlowsNode',
        flows,
        location
    };
}

export function createDynamicFlowEntry(
    key: string,
    dialogue: DialogueTextNode,
    outcome: ActionNode[],
    location: SourceLocation,
    itemCondition?: ItemConditionNode
): DynamicFlowEntry {
    return {
        type: 'DynamicFlowEntry',
        key,
        dialogue,
        outcome,
        location,
        itemCondition
    };
}

export function createItemCondition(
    targetStatus: 'SAFE' | 'SOLD',
    location: SourceLocation,
    options?: {
        targetItemId?: string;
        otherItemsStatus?: 'ALL_SAFE' | 'ANY_LOST' | 'IRRELEVANT';
    }
): ItemConditionNode {
    return {
        type: 'ItemConditionNode',
        targetStatus,
        location,
        ...options
    };
}

// === ACTION CONSTRUCTORS ===

export function createAddFundsDealAction(location: SourceLocation): ActionNode {
    return { type: 'AddFundsDealAction', location };
}

export function createAddFundsAction(value: number, location: SourceLocation): ActionNode {
    return { type: 'AddFundsAction', value, location };
}

export function createSetStageAction(value: number, location: SourceLocation): ActionNode {
    return { type: 'SetStageAction', value, location };
}

export function createModifyVarAction(variable: string, delta: number, location: SourceLocation): ActionNode {
    return { type: 'ModifyVarAction', variable, delta, location };
}

export function createSetVarAction(variable: string, value: number, location: SourceLocation): ActionNode {
    return { type: 'SetVarAction', variable, value, location };
}

export function createScheduleMailAction(templateId: string, delayDays: number, location: SourceLocation): ActionNode {
    return { type: 'ScheduleMailAction', templateId, delayDays, location };
}

export function createConditionalMailAction(
    templateId: string,
    delayDays: number,
    condition: ConditionNode,
    location: SourceLocation
): ActionNode {
    return { type: 'ConditionalMailAction', templateId, delayDays, condition, location };
}

export function createDeactivateAction(location: SourceLocation): ActionNode {
    return { type: 'DeactivateAction', location };
}

export function createDeactivateChainAction(location: SourceLocation): ActionNode {
    return { type: 'DeactivateChainAction', location };
}

export function createModifyRepAction(value: number, location: SourceLocation): ActionNode {
    return { type: 'ModifyRepAction', value, location };
}

export function createRedeemAllAction(location: SourceLocation): ActionNode {
    return { type: 'RedeemAllAction', location };
}

export function createRedeemTargetOnlyAction(location: SourceLocation): ActionNode {
    return { type: 'RedeemTargetOnlyAction', location };
}

export function createForceSellAllAction(location: SourceLocation): ActionNode {
    return { type: 'ForceSellAllAction', location };
}

export function createForceSellTargetAction(location: SourceLocation, targetId?: string): ActionNode {
    return { type: 'ForceSellTargetAction', location, targetId };
}

export function createMarkCoreLostAction(location: SourceLocation): ActionNode {
    return { type: 'MarkCoreLostAction', location };
}
