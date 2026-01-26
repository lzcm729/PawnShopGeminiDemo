
import React, { useState } from 'react';
import { useGame } from '../../../store/GameContext';
import { DollarSign, Calendar, Heart, Briefcase, Skull, Package, Volume2, VolumeX, Activity, HeartPulse, Syringe, CheckCircle2, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { ReputationType, GamePhase } from '../../core/types';
import { Button } from '../../../components/ui/Button';
import { StatDisplay } from '../../../components/ui/StatDisplay';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ValidationModal } from '../../../components/ValidationModal';
import { validateEvents, ValidationIssue } from '../../narrative/validator';
import { toggleMute, getMuteState, playSfx, startAmbience, stopAmbience } from '../../game/audio';
import { cn } from '../../../lib/utils';
import { REPUTATION_MILESTONES } from '../../reputation/milestones';
import { MilestoneNotification } from '../../../components/ui/MilestoneNotification';
import * as Icons from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const { stats, reputation, inventory, inbox, phase, activeMilestones } = state;

    // If we are in Night phase, we hide the top dashboard because NightDashboard takes over full screen
    if (phase === GamePhase.NIGHT) return null;

    const activeItems = inventory.filter(i => i.status !== 'SOLD').length;
    // unreadMailCount unused here now, but variable derivation is fine to keep or remove. 
    // Keeping logic simple, removing unused var if possible or just ignoring.
    
    // Mother Status Logic
    const { motherStatus, medicalBill } = stats;
    const isCritical = motherStatus.status === 'Critical' || motherStatus.status === 'Worsening';
    
    // Pulse Speed based on Risk
    const pulseSpeed = motherStatus.risk > 50 ? '0.5s' : (motherStatus.risk > 20 ? '1s' : '2s');

    // Bill Countdown Logic
    const daysUntilBill = medicalBill.dueDate - stats.day;
    const isBillUrgent = medicalBill.status === 'OVERDUE' || (daysUntilBill <= 1 && medicalBill.status !== 'PAID');
    
    let billStatusText = '';
    if (medicalBill.status === 'PAID') {
        billStatusText = '已支付';
    } else if (medicalBill.status === 'OVERDUE') {
        billStatusText = '已逾期';
    } else {
        if (daysUntilBill > 1) billStatusText = `${daysUntilBill}天后`;
        else if (daysUntilBill === 1) billStatusText = '明天';
        else billStatusText = '今晚';
    }
    
    const billStatusColor = isBillUrgent 
        ? "text-red-500 animate-pulse" 
        : (medicalBill.status === 'PAID' ? "text-green-500" : "text-amber-500");

    // Goal Logic
    const goalProgress = Math.min(100, (stats.cash / stats.targetSavings) * 100);
    const canPaySurgery = stats.cash >= stats.targetSavings;

    const [showValidation, setShowValidation] = useState(false);
    const [validationLogs, setValidationLogs] = useState<string[]>([]);
    const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
    const [isMuted, setIsMuted] = useState(getMuteState());

    const handleMuteToggle = () => {
        const newState = toggleMute();
        setIsMuted(newState);
        if (!newState) {
            playSfx('CLICK');
            startAmbience();
        } else {
            stopAmbience();
        }
    };

    const toggleFinancials = () => {
        playSfx('CLICK');
        dispatch({ type: 'TOGGLE_FINANCIALS' });
    };

    const handleSurgery = () => {
        dispatch({ type: 'PAY_SURGERY' });
    };

    // Helper for Rep Tooltip
    const RepTooltip = ({ label, value }: { label: string, value: number }) => (
        <div className="text-xs">
            <span className="font-bold">{label}:</span> {value}%
        </div>
    );

    const isBusiness = phase === GamePhase.BUSINESS || phase === GamePhase.NEGOTIATION;

    // Helper to get Icon Component dynamically
    const getIcon = (name: string) => {
        const IconComp = (Icons as any)[name];
        return IconComp ? <IconComp className="w-3 h-3" /> : <Info className="w-3 h-3" />;
    };

    return (
    <div className="w-full bg-noir-200 border-b border-noir-300 p-3 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-xl relative">
        <MilestoneNotification activeMilestones={activeMilestones} />
        
        <ValidationModal 
            isOpen={showValidation} 
            onClose={() => setShowValidation(false)} 
            logs={validationLogs} 
            issues={validationIssues}
        />

        {/* LEFT: LIFE MONITOR (Compact) */}
        <div className="flex items-center w-auto shrink-0 z-10">
            <div 
                className={cn(
                    "relative overflow-hidden rounded border p-1.5 pr-3 flex items-center gap-3 transition-all group",
                    isCritical ? "bg-red-950/30 border-red-500 animate-pulse" : "bg-noir-200 border-noir-400"
                )}
            >
                {/* Heartbeat Icon - Indicates Mother Status */}
                <div className={cn("p-1.5 rounded-full border relative shrink-0", isCritical ? "bg-red-900 text-red-100 border-red-500" : "bg-noir-300 border-noir-500 text-green-500")}>
                    <Activity className="w-4 h-4" style={{ animation: `pulse ${pulseSpeed} infinite` }} />
                </div>
                
                <div className="flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-noir-txt-muted tracking-wider leading-none mb-0.5">医药费 (BILL)</span>
                    <span className={cn("text-sm font-mono font-bold leading-none tracking-wide", billStatusColor)}>
                        {billStatusText}
                    </span>
                </div>
            </div>
        </div>

        {/* CENTER: CASH & GOAL */}
        <div className="flex flex-col items-center justify-center max-w-md w-full px-4 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-0">
            <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-mono font-bold text-white tracking-tight">${stats.cash.toLocaleString()}</span>
                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Available</span>
            </div>
            
            <div className="w-full h-2 bg-noir-300 rounded-full overflow-hidden border border-noir-400 relative group">
                <div 
                    className={cn("h-full transition-all duration-1000 relative", canPaySurgery ? "bg-green-500" : "bg-gradient-to-r from-blue-900 to-blue-500")} 
                    style={{ width: `${goalProgress}%` }}
                />
            </div>
            <div className="w-full flex justify-between mt-1 text-[9px] uppercase font-bold text-stone-600 tracking-wider">
                <span>Surgery Fund</span>
                <span>Target: ${stats.targetSavings.toLocaleString()}</span>
            </div>

            {canPaySurgery && (
                <Button 
                    onClick={handleSurgery}
                    className="absolute top-10 z-50 bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] border-2 border-green-400 animate-bounce"
                >
                    <Syringe className="w-4 h-4 mr-2" /> AUTHORIZE SURGERY
                </Button>
            )}
        </div>

        {/* RIGHT: REP & PERKS & TOOLS */}
        <div className="flex items-center gap-4 w-auto justify-end shrink-0 z-10">
            
            {/* Active Perks (Milestones) */}
            {activeMilestones.length > 0 && (
                <div className="flex items-center gap-1 bg-black/20 p-1 rounded border border-stone-800">
                    {activeMilestones.map(mid => {
                        const ms = REPUTATION_MILESTONES.find(m => m.id === mid);
                        if (!ms) return null;
                        return (
                            <Tooltip key={mid} content={
                                <div className="max-w-[150px]">
                                    <div className={cn("font-bold", ms.color)}>{ms.label}</div>
                                    <div className="text-stone-400">{ms.effectDescription}</div>
                                </div>
                            }>
                                <div className={cn("p-1.5 rounded-full border bg-stone-900", ms.color, "border-current opacity-80 hover:opacity-100")}>
                                    {getIcon(ms.icon)}
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            )}

            {/* Compact Reputation Bars */}
            <div className="flex items-center gap-3 bg-noir-100 p-2 rounded border border-noir-300 hidden xl:flex">
                <Tooltip content={<RepTooltip label="Humanity" value={reputation[ReputationType.HUMANITY]} />}>
                    <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3 text-noir-humanity" />
                        <div className="w-8 h-1.5 bg-noir-300 rounded-full overflow-hidden">
                            <div className="h-full bg-noir-humanity" style={{ width: `${reputation[ReputationType.HUMANITY]}%` }}></div>
                        </div>
                    </div>
                </Tooltip>

                <Tooltip content={<RepTooltip label="Credibility" value={reputation[ReputationType.CREDIBILITY]} />}>
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3 text-noir-credibility" />
                        <div className="w-8 h-1.5 bg-noir-300 rounded-full overflow-hidden">
                            <div className="h-full bg-noir-credibility" style={{ width: `${reputation[ReputationType.CREDIBILITY]}%` }}></div>
                        </div>
                    </div>
                </Tooltip>

                <Tooltip content={<RepTooltip label="Underworld" value={reputation[ReputationType.UNDERWORLD]} />}>
                    <div className="flex items-center gap-2">
                        <Skull className="w-3 h-3 text-noir-underworld" />
                        <div className="w-8 h-1.5 bg-noir-300 rounded-full overflow-hidden">
                            <div className="h-full bg-noir-underworld" style={{ width: `${reputation[ReputationType.UNDERWORLD]}%` }}></div>
                        </div>
                    </div>
                </Tooltip>
            </div>

            <div className="h-8 w-px bg-noir-400 mx-2 hidden xl:block"></div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleMuteToggle}
                    className="p-2 text-noir-txt-muted hover:text-noir-txt-primary hover:bg-noir-300 rounded transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={toggleFinancials}
                    leftIcon={<Calendar size={14} />}
                    title="Financial Calendar"
                >
                    CALENDAR
                </Button>

                <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => dispatch({type: 'TOGGLE_INVENTORY'})}
                    leftIcon={<Package size={14} />}
                >
                    VAULT ({activeItems})
                </Button>
            </div>
        </div>
    </div>
    );
};
