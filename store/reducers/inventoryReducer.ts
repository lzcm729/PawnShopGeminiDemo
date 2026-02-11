/**
 * Inventory Reducer
 * Handles inventory item state changes (pawn, redeem, forfeit, sell, etc.)
 */

import { GameState, ReputationType, ItemStatus, TransactionRecord, SatisfactionLevel, ReputationProfile } from '../../types';
import { clampReputation } from '../../systems/core/reputationUtils';
import { PostForfeitSatisfaction } from '../../systems/narrative/types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { generateRedeemLog, generateForfeitLog, generateSoldLog } from '../../systems/game/utils/logGenerator';
import { GamePhase } from '../../systems/core/phases';
import { calculateTaggedValue } from '../../systems/items/tagUtils';
import { getRenewalRefusalPenalty } from '../../systems/economy/renewalPenalty';

export function inventoryReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'LIQUIDATE_ITEM': {
            const { itemId, amount, name } = action.payload;
            playSfx('CASH');
            const soldInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const soldLog = generateSoldLog(item, state.stats.day, amount);
                    return { ...item, status: ItemStatus.SOLD, logs: [...(item.logs || []), soldLog] };
                }
                return item;
            });
            const saleRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `绝当变现: ${name}`,
                amount: amount,
                type: 'SELL'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + amount },
                inventory: soldInventory,
                todayTransactions: [...state.todayTransactions, saleRecord],
                dayEvents: [...state.dayEvents, `出售过期物品: ${name} (+$${amount})`]
            };
        }

        case 'REDEEM_ITEM': {
            const { itemId, paymentAmount, name } = action.payload;
            playSfx('CASH');
            const redeemItem = state.inventory.find(i => i.id === itemId);
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const redeemLog = generateRedeemLog(state.currentCustomer?.name || "顾客", item, state.stats.day, paymentAmount);
                    return { ...item, status: ItemStatus.REDEEMED, logs: [...(item.logs || []), redeemLog] };
                }
                return item;
            });
            const record: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `顾客赎回: ${name}`,
                amount: paymentAmount,
                type: 'REDEEM'
            };
            // S2-F4: 修复后归还声誉奖励 人情+10
            let redeemRep = { ...state.reputation };
            if (redeemItem?.wasRestored) {
                redeemRep[ReputationType.HUMANITY] = Math.min(100, redeemRep[ReputationType.HUMANITY] + 10);
            }
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + paymentAmount },
                reputation: redeemRep,
                inventory: updatedInventory,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `${name} 已被赎回 (收回资金 $${paymentAmount})${redeemItem?.wasRestored ? ' [修复归还: 人情+10]' : ''}`]
            };
        }

        case 'EXTEND_PAWN': {
            const { itemId, interestPaid, newDueDate, name } = action.payload;
            playSfx('CASH');
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId && item.pawnInfo) {
                    return {
                        ...item,
                        pawnInfo: {
                            ...item.pawnInfo,
                            dueDate: newDueDate,
                            extensionCount: (item.pawnInfo.extensionCount || 0) + 1
                        }
                    };
                }
                return item;
            });
            const record: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `续当利息: ${name}`,
                amount: interestPaid,
                type: 'EXTEND'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + interestPaid },
                inventory: updatedInventory,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `${name} 续当一周 (收取利息 $${interestPaid})`]
            };
        }

        case 'REFUSE_EXTENSION': {
            const { itemId, name, extensionCount } = action.payload;
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const log = generateForfeitLog(item, state.stats.day, "拒绝续当");
                    return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] };
                }
                return item;
            });
            // Escalating penalty: more prior renewals = harsher humanity loss
            const humanityPenalty = getRenewalRefusalPenalty(extensionCount);
            const newRep = { ...state.reputation };
            newRep[ReputationType.HUMANITY] = Math.max(0, newRep[ReputationType.HUMANITY] + humanityPenalty);
            const servedCount = state.customersServedToday + 1;
            return {
                ...state,
                inventory: updatedInventory,
                reputation: newRep,
                customersServedToday: servedCount,
                phase: { type: 'DEPARTURE' } as GamePhase,
                dayEvents: [...state.dayEvents, `拒绝续当: ${name}。物品已收归店铺 (Humanity ${humanityPenalty})。`],
                unseenForfeitItemIds: [...state.unseenForfeitItemIds, itemId]
            };
        }

        case 'EXPIRE_ITEMS': {
            const { expiredItemIds, logs } = action.payload;
            if (expiredItemIds.length === 0) return state;
            const updatedInventory = state.inventory.map(item => {
                if (expiredItemIds.includes(item.id)) {
                    const forfeitLog = generateForfeitLog(item, state.stats.day);
                    return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), forfeitLog] };
                }
                return item;
            });
            return {
                ...state,
                inventory: updatedInventory,
                dayEvents: [...state.dayEvents, ...logs],
                unseenForfeitItemIds: [...state.unseenForfeitItemIds, ...expiredItemIds]
            };
        }

        case 'FORCE_FORFEIT': {
            const { itemId, name } = action.payload;
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const log = generateForfeitLog(item, state.stats.day, "强制送客");
                    return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] };
                }
                return item;
            });
            const servedCount = state.customersServedToday + 1;
            return {
                ...state,
                inventory: updatedInventory,
                customersServedToday: servedCount,
                phase: { type: 'DEPARTURE' } as GamePhase,
                dayEvents: [...state.dayEvents, `送客处置: ${name} 强制收归店铺所有。`],
                unseenForfeitItemIds: [...state.unseenForfeitItemIds, itemId]
            };
        }

        case 'DEFAULT_SELL_ITEM': {
            const { itemId, amount, name } = action.payload;
            playSfx('CASH');
            const soldInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const soldLog = generateSoldLog(item, state.stats.day, amount);
                    return { ...item, status: ItemStatus.SOLD, logs: [...(item.logs || []), soldLog] };
                }
                return item;
            });
            const saleRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `违约出售: ${name}`,
                amount: amount,
                type: 'SELL'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + amount },
                inventory: soldInventory,
                todayTransactions: [...state.todayTransactions, saleRecord],
                dayEvents: [...state.dayEvents, `违约出售活跃当品: ${name} (+$${amount})`]
            };
        }

        case 'SELL_FORFEIT_ITEM': {
            const { itemId, amount, name } = action.payload;
            playSfx('CASH');
            const soldInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const soldLog = generateSoldLog(item, state.stats.day, amount);
                    return { ...item, status: ItemStatus.SOLD, logs: [...(item.logs || []), soldLog] };
                }
                return item;
            });
            const saleRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `清算绝当品: ${name}`,
                amount: amount,
                type: 'SELL'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + amount },
                inventory: soldInventory,
                todayTransactions: [...state.todayTransactions, saleRecord],
                dayEvents: [...state.dayEvents, `清算绝当品: ${name} (+$${amount})`]
            };
        }

        case 'RESOLVE_BREACH': {
            const { penalty, name } = action.payload;
            playSfx('FAIL');
            const newRep = { ...state.reputation };
            newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 10);
            const record: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `违约赔偿: ${name}`,
                amount: -penalty,
                type: 'PENALTY'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - penalty },
                reputation: newRep,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `支付违约金: ${name} (-$${penalty})，信誉大幅下降。`]
            };
        }

        case 'HOSTILE_TAKEOVER': {
            const { itemId, penalty, name } = action.payload;
            playSfx('FAIL');
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const log = generateForfeitLog(item, state.stats.day, "恶意买断");
                    return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] };
                }
                return item;
            });
            const newRep = { ...state.reputation };
            newRep[ReputationType.HUMANITY] = Math.max(0, newRep[ReputationType.HUMANITY] - 15);
            newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 10);
            newRep[ReputationType.INNOCENCE] = Math.max(0, newRep[ReputationType.INNOCENCE] - 5);
            const record: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `强制买断: ${name}`,
                amount: -penalty,
                type: 'PENALTY'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - penalty },
                inventory: updatedInventory,
                reputation: newRep,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `恶意违约/强制买断: ${name} (-$${penalty})。顾客极度愤怒。`]
            };
        }

        case 'ACCEPT_RENEWAL': {
            const { itemId, extensionDays, interestBonus, name } = action.payload;
            playSfx('STAMP');
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId && item.pawnInfo) {
                    return {
                        ...item,
                        pawnInfo: {
                            ...item.pawnInfo,
                            dueDate: item.pawnInfo.dueDate + extensionDays,
                            interestRate: item.pawnInfo.interestRate + interestBonus,
                            extensionCount: (item.pawnInfo.extensionCount || 0) + 1
                        }
                    };
                }
                return item;
            });
            const servedCount = state.customersServedToday + 1;
            return {
                ...state,
                inventory: updatedInventory,
                customersServedToday: servedCount,
                phase: { type: 'DEPARTURE' } as GamePhase,
                lastSatisfaction: 'GRATEFUL',
                lastDepartureSatisfaction: { scene: 'RENEWAL', level: 'HOPEFUL' as const },
                dayEvents: [...state.dayEvents, `同意续当请求: ${name} (利息 +${(interestBonus * 100).toFixed(0)}%)`]
            };
        }

        case 'REJECT_RENEWAL': {
            const { itemId, name } = action.payload;
            const servedCount = state.customersServedToday + 1;
            return {
                ...state,
                customersServedToday: servedCount,
                phase: { type: 'DEPARTURE' } as GamePhase,
                lastSatisfaction: 'DESPERATE',
                lastDepartureSatisfaction: { scene: 'POST_FORFEIT', level: 'HOSTILE' as const },
                dayEvents: [...state.dayEvents, `拒绝续当请求: ${name}`]
            };
        }

        case 'RESOLVE_POST_FORFEIT': {
            const { itemId, action: decision, name, value } = action.payload;

            let newInventory = [...state.inventory];
            let cashDelta = 0;
            let repDelta: Partial<ReputationProfile> = {};
            let log = "";
            let satisfaction: SatisfactionLevel = 'NEUTRAL';

            if (decision === 'SELL_LOW') {
                playSfx('CASH');
                cashDelta = value;
                newInventory = newInventory.map(i => i.id === itemId ? { ...i, status: ItemStatus.SOLD } : i);
                repDelta = { [ReputationType.HUMANITY]: 10 };
                log = `低价回售: ${name} 的物品以 $${value} 成交。`;
                satisfaction = 'GRATEFUL';
            }
            else if (decision === 'GIFT') {
                playSfx('SUCCESS');
                newInventory = newInventory.map(i => i.id === itemId ? { ...i, status: ItemStatus.REDEEMED } : i);
                repDelta = { [ReputationType.HUMANITY]: 25, [ReputationType.CREDIBILITY]: -5 };
                log = `赠还物品: ${name} (Humanity +25)`;
                satisfaction = 'GRATEFUL';
            }
            else if (decision === 'REFUSE') {
                playSfx('CLICK');
                repDelta = { [ReputationType.HUMANITY]: -10, [ReputationType.CREDIBILITY]: 5 };
                log = `拒绝回购请求: ${name} (Humanity -10)`;
                satisfaction = 'DESPERATE';
            }

            const servedCount = state.customersServedToday + 1;

            // Apply Rep Changes
            const newRep = { ...state.reputation };
            if (repDelta[ReputationType.HUMANITY]) newRep[ReputationType.HUMANITY] += repDelta[ReputationType.HUMANITY]!;
            if (repDelta[ReputationType.CREDIBILITY]) newRep[ReputationType.CREDIBILITY] += repDelta[ReputationType.CREDIBILITY]!;
            clampReputation(newRep);

            const transaction: TransactionRecord | null = cashDelta !== 0 ? {
                id: crypto.randomUUID(),
                description: `绝当回售: ${name}`,
                amount: cashDelta,
                type: 'SELL'
            } : null;

            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + cashDelta },
                reputation: newRep,
                inventory: newInventory,
                customersServedToday: servedCount,
                todayTransactions: transaction ? [...state.todayTransactions, transaction] : state.todayTransactions,
                dayEvents: [...state.dayEvents, log],
                phase: { type: 'DEPARTURE' } as GamePhase,
                lastSatisfaction: satisfaction,
                lastDepartureSatisfaction: { scene: 'POST_FORFEIT', level: (
                    satisfaction === 'GRATEFUL' ? 'RELIEVED' :
                    satisfaction === 'DESPERATE' ? 'HOSTILE' : 'RESIGNED'
                ) as PostForfeitSatisfaction }
            };
        }

        // #35: Cancel Pawn — customer withdraws contract during holding period
        case 'CANCEL_PAWN': {
            const { itemId, refundAmount, fee, name } = action.payload;
            playSfx('CASH');

            // Remove item from inventory (customer takes it back)
            const cancelInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    return { ...item, status: ItemStatus.REDEEMED };
                }
                return item;
            });

            // Net cash: player refunds principal but keeps the cancellation fee
            const netCash = fee - refundAmount;

            const cancelRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: `取消典当: ${name} (退还 $${refundAmount}, 手续费 $${fee})`,
                amount: netCash,
                type: netCash >= 0 ? 'REDEEM' : 'PENALTY'
            };

            // Credibility +1: honoring cancellation shows professionalism
            const cancelRep = { ...state.reputation };
            cancelRep[ReputationType.CREDIBILITY] = Math.min(100, cancelRep[ReputationType.CREDIBILITY] + 1);

            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + netCash },
                reputation: cancelRep,
                inventory: cancelInventory,
                todayTransactions: [...state.todayTransactions, cancelRecord],
                dayEvents: [...state.dayEvents, `客户取消典当: ${name} (退还 $${refundAmount}, 手续费 $${fee}, 商誉 +1)`]
            };
        }

        // #32, #33: Holding Period Risk Events — trigger
        case 'TRIGGER_HOLDING_PERIOD_EVENT': {
            const { type: eventType, itemId, itemName, chainId } = action.payload;
            playSfx('FAIL');
            const triggerDay = state.stats.day;
            return {
                ...state,
                currentHoldingPeriodEvent: { type: eventType, itemId, itemName, chainId, triggerDay },
                dayEvents: [
                    ...state.dayEvents,
                    eventType === 'THIEF_REGRET'
                        ? `[持有期事件] 有人声称 ${itemName} 是自己偷来的，请求归还...`
                        : `[持有期事件] 有人声称自己是 ${itemName} 的原主人，要求归还...`
                ]
            };
        }

        // #32, #33: Holding Period Risk Events — resolve
        case 'RESOLVE_HOLDING_PERIOD_EVENT': {
            const { eventType, itemId, decision } = action.payload;
            const holdItem = state.inventory.find(i => i.id === itemId);
            if (!holdItem) {
                return { ...state, currentHoldingPeriodEvent: null };
            }

            const holdRep = { ...state.reputation };
            let holdLog = '';

            if (decision === 'SURRENDER') {
                // Return item to claimant
                const surrenderInventory = state.inventory.map(i => {
                    if (i.id === itemId) {
                        return { ...i, status: ItemStatus.REDEEMED };
                    }
                    return i;
                });

                if (eventType === 'THIEF_REGRET') {
                    // Surrendering stolen goods to the thief: morally ambiguous
                    holdRep[ReputationType.HUMANITY] = Math.min(100, holdRep[ReputationType.HUMANITY] + 2);
                    holdLog = `[持有期事件] 归还 ${holdItem.name} 给声称者 (人情 +2)`;
                } else {
                    // Surrendering to original owner: strong moral action
                    holdRep[ReputationType.HUMANITY] = Math.min(100, holdRep[ReputationType.HUMANITY] + 5);
                    holdRep[ReputationType.CREDIBILITY] = Math.min(100, holdRep[ReputationType.CREDIBILITY] + 2);
                    holdLog = `[持有期事件] 归还 ${holdItem.name} 给原主人 (人情 +5, 商誉 +2)`;
                }

                return {
                    ...state,
                    inventory: surrenderInventory,
                    reputation: holdRep,
                    currentHoldingPeriodEvent: null,
                    dayEvents: [...state.dayEvents, holdLog]
                };
            } else {
                // Refuse to return
                if (eventType === 'THIEF_REGRET') {
                    // Refusing thief: relatively neutral, slight innocence concern
                    holdRep[ReputationType.INNOCENCE] = Math.max(0, holdRep[ReputationType.INNOCENCE] - 1);
                    holdLog = `[持有期事件] 拒绝归还 ${holdItem.name} (清白 -1)`;
                } else {
                    // Refusing original owner: loss of humanity and credibility
                    holdRep[ReputationType.HUMANITY] = Math.max(0, holdRep[ReputationType.HUMANITY] - 3);
                    holdRep[ReputationType.CREDIBILITY] = Math.max(0, holdRep[ReputationType.CREDIBILITY] - 2);
                    holdLog = `[持有期事件] 拒绝归还 ${holdItem.name} 给原主人 (人情 -3, 商誉 -2)`;
                }

                return {
                    ...state,
                    reputation: holdRep,
                    currentHoldingPeriodEvent: null,
                    dayEvents: [...state.dayEvents, holdLog]
                };
            }
        }

        case 'CLEAR_HOLDING_PERIOD_EVENT': {
            return { ...state, currentHoldingPeriodEvent: null };
        }

        case 'APPEND_ITEM_LOGS': {
            // S3-F1/F2: Append log entries to specific items (player choices, echo entries)
            const logEntries = action.payload;
            const updatedInventory = state.inventory.map(item => {
                const itemLogs = logEntries.filter(e => e.itemId === item.id);
                if (itemLogs.length > 0) {
                    return {
                        ...item,
                        logs: [...(item.logs || []), ...itemLogs.map(e => e.log)]
                    };
                }
                return item;
            });
            return { ...state, inventory: updatedInventory };
        }

        case 'UPDATE_ITEM_TAGS': {
            const { itemId, tags, wasRestored, wasForged, wasReforged, workState } = action.payload;
            return {
                ...state,
                inventory: state.inventory.map(item => {
                    if (item.id !== itemId) return item;

                    const updatedItem = {
                        ...item,
                        tags: tags !== undefined ? tags : item.tags,
                        wasRestored: wasRestored !== undefined ? wasRestored : item.wasRestored,
                        wasForged: wasForged !== undefined ? wasForged : item.wasForged,
                        wasReforged: wasReforged !== undefined ? wasReforged : item.wasReforged,
                        workState: workState !== undefined ? workState : item.workState,
                    };

                    // realValue 同步协议：标签变化时自动重算 realValue
                    if (tags !== undefined) {
                        updatedItem.realValue = calculateTaggedValue(updatedItem);
                    }

                    // 重铸/伪造后 uncertainty 重置为高值（物品本质已改变）
                    if (wasReforged === true || workState === 'REFORGED') {
                        updatedItem.uncertainty = 0.8;
                    }
                    if (wasForged === true || workState === 'FORGED') {
                        updatedItem.uncertainty = 0.8;
                    }
                    // 修复后 uncertainty 保持不变（修复不改变了解程度）

                    return updatedItem;
                })
            };
        }

        case 'MARK_ITEM_INSIGHTED': {
            const { itemId, knowledgePool, currentRange, perceivedValue, hiddenTraits, revealedTraits, tags: insightTags, hiddenTags: insightHiddenTags } = action.payload;
            return {
                ...state,
                inventory: state.inventory.map(item =>
                    item.id === itemId
                        ? {
                            ...item,
                            insightedTonight: true,
                            knowledgePool,
                            currentRange: currentRange ?? item.currentRange,
                            perceivedValue: perceivedValue,  // Can be undefined (locked/show real value)
                            hiddenTraits: hiddenTraits ?? item.hiddenTraits,
                            revealedTraits: revealedTraits ?? item.revealedTraits,
                            tags: insightTags ?? item.tags,
                            hiddenTags: insightHiddenTags !== undefined ? insightHiddenTags : item.hiddenTags,
                        }
                        : item
                ),
                nightState: {
                    ...state.nightState,
                    actionsThisNight: [...state.nightState.actionsThisNight, `insight:${itemId}`]
                }
            };
        }

        case 'RESET_NIGHTLY_INSIGHT_FLAGS': {
            return {
                ...state,
                inventory: state.inventory.map(item => ({
                    ...item,
                    insightedTonight: false
                }))
            };
        }

        default:
            return state;
    }
}
