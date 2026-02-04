/**
 * Financial Reducer
 * Handles cash, bills, rent, mother's medical expenses
 */

import { GameState, ReputationType, TransactionRecord, DailyFinancialSnapshot } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { GAME_CONFIG } from '../../systems/game/config';
import { clearSave } from '../../systems/core/persistence';
import { GamePhase } from '../../systems/core/phases';

export function financialReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'CONSUME_AP':
            return { ...state, stats: { ...state.stats, actionPoints: Math.max(0, state.stats.actionPoints - action.payload) } };

        case 'DEBUG_ADD_CASH':
            playSfx('CASH');
            return { ...state, stats: { ...state.stats, cash: state.stats.cash + action.payload } };

        case 'PAY_MEDICAL_BILL': {
            playSfx('SUCCESS');
            const billAmount = state.stats.medicalBill.amount;
            const billRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: "支付母亲医药费",
                amount: -billAmount,
                type: 'MEDICAL'
            };
            const currentMother = state.stats.motherStatus;
            const newMother = {
                ...currentMother,
                careLevel: 'Premium' as const,
                risk: Math.max(0, currentMother.risk - 5),
                status: 'Improving' as const
            };
            return {
                ...state,
                stats: {
                    ...state.stats,
                    cash: state.stats.cash - billAmount,
                    motherStatus: newMother,
                    medicalBill: { ...state.stats.medicalBill, status: 'PAID' }
                },
                todayTransactions: [...state.todayTransactions, billRecord],
                dayEvents: [...state.dayEvents, `Paid Medical Bill: $${billAmount}. Treatment plan secured.`]
            };
        }

        case 'ROTATE_MEDICAL_BILL': {
            const baseCost = GAME_CONFIG.WEEKLY_MEDICAL_COST;
            const fluctuation = 0.8 + (Math.random() * 0.4);
            const newAmount = Math.floor(baseCost * fluctuation);
            const newDueDate = state.stats.medicalBill.dueDate + 7;

            return {
                ...state,
                stats: {
                    ...state.stats,
                    medicalBill: {
                        amount: newAmount,
                        dueDate: newDueDate,
                        status: 'PENDING'
                    }
                },
                dayEvents: [...state.dayEvents, `Medical Bill Updated: $${newAmount} due by Day ${newDueDate}.`]
            };
        }

        case 'MARK_BILL_OVERDUE': {
            if (state.stats.medicalBill.status === 'OVERDUE') return state;
            return { ...state, stats: { ...state.stats, medicalBill: { ...state.stats.medicalBill, status: 'OVERDUE' } } };
        }

        // DEPRECATED: Rent system removed per design doc - medical bills are the core pressure now
        case 'PAY_RENT': {
            const rentAmount = state.stats.rentDue;
            if (rentAmount <= 0) return state; // Skip if rent is disabled
            const newDueDate = state.stats.rentDueDate + GAME_CONFIG.RENT_CYCLE;
            const rentRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: "店铺租金(已废弃)",
                amount: -rentAmount,
                type: 'RENT'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - rentAmount, rentDueDate: newDueDate },
                todayTransactions: [...state.todayTransactions, rentRecord],
                dayEvents: [...state.dayEvents, `Rent Paid: $${rentAmount}. Next due Day ${newDueDate}.`]
            };
        }

        case 'PURCHASE_TREATMENT': {
            const { type, cost } = action.payload;
            playSfx('SUCCESS');
            let newMother = { ...state.stats.motherStatus };
            let desc = "";
            if (type === 'STABILIZE') {
                newMother.health = Math.min(100, newMother.health + 5);
                desc = "额外治疗: 急救注射";
            } else if (type === 'REDUCE_RISK') {
                newMother.risk = Math.max(0, newMother.risk - 3);
                desc = "额外治疗: 靶向疗法";
            }
            const record: TransactionRecord = {
                id: crypto.randomUUID(),
                description: desc,
                amount: -cost,
                type: 'MEDICAL'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - cost, motherStatus: newMother },
                todayTransactions: [...state.todayTransactions, record]
            };
        }

        case 'VISIT_MOTHER': {
            const { motherStatus, visitedToday } = state.stats;
            if (visitedToday) return state;
            // Comfort reduces complication risk - no external rewards, pure emotional choice
            const newMother = { ...motherStatus, risk: Math.max(0, motherStatus.risk - 1) };
            return {
                ...state,
                stats: { ...state.stats, motherStatus: newMother, visitedToday: true },
                dayEvents: [...state.dayEvents, "前往医院探望了母亲。"]
            };
        }

        case 'PAY_SURGERY': {
            const surgeryCost = GAME_CONFIG.GOAL_AMOUNT;
            const record: TransactionRecord = {
                id: crypto.randomUUID(),
                description: "支付终极手术费",
                amount: -surgeryCost,
                type: 'SURGERY'
            };
            return {
                ...state,
                phase: { type: 'VICTORY' } as GamePhase,
                stats: { ...state.stats, cash: state.stats.cash - surgeryCost },
                todayTransactions: [...state.todayTransactions, record]
            };
        }

        case 'UPDATE_MOTHER_STATUS':
            return { ...state, stats: { ...state.stats, motherStatus: action.payload } };

        case 'END_DAY': {
            const currentDay = state.stats.day;
            const nextDay = state.stats.day + 1;
            const expense = state.stats.dailyExpenses;
            const endingCash = state.stats.cash - expense;
            const income = state.todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
            const txExpenses = state.todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
            const netChange = income + txExpenses - expense;
            const snapshotEvents = state.todayTransactions.map(t => ({
                type: t.amount > 0 ? 'INCOME' as const : 'EXPENSE' as const,
                amount: t.amount,
                label: t.description
            }));
            snapshotEvents.push({ type: 'EXPENSE', amount: -expense, label: '店铺运营 (Burn)' });
            const newSnapshot: DailyFinancialSnapshot = {
                day: currentDay,
                startingCash: state.stats.cash - (income + txExpenses),
                endingCash: endingCash,
                netChange: netChange,
                events: snapshotEvents
            };
            if (endingCash < 0) {
                clearSave();
                playSfx('FAIL');
                return { ...state, phase: { type: 'GAME_OVER', reason: 'Bankrupt' } as GamePhase, dayEvents: [...state.dayEvents, "Bankrupt: Daily expenses exceeded cash."] };
            }
            if (state.stats.motherStatus.health <= 0) {
                clearSave();
                playSfx('FAIL');
                return { ...state, phase: { type: 'GAME_OVER', reason: '母亲去世' } as GamePhase, dayEvents: [...state.dayEvents, "GAME OVER: 母亲病情恶化去世。"] };
            }
            return {
                ...state,
                stats: { ...state.stats, day: nextDay, cash: endingCash, actionPoints: state.stats.maxActionPoints },
                financialHistory: [...state.financialHistory, newSnapshot],
                phase: { type: 'MORNING_BRIEF' } as GamePhase
            };
        }

        default:
            return state;
    }
}
