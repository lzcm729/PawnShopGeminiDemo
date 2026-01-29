
import { useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { CalendarDayData, CalendarEvent } from '../systems/economy/types';
import { ItemStatus } from '../systems/items/types';

export const useFinancialProjection = () => {
    const { state } = useGame();
    const { stats, inventory, financialHistory } = state;

    const projection = useMemo(() => {
        const days: CalendarDayData[] = [];
        let runningBalance = stats.cash;
        const RENT_INTERVAL = 7;
        const START_OFFSET = -2; // Start grid from 2 days ago
        
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
                            type: e.type === 'INCOME' ? 'INCOME_POTENTIAL' : 'BILL', 
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
                    // Pre-game history (Day 0, -1, etc.)
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

            // 3. Fixed Costs (Rent) - "Management by Exception"
            // Logic: Check if currentProjectionDay is a rent day relative to the next due date
            // Note: rentDueDate moves. We assume regular intervals for projection.
            let isRentDay = false;
            if (currentProjectionDay >= stats.rentDueDate) {
                // Check if it aligns with the 7-day cycle from the current due date
                const delta = currentProjectionDay - stats.rentDueDate;
                if (delta % RENT_INTERVAL === 0) {
                    isRentDay = true;
                }
            }

            if (isRentDay) {
                const rentAmount = stats.rentDue;
                runningBalance -= rentAmount;
                dailyEvents.push({
                    type: 'BILL',
                    amount: -rentAmount,
                    label: '母亲医药费 (Medical)',
                    isCertain: true
                });
            }

            // 4. Item Due Dates & Story Moments
            // Include both ACTIVE and SOLD items - sold items still have due dates for breach redemption
            const expiringItems = inventory.filter(item =>
                (item.status === ItemStatus.ACTIVE || item.status === ItemStatus.SOLD) &&
                item.pawnInfo &&
                item.pawnInfo.dueDate === currentProjectionDay
            );

            expiringItems.forEach(item => {
                if (item.pawnInfo) {
                    const isSold = item.status === ItemStatus.SOLD;
                    const interest = Math.ceil(item.pawnInfo.principal * item.pawnInfo.interestRate);
                    const totalIncome = item.pawnInfo.principal + interest;

                    // For sold items, we won't receive income but might have to pay breach penalty
                    if (!isSold) {
                        runningBalance += totalIncome;
                    }

                    dailyEvents.push({
                        type: 'ITEM_DUE',
                        amount: isSold ? 0 : totalIncome,
                        label: isSold ? `到期(已售): ${item.name}` : `到期: ${item.name}`,
                        isCertain: false,
                        relatedId: item.id
                    });
                }
            });

            // 5. Mails are NOT shown on calendar - they are narrative surprises, not financial forecasts

            // 6. Determine Risk Level
            const riskLevel = runningBalance < 0 ? 'CRITICAL' : 'SAFE';

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
    }, [stats.day, stats.cash, stats.rentDue, stats.rentDueDate, stats.dailyExpenses, inventory, financialHistory]);

    return projection;
};
