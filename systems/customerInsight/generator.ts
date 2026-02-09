/**
 * Customer Insight Generator (洞察生成器) v1.4
 *
 * Generates insight results based on customer data.
 * Maps BehaviorTags to dispositions and generates behavioral descriptions.
 *
 * Changes from v1.0:
 * - I-1: Three-layer reveal model with explicit layer tracking
 * - I-2: Behavior description matrix replaces direct floor hints
 * - I-3: Probabilistic patience cost based on BehaviorTag
 * - I-4: Dual-channel reward model (narrative + interaction)
 * - I-5: Bluffing noise mechanism for SUSPICIOUS/SAVVY
 * - I-6: Post-insight negotiation state tracking
 * - I-7: Push-pull concession modifier function
 * - I-11: Training result generation
 */

import { Customer } from '../npc/types';
import { BehaviorTag } from '../core/types';
import {
  Disposition,
  CustomerInsightResult,
  InsightLayer,
  InsightReward,
  InsightPushPullModifier,
  InsightTrainingResult,
  RatioTier,
  BEHAVIOR_TO_DISPOSITION,
  PATIENCE_COST_PROBABILITY,
  FLOOR_HINT_THRESHOLDS,
  INSIGHT_CONCESSION_MODIFIERS,
} from './types';
import { selectBehaviorDescription } from './behaviorMatrix';
import { parseCSVRaw } from '../utils/csvReader';
import insightHintsCSV from '@/assets/data/InsightHints.csv?raw';
import { createTextRegistry, TextRegistry } from '../utils/textRegistry';
import insightFeedbackCSV from '@/assets/data/texts/insight_feedback.csv?raw';
import { GAME_CONFIG } from '../game/config';

// ============================================================================
// 文本注册表 (从 CSV 加载叙事文本)
// ============================================================================

let feedbackTexts: TextRegistry | null = null;

