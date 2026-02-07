/**
 * Expiry Reducer
 * Handles item expiration system (redemption, renewal, no-show scenarios)
 */

import { GameState, ReputationType, ItemStatus, TransactionRecord, SatisfactionLevel, ReputationProfile } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { generateRedeemLog, generateForfeitLog, generateSoldLog, generatePlayerChoiceLog, generateEchoLog } from '../../systems/game/utils/logGenerator';

export function expiryReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'SET_EXPIRY_QUEUE':
            return { ...state, expiryQueue: action.payload };

        case 'TRIGGER_EXPIRY_EVENT':
            // Phase transition handled by state machine
            return {
                ...state,
                currentExpiryEvent: action.payload
                // phase transition removed - handled by state machine
            };

        case 'RESOLVE_EXPIRY': {
            const { choice, itemId, extensionDays, salePrice } = action.payload;
            const item = state.inventory.find(i => i.id === itemId);
            if (!item) return state;

            let newInventory = [...state.inventory];
            let cashDelta = 0;
            let repDelta: Partial<ReputationProfile> = {};
            let log = "";
            let satisfaction: SatisfactionLevel = 'NEUTRAL';
            const event = state.currentExpiryEvent;
            const isNoShow = choice === 'noshow_sell' || choice === 'noshow_keep';
            const isBreachDiscovery = choice === 'breach_discovered';

            switch (choice) {
                case 'redeem_accept': {
                    if (event) {
                        cashDelta = event.redemptionCost.total;
                        const redeemLog = generateRedeemLog(event.npcName, item, state.stats.day, cashDelta);
                        // S3-F1: Player choice log for expiry decision
                        const choiceLog = generatePlayerChoiceLog(state.stats.day, 'EXPIRY_DECISION', {
                            decision: 'redeem_accept', customerName: event.npcName,
                        });
                        // S3-F2: Echo entry for NPC redemption
                        const echoLog = generateEchoLog(state.stats.day, 'NPC_REDEEMED', item.relatedChainId || '');
                        newInventory = newInventory.map(i =>
                            i.id === itemId
                                ? { ...i, status: ItemStatus.REDEEMED, logs: [...(i.logs || []), redeemLog, choiceLog, echoLog] }
                                : i
                        );
                        repDelta = { [ReputationType.HUMANITY]: 3, [ReputationType.CREDIBILITY]: 2 };
                        // S2-F4: 修复后归还声誉奖励 人情+10
                        if (item.wasRestored) {
                            repDelta[ReputationType.HUMANITY] = (repDelta[ReputationType.HUMANITY] || 0) + 10;
                        }
                        log = `${item.name} 被赎回 (收款 $${cashDelta})${item.wasRestored ? ' [修复归还: 人情+10]' : ''}`;
                        satisfaction = 'GRATEFUL';
                        playSfx('CASH');
                    }
                    break;
                }
                case 'redeem_refuse': {
                    if (event && item.pawnInfo) {
                        const compensation = Math.ceil(item.pawnInfo.principal * 2);
                        cashDelta = -compensation;
                        repDelta = {
                            [ReputationType.HUMANITY]: -15,
                            [ReputationType.CREDIBILITY]: -10,
                            [ReputationType.INNOCENCE]: -5  // Breaking contract reduces legal standing
                        };
                        log = `拒绝赎回: ${item.name}，支付违约赔偿金 $${compensation}`;
                        satisfaction = 'DESPERATE';
                        playSfx('FAIL');
                    }
                    break;
                }
                case 'renew_accept': {
                    if (item.pawnInfo) {
                        const days = extensionDays || 7;
                        const newDueDate = item.pawnInfo.dueDate + days;
                        const interest = Math.ceil(item.pawnInfo.principal * item.pawnInfo.interestRate);
                        cashDelta = interest;
                        // S3-F1: Player choice log for renewal decision
                        const choiceLog = generatePlayerChoiceLog(state.stats.day, 'EXPIRY_DECISION', {
                            decision: 'renew_accept',
                        });
                        newInventory = newInventory.map(i =>
                            i.id === itemId && i.pawnInfo
                                ? {
                                    ...i,
                                    pawnInfo: {
                                        ...i.pawnInfo,
                                        dueDate: newDueDate,
                                        extensionCount: (i.pawnInfo.extensionCount || 0) + 1
                                    },
                                    logs: [...(i.logs || []), choiceLog]
                                }
                                : i
                        );
                        repDelta = { [ReputationType.HUMANITY]: 5 };
                        log = `同意续当: ${item.name} (收取利息 $${interest}，延期至 Day ${newDueDate})`;
                        satisfaction = 'GRATEFUL';
                        playSfx('CASH');
                    }
                    break;
                }
                case 'renew_refuse': {
                    const forfeitLog = generateForfeitLog(item, state.stats.day, "拒绝续当");
                    // S3-F1: Player choice log
                    const choiceLog = generatePlayerChoiceLog(state.stats.day, 'EXPIRY_DECISION', {
                        decision: 'renew_refuse',
                    });
                    newInventory = newInventory.map(i =>
                        i.id === itemId
                            ? { ...i, status: ItemStatus.FORFEIT, logs: [...(i.logs || []), forfeitLog, choiceLog] }
                            : i
                    );
                    repDelta = { [ReputationType.HUMANITY]: -10 };
                    log = `拒绝续当: ${item.name} 已绝当`;
                    satisfaction = 'DESPERATE';
                    playSfx('CLICK');
                    break;
                }
                case 'noshow_sell': {
                    const price = salePrice || Math.floor(item.realValue * 0.8);
                    cashDelta = price;
                    const soldLog = generateSoldLog(item, state.stats.day, price);
                    // S3-F1: Player choice log + S3-F2: Echo for expired no-redeem
                    const choiceLog = generatePlayerChoiceLog(state.stats.day, 'EXPIRY_DECISION', {
                        decision: 'noshow_sell',
                    });
                    const echoLog = generateEchoLog(state.stats.day, 'EXPIRED_NO_REDEEM', item.relatedChainId || '');
                    newInventory = newInventory.map(i =>
                        i.id === itemId
                            ? { ...i, status: ItemStatus.SOLD, logs: [...(i.logs || []), echoLog, choiceLog, soldLog] }
                            : i
                    );
                    log = `绝当物品出售: ${item.name} ($${price})`;
                    playSfx('CASH');
                    break;
                }
                case 'noshow_keep': {
                    const forfeitLog = generateForfeitLog(item, state.stats.day, "客户未现身");
                    // S3-F1: Player choice log + S3-F2: Echo for expired no-redeem
                    const choiceLog = generatePlayerChoiceLog(state.stats.day, 'EXPIRY_DECISION', {
                        decision: 'noshow_keep',
                    });
                    const echoLog = generateEchoLog(state.stats.day, 'EXPIRED_NO_REDEEM', item.relatedChainId || '');
                    newInventory = newInventory.map(i =>
                        i.id === itemId
                            ? { ...i, status: ItemStatus.FORFEIT, logs: [...(i.logs || []), echoLog, choiceLog, forfeitLog] }
                            : i
                    );
                    log = `保留绝当物品: ${item.name}`;
                    playSfx('CLICK');
                    break;
                }
                case 'breach_discovered': {
                    // Customer came back to redeem but item was already sold via blackmarket
                    // This is where we apply the breach penalty (deferred from blackmarket sale)
                    repDelta = {
                        [ReputationType.HUMANITY]: -3,
                        [ReputationType.CREDIBILITY]: -1
                    };
                    log = `[违约] ${event?.npcName || '顾客'} 发现 ${item.name} 已被变卖，人情 -3，商誉 -1`;
                    satisfaction = 'DESPERATE';
                    playSfx('FAIL');
                    // Clear breach tracking since penalty is now applied
                    newInventory = newInventory.map(i =>
                        i.id === itemId
                            ? { ...i, breachSaleDay: undefined }
                            : i
                    );
                    break;
                }
            }

            // Apply reputation changes
            const newRep = { ...state.reputation };
            if (repDelta[ReputationType.HUMANITY]) newRep[ReputationType.HUMANITY] += repDelta[ReputationType.HUMANITY]!;
            if (repDelta[ReputationType.CREDIBILITY]) newRep[ReputationType.CREDIBILITY] += repDelta[ReputationType.CREDIBILITY]!;
            if (repDelta[ReputationType.INNOCENCE]) newRep[ReputationType.INNOCENCE] += repDelta[ReputationType.INNOCENCE]!;
            Object.keys(newRep).forEach(key => {
                newRep[key as ReputationType] = Math.max(0, Math.min(100, newRep[key as ReputationType]));
            });

            // Create transaction record
            const transaction: TransactionRecord | null = cashDelta !== 0 ? {
                id: crypto.randomUUID(),
                description: log,
                amount: cashDelta,
                type: cashDelta > 0 ? 'REDEEM' : 'PENALTY'
            } : null;

            // Handle TRANSIENT chain lifecycle based on expiry choice
            let updatedChains = state.activeChains;
            if (event && item.relatedChainId) {
                const chain = state.activeChains.find(c => c.id === item.relatedChainId);
                if (chain?.chainType === 'TRANSIENT') {
                    if (choice === 'redeem_accept' || choice === 'renew_refuse' ||
                        choice === 'noshow_sell' || choice === 'noshow_keep') {
                        updatedChains = state.activeChains.map(c =>
                            c.id === item.relatedChainId
                                ? { ...c, isActive: false }
                                : c
                        );
                    } else if (choice === 'renew_accept') {
                        updatedChains = state.activeChains.map(c =>
                            c.id === item.relatedChainId
                                ? { ...c, renewalCount: (c.renewalCount || 0) + 1 }
                                : c
                        );
                    }
                }
            }

            // Phase transition handled by state machine (SETTLEMENT_COMPLETE or appropriate event)
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + cashDelta },
                reputation: newRep,
                inventory: newInventory,
                activeChains: updatedChains,
                currentExpiryEvent: null,
                todayTransactions: transaction ? [...state.todayTransactions, transaction] : state.todayTransactions,
                dayEvents: [...state.dayEvents, log],
                lastSatisfaction: satisfaction
                // phase transition removed - handled by state machine
            };
        }

        case 'CLEAR_EXPIRY_EVENT':
            return { ...state, currentExpiryEvent: null };

        case 'MARK_CORE_LOST': {
            const { itemId } = action.payload;
            if (state.coreLostItems.includes(itemId)) return state;
            return { ...state, coreLostItems: [...state.coreLostItems, itemId] };
        }

        default:
            return state;
    }
}
