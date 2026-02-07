/**
 * Upgrade Reducer
 * Handles shop upgrades and facility management
 */

import { GameState, TransactionRecord } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { purchaseUpgrade, toggleUpgrade, getUpgradeLevelConfig, getEffectiveNightEnergy, getTotalMaintenanceCost } from '../../systems/upgrades';

export function upgradeReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'PURCHASE_UPGRADE': {
            const { upgradeId } = action.payload;
            const levelConfig = getUpgradeLevelConfig(upgradeId,
                (state.shopUpgrades.upgrades.find(u => u.upgradeId === upgradeId)?.currentLevel ?? 0) + 1
            );

            if (!levelConfig || state.stats.cash < levelConfig.cost) {
                playSfx('FAIL');
                return state;
            }

            const { newState, success } = purchaseUpgrade(upgradeId, state.shopUpgrades);
            if (!success) {
                playSfx('FAIL');
                return state;
            }

            playSfx('SUCCESS');

            // Calculate new night energy cap based on upgrades
            const newMaxEnergy = getEffectiveNightEnergy(newState);

            const upgradeRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `设施升级: ${upgradeId}`,
                amount: -levelConfig.cost,
                type: 'UPGRADE' as any
            };

            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - levelConfig.cost },
                shopUpgrades: newState,
                nightState: {
                    ...state.nightState,
                    maxEnergy: newMaxEnergy,
                    energy: Math.min(state.nightState.energy, newMaxEnergy)
                },
                todayTransactions: [...state.todayTransactions, upgradeRecord],
                dayEvents: [...state.dayEvents, `购买设施升级: ${upgradeId} Lv${newState.upgrades.find(u => u.upgradeId === upgradeId)?.currentLevel}`]
            };
        }

        case 'TOGGLE_UPGRADE_ENABLED': {
            const { upgradeId } = action.payload;
            const newUpgradeState = toggleUpgrade(upgradeId, state.shopUpgrades);
            playSfx('CLICK');
            return { ...state, shopUpgrades: newUpgradeState };
        }

        case 'DEDUCT_MAINTENANCE_COST': {
            // Deduct maintenance cost for enabled COUNTER upgrades at night closing
            const maintenanceCost = getTotalMaintenanceCost(state.shopUpgrades);
            if (maintenanceCost <= 0) return state;

            const maintenanceRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: '柜台设施维护费',
                amount: -maintenanceCost,
                type: 'MAINTENANCE' as any
            };

            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - maintenanceCost },
                todayTransactions: [...state.todayTransactions, maintenanceRecord],
                dayEvents: [...state.dayEvents, `支付设施维护费: $${maintenanceCost}`]
            };
        }

        default:
            return state;
    }
}