function getTexts(): TextRegistry {
  if (!feedbackTexts) {
    feedbackTexts = createTextRegistry('insight_feedback', insightFeedbackCSV);
  }
  return feedbackTexts;
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate insight result for a customer (v1.4 three-layer model)
 *
 * @param customer - The customer to analyze
 * @param revealLayer - Maximum layer to reveal (default: 1 for basic insight)
 * @returns CustomerInsightResult with disposition, behavioral descriptions, and moral context
 */
export function generateCustomerInsight(
  customer: Customer,
  revealLayer: InsightLayer = 1
): CustomerInsightResult {
  const disposition = determineDisposition(customer.behaviorTags);
  const secondary = determineSecondaryDisposition(customer.behaviorTags, disposition);
  const dispositionText = generateDispositionText(disposition, customer);

  // I-2: Use behavior matrix for floor hint instead of direct text
  const floorHint = revealLayer >= 2
    ? generateFloorHintBehavior(customer.minimumAmount, customer.desiredAmount, disposition, customer.id, customer.behaviorTags)
    : '';

  const moralContext = revealLayer >= 3
    ? generateMoralContext(customer)
    : null;

  // I-3: Probabilistic patience cost
  const { cost, triggered } = calculatePatienceCost(customer.behaviorTags);

  return {
    disposition,
    secondaryDisposition: secondary,
    dispositionText,
    floorHint,
    moralContext,
    patienceCost: cost,
    revealedLayer: revealLayer,
    patienceTriggered: triggered,
  };
}

// ============================================================================
// Dual-Channel Reward (I-4)
// ============================================================================

/**
 * Calculate insight reward signals
 *
 * Channel A: Narrative reward (always true when insight is performed)
 * Channel B: Interaction options unlocked based on disposition
 */
export function calculateInsightReward(
  disposition: Disposition,
  revealedLayer: InsightLayer,
  apSpent: number
): InsightReward {
  // Channel B: Unlock interactions based on reveal level
  const unlockedInteractions: ('EMPATHY' | 'PROBE')[] = [];
  if (revealedLayer >= 1) {
    // Both options are always available; player must judge which is appropriate
    // based on behavioral descriptions (no suitability labels shown)
    unlockedInteractions.push('EMPATHY', 'PROBE');
  }

  // AP efficiency: higher layers per AP = higher efficiency
  const baseEfficiency = GAME_CONFIG.INSIGHT.BASE_EFFICIENCY;
  const layerBonus = (revealedLayer - 1) * GAME_CONFIG.INSIGHT.LAYER_BONUS;
  const apEfficiency = Math.min(baseEfficiency + layerBonus, GAME_CONFIG.INSIGHT.MAX_EFFICIENCY);

  return {
    narrativeReward: true,
    unlockedInteractions,
    apEfficiency,
  };
}

// ============================================================================
// Push-Pull Modifier (I-7)
// ============================================================================

/**
 * Get insight-based modifier to NPC concession probability in push-pull.
 *
 * Design:
 * - desperate -> +20% concession chance (easier to negotiate)
 * - bluffing -> +15% (you see through the act)
 * - sincere -> +5% (slight advantage from understanding)
 * - firm -> +0% (knowing they're firm doesn't help)
 */
export function getInsightPushPullModifier(
  disposition: Disposition
): InsightPushPullModifier {
  const modifier = INSIGHT_CONCESSION_MODIFIERS[disposition];
  const texts = getTexts();

  const reason = texts.get(`pushpull:${disposition}`) || `洞察：${disposition}`;

  return {
    concessionModifier: modifier,
    reason,
  };
}

// ============================================================================
// Training Mechanism (I-11)
// ============================================================================

/**
 * Generate post-transaction training feedback for night review.
 *
 * Design: 3-tier deal position + narrative feedback + insight accuracy hint.
 * Does NOT reveal precise numbers (no bottom price, no ratio).
 */
export function generateTrainingResult(
  pawnAmount: number,
  minimumAmount: number,
  desiredAmount: number,
  disposition: Disposition,
  insightUsed: boolean
): InsightTrainingResult {
  // Determine deal position (3-tier)
  const ratio = pawnAmount / desiredAmount;
  let dealPosition: 'generous' | 'fair' | 'harsh';
  if (ratio > GAME_CONFIG.INSIGHT.GENEROUS_THRESHOLD) {
    dealPosition = 'generous';
  } else if (ratio > GAME_CONFIG.INSIGHT.FAIR_THRESHOLD) {
    dealPosition = 'fair';
  } else {
    dealPosition = 'harsh';
  }

  // Generate narrative feedback text (叙事化方向性反馈)
  const feedbackText = generateDealFeedback(dealPosition, disposition);

  // Generate insight accuracy hint (only if insight was used)
  const insightAccuracyHint = insightUsed
    ? generateInsightAccuracyHint(disposition, pawnAmount, minimumAmount)
    : null;

  return {
    dealPosition,
    feedbackText,
    insightAccuracyHint,
  };
}

function generateDealFeedback(position: 'generous' | 'fair' | 'harsh', disposition: Disposition): string {
  const texts = getTexts();
  return texts.get(`feedback:${position}:${disposition}`) || '交易完成。';
}

function generateInsightAccuracyHint(
  disposition: Disposition,
  pawnAmount: number,
  minimumAmount: number
): string {
  const texts = getTexts();
  // Narrative hints about whether the player's insight judgment was accurate
  const wasCloseToFloor = pawnAmount < minimumAmount * GAME_CONFIG.INSIGHT.ACCURACY_HIGH_THRESHOLD;
  const wasFarFromFloor = pawnAmount > minimumAmount * GAME_CONFIG.INSIGHT.ACCURACY_LOW_THRESHOLD;

  if (disposition === 'desperate' && wasFarFromFloor) {
    return texts.get('accuracy:desperate:far') || '你当时觉得她会接受任何价格。回想起来，也许你给得太多了。';
  }
  if (disposition === 'firm' && wasCloseToFloor) {
    return texts.get('accuracy:firm:close') || '你判断他不会轻易退让。事实证明你的直觉是对的——再低一分他可能就走了。';
  }
  if (disposition === 'bluffing' && wasCloseToFloor) {
    return texts.get('accuracy:bluffing:close') || '你看穿了他的演技。最终的价格说明你的判断没有错。';
  }
  if (disposition === 'sincere' && wasFarFromFloor) {
    return texts.get('accuracy:sincere:far') || '他说的价格确实是他认为合理的。回想起来，也许有更多空间可以谈。';
  }

  return texts.get('accuracy:_default') || '你对他的观察是否准确？也许只有时间能告诉你答案。';
}

// ============================================================================
// Disposition Determination
// ============================================================================

/**
 * Determine disposition from behavior tags
 * Priority: DESPERATE > STUBBORN > SUSPICIOUS > SAVVY > NAIVE > SENTIMENTAL
 */
export function determineDisposition(behaviorTags: BehaviorTag[]): Disposition {
  const priorityOrder: BehaviorTag[] = [
    'DESPERATE',
    'STUBBORN',
    'SUSPICIOUS',
    'SAVVY',
    'NAIVE',
    'SENTIMENTAL',
  ];

  for (const tag of priorityOrder) {
    if (behaviorTags.includes(tag)) {
      return BEHAVIOR_TO_DISPOSITION[tag];
    }
  }

  return 'sincere';
}

/**
 * Determine secondary disposition from multi-tag customers.
 * Returns the second-highest-priority tag's disposition, only if it differs
 * from the primary disposition. This enables mixed behavior descriptions
 * (e.g., DESPERATE+SAVVY shows both desperate urgency and bluffing cues).
 */
export function determineSecondaryDisposition(
  behaviorTags: BehaviorTag[],
  primaryDisposition: Disposition
): Disposition | undefined {
  const priorityOrder: BehaviorTag[] = [
    'DESPERATE',
    'STUBBORN',
    'SUSPICIOUS',
    'SAVVY',
    'NAIVE',
    'SENTIMENTAL',
  ];

  let foundPrimary = false;
  for (const tag of priorityOrder) {
    if (behaviorTags.includes(tag)) {
      const disp = BEHAVIOR_TO_DISPOSITION[tag];
      if (!foundPrimary) {
        foundPrimary = true;
        continue; // skip the primary tag
      }
      // Return only if it maps to a different disposition
      if (disp !== primaryDisposition) {
        return disp;
      }
    }
  }

  return undefined;
}

// ============================================================================
// Text Generation
// ============================================================================

/**
 * Generate Layer 1: behavioral description of customer's psychological state
 */
function generateDispositionText(disposition: Disposition, customer: Customer): string {
  const texts = getTexts();
  const variants = texts.getAll(`disposition:${disposition}`);

  if (variants.length === 0) {
    return `你观察着这位客户...`;
  }

  const index = hashString(customer.id) % variants.length;
  return variants[index];
}

// ============================================================================
// Floor Hint Generation (I-2: Behavior Matrix + I-5: Bluffing Noise)
// ============================================================================

// Parse CSV into lookup table at module load time (kept as fallback)
const insightHintsCSVData: Record<string, Record<string, string>> = {};
(() => {
  const rows = parseCSVRaw(insightHintsCSV);
  if (rows.length < 2) return;
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const tier = row[0];
    if (!tier) continue;
    insightHintsCSVData[tier] = {};
    for (let j = 1; j < headers.length; j++) {
      insightHintsCSVData[tier][headers[j]] = row[j] || '';
    }
  }
})();

