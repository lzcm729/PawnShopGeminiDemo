
// Shop Upgrade Utility Functions
// Helpers for computing upgrade effects and managing upgrade state

import { ShopUpgradeState, UpgradeEffects, OwnedUpgrade, AppointmentBoardLevelConfig } from './types';
import { getUpgradeConfig, getUpgradeLevelConfig, AVAILABLE_UPGRADES, BASE_INVENTORY_CAPACITY, getAppointmentBoardLevelConfig } from './config';
import { GAME_CONFIG } from '../game/config';

/**
 * Calculate all active upgrade effects
 */
export function computeUpgradeEffects(upgradeState: ShopUpgradeState): UpgradeEffects {
  const effects: UpgradeEffects = {
    inventoryCapacityBonus: 0,
    nightEnergyBonus: 0,
    patienceBonus: 0,
    anomalyDetectionLevel: 0,
    appointmentSlots: 0,
    totalMaintenanceCost: 0,
  };

  for (const owned of upgradeState.upgrades) {
    const config = getUpgradeConfig(owned.upgradeId);
    if (!config) continue;

    // Skip disabled COUNTER upgrades
    if (config.location === 'COUNTER' && !owned.enabled) continue;

    const levelConfig = getUpgradeLevelConfig(owned.upgradeId, owned.currentLevel);
    if (!levelConfig) continue;

    // Apply effect based on type
    switch (config.effectType) {
      case 'INVENTORY_CAPACITY':
        effects.inventoryCapacityBonus += levelConfig.effectValue;
        break;
      case 'NIGHT_ENERGY':
        effects.nightEnergyBonus += levelConfig.effectValue;
        break;
      case 'PATIENCE_BONUS':
        effects.patienceBonus += levelConfig.effectValue;
        break;
      case 'ANOMALY_DETECTION':
        effects.anomalyDetectionLevel = Math.max(effects.anomalyDetectionLevel, levelConfig.effectValue);
        break;
      case 'APPOINTMENT_BOARD':
        effects.appointmentSlots = levelConfig.effectValue;
        break;
    }

    // Add maintenance cost for enabled COUNTER upgrades
    if (config.location === 'COUNTER' && owned.enabled && levelConfig.maintenanceCost) {
      effects.totalMaintenanceCost += levelConfig.maintenanceCost;
    }
  }

  return effects;
}

/**
 * Get the effective inventory capacity (base + upgrades)
 */
export function getEffectiveInventoryCapacity(upgradeState: ShopUpgradeState): number {
  const effects = computeUpgradeEffects(upgradeState);
  return BASE_INVENTORY_CAPACITY + effects.inventoryCapacityBonus;
}

/**
 * Get the effective night energy cap (base + upgrades)
 */
export function getEffectiveNightEnergy(upgradeState: ShopUpgradeState): number {
  const effects = computeUpgradeEffects(upgradeState);
  return GAME_CONFIG.NIGHT.BASE_ENERGY + effects.nightEnergyBonus;
}

/**
 * Check if an upgrade can be purchased
 */
export function canPurchaseUpgrade(
  upgradeId: string,
  currentCash: number,
  upgradeState: ShopUpgradeState
): { canPurchase: boolean; reason?: string; cost?: number; nextLevel?: number } {
  const config = getUpgradeConfig(upgradeId);
  if (!config) {
    return { canPurchase: false, reason: 'Unknown upgrade' };
  }

  const owned = upgradeState.upgrades.find(u => u.upgradeId === upgradeId);
  const currentLevel = owned?.currentLevel ?? 0;

  if (currentLevel >= config.maxLevel) {
    return { canPurchase: false, reason: 'Already at max level' };
  }

  const nextLevel = currentLevel + 1;
  const levelConfig = getUpgradeLevelConfig(upgradeId, nextLevel);
  if (!levelConfig) {
    return { canPurchase: false, reason: 'Invalid level configuration' };
  }

  if (currentCash < levelConfig.cost) {
    return { canPurchase: false, reason: `Insufficient funds (need $${levelConfig.cost})`, cost: levelConfig.cost, nextLevel };
  }

  return { canPurchase: true, cost: levelConfig.cost, nextLevel };
}

/**
 * Get the current level of an upgrade (0 if not owned)
 */
export function getUpgradeLevel(upgradeId: string, upgradeState: ShopUpgradeState): number {
  const owned = upgradeState.upgrades.find(u => u.upgradeId === upgradeId);
  return owned?.currentLevel ?? 0;
}

/**
 * Get all available upgrades with their purchase status
 */
export function getAvailableUpgradesWithStatus(currentCash: number, upgradeState: ShopUpgradeState) {
  return AVAILABLE_UPGRADES.map(config => {
    const currentLevel = getUpgradeLevel(config.id, upgradeState);
    const purchaseInfo = canPurchaseUpgrade(config.id, currentCash, upgradeState);
    const nextLevelConfig = currentLevel < config.maxLevel
      ? getUpgradeLevelConfig(config.id, currentLevel + 1)
      : null;

    return {
      config,
      currentLevel,
      isMaxLevel: currentLevel >= config.maxLevel,
      canPurchase: purchaseInfo.canPurchase,
      purchaseReason: purchaseInfo.reason,
      nextLevelCost: purchaseInfo.cost,
      nextLevelConfig,
    };
  });
}

/**
 * Purchase an upgrade and return updated state
 * Note: This is a pure function, actual state update happens in reducer
 */
