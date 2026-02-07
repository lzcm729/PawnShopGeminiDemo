/**
 * Consequence Dispatcher (S4-F3, S4-F4)
 *
 * Distributes event chain consequences to the appropriate information channels
 * (news, mail, retrospective, item log) according to the channel allocation matrix
 * and timing rules defined in the channel protocol.
 *
 * Design doc: 动态事件链系统 v1.5 - 2.J (Information Channel Protocol)
 */

import type { EventChainState, SimLogEntry } from './types';
import {
    CHANNEL_ALLOCATION_MATRIX,
    type ConsequenceDispatchRequest,
    type ConsequenceSeverity,
    type InformationChannel,
} from './channelProtocol';

// ========== S4-F3: Consequence Dispatcher ==========

/** Actions produced by the dispatcher for the game engine to execute */
export interface DispatchAction {
    channel: InformationChannel;
    action: DispatchActionPayload;
}

export type DispatchActionPayload =
    | { type: 'SCHEDULE_NEWS'; newsHint: string; sourceChainId: string; delayDays: number }
    | { type: 'SCHEDULE_MAIL'; templateId: string; sourceChainId: string; delayDays: number; relatedEventId: string }
    | { type: 'MARK_RETROSPECTIVE'; npcId: string; content: string; sourceChainId: string }
    | { type: 'APPEND_ITEM_LOG'; itemId: string; entry: string; sourceChainId: string };

/** Tracks what channels have been activated for a given event on a given day */
export interface ChannelActivationRecord {
    sourceChainId: string;
    eventId: string;
    day: number;
    activatedChannels: InformationChannel[];
}

/**
 * S4-F4: Channel timing state — tracks what has been dispatched today
 * to enforce timing rules (same event not in news+mail same day, etc.)
 */
export interface ChannelTimingState {
    /** Records of channel activations for the current day */
    todayActivations: ChannelActivationRecord[];
    /** Mails already scheduled from previous dispatches (for dedup) */
    scheduledMailEventIds: Set<string>;
    /** News already scheduled from previous dispatches (for dedup) */
    scheduledNewsEventIds: Set<string>;
}

/**
 * Create a fresh timing state for a new day.
 */
export function createChannelTimingState(): ChannelTimingState {
    return {
        todayActivations: [],
        scheduledMailEventIds: new Set(),
        scheduledNewsEventIds: new Set(),
    };
}

// ========== S4-F4: Timing Rule Enforcement ==========

/**
 * Check if a channel can be activated for an event on the current day,
 * respecting the timing rules from the channel protocol.
 *
 * Rules:
 * 1. NEWS_BEFORE_MAIL: Same event cannot have news and mail on the same day.
 *    If news is dispatched today, mail must be delayed by at least 1 day.
 * 2. MAX_TWO_CHANNELS_PER_DAY: Same event can activate at most 2 channels per day.
 * 3. MAIL_NO_DUPLICATE_RETRO: Not enforced here (handled by content authoring).
 * 4. MINOR_NO_NEWS: Minor consequences skip the news channel.
 */
function canActivateChannel(
    channel: InformationChannel,
    eventId: string,
    severity: ConsequenceSeverity,
    timing: ChannelTimingState
): { allowed: boolean; delayDays: number } {
    const eventActivations = timing.todayActivations.find(
        a => a.eventId === eventId
    );

    // Rule 4: MINOR severity never goes to NEWS
    if (channel === 'NEWS' && severity === 'MINOR') {
        return { allowed: false, delayDays: 0 };
    }

    // Rule 2: MAX_TWO_CHANNELS_PER_DAY
    if (eventActivations && eventActivations.activatedChannels.length >= 2) {
        // Already 2 channels active today for this event — delay to tomorrow
        return { allowed: false, delayDays: 1 };
    }

    // Rule 1: NEWS_BEFORE_MAIL
    if (channel === 'MAIL' && eventActivations) {
        const hasNewsToday = eventActivations.activatedChannels.includes('NEWS');
        if (hasNewsToday) {
            // News already dispatched today for this event — delay mail by 1 day
            return { allowed: false, delayDays: 1 };
        }
    }

    // Check if this specific channel was already activated for this event today
    if (eventActivations?.activatedChannels.includes(channel)) {
        return { allowed: false, delayDays: 0 }; // Already dispatched, skip
    }

    return { allowed: true, delayDays: 0 };
}

