/**
 * DSL Type Definitions
 * Defines interfaces for AST nodes used in the story DSL parser
 */

// === SOURCE LOCATION ===

export interface SourceLocation {
    line: number;
    column: number;
    offset?: number;
}

// === BASE AST NODE ===

export interface ASTNode {
    type: string;
    location: SourceLocation;
}

// === STORY FILE ===

export interface StoryFile extends ASTNode {
    type: 'StoryFile';
    story: StoryBlock;
    chains: ChainBlock[];
    mails: MailBlock[];
    events: EventBlock[];
}

// === STORY BLOCK ===

export interface StoryBlock extends ASTNode {
    type: 'StoryBlock';
    id: string;
    name: string;
}

// === CHAIN BLOCK ===

export interface ChainBlock extends ASTNode {
    type: 'ChainBlock';
    id: string;
    npcName: string;
    active: boolean;
    stage: number;
    variables?: VariablesBlock;
    simulationRules?: SimulationRuleNode[];
    fateHints?: FateHintNode[];
}

export interface VariablesBlock extends ASTNode {
    type: 'VariablesBlock';
    entries: VariableEntry[];
}

export interface VariableEntry extends ASTNode {
    type: 'VariableEntry';
    name: string;
    value: number;
}

// === SIMULATION RULES ===

export type SimulationRuleNode =
    | DeltaRuleNode
    | ThresholdRuleNode
    | CompoundRuleNode
    | ChanceRuleNode;

export interface ConditionNode extends ASTNode {
    type: 'ConditionNode';
    variable: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '%';
    value: number;
}

export interface DeltaRuleNode extends ASTNode {
    type: 'DeltaRuleNode';
    targetVar: string;
    value: number;
    condition?: ConditionNode;
    logMessage?: string;
}

export interface ThresholdRuleNode extends ASTNode {
    type: 'ThresholdRuleNode';
    targetVar: string;
    operator: '>' | '<' | '>=' | '<=' | '==';
    value: number;
    condition?: ConditionNode;
    onTrigger: ActionNode[];
    triggerLog?: string;
}

export interface CompoundRuleNode extends ASTNode {
    type: 'CompoundRuleNode';
    sourceVar: string;
    operator: '>' | '<' | '>=' | '<=' | '==';
    threshold: number;
    targetVar: string;
    effect: number;
    cap?: { min?: number; max?: number };
    condition?: ConditionNode;
    logMessage?: string;
}

export interface ChanceRuleNode extends ASTNode {
    type: 'ChanceRuleNode';
    chanceVar?: string;
    chanceFixed?: number;
    condition?: ConditionNode;
    onSuccess: ActionNode[];
    onFail?: ActionNode[];
    successLog?: string;
    failLog?: string;
}

// === FATE HINTS ===

export interface FateHintNode extends ASTNode {
    type: 'FateHintNode';
    condition: ConditionNode;
    priority: number;
    hints: string[];
}

// === ACTIONS ===

export type ActionNode =
    | AddFundsDealAction
    | AddFundsAction
    | SetStageAction
    | ModifyVarAction
    | SetVarAction
    | ScheduleMailAction
    | ConditionalMailAction
    | DeactivateAction
    | DeactivateChainAction
    | ModifyRepAction
    | RedeemAllAction
    | RedeemTargetOnlyAction
    | ForceSellAllAction
    | ForceSellTargetAction
    | MarkCoreLostAction;

export interface AddFundsDealAction extends ASTNode {
    type: 'AddFundsDealAction';
}

export interface AddFundsAction extends ASTNode {
    type: 'AddFundsAction';
    value: number;
}

export interface SetStageAction extends ASTNode {
    type: 'SetStageAction';
    value: number;
}

export interface ModifyVarAction extends ASTNode {
    type: 'ModifyVarAction';
    variable: string;
    delta: number;
}

export interface SetVarAction extends ASTNode {
    type: 'SetVarAction';
    variable: string;
    value: number;
}

export interface ScheduleMailAction extends ASTNode {
    type: 'ScheduleMailAction';
    templateId: string;
    delayDays: number;
}

export interface ConditionalMailAction extends ASTNode {
    type: 'ConditionalMailAction';
    templateId: string;
    delayDays: number;
    condition: ConditionNode;
}

export interface DeactivateAction extends ASTNode {
    type: 'DeactivateAction';
}

export interface DeactivateChainAction extends ASTNode {
    type: 'DeactivateChainAction';
}

export interface ModifyRepAction extends ASTNode {
    type: 'ModifyRepAction';
    value: number;
}

export interface RedeemAllAction extends ASTNode {
    type: 'RedeemAllAction';
}

export interface RedeemTargetOnlyAction extends ASTNode {
    type: 'RedeemTargetOnlyAction';
}

export interface ForceSellAllAction extends ASTNode {
    type: 'ForceSellAllAction';
}

export interface ForceSellTargetAction extends ASTNode {
    type: 'ForceSellTargetAction';
    targetId?: string;
}

export interface MarkCoreLostAction extends ASTNode {
    type: 'MarkCoreLostAction';
}

// === MAIL BLOCK ===

export interface MailBlock extends ASTNode {
    type: 'MailBlock';
    id: string;
    sender: string;
    subject: string;
    body: string;
    attachments?: MailAttachmentNode;
}

export interface MailAttachmentNode extends ASTNode {
    type: 'MailAttachmentNode';
    cash?: number;
}

