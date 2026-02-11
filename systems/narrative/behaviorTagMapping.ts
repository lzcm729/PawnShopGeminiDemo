
import { BehaviorTag } from '../core/types';
import { Disposition } from '../customerInsight/types';

/**
 * Push-pull style -- canonical taxonomy from design doc 3.2B
 *
 * Maps to existing NpcPushPullStyle in negotiation/pushPull.ts:
 *   PASSIVE  -> SOFT / CALM (yielding)
 *   BALANCED -> CALM        (neutral)
 *   AGGRESSIVE -> HARD / SLY (resistant)
 */
export type PushPullStyle = 'AGGRESSIVE' | 'BALANCED' | 'PASSIVE';

/**
 * Design-canonical psychological tendency from design doc 3.2B
 *
 * NOTE: The design doc defines 5 distinct tendencies (desperate, firm,
 * guarded, shrewd, sincere) while the current Disposition type has 4
 * (desperate, firm, bluffing, sincere). The `designTendency` field
 * captures the canonical value; `disposition` maps to the existing type.
 *
 * Future work: align Disposition type with design doc tendencies.
 */
export type DesignTendency =
    | 'desperate'  // DESPERATE: urgent need
    | 'firm'       // STUBBORN: won't budge
    | 'guarded'    // SUSPICIOUS: defensive, wary
    | 'sincere'    // NAIVE / SENTIMENTAL: what you see is what you get
    | 'shrewd';    // SAVVY: knows the market, strategically priced

/** BehaviorTag three-way mapping entry */
export interface BehaviorTagMapping {
    tag: BehaviorTag;
    pushPullStyle: PushPullStyle;
    disposition: Disposition;
    designTendency: DesignTendency;
}

/**
 * BehaviorTag tripartite mapping table (design doc 3.2B)
 *
 * Each BehaviorTag deterministically maps to:
 * 1. A push-pull negotiation style (how the NPC bargains)
 * 2. A psychological disposition (what insight reveals)
 *
 * Deterministic principle: no probabilistic shifts in mapping.
 * Narrative ambiguity comes from flavor text, not mapping variance.
 *
 * Multi-tag conflict resolution (push-pull style only):
 *   Priority: urgency group (DESPERATE/STUBBORN) > ability group (NAIVE/SAVVY) > emotion group (SENTIMENTAL/SUSPICIOUS)
 *   - yielding + resistant: urgency group wins
 *   - yielding + neutral: yielding wins
 *   - resistant + neutral: resistant wins
 */
export const BEHAVIOR_TAG_MAPPINGS: BehaviorTagMapping[] = [
    // Urgency group (highest priority for push-pull conflict resolution)
    {
        tag: 'DESPERATE',
        pushPullStyle: 'PASSIVE',
        disposition: 'desperate',
        designTendency: 'desperate',
    },
    {
        tag: 'STUBBORN',
        pushPullStyle: 'AGGRESSIVE',
        disposition: 'firm',
        designTendency: 'firm',
    },

    // Ability group (medium priority)
    {
        tag: 'NAIVE',
        pushPullStyle: 'PASSIVE',
        disposition: 'sincere',
        designTendency: 'sincere',
    },
    {
        tag: 'SAVVY',
        pushPullStyle: 'AGGRESSIVE',
        disposition: 'bluffing',       // Design doc: 'shrewd'; current Disposition lacks this value
        designTendency: 'shrewd',
    },

    // Emotion group (lowest priority)
    {
        tag: 'SUSPICIOUS',
        pushPullStyle: 'AGGRESSIVE',
        disposition: 'bluffing',       // Design doc: 'guarded'; current Disposition lacks this value
        designTendency: 'guarded',
    },
    {
        tag: 'SENTIMENTAL',
        pushPullStyle: 'BALANCED',
        disposition: 'sincere',
        designTendency: 'sincere',
    },
];

/**
 * Priority groups for push-pull style conflict resolution
 * When an NPC has multiple tags pointing to different styles,
 * higher-priority groups override lower ones.
 */
