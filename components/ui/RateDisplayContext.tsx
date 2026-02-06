
import React, { createContext, useContext, useState, useCallback } from 'react';

type RateUnit = 'weekly' | 'daily';

interface RateDisplayContextValue {
    unit: RateUnit;
    toggleUnit: () => void;
    formatRate: (weeklyRate: number) => string;
    unitLabel: string;
}

const RateDisplayContext = createContext<RateDisplayContextValue>({
    unit: 'weekly',
    toggleUnit: () => {},
    formatRate: (r) => `${(r * 100).toFixed(0)}%`,
    unitLabel: '/周',
});

export const useRateDisplay = () => useContext(RateDisplayContext);

export const RateDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [unit, setUnit] = useState<RateUnit>('weekly');

    const toggleUnit = useCallback(() => {
        setUnit(prev => prev === 'weekly' ? 'daily' : 'weekly');
    }, []);

    const formatRate = useCallback((weeklyRate: number): string => {
        if (unit === 'weekly') {
            return `${(weeklyRate * 100).toFixed(0)}%`;
        }
        const dailyRate = (weeklyRate / 7) * 100;
        return `${dailyRate.toFixed(2)}%`;
    }, [unit]);

    const unitLabel = unit === 'weekly' ? '/周' : '/日';

    return (
        <RateDisplayContext.Provider value={{ unit, toggleUnit, formatRate, unitLabel }}>
            {children}
        </RateDisplayContext.Provider>
    );
};

/**
 * Inline rate display with click-to-toggle functionality.
 * Shows the rate value with a unit suffix that acts as a toggle button.
 */
export const RateValue: React.FC<{
    weeklyRate: number;
    className?: string;
    showUnit?: boolean;
}> = ({ weeklyRate, className = '', showUnit = true }) => {
    const { formatRate, unitLabel, toggleUnit } = useRateDisplay();

    if (!showUnit) {
        return <span className={className}>{formatRate(weeklyRate)}</span>;
    }

    return (
        <span className={className}>
            {formatRate(weeklyRate)}
            <button
                onClick={(e) => { e.stopPropagation(); toggleUnit(); }}
                className="text-noir-txt-muted hover:text-pawn-accent transition-colors cursor-pointer ml-0.5 text-[0.85em] opacity-70 hover:opacity-100"
                title={`Click to switch to ${unitLabel === '/周' ? 'daily' : 'weekly'} rate`}
            >
                {unitLabel}
            </button>
        </span>
    );
};
