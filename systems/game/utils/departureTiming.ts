
import { SatisfactionLevel } from '../../narrative/types';

/**
 * Configuration for the three-phase departure timing.
 * Controls the pacing of the departure scene based on emotional intensity.
 */
export interface DepartureTimingConfig {
    /** Phase 1: Settlement ritual duration (ms) - stamp/coin animations */
    settlementDuration: number;
    /** Phase 2: Core departure duration (ms) - NPC dialogue/silence */
    coreDuration: number;
    /** Phase 3: Afterglow duration (ms) - inner voice/exit sounds */
    afterglow: number;
    /** Whether to show merchant's inner voice */
    showInnerVoice: boolean;
    /** Typewriter speed (ms per character) */
    typewriterSpeed: number;
}

/**
 * Get departure timing configuration based on emotional intensity.
 *
 * Design doc reference: System 9 (送客兴趣曲线定位)
 * - NEUTRAL: Quick and lightweight (shortened afterglow)
 * - GRATEFUL/RESENTFUL: Medium pacing
 * - DESPERATE/CONFLICTED: Full three-phase experience
 * - Narrative NPC at key chain nodes: All narrative elements enabled
 */
export const getDepartureTimingConfig = (
    satisfaction: SatisfactionLevel,
    isNarrativeNPC: boolean
): DepartureTimingConfig => {
    // Narrative NPC at key story moments: maximum emotional impact
    if (isNarrativeNPC && (satisfaction === 'DESPERATE' || satisfaction === 'CONFLICTED' || satisfaction === 'GRATEFUL')) {
        return {
            settlementDuration: 2000,
            coreDuration: 5000,
            afterglow: 3000,
            showInnerVoice: true,
            typewriterSpeed: 55,
        };
    }

    switch (satisfaction) {
        case 'DESPERATE':
        case 'CONFLICTED':
            return {
                settlementDuration: 2000,
                coreDuration: 4000,
                afterglow: 2500,
                showInnerVoice: true,
                typewriterSpeed: 50,
            };

        case 'GRATEFUL':
        case 'RESENTFUL':
            return {
                settlementDuration: 1500,
                coreDuration: 3000,
                afterglow: 1500,
                showInnerVoice: true,
                typewriterSpeed: 40,
            };

        case 'NEUTRAL':
        default:
            return {
                settlementDuration: 1000,
                coreDuration: 2000,
                afterglow: 500,
                showInnerVoice: false,
                typewriterSpeed: 35,
            };
    }
};