/**
 * Determine ratio tier from minimum/desired ratio
 */
function getRatioTier(minimumAmount: number, desiredAmount: number): RatioTier {
  const ratio = minimumAmount / desiredAmount;
  if (ratio < FLOOR_HINT_THRESHOLDS.VERY_LOW) return 'veryLow';
  if (ratio < FLOOR_HINT_THRESHOLDS.LOW) return 'low';
  if (ratio < FLOOR_HINT_THRESHOLDS.MEDIUM) return 'medium';
  return 'high';
}

/**
 * Generate Layer 2: floor hint as behavioral description (I-2)
 * Uses behavior matrix instead of direct text hints.
 * For bluffing/shrewd customers, applies noise mechanism (I-5).
 */
function generateFloorHintBehavior(
  minimumAmount: number,
  desiredAmount: number,
  disposition: Disposition,
  customerId: string,
  behaviorTags: BehaviorTag[]
): string {
  let tier = getRatioTier(minimumAmount, desiredAmount);

  // I-5: Bluffing noise mechanism
  if (disposition === 'bluffing') {
    tier = applyBluffingNoise(tier, behaviorTags, customerId);
  }

  return selectBehaviorDescription(tier, disposition, customerId);
}

/**
 * I-5: Apply noise to floor hint tier for bluffing/shrewd customers
 *
 * Design:
 * - SUSPICIOUS: direction hint may shift 1 tier (e.g., actual 'low' shows as 'medium')
 * - SAVVY: behavioral descriptions contain anti-surveillance features
 *   (the behavior matrix handles this via dedicated bluffing descriptions)
 *
 * Returns potentially shifted tier for SUSPICIOUS customers.
 * SAVVY customers use the real tier but the bluffing descriptions
 * naturally contain "controlled body language" signals.
 */
