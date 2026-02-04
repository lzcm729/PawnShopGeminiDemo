/**
 * Black Market Service
 *
 * Business logic for the black market system:
 * - Daily market generation (purchase requests)
 * - Price calculation with reputation modifiers
 * - Heat management and risk events
 */

import { Item, ItemStatus } from '../items/types';
import { ItemTag, ATTRIBUTE_TAGS, ESSENCE_TAGS, STATE_TAGS } from '../items/tags';
import {
  BlackmarketState,
  BlackmarketDailyState,
  MarketPurchaseRequest,
  RiskEvent,
  RiskEventType,
  INITIAL_BLACKMARKET_STATE,
  getHeatConfig,
  getUnderworldCommission
} from './types';

// ============================================================================
// Daily Market Generation
// ============================================================================

/**
 * Get all tradeable tags (excluding negative state tags)
 */
function getTradeableTags(): ItemTag[] {
  const negativeTags: ItemTag[] = ['BROKEN', 'DIRTY', 'RUSTED'];
  return [
    ...ATTRIBUTE_TAGS,
    ...ESSENCE_TAGS,
    ...STATE_TAGS.filter(t => !negativeTags.includes(t))
  ];
}

/**
 * Generate random purchase requests for the day
 * Returns 1-2 tags with random price multipliers (1.10-1.40)
 */
export function generateDailyPurchaseRequests(): MarketPurchaseRequest[] {
  const tradeableTags = getTradeableTags();
  const numTags = Math.random() < 0.5 ? 1 : 2;  // 50% chance for 1 or 2

  const selectedTags: ItemTag[] = [];
  const requests: MarketPurchaseRequest[] = [];

  for (let i = 0; i < numTags; i++) {
    // Avoid duplicates
    let tag: ItemTag;
    do {
      tag = tradeableTags[Math.floor(Math.random() * tradeableTags.length)];
    } while (selectedTags.includes(tag));

    selectedTags.push(tag);

    // Random multiplier between 1.10 and 1.40
    const priceMultiplier = 1.10 + Math.random() * 0.30;

    requests.push({
      tag,
      priceMultiplier: Math.round(priceMultiplier * 100) / 100  // Round to 2 decimals
    });
  }

  return requests;
}

/**
 * Generate random sale multiplier range for the day
 * Returns { min, max } in range 0.60-0.85
 */
export function generateDailySaleMultipliers(): { min: number; max: number } {
  // Min is 0.60-0.70, Max is 0.75-0.85
  const min = 0.60 + Math.random() * 0.10;
  const max = 0.75 + Math.random() * 0.10;

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100
  };
}

/**
 * Generate a fresh daily state
 */
export function generateDailyBlackmarketState(): BlackmarketDailyState {
  const { min, max } = generateDailySaleMultipliers();

  return {
    purchaseRequests: generateDailyPurchaseRequests(),
    purchasedCount: 0,
    purchaseLimit: 3,
    saleMultiplierMin: min,
    saleMultiplierMax: max
  };
}

// ============================================================================
// Price Calculation
// ============================================================================

/**
 * Calculate price for selling to market purchase (high price track)
 * @param item The item being sold
 * @param purchaseRequest The market's purchase request
 * @param underworldRep Player's Underworld reputation
 */
export function calculatePurchasePrice(
  item: Item,
  purchaseRequest: MarketPurchaseRequest,
  underworldRep: number
): number {
  const basePrice = item.realValue;
  const marketMultiplier = purchaseRequest.priceMultiplier;
  const { commission } = getUnderworldCommission(underworldRep);

  // Final price = realValue * marketMultiplier * (1 - commission)
  // Higher reputation = lower/negative commission = player keeps more
  const finalPrice = basePrice * marketMultiplier * (1 - commission);

  return Math.floor(finalPrice);
}

/**
 * Calculate price for player-initiated sale (low price track)
 * @param item The item being sold
 * @param saleMultiplier The day's sale multiplier (random within min-max range)
 * @param underworldRep Player's Underworld reputation
 */
export function calculateSalePrice(
  item: Item,
  saleMultiplier: number,
  underworldRep: number
): number {
  const basePrice = item.realValue;
  const { commission } = getUnderworldCommission(underworldRep);

  // Final price = realValue * saleMultiplier * (1 - commission)
  // Higher reputation = lower/negative commission = player keeps more
  const finalPrice = basePrice * saleMultiplier * (1 - commission);

  return Math.floor(finalPrice);
}

