import { EventChainState, StoryEvent } from '../types';
import { EMMA_CHAIN_INIT, EMMA_EVENTS } from './stories/emma';
import { SUSAN_CHAIN_INIT, SUSAN_EVENTS } from './stories/susan';
import { ZHAO_CHAIN_INIT, ZHAO_EVENTS } from './stories/zhao';
import { LIN_CHAIN_INIT, LIN_EVENTS } from './stories/lin';

export { EMMA_EVENTS, SUSAN_EVENTS, ZHAO_EVENTS, LIN_EVENTS };

// Re-export all events and chains from their respective files
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