/**
 * Echo Detector (S3-F2)
 *
 * Compares chain states before and after daily simulation to detect
 * critical events that should generate echo entries in item logs.
 *
 * Design doc: J (Event Chain Echo Entries)
 */

import { EventChainState } from '../../narrative/types';
import { Item, ItemStatus, EchoTrigger, ItemLogEntry } from '../../../types';
import { generateEchoLog } from './logGenerator';

interface EchoEntry {
    itemId: string;
    log: ItemLogEntry;
}

// Threshold constants for echo triggers
const HOPE_COLLAPSE_THRESHOLD = 15;
const FUNDS_DEPLETED_THRESHOLD = 0;

/**
 * Detect echo-worthy events by comparing chain states before/after simulation.
 * Returns echo log entries to append to affected items.
 */
export const detectEchoEntries = (
    oldChains: EventChainState[],
    newChains: EventChainState[],
    inventory: Item[],
    day: number,
): EchoEntry[] => {
    const entries: EchoEntry[] = [];

    for (const newChain of newChains) {
        if (!newChain.isActive) continue;

        const oldChain = oldChains.find(c => c.id === newChain.id);
        if (!oldChain) continue;

        // Find unredeemed items linked to this chain
        const chainItems = inventory.filter(
            i => i.relatedChainId === newChain.id &&
                 (i.status === ItemStatus.ACTIVE || i.status === ItemStatus.FORFEIT)
        );
        if (chainItems.length === 0) continue;

        // Check: Hope collapse
        const oldHope = oldChain.variables.hope ?? oldChain.variables.Hope ?? null;
        const newHope = newChain.variables.hope ?? newChain.variables.Hope ?? null;
        if (oldHope !== null && newHope !== null) {
            if (oldHope > HOPE_COLLAPSE_THRESHOLD && newHope <= HOPE_COLLAPSE_THRESHOLD) {
                appendEchoToItems(entries, chainItems, day, 'HOPE_COLLAPSE', newChain.id);
            }
        }

        // Check: Funds depleted
        const oldFunds = oldChain.variables.funds ?? null;
        const newFunds = newChain.variables.funds ?? null;
        if (oldFunds !== null && newFunds !== null) {
            if (oldFunds > FUNDS_DEPLETED_THRESHOLD && newFunds <= FUNDS_DEPLETED_THRESHOLD) {
                appendEchoToItems(entries, chainItems, day, 'FUNDS_DEPLETED', newChain.id);
            }
        }

        // Check: Job success (job_success variable flipped to true)
        const oldJobSuccess = oldChain.variables.job_success ?? oldChain.variables.jobSuccess ?? 0;
        const newJobSuccess = newChain.variables.job_success ?? newChain.variables.jobSuccess ?? 0;
        if (!oldJobSuccess && newJobSuccess) {
            appendEchoToItems(entries, chainItems, day, 'JOB_SUCCESS', newChain.id);
        }

        // Check: Chain deactivated (could indicate resolution)
        if (oldChain.isActive && !newChain.isActive) {
            // Deactivation could mean many things; we don't generate echo here
            // (specific triggers like EXPIRED_NO_REDEEM are handled by reducers)
        }
    }

    return entries;
};

/**
 * Generate one echo log per chain (not per item) to avoid entry flooding.
 * Design doc constraint: "each critical event generates at most one echo"
 * We pick the most recently pawned item to receive the echo.
 */
function appendEchoToItems(
    entries: EchoEntry[],
    chainItems: Item[],
    day: number,
    trigger: EchoTrigger,
    chainId: string,
) {
    // Pick the most recent item (highest pawnDate)
    const sortedItems = [...chainItems].sort((a, b) => (b.pawnDate || 0) - (a.pawnDate || 0));
    const targetItem = sortedItems[0];
    if (!targetItem) return;

    // Avoid duplicate echoes: check if this item already has an echo of this type
    const alreadyHasEcho = targetItem.logs?.some(
        log => log.type === 'ECHO' && log.metadata?.echoTrigger === trigger
    );
    if (alreadyHasEcho) return;

    entries.push({
        itemId: targetItem.id,
        log: generateEchoLog(day, trigger, chainId),
    });
}