/**
 * Record that a channel was activated for an event.
 */
function recordActivation(
    timing: ChannelTimingState,
    eventId: string,
    sourceChainId: string,
    day: number,
    channel: InformationChannel
): void {
    const existing = timing.todayActivations.find(a => a.eventId === eventId);
    if (existing) {
        if (!existing.activatedChannels.includes(channel)) {
            existing.activatedChannels.push(channel);
        }
    } else {
        timing.todayActivations.push({
            sourceChainId,
            eventId,
            day,
            activatedChannels: [channel],
        });
    }
}

// ========== S4-F3: Main Dispatch Logic ==========

/**
 * Dispatch a consequence to the appropriate channels.
 *
 * This function:
 * 1. Looks up the severity in CHANNEL_ALLOCATION_MATRIX
 * 2. Tries to activate primary channels first, then secondary
 * 3. Enforces timing rules (S4-F4)
 * 4. Returns a list of actions for the game engine to execute
 */
export function dispatchConsequence(
    request: ConsequenceDispatchRequest,
    timing: ChannelTimingState,
    currentDay: number
): DispatchAction[] {
    const actions: DispatchAction[] = [];

    // Find the allocation rule for this severity
    const allocation = CHANNEL_ALLOCATION_MATRIX.find(
        a => a.severity === request.severity
    );
    if (!allocation) return actions;

    // Process primary channels
    for (const channel of allocation.primaryChannels) {
        const action = tryDispatchToChannel(
            channel, request, timing, currentDay, false
        );
        if (action) actions.push(action);
    }

    // Process secondary channels
    for (const channel of allocation.secondaryChannels) {
        const action = tryDispatchToChannel(
            channel, request, timing, currentDay, true
        );
        if (action) actions.push(action);
    }

    return actions;
}

/**
 * Try to dispatch a consequence to a specific channel.
 * Returns null if the channel cannot be activated (timing rules, missing data, etc.)
 */
function tryDispatchToChannel(
    channel: InformationChannel,
    request: ConsequenceDispatchRequest,
    timing: ChannelTimingState,
    currentDay: number,
    isSecondary: boolean
): DispatchAction | null {
    // Check timing rules
    const { allowed, delayDays } = canActivateChannel(
        channel, request.eventId, request.severity, timing
    );

    switch (channel) {
        case 'NEWS': {
            if (!request.newsHint) return null;
            if (!allowed && delayDays === 0) return null; // Skip (not delay)

            // Record activation (even if delayed, we mark intent)
            recordActivation(timing, request.eventId, request.sourceChainId, currentDay, 'NEWS');

            return {
                channel: 'NEWS',
                action: {
                    type: 'SCHEDULE_NEWS',
                    newsHint: request.newsHint,
                    sourceChainId: request.sourceChainId,
                    delayDays: Math.max(delayDays, 0),
                },
            };
        }

        case 'MAIL': {
            if (!request.mailTemplateId) return null;
            if (!allowed && delayDays === 0) return null; // Skip (not delay)

            // For SEVERE/EXTREME, mail must come after news (at least 1 day delay)
            let mailDelay = Math.max(delayDays, 0);
            if (request.severity === 'SEVERE' || request.severity === 'EXTREME') {
                // Check if news was just dispatched — enforce minimum 1 day gap
                const newsActivation = timing.todayActivations.find(
                    a => a.eventId === request.eventId && a.activatedChannels.includes('NEWS')
                );
                if (newsActivation) {
                    mailDelay = Math.max(mailDelay, 1);
                }
            }

            recordActivation(timing, request.eventId, request.sourceChainId, currentDay, 'MAIL');

            return {
                channel: 'MAIL',
                action: {
                    type: 'SCHEDULE_MAIL',
                    templateId: request.mailTemplateId,
                    sourceChainId: request.sourceChainId,
                    delayDays: mailDelay,
                    relatedEventId: request.eventId,
                },
            };
        }

        case 'RETROSPECTIVE': {
            if (!request.retroContent || !request.npcId) return null;

            recordActivation(timing, request.eventId, request.sourceChainId, currentDay, 'RETROSPECTIVE');

            return {
                channel: 'RETROSPECTIVE',
                action: {
                    type: 'MARK_RETROSPECTIVE',
                    npcId: request.npcId,
                    content: request.retroContent,
                    sourceChainId: request.sourceChainId,
                },
            };
        }

        case 'ITEM_LOG': {
            if (!request.itemLogEntry || !request.relatedItemId) return null;

            // ITEM_LOG is independent of timing rules (J.3: "库存日志独立于时序")
            recordActivation(timing, request.eventId, request.sourceChainId, currentDay, 'ITEM_LOG');

            return {
                channel: 'ITEM_LOG',
                action: {
                    type: 'APPEND_ITEM_LOG',
                    itemId: request.relatedItemId,
                    entry: request.itemLogEntry,
                    sourceChainId: request.sourceChainId,
                },
            };
        }

        default:
            return null;
    }
}

