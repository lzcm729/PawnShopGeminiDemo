import React, { useState } from 'react';
import { Skull } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { UNDERWORLD_COMMISSION_TIERS } from '../../../systems/blackmarket/types';

interface SegmentProps {
  tier: typeof UNDERWORLD_COMMISSION_TIERS[0];
  isReached: boolean;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
}

const CommissionSegment: React.FC<SegmentProps> = ({
  tier,
  isReached,
  isCurrent,
  isFirst,
  isLast,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const commissionText = `${Math.round(tier.commission * 100)}%`;

  return (
    <div
      className="relative flex-1 h-3"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={cn(
          'h-full transition-colors duration-300 cursor-pointer',
          isFirst ? 'rounded-l' : '',
          isLast ? 'rounded-r' : '',
          isReached
            ? isCurrent
              ? 'bg-purple-500 ring-1 ring-purple-400 ring-inset'
              : 'bg-purple-700'
            : 'bg-noir-400'
        )}
      />

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-noir-200 border border-purple-700 rounded px-3 py-2 shadow-lg whitespace-nowrap text-sm">
            <div className="font-bold text-purple-300">{tier.label}</div>
            <div className="text-xs text-stone-400 mt-1">
              声誉: {tier.minRep} - {tier.maxRep}
            </div>
            <div className={cn(
              'text-xs font-mono mt-1',
              tier.commission > 0 ? 'text-red-400' : 'text-green-400'
            )}>
              手续费: {commissionText}
            </div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-purple-700" />
          </div>
        </div>
      )}
    </div>
  );
};

export interface CommissionIndicatorProps {
  commissionInfo: {
    commission: number;
    label: string;
    currentRep: number;
  };
}

export const CommissionIndicator: React.FC<CommissionIndicatorProps> = ({ commissionInfo }) => {
  const isNoFee = commissionInfo.commission === 0;
  const hasFee = commissionInfo.commission > 0;

  const currentTierIndex = UNDERWORLD_COMMISSION_TIERS.findIndex(
    tier => commissionInfo.currentRep >= tier.minRep && commissionInfo.currentRep <= tier.maxRep
  );

  return (
    <div className={cn(
      'p-4 rounded border',
      isNoFee ? 'border-green-700 bg-green-950/30 text-green-400' :
      hasFee ? 'border-purple-700 bg-purple-950/30 text-purple-400' :
      'border-stone-600 bg-stone-900/30 text-stone-300'
    )}>
      <div className="flex items-center gap-3">
        <Skull className="w-6 h-6" />
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider opacity-70">黑道声誉</div>
          <div className="text-xl font-bold">{commissionInfo.label}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold">{commissionInfo.currentRep}</div>
          <div className="text-xs opacity-70">/ 100</div>
        </div>
      </div>

      <div className="mt-3 flex gap-1">
        {UNDERWORLD_COMMISSION_TIERS.map((tier, index) => (
          <CommissionSegment
            key={index}
            tier={tier}
            isReached={index <= currentTierIndex}
            isCurrent={index === currentTierIndex}
            isFirst={index === 0}
            isLast={index === UNDERWORLD_COMMISSION_TIERS.length - 1}
          />
        ))}
      </div>

      <div className="mt-3 text-sm flex items-center justify-between">
        <span className="opacity-70">手续费:</span>
        <span className={cn(
          'font-mono font-bold',
          isNoFee ? 'text-green-400' : 'text-red-400'
        )}>
          {Math.round(commissionInfo.commission * 100)}%
        </span>
      </div>

      <div className="mt-2 pt-2 border-t border-purple-800/30 text-xs opacity-60">
        黑道声誉越高，手续费越低 (悬停查看各等级详情)
      </div>
    </div>
  );
};
