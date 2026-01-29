/**
 * 工作台面板 (Workshop Panel)
 *
 * 夜间工作台系统的UI组件，允许玩家修复和重铸物品。
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkshop } from '../../hooks/useWorkshop';
import { cn } from '../../lib/utils';
import { ItemStatus } from '../../systems/items/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import {
  Wrench,
  Zap,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Hammer,
  Wand2,
} from 'lucide-react';
import { ESSENCE_ICONS, EssenceCost } from '../../systems/economy/essence';
import { RecipeStatus, WorkshopResult, RestoreRecipe, ReforgeRecipe } from '../../systems/workshop/types';

interface WorkshopPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkshopPanel: React.FC<WorkshopPanelProps> = ({ isOpen, onClose }) => {
  const {
    workshopableItems,
    essenceBalance,
    currentEnergy,
    maxEnergy,
    doRestore,
    doReforge,
    getReasonText,
  } = useWorkshop();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WorkshopResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedItem = workshopableItems.find(w => w.item.id === selectedItemId);

  // 该物品唯一的修复和重铸配方（由物品属性决定）
  const restoreRecipe = selectedItem?.restoreRecipe;
  const reforgeRecipe = selectedItem?.reforgeRecipe;

  const handleRestore = () => {
    if (!selectedItemId || !restoreRecipe) return;
    setIsProcessing(true);
    const output = doRestore(selectedItemId, restoreRecipe.recipe.id);
    if (output?.success && output.result) {
      setLastResult(output.result);
    }
    setIsProcessing(false);
  };

  const handleReforge = () => {
    if (!selectedItemId || !reforgeRecipe) return;
    setIsProcessing(true);
    const output = doReforge(selectedItemId, reforgeRecipe.recipe.id);
    if (output?.success && output.result) {
      setLastResult(output.result);
    }
    setIsProcessing(false);
  };

  const clearResult = () => {
    setLastResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          工作台 (Workshop)
        </span>
      }
      size="xl"
    >
      <div className="flex flex-col gap-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between bg-noir-300/50 p-4 rounded border border-noir-400">
          <div className="flex items-center gap-6">
            {/* Energy */}
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-[10px] uppercase text-stone-500">精力</div>
                <div className="text-lg font-mono text-amber-400">
                  {currentEnergy} / {maxEnergy}
                </div>
              </div>
            </div>

            {/* Essence Balance */}
            <div className="flex items-center gap-4">
              <EssenceDisplay type="CRAFT" amount={essenceBalance.craft} />
              <EssenceDisplay type="TIME" amount={essenceBalance.time} />
              <EssenceDisplay type="VIBE" amount={essenceBalance.vibe} />
            </div>
          </div>
        </div>

        {/* Result Modal */}
        <WorkshopResultModal result={lastResult} onClose={clearResult} />

        {/* Main Content: Split View */}
        <div className="grid grid-cols-3 gap-6 min-h-[400px]">
          {/* Left: Item List */}
          <div className="col-span-1 border-r border-noir-400 pr-4">
            <h4 className="text-xs uppercase text-stone-500 tracking-wider mb-3">
              库存物品 ({workshopableItems.length})
            </h4>
            <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
              {workshopableItems.map(({ item, hasAnyOption }) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={cn(
                    "w-full p-3 rounded border text-left transition-all",
                    selectedItemId === item.id
                      ? "border-amber-600 bg-amber-950/30"
                      : "border-noir-400 bg-noir-200 hover:bg-noir-300",
                    !hasAnyOption && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={item.category} className="w-5 h-5 text-stone-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate">{item.name}</span>
                        {item.wasReforged && (
                          <span className="text-[9px] px-1 py-0.5 bg-purple-900/50 text-purple-300 rounded border border-purple-700">
                            已重铸
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {item.status === ItemStatus.FORFEIT ? '流当 (自有)' : '典当中'}
                      </div>
                    </div>
                    {hasAnyOption && <Sparkles className="w-4 h-4 text-amber-500" />}
                  </div>
                </button>
              ))}

              {workshopableItems.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">库存为空</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action Panel */}
          <div className="col-span-2">
            {selectedItem ? (
              <div>
                {/* Item Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-noir-400">
                  <CategoryIcon category={selectedItem.item.category} className="w-8 h-8 text-stone-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{selectedItem.item.name}</h3>
                      {selectedItem.item.wasReforged && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded border border-purple-700">
                          已重铸
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {selectedItem.item.tags?.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-noir-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {/* Restore Action - 始终显示 */}
                  <ActionCard
                    type="restore"
                    recipe={restoreRecipe?.recipe}
                    status={restoreRecipe?.status}
                    onApply={handleRestore}
                    isProcessing={isProcessing}
                    getReasonText={getReasonText}
                  />

                  {/* Reforge Action - 始终显示 */}
                  <ActionCard
                    type="reforge"
                    recipe={reforgeRecipe?.recipe}
                    status={reforgeRecipe?.status}
                    onApply={handleReforge}
                    isProcessing={isProcessing}
                    getReasonText={getReasonText}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500">
                <div className="text-center">
                  <ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>选择一件物品开始</p>
                </div>
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

interface EssenceDisplayProps {
  type: 'CRAFT' | 'TIME' | 'VIBE';
  amount: number;
}

const EssenceDisplay: React.FC<EssenceDisplayProps> = ({ type, amount }) => {
  return (
    <div className="flex items-center gap-1">
      <span>{ESSENCE_ICONS[type]}</span>
      <span className="font-mono text-sm text-stone-300">{amount}</span>
    </div>
  );
};

interface ActionCardProps {
  type: 'restore' | 'reforge';
  recipe?: RestoreRecipe | ReforgeRecipe;
  status?: RecipeStatus;
  onApply: () => void;
  isProcessing: boolean;
  getReasonText: (reason: string) => string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  type,
  recipe,
  status,
  onApply,
  isProcessing,
  getReasonText,
}) => {
  const isRestore = type === 'restore';
  const canApply = status?.canApply ?? false;

  // 如果物品没有匹配的配方，显示禁用状态
  if (!recipe || !status) {
    return (
      <div className="p-4 rounded border border-noir-400 bg-noir-200/50 opacity-50">
        <div className="flex items-center gap-3">
          {isRestore ? (
            <Hammer className="w-6 h-6 text-stone-500" />
          ) : (
            <Wand2 className="w-6 h-6 text-stone-500" />
          )}
          <div className="flex-1">
            <h4 className="font-bold text-stone-500">
              {isRestore ? '修复' : '重铸'}
            </h4>
            <p className="text-xs text-stone-600 mt-1">
              {isRestore ? '物品没有需要修复的状态' : '物品不适合重铸'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 有配方但条件不满足时，显示原因
  if (!canApply) {
    return (
      <div className="p-4 rounded border border-noir-400 bg-noir-200/50">
        <div className="flex items-center gap-3">
          {isRestore ? (
            <Hammer className="w-6 h-6 text-stone-500" />
          ) : (
            <Wand2 className="w-6 h-6 text-stone-500" />
          )}
          <div className="flex-1">
            <h4 className="font-bold text-stone-500">{recipe.name}</h4>
            <p className="text-xs text-stone-600 mt-1">{recipe.description}</p>
          </div>
          <div className="text-xs text-red-400">
            {status.reason && getReasonText(status.reason)}
          </div>
        </div>

        {/* Cost Display (show what's needed) */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-noir-400">
          <div className="text-[10px] text-stone-500 uppercase">成本:</div>
          <CostDisplay cost={status.actualCost} deficit={status.deficit} />
          <div className="text-[10px] text-stone-500 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {recipe.energyCost} 精力
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded border bg-noir-200 transition-all",
        isRestore
          ? "border-emerald-800 hover:border-emerald-600"
          : "border-purple-800 hover:border-purple-600"
      )}
    >
      <div className="flex items-center gap-3">
        {isRestore ? (
          <Hammer className="w-6 h-6 text-emerald-400" />
        ) : (
          <Wand2 className="w-6 h-6 text-purple-400" />
        )}

        <div className="flex-1">
          <h4 className={cn(
            "font-bold",
            isRestore ? "text-emerald-400" : "text-purple-400"
          )}>
            {recipe.name}
          </h4>
          <p className="text-xs text-stone-500 mt-1">{recipe.description}</p>
        </div>

        <Button
          onClick={onApply}
          disabled={isProcessing || !canApply}
          className={cn(
            "h-10 px-4",
            isRestore
              ? "bg-emerald-900 hover:bg-emerald-800 border-emerald-700"
              : "bg-purple-900 hover:bg-purple-800 border-purple-700"
          )}
        >
          {isProcessing ? '...' : '执行'}
        </Button>
      </div>

      {/* Cost Display */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-noir-400">
        <div className="text-[10px] text-stone-500 uppercase">成本:</div>
        <CostDisplay cost={status.actualCost} deficit={status.deficit} />
        <div className="text-[10px] text-stone-500 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {recipe.energyCost} 精力
        </div>
      </div>

      {/* Risk Note (for reforge) */}
      {'riskNote' in recipe && recipe.riskNote && (
        <div className="mt-2 text-[10px] text-amber-500/70 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {recipe.riskNote}
        </div>
      )}
    </div>
  );
};

interface CostDisplayProps {
  cost: EssenceCost;
  deficit?: EssenceCost;
}

const CostDisplay: React.FC<CostDisplayProps> = ({ cost, deficit }) => {
  const items: Array<{ type: 'CRAFT' | 'TIME' | 'VIBE'; amount: number; missing: number }> = [];

  if (cost.craft) items.push({ type: 'CRAFT', amount: cost.craft, missing: deficit?.craft || 0 });
  if (cost.time) items.push({ type: 'TIME', amount: cost.time, missing: deficit?.time || 0 });
  if (cost.vibe) items.push({ type: 'VIBE', amount: cost.vibe, missing: deficit?.vibe || 0 });

  return (
    <div className="flex items-center gap-3">
      {items.map(({ type, amount, missing }) => (
        <div key={type} className="flex items-center gap-1">
          <span className="text-sm">{ESSENCE_ICONS[type]}</span>
          <span className={cn("text-xs font-mono", missing > 0 ? "text-red-400" : "text-stone-300")}>
            {amount}
            {missing > 0 && <span className="text-[10px]"> (-{missing})</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Workshop Result Modal
// ============================================================================

interface WorkshopResultModalProps {
  result: WorkshopResult | null;
  onClose: () => void;
}

const WorkshopResultModal: React.FC<WorkshopResultModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const isRestore = result.type === 'RESTORE';

  return (
    <Modal
      isOpen={!!result}
      onClose={onClose}
      title={
        <span className={cn(
          "flex items-center gap-2",
          isRestore ? "text-emerald-300" : "text-purple-300"
        )}>
          {isRestore ? (
            <>
              <Hammer className="w-5 h-5" />
              修复完成
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              重铸完成
            </>
          )}
        </span>
      }
      size="md"
    >
      <div className={cn(
        "p-6 rounded border",
        isRestore
          ? "bg-gradient-to-r from-emerald-950/50 to-noir-300/50 border-emerald-800"
          : "bg-gradient-to-r from-purple-950/50 to-noir-300/50 border-purple-800"
      )}>
        {/* Narrative */}
        <div className="space-y-3 mb-6 text-stone-300 text-sm italic">
          <p>{result.narrative.actionText}</p>
          <p>{result.narrative.resultText}</p>
          {result.narrative.moralNote && (
            <p className="text-amber-300/80">{result.narrative.moralNote}</p>
          )}
        </div>

        {/* Value Change */}
        {result.newValue !== undefined && (
          <div className="text-sm text-stone-400 border-t border-noir-400 pt-4">
            物品新价值: <span className="text-green-400 font-mono text-lg">${result.newValue}</span>
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