/**
 * Simple string hash function for deterministic randomness
 * Uses djb2 algorithm
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get deterministic "random" number between 0 and 1 based on seed
 */
function seededRandom(seed: string): number {
  const hash = hashString(seed);
  // Use the hash to generate a pseudo-random number between 0 and 1
  return (hash % 10000) / 10000;
}

/**
 * Get sale multiplier within daily range
 * Uses deterministic randomness based on itemId + day to ensure
 * the same item has the same price throughout the day
 * @param daily The daily blackmarket state
 * @param itemId The item's unique ID (for deterministic pricing)
 * @param day The current game day (prices change daily)
 */
export function getRandomSaleMultiplier(
  daily: BlackmarketDailyState,
  itemId?: string,
  day?: number
): number {
  const { saleMultiplierMin, saleMultiplierMax } = daily;

  // If itemId and day are provided, use deterministic random
  if (itemId !== undefined && day !== undefined) {
    const seed = `blackmarket-sale-${itemId}-${day}`;
    const random = seededRandom(seed);
    return saleMultiplierMin + random * (saleMultiplierMax - saleMultiplierMin);
  }

  // Fallback to true random (for backwards compatibility)
  return saleMultiplierMin + Math.random() * (saleMultiplierMax - saleMultiplierMin);
}

// ============================================================================
// Item Eligibility
// ============================================================================

/**
 * Check if item is eligible for black market purchase (matches requested tag)
 * Both FORFEIT and ACTIVE items can be sold; selling ACTIVE items triggers breach penalty.
 */
export function isEligibleForPurchase(item: Item, purchaseRequest: MarketPurchaseRequest): boolean {
  // Item must be in inventory (FORFEIT or ACTIVE)
  if (item.status !== ItemStatus.FORFEIT && item.status !== ItemStatus.ACTIVE) return false;

  // Check if item has the requested tag
  const itemTags = item.tags ?? [];
  return itemTags.includes(purchaseRequest.tag);
}

/**
 * Check if item can be sold via player sale track
 * Both FORFEIT and ACTIVE items can be sold; selling ACTIVE items triggers breach penalty.
 */
export function isEligibleForSale(item: Item): boolean {
  // Both FORFEIT and ACTIVE items can be sold
  return item.status === ItemStatus.FORFEIT || item.status === ItemStatus.ACTIVE;
}

/**
 * Check if selling this item would trigger a breach (violating pawn contract)
 * Returns true if the item is still in redemption period (ACTIVE status)
 */
export function isSaleBreach(item: Item): boolean {
  return item.status === ItemStatus.ACTIVE;
}

/**
 * Calculate the compensation amount for breach sale
 * When selling an ACTIVE item, player will need to pay 2x the pawn amount as compensation
 * when the customer returns to redeem
 * @param item The item being sold
 * @returns Compensation amount (0 if not a breach)
 */
export function getBreachCompensation(item: Item): number {
  if (item.status !== ItemStatus.ACTIVE) return 0;
  if (!item.pawnAmount) return 0;
  return Math.ceil(item.pawnAmount * 2);
}

/**
 * Calculate actual profit from a black market sale
 * For FORFEIT items: salePrice - pawnAmount (cost basis)
 * For ACTIVE items: salePrice - compensation (2x pawn amount)
 * @param item The item being sold
 * @param salePrice The sale price
 * @returns Actual profit after accounting for compensation
 */
export function calculateSaleProfit(item: Item, salePrice: number): number {
  if (item.status === ItemStatus.ACTIVE && item.pawnAmount) {
    // Breach sale: profit = salePrice - compensation
    const compensation = Math.ceil(item.pawnAmount * 2);
    return salePrice - compensation;
  }
  // Normal sale: profit = salePrice - pawnAmount (cost basis)
  return salePrice - item.pawnAmount;
}

/**
 * Get all items eligible for a specific purchase request
 */
export function getEligibleItemsForPurchase(
  inventory: Item[],
  purchaseRequest: MarketPurchaseRequest
): Item[] {
  return inventory.filter(item => isEligibleForPurchase(item, purchaseRequest));
}

/**
 * Get all items eligible for player sale
 */
export function getEligibleItemsForSale(inventory: Item[]): Item[] {
  return inventory.filter(isEligibleForSale);
}

// ============================================================================
// Heat Management
// ============================================================================

