import React from 'react';
import { cn } from '../../../lib/utils';
import { ESSENCE_DISPLAY_NAMES, ESSENCE_ICONS } from '../../../systems/economy/essence';
import { ESSENCE_COLORS } from './essenceColors';

export interface EssenceBadgeProps {
  type: 'CRAFT' | 'TIME' | 'VIBE';
  amount: number;
  bonus?: number;
}

export const EssenceBadge: React.FC<EssenceBadgeProps> = ({ type, amount, bonus }) => {
  const colors = ESSENCE_COLORS[type];

  return (
    <div className={cn('px-3 py-2 rounded border flex items-center gap-2', colors.bg, colors.border, colors.text)}>
      <span>{ESSENCE_ICONS[type]}</span>
      <span className="font-mono font-bold">
        +{amount}
        {bonus !== undefined && bonus > 0 && (
          <span className="text-yellow-400 ml-1">(+{bonus})</span>
        )}
      </span>
      <span className="text-xs opacity-70">{ESSENCE_DISPLAY_NAMES[type]}</span>
    </div>
  );
};
