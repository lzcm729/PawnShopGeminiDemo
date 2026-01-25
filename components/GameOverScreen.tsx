
import React from 'react';
import { Button } from './ui/Button';
import { RotateCcw, AlertTriangle, Skull, Calendar, DollarSign } from 'lucide-react';
import { useGame } from '../store/GameContext';

interface GameOverScreenProps {
    reason: string;
    onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ reason, onRestart }) => {
    const { state } = useGame();
    
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#1a0505] text-red-50 relative overflow-hidden font-mono">
            {/* Gritty Background */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-red-950/50 pointer-events-none"></div>
            
            {/* Central Notice */}
            <div className="relative z-10 max-w-2xl w-full text-center p-8 animate-in zoom-in duration-500">
                
                <div className="mb-8 relative inline-block">
                    <div className="absolute -inset-4 bg-red-600/20 blur-xl rounded-full animate-pulse"></div>
                    <Skull className="w-32 h-32 text-red-600 mx-auto" />
                </div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-red-600 uppercase mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    LIQUIDATED
                </h1>
                
                <div className="h-px w-32 bg-red-800 mx-auto mb-8"></div>

                <div className="bg-black/40 border border-red-900/50 p-8 rounded-lg backdrop-blur-sm mb-10 shadow-2xl">
                    <h3 className="text-red-400 font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Termination Cause
                    </h3>
                    <p className="text-xl text-stone-300 font-serif italic leading-relaxed">
                        "{reason}"
                    </p>
                </div>

                {/* Final Audit */}
                <div className="grid grid-cols-3 gap-4 mb-12 text-sm">
                    <div className="flex flex-col items-center p-4 bg-red-950/20 rounded border border-red-900/30">
                        <Calendar className="w-6 h-6 text-red-500 mb-2" />
                        <span className="text-red-400 uppercase font-bold text-[10px] tracking-widest">Duration</span>
                        <span className="text-2xl font-mono text-white">{state.stats.day} Days</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-red-950/20 rounded border border-red-900/30">
                        <DollarSign className="w-6 h-6 text-red-500 mb-2" />
                        <span className="text-red-400 uppercase font-bold text-[10px] tracking-widest">Final Net Worth</span>
                        <span className="text-2xl font-mono text-white">${state.stats.cash}</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-red-950/20 rounded border border-red-900/30">
                        <Skull className="w-6 h-6 text-red-500 mb-2" />
                        <span className="text-red-400 uppercase font-bold text-[10px] tracking-widest">Status</span>
                        <span className="text-2xl font-mono text-white">Deceased</span>
                    </div>
                </div>

                <Button 
                    onClick={onRestart}
                    className="w-full max-w-sm h-16 text-xl tracking-widest bg-red-700 hover:bg-red-600 text-white border-2 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                >
                    <RotateCcw className="w-6 h-6 mr-3" /> NEW IDENTITY
                </Button>
                
                <p className="mt-6 text-[10px] text-red-900/60 uppercase tracking-[0.2em]">
                    System Reset Required // Memory Wipe Initiated
                </p>
            </div>
        </div>
    );
};
