/**
 * Narrative Reducer
 * Handles event chains, mail system, news/modifiers
 */

import { GameState, MailInstance, TransactionRecord } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { getMailTemplate } from '../../systems/narrative/mailRegistry';

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
            const { templateId, delayDays, metadata } = action.payload;
            const newMail: MailInstance = {
                uniqueId: crypto.randomUUID(),
                templateId,
                arrivalDay: state.stats.day + delayDays,
                isRead: false,
                isClaimed: false,
                metadata
            };
            // delayDays: 0 means immediate delivery (same-day reaction), goes directly to inbox
            // delayDays > 0 means future delivery, goes to pendingMails
            if (delayDays === 0) {
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
            const template = getMailTemplate(mail.templateId);
            if (!template || !template.attachments) return state;
            let cashDelta = 0;
            let newInventory = [...state.inventory];
            let transaction: TransactionRecord | null = null;
            playSfx('CASH');
            if (template.attachments.cash) {
                cashDelta = template.attachments.cash;
                transaction = {
                    id: crypto.randomUUID(),
                    description: `邮件奖励: ${template.sender}`,
                    amount: cashDelta,
                    type: 'REWARD'
                };
            }
            if (template.attachments.item) newInventory.push(template.attachments.item);
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
            return { ...state, dailyNews: action.payload.news, activeMarketEffects: action.payload.modifiers };

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

        default:
            return state;
    }
}
