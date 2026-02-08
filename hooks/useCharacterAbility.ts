/**
 * Character Ability System - React Hook
 *
 * Provides the main interface for UI components to interact with the ability system.
 * Reads ability state from GameContext and exposes skill queries and actions.
 *
 * Usage:
 *   const { canUseSkill, useSkill, getPanelData, ... } = useCharacterAbility();
 */

import { useCallback, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { BehaviorTag } from '../types';
import {
  SkillId,
  AbilityState,
  AbilityPanelData,
  FloorReductionResult,
  ForesightResult,
  ConsequenceFlashResult,
  ContractTierHint,
  ComfortResult,
  ExtraCareResult,
  TransactionEssenceGain,
} from '../systems/characterAbility/types';
import {
  isSkillUnlocked,
  canUseSkillInNegotiation,
  calculatePressureEffect,
  calculateHeartStrikeEffect,
  calculateSharpScrutinyEffect,
  isFloorCapReached,
  generateForesightResult,
  generateContractTierHints,
  generateConsequenceFlash,
  canUseComfort,
  calculateComfortEffect,
  canUseExtraCare,
  calculateExtraCareEffect,
  shouldSuppressFlawPatienceCost,
  getSenseHiddenHint,
  getPierceIllusionEffect,
  hasEmpathyBonus,
  canUnlockSkill,
} from '../systems/characterAbility/abilityEngine';
import { generatePanelData } from '../systems/characterAbility/panelData';
import {
  calculateTransactionEssenceGain,
  calculateStolenGoodsEssenceGain,
} from '../systems/characterAbility/essenceSystem';
import { SKILL_DEFINITIONS } from '../systems/characterAbility/skillDefinitions';

// ============================================================================
// Hook Interface
// ============================================================================

interface UseCharacterAbilityReturn {
  // State queries
  abilityState: AbilityState;
  isUnlocked: (skillId: SkillId) => boolean;

  // Skill tree panel
  getPanelData: () => AbilityPanelData;

  // Unlock
  canUnlock: (skillId: SkillId) => { canUnlock: boolean; meetsPrereqs: boolean; hasEssence: boolean; hasEnergy: boolean };
  unlockSkill: (skillId: SkillId) => void;

  // Negotiation skills
  canUseInNegotiation: (skillId: SkillId) => boolean;
  applyPressure: (originalFloor: number, currentFloor: number, afterConcession: boolean, existingReduction: number) => FloorReductionResult;
  applyHeartStrike: (originalFloor: number, currentFloor: number, behaviorTags: BehaviorTag[], afterConcession: boolean, existingReduction: number) => FloorReductionResult;
  getSharpScrutinyReduction: (originalFloor: number, currentFloor: number, flawCount: number, existingReduction: number) => FloorReductionResult;
  isCapReached: (existingReduction: number) => boolean;

  // Passive skill queries
  hasSenseHidden: () => boolean;
  senseHiddenHint: (hasHiddenTraits: boolean) => 'HAS_HIDDEN' | 'NO_HIDDEN';
  hasPierceIllusion: () => boolean;
  pierceIllusionEffect: (isFake: boolean) => 'REVEAL_FAKE' | 'GUARANTEE_TRAIT';
  hasEmpathy: () => boolean;
  hasPokerFace: () => boolean;

  // Foresight
  hasForesight: () => boolean;
  getForesight: (redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None', itemRealValue: number) => ForesightResult;
  hasSeeConsequence: () => boolean;
  getContractHints: (npcHope: number | undefined, isDesperateTag: boolean) => ContractTierHint[];
  getConsequenceFlash: (hopeChange: number) => ConsequenceFlashResult;

  // Departure skills
  canComfort: (hasActiveChain: boolean, npcHope: number | undefined, behaviorTags: BehaviorTag[]) => boolean;
  applyComfort: () => ComfortResult;
  canExtraCare: (interestRate: number) => boolean;
  applyExtraCare: () => ExtraCareResult;

  // Essence gain
  getTransactionEssenceGain: (interestRate: number) => TransactionEssenceGain;
  getStolenGoodsEssenceGain: () => TransactionEssenceGain;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCharacterAbility(): UseCharacterAbilityReturn {
  const { state, dispatch } = useGame();

  // AbilityState may not exist yet if this is an old save
  const abilityState: AbilityState = state.abilityState ?? {
    skills: Object.fromEntries(
      Object.keys(SKILL_DEFINITIONS).map(id => [id, { unlocked: false, useCount: 0 }])
    ),
    moralEchoQueue: [],
    wordOfMouth: { failStreak: 0, pendingChecks: [] },
    foresightFatigue: { totalFlashes: 0, fatigued: false },
    skillsUsedThisNegotiation: [],
    extraCareUsedThisDeparture: false,
  } as AbilityState;

  const { reputation, essenceBalance, nightState } = state;

  // --- State queries ---

  const isUnlocked = useCallback(
    (skillId: SkillId) => isSkillUnlocked(skillId, abilityState),
    [abilityState]
  );

  // --- Panel data ---

  const getPanelDataCb = useCallback(
    () => generatePanelData(abilityState, essenceBalance, nightState.energy),
    [abilityState, essenceBalance, nightState.energy]
  );

  // --- Unlock ---

  const canUnlockCb = useCallback(
    (skillId: SkillId) => canUnlockSkill(skillId, abilityState, essenceBalance, nightState.energy),
    [abilityState, essenceBalance, nightState.energy]
  );

  const unlockSkill = useCallback(
    (skillId: SkillId) => {
      const check = canUnlockSkill(skillId, abilityState, essenceBalance, nightState.energy);
      if (!check.canUnlock) return;

      const def = SKILL_DEFINITIONS[skillId];

      // Dispatch essence spend
      if (def.essenceCost.craft || def.essenceCost.time || def.essenceCost.vibe) {
        dispatch({ type: 'SPEND_ESSENCE_BATCH', payload: def.essenceCost });
      }

      // Dispatch energy consume
      dispatch({ type: 'CONSUME_NIGHT_ENERGY', payload: def.energyCost });

      // Dispatch skill unlock
      dispatch({ type: 'UNLOCK_ABILITY_SKILL', payload: { skillId } });

      // Record night action
      dispatch({ type: 'RECORD_NIGHT_ACTION', payload: `修行: ${def.name}` });
    },
    [abilityState, essenceBalance, nightState.energy, dispatch]
  );

  // --- Negotiation skills ---

  const canUseInNegotiation = useCallback(
    (skillId: SkillId) => canUseSkillInNegotiation(skillId, abilityState, state.stats.actionPoints),
    [abilityState, state.stats.actionPoints]
  );

  const applyPressure = useCallback(
    (originalFloor: number, currentFloor: number, afterConcession: boolean, existingReduction: number) =>
      calculatePressureEffect(originalFloor, currentFloor, reputation, afterConcession, existingReduction),
    [reputation]
  );

  const applyHeartStrike = useCallback(
    (originalFloor: number, currentFloor: number, behaviorTags: BehaviorTag[], afterConcession: boolean, existingReduction: number) =>
      calculateHeartStrikeEffect(originalFloor, currentFloor, reputation, behaviorTags, afterConcession, existingReduction),
    [reputation]
  );

  const getSharpScrutinyReduction = useCallback(
    (originalFloor: number, currentFloor: number, flawCount: number, existingReduction: number) =>
      calculateSharpScrutinyEffect(originalFloor, currentFloor, reputation, flawCount, existingReduction),
    [reputation]
  );

  const isCapReached = useCallback(
    (existingReduction: number) => isFloorCapReached(existingReduction),
    []
  );

  // --- Passive skill queries ---

  const hasSenseHidden = useCallback(() => isUnlocked('SENSE_HIDDEN'), [isUnlocked]);
  const senseHiddenHint = useCallback(
    (hasHiddenTraits: boolean) => getSenseHiddenHint(hasHiddenTraits),
    []
  );
  const hasPierceIllusion = useCallback(() => isUnlocked('PIERCE_ILLUSION'), [isUnlocked]);
  const pierceIllusionEffect = useCallback(
    (isFake: boolean) => getPierceIllusionEffect(isFake),
    []
  );
  const hasEmpathyCb = useCallback(() => hasEmpathyBonus(abilityState), [abilityState]);
  const hasPokerFace = useCallback(
    () => shouldSuppressFlawPatienceCost(abilityState),
    [abilityState]
  );

  // --- Foresight ---

  const hasForesight = useCallback(() => isUnlocked('FORESIGHT'), [isUnlocked]);
  const getForesight = useCallback(
    (redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None', itemRealValue: number) =>
      generateForesightResult(redemptionResolve, itemRealValue),
    []
  );
  const hasSeeConsequence = useCallback(() => isUnlocked('SEE_CONSEQUENCE'), [isUnlocked]);
  const getContractHints = useCallback(
    (npcHope: number | undefined, isDesperateTag: boolean) =>
      generateContractTierHints(npcHope, isDesperateTag),
    []
  );
  const getConsequenceFlash = useCallback(
    (hopeChange: number) => generateConsequenceFlash(hopeChange, abilityState.foresightFatigue),
    [abilityState.foresightFatigue]
  );

  // --- Departure skills ---

  const canComfortCb = useCallback(
    (hasActiveChain: boolean, npcHope: number | undefined, behaviorTags: BehaviorTag[]) => {
      if (!isUnlocked('COMFORT')) return false;
      return canUseComfort(hasActiveChain, npcHope, behaviorTags);
    },
    [isUnlocked]
  );

  const applyComfortCb = useCallback(
    () => calculateComfortEffect(reputation),
    [reputation]
  );

  const canExtraCareCb = useCallback(
    (interestRate: number) => {
      if (!isUnlocked('CHERISH_ALL')) return false;
      if (abilityState.extraCareUsedThisDeparture) return false;
      return canUseExtraCare(interestRate);
    },
    [isUnlocked, abilityState.extraCareUsedThisDeparture]
  );

  const applyExtraCareCb = useCallback(
    () => calculateExtraCareEffect(reputation),
    [reputation]
  );

  // --- Essence gain ---

  const getTransactionEssenceGain = useCallback(
    (interestRate: number) => calculateTransactionEssenceGain(interestRate),
    []
  );

  const getStolenGoodsEssenceGain = useCallback(
    () => calculateStolenGoodsEssenceGain(),
    []
  );

  return {
    abilityState,
    isUnlocked,
    getPanelData: getPanelDataCb,
    canUnlock: canUnlockCb,
    unlockSkill,
    canUseInNegotiation,
    applyPressure,
    applyHeartStrike,
    getSharpScrutinyReduction,
    isCapReached,
    hasSenseHidden,
    senseHiddenHint,
    hasPierceIllusion,
    pierceIllusionEffect,
    hasEmpathy: hasEmpathyCb,
    hasPokerFace,
    hasForesight,
    getForesight,
    hasSeeConsequence,
    getContractHints,
    getConsequenceFlash,
    canComfort: canComfortCb,
    applyComfort: applyComfortCb,
    canExtraCare: canExtraCareCb,
    applyExtraCare: applyExtraCareCb,
    getTransactionEssenceGain,
    getStolenGoodsEssenceGain,
  };
}
