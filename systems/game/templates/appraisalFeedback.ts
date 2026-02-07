/**
 * Appraisal Feedback Templates
 *
 * Standard text templates for appraisal-related inner monologues.
 * These appear in the chat panel during negotiation phase.
 */

export const APPRAISAL_TEMPLATES = {
    /** When appraisal roll results in mishap (range expands) */
    MISHAP: "糟糕...好像搞错了什么，判断受到干扰。",

    /** When range narrowed but no trait discovered */
    RANGE_NARROWED: "虽然没发现什么特别的，但心里更有底了。",

    /** When impatient event triggers extra patience cost */
    IMPATIENT: "动作太慢了，客户开始坐立不安...",

    /** When all traits already discovered */
    ALREADY_KNOWN: "这东西我已经看得很透彻了。",

    /** When breakthrough event triggers (d100 roll 1-10, ×0.60 uncertainty) */
    BREAKTHROUGH: "灵光一闪！突然看懂了关键细节，估值范围大幅收窄。",
} as const;

export type AppraisalTemplateKey = keyof typeof APPRAISAL_TEMPLATES;

/**
 * Get appraisal feedback text by key
 */
export function getAppraisalFeedbackText(key: AppraisalTemplateKey): string {
    return APPRAISAL_TEMPLATES[key];
}
