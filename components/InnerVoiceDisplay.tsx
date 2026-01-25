
import React, { useState, useEffect } from 'react';
import { TypewriterText } from './ui/TextEffects';
import { ArrowRight, Moon } from 'lucide-react';
import { playSfx } from '../systems/game/audio';

interface InnerVoiceDisplayProps {
    text: string;
    onComplete: () => void;
}

export const InnerVoiceDisplay: React.FC<InnerVoiceDisplayProps> = ({ text, onComplete }) => {
    const [canProceed, setCanProceed] = useState(false);

    // Auto-enable proceed after a short delay to prevent accidental double-clicks
    useEffect(() => {
        const timer = setTimeout(() => setCanProceed(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        if (canProceed) {
            playSfx('CLICK');
            onComplete();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 cursor-pointer animate-in fade-in duration-1000"
            onClick={handleClick}
        >
            <div className="max-w-2xl w-full">
                <div className="mb-8 flex justify-center opacity-50">
                    <Moon className="w-8 h-8 text-stone-600 animate-pulse-slow" />
                </div>

                <div className="text-xl md:text-2xl font-serif text-stone-400 italic leading-loose text-center min-h-[120px]">
                    " <TypewriterText text={text} speed={30} onComplete={() => setCanProceed(true)} /> "
                </div>

                <div className={`mt-12 flex justify-center transition-opacity duration-1000 ${canProceed ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-stone-600 animate-bounce">
                        Click to Sleep <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </div>
    );
};
