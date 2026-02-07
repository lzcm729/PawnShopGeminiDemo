/**
 * Customer Scheduling with Random Perturbation
 *
 * Design Reference: 填充事件系统 Section 9.1-9.2
 *
 * Determines the order in which narrative and filler customers appear
 * each day, with 20-30% random perturbation to break predictable patterns.
 */

// ============================================================================
// TYPES
// ============================================================================

export type CustomerSlotType = 'NARRATIVE' | 'FILLER';

export interface CustomerSlot {
    type: CustomerSlotType;
    index: number;  // Original index within its type (for later lookup)
}

export interface DailySchedule {
    slots: CustomerSlot[];
    narrativeCount: number;
    fillerCount: number;
}

// ============================================================================
// SCHEDULING TEMPLATES (Design doc Section 9.1)
// ============================================================================

/**
 * Base templates by narrative event count
 *
 * | Narrative | Filler | Base Template |
 * |-----------|--------|---------------|
 * | 0         | 2-3    | Random order  |
 * | 1         | 1-2    | [N] [F] [F]  |
 * | 2         | 0-1    | [N] [F] [N]  |
 * | 3+        | 0      | No filler     |
 */

function createBaseSchedule(narrativeCount: number, fillerCount: number): CustomerSlot[] {
    const slots: CustomerSlot[] = [];

    if (narrativeCount === 0) {
        // All filler, random order (no value ordering)
        for (let i = 0; i < fillerCount; i++) {
            slots.push({ type: 'FILLER', index: i });
        }
        // Shuffle (Fisher-Yates)
        for (let i = slots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }
        return slots;
    }

    if (narrativeCount === 1) {
        // Base: [N] [F] [F]
        slots.push({ type: 'NARRATIVE', index: 0 });
        for (let i = 0; i < fillerCount; i++) {
            slots.push({ type: 'FILLER', index: i });
        }
        return slots;
    }

    if (narrativeCount === 2) {
        // Base: [N] [F?] [N] — ensure non-consecutive narratives
        slots.push({ type: 'NARRATIVE', index: 0 });
        if (fillerCount > 0) {
            slots.push({ type: 'FILLER', index: 0 });
        }
        slots.push({ type: 'NARRATIVE', index: 1 });
        // Any remaining fillers go at the end
        for (let i = 1; i < fillerCount; i++) {
            slots.push({ type: 'FILLER', index: i });
        }
        return slots;
    }

    // 3+ narratives: interleave with fillers to avoid consecutive narratives
    let nIdx = 0;
    let fIdx = 0;
    for (let i = 0; i < narrativeCount + fillerCount; i++) {
        if (nIdx < narrativeCount && (fIdx >= fillerCount || i % 2 === 0)) {
            slots.push({ type: 'NARRATIVE', index: nIdx++ });
        } else if (fIdx < fillerCount) {
            slots.push({ type: 'FILLER', index: fIdx++ });
        } else {
            slots.push({ type: 'NARRATIVE', index: nIdx++ });
        }
    }
    return slots;
}

// ============================================================================
// RANDOM PERTURBATION (Design doc Section 9.2)
// ============================================================================

/**
 * Apply random perturbation to the base schedule.
 *
 * Rules:
 * - 20-30% chance: narrative event NOT in first position
 * - 10-15% chance: 1-2 filler events appear before narrative
 * - Forced constraint: 2+ narrative customers never appear consecutively
 */
function applyPerturbation(slots: CustomerSlot[]): CustomerSlot[] {
    if (slots.length <= 1) return slots;

    const hasNarrative = slots.some(s => s.type === 'NARRATIVE');
    const hasFiller = slots.some(s => s.type === 'FILLER');

    if (!hasNarrative || !hasFiller) return slots;

    const result = [...slots];

    // Perturbation: move narrative out of first position
    const perturbRoll = Math.random();
    if (perturbRoll < 0.25 && result[0]?.type === 'NARRATIVE') {
        // Find a filler slot to swap with
        const fillerIndices = result
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => s.type === 'FILLER')
            .map(({ i }) => i);

        if (fillerIndices.length > 0) {
            // Pick a random filler to move to front
            const swapIdx = fillerIndices[Math.floor(Math.random() * fillerIndices.length)];
            [result[0], result[swapIdx]] = [result[swapIdx], result[0]];
        }
    }

    // Enforce: no consecutive narratives
    enforceNoConsecutiveNarrative(result);

    return result;
}

/**
 * Ensure no two NARRATIVE slots are adjacent.
 * If found, swap the second one with the nearest FILLER slot.
 */
function enforceNoConsecutiveNarrative(slots: CustomerSlot[]): void {
    for (let i = 1; i < slots.length; i++) {
        if (slots[i].type === 'NARRATIVE' && slots[i - 1].type === 'NARRATIVE') {
            // Find nearest filler slot to swap with
            let swapTarget = -1;
            // Search forward first
            for (let j = i + 1; j < slots.length; j++) {
                if (slots[j].type === 'FILLER') {
                    swapTarget = j;
                    break;
                }
            }
            // If no forward filler, search backward (before i-1)
            if (swapTarget === -1) {
                for (let j = i - 2; j >= 0; j--) {
                    if (slots[j].type === 'FILLER') {
                        swapTarget = j;
                        break;
                    }
                }
            }
            if (swapTarget !== -1) {
                [slots[i], slots[swapTarget]] = [slots[swapTarget], slots[i]];
            }
        }
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a daily customer schedule with random perturbation.
 *
 * @param narrativeCount Number of narrative events available today
 * @param maxCustomers Maximum customers per day (from GAME_CONFIG)
 * @returns DailySchedule with ordered slots
 */
export function scheduleCustomerOrder(
    narrativeCount: number,
    maxCustomers: number
): DailySchedule {
    // Calculate filler count based on design doc Section 9.1
    let fillerCount: number;
    if (narrativeCount === 0) {
        fillerCount = 2 + Math.floor(Math.random() * 2); // 2-3
    } else if (narrativeCount === 1) {
        fillerCount = 1 + Math.floor(Math.random() * 2); // 1-2
    } else if (narrativeCount === 2) {
        fillerCount = Math.random() < 0.5 ? 0 : 1;       // 0-1
    } else {
        fillerCount = 0;                                   // 3+: no filler
    }

    // Cap total to maxCustomers
    const totalSlots = narrativeCount + fillerCount;
    if (totalSlots > maxCustomers) {
        fillerCount = Math.max(0, maxCustomers - narrativeCount);
    }

    // Generate base schedule
    const baseSlots = createBaseSchedule(narrativeCount, fillerCount);

    // Apply random perturbation
    const perturbedSlots = applyPerturbation(baseSlots);

    return {
        slots: perturbedSlots,
        narrativeCount,
        fillerCount
    };
}
