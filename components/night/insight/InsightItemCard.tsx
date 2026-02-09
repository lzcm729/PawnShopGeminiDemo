import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Item } from '../../../systems/items/types';
import { CategoryIcon } from '../../ui/CategoryIcon';
import { getItemIcon } from '../../../systems/assets';
import { InsightStatus } from '../../../systems/insight/types';
import { getDisplayName } from '../../../systems/items/tagUtils';
import { GAME_CONFIG } from '../../../systems/game/config';
import { ESSENCE_COLORS } from './essenceColors';

export interface InsightItemCardProps {
  item: Item;
  status: InsightStatus;
  primaryEssence: 'CRAFT' | 'TIME' | 'VIBE' | 'BALANCED';
  canInsight: boolean;
  reason?: string;
  isSelected: boolean;
  onSelect: () => void;
  onInsight: () => void;
  isProcessing: boolean;
}

export const InsightItemCard: React.FC<InsightItemCardProps> = ({
  item,
  status,
  primaryEssence,
  canInsight,
  reason,
  isSelected,
  onSelect,
  onInsight,
  isProcessing,
}) => {
  const colors = ESSENCE_COLORS[primaryEssence];

  const { progress, nearEpiphany, isValueLocked, hiddenTraitCount, revealedTraitCount, remainingKnowledge, estimatedYield, depletedRewards, insightsToEpiphany } = status;
  const progressPercent = Math.round(progress * 100);
  const isDepleted = progress >= 1;

  const capacity = item.knowledgePool?.capacity || GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY;
  const extracted = capacity - remainingKnowledge;

  const insightedTonight = item.insightedTonight || false;

  return (
    <div
      className={cn(
        'bg-noir-200 border-l-4 p-2 rounded-r transition-all cursor-pointer relative',
        colors.border,
        isSelected && 'ring-1 ring-purple-500',
        insightedTonight && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {insightedTonight && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] pointer-events-none z-10">
          <span className="text-red-500/60 text-lg font-bold border-2 border-red-500/60 px-2 py-0.5 rounded">
            已格物
          </span>
        </div>
      )}

      <div className="flex gap-3 items-start">
        <div className="w-12 h-12 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 rounded overflow-hidden">
          <img
            src={getItemIcon(item)}
            alt={item.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fallback = (e.target as HTMLImageElement).nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
          <div className="hidden items-center justify-center w-full h-full">
            <CategoryIcon category={item.category} className="text-noir-txt-secondary w-6 h-6" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-noir-txt-primary text-sm truncate shrink-0">{getDisplayName(item)}</h4>

            <div className="flex items-center gap-1 flex-1 min-w-0">
              {item.revealedTraits?.map((trait) => (
                <span
                  key={trait.id}
                  className={cn(
                    'px-1 py-0.5 text-[9px] rounded shrink-0',
                    trait.type === 'FLAW' && 'bg-red-900/50 text-red-400 border border-red-800',
                    trait.type === 'STORY' && 'bg-blue-900/50 text-blue-400 border border-blue-800',
                    trait.type === 'FAKE' && 'bg-purple-900/50 text-purple-400 border border-purple-800',
                    trait.type === 'JACKPOT' && 'bg-amber-900/50 text-amber-400 border border-amber-800',
                    !['FLAW', 'STORY', 'FAKE', 'JACKPOT'].includes(trait.type) && 'bg-stone-700 text-stone-300 border border-stone-600'
                  )}
                >
                  {trait.name}
                </span>
              ))}
              {hiddenTraitCount > 0 &&
                Array(Math.min(hiddenTraitCount, 3)).fill(0).map((_, i) => (
                  <span key={`h-${i}`} className="px-1 py-0.5 text-[9px] rounded bg-stone-800 text-stone-500 border border-stone-700 shrink-0">?</span>
                ))}
            </div>

            <span className={cn('text-xs font-mono shrink-0', isValueLocked ? 'text-pawn-green' : 'text-stone-400')}>
              {isValueLocked
                ? `$${item.realValue.toLocaleString()}`
                : `$${item.currentRange[0].toLocaleString()} ~ $${item.currentRange[1].toLocaleString()}`
              }
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-24 h-1.5 bg-noir-400 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isDepleted ? 'bg-stone-500' : nearEpiphany ? 'bg-yellow-500 animate-pulse' : colors.bar
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-stone-500 shrink-0">{extracted}/{capacity}</span>
            {!isDepleted && insightsToEpiphany > 0 && insightsToEpiphany <= 3 && (
              <span className="text-[9px] text-yellow-500/80">~{insightsToEpiphany}次</span>
            )}
          </div>
        </div>
      </div>

      {(isDepleted || nearEpiphany) && (
        <div className="mt-1 text-[9px]">
          {isDepleted && (
            <span className="flex items-center gap-1 text-stone-500">
              <Lock className="w-3 h-3" /> 已研究透彻
            </span>
          )}
          {nearEpiphany && !isDepleted && (
            <span className="text-yellow-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 即将顿悟!
            </span>
          )}
        </div>
      )}
    </div>
  );
};
