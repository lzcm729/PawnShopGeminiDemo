
import React, { useState } from 'react';
import { useGame } from '../../../store/GameContext';
import { DollarSign, Calendar, Heart, Briefcase, Skull, Package, Mail, Volume2, VolumeX, Activity, HeartPulse, Syringe, CheckCircle2 } from 'lucide-react';
import { ReputationType } from '../../core/types';
import { Button } from '../../../components/ui/Button';
import { StatDisplay } from '../../../components/ui/StatDisplay';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ValidationModal } from '../../../components/ValidationModal';
import { validateEvents, ValidationIssue } from '../../narrative/validator';
import { toggleMute, getMuteState, playSfx, startAmbience, stopAmbience } from '../../game/audio';
import { cn } from '../../../lib/utils';

export const Dashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const { stats, reputation, inventory, inbox } = state;

    const activeItems = inventory.filter(i => i.status !== 'SOLD').length;
    const unreadMailCount = inbox.filter(m => !m.isRead).length;

    // Medical Bill Logic
    const bill = stats.medicalBill;
    const daysUntilBill = bill.dueDate - stats.day;
    const isBillCritical = daysUntilBill <= 2 && bill.status !== 'PAID';
    const canPayBill = stats.cash >= bill.amount && bill.status !== 'PAID';

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

    const handlePayBill = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canPayBill) {
            dispatch({ type: 'PAY_MEDICAL_BILL' });
        }
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

    return (
    <div className="w-full bg-noir-200 border-b border-noir-300 p-3 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-xl">
        <ValidationModal 
            isOpen={showValidation} 
            onClose={() => setShowValidation(false)} 
            logs={validationLogs} 
            issues={validationIssues}
        />

        {/* LEFT: SURVIVAL (Medical Bill) */}
        <div className="flex items-center gap-4 w-1/3">
            <div 
                className={cn(
                    "flex-1 relative overflow-hidden rounded border p-2 flex items-center justify-between transition-all group cursor-pointer",
                    isBillCritical ? "bg-red-950/30 border-red-500 animate-pulse" : "bg-noir-200 border-noir-400"
                )}
                onClick={toggleFinancials}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full border", isBillCritical ? "bg-red-900 text-red-100 border-red-500" : "bg-noir-300 border-noir-500 text-red-500")}>
                        <Activity className={cn("w-5 h-5", isBillCritical && "animate-[ping_1s_ease-in-out_infinite]")} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold text-noir-txt-muted tracking-wider">Life Support</div>
                        <div className={cn("text-sm font-mono font-bold flex items-center gap-2", isBillCritical ? "text-red-500" : "text-noir-txt-primary")}>
                            {bill.status === 'PAID' ? (
                                <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> STABLE</span>
                            ) : (
                                <span>-${bill.amount} (T-{daysUntilBill})</span>
                            )}
                        </div>
                    </div>
                </div>

                {bill.status !== 'PAID' && (
                    <Button 
                        size="sm" 
                        variant={isBillCritical ? "danger" : "secondary"} 
                        className="h-8 text-[10px] px-2"
                        disabled={!canPayBill}
                        onClick={handlePayBill}
                    >
                        PAY BILL
                    </Button>
                )}
            </div>
        </div>

        {/* CENTER: GOAL (Surgery Fund) */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full">
            <div className="flex justify-between w-full text-[10px] uppercase font-bold tracking-widest text-noir-txt-muted mb-1">
                <span>Surgery Fund</span>
                <span className={canPaySurgery ? "text-green-500 animate-pulse" : ""}>
                    ${stats.cash.toLocaleString()} / ${stats.targetSavings.toLocaleString()}
                </span>
            </div>
            
            <div className="w-full h-3 bg-noir-300 rounded-full overflow-hidden border border-noir-400 relative">
                {/* Progress Bar */}
                <div 
                    className={cn("h-full transition-all duration-1000 relative", canPaySurgery ? "bg-green-500" : "bg-gradient-to-r from-blue-900 to-blue-500")} 
                    style={{ width: `${goalProgress}%` }}
                >
                    {canPaySurgery && <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>}
                </div>
                
                {/* Ticks */}
                <div className="absolute inset-0 flex justify-between px-1">
                    {[1,2,3,4].map(i => <div key={i} className="w-px h-full bg-black/20"></div>)}
                </div>
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

        {/* RIGHT: TOOLS & REP */}
        <div className="flex items-center gap-4 w-1/3 justify-end">
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
                    onClick={() => dispatch({type: 'TOGGLE_MAIL'})}
                    className={unreadMailCount > 0 ? "border-green-600 text-green-500" : ""}
                    leftIcon={<Mail className={unreadMailCount > 0 ? "animate-bounce" : ""} size={14} />}
                >
                    MAIL {unreadMailCount > 0 && `(${unreadMailCount})`}
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
