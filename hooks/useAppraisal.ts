

import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { ItemTrait } from '../types';
import { rollAppraisalEvent, AppraisalEvent } from '../services/appraisalUtils';
import { generateAppraisalLog } from '../services/logGenerator';

interface AppraisalResult {
    success: boolean;
    failureReason?: 'NO_AP' | 'NO_PATIENCE' | 'ALREADY_KNOWN';
    newTraitsFound: ItemTrait[];
    newRange: [number, number];
    event?: AppraisalEvent;
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

        // --- NEW: EVENT ROLL ---
        const event = rollAppraisalEvent(
            item.appraisalCount || 0,
            item.uncertainty,
            item.hasNegativeAppraisalEvent || false
        );

        let extraPatienceCost = 0;
        let uncertaintyBoost = 0;
        let bonusTraits: ItemTrait[] = [];

        if (event.type === 'MISHAP') {
            uncertaintyBoost = 0.05; // Slight range bounce back
        } else if (event.type === 'IMPATIENT') {
            extraPatienceCost = 1;
        } else if (event.type === 'LUCKY_FIND') {
            if (undiscoveredCandidates.length > 0) {
                // Find a random trait to force reveal
                const idx = Math.floor(Math.random() * undiscoveredCandidates.length);
                bonusTraits.push(undiscoveredCandidates[idx]);
                // Remove it from candidates so standard check doesn't double add (though unique check handles it)
                undiscoveredCandidates.splice(idx, 1);
            }
        }

        // 2. Consume Resources
        dispatch({ type: 'CONSUME_AP', payload: 1 });
        
        // Apply Patience Costs (Standard + Event)
        const totalPatienceCost = 1 + extraPatienceCost;
        dispatch({ 
            type: 'UPDATE_CUSTOMER_STATUS', 
            payload: { 
                patience: Math.max(0, customer.patience - totalPatienceCost), 
                mood: customer.mood,
                currentAskPrice: customer.currentAskPrice || customer.desiredAmount 
            } 
        });

        // 3. Trait Discovery (Standard)
        const newTraitsFound: ItemTrait[] = [...bonusTraits];
        
        // Only perform standard roll if not a Mishap (Mishap clouds judgment, no new traits standard way)
        // But Lucky Find is additive.
        if (event.type !== 'MISHAP') {
            undiscoveredCandidates.forEach(trait => {
                const roll = Math.random();
                const chance = 0.5 - (trait.discoveryDifficulty * 0.3); 
                if (roll < chance) {
                    newTraitsFound.push(trait);
                }
            });
        }

        // Dedupe traits
        const uniqueNewTraits = Array.from(new Set(newTraitsFound.map(t => t.id)))
            .map(id => newTraitsFound.find(t => t.id === id)!);

        const updatedRevealed = [...revealedTraits, ...uniqueNewTraits];

        // 4. Update Knowledge (Standard Lerp Narrowing)
        // Mishap adds uncertainty, standard reduces it.
        let newUncertainty = item.uncertainty;
        
        if (event.type === 'MISHAP') {
            newUncertainty = Math.min(0.5, newUncertainty + uncertaintyBoost);
        } else {
             // Decay uncertainty
             newUncertainty = Math.max(0.05, newUncertainty * 0.85);
        }

        const CONVERGENCE_SPEED = 0.15; // 15% closer per attempt
        const anchor = item.perceivedValue ?? item.realValue;
        const [currentMin, currentMax] = item.currentRange;

        // Base narrowing
        let calcMin = currentMin + (anchor - currentMin) * CONVERGENCE_SPEED;
        let calcMax = currentMax - (currentMax - anchor) * CONVERGENCE_SPEED;
        
        // If mishap, widen slightly instead of narrowing
        if (event.type === 'MISHAP') {
             calcMin = currentMin - (anchor * 0.05);
             calcMax = currentMax + (anchor * 0.05);
        }

        // Humanize rounding (e.g. 1052 -> 1050)
        const roundToHuman = (val: number) => {
            if (val < 100) return Math.round(val);
            return Math.round(val / 10) * 10;
        };

        let nextMin = roundToHuman(calcMin);
        let nextMax = roundToHuman(calcMax);

        // Constraint 1: Strict Shrinking (Inner Bounds) UNLESS MISHAP
        if (event.type !== 'MISHAP') {
             nextMin = Math.max(currentMin, nextMin);
             nextMax = Math.min(currentMax, nextMax);
        } else {
             // For mishap, clamp to reasonable bounds (0, 2x anchor)
             nextMin = Math.max(0, nextMin);
             nextMax = Math.min(anchor * 3, nextMax); // Soft cap
        }

        // Constraint 2: Min <= Max safety
        if (nextMin > nextMax) {
            const mid = Math.floor((nextMin + nextMax) / 2);
            nextMin = mid;
            nextMax = mid;
        }

        const newRange: [number, number] = [nextMin, nextMax];

        // --- NEW: GENERATE LOG ---
        let log = undefined;
        if (uniqueNewTraits.length > 0) {
            const traitNames = uniqueNewTraits.map(t => t.name).join(", ");
            const hasFake = uniqueNewTraits.some(t => t.type === 'FAKE' || t.type === 'FLAW');
            log = generateAppraisalLog(item, state.stats.day, `发现了特征: ${traitNames}`, hasFake);
        } else if (event.type === 'MISHAP') {
            log = generateAppraisalLog(item, state.stats.day, "鉴定失误，判断受到干扰。", true);
        } else if (event.type === 'IMPATIENT') {
             // No specific appraisal log for impatience, as it's a customer reaction? 
             // Maybe we log it anyway to record the interaction.
        } else {
            // Standard narrow without traits
            // Optional: log "Range narrowed"? Can be spammy. 
            // Let's only log traits or major events.
        }

        // 5. Dispatch Update
        const hasNegative = event.type === 'MISHAP' || event.type === 'IMPATIENT';
        
        dispatch({
            type: 'UPDATE_ITEM_KNOWLEDGE',
            payload: {
                itemId: item.id,
                newRange: newRange,
                revealedTraits: updatedRevealed,
                newUncertainty,
                newPerceived: item.perceivedValue,
                incrementAppraisalCount: true,
                hasNegativeEvent: hasNegative ? true : undefined,
                log // Append log if generated
            }
        });

        return {
            success: true,
            newTraitsFound: uniqueNewTraits,
            newRange,
            event
        };

    }, [customer, state.stats.actionPoints, dispatch]);

    return { performAppraisal };
};