
import { StoryEvent, ChainUpdateEffect } from '../../types';
import { MAIL_TEMPLATES } from './mailRegistry';

export enum ValidationErrorType {
    CONTRACT_GAP = 'CONTRACT_GAP',     
    BROKEN_LINK = 'BROKEN_LINK',       
    DEAD_END = 'DEAD_END',             
    LOGIC_CONFLICT = 'LOGIC_CONFLICT'  
}

export interface ValidationIssue {
    type: ValidationErrorType;
    eventId?: string;
    message: string;
    context: any; 
}

export interface ValidationResult {
    logs: string[];
    issues: ValidationIssue[];
}

export const generateFixPrompt = (issues: ValidationIssue[]): string => {
    let prompt = "我运行了验证器，发现了以下问题。请根据错误类型进行修复：";
    const types = new Set(issues.map(i => i.type));

    if (types.has(ValidationErrorType.CONTRACT_GAP)) prompt += "\n- 合同缺失: 请参考已有的 outcome，使用插值法补全缺失档位。";
    if (types.has(ValidationErrorType.BROKEN_LINK)) prompt += "\n- 引用错误: 请检查 makeItem 或 MAIL_DATA，修正 ID 拼写错误。";
    if (types.has(ValidationErrorType.DEAD_END)) prompt += "\n- 剧情断层: 请检查 SET_STAGE 的目标值。";
    if (types.has(ValidationErrorType.LOGIC_CONFLICT)) prompt += "\n- 逻辑矛盾: 请检查数值设定或前提条件。";

    const simplifiedReport = issues.map(i => ({ type: i.type, eventId: i.eventId, message: i.message, context: i.context }));
    prompt += "\n\n详细错误日志:\n" + JSON.stringify(simplifiedReport, null, 2);
    return prompt;
};

export const validateEvents = (events: StoryEvent[]): ValidationResult => {
    const logs: string[] = [];
    const issues: ValidationIssue[] = [];
    const error = (msg: string) => logs.push(`❌ ${msg}`);
    const warn = (msg: string) => logs.push(`⚠️ ${msg}`);

    const createdItemIds = new Set<string>();
    const stageListeners = new Map<string, Set<number>>();

    events.forEach(e => {
        if (e.item?.id) createdItemIds.add(e.item.id);
        e.triggerConditions.forEach(cond => {
            if (cond.variable === 'stage' && cond.operator === '==') {
                if (!stageListeners.has(e.chainId)) stageListeners.set(e.chainId, new Set());
                stageListeners.get(e.chainId)?.add(cond.value);
            }
        });
    });

    events.forEach(e => {
        const prefix = `[${e.id}]`;
        if (e.outcomes && Object.keys(e.outcomes).length > 0) {
            const requiredOutcomes = ['deal_charity', 'deal_aid', 'deal_standard', 'deal_shark'];
            const existingKeys = Object.keys(e.outcomes);
            const missing = requiredOutcomes.filter(k => !e.outcomes![k]);
            if (missing.length > 0) {
                const msg = `${prefix} Missing outcomes: ${missing.join(', ')}`;
                error(msg);
                issues.push({ type: ValidationErrorType.CONTRACT_GAP, eventId: e.id, message: msg, context: { missing_keys: missing, reference_outcomes: existingKeys } });
            }
        }

        const scanEffects = (effects: ChainUpdateEffect[], sourceContext: string) => {
            effects.forEach(effect => {
                if (effect.type === 'SET_STAGE' && effect.value !== undefined) {
                    const targetStage = effect.value;
                    const listeners = stageListeners.get(e.chainId);
                    if (!listeners || !listeners.has(targetStage)) {
                        const msg = `${prefix} ${sourceContext} sets Stage to ${targetStage}, but no event triggers on Stage == ${targetStage}.`;
                        warn(msg + " (Possible Dead End)");
                        issues.push({ type: ValidationErrorType.DEAD_END, eventId: e.id, message: msg, context: { target_stage: targetStage, chain_id: e.chainId } });
                    }
                }
                if (effect.type === 'SCHEDULE_MAIL' && effect.templateId) {
                    if (!MAIL_TEMPLATES[effect.templateId]) {
                        const msg = `${prefix} ${sourceContext} schedules unknown mail ID: '${effect.templateId}'`;
                        error(msg);
                        issues.push({ type: ValidationErrorType.BROKEN_LINK, eventId: e.id, message: msg, context: { resource_type: 'MAIL', missing_id: effect.templateId } });
                    }
                }
            });
        };

        if (e.outcomes) Object.entries(e.outcomes).forEach(([key, effects]) => scanEffects(effects, `Outcome '${key}'`));
        if (e.onReject) scanEffects(e.onReject, "OnReject");
        if (e.onComplete) scanEffects(e.onComplete, "OnComplete");
        if (e.dynamicFlows) Object.entries(e.dynamicFlows).forEach(([key, flow]) => scanEffects(flow.outcome, `DynamicFlow '${key}'`));

        if (e.type === 'REDEMPTION_CHECK') {
            if (!e.targetItemId) {
                const msg = `${prefix} is REDEMPTION_CHECK but missing 'targetItemId'.`;
                error(msg);
                issues.push({ type: ValidationErrorType.LOGIC_CONFLICT, eventId: e.id, message: msg, context: { field: 'targetItemId' } });
            } else if (!createdItemIds.has(e.targetItemId)) {
                const msg = `${prefix} targets item '${e.targetItemId}', which is never created in previous events.`;
                error(msg);
                issues.push({ type: ValidationErrorType.BROKEN_LINK, eventId: e.id, message: msg, context: { resource_type: 'ITEM', missing_id: e.targetItemId } });
            }
        }
    });

    return { logs, issues };
};
