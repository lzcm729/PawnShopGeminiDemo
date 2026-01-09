
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { usePawnShop } from '../hooks/usePawnShop';
import { useGameEngine } from '../hooks/useGameEngine';
import { Item, ItemStatus } from '../types';
import { Button } from './ui/Button';
import { Wallet, Package, FileText, Stamp, RefreshCw, LogOut, XCircle, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { CustomerView } from './CustomerView';

// --- TYPES ---
type RedemptionMode = 'OBLIGATION' | 'COMPENSATION' | 'NEGOTIATION';

// --- SUB-COMPONENT: Left Column (Customer + Wallet) ---
const RedemptionCustomerPanel: React.FC<{ customer: any, totalDue: number, interestDue: number }> = ({ customer, totalDue, interestDue }) => {
    const wallet = customer.currentWallet || 0;
    
    // Color Logic
    let statusColor = "text-stone-500";
    let statusText = "FUNDS UNKNOWN";
    let borderColor = "border-stone-700";

    if (wallet >= totalDue) {
        statusColor = "text-green-500";
        statusText = "资金充足 (SUFFICIENT)";
        borderColor = "border-green-600";
    } else if (wallet >= interestDue) {
        statusColor = "text-yellow-500";
        statusText = "仅够付息 (PARTIAL)";
        borderColor = "border-yellow-600";
    } else {
        statusColor = "text-red-500";
        statusText = "无力支付 (INSUFFICIENT)";
        borderColor = "border-red-600";
    }

    return (
        <div className="h-full border-r border-white/10 flex flex-col">
            <CustomerView />
            
            {/* Wallet Overlay at bottom of Customer Panel */}
            <div className="bg-[#1c1917] p-4 border-t border-[#44403c] relative z-20">
                <div className={`bg-[#0c0a09] p-4 rounded-lg border-2 ${borderColor} shadow-lg relative overflow-hidden`}>
                     {/* Background Pattern */}
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                     
                     <div className="relative z-10 flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Wallet className={`w-5 h-5 ${statusColor}`} />
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Client Wallet</span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 ${statusColor} border border-current`}>
                            {statusText}
                        </span>
                     </div>
                     
                     <div className="relative z-10 flex items-baseline gap-1">
                        <span className="text-3xl font-mono font-black text-white">${wallet}</span>
                        <span className="text-xs text-stone-500 font-bold">CASH</span>
                     </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Middle Column (Item + Receipt) ---
const TicketPanel: React.FC<{ item: Item, cost: any, penalty: number }> = ({ item, cost, penalty }) => {
    const isSold = item.status === ItemStatus.SOLD;
    
    return (
        <div className="h-full bg-[#1c1917] border-r border-white/10 flex flex-col relative overflow-hidden">
             
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

// --- SUB-COMPONENT: Right Column (Action Group) ---
const SettlementPanel: React.FC<{ 
    mode: RedemptionMode,
    customer: any, 
    item: Item, 
    cost: any, 
    penalty: number,
    onRedeem: () => void,
    onExtend: () => void,
    onReject: () => void,
    onHostileTakeover: () => void
}> = ({ mode, customer, item, cost, penalty, onRedeem, onExtend, onReject, onHostileTakeover }) => {
    const isSold = item.status === ItemStatus.SOLD;
    const wallet = customer.currentWallet || 0;
    const canAffordInterest = wallet >= (cost?.interest || 0);
    const canAffordTotal = wallet >= (cost?.total || 0);
    
    const [showTakeoverConfirm, setShowTakeoverConfirm] = useState(false);

    return (
        <div className="h-full bg-[#0c0a09] p-6 flex flex-col justify-center gap-6 border-l border-[#292524] relative">
            
            {/* Takeover Confirmation Modal Overlay */}
            {showTakeoverConfirm && (
                <div className="absolute inset-0 z-50 bg-[#1c0000] border-2 border-red-600 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-pulse" />
                    <h4 className="text-xl font-black text-red-500 uppercase tracking-widest mb-2">恶意违约警告</h4>
                    <p className="text-xs text-red-300 font-mono mb-4">
                        你正在拒绝归还客户的物品。<br/>
                        这将扣除 <strong className="text-white">${penalty}</strong> 作为违约金，并严重损害声誉 (CREDIBILITY -50)。
                        <br/><br/>
                        物品将归店铺所有 (FORFEIT)。
                    </p>
                    <div className="flex gap-2 w-full">
                        <Button variant="ghost" onClick={() => setShowTakeoverConfirm(false)} className="flex-1 text-stone-400 hover:text-white text-xs">
                            取消 (CANCEL)
                        </Button>
                        <Button variant="danger" onClick={onHostileTakeover} className="flex-1 h-12 bg-red-600 text-white border-red-800 text-xs">
                            确认执行 (EXECUTE)
                        </Button>
                    </div>
                </div>
            )}

            {/* Header / Mode Indicator */}
            <div className="text-center mb-2">
                 <h3 className="text-stone-500 text-sm font-mono uppercase tracking-widest mb-2">Action Required</h3>
                 {mode === 'OBLIGATION' && (
                     <span className="text-green-500 font-bold text-xs border border-green-900 bg-green-950/30 px-2 py-1 rounded">
                         CONTRACT OBLIGATION
                     </span>
                 )}
                 {mode === 'COMPENSATION' && (
                     <span className="text-red-500 font-bold text-xs border border-red-900 bg-red-950/30 px-2 py-1 rounded">
                         BREACH PROTOCOL
                     </span>
                 )}
                 {mode === 'NEGOTIATION' && (
                     <span className="text-yellow-500 font-bold text-xs border border-yellow-900 bg-yellow-950/30 px-2 py-1 rounded">
                         NEGOTIATION NEEDED
                     </span>
                 )}
            </div>

            {/* --- MODE 1: OBLIGATION (Force Redeem + Hostile Option) --- */}
            {mode === 'OBLIGATION' && (
                <div className="flex-1 flex flex-col justify-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-stone-400 text-center font-serif italic text-sm px-4">
                        "客户资金充足且契约有效。你必须履行义务，归还当物。"
                    </p>
                    <Button
                        variant="primary"
                        onClick={onRedeem}
                        className="h-32 text-2xl tracking-[0.2em] shadow-[0_0_30px_rgba(16,185,129,0.2)] border-2 border-green-500 bg-green-900/10 hover:bg-green-800 text-green-500 hover:text-white flex flex-col items-center justify-center gap-2"
                    >
                        <span className="flex items-center gap-3 font-black">
                            <CheckCircle2 className="w-8 h-8"/> 履行契约
                        </span>
                        <span className="text-sm font-mono opacity-80">FULFILL CONTRACT (+${cost?.total})</span>
                    </Button>
                    
                    {/* HOSTILE TAKEOVER OPTION */}
                    <div className="border-t border-stone-800 pt-4 mt-2">
                         <button 
                            onClick={() => setShowTakeoverConfirm(true)}
                            className="w-full text-[10px] text-red-900 hover:text-red-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors py-2 opacity-60 hover:opacity-100"
                        >
                            <ShieldAlert className="w-3 h-3" />
                            支付赔偿金并强制买断 (-${penalty})
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODE 2: COMPENSATION (Force Penalty) --- */}
            {mode === 'COMPENSATION' && (
                <div className="flex-1 flex flex-col justify-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                     <p className="text-red-400 text-center font-serif italic text-sm px-4">
                        "当物已遗失。你必须支付双倍违约金。"
                    </p>
                    <Button
                        variant="danger"
                        onClick={onRedeem}
                        className="h-32 text-2xl tracking-[0.2em] shadow-[0_0_30px_rgba(220,38,38,0.2)] border-4 border-double border-red-600 bg-red-950 hover:bg-red-800 text-white flex flex-col items-center justify-center gap-2"
                    >
                        <span className="flex items-center gap-3 font-black">
                            <ShieldAlert className="w-8 h-8"/> 支付赔偿
                        </span>
                        <span className="text-sm font-mono opacity-80">COMPENSATE (-${penalty})</span>
                    </Button>
                </div>
            )}

            {/* --- MODE 3: NEGOTIATION (Standard Options) --- */}
            {mode === 'NEGOTIATION' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                    
                    {/* Redeem (Likely Disabled) */}
                    <div className="group relative">
                        <Button 
                            variant="primary" 
                            onClick={onRedeem}
                            disabled={!canAffordTotal}
                            className={`w-full h-16 flex justify-between items-center px-6 text-lg tracking-widest border border-green-500/50 
                                ${!canAffordTotal ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-green-900/20'}
                            `}
                        >
                            <span className="flex items-center gap-2"><Stamp className="w-5 h-5"/> 赎回物品</span>
                            <span className="font-mono text-green-400">+${cost?.total}</span>
                        </Button>
                        {!canAffordTotal && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="bg-black/80 text-red-500 text-xs font-bold px-2 py-1 rounded border border-red-900 rotate-[-5deg]">
                                    FUNDS INSUFFICIENT
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Extend */}
                    <Button
                        variant="secondary"
                        onClick={onExtend}
                        disabled={!canAffordInterest}
                        className={`h-20 text-lg flex flex-col items-center justify-center gap-1 border-stone-600
                            ${!canAffordInterest ? 'opacity-30 cursor-not-allowed bg-transparent' : 'hover:bg-stone-800'}
                        `}
                    >
                        <span className="flex items-center gap-2"><RefreshCw className="w-5 h-5"/> 续当 7天</span>
                        <span className="text-xs font-mono text-stone-500">CHARGE INTEREST (+${cost?.interest})</span>
                    </Button>

                    {/* Reject */}
                    <Button
                        variant="ghost"
                        onClick={onReject}
                        className="h-16 text-stone-600 hover:text-stone-400 hover:bg-stone-900 border border-transparent hover:border-stone-800"
                    >
                        <span className="flex items-center gap-2"><LogOut className="w-5 h-5"/> 结束交易 / 送客</span>
                    </Button>

                    {!canAffordInterest && (
                        <div className="bg-red-950/30 text-red-500 text-xs text-center p-2 rounded border border-red-900/50 mt-2 animate-pulse">
                            <XCircle className="w-3 h-3 inline mr-1"/>
                            客户资金不足，无法进行操作。
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

// --- MAIN WRAPPER ---
export const RedemptionInterface: React.FC = () => {
    const { state, dispatch } = useGame();
    const { calculateRedemptionCost, calculatePenalty, processRedemption, processExtension, processHostileTakeover } = usePawnShop();
    const { commitTransaction } = useGameEngine();
    
    const customer = state.currentCustomer;
    const item = customer?.item;

    if (!customer || !item || !item.pawnInfo) {
        return <div className="col-span-12 text-center p-10 text-stone-500">Error: Invalid Redemption Data</div>;
    }

    const cost = calculateRedemptionCost(item);
    const penalty = calculatePenalty(item);
    
    // --- DETERMINE MODE ---
    const wallet = customer.currentWallet || 0;
    const totalCost = cost?.total || 0;
    const isSold = item.status === ItemStatus.SOLD;
    const isActive = item.status === ItemStatus.ACTIVE; 

    let mode: RedemptionMode = 'NEGOTIATION';

    if (isSold) {
        mode = 'COMPENSATION';
    } 
    // Fix: Force Obligation if it's a specific Redemption interaction OR standard logic holds
    else if (customer.interactionType === 'REDEEM' || (isActive && wallet >= totalCost)) {
        mode = 'OBLIGATION';
    } else {
        mode = 'NEGOTIATION';
    }

    const handleRedeem = () => {
        // Fix for Narrative Progression:
        // If the customer has dynamic effects (Story Character), we MUST use commitTransaction
        // to ensure the chain state is updated (Deactivated/Advanced).
        if ((customer as any)._dynamicEffects && (customer as any)._dynamicEffects.length > 0) {
             commitTransaction({
                 success: true,
                 message: "Redemption processed",
                 cashDelta: 0, // Effects handle cash via 'ADD_FUNDS'/'REDEEM_ALL'
                 reputationDelta: {},
                 item: item
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
        processExtension(item, 7);
         setTimeout(() => {
             dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: '', customerName: customer.name } });
        }, 500);
    };

    const handleHostileTakeover = () => {
        processHostileTakeover(item);
        setTimeout(() => {
            dispatch({ type: 'RESOLVE_TRANSACTION', payload: { cashDelta: 0, reputationDelta: {}, item: null, log: '', customerName: customer.name } });
        }, 500);
    };

    const handleReject = () => {
        dispatch({ type: 'REJECT_DEAL' });
    };

    return (
        <>
            <div className="lg:col-span-3 h-full overflow-hidden">
                <RedemptionCustomerPanel customer={customer} totalDue={cost?.total || 0} interestDue={cost?.interest || 0} />
            </div>
            <div className="lg:col-span-5 h-full overflow-hidden">
                <TicketPanel item={item} cost={cost} penalty={penalty} />
            </div>
            <div className="lg:col-span-4 h-full overflow-hidden">
                <SettlementPanel 
                    mode={mode}
                    customer={customer} 
                    item={item} 
                    cost={cost} 
                    penalty={penalty}
                    onRedeem={handleRedeem}
                    onExtend={handleExtend}
                    onReject={handleReject}
                    onHostileTakeover={handleHostileTakeover}
                />
            </div>
        </>
    );
};
