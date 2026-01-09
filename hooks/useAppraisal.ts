
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { ItemTrait } from '../types';

interface AppraisalResult {
    success: boolean;
    failureReason?: 'NO_AP' | 'NO_PATIENCE' | 'ALREADY_KNOWN';
    newTraitsFound: ItemTrait[];
    newRange: [number, number];
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
                newRange: [0, 0] 
            };
        }

        const item = customer.item;
        const hiddenTraits = item.hiddenTraits || [];
        const revealedTraits = item.revealedTraits || [];
        
        const undiscoveredCandidates = hiddenTraits.filter(
            h => !revealedTraits.some(r => r.id === h.id)
        );

        // 1. Resource Check
        if (state.stats.actionPoints <= 0) {
            return { 
                success: false, 
                failureReason: 'NO_AP', 
                newTraitsFound: [], 
                newRange: item.currentRange 
            };
        }
        if (customer.patience <= 0) {
            return { 
                success: false, 
                failureReason: 'NO_PATIENCE', 
                newTraitsFound: [], 
                newRange: item.currentRange 
            };
        }

        // 2. Consume Resources
        dispatch({ type: 'CONSUME_AP', payload: 1 });
        dispatch({ 
            type: 'UPDATE_CUSTOMER_STATUS', 
            payload: { 
                patience: Math.max(0, customer.patience - 1), 
                mood: customer.mood,
                currentAskPrice: customer.currentAskPrice || customer.desiredAmount 
            } 
        });

        // 3. Trait Discovery
        const newTraitsFound: ItemTrait[] = [];
        undiscoveredCandidates.forEach(trait => {
            const roll = Math.random();
            const chance = 0.5 - (trait.discoveryDifficulty * 0.3); 
            if (roll < chance) {
                newTraitsFound.push(trait);
            }
        });

        const updatedRevealed = [...revealedTraits, ...newTraitsFound];

        // 4. Update Knowledge (Standard Lerp Narrowing ONLY)
        // We no longer trigger "Anchor Shift" here. That happens when the player CLICKS the trait.
        
        let newUncertainty = item.uncertainty;
        
        // Decay uncertainty slightly for stat tracking
        newUncertainty = Math.max(0.05, newUncertainty * 0.85);

        const CONVERGENCE_SPEED = 0.15; // 15% closer per attempt
        const anchor = item.perceivedValue ?? item.realValue;
        const [currentMin, currentMax] = item.currentRange;

        let calcMin = currentMin + (anchor - currentMin) * CONVERGENCE_SPEED;
        let calcMax = currentMax - (currentMax - anchor) * CONVERGENCE_SPEED;

        // Humanize rounding (e.g. 1052 -> 1050)
        const roundToHuman = (val: number) => {
            if (val < 100) return Math.round(val);
            return Math.round(val / 10) * 10;
        };

        let nextMin = roundToHuman(calcMin);
        let nextMax = roundToHuman(calcMax);

        // Constraint 1: Strict Shrinking (Inner Bounds)
        // Ensure we never expand the range outward.
        nextMin = Math.max(currentMin, nextMin);
        nextMax = Math.min(currentMax, nextMax);

        // Constraint 2: Min <= Max safety
        if (nextMin > nextMax) {
            const mid = Math.floor((nextMin + nextMax) / 2);
            nextMin = mid;
            nextMax = mid;
        }

        const newRange: [number, number] = [nextMin, nextMax];

        // 5. Dispatch Update
        dispatch({
            type: 'UPDATE_ITEM_KNOWLEDGE',
            payload: {
                itemId: item.id,
                newRange: newRange,
                revealedTraits: updatedRevealed,
                newUncertainty,
                newPerceived: item.perceivedValue // Keep existing perceived value logic
            }
        });

        return {
            success: true,
            newTraitsFound,
            newRange
        };

    }, [customer, state.stats.actionPoints, dispatch]);

    return { performAppraisal };
};
