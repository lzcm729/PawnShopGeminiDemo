
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { ItemTrait } from '../types';
import { rollAppraisalEvent, AppraisalEvent, generateValuationRange } from '../systems/items/utils';
import { generateAppraisalLog } from '../systems/game/utils/logGenerator';
import { GAME_CONFIG } from '../systems/game/config';
import {
    isSkillUnlocked,
    getSenseHiddenHint,
    getPierceIllusionEffect,
} from '../systems/characterAbility/abilityEngine';
import { AbilityState } from '../systems/characterAbility/types';
import { SKILL_DEFINITIONS } from '../systems/characterAbility/skillDefinitions';
import { getNewsPriceModifier, getNewsTagPriceModifier } from '../systems/news/engine';
import { revealNextHiddenTag } from '../systems/items/tagUtils';
import type { ItemTag } from '../systems/items/tags';

interface AppraisalResult {
    success: boolean;
    failureReason?: 'ALREADY_KNOWN';
    newTraitsFound: ItemTrait[];
    bonusTraitIds: string[];  // Traits discovered via LUCKY_FIND
    newRange: [number, number];
    event?: AppraisalEvent;
    valueJump?: 'FAKE' | 'JACKPOT';  // Indicates value changed dramatically
    isBreakthrough?: boolean;  // True when BREAKTHROUGH event fires (d100 roll 1-10)
    senseHiddenHint?: 'HAS_HIDDEN' | 'NO_HIDDEN';  // From SENSE_HIDDEN skill
    pierceIllusionTriggered?: boolean;  // True when PIERCE_ILLUSION auto-revealed a trait
    revealedHiddenTag?: ItemTag;  // G2 tag revealed through appraisal
}

