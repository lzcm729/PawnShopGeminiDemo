
import { useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { CalendarDayData, CalendarEvent, IncomeCertainty, CERTAINTY_WEIGHTS, WARNING_THRESHOLD } from '../systems/economy/types';
import { ItemStatus } from '../systems/items/types';
import { calculateInterest } from '../systems/economy/interest';
import { GAME_CONFIG } from '../systems/game/config';
import { getNewsMarkers } from '../systems/news/engine';

// Map NPC redemptionResolve to calendar IncomeCertainty tier
function resolveToIncomeCertainty(resolve: string | undefined): IncomeCertainty {
    switch (resolve) {
        case 'Strong': return 'HIGH';
        case 'Medium': return 'MEDIUM';
        case 'Weak':
        case 'None':
        default: return 'LOW';
    }
}

// Settlement ceremony data for Day 7 (design doc Section 2.G)
export interface SettlementCeremonyData {
    isSettlementDay: boolean;       // True if today is a medical bill due day
    isSettlementEve: boolean;       // True if tomorrow is a medical bill due day (Day 6 reminder)
    billAmount: number;             // The medical bill amount
    canAfford: boolean;             // Whether player can pay
    shortfall: number;              // Deficit if cannot afford (positive number)
    balanceAfterPayment: number;    // Cash remaining after payment
    narrativeLine: string;          // Three-beat narrative closure text
    severityTier: 'COMFORTABLE' | 'TIGHT' | 'BARELY_SURVIVED'; // Emotional tier
}

export const useFinancialProjection = () => {
    const { state } = useGame();
    const { stats, inventory, financialHistory, activeChains, dailyNews, pendingNews } = state;

    const projection = useMemo(() => {
        const days: CalendarDayData[] = [];
        let runningBalance = stats.cash;
        const MEDICAL_INTERVAL = GAME_CONFIG.BILL_CYCLE;
        const START_OFFSET = -2; // Start grid from 2 days ago

        // Build news marker lookup: day -> labels[]
        const newsMarkers = getNewsMarkers(dailyNews || [], stats.day, pendingNews || []);
        const markersByDay = new Map<number, string[]>();
        for (const m of newsMarkers) {
            const existing = markersByDay.get(m.day);
            if (existing) {
                existing.push(m.label);
            } else {
                markersByDay.set(m.day, [m.label]);
            }
        }
        
        // 1. Setup Rolling Horizon (28 Days)
        for (let i = 0; i < 28; i++) {
            const currentProjectionDay = stats.day + START_OFFSET + i;
            const isPast = currentProjectionDay < stats.day;
            const isToday = currentProjectionDay === stats.day;
            
            // Handle Past Days using History
            if (isPast) {
                const history = financialHistory.find(h => h.day === currentProjectionDay);
                if (history) {
                    days.push({
                        dayId: currentProjectionDay,
                        events: history.events.map(e => ({
                            type: e.type === 'INCOME' ? 'INCOME_POTENTIAL' as const : 'BILL' as const,
                            amount: e.amount,
                            label: e.label,
                            isCertain: true
                        })),
                        projectedBalance: history.endingCash,
                        riskLevel: 'SAFE',
                        isToday: false,
                        isPast: true
                    });
                } else {
                    days.push({
                        dayId: currentProjectionDay,
                        events: [],
                        projectedBalance: 0, 
                        riskLevel: 'SAFE',
                        isToday: false,
                        isPast: true
                    });
                }
                continue;
            }

            const dailyEvents: CalendarEvent[] = [];

            // 2. Daily Burn Rate
            runningBalance -= stats.dailyExpenses;

            // 3. Medical Bill - the core survival pressure
            let isMedicalDay = false;
            if (currentProjectionDay >= stats.medicalBill.dueDate) {
                const delta = currentProjectionDay - stats.medicalBill.dueDate;
                if (delta % MEDICAL_INTERVAL === 0) {
                    isMedicalDay = true;
                }
            }

            if (isMedicalDay) {
                const billAmount = stats.medicalBill.amount;
                runningBalance -= billAmount;
                dailyEvents.push({
                    type: 'BILL',
                    amount: -billAmount,
                    label: '母亲医药费 (Medical)',
                    isCertain: true
                });
            }

            // 4. Item Due Dates with Certainty Grading (S2-F2/F4)
            const expiringItems = inventory.filter(item =>
                (item.status === ItemStatus.ACTIVE || item.status === ItemStatus.SOLD) &&
                item.pawnInfo &&
                item.pawnInfo.dueDate === currentProjectionDay
            );

            expiringItems.forEach(item => {
                if (item.pawnInfo) {
                    const isSold = item.status === ItemStatus.SOLD;
                    const isReforged = item.wasReforged === true;
                    const interest = calculateInterest(item.pawnInfo.principal, item.pawnInfo.interestRate, item.pawnInfo.termDays);
                    const totalIncome = item.pawnInfo.principal + interest;

                    // Look up redemptionResolve from the related chain (S2-F4)
                    let certainty: IncomeCertainty = 'LOW';
                    if (!isSold && !isReforged) {
                        const chain = activeChains.find(c => c.id === item.relatedChainId);
                        const resolve = chain?.redemptionResolve;
                        certainty = resolveToIncomeCertainty(resolve);

                        // For narrative chains without explicit redemptionResolve,
                        // infer from chain variables (funds/hope)
                        if (!resolve && chain) {
                            const funds = (chain.variables.funds as number) ?? 0;
                            const hope = (chain.variables.hope as number) ?? 50;
                            if (funds >= totalIncome && hope >= 40) {
                                certainty = 'HIGH';
                            } else if (hope > 30) {
                                certainty = 'MEDIUM';
                            } else {
                                certainty = 'LOW';
                            }
                        }

                        // Apply weighted income to running balance
                        const weight = CERTAINTY_WEIGHTS[certainty];
                        runningBalance += totalIncome * weight;
                    }

                    let label = '到期: ' + item.name;
                    if (isSold) {
                        label = '到期(已售): ' + item.name;
                    }

                    dailyEvents.push({
                        type: 'ITEM_DUE',
                        amount: (isSold || isReforged) ? 0 : totalIncome,
                        label,
                        isCertain: false,
                        relatedId: item.id,
                        wasReforged: isReforged,
                        certainty: (isSold || isReforged) ? undefined : certainty
                    });
                }
            });

            // 5. Mails are NOT shown on calendar

            // 5b. News narrative markers (STORY_MOMENT)
            const dayMarkers = markersByDay.get(currentProjectionDay);
            if (dayMarkers) {
                for (const label of dayMarkers) {
                    dailyEvents.push({
                        type: 'STORY_MOMENT',
                        amount: 0,
                        label,
                        isCertain: true
                    });
                }
            }

            // 6. Three-level Risk Assessment (S2-F1)
            const riskLevel = runningBalance < 0 ? 'CRITICAL'
                            : runningBalance < WARNING_THRESHOLD ? 'WARNING'
                            : 'SAFE';

            days.push({
                dayId: currentProjectionDay,
                events: dailyEvents,
                projectedBalance: runningBalance,
                riskLevel,
                isToday: isToday,
                isPast: false
            });
        }

        return days;
    }, [stats.day, stats.cash, stats.medicalBill.amount, stats.medicalBill.dueDate, stats.dailyExpenses, inventory, financialHistory, activeChains, dailyNews, pendingNews]);

    return projection;
};

// Separate hook for settlement ceremony data (S2-F3)
export const useSettlementCeremony = (): SettlementCeremonyData => {
    const { state } = useGame();
    const { stats } = state;

    return useMemo((): SettlementCeremonyData => {
        const { medicalBill, cash, day } = stats;
        const nextMedicalDueDate = medicalBill.dueDate;
        const isSettlementDay = day === nextMedicalDueDate;
        const isSettlementEve = day === nextMedicalDueDate - 1;
        const billAmount = medicalBill.amount;
        const canAfford = cash >= billAmount;
        const shortfall = canAfford ? 0 : billAmount - cash;
        const balanceAfterPayment = cash - billAmount;
        const nextWeekMedical = GAME_CONFIG.WEEKLY_MEDICAL_COST;

        let narrativeLine: string;
        let severityTier: 'COMFORTABLE' | 'TIGHT' | 'BARELY_SURVIVED';

        if (!canAfford) {
            narrativeLine = '';
            severityTier = 'BARELY_SURVIVED';
        } else if (balanceAfterPayment > nextWeekMedical * 2) {
            narrativeLine = '母亲又撑过了一周。账上还有余量......但别放松。';
            severityTier = 'COMFORTABLE';
        } else if (balanceAfterPayment >= 100) {
            narrativeLine = '母亲又撑过了一周。但下一周...... $' + balanceAfterPayment + ' 够吗？';
            severityTier = 'TIGHT';
        } else {
            narrativeLine = '母亲又撑过了一周。但你的手在发抖——口袋里几乎什么都不剩了。';
            severityTier = 'BARELY_SURVIVED';
        }

        return {
            isSettlementDay,
            isSettlementEve,
            billAmount,
            canAfford,
            shortfall,
            balanceAfterPayment,
            narrativeLine,
            severityTier
        };
    }, [stats.day, stats.cash, stats.medicalBill.dueDate, stats.medicalBill.amount]);
};