export const PUSH_PULL_PRIORITY_GROUPS: { priority: number; tags: BehaviorTag[] }[] = [
    { priority: 1, tags: ['DESPERATE', 'STUBBORN'] },     // Urgency group
    { priority: 2, tags: ['NAIVE', 'SAVVY'] },             // Ability group
    { priority: 3, tags: ['SUSPICIOUS', 'SENTIMENTAL'] },  // Emotion group
];

/**
 * Resolve push-pull style from multiple BehaviorTags
 * Follows the multi-tag conflict resolution rules from design doc 3.2B.
 */
export function resolvePushPullStyle(tags: BehaviorTag[]): PushPullStyle {
    if (tags.length === 0) return 'BALANCED';

    const mappingByTag = new Map(BEHAVIOR_TAG_MAPPINGS.map(m => [m.tag, m]));

    // Walk priority groups from highest to lowest
    for (const group of PUSH_PULL_PRIORITY_GROUPS) {
        const matchingTags = tags.filter(t => group.tags.includes(t));
        if (matchingTags.length > 0) {
            // Within the same group, if there's a conflict (yielding vs resistant),
            // the urgency tag (DESPERATE) wins per design doc
            const styles = matchingTags.map(t => mappingByTag.get(t)!.pushPullStyle);
            if (styles.includes('PASSIVE') && styles.includes('AGGRESSIVE')) {
                // Conflict within group: DESPERATE (PASSIVE) overrides STUBBORN (AGGRESSIVE)
                // per "urgency group priority" rule
                return 'PASSIVE';
            }
            return styles[0];
        }
    }

    return 'BALANCED';
}

// ============================================================================
// BehaviorTag Mutual Exclusivity Validation (#24)
// ============================================================================

/**
 * Mutually exclusive BehaviorTag pairs.
 * These tags should not coexist on the same NPC/event because they represent
 * contradictory behavioral dispositions.
 */
const EXCLUSIVE_PAIRS: [BehaviorTag, BehaviorTag][] = [
    ['NAIVE', 'SAVVY'],         // Cannot be both market-naive and market-savvy
    ['DESPERATE', 'STUBBORN'],  // Urgent need contradicts refusal to budge
];

/**
 * Validation result for a single BehaviorTag conflict.
 */
export interface BehaviorTagConflict {
    tag1: BehaviorTag;
    tag2: BehaviorTag;
    reason: string;
}

/**
 * Validate BehaviorTag combinations for mutual exclusivity.
 * Returns an array of conflicts found. Empty array means valid.
 *
 * Usage:
 *   const conflicts = validateBehaviorTags(customer.behaviorTags);
 *   if (conflicts.length > 0) { /* log warnings * / }
 */
export function validateBehaviorTags(tags: BehaviorTag[]): BehaviorTagConflict[] {
    if (tags.length <= 1) return [];

    const tagSet = new Set(tags);
    const conflicts: BehaviorTagConflict[] = [];

    for (const [tag1, tag2] of EXCLUSIVE_PAIRS) {
        if (tagSet.has(tag1) && tagSet.has(tag2)) {
            conflicts.push({
                tag1,
                tag2,
                reason: `${tag1} and ${tag2} are mutually exclusive`,
            });
        }
    }

    return conflicts;
}

/**
 * Sanitize BehaviorTag array by removing conflicting tags.
 * When a conflict is detected, the first tag in the pair (higher priority) is kept.
 * Logs a warning for each removed tag.
 *
 * @param tags Input BehaviorTag array (may contain conflicts)
 * @returns Sanitized array with conflicts resolved
 */
export function sanitizeBehaviorTags(tags: BehaviorTag[]): BehaviorTag[] {
    if (tags.length <= 1) return tags;

    const result = [...tags];
    const toRemove = new Set<BehaviorTag>();

    for (const [tag1, tag2] of EXCLUSIVE_PAIRS) {
        const has1 = result.includes(tag1);
        const has2 = result.includes(tag2);
        if (has1 && has2) {
            // Keep tag1 (first in pair = higher priority), remove tag2
            toRemove.add(tag2);
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[BehaviorTag] Conflict: ${tag1} + ${tag2} on same NPC. Removing ${tag2}.`);
            }
        }
    }

    return result.filter(t => !toRemove.has(t));
}
