/**
 * Black Market Service
 *
 * Business logic for the black market system:
 * - Daily market generation (purchase requests)
 * - Price calculation with reputation modifiers
 * - Heat management and risk events
 * - Upgrade-based enhancements (daily limits, heat decay, price bonuses)
 */

import { Item, ItemStatus } from '../items/types';
import { ItemTag, ATTRIBUTE_TAGS, ESSENCE_TAGS, STATE_TAGS } from '../items/tags';
import { ForgeryNotorietyState } from '../workshop/types';
import { getDetectionRate, advanceNotoriety } from '../workshop/forgeryNotoriety';
import {
  BlackmarketState,
  BlackmarketDailyState,
  MarketPurchaseRequest,
  RiskEvent,
  RiskEventType,
  INITIAL_BLACKMARKET_STATE,
  getHeatConfig,
  getHeatLevel,
  getUnderworldCommission,
  MarketIndicator,
  RiskClue,
  LowHeatRewardState,
  LowHeatRewardType,
  ProtectionFeeState,
  MoralEchoBlackmarketEffect
} from './types';
import { BlackMarketLevelConfig } from '../upgrades/types';
import { BLACK_MARKET_LEVELS } from '../upgrades/config';
import { GAME_CONFIG } from '../game/config';
import { getBlackmarketVolatilityRange, getBlackmarketPurchaseModifier } from '../appraisal/precision';
import { ActiveNewsInstance, NewsCategory } from '../news/types';

// ============================================================================
// P1-10: Customer Ecology Shift
// ============================================================================

/**
 * Gray tags - tags associated with suspicious/stolen/underground items.
 * When innocence drops, these tags become more likely in purchase requests,
 * representing the shift toward a "darker" market ecosystem.
 */
const GRAY_TAGS: ItemTag[] = ['FAKE_HISTORY', 'VINTAGE_REAL'];

/**
 * Get the gray customer percentage bonus based on player's innocence.
 * Lower innocence = more gray customers attracted to the black market.
 *
 * P1-10 Design:
 * | Innocence | Gray % increase | Effect            |
 * |-----------|-----------------|-------------------|
 * | 61-100    | +0%             | Normal            |
 * | 41-60     | +10%            | Slight change     |
 * | 21-40     | +25%            | Noticeable shift  |
 * | 0-20      | +40%            | Shop "goes dark"  |
 *
 * @param innocence Player's current innocence value (0-100)
 * @returns Gray customer percentage bonus (0.0 - 0.40)
 */
export function getCustomerEcologyShift(innocence: number): number {
  const cfg = GAME_CONFIG.BLACKMARKET;
  if (innocence > cfg.ECOLOGY_THRESHOLD) return 0;
  if (innocence > cfg.ECOLOGY_MODERATE_MAX_INNOCENCE) return cfg.ECOLOGY_SHIFT_MILD;
  if (innocence > cfg.ECOLOGY_SEVERE_MAX_INNOCENCE) return cfg.ECOLOGY_SHIFT_MODERATE;
  return cfg.ECOLOGY_SHIFT_SEVERE;
}

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
 * v3.6 [BM-2]: Demand inertia constant
 * Tags that appeared yesterday have this much extra probability of reappearing
 */
const DEMAND_INERTIA_BONUS = GAME_CONFIG.BLACKMARKET.DEMAND_INERTIA_BONUS;

/**
 * Generate random purchase requests for the day
 * v3.6 [BM-2]: Supports demand inertia via tagHistory
 * P1-10: Supports ecology shift via innocence-based gray tag weighting
 * @param count Number of purchase requests to generate (equals daily purchase limit)
 * @param tagHistory Recent tag history for demand inertia (most recent first)
 * @param ecologyShift Gray customer percentage bonus from P1-10 (0.0 - 0.40)
 * @returns Array of MarketPurchaseRequest, each with a unique tag and fulfilled: false
 */