function applyBluffingNoise(
  realTier: RatioTier,
  behaviorTags: BehaviorTag[],
  customerId: string
): RatioTier {
  // SAVVY: no tier shift, but bluffing descriptions naturally contain
  // anti-surveillance features ("他知道你在看什么")
  if (behaviorTags.includes('SAVVY') && !behaviorTags.includes('SUSPICIOUS')) {
    return realTier;
  }

  // SUSPICIOUS: 30% chance to shift tier by 1 position
  // Direction: always shift toward 'medium' (make it seem like less room)
  if (behaviorTags.includes('SUSPICIOUS')) {
    const noiseRoll = hashString(customerId + '_noise') % 100;
    if (noiseRoll < 30) {
      return shiftTier(realTier, 1);
    }
  }

  return realTier;
}

/**
 * Shift a ratio tier by the given amount toward 'high' (less room)
 */
function shiftTier(tier: RatioTier, shift: number): RatioTier {
  const tiers: RatioTier[] = ['veryLow', 'low', 'medium', 'high'];
  const currentIndex = tiers.indexOf(tier);
  const newIndex = Math.min(tiers.length - 1, currentIndex + shift);
  return tiers[newIndex];
}

/**
 * Generate floor hint using CSV data (legacy method, still available as fallback)
 */
export function generateFloorHint(
  minimumAmount: number,
  desiredAmount: number,
  disposition: Disposition,
  customerId: string
): string {
  const tier = getRatioTier(minimumAmount, desiredAmount);

  // Read from CSV with fallback
  const tierHints = insightHintsCSVData[tier];
  if (tierHints && typeof tierHints[disposition] === 'string') {
    const rawHint = tierHints[disposition];
    const options = rawHint.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (options.length > 0) {
      const index = hashString(customerId) % options.length;
      return options[index];
    }
  }

  return getTexts().get('fallback:floor_hint') || '你对他的底线没有明确判断。';
}

// ============================================================================
// Moral Context Generation
// ============================================================================

/**
 * Generate Layer 3: moral context from customer's story
 * Only available for story customers (those with chainId or pawnReason)
 *
 * Four-level degradation per design §10:
 * - FULL: pawnReason + chain variables (hope/funds)
 * - PARTIAL: pawnReason only
 * - MINIMAL: behaviorTags=DESPERATE only
 * - NONE: no layer 3
 */
export function generateMoralContext(customer: Customer): string | null {
  const texts = getTexts();
  const pawnReason = customer.dialogue?.pawnReason;

  // NONE: No story context for generic customers
  if (!pawnReason && !customer.chainId) {
    // MINIMAL: If DESPERATE but no story, give behavioral observation
    if (customer.behaviorTags.includes('DESPERATE')) {
      return texts.get('moral:desperate_no_story') || '她很急。急到不在乎价格。至于为什么...你不知道。';
    }
    return null;
  }

  // PARTIAL/FULL: Generate from pawn reason
  if (pawnReason) {
    return generateMoralContextFromReason(pawnReason, customer);
  }

  // For chain customers without explicit pawn reason
  if (customer.chainId) {
    return texts.get('moral:chain_no_reason') || '这个人有自己的故事。你的决定会影响他的命运。';
  }

  return null;
}

/**
 * Generate moral context from pawn reason text
 */
