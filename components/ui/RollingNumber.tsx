
import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface RollingNumberProps {
    value: number;
    prefix?: string;
    className?: string;
    duration?: number; // Total animation time in ms
}

export const RollingNumber: React.FC<RollingNumberProps> = ({ value, prefix = '', className, duration = 500 }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const startValue = displayValue;
        const endValue = value;
        const range = endValue - startValue;

        if (range === 0) return;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Ease-out expo function for mechanical feel
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const current = Math.floor(startValue + (range * ease));
            setDisplayValue(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [value]);

    return (
        <span className={cn("tabular-nums tracking-wider", className)}>
            {prefix}{displayValue.toLocaleString()}
        </span>
    );
};
