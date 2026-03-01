/**
 * Appraisal Core - Pure Computation Logic
 *
 * Extracted from hooks/useAppraisal.ts to enable reuse by both
 * the original appraisal hook (AP-based) and the card negotiation
 * system (card-based). No dispatches, no side effects.
 */

import { Item, ItemTrait } from './types';
import { rollAppraisalEvent, AppraisalEvent, generateValuationRange } from './utils';
import { GAME_CONFIG } from '../game/config';
import { isSkillUnlocked, getPierceIllusionEffect } from '../characterAbility/abilityEngine';
import { AbilityState } from '../characterAbility/types';
import { getNewsPriceModifier, getNewsTagPriceModifier } from '../news/engine';
import { revealNextHiddenTag } from './tagUtils';
import type { ItemTag } from './tags';
import type { ActiveNewsInstance } from '../news/types';

// ============================================================================
// Input / Output Types
// ============================================================================

export interface AppraisalCoreInput {
  item: Item;
  abilityState: AbilityState;
  moraleBuff?: { appraisalModifier: number; expiresDay: number } | null;
  currentDay: number;
  motherHealth: number;
  dailyNews: ActiveNewsInstance[];
}

export interface AppraisalCoreResult {
  newTraitsFound: ItemTrait[];
  bonusTraitIds: string[];
  newUncertainty: number;
  newRange: [number, number];
  event: AppraisalEvent;
  isBreakthrough: boolean;
  valueJump?: 'FAKE' | 'JACKPOT';
  isMastered: boolean;
  pierceIllusionTriggered: boolean;
  revealedHiddenTag?: ItemTag;
  patienceCost: number;
  updatedRevealed: ItemTrait[];
  updatedHidden: ItemTrait[];
  hasNegativeEvent: boolean;
  finalPerceived?: number;
  initialRange?: [number, number];
}

// ============================================================================
// Core Function
// ============================================================================

