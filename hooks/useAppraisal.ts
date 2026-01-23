
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { ItemTrait } from '../types';
import { rollAppraisalEvent, AppraisalEvent } from '../systems/items/utils';
import { generateAppraisalLog } from '../systems/game/utils/logGenerator';

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

        let newUncertainty = item.uncertainty;
        
        if (event.type === 'MISHAP') {
            newUncertainty = Math.min(0.5, newUncertainty + uncertaintyBoost);
        } else {
             newUncertainty = Math.max(0.05, newUncertainty * 0.85);
        }

        const CONVERGENCE_SPEED = 0.15;
        const anchor = item.perceivedValue ?? item.realValue;
        const [currentMin, currentMax] = item.currentRange;

        let calcMin = currentMin + (anchor - currentMin) * CONVERGENCE_SPEED;
        let calcMax = currentMax - (currentMax - anchor) * CONVERGENCE_SPEED;
        
        if (event.type === 'MISHAP') {
             calcMin = currentMin - (anchor * 0.05);
             calcMax = currentMax + (anchor * 0.05);
        }

        const roundToHuman = (val: number) => {
            if (val < 100) return Math.round(val);
            return Math.round(val / 10) * 10;
        };

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

        const newRange: [number, number] = [nextMin, nextMax];

        let log = undefined;
        if (uniqueNewTraits.length > 0) {
            const traitNames = uniqueNewTraits.map(t => t.name).join(", ");
            const hasFake = uniqueNewTraits.some(t => t.type === 'FAKE' || t.type === 'FLAW');
            log = generateAppraisalLog(item, state.stats.day, `发现了特征: ${traitNames}`, hasFake);
        } else if (event.type === 'MISHAP') {
            log = generateAppraisalLog(item, state.stats.day, "鉴定失误，判断受到干扰。", true);
        }

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
                log 
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
