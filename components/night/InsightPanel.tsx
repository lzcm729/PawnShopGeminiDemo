/**
 * 格物面板 (Insight Panel)
 *
 * 夜间格物系统的UI组件，允许玩家研究库存物品获取精魄。
 *
 * UI 设计原则（来自夜间鉴定系统设计文档）：
 * 1. 状态区和操作区分离 - 上方显示当前状态，下方显示操作预期
 * 2. 动态隐藏已完成项 - 估价锁定后不再提示"估价收窄"
 * 3. 明确区分确定与概率 - 必得收益正常显示，概率收益标注概率
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ESSENCE_DISPLAY_NAMES, ESSENCE_ICONS } from '../../systems/economy/essence';
import { InsightResult, InsightNarrative, InsightStatus } from '../../systems/insight/types';
import { getDisplayName } from '../../systems/items/tagUtils';
import { GAME_CONFIG } from '../../systems/game/config';

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
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-select item from pending selection when panel opens
  useEffect(() => {
    if (isOpen && state.pendingSelectedItemId) {
      // Check if the pending item exists in insightable items
      const existsInInsight = insightableItems.some(
        i => i.item.id === state.pendingSelectedItemId
      );
      if (existsInInsight) {
        setSelectedItemId(state.pendingSelectedItemId);
      }
      // Clear the pending selection
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: null });
    }
  }, [isOpen, state.pendingSelectedItemId, insightableItems, dispatch]);

  const handleInsight = (itemId: string) => {
    setIsProcessing(true);
    const output = doInsight(itemId);

    if (output?.success && output.result && output.narrative) {
      setLastResult({
        result: output.result,
        narrative: output.narrative,
      });
    }

    setIsProcessing(false);
  };

  const clearResult = () => {
    setLastResult(null);
    setSelectedItemId(null);
  };

  // Group items: can insight vs cannot
  const canInsightItems = insightableItems.filter(i => i.status.canInsight);
  const cannotInsightItems = insightableItems.filter(i => !i.status.canInsight);

  // Find selected item data
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

        {/* Essence Type Legend */}
        <div className="flex items-center gap-4 text-[10px] text-stone-500">
          <span className="uppercase tracking-wider">精魄类型:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-amber-700 rounded-sm" />
            <span>匠心</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-blue-700 rounded-sm" />
            <span>旧影</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-pink-700 rounded-sm" />
            <span>韵味</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-4 bg-stone-600 rounded-sm" />
            <span>均衡</span>
          </div>
        </div>

        {/* Main Content: List + Detail Panel */}
        <div className="flex gap-4">
          {/* Item List - Fixed width */}
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

            {/* Empty State */}
            {insightableItems.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>库存中没有可研究的物品</p>
              </div>
            )}
          </div>

          {/* Detail Panel - Fixed width, always visible */}
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
  const colors: Record<string, string> = {
    CRAFT: 'bg-amber-900/50 border-amber-700 text-amber-400',
    TIME: 'bg-blue-900/50 border-blue-700 text-blue-400',
    VIBE: 'bg-pink-900/50 border-pink-700 text-pink-400',
  };

  return (
    <div className={cn('px-3 py-2 rounded border flex items-center gap-2', colors[type])}>
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
  const essenceColors: Record<string, string> = {
    CRAFT: 'border-amber-700',
    TIME: 'border-blue-700',
    VIBE: 'border-pink-700',
    BALANCED: 'border-stone-600',
  };

  const { progress, nearEpiphany, isValueLocked, hiddenTraitCount, revealedTraitCount, remainingKnowledge, estimatedYield } = status;
  const progressPercent = Math.round(progress * 100);
  const isDepleted = progress >= 1;

  // Calculate estimated essence gain for next insight
  const extractionRate = GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE;
  const actualExtraction = Math.min(extractionRate, remainingKnowledge);
  const estimatedCraft = Math.floor(actualExtraction * (estimatedYield.craft || 0));
  const estimatedTime = Math.floor(actualExtraction * (estimatedYield.time || 0));
  const estimatedVibe = Math.floor(actualExtraction * (estimatedYield.vibe || 0));

  // Determine primary essence type and display
  const primaryType = primaryEssence === 'BALANCED' ? 'CRAFT' : primaryEssence;
  const primaryAmount = primaryType === 'CRAFT' ? estimatedCraft : primaryType === 'TIME' ? estimatedTime : estimatedVibe;

  // Check if all traits are revealed
  const allTraitsRevealed = hiddenTraitCount === 0;

  // Check if fully appraised (value locked AND all traits revealed)
  const fullyAppraised = isValueLocked && allTraitsRevealed;

  const capacity = item.knowledgePool?.capacity || GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY;
  const extracted = capacity - remainingKnowledge;

  const insightedTonight = item.insightedTonight || false;

  return (
    <div
      className={cn(
        'bg-noir-200 border-l-4 p-2 rounded-r transition-all cursor-pointer relative',
        essenceColors[primaryEssence],
        isSelected && 'ring-1 ring-purple-500',
        insightedTonight && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {/* "已格物" Stamp */}
      {insightedTonight && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] pointer-events-none z-10">
          <span className="text-red-500/60 text-lg font-bold border-2 border-red-500/60 px-2 py-0.5 rounded">
            已格物
          </span>
        </div>
      )}

      {/* Row 1: Large Icon + Content */}
      <div className="flex gap-3 items-start">
        {/* Larger Icon */}
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

        {/* Content: Name + Traits + Valuation + Progress */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name + Traits + Valuation */}
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-noir-txt-primary text-sm truncate shrink-0">{getDisplayName(item)}</h4>

            {/* Traits */}
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

          {/* Line 2: Progress Bar (shorter) */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-24 h-1.5 bg-noir-400 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isDepleted ? 'bg-stone-500' : nearEpiphany ? 'bg-yellow-500 animate-pulse' : 'bg-purple-500'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-stone-500 shrink-0">{extracted}/{capacity}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Status (only if needed) */}
      {(isDepleted || nearEpiphany) && (
        <div className="mt-1 text-[9px]">
          {isDepleted && (
            <span className="flex items-center gap-1 text-stone-500">
              <Lock className="w-3 h-3" /> 已研究透彻
            </span>
          )}
          {nearEpiphany && !isDepleted && (
            <span className="text-yellow-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 即将顿悟！
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Item Detail Panel (Detailed View)
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

/**
 * Detailed item panel showing:
 * 1. Current Status Section: valuation, traits, knowledge pool
 * 2. Insight Expectation Section: what the next insight will yield
 */
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
  } = status;

  const isDepleted = progress >= 1;
  const capacity = item.knowledgePool?.capacity || GAME_CONFIG.NIGHT.DEFAULT_KNOWLEDGE_CAPACITY;
  const extracted = capacity - remainingKnowledge;

  // Calculate estimated essence gain for next insight
  const extractionRate = GAME_CONFIG.NIGHT.INSIGHT_EXTRACTION_RATE;
  const actualExtraction = Math.min(extractionRate, remainingKnowledge);
  const estimatedCraft = Math.floor(actualExtraction * (estimatedYield.craft || 0));
  const estimatedTime = Math.floor(actualExtraction * (estimatedYield.time || 0));
  const estimatedVibe = Math.floor(actualExtraction * (estimatedYield.vibe || 0));

  // Determine primary essence type
  const primaryType = primaryEssence === 'BALANCED' ? 'TIME' : primaryEssence;
  const primaryAmount =
    primaryType === 'CRAFT'
      ? estimatedCraft
      : primaryType === 'TIME'
      ? estimatedTime
      : estimatedVibe;

  // Check states
  const allTraitsRevealed = hiddenTraitCount === 0;
  const fullyAppraised = isValueLocked && allTraitsRevealed;
  const canPerformInsight = canInsight && currentEnergy >= GAME_CONFIG.NIGHT.INSIGHT_ENERGY_COST && !isDepleted;

  // Epiphany bonus calculation
  const epiphanyBonus = Math.floor(actualExtraction * GAME_CONFIG.NIGHT.EPIPHANY_BONUS_RATIO);

  return (
    <div className="bg-noir-200 border border-noir-400 rounded-lg p-4 space-y-4">
      {/* Item Header */}
      <div className="flex items-center gap-3">
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
        <div>
          <h3 className="font-bold text-noir-txt-primary">{getDisplayName(item)}</h3>
          <p className="text-xs text-stone-500">{item.category}</p>
        </div>
      </div>

      {/* Insight Expectation Section */}
      {!isDepleted && (
        <div className="bg-purple-950/30 rounded border border-purple-800/50 p-3 space-y-3">
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
            <div className="flex items-center gap-2 p-2 bg-yellow-900/30 rounded border border-yellow-700/50">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">将触发顿悟!</span>
            </div>
          )}

          {/* Expected Gains */}
          <div className="space-y-2 text-xs">
            {/* Essence gain (always) */}
            <div className="flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1">
                <span className="text-purple-400">+{actualExtraction}</span>
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>精魄</span>
              </span>
              <span className="text-stone-500">(必得)</span>
            </div>

            {/* Range narrowing (if not locked) */}
            {!isValueLocked && (
              <div className="flex items-center justify-between">
                <span className="text-stone-400">
                  估价收窄 ~{Math.round(GAME_CONFIG.NIGHT.INSIGHT_RANGE_SHRINK_RATE * 100)}%
                </span>
                <span className="text-stone-500">(必得)</span>
              </div>
            )}

            {/* Trait discovery (if hidden traits exist) */}
            {hiddenTraitCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-stone-400">可能发现特征</span>
                <span className="text-stone-500">
                  ({Math.round(GAME_CONFIG.NIGHT.INSIGHT_TRAIT_DISCOVERY_CHANCE * 100)}%)
                </span>
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

          {/* Status messages */}
          {isValueLocked && !allTraitsRevealed && (
            <p className="text-[10px] text-stone-500 italic">
              估价已锁定，不再收窄
            </p>
          )}
          {allTraitsRevealed && !isValueLocked && (
            <p className="text-[10px] text-stone-500 italic">
              特征已全部发现
            </p>
          )}
          {fullyAppraised && (
            <p className="text-[10px] text-stone-500 italic">
              已完全鉴定，继续格物仅获取点数
            </p>
          )}

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

          {/* Cannot insight reason */}
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
// Insight Result Modal
// ============================================================================

interface InsightResultModalProps {
  result: {
    result: InsightResult;
    narrative: InsightNarrative;
  } | null;
  onClose: () => void;
}

const InsightResultModal: React.FC<InsightResultModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const isEpiphany = result.result.isEpiphany;

  return (
    <Modal
      isOpen={!!result}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-purple-300">
          {isEpiphany ? (
            <>
              <Sparkles className="w-5 h-5 text-yellow-400" />
              顿悟！
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
      <div className="bg-gradient-to-r from-purple-950/50 to-noir-300/50 p-6 rounded border border-purple-800">
        {/* Narrative */}
        <div className="space-y-3 mb-6 text-stone-300 text-sm italic">
          <p>{result.narrative.actionText}</p>
          <p>{result.narrative.discoveryText}</p>
          {result.narrative.epiphanyText && (
            <p className="text-yellow-300">{result.narrative.epiphanyText}</p>
          )}
        </div>

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
            精力已返还！
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-end mt-4">
        <Button onClick={onClose} className="px-6">
          确定
        </Button>
      </div>
    </Modal>
  );
};
