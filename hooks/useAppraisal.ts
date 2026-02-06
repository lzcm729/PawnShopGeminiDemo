
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { ItemTrait } from '../types';
import { rollAppraisalEvent, AppraisalEvent, generateValuationRange } from '../systems/items/utils';
import { generateAppraisalLog } from '../systems/game/utils/logGenerator';

interface AppraisalResult {
    success: boolean;
    failureReason?: 'ALREADY_KNOWN';
    newTraitsFound: ItemTrait[];
    bonusTraitIds: string[];  // Traits discovered via LUCKY_FIND
    newRange: [number, number];
    event?: AppraisalEvent;
    valueJump?: 'FAKE' | 'JACKPOT';  // Indicates value changed dramatically
    isBreakthrough?: boolean;  // True when "灵光一闪" triggers (~10% chance, ×0.60 uncertainty)
}

export const useAppraisal = () => {
    const { state, dispatch } = useGame();
    const customer = state.currentCustomer;

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

        const event = rollAppraisalEvent(
            item.appraisalCount || 0,
            item.uncertainty,
            item.hasNegativeAppraisalEvent || false
        );

        let extraPatienceCost = 0;
        let uncertaintyBoost = 0;
        let bonusTraits: ItemTrait[] = [];

        if (event.type === 'MISHAP') {
            uncertaintyBoost = 0.05; 
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
        
        if (event.type !== 'MISHAP') {
            undiscoveredCandidates.forEach(trait => {
                const roll = Math.random();
                const chance = 0.5 - (trait.discoveryDifficulty * 0.3); 
                if (roll < chance) {
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
        let isBreakthrough = false;

        if (event.type === 'MISHAP') {
            newUncertainty = Math.min(0.5, newUncertainty + uncertaintyBoost);
        } else {
            // ~10% chance of "灵光一闪" (breakthrough): ×0.60 instead of ×0.85
            isBreakthrough = Math.random() < 0.10;
            const shrinkFactor = isBreakthrough ? 0.60 : 0.85;
            newUncertainty = Math.max(0.05, newUncertainty * shrinkFactor);
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
            // Narrow or expand range (breakthrough doubles convergence speed)
            const CONVERGENCE_SPEED = isBreakthrough ? 0.30 : 0.15;
            const anchor = item.perceivedValue ?? item.realValue;

            let calcMin = currentMin + (anchor - currentMin) * CONVERGENCE_SPEED;
            let calcMax = currentMax - (currentMax - anchor) * CONVERGENCE_SPEED;

            if (event.type === 'MISHAP') {
                 calcMin = currentMin - (anchor * 0.05);
                 calcMax = currentMax + (anchor * 0.05);
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
                ...(finalInitialRange && { initialRange: finalInitialRange })
            }
        });

        return {
            success: true,
            newTraitsFound: uniqueNewTraits,
            bonusTraitIds: bonusTraits.map(t => t.id),
            newRange: finalRange,
            event,
            valueJump: discoveredFakeOrJackpot?.type as 'FAKE' | 'JACKPOT' | undefined,
            isBreakthrough
        };

    }, [customer, state.stats.actionPoints, dispatch]);

    return { performAppraisal };
};
