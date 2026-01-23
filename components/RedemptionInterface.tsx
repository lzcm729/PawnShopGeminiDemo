
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { useGameEngine } from '../hooks/useGameEngine';
import { Item, ItemStatus, ChainUpdateEffect } from '../types';
import { Button } from './ui/Button';
import { Wallet, Package, FileText, Stamp, RefreshCw, LogOut, CheckCircle2, ShieldAlert, AlertTriangle, XCircle, Layers, Plus, Heart, HandHeart, Skull } from 'lucide-react';
import { CustomerView } from './CustomerView';
import { ALL_STORY_EVENTS } from '../services/storyData';

// --- SUB-COMPONENT: Left Column (Item + Receipt) ---
const TicketPanel: React.FC<{ items: Item[], cost: any, penalty: number, isBundle: boolean }> = ({ items, cost, penalty, isBundle }) => {
    // If bundle, we pick the first one as representative or show a stack
    const primaryItem = items[0];
    if (!primaryItem) return null;

    const isSold = primaryItem.status === ItemStatus.SOLD; // Assume check on primary for breach (rare in bundle)
    const extensionCount = primaryItem.pawnInfo?.extensionCount || 0;
    
    return (
        <div className="h-full bg-[#1c1917] border-r border-[#44403c] flex flex-col relative overflow-hidden">
             
             {/* 1. Item Visuals with Status Overlay */}
             <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-[#0c0a09]">
                 <div className="w-48 h-48 bg-stone-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-700 relative z-10">
                     {isBundle ? (
                         <div className="relative">
                             <Layers className="w-24 h-24 text-stone-500 opacity-50" />
                             <div className="absolute -bottom-2 -right-2 bg-pawn-accent text-black font-bold text-xs px-2 py-1 rounded-full border border-white">
                                 x{items.length}
                             </div>
                         </div>
                     ) : (
                         <Package className="w-24 h-24 text-stone-600 opacity-50" />
                     )}
                     
                     {/* SOLD OVERLAY */}
                     {isSold && (
                         <div className="absolute inset-0 flex items-center justify-center z-50">
                             <div className="w-full h-full absolute bg-red-950/40 rounded-full animate-pulse"></div>
                             <div className="border-[8px] border-red-600 text-red-600 font-black text-5xl uppercase tracking-widest p-4 rotate-[-15deg] opacity-90 shadow-[0_0_20px_rgba(220,38,38,0.5)] bg-black/20 backdrop-blur-sm">
                                 SOLD
                             </div>
                         </div>
                     )}
                 </div>
                 
                 <h2 className="text-2xl font-bold text-stone-200 z-10 text-center">
                     {isBundle ? "批量赎回 (Batch Redemption)" : primaryItem.name}
                 </h2>
                 <div className="text-sm text-stone-500 font-mono z-10 mt-2 text-center">
                     {isBundle ? (
                         items.length <= 3 ? (
                             <div className="flex flex-col gap-1">
                                 {items.map(i => <span key={i.id}>{i.name}</span>)}
                             </div>
                         ) : (
                             <span>{items.length} Items Selected</span>
                         )
                     ) : (
                         primaryItem.pawnInfo ? `Ticket #${primaryItem.id.slice(0,6)}` : 'UNKNOWN'
                     )}
                 </div>

                 {/* Grid Pattern */}
                 <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zaDBw8PDgk8yAgBRHhOOdaaFmwAAAABJRU5ErkJggg==')] opacity-10 pointer-events-none"></div>
             </div>

             {/* 2. Receipt Detail */}
             <div className={`p-6 border-t-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 relative ${isSold ? 'bg-red-950/10 border-red-900' : 'bg-[#e7e5e4] border-stone-300 text-stone-900'}`}>
                 
                 {/* Paper Texture */}
                 {!isSold && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-40 pointer-events-none mix-blend-multiply"></div>}
                 
                 <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-4 border-b border-current pb-2 opacity-50">
                         <FileText className="w-4 h-4" />
                         <span className="text-xs font-black uppercase tracking-[0.2em]">Settlement Statement</span>
                     </div>

                     {isSold ? (
                         // BREACH RECEIPT
                         <div className="space-y-2 font-mono">
                             <div className="flex justify-between text-sm text-red-400">
                                 <span>CONTRACT VALUATION</span>
                                 <span>${primaryItem.pawnInfo?.valuation}</span>
                             </div>
                             <div className="flex justify-between text-sm text-red-400">
                                 <span>BREACH MULTIPLIER</span>
                                 <span>x 2.0</span>
                             </div>
                             <div className="mt-4 pt-2 border-t border-red-800 flex justify-between items-center">
                                 <span className="text-lg font-black text-red-500 uppercase">PENALTY DUE</span>
                                 <span className="text-3xl font-black text-red-600">-${penalty}</span>
                             </div>
                             <p className="text-[10px] text-red-800/80 text-center mt-2 uppercase font-bold">
                                 * Pay to Customer immediately *
                             </p>
                         </div>
                     ) : (
                         // STANDARD RECEIPT
                         <div className="space-y-2 font-mono text-stone-800">
                             {isBundle ? (
                                 <div className="flex flex-col gap-2">
                                     <div className="max-h-32 overflow-y-auto custom-scrollbar-light border-b border-stone-400/30 pb-2">
                                         {items.map(i => {
                                             const p = i.pawnInfo?.principal || 0;
                                             return (
                                                 <div key={i.id} className="flex justify-between text-xs mb-1">
                                                     <span className="truncate w-3/4 text-stone-700">{i.name}</span>
                                                     <span className="font-mono text-stone-500">${p}</span>
                                                 </div>
                                             )
                                         })}
                                     </div>
                                     
                                     <div className="flex flex-col gap-1 text-xs font-mono text-stone-600 border-b border-dashed border-stone-400 pb-2 mb-1">
                                         <div className="flex justify-between">
                                             <span>Total Principal</span>
                                             <span className="font-bold">${cost?.principal}</span>
                                         </div>
                                         <div className="flex justify-between text-stone-500 items-center">
                                             <span className="flex items-center gap-1"><Plus className="w-3 h-3"/> Total Interest</span>
                                             <span className="font-bold text-stone-700">+${cost?.interest}</span>
                                         </div>
                                     </div>
                                 </div>
                             ) : (
                                 <>
                                     <div className="flex justify-between text-sm">
                                         <span className="text-stone-500">Principal Loan</span>
                                         <span className="font-bold">${cost?.principal}</span>
                                     </div>
                                     <div className="flex justify-between text-sm">
                                         <span className="text-stone-500">Interest ({cost?.daysPassed} days)</span>
                                         <span className="font-bold">+${cost?.interest}</span>
                                     </div>
                                     <div className="flex justify-between text-sm">
                                         <span className="text-stone-500">Extension Count</span>
                                         <span className="font-bold">
                                             {extensionCount} 次 (Count)
                                         </span>
                                     </div>
                                 </>
                             )}
                             
                             <div className="mt-2 pt-2 flex justify-between items-center">
                                 <span className="text-lg font-black text-stone-900 uppercase">TOTAL DUE</span>
                                 <span className="text-3xl font-black text-pawn-accent bg-black px-2 py-0.5 rounded transform rotate-[-1deg] shadow-lg">
                                     ${cost?.total}
                                 </span>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
        </div>
    );
};

// --- SUB-COMPONENT: Right Column Bottom (Action Group) ---
const SettlementPanel: React.FC<{ 
    customer: any, 
    cost: any, 
    penalty: number,
    onRedeem: () => void,
    onCharityReturn: () => void,
    onExtend: () => void,
    onRefuseExtension: () => void,
    onDismiss: () => void,
    onHostileTakeover: () => void,
    isBreach: boolean,
    canAffordBreach: boolean
}> = ({ customer, cost, penalty, onRedeem, onCharityReturn, onExtend, onRefuseExtension, onDismiss, onHostileTakeover, isBreach, canAffordBreach }) => {
    
    // --- DETERMINE STATE ---
    const intent = customer.redemptionIntent || 'LEAVE'; // REDEEM | EXTEND | LEAVE
    const allowFree = customer.allowFreeRedeem;
    const canAffordRedeem = customer.currentWallet >= (cost?.total || 0);
    const canAffordInterest = customer.currentWallet >= (cost?.interest || 0);

    // If it's a breach, only 2 paths: Pay Penalty or Hostile Takeover (if implemented) or just Dismiss/Fail
    if (isBreach) {
        return (
            <div className="p-4 grid gap-3">
                <Button 
                    variant="danger" 
                    onClick={onRedeem} // In breach context, redeem means "Pay Penalty"
                    disabled={!canAffordBreach}
                    className="h-16 text-lg border-red-500 bg-red-900/30 hover:bg-red-900/50"
                >
                    <div className="flex flex-col items-center">
                        <span className="flex items-center gap-2 font-bold"><ShieldAlert className="w-5 h-5"/> 支付违约赔偿</span>
                        <span className="text-xs opacity-70">PAY PENALTY (-${penalty})</span>
                    </div>
                </Button>
                
                {/* Hostile Takeover / Refuse to pay */}
                <Button 
                    variant="secondary"
                    onClick={onHostileTakeover}
                    className="h-12 border-stone-700 text-stone-500 hover:text-red-500 hover:border-red-500"
                >
                    <span className="flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4"/> 拒绝赔偿 (强行赶人)
                    </span>
                </Button>
            </div>
        );
    }

    // Standard Paths
    return (
        <div className="p-4 flex flex-col gap-3">
            
            {/* 1. CHARITY RETURN (Special Logic) */}
            {allowFree && (
                <Button 
                    variant="primary"
                    onClick={onCharityReturn}
                    className="h-14 bg-green-600 hover:bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="flex items-center justify-center gap-2 relative z-10">
                        <HandHeart className="w-6 h-6" />
                        <div className="flex flex-col items-start">
                            <span className="font-black tracking-widest text-lg">无偿归还</span>
                            <span className="text-[9px] font-mono uppercase opacity-90">Grant Charity (Humanity++)</span>
                        </div>
                    </div>
                </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
                {/* 2. REDEEM BUTTON */}
                <Button 
                    variant="primary" 
                    onClick={onRedeem}
                    disabled={!canAffordRedeem}
                    className={`h-16 flex flex-col items-center justify-center ${!canAffordRedeem ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Stamp className="w-5 h-5" /> 赎回
                    </div>
                    <span className="text-xs font-mono opacity-80">
                        CONFIRM (+${cost?.total})
                    </span>
                </Button>

                {/* 3. EXTEND BUTTON */}
                <Button 
                    variant="secondary" 
                    onClick={onExtend}
                    disabled={!canAffordInterest}
                    className={`h-16 border-stone-600 ${!canAffordInterest ? 'opacity-50 cursor-not-allowed' : 'hover:border-pawn-accent hover:text-pawn-accent'}`}
                >
                    <div className="flex flex-col items-center">
                        <span className="flex items-center gap-2 font-bold"><RefreshCw className="w-4 h-4"/> 续当 (7天)</span>
                        <span className="text-xs font-mono opacity-70">EXTEND (+${cost?.interest})</span>
                    </div>
                </Button>
            </div>

            {/* 4. DISMISS / REFUSE */}
            <div className="flex gap-2 mt-2">
                <button 
                    onClick={onRefuseExtension}
                    className="flex-1 py-2 text-xs text-stone-600 hover:text-red-500 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 rounded transition-colors flex items-center justify-center gap-1"
                    title="Forfeit Item & Keep Cash"
                >
                    <Skull className="w-3 h-3" /> 拒绝续当 (Forfeit)
                </button>
                <button 
                    onClick={onDismiss}
                    className="flex-1 py-2 text-xs text-stone-600 hover:text-stone-400 border border-transparent hover:border-stone-700 rounded transition-colors flex items-center justify-center gap-1"
                >
                    <LogOut className="w-3 h-3" /> 送客 (Dismiss)
                </button>
            </div>

            {/* Wallet Context Hint */}
            <div className="mt-1 text-center">
                {!canAffordRedeem && !canAffordInterest && !allowFree ? (
                    <span className="text-[10px] text-red-500 animate-pulse font-mono">
                        <AlertTriangle className="w-3 h-3 inline mr-1"/>
                        资金不足 (Insufficient Funds)
                    </span>
                ) : (
                    <span className="text-[10px] text-stone-600 font-mono">
                        <Wallet className="w-3 h-3 inline mr-1"/>
                        Customer Wallet: ${customer.currentWallet}
                    </span>
                )}
            </div>
        </div>
    );
};

export const RedemptionInterface: React.FC = () => {
    const { state, dispatch } = useGame();
    const { calculateRedemptionCost, calculatePenalty, processHostileTakeover, processForcedForfeiture } = usePawnShop();
    const { commitTransaction, rejectCustomer, applyChainEffects } = useGameEngine();
    
    const customer = state.currentCustomer;
    if (!customer) return null;

    // --- LOGIC: Identify Target Items ---
    // If it's a "Bundle Redeem" event, we might need to find all items for this chain.
    // Logic: If customer.item is a dummy virtual item (for Redemption Event), we need to look up real items.
    
    let targetItems: Item[] = [];
    const eventId = customer.eventId;
    const event = ALL_STORY_EVENTS.find(e => e.id === eventId);
    
    // Check if event specifies redemption logic
    const isRedeemAll = event?.outcomes?.['deal_standard']?.some(e => e.type === 'REDEEM_ALL'); // Heuristic check if not explicit
    
    // Default: The item attached to customer
    if (customer.item && !customer.item.isVirtual) {
        targetItems = [customer.item];
    } else {
        // Look for items belonging to this chain
        targetItems = state.inventory.filter(i => i.relatedChainId === customer.chainId && i.status !== ItemStatus.REDEEMED);
        // If specific target, filter
        const targetId = event?.targetItemId;
        if (targetId) {
            const specific = targetItems.find(i => i.id === targetId);
            if (specific) targetItems = [specific];
        }
    }

    if (targetItems.length === 0) return (
        <div className="h-full flex items-center justify-center text-stone-500 font-mono">
            ERROR: NO REDEEMABLE ITEMS FOUND
        </div>
    );

    // --- CALCULATE COSTS (Batch) ---
    let totalPrincipal = 0;
    let totalInterest = 0;
    let anySold = false;
    let totalPenalty = 0;

    targetItems.forEach(item => {
        if (item.status === ItemStatus.SOLD) {
            anySold = true;
            totalPenalty += calculatePenalty(item);
        } else {
            const c = calculateRedemptionCost(item);
            if (c) {
                totalPrincipal += c.principal;
                totalInterest += c.interest;
            }
        }
    });

    const totalCost = totalPrincipal + totalInterest;
    const costObj = {
        principal: totalPrincipal,
        interest: totalInterest,
        total: totalCost,
        daysPassed: 0 // Irrelevant for batch
    };

    // --- HANDLERS ---

    const handleRedeem = () => {
        if (anySold) {
            // PAY PENALTY
            if (state.stats.cash < totalPenalty) return; // Should be disabled anyway
            
            // We use commitTransaction but with a penalty construct
            // Actually `processRedemption` handles logic but for batch/event we use `commitTransaction` + effects
            const res = {
                success: true,
                message: "支付赔偿金。",
                cashDelta: -totalPenalty,
                reputationDelta: { Credibility: -20 }, // Still lose rep for breach
                dealQuality: 'fair' as const
            };
            commitTransaction(res);
        } else {
            // STANDARD REDEEM
            // We construct a transaction result that ADDS cash
            const res = {
                success: true,
                message: customer.dialogue.accepted.fair || "赎回成功。",
                cashDelta: totalCost,
                reputationDelta: { Credibility: 2 },
                dealQuality: 'fair' as const
            };
            // Note: The `commitTransaction` logic triggers chain effects.
            // If the event has "REDEEM_ALL" or "REDEEM_TARGET" effects, the items will be updated there.
            // If not, we might need manual update? 
            // `applyChainEffects` in `useGameEngine` handles `REDEEM_ALL`/`REDEEM_TARGET`.
            // So we just need to ensure the event has those effects mapped to "deal_standard" (which commitTransaction uses by default/logic).
            commitTransaction(res);
        }
    };

    const handleCharityReturn = () => {
        // Special Action: Return for $0
        const res = {
            success: true,
            message: "你是个好人。(Charity)",
            cashDelta: 0,
            reputationDelta: { Humanity: 15 }, // Big boost
            dealQuality: 'premium' as const // Treat as premium for outcome mapping
        };
        // We rely on the event having a 'deal_charity' or similar outcome that does REDEEM_TARGET
        // OR we manually trigger redemption here? 
        // The event system maps `rate=0` to `deal_charity`.
        // Let's force terms to rate 0.
        res['terms'] = { principal: 0, rate: 0 };
        commitTransaction(res);
    };

    const handleExtend = () => {
        // Only Pay Interest
        const res = {
            success: true,
            message: "续当成功。",
            cashDelta: totalInterest,
            reputationDelta: { Credibility: 1 },
            dealQuality: 'fair' as const // Usually maps to standard outcome unless specific extend logic exists
        };
        
        // Extension is special. It doesn't close the chain usually.
        // It updates the item due date. 
        // If the event has `onExtend` logic, we should use that.
        // The `useGameEngine` doesn't strictly have a `commitExtension` method that maps to `onExtend`.
        // BUT `commitTransaction` checks for `onComplete`.
        
        // Let's manually trigger the extension logic for items
        targetItems.forEach(i => {
            dispatch({ 
                type: 'EXTEND_PAWN', 
                payload: { itemId: i.id, interestPaid: 0, newDueDate: i.pawnInfo!.dueDate + 7, name: i.name } // Interest is in cashDelta
            });
        });

        // And allow engine to process event outcomes (e.g. reduce stress)
        // We hack the terms to imply standard deal for now, or add specific extend handling
        // Ideally we use `applyChainEffects` with `event.onExtend`.
        if (event?.onExtend) {
            applyChainEffects(customer.chainId, event.onExtend);
        }
        
        // Resolve transaction visually
        dispatch({ 
            type: 'RESOLVE_TRANSACTION', 
            payload: { 
                cashDelta: totalInterest, 
                reputationDelta: {}, 
                item: null, 
                log: "续当交易完成", 
                customerName: customer.name 
            } 
        });
    };

    const handleDismiss = () => {
        rejectCustomer();
    };

    const handleRefuseExtension = () => {
        // Force Forfeit
        targetItems.forEach(i => processForcedForfeiture(i));
        // Trigger generic rejection logic for chain
        rejectCustomer(); 
    };

    const handleHostileTakeover = () => {
        // Only valid for breach usually, refusing to pay penalty? 
        // Or forcing a buyout on a non-breach item (Refusing redemption)
        // For breach, it means dismissing without paying.
        if (anySold) {
            rejectCustomer(); // Just leave, effectively refusing to pay.
            // Trigger bad mail
            if (event?.dynamicFlows?.['hostile_takeover']) {
                 applyChainEffects(customer.chainId, event.dynamicFlows['hostile_takeover'].outcome);
            }
        }
    };

    return (
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 bg-black/20">
            {/* LEFT: 50% - Item & Receipt */}
            <div className="lg:col-span-6 h-full">
                <TicketPanel 
                    items={targetItems} 
                    cost={costObj} 
                    penalty={totalPenalty} 
                    isBundle={targetItems.length > 1}
                />
            </div>

            {/* RIGHT: 50% - Customer & Actions */}
            <div className="lg:col-span-6 h-full flex flex-col bg-[#1c1917] border-l border-[#44403c]">
                {/* 1. Customer View (Top) */}
                <div className="flex-1 overflow-hidden relative border-b border-[#44403c]">
                    <CustomerView />
                </div>

                {/* 2. Settlement Action Panel (Bottom) */}
                <div className="bg-[#141211] relative z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                    <SettlementPanel 
                        customer={customer}
                        cost={costObj}
                        penalty={totalPenalty}
                        isBreach={anySold}
                        canAffordBreach={state.stats.cash >= totalPenalty}
                        onRedeem={handleRedeem}
                        onCharityReturn={handleCharityReturn}
                        onExtend={handleExtend}
                        onRefuseExtension={handleRefuseExtension}
                        onDismiss={handleDismiss}
                        onHostileTakeover={handleHostileTakeover}
                    />
                </div>
            </div>
        </div>
    );
};
