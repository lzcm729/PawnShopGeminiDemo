
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Activity, HeartPulse, ShieldAlert, CreditCard, Syringe, PlusSquare, AlertTriangle, Battery } from 'lucide-react';
import { cn } from '../lib/utils';
import { playSfx } from '../systems/game/audio';

export const MedicalModal: React.FC = () => {
    const { state, dispatch } = useGame();
    const { stats } = state;
    const { motherStatus, medicalBill } = stats;

    if (!state.showMedical) return null;

    const healthPercent = motherStatus.health;
    const riskPercent = motherStatus.risk;
    const cash = stats.cash;

    const daysUntilBill = medicalBill.dueDate - stats.day;
    const canPayBill = cash >= medicalBill.amount && medicalBill.status !== 'PAID';
    const isBillOverdue = medicalBill.status === 'OVERDUE' || (daysUntilBill <= 0 && medicalBill.status !== 'PAID');

    // Prices
    const COST_INJECTION = 200;
    const COST_THERAPY = 500;

    const handlePayBill = () => {
        dispatch({ type: 'PAY_MEDICAL_BILL' });
    };

    const handleInjection = () => {
        if (cash >= COST_INJECTION) {
            dispatch({ type: 'PURCHASE_TREATMENT', payload: { type: 'STABILIZE', cost: COST_INJECTION } });
        }
    };

    const handleTherapy = () => {
        if (cash >= COST_THERAPY) {
            dispatch({ type: 'PURCHASE_TREATMENT', payload: { type: 'REDUCE_RISK', cost: COST_THERAPY } });
        }
    };

    return (
        <Modal
            isOpen={state.showMedical}
            onClose={() => dispatch({ type: 'TOGGLE_MEDICAL' })}
            title={<><Activity className="w-5 h-5 text-teal-500 animate-pulse" /> MEDICAL_TERMINAL_V4</>}
            size="lg"
            className="border-teal-900 bg-[#051a1a] shadow-[0_0_50px_rgba(20,184,166,0.1)]"
            noPadding
        >
            <div className="flex flex-col h-[600px] bg-[#020b0b] text-teal-500 font-mono relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#020b0b] pointer-events-none"></div>

                <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 overflow-y-auto">
                    
                    {/* LEFT COLUMN: PATIENT MONITOR */}
                    <div className="space-y-6">
                        
                        {/* Vitals Graph Placeholder */}
                        <div className="h-32 border border-teal-800 bg-[#051212] rounded relative overflow-hidden flex items-center justify-center shadow-inner">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/9/9e/ECG_Principle_slow.gif')] bg-cover bg-center mix-blend-screen"></div>
                            <div className="absolute top-2 right-2 text-xs font-bold text-teal-700 animate-pulse">LIVE FEED</div>
                            
                            <div className="z-10 text-center">
                                <div className="text-4xl font-black text-white tracking-widest">{Math.round(healthPercent)} <span className="text-sm text-teal-600">BPM</span></div>
                                <div className="text-[10px] text-teal-600 uppercase mt-1">Sinus Rhythm / Stable</div>
                            </div>
                        </div>

                        {/* Stats Detail */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-teal-950/20 border border-teal-900 p-4 rounded flex flex-col items-center">
                                <HeartPulse className="w-8 h-8 text-rose-500 mb-2" />
                                <div className="text-xs uppercase text-teal-600 font-bold mb-1">Health Integrity</div>
                                <div className={cn("text-2xl font-black", healthPercent < 30 ? "text-red-500 animate-pulse" : "text-teal-200")}>
                                    {Math.round(healthPercent)}%
                                </div>
                            </div>
                            <div className="bg-teal-950/20 border border-teal-900 p-4 rounded flex flex-col items-center">
                                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                                <div className="text-xs uppercase text-teal-600 font-bold mb-1">Complication Risk</div>
                                <div className={cn("text-2xl font-black", riskPercent > 20 ? "text-amber-500" : "text-teal-200")}>
                                    {Math.round(riskPercent)}%
                                </div>
                            </div>
                        </div>

                        {/* Status Log */}
                        <div className="border-t border-teal-900 pt-4 mt-2">
                            <div className="text-xs text-teal-700 mb-2 uppercase font-bold">[ SYSTEM LOG ]</div>
                            <div className="text-[10px] space-y-1 text-teal-600 opacity-80">
                                <div>{'>'} Vitals monitoring active...</div>
                                <div>{'>'} Connection stable. Latency 12ms.</div>
                                <div>{'>'} Care Level: {motherStatus.careLevel.toUpperCase()}</div>
                                {isBillOverdue && <div className="text-red-500 font-bold">{'>'} ALERT: PAYMENT OVERDUE. MEDICATION SUSPENDED.</div>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: ACTIONS */}
                    <div className="flex flex-col gap-6">
                        
                        {/* 1. BILL PAYMENT (Mandatory) */}
                        <div className={cn(
                            "p-5 rounded border-l-4 transition-all",
                            medicalBill.status === 'PAID' ? "bg-teal-950/30 border-teal-600" : "bg-red-950/10 border-red-600"
                        )}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" /> Weekly Coverage
                                    </h3>
                                    <p className="text-[10px] text-teal-600 mt-1">Maintains Basic Life Support. Prevents rapid decay.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-mono font-bold text-white">${medicalBill.amount}</div>
                                    <div className={cn("text-[9px] font-bold uppercase", medicalBill.status === 'PAID' ? "text-green-500" : (isBillOverdue ? "text-red-500" : "text-amber-500"))}>
                                        {medicalBill.status === 'PAID' ? "COVERAGE ACTIVE" : (isBillOverdue ? "OVERDUE" : `DUE IN ${daysUntilBill} DAYS`)}
                                    </div>
                                </div>
                            </div>

                            {medicalBill.status !== 'PAID' && (
                                <Button 
                                    onClick={handlePayBill}
                                    disabled={!canPayBill}
                                    className={cn("w-full h-10 text-xs tracking-widest", !canPayBill && "opacity-50 grayscale")}
                                    variant={isBillOverdue ? 'danger' : 'primary'}
                                >
                                    {canPayBill ? "AUTHORIZE PAYMENT" : "INSUFFICIENT FUNDS"}
                                </Button>
                            )}
                        </div>

                        {/* 2. EXTRA TREATMENTS (Optional) */}
                        <div className="flex-1 border border-teal-900 bg-black/40 rounded p-5 relative">
                            <div className="absolute top-0 left-0 bg-teal-900 text-black text-[9px] font-bold px-2 py-0.5 uppercase">
                                Out-of-Pocket Treatments
                            </div>

                            <div className="mt-4 space-y-4">
                                {/* Option A: Stabilizer */}
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-teal-900/20 rounded border border-teal-800 text-teal-400 group-hover:text-white transition-colors">
                                            <Syringe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-teal-300">Emergency Stabilizer</div>
                                            <div className="text-[10px] text-teal-700">Instant +5 HP Recovery</div>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleInjection}
                                        disabled={cash < COST_INJECTION || healthPercent >= 100}
                                        size="sm"
                                        className="w-24 border-teal-700 hover:bg-teal-900/50 text-teal-400"
                                        variant="outline"
                                    >
                                        ${COST_INJECTION}
                                    </Button>
                                </div>

                                <div className="h-px bg-teal-900/50 w-full"></div>

                                {/* Option B: Risk Therapy */}
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-teal-900/20 rounded border border-teal-800 text-teal-400 group-hover:text-white transition-colors">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-teal-300">Risk Mitigation Therapy</div>
                                            <div className="text-[10px] text-teal-700">Reduce Complication Risk (-3%)</div>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleTherapy}
                                        disabled={cash < COST_THERAPY || riskPercent <= 0}
                                        size="sm"
                                        className="w-24 border-teal-700 hover:bg-teal-900/50 text-teal-400"
                                        variant="outline"
                                    >
                                        ${COST_THERAPY}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="mt-6 text-[9px] text-teal-800 text-center italic">
                                * Additional treatments are not covered by insurance.
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Modal>
    );
};
