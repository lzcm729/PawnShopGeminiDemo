/**
 * DSL Parser
 * Recursive descent parser that converts tokens into an AST
 */

import { Token, TokenType, tokenize } from './lexer';
import { DSLParseError, DSLUnexpectedTokenError, DSLMissingFieldError } from './errors';
import * as AST from './ast';
import {
    SourceLocation,
    StoryFile,
    StoryBlock,
    ChainBlock,
    MailBlock,
    EventBlock,
    ItemBlock,
    CustomerBlock,
    DialogueBlock,
    OutcomesBlock,
    ConditionNode,
    ActionNode,
    SimulationRuleNode,
    FateHintNode,
    TraitBlock,
    VariablesBlock,
    ExpiryFlowsNode,
    DynamicFlowsNode,
    DynamicFlowEntry,
    DialogueTextNode,
    DialogueVariantNode,
    AcceptedDialogueNode,
    RejectionLinesNode,
    ExitDialoguesNode
} from '../types';

export class Parser {
    private tokens: Token[] = [];
    private current: number = 0;
    private source: string;
    private filename?: string;

    constructor(source: string, filename?: string) {
        this.source = source;
        this.filename = filename;
    }

    /**
     * Parse the source into a StoryFile AST
     */
    parse(): StoryFile {
        this.tokens = tokenize(this.source);

        const location = this.currentLocation();
        let story: StoryBlock | null = null;
        const chains: ChainBlock[] = [];
        const mails: MailBlock[] = [];
        const events: EventBlock[] = [];

        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (this.isAtEnd()) break;

            if (this.check('SEPARATOR')) {
                this.advance();
                this.skipNewlines();
                continue;
            }

            if (this.check('AT_BLOCK')) {
                const blockType = this.peek().value;

                switch (blockType) {
                    case '@story':
                        if (story) {
                            throw new DSLParseError('Duplicate @story block', this.currentLocation(), this.source);
                        }
                        story = this.parseStoryBlock();
                        break;
                    case '@chain':
                        chains.push(this.parseChainBlock());
                        break;
                    case '@mail':
                        mails.push(this.parseMailBlock());
                        break;
                    case '@event':
                        events.push(this.parseEventBlock());
                        break;
                    default:
                        throw new DSLParseError(`Unexpected top-level block: ${blockType}`, this.currentLocation(), this.source);
                }
            } else {
                throw new DSLParseError(`Expected block directive, got ${this.peek().type}`, this.currentLocation(), this.source);
            }
        }

        if (!story) {
            throw new DSLMissingFieldError('@story', 'file', location, this.source);
        }

