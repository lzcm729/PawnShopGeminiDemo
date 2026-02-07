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
                status: 'Stable' as const
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

        case 'EMERGENCY_TREATMENT': {
            const etCost = GAME_CONFIG.MOTHER.EMERGENCY_TREATMENT_COST;
            if (state.stats.cash < etCost) return state;
            playSfx('SUCCESS');
            const etHealth = Math.min(100, state.stats.motherStatus.health + GAME_CONFIG.MOTHER.EMERGENCY_TREATMENT_HEAL);
            const etStatus = etHealth >= 70 ? 'Stable' as const : etHealth >= 40 ? 'Declining' as const : 'Critical' as const;
            const etMother = { ...state.stats.motherStatus, health: etHealth, status: etStatus };
            const etRecord: TransactionRecord = {
                id: crypto.randomUUID(),
                description: "紧急治疗",
                amount: -etCost,
                type: 'MEDICAL'
            };
            return {
                ...state,
                stats: { ...state.stats, cash: state.stats.cash - etCost, motherStatus: etMother },
                todayTransactions: [...state.todayTransactions, etRecord],
                dayEvents: [...state.dayEvents, `紧急治疗: 支付$${etCost}，母亲健康值恢复至${etHealth}%。`]
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
            let endingCash = state.stats.cash - expense;
            const income = state.todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
            const txExpenses = state.todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
            let netChange = income + txExpenses - expense;
            const snapshotEvents = state.todayTransactions.map(t => ({
                type: t.amount > 0 ? 'INCOME' as const : 'EXPENSE' as const,
                amount: t.amount,
                label: t.description
            }));
            snapshotEvents.push({ type: 'EXPENSE', amount: -expense, label: '店铺运营 (Burn)' });

            // S2-F4/F5: Random unscheduled medical expense
            const RANDOM_MEDICAL_DESCS = ["门诊复查", "药物补充", "血液检查", "护理用品", "医疗耗材", "复诊挂号"];
            let endDayEvents = [...state.dayEvents];
            let endDayTransactions = [...state.todayTransactions];
            if (Math.random() < GAME_CONFIG.MOTHER.RANDOM_MEDICAL_CHANCE) {
                const rmAmount = Math.floor(
                    GAME_CONFIG.MOTHER.RANDOM_MEDICAL_MIN +
                    Math.random() * (GAME_CONFIG.MOTHER.RANDOM_MEDICAL_MAX - GAME_CONFIG.MOTHER.RANDOM_MEDICAL_MIN)
                );
                const rmDesc = RANDOM_MEDICAL_DESCS[Math.floor(Math.random() * RANDOM_MEDICAL_DESCS.length)];
                endingCash -= rmAmount;
                netChange -= rmAmount;
                snapshotEvents.push({ type: 'EXPENSE', amount: -rmAmount, label: `突发医疗: ${rmDesc}` });
                const rmRecord: TransactionRecord = {
                    id: crypto.randomUUID(),
                    description: rmDesc,
                    amount: -rmAmount,
                    type: 'MEDICAL'
                };
                endDayTransactions = [...endDayTransactions, rmRecord];
                endDayEvents = [...endDayEvents, `突发医疗支出: $${rmAmount} (${rmDesc})`];
            }

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
                return { ...state, phase: { type: 'GAME_OVER', reason: 'Bankrupt' } as GamePhase, dayEvents: [...endDayEvents, "Bankrupt: Daily expenses exceeded cash."] };
            }
            if (state.stats.motherStatus.health <= 0) {
                clearSave();
                playSfx('FAIL');
                return { ...state, phase: { type: 'GAME_OVER', reason: '母亲去世' } as GamePhase, dayEvents: [...endDayEvents, "GAME OVER: 母亲病情恶化去世。"] };
            }
            return {
                ...state,
                stats: { ...state.stats, day: nextDay, cash: endingCash, actionPoints: state.stats.maxActionPoints },
                financialHistory: [...state.financialHistory, newSnapshot],
                dayEvents: endDayEvents,
                todayTransactions: endDayTransactions,
                phase: { type: 'MORNING_BRIEF' } as GamePhase
            };
        }

        default:
            return state;
    }
}
