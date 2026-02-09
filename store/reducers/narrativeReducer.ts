/**
 * Narrative Reducer
 * Handles event chains, mail system, news/modifiers
 */

import { GameState, MailInstance, MailAttachment, TransactionRecord } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { getMailTemplate } from '../../systems/narrative/mailRegistry';
import { resolveMailReward, selectMailTone } from '../../systems/narrative/mailUtils';
import type { NpcEmotionalContext, PlayerReputationContext } from '../../systems/narrative/mailUtils';
import { checkMailChannelTiming } from '../../systems/narrative/channelProtocol';
import { ReputationType } from '../../systems/core/types';

export function narrativeReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'UPDATE_CHAINS':
            return { ...state, activeChains: action.payload };

        case 'UPDATE_CHAIN_VAR': {
            const { chainId, variable, value } = action.payload;
            return {
                ...state,
                activeChains: state.activeChains.map(chain =>
                    chain.id === chainId
                        ? { ...chain, variables: { ...chain.variables, [variable]: (chain.variables[variable] || 0) + value } }
                        : chain
                )
            };
        }

        case 'SCHEDULE_MAIL': {
            const { templateId, delayDays, metadata, sourceChainId, relatedEventId } = action.payload;

            // S2-F5: Channel protocol timing — ensure news-before-mail rule
            let effectiveDelay = delayDays;
            if (sourceChainId || relatedEventId) {
                const extraDelay = checkMailChannelTiming(state, sourceChainId, relatedEventId);
                effectiveDelay = Math.max(effectiveDelay, extraDelay);
            }

            // S2-F3: Resolve reward at schedule time (for probabilistic attachments)
            const template = getMailTemplate(templateId);
            const resolvedAttachment = template ? resolveMailReward(template) : undefined;

            // P0-6: Resolve mail tone at schedule time based on NPC emotional context
            let resolvedTone = template?.tone;
            const mailCategory = template?.category;
            if (template && sourceChainId) {
                const chain = state.activeChains.find(c => c.id === sourceChainId);
                if (chain) {
                    const npcContext: NpcEmotionalContext = {
                        hope: chain.variables.hope as number | undefined,
                        funds: chain.variables.funds as number | undefined,
                        dailyCost: chain.variables.dailyCost as number | undefined,
                        contractType: chain.contractType as NpcEmotionalContext['contractType'],
                    };
                    const playerRep: PlayerReputationContext = {
                        humanity: state.reputation[ReputationType.HUMANITY],
                        credibility: state.reputation[ReputationType.CREDIBILITY],
                        innocence: state.reputation[ReputationType.INNOCENCE],
                    };
                    resolvedTone = selectMailTone(npcContext, playerRep);
                }
            }

            const newMail: MailInstance = {
                uniqueId: crypto.randomUUID(),
                templateId,
                arrivalDay: state.stats.day + effectiveDelay,
                isRead: false,
                isClaimed: false,
                metadata,
                resolvedAttachment,
                sourceChainId,
                relatedEventId,
                resolvedTone,
                category: mailCategory,
            };
            // delayDays: 0 means immediate delivery (same-day reaction), goes directly to inbox
            // delayDays > 0 means future delivery, goes to pendingMails
            if (effectiveDelay === 0) {
                return { ...state, inbox: [newMail, ...state.inbox] };
            }
            return { ...state, pendingMails: [...state.pendingMails, newMail] };
        }

        case 'PROCESS_DAILY_MAIL': {
            const today = state.stats.day;
            const arrivingMails = state.pendingMails.filter(m => m.arrivalDay <= today);
            const remainingPending = state.pendingMails.filter(m => m.arrivalDay > today);
            if (arrivingMails.length === 0) return state;
            return {
                ...state,
                inbox: [...arrivingMails, ...state.inbox],
                pendingMails: remainingPending
            };
        }

        case 'READ_MAIL':
            return { ...state, inbox: state.inbox.map(m => m.uniqueId === action.payload ? { ...m, isRead: true } : m) };

        case 'CLAIM_MAIL_REWARD': {
            const mail = state.inbox.find(m => m.uniqueId === action.payload);
            if (!mail || mail.isClaimed) return state;

            // Use resolvedAttachment (decided at schedule time) if available,
            // otherwise fall back to template attachments for backward compatibility
            const template = getMailTemplate(mail.templateId);
            const attachment: MailAttachment | undefined = mail.resolvedAttachment
                ?? template?.attachments;
            if (!attachment) return state;

            let cashDelta = 0;
            let newInventory = [...state.inventory];
            let transaction: TransactionRecord | null = null;
            playSfx('CASH');
            if (attachment.cash) {
                cashDelta = attachment.cash;
                transaction = {
                    id: crypto.randomUUID(),
                    description: `邮件奖励: ${template?.sender ?? '未知'}`,
                    amount: cashDelta,
                    type: 'REWARD'
                };
            }
            if (attachment.item) newInventory.push(attachment.item);
            const updatedInbox = state.inbox.map(m => m.uniqueId === action.payload ? { ...m, isClaimed: true } : m);
            const updatedTransactions = transaction ? [...state.todayTransactions, transaction] : state.todayTransactions;
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash + cashDelta },
                inventory: newInventory,
                inbox: updatedInbox,
                todayTransactions: updatedTransactions
            };
        }

        case 'UPDATE_NEWS':
            return {
                ...state,
                dailyNews: action.payload.news,
                activeMarketEffects: action.payload.modifiers,
                ...(action.payload.deferredNews !== undefined ? { pendingNews: action.payload.deferredNews } : {})
            };

        case 'ADD_PENDING_NEWS':
            return {
                ...state,
                pendingNews: [...state.pendingNews, action.payload],
            };

        case 'ADD_VIOLATION':
            if (state.violationFlags.includes(action.payload)) return state;
            return { ...state, violationFlags: [...state.violationFlags, action.payload] };

        case 'CLEAR_VIOLATIONS':
            return { ...state, violationFlags: [] };

        case 'UNLOCK_MILESTONE': {
            if (state.activeMilestones.includes(action.payload)) return state;
            playSfx('SUCCESS');
            return {
                ...state,
                activeMilestones: [...state.activeMilestones, action.payload],
                dayEvents: [...state.dayEvents, `获得成就: ${action.payload}`]
            };
        }

        case 'RECORD_NPC_FATE': {
            const entry = action.payload;
            // Merge with existing entry if same npcId (e.g. pawn then redeem)
            const existingIdx = state.npcFateLog.findIndex(e => e.npcId === entry.npcId);
            if (existingIdx >= 0) {
                const existing = state.npcFateLog[existingIdx];
                const merged = {
                    ...existing,
                    wasRedeemed: existing.wasRedeemed || entry.wasRedeemed,
                    wasForfeited: existing.wasForfeited || entry.wasForfeited,
                    wasReforged: existing.wasReforged || entry.wasReforged,
                    wasSoldBlackmarket: existing.wasSoldBlackmarket || entry.wasSoldBlackmarket,
                    finalVariables: entry.finalVariables ?? existing.finalVariables,
                };
                const updatedLog = [...state.npcFateLog];
                updatedLog[existingIdx] = merged;
                return { ...state, npcFateLog: updatedLog };
            }
            return { ...state, npcFateLog: [...state.npcFateLog, entry] };
        }

        default:
            return state;
    }
}
