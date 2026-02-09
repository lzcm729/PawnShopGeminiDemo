/**
 * NPC Fate Evaluator
 * Analyzes NpcFateEntry[] to produce summary data for the Victory Screen ("Bitter Victory").
 *
 * The victory screen shows players the consequences of their decisions on NPCs:
 * how many were helped, how many were harmed, and their final states.
 */

import { NpcFateEntry } from './types';

export interface FateSummary {
    totalNpcs: number;
    redeemed: number;          // Items returned to their owners
    forfeited: number;         // Items kept/defaulted
    reforged: number;          // Items were altered (broken trust)
    soldBlackmarket: number;   // Items sold behind owners' backs
    /** NPCs whose items were redeemed and not tampered with */
    cleanRedemptions: number;
    /** NPCs who lost their items one way or another */
    lostItems: number;
    /** Ratio of clean redemptions to total (0-1) */
    redemptionRate: number;
    /** Average interest rate across all deals */
    avgInterestRate: number;
    /** Total principal given across all deals */
    totalPrincipal: number;
}

export type FateVerdict = 'SAINT' | 'FAIR' | 'RUTHLESS' | 'BETRAYER';

/**
 * Compute aggregate fate summary from individual NPC entries.
 */
export function summarizeFates(entries: NpcFateEntry[]): FateSummary {
    if (entries.length === 0) {
        return {
            totalNpcs: 0,
            redeemed: 0,
            forfeited: 0,
            reforged: 0,
            soldBlackmarket: 0,
            cleanRedemptions: 0,
            lostItems: 0,
            redemptionRate: 0,
            avgInterestRate: 0,
            totalPrincipal: 0,
        };
    }

    const redeemed = entries.filter(e => e.wasRedeemed).length;
    const forfeited = entries.filter(e => e.wasForfeited).length;
    const reforged = entries.filter(e => e.wasReforged).length;
    const soldBlackmarket = entries.filter(e => e.wasSoldBlackmarket).length;
    const cleanRedemptions = entries.filter(e => e.wasRedeemed && !e.wasReforged && !e.wasSoldBlackmarket).length;
    const lostItems = entries.filter(e => e.wasForfeited || e.wasSoldBlackmarket).length;
    const totalPrincipal = entries.reduce((sum, e) => sum + e.principalGiven, 0);
    const avgInterestRate = entries.reduce((sum, e) => sum + e.interestRate, 0) / entries.length;

    return {
        totalNpcs: entries.length,
        redeemed,
        forfeited,
        reforged,
        soldBlackmarket,
        cleanRedemptions,
        lostItems,
        redemptionRate: entries.length > 0 ? cleanRedemptions / entries.length : 0,
        avgInterestRate,
        totalPrincipal,
    };
}

/**
 * Determine the overall "verdict" label for the victory screen.
 * Based on the player's treatment of NPCs throughout the game.
 */
export function evaluateVerdict(summary: FateSummary): FateVerdict {
    if (summary.totalNpcs === 0) return 'FAIR';

    // BETRAYER: significant reforging or blackmarket sales
    if (summary.reforged >= 2 || summary.soldBlackmarket >= 3) return 'BETRAYER';

    // RUTHLESS: mostly forfeited / sold, low redemption rate
    if (summary.redemptionRate < 0.3 && summary.totalNpcs >= 3) return 'RUTHLESS';

    // SAINT: high clean redemption rate with low interest
    if (summary.redemptionRate >= 0.7 && summary.avgInterestRate <= 0.08) return 'SAINT';

    return 'FAIR';
}
