
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { cn } from '../lib/utils';

/**
 * MoralQuakeOverlay - "Moral Earthquake" visual effect.
 *
 * Triggered when the player's transaction rate crosses the HIGH (15%) or SHARK (20%)
 * threshold for the first time in a save file. Renders a dramatic full-screen tremor,
 * color shift, and monologue text overlay.
 *
 * HIGH tier: moderate shake + amber/dark tint
 * SHARK tier: intense shake + deep red tint
 *
 * Reads `moralQuakeTriggered` from game state and detects false->true transitions via useRef.
 */

type QuakePhase = 'shake' | 'text' | 'fadeout';

interface QuakeEffect {
    tier: 'HIGH' | 'SHARK';
    phase: QuakePhase;
}

// Fallback monologue text
// TODO: content agent should create moral_quake.csv with keys MORAL_QUAKE_HIGH, MORAL_QUAKE_SHARK
const QUAKE_TEXT: Record<string, string> = {
    MORAL_QUAKE_HIGH: '......这笔生意，利息有点高了。手在发抖。',
    MORAL_QUAKE_SHARK: '......我在做什么？这和放高利贷有什么区别？',
};

/**
 * Applies a CSS shake animation directly to document.documentElement
 * to create a true full-screen camera tremor effect.
 */
function applyScreenShake(intensity: 'light' | 'heavy'): () => void {
    const cls = intensity === 'heavy' ? 'moral-quake-heavy' : 'moral-quake-light';
    document.documentElement.classList.add(cls);
    const duration = intensity === 'heavy' ? 800 : 600;
    const timeoutId = setTimeout(() => {
        document.documentElement.classList.remove(cls);
    }, duration);
    return () => {
        clearTimeout(timeoutId);
        document.documentElement.classList.remove(cls);
    };
}

export const MoralQuakeOverlay: React.FC = () => {
    const { state } = useGame();
    const prevQuakeRef = useRef(state.moralQuakeTriggered);
    const [effect, setEffect] = useState<QuakeEffect | null>(null);

    const startQuake = useCallback((tier: 'HIGH' | 'SHARK') => {
        // Phase 1: Screen shake + color overlay
        setEffect({ tier, phase: 'shake' });
        const cleanupShake = applyScreenShake(tier === 'SHARK' ? 'heavy' : 'light');

        // Phase 2: Monologue text appears (after shake subsides)
        const textTimer = setTimeout(() => {
            setEffect(prev => prev ? { ...prev, phase: 'text' } : null);
        }, 900);

        // Phase 3: Fade out everything
        const fadeTimer = setTimeout(() => {
            setEffect(prev => prev ? { ...prev, phase: 'fadeout' } : null);
        }, 4000);

        // Phase 4: Remove completely
        const removeTimer = setTimeout(() => {
            setEffect(null);
        }, 5500);

        return () => {
            cleanupShake();
            clearTimeout(textTimer);
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    useEffect(() => {
        const prev = prevQuakeRef.current;
        const curr = state.moralQuakeTriggered;

        if (!prev || !curr) {
            prevQuakeRef.current = curr;
            return;
        }

        // Detect false -> true transitions (SHARK takes priority)
        let triggered: 'HIGH' | 'SHARK' | null = null;
        if (!prev.SHARK && curr.SHARK) {
            triggered = 'SHARK';
        } else if (!prev.HIGH && curr.HIGH) {
            triggered = 'HIGH';
        }

        prevQuakeRef.current = curr;

        if (!triggered) return;

        return startQuake(triggered);
    }, [state.moralQuakeTriggered, startQuake]);

    if (!effect) return null;

    const isSHARK = effect.tier === 'SHARK';
    const textKey = isSHARK ? 'MORAL_QUAKE_SHARK' : 'MORAL_QUAKE_HIGH';
    const monologue = QUAKE_TEXT[textKey] ?? '';
    const isFading = effect.phase === 'fadeout';

    return (
        <>
            {/* Full-screen color shift overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[150] pointer-events-none transition-opacity",
                    isFading ? 'duration-[1500ms] opacity-0' : 'duration-300 opacity-100'
                )}
                style={{
                    background: isSHARK
                        ? 'radial-gradient(ellipse at center, rgba(127,29,29,0.4) 0%, rgba(0,0,0,0.55) 100%)'
                        : 'radial-gradient(ellipse at center, rgba(120,53,15,0.3) 0%, rgba(0,0,0,0.4) 100%)',
                }}
            />

            {/* Vignette - heavy edge darkening for dramatic framing */}
            <div
                className={cn(
                    "fixed inset-0 z-[151] pointer-events-none transition-opacity",
                    isFading ? 'duration-[1500ms] opacity-0' : 'duration-500 opacity-100'
                )}
                style={{
                    boxShadow: isSHARK
                        ? 'inset 0 0 150px 60px rgba(0,0,0,0.7)'
                        : 'inset 0 0 120px 40px rgba(0,0,0,0.5)',
                }}
            />

            {/* Monologue text - appears after shake subsides */}
            {(effect.phase === 'text' || effect.phase === 'fadeout') && (
                <div
                    className={cn(
                        "fixed inset-0 z-[152] flex items-center justify-center pointer-events-none transition-opacity",
                        isFading ? 'duration-1000 opacity-0' : 'duration-1000 opacity-100'
                    )}
                >
                    <div className="max-w-lg px-8">
                        <p className={cn(
                            "font-serif italic text-center leading-loose tracking-wide",
                            isSHARK ? 'text-red-200/90 text-xl' : 'text-amber-200/80 text-lg',
                            "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                        )}>
                            {monologue}
                        </p>
                        <div className={cn(
                            "mt-4 text-center text-[10px] font-mono uppercase tracking-[0.3em]",
                            isSHARK ? 'text-red-500/50' : 'text-amber-500/40'
                        )}>
                            {isSHARK ? '道德地震' : '心灵震颤'}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
