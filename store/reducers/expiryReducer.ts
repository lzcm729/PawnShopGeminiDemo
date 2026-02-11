/**
 * Expiry Reducer
 * Handles item expiration system (redemption, renewal, no-show scenarios)
 */

import { GameState, ReputationType, ItemStatus, TransactionRecord, SatisfactionLevel, ReputationProfile } from '../../types';
import { clampReputation } from '../../systems/core/reputationUtils';
import { DepartureSatisfaction, NpcFateEntry } from '../../systems/narrative/types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { generateRedeemLog, generateForfeitLog, generateSoldLog, generatePlayerChoiceLog, generateEchoLog } from '../../systems/game/utils/logGenerator';
import { evaluateRedeemSatisfaction, evaluateRenewalSatisfaction, evaluatePostForfeitSatisfaction, mapToBaseSatisfaction } from '../../systems/game/utils/satisfaction';
import { getRenewalRefusalPenalty } from '../../systems/economy/renewalPenalty';
import { GAME_CONFIG } from '../../systems/game/config';

/** Helper: merge a fate entry into the npcFateLog (upsert by npcId) */
function mergeFateEntry(log: NpcFateEntry[], entry: NpcFateEntry): NpcFateEntry[] {
    const idx = log.findIndex(e => e.npcId === entry.npcId);
    if (idx >= 0) {
        const existing = log[idx];
        const merged: NpcFateEntry = {
            ...existing,
            wasRedeemed: existing.wasRedeemed || entry.wasRedeemed,
            wasForfeited: existing.wasForfeited || entry.wasForfeited,
            wasReforged: existing.wasReforged || entry.wasReforged,
            wasSoldBlackmarket: existing.wasSoldBlackmarket || entry.wasSoldBlackmarket,
            finalVariables: entry.finalVariables ?? existing.finalVariables,
        };
        const updated = [...log];
        updated[idx] = merged;
        return updated;
    }
    return [...log, entry];
}

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
            let departureSatisfaction: DepartureSatisfaction | null = null;
            const event = state.currentExpiryEvent;
            const isNoShow = choice === 'noshow_sell' || choice === 'noshow_keep';
            const isBreachDiscovery = choice === 'breach_discovered';

            switch (choice) {
                case 'redeem_accept': {
                    if (event) {
                        const workshopCfg = GAME_CONFIG.WORKSHOP;
                        const repConfig = workshopCfg.REPUTATION;

                        // 伪造违约检测（硬违约）— 伪造后客户赎回
                        if (item.workState === 'FORGED' || item.wasForged) {
                            const principal = item.pawnInfo?.principal || item.pawnAmount;
                            const compensation = Math.ceil(principal * workshopCfg.BREACH_COMPENSATION_MULTIPLIER);
                            cashDelta = -compensation;
                            repDelta = {
                                [ReputationType.HUMANITY]: repConfig.counterfeit_breach_humanity ?? -15,
                                [ReputationType.CREDIBILITY]: repConfig.counterfeit_breach_credibility ?? -12,
                                [ReputationType.INNOCENCE]: repConfig.counterfeit_breach_innocence ?? -5,
                            };
                            log = `[伪造违约] ${event.npcName} 发现 ${item.name} 已被伪造，支付违约赔偿 $${compensation}`;
                            newInventory = newInventory.map(i =>
                                i.id === itemId
                                    ? { ...i, status: ItemStatus.REDEEMED, logs: [...(i.logs || [])] }
                                    : i
                            );
                            departureSatisfaction = { scene: 'POST_FORFEIT', level: 'HOSTILE' };
                            satisfaction = 'DESPERATE';
                            playSfx('FAIL');

                            if (state.stats.cash + cashDelta < 0) {
                                return {
                                    ...state,
                                    phase: { type: 'GAME_OVER', reason: `无力支付违约赔偿金 $${compensation}，${event.npcName} 将此事告知了所有人。` },
                                    stats: { ...state.stats, cash: 0 },
                                    reputation: (() => {
                                        const newRep = { ...state.reputation };
                                        newRep[ReputationType.HUMANITY] += repConfig.counterfeit_breach_humanity ?? -15;
                                        newRep[ReputationType.CREDIBILITY] += repConfig.counterfeit_breach_credibility ?? -12;
                                        newRep[ReputationType.INNOCENCE] += repConfig.counterfeit_breach_innocence ?? -5;
                                        clampReputation(newRep);
                                        return newRep;
                                    })(),
                                    inventory: newInventory,
                                    currentExpiryEvent: null,
                                    dayEvents: [...state.dayEvents, log],
                                    lastSatisfaction: satisfaction,
                                    lastDepartureSatisfaction: departureSatisfaction,
                                };
                            }
                            break;
                        }

                        // 重铸归还检测（善意僭越）— 重铸后客户赎回触发不确定性判定
                        // TODO: 善意僭越判定（四种结果）将在后续实现
                        if (item.workState === 'REFORGED' || item.wasReforged) {
                            const principal = item.pawnInfo?.principal || item.pawnAmount;
                            const compensation = Math.ceil(principal * workshopCfg.BREACH_COMPENSATION_MULTIPLIER);
                            cashDelta = -compensation;
                            repDelta = {
                                [ReputationType.HUMANITY]: workshopCfg.BREACH_HUMANITY_LOSS,
                                [ReputationType.CREDIBILITY]: workshopCfg.BREACH_CREDIBILITY_LOSS,
                                [ReputationType.INNOCENCE]: workshopCfg.BREACH_INNOCENCE_LOSS,
                            };
                            log = `[违约重铸] ${event.npcName} 发现 ${item.name} 已被重铸，支付违约赔偿 $${compensation}`;
                            newInventory = newInventory.map(i =>
                                i.id === itemId
                                    ? { ...i, status: ItemStatus.REDEEMED, logs: [...(i.logs || [])] }
                                    : i
                            );
                            departureSatisfaction = { scene: 'POST_FORFEIT', level: 'HOSTILE' };
                            satisfaction = 'DESPERATE';
                            playSfx('FAIL');

                            if (state.stats.cash + cashDelta < 0) {
                                return {
                                    ...state,
                                    phase: { type: 'GAME_OVER', reason: `无力支付违约赔偿金 $${compensation}，${event.npcName} 将此事告知了所有人。` },
                                    stats: { ...state.stats, cash: 0 },
                                    reputation: (() => {
                                        const newRep = { ...state.reputation };
                                        newRep[ReputationType.HUMANITY] += workshopCfg.BREACH_HUMANITY_LOSS;
                                        newRep[ReputationType.CREDIBILITY] += workshopCfg.BREACH_CREDIBILITY_LOSS;
                                        newRep[ReputationType.INNOCENCE] += workshopCfg.BREACH_INNOCENCE_LOSS;
                                        clampReputation(newRep);
                                        return newRep;
                                    })(),
                                    inventory: newInventory,
                                    currentExpiryEvent: null,
                                    dayEvents: [...state.dayEvents, log],
                                    lastSatisfaction: satisfaction,
                                    lastDepartureSatisfaction: departureSatisfaction,
                                };
                            }
                            break;
                        }

                        // 修复归还特殊流程 — 替代标准赎回（不叠加）
                        if (item.wasRestored && item.workState === 'RESTORED') {
                            cashDelta = event.redemptionCost.total;
                            const redeemLog = generateRedeemLog(event.npcName, item, state.stats.day, cashDelta);
                            const choiceLog = generatePlayerChoiceLog(state.stats.day, 'EXPIRY_DECISION', {
                                decision: 'redeem_accept', customerName: event.npcName,
                            });
                            const echoLog = generateEchoLog(state.stats.day, 'NPC_REDEEMED', item.relatedChainId || '');
                            newInventory = newInventory.map(i =>
                                i.id === itemId
                                    ? { ...i, status: ItemStatus.REDEEMED, logs: [...(i.logs || []), redeemLog, choiceLog, echoLog] }
                                    : i
                            );
                            // 修复归还声誉：人情+10, 商誉+1（替代标准赎回的商誉+1，不叠加）
                            repDelta = {
                                [ReputationType.HUMANITY]: repConfig.restore_return_humanity ?? 10,
                                [ReputationType.CREDIBILITY]: repConfig.restore_return_credibility ?? 1,
                            };
                            log = `${item.name} 被赎回 (收款 $${cashDelta}) [修复归还: 人情+${repConfig.restore_return_humanity ?? 10}, 商誉+${repConfig.restore_return_credibility ?? 1}]`;
                            const redeemLevel = evaluateRedeemSatisfaction(
                                event.interestRate,
                                event.redemptionCost.total,
                                event.redemptionCost.principal
                            );
                            departureSatisfaction = { scene: 'REDEEM', level: redeemLevel };
                            satisfaction = mapToBaseSatisfaction('REDEEM', redeemLevel);
                            playSfx('CASH');
                            break;
                        }

                        // 正常赎回路径
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
                        // #59: Per design doc, redemption success gives Credibility +1 only
                        repDelta = { [ReputationType.CREDIBILITY]: 1 };
                        log = `${item.name} 被赎回 (收款 $${cashDelta})`;
                        const redeemLevel = evaluateRedeemSatisfaction(
                            event.interestRate,
                            event.redemptionCost.total,
                            event.redemptionCost.principal
                        );
                        departureSatisfaction = { scene: 'REDEEM', level: redeemLevel };
                        satisfaction = mapToBaseSatisfaction('REDEEM', redeemLevel);
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
                        departureSatisfaction = { scene: 'POST_FORFEIT', level: 'HOSTILE' };
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
                        repDelta = {
                            [ReputationType.HUMANITY]: GAME_CONFIG.PAWN_BUSINESS.RENEWAL_ACCEPT_HUMANITY,
                            [ReputationType.CREDIBILITY]: GAME_CONFIG.PAWN_BUSINESS.RENEWAL_ACCEPT_CREDIBILITY,
                        };
                        log = `同意续当: ${item.name} (收取利息 $${interest}，延期至 Day ${newDueDate})`;
                        const renewalCount = item.pawnInfo.extensionCount || 0;
                        const renewLevel = evaluateRenewalSatisfaction(renewalCount, item.pawnInfo.interestRate);
                        departureSatisfaction = { scene: 'RENEWAL', level: renewLevel };
                        satisfaction = mapToBaseSatisfaction('RENEWAL', renewLevel);
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
                    // #23: Fixed penalty per design doc: Humanity -1, Credibility +1
                    const renewalExtCount = item.pawnInfo?.extensionCount || 0;
                    const renewRefusalPenalty = getRenewalRefusalPenalty(renewalExtCount);
                    repDelta = {
                        [ReputationType.HUMANITY]: renewRefusalPenalty,
                        [ReputationType.CREDIBILITY]: 1
                    };
                    log = `拒绝续当: ${item.name} 已绝当 (Humanity ${renewRefusalPenalty}, Credibility +1)`;
                    departureSatisfaction = { scene: 'POST_FORFEIT', level: 'HOSTILE' };
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
                    departureSatisfaction = { scene: 'POST_FORFEIT', level: 'HOSTILE' };
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
            clampReputation(newRep);

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

            // === NPC FATE TRACKING ===
            // Record fate for narrative NPCs (chains with a name) on terminal expiry outcomes
            let updatedFateLog = state.npcFateLog;
            if (event && item.relatedChainId) {
                const chain = state.activeChains.find(c => c.id === item.relatedChainId);
                if (chain) {
                    const isTerminal = choice === 'redeem_accept' || choice === 'renew_refuse' ||
                        choice === 'noshow_sell' || choice === 'noshow_keep' || choice === 'breach_discovered';
                    if (isTerminal) {
                        const numVars = chain.variables
                            ? Object.fromEntries(Object.entries(chain.variables).filter(([, v]) => typeof v === 'number')) as Record<string, number>
                            : undefined;
                        const fateEntry: NpcFateEntry = {
                            npcId: chain.id,
                            npcName: chain.npcName || event.npcName,
                            principalGiven: item.pawnInfo?.principal || 0,
                            interestRate: item.pawnInfo?.interestRate || 0,
                            wasRedeemed: choice === 'redeem_accept',
                            wasForfeited: choice === 'renew_refuse' || choice === 'noshow_keep',
                            wasReforged: item.wasReforged || item.workState === 'REFORGED',
                            wasSoldBlackmarket: choice === 'breach_discovered' || choice === 'noshow_sell',
                            finalVariables: numVars,
                        };
                        updatedFateLog = mergeFateEntry(state.npcFateLog, fateEntry);
                    }
                }
            }

            // Track unseen forfeit items for red dot notification
            const isForfeitOutcome = choice === 'renew_refuse' || choice === 'noshow_keep';
            const updatedUnseenForfeit = isForfeitOutcome
                ? [...state.unseenForfeitItemIds, itemId]
                : state.unseenForfeitItemIds;

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
                lastSatisfaction: satisfaction,
                lastDepartureSatisfaction: departureSatisfaction,
                npcFateLog: updatedFateLog,
                unseenForfeitItemIds: updatedUnseenForfeit,
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
