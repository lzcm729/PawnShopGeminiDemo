/**
 * useBlackmarket Hook
 *
 * React hook for black market operations.
 * Provides high-level transaction methods and state queries.
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { Item } from '../types';
import { ReputationType } from '../systems/core/types';
import {
  MarketPurchaseRequest,
  getHeatLevel,
  getHeatConfig,
  getUnderworldPriceModifier
} from '../systems/blackmarket/types';
import {
  calculatePurchasePrice,
  calculateSalePrice,
  getRandomSaleMultiplier,
  isEligibleForPurchase,
  isEligibleForSale,
  getEligibleItemsForPurchase,
  getEligibleItemsForSale,
  getHeatGain
} from '../systems/blackmarket/blackmarketService';

export const useBlackmarket = () => {
  const { state, dispatch } = useGame();
  const { blackmarket, inventory, reputation } = state;
  const underworldRep = reputation[ReputationType.UNDERWORLD];

  // ========================================================================
  // Computed State
  // ========================================================================

  /**
   * Current heat level info
   */
  const heatInfo = useMemo(() => {
    const level = getHeatLevel(blackmarket.heat);
    const config = getHeatConfig(blackmarket.heat);
    return {
      level,
      heat: blackmarket.heat,
      riskPercent: config.riskPercent,
      displayName: config.displayName,
      description: config.description
    };
  }, [blackmarket.heat]);

  /**
   * Reputation price modifier info
   */
  const repModifier = useMemo(() => {
    return getUnderworldPriceModifier(underworldRep);
  }, [underworldRep]);

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
   * Can still purchase today (under limit)
   */
  const canPurchase = useMemo(() => {
    return blackmarket.daily.purchasedCount < blackmarket.daily.purchaseLimit;
  }, [blackmarket.daily.purchasedCount, blackmarket.daily.purchaseLimit]);

  /**
   * Remaining purchase slots for today
   */
  const remainingPurchaseSlots = useMemo(() => {
    return blackmarket.daily.purchaseLimit - blackmarket.daily.purchasedCount;
  }, [blackmarket.daily.purchaseLimit, blackmarket.daily.purchasedCount]);

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

  // ========================================================================
  // Price Calculation
  // ========================================================================

  /**
   * Get price for selling item to market purchase request
   */
  const getPurchasePrice = useCallback((item: Item, request: MarketPurchaseRequest): number => {
    return calculatePurchasePrice(item, request, underworldRep);
  }, [underworldRep]);

  /**
   * Get price for player-initiated sale
   */
  const getSalePrice = useCallback((item: Item): number => {
    const multiplier = getRandomSaleMultiplier(blackmarket.daily);
    return calculateSalePrice(item, multiplier, underworldRep);
  }, [blackmarket.daily, underworldRep]);

  /**
   * Get estimated sale price range
   */
  const getSalePriceRange = useCallback((item: Item): { min: number; max: number } => {
    const { saleMultiplierMin, saleMultiplierMax } = blackmarket.daily;
    const { modifier } = getUnderworldPriceModifier(underworldRep);

    return {
      min: Math.floor(item.realValue * saleMultiplierMin * (1 + modifier)),
      max: Math.floor(item.realValue * saleMultiplierMax * (1 + modifier))
    };
  }, [blackmarket.daily, underworldRep]);

  // ========================================================================
  // Transactions
  // ========================================================================

  /**
   * Sell item to market purchase request (high price track)
   */
  const sellToPurchase = useCallback((item: Item, request: MarketPurchaseRequest) => {
    if (!isMarketOpen) return;
    if (!canPurchase) return;
    if (!isEligibleForPurchase(item, request)) return;

    const price = calculatePurchasePrice(item, request, underworldRep);
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
  }, [isMarketOpen, canPurchase, underworldRep, dispatch]);

  /**
   * Sell item via player sale track (low price track)
   */
  const sellDirect = useCallback((item: Item) => {
    if (!isMarketOpen) return;
    if (!isEligibleForSale(item)) return;

    const multiplier = getRandomSaleMultiplier(blackmarket.daily);
    const price = calculateSalePrice(item, multiplier, underworldRep);
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
  }, [isMarketOpen, blackmarket.daily, underworldRep, dispatch]);

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
    repModifier,
    isMarketOpen,
    daysUntilReopen,
    canPurchase,
    remainingPurchaseSlots,

    // Item queries
    getEligibleItems,
    getSellableItems,
    checkEligibility,
    checkSellable,

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
