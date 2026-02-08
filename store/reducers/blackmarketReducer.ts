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
  applyHeatDecay,
  payProtectionFee,
  refuseProtectionFee
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

      // Find the unfulfilled purchase request for this tag
      const requestIndex = state.blackmarket.daily.purchaseRequests.findIndex(
        req => req.tag === tag && !req.fulfilled
      );
      if (requestIndex === -1) return state; // No matching unfulfilled request

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

      // Mark the specific request as fulfilled
      const newPurchaseRequests = [...state.blackmarket.daily.purchaseRequests];
      newPurchaseRequests[requestIndex] = {
        ...newPurchaseRequests[requestIndex],
        fulfilled: true
      };

      // Blackmarket sales reduce Innocence (法律清白度) by 1
      // Breach penalty (Humanity -3, Credibility -1) is deferred until customer returns to redeem
      const newReputation = {
        ...state.reputation,
        [ReputationType.INNOCENCE]: Math.max(0, state.reputation[ReputationType.INNOCENCE] - 1)
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
            purchaseRequests: newPurchaseRequests
          },
          todaySales: newTodaySales
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 以收购价 $${amount} 出售了 ${itemName} (${tag})，清白 -1${breachNote}`
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

      // Blackmarket sales reduce Innocence (法律清白度) by 1
      // Breach penalty (Humanity -3, Credibility -1) is deferred until customer returns to redeem
      const newReputation = {
        ...state.reputation,
        [ReputationType.INNOCENCE]: Math.max(0, state.reputation[ReputationType.INNOCENCE] - 1)
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
          `[黑市] 以出售价 $${amount} 出售了 ${itemName}，清白 -1${breachNote}`
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

      // v3.6 [BM-4]: Check if heat decay is suspended (from undercover visit)
      let newHeat: number;
      if (state.blackmarket.heatDecaySuspended) {
        newHeat = state.blackmarket.heat;
      } else {
        newHeat = applyHeatDecay(state.blackmarket.heat, upgradeLevel);
      }

      // v3.6 [BM-2]: Update tag history
      const todayTags = state.blackmarket.daily.purchaseRequests.map(r => r.tag);
      const newTagHistory = [...todayTags, ...state.blackmarket.tagHistory].slice(0, 24);

      // v3.6 [BM-4]: Sale penalty from risk event
      const salePenaltyPercent = riskEvent?.salePenalty ?? 0;
      const nextHeatDecaySuspended = riskEvent?.suspendHeatDecay ?? false;

      // Generate new daily state with demand inertia
      const newDaily = generateDailyBlackmarketState(upgradeLevel, newTagHistory, salePenaltyPercent);

      // v3.6 [BM-2]: Lv3+ next day preview
      const nextDayPreviewTag = upgradeLevel >= 3 && newDaily.purchaseRequests.length > 0
        ? newDaily.purchaseRequests[Math.floor(Math.random() * newDaily.purchaseRequests.length)].tag
        : null;

      return {
        ...state,
        blackmarket: {
          ...state.blackmarket,
          heat: newHeat,
          daily: newDaily,
          todaySales: [],
          lastRiskEvent: riskEvent,
          tagHistory: newTagHistory,
          nextDayPreviewTag,
          heatDecaySuspended: nextHeatDecaySuspended
        }
      };
    }

    case 'BLACKMARKET_REFRESH_DAILY': {
      // Process start of day (check lock expiration)
      const updatedState = processStartOfDay(state.blackmarket, state.stats.day);

      // Get upgrade level for daily limits
      const upgradeLevel = getBlackMarketContactLevel(state.shopUpgrades);

      // Generate new daily requests if not locked, with upgrade-based purchase limit
      // v3.6 [BM-2]: Pass tagHistory for demand inertia
      const newDaily = updatedState.isLocked
        ? state.blackmarket.daily
        : generateDailyBlackmarketState(upgradeLevel, state.blackmarket.tagHistory);

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

    case 'BLACKMARKET_PAY_PROTECTION_FEE': {
      const { amount } = action.payload;
      if (state.stats.cash < amount) return state;

      const newFeeState = payProtectionFee(state.blackmarket.protectionFee, state.stats.day);

      return {
        ...state,
        stats: {
          ...state.stats,
          cash: state.stats.cash - amount
        },
        blackmarket: {
          ...state.blackmarket,
          protectionFee: newFeeState
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 支付了 $${amount} 保护费`
        ]
      };
    }

    case 'BLACKMARKET_REFUSE_PROTECTION_FEE': {
      const newFeeState = refuseProtectionFee(state.blackmarket.protectionFee, state.stats.day);

      return {
        ...state,
        blackmarket: {
          ...state.blackmarket,
          heat: Math.min(10, state.blackmarket.heat + 1),
          protectionFee: newFeeState
        },
        dayEvents: [
          ...state.dayEvents,
          `[黑市] 拒绝支付保护费，热度 +1`
        ]
      };
    }

    default:
      return state;
  }
}
