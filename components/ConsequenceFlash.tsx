
import React, { useState, useEffect } from 'react';
import { useCharacterAbility } from '../hooks/useCharacterAbility';
import { cn } from '../lib/utils';
import { Eye } from 'lucide-react';

/**
 * ConsequenceFlash - Displays a brief narrative flash after a deal is closed,
 * showing the player a glimpse of the consequences of their contract choice.
 *
 * Reads `lastConsequenceFlash` from useCharacterAbility hook.
 * When a flash is present and not suppressed, it fades in, holds for 4 seconds,
 * then fades out and clears the flash from state.
 */
export const ConsequenceFlash: React.FC = () => {
    const { lastConsequenceFlash, clearConsequenceFlash } = useCharacterAbility();
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (!lastConsequenceFlash || lastConsequenceFlash.suppressed) {
            setVisible(false);
            setFadeOut(false);
            return;
        }

        // Fade in
        setVisible(true);
        setFadeOut(false);

        // Hold for 4 seconds, then start fade out
        const holdTimer = setTimeout(() => {
            setFadeOut(true);
        }, 4000);

        // After fade out animation (1s), clear from state
        const clearTimer = setTimeout(() => {
            setVisible(false);
            setFadeOut(false);
            clearConsequenceFlash();
        }, 5000);

        return () => {
            clearTimeout(holdTimer);
            clearTimeout(clearTimer);
        };
    }, [lastConsequenceFlash, clearConsequenceFlash]);

    if (!visible || !lastConsequenceFlash || lastConsequenceFlash.suppressed) {
        return null;
    }

    const directionStyles = {
        POSITIVE: {
            border: 'border-amber-600/40',
            bg: 'bg-amber-950/30',
            text: 'text-amber-200/90',
            icon: 'text-amber-400',
            glow: 'shadow-[0_0_30px_rgba(217,119,6,0.15)]',
        },
        NEUTRAL: {
            border: 'border-stone-600/40',
            bg: 'bg-stone-900/40',
            text: 'text-stone-300/80',
            icon: 'text-stone-400',
            glow: '',
        },
        NEGATIVE: {
            border: 'border-red-900/40',
            bg: 'bg-red-950/30',
            text: 'text-red-200/80',
            icon: 'text-red-400',
            glow: 'shadow-[0_0_30px_rgba(185,28,28,0.15)]',
        },
    };

    const style = directionStyles[lastConsequenceFlash.direction];

    return (
        <div className={cn(
            "fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-full px-4",
            "transition-all duration-1000",
            fadeOut ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        )}>
            <div className={cn(
                "flex items-start gap-3 p-4 rounded border backdrop-blur-sm",
                style.border,
                style.bg,
                style.glow,
                "animate-in fade-in slide-in-from-top-4 duration-700"
            )}>
                <Eye className={cn("w-5 h-5 mt-0.5 flex-shrink-0", style.icon)} />
                <div>
                    <p className={cn("font-serif italic text-sm leading-relaxed", style.text)}>
                        {lastConsequenceFlash.narrativeText}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-stone-600 mt-2">
                        因果自见
                    </p>
                </div>
            </div>
        </div>
    );
};
