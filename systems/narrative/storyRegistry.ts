
import { EventChainState, StoryEvent } from '../../types';
import { EMMA_CHAIN_INIT, EMMA_EVENTS } from './stories/emma';
import { SUSAN_CHAIN_INIT, SUSAN_EVENTS } from './stories/susan';
import { ZHAO_CHAIN_INIT, ZHAO_EVENTS } from './stories/zhao';
import { LIN_CHAIN_INIT, LIN_EVENTS } from './stories/lin';
import { UNDERWORLD_CHAIN_INIT, UNDERWORLD_EVENTS } from './stories/underworld';

export { EMMA_EVENTS, SUSAN_EVENTS, ZHAO_EVENTS, LIN_EVENTS, UNDERWORLD_EVENTS };

export const INITIAL_CHAINS: EventChainState[] = [
    EMMA_CHAIN_INIT,
    SUSAN_CHAIN_INIT,
    ZHAO_CHAIN_INIT,
    LIN_CHAIN_INIT,
    UNDERWORLD_CHAIN_INIT
];

export const ALL_STORY_EVENTS: StoryEvent[] = [
    ...EMMA_EVENTS,
    ...SUSAN_EVENTS,
    ...ZHAO_EVENTS,
    ...LIN_EVENTS,
    ...UNDERWORLD_EVENTS
];
