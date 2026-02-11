/**
 * Market Trend Banner
 *
 * Displays today's overall market trend based on the daily sale multiplier range.
 * Trend is derived from the midpoint of saleMultiplierMin and saleMultiplierMax:
 *   - Low: midpoint < 0.70 (below baseline average)
 *   - Normal: 0.70 <= midpoint <= 0.775
 *   - High: midpoint > 0.775 (above baseline average)
 *
 * Design doc #53: "Today's market sentiment" indicator at panel top.
 */

import React from 'react';
import {
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

type MarketTrend = 'LOW' | 'NORMAL' | 'HIGH';

interface MarketTrendBannerProps {
  saleMultiplierMin: number;
  saleMultiplierMax: number;
}

function deriveTrend(min: number, max: number): MarketTrend {
  const midpoint = (min + max) / 2;
  // Baseline midpoint: (0.60 + 0.80) / 2 = 0.70 center.
  // With range offsets the average sits around 0.725.
  if (midpoint < 0.70) return 'LOW';
  if (midpoint > 0.775) return 'HIGH';
  return 'NORMAL';
}

const TREND_CONFIG: Record<MarketTrend, {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}> = {
  LOW: {
    label: 'TREND: LOW',
    icon: <TrendingDown className="w-4 h-4" />,
    colorClass: 'text-red-400',
    borderClass: 'border-red-800/50',
    bgClass: 'bg-red-950/20',
  },
  NORMAL: {
    label: 'TREND: STABLE',
    icon: <Minus className="w-4 h-4" />,
    colorClass: 'text-[#00ff41]/60',
    borderClass: 'border-[#00ff41]/20',
    bgClass: 'bg-[#00ff41]/5',
  },
  HIGH: {
    label: 'TREND: HIGH',
    icon: <TrendingUp className="w-4 h-4" />,
    colorClass: 'text-green-400',
    borderClass: 'border-green-800/50',
    bgClass: 'bg-green-950/20',
  },
};

export const MarketTrendBanner: React.FC<MarketTrendBannerProps> = ({
  saleMultiplierMin,
  saleMultiplierMax,
}) => {
  const trend = deriveTrend(saleMultiplierMin, saleMultiplierMax);
  const config = TREND_CONFIG[trend];

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2 rounded border text-sm font-mono tracking-wider',
      config.bgClass,
      config.borderClass,
      config.colorClass,
    )}>
      <div className="flex items-center gap-2">
        {config.icon}
        <span>{'>'} MKT_SENTIMENT</span>
      </div>
      <span className="font-bold">{config.label}</span>
    </div>
  );
};
