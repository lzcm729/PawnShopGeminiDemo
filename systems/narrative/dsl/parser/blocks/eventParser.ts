/**
 * Event Block Parser
 * Handles parsing of @event blocks and nested components
 */

import { BaseParser } from '../baseParser';
import { DSLParseError, DSLMissingFieldError } from '../errors';
import * as AST from '../ast';
import {
    EventBlock,
    ItemBlock,
    CustomerBlock,
    DialogueBlock,
    OutcomesBlock,
    TraitBlock,
    ConditionNode,
    ActionNode,
    ExpiryFlowsNode,
    DynamicFlowsNode,
    DynamicFlowEntry,
    DialogueTextNode,
    DialogueVariantNode,
    AcceptedDialogueNode,
    RejectionLinesNode,
    ExitDialoguesNode
} from '../../types';

export class EventBlockParser extends BaseParser {
    /**
     * Parse an @event block
     */
    parseEventBlock(): EventBlock {
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

            while (!this.isAtEnd() && !this.check('DEDENT')) {
                this.skipNewlines();
                if (this.check('DEDENT')) break;

                // Check for @dialogue_trigger block
                if (this.check('AT_BLOCK') && this.peek().value === '@dialogue_trigger') {
                    dialogueTrigger = this.parseDialogueTriggerBlock();
                } else if (this.check('AT_BLOCK')) {
                    // Another @trait or other block - exit
                    break;
                } else if (this.check('IDENTIFIER')) {
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

    private parseDialogueTriggerBlock(): { playerLine: string; customerLine: string } {
        this.consume('AT_BLOCK', '@dialogue_trigger');
        this.skipNewlines();

        let playerLine = '';
        let customerLine = '';

        if (this.check('INDENT')) {
            this.advance();
            this.skipNewlines();

            while (!this.isAtEnd() && !this.check('DEDENT') && !this.check('AT_BLOCK')) {
                if (this.check('IDENTIFIER')) {
                    const propName = this.advance().value;
                    this.consume('COLON', ':');

                    switch (propName) {
                        case 'player':
                            playerLine = this.parseStringValue();
                            break;
                        case 'customer':
                            customerLine = this.parseStringValue();
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

        return { playerLine, customerLine };
    }

    // === CUSTOMER BLOCK ===

    private parseCustomerBlock(): CustomerBlock {
        const location = this.currentLocation();
        this.consume('AT_BLOCK', '@customer');
        this.skipNewlines();

        let name: string | undefined;
        let description: string | undefined;
        let avatarSeed: string | undefined;
        let desiredAmount: number | undefined;
        let minimumAmount: number | undefined;
        let maxRepayment: number | undefined;
        let patience: number | undefined;
        let mood: string | undefined;
        let redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None' | undefined;
        let behaviorTags: ('DESPERATE' | 'STUBBORN' | 'SUSPICIOUS' | 'NAIVE' | 'SAVVY' | 'SENTIMENTAL')[] | undefined;
        let identityTags: string[] | undefined;
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
                        case 'identity_tags':
                            identityTags = this.parseTagsList();
                            break;
                        case 'behavior_tags':
                            behaviorTags = this.parseTagsList() as typeof behaviorTags;
                            break;
                        case 'redemption_resolve':
                            redemptionResolve = this.consumeIdentifier('resolve') as typeof redemptionResolve;
                            break;
                        case 'interaction_type':
                            interactionType = this.consumeIdentifier('type') as typeof interactionType;
                            break;
                        case 'ask_price':
                            currentAskPrice = this.parseNumberValue();
                            break;
                        // Alias: 'tags' is shorthand for 'identity_tags'
                        case 'tags':
                            identityTags = this.parseTagsList();
                            break;
                        case 'negotiation_style':
                        case 'pawn_term_days':
                            this.skipToNextLine(); // skip unknown value
                            break;
                        default:
                            // Unknown property - skip to next line
                            this.skipToNextLine();
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

        // Validate required fields
        if (name === undefined || name === '') throw new DSLMissingFieldError('name', '@customer', location, this.source);
        if (description === undefined) throw new DSLMissingFieldError('description', '@customer', location, this.source);
        if (!dialogue) throw new DSLMissingFieldError('@dialogue', '@customer', location, this.source);

        // TypeScript narrowing for createCustomerBlock
        const validName = name;
        const validDescription = description;

        return AST.createCustomerBlock(validName, validDescription, dialogue, location, {
            avatarSeed,
            desiredAmount,
            minimumAmount,
            maxRepayment,
            patience,
            mood,
            redemptionResolve,
            behaviorTags,
            identityTags,
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

                // Check for 'when' keyword conditional: when hope >= 50: "text"
                if (this.check('KEYWORD') && this.peek().value === 'when') {
                    this.advance(); // consume 'when'
                    condition = this.parseCondition();
                    this.consume('COLON', ':');
                    const text = this.parseStringValue();
                    variants.push(AST.createDialogueVariant(text, variantLoc, condition));
                } else if (this.check('KEYWORD') && this.peek().value === 'default') {
                    // Handle 'default' keyword variant
                    this.advance(); // consume 'default'
                    this.consume('COLON', ':');
                    const text = this.parseStringValue();
                    variants.push(AST.createDialogueVariant(text, variantLoc));
                } else if (this.check('IDENTIFIER') && this.peekNext()?.type === 'COLON') {
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
                } else {
                    // Unknown token in dialogue variants - skip to prevent infinite loop
                    break;
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

                let flowType = '';

                // Support both @redemption and redemption: formats
                if (this.check('AT_BLOCK')) {
                    const blockName = this.advance().value; // @redemption, @renewal, @no_show
                    flowType = blockName.substring(1); // Remove @ prefix
                    this.skipNewlines();
                } else if (this.check('IDENTIFIER')) {
                    flowType = this.advance().value;
                    this.consume('COLON', ':');
                    this.skipNewlines();
                } else {
                    break;
                }

                if (this.check('INDENT')) {
                    this.advance();
                    this.skipNewlines();

                    const flowActions: Record<string, ActionNode[]> = {};

                    while (!this.isAtEnd() && !this.check('DEDENT')) {
                        this.skipNewlines();
                        if (this.check('DEDENT')) break;

                        let actionType = '';

                        // Support both @accept and accept: formats
                        if (this.check('AT_BLOCK')) {
                            const actionBlock = this.advance().value; // @accept, @refuse, @sell, @keep
                            actionType = actionBlock.substring(1); // Remove @ prefix
                            this.skipNewlines();
                            flowActions[actionType] = this.parseActionList();
                        } else if (this.check('IDENTIFIER')) {
                            actionType = this.advance().value;
                            this.consume('COLON', ':');
                            flowActions[actionType] = this.parseActionList();
                        } else {
                            break;
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
                    let itemCondition: { targetItemId?: string; targetStatus: 'SAFE' | 'SOLD'; otherItemsStatus?: 'ALL_SAFE' | 'ANY_LOST' | 'IRRELEVANT' } | undefined;

                    if (this.check('INDENT')) {
                        this.advance();
                        this.skipNewlines();

                        while (!this.isAtEnd() && !this.check('DEDENT')) {
                            this.skipNewlines();
                            if (this.check('DEDENT')) break;

                            if (this.check('IDENTIFIER')) {
                                const propName = this.advance().value;
                                this.consume('COLON', ':');

                                if (propName === 'dialogue') {
                                    dialogue = this.parseDialogueText();
                                } else if (propName === 'outcome') {
                                    outcome = this.parseActionList();
                                } else if (propName === 'item_condition') {
                                    // Parse key=value pairs: target=xxx status=YYY others=ZZZ
                                    itemCondition = this.parseItemCondition();
                                }
                                this.skipNewlines();
                            } else {
                                // Unknown token - exit loop to prevent infinite loop
                                break;
                            }
                        }

                        if (this.check('DEDENT')) {
                            this.advance();
                        }
                    }

                    flows.push(AST.createDynamicFlowEntry(key, dialogue, outcome, flowLoc, itemCondition ? AST.createItemCondition(itemCondition.targetStatus, flowLoc, { targetItemId: itemCondition.targetItemId, otherItemsStatus: itemCondition.otherItemsStatus }) : undefined));
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

    /**
     * Parse item_condition: target=xxx status=YYY others=ZZZ
     */
    private parseItemCondition(): { targetItemId?: string; targetStatus: 'SAFE' | 'SOLD'; otherItemsStatus?: 'ALL_SAFE' | 'ANY_LOST' | 'IRRELEVANT' } {
        let targetItemId: string | undefined;
        let targetStatus: 'SAFE' | 'SOLD' = 'SAFE';
        let otherItemsStatus: 'ALL_SAFE' | 'ANY_LOST' | 'IRRELEVANT' | undefined;

        // Parse key=value pairs on the same line
        while (this.check('IDENTIFIER') && !this.check('NEWLINE')) {
            const key = this.advance().value;
            this.consume('EQUALS', '=');

            if (key === 'target') {
                targetItemId = this.consumeIdentifier('item id');
            } else if (key === 'status') {
                const status = this.consumeIdentifier('status').toUpperCase();
                if (status === 'SAFE' || status === 'SOLD') {
                    targetStatus = status;
                }
            } else if (key === 'others') {
                const others = this.consumeIdentifier('others status').toUpperCase();
                if (others === 'ALL_SAFE' || others === 'ANY_LOST' || others === 'IRRELEVANT') {
                    otherItemsStatus = others;
                }
            }
        }

        return { targetItemId, targetStatus, otherItemsStatus };
    }
}
