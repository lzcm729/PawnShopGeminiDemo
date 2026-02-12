/**
 * Character Ability System - Panel Data Generator
 *
 * Generates structured data for the skill tree UI panel.
 * All skill information is visible to the player (design: transparency principle).
 *
 * Design doc: v1.4 section 10
 */

import { EssenceBalance } from '../economy/essence';
import { AbilityState, AbilityPanelData } from './types';
import { SKILL_DEFINITIONS, ALL_SKILL_IDS } from './skillDefinitions';
import { canUnlockSkill } from './abilityEngine';

/**
 * Generate panel data for the skill tree UI.
 *
 * @param abilityState Current ability system state
 * @param essenceBalance Current essence balance
 * @param currentEnergy Current night energy
 */
export function generatePanelData(
  abilityState: AbilityState,
  essenceBalance: EssenceBalance,
  currentEnergy: number,
  essenceDiscountPercent: number = 0
): AbilityPanelData {
  const skills = ALL_SKILL_IDS.map(id => {
    const def = SKILL_DEFINITIONS[id];
    const state = abilityState.skills[id];
    const check = canUnlockSkill(id, abilityState, essenceBalance, currentEnergy, essenceDiscountPercent);

    return {
      def,
      state,
      canUnlock: check.canUnlock,
      meetsPrerequisites: check.meetsPrereqs,
      hasEnoughEssence: check.hasEssence,
      hasEnoughEnergy: check.hasEnergy,
    };
  });

  return {
    skills,
    essenceBalance: { ...essenceBalance },
    currentEnergy,
  };
}
