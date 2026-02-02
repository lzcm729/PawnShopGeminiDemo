
import { EventChainState, StoryEvent, MailTemplate } from '../../types';
import { EMMA_CHAIN_INIT, EMMA_EVENTS } from './stories/emma';
import { SUSAN_CHAIN_INIT, SUSAN_EVENTS } from './stories/susan';
import { ZHAO_CHAIN_INIT, ZHAO_EVENTS } from './stories/zhao';
import { LIN_CHAIN_INIT, LIN_EVENTS } from './stories/lin';
import { parseStoryContent, LoadedStory } from './dsl/loader';

// Export individual inits so they can be selected in GAME_CONFIG
export { EMMA_CHAIN_INIT, SUSAN_CHAIN_INIT, ZHAO_CHAIN_INIT, LIN_CHAIN_INIT };

export { EMMA_EVENTS, SUSAN_EVENTS, ZHAO_EVENTS, LIN_EVENTS };

// Legacy export (kept for compatibility, though GameContext now uses Config)
export const INITIAL_CHAINS: EventChainState[] = [
    EMMA_CHAIN_INIT,
    SUSAN_CHAIN_INIT,
    ZHAO_CHAIN_INIT,
    LIN_CHAIN_INIT
];

export const ALL_STORY_EVENTS: StoryEvent[] = [
    ...EMMA_EVENTS,
    ...SUSAN_EVENTS,
    ...ZHAO_EVENTS,
    ...LIN_EVENTS
];

// === DSL SUPPORT ===

/**
 * Registry of loaded DSL stories
 */
const dslStories = new Map<string, LoadedStory>();

/**
 * Load a DSL story from content string
 */
export function loadDSLStory(content: string, filename?: string): LoadedStory {
    const story = parseStoryContent(content, filename);
    dslStories.set(story.storyId, story);
    return story;
}

/**
 * Get a loaded DSL story by ID
 */
export function getDSLStory(storyId: string): LoadedStory | undefined {
    return dslStories.get(storyId);
}

/**
 * Get all loaded DSL stories
 */
export function getAllDSLStories(): LoadedStory[] {
    return Array.from(dslStories.values());
}

/**
 * Get all chains (TypeScript + DSL)
 */
export function getAllChains(): EventChainState[] {
    const dslChains = getAllDSLStories().flatMap(s => s.chains);
    return [...INITIAL_CHAINS, ...dslChains];
}

/**
 * Get all events (TypeScript + DSL)
 */
export function getAllEvents(): StoryEvent[] {
    const dslEvents = getAllDSLStories().flatMap(s => s.events);
    return [...ALL_STORY_EVENTS, ...dslEvents];
}

/**
 * Get all mails from DSL stories
 */
export function getDSLMails(): Record<string, MailTemplate> {
    const result: Record<string, MailTemplate> = {};
    for (const story of getAllDSLStories()) {
        Object.assign(result, story.mails);
    }
    return result;
}

/**
 * Clear all loaded DSL stories
 */
export function clearDSLStories(): void {
    dslStories.clear();
}
