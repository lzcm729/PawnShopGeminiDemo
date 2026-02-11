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
import { GAME_CONFIG } from '../../systems/game/config';
import type { DealSummary } from '../../systems/game/types';

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
            // Build deal summary so departure view shows redemption info
            const redeemDealSummary: DealSummary | null = redeemItem ? {
                cashDelta: paymentAmount,
                reputationDelta: redeemItem.wasRestored
                    ? { [ReputationType.HUMANITY]: 10, [ReputationType.CREDIBILITY]: 1 }
                    : { [ReputationType.CREDIBILITY]: GAME_CONFIG.REPUTATION_DELTAS.REDEMPTION_SUCCESS_CREDIBILITY },
                itemName: redeemItem.name,
                itemCategory: redeemItem.category,
                dealQuality: 'fair',
                interestRate: redeemItem.pawnInfo?.interestRate ?? 0.05,
            } : null;
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + paymentAmount },
                reputation: redeemRep,
                inventory: updatedInventory,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `${name} 已被赎回 (收回资金 $${paymentAmount})${redeemItem?.wasRestored ? ' [修复归还: 人情+10]' : ''}`],
                lastDealSummary: redeemDealSummary,
            };
        }

        case 'EXTEND_PAWN': {
            const { itemId, interestPaid, newDueDate, name } = action.payload;
            playSfx('CASH');
            const extendItem = state.inventory.find(i => i.id === itemId);
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
            // Build deal summary so departure view shows renewal info
            const extendDealSummary: DealSummary | null = extendItem ? {
                cashDelta: interestPaid,
                reputationDelta: { [ReputationType.CREDIBILITY]: 1 },
                itemName: extendItem.name,
                itemCategory: extendItem.category,
                dealQuality: 'fair',
                interestRate: extendItem.pawnInfo?.interestRate ?? 0.05,
            } : null;
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + interestPaid },
                inventory: updatedInventory,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `${name} 续当一周 (收取利息 $${interestPaid})`],
                lastDealSummary: extendDealSummary,
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
            const forfeitItem = state.inventory.find(i => i.id === itemId);
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const log = generateForfeitLog(item, state.stats.day, "强制送客");
                    return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] };
                }
                return item;
            });
            const servedCount = state.customersServedToday + 1;
            // Build deal summary so departure view shows forfeit outcome
            const extensionCount = forfeitItem?.pawnInfo?.extensionCount || 0;
            const renewRefusalPenalty = getRenewalRefusalPenalty(extensionCount);
            const forfeitDealSummary: DealSummary | null = forfeitItem ? {
                cashDelta: 0,
                reputationDelta: {
                    [ReputationType.HUMANITY]: renewRefusalPenalty,
                    [ReputationType.CREDIBILITY]: 1,
                },
                itemName: forfeitItem.name,
                itemCategory: forfeitItem.category,
                dealQuality: 'fleeced',
                interestRate: forfeitItem.pawnInfo?.interestRate ?? 0.05,
            } : null;
            return {
                ...state,
                inventory: updatedInventory,
                customersServedToday: servedCount,
                phase: { type: 'DEPARTURE' } as GamePhase,
                dayEvents: [...state.dayEvents, `送客处置: ${name} 强制收归店铺所有。`],
                unseenForfeitItemIds: [...state.unseenForfeitItemIds, itemId],
                lastDealSummary: forfeitDealSummary,
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
            const soldItem = state.inventory.find(i => i.id === itemId);
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

            // #43/#50: Restored/reforged sale gives Credibility +1
            const newRep = { ...state.reputation };
            let repLog = '';
            if (soldItem && (soldItem.workState === 'RESTORED' || soldItem.wasRestored)) {
                const credBonus = GAME_CONFIG.WORKSHOP.REPUTATION.restore_sale_credibility ?? 1;
                newRep[ReputationType.CREDIBILITY] += credBonus;
                repLog = `，商誉+${credBonus} (修复品出售)`;
            } else if (soldItem && (soldItem.workState === 'REFORGED' || soldItem.wasReforged)) {
                const credBonus = GAME_CONFIG.WORKSHOP.REPUTATION.reforge_sale_credibility ?? 1;
                newRep[ReputationType.CREDIBILITY] += credBonus;
                repLog = `，商誉+${credBonus} (重铸品出售)`;
            }
            clampReputation(newRep);

            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + amount },
                reputation: newRep,
                inventory: soldInventory,
                todayTransactions: [...state.todayTransactions, saleRecord],
                dayEvents: [...state.dayEvents, `清算绝当品: ${name} (+$${amount})${repLog}`]
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
            const takeoverItem = state.inventory.find(i => i.id === itemId);
            const updatedInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    const log = generateForfeitLog(item, state.stats.day, "恶意买断");
                    return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] };
                }
                return item;
            });
            const takeoverRepDelta = {
                [ReputationType.HUMANITY]: -15,
                [ReputationType.CREDIBILITY]: -10,
                [ReputationType.INNOCENCE]: -5,
            };
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
            // Build deal summary so departure view shows penalty info
            const takeoverDealSummary: DealSummary | null = takeoverItem ? {
                cashDelta: -penalty,
                reputationDelta: takeoverRepDelta,
                itemName: takeoverItem.name,
                itemCategory: takeoverItem.category,
                dealQuality: 'fleeced',
                interestRate: takeoverItem.pawnInfo?.interestRate ?? 0.05,
            } : null;
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - penalty },
                inventory: updatedInventory,
                reputation: newRep,
                todayTransactions: [...state.todayTransactions, record],
                dayEvents: [...state.dayEvents, `恶意违约/强制买断: ${name} (-$${penalty})。顾客极度愤怒。`],
                lastDealSummary: takeoverDealSummary,
            };
        }

        case 'ACCEPT_RENEWAL': {
            const { itemId, extensionDays, interestBonus, name } = action.payload;
            playSfx('STAMP');
            const renewalItem = state.inventory.find(i => i.id === itemId);
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
                lastDealSummary: renewalItem ? {
                    cashDelta: 0,
                    reputationDelta: {},
                    itemName: renewalItem.name,
                    itemCategory: renewalItem.category,
                    dealQuality: 'fair' as const,
                    interestRate: renewalItem.pawnInfo?.interestRate ?? 0.10,
                } : null,
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

        // #23: Refuse Cancel Pawn — player declines customer's cancellation request
        // Contract remains active, customer departs resentfully (Humanity -5)
        case 'REFUSE_CANCEL_PAWN': {
            const { itemId: refuseItemId, name: refuseName } = action.payload;
            playSfx('FAIL');

            const refuseRep = { ...state.reputation };
            const refuseHumanityLoss = GAME_CONFIG.PAWN_BUSINESS?.REFUSE_CANCEL_HUMANITY ?? -5;
            refuseRep[ReputationType.HUMANITY] = Math.max(0, refuseRep[ReputationType.HUMANITY] + refuseHumanityLoss);
            clampReputation(refuseRep);

            return {
                ...state,
                reputation: refuseRep,
                dayEvents: [...state.dayEvents, `拒绝客户取消典当: ${refuseName} (人情 ${refuseHumanityLoss})`]
            };
        }

        // Item-Derived Events — trigger (unified: thief regret / original owner / purchase offer)
        case 'TRIGGER_ITEM_DERIVED_EVENT': {
            playSfx('FAIL');
            return {
                ...state,
                currentItemDerivedEvent: action.payload,
                dayEvents: [
                    ...state.dayEvents,
                    `[物品衍生事件] ${action.payload.eventType}: ${action.payload.itemName}`
                ]
            };
        }

        // Item-Derived Events — resolve
        case 'RESOLVE_ITEM_DERIVED_EVENT': {
            const { eventType, itemId, choiceId } = action.payload;
            const holdItem = state.inventory.find(i => i.id === itemId);
            if (!holdItem) {
                return { ...state, currentItemDerivedEvent: null };
            }

            const newRep = { ...state.reputation };
            let newInventory = [...state.inventory];
            let cashDelta = 0;
            let holdLog = '';

            if (eventType === 'THIEF_REGRET') {
                if (choiceId === 'accept') {
                    newInventory = newInventory.map(i =>
                        i.id === itemId ? { ...i, status: ItemStatus.REDEEMED } : i
                    );
                    newRep[ReputationType.HUMANITY] = Math.min(100, newRep[ReputationType.HUMANITY] + 2);
                    holdLog = `[持有期事件] 归还 ${holdItem.name} 给声称者 (人情 +2)`;
                } else {
                    newRep[ReputationType.INNOCENCE] = Math.max(0, newRep[ReputationType.INNOCENCE] - 1);
                    holdLog = `[持有期事件] 拒绝归还 ${holdItem.name} (清白 -1)`;
                }
            } else if (eventType === 'ORIGINAL_OWNER') {
                if (choiceId === 'accept') {
                    newInventory = newInventory.map(i =>
                        i.id === itemId ? { ...i, status: ItemStatus.REDEEMED } : i
                    );
                    newRep[ReputationType.HUMANITY] = Math.min(100, newRep[ReputationType.HUMANITY] + 5);
                    newRep[ReputationType.CREDIBILITY] = Math.min(100, newRep[ReputationType.CREDIBILITY] + 2);
                    holdLog = `[持有期事件] 归还 ${holdItem.name} 给原主人 (人情 +5, 商誉 +2)`;
                } else {
                    newRep[ReputationType.HUMANITY] = Math.max(0, newRep[ReputationType.HUMANITY] - 3);
                    newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 2);
                    holdLog = `[持有期事件] 拒绝归还 ${holdItem.name} 给原主人 (人情 -3, 商誉 -2)`;
                }
            } else if (eventType === 'PURCHASE_OFFER') {
                const offerValue = state.currentItemDerivedEvent?.offerValue ?? 0;
                if (choiceId === 'accept') {
                    newInventory = newInventory.map(i =>
                        i.id === itemId ? { ...i, status: ItemStatus.SOLD } : i
                    );
                    cashDelta = offerValue;
                    holdLog = `[收藏家收购] 出售 ${holdItem.name} (+$${offerValue})`;
                } else {
                    holdLog = `[收藏家收购] 拒绝出售 ${holdItem.name}`;
                }
            }

            clampReputation(newRep);

            // Build transaction record for PURCHASE_OFFER
            const transaction: TransactionRecord | null = cashDelta !== 0 ? {
                id: crypto.randomUUID(),
                description: `收藏家收购: ${holdItem.name}`,
                amount: cashDelta,
                type: 'SELL'
            } : null;

            return {
                ...state,
                stats: cashDelta !== 0 ? { ...state.stats, cash: state.stats.cash + cashDelta } : state.stats,
                reputation: newRep,
                inventory: newInventory,
                currentItemDerivedEvent: null,
                todayTransactions: transaction ? [...state.todayTransactions, transaction] : state.todayTransactions,
                dayEvents: [...state.dayEvents, holdLog]
            };
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
