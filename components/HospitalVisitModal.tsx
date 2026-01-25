
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Activity, Heart, Stethoscope, User, LogOut, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { TypewriterText } from './ui/TextEffects';
import { playSfx } from '../systems/game/audio';

export const HospitalVisitModal: React.FC = () => {
    const { state, dispatch } = useGame();
    const { motherStatus, visitedToday } = state.stats;
    const [view, setView] = useState<'MAIN' | 'TALK' | 'DOCTOR'>('MAIN');
    const [actionTaken, setActionTaken] = useState(false);

    if (!state.showVisit) return null;

    const handleComfort = () => {
        playSfx('SUCCESS');
        dispatch({ type: 'VISIT_MOTHER' });
        setActionTaken(true);
        setView('MAIN');
    };

    const handleClose = () => {
        // If they close without doing anything, it doesn't count as "Visited" in terms of mechanics, 
        // but the modal closes.
        // Actually, the reducer only buffs stats if !visitedToday.
        // So we can just close.
        dispatch({ type: 'TOGGLE_VISIT' });
        setView('MAIN');
        setActionTaken(false);
    };

    const getMotherDialogue = () => {
        if (motherStatus.health < 30) return "... (沉重的呼吸声) ...";
        if (motherStatus.health < 60) return "别担心我... 店里还好吗？";
        return "我今天感觉好多了。记得按时吃饭。";
    };

    const getDoctorReport = () => {
        if (motherStatus.risk > 30) return "情况不太乐观。今晚可能会有并发症，你要做好心理准备。";
        if (motherStatus.risk > 15) return "各项指标还算平稳，但不能掉以轻心。";
        return "目前状况稳定。继续保持这种治疗方案。";
    };

    return (
        <Modal
            isOpen={state.showVisit}
            onClose={handleClose}
            title={<><Activity className="w-5 h-5 text-blue-400 animate-pulse" /> ICU - WARD 304</>}
            size="lg"
            className="border-blue-900 bg-[#080b14] shadow-[0_0_50px_rgba(59,130,246,0.15)]"
            noPadding
        >
            <div className="flex flex-col h-[500px] bg-[#050508] text-blue-200 relative overflow-hidden font-mono">
                
                {/* Background: Sterile & Cold */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent_70%)] pointer-events-none"></div>
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>

                {/* Content Container */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center relative z-10">
                    
                    {/* Visual: Bed / Monitor */}
                    <div className="w-full max-w-md mb-8 flex justify-center">
                        <div className="w-64 h-40 border border-blue-900/50 rounded-lg bg-black/40 relative flex items-center justify-center overflow-hidden">
                            {/* EKG Line Animation */}
                            <div className="absolute inset-0 flex items-center">
                                <svg viewBox="0 0 500 100" className="w-full h-20 stroke-blue-500 fill-none stroke-2 opacity-80">
                                    <path d="M0,50 L50,50 L60,20 L70,80 L80,50 L150,50 L160,20 L170,80 L180,50 L250,50 L260,20 L270,80 L280,50 L350,50 L360,20 L370,80 L380,50 L500,50" className="animate-[dash_2s_linear_infinite]" strokeDasharray="500" strokeDashoffset="500" />
                                </svg>
                            </div>
                            <div className="absolute top-2 right-2 text-[10px] text-blue-400 animate-pulse">LIVE MONITORING</div>
                            <div className="absolute bottom-2 left-2 text-2xl font-bold text-white tracking-widest">{Math.round(motherStatus.health)} BPM</div>
                        </div>
                    </div>

                    {/* Dialogue / Interaction Area */}
                    <div className="w-full max-w-2xl bg-blue-950/10 border border-blue-900/30 p-6 rounded-lg min-h-[120px] flex items-center justify-center text-center shadow-inner">
                        {view === 'MAIN' && (
                            <p className="text-lg italic text-blue-100 font-serif">
                                {visitedToday || actionTaken 
                                    ? "她在熟睡。监护仪发出有节奏的滴答声。" 
                                    : "她醒着，正望着天花板发呆。"}
                            </p>
                        )}
                        {view === 'TALK' && (
                            <p className="text-lg text-white font-serif">
                                "{getMotherDialogue()}"
                            </p>
                        )}
                        {view === 'DOCTOR' && (
                            <div className="text-left w-full">
                                <div className="text-xs uppercase text-blue-500 font-bold mb-2 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4"/> Doctor's Note
                                </div>
                                <p className="text-sm text-blue-200 leading-relaxed">
                                    <TypewriterText text={getDoctorReport()} speed={30} />
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-2xl">
                        <Button 
                            onClick={() => { setView('TALK'); playSfx('CLICK'); }}
                            variant="secondary"
                            className="border-blue-800 text-blue-300 hover:bg-blue-900/30"
                            disabled={visitedToday || actionTaken}
                        >
                            <MessageCircle className="w-4 h-4 mr-2" /> 说 话 (Talk)
                        </Button>

                        <Button 
                            onClick={handleComfort}
                            variant="primary"
                            className={cn(
                                "bg-blue-700 hover:bg-blue-600 border-transparent shadow-[0_0_15px_rgba(29,78,216,0.3)]",
                                (visitedToday || actionTaken) && "opacity-50 cursor-not-allowed bg-blue-900 text-blue-400 grayscale"
                            )}
                            disabled={visitedToday || actionTaken}
                        >
                            <Heart className="w-4 h-4 mr-2" /> 
                            {visitedToday || actionTaken ? "已探望 (Visited)" : "陪 伴 (Comfort)"}
                        </Button>

                        <Button 
                            onClick={() => { setView('DOCTOR'); playSfx('CLICK'); }}
                            variant="secondary"
                            className="border-blue-800 text-blue-300 hover:bg-blue-900/30"
                        >
                            <Stethoscope className="w-4 h-4 mr-2" /> 询问医生 (Consult)
                        </Button>
                    </div>

                    {/* Exit */}
                    <button 
                        onClick={handleClose}
                        className="mt-6 text-xs text-blue-600 hover:text-blue-400 flex items-center gap-1 uppercase tracking-widest transition-colors"
                    >
                        <LogOut className="w-3 h-3" /> Return to Shop
                    </button>

                </div>
            </div>
            <style>{`
                @keyframes dash {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </Modal>
    );
};
