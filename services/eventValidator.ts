
import { StoryEvent, ChainUpdateEffect } from '../types';
import { MAIL_TEMPLATES } from './mailData';

// --- Part 1: Error Categorization ---
export enum ValidationErrorType {
    CONTRACT_GAP = 'CONTRACT_GAP',     // Missing outcome branches
    BROKEN_LINK = 'BROKEN_LINK',       // Invalid ID references (Item, Mail)
    DEAD_END = 'DEAD_END',             // Stage transitions to nowhere
    LOGIC_CONFLICT = 'LOGIC_CONFLICT'  // Structural or numeric issues
}

export interface ValidationIssue {
    type: ValidationErrorType;
    eventId?: string;
    message: string;
    context: any; // Flexible context for the AI
}

export interface ValidationResult {
    logs: string[];
    issues: ValidationIssue[];
}

// --- Part 3: Dynamic Prompt Generator ---
export const generateFixPrompt = (issues: ValidationIssue[]): string => {
    // Header
    let prompt = "我运行了验证器，发现了以下问题。请根据错误类型进行修复：";

    // Analyze types present
    const types = new Set(issues.map(i => i.type));

    // Strategy Blocks
    if (types.has(ValidationErrorType.CONTRACT_GAP)) {
        prompt += "\n- 合同缺失: 请参考已有的 outcome，使用插值法补全缺失档位（0% 收益最优，20% 收益最差）。";
    }
    if (types.has(ValidationErrorType.BROKEN_LINK)) {
        prompt += "\n- 引用错误: 请检查 makeItem 或 MAIL_DATA，修正 ID 拼写错误，或补充缺失的定义。";
    }
    if (types.has(ValidationErrorType.DEAD_END)) {
        prompt += "\n- 剧情断层: 请检查 SET_STAGE 的目标值，确保有对应的 triggerCondition 承接，或者创建一个新的事件来闭环。";
    }
    if (types.has(ValidationErrorType.LOGIC_CONFLICT)) {
        prompt += "\n- 逻辑矛盾: 请检查数值设定或前提条件。";
    }

    // Data Block
    // Simplify context for AI consumption
    const simplifiedReport = issues.map(i => ({
        type: i.type,
        eventId: i.eventId,
        message: i.message,
        context: i.context
    }));

    prompt += "\n\n详细错误日志:\n" + JSON.stringify(simplifiedReport, null, 2);

    return prompt;
};

// --- Main Validation Logic ---
export const validateEvents = (events: StoryEvent[]): ValidationResult => {
    const logs: string[] = [];
    const issues: ValidationIssue[] = [];
    
    const error = (msg: string) => logs.push(`❌ ${msg}`);
    const warn = (msg: string) => logs.push(`⚠️ ${msg}`);

    // --- PHASE 1: INDEXING ---
    const createdItemIds = new Set<string>();
    const stageListeners = new Map<string, Set<number>>(); // ChainID -> Set of Stages listened to

    events.forEach(e => {
        // Index Created Items
        if (e.item?.id) {
            createdItemIds.add(e.item.id);
        }

        // Index Stage Listeners
        e.triggerConditions.forEach(cond => {
            if (cond.variable === 'stage' && cond.operator === '==') {
                if (!stageListeners.has(e.chainId)) {
                    stageListeners.set(e.chainId, new Set());
                }
                stageListeners.get(e.chainId)?.add(cond.value);
            }
        });
    });

    // --- PHASE 2: VALIDATION ---
    events.forEach(e => {
        const prefix = `[${e.id}]`;

        // 1. Completeness Check (Negotiation Outcomes) -> CONTRACT_GAP
        if (e.outcomes && Object.keys(e.outcomes).length > 0) {
            const requiredOutcomes = ['deal_charity', 'deal_aid', 'deal_standard', 'deal_shark'];
            const existingKeys = Object.keys(e.outcomes);
            const missing = requiredOutcomes.filter(k => !e.outcomes![k]);
            
            if (missing.length > 0) {
                const msg = `${prefix} Missing outcomes: ${missing.join(', ')}`;
                error(msg);
                
                issues.push({
                    type: ValidationErrorType.CONTRACT_GAP,
                    eventId: e.id,
                    message: msg,
                    context: {
                        missing_keys: missing,
                        reference_outcomes: existingKeys,
                        context_hint: e.triggerConditions.map(c => `${c.variable} ${c.operator} ${c.value}`).join(', ')
                    }
                });
            }
        }

        // Helper to scan effects
        const scanEffects = (effects: ChainUpdateEffect[], sourceContext: string) => {
            effects.forEach(effect => {
                
                // 2. State Transition Check (Dead Ends) -> DEAD_END
                if (effect.type === 'SET_STAGE' && effect.value !== undefined) {
                    const targetStage = effect.value;
                    const listeners = stageListeners.get(e.chainId);
                    
                    // Logic: It's a dead end if NO event in this chain listens to the target stage.
                    if (!listeners || !listeners.has(targetStage)) {
                        const msg = `${prefix} ${sourceContext} sets Stage to ${targetStage}, but no event triggers on Stage == ${targetStage}.`;
                        warn(msg + " (Possible Dead End)");
                        
                        issues.push({
                            type: ValidationErrorType.DEAD_END,
                            eventId: e.id,
                            message: msg,
                            context: {
                                target_stage: targetStage,
                                chain_id: e.chainId
                            }
                        });
                    }
                }

                // 4. Mail Check -> BROKEN_LINK
                if (effect.type === 'SCHEDULE_MAIL' && effect.templateId) {
                    if (!MAIL_TEMPLATES[effect.templateId]) {
                        const msg = `${prefix} ${sourceContext} schedules unknown mail ID: '${effect.templateId}'`;
                        error(msg);
                        issues.push({
                            type: ValidationErrorType.BROKEN_LINK,
                            eventId: e.id,
                            message: msg,
                            context: {
                                resource_type: 'MAIL',
                                missing_id: effect.templateId
                            }
                        });
                    }
                }
            });
        };

        // Scan all outcome types
        if (e.outcomes) {
            Object.entries(e.outcomes).forEach(([key, effects]) => scanEffects(effects, `Outcome '${key}'`));
        }
        if (e.onReject) scanEffects(e.onReject, "OnReject");
        if (e.onComplete) scanEffects(e.onComplete, "OnComplete");
        
        // Scan Dynamic Flows (Redemption)
        if (e.dynamicFlows) {
            Object.entries(e.dynamicFlows).forEach(([key, flow]) => {
                scanEffects(flow.outcome, `DynamicFlow '${key}'`);
            });
        }

        // 3. Reference Check (Redemption Targets) -> BROKEN_LINK / LOGIC_CONFLICT
        if (e.type === 'REDEMPTION_CHECK') {
            if (!e.targetItemId) {
                const msg = `${prefix} is REDEMPTION_CHECK but missing 'targetItemId'.`;
                error(msg);
                issues.push({
                    type: ValidationErrorType.LOGIC_CONFLICT,
                    eventId: e.id,
                    message: msg,
                    context: { field: 'targetItemId' }
                });
            } else if (!createdItemIds.has(e.targetItemId)) {
                const msg = `${prefix} targets item '${e.targetItemId}', which is never created in previous events.`;
                error(msg);
                issues.push({
                    type: ValidationErrorType.BROKEN_LINK,
                    eventId: e.id,
                    message: msg,
                    context: {
                        resource_type: 'ITEM',
                        missing_id: e.targetItemId
                    }
                });
            }
        }
    });

    return { logs, issues };
};
