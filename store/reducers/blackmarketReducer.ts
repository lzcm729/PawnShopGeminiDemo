/**
 * Black Market Reducer
 * Handles black market transactions, heat management, and risk events
 */

import { GameState, ItemStatus } from '../../types';
import { ReputationType } from '../../systems/core/types';
import { Action } from '../actions/types';
import {
  generateDailyBlackmarketState,
  processStartOfDay,
  applyHeatDecay
} from '../../systems/blackmarket/blackmarketService';
import { getBlackMarketContactLevel } from '../../systems/upgrades/utils';

export function blackmarketReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TOGGLE_BLACKMARKET':
      return {
        ...state,
        showBlackmarket: !state.showBlackmarket,
        // Clear pending selection when closing the panel
        pendingSelectedItemId: !state.showBlackmarket ? state.pendingSelectedItemId : null
      };

    case 'BLACKMARKET_SELL_TO_PURCHASE': {
      const { itemId, itemName, amount, tag, heatGain } = action.payload;

      // Find and remove item from inventory
      const itemIndex = state.inventory.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return state;

      const item = state.inventory[itemIndex];
      // Allow both FORFEIT and ACTIVE items to be sold
      if (item.status !== ItemStatus.FORFEIT && item.status !== ItemStatus.ACTIVE) return state;

      // Check purchase limit
      if (state.blackmarket.daily.purchasedCount >= state.blackmarket.daily.purchaseLimit) {
        return state;
      }

      // Check if this is a breach (selling ACTIVE item in redemption period)
      const isBreach = item.status === ItemStatus.ACTIVE;

      const newInventory = [...state.inventory];
      newInventory[itemIndex] = {
        ...item,
        status: ItemStatus.SOLD,
        // Track breach sale day for later penalty when customer returns
        ...(isBreach ? { breachSaleDay: state.stats.day } : {})
      };

      // Update heat (capped at 10)
      const newHeat = Math.min(10, state.blackmarket.heat + heatGain);

      // Record transaction
      const newTodaySales = [
        ...state.blackmarket.todaySales,
        { itemId, itemName, amount, type: 'PURCHASE' as const }
      ];

      // Blackmarket sales always grant Underworld reputation (+2)
      // Breach penalty (Humanity -3, Credibility -1) is deferred until customer returns to redeem
      const newReputation = {
        ...state.reputation,
        [ReputationType.UNDERWORLD]: Math.min(100, state.reputation[ReputationType.UNDERWORLD] + 2)
      };

      const breachNote = isBreach ? ' (违约出售，待结算时扣减声誉)' : '';

      return {
        ...state,
        inventory: newInventory,
        reputation: newReputation,
        stats: {
          ...state.stats,
          cash: state.stats.cash + amount
        },
        blackmarket: {
          ...state.blackmarket,
          heat: newHeat,
          daily: {
            ...state.blackmarket.daily,
            purchasedCount: state.blackmarket.daily.purchasedCount + 1
          },
          todaySales: newTodaySales
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 以收购价 $${amount} 出售了 ${itemName} (${tag})，黑道 +2${breachNote}`
        ]
      };
    }

    case 'BLACKMARKET_SELL_DIRECT': {
      const { itemId, itemName, amount, heatGain } = action.payload;

      // Find and remove item from inventory
      const itemIndex = state.inventory.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return state;

      const item = state.inventory[itemIndex];
      // Allow both FORFEIT and ACTIVE items to be sold
      if (item.status !== ItemStatus.FORFEIT && item.status !== ItemStatus.ACTIVE) return state;

      // Check if this is a breach (selling ACTIVE item in redemption period)
      const isBreach = item.status === ItemStatus.ACTIVE;

      const newInventory = [...state.inventory];
      newInventory[itemIndex] = {
        ...item,
        status: ItemStatus.SOLD,
        // Track breach sale day for later penalty when customer returns
        ...(isBreach ? { breachSaleDay: state.stats.day } : {})
      };

      // Update heat (capped at 10)
      const newHeat = Math.min(10, state.blackmarket.heat + heatGain);

      // Record transaction
      const newTodaySales = [
        ...state.blackmarket.todaySales,
        { itemId, itemName, amount, type: 'SALE' as const }
      ];

      // Blackmarket sales always grant Underworld reputation (+2)
      // Breach penalty (Humanity -3, Credibility -1) is deferred until customer returns to redeem
      const newReputation = {
        ...state.reputation,
        [ReputationType.UNDERWORLD]: Math.min(100, state.reputation[ReputationType.UNDERWORLD] + 2)
      };

      const breachNote = isBreach ? ' (违约出售，待结算时扣减声誉)' : '';

      return {
        ...state,
        inventory: newInventory,
        reputation: newReputation,
        stats: {
          ...state.stats,
          cash: state.stats.cash + amount
        },
        blackmarket: {
          ...state.blackmarket,
          heat: newHeat,
          todaySales: newTodaySales
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 以出售价 $${amount} 出售了 ${itemName}，黑道 +2${breachNote}`
        ]
      };
    }

    case 'BLACKMARKET_PAY_FINE': {
      const { amount } = action.payload;

      if (state.stats.cash < amount) return state;

      return {
        ...state,
        stats: {
          ...state.stats,
          cash: state.stats.cash - amount
        },
        blackmarket: {
          ...state.blackmarket,
          lastRiskEvent: null  // Clear the risk event
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 支付了 $${amount} 避免搜查`
        ]
      };
    }

    case 'BLACKMARKET_ACCEPT_LOCKDOWN': {
      const { lockDays } = action.payload;
      const lockUntilDay = state.stats.day + lockDays;

      // Apply reputation loss if it was a formal investigation
      let newReputation = state.reputation;
      if (state.blackmarket.lastRiskEvent?.reputationLoss) {
        newReputation = {
          ...state.reputation,
          [ReputationType.CREDIBILITY]: Math.max(
            0,
            state.reputation[ReputationType.CREDIBILITY] - state.blackmarket.lastRiskEvent.reputationLoss
          )
        };
      }

      return {
        ...state,
        reputation: newReputation,
        blackmarket: {
          ...state.blackmarket,
          isLocked: true,
          lockUntilDay,
          lastRiskEvent: null
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 黑市关闭 ${lockDays} 天`
        ]
      };
    }

    case 'BLACKMARKET_PROCESS_DAY_END': {
      const { riskEvent } = action.payload;

      // Get upgrade level for heat decay rate and daily limits
      const upgradeLevel = getBlackMarketContactLevel(state.shopUpgrades);

      // Apply heat decay (rate depends on upgrade level)
      const newHeat = applyHeatDecay(state.blackmarket.heat, upgradeLevel);

      // Generate new daily state with upgrade-based purchase limit
      const newDaily = generateDailyBlackmarketState(upgradeLevel);

      return {
        ...state,
        blackmarket: {
          ...state.blackmarket,
          heat: newHeat,
          daily: newDaily,
          todaySales: [],
          lastRiskEvent: riskEvent
        }
      };
    }

    case 'BLACKMARKET_REFRESH_DAILY': {
      // Process start of day (check lock expiration)
      const updatedState = processStartOfDay(state.blackmarket, state.stats.day);

      // Get upgrade level for daily limits
      const upgradeLevel = getBlackMarketContactLevel(state.shopUpgrades);

      // Generate new daily requests if not locked, with upgrade-based purchase limit
      const newDaily = updatedState.isLocked
        ? state.blackmarket.daily
        : generateDailyBlackmarketState(upgradeLevel);

      return {
        ...state,
        blackmarket: {
          ...updatedState,
          daily: newDaily,
          todaySales: []
        }
      };
    }

    case 'SET_BLACKMARKET_STATE': {
      return {
        ...state,
        blackmarket: action.payload
      };
    }

    default:
      return state;
  }
}