// ========== S4-F3: SimRules Consequence Detection ==========

/**
 * Compare chain states before and after daily simulation to detect consequences
 * that should be dispatched through the channel protocol.
 *
 * This is called after runDailySimulation() to identify significant changes.
 */
export function detectSimConsequences(
    chainsBefore: EventChainState[],
    chainsAfter: EventChainState[],
    currentDay: number
): ConsequenceDispatchRequest[] {
    const consequences: ConsequenceDispatchRequest[] = [];

    for (const after of chainsAfter) {
        if (!after.isActive && after.chainType === 'TRANSIENT') continue; // Skip deactivated transients

        const before = chainsBefore.find(c => c.id === after.id);
        if (!before) continue;

        // Check simulation log for new entries (entries added during this tick)
        const newLogs = after.simulationLog?.filter(
            log => !before.simulationLog?.some(
                bl => bl.content === log.content && bl.type === log.type
            )
        ) || [];

        // Classify new log entries by severity
        for (const log of newLogs) {
            const severity = classifyLogSeverity(log, before, after);
            if (severity === 'MINOR' && !hasItemContext(after)) continue; // MINOR without item context is just a hint

            consequences.push({
                sourceChainId: after.id,
                eventId: `sim_${after.id}_day${currentDay}_${log.type}`,
                severity,
                dayGenerated: currentDay,
                npcId: after.npcName !== 'System' ? after.npcName : undefined,
                relatedItemId: after.variables.targetItemId
                    ? String(after.variables.targetItemId)
                    : undefined,
                newsHint: severity !== 'MINOR' ? generateNewsHint(log, after) : undefined,
                itemLogEntry: after.variables.targetItemId
                    ? generateItemLogEntry(log, after)
                    : undefined,
            });
        }

        // Check for chain deactivation (potential terminal event)
        if (before.isActive && !after.isActive) {
            const chainEndSeverity: ConsequenceSeverity = after.chainType === 'NARRATIVE' ? 'EXTREME' : 'MODERATE';
            consequences.push({
                sourceChainId: after.id,
                eventId: `chain_end_${after.id}_day${currentDay}`,
                severity: chainEndSeverity,
                dayGenerated: currentDay,
                npcId: after.npcName !== 'System' ? after.npcName : undefined,
                relatedItemId: after.variables.targetItemId
                    ? String(after.variables.targetItemId)
                    : undefined,
                newsHint: `Local events reach a conclusion for a community member`,
                itemLogEntry: after.variables.targetItemId
                    ? `The story of this item's owner has reached its end`
                    : undefined,
            });
        }
    }

    return consequences;
}

// ========== Helper Functions ==========

function classifyLogSeverity(
    log: SimLogEntry,
    _before: EventChainState,
    _after: EventChainState
): ConsequenceSeverity {
    switch (log.type) {
        case 'CRISIS':
            return 'SEVERE';
        case 'MILESTONE':
            return 'MODERATE';
        case 'DAILY':
        default:
            return 'MINOR';
    }
}

function hasItemContext(chain: EventChainState): boolean {
    return chain.variables.targetItemId !== undefined;
}

function generateNewsHint(log: SimLogEntry, chain: EventChainState): string {
    // Generate a vague, non-specific news hint based on the log type
    if (log.type === 'CRISIS') {
        return `Concerning developments reported in the local community`;
    }
    if (log.type === 'MILESTONE') {
        return `A turning point for a local resident`;
    }
    return `Minor developments in the neighborhood`;
}

function generateItemLogEntry(log: SimLogEntry, chain: EventChainState): string {
    // Generate an item log entry tied to the chain's narrative
    if (log.type === 'CRISIS') {
        return `Owner's situation has taken a critical turn: ${log.content}`;
    }
    if (log.type === 'MILESTONE') {
        return `Owner update: ${log.content}`;
    }
    return log.content;
}