export const useAppraisal = () => {
    const { state, dispatch } = useGame();
    const customer = state.currentCustomer;

    // Get ability state (safe fallback for old saves)
    const abilityState: AbilityState = state.abilityState ?? {
        skills: Object.fromEntries(
            Object.keys(SKILL_DEFINITIONS).map(id => [id, { unlocked: false, useCount: 0 }])
        ),
        moralEchoQueue: [],
        wordOfMouth: { failStreak: 0, pendingChecks: [] },
        foresightFatigue: { totalFlashes: 0, fatigued: false },
        skillsUsedThisNegotiation: [],
        extraCareUsedThisDeparture: false,
    } as AbilityState;

    const performAppraisal = useCallback((): AppraisalResult => {
        if (!customer) {
            return {
                success: false,
                failureReason: 'ALREADY_KNOWN',
                newTraitsFound: [],
                bonusTraitIds: [],
                newRange: [0, 0]
            };
        }

        const item = customer.item;
        const hiddenTraits = item.hiddenTraits || [];
        const revealedTraits = item.revealedTraits || [];

        const undiscoveredCandidates = hiddenTraits.filter(
            h => !revealedTraits.some(r => r.id === h.id)
        );

        // Note: AP and patience checks are handled at UI level (button disabled)
        // When AP=0, button is disabled; when patience=0, customer leaves

        const appraisalCount = item.appraisalCount || 0;

        // === PIERCE_ILLUSION: On first appraisal, auto-reveal FAKE or guarantee a trait ===
        let pierceIllusionTriggered = false;
        let pierceRevealedTrait: ItemTrait | null = null;
        const hasPierceIllusion = isSkillUnlocked('PIERCE_ILLUSION', abilityState);

        if (hasPierceIllusion && appraisalCount === 0 && undiscoveredCandidates.length > 0) {
            const effect = getPierceIllusionEffect(item.isFake);
            if (effect === 'REVEAL_FAKE') {
                const fakeTrait = undiscoveredCandidates.find(t => t.type === 'FAKE');
                if (fakeTrait) {
                    const idx = undiscoveredCandidates.indexOf(fakeTrait);
                    undiscoveredCandidates.splice(idx, 1);
                    pierceIllusionTriggered = true;
                    pierceRevealedTrait = fakeTrait;
                }
            } else if (effect === 'GUARANTEE_TRAIT') {
                const guaranteedTrait = undiscoveredCandidates[0];
                undiscoveredCandidates.splice(0, 1);
                pierceIllusionTriggered = true;
                pierceRevealedTrait = guaranteedTrait;
            }
        }

        // S1-F1: d100 single-die mutually exclusive event roll
        // S1-F3: Filter rules (first appraisal, max 1 negative, no mishap on fake)
        const event = rollAppraisalEvent(
            appraisalCount,
            item.uncertainty,
            item.hasNegativeAppraisalEvent || false,
            item.isFake,
            GAME_CONFIG.APPRAISAL_EVENTS
        );

        // S1-F2: BREAKTHROUGH is now a d100 event, not a separate random roll
        const isBreakthrough = event.type === 'BREAKTHROUGH';

        let extraPatienceCost = 0;
        let uncertaintyBoost = 0;
        let bonusTraits: ItemTrait[] = [];

        // Add pierce illusion revealed trait as a bonus trait
        if (pierceRevealedTrait) {
            bonusTraits.push(pierceRevealedTrait);
        }

        if (event.type === 'MISHAP') {
            uncertaintyBoost = GAME_CONFIG.APPRAISAL_EVENTS.MISHAP_UNCERTAINTY_INCREASE;
        } else if (event.type === 'IMPATIENT') {
            extraPatienceCost = 1;
        } else if (event.type === 'LUCKY_FIND') {
            if (undiscoveredCandidates.length > 0) {
                const idx = Math.floor(Math.random() * undiscoveredCandidates.length);
                bonusTraits.push(undiscoveredCandidates[idx]);
                undiscoveredCandidates.splice(idx, 1);
            }
        }

        dispatch({ type: 'CONSUME_AP', payload: 1 });

        const totalPatienceCost = 1 + extraPatienceCost;
        dispatch({
            type: 'UPDATE_CUSTOMER_STATUS',
            payload: {
                patience: Math.max(0, customer.patience - totalPatienceCost),
                mood: customer.mood,
                currentAskPrice: customer.currentAskPrice || customer.desiredAmount
            }
        });

        const newTraitsFound: ItemTrait[] = [...bonusTraits];

        // S1-F5: FAKE pseudo-random pity system
        // Track appraisal count for pity calculation (this is the count BEFORE this appraisal)
        const currentAppraisalNum = appraisalCount + 1; // This is the Nth appraisal

        if (event.type !== 'MISHAP') {
            undiscoveredCandidates.forEach(trait => {
                const baseChance = GAME_CONFIG.APPRAISAL.BASE_DISCOVERY_CHANCE - (trait.discoveryDifficulty * GAME_CONFIG.APPRAISAL.DISCOVERY_DIFFICULTY_FACTOR);

                let effectiveChance = baseChance;

                // S1-F5: Apply FAKE pity multiplier
                if (trait.type === 'FAKE') {
                    const pityGuaranteed = GAME_CONFIG.APPRAISAL_EVENTS.FAKE_PITY_GUARANTEED;
                    if (currentAppraisalNum >= pityGuaranteed) {
                        // Guaranteed discovery on Nth appraisal
                        effectiveChance = 1.0;
                    } else if (currentAppraisalNum === 3) {
                        effectiveChance = baseChance * GAME_CONFIG.APPRAISAL_EVENTS.FAKE_PITY_MULTIPLIER_3;
                    } else if (currentAppraisalNum === 2) {
                        effectiveChance = baseChance * GAME_CONFIG.APPRAISAL_EVENTS.FAKE_PITY_MULTIPLIER_2;
                    }
                    // currentAppraisalNum === 1: normal probability (no multiplier)
                }

                const roll = Math.random();
                if (roll < effectiveChance) {
                    newTraitsFound.push(trait);
                }
            });
        }

        const uniqueNewTraits = Array.from(new Set(newTraitsFound.map(t => t.id)))
            .map(id => newTraitsFound.find(t => t.id === id)!);

        const updatedRevealed = [...revealedTraits, ...uniqueNewTraits];

        // Remove discovered traits from hidden traits
        const discoveredIds = new Set(uniqueNewTraits.map(t => t.id));
        const updatedHidden = hiddenTraits.filter(t => !discoveredIds.has(t.id));

        let newUncertainty = item.uncertainty;

        // H-1 + H-4: Compute combined appraisal modifier from morale buff and health penalty
        let appraisalEfficiencyModifier = 1.0;

        // H-1: Morale buff modifier (from visiting mother)
        const moraleBuff = state.moraleBuff;
        if (moraleBuff && state.stats.day < moraleBuff.expiresDay) {
            appraisalEfficiencyModifier *= moraleBuff.appraisalModifier;
        }

        // H-4: Health penalty (mother's poor health distracts player)
        const motherHealth = state.stats.motherStatus.health;
        if (motherHealth < GAME_CONFIG.MOTHER.HEALTH_PENALTY_SEVERE_THRESHOLD) {
            appraisalEfficiencyModifier *= GAME_CONFIG.MOTHER.HEALTH_PENALTY_SEVERE_MODIFIER;
        } else if (motherHealth < GAME_CONFIG.MOTHER.HEALTH_PENALTY_MILD_THRESHOLD) {
            appraisalEfficiencyModifier *= GAME_CONFIG.MOTHER.HEALTH_PENALTY_MILD_MODIFIER;
        }

        if (event.type === 'MISHAP') {
            newUncertainty = Math.min(0.5, newUncertainty + uncertaintyBoost);
        } else {
            // S1-F4: Breakthrough-trait discovery interaction rules
            const discoveredFakeOrJackpotTrait = uniqueNewTraits.find(
                t => t.type === 'FAKE' || t.type === 'JACKPOT'
            );

            if (discoveredFakeOrJackpotTrait) {
                // FAKE/JACKPOT discovery: uncertainty drops to configured value
                // If BREAKTHROUGH also fired, it does NOT stack — trait discovery takes priority
                newUncertainty = GAME_CONFIG.APPRAISAL.TRAIT_DISCOVERY_UNCERTAINTY;
            } else if (isBreakthrough) {
                // S1-F2: BREAKTHROUGH event: uncertainty ×0.60 (from config)
                const breakthroughMultiplier = GAME_CONFIG.APPRAISAL_EVENTS.BREAKTHROUGH_UNCERTAINTY_MULTIPLIER;
                // Apply H-1/H-4 modifier to breakthrough shrink rate
                const adjustedMultiplier = 1 - (1 - breakthroughMultiplier) * appraisalEfficiencyModifier;
                newUncertainty = Math.max(0.05, newUncertainty * adjustedMultiplier);
            } else {
                // Normal shrink - apply H-1/H-4 modifier to shrink rate
                const baseShrinkRate = GAME_CONFIG.APPRAISAL.NORMAL_SHRINK_RATE;
                // shrinkRate closer to 0 = faster shrink; modifier > 1 = faster, < 1 = slower
                const adjustedShrinkRate = 1 - (1 - baseShrinkRate) * appraisalEfficiencyModifier;
                newUncertainty = Math.max(0.05, newUncertainty * adjustedShrinkRate);
            }
        }

        const [currentMin, currentMax] = item.currentRange;

        // Check if we found traits through normal discovery (not LUCKY_FIND bonus)
        const bonusTraitIds = new Set(bonusTraits.map(t => t.id));
        const hasNormalDiscovery = uniqueNewTraits.some(t => !bonusTraitIds.has(t.id));

        let newRange: [number, number];

        // Normal trait discovery: don't narrow range (trait itself is the reward)
        // LUCKY_FIND only or no discovery: narrow range as usual
        if (hasNormalDiscovery && event.type !== 'MISHAP') {
            // Keep current range when normal traits are discovered
            newRange = [currentMin, currentMax];
        } else {
            // S1-F2 / S1-F4: Breakthrough uses faster convergence (0.30 vs 0.15)
            // For non-jump traits (FLAW/STORY), breakthrough ×0.60 already applied above
            const breakthroughRangeShrink = GAME_CONFIG.APPRAISAL_EVENTS.BREAKTHROUGH_RANGE_SHRINK;
            const CONVERGENCE_SPEED = isBreakthrough ? breakthroughRangeShrink : GAME_CONFIG.APPRAISAL.NORMAL_CONVERGENCE_SPEED;
            const anchor = item.perceivedValue ?? item.realValue;

            let calcMin = currentMin + (anchor - currentMin) * CONVERGENCE_SPEED;
            let calcMax = currentMax - (currentMax - anchor) * CONVERGENCE_SPEED;

            if (event.type === 'MISHAP') {
                 calcMin = currentMin - (anchor * GAME_CONFIG.APPRAISAL.MISHAP_RANGE_EXPANSION);
                 calcMax = currentMax + (anchor * GAME_CONFIG.APPRAISAL.MISHAP_RANGE_EXPANSION);
            }

            const roundToHuman = (val: number) => Math.round(val);

            let nextMin = roundToHuman(calcMin);
            let nextMax = roundToHuman(calcMax);

            if (event.type !== 'MISHAP') {
                 nextMin = Math.max(currentMin, nextMin);
                 nextMax = Math.min(currentMax, nextMax);
            } else {
                 nextMin = Math.max(0, nextMin);
                 nextMax = Math.min(anchor * 3, nextMax);
            }

            if (nextMin > nextMax) {
                const mid = Math.floor((nextMin + nextMax) / 2);
                nextMin = mid;
                nextMax = mid;
            }

            newRange = [nextMin, nextMax];
        }

        // =========================================================================
        // FAKE/JACKPOT value jump: trigger immediately when discovered
        // =========================================================================
        const discoveredFakeOrJackpot = uniqueNewTraits.find(t => t.type === 'FAKE' || t.type === 'JACKPOT');
        let finalRange = newRange;
        let finalPerceived: number | undefined = item.perceivedValue;
        let finalInitialRange: [number, number] | undefined = undefined;

        if (discoveredFakeOrJackpot) {
            // Value jump: recalculate range based on real value
            const newUncertaintyForJump = 0.1; // Low uncertainty after discovery
            finalRange = generateValuationRange(item.realValue, undefined, newUncertaintyForJump);
            finalInitialRange = generateValuationRange(item.realValue, undefined, 0.4);
            finalPerceived = undefined; // Mark that truth is now known
            newUncertainty = newUncertaintyForJump;
        }

        // === G2 TAG DISCOVERY: Reveal hidden attribute tags through appraisal ===
        // Each appraisal has a chance to reveal one hidden G2 tag
        // Guaranteed on BREAKTHROUGH or when discovering FAKE/JACKPOT traits
        let revealedHiddenTag: ItemTag | undefined;
        if (isBreakthrough || discoveredFakeOrJackpot || (uniqueNewTraits.length > 0 && Math.random() < 0.5)) {
            const tagResult = revealNextHiddenTag(item);
            if (tagResult) {
                revealedHiddenTag = tagResult.revealedTag;
            }
        }

        // === NEWS EFFECT: Apply active market modifiers to estimate range ===
        // Category-based modifier (existing)
        const newsModifier = getNewsPriceModifier(state.dailyNews || [], item.category);
        // G2 tag-based modifier (gap #35): use revealed tags for price correlation
        const itemTags = item.tags || [];
        const tagModifier = getNewsTagPriceModifier(state.dailyNews || [], itemTags as string[]);
        // Combine: use the stronger of the two modifiers (don't stack)
        const effectiveModifier = Math.abs(newsModifier - 1) >= Math.abs(tagModifier - 1)
            ? newsModifier : tagModifier;
        if (effectiveModifier !== 1.0) {
            finalRange = [
                Math.max(0, Math.round(finalRange[0] * effectiveModifier)),
                Math.max(0, Math.round(finalRange[1] * effectiveModifier))
            ];
        }

        let log = undefined;
        if (uniqueNewTraits.length > 0) {
            const traitNames = uniqueNewTraits.map(t => t.name).join(", ");
            const hasFake = uniqueNewTraits.some(t => t.type === 'FAKE' || t.type === 'FLAW');

            // Pass value jump info if FAKE or JACKPOT was discovered
            const valueJumpOptions = discoveredFakeOrJackpot
                ? {
                    valueJump: discoveredFakeOrJackpot.type as 'FAKE' | 'JACKPOT',
                    newRange: finalRange
                }
                : undefined;

            log = generateAppraisalLog(item, state.stats.day, traitNames, hasFake, valueJumpOptions);
        } else if (event.type === 'MISHAP') {
            log = generateAppraisalLog(item, state.stats.day, "鉴定失误，判断受到干扰。", true);
        }

        const hasNegative = event.type === 'MISHAP' || event.type === 'IMPATIENT';

        dispatch({
            type: 'UPDATE_ITEM_KNOWLEDGE',
            payload: {
                itemId: item.id,
                newRange: finalRange,
                revealedTraits: updatedRevealed,
                hiddenTraits: updatedHidden,
                newUncertainty,
                newPerceived: finalPerceived,
                incrementAppraisalCount: true,
                hasNegativeEvent: hasNegative ? true : undefined,
                log,
                // Pass initialRange when FAKE/JACKPOT discovered
                ...(finalInitialRange && { initialRange: finalInitialRange }),
                // G2 tag discovery
                ...(revealedHiddenTag && { revealedHiddenTag }),
            }
        });

        return {
            success: true,
            newTraitsFound: uniqueNewTraits,
            bonusTraitIds: bonusTraits.map(t => t.id),
            newRange: finalRange,
            event,
            valueJump: discoveredFakeOrJackpot?.type as 'FAKE' | 'JACKPOT' | undefined,
            isBreakthrough,
            pierceIllusionTriggered,
            revealedHiddenTag,
        };

    }, [customer, state.stats.actionPoints, dispatch, abilityState]);

    // SENSE_HIDDEN: Query whether current item has hidden traits
    const getSenseHiddenResult = useCallback((): 'HAS_HIDDEN' | 'NO_HIDDEN' | null => {
        if (!isSkillUnlocked('SENSE_HIDDEN', abilityState)) return null;
        if (!customer) return null;

        const item = customer.item;
        const hiddenTraits = item.hiddenTraits || [];
        const revealedTraits = item.revealedTraits || [];
        const hasUndiscovered = hiddenTraits.some(
            h => !revealedTraits.some(r => r.id === h.id)
        );

        return getSenseHiddenHint(hasUndiscovered);
    }, [customer, abilityState]);

    return { performAppraisal, getSenseHiddenResult };
};
