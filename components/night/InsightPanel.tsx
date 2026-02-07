/**
 * 格物面板 (Insight Panel)
 *
 * 夜间格物系统的UI组件，允许玩家研究库存物品获取精魄。
 *
 * v1.1 UI 增强：
 * - 顿悟仪式化呈现（光晕、泛白、不可跳过 3-5s）
 * - 精魄三色差异化（匠心=冷蓝、旧影=暖黄、灵韵=淡紫）
 * - 收益递减可视化（淡出已完成收益、距顿悟提示）
 * - 格物vs鉴定体验差异化（沉浸式探索风格）
 * - 格物意外事件 UI（走神/惊人发现）
 * - 窥见事件 UI（模糊画面 + 淡入淡出文字）
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { useInsight } from '../../hooks/useInsight';
import { useGame } from '../../store/GameContext';
import { cn } from '../../lib/utils';
import { Item, ItemStatus } from '../../systems/items/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import { getItemIcon } from '../../systems/assets';
import {
  Sparkles,
  Zap,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  HelpCircle,
  Star,
  Check,
  Gem,
  Brain,
  CloudFog,
  Flame,
} from 'lucide-react';
import { ESSENCE_DISPLAY_NAMES, ESSENCE_ICONS, EssenceType } from '../../systems/economy/essence';
import { InsightResult, InsightNarrative, InsightStatus } from '../../systems/insight/types';
import { getDisplayName } from '../../systems/items/tagUtils';
import { GAME_CONFIG } from '../../systems/game/config';

// ============================================================================
// S3-I2: Essence color system (匠心=冷蓝, 旧影=暖黄, 灵韵=淡紫)
// ============================================================================

const ESSENCE_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  bar: string;
  glow: string;
}> = {
  CRAFT: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-700',
    text: 'text-blue-400',
    bar: 'bg-blue-500',
    glow: 'shadow-blue-500/20',
  },
  TIME: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-700',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
  },
  VIBE: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-700',
    text: 'text-purple-400',
    bar: 'bg-purple-500',
    glow: 'shadow-purple-500/20',
  },
  BALANCED: {
    bg: 'bg-stone-800/50',
    border: 'border-stone-600',
    text: 'text-stone-400',
    bar: 'bg-stone-500',
    glow: '',
  },
};

interface InsightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsightPanel: React.FC<InsightPanelProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useGame();
  const {
    insightableItems,
    currentEnergy,
    maxEnergy,
    doInsight,
    getReasonText,
  } = useInsight();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    result: InsightResult;
    narrative: InsightNarrative;
    oldRange: [number, number];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-select item from pending selection when panel opens
  useEffect(() => {
    if (isOpen && state.pendingSelectedItemId) {
      const existsInInsight = insightableItems.some(
        i => i.item.id === state.pendingSelectedItemId
      );
      if (existsInInsight) {
        setSelectedItemId(state.pendingSelectedItemId);
      }
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: null });
    }
  }, [isOpen, state.pendingSelectedItemId, insightableItems, dispatch]);

  const handleInsight = (itemId: string) => {
    setIsProcessing(true);

    const itemData = insightableItems.find(i => i.item.id === itemId);
    const oldRange: [number, number] = itemData?.item.currentRange ?? [0, 0];

    const output = doInsight(itemId);

    if (output?.success && output.result && output.narrative) {
      setLastResult({
        result: output.result,
        narrative: output.narrative,
        oldRange,
      });
    }

    setIsProcessing(false);
  };

  const clearResult = () => {
    setLastResult(null);
    setSelectedItemId(null);
  };

  const selectedItemData = selectedItemId
    ? insightableItems.find(i => i.item.id === selectedItemId)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          格物 (Insight)
          <HelpTooltip text="研究库存物品，提取精魄用于夜间活动。每次格物消耗精力，可收窄估价、发现特征。知识耗尽时触发「顿悟」获得额外奖励。" />
        </span>
      }
      size="xl"
    >
      <div className="flex flex-col gap-6">
        {/* Energy Status */}
        <div className="flex items-center justify-between bg-noir-300/50 p-4 rounded border border-noir-400">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-amber-500" />
            <div>
              <div className="text-xs uppercase text-stone-500 tracking-wider">精力 (Energy)</div>
              <div className="text-2xl font-mono text-amber-400">
                {currentEnergy} / {maxEnergy}
              </div>
            </div>
          </div>
          <div className="text-xs text-stone-500 max-w-xs">
            研究物品需要消耗精力。触发顿悟时精力会返还。
          </div>
        </div>

        {/* Result Modal */}
        <InsightResultModal result={lastResult} onClose={clearResult} />

        {/* S3-I2: Essence Type Legend with correct colors */}
        <div className="flex items-center gap-4 text-[10px] text-stone-500">
          <span className="uppercase tracking-wider">精魄类型:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-blue-500 rounded-sm" />
            <span>匠心</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-amber-500 rounded-sm" />
            <span>旧影</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-purple-500 rounded-sm" />
            <span>灵韵</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-stone-600 rounded-sm" />
            <span>均衡</span>
          </div>
        </div>

        {/* Main Content: List + Detail Panel */}
        <div className="flex gap-4">
          {/* Item List */}
          <div className="w-1/2 space-y-2 max-h-[60vh] overflow-y-auto pr-2 pb-4">
            <h4 className="text-xs uppercase text-stone-500 tracking-wider mb-2">
              库存物品 ({insightableItems.length})
            </h4>
            <div className="grid gap-2 grid-cols-1">
              {insightableItems.map(({ item, status, primaryEssence }) => (
                <InsightItemCard
                  key={item.id}
                  item={item}
                  status={status}
                  primaryEssence={primaryEssence}
                  canInsight={status.canInsight}
                  isSelected={selectedItemId === item.id}
                  onSelect={() => setSelectedItemId(item.id)}
                  onInsight={() => handleInsight(item.id)}
                  isProcessing={isProcessing && selectedItemId === item.id}
                />
              ))}
            </div>

            {insightableItems.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>库存中没有可研究的物品</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="w-1/2">
            {selectedItemData ? (
              <ItemDetailPanel
                item={selectedItemData.item}
                status={selectedItemData.status}
                primaryEssence={selectedItemData.primaryEssence}
                canInsight={selectedItemData.status.canInsight}
                reason={selectedItemData.status.reason ? getReasonText(selectedItemData.status.reason) : undefined}
                onInsight={() => handleInsight(selectedItemData.item.id)}
                isProcessing={isProcessing}
                currentEnergy={currentEnergy}
              />
            ) : (
              <div className="bg-noir-200 border border-noir-400 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center min-h-[300px]">
                <Eye className="w-12 h-12 text-stone-600 mb-4" />
                <p className="text-stone-500 mb-2">选择物品查看详情</p>
                <p className="text-xs text-stone-600">
                  点击左侧可研究的物品，<br />查看格物预期和操作
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface EssenceBadgeProps {
  type: 'CRAFT' | 'TIME' | 'VIBE';
  amount: number;
  bonus?: number;
}

const EssenceBadge: React.FC<EssenceBadgeProps> = ({ type, amount, bonus }) => {
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

// ============================================================================
// Item Card (List View)
// ============================================================================

interface InsightItemCardProps {
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

const InsightItemCard: React.FC<InsightItemCardProps> = ({
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
            {/* S3-I3: Distance to epiphany indicator */}
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

// ============================================================================
// Item Detail Panel (S3-I3: Diminishing returns, S3-I4: Immersive style)
// ============================================================================

interface ItemDetailPanelProps {
  item: Item;
  status: InsightStatus;
  primaryEssence: 'CRAFT' | 'TIME' | 'VIBE' | 'BALANCED';
  canInsight: boolean;
  reason?: string;
  onInsight: () => void;
  isProcessing: boolean;
  currentEnergy: number;
}

const ItemDetailPanel: React.FC<ItemDetailPanelProps> = ({
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

  // S3-F2: Epiphany bonus based on capacity * ratio
  const epiphanyBonus = Math.floor(capacity * GAME_CONFIG.NIGHT.EPIPHANY_BONUS_RATIO);

  const essenceColors = ESSENCE_COLORS[primaryEssence];

  return (
    <div className="bg-noir-200 border border-noir-400 rounded-lg p-4 space-y-4">
      {/* S3-I4: Item Header with larger image and contemplative style */}
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
            {/* Essence gain (always) - show range */}
            <div className="flex items-center justify-between">
              <span className={cn('flex items-center gap-1', essenceColors.text)}>
                <span>+{extractionRateMin}~{Math.min(extractionRateMax, remainingKnowledge)}</span>
                <Sparkles className="w-3 h-3" />
                <span>精魄</span>
              </span>
              <span className="text-stone-500">(必得)</span>
            </div>

            {/* S3-I3: Range narrowing - with depleted state */}
            {!depletedRewards.valueLocked ? (
              <div className="flex items-center justify-between">
                <span className="text-stone-400">
                  估价收窄 ~{Math.round(GAME_CONFIG.NIGHT.INSIGHT_RANGE_SHRINK_RATE * 100)}%
                </span>
                <span className="text-stone-500">(必得)</span>
              </div>
            ) : (
              <div className="flex items-center justify-between opacity-40">
                <span className="text-stone-500 line-through">估价收窄</span>
                <span className="text-pawn-green text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> 已完成
                </span>
              </div>
            )}

            {/* S3-I3: Trait discovery - with depleted state */}
            {!depletedRewards.allTraitsRevealed ? (
              hiddenTraitCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">可能发现特征</span>
                  <span className="text-stone-500">
                    ({Math.round(GAME_CONFIG.NIGHT.INSIGHT_TRAIT_DISCOVERY_CHANCE * 100)}%)
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between opacity-40">
                <span className="text-stone-500 line-through">特征发现</span>
                <span className="text-pawn-green text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> 已完成
                </span>
              </div>
            )}

            {/* S3-I3: Pure points mode indicator */}
            {depletedRewards.onlyEssenceRemaining && (
              <div className="flex items-center gap-2 mt-1 p-1.5 bg-stone-800/50 rounded border border-stone-700/50">
                <Gem className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-[10px] text-stone-500 italic">仅剩原矿可采</span>
              </div>
            )}

            {/* S3-I3: Distance to epiphany */}
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

// ============================================================================
// Insight Result Modal (S3-I1: Epiphany Ritual, S3-I5: Unexpected, S3-I6: Glimpse)
// ============================================================================

interface InsightResultModalProps {
  result: {
    result: InsightResult;
    narrative: InsightNarrative;
    oldRange: [number, number];
  } | null;
  onClose: () => void;
}

const InsightResultModal: React.FC<InsightResultModalProps> = ({ result, onClose }) => {
  const [ritualPhase, setRitualPhase] = useState<'glow' | 'flash' | 'reveal' | 'done'>('glow');
  const [canDismiss, setCanDismiss] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!result) {
      setRitualPhase('glow');
      setCanDismiss(false);
      return;
    }

    if (result.result.isEpiphany) {
      // S3-I1: Epiphany ritual - 4 second animation
      setRitualPhase('glow');
      setCanDismiss(false);

      timerRef.current = setTimeout(() => setRitualPhase('flash'), 800);
      const t2 = setTimeout(() => setRitualPhase('reveal'), 1600);
      const t3 = setTimeout(() => {
        setRitualPhase('done');
        setCanDismiss(true);
      }, 4000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      // Non-epiphany: immediately dismissable
      setRitualPhase('done');
      setCanDismiss(true);
    }
  }, [result]);

  if (!result) return null;

  const isEpiphany = result.result.isEpiphany;
  const { rangeNarrowed, newRange, valueLocked, traitDiscovered, unexpectedEvent, glimpse, resonance } = result.result;
  const oldRange = result.oldRange;

  const handleClose = () => {
    if (canDismiss) onClose();
  };

  return (
    <Modal
      isOpen={!!result}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2 text-purple-300">
          {isEpiphany ? (
            <>
              <Sparkles className="w-5 h-5 text-yellow-400" />
              顿悟!
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5" />
              格物完成
            </>
          )}
        </span>
      }
      size="md"
    >
      {/* S3-I1: Epiphany ritual overlay */}
      {isEpiphany && ritualPhase !== 'done' && (
        <div className={cn(
          'absolute inset-0 z-50 pointer-events-none transition-all duration-700',
          ritualPhase === 'glow' && 'bg-yellow-500/10',
          ritualPhase === 'flash' && 'bg-white/40',
          ritualPhase === 'reveal' && 'bg-yellow-500/5',
        )} />
      )}

      <div className={cn(
        'p-6 rounded border transition-all duration-500',
        isEpiphany
          ? 'bg-gradient-to-r from-yellow-950/50 to-amber-950/30 border-yellow-700/50'
          : 'bg-gradient-to-r from-purple-950/50 to-noir-300/50 border-purple-800'
      )}>
        {/* Narrative */}
        <div className="space-y-3 mb-6 text-stone-300 text-sm italic">
          <p className={cn(
            'transition-opacity duration-1000',
            isEpiphany && ritualPhase === 'glow' && 'opacity-0',
          )}>
            {result.narrative.actionText}
          </p>
          <p className={cn(
            'transition-opacity duration-1000',
            isEpiphany && (ritualPhase === 'glow' || ritualPhase === 'flash') && 'opacity-0',
          )}>
            {result.narrative.discoveryText}
          </p>
          {result.narrative.epiphanyText && (
            <p className={cn(
              'text-yellow-300 font-medium transition-opacity duration-1000',
              isEpiphany && ritualPhase !== 'done' && 'opacity-0',
            )}>
              {result.narrative.epiphanyText}
            </p>
          )}
        </div>

        {/* S3-I5: Unexpected event display */}
        {unexpectedEvent && (
          <div className={cn(
            'mb-4 p-3 rounded border',
            unexpectedEvent === 'DISTRACTION'
              ? 'bg-stone-800/50 border-stone-600 text-stone-400'
              : 'bg-amber-950/50 border-amber-600 text-amber-300'
          )}>
            <div className="flex items-center gap-2">
              {unexpectedEvent === 'DISTRACTION' ? (
                <>
                  <CloudFog className="w-4 h-4 text-stone-500" />
                  <span className="text-sm">今晚心不在焉，产出减半...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">惊人发现! 产出翻倍!</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* S3-I6: Glimpse event display */}
        {glimpse && (
          <div className="mb-4 p-3 bg-indigo-950/30 rounded border border-indigo-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] uppercase text-indigo-400 tracking-wider">窥见</span>
            </div>
            <p className="text-sm text-indigo-300/80 italic">{glimpse.text}</p>
          </div>
        )}

        {/* Resonance event display */}
        {resonance && (
          <div className="mb-4 p-3 bg-cyan-950/30 rounded border border-cyan-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase text-cyan-400 tracking-wider">共鸣</span>
            </div>
            <p className="text-sm text-cyan-300/80 italic">{resonance.text}</p>
            <div className="mt-2 flex gap-2">
              {resonance.bonusEssence.craft !== undefined && resonance.bonusEssence.craft > 0 && (
                <span className="text-xs text-blue-400">+{resonance.bonusEssence.craft} 匠心</span>
              )}
              {resonance.bonusEssence.time !== undefined && resonance.bonusEssence.time > 0 && (
                <span className="text-xs text-amber-400">+{resonance.bonusEssence.time} 旧影</span>
              )}
              {resonance.bonusEssence.vibe !== undefined && resonance.bonusEssence.vibe > 0 && (
                <span className="text-xs text-purple-400">+{resonance.bonusEssence.vibe} 灵韵</span>
              )}
            </div>
          </div>
        )}

        {/* Appraisal Results */}
        {(rangeNarrowed || traitDiscovered) && (
          <div className="mb-4 space-y-2">
            {rangeNarrowed && newRange && (
              <div className="flex items-center gap-2 text-sm">
                <ChevronRight className="w-4 h-4 text-pawn-green" />
                <span className="text-stone-400">估价收窄:</span>
                <span className="text-stone-500 line-through">
                  ${oldRange[0].toLocaleString()} ~ ${oldRange[1].toLocaleString()}
                </span>
                <span className="text-stone-400">→</span>
                {valueLocked ? (
                  <span className="text-pawn-green font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    ${newRange[0].toLocaleString()}
                    {newRange[0] !== newRange[1] && ` ~ $${newRange[1].toLocaleString()}`}
                    {' '}(已锁定)
                  </span>
                ) : (
                  <span className="text-pawn-accent font-medium">
                    ${newRange[0].toLocaleString()} ~ ${newRange[1].toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {traitDiscovered && (
              <div className="flex items-start gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div>
                  <span className="text-stone-400">发现特征:</span>
                  <span className={cn(
                    'ml-2 px-2 py-0.5 rounded text-xs',
                    traitDiscovered.type === 'FLAW' && 'bg-red-900/50 text-red-400 border border-red-800',
                    traitDiscovered.type === 'STORY' && 'bg-blue-900/50 text-blue-400 border border-blue-800',
                    traitDiscovered.type === 'FAKE' && 'bg-purple-900/50 text-purple-400 border border-purple-800',
                    traitDiscovered.type === 'JACKPOT' && 'bg-amber-900/50 text-amber-400 border border-amber-800',
                    !['FLAW', 'STORY', 'FAKE', 'JACKPOT'].includes(traitDiscovered.type) && 'bg-stone-700 text-stone-300 border border-stone-600'
                  )}>
                    {traitDiscovered.name}
                  </span>
                  {traitDiscovered.description && (
                    <p className="text-stone-500 text-xs mt-1 ml-0">
                      {traitDiscovered.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Essence Gained */}
        <div className="flex flex-wrap gap-3">
          {result.result.essenceGained.craft !== undefined &&
            result.result.essenceGained.craft > 0 && (
              <EssenceBadge
                type="CRAFT"
                amount={result.result.essenceGained.craft}
                bonus={result.result.bonusEssence?.craft}
              />
            )}
          {result.result.essenceGained.time !== undefined &&
            result.result.essenceGained.time > 0 && (
              <EssenceBadge
                type="TIME"
                amount={result.result.essenceGained.time}
                bonus={result.result.bonusEssence?.time}
              />
            )}
          {result.result.essenceGained.vibe !== undefined &&
            result.result.essenceGained.vibe > 0 && (
              <EssenceBadge
                type="VIBE"
                amount={result.result.essenceGained.vibe}
                bonus={result.result.bonusEssence?.vibe}
              />
            )}
        </div>

        {isEpiphany && (
          <div className="mt-4 text-xs text-yellow-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            精力已返还!
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-end mt-4">
        <Button
          onClick={handleClose}
          disabled={!canDismiss}
          className={cn('px-6', !canDismiss && 'opacity-50 cursor-not-allowed')}
        >
          {canDismiss ? '确定' : '...'}
        </Button>
      </div>
    </Modal>
  );
};
