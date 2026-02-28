
import React from 'react';
import { cn } from '../../lib/utils';
import type { NegotiationMacroPhase } from '../../systems/cardNegotiation/types';
import type { ContractTier } from '../../systems/characterAbility/essenceSystem';
import { Flame } from 'lucide-react';

interface StatusBarProps {
  currentPawnAmount: number;
  originalDesiredAmount: number;
  ratePercent: number;
  patience: number;
  maxPatience: number;
  roundNumber: number;
  macroPhase: NegotiationMacroPhase;
  contractTier: ContractTier;
  appraisalCardsRemaining: number;
  appraisalCardsTotal: number;
  insightCardsRemaining: number;
  insightCardsTotal: number;
  rateLocked: boolean;
  priceCutLocked: boolean;
}

// Phase display config
const PHASE_DISPLAY: Record<NegotiationMacroPhase, { label: string; color: string; bg: string }> = {
  probing: { label: '试探', color: 'text-blue-400', bg: 'bg-blue-950/30' },
  bargaining: { label: '博弈', color: 'text-amber-400', bg: 'bg-amber-950/30' },
  showdown: { label: '摊牌', color: 'text-red-400', bg: 'bg-red-950/30' },
};

// Tier display config
const TIER_DISPLAY: Record<ContractTier, { label: string; color: string }> = {
  CHARITY: { label: '恩惠', color: 'text-amber-300' },
  AID: { label: '公道', color: 'text-green-400' },
  STANDARD: { label: '精明', color: 'text-blue-400' },
  ELEVATED: { label: '偏高', color: 'text-orange-400' },
  HIGH: { label: '贪婪', color: 'text-red-400' },
  SHARK: { label: '掠夺', color: 'text-red-600' },
};

/** Info budget dot indicator */
const BudgetDots: React.FC<{ remaining: number; total: number; color: string }> = ({ remaining, total, color }) => (
  <span className="inline-flex gap-0.5">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={cn(
          'inline-block w-2 h-2 rounded-full transition-colors duration-300',
          i < remaining ? color : 'bg-noir-400/50',
        )}
      />
    ))}
  </span>
);

export const StatusBar: React.FC<StatusBarProps> = ({
  currentPawnAmount,
  originalDesiredAmount,
  ratePercent,
  patience,
  maxPatience,
  roundNumber,
  macroPhase,
  contractTier,
  appraisalCardsRemaining,
  appraisalCardsTotal,
  insightCardsRemaining,
  insightCardsTotal,
  rateLocked,
  priceCutLocked,
}) => {
  const phaseInfo = PHASE_DISPLAY[macroPhase];
  const tierInfo = TIER_DISPLAY[contractTier];
  const pawnDelta = currentPawnAmount - originalDesiredAmount;
  const pawnDeltaPercent = originalDesiredAmount > 0
    ? Math.round((pawnDelta / originalDesiredAmount) * 100)
    : 0;
  const patienceLow = patience <= 1;

  return (
    <div className={cn(
      'border-b transition-colors duration-500',
      phaseInfo.bg,
      'border-noir-400/50',
    )}>
      {/* Top row: Phase indicator + Round number */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-noir-400/30">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold font-mono tracking-wider', phaseInfo.color)}>
            {phaseInfo.label}
          </span>
          <span className="text-[10px] text-noir-txt-muted font-mono">
            R{roundNumber}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[10px] font-mono', tierInfo.color)}>
            {tierInfo.label}
          </span>
          {rateLocked && (
            <span className="text-[8px] text-red-500 font-mono border border-red-900/50 px-1 rounded" title="利率已锁定">
              LOCK
            </span>
          )}
          {priceCutLocked && (
            <span className="text-[8px] text-orange-500 font-mono border border-orange-900/50 px-1 rounded" title="压价已锁定">
              CUT
            </span>
          )}
        </div>
      </div>

      {/* Main stats row */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Pawn amount */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] text-noir-txt-muted font-mono uppercase tracking-wider mb-0.5">
            Pawn
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono text-amber-400">
              ${currentPawnAmount.toLocaleString()}
            </span>
            {pawnDelta !== 0 && (
              <span className={cn(
                'text-xs font-mono',
                pawnDelta < 0 ? 'text-green-400' : 'text-red-400',
              )}>
                {pawnDeltaPercent > 0 ? '+' : ''}{pawnDeltaPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Rate */}
        <div className="shrink-0 text-center px-2">
          <div className="text-[9px] text-noir-txt-muted font-mono uppercase tracking-wider mb-0.5">
            Rate
          </div>
          <span className={cn(
            'text-lg font-bold font-mono',
            ratePercent === 0 ? 'text-amber-300' :
            ratePercent < 5 ? 'text-green-400' :
            ratePercent < 10 ? 'text-blue-400' :
            ratePercent < 15 ? 'text-orange-400' :
            ratePercent < 20 ? 'text-red-400' :
            'text-red-600',
          )}>
            {ratePercent}%
          </span>
        </div>

        {/* Patience */}
        <div className="shrink-0 flex flex-col items-center px-2">
          <div className="text-[9px] text-noir-txt-muted font-mono uppercase tracking-wider mb-0.5">
            {patienceLow ? '危险' : '耐心'}
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: maxPatience }).map((_, i) => (
              <Flame
                key={i}
                className={cn(
                  'w-3.5 h-3.5 transition-all duration-300',
                  i < patience
                    ? patienceLow
                      ? 'text-red-500 fill-red-500 animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                      : 'text-orange-500 fill-orange-500'
                    : 'text-stone-800',
                )}
              />
            ))}
          </div>
        </div>

        {/* Info budget */}
        <div className="shrink-0 border-l border-noir-400/30 pl-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-noir-txt-muted font-mono w-6">APR</span>
              <BudgetDots remaining={appraisalCardsRemaining} total={appraisalCardsTotal} color="bg-cyan-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-noir-txt-muted font-mono w-6">INS</span>
              <BudgetDots remaining={insightCardsRemaining} total={insightCardsTotal} color="bg-purple-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
