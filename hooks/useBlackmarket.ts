/**
 * useBlackmarket Hook
 *
 * React hook for black market operations.
 * Provides high-level transaction methods and state queries.
 * v3.6: Added market indicators, narrative risk, low heat rewards,
 *        protection fee, moral echo, and Lv3+ preview support.
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { Item } from '../types';
import { ReputationType } from '../systems/core/types';
import {
  MarketPurchaseRequest,
  getHeatLevel,
  getHeatConfig,
  getUnderworldCommission,
  MarketIndicator,
  LowHeatRewardState
} from '../systems/blackmarket/types';
import {
  calculatePurchasePrice,
  calculateSalePrice,
  getRandomSaleMultiplier,
  isEligibleForPurchase,
  isEligibleForSale,
  isSaleBreach,
  getEligibleItemsForPurchase,
  getEligibleItemsForSale,
  getHeatGain,
  getBreachCompensation,
  calculateSaleProfit,
  getHeatDecayRate,
  getPurchasePriceBonus,
  calculateMarketIndicators,
  getNarrativeRiskDescription,
  getLowHeatPriceBonus,
  calculateProtectionFee,
  shouldRequestProtectionFee,
  isInProtectionCooldown,
  getNewsSentimentModifier,
  getMarketTrend
} from '../systems/blackmarket/blackmarketService';
import { getBlackMarketContactLevel, getActiveBlackMarketConfig } from '../systems/upgrades';

export const useBlackmarket = () => {
  const { state, dispatch } = useGame();
  const { blackmarket, inventory, reputation, shopUpgrades } = state;
  // Black market trust is inversely proportional to innocence
  // Lower innocence = more trusted in the black market = better commission rates
  const blackMarketTrust = 100 - reputation[ReputationType.INNOCENCE];

  // #24: News sentiment modifier for black market prices
  const newsSentiment = useMemo(
    () => getNewsSentimentModifier(state.dailyNews || []),
    [state.dailyNews]
  );

  // #53: Market trend indicator for UI
  const marketTrend = useMemo(
    () => getMarketTrend(state.dailyNews || []),
    [state.dailyNews]
  );
  const innocence = reputation[ReputationType.INNOCENCE];
  const blackMarketLevel = getBlackMarketContactLevel(shopUpgrades);
  const blackMarketConfig = getActiveBlackMarketConfig(shopUpgrades);

  // ========================================================================
  // Computed State
  // ========================================================================

  /**
   * Current heat level info
   * v3.6 [BM-5]: Now includes narrative description and color
   */
  const heatInfo = useMemo(() => {
    const level = getHeatLevel(blackmarket.heat);
    const config = getHeatConfig(blackmarket.heat);
    const narrative = getNarrativeRiskDescription(blackmarket.heat);
    return {
      level,
      heat: blackmarket.heat,
      riskPercent: config.riskPercent, // Internal use only
      displayName: config.displayName,
      description: config.description,
      narrativeDescription: narrative.narrativeDescription,
      color: narrative.color,
      heatDecaySuspended: blackmarket.heatDecaySuspended
    };
  }, [blackmarket.heat, blackmarket.heatDecaySuspended]);

  /**
   * Commission rate info based on reputation
   * Higher reputation = lower commission = player keeps more money
   */
  const commissionInfo = useMemo(() => {
    const base = getUnderworldCommission(blackMarketTrust);
    return {
      ...base,
      currentRep: blackMarketTrust
    };
  }, [blackMarketTrust]);

  /**
   * Whether the market is currently accessible
   */
  const isMarketOpen = useMemo(() => {
    return !blackmarket.isLocked;
  }, [blackmarket.isLocked]);

  /**
   * Days until market reopens (0 if not locked)
   */
  const daysUntilReopen = useMemo(() => {
    if (!blackmarket.isLocked) return 0;
    return Math.max(0, blackmarket.lockUntilDay - state.stats.day);
  }, [blackmarket.isLocked, blackmarket.lockUntilDay, state.stats.day]);

  /**
   * Count of fulfilled purchase requests
   */
  const fulfilledCount = useMemo(() => {
    return blackmarket.daily.purchaseRequests.filter(req => req.fulfilled).length;
  }, [blackmarket.daily.purchaseRequests]);

  /**
   * Total number of purchase requests (equals daily limit)
   */
  const totalPurchaseRequests = useMemo(() => {
    return blackmarket.daily.purchaseRequests.length;
  }, [blackmarket.daily.purchaseRequests]);

  /**
   * Can still purchase today (has unfulfilled requests)
   */
  const canPurchase = useMemo(() => {
    return blackmarket.daily.purchaseRequests.some(req => !req.fulfilled);
  }, [blackmarket.daily.purchaseRequests]);

  /**
   * Remaining purchase slots for today
   */
  const remainingPurchaseSlots = useMemo(() => {
    return blackmarket.daily.purchaseRequests.filter(req => !req.fulfilled).length;
  }, [blackmarket.daily.purchaseRequests]);

  /**
   * Upgrade info for display
   */
  const upgradeInfo = useMemo(() => {
    const heatDecay = getHeatDecayRate(blackMarketLevel);
    const priceBonus = getPurchasePriceBonus(blackMarketLevel);
    return {
      level: blackMarketLevel,
      dailyLimit: totalPurchaseRequests,
      heatDecay,
      priceBonus,
      priceBonusPercent: Math.round(priceBonus * 100),
      hasPreview: blackMarketLevel >= 3 // v3.6 [BM-2]: Lv3+ preview
    };
  }, [blackMarketLevel, totalPurchaseRequests]);

  /**
   * v3.6 [BM-1]: Tag revealed to news system (100% accurate)
   */
  const revealedTag = useMemo(() => {
    return blackmarket.daily.revealedTag;
  }, [blackmarket.daily.revealedTag]);

  /**
   * v3.6 [BM-2]: Next day preview tag (Lv3+)
   */
  const nextDayPreviewTag = useMemo(() => {
    return blackMarketLevel >= 3 ? blackmarket.nextDayPreviewTag : null;
  }, [blackMarketLevel, blackmarket.nextDayPreviewTag]);

  /**
   * v3.6 [BM-3]: Market trend indicators
   */
  const marketIndicators = useMemo((): MarketIndicator[] => {
    const currentTags = blackmarket.daily.purchaseRequests.map(r => r.tag);
    return calculateMarketIndicators(currentTags, blackmarket.tagHistory);
  }, [blackmarket.daily.purchaseRequests, blackmarket.tagHistory]);

  /**
   * v3.6 [BM-7]: Low heat reward info
   */
  const lowHeatReward = useMemo((): LowHeatRewardState => {
    return blackmarket.lowHeatReward;
  }, [blackmarket.lowHeatReward]);

  /**
   * v3.6 [BM-8]: Protection fee info
   */
  const protectionFeeInfo = useMemo(() => {
    const currentAmount = calculateProtectionFee(blackmarket.protectionFee);
    const shouldRequest = shouldRequestProtectionFee(
      innocence, blackmarket.protectionFee, state.stats.day
    );
    const inCooldown = isInProtectionCooldown(blackmarket.protectionFee, state.stats.day);
    return {
      currentAmount,
      shouldRequest,
      inCooldown,
      timesPaid: blackmarket.protectionFee.timesPaid,
      timesRefused: blackmarket.protectionFee.timesRefused
    };
  }, [innocence, blackmarket.protectionFee, state.stats.day]);

  /**
   * v3.6 [BM-4]: Today's sale penalty from undercover visit
   */
  const salePenaltyPercent = useMemo(() => {
    return blackmarket.daily.salePenaltyPercent;
  }, [blackmarket.daily.salePenaltyPercent]);

  // ========================================================================
  // Item Queries
  // ========================================================================

  /**
   * Get items eligible for each purchase request
   */
  const getEligibleItems = useCallback((purchaseRequest: MarketPurchaseRequest): Item[] => {
    return getEligibleItemsForPurchase(inventory, purchaseRequest);
  }, [inventory]);

  /**
   * Get all items eligible for player sale
   */
  const getSellableItems = useCallback((): Item[] => {
    return getEligibleItemsForSale(inventory);
  }, [inventory]);

  /**
   * Check if an item has a better price available through unfulfilled purchase requests
   * Used to disable direct sale for items that should use purchase channel
   */
  const hasUnfulfilledPurchaseMatch = useCallback((item: Item): boolean => {
    const unfulfilledRequests = blackmarket.daily.purchaseRequests.filter(r => !r.fulfilled);
    return unfulfilledRequests.some(request => isEligibleForPurchase(item, request));
  }, [blackmarket.daily.purchaseRequests]);

  /**
   * Check if a specific item is eligible for a purchase request
   */
  const checkEligibility = useCallback((item: Item, request: MarketPurchaseRequest): boolean => {
    return isEligibleForPurchase(item, request);
  }, []);

  /**
   * Check if an item can be sold via player sale
   */
  const checkSellable = useCallback((item: Item): boolean => {
    return isEligibleForSale(item);
  }, []);

  /**
   * Check if selling this item would be a breach (violating pawn contract)
   * UI should warn player before selling ACTIVE items
   */
  const checkBreach = useCallback((item: Item): boolean => {
    return isSaleBreach(item);
  }, []);

  /**
   * Get the compensation amount for breach sale
   * Returns 0 if not a breach
   */
  const getCompensation = useCallback((item: Item): number => {
    return getBreachCompensation(item);
  }, []);

  /**
   * Calculate actual profit from a sale
   * For FORFEIT: salePrice - pawnAmount
   * For ACTIVE (breach): salePrice - compensation (200% of valuation)
   */
  const getProfit = useCallback((item: Item, salePrice: number): number => {
    return calculateSaleProfit(item, salePrice);
  }, []);

  // ========================================================================
  // Price Calculation
  // ========================================================================

  /**
   * Get price for selling item to market purchase request
   * v3.6 [BM-7]: Includes low heat reward bonus if active
   */
  const getPurchasePrice = useCallback((item: Item, request: MarketPurchaseRequest): number => {
    const lowHeatBonus = getLowHeatPriceBonus(blackmarket.lowHeatReward);
    // Apply low heat bonus on top of upgrade bonus
    const adjustedRequest = lowHeatBonus > 0
      ? { ...request, priceMultiplier: request.priceMultiplier + lowHeatBonus }
      : request;
    return calculatePurchasePrice(item, adjustedRequest, blackMarketTrust, blackMarketLevel, newsSentiment);
  }, [blackMarketTrust, blackMarketLevel, blackmarket.lowHeatReward, newsSentiment]);

  /**
   * Get price for player-initiated sale
   * v3.6 [BM-4]: Applies sale penalty from undercover visit
   */
  const getSalePrice = useCallback((item: Item): number => {
    const multiplier = getRandomSaleMultiplier(blackmarket.daily, item.id, state.stats.day);
    // v3.6 [BM-4]: Apply sale penalty
    const adjustedMultiplier = multiplier * (1 - blackmarket.daily.salePenaltyPercent);
    return calculateSalePrice(item, adjustedMultiplier, blackMarketTrust, state.stats.day, newsSentiment);
  }, [blackmarket.daily, blackMarketTrust, state.stats.day, newsSentiment]);

  /**
   * Get estimated sale price range
   */
  const getSalePriceRange = useCallback((item: Item): { min: number; max: number } => {
    const { saleMultiplierMin, saleMultiplierMax, salePenaltyPercent } = blackmarket.daily;
    const { commission } = getUnderworldCommission(blackMarketTrust);
    const penaltyFactor = 1 - salePenaltyPercent;

    return {
      min: Math.floor(item.realValue * saleMultiplierMin * penaltyFactor * (1 - commission) * newsSentiment),
      max: Math.floor(item.realValue * saleMultiplierMax * penaltyFactor * (1 - commission) * newsSentiment)
    };
  }, [blackmarket.daily, blackMarketTrust, newsSentiment]);

  // ========================================================================
  // Transactions
  // ========================================================================

  /**
   * Sell item to market purchase request (high price track)
   */
  const sellToPurchase = useCallback((item: Item, request: MarketPurchaseRequest) => {
    if (!isMarketOpen) return;
    if (request.fulfilled) return; // This specific request is already fulfilled
    if (!isEligibleForPurchase(item, request)) return;

    const price = calculatePurchasePrice(item, request, blackMarketTrust, blackMarketLevel, newsSentiment);
    const heatGain = getHeatGain(true);

    dispatch({
      type: 'BLACKMARKET_SELL_TO_PURCHASE',
      payload: {
        itemId: item.id,
        itemName: item.name,
        amount: price,
        tag: request.tag,
        heatGain
      }
    });
  }, [isMarketOpen, blackMarketTrust, blackMarketLevel, newsSentiment, dispatch]);

  /**
   * Sell item via player sale track (low price track)
   * Uses deterministic pricing based on item ID + current day
   */
  const sellDirect = useCallback((item: Item) => {
    if (!isMarketOpen) return;
    if (!isEligibleForSale(item)) return;

    const multiplier = getRandomSaleMultiplier(blackmarket.daily, item.id, state.stats.day);
    const adjustedMultiplier = multiplier * (1 - blackmarket.daily.salePenaltyPercent);
    const price = calculateSalePrice(item, adjustedMultiplier, blackMarketTrust, state.stats.day, newsSentiment);
    const heatGain = getHeatGain(false);

    dispatch({
      type: 'BLACKMARKET_SELL_DIRECT',
      payload: {
        itemId: item.id,
        itemName: item.name,
        amount: price,
        heatGain
      }
    });
  }, [isMarketOpen, blackmarket.daily, blackMarketTrust, state.stats.day, newsSentiment, dispatch]);

  /**
   * Pay fine to avoid market lockdown
   */
  const payFine = useCallback((amount: number) => {
    if (state.stats.cash < amount) return false;

    dispatch({
      type: 'BLACKMARKET_PAY_FINE',
      payload: { amount }
    });

    return true;
  }, [state.stats.cash, dispatch]);

  /**
   * Accept lockdown (decline to pay fine)
   */
  const acceptLockdown = useCallback((lockDays: number) => {
    dispatch({
      type: 'BLACKMARKET_ACCEPT_LOCKDOWN',
      payload: { lockDays }
    });
  }, [dispatch]);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    // State
    blackmarket,
    heatInfo,
    commissionInfo,
    isMarketOpen,
    daysUntilReopen,
    canPurchase,
    remainingPurchaseSlots,
    fulfilledCount,
    totalPurchaseRequests,
    upgradeInfo,

    // v3.6 new state
    revealedTag,
    nextDayPreviewTag,
    marketIndicators,
    lowHeatReward,
    protectionFeeInfo,
    salePenaltyPercent,

    // #24/#53: News-driven market state
    newsSentiment,
    marketTrend,

    // Item queries
    getEligibleItems,
    getSellableItems,
    hasUnfulfilledPurchaseMatch,
    checkEligibility,
    checkSellable,
    checkBreach,
    getCompensation,
    getProfit,

    // Price calculation
    getPurchasePrice,
    getSalePrice,
    getSalePriceRange,

    // Transactions
    sellToPurchase,
    sellDirect,
    payFine,
    acceptLockdown
  };
};
