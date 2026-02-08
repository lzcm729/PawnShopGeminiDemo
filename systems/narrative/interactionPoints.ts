/**
 * Cross-system Interaction Points Mapping Table (6交互点映射表)
 *
 * Defines 6 interaction timing points where Insight, Character Ability,
 * and Negotiation systems intersect. Each point describes when and how
 * these three systems can stack their effects.
 *
 * This is a DECLARATIVE mapping table -- actual logic lives in each system.
 * This file serves as a cross-system contract ensuring consistent behavior.
 */

/** Which game phase/moment the interaction occurs */
export type InteractionTiming =
    | 'PRE_NEGOTIATION'      // Before negotiation starts (customer just arrived)
    | 'DURING_NEGOTIATION'   // Active negotiation phase
    | 'POST_OFFER'           // After player makes an offer
    | 'COUNTER_OFFER'        // When NPC counter-offers
    | 'PRE_DEPARTURE'        // Just before customer leaves
    | 'ON_DEAL_CLOSE';       // When deal is finalized

/** Which systems participate at this interaction point */
export interface SystemParticipation {
    insight: boolean;
    characterAbility: boolean;
    negotiation: boolean;
}

/** Effect stacking rule at an interaction point */
export type StackingRule = 'ADDITIVE' | 'MULTIPLICATIVE' | 'OVERRIDE' | 'INDEPENDENT';

/** Interaction point definition */
export interface InteractionPoint {
    /** Unique identifier */
    id: string;
    /** When this interaction occurs */
    timing: InteractionTiming;
    /** Human-readable label */
    label: string;
    /** Description of what happens at this point */
    description: string;
    /** Which systems are active */
    systems: SystemParticipation;
    /** How effects from different systems combine */
    stackingRule: StackingRule;
    /** Detailed stacking explanation */
    stackingDescription: string;
}

/**
 * 6 Interaction Points between Insight, Character Ability, and Negotiation
 *
 * These define the timing and stacking rules for cross-system effects.
 */
export const INTERACTION_POINTS: InteractionPoint[] = [
    {
        id: 'IP-1',
        timing: 'PRE_NEGOTIATION',
        label: '初见洞察',
        description: 'Player uses insight before making the first offer, gaining disposition and floor hints.',
        systems: { insight: true, characterAbility: false, negotiation: false },
        stackingRule: 'INDEPENDENT',
        stackingDescription: 'Insight reveals disposition and floor hint. No stacking -- insight is standalone at this point.',
    },
    {
        id: 'IP-2',
        timing: 'DURING_NEGOTIATION',
        label: '议价中洞察',
        description: 'Player uses insight during active negotiation to read NPC reaction to current offer.',
        systems: { insight: true, characterAbility: false, negotiation: true },
        stackingRule: 'ADDITIVE',
        stackingDescription: 'Insight info (disposition) + negotiation state (patience, mood) combine to give player fuller picture. Player uses insight info to adjust negotiation strategy.',
    },
    {
        id: 'IP-3',
        timing: 'DURING_NEGOTIATION',
        label: '能力加持议价',
        description: 'Character ability modifies negotiation parameters (e.g. patience bonus, floor shift).',
        systems: { insight: false, characterAbility: true, negotiation: true },
        stackingRule: 'ADDITIVE',
        stackingDescription: 'Character ability effects (patience modifier, floor adjustment) add to negotiation base values. Applied as numeric deltas.',
    },
    {
        id: 'IP-4',
        timing: 'DURING_NEGOTIATION',
        label: '三系统交汇',
        description: 'All three systems active: insight informs strategy, ability modifies parameters, negotiation executes.',
        systems: { insight: true, characterAbility: true, negotiation: true },
        stackingRule: 'ADDITIVE',
        stackingDescription: 'Insight provides information (no mechanical effect). Character ability provides mechanical modifiers. Negotiation applies modifiers to push-pull resolution. Information and mechanics stack additively.',
    },
    {
        id: 'IP-5',
        timing: 'POST_OFFER',
        label: '出价后反应',
        description: 'After player makes an offer, NPC reaction is influenced by BehaviorTag (from event chain) and character ability modifiers.',
        systems: { insight: false, characterAbility: true, negotiation: true },
        stackingRule: 'MULTIPLICATIVE',
        stackingDescription: 'NPC reaction = base reaction (from BehaviorTag push-pull style) x character ability modifier. Multiplicative stacking on acceptance probability.',
    },
    {
        id: 'IP-6',
        timing: 'ON_DEAL_CLOSE',
        label: '成交结算',
        description: 'Deal closes: negotiation records transaction, event chain receives pawn amount and contract rate, reputation system records behavior.',
        systems: { insight: false, characterAbility: false, negotiation: true },
        stackingRule: 'INDEPENDENT',
        stackingDescription: 'Negotiation finalizes deal. Results flow unidirectionally to event chain (data consumption) and reputation (behavior recording). No cross-system stacking at settlement.',
    },
];
