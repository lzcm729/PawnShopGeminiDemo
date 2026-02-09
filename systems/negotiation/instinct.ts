
import { Customer, Item, InterestRate, BehaviorTag } from '../../types';
import { INSTINCT_MATRIX, getMatrixKey, getRandomText, InstinctRateZone, InstinctPriceZone, InstinctNpcStyle } from './data';
import { getUncertaintyRisk } from '../items/utils';
import { GAME_CONFIG } from '../game/config';
import { normalizeUncertainty } from '../appraisal/precision';

/**
 * Map behaviorTags to the legacy InstinctNpcStyle for flavor text selection
 */
const mapBehaviorTagsToStyle = (behaviorTags: BehaviorTag[]): InstinctNpcStyle => {
    if (behaviorTags.includes('DESPERATE')) return 'Desperate';
    if (behaviorTags.includes('STUBBORN')) return 'Aggressive';
    if (behaviorTags.includes('SUSPICIOUS')) return 'Deceptive';
    if (behaviorTags.includes('NAIVE')) return 'Professional';
    if (behaviorTags.includes('SAVVY')) return 'Professional';
    if (behaviorTags.includes('SENTIMENTAL')) return 'Professional';
    return 'Professional';
};

const getInsultThreshold = (behaviorTags: BehaviorTag[], minPrincipal: number) => {
    let threshold = GAME_CONFIG.NEGOTIATION.BASE_INSULT_THRESHOLD;

    // Behavior-based modifiers
    const modifiers = GAME_CONFIG.NEGOTIATION.BEHAVIOR_INSULT_MODIFIERS;
    for (const tag of behaviorTags) {
        threshold += modifiers[tag] || 0;
    }

    // Clamp threshold
    threshold = Math.max(GAME_CONFIG.NEGOTIATION.INSULT_CLAMP_MIN, Math.min(GAME_CONFIG.NEGOTIATION.INSULT_CLAMP_MAX, threshold));

    return minPrincipal * threshold;
};

const getRateZone = (rate: number): InstinctRateZone => {
    if (rate === 0) return 'charity';
    if (rate === 0.05) return 'aid';
    if (rate >= 0.20) return 'shark';
    return 'standard';
};

const getPriceZone = (offer: number, minPrincipal: number, desiredAmount: number, behaviorTags: BehaviorTag[]): InstinctPriceZone => {
    const insultThreshold = getInsultThreshold(behaviorTags, minPrincipal);

    if (offer < insultThreshold) return 'insult';
    if (offer < minPrincipal) return 'haggling';
    if (offer > desiredAmount * 1.15) return 'premium';
    return 'fair';
};

// --- Precision-based instinct text (design doc 3.6) ---
const PRECISION_INSTINCT_TEXTS = {
  low: [
    "这件东西我了如指掌，他糊弄不了我。",
    "心中有数。价格由我掌控。",
    "这东西值多少我比他清楚。",
  ],
  high: [
    "说实话我也没看太明白，小心点。",
    "这东西到底值多少... 我心里没底。",
    "盲人摸象。要是看走眼就麻烦了。",
  ],
};

export const getMerchantInstinct = (
  offer: number,
  rate: InterestRate,
  customer: Customer,
  item: Item
): { text: string; color: string } => {
  const seed = offer + (rate * 1000) + customer.id.charCodeAt(0);

  const isRevealedFake = item.isFake && item.revealedTraits.some(t => t.type === 'FAKE');
  if (isRevealedFake && offer < item.realValue * 0.5) {
      return {
          text: getRandomText(INSTINCT_MATRIX['generic_fake_bargain'], seed),
          color: "text-stone-500"
      };
  }

  const uncertaintyRisk = getUncertaintyRisk(item.currentRange[0], item.currentRange[1]);
  if (uncertaintyRisk === 'HIGH') {
      return {
          text: "这价格范围太宽了，盲收等于赌博。",
          color: "text-amber-500 font-bold"
      };
  }

  // Precision-based instinct: occasionally inject precision-awareness text
  const uncertainty = item.uncertainty ?? 0.3;
  const precisionNorm = normalizeUncertainty(uncertainty);
  // Use precision text ~30% of the time, weighted by how extreme the precision is
  const precisionIntensity = Math.abs(precisionNorm - 0.5) * 2; // 0 at midpoint, 1 at extremes
  const precisionRoll = ((seed * 7 + 13) % 100) / 100;
  if (precisionRoll < precisionIntensity * 0.4) {
    const texts = precisionNorm < 0.4 ? PRECISION_INSTINCT_TEXTS.low : PRECISION_INSTINCT_TEXTS.high;
    return {
      text: getRandomText(texts, seed),
      color: precisionNorm < 0.4 ? "text-emerald-400" : "text-amber-400"
    };
  }

  const rateZone = getRateZone(rate);
  const style = mapBehaviorTagsToStyle(customer.behaviorTags);
  const priceZone = getPriceZone(offer, customer.minimumAmount, customer.desiredAmount, customer.behaviorTags);

  const specificKey = getMatrixKey(rateZone, priceZone, style);
  let texts = INSTINCT_MATRIX[specificKey];

  let toneColor = "text-stone-500";
  if (priceZone === 'insult') toneColor = "text-red-500";
  else if (rateZone === 'shark') toneColor = "text-purple-400";
  else if (rateZone === 'charity') toneColor = "text-green-400";
  else if (priceZone === 'premium') toneColor = "text-amber-400";
  else if (priceZone === 'haggling') toneColor = "text-stone-400";

  if (!texts) {
      if (priceZone === 'insult') texts = INSTINCT_MATRIX['generic_insult'];
      else if (priceZone === 'haggling') texts = INSTINCT_MATRIX['generic_haggling'];
      else if (priceZone === 'premium') texts = INSTINCT_MATRIX['generic_premium'];
      else {
          if (rateZone === 'shark') texts = ["这是合法的抢劫。", "吃人不吐骨头。", "高风险高回报。"];
          else if (rateZone === 'charity') texts = ["我在做慈善。", "希望好人有好报。", "这不是生意，是施舍。"];
          else texts = ["这是生意，仅此而已。", "各取所需。", "钱货两清。"];
      }
  }

  return {
    text: getRandomText(texts, seed),
    color: toneColor
  };
};
