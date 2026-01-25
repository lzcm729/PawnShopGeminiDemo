
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { playSfx } from '../../systems/game/audio';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

interface DecryptionTextProps {
    text: string;
    className?: string;
    speed?: number; // ms per char shuffle
    revealSpeed?: number; // ms per char reveal
    preserve?: boolean; // if true, won't re-animate on text change if length matches (optional)
}

export const DecryptionText: React.FC<DecryptionTextProps> = ({ text, className, speed = 30, revealSpeed = 50 }) => {
    const [display, setDisplay] = useState(text);
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Reset
        setRevealedIndices(new Set());
        let currentRevealed = 0;
        const length = text.length;

        // Scramble Timer
        intervalRef.current = setInterval(() => {
            setDisplay(prev => {
                let result = '';
                for (let i = 0; i < length; i++) {
                    if (revealedIndices.has(i) || text[i] === ' ' || text[i] === '\n') {
                        result += text[i];
                    } else {
                        result += CHARS[Math.floor(Math.random() * CHARS.length)];
                    }
                }
                return result;
            });
        }, speed);

        // Reveal Timer
        revealIntervalRef.current = setInterval(() => {
            if (currentRevealed >= length) {
                if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
                if (intervalRef.current) clearInterval(intervalRef.current);
                setDisplay(text); // Ensure final state
            } else {
                setRevealedIndices(prev => {
                    const next = new Set(prev);
                    next.add(currentRevealed);
                    return next;
                });
                
                // Play sound occasionally to avoid spamming
                if (currentRevealed % 2 === 0) {
                    playSfx('GLITCH');
                }
                
                currentRevealed++;
            }
        }, revealSpeed);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        };
    }, [text, speed, revealSpeed]);

    return <span className={className}>{display}</span>;
};

interface TypewriterTextProps {
    text: string;
    speed?: number;
    className?: string;
    onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 20, className, onComplete }) => {
    const [display, setDisplay] = useState('');
    
    useEffect(() => {
        setDisplay('');
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplay(prev => prev + text.charAt(i));
                // Play sound for non-whitespace characters
                if (text.charAt(i).trim() !== '') {
                    playSfx('TYPE');
                }
                i++;
            } else {
                clearInterval(timer);
                if (onComplete) onComplete();
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <span className={cn("whitespace-pre-line", className)}>
            {display}
            <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1 align-middle"></span>
        </span>
    );
};
