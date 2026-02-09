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

  // Upgrade-based helpers
  getDailyPurchaseLimit,
  getPurchasePriceBonus,
  getHeatDecayRate,

  // State management
  processEndOfDay,
  processStartOfDay,

  // v3.6 [BM-3]: Market indicators
  calculateMarketIndicators,

  // v3.6 [BM-5]: Narrative risk descriptions
  getNarrativeRiskDescription,

  // v3.6 [BM-6]: Risk clue generation
  generateRiskClues,

  // v3.6 [BM-7]: Low heat rewards
  updateLowHeatReward,
  getLowHeatPriceBonus,

  // v3.6 [BM-8]: Protection fee system
  calculateProtectionFee,
  shouldRequestProtectionFee,
  payProtectionFee,
  refuseProtectionFee,
  isInProtectionCooldown,
  getRefusalRiskBonus,

  // v3.6 [BM-10]: Moral echo system
  generateMoralEcho,

  // P1-10: Customer ecology shift
  getCustomerEcologyShift
} from './blackmarketService';
