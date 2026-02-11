import React from 'react';
import {
  Sparkles,
  BookOpen,
  Lock,
  AlertCircle,
  Eye,
  Star,
  Check,
  Gem,
  Brain,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Item } from '../../../systems/items/types';
import { CategoryIcon } from '../../ui/CategoryIcon';
import { getItemIcon } from '../../../systems/assets';
import { Button } from '../../ui/Button';
import { InsightStatus } from '../../../systems/insight/types';
import { getDisplayName } from '../../../systems/items/tagUtils';
import { GAME_CONFIG } from '../../../systems/game/config';
import { ESSENCE_COLORS } from './essenceColors';

export interface ItemDetailPanelProps {
  item: Item;
  status: InsightStatus;
  primaryEssence: 'CRAFT' | 'TIME' | 'VIBE' | 'BALANCED';
  canInsight: boolean;
  reason?: string;
  onInsight: () => void;
  isProcessing: boolean;
  currentEnergy: number;
}

export const ItemDetailPanel: React.FC<ItemDetailPanelProps> = ({
  item,
  status,
  primaryEssence,
  canInsight,
  reason,
  onInsight,
  isProcessing,
  currentEnergy,
}) => {
  const {
    progress,
    nearEpiphany,
    isValueLocked,
    hiddenTraitCount,
    revealedTraitCount,
    remainingKnowledge,
    estimatedYield,
    depletedRewards,
    insightsToEpiphany,
  } = status;

  const isDepleted = progress >= 1;
  const capacity = item.knowledgePool?.capacity || GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY;
  const extracted = capacity - remainingKnowledge;

  const extractionRateMin = GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE_MIN;
  const extractionRateMax = GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE_MAX;
  const actualExtraction = Math.min(extractionRateMax, remainingKnowledge);

  const canPerformInsight = canInsight && currentEnergy >= GAME_CONFIG.NIGHT.INSIGHT_ENERGY_COST && !isDepleted;

  const epiphanyBonus = Math.floor(capacity * GAME_CONFIG.NIGHT.EPIPHANY_BONUS_RATIO);

  const essenceColors = ESSENCE_COLORS[primaryEssence];

  return (
    <div className="bg-noir-200 border border-noir-400 rounded-lg p-4 space-y-4">
      {/* Item Header */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 rounded-lg overflow-hidden shadow-lg">
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
            <CategoryIcon category={item.category} className="text-noir-txt-secondary w-8 h-8" />
          </div>
        </div>
        <div>
          <h3 className="font-bold text-noir-txt-primary text-lg">{getDisplayName(item)}</h3>
          <p className="text-xs text-stone-500 italic">{item.category}</p>
        </div>
      </div>

      {/* Insight Expectation Section */}
      {!isDepleted && (
        <div className={cn(
          'rounded border p-3 space-y-3',
          nearEpiphany
            ? 'bg-yellow-950/20 border-yellow-700/50'
            : 'bg-purple-950/30 border-purple-800/50'
        )}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase text-purple-400 tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              格物预期
            </h4>
            <span className="text-[10px] text-stone-500">
              消耗 {GAME_CONFIG.NIGHT.INSIGHT_ENERGY_COST} 精力
            </span>
          </div>

          {/* Near Epiphany Warning */}
          {nearEpiphany && (
            <div className="flex items-center gap-2 p-2 bg-yellow-900/30 rounded border border-yellow-700/50 animate-pulse">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">将触发顿悟!</span>
            </div>
          )}

          {/* Expected Gains */}
          <div className="space-y-2 text-xs">
            {/* Essence gain */}
            <div className="flex items-center justify-between">
              <span className={cn('flex items-center gap-1', essenceColors.text)}>
                <span>+{extractionRateMin}~{Math.min(extractionRateMax, remainingKnowledge)}</span>
                <Sparkles className="w-3 h-3" />
                <span>精魄</span>
              </span>
              <span className="text-stone-500">(必得)</span>
            </div>

            {/* Range narrowing - #57: fade-out animation for completed rewards */}
            {!depletedRewards.valueLocked ? (
              <div className="flex items-center justify-between transition-all duration-500">
                <span className="text-stone-400">
                  估价收窄 ~{Math.round(GAME_CONFIG.NIGHT.INSIGHT_RANGE_SHRINK_RATE * 100)}%
                </span>
                <span className="text-stone-500">(必得)</span>
              </div>
            ) : (
              <div className="flex items-center justify-between opacity-40 transition-opacity duration-1000 ease-out">
                <span className="text-stone-500 line-through">估价收窄</span>
                <span className="text-pawn-green text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> 已完成
                </span>
              </div>
            )}

            {/* Trait discovery - #57: fade-out animation for completed rewards */}
            {!depletedRewards.allTraitsRevealed ? (
              hiddenTraitCount > 0 && (
                <div className="flex items-center justify-between transition-all duration-500">
                  <span className="text-stone-400">可能发现特征</span>
                  <span className="text-stone-500">
                    ({Math.round(GAME_CONFIG.NIGHT.INSIGHT_TRAIT_DISCOVERY_CHANCE * 100)}%)
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between opacity-40 transition-opacity duration-1000 ease-out">
                <span className="text-stone-500 line-through">特征发现</span>
                <span className="text-pawn-green text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> 已完成
                </span>
              </div>
            )}

            {/* Pure points mode indicator - #57: fade-in transition */}
            {depletedRewards.onlyEssenceRemaining && (
              <div className="flex items-center gap-2 mt-1 p-1.5 bg-stone-800/50 rounded border border-stone-700/50 animate-fade-in-up">
                <Gem className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-[10px] text-stone-500 italic">仅剩原矿可采</span>
              </div>
            )}

            {/* Distance to epiphany */}
            {insightsToEpiphany > 0 && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-stone-500">
                <Brain className="w-3 h-3" />
                距顿悟约 {insightsToEpiphany} 次
              </div>
            )}

            {/* Epiphany bonuses */}
            {nearEpiphany && (
              <>
                <div className="border-t border-purple-800/30 pt-2 mt-2" />
                <div className="flex items-center justify-between text-yellow-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    精力返还
                  </span>
                  <span className="text-yellow-500">(顿悟)</span>
                </div>
                <div className="flex items-center justify-between text-yellow-400">
                  <span className="flex items-center gap-1">
                    额外 +{epiphanyBonus}
                    <Sparkles className="w-3 h-3" />
                    精魄
                  </span>
                  <span className="text-yellow-500">(顿悟)</span>
                </div>
                {!isValueLocked && (
                  <div className="flex items-center justify-between text-yellow-400">
                    <span>强制锁定估价</span>
                    <span className="text-yellow-500">(顿悟)</span>
                  </div>
                )}
                {hiddenTraitCount > 0 && (
                  <div className="flex items-center justify-between text-yellow-400">
                    <span>强制发现全部特征</span>
                    <span className="text-yellow-500">(顿悟)</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-yellow-400">
                  <span>解锁物品故事</span>
                  <span className="text-yellow-500">(顿悟)</span>
                </div>
              </>
            )}
          </div>

          {/* Action Button */}
          <Button
            onClick={onInsight}
            disabled={isProcessing || !canPerformInsight}
            className="w-full mt-2 bg-purple-900 hover:bg-purple-800 border-purple-700 disabled:opacity-50"
          >
            {isProcessing ? (
              '...'
            ) : nearEpiphany ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                格物 (顿悟!)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                格物
              </span>
            )}
          </Button>

          {!canInsight && reason && (
            <p className="mt-2 text-[10px] text-red-400 text-center flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {reason}
            </p>
          )}
        </div>
      )}

      {/* Depleted State */}
      {isDepleted && (
        <div className="bg-stone-800/50 rounded border border-stone-700 p-3 text-center">
          <Lock className="w-6 h-6 mx-auto text-stone-500 mb-2" />
          <p className="text-sm text-stone-400">已研究透彻</p>
          <p className="text-xs text-stone-500 mt-1">
            这件物品已没有更多知识可以提取
          </p>
        </div>
      )}
    </div>
  );
};