export function purchaseUpgrade(
  upgradeId: string,
  upgradeState: ShopUpgradeState
): { newState: ShopUpgradeState; success: boolean } {
  const config = getUpgradeConfig(upgradeId);
  if (!config) {
    return { newState: upgradeState, success: false };
  }

  const existingIndex = upgradeState.upgrades.findIndex(u => u.upgradeId === upgradeId);
  const currentLevel = existingIndex >= 0 ? upgradeState.upgrades[existingIndex].currentLevel : 0;

  if (currentLevel >= config.maxLevel) {
    return { newState: upgradeState, success: false };
  }

  const newLevel = currentLevel + 1;
  const newUpgrade: OwnedUpgrade = {
    upgradeId,
    currentLevel: newLevel,
    enabled: true, // New purchases are enabled by default
  };

  let newUpgrades: OwnedUpgrade[];
  if (existingIndex >= 0) {
    // Update existing
    newUpgrades = [...upgradeState.upgrades];
    newUpgrades[existingIndex] = newUpgrade;
  } else {
    // Add new
    newUpgrades = [...upgradeState.upgrades, newUpgrade];
  }

  return {
    newState: { upgrades: newUpgrades },
    success: true,
  };
}

/**
 * Toggle an upgrade on/off (for COUNTER upgrades only)
 */
export function toggleUpgrade(
  upgradeId: string,
  upgradeState: ShopUpgradeState
): ShopUpgradeState {
  const config = getUpgradeConfig(upgradeId);
  if (!config || config.location !== 'COUNTER') {
    return upgradeState;
  }

  const existingIndex = upgradeState.upgrades.findIndex(u => u.upgradeId === upgradeId);
  if (existingIndex < 0) {
    return upgradeState;
  }

  const newUpgrades = [...upgradeState.upgrades];
  newUpgrades[existingIndex] = {
    ...newUpgrades[existingIndex],
    enabled: !newUpgrades[existingIndex].enabled,
  };

  return { upgrades: newUpgrades };
}

/**
 * Get the total daily maintenance cost for all enabled COUNTER upgrades
 */
export function getTotalMaintenanceCost(upgradeState: ShopUpgradeState): number {
  const effects = computeUpgradeEffects(upgradeState);
  return effects.totalMaintenanceCost;
}

/**
 * Get the patience bonus from Tea Set upgrade
 */
export function getPatienceBonus(upgradeState: ShopUpgradeState): number {
  const effects = computeUpgradeEffects(upgradeState);
  return effects.patienceBonus;
}

/**
 * Get the anomaly detection threshold from Spectrometer upgrade
 * Returns the percentage threshold (e.g., 50 means alert if difference > 50%)
 * Returns 0 if spectrometer is not active (meaning no detection)
 */
export function getAnomalyDetectionThreshold(upgradeState: ShopUpgradeState): number {
  const effects = computeUpgradeEffects(upgradeState);
  // anomalyDetectionLevel stores the threshold value directly (50, 30, or 20)
  return effects.anomalyDetectionLevel;
}

/**
 * Check if an item should trigger an anomaly alert
 * Returns true if the item's visual value differs from real value by more than the threshold
 */
export function checkItemAnomaly(
  perceivedValue: number | undefined,
  realValue: number,
  upgradeState: ShopUpgradeState
): boolean {
  const threshold = getAnomalyDetectionThreshold(upgradeState);
  if (threshold === 0) return false; // No spectrometer or disabled

  // If perceived value is undefined, use real value (no anomaly)
  const visualValue = perceivedValue ?? realValue;
  if (visualValue === 0 || realValue === 0) return false;

  // Calculate percentage difference
  const difference = Math.abs(visualValue - realValue);
  const percentDiff = (difference / realValue) * 100;

  return percentDiff > threshold;
}

/**
 * Get all owned COUNTER upgrades for toggle UI
 */
export function getCounterUpgradesForToggle(upgradeState: ShopUpgradeState) {
  return upgradeState.upgrades
    .filter(owned => {
      const config = getUpgradeConfig(owned.upgradeId);
      return config?.location === 'COUNTER';
    })
    .map(owned => {
      const config = getUpgradeConfig(owned.upgradeId)!;
      const levelConfig = getUpgradeLevelConfig(owned.upgradeId, owned.currentLevel);
      return {
        upgradeId: owned.upgradeId,
        name: config.name,
        nameCn: config.nameCn,
        currentLevel: owned.currentLevel,
        enabled: owned.enabled,
        maintenanceCost: levelConfig?.maintenanceCost || 0,
        icon: config.icon,
      };
    });
}

/**
 * Get the current appointment board level (0 if not purchased)
 */
export function getAppointmentBoardLevel(upgradeState: ShopUpgradeState): number {
  const owned = upgradeState.upgrades.find(u => u.upgradeId === 'appointment_board');
  return owned?.currentLevel ?? 0;
}

/**
 * Get the active appointment board configuration based on current level
 * Returns null if appointment board is not purchased
 */
export function getActiveAppointmentBoardConfig(upgradeState: ShopUpgradeState): AppointmentBoardLevelConfig | null {
  const level = getAppointmentBoardLevel(upgradeState);
  if (level === 0) return null;
  return getAppointmentBoardLevelConfig(level) || null;
}

/**
 * Check if appointment board is unlocked
 */
export function hasAppointmentBoard(upgradeState: ShopUpgradeState): boolean {
  return getAppointmentBoardLevel(upgradeState) > 0;
}
