
import React, { useState } from 'react';
import { useGame } from '../../../store/GameContext';
import { DollarSign, Calendar, Heart, Briefcase, Skull, Package, AlertOctagon, Mail, Volume2, VolumeX } from 'lucide-react';
import { ReputationType } from '../../core/types';
import { Button } from '../../../components/ui/Button';
import { StatDisplay } from '../../../components/ui/StatDisplay';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ValidationModal } from '../../../components/ValidationModal';
import { validateEvents, ValidationIssue } from '../../narrative/validator';
import { toggleMute, getMuteState, playSfx, startAmbience, stopAmbience } from '../../game/audio';

export const Dashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const { stats, reputation, inventory, inbox } = state;

    const activeItems = inventory.filter(i => i.status !== 'SOLD').length;
    const daysUntilRent = stats.rentDueDate - stats.day;
    const unreadMailCount = inbox.filter(m => !m.isRead).length;

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

        {/* Stats Group */}
        <div className="flex items-center gap-4">
            <StatDisplay 
                icon={<Calendar className="w-4 h-4" />}
                label="CYCLE"
                value={`DAY ${stats.day}`}
                variant="accent"
                onClick={toggleFinancials}
                tooltip="Open Financial Projection"
            />
            
            <StatDisplay 
                icon={<DollarSign className="w-4 h-4" />}
                label="LIQUIDITY"
                value={`$${stats.cash}`}
                variant="success"
            />

            <StatDisplay 
                icon={<AlertOctagon className="w-4 h-4" />}
                label={`RENT (D-${daysUntilRent})`}
                value={`$${stats.rentDue}`}
                variant={daysUntilRent <= 2 ? 'danger' : 'default'}
                className={daysUntilRent <= 2 ? 'animate-pulse' : ''}
            />
        </div>

        {/* Reputation & Tools Group */}
        <div className="flex items-center gap-6">
            
            {/* Compact Reputation Bars */}
            <div className="flex items-center gap-3 bg-noir-100 p-2 rounded border border-noir-300">
                <Tooltip content={<RepTooltip label="Humanity" value={reputation[ReputationType.HUMANITY]} />}>
                    <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3 text-noir-humanity" />
                        <div className="w-12 h-1.5 bg-noir-300 rounded-full overflow-hidden">
                            <div className="h-full bg-noir-humanity" style={{ width: `${reputation[ReputationType.HUMANITY]}%` }}></div>
                        </div>
                    </div>
                </Tooltip>

                <Tooltip content={<RepTooltip label="Credibility" value={reputation[ReputationType.CREDIBILITY]} />}>
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3 text-noir-credibility" />
                        <div className="w-12 h-1.5 bg-noir-300 rounded-full overflow-hidden">
                            <div className="h-full bg-noir-credibility" style={{ width: `${reputation[ReputationType.CREDIBILITY]}%` }}></div>
                        </div>
                    </div>
                </Tooltip>

                <Tooltip content={<RepTooltip label="Underworld" value={reputation[ReputationType.UNDERWORLD]} />}>
                    <div className="flex items-center gap-2">
                        <Skull className="w-3 h-3 text-noir-underworld" />
                        <div className="w-12 h-1.5 bg-noir-300 rounded-full overflow-hidden">
                            <div className="h-full bg-noir-underworld" style={{ width: `${reputation[ReputationType.UNDERWORLD]}%` }}></div>
                        </div>
                    </div>
                </Tooltip>
            </div>

            <div className="h-8 w-px bg-noir-400 mx-2 hidden md:block"></div>

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
