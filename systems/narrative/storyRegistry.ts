/**
 * Story Registry
 *
 * Loads all story chains and events from DSL .story files.
 * This is the single source of truth for narrative content.
 */

import { EventChainState, StoryEvent, MailTemplate } from '../../types';
import { parseStoryContent, LoadedStory } from './dsl/loader';

// Import raw .story files (Vite ?raw import)
import emmaStoryRaw from './stories-dsl/emma.story?raw';
import susanStoryRaw from './stories-dsl/susan.story?raw';
import zhaoStoryRaw from './stories-dsl/zhao.story?raw';
import linStoryRaw from './stories-dsl/lin.story?raw';

// === PARSE ALL STORIES AT MODULE LOAD ===

const emmaStory = parseStoryContent(emmaStoryRaw, 'emma.story');
const susanStory = parseStoryContent(susanStoryRaw, 'susan.story');
const zhaoStory = parseStoryContent(zhaoStoryRaw, 'zhao.story');
const linStory = parseStoryContent(linStoryRaw, 'lin.story');

// === EXPORTED CHAIN INITS (for GAME_CONFIG compatibility) ===

export const EMMA_CHAIN_INIT = emmaStory.chains[0];
export const SUSAN_CHAIN_INIT = susanStory.chains[0];
export const ZHAO_CHAIN_INIT = zhaoStory.chains[0];
export const LIN_CHAIN_INIT = linStory.chains[0];

// === EXPORTED EVENTS ===

export const EMMA_EVENTS = emmaStory.events;
export const SUSAN_EVENTS = susanStory.events;
export const ZHAO_EVENTS = zhaoStory.events;
export const LIN_EVENTS = linStory.events;

// === EXPORTED MAILS ===

export const EMMA_MAILS = emmaStory.mails;
export const SUSAN_MAILS = susanStory.mails;
export const ZHAO_MAILS = zhaoStory.mails;
export const LIN_MAILS = linStory.mails;

// === AGGREGATE EXPORTS ===

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

export const ALL_STORY_MAILS: Record<string, MailTemplate> = {
    ...EMMA_MAILS,
    ...SUSAN_MAILS,
    ...ZHAO_MAILS,
    ...LIN_MAILS
};

// === DSL SUPPORT (for dynamic loading) ===

const dslStories = new Map<string, LoadedStory>();

// Pre-register the static stories
dslStories.set(emmaStory.storyId, emmaStory);
dslStories.set(susanStory.storyId, susanStory);
dslStories.set(zhaoStory.storyId, zhaoStory);
dslStories.set(linStory.storyId, linStory);

/**
 * Load a DSL story from content string (for dynamic loading)
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
 * Get all chains
 */
export function getAllChains(): EventChainState[] {
    return getAllDSLStories().flatMap(s => s.chains);
}

/**
 * Get all events
 */
export function getAllEvents(): StoryEvent[] {
    return getAllDSLStories().flatMap(s => s.events);
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
 * Clear all loaded DSL stories (resets to static stories only)
 */
export function clearDSLStories(): void {
    dslStories.clear();
    // Re-register static stories
    dslStories.set(emmaStory.storyId, emmaStory);
    dslStories.set(susanStory.storyId, susanStory);
    dslStories.set(zhaoStory.storyId, zhaoStory);
    dslStories.set(linStory.storyId, linStory);
}
