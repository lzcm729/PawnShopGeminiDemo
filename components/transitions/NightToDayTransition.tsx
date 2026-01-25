
import React, { useEffect } from 'react';
import { playSfx } from '../../systems/game/audio';
import { Sun } from 'lucide-react';

export const NightToDayTransition: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    useEffect(() => {
        // playSfx('ALARM'); // Optional
        const timer = setTimeout(onComplete, 2500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-[fadeOut_1s_ease-in_1.5s_forwards] pointer-events-none">
            
            {/* Light Source */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 to-black animate-[pulse_3s_ease-in-out]"></div>

            <div className="relative z-10 flex flex-col items-center animate-[slideUp_1s_ease-out]">
                <Sun className="w-16 h-16 text-orange-500 mb-4 animate-spin-slow opacity-80" />
                <h2 className="text-2xl font-serif text-orange-100/80 tracking-widest uppercase">
                    Morning Arrives
                </h2>
                <div className="w-12 h-0.5 bg-orange-500/50 mt-4"></div>
            </div>

        </div>
    );
};
