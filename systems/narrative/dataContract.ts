/**
 * Data Consumption & Supply Contract (数据消费与供给契约)
 *
 * Declares all cross-system data interfaces for the event chain system.
 * Source: design doc v1.6 section 2.L
 *
 * The event chain system is the core manager of NPC lifecycle and fate.
 * It both consumes data from other systems and supplies data to downstream consumers.
 */

import type { InformationChannel } from './channelProtocol';

// ============================================================================
// Contract Types
// ============================================================================

/** How critical the data dependency is */
export type DataNecessity = 'REQUIRED' | 'ENHANCED' | 'OPTIONAL';

/** How frequently the data is consumed/supplied */
export type DataFrequency = 'REALTIME' | 'DAILY' | 'ON_TRIGGER';

/** Data supply declaration -- what event chain provides to other systems */
export interface DataSupplyContract {
    /** Unique identifier for this supply entry */
    id: string;
    /** Data field path (e.g. 'behaviorTags', 'chainState.variables.hope') */
    dataPath: string;
    /** Data type description */
    dataType: string;
    /** Which systems consume this data */
    consumers: string[];
    /** How critical this data is for consumers */
    necessity: DataNecessity;
    /** Purpose description */
    purpose: string;
    /** Fallback behavior when data is missing */
    fallback: string;
    /** Which information channel carries this data (if applicable) */
    channel?: InformationChannel;
}

/** Data consumption declaration -- what event chain needs from other systems */
export interface DataConsumptionContract {
    /** Unique identifier for this consumption entry */
    id: string;
    /** Source system name */
    sourceSystem: string;
    /** Data field path */
    dataPath: string;
    /** Data type description */
    dataType: string;
    /** How critical this data is */
    necessity: DataNecessity;
    /** How often the data is consumed */
    frequency: DataFrequency;
    /** Purpose description */
    purpose: string;
    /** Fallback behavior when source is unavailable */
    fallback: string;
}

// ============================================================================
// Supply Contracts (L.1 -- event chain provides to other systems)
// ============================================================================

export const DATA_SUPPLY_CONTRACTS: DataSupplyContract[] = [
    // --- REQUIRED level ---
    {
        id: 'supply-behavior-tags',
        dataPath: 'behaviorTags',
        dataType: 'BehaviorTag[]',
        consumers: ['negotiation', 'insight'],
        necessity: 'REQUIRED',
        purpose: 'Negotiation floor/patience modifiers; Insight psychological tendency mapping',
        fallback: "Default to ['NAIVE'] (mildest behavior pattern)",
    },

    // --- ENHANCED level ---
    {
        id: 'supply-hope',
        dataPath: 'chainState.variables.hope',
        dataType: 'number (0-100)',
        consumers: ['insight'],
        necessity: 'ENHANCED',
        purpose: 'Moral information layer emotional depth',
        fallback: 'Insight moral layer degrades to shallow info based on pawnReason only',
    },
    {
        id: 'supply-funds',
        dataPath: 'chainState.variables.funds',
        dataType: 'number',
        consumers: ['insight'],
        necessity: 'ENHANCED',
        purpose: 'Moral information layer urgency perception',
        fallback: 'Insight moral layer degrades to shallow info based on pawnReason only',
    },
    {
        id: 'supply-chain-variables',
        dataPath: 'chainState.variables.*',
        dataType: 'mixed',
        consumers: ['fateForeshadowing', 'retrospective'],
        necessity: 'ENHANCED',
        purpose: 'Dialogue hints and retrospective narrative',
        fallback: 'Use generic dialogue templates',
    },
    {
        id: 'supply-pawn-reason',
        dataPath: 'dialogue.pawnReason',
        dataType: 'string',
        consumers: ['insight'],
        necessity: 'ENHANCED',
        purpose: 'Moral information layer pawn reason display',
        fallback: 'Insight third layer not displayed; UI naturally collapses',
    },

    // --- OPTIONAL level ---
    {
        id: 'supply-behavior-tag-overrides',
        dataPath: 'storyEvent.behaviorTagOverrides',
        dataType: 'BehaviorTagOverride[]',
        consumers: ['negotiation'],
        necessity: 'OPTIONAL',
        purpose: 'Story customer stage-specific tag changes',
        fallback: 'Use base behaviorTags',
    },
    {
        id: 'supply-redemption-resolve',
        dataPath: 'redemptionResolve',
        dataType: "'Strong' | 'Medium' | 'Weak' | 'None'",
        consumers: ['insight'],
        necessity: 'OPTIONAL',
        purpose: 'Redemption intent judgement (insight: 洞若观火)',
        fallback: "Display 'Medium' (uncertain)",
    },
];

