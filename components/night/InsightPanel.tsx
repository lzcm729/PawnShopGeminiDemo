/**
 * 格物面板 (Insight Panel)
 *
 * 夜间格物系统的UI组件，允许玩家研究库存物品获取精魄。
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useInsight } from '../../hooks/useInsight';
import { cn } from '../../lib/utils';
import { Item, ItemStatus } from '../../systems/items/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import {
  Sparkles,
  Zap,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { ESSENCE_DISPLAY_NAMES, ESSENCE_ICONS } from '../../systems/economy/essence';
import { InsightResult, InsightNarrative } from '../../systems/insight/types';

interface InsightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsightPanel: React.FC<InsightPanelProps> = ({ isOpen, onClose }) => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          格物 (Insight)
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

        {/* Item List */}
        <div className="space-y-4">
          {/* Can Insight */}
          {canInsightItems.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-stone-500 tracking-wider mb-2">
                可研究的物品 ({canInsightItems.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {canInsightItems.map(({ item, status, primaryEssence }) => (
                  <InsightItemCard
                    key={item.id}
                    item={item}
                    progress={status.progress}
                    nearEpiphany={status.nearEpiphany}
                    primaryEssence={primaryEssence}
                    canInsight={true}
                    isSelected={selectedItemId === item.id}
                    onSelect={() => setSelectedItemId(item.id)}
                    onInsight={() => handleInsight(item.id)}
                    isProcessing={isProcessing && selectedItemId === item.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cannot Insight */}
          {cannotInsightItems.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-stone-500 tracking-wider mb-2">
                无法研究 ({cannotInsightItems.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
                {cannotInsightItems.map(({ item, status, primaryEssence }) => (
                  <InsightItemCard
                    key={item.id}
                    item={item}
                    progress={status.progress}
                    nearEpiphany={false}
                    primaryEssence={primaryEssence}
                    canInsight={false}
                    reason={status.reason ? getReasonText(status.reason) : undefined}
                    isSelected={false}
                    onSelect={() => {}}
                    onInsight={() => {}}
                    isProcessing={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {insightableItems.length === 0 && (
            <div className="text-center py-12 text-stone-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>库存中没有可研究的物品</p>
            </div>
          )}
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
  progress: number;
  nearEpiphany: boolean;
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
  progress,
  nearEpiphany,
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

  const progressPercent = Math.round(progress * 100);
  const isDepleted = progress >= 1;

  return (
    <div
      className={cn(
        'bg-noir-200 border-l-4 p-3 rounded-r transition-all cursor-pointer',
        essenceColors[primaryEssence],
        isSelected && 'ring-1 ring-purple-500',
        !canInsight && 'cursor-not-allowed'
      )}
      onClick={canInsight ? onSelect : undefined}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 rounded">
          <CategoryIcon category={item.category} className="text-noir-txt-secondary w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-noir-txt-primary text-sm truncate">{item.name}</h4>

          {/* Progress Bar */}
          <div className="mt-2 h-2 bg-noir-400 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                isDepleted
                  ? 'bg-stone-500'
                  : nearEpiphany
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-purple-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Status Text */}
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-stone-500">
              {isDepleted ? (
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" /> 已研究透彻
                </span>
              ) : nearEpiphany ? (
                <span className="text-yellow-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 即将顿悟！
                </span>
              ) : (
                `已提取 ${progressPercent}%`
              )}
            </span>

            <span className="text-[10px] text-stone-600 flex items-center gap-1">
              {ESSENCE_ICONS[primaryEssence === 'BALANCED' ? 'CRAFT' : primaryEssence]}
              {primaryEssence === 'BALANCED' ? '均衡' : ESSENCE_DISPLAY_NAMES[primaryEssence]}
            </span>
          </div>

          {/* Reason for cannot insight */}
          {!canInsight && reason && (
            <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {reason}
            </div>
          )}
        </div>

        {/* Action */}
        {canInsight && isSelected && (
          <div className="flex items-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onInsight();
              }}
              disabled={isProcessing}
              className="h-8 px-3 text-xs bg-purple-900 hover:bg-purple-800 border-purple-700"
            >
              {isProcessing ? '...' : '格物'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
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