export function generateDailyPurchaseRequests(
  count: number,
  tagHistory: ItemTag[] = [],
  ecologyShift: number = 0
): MarketPurchaseRequest[] {
  const tradeableTags = getTradeableTags();

  // Ensure we don't try to generate more requests than available tags
  const numRequests = Math.min(count, tradeableTags.length);

  // v3.6 [BM-2]: Build weighted tag pool with demand inertia
  // Yesterday's tags (last N entries where N = previous day's request count) get bonus probability
  const yesterdayTags = new Set(tagHistory.slice(0, 8)); // Up to 8 tags from yesterday

  // P1-10: Gray tag set for ecology weighting
  const grayTagSet = new Set<ItemTag>(GRAY_TAGS);

  const selectedTags: ItemTag[] = [];
  const requests: MarketPurchaseRequest[] = [];

  for (let i = 0; i < numRequests; i++) {
    // Build weighted selection from remaining tags
    const availableTags = tradeableTags.filter(t => !selectedTags.includes(t));
    const weights = availableTags.map(tag => {
      const base = 1.0;
      const inertiaBonus = yesterdayTags.has(tag) ? DEMAND_INERTIA_BONUS : 0;
      // P1-10: Gray tags get extra weight based on ecology shift
      const ecologyBonus = grayTagSet.has(tag) ? ecologyShift * 2 : 0;
      return base + inertiaBonus + ecologyBonus;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;

    let tag = availableTags[0]; // fallback
    for (let j = 0; j < availableTags.length; j++) {
      roll -= weights[j];
      if (roll <= 0) {
        tag = availableTags[j];
        break;
      }
    }

    selectedTags.push(tag);

    // Random multiplier between PURCHASE_PRICE_MIN and PURCHASE_PRICE_MIN + PURCHASE_PRICE_RANGE
    const priceMultiplier = GAME_CONFIG.BLACKMARKET.PURCHASE_PRICE_MIN + Math.random() * GAME_CONFIG.BLACKMARKET.PURCHASE_PRICE_RANGE;

    requests.push({
      tag,
      priceMultiplier: Math.round(priceMultiplier * 100) / 100,
      fulfilled: false
    });
  }

  return requests;
}

/**
 * Generate random sale multiplier range for the day
 * Returns { min, max } in range 0.60-0.85
 */
export function generateDailySaleMultipliers(): { min: number; max: number } {
  // Min is SALE_MULTIPLIER_MIN_BASE +/- range, Max is SALE_MULTIPLIER_MAX_BASE +/- range
  const min = GAME_CONFIG.BLACKMARKET.SALE_MULTIPLIER_MIN_BASE + Math.random() * GAME_CONFIG.BLACKMARKET.SALE_MULTIPLIER_MIN_RANGE;
  const max = GAME_CONFIG.BLACKMARKET.SALE_MULTIPLIER_MAX_BASE + Math.random() * GAME_CONFIG.BLACKMARKET.SALE_MULTIPLIER_MAX_RANGE;

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100
  };
}

/**
 * Get the daily purchase limit based on black market upgrade level
 * @param upgradeLevel The black market contact upgrade level (0-5)
 */
export function getDailyPurchaseLimit(upgradeLevel: number): number {
  if (upgradeLevel <= 0) return 3; // Default if not unlocked (shouldn't happen)
  const config = BLACK_MARKET_LEVELS.find(l => l.level === upgradeLevel);
  return config?.dailyPurchaseLimit ?? 3;
}

/**
 * Get the purchase price bonus based on black market upgrade level
 * @param upgradeLevel The black market contact upgrade level (0-5)
 * @returns Bonus multiplier (e.g., 0.05 for +5%)
 */
export function getPurchasePriceBonus(upgradeLevel: number): number {
  if (upgradeLevel <= 0) return 0;
  const config = BLACK_MARKET_LEVELS.find(l => l.level === upgradeLevel);
  return config?.purchasePriceBonus ?? 0;
}

/**
 * Get the heat decay rate based on black market upgrade level
 * @param upgradeLevel The black market contact upgrade level (0-5)
 */
export function getHeatDecayRate(upgradeLevel: number): number {
  if (upgradeLevel <= 0) return 1; // Default decay
  const config = BLACK_MARKET_LEVELS.find(l => l.level === upgradeLevel);
  return config?.heatDecay ?? 1;
}

/**
 * Generate a fresh daily state
 * v3.6: Now accepts tagHistory for demand inertia and lastRiskEvent for sale penalty
 * P1-10: Now accepts ecologyShift for gray tag weighting
 * @param upgradeLevel Optional black market contact upgrade level (defaults to 1)
 * @param tagHistory Recent tag history for demand inertia
 * @param salePenaltyPercent Sale price penalty from previous risk event (e.g., undercover visit)
 * @param ecologyShift Gray customer percentage bonus from P1-10 (0.0 - 0.40)
 */
export function generateDailyBlackmarketState(
  upgradeLevel: number = 1,
  tagHistory: ItemTag[] = [],
  salePenaltyPercent: number = 0,
  ecologyShift: number = 0
): BlackmarketDailyState {
  const { min, max } = generateDailySaleMultipliers();
  const purchaseLimit = getDailyPurchaseLimit(upgradeLevel);

  // v3.6 [BM-2]: Pass tagHistory for demand inertia
  // P1-10: Pass ecologyShift for gray tag weighting
  const purchaseRequests = generateDailyPurchaseRequests(purchaseLimit, tagHistory, ecologyShift);

  // v3.6 [BM-1]: Select one tag to reveal to news system (100% accurate)
  const revealedTag = purchaseRequests.length > 0
    ? purchaseRequests[Math.floor(Math.random() * purchaseRequests.length)].tag
    : null;

  return {
    purchaseRequests,
    saleMultiplierMin: min,
    saleMultiplierMax: max,
    revealedTag,
    salePenaltyPercent
  };
}

// ============================================================================
// Price Calculation
// ============================================================================

/**
 * Calculate price for selling to market purchase (high price track)
 * C': Item uncertainty affects purchase precision modifier.
 * #24: News sentiment applies +/-5% modifier.
 * @param item The item being sold
 * @param purchaseRequest The market's purchase request
 * @param underworldRep Player's Underworld reputation
 * @param upgradeLevel Optional black market upgrade level for price bonus (default 1)
 * @param newsSentiment Optional news sentiment multiplier from getNewsSentimentModifier (default 1.0)
 */
export function calculatePurchasePrice(
  item: Item,
  purchaseRequest: MarketPurchaseRequest,
  underworldRep: number,
  upgradeLevel: number = 1,
  newsSentiment: number = 1.0
): number {
  const basePrice = item.realValue;
  const marketMultiplier = purchaseRequest.priceMultiplier;
  const { commission } = getUnderworldCommission(underworldRep);
  const priceBonus = getPurchasePriceBonus(upgradeLevel);

  // C': Apply precision modifier (buyer penalizes high uncertainty)
  const uncertainty = item.uncertainty ?? 0.3;
  const precisionMod = getBlackmarketPurchaseModifier(uncertainty);

  // Final price = realValue * marketMultiplier * (1 + priceBonus) * (1 - commission) * precisionMod * newsSentiment
  const finalPrice = basePrice * marketMultiplier * (1 + priceBonus) * (1 - commission) * precisionMod * newsSentiment;

  return Math.floor(finalPrice);
}

/**
 * Calculate price for player-initiated sale (low price track)
 * C': Item uncertainty affects price volatility via per-item offset.
 * #24: News sentiment applies +/-5% modifier.
 * @param item The item being sold
 * @param saleMultiplier The day's sale multiplier (random within min-max range)
 * @param underworldRep Player's Underworld reputation
 * @param day Optional current game day (for deterministic per-item volatility)
 * @param newsSentiment Optional news sentiment multiplier from getNewsSentimentModifier (default 1.0)
 */
export function calculateSalePrice(
  item: Item,
  saleMultiplier: number,
  underworldRep: number,
  day?: number,
  newsSentiment: number = 1.0
): number {
  const basePrice = item.realValue;
  const { commission } = getUnderworldCommission(underworldRep);

  // C': Apply per-item volatility offset based on uncertainty
  const uncertainty = item.uncertainty ?? 0.3;
  const [offsetLow, offsetHigh] = getBlackmarketVolatilityRange(uncertainty);
  // Deterministic random offset per item+day
  const seed = `bm-volatility-${item.id}-${day ?? 0}`;
  const rand = seededRandom(seed);
  const volatilityOffset = offsetLow + rand * (offsetHigh - offsetLow);

  // Final price = realValue * (saleMultiplier + volatilityOffset) * (1 - commission) * newsSentiment
  const effectiveMultiplier = Math.max(0.1, saleMultiplier + volatilityOffset);
  const finalPrice = basePrice * effectiveMultiplier * (1 - commission) * newsSentiment;

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
 * @param currentHeat Current heat level
 * @param upgradeLevel Optional black market upgrade level for decay rate (default 1)
 */
export function applyHeatDecay(currentHeat: number, upgradeLevel: number = 1): number {
  const decayRate = getHeatDecayRate(upgradeLevel);
  return Math.max(0, currentHeat - decayRate);
}

/**
 * Check for and generate risk event based on current heat
 * @param heat Current heat level (0-10)
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
 * v3.6 [BM-4]: UNDERCOVER_VISIT now has "teeth" - sale penalty + suspended heat decay
 */
function generateRiskEvent(type: RiskEventType): RiskEvent {
  switch (type) {
    case 'UNDERCOVER_VISIT':
      return {
        type: 'UNDERCOVER_VISIT',
        message: '联系人发来消息："今晚有眼睛盯着，暂时别动。"',
        suspendHeatDecay: true,  // v3.6 [#31]: Next day heat does not decay
        salePenalty: GAME_CONFIG.BLACKMARKET.UNDERCOVER_SALE_PENALTY  // v3.6 [#31]: Next day sale price penalty
      };

    case 'SEARCH_WARNING': {
      const penalty = GAME_CONFIG.BLACKMARKET.SEARCH_PENALTY_BASE + Math.floor(Math.random() * GAME_CONFIG.BLACKMARKET.SEARCH_PENALTY_RANGE);
      return {
        type: 'SEARCH_WARNING',
        message: `联系人发来消息："有人查到你头上了。要么破财消灾，要么躲一阵。"`,
        penalty,
        lockDays: GAME_CONFIG.BLACKMARKET.SEARCH_LOCK_DAYS
      };
    }

    case 'FORMAL_INVESTIGATION':
      return {
        type: 'FORMAL_INVESTIGATION',
        message: '一封官方信函塞进了门缝："根据举报，您的店铺涉嫌参与非法交易。即日起，相关业务暂停接受调查。"',
        lockDays: GAME_CONFIG.BLACKMARKET.INVESTIGATION_LOCK_DAYS,
        reputationLoss: Math.abs(GAME_CONFIG.BLACKMARKET.INVESTIGATION_REP_LOSS)
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
 * v3.6: Now handles demand inertia, heat decay suspension, low heat rewards,
 *        undercover visit aftermath, moral echoes, and Lv3+ preview
 * P1-10: Now accepts innocence for customer ecology shift
 * @param state Current blackmarket state
 * @param currentDay Current game day
 * @param upgradeLevel Optional black market upgrade level (default 1)
 * @param innocence Player's current innocence (for P1-10 ecology shift, default 100)
 */
export function processEndOfDay(
  state: BlackmarketState,
  currentDay: number,
  upgradeLevel: number = 1,
  innocence: number = 100
): { newState: BlackmarketState; riskEvent: RiskEvent | null } {
  // v3.6 [BM-4]: Check if heat decay is suspended (from undercover visit)
  let newHeat: number;
  if (state.heatDecaySuspended) {
    // Skip heat decay for this day
    newHeat = state.heat;
  } else {
    // Apply heat decay (rate depends on upgrade level)
    newHeat = applyHeatDecay(state.heat, upgradeLevel);
  }

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

  // v3.6 [BM-2]: Update tag history with today's purchase tags
  const todayTags = state.daily.purchaseRequests.map(r => r.tag);
  const newTagHistory = [...todayTags, ...state.tagHistory].slice(0, 24); // Keep ~3 days of history

  // v3.6 [BM-4]: Determine next day sale penalty from risk event
  const salePenaltyPercent = riskEvent?.salePenalty ?? 0;

  // v3.6 [BM-4]: Determine if next day heat decay should be suspended
  const nextHeatDecaySuspended = riskEvent?.suspendHeatDecay ?? false;

  // Generate new daily state with demand inertia and ecology shift
  const ecologyShift = getCustomerEcologyShift(innocence);
  const newDaily = generateDailyBlackmarketState(upgradeLevel, newTagHistory, salePenaltyPercent, ecologyShift);

  // v3.6 [BM-2]: Lv3+ next day preview tag
  const nextDayPreviewTag = upgradeLevel >= 3 && newDaily.purchaseRequests.length > 0
    ? newDaily.purchaseRequests[Math.floor(Math.random() * newDaily.purchaseRequests.length)].tag
    : null;

  // v3.6 [BM-7]: Track low heat reward
  const newLowHeatReward = updateLowHeatReward(state.lowHeatReward, newHeat);

  // v3.6 [BM-10]: Process pending moral echoes (remove expired ones)
  const newMoralEchoes = state.pendingMoralEchoes.filter(
    echo => echo.day + echo.delay > currentDay
  );

  return {
    newState: {
      ...state,
      heat: newHeat,
      isLocked: finalLocked,
      lockUntilDay: finalLockUntilDay,
      daily: newDaily,
      todaySales: [],
      lastRiskEvent: riskEvent,
      tagHistory: newTagHistory,
      nextDayPreviewTag,
      heatDecaySuspended: nextHeatDecaySuspended,
      lowHeatReward: newLowHeatReward,
      pendingMoralEchoes: newMoralEchoes
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

// ============================================================================
// v3.6 [BM-3]: Market Indicator Calculation
// ============================================================================

/**
 * Calculate market trend indicators based on tag history
 * Shows RISING if a tag appeared more frequently in recent days,
 * FALLING if less, STABLE otherwise
 */
export function calculateMarketIndicators(
  currentTags: ItemTag[],
  tagHistory: ItemTag[]
): MarketIndicator[] {
  return currentTags.map(tag => {
    // Count recent appearances (last 2 days worth of tags)
    const recentCount = tagHistory.slice(0, 16).filter(t => t === tag).length;
    // Count older appearances
    const olderCount = tagHistory.slice(16).filter(t => t === tag).length;

    let trend: 'RISING' | 'STABLE' | 'FALLING';
    if (recentCount > olderCount + 1) {
      trend = 'RISING';
    } else if (recentCount < olderCount) {
      trend = 'FALLING';
    } else {
      trend = 'STABLE';
    }

    // Confidence based on data availability
    const confidence = Math.min(1, tagHistory.length / 16);

    return { tag, trend, confidence };
  });
}

// ============================================================================
// v3.6 [BM-5]: Narrative Risk Descriptions
// ============================================================================

/**
 * Get narrative risk description for current heat level
 * v3.6 [#34]: Replaces percentage display in UI
 */
export function getNarrativeRiskDescription(heat: number): {
  narrativeDescription: string;
  color: string;
  displayName: string;
} {
  const config = getHeatConfig(heat);
  return {
    narrativeDescription: config.narrativeDescription,
    color: config.color,
    displayName: config.displayName
  };
}

// ============================================================================
// v3.6 [BM-6]: Risk Clue Generation
// ============================================================================

const RISK_CLUE_TEMPLATES: { risk: 'LOW' | 'MEDIUM' | 'HIGH'; clues: string[] }[] = [
  {
    risk: 'LOW',
    clues: [
      '有批货需要放几天。不急，随便什么时候都行。',
      '老朋友托我带句话，顺便放个东西。',
      '帮忙存个小包裹，过两天有人来取。'
    ]
  },
  {
    risk: 'MEDIUM',
    clues: [
      '老朋友托我转交。说是祖传的东西。',
      '有个急活，今天之内帮忙处理一下。',
      '这东西来路不太清楚，但应该没问题。'
    ]
  },
  {
    risk: 'HIGH',
    clues: [
      '这个包裹今晚必须到位。别问，别看。',
      '有人盯上了一批货。你只管收着，什么都别说。',
      '这事搞砸了后果很严重。你懂的。'
    ]
  }
];

/**
 * Generate risk clues for a dangerous task
 * v3.6 [#37]: Provides readable clues instead of binary info
 */
export function generateRiskClues(actualRisk: 'LOW' | 'MEDIUM' | 'HIGH'): RiskClue[] {
  const template = RISK_CLUE_TEMPLATES.find(t => t.risk === actualRisk);
  if (!template) return [];

  // Pick 1-2 clues
  const clueCount = actualRisk === 'HIGH' ? 2 : 1;
  const shuffled = [...template.clues].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, clueCount).map(text => ({
    text,
    impliedRisk: actualRisk
  }));
}

// ============================================================================
// v3.6 [BM-7]: Low Heat Reward System
// ============================================================================

const LOW_HEAT_REWARD_THRESHOLD = GAME_CONFIG.BLACKMARKET.LOW_HEAT_SAFE_DAYS; // Consecutive safe days needed

/**
 * Update low heat reward state based on current heat
 */
export function updateLowHeatReward(
  current: LowHeatRewardState,
  heat: number
): LowHeatRewardState {
  const level = getHeatLevel(heat);

  if (level === 'SAFE') {
    const newDays = current.consecutiveSafeDays + 1;
    if (newDays >= LOW_HEAT_REWARD_THRESHOLD && !current.rewardActive) {
      // Activate reward
      const rewardTypes: LowHeatRewardType[] = ['PRICE_BONUS', 'EXTRA_INTEL', 'CONTACT_FAVOR'];
      const rewardType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
      return {
        consecutiveSafeDays: newDays,
        rewardActive: true,
        rewardType
      };
    }
    return {
      ...current,
      consecutiveSafeDays: newDays
    };
  }

  // Heat rose above safe -> reset
  return {
    consecutiveSafeDays: 0,
    rewardActive: false,
    rewardType: null
  };
}

/**
 * Get the purchase price bonus from low heat reward (if active)
 */
export function getLowHeatPriceBonus(reward: LowHeatRewardState): number {
  if (reward.rewardActive && reward.rewardType === 'PRICE_BONUS') {
    return GAME_CONFIG.BLACKMARKET.LOW_HEAT_PRICE_BONUS; // purchase price bonus
  }
  return 0;
}

// ============================================================================
// v3.6 [BM-8]: Protection Fee System
// ============================================================================

/**
 * Calculate current protection fee amount
 * Formula: baseAmount * (1 + 0.15 * timesPaid)
 */
export function calculateProtectionFee(feeState: ProtectionFeeState): number {
  return Math.round(feeState.baseAmount * (1 + GAME_CONFIG.BLACKMARKET.PROTECTION_FEE_GROWTH_RATE * feeState.timesPaid));
}

/**
 * Check if protection fee should be requested
 * Triggers when innocence <= 40 and not in cooldown
 */
export function shouldRequestProtectionFee(
  innocence: number,
  feeState: ProtectionFeeState,
  currentDay: number
): boolean {
  if (innocence > GAME_CONFIG.BLACKMARKET.PROTECTION_FEE_INNOCENCE_THRESHOLD) return false;
  if (feeState.cooldownUntilDay > currentDay) return false;
  // Request every N days
  if (feeState.lastRequestDay > 0 && currentDay - feeState.lastRequestDay < GAME_CONFIG.BLACKMARKET.PROTECTION_FEE_REQUEST_INTERVAL) return false;
  return true;
}

/**
 * Process protection fee payment
 */
export function payProtectionFee(feeState: ProtectionFeeState, currentDay: number): ProtectionFeeState {
  return {
    ...feeState,
    timesPaid: feeState.timesPaid + 1,
    lastRequestDay: currentDay
  };
}

/**
 * Process protection fee refusal
 * v3.6 [#41]: Refusal triggers cooldown period with accelerated heat decay
 */
export function refuseProtectionFee(feeState: ProtectionFeeState, currentDay: number): ProtectionFeeState {
  return {
    ...feeState,
    timesRefused: feeState.timesRefused + 1,
    cooldownUntilDay: currentDay + GAME_CONFIG.BLACKMARKET.PROTECTION_FEE_REFUSAL_COOLDOWN,
    lastRequestDay: currentDay
  };
}

/**
 * Check if in protection fee cooldown period (post-refusal effects)
 * During cooldown: purchase limit -1, heat decay +1/day
 */
export function isInProtectionCooldown(feeState: ProtectionFeeState, currentDay: number): boolean {
  return feeState.cooldownUntilDay > currentDay;
}

// ============================================================================
// News Sentiment Modifier (#24)
// ============================================================================

/**
 * Calculate a price modifier based on active news sentiment.
 * Positive news (price_up tags / positive percentage effects) => +5% bonus
 * Negative news (price_down tags / negative percentage effects) => -5% penalty
 * Neutral or mixed => 0
 *
 * @param activeNews Current active news instances
 * @returns Multiplier (e.g., 1.05 for positive, 0.95 for negative, 1.0 for neutral)
 */
export function getNewsSentimentModifier(activeNews: ActiveNewsInstance[]): number {
  if (!activeNews || activeNews.length === 0) return 1.0;

  let sentimentScore = 0;

  for (const news of activeNews) {
    // Check tags for sentiment signals
    const tags = news.tags || [];
    if (tags.includes('price_up')) sentimentScore += 1;
    if (tags.includes('price_down')) sentimentScore -= 1;

    // Check effects for price-related modifiers
    for (const effect of (news.effects || [])) {
      if (effect.targetSystem === 'appraisal' && effect.parameter.endsWith('_price')) {
        if (effect.modifierType === 'PERCENTAGE') {
          sentimentScore += Math.sign(effect.modifier);
        }
      }
    }
  }

  const mod = GAME_CONFIG.BLACKMARKET.NEWS_SENTIMENT_MODIFIER;
  if (sentimentScore > 0) return 1 + mod;
  if (sentimentScore < 0) return 1 - mod;
  return 1.0;
}

// ============================================================================
// Market Trend Indicator (#53)
// ============================================================================

export type MarketTrendLevel = 'LOW' | 'NORMAL' | 'HIGH';

/**
 * Get overall market trend based on active news sentiment.
 * Returns a simple trend level for UI display.
 *
 * @param activeNews Current active news instances
 * @returns 'LOW' | 'NORMAL' | 'HIGH'
 */
export function getMarketTrend(activeNews: ActiveNewsInstance[]): MarketTrendLevel {
  const modifier = getNewsSentimentModifier(activeNews);
  if (modifier > 1.0) return 'HIGH';
  if (modifier < 1.0) return 'LOW';
  return 'NORMAL';
}

// ============================================================================
// v3.6 [BM-10]: Moral Echo System
// ============================================================================

// ============================================================================
// Counterfeit Sale Flow
// ============================================================================

/**
 * Result of a counterfeit sale attempt.
 * Used by the reducer to apply state changes and by UI to display results.
 */
export interface CounterfeitSaleResult {
  /** Final price received (after detection penalty if applicable) */
  finalPrice: number;
  /** Whether the counterfeit was detected by the contact */
  detected: boolean;
  /** Detection probability that was rolled against */
  detectionRate: number;
  /** Reputation changes to apply */
  reputationDelta: {
    innocence: number;
    credibility: number;
  };
  /** Heat increase to apply */
  heatDelta: number;
  /** Updated notoriety state (totalSales +1, new detection rate) */
  updatedNotoriety: ForgeryNotorietyState;
}

/**
 * Execute a counterfeit sale through the black market.
 * Design doc §6.5: Counterfeit sale economic chain.
 *
 * Pricing: baseValue * valueMultiplier * saleMultiplier * (1 - commission) * detectionPenalty
 * Detection: probability = getDetectionRate(totalSales), detected => price * 0.50
 * Innocence: -4 per sale (INNOCENCE_COST_SALE)
 * Detection penalties: heat +3, credibility -3
 *
 * @param item The FORGED item being sold
 * @param saleMultiplier The day's sale multiplier (from daily blackmarket state)
 * @param underworldRep Player's underworld/innocence-mapped rep for commission
 * @param forgeryNotoriety Current forgery notoriety state
 * @param valueMultiplier The counterfeit value multiplier from the item's forging (e.g., x2.5-x4.0)
 */
export function executeCounterfeitSale(
  item: Item,
  saleMultiplier: number,
  underworldRep: number,
  forgeryNotoriety: ForgeryNotorietyState,
  valueMultiplier: number = 1.0
): CounterfeitSaleResult {
  const forgeryConfig = GAME_CONFIG.WORKSHOP.FORGERY;

  // Base price calculation: baseValue * valueMultiplier * saleMultiplier * (1 - commission)
  const baseValue = item.baseValue ?? item.realValue;
  const { commission } = getUnderworldCommission(underworldRep);
  let price = baseValue * valueMultiplier * saleMultiplier * (1 - commission);

  // Detection roll
  const detectionRate = getDetectionRate(forgeryNotoriety.totalCounterfeitSales);
  const detected = Math.random() < detectionRate;

  // Detection penalty: price * 0.50
  if (detected) {
    price *= forgeryConfig.DETECTED_PRICE_PENALTY;
  }

  const finalPrice = Math.floor(price);

  // Reputation changes
  const innocenceLoss = forgeryConfig.INNOCENCE_COST_SALE;  // -4
  const credibilityLoss = detected ? forgeryConfig.DETECTED_CREDIBILITY_LOSS : 0;  // -3 if detected

  // Heat changes
  const heatDelta = detected ? forgeryConfig.DETECTED_HEAT_INCREASE : 2;  // +3 if detected, +2 base (player sale track)

  // Advance notoriety
  const updatedNotoriety = advanceNotoriety(forgeryNotoriety);

  return {
    finalPrice,
    detected,
    detectionRate,
    reputationDelta: {
      innocence: innocenceLoss,
      credibility: credibilityLoss,
    },
    heatDelta,
    updatedNotoriety,
  };
}

/**
 * Execute counterfeit detection for a purchase order (收购订单).
 * When a FORGED item fulfills a purchase request, detection still applies.
 * Design doc §6.5: "收购订单：伪造品通过收购订单出售时，鉴伪概率同样为 33% 上限"
 *
 * @param item The FORGED item being sold via purchase order
 * @param purchaseRequest The matching purchase request
 * @param underworldRep Player's rep for commission
 * @param forgeryNotoriety Current notoriety state
 * @param upgradeLevel Black market upgrade level
 * @param valueMultiplier The counterfeit value multiplier
 */
export function executeCounterfeitPurchaseOrder(
  item: Item,
  purchaseRequest: MarketPurchaseRequest,
  underworldRep: number,
  forgeryNotoriety: ForgeryNotorietyState,
  upgradeLevel: number = 1,
  valueMultiplier: number = 1.0
): CounterfeitSaleResult {
  const forgeryConfig = GAME_CONFIG.WORKSHOP.FORGERY;

  // Purchase order price uses the purchase price track with counterfeit multiplier
  const baseValue = item.baseValue ?? item.realValue;
  const marketMultiplier = purchaseRequest.priceMultiplier;
  const { commission } = getUnderworldCommission(underworldRep);
  const priceBonus = getPurchasePriceBonus(upgradeLevel);

  let price = baseValue * valueMultiplier * marketMultiplier * (1 + priceBonus) * (1 - commission);

  // Detection roll (same mechanics as direct sale)
  const detectionRate = getDetectionRate(forgeryNotoriety.totalCounterfeitSales);
  const detected = Math.random() < detectionRate;

  if (detected) {
    price *= forgeryConfig.DETECTED_PRICE_PENALTY;
  }

  const finalPrice = Math.floor(price);

  const innocenceLoss = forgeryConfig.INNOCENCE_COST_SALE;
  const credibilityLoss = detected ? forgeryConfig.DETECTED_CREDIBILITY_LOSS : 0;
  const heatDelta = detected ? forgeryConfig.DETECTED_HEAT_INCREASE : 1; // +3 if detected, +1 base (purchase track)

  const updatedNotoriety = advanceNotoriety(forgeryNotoriety);

  return {
    finalPrice,
    detected,
    detectionRate,
    reputationDelta: {
      innocence: innocenceLoss,
      credibility: credibilityLoss,
    },
    heatDelta,
    updatedNotoriety,
  };
}

/**
 * Generate a moral echo effect from a black market transaction
 */
export function generateMoralEcho(
  action: 'NORMAL_SALE' | 'STOLEN_GOODS' | 'BREACH_SALE',
  innocence: number,
  currentDay: number
): MoralEchoBlackmarketEffect | null {
  // Only generate echoes for significant actions
  if (action === 'NORMAL_SALE' && innocence > 50) {
    return null; // Too clean to trigger echo on normal sale
  }

  let severity: number;
  let delay: number;

  switch (action) {
    case 'NORMAL_SALE':
      severity = 1;
      delay = 0; // Immediate (contact comment)
      break;
    case 'STOLEN_GOODS':
      severity = 2;
      delay = 1; // Next day news probability
      break;
    case 'BREACH_SALE':
      severity = 3;
      delay = 1; // Next day NPC mail
      break;
  }

  // Scale severity inversely with innocence
  // Low innocence = tone shifts from guilt to numbness
  if (innocence < 50) {
    severity = Math.max(1, severity - 1); // Reduced guilt, more numbness
  }

  return {
    type: action === 'BREACH_SALE' ? 'REPUTATION_LEAK'
      : action === 'STOLEN_GOODS' ? 'RISK_ESCALATION'
      : 'HEAT_INCREASE',
    severity,
    delay,
    sourceAction: action,
    day: currentDay
  };
}
