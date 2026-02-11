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
 * v3.6 [#34]: narrativeDescription replaces riskPercent for player-facing display
 */
export interface HeatConfig {
  level: HeatLevel;
  minHeat: number;
  maxHeat: number;
  riskPercent: number;              // Internal probability (hidden from player)
  displayName: string;
  description: string;
  narrativeDescription: string;     // v3.6 [#34]: Player-facing narrative risk text
  color: string;                    // v3.6 [#34]: UI color indicator
}

export const HEAT_LEVELS: HeatConfig[] = [
  { level: 'SAFE', minHeat: 0, maxHeat: 2, riskPercent: 0, displayName: '安全', description: '无警方关注', narrativeDescription: '近来风平浪静', color: 'green' },
  { level: 'WATCHED', minHeat: 3, maxHeat: 5, riskPercent: 15, displayName: '关注', description: '有人在打听', narrativeDescription: '偶尔有人打听你的生意', color: 'yellow' },
  { level: 'WARNING', minHeat: 6, maxHeat: 8, riskPercent: 30, displayName: '警告', description: '便衣出没', narrativeDescription: '经常有人在对面盯梢', color: 'orange' },
  { level: 'DANGER', minHeat: 9, maxHeat: 10, riskPercent: 50, displayName: '危险', description: '随时可能搜查', narrativeDescription: '街角总停着一辆面包车', color: 'red' }
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
  penalty?: number;           // Fine amount if applicable
  lockDays?: number;          // Days the market is locked
  reputationLoss?: number;    // Credibility loss
  suspendHeatDecay?: boolean; // v3.6 [#31]: Suspend next-day heat decay
  salePenalty?: number;       // v3.6 [#31]: Next-day sale price penalty (e.g., 0.05 = -5%)
  heatReduction?: number;     // Immediate heat reduction when event triggers
}

// ============================================================================
// Daily Market State
// ============================================================================

/**
 * Daily purchase request from the black market
 * Each request can only be fulfilled once (by selling 1 item)
 */
export interface MarketPurchaseRequest {
  tag: ItemTag;
  priceMultiplier: number; // 1.10 - 1.40
  fulfilled: boolean;      // Whether this specific request has been fulfilled
}

/**
 * Black market daily state
 */
export interface BlackmarketDailyState {
  // Purchase track (market buying from player)
  // Each request represents one purchase slot (N requests = N different tags, each can be fulfilled once)
  purchaseRequests: MarketPurchaseRequest[];

  // Sale track (player selling to market)
  saleMultiplierMin: number;  // 0.60 - 0.70
  saleMultiplierMax: number;  // 0.75 - 0.85

  // v3.6 [BM-1]: Tag revealed to news system (100% accurate, 1 per day)
  revealedTag: ItemTag | null;

  // v3.6 [BM-4]: Undercover visit aftermath effects
  salePenaltyPercent: number; // 0.05 = -5% on sale prices for the day

  // #30: Extra revealed tag from EXTRA_INTEL low heat reward
  extraRevealedTag: ItemTag | null;
}

/**
 * v3.6 [BM-8]: Protection fee state
 */
export interface ProtectionFeeState {
  baseAmount: number;             // Starting amount ($200)
  timesPaid: number;              // Number of times paid (drives inflation)
  timesRefused: number;           // Number of times refused
  cooldownUntilDay: number;       // Day when cooldown expires (0 = no cooldown)
  lastRequestDay: number;         // Day of last request (0 = never requested)
}

/**
 * v3.6 [BM-7]: Low heat reward state
 */
export interface LowHeatRewardState {
  consecutiveSafeDays: number;    // Days heat has been in SAFE range
  rewardActive: boolean;          // Whether reward is currently active
  rewardType: LowHeatRewardType | null;
}

export type LowHeatRewardType =
  | 'PRICE_BONUS'                 // Temporary +5% purchase price
  | 'EXTRA_INTEL'                 // Reveal an extra tag for tomorrow
  | 'CONTACT_FAVOR';             // Contact provides special dialogue

/**
 * v3.6 [BM-3]: Market indicator for UI
 */
export interface MarketIndicator {
  tag: ItemTag;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  confidence: number;             // 0-1 how reliable the trend is
}

/**
 * v3.6 [BM-6]: Risk clue for dangerous tasks
 */
export interface RiskClue {
  text: string;                   // The clue text shown to player
  impliedRisk: 'LOW' | 'MEDIUM' | 'HIGH'; // Actual risk level (hidden)
}

/**
 * v3.6 [BM-10]: Moral echo effect from black market actions
 */
export interface MoralEchoBlackmarketEffect {
  type: 'HEAT_INCREASE' | 'RISK_ESCALATION' | 'REPUTATION_LEAK';
  severity: number;               // 1-5 scale
  delay: number;                  // Delay in days before effect triggers
  sourceAction: string;           // What triggered this echo
  day: number;                    // Day it was generated
}

/**
 * #37: Dangerous task (favor) from contacts when innocence is very low
 */
export interface DangerousTask {
  id: string;
  description: string;        // Contact's request text
  riskClues: RiskClue[];       // Readable clues about actual risk
  actualRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  generatedDay: number;
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

  // v3.6 [BM-2]: Tag history for demand inertia
  tagHistory: ItemTag[];          // Recent N days of purchase tags

  // v3.6 [BM-2]: Lv3+ next day preview tag
  nextDayPreviewTag: ItemTag | null;

  // v3.6 [BM-4]: Whether heat decay is suspended for today
  heatDecaySuspended: boolean;

  // v3.6 [BM-7]: Low heat reward tracking
  lowHeatReward: LowHeatRewardState;

  // v3.6 [BM-8]: Protection fee state
  protectionFee: ProtectionFeeState;

  // v3.6 [BM-10]: Pending moral echo effects
  pendingMoralEchoes: MoralEchoBlackmarketEffect[];

  // #37: Pending dangerous task
  pendingDangerousTask: DangerousTask | null;
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
    saleMultiplierMin: 0.60,
    saleMultiplierMax: 0.85,
    revealedTag: null,
    salePenaltyPercent: 0,
    extraRevealedTag: null
  },
  todaySales: [],
  lastRiskEvent: null,
  tagHistory: [],
  nextDayPreviewTag: null,
  heatDecaySuspended: false,
  lowHeatReward: {
    consecutiveSafeDays: 0,
    rewardActive: false,
    rewardType: null
  },
  protectionFee: {
    baseAmount: 200,
    timesPaid: 0,
    timesRefused: 0,
    cooldownUntilDay: 0,
    lastRequestDay: 0
  },
  pendingMoralEchoes: [],
  pendingDangerousTask: null
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
