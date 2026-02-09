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
