
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { ItemTrait } from '../types';
import { AppraisalEvent } from '../systems/items/utils';
import { generateAppraisalLog } from '../systems/game/utils/logGenerator';
import {
    isSkillUnlocked,
    getSenseHiddenHint,
} from '../systems/characterAbility/abilityEngine';
import { AbilityState } from '../systems/characterAbility/types';
import { SKILL_DEFINITIONS } from '../systems/characterAbility/skillDefinitions';
import type { ItemTag } from '../systems/items/tags';
import { performAppraisalCore } from '../systems/items/appraisalCore';

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
    isMastered?: boolean;  // E-2: True when uncertainty <= mastery threshold (diminishing returns)
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

        // Delegate all computation to the pure core function
        const coreResult = performAppraisalCore({
            item,
            abilityState,
            moraleBuff: state.moraleBuff,
            currentDay: state.stats.day,
            motherHealth: state.stats.motherStatus.health,
            dailyNews: state.dailyNews || [],
        });

        // --- Side effects: dispatch AP, patience, item knowledge ---

        dispatch({ type: 'CONSUME_AP', payload: 1 });

        dispatch({
            type: 'UPDATE_CUSTOMER_STATUS',
            payload: {
                patience: Math.max(0, customer.patience - coreResult.patienceCost),
                mood: customer.mood,
                currentAskPrice: customer.currentAskPrice || customer.desiredAmount
            }
        });

        // Generate log entry
        let log = undefined;
        if (coreResult.newTraitsFound.length > 0) {
            const traitNames = coreResult.newTraitsFound.map(t => t.name).join(", ");
            const hasFake = coreResult.newTraitsFound.some(t => t.type === 'FAKE' || t.type === 'FLAW');

            const discoveredFakeOrJackpot = coreResult.newTraitsFound.find(t => t.type === 'FAKE' || t.type === 'JACKPOT');
            const valueJumpOptions = discoveredFakeOrJackpot
                ? {
                    valueJump: discoveredFakeOrJackpot.type as 'FAKE' | 'JACKPOT',
                    newRange: coreResult.newRange
                }
                : undefined;

            log = generateAppraisalLog(item, state.stats.day, traitNames, hasFake, valueJumpOptions);
        } else if (coreResult.event.type === 'MISHAP') {
            log = generateAppraisalLog(item, state.stats.day, "鉴定失误，判断受到干扰。", true);
        }

        dispatch({
            type: 'UPDATE_ITEM_KNOWLEDGE',
            payload: {
                itemId: item.id,
                newRange: coreResult.newRange,
                revealedTraits: coreResult.updatedRevealed,
                hiddenTraits: coreResult.updatedHidden,
                newUncertainty: coreResult.newUncertainty,
                newPerceived: coreResult.finalPerceived,
                incrementAppraisalCount: true,
                hasNegativeEvent: coreResult.hasNegativeEvent ? true : undefined,
                log,
                ...(coreResult.initialRange && { initialRange: coreResult.initialRange }),
                ...(coreResult.revealedHiddenTag && { revealedHiddenTag: coreResult.revealedHiddenTag }),
            }
        });

        return {
            success: true,
            newTraitsFound: coreResult.newTraitsFound,
            bonusTraitIds: coreResult.bonusTraitIds,
            newRange: coreResult.newRange,
            event: coreResult.event,
            valueJump: coreResult.valueJump,
            isBreakthrough: coreResult.isBreakthrough,
            pierceIllusionTriggered: coreResult.pierceIllusionTriggered,
            revealedHiddenTag: coreResult.revealedHiddenTag,
            isMastered: coreResult.isMastered,
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
