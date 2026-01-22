

import { Customer, Item, InterestRate } from '../types';
import { INSTINCT_MATRIX, getMatrixKey, getRandomText, InstinctRateZone, InstinctPriceZone, InstinctNpcStyle } from './instinctMatrix';
import { getUncertaintyRisk } from './appraisalUtils';

// Match thresholds with useNegotiation hook
const getInsultThreshold = (style: string, minPrincipal: number) => {
    switch (style) {
      case 'Aggressive': return minPrincipal * 0.8;
      case 'Desperate': return minPrincipal * 0.6;
      case 'Deceptive': return minPrincipal * 0.75;
      default: return minPrincipal * 0.7; // Professional
    }
};

const getRateZone = (rate: number): InstinctRateZone => {
    if (rate === 0) return 'charity';
    if (rate === 0.05) return 'aid';
    if (rate >= 0.20) return 'shark';
    return 'standard';
};

const getPriceZone = (offer: number, minPrincipal: number, desiredAmount: number, style: string): InstinctPriceZone => {
    const insultThreshold = getInsultThreshold(style, minPrincipal);
    
    if (offer < insultThreshold) return 'insult';
    if (offer < minPrincipal) return 'haggling';
    if (offer > desiredAmount * 1.15) return 'premium';
    return 'fair';
};

export const getMerchantInstinct = (
  offer: number, 
  rate: InterestRate, 
  customer: Customer, 
  item: Item
): { text: string; color: string } => {
  const seed = offer + (rate * 1000) + customer.id.charCodeAt(0);
  
  // 0. Special Case: Fake Item Bargain
  const isRevealedFake = item.isFake && item.revealedTraits.some(t => t.type === 'FAKE');
  if (isRevealedFake && offer < item.realValue * 0.5) {
      return {
          text: getRandomText(INSTINCT_MATRIX['generic_fake_bargain'], seed),
          color: "text-stone-500"
      };
  }
  
  // 1. New: High Uncertainty Risk
  const uncertaintyRisk = getUncertaintyRisk(item.currentRange[0], item.currentRange[1]);
  if (uncertaintyRisk === 'HIGH') {
      return {
          text: "这价格范围太宽了，盲收等于赌博。",
          color: "text-amber-500 font-bold"
      };
  }

  const rateZone = getRateZone(rate);
  const style = customer.negotiationStyle as InstinctNpcStyle;
  const priceZone = getPriceZone(offer, customer.minimumAmount, customer.desiredAmount, style);

  // Try specific key
  const specificKey = getMatrixKey(rateZone, priceZone, style);
  let texts = INSTINCT_MATRIX[specificKey];

  // Fallback 1: Try ignoring style if specific combination is missing
  if (!texts) {
      // Logic fallback mappings for color tone
  }

  // Determine Color Tone
  let toneColor = "text-stone-500";
  if (priceZone === 'insult') toneColor = "text-red-500";
  else if (rateZone === 'shark') toneColor = "text-purple-400";
  else if (rateZone === 'charity') toneColor = "text-green-400";
  else if (priceZone === 'premium') toneColor = "text-amber-400";
  else if (priceZone === 'haggling') toneColor = "text-stone-400";

  // If no specific text, use generic fallbacks based on Price Zone
  if (!texts) {
      if (priceZone === 'insult') texts = INSTINCT_MATRIX['generic_insult'];
      else if (priceZone === 'haggling') texts = INSTINCT_MATRIX['generic_haggling'];
      else if (priceZone === 'premium') texts = INSTINCT_MATRIX['generic_premium'];
      else {
          // Construct a dynamic fallback if fair/standard
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