// === EVENT BLOCK ===

export interface EventBlock extends ASTNode {
    type: 'EventBlock';
    id: string;
    chainId: string;
    eventType?: 'STANDARD' | 'REDEMPTION_CHECK' | 'POST_FORFEIT_VISIT';
    triggerConditions: ConditionNode[];
    item?: ItemBlock;
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

// === ITEM BLOCK ===

export interface ItemBlock extends ASTNode {
    type: 'ItemBlock';
    id: string;
    name: string;
    category?: string;
    condition?: string;
    visualDescription?: string;
    historySnippet?: string;
    appraisalNote?: string;
    archiveSummary?: string;
    realValue: number;
    perceivedValue?: number;
    uncertainty?: number;
    isStolen?: boolean;
    isFake?: boolean;
    sentimentalValue?: boolean;
    isVirtual?: boolean;
    traits?: TraitBlock[];
}

export interface TraitBlock extends ASTNode {
    type: 'TraitBlock';
    id: string;
    name: string;
    traitType: 'FLAW' | 'STORY' | 'FAKE';
    description: string;
    valueImpact: number;
    discoveryDifficulty: number;
    dialogueTrigger?: {
        playerLine: string;
        customerLine: string;
    };
}

// === CUSTOMER BLOCK ===

// Import and re-export BehaviorTag from npc/types for DSL use
import type { BehaviorTag } from '../../npc/types';
export type { BehaviorTag };

export interface CustomerBlock extends ASTNode {
    type: 'CustomerBlock';
    name: string;
    description: string;
    avatarSeed?: string;
    desiredAmount?: number;
    minimumAmount?: number;
    maxRepayment?: number;
    patience?: number;
    mood?: string;
    redemptionResolve?: 'Strong' | 'Medium' | 'Weak' | 'None';

    // === 行为系统 ===
    behaviorTags?: BehaviorTag[];           // 替代 negotiationStyle

    // === 身份系统 ===
    identityTags?: string[];                // 替代 tags

    interactionType?: 'PAWN' | 'REDEEM' | 'NEGOTIATION';
    currentAskPrice?: number;
    dialogue: DialogueBlock;
}

// === DIALOGUE BLOCK ===

export interface DialogueBlock extends ASTNode {
    type: 'DialogueBlock';
    greeting: DialogueTextNode;
    pawnReason: DialogueTextNode;
    redemptionPlea?: DialogueTextNode;
    negotiationDynamic?: DialogueTextNode;
    accepted?: AcceptedDialogueNode;
    rejected?: DialogueTextNode;
    rejectionLines?: RejectionLinesNode;
    exitDialogues?: ExitDialoguesNode;
}

export type DialogueTextNode = string | DialogueVariantNode[];

export interface DialogueVariantNode extends ASTNode {
    type: 'DialogueVariantNode';
    condition?: ConditionNode;
    text: string;
}

export interface AcceptedDialogueNode extends ASTNode {
    type: 'AcceptedDialogueNode';
    fair: DialogueTextNode;
    fleeced: DialogueTextNode;
    premium: DialogueTextNode;
}

export interface RejectionLinesNode extends ASTNode {
    type: 'RejectionLinesNode';
    standard: DialogueTextNode;
    angry: DialogueTextNode;
    desperate?: DialogueTextNode;
}

export interface ExitDialoguesNode extends ASTNode {
    type: 'ExitDialoguesNode';
    grateful: DialogueTextNode;
    neutral: DialogueTextNode;
    resentful: DialogueTextNode;
    desperate: DialogueTextNode;
}

// === OUTCOMES BLOCK ===

export interface OutcomesBlock extends ASTNode {
    type: 'OutcomesBlock';
    dealCharity?: ActionNode[];
    dealAid?: ActionNode[];
    dealStandard?: ActionNode[];
    dealShark?: ActionNode[];
}

// === EXPIRY FLOWS ===

export interface ExpiryFlowsNode extends ASTNode {
    type: 'ExpiryFlowsNode';
    redemption?: {
        accept?: ActionNode[];
        refuse?: ActionNode[];
    };
    renewal?: {
        accept?: ActionNode[];
        refuse?: ActionNode[];
    };
    noShow?: {
        sell?: ActionNode[];
        keep?: ActionNode[];
    };
}

// === DYNAMIC FLOWS ===

export interface DynamicFlowsNode extends ASTNode {
    type: 'DynamicFlowsNode';
    flows: DynamicFlowEntry[];
}

export interface DynamicFlowEntry extends ASTNode {
    type: 'DynamicFlowEntry';
    key: string;
    itemCondition?: ItemConditionNode;
    dialogue: DialogueTextNode;
    outcome: ActionNode[];
}

export interface ItemConditionNode extends ASTNode {
    type: 'ItemConditionNode';
    targetItemId?: string;
    targetStatus: 'SAFE' | 'SOLD';
    otherItemsStatus?: 'ALL_SAFE' | 'ANY_LOST' | 'IRRELEVANT';
}

// === SIMOPERATION NODE (for transformer) ===

export interface SimOperationNode extends ASTNode {
    type: 'SimOperationNode';
    opType: 'MOD_VAR' | 'SET_STAGE' | 'DEACTIVATE' | 'SCHEDULE_MAIL';
    target?: string;
    value?: number;
    op?: 'ADD' | 'SUB' | 'SET';
    templateId?: string;
    delayDays?: number;
}
