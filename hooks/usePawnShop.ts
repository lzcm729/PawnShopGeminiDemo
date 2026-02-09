
import { useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { Item, ItemStatus, ExpiryEvent, ExpiryBehavior, EventChainState, StoryEvent } from '../types';
import { isTransientChain, determineTransientExpiryBehavior } from '../systems/npc/fillerGenerator';
import { calculateInterest } from '../systems/economy/interest';
import { GAME_CONFIG } from '../systems/game/config';

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
        
        const interest = calculateInterest(principal, interestRate, effectiveDays);
        
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
        // Penalty is 2x the Principal (pawn amount given to customer)
        return item.pawnInfo.principal * 2.0;
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

    // NEW: Process Refuse Extension (Forfeit item, no money, rep loss)
    // Escalating penalty: more prior renewals = harsher humanity loss
    const processRefuseExtension = useCallback((item: Item) => {
        const extensionCount = item.pawnInfo?.extensionCount || 0;
        dispatch({
            type: 'REFUSE_EXTENSION',
            payload: {
                itemId: item.id,
                name: item.name,
                extensionCount
            }
        });
    }, [dispatch]);

    // 4. Determine NPC Expiry Behavior based on chain type
    // NARRATIVE chains use condition-based logic (funds/hope)
    // TRANSIENT chains use probability-based logic (redemptionResolve/contractType)
    const determineExpiryBehavior = useCallback((
        chain: EventChainState,
        item: Item,
        redemptionTotal: number
    ): ExpiryBehavior => {
        // TRANSIENT chains use probability-based determination
        if (isTransientChain(chain)) {
            return determineTransientExpiryBehavior(chain);
        }

        // NARRATIVE chains use condition-based determination
        const funds = (chain.variables.funds as number) ?? 0;
        const hope = (chain.variables.hope as number) ?? 50;

        // 有钱且有希望 → 来赎回
        if (funds >= redemptionTotal && hope >= GAME_CONFIG.NARRATIVE.REDEEM_HOPE_THRESHOLD) {
            return 'REDEEM';
        }

        // 没钱但有希望 → 来续当
        if (funds < redemptionTotal && hope > GAME_CONFIG.NARRATIVE.RENEW_HOPE_THRESHOLD) {
            return 'RENEW';
        }

        // 绝望或资金极低 → 不出现
        return 'NO_SHOW';
    }, []);

    // 5. Check if item is a core item for any story event
    const findCoreItemEvent = useCallback((itemId: string): StoryEvent | null => {
        // This would need to import story events registry
        // For now, check if item has relatedChainId
        return null; // Will be implemented when we have story registry access
    }, []);

    // 6. Check Daily Expirations - Returns ExpiryEvents for REDEEM/RENEW only
    // NO_SHOW items are automatically forfeited (no player decision needed)
    // Handles both NARRATIVE chains (condition-based) and TRANSIENT chains (probability-based)
    // Also handles breach sale discovery (SOLD items where customer returns to redeem)
    const checkDailyExpirations = useCallback((): {
        expiryEvents: ExpiryEvent[];
        noShowForfeits: { itemId: string; chainId: string; itemName: string }[]
    } => {
        const currentDay = state.stats.day;
        const expiryEvents: ExpiryEvent[] = [];
        const autoForfeitIds: string[] = [];
        const autoForfeitLogs: string[] = [];
        const noShowForfeits: { itemId: string; chainId: string; itemName: string }[] = [];
        const chainsToDeactivate: string[] = [];

        state.inventory.forEach(item => {
            // Handle breach sale discovery: SOLD items where customer would come back to redeem
            if (item.status === ItemStatus.SOLD && item.breachSaleDay !== undefined && item.pawnInfo) {
                // Check if today is the due date for this breach-sold item
                if (currentDay !== item.pawnInfo.dueDate) return;

                // Find related chain to get NPC name
                const chain = state.activeChains.find(c => c.id === item.relatedChainId);

                // Calculate what redemption would have cost
                const cost = calculateRedemptionCost(item);
                if (!cost) return;

                // Determine if customer would have come to redeem
                // For breach sales, we check if they would have tried to redeem
                let behavior: ExpiryBehavior = 'REDEEM';
                if (chain) {
                    behavior = determineExpiryBehavior(chain, item, cost.total);
                }

                // Only trigger breach discovery if customer would have come to redeem or renew
                if (behavior === 'REDEEM' || behavior === 'RENEW') {
                    expiryEvents.push({
                        type: 'EXPIRY_CHECK',
                        chainId: chain?.id || 'unknown',
                        npcName: chain?.npcName || '顾客',
                        itemId: item.id,
                        itemName: item.name,
                        behavior: 'BREACH_DISCOVERED' as ExpiryBehavior, // Special behavior for breach discovery
                        redemptionCost: {
                            principal: cost.principal,
                            interest: cost.interest,
                            total: cost.total
                        },
                        valuation: item.pawnInfo.valuation,
                        interestRate: item.pawnInfo.interestRate,
                        realValue: item.realValue,
                        dueDate: item.pawnInfo.dueDate,
                        isCoreItem: false
                    });
                }
                // If NO_SHOW, customer never comes back, so no breach discovery
                return;
            }

            // Normal expiration handling for ACTIVE items
            if (item.status !== ItemStatus.ACTIVE || !item.pawnInfo) return;

            // 只处理今天到期的物品（精确匹配）
            if (currentDay !== item.pawnInfo.dueDate) return;

            // 找到关联的故事链
            const chain = state.activeChains.find(c => c.id === item.relatedChainId);

            if (!chain) {
                // 无故事链的普通物品，直接加入自动绝当列表
                autoForfeitIds.push(item.id);
                autoForfeitLogs.push(`[系统] ${item.name} 已过期，自动转为绝当 (FORFEIT)。`);
                return;
            }

            // 有故事链的物品，计算赎回费用并判断行为
            const cost = calculateRedemptionCost(item);
            if (!cost) return;

            const behavior = determineExpiryBehavior(chain, item, cost.total);

            // NO_SHOW: NPC 未现身，直接绝当（不触发结算节点）
            if (behavior === 'NO_SHOW') {
                autoForfeitIds.push(item.id);
                autoForfeitLogs.push(`[系统] ${chain.npcName} 未现身，${item.name} 已绝当。`);
                noShowForfeits.push({ itemId: item.id, chainId: chain.id, itemName: item.name });
                // TRANSIENT chains: Mark for deactivation on NO_SHOW
                if (isTransientChain(chain)) {
                    chainsToDeactivate.push(chain.id);
                }
                return;
            }

            // REDEEM / RENEW: 触发结算节点让玩家决策
            // For NARRATIVE chains, check if it's a core item
            // For TRANSIENT chains, core items don't exist (they're simple transactions)
            const isCoreItem = !isTransientChain(chain) &&
                (item.id.includes('clothes') || item.id.includes('core'));

            expiryEvents.push({
                type: 'EXPIRY_CHECK',
                chainId: chain.id,
                npcName: chain.npcName,
                itemId: item.id,
                itemName: item.name,
                behavior,
                redemptionCost: {
                    principal: cost.principal,
                    interest: cost.interest,
                    total: cost.total
                },
                valuation: item.pawnInfo.valuation,
                interestRate: item.pawnInfo.interestRate,
                realValue: item.realValue,
                dueDate: item.pawnInfo.dueDate,
                isCoreItem
            });
        });

        // 处理自动绝当物品（包括无故事链和 NO_SHOW）
        if (autoForfeitIds.length > 0) {
            dispatch({
                type: 'EXPIRE_ITEMS',
                payload: { expiredItemIds: autoForfeitIds, logs: autoForfeitLogs }
            });
        }

        // Deactivate TRANSIENT chains that resulted in NO_SHOW
        if (chainsToDeactivate.length > 0) {
            const updatedChains = state.activeChains.map(chain => {
                if (chainsToDeactivate.includes(chain.id)) {
                    return { ...chain, isActive: false };
                }
                return chain;
            });
            dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
        }

        return { expiryEvents, noShowForfeits };
    }, [state.stats.day, state.inventory, state.activeChains, calculateRedemptionCost, determineExpiryBehavior, dispatch]);

    // 7. Check for overdue items (past due date, auto forfeit)
    const checkOverdueItems = useCallback(() => {
        const currentDay = state.stats.day;
        const overdueIds: string[] = [];
        const logs: string[] = [];

        state.inventory.forEach(item => {
            if (item.status === ItemStatus.ACTIVE && item.pawnInfo) {
                // 超过到期日的自动绝当
                if (currentDay > item.pawnInfo.dueDate) {
                    overdueIds.push(item.id);
                    logs.push(`[系统] ${item.name} 已逾期，自动转为绝当 (FORFEIT)。`);
                }
            }
        });

        if (overdueIds.length > 0) {
            dispatch({
                type: 'EXPIRE_ITEMS',
                payload: { expiredItemIds: overdueIds, logs }
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
        const amount = Math.floor(item.realValue * GAME_CONFIG.ECONOMY.LIQUIDATION_RATE);

        dispatch({
            type: 'DEFAULT_SELL_ITEM',
            payload: {
                itemId: item.id,
                amount,
                name: item.name
            }
        });

    }, [dispatch]);

    // Sell Forfeit Item (Player liquidation of owned items)
    const sellForfeitItem = useCallback((item: Item) => {
        if (item.status !== ItemStatus.FORFEIT) return;

        // Sell for real value (100% since player owns it)
        const amount = item.realValue;

        dispatch({
            type: 'SELL_FORFEIT_ITEM',
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

    // NEW: Process Forced Forfeiture (Dismissing customer when they hit limit)
    const processForcedForfeiture = useCallback((item: Item) => {
        dispatch({
            type: 'FORCE_FORFEIT',
            payload: {
                itemId: item.id,
                name: item.name
            }
        });
    }, [dispatch]);

    return {
        calculateRedemptionCost,
        calculatePenalty,
        processRedemption,
        processExtension,
        processRefuseExtension,
        checkDailyExpirations,
        checkOverdueItems,
        handleLateRedemption,
        sellActivePawn,
        sellForfeitItem,
        processHostileTakeover,
        processForcedForfeiture,
        determineExpiryBehavior
    };
};