export function performAppraisalCore(input: AppraisalCoreInput): AppraisalCoreResult {
  const { item, abilityState, moraleBuff, currentDay, motherHealth, dailyNews } = input;

  const hiddenTraits = item.hiddenTraits || [];
  const revealedTraits = item.revealedTraits || [];

  const undiscoveredCandidates = hiddenTraits.filter(
    h => !revealedTraits.some(r => r.id === h.id)
  );

  const appraisalCount = item.appraisalCount || 0;

  // === PIERCE_ILLUSION: On first appraisal, auto-reveal FAKE or guarantee a trait ===
  let pierceIllusionTriggered = false;
  let pierceRevealedTrait: ItemTrait | null = null;
  const hasPierceIllusion = isSkillUnlocked('PIERCE_ILLUSION', abilityState);

  if (hasPierceIllusion && appraisalCount === 0 && undiscoveredCandidates.length > 0) {
    const effect = getPierceIllusionEffect(item.isFake);
    if (effect === 'REVEAL_FAKE') {
      const fakeTrait = undiscoveredCandidates.find(t => t.type === 'FAKE');
      if (fakeTrait) {
        const idx = undiscoveredCandidates.indexOf(fakeTrait);
        undiscoveredCandidates.splice(idx, 1);
        pierceIllusionTriggered = true;
        pierceRevealedTrait = fakeTrait;
      }
    } else if (effect === 'GUARANTEE_TRAIT') {
      const guaranteedTrait = undiscoveredCandidates[0];
      undiscoveredCandidates.splice(0, 1);
      pierceIllusionTriggered = true;
      pierceRevealedTrait = guaranteedTrait;
    }
  }

  // S1-F1: d100 single-die mutually exclusive event roll
  const event = rollAppraisalEvent(
    appraisalCount,
    item.uncertainty,
    item.hasNegativeAppraisalEvent || false,
    item.isFake,
    GAME_CONFIG.APPRAISAL_EVENTS
  );

  const isBreakthrough = event.type === 'BREAKTHROUGH';

  let extraPatienceCost = 0;
  let uncertaintyBoost = 0;
  let bonusTraits: ItemTrait[] = [];

  // Add pierce illusion revealed trait as a bonus trait
  if (pierceRevealedTrait) {
    bonusTraits.push(pierceRevealedTrait);
  }

  if (event.type === 'MISHAP') {
    uncertaintyBoost = GAME_CONFIG.APPRAISAL_EVENTS.MISHAP_UNCERTAINTY_INCREASE;
  } else if (event.type === 'IMPATIENT') {
    extraPatienceCost = 1;
  } else if (event.type === 'LUCKY_FIND') {
    if (undiscoveredCandidates.length > 0) {
      const idx = Math.floor(Math.random() * undiscoveredCandidates.length);
      bonusTraits.push(undiscoveredCandidates[idx]);
      undiscoveredCandidates.splice(idx, 1);
    }
  }

  const totalPatienceCost = 1 + extraPatienceCost;

  // --- Trait Discovery ---
  const newTraitsFound: ItemTrait[] = [...bonusTraits];

  const currentAppraisalNum = appraisalCount + 1;

  if (event.type !== 'MISHAP') {
    undiscoveredCandidates.forEach(trait => {
      const baseChance = GAME_CONFIG.APPRAISAL.BASE_DISCOVERY_CHANCE - (trait.discoveryDifficulty * GAME_CONFIG.APPRAISAL.DISCOVERY_DIFFICULTY_FACTOR);

      let effectiveChance = baseChance;

      // S1-F5: Apply FAKE pity multiplier
      if (trait.type === 'FAKE') {
        const pityGuaranteed = GAME_CONFIG.APPRAISAL_EVENTS.FAKE_PITY_GUARANTEED;
        if (currentAppraisalNum >= pityGuaranteed) {
          effectiveChance = 1.0;
        } else if (currentAppraisalNum === 3) {
          effectiveChance = baseChance * GAME_CONFIG.APPRAISAL_EVENTS.FAKE_PITY_MULTIPLIER_3;
        } else if (currentAppraisalNum === 2) {
          effectiveChance = baseChance * GAME_CONFIG.APPRAISAL_EVENTS.FAKE_PITY_MULTIPLIER_2;
        }
      }

      const roll = Math.random();
      if (roll < effectiveChance) {
        newTraitsFound.push(trait);
      }
    });
  }

  const uniqueNewTraits = Array.from(new Set(newTraitsFound.map(t => t.id)))
    .map(id => newTraitsFound.find(t => t.id === id)!);

  const updatedRevealed = [...revealedTraits, ...uniqueNewTraits];

  // Remove discovered traits from hidden traits
  const discoveredIds = new Set(uniqueNewTraits.map(t => t.id));
  const updatedHidden = hiddenTraits.filter(t => !discoveredIds.has(t.id));

  let newUncertainty = item.uncertainty;

  // H-1 + H-4: Compute combined appraisal modifier from morale buff and health penalty
  let appraisalEfficiencyModifier = 1.0;

  // H-1: Morale buff modifier (from visiting mother)
  if (moraleBuff && currentDay < moraleBuff.expiresDay) {
    appraisalEfficiencyModifier *= moraleBuff.appraisalModifier;
  }

  // H-4: Health penalty (mother's poor health distracts player)
  if (motherHealth < GAME_CONFIG.MOTHER.HEALTH_PENALTY_SEVERE_THRESHOLD) {
    appraisalEfficiencyModifier *= GAME_CONFIG.MOTHER.HEALTH_PENALTY_SEVERE_MODIFIER;
  } else if (motherHealth < GAME_CONFIG.MOTHER.HEALTH_PENALTY_MILD_THRESHOLD) {
    appraisalEfficiencyModifier *= GAME_CONFIG.MOTHER.HEALTH_PENALTY_MILD_MODIFIER;
  }

  if (event.type === 'MISHAP') {
    newUncertainty = Math.min(0.5, newUncertainty + uncertaintyBoost);
  } else {
    // S1-F4: Breakthrough-trait discovery interaction rules
    const discoveredFakeOrJackpotTrait = uniqueNewTraits.find(
      t => t.type === 'FAKE' || t.type === 'JACKPOT'
    );

    if (discoveredFakeOrJackpotTrait) {
      newUncertainty = GAME_CONFIG.APPRAISAL.TRAIT_DISCOVERY_UNCERTAINTY;
    } else if (isBreakthrough) {
      const breakthroughMultiplier = GAME_CONFIG.APPRAISAL_EVENTS.BREAKTHROUGH_UNCERTAINTY_MULTIPLIER;
      const adjustedMultiplier = 1 - (1 - breakthroughMultiplier) * appraisalEfficiencyModifier;
      newUncertainty = Math.max(0.05, newUncertainty * adjustedMultiplier);
    } else {
      const baseShrinkRate = GAME_CONFIG.APPRAISAL.NORMAL_SHRINK_RATE;
      const adjustedShrinkRate = 1 - (1 - baseShrinkRate) * appraisalEfficiencyModifier;
      newUncertainty = Math.max(0.05, newUncertainty * adjustedShrinkRate);
    }
  }

  // --- Range Calculation ---
  const [currentMin, currentMax] = item.currentRange;

  const bonusTraitIds = new Set(bonusTraits.map(t => t.id));
  const hasNormalDiscovery = uniqueNewTraits.some(t => !bonusTraitIds.has(t.id));

  let newRange: [number, number];

  if (hasNormalDiscovery && event.type !== 'MISHAP') {
    newRange = [currentMin, currentMax];
  } else {
    const breakthroughRangeShrink = GAME_CONFIG.APPRAISAL_EVENTS.BREAKTHROUGH_RANGE_SHRINK;
    const CONVERGENCE_SPEED = isBreakthrough ? breakthroughRangeShrink : GAME_CONFIG.APPRAISAL.NORMAL_CONVERGENCE_SPEED;
    const anchor = item.perceivedValue ?? item.realValue;

    let calcMin = currentMin + (anchor - currentMin) * CONVERGENCE_SPEED;
    let calcMax = currentMax - (currentMax - anchor) * CONVERGENCE_SPEED;

    if (event.type === 'MISHAP') {
      calcMin = currentMin - (anchor * GAME_CONFIG.APPRAISAL.MISHAP_RANGE_EXPANSION);
      calcMax = currentMax + (anchor * GAME_CONFIG.APPRAISAL.MISHAP_RANGE_EXPANSION);
    }

    const roundToHuman = (val: number) => Math.round(val);

    let nextMin = roundToHuman(calcMin);
    let nextMax = roundToHuman(calcMax);

    if (event.type !== 'MISHAP') {
      nextMin = Math.max(currentMin, nextMin);
      nextMax = Math.min(currentMax, nextMax);
    } else {
      nextMin = Math.max(0, nextMin);
      nextMax = Math.min(anchor * 3, nextMax);
    }

    if (nextMin > nextMax) {
      const mid = Math.floor((nextMin + nextMax) / 2);
      nextMin = mid;
      nextMax = mid;
    }

    newRange = [nextMin, nextMax];
  }

  // --- FAKE/JACKPOT value jump ---
  const discoveredFakeOrJackpot = uniqueNewTraits.find(t => t.type === 'FAKE' || t.type === 'JACKPOT');
  let finalRange = newRange;
  let finalPerceived: number | undefined = item.perceivedValue;
  let finalInitialRange: [number, number] | undefined = undefined;

  if (discoveredFakeOrJackpot) {
    const newUncertaintyForJump = 0.1;
    finalRange = generateValuationRange(item.realValue, undefined, newUncertaintyForJump);
    finalInitialRange = generateValuationRange(item.realValue, undefined, 0.4);
    finalPerceived = undefined;
    newUncertainty = newUncertaintyForJump;
  }

  // === G2 TAG DISCOVERY ===
  let revealedHiddenTag: ItemTag | undefined;
  if (isBreakthrough || discoveredFakeOrJackpot || (uniqueNewTraits.length > 0 && Math.random() < 0.5)) {
    const tagResult = revealNextHiddenTag(item);
    if (tagResult) {
      revealedHiddenTag = tagResult.revealedTag;
    }
  }

  // === NEWS EFFECT: Apply active market modifiers ===
  const newsModifier = getNewsPriceModifier(dailyNews, item.category);
  const itemTags = item.tags || [];
  const tagModifier = getNewsTagPriceModifier(dailyNews, itemTags as string[]);
  const effectiveModifier = Math.abs(newsModifier - 1) >= Math.abs(tagModifier - 1)
    ? newsModifier : tagModifier;
  if (effectiveModifier !== 1.0) {
    finalRange = [
      Math.max(0, Math.round(finalRange[0] * effectiveModifier)),
      Math.max(0, Math.round(finalRange[1] * effectiveModifier))
    ];
  }

  // --- Mastery check ---
  const masteryThreshold = GAME_CONFIG.APPRAISAL.APPRAISAL_MASTERY_THRESHOLD;
  const isMastered = newUncertainty <= masteryThreshold;

  const hasNegativeEvent = event.type === 'MISHAP' || event.type === 'IMPATIENT';

  return {
    newTraitsFound: uniqueNewTraits,
    bonusTraitIds: bonusTraits.map(t => t.id),
    newUncertainty,
    newRange: finalRange,
    event,
    isBreakthrough,
    valueJump: discoveredFakeOrJackpot?.type as 'FAKE' | 'JACKPOT' | undefined,
    isMastered,
    pierceIllusionTriggered,
    revealedHiddenTag,
    patienceCost: totalPatienceCost,
    updatedRevealed,
    updatedHidden,
    hasNegativeEvent,
    finalPerceived,
    initialRange: finalInitialRange,
  };
}
