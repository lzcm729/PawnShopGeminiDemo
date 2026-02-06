/**
 * Centralized interest calculation for the pawn shop.
 *
 * Formula (lump-sum / "包干制"):
 *   interest = principal * rate * (days / 7)
 *
 * Where:
 *   - principal: the cash amount lent to the customer
 *   - rate: weekly interest rate (e.g. 0.05, 0.10, 0.20)
 *   - days: the billing period in days (termDays for full term, 7 for renewal)
 */

/**
 * Calculate interest for a given principal, weekly rate, and number of days.
 * Result is rounded up (Math.ceil) to avoid fractional currency.
 */
export function calculateInterest(principal: number, rate: number, days: number): number {
    return Math.ceil(principal * rate * (days / 7));
}

/**
 * Calculate the full redemption cost (principal + interest) for a pawn contract.
 * `days` should be max(daysPassed, termDays) to ensure minimum term is charged.
 */
export function calculateRedemptionTotal(principal: number, rate: number, days: number): number {
    return principal + calculateInterest(principal, rate, days);
}