// ============================================================================
// Consumption Contracts (L.2 -- event chain needs from other systems)
// ============================================================================

export const DATA_CONSUMPTION_CONTRACTS: DataConsumptionContract[] = [
    // --- REQUIRED ---
    {
        id: 'consume-pawn-amount',
        sourceSystem: 'negotiation',
        dataPath: 'pawnAmount',
        dataType: 'number',
        necessity: 'REQUIRED',
        frequency: 'ON_TRIGGER',
        purpose: 'Calculate NPC Funds increment',
        fallback: 'Cannot fallback -- core input',
    },
    {
        id: 'consume-contract-rate',
        sourceSystem: 'negotiation',
        dataPath: 'contractRate',
        dataType: 'number',
        necessity: 'REQUIRED',
        frequency: 'ON_TRIGGER',
        purpose: 'Map to Hope/JobChance variable modifiers',
        fallback: 'Cannot fallback -- core input',
    },

    // --- OPTIONAL ---
    {
        id: 'consume-mail-delivered',
        sourceSystem: 'mail',
        dataPath: 'MAIL_DELIVERED',
        dataType: 'event',
        necessity: 'OPTIONAL',
        frequency: 'ON_TRIGGER',
        purpose: 'Trigger external chains (e.g. gang threat, see K.1)',
        fallback: 'Corresponding chain not triggered',
    },
    {
        id: 'consume-news-verification',
        sourceSystem: 'news',
        dataPath: 'NEWS_VERIFICATION',
        dataType: 'event',
        necessity: 'OPTIONAL',
        frequency: 'ON_TRIGGER',
        purpose: 'Trigger reputation penalty TRANSIENT chains (see K.2)',
        fallback: 'Penalty chain not triggered',
    },
    {
        id: 'consume-item-action',
        sourceSystem: 'inventory',
        dataPath: 'ITEM_ACTION',
        dataType: 'event',
        necessity: 'OPTIONAL',
        frequency: 'ON_TRIGGER',
        purpose: 'Branch trigger within event chains',
        fallback: 'Wait for alternative trigger (e.g. DEADLINE)',
    },
    {
        id: 'consume-deadline-reached',
        sourceSystem: 'calendar',
        dataPath: 'DEADLINE_REACHED',
        dataType: 'event',
        necessity: 'OPTIONAL',
        frequency: 'ON_TRIGGER',
        purpose: 'Event chain stage progression',
        fallback: 'Use Daily Tick counter as substitute',
    },
];

// ============================================================================
// Narrative Degradation Levels (L.1 consumer-side)
// ============================================================================

/** Four-level narrative degradation for insight moral layer */
export interface NarrativeDegradationLevel {
    level: number;
    label: string;
    requiredData: string[];
    exampleOutput: string;
    narrativeDepth: string;
}

export const NARRATIVE_DEGRADATION_LEVELS: NarrativeDegradationLevel[] = [
    {
        level: 1,
        label: 'Full',
        requiredData: ['pawnReason', 'hope', 'funds'],
        exampleOutput: '她提到女儿生病了。看她的样子，她已经快撑不住了。',
        narrativeDepth: 'Deepest -- full moral dilemma',
    },
    {
        level: 2,
        label: 'Partial',
        requiredData: ['pawnReason'],
        exampleOutput: '她提到女儿生病了。这笔钱可能是药费。',
        narrativeDepth: 'Medium -- background without status',
    },
    {
        level: 3,
        label: 'Minimal',
        requiredData: ['behaviorTags'],
        exampleOutput: '她很急。急到不在乎价格。至于为什么...你不知道。',
        narrativeDepth: 'Shallowest -- behavioral observation only',
    },
    {
        level: 4,
        label: 'None',
        requiredData: [],
        exampleOutput: '',
        narrativeDepth: 'Not displayed -- UI naturally collapses',
    },
];
