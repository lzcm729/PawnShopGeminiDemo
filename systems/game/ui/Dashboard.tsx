
import React, { useState, useEffect } from 'react';
import { useGame } from '../../../store/GameContext';
import { DollarSign, Calendar, Heart, Briefcase, Skull, Package, AlertOctagon, Mail, Volume2, VolumeX } from 'lucide-react';
import { ReputationType } from '../../core/types';
import { Button } from '../../../components/ui/Button';
import { ValidationModal } from '../../../components/ValidationModal';
import { validateEvents, ValidationIssue } from '../../narrative/validator';
import { EMMA_EVENTS } from '../../narrative/storyRegistry';
import { toggleMute, getMuteState, playSfx } from '../../game/audio';

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
        if (!newState) playSfx('CLICK');
    };

    return (
    <div className="w-full bg-pawn-panel border-b border-white/10 p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-lg">
        <ValidationModal 
            isOpen={showValidation} 
            onClose={() => setShowValidation(false)} 
            logs={validationLogs} 
            issues={validationIssues}
        />

        <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-pawn-accent">
            <Calendar className="w-5 h-5" />
            <span className="font-mono text-xl font-bold">DAY {stats.day}</span>
        </div>
        
        <div className="flex items-center gap-2 text-pawn-green bg-green-950/30 px-3 py-1 rounded border border-green-900/50">
            <DollarSign className="w-5 h-5" />
            <span className="font-mono text-xl font-bold tracking-widest">${stats.cash}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded border ${daysUntilRent <= 2 ? 'bg-red-950/30 text-red-500 border-red-900 animate-pulse' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
            <AlertOctagon className="w-4 h-4" />
            <span className="font-mono text-sm font-bold">
                房租: {daysUntilRent}天后 (${stats.rentDue})
            </span>
        </div>
        </div>

        <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex flex-col items-center group relative cursor-help">
            <Heart className="w-4 h-4 text-rose-500 mb-1" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${reputation[ReputationType.HUMANITY]}%` }}></div>
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-stone-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                <p className="font-bold text-rose-500">人情 (Humanity): {reputation[ReputationType.HUMANITY]}</p>
            </div>
            </div>

            <div className="flex flex-col items-center group relative cursor-help">
            <Briefcase className="w-4 h-4 text-blue-400 mb-1" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400" style={{ width: `${reputation[ReputationType.CREDIBILITY]}%` }}></div>
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-stone-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                <p className="font-bold text-blue-400">信誉 (Credibility): {reputation[ReputationType.CREDIBILITY]}</p>
            </div>
            </div>

            <div className="flex flex-col items-center group relative cursor-help">
            <Skull className="w-4 h-4 text-purple-500 mb-1" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${reputation[ReputationType.UNDERWORLD]}%` }}></div>
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-stone-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                <p className="font-bold text-purple-500">地下 (Underworld): {reputation[ReputationType.UNDERWORLD]}</p>
            </div>
            </div>
        </div>

        <div className="h-8 w-px bg-stone-700 mx-2"></div>

        <button 
            onClick={handleMuteToggle}
            className="text-stone-500 hover:text-white transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
        >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <Button 
            variant="secondary" 
            onClick={() => dispatch({type: 'TOGGLE_MAIL'})}
            className={`flex items-center gap-2 px-3 py-1 relative transition-colors ${unreadMailCount > 0 ? 'border-green-600 text-green-500 bg-green-900/10' : ''}`}
        >
            <Mail className={`w-4 h-4 ${unreadMailCount > 0 ? 'animate-bounce' : ''}`} />
            {unreadMailCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#1c1917] shadow-sm">
                    {unreadMailCount}
                </span>
            )}
        </Button>

        <Button 
            variant="secondary" 
            onClick={() => dispatch({type: 'TOGGLE_INVENTORY'})}
            className="flex items-center gap-2 px-3 py-1"
        >
            <Package className="w-4 h-4" />
            <span>背包 ({activeItems})</span>
        </Button>
        </div>
    </div>
    );
};
