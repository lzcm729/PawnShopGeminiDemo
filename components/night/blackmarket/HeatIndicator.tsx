import React from 'react';
import { Thermometer } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface HeatIndicatorProps {
  heatInfo: {
    level: string;
    heat: number;
    riskPercent: number;
    displayName: string;
    description: string;
    narrativeDescription?: string;
    color?: string;
  };
  heatDecay?: number;
}

export const HeatIndicator: React.FC<HeatIndicatorProps> = ({ heatInfo, heatDecay = 1 }) => {
  const levelColors: Record<string, string> = {
    SAFE: 'text-green-500 border-green-700 bg-green-950/30',
    WATCHED: 'text-yellow-500 border-yellow-700 bg-yellow-950/30',
    WARNING: 'text-orange-500 border-orange-700 bg-orange-950/30',
    DANGER: 'text-red-500 border-red-700 bg-red-950/30',
  };

  const narrativeColorMap: Record<string, string> = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };
  const narrativeTextColor = narrativeColorMap[heatInfo.color ?? 'green'] ?? 'text-stone-400';

  return (
    <div className={cn('p-4 rounded border', levelColors[heatInfo.level])}>
      <div className="flex items-center gap-3">
        <Thermometer className="w-6 h-6" />
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">热度</div>
          <div className="text-xl font-bold">{heatInfo.displayName}</div>
        </div>
      </div>
      {heatInfo.narrativeDescription ? (
        <div className={cn('mt-2 text-sm font-serif italic', narrativeTextColor)}>
          "{heatInfo.narrativeDescription}"
        </div>
      ) : (
        <div className="mt-2 text-sm opacity-70">{heatInfo.description}</div>
      )}
      <div className="mt-2 w-full h-1.5 bg-noir-400 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 rounded-full',
            heatInfo.level === 'SAFE' && 'bg-green-500',
            heatInfo.level === 'WATCHED' && 'bg-yellow-500',
            heatInfo.level === 'WARNING' && 'bg-orange-500',
            heatInfo.level === 'DANGER' && 'bg-red-500',
          )}
          style={{ width: `${Math.min(100, heatInfo.heat * 10)}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-stone-500">
        每件出售 +2 热度 | 每日衰减 -{heatDecay}
      </div>
    </div>
  );
};
