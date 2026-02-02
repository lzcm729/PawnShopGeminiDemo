/**
 * Black Market System
 *
 * The black market is the ONLY item monetization channel in the game.
 * Uses a dual-track trading model:
 * - Market Purchases: Daily limited tags, higher prices (110-140%)
 * - Player Sales: Any item, lower prices (60-85%)
 */

// Type exports
export * from './types';

// Service exports
export {
  // Daily generation
  generateDailyPurchaseRequests,
  generateDailySaleMultipliers,
  generateDailyBlackmarketState,
  createInitialBlackmarketState,

  // Price calculation
  calculatePurchasePrice,
  calculateSalePrice,
  getRandomSaleMultiplier,

  // Item eligibility
  isEligibleForPurchase,
  isEligibleForSale,
  getEligibleItemsForPurchase,
  getEligibleItemsForSale,

  // Heat management
  getHeatGain,
  applyHeatDecay,
  checkRiskEvent,

  // State management
  processEndOfDay,
  processStartOfDay
} from './blackmarketService';
