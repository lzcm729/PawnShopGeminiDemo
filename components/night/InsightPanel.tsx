/**
 * Insight Panel
 *
 * Night phase UI for studying inventory items to extract essence.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { useInsight } from '../../hooks/useInsight';
import { useGame } from '../../store/GameContext';
import {
  Zap,
  BookOpen,
  Eye,
} from 'lucide-react';
import { InsightResult, InsightNarrative } from '../../systems/insight/types';

import { InsightItemCard } from './insight/InsightItemCard';
import { ItemDetailPanel } from './insight/ItemDetailPanel';
import { InsightResultModal } from './insight/InsightResultModal';

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

        {/* Essence Type Legend */}
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
