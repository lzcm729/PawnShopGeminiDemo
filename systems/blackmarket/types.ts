/**
 * Black Market System Types
 *
 * The black market is the ONLY item monetization channel in the game.
 * It uses a dual-track trading model:
 * - Market Purchases: Daily limited tags, higher prices (110-140%)
 * - Player Sales: Any item, lower prices (60-85%)
 */

import { ItemTag } from '../items/tags';

// ============================================================================
// Heat Level System
// ============================================================================

/**
 * Heat level determines police risk
 */
export type HeatLevel = 'SAFE' | 'WATCHED' | 'WARNING' | 'DANGER';

/**
 * Heat level thresholds and risk probabilities
 */
export interface HeatConfig {
  level: HeatLevel;
  minHeat: number;
  maxHeat: number;
  riskPercent: number;
  displayName: string;
  description: string;
}

export const HEAT_LEVELS: HeatConfig[] = [
  { level: 'SAFE', minHeat: 0, maxHeat: 2, riskPercent: 0, displayName: '安全', description: '无警方关注' },
  { level: 'WATCHED', minHeat: 3, maxHeat: 5, riskPercent: 15, displayName: '关注', description: '有人在打听' },
  { level: 'WARNING', minHeat: 6, maxHeat: 8, riskPercent: 30, displayName: '警告', description: '便衣出没' },
  { level: 'DANGER', minHeat: 9, maxHeat: 10, riskPercent: 50, displayName: '危险', description: '随时可能搜查' }
];

// ============================================================================
// Risk Event Types
// ============================================================================

export type RiskEventType =
  | 'UNDERCOVER_VISIT'    // 便衣暗访 - market closes tonight
  | 'SEARCH_WARNING'      // 搜查警告 - fine $300-500 OR lock 3 days
  | 'FORMAL_INVESTIGATION'; // 正式调查 - Credibility -10, lock 7 days

export interface RiskEvent {
  type: RiskEventType;
  message: string;
  penalty?: number;       // Fine amount if applicable
  lockDays?: number;      // Days the market is locked
  reputationLoss?: number; // Credibility loss
}

// ============================================================================
// Daily Market State
// ============================================================================

/**
 * Daily purchase request from the black market
 */
export interface MarketPurchaseRequest {
  tag: ItemTag;
  priceMultiplier: number; // 1.10 - 1.40
}

/**
 * Black market daily state
 */
export interface BlackmarketDailyState {
  // Purchase track (market buying from player)
  purchaseRequests: MarketPurchaseRequest[];  // 1-2 tags per day
  purchasedCount: number;                      // Items sold today (max 3)
  purchaseLimit: number;                       // Daily purchase limit (3)

  // Sale track (player selling to market)
  saleMultiplierMin: number;  // 0.60 - 0.70
  saleMultiplierMax: number;  // 0.75 - 0.85
}

/**
 * Complete black market state
 */
export interface BlackmarketState {
  // Heat system
  heat: number;           // 0-10

  // Lock state
  isLocked: boolean;      // Market closed due to risk event
  lockUntilDay: number;   // Day when market reopens (0 = not locked)

  // Daily state (regenerated each day)
  daily: BlackmarketDailyState;

  // Transaction history for today
  todaySales: { itemId: string; itemName: string; amount: number; type: 'PURCHASE' | 'SALE' }[];

  // Last risk event (for display)
  lastRiskEvent: RiskEvent | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Reputation-based commission rates for Underworld reputation
 * Higher reputation = lower commission (player keeps more money)
 * Commission is deducted from the sale price: finalPrice = basePrice * (1 - commission)
 * Commission range: 0% (best, "insider") to 20% (worst, "stranger")
 */
export const UNDERWORLD_COMMISSION_TIERS: { minRep: number; maxRep: number; commission: number; label: string }[] = [
  { minRep: 0, maxRep: 19, commission: 0.20, label: '生面孔' },    // 20% commission
  { minRep: 20, maxRep: 39, commission: 0.15, label: '见过几次' }, // 15% commission
  { minRep: 40, maxRep: 59, commission: 0.10, label: '熟客' },     // 10% commission
  { minRep: 60, maxRep: 79, commission: 0.05, label: '老主顾' },   // 5% commission
  { minRep: 80, maxRep: 100, commission: 0, label: '自己人' }       // 0% commission (best)
];

/**
 * @deprecated Use UNDERWORLD_COMMISSION_TIERS instead
 * Kept for backward compatibility
 */
export const UNDERWORLD_PRICE_MODIFIERS = UNDERWORLD_COMMISSION_TIERS.map(tier => ({
  minRep: tier.minRep,
  maxRep: tier.maxRep,
  modifier: -tier.commission, // Convert commission to modifier for backward compatibility
  label: tier.label
}));

/**
 * Default black market state
 */
export const INITIAL_BLACKMARKET_STATE: BlackmarketState = {
  heat: 0,
  isLocked: false,
  lockUntilDay: 0,
  daily: {
    purchaseRequests: [],
    purchasedCount: 0,
    purchaseLimit: 3,
    saleMultiplierMin: 0.60,
    saleMultiplierMax: 0.85
  },
  todaySales: [],
  lastRiskEvent: null
};

// ============================================================================
// Heat Calculation Helpers
// ============================================================================

/**
 * Get heat level from heat value
 */
export function getHeatLevel(heat: number): HeatLevel {
  const config = HEAT_LEVELS.find(h => heat >= h.minHeat && heat <= h.maxHeat);
  return config?.level ?? 'SAFE';
}

/**
 * Get heat config for current heat value
 */
export function getHeatConfig(heat: number): HeatConfig {
  return HEAT_LEVELS.find(h => heat >= h.minHeat && heat <= h.maxHeat) ?? HEAT_LEVELS[0];
}

/**
 * Get commission rate based on Underworld reputation
 * Higher reputation = lower commission (0% at max) = player keeps more money
 */
export function getUnderworldCommission(underworldRep: number): { commission: number; label: string } {
  const config = UNDERWORLD_COMMISSION_TIERS.find(
    m => underworldRep >= m.minRep && underworldRep <= m.maxRep
  );
  return config ?? { commission: 0, label: '熟客' };
}

/**
 * @deprecated Use getUnderworldCommission instead
 * Get price modifier based on Underworld reputation (kept for backward compatibility)
 */
export function getUnderworldPriceModifier(underworldRep: number): { modifier: number; label: string } {
  const { commission, label } = getUnderworldCommission(underworldRep);
  return { modifier: -commission, label };
}
