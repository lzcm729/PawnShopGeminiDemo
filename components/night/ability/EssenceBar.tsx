import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { PATH_COLORS } from './constants';

interface EssenceBarProps {
  balance: { craft: number; time: number; vibe: number };
  energy: number;
}

export const EssenceBar: React.FC<EssenceBarProps> = ({ balance, energy }) => (
  <div className="flex items-center justify-between bg-noir-300/50 p-4 rounded border border-noir-400">
    <div className="flex items-center gap-6">
      <EssenceDisplay type="CRAFT" amount={balance.craft} />
      <EssenceDisplay type="TIME" amount={balance.time} />
      <EssenceDisplay type="VIBE" amount={balance.vibe} />
    </div>
    <div className="flex items-center gap-3">
      <Zap className="w-5 h-5 text-amber-500" />
      <div>
        <div className="text-[10px] uppercase text-stone-500 tracking-wider">精力</div>
        <div className="text-lg font-mono text-amber-400">{energy}</div>
      </div>
    </div>
  </div>
);

interface EssenceDisplayProps {
  type: 'CRAFT' | 'TIME' | 'VIBE';
  amount: number;
}

const EssenceDisplay: React.FC<EssenceDisplayProps> = ({ type, amount }) => {
  const colors = PATH_COLORS[type];
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{colors.icon}</span>
      <div>
        <div className="text-[10px] text-stone-500">{colors.label}</div>
        <div className={cn('text-lg font-mono font-bold', colors.text)}>{amount}</div>
      </div>
    </div>
  );
};
