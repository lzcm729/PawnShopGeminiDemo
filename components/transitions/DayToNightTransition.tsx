
import React, { useEffect } from 'react';
import { playSfx } from '../../systems/game/audio';

export const DayToNightTransition: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    useEffect(() => {
        playSfx('SHUTTER');
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none flex flex-col">
            {/* The Shutter */}
            <div className="absolute inset-0 bg-[#0a0a0a] transform -translate-y-full animate-[shutterDown_1.5s_ease-out_forwards] flex flex-col justify-end border-b-8 border-stone-800">
                <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#1a1a1a_20px)] opacity-50"></div>
                <div className="p-4 flex justify-center pb-12">
                    <span className="text-4xl font-black text-stone-800 uppercase tracking-[0.5em] opacity-50">CLOSED</span>
                </div>
            </div>
            
            {/* Darkness Overlay */}
            <div className="absolute inset-0 bg-black/50 animate-[fadeIn_1s_ease-out_1s_forwards] opacity-0"></div>
        </div>
    );
};
