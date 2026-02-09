/**
 * Police Investigation System
 *
 * Handles logic for police investigations when stolen items are in inventory.
 *
 * Trigger Conditions:
 * - At least one ACTIVE item in inventory has isStolen === true
 * - Random probability check (configurable, default 15%)
 *
 * This system is called during day start or night phase.
 */

import { Item, ItemStatus } from '../items/types';

// Configuration
export const POLICE_CONFIG = {
    // Probability of police investigation per day when stolen items exist (15%)
    INVESTIGATION_CHANCE: 0.15,
    // Minimum innocence to avoid guaranteed investigation
    INNOCENCE_SAFETY_THRESHOLD: 30,
    // Investigation chance increases when innocence is low
    LOW_INNOCENCE_BONUS: 0.10,
    // #34-39: High Innocence (> 60) reduces investigation chance
    HIGH_INNOCENCE_THRESHOLD: 60,
    HIGH_INNOCENCE_REDUCTION: 0.10,
    // #34-39: Very low Innocence (<= 10) increases investigation chance significantly
    VERY_LOW_INNOCENCE_THRESHOLD: 10,
    VERY_LOW_INNOCENCE_BONUS: 0.20  // total chance = base + low_bonus + very_low_bonus = 0.35
};

/**
 * Get all stolen items that are currently in active inventory (not sold/redeemed)
 */
export function getStolenItemsInInventory(inventory: Item[]): Item[] {
    return inventory.filter(item =>
        item.isStolen === true &&
        item.status === ItemStatus.ACTIVE
    );
}

/**
 * Check if a police investigation should be triggered
 * @param inventory Current inventory
 * @param innocence Current innocence reputation value
 * @returns The stolen item to investigate, or null if no investigation
 */
export function checkForPoliceInvestigation(
    inventory: Item[],
    innocence: number
): Item | null {
    const stolenItems = getStolenItemsInInventory(inventory);

    if (stolenItems.length === 0) {
        return null;
    }

    // Calculate investigation chance
    let chance = POLICE_CONFIG.INVESTIGATION_CHANCE;

    // #34-39: High Innocence reduces police investigation chance
    if (innocence > POLICE_CONFIG.HIGH_INNOCENCE_THRESHOLD) {
        chance -= POLICE_CONFIG.HIGH_INNOCENCE_REDUCTION;
    }

    // If innocence is low, increase chance
    if (innocence < POLICE_CONFIG.INNOCENCE_SAFETY_THRESHOLD) {
        chance += POLICE_CONFIG.LOW_INNOCENCE_BONUS;
    }

    // #34-39: Very low Innocence (<= 10) significantly increases investigation chance
    if (innocence <= POLICE_CONFIG.VERY_LOW_INNOCENCE_THRESHOLD) {
        chance += POLICE_CONFIG.VERY_LOW_INNOCENCE_BONUS;
    }

    // Roll for investigation
    if (Math.random() < chance) {
        // Pick a random stolen item to investigate
        const randomIndex = Math.floor(Math.random() * stolenItems.length);
        return stolenItems[randomIndex];
    }

    return null;
}

/**
 * Check if an item being pawned is stolen (for decision prompt)
 */
export function isItemStolen(item: Item | undefined | null): boolean {
    return item?.isStolen === true;
}

// ============================================================================
// HOLDING PERIOD RISK EVENTS (#32, #33)
// ============================================================================

import { HoldingPeriodEventType } from '../npc/types';

export const HOLDING_PERIOD_CONFIG = {
    // #32: Chance per day that a thief regrets and comes back (per stolen item)
    THIEF_REGRET_CHANCE: 0.05,
    // #33: Chance per day that original owner appears (any active item)
    ORIGINAL_OWNER_CHANCE: 0.02,
    // Minimum days held before events can trigger
    MIN_HOLDING_DAYS: 3,
};

/**
 * Check if a holding period risk event should occur.
 * #32: Thief regret — stolen item's thief comes back to reclaim
 * #33: Original owner — legitimate owner discovers their item in the shop
 * @returns The event to trigger, or null
 */
export function checkForHoldingPeriodEvent(
    inventory: Item[],
    currentDay: number
): { type: HoldingPeriodEventType; item: Item } | null {
    const activeItems = inventory.filter(
        item => item.status === ItemStatus.ACTIVE && item.pawnInfo
    );

    for (const item of activeItems) {
        const daysHeld = currentDay - (item.pawnInfo?.startDate || currentDay);
        if (daysHeld < HOLDING_PERIOD_CONFIG.MIN_HOLDING_DAYS) continue;

        // #32: Thief regret — only for stolen items
        if (item.isStolen && Math.random() < HOLDING_PERIOD_CONFIG.THIEF_REGRET_CHANCE) {
            return { type: 'THIEF_REGRET', item };
        }

        // #33: Original owner appears — any item (not stolen, since stolen has thief regret)
        if (!item.isStolen && Math.random() < HOLDING_PERIOD_CONFIG.ORIGINAL_OWNER_CHANCE) {
            return { type: 'ORIGINAL_OWNER', item };
        }
    }

    return null;
}
