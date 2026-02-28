
import React from 'react';
import { cn } from '../../lib/utils';

interface DriftBarProps {
  /** Current interest rate percentage (0-25+) */
  ratePercent: number;
}

/**
 * Rate Drift Bar - visual gradient showing the current interest rate position.
 * Gold(0%) -> Yellow-green(5%) -> Orange(10%) -> Dark-orange(15%) -> Dark-red(20%+)
 */
export const DriftBar: React.FC<DriftBarProps> = ({ ratePercent }) => {
  // Clamp display to 0-25 range
  const displayRate = Math.max(0, Math.min(ratePercent, 25));
  const fillPercent = (displayRate / 25) * 100;

  // Rate zone labels
  const zones = [
    { pos: 0, label: '0%', color: 'text-amber-300' },
    { pos: 20, label: '5%', color: 'text-green-400' },
    { pos: 40, label: '10%', color: 'text-orange-400' },
    { pos: 60, label: '15%', color: 'text-red-400' },
    { pos: 80, label: '20%', color: 'text-red-600' },
  ];

  return (
    <div className="px-3 py-2">
      <div className="text-[9px] text-noir-txt-muted font-mono uppercase tracking-wider mb-1">
        Rate Drift
      </div>

      {/* Gradient bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-noir-400/30 border border-noir-400/50">
        {/* Gradient background showing full range */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, #fbbf24, #86efac 20%, #fb923c 40%, #ea580c 60%, #dc2626 80%, #991b1b 100%)',
            opacity: 0.15,
          }}
        />

        {/* Active fill */}
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500"
          style={{
            width: `${fillPercent}%`,
            background: `linear-gradient(to right, #fbbf24, ${
              fillPercent <= 20 ? '#86efac' :
              fillPercent <= 40 ? '#fb923c' :
              fillPercent <= 60 ? '#ea580c' :
              fillPercent <= 80 ? '#dc2626' :
              '#991b1b'
            })`,
            boxShadow: ratePercent >= 15
              ? '0 0 8px rgba(239,68,68,0.4)'
              : ratePercent >= 10
              ? '0 0 6px rgba(251,146,60,0.3)'
              : '0 0 4px rgba(251,191,36,0.2)',
          }}
        />

        {/* Current position marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)] transition-all duration-500"
          style={{ left: `${fillPercent}%` }}
        />
      </div>

      {/* Zone labels */}
      <div className="relative h-3 mt-0.5">
        {zones.map(zone => (
          <span
            key={zone.pos}
            className={cn('absolute text-[7px] font-mono', zone.color)}
            style={{ left: `${zone.pos}%`, transform: 'translateX(-50%)' }}
          >
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  );
};
