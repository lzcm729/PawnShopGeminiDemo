
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { DollarSign, Calendar, Heart, Briefcase, Skull, Package, AlertOctagon, Mail, PlayCircle, Bug } from 'lucide-react';
import { ReputationType } from '../types';
import { Button } from './ui/Button';
import { validateEvents, ValidationIssue } from '../services/eventValidator';
import { EMMA_EVENTS } from '../services/storyData';
import { ValidationModal } from './ValidationModal';

export const Dashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const { stats, reputation, inventory, inbox } = state;

    const activeItems = inventory.filter(i => i.status !== 'SOLD').length;
    const daysUntilRent = stats.rentDueDate - stats.day;
    
    const unreadMailCount = inbox.filter(m => !m.isRead).length;

    // --- Validation Logic ---
    const [showValidation, setShowValidation] = useState(false);
    const [validationLogs, setValidationLogs] = useState<string[]>([]);
    const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

    // Kept for backward compatibility if we want a quick validate button
    const handleValidate = () => {
        const result = validateEvents([...EMMA_EVENTS]);
        setValidationLogs(result.logs);
        setValidationIssues(result.issues);
        setShowValidation(true);
    };

    const isDev = process.env.NODE_ENV === 'development';

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
        
        {/* Cash Display */}
        <div className="flex items-center gap-2 text-pawn-green bg-green-950/30 px-3 py-1 rounded border border-green-900/50">
            <DollarSign className="w-5 h-5" />
            <span className="font-mono text-xl font-bold tracking-widest">${stats.cash}</span>
        </div>

        {/* Rent Countdown */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded border ${daysUntilRent <= 2 ? 'bg-red-950/30 text-red-500 border-red-900 animate-pulse' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
            <AlertOctagon className="w-4 h-4" />
            <span className="font-mono text-sm font-bold">
                房租: {daysUntilRent}天后 (${stats.rentDue})
            </span>
        </div>
        </div>

        <div className="flex items-center gap-6">
        {/* Reputation Meters */}
        <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex flex-col items-center group relative cursor-help">
            <Heart className="w-4 h-4 text-rose-500 mb-1" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${reputation[ReputationType.HUMANITY]}%` }}></div>
            </div>
            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-stone-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                <p className="font-bold text-rose-500">人情 (Humanity): {reputation[ReputationType.HUMANITY]}</p>
                <p className="text-[10px] text-stone-400">影响情感类事件触发</p>
            </div>
            </div>

            <div className="flex flex-col items-center group relative cursor-help">
            <Briefcase className="w-4 h-4 text-blue-400 mb-1" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400" style={{ width: `${reputation[ReputationType.CREDIBILITY]}%` }}></div>
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-stone-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                <p className="font-bold text-blue-400">信誉 (Credibility): {reputation[ReputationType.CREDIBILITY]}</p>
                <p className="text-[10px] text-stone-400">影响高价值客户出现率</p>
            </div>
            </div>

            <div className="flex flex-col items-center group relative cursor-help">
            <Skull className="w-4 h-4 text-purple-500 mb-1" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${reputation[ReputationType.UNDERWORLD]}%` }}></div>
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-stone-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                <p className="font-bold text-purple-500">地下 (Underworld): {reputation[ReputationType.UNDERWORLD]}</p>
                <p className="text-[10px] text-stone-400">影响赃物/高风险交易</p>
            </div>
            </div>
        </div>

        <div className="h-8 w-px bg-stone-700 mx-2"></div>

            {/* Dev Tools Toggle */}
            <button
                onClick={() => dispatch({ type: 'TOGGLE_DEBUG' })}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all ${state.showDebug ? 'bg-green-900/40 text-green-400' : 'text-stone-600 hover:text-green-500'}`}
                title="Toggle Debug Terminal"
            >
                <Bug className="w-4 h-4" />
            </button>

        {/* Mail Button (HUD Trigger) */}
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

        {/* Inventory Button */}
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
