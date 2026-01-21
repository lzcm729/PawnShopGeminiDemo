

import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { useGameEngine } from '../hooks/useGameEngine';
import { Item, ItemStatus } from '../types';
import { Button } from './ui/Button';
import { Wallet, Package, FileText, Stamp, RefreshCw, LogOut, CheckCircle2, ShieldAlert, AlertTriangle, XCircle } from 'lucide-react';
import { CustomerView } from './CustomerView';
import { ALL_STORY_EVENTS } from '../services/storyData';

// --- SUB-COMPONENT: Left Column (Item + Receipt) ---
const TicketPanel: React.FC<{ item: Item, cost: any, penalty: number }> = ({ item, cost, penalty }) => {
    const isSold = item.status === ItemStatus.SOLD;
    const extensionCount = item.pawnInfo?.extensionCount || 0;
    
    return (
        <div className="h-full bg-[#1c1917] border-r border-[#44403c] flex flex-col relative overflow-hidden">
             
             {/* 1. Item Visuals with Status Overlay */}
             <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-[#0c0a09]">
                 <div className="w-48 h-48 bg-stone-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-700 relative z-10">
                     <Package className="w-24 h-24 text-stone-600 opacity-50" />
                     
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
                 
                 <h2 className="text-2xl font-bold text-stone-200 z-10">{item.name}</h2>
                 <p className="text-sm text-stone-500 font-mono z-10">{item.pawnInfo ? `Ticket #${item.id.slice(0,6)}` : 'UNKNOWN'}</p>

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
                                 <span>${item.pawnInfo?.valuation}</span>
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
                             
                             <div className="mt-4 pt-2 border-t-2 border-stone-400 border-dashed flex justify-between items-center">
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
    item: Item, 
    cost: any, 
    penalty: number,
    onRedeem: () => void,
    onExtend: () => void,
    onRefuseExtension: () => void,
    onDismiss: () => void,
    onHostileTakeover: () => void
}> = ({ customer, item, cost, penalty, onRedeem, onExtend, onRefuseExtension, onDismiss, onHostileTakeover }) => {
    
    // --- DETERMINE STATE ---
    const wallet = customer.currentWallet || 0;
    const canAffordInterest = wallet >= (cost?.interest || 0);
    const canAffordTotal = wallet >= (cost?.total || 0);
    
    const intent = customer.redemptionIntent || 'LEAVE'; // REDEEM | EXTEND | LEAVE
    const isSold = item.status === ItemStatus.SOLD;

    // CONFIRMATION STATES
    const [showTakeoverConfirm, setShowTakeoverConfirm] = useState(false);
    const [showRefuseConfirm, setShowRefuseConfirm] = useState(false);

    // --- RENDER LOGIC: BREACH MODE ---
    if (isSold) {
        return (
            <div className="bg-[#1c1917] border-t border-[#44403c] flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-10 relative p-4 min-h-[140px] justify-center">
                <div className="text-center text-red-500 text-xs font-bold uppercase tracking-widest border border-red-900 bg-red-950/20 py-1 rounded mb-3">
                    BREACH PROTOCOL INITIATED
                </div>
                <Button
                    variant="danger"
                    onClick={onRedeem} // In breach mode, Redeem triggers the penalty payment
                    className="h-16 text-xl tracking-[0.1em] shadow-[0_0_20px_rgba(220,38,38,0.3)] border-2 border-red-600 bg-red-950 hover:bg-red-800 text-white flex items-center justify-center gap-3"
                >
                    <ShieldAlert className="w-6 h-6"/> 
                    <div className="flex flex-col items-start">
                        <span className="font-black leading-none">支付赔偿</span>
                        <span className="text-[10px] font-mono opacity-80">PENALTY (-${penalty})</span>
                    </div>
                </Button>
            </div>
        )
    }

    // --- RENDER LOGIC: STANDARD MODES ---
    // 1. Status Bar
    let statusColor = "text-stone-500";
    let statusText = "UNKNOWN";
    let statusBorder = "border-stone-700";
    let statusBg = "bg-stone-900";

    if (intent === 'REDEEM') {
        statusColor = "text-green-500";
        statusText = "全额备款 (FULL PAYMENT)";
        statusBorder = "border-green-600/50";
        statusBg = "bg-green-950/20";
    } else if (intent === 'EXTEND') {
        statusColor = "text-yellow-500";
        statusText = "仅付利息 (INTEREST ONLY)";
        statusBorder = "border-yellow-600/50";
        statusBg = "bg-yellow-950/20";
    } else {
        statusColor = "text-red-500";
        statusText = "无力支付 (INSUFFICIENT)";
        statusBorder = "border-red-600/50";
        statusBg = "bg-red-950/20";
    }

    return (
        <div className="bg-[#1c1917] border-t border-[#44403c] flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-10 relative">
            
            {/* Hostile Takeover Modal */}
            {showTakeoverConfirm && (
                <div className="absolute inset-0 z-50 bg-[#1c0000] border-t-2 border-red-600 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-bottom-5">
                    <AlertTriangle className="w-10 h-10 text-red-500 mb-2 animate-pulse" />
                    <h4 className="text-lg font-black text-red-500 uppercase tracking-widest mb-1">恶意违约警告</h4>
                    <p className="text-xs text-red-300 font-mono mb-4 px-4">
                        拒绝归还物品将扣除 <strong className="text-white">${penalty}</strong> 违约金并严重损害声誉。
                    </p>
                    <div className="flex gap-2 w-full">
                        <Button variant="ghost" onClick={() => setShowTakeoverConfirm(false)} className="flex-1 text-stone-400 hover:text-white text-xs">
                            取消
                        </Button>
                        <Button variant="danger" onClick={onHostileTakeover} className="flex-1 h-10 bg-red-600 text-white border-red-800 text-xs">
                            确认执行
                        </Button>
                    </div>
                </div>
            )}

            {/* Refuse Extension Modal */}
            {showRefuseConfirm && (
                 <div className="absolute inset-0 z-50 bg-[#1c1917] border-t-2 border-stone-600 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-bottom-5">
                    <LogOut className="w-10 h-10 text-stone-400 mb-2" />
                    <h4 className="text-lg font-black text-stone-200 uppercase tracking-widest mb-1">拒绝续当</h4>
                    <p className="text-xs text-stone-400 font-mono mb-4 px-4">
                        物品将归店铺所有 (FORFEIT)。<br/>
                        这会损害你的人情声誉 (Humanity -10)。
                    </p>
                    <div className="flex gap-2 w-full">
                        <Button variant="ghost" onClick={() => setShowRefuseConfirm(false)} className="flex-1 text-stone-400 hover:text-white text-xs">
                            取消
                        </Button>
                        <Button variant="primary" onClick={onRefuseExtension} className="flex-1 h-10 bg-stone-700 text-white border-stone-500 text-xs">
                            确认送客
                        </Button>
                    </div>
                </div>
            )}

            {/* STATUS HEADER */}
            <div className={`px-4 py-2 border-b border-[#292524] flex justify-between items-center ${statusBg}`}>
                 <div className="flex items-center gap-2">
                    <Wallet className={`w-4 h-4 ${statusColor}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${statusColor}`}>Client Intent</span>
                 </div>
                 <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusBorder} ${statusColor} bg-black/40`}>
                    {statusText}
                 </span>
            </div>

            {/* MAIN ACTIONS AREA */}
            <div className="p-4 flex flex-col gap-3 min-h-[140px] justify-center">

                {/* SCENARIO 1: CUSTOMER WANTS TO REDEEM */}
                {intent === 'REDEEM' && (
                    <div className="flex flex-col gap-3 animate-in fade-in">
                        <Button
                            variant="primary"
                            onClick={onRedeem}
                            className="h-16 text-xl tracking-[0.1em] shadow-[0_0_15px_rgba(16,185,129,0.2)] border-green-500 bg-green-900/20 hover:bg-green-800 text-green-400 hover:text-white flex items-center justify-center gap-3"
                        >
                            <CheckCircle2 className="w-6 h-6"/> 
                            <div className="flex flex-col items-start">
                                <span className="font-black leading-none">同意赎回</span>
                                <span className="text-[10px] font-mono opacity-80">RETURN ITEM (+${cost?.total})</span>
                            </div>
                        </Button>
                        
                        <button 
                            onClick={() => setShowTakeoverConfirm(true)}
                            className="text-[10px] text-red-900 hover:text-red-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-colors opacity-60 hover:opacity-100"
                        >
                            <ShieldAlert className="w-3 h-3" />
                            强制违约 / 恶意买断 (-${penalty})
                        </button>
                    </div>
                )}

                {/* SCENARIO 2: CUSTOMER WANTS TO EXTEND */}
                {intent === 'EXTEND' && (
                    <div className="flex flex-col gap-3 animate-in fade-in">
                        <Button
                            variant="secondary"
                            onClick={onExtend}
                            className="h-16 text-xl tracking-[0.1em] border-yellow-500/50 bg-yellow-900/10 hover:bg-yellow-900/30 text-yellow-500 flex items-center justify-center gap-3"
                        >
                            <RefreshCw className="w-6 h-6"/>
                            <div className="flex flex-col items-start">
                                <span className="font-black leading-none">同意续当</span>
                                <span className="text-[10px] font-mono opacity-80">EXTEND 7 DAYS (+${cost?.interest})</span>
                            </div>
                        </Button>

                         <button 
                            onClick={() => setShowRefuseConfirm(true)}
                            className="text-[10px] text-stone-600 hover:text-stone-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
                        >
                            <XCircle className="w-3 h-3" />
                            拒绝续当 / 强制绝当 (REFUSE)
                        </button>
                    </div>
                )}

                {/* SCENARIO 3: CUSTOMER IS BROKE (LEAVE) */}
                {intent === 'LEAVE' && (
                     <div className="flex flex-col gap-3 animate-in fade-in">
                        <p className="text-[10px] text-stone-500 text-center italic">
                            "老板，再宽限几天吧... 我真的没钱。"
                        </p>
                        <Button
                            variant="danger"
                            onClick={onDismiss}
                            className="h-14 w-full text-red-300 hover:text-white border-red-900/50 hover:bg-red-950 flex flex-col items-center justify-center"
                        >
                            <span className="flex items-center gap-2 text-lg font-bold"><LogOut className="w-5 h-5"/> 送 客 (DISMISS)</span>
                            <span className="text-[9px] opacity-70">ITEM WILL BECOME FORFEIT</span>
                        </Button>
                    </div>
                )}
                
            </div>
        </div>
    );
};

// --- MAIN WRAPPER ---
export const RedemptionInterface: React.FC = () => {
    const { state, dispatch } = useGame();
    const { calculateRedemptionCost, calculatePenalty, processRedemption, processExtension, processRefuseExtension, processHostileTakeover, processForcedForfeiture } = usePawnShop();
    const { commitTransaction, applyChainEffects } = useGameEngine();
    
    const customer = state.currentCustomer;
    const item = customer?.item;

    if (!customer || !item || !item.pawnInfo) {
        return <div className="col-span-12 text-center p-10 text-stone-500">Error: Invalid Redemption Data</div>;
    }

    const cost = calculateRedemptionCost(item);
    const penalty = calculatePenalty(item);

    const handleRedeem = () => {
        // Fix for Narrative Progression:
        // If the customer has dynamic effects (Story Character), we MUST use commitTransaction
        // to ensure the chain state is updated (Deactivated/Advanced).
        if ((customer as any)._dynamicEffects && (customer as any)._dynamicEffects.length > 0) {
             commitTransaction({
                 success: true,
                 message: "已赎回 (Redeemed)",
                 cashDelta: 0, // Effects handle cash via 'ADD_FUNDS'/'REDEEM_ALL'
                 reputationDelta: {},
                 item: undefined // DO NOT PASS ITEM to prevent duplication in inventory
             });
        } else {
             // Standard Redemption
             processRedemption(item);
             setTimeout(() => {
                 dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: '', customerName: customer.name } });
             }, 500);
        }
    };

    const handleExtend = () => {
        // 1. Business Logic
        processExtension(item, 7);
        
        // 2. Narrative Logic
        if (customer.chainId && customer.eventId) {
             const event = ALL_STORY_EVENTS.find(e => e.id === customer.eventId);
             if (event && event.onExtend) {
                 applyChainEffects(customer.chainId, event.onExtend, undefined, customer);
             }
        }

         setTimeout(() => {
             dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: '', customerName: customer.name } });
        }, 500);
    };

    const handleRefuseExtension = () => {
        // 1. Business Logic: Forfeit Item, -Reputation
        processRefuseExtension(item);

        // 2. Narrative Logic: Trigger Failure Mail if defined
        if (customer.chainId && customer.eventId) {
             const event = ALL_STORY_EVENTS.find(e => e.id === customer.eventId);
             
             // Check for Failure Mail
             if (event && event.failureMailId) {
                  dispatch({ 
                       type: 'SCHEDULE_MAIL', 
                       payload: { 
                           templateId: event.failureMailId, 
                           delayDays: 1,
                           metadata: { relatedItemName: item.name }
                       } 
                  });
             }

             // Trigger "onFailure" effects (e.g. stage advancement to avoid stuck loop)
             if (event && event.onFailure) {
                 applyChainEffects(customer.chainId, event.onFailure, undefined, customer);
             }
        }

        setTimeout(() => {
            // Close interaction
            dispatch({ type: 'REJECT_DEAL' }); 
        }, 500);
    };

    const handleHostileTakeover = () => {
        // 1. Business Logic Update (Status -> FORFEIT, Cash penalty)
        processHostileTakeover(item);
        
        // 2. Narrative Logic Update (Apply specific hostile flow effects)
        if (customer.chainId && customer.eventId) {
            const event = ALL_STORY_EVENTS.find(e => e.id === customer.eventId);
            const hostileFlow = event?.dynamicFlows?.['hostile_takeover'];
            
            if (hostileFlow) {
                 // Use specific narrative logic if defined
                 applyChainEffects(customer.chainId, hostileFlow.outcome, undefined, customer);
            } else {
                 // Fallback: Just kill the chain if no specific outcome defined
                const updatedChains = state.activeChains.map(chain => {
                    if (chain.id === customer.chainId) {
                        return { ...chain, isActive: false };
                    }
                    return chain;
                });
                dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
            }
        }

        setTimeout(() => {
            dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: '', customerName: customer.name } });
        }, 500);
    };

    const handleDismiss = () => {
        processForcedForfeiture(item);
    };

    return (
        <>
            {/* COLUMN 1 (Left): TICKET (Item Info) - Matches ItemPanel in Pawn View (50%) */}
            <div className="lg:col-span-6 h-full overflow-hidden border-r border-white/10">
                <TicketPanel item={item} cost={cost} penalty={penalty} />
            </div>

            {/* COLUMN 2 (Right): CUSTOMER + ACTIONS - Matches Negotiation Panel (50%) */}
            <div className="lg:col-span-6 h-full flex flex-col overflow-hidden">
                {/* Top: Customer View (Dialogue) */}
                <div className="flex-1 overflow-hidden relative">
                    <CustomerView />
                </div>
                
                {/* Bottom: Settlement Controls (Fixed) */}
                <SettlementPanel 
                    customer={customer} 
                    item={item} 
                    cost={cost} 
                    penalty={penalty}
                    onRedeem={handleRedeem}
                    onExtend={handleExtend}
                    onRefuseExtension={handleRefuseExtension}
                    onDismiss={handleDismiss}
                    onHostileTakeover={handleHostileTakeover}
                />
            </div>
        </>
    );
};