/**
 * Calculate heat gain for a transaction
 * @param isPurchase True if selling to market purchase request, false if player sale
 */
export function getHeatGain(isPurchase: boolean): number {
  return isPurchase ? 1 : 2;  // Purchase: +1, Sale: +2
}

/**
 * Apply daily heat decay
 */
export function applyHeatDecay(currentHeat: number): number {
  return Math.max(0, currentHeat - 1);
}

/**
 * Check for and generate risk event based on current heat
 * @returns RiskEvent if triggered, null otherwise
 */
export function checkRiskEvent(heat: number): RiskEvent | null {
  const config = getHeatConfig(heat);
  const roll = Math.random() * 100;

  if (roll >= config.riskPercent) {
    return null;  // No event triggered
  }

  // Determine event type based on heat level
  const eventType = selectRiskEventType(heat);

  return generateRiskEvent(eventType);
}

/**
 * Select risk event type based on heat level
 * Higher heat = more severe events
 */
function selectRiskEventType(heat: number): RiskEventType {
  if (heat >= 9) {
    // DANGER level: mostly severe
    const roll = Math.random();
    if (roll < 0.3) return 'UNDERCOVER_VISIT';
    if (roll < 0.6) return 'SEARCH_WARNING';
    return 'FORMAL_INVESTIGATION';
  } else if (heat >= 6) {
    // WARNING level: mix of events
    const roll = Math.random();
    if (roll < 0.5) return 'UNDERCOVER_VISIT';
    return 'SEARCH_WARNING';
  } else {
    // WATCHED level: mostly minor
    return 'UNDERCOVER_VISIT';
  }
}

/**
 * Generate risk event details
 */
function generateRiskEvent(type: RiskEventType): RiskEvent {
  switch (type) {
    case 'UNDERCOVER_VISIT':
      return {
        type: 'UNDERCOVER_VISIT',
        message: '便衣警察在附近转悠，今晚黑市暂时关闭。'
      };

    case 'SEARCH_WARNING':
      const penalty = 300 + Math.floor(Math.random() * 200);  // $300-500
      return {
        type: 'SEARCH_WARNING',
        message: `警方发出搜查警告！支付 $${penalty} 打点关系，否则黑市将关闭3天。`,
        penalty,
        lockDays: 3
      };

    case 'FORMAL_INVESTIGATION':
      return {
        type: 'FORMAL_INVESTIGATION',
        message: '正式调查启动！商誉受损，黑市关闭7天。',
        lockDays: 7,
        reputationLoss: 10
      };
  }
}

// ============================================================================
// State Management Helpers
// ============================================================================

/**
 * Create initial blackmarket state
 */
export function createInitialBlackmarketState(): BlackmarketState {
  return {
    ...INITIAL_BLACKMARKET_STATE,
    daily: generateDailyBlackmarketState()
  };
}

/**
 * Process end of day for blackmarket
 * - Apply heat decay
 * - Check lock expiration
 * - Generate new daily state
 */
export function processEndOfDay(
  state: BlackmarketState,
  currentDay: number
): { newState: BlackmarketState; riskEvent: RiskEvent | null } {
  // Apply heat decay
  const newHeat = applyHeatDecay(state.heat);

  // Check if lock has expired
  const isStillLocked = state.isLocked && state.lockUntilDay > currentDay;

  // Check for risk event (only if not already locked)
  const riskEvent = !state.isLocked ? checkRiskEvent(state.heat) : null;

  // Apply risk event effects
  let finalLocked = isStillLocked;
  let finalLockUntilDay = state.lockUntilDay;

  if (riskEvent?.lockDays) {
    finalLocked = true;
    finalLockUntilDay = currentDay + riskEvent.lockDays;
  }

  return {
    newState: {
      ...state,
      heat: newHeat,
      isLocked: finalLocked,
      lockUntilDay: finalLockUntilDay,
      daily: generateDailyBlackmarketState(),
      todaySales: [],
      lastRiskEvent: riskEvent
    },
    riskEvent
  };
}

/**
 * Process start of day for blackmarket (check lock expiration)
 */
export function processStartOfDay(
  state: BlackmarketState,
  currentDay: number
): BlackmarketState {
  // Check if lock has expired
  if (state.isLocked && state.lockUntilDay <= currentDay) {
    return {
      ...state,
      isLocked: false,
      lockUntilDay: 0
    };
  }

  return state;
}
