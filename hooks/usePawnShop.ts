
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { Item, ItemStatus } from '../types';

export const usePawnShop = () => {
    const { state, dispatch } = useGame();

    // 1. Calculate Redemption Cost
    const calculateRedemptionCost = useCallback((item: Item) => {
        if (!item.pawnInfo) return null;

        const currentDay = state.stats.day;
        const { principal, interestRate, startDate, termDays } = item.pawnInfo;

        const daysPassed = Math.max(1, currentDay - startDate);
        
        // Logic: Full interest for termDays even if early; actual days if late.
        const effectiveDays = Math.max(daysPassed, termDays); 
        
        const interest = Math.ceil(principal * interestRate * (effectiveDays / 7));
        
        return {
            principal,
            interest,
            total: principal + interest,
            daysPassed
        };
    }, [state.stats.day]);

    // NEW: Calculate Breach Penalty (Double Indemnity)
    const calculatePenalty = useCallback((item: Item) => {
        if (!item.pawnInfo) return 0;
        // Penalty is 2x the Contract Valuation
        return item.pawnInfo.valuation * 2.0;
    }, []);

    // 2. Process Redemption (Handles Standard and Breach)
    const processRedemption = useCallback((item: Item) => {
        const cost = calculateRedemptionCost(item);
        if (!cost) return;

        // CASE A: Standard Redemption (Item is present)
        if (item.status === ItemStatus.ACTIVE || item.status === ItemStatus.FORFEIT) {
             dispatch({ 
                type: 'REDEEM_ITEM', 
                payload: { 
                    itemId: item.id, 
                    paymentAmount: cost.total,
                    name: item.name 
                } 
            });
            return;
        }

        // CASE B: Breach Redemption (Item is SOLD)
        if (item.status === ItemStatus.SOLD) {
            const penalty = calculatePenalty(item);
            
            // Bankruptcy Check
            if (state.stats.cash < penalty) {
                dispatch({
                    type: 'GAME_OVER',
                    payload: `信誉破产。顾客 ${item.name} 发现你私自变卖典当物，且你无力支付 $${penalty} 的违约金。警察随后带走了你。`
                });
            } else {
                dispatch({
                    type: 'RESOLVE_BREACH',
                    payload: {
                        penalty,
                        name: item.name
                    }
                });
            }
        }

    }, [calculateRedemptionCost, calculatePenalty, state.stats.cash, dispatch]);

    // 3. Process Extension
    const processExtension = useCallback((item: Item, extensionDays: number = 7) => {
        if (!item.pawnInfo || item.status !== ItemStatus.ACTIVE) return;

        const cost = calculateRedemptionCost(item);
        if (!cost) return;

        const newDueDate = item.pawnInfo.dueDate + extensionDays;

        dispatch({
            type: 'EXTEND_PAWN',
            payload: {
                itemId: item.id,
                interestPaid: cost.interest,
                newDueDate,
                name: item.name
            }
        });

    }, [calculateRedemptionCost, dispatch]);

    // 4. Check Daily Expirations
    const checkDailyExpirations = useCallback(() => {
        const currentDay = state.stats.day;
        const expiredItemIds: string[] = [];
        const logs: string[] = [];

        state.inventory.forEach(item => {
            if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
                if (currentDay > item.pawnInfo.dueDate) {
                    expiredItemIds.push(item.id);
                    logs.push(`[系统] ${item.name} 已过期，自动转为绝当 (FORFEIT)。`);
                }
            }
        });

        if (expiredItemIds.length > 0) {
            dispatch({
                type: 'EXPIRE_ITEMS',
                payload: { expiredItemIds, logs }
            });
        }
    }, [state.stats.day, state.inventory, dispatch]);

    // 5. Handle Late Redemption (The "Return Logic")
    const handleLateRedemption = useCallback((item: Item): 'AVAILABLE' | 'GONE' | 'ERROR' => {
        if (item.status === ItemStatus.FORFEIT || item.status === ItemStatus.ACTIVE) {
            return 'AVAILABLE'; 
        }
        if (item.status === ItemStatus.SOLD) {
            return 'GONE'; // Triggers breach logic
        }
        return 'ERROR';
    }, []);

    // Sell Active Pawn (Player Default)
    const sellActivePawn = useCallback((item: Item) => {
        if (item.status !== ItemStatus.ACTIVE) return;

        // Sell for real value (Liquidate price logic - 80%)
        const amount = Math.floor(item.realValue * 0.8);

        dispatch({
            type: 'DEFAULT_SELL_ITEM',
            payload: {
                itemId: item.id,
                amount,
                name: item.name
            }
        });

    }, [dispatch]);

    // NEW: Hostile Takeover (Forced Buyout)
    const processHostileTakeover = useCallback((item: Item) => {
        const penalty = calculatePenalty(item);
        
        // Bankruptcy Check
        if (state.stats.cash < penalty) {
            dispatch({
                type: 'GAME_OVER',
                payload: `破产。你试图强行留下 ${item.name}，但支付不起 $${penalty} 的违约金。`
            });
            return;
        }

        dispatch({
            type: 'HOSTILE_TAKEOVER',
            payload: {
                itemId: item.id,
                penalty,
                name: item.name
            }
        });

    }, [calculatePenalty, state.stats.cash, dispatch]);

    return {
        calculateRedemptionCost,
        calculatePenalty,
        processRedemption,
        processExtension,
        checkDailyExpirations,
        handleLateRedemption,
        sellActivePawn,
        processHostileTakeover
    };
};