        return AST.createStoryFile(story, chains, mails, events, location);
    }

    // === STORY BLOCK ===

    private parseStoryBlock(): StoryBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@story');

        const id = this.consumeIdentifier('story id');
        this.skipNewlines();

        let name = id;

        // Parse properties
        while (!this.isAtEnd() && !this.check('SEPARATOR') && !this.check('AT_BLOCK')) {
            this.skipNewlines();
            if (this.check('SEPARATOR') || this.check('AT_BLOCK') || this.isAtEnd()) break;

            if (this.check('IDENTIFIER')) {
                const propName = this.advance().value;
                this.consume('COLON', ':');

                if (propName === 'name') {
                    name = this.parseStringValue();
                }

                this.skipNewlines();
            } else {
                break;
            }
        }

        return AST.createStoryBlock(id, name, location);
    }

    // === CHAIN BLOCK ===

    private parseChainBlock(): ChainBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@chain');

        const id = this.consumeIdentifier('chain id');
        this.skipNewlines();

        let npcName = '';
        let active = true;
        let stage = 0;
        let variables: VariablesBlock | undefined;
        let simulationRules: SimulationRuleNode[] | undefined;
        let fateHints: FateHintNode[] | undefined;

        // Parse chain properties and nested blocks
        while (!this.isAtEnd() && !this.check('SEPARATOR')) {
            this.skipNewlines();
            if (this.check('SEPARATOR') || this.isAtEnd()) break;

            if (this.check('AT_BLOCK')) {
                const blockType = this.peek().value;
                if (blockType === '@variables') {
                    variables = this.parseVariablesBlock();
                } else if (blockType === '@simulation_rules') {
                    simulationRules = this.parseSimulationRulesBlock();
                } else if (blockType === '@fate_hints') {
                    fateHints = this.parseFateHintsBlock();
                } else if (['@chain', '@mail', '@event', '@story'].includes(blockType)) {
                    break; // New top-level block
                } else {
                    throw new DSLParseError(`Unexpected block in @chain: ${blockType}`, this.currentLocation(), this.source);
                }
            } else if (this.check('IDENTIFIER')) {
                const propName = this.advance().value;
                this.consume('COLON', ':');

                switch (propName) {
                    case 'npc_name':
                        npcName = this.parseStringValue();
                        break;
                    case 'active':
                        active = this.parseBooleanValue();
                        break;
                    case 'stage':
                        stage = this.parseNumberValue();
                        break;
                    default:
                        // Skip unknown property
                        this.skipToNextLine();
                }
                this.skipNewlines();
            } else {
                break;
            }
        }

        if (!npcName) {
            throw new DSLMissingFieldError('npc_name', '@chain', location, this.source);
        }

        return AST.createChainBlock(id, npcName, active, stage, location, {
            variables,
            simulationRules,
            fateHints
        });
    }

    // === VARIABLES BLOCK ===

    private parseVariablesBlock(): VariablesBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@variables');
        this.skipNewlines();

        const entries: AST.VariableEntry[] = [];

        // Expect INDENT
        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK') && !this.check('SEPARATOR')) {
                this.skipNewlines();
                if (this.check('DEDENT') || this.check('AT_BLOCK') || this.check('SEPARATOR')) break;

                if (this.check('IDENTIFIER')) {
                    const entryLoc = this.currentLocation();
                    const name = this.advance().value;

                    this.consume('EQUALS', '=');
                    const value = this.parseNumberValue();

                    entries.push(AST.createVariableEntry(name, value, entryLoc));
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createVariablesBlock(entries, location);
    }

    // === SIMULATION RULES ===

    private parseSimulationRulesBlock(): SimulationRuleNode[] {
        this.consume('AT_BLOCK', '@simulation_rules');
        this.skipNewlines();

        const rules: SimulationRuleNode[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('SEPARATOR')) {
                this.skipNewlines();
                if (this.check('DEDENT') || this.check('SEPARATOR')) break;

                if (this.check('AT_BLOCK')) {
                    const ruleType = this.peek().value;

                    switch (ruleType) {
                        case '@delta':
                            rules.push(this.parseDeltaRule());
                            break;
                        case '@threshold':
                            rules.push(this.parseThresholdRule());
                            break;
                        case '@compound':
                            rules.push(this.parseCompoundRule());
                            break;
                        case '@chance':
                            rules.push(this.parseChanceRule());
                            break;
                        default:
                            throw new DSLParseError(`Unknown rule type: ${ruleType}`, this.currentLocation(), this.source);
                    }
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return rules;
    }

    private parseDeltaRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@delta');

        const targetVar = this.consumeIdentifier('target variable');
        const value = this.parseNumberValue();
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let logMessage: string | undefined;

        // Parse optional properties
        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    if (propName === 'when') {
                        condition = this.parseCondition();
                    } else if (propName === 'log') {
                        logMessage = this.parseStringValue();
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createDeltaRule(targetVar, value, location, { condition, logMessage });
    }

    private parseThresholdRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@threshold');

        const targetVar = this.consumeIdentifier('target variable');
        const operator = this.parseRuleOperator();
        const value = this.parseNumberValue();
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let triggerLog: string | undefined;
        let onTrigger: ActionNode[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    if (propName === 'when') {
                        condition = this.parseCondition();
                    } else if (propName === 'log') {
                        triggerLog = this.parseStringValue();
                    } else if (propName === 'trigger') {
                        onTrigger = this.parseActionList();
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createThresholdRule(targetVar, operator, value, onTrigger, location, { condition, triggerLog });
    }

    private parseCompoundRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@compound');

        const sourceVar = this.consumeIdentifier('source variable');
        const operator = this.parseRuleOperator();
        const threshold = this.parseNumberValue();
        this.consume('ARROW', '->');
        const targetVar = this.consumeIdentifier('target variable');
        const effect = this.parseNumberValue();
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let logMessage: string | undefined;
        let cap: { min?: number; max?: number } | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    if (propName === 'when') {
                        condition = this.parseCondition();
                    } else if (propName === 'log') {
                        logMessage = this.parseStringValue();
                    } else if (propName === 'cap') {
                        cap = this.parseCapRange();
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createCompoundRule(sourceVar, operator, threshold, targetVar, effect, location, {
            condition,
            logMessage,
            cap
        });
    }

    private parseChanceRule(): SimulationRuleNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@chance');

        let chanceVar: string | undefined;
        let chanceFixed: number | undefined;

        // Parse chance variable or fixed value
        if (this.check('IDENTIFIER')) {
            chanceVar = this.advance().value;
        } else if (this.check('NUMBER')) {
            chanceFixed = this.parseNumberValue();
        }
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let successLog: string | undefined;
        let failLog: string | undefined;
        let onSuccess: ActionNode[] = [];
        let onFail: ActionNode[] | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'when':
                            condition = this.parseCondition();
                            break;
                        case 'success_log':
                            successLog = this.parseStringValue();
                            break;
                        case 'fail_log':
                            failLog = this.parseStringValue();
                            break;
                        case 'on_success':
                            onSuccess = this.parseActionList();
                            break;
                        case 'on_fail':
                            onFail = this.parseActionList();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createChanceRule(onSuccess, location, {
            chanceVar,
            chanceFixed,
            condition,
            onFail,
            successLog,
            failLog
        });
    }

    // === FATE HINTS ===

    private parseFateHintsBlock(): FateHintNode[] {
        this.consume('AT_BLOCK', '@fate_hints');
        this.skipNewlines();

        const hints: FateHintNode[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('AT_BLOCK') && this.peek().value === '@hint') {
                    hints.push(this.parseFateHint());
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return hints;
    }

    private parseFateHint(): FateHintNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@hint');
        this.skipNewlines();

        let condition: ConditionNode | undefined;
        let priority = 5;
        const hintTexts: string[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'when':
                            condition = this.parseCondition();
                            break;
                        case 'priority':
                            priority = this.parseNumberValue();
                            break;
                        case 'text':
                            hintTexts.push(this.parseStringValue());
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        if (!condition) {
            throw new DSLMissingFieldError('when', '@hint', location, this.source);
        }

        return AST.createFateHint(condition, priority, hintTexts, location);
    }

    // === MAIL BLOCK ===

    private parseMailBlock(): MailBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@mail');

        const id = this.consumeIdentifier('mail id');
        this.skipNewlines();

        let sender = '';
        let subject = '';
        let body = '';
        let cash: number | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('SEPARATOR')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'sender':
                            sender = this.parseStringValue();
                            break;
                        case 'subject':
                            subject = this.parseStringValue();
                            break;
                        case 'body':
                            body = this.parseStringValue();
                            break;
                        case 'cash':
                            cash = this.parseNumberValue();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        if (!sender) throw new DSLMissingFieldError('sender', '@mail', location, this.source);
        if (!subject) throw new DSLMissingFieldError('subject', '@mail', location, this.source);
        if (!body) throw new DSLMissingFieldError('body', '@mail', location, this.source);

        return AST.createMailBlock(id, sender, subject, body, location, cash ? { cash } : undefined);
    }

    // === EVENT BLOCK ===

    private parseEventBlock(): EventBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@event');

        const id = this.consumeIdentifier('event id');
        this.skipNewlines();

        let chainId = '';
        let eventType: 'STANDARD' | 'REDEMPTION_CHECK' | 'POST_FORFEIT_VISIT' | undefined;
        const triggerConditions: ConditionNode[] = [];
        let item: ItemBlock | undefined;
        let customer: CustomerBlock | undefined;
        let outcomes: OutcomesBlock | undefined;
        let onReject: ActionNode[] | undefined;
        let onExtend: ActionNode[] | undefined;
        let onFailure: ActionNode[] | undefined;
        let failureMailId: string | undefined;
        let coreItemId: string | undefined;
        let targetItemId: string | undefined;
        let expiryFlows: ExpiryFlowsNode | undefined;
        let dynamicFlows: DynamicFlowsNode | undefined;

        // Parse event content
        const parseEventContent = () => {
            while (!this.isAtEnd() && !this.check('SEPARATOR')) {
                this.skipNewlines();
                if (this.check('SEPARATOR') || this.isAtEnd()) break;

                if (this.check('AT_BLOCK')) {
                    const blockType = this.peek().value;

                    if (['@chain', '@mail', '@event', '@story'].includes(blockType)) {
                        break; // New top-level block
                    }

                    switch (blockType) {
                        case '@item':
                            item = this.parseItemBlock();
                            break;
                        case '@customer':
                            customer = this.parseCustomerBlock();
                            break;
                        case '@outcomes':
                            outcomes = this.parseOutcomesBlock();
                            break;
                        case '@on_reject':
                            onReject = this.parseOnActionBlock('@on_reject');
                            break;
                        case '@on_extend':
                            onExtend = this.parseOnActionBlock('@on_extend');
                            break;
                        case '@on_failure':
                            onFailure = this.parseOnActionBlock('@on_failure');
                            break;
                        case '@expiry_flows':
                            expiryFlows = this.parseExpiryFlowsBlock();
                            break;
                        case '@dynamic_flows':
                            dynamicFlows = this.parseDynamicFlowsBlock();
                            break;
                        default:
                            throw new DSLParseError(`Unexpected block in @event: ${blockType}`, this.currentLocation(), this.source);
                    }
                } else if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'chain':
                            chainId = this.consumeIdentifier('chain id');
                            break;
                        case 'type':
                            const typeVal = this.consumeIdentifier('event type');
                            eventType = typeVal as typeof eventType;
                            break;
                        case 'trigger':
                        case 'when':
                            triggerConditions.push(this.parseCondition());
                            break;
                        case 'failure_mail':
                            failureMailId = this.consumeIdentifier('mail id');
                            break;
                        case 'core_item':
                            coreItemId = this.consumeIdentifier('item id');
                            break;
                        case 'target_item':
                            targetItemId = this.consumeIdentifier('item id');
                            break;
                        default:
                            this.skipToNextLine();
                    }
                    this.skipNewlines();
                } else if (this.check('INDENT')) {
                    this.advance();
                } else if (this.check('DEDENT')) {
                    this.advance();
                } else {
                    break;
                }
            }
        };

        parseEventContent();

        if (!chainId) throw new DSLMissingFieldError('chain', '@event', location, this.source);

        return AST.createEventBlock(id, chainId, triggerConditions, location, {
            eventType,
            item,
            customer,
            outcomes,
            onReject,
            onExtend,
            onFailure,
            failureMailId,
            coreItemId,
            targetItemId,
            expiryFlows,
            dynamicFlows
        });
    }

    // === ITEM BLOCK ===

    private parseItemBlock(): ItemBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@item');

        const id = this.consumeIdentifier('item id');
        this.skipNewlines();

        let name = '';
        let realValue = 0;
        let category: string | undefined;
        let condition: string | undefined;
        let visualDescription: string | undefined;
        let historySnippet: string | undefined;
        let appraisalNote: string | undefined;
        let archiveSummary: string | undefined;
        let perceivedValue: number | undefined;
        let uncertainty: number | undefined;
        let isStolen: boolean | undefined;
        let isFake: boolean | undefined;
        let sentimentalValue: boolean | undefined;
        let isVirtual: boolean | undefined;
        let traits: TraitBlock[] | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK', ['@customer', '@outcomes', '@on_reject', '@expiry_flows', '@dynamic_flows'])) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('AT_BLOCK') && this.peek().value === '@traits') {
                    traits = this.parseTraitsBlock();
                } else if (this.check('AT_BLOCK')) {
                    break;
                } else if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'name':
                            name = this.parseStringValue();
                            break;
                        case 'real_value':
                            realValue = this.parseNumberValue();
                            break;
                        case 'category':
                            category = this.parseStringValue();
                            break;
                        case 'condition':
                            condition = this.parseStringValue();
                            break;
                        case 'visual_description':
                        case 'description':
                            visualDescription = this.parseStringValue();
                            break;
                        case 'history':
                        case 'history_snippet':
                            historySnippet = this.parseStringValue();
                            break;
                        case 'appraisal_note':
                            appraisalNote = this.parseStringValue();
                            break;
                        case 'archive_summary':
                            archiveSummary = this.parseStringValue();
                            break;
                        case 'perceived_value':
                            perceivedValue = this.parseNumberValue();
                            break;
                        case 'uncertainty':
                            uncertainty = this.parseNumberValue();
                            break;
                        case 'stolen':
                            isStolen = this.parseBooleanValue();
                            break;
                        case 'fake':
                            isFake = this.parseBooleanValue();
                            break;
                        case 'sentimental':
                            sentimentalValue = this.parseBooleanValue();
                            break;
                        case 'virtual':
                            isVirtual = this.parseBooleanValue();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        if (!name) throw new DSLMissingFieldError('name', '@item', location, this.source);

        return AST.createItemBlock(id, name, realValue, location, {
            category,
            condition,
            visualDescription,
            historySnippet,
            appraisalNote,
            archiveSummary,
            perceivedValue,
            uncertainty,
            isStolen,
            isFake,
            sentimentalValue,
            isVirtual,
            traits
        });
    }

    private parseTraitsBlock(): TraitBlock[] {
        this.consume('AT_BLOCK', '@traits');
        this.skipNewlines();

        const traits: TraitBlock[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('AT_BLOCK') && this.peek().value === '@trait') {
                    traits.push(this.parseTrait());
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return traits;
    }

    private parseTrait(): TraitBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@trait');

        const id = this.consumeIdentifier('trait id');
        this.skipNewlines();

        let name = '';
        let traitType: 'FLAW' | 'STORY' | 'FAKE' = 'STORY';
        let description = '';
        let valueImpact = 0;
        let discoveryDifficulty = 0.5;
        let dialogueTrigger: { playerLine: string; customerLine: string } | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'name':
                            name = this.parseStringValue();
                            break;
                        case 'type':
                            const t = this.consumeIdentifier('trait type').toUpperCase();
                            traitType = t as typeof traitType;
                            break;
                        case 'description':
                            description = this.parseStringValue();
                            break;
                        case 'value_impact':
                            valueImpact = this.parseNumberValue();
                            break;
                        case 'discovery':
                            discoveryDifficulty = this.parseNumberValue();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createTraitBlock(id, name, traitType, description, valueImpact, discoveryDifficulty, location, dialogueTrigger);
    }

    // === CUSTOMER BLOCK ===

    private parseCustomerBlock(): CustomerBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@customer');
        this.skipNewlines();

        let name = '';
        let description = '';
        let avatarSeed: string | undefined;
        let desiredAmount: number | undefined;
        let minimumAmount: number | undefined;
        let maxRepayment: number | undefined;
        let patience: number | undefined;
        let mood: string | undefined;
        let tags: string[] | undefined;
        let redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None' | undefined;
        let negotiationStyle: 'Aggressive' | 'Desperate' | 'Professional' | 'Deceptive' | undefined;
        let interactionType: 'PAWN' | 'REDEEM' | 'NEGOTIATION' | undefined;
        let currentAskPrice: number | undefined;
        let dialogue: DialogueBlock | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('AT_BLOCK') && this.peek().value === '@dialogue') {
                    dialogue = this.parseDialogueBlock();
                } else if (this.check('AT_BLOCK')) {
                    break;
                } else if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'name':
                            name = this.parseStringValue();
                            break;
                        case 'description':
                            description = this.parseStringValue();
                            break;
                        case 'avatar':
                        case 'avatar_seed':
                            avatarSeed = this.parseStringValue();
                            break;
                        case 'desired':
                        case 'desired_amount':
                            desiredAmount = this.parseNumberValue();
                            break;
                        case 'minimum':
                        case 'minimum_amount':
                            minimumAmount = this.parseNumberValue();
                            break;
                        case 'max_repayment':
                            maxRepayment = this.parseNumberValue();
                            break;
                        case 'patience':
                            patience = this.parseNumberValue();
                            break;
                        case 'mood':
                            mood = this.parseStringValue();
                            break;
                        case 'tags':
                            tags = this.parseTagsList();
                            break;
                        case 'redemption_resolve':
                            redemptionResolve = this.consumeIdentifier('resolve') as typeof redemptionResolve;
                            break;
                        case 'negotiation_style':
                            negotiationStyle = this.consumeIdentifier('style') as typeof negotiationStyle;
                            break;
                        case 'interaction_type':
                            interactionType = this.consumeIdentifier('type') as typeof interactionType;
                            break;
                        case 'ask_price':
                            currentAskPrice = this.parseNumberValue();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        if (!name) throw new DSLMissingFieldError('name', '@customer', location, this.source);
        if (!description) throw new DSLMissingFieldError('description', '@customer', location, this.source);
        if (!dialogue) throw new DSLMissingFieldError('@dialogue', '@customer', location, this.source);

        return AST.createCustomerBlock(name, description, dialogue, location, {
            avatarSeed,
            desiredAmount,
            minimumAmount,
            maxRepayment,
            patience,
            mood,
            tags,
            redemptionResolve,
            negotiationStyle,
            interactionType,
            currentAskPrice
        });
    }

    // === DIALOGUE BLOCK ===

    private parseDialogueBlock(): DialogueBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@dialogue');
        this.skipNewlines();

        let greeting: DialogueTextNode = '';
        let pawnReason: DialogueTextNode = '';
        let redemptionPlea: DialogueTextNode | undefined;
        let negotiationDynamic: DialogueTextNode | undefined;
        let accepted: AcceptedDialogueNode | undefined;
        let rejected: DialogueTextNode | undefined;
        let rejectionLines: RejectionLinesNode | undefined;
        let exitDialogues: ExitDialoguesNode | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('AT_BLOCK')) {
                    const blockType = this.peek().value;
                    if (blockType === '@exit') {
                        exitDialogues = this.parseExitDialoguesBlock();
                    } else if (blockType === '@accepted') {
                        accepted = this.parseAcceptedBlock();
                    } else if (blockType === '@rejection_lines') {
                        rejectionLines = this.parseRejectionLinesBlock();
                    } else {
                        break;
                    }
                } else if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'greeting':
                            greeting = this.parseDialogueText();
                            break;
                        case 'pawn_reason':
                            pawnReason = this.parseDialogueText();
                            break;
                        case 'redemption_plea':
                            redemptionPlea = this.parseDialogueText();
                            break;
                        case 'negotiation_dynamic':
                            negotiationDynamic = this.parseDialogueText();
                            break;
                        case 'rejected':
                            rejected = this.parseDialogueText();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createDialogueBlock(greeting, pawnReason, location, {
            redemptionPlea,
            negotiationDynamic,
            accepted,
            rejected,
            rejectionLines,
            exitDialogues
        });
    }

    private parseDialogueText(): DialogueTextNode {
        // Check for string literal
        if (this.check('STRING')) {
            return this.parseStringValue();
        }

        // Check for multiline variants
        this.skipNewlines();
        if (this.check('INDENT')) {
            this.advance();
            const variants: DialogueVariantNode[] = [];

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                const variantLoc = this.currentLocation();
                let condition: ConditionNode | undefined;

                // Check for condition
                if (this.check('IDENTIFIER') && this.peekNext()?.type === 'COLON') {
                    const propName = this.advance().value;
                    if (propName === 'default') {
                        this.consume('COLON', ':');
                        const text = this.parseStringValue();
                        variants.push(AST.createDialogueVariant(text, variantLoc));
                    } else {
                        // It's a condition like "hope >= 50"
                        this.advance(); // skip colon
                        condition = this.parseCondition();
                        this.consume('COLON', ':');
                        const text = this.parseStringValue();
                        variants.push(AST.createDialogueVariant(text, variantLoc, condition));
                    }
                } else if (this.check('STRING')) {
                    const text = this.parseStringValue();
                    variants.push(AST.createDialogueVariant(text, variantLoc));
                }

                this.skipNewlines();
            }

            if (this.check('DEDENT')) {
                this.advance();
            }

            return variants.length === 1 ? variants[0].text : variants;
        }

        return '';
    }

    private parseAcceptedBlock(): AcceptedDialogueNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@accepted');
        this.skipNewlines();

        let fair: DialogueTextNode = '';
        let fleeced: DialogueTextNode = '';
        let premium: DialogueTextNode = '';

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'fair':
                            fair = this.parseDialogueText();
                            break;
                        case 'fleeced':
                            fleeced = this.parseDialogueText();
                            break;
                        case 'premium':
                            premium = this.parseDialogueText();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createAcceptedDialogue(fair, fleeced, premium, location);
    }

    private parseRejectionLinesBlock(): RejectionLinesNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@rejection_lines');
        this.skipNewlines();

        let standard: DialogueTextNode = '';
        let angry: DialogueTextNode = '';
        let desperate: DialogueTextNode | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'standard':
                            standard = this.parseDialogueText();
                            break;
                        case 'angry':
                            angry = this.parseDialogueText();
                            break;
                        case 'desperate':
                            desperate = this.parseDialogueText();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createRejectionLines(standard, angry, location, desperate);
    }

    private parseExitDialoguesBlock(): ExitDialoguesNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@exit');
        this.skipNewlines();

        let grateful: DialogueTextNode = '';
        let neutral: DialogueTextNode = '';
        let resentful: DialogueTextNode = '';
        let desperate: DialogueTextNode = '';

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'grateful':
                            grateful = this.parseDialogueText();
                            break;
                        case 'neutral':
                            neutral = this.parseDialogueText();
                            break;
                        case 'resentful':
                            resentful = this.parseDialogueText();
                            break;
                        case 'desperate':
                            desperate = this.parseDialogueText();
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createExitDialogues(grateful, neutral, resentful, desperate, location);
    }

    // === OUTCOMES BLOCK ===

    private parseOutcomesBlock(): OutcomesBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@outcomes');
        this.skipNewlines();

        let dealCharity: ActionNode[] | undefined;
        let dealAid: ActionNode[] | undefined;
        let dealStandard: ActionNode[] | undefined;
        let dealShark: ActionNode[] | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('IDENTIFIER')) {
                    const outcomeName = this.advance().value;
                    this.consume('COLON', ':');

                    const actions = this.parseActionList();

                    switch (outcomeName) {
                        case 'deal_charity':
                            dealCharity = actions;
                            break;
                        case 'deal_aid':
                            dealAid = actions;
                            break;
                        case 'deal_standard':
                            dealStandard = actions;
                            break;
                        case 'deal_shark':
                            dealShark = actions;
                            break;
                    }
                    this.skipNewlines();
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createOutcomesBlock(location, { dealCharity, dealAid, dealStandard, dealShark });
    }

    private parseOnActionBlock(blockType: string): ActionNode[] {
        this.consume('AT_BLOCK', blockType);
        this.skipNewlines();
        return this.parseActionList();
    }

    // === EXPIRY FLOWS ===

    private parseExpiryFlowsBlock(): ExpiryFlowsNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@expiry_flows');
        this.skipNewlines();

        let redemption: { accept?: ActionNode[]; refuse?: ActionNode[] } | undefined;
        let renewal: { accept?: ActionNode[]; refuse?: ActionNode[] } | undefined;
        let noShow: { sell?: ActionNode[]; keep?: ActionNode[] } | undefined;

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('IDENTIFIER')) {
                    const flowType = this.advance().value;
                    this.consume('COLON', ':');
                    this.skipNewlines();

                    if (this.check('INDENT')) {
                        this.advance();
                        this.skipNewlines();

                        const flowActions: Record<string, ActionNode[]> = {};

                        while (!this.isAtEnd() && !this.check('DEDENT')) {
                            if (this.check('IDENTIFIER')) {
                                const actionType = this.advance().value;
                                this.consume('COLON', ':');
                                flowActions[actionType] = this.parseActionList();
                            }
                            this.skipNewlines();
                        }

                        if (this.check('DEDENT')) {
                            this.advance();
                        }

                        switch (flowType) {
                            case 'redemption':
                                redemption = { accept: flowActions['accept'], refuse: flowActions['refuse'] };
                                break;
                            case 'renewal':
                                renewal = { accept: flowActions['accept'], refuse: flowActions['refuse'] };
                                break;
                            case 'no_show':
                                noShow = { sell: flowActions['sell'], keep: flowActions['keep'] };
                                break;
                        }
                    }
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createExpiryFlows(location, { redemption, renewal, noShow });
    }

    // === DYNAMIC FLOWS ===

    private parseDynamicFlowsBlock(): DynamicFlowsNode {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@dynamic_flows');
        this.skipNewlines();

        const flows: DynamicFlowEntry[] = [];

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                if (this.check('IDENTIFIER')) {
                    const key = this.advance().value;
                    this.consume('COLON', ':');
                    this.skipNewlines();

                    const flowLoc = this.currentLocation();
                    let dialogue: DialogueTextNode = '';
                    let outcome: ActionNode[] = [];

                    if (this.check('INDENT')) {
                        this.advance();
                        this.skipNewlines();

                        while (!this.isAtEnd() && !this.check('DEDENT')) {
                            if (this.check('IDENTIFIER')) {
                                const propName = this.advance().value;
                                this.consume('COLON', ':');

                                if (propName === 'dialogue') {
                                    dialogue = this.parseDialogueText();
                                } else if (propName === 'outcome') {
                                    outcome = this.parseActionList();
                                }
                            }
                            this.skipNewlines();
                        }

                        if (this.check('DEDENT')) {
                            this.advance();
                        }
                    }

                    flows.push(AST.createDynamicFlowEntry(key, dialogue, outcome, flowLoc));
                } else {
                    break;
                }
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        }

        return AST.createDynamicFlows(flows, location);
    }

    // === ACTION PARSING ===

    private parseActionList(): ActionNode[] {
        const actions: ActionNode[] = [];
        this.skipNewlines();

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                this.skipNewlines();
                if (this.check('DEDENT') || this.check('AT_BLOCK')) break;

                const action = this.parseAction();
                if (action) {
                    actions.push(action);
                }
                this.skipNewlines();
            }

            if (this.check('DEDENT')) {
                this.advance();
            }
        } else {
            // Single-line action list
            const action = this.parseAction();
            if (action) {
                actions.push(action);
            }
        }

        return actions;
    }

    private parseAction(): ActionNode | null {
        const location = this.currentLocation();

        if (this.check('IDENTIFIER')) {
            const actionName = this.advance().value;

            // Handle assignment operators
            if (this.check('EQUALS')) {
                this.advance();
                const value = this.parseNumberValue();
                return AST.createSetVarAction(actionName, value, location);
            }

            if (this.check('PLUS_EQUALS')) {
                this.advance();
                const delta = this.parseNumberValue();
                return AST.createModifyVarAction(actionName, delta, location);
            }

            if (this.check('MINUS_EQUALS')) {
                this.advance();
                const delta = -this.parseNumberValue();
                return AST.createModifyVarAction(actionName, delta, location);
            }

            // Handle built-in actions
            switch (actionName) {
                case 'add_funds_deal':
                    return AST.createAddFundsDealAction(location);

                case 'add_funds':
                    this.consume('COLON', ':');
                    return AST.createAddFundsAction(this.parseNumberValue(), location);

                case 'set_stage':
                    this.consume('COLON', ':');
                    return AST.createSetStageAction(this.parseNumberValue(), location);

                case 'mail':
                    this.consume('COLON', ':');
                    const mailId = this.consumeIdentifier('mail id');
                    let delay = 0;
                    if (this.check('IDENTIFIER') && this.peek().value === 'delay') {
                        this.advance();
                        this.consume('COLON', ':');
                        delay = this.parseNumberValue();
                    }
                    return AST.createScheduleMailAction(mailId, delay, location);

                case 'modify_var':
                    this.consume('COLON', ':');
                    const varName = this.consumeIdentifier('variable');
                    const varDelta = this.parseNumberValue();
                    return AST.createModifyVarAction(varName, varDelta, location);

                case 'modify_rep':
                    this.consume('COLON', ':');
                    return AST.createModifyRepAction(this.parseNumberValue(), location);

                case 'deactivate':
                    return AST.createDeactivateAction(location);

                case 'deactivate_chain':
                    return AST.createDeactivateChainAction(location);

                case 'redeem_all':
                    return AST.createRedeemAllAction(location);

                case 'redeem_target':
                    return AST.createRedeemTargetOnlyAction(location);

                case 'force_sell_all':
                    return AST.createForceSellAllAction(location);

                case 'force_sell_target':
                    let targetId: string | undefined;
                    if (this.check('COLON')) {
                        this.advance();
                        targetId = this.consumeIdentifier('item id');
                    }
                    return AST.createForceSellTargetAction(location, targetId);

                case 'mark_core_lost':
                    return AST.createMarkCoreLostAction(location);
            }
        }

        return null;
    }

    // === CONDITION PARSING ===

    private parseCondition(): ConditionNode {
        const location = this.currentLocation();
        const variable = this.consumeIdentifier('variable');
        const operator = this.parseOperator();
        const value = this.parseNumberValue();

        return AST.createCondition(variable, operator, value, location);
    }

    private parseOperator(): '>' | '<' | '>=' | '<=' | '==' | '%' {
        if (this.check('OPERATOR')) {
            const op = this.advance().value;
            if (['>', '<', '>=', '<=', '==', '%'].includes(op)) {
                return op as '>' | '<' | '>=' | '<=' | '==' | '%';
            }
        }
        throw new DSLParseError('Expected comparison operator', this.currentLocation(), this.source);
    }

    private parseRuleOperator(): '>' | '<' | '>=' | '<=' | '==' {
        const op = this.parseOperator();
        if (op === '%') {
            throw new DSLParseError('Operator % is not valid in simulation rules', this.currentLocation(), this.source);
        }
        return op;
    }

    private parseCapRange(): { min?: number; max?: number } {
        const min = this.parseNumberValue();
        this.consume('DOT_DOT', '..');
        const max = this.parseNumberValue();
        return { min, max };
    }

    // === VALUE PARSING ===

    private parseStringValue(): string {
        if (this.check('STRING')) {
            return this.advance().value;
        }
        // Also accept identifiers as bare strings
        if (this.check('IDENTIFIER')) {
            return this.advance().value;
        }
        throw new DSLUnexpectedTokenError('string', this.peek().type, this.currentLocation(), this.source);
    }

    private parseNumberValue(): number {
        if (this.check('NUMBER')) {
            return parseFloat(this.advance().value);
        }
        // Handle negative numbers
        if (this.check('OPERATOR') && this.peek().value === '-') {
            this.advance();
            if (this.check('NUMBER')) {
                return -parseFloat(this.advance().value);
            }
        }
        throw new DSLUnexpectedTokenError('number', this.peek().type, this.currentLocation(), this.source);
    }

    private parseBooleanValue(): boolean {
        if (this.check('KEYWORD')) {
            const val = this.advance().value;
            return val === 'true';
        }
        if (this.check('IDENTIFIER')) {
            const val = this.advance().value.toLowerCase();
            return val === 'true' || val === 'yes';
        }
        throw new DSLUnexpectedTokenError('boolean', this.peek().type, this.currentLocation(), this.source);
    }

    private parseTagsList(): string[] {
        const tags: string[] = [];

        if (this.check('BRACKET_OPEN')) {
            this.advance();

            while (!this.check('BRACKET_CLOSE') && !this.isAtEnd()) {
                if (this.check('STRING')) {
                    tags.push(this.advance().value);
                } else if (this.check('IDENTIFIER')) {
                    tags.push(this.advance().value);
                }

                if (this.check('COMMA')) {
                    this.advance();
                }
            }

            this.consume('BRACKET_CLOSE', ']');
        }

        return tags;
    }

    // === TOKEN HELPERS ===

    private check(type: TokenType, values?: string[]): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        if (token.type !== type) return false;
        if (values && !values.includes(token.value)) return false;
        return true;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private peekNext(): Token | undefined {
        return this.tokens[this.current + 1];
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.tokens[this.current - 1];
    }

    private isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    private consume(type: TokenType, expected: string): Token {
        if (this.check(type)) {
            return this.advance();
        }
        throw new DSLUnexpectedTokenError(expected, this.peek().value || this.peek().type, this.currentLocation(), this.source);
    }

    private consumeIdentifier(context: string): string {
        if (this.check('IDENTIFIER')) {
            return this.advance().value;
        }
        throw new DSLUnexpectedTokenError(context, this.peek().type, this.currentLocation(), this.source);
    }

    private currentLocation(): SourceLocation {
        return this.peek().location;
    }

    private skipNewlines(): void {
        while (this.check('NEWLINE')) {
            this.advance();
        }
    }

    private skipToNextLine(): void {
        while (!this.isAtEnd() && !this.check('NEWLINE')) {
            this.advance();
        }
    }
}

/**
 * Parse DSL source code into an AST
 */
export function parse(source: string, filename?: string): StoryFile {
    const parser = new Parser(source, filename);
    return parser.parse();
}