function generateMoralContextFromReason(reason: string, customer: Customer): string {
  const texts = getTexts();
  const reasonLower = reason.toLowerCase();

  if (reasonLower.includes('女儿') || reasonLower.includes('孩子') || reasonLower.includes('儿子')) {
    if (reasonLower.includes('病') || reasonLower.includes('药') || reasonLower.includes('手术')) {
      return texts.get('moral:child:sick') || '她提到孩子生病了。这笔钱可能是药费。压得太低，这个孩子可能等不到明天。';
    }
    if (reasonLower.includes('学费') || reasonLower.includes('上学')) {
      return texts.get('moral:child:school') || '这笔钱关系到一个孩子的未来。你的选择可能决定他能不能继续读书。';
    }
    return texts.get('moral:child:general') || '她提到了自己的孩子。这笔钱对这个家庭很重要。';
  }

  if (reasonLower.includes('母亲') || reasonLower.includes('父亲') || reasonLower.includes('老人')) {
    if (reasonLower.includes('病') || reasonLower.includes('医')) {
      return texts.get('moral:elder:sick') || '这笔钱是给老人看病的。每一分钱都关系到一条生命。';
    }
    return texts.get('moral:elder:general') || '这笔钱是为了家里的老人。';
  }

  if (reasonLower.includes('房租') || reasonLower.includes('房子')) {
    return texts.get('moral:housing') || '他说需要钱付房租。压得太低，这个人可能很快就没地方住了。';
  }

  if (reasonLower.includes('失业') || reasonLower.includes('工作')) {
    return texts.get('moral:job') || '他正在找工作。这笔钱可能是他最后的周转资金。';
  }

  if (reasonLower.includes('结婚') || reasonLower.includes('妻子') || reasonLower.includes('丈夫')) {
    return texts.get('moral:marriage') || '这件物品承载着他的一段回忆。典当意味着放弃一段人生。';
  }

  if (reasonLower.includes('勋章') || reasonLower.includes('军') || reasonLower.includes('战')) {
    return texts.get('moral:military') || '这对他来说不只是一件物品，而是一段荣誉。低价成交意味着剥夺他最后的尊严。';
  }

  return texts.getWithVars('moral:reason_fallback', { reason }) || `他说：「${reason}」。这笔交易对他意义重大。`;
}

// ============================================================================
// Patience Cost Calculation (I-3)
// ============================================================================

/**
 * Calculate patience cost based on BehaviorTag probabilities (I-3)
 *
 * Design:
 * - NAIVE: 0% trigger chance
 * - SENTIMENTAL: 0% trigger chance
 * - DESPERATE: 0% trigger chance
 * - STUBBORN: 40% trigger chance, costs 1
 * - SUSPICIOUS: 60% trigger chance, costs 1
 * - SAVVY: 80% trigger chance, costs 1
 *
 * Uses highest probability among all tags.
 */
export function calculatePatienceCost(
  behaviorTags: BehaviorTag[]
): { cost: number; triggered: boolean } {
  // Find highest probability among all tags
  let maxProbability = 0;
  for (const tag of behaviorTags) {
    const prob = PATIENCE_COST_PROBABILITY[tag] ?? 0;
    if (prob > maxProbability) {
      maxProbability = prob;
    }
  }

  if (maxProbability <= 0) {
    return { cost: 0, triggered: false };
  }

  // Roll dice
  const roll = Math.random();
  const triggered = roll < maxProbability;

  return {
    cost: triggered ? 1 : 0,
    triggered,
  };
}

/**
 * Get the patience cost probability for display purposes (no side effects).
 * Used by CustomerInsightStatus to show expected risk.
 */
export function getPatienceCostProbability(behaviorTags: BehaviorTag[]): number {
  let maxProbability = 0;
  for (const tag of behaviorTags) {
    const prob = PATIENCE_COST_PROBABILITY[tag] ?? 0;
    if (prob > maxProbability) {
      maxProbability = prob;
    }
  }
  return maxProbability;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple string hash for deterministic text selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  generateDispositionText,
  generateFloorHintBehavior,
  getRatioTier,
};
