/**
 * 工作台面板 (Workshop Panel)
 *
 * 夜间工作台系统的UI组件，允许玩家修复和重铸物品。
 *
 * S2-I1: 违约风险预警弹窗
 * S2-I2: 凝视时刻 UI
 * S2-I3: 互斥状态 UI 反馈
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { useWorkshop } from '../../hooks/useWorkshop';
import { useGame } from '../../store/GameContext';
import { cn } from '../../lib/utils';
import { ItemStatus } from '../../systems/items/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import { getItemIcon } from '../../systems/assets';
import {
  Wrench,
  Zap,
  Sparkles,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Hammer,
  Wand2,
  Eye,
  Lock,
  Clock,
  Star,
  Gift,
} from 'lucide-react';
import { ESSENCE_ICONS, EssenceCost } from '../../systems/economy/essence';
import { RecipeStatus, WorkshopResult, RestoreRecipe, ReforgeRecipe, InProgressRecipe, ViolationWarning, QualityOutcome, ReforgeQuality } from '../../systems/workshop/types';
import { getQualityDisplayName } from '../../systems/workshop/workshopLogic';
import { getDisplayName } from '../../systems/items/tagUtils';
import { getGazeConfig } from '../../systems/workshop/forgeryNotoriety';

interface WorkshopPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkshopPanel: React.FC<WorkshopPanelProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useGame();
  const {
    workshopableItems,
    essenceBalance,
    currentEnergy,
    maxEnergy,
    inProgressRecipes,
    doRestore,
    doReforge,
    advanceInProgressRecipe,
    getReasonText,
    getWarning,
  } = useWorkshop();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WorkshopResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // S2-I1: Violation warning state
  const [violationWarning, setViolationWarning] = useState<ViolationWarning | null>(null);
  const [pendingReforgeRecipeId, setPendingReforgeRecipeId] = useState<string | null>(null);
  // S2-I2: Gaze moment state (enhanced with notoriety-aware config)
  const [gazeState, setGazeState] = useState<{
    text: string;
    visible: boolean;
    skippable: boolean;
    durationMs: number;
  } | null>(null);
  const [pendingResult, setPendingResult] = useState<WorkshopResult | null>(null);

  // Auto-select item from pending selection when panel opens
  useEffect(() => {
    if (isOpen && state.pendingSelectedItemId) {
      const existsInWorkshop = workshopableItems.some(
        w => w.item.id === state.pendingSelectedItemId
      );
      if (existsInWorkshop) {
        setSelectedItemId(state.pendingSelectedItemId);
      }
      dispatch({ type: 'SET_PENDING_SELECTED_ITEM', payload: null });
    }
  }, [isOpen, state.pendingSelectedItemId, workshopableItems, dispatch]);

  const selectedItem = workshopableItems.find(w => w.item.id === selectedItemId);
  const restoreRecipe = selectedItem?.restoreRecipe;
  const reforgeRecipe = selectedItem?.reforgeRecipe;

  // Multi-night: check if selected item has an in-progress recipe
  const itemInProgress = selectedItemId
    ? inProgressRecipes.find(r => r.itemId === selectedItemId) ?? null
    : null;

  // S2-I3: Check mutual exclusion for display
  const isRestoreLocked = selectedItem?.item.workState === 'REFORGED';
  const isReforgeLocked = selectedItem?.item.workState === 'RESTORED';

  const handleRestore = () => {
    if (!selectedItemId || !restoreRecipe) return;
    setIsProcessing(true);
    const output = doRestore(selectedItemId, restoreRecipe.recipe.id);
    if (output?.success && output.result) {
      // S2-I2: Show gaze moment before result
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  const handleReforge = () => {
    if (!selectedItemId || !reforgeRecipe) return;

    // S2-I1: Check for violation warning
    const item = selectedItem?.item;
    if (item) {
      const warning = getWarning(item);
      if (warning) {
        setViolationWarning(warning);
        setPendingReforgeRecipeId(reforgeRecipe.recipe.id);
        return;
      }
    }

    executeReforge(reforgeRecipe.recipe.id);
  };

  const executeReforge = (recipeId: string) => {
    if (!selectedItemId) return;
    setIsProcessing(true);
    const output = doReforge(selectedItemId, recipeId);
    if (output?.success && output.result) {
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  // S2-I1: Confirm violation
  const handleViolationConfirm = () => {
    setViolationWarning(null);
    if (pendingReforgeRecipeId) {
      executeReforge(pendingReforgeRecipeId);
      setPendingReforgeRecipeId(null);
    }
  };

  const handleViolationCancel = () => {
    setViolationWarning(null);
    setPendingReforgeRecipeId(null);
  };

  // Multi-night: advance in-progress recipe
  const handleAdvance = () => {
    if (!selectedItemId) return;
    setIsProcessing(true);
    const output = advanceInProgressRecipe(selectedItemId);
    if (output?.success && output.result) {
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  // S2-I2: Gaze moment trigger (notoriety-aware for counterfeit operations)
  const triggerGaze = useCallback((result: WorkshopResult) => {
    // Determine gaze config based on operation type
    let durationMs = 4000;
    let skippable = true;

    if (result.isCounterfeit) {
      // Counterfeit gaze evolves with forgery notoriety (design doc §9.3)
      const gazeConfig = getGazeConfig(state.forgeryNotoriety.totalCounterfeitSales);
      durationMs = gazeConfig.seconds * 1000;
      skippable = gazeConfig.skippable;
    }

    setPendingResult(result);
    setGazeState({ text: result.narrative.gazeText, visible: false, skippable, durationMs });
    // Start fade-in after brief delay
    setTimeout(() => setGazeState(prev => prev ? { ...prev, visible: true } : null), 100);
    // Auto-close after duration
    setTimeout(() => {
      setGazeState(null);
      setPendingResult(null);
      setLastResult(result);
    }, durationMs);
  }, [state.forgeryNotoriety.totalCounterfeitSales]);

  // S2-I2: Click to skip gaze (only if skippable)
  const skipGaze = useCallback(() => {
    if (gazeState && gazeState.skippable) {
      setGazeState(null);
      if (pendingResult) {
        setLastResult(pendingResult);
        setPendingResult(null);
      }
    }
  }, [gazeState, pendingResult]);

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
          <HelpTooltip text="修复损坏物品或重铸提升价值。修复消除负面特征恢复估价，重铸增加正面特征。消耗精魄和精力。每件物品只能走修复或重铸路线之一。" />
        </span>
      }
      size="xl"
    >
      <div className="flex flex-col gap-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between bg-noir-300/50 p-4 rounded border border-noir-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-[10px] uppercase text-stone-500">精力</div>
                <div className="text-lg font-mono text-amber-400">
                  {currentEnergy} / {maxEnergy}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <EssenceDisplay type="CRAFT" amount={essenceBalance.craft} />
              <EssenceDisplay type="TIME" amount={essenceBalance.time} />
              <EssenceDisplay type="VIBE" amount={essenceBalance.vibe} />
            </div>
          </div>
        </div>

        {/* S2-I2: Gaze Moment Overlay */}
        {gazeState && (
          <GazeMoment
            text={gazeState.text}
            visible={gazeState.visible}
            skippable={gazeState.skippable}
            onSkip={skipGaze}
          />
        )}

        {/* S2-I1: Violation Warning Modal */}
        {violationWarning && (
          <ViolationWarningModal
            warning={violationWarning}
            onConfirm={handleViolationConfirm}
            onCancel={handleViolationCancel}
          />
        )}

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
              {workshopableItems.map(({ item, hasAnyOption, restoreCount }) => {
                const inProg = inProgressRecipes.find(r => r.itemId === item.id);
                return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={cn(
                    "w-full p-3 rounded border text-left transition-all",
                    selectedItemId === item.id
                      ? "border-amber-600 bg-amber-950/30"
                      : inProg
                        ? "border-amber-700/50 bg-amber-950/10 hover:bg-amber-950/20"
                        : "border-noir-400 bg-noir-200 hover:bg-noir-300",
                    !hasAnyOption && !inProg && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 overflow-hidden rounded">
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
                        <CategoryIcon category={item.category} className="w-5 h-5 text-stone-500" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate">{getDisplayName(item)}</span>
                        {inProg && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded border border-amber-700 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            工序中 {inProg.nightsCompleted}/{inProg.nightsRequired}
                          </span>
                        )}
                        {!inProg && restoreCount > 1 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700">
                            可修复 {restoreCount} 处
                          </span>
                        )}
                        {/* S2-I3: Show work state badges */}
                        {item.workState === 'RESTORED' && (
                          <span className="text-[9px] px-1 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700">
                            已修复
                          </span>
                        )}
                        {item.workState === 'REFORGED' && (
                          <span className="text-[9px] px-1 py-0.5 bg-purple-900/50 text-purple-300 rounded border border-purple-700">
                            已重铸
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {item.status === ItemStatus.FORFEIT ? '流当 (自有)' : '典当中'}
                      </div>
                    </div>
                    {inProg ? (
                      <Clock className="w-4 h-4 text-amber-500" />
                    ) : hasAnyOption ? (
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    ) : null}
                  </div>
                </button>
                );
              })}

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
                  <div className="w-12 h-12 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 overflow-hidden rounded">
                    <img
                      src={getItemIcon(selectedItem.item)}
                      alt={selectedItem.item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <div className="hidden items-center justify-center w-full h-full">
                      <CategoryIcon category={selectedItem.item.category} className="w-8 h-8 text-stone-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{getDisplayName(selectedItem.item)}</h3>
                      {selectedItem.item.workState === 'RESTORED' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700">
                          已选择修复路线
                        </span>
                      )}
                      {selectedItem.item.workState === 'REFORGED' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded border border-purple-700">
                          已选择重铸路线
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
                  {itemInProgress ? (
                    <InProgressCard
                      progress={itemInProgress}
                      onAdvance={handleAdvance}
                      isProcessing={isProcessing}
                      energyCost={reforgeRecipe?.recipe.energyCost ?? 0}
                      currentEnergy={currentEnergy}
                    />
                  ) : (
                    <>
                      {/* S2-I3: Show lock indicator for mutually excluded actions */}
                      {isRestoreLocked ? (
                        <LockedActionCard type="restore" reason="已选择重铸路线，不可修复" />
                      ) : (
                        <ActionCard
                          type="restore"
                          recipe={restoreRecipe?.recipe}
                          status={restoreRecipe?.status}
                          onApply={handleRestore}
                          isProcessing={isProcessing}
                          getReasonText={getReasonText}
                        />
                      )}

                      {isReforgeLocked ? (
                        <LockedActionCard type="reforge" reason="已选择修复路线，不可重铸" />
                      ) : (
                        <ActionCard
                          type="reforge"
                          recipe={reforgeRecipe?.recipe}
                          status={reforgeRecipe?.status}
                          onApply={handleReforge}
                          isProcessing={isProcessing}
                          getReasonText={getReasonText}
                        />
                      )}
                    </>
                  )}
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

// S2-I3: Locked action card for mutual exclusion
interface LockedActionCardProps {
  type: 'restore' | 'reforge';
  reason: string;
}

const LockedActionCard: React.FC<LockedActionCardProps> = ({ type, reason }) => {
  const isRestore = type === 'restore';
  return (
    <div className="p-4 rounded border border-noir-400 bg-noir-200/30 opacity-40">
      <div className="flex items-center gap-3">
        <Lock className="w-6 h-6 text-stone-600" />
        <div className="flex-1">
          <h4 className="font-bold text-stone-600">
            {isRestore ? '修复' : '重铸'}
          </h4>
          <p className="text-xs text-stone-600 mt-1">{reason}</p>
        </div>
      </div>
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
            {recipe.nightsRequired && recipe.nightsRequired > 1 && (
              <span className="ml-2 text-[10px] font-normal text-amber-400 inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                需要 {recipe.nightsRequired} 夜
              </span>
            )}
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

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-noir-400">
        <div className="text-[10px] text-stone-500 uppercase">成本:</div>
        <CostDisplay cost={status.actualCost} deficit={status.deficit} />
        <div className="text-[10px] text-stone-500 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {recipe.energyCost} 精力
        </div>
      </div>

      {'riskNote' in recipe && recipe.riskNote && (
        <div className="mt-2 text-[10px] text-amber-500/70 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {recipe.riskNote}
        </div>
      )}

      {/* Quality outcome probabilities for probabilistic recipes */}
      {status.isProbabilistic && status.qualityOutcomes && (
        <QualityOutcomesPreview outcomes={status.qualityOutcomes} />
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

  if (items.length === 0) {
    return <span className="text-xs text-stone-500">仅消耗精力</span>;
  }

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
// S2-I1: Violation Warning Modal
// ============================================================================

interface ViolationWarningModalProps {
  warning: ViolationWarning;
  onConfirm: () => void;
  onCancel: () => void;
}

const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({ warning, onConfirm, onCancel }) => {
  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={
        <span className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          违约风险
        </span>
      }
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-300">
          这件物品仍在当期内。重铸将改变其本质，客户赎回时将视为违约。
        </p>

        {/* 可预见后果 */}
        <div className="p-4 rounded border border-red-900/50 bg-red-950/20">
          <div className="text-[10px] uppercase text-red-400 mb-2">可预见后果</div>
          <div className="space-y-1.5 text-sm text-stone-300">
            <div>违约赔偿: <span className="text-red-400 font-mono">${warning.compensationAmount}</span> (当金 x200%)</div>
            <div>声誉损失: <span className="text-red-400">人情 {warning.reputationLoss.humanity}</span> / <span className="text-red-400">商誉 {warning.reputationLoss.credibility}</span></div>
            <div>客户关系: <span className="text-red-400">不可修复</span></div>
          </div>
        </div>

        {/* 商人直觉 */}
        <div className="p-4 rounded border border-amber-900/50 bg-amber-950/20">
          <div className="text-[10px] uppercase text-amber-400 mb-2">商人直觉</div>
          <p className="text-sm text-amber-200/80 italic">
            "{warning.intuitionText}"
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onCancel} className="px-4 bg-noir-300 hover:bg-noir-400 border-noir-500">
            放回去
          </Button>
          <Button onClick={onConfirm} className="px-4 bg-red-900 hover:bg-red-800 border-red-700">
            我知道后果，继续
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// S2-I2: Gaze Moment Overlay
// ============================================================================

interface GazeMomentProps {
  text: string;
  visible: boolean;
  skippable: boolean;
  onSkip: () => void;
}

const GazeMoment: React.FC<GazeMomentProps> = ({ text, visible, skippable, onSkip }) => {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80",
        skippable ? "cursor-pointer" : "cursor-default"
      )}
      onClick={skippable ? onSkip : undefined}
    >
      <div className="max-w-md text-center px-8">
        <Eye className="w-8 h-8 text-amber-400/40 mx-auto mb-6" />
        <p
          className={cn(
            "text-lg text-stone-300 italic leading-relaxed transition-opacity duration-1000",
            visible ? "opacity-100" : "opacity-0"
          )}
        >
          "{text}"
        </p>
        {skippable ? (
          <p className={cn(
            "text-[10px] text-stone-600 mt-8 transition-opacity duration-1000 delay-500",
            visible ? "opacity-100" : "opacity-0"
          )}>
            点击任意处跳过
          </p>
        ) : (
          <p className={cn(
            "text-[10px] text-stone-600/50 mt-8 transition-opacity duration-1000 delay-500",
            visible ? "opacity-100" : "opacity-0"
          )}>
            ......
          </p>
        )}
      </div>
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
  const quality = result.reforgeQuality;

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
          {quality && <QualityBadge quality={quality} />}
        </span>
      }
      size="md"
    >
      <div className={cn(
        "p-6 rounded border",
        isRestore
          ? "bg-gradient-to-r from-emerald-950/50 to-noir-300/50 border-emerald-800"
          : quality === 'MASTERWORK'
            ? "bg-gradient-to-r from-amber-950/50 to-purple-950/30 border-amber-700"
            : quality === 'FLAWED'
              ? "bg-gradient-to-r from-red-950/30 to-noir-300/50 border-red-900"
              : quality === 'FAILED'
                ? "bg-gradient-to-r from-stone-900/50 to-noir-300/50 border-stone-700"
                : "bg-gradient-to-r from-purple-950/50 to-noir-300/50 border-purple-800"
      )}>
        <div className="space-y-3 mb-6 text-stone-300 text-sm italic">
          <p>{result.narrative.actionText}</p>
          <p>{result.narrative.resultText}</p>
          {result.narrative.moralNote && (
            <p className="text-amber-300/80">{result.narrative.moralNote}</p>
          )}
        </div>

        {result.valueIncrease !== undefined && result.valueIncrease !== 0 && (
          <div className="text-sm text-stone-400 border-t border-noir-400 pt-4">
            物品价值: <span className={cn(
              "font-mono text-lg",
              result.valueIncrease > 0 ? "text-green-400" : "text-red-400"
            )}>
              {result.valueIncrease > 0 ? '+' : ''}{result.valueIncrease}
            </span>
            {quality && quality !== 'NORMAL' && result.qualityMultiplier && (
              <span className="text-[10px] text-stone-500 ml-2">
                (品质系数: x{result.qualityMultiplier.toFixed(1)})
              </span>
            )}
          </div>
        )}

        {/* Surprise Discovery */}
        {result.surpriseDiscovery && (
          <div className="mt-4 p-3 rounded border border-amber-700/50 bg-amber-950/20">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] uppercase text-amber-400 font-bold">意外发现</span>
            </div>
            <p className="text-sm text-amber-200/80 italic">
              {result.surpriseDiscovery.description}
            </p>
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded border border-amber-700">
              +{result.surpriseDiscovery.tag}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={onClose} className="px-6">
          确定
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// Multi-Night In-Progress Card
// ============================================================================

interface InProgressCardProps {
  progress: InProgressRecipe;
  onAdvance: () => void;
  isProcessing: boolean;
  energyCost: number;
  currentEnergy: number;
}

const InProgressCard: React.FC<InProgressCardProps> = ({
  progress,
  onAdvance,
  isProcessing,
  energyCost,
  currentEnergy,
}) => {
  const progressPercent = (progress.nightsCompleted / progress.nightsRequired) * 100;
  const canAdvance = currentEnergy >= energyCost;

  return (
    <div className="p-4 rounded border border-amber-800 bg-amber-950/20">
      <div className="flex items-center gap-3 mb-3">
        <Clock className="w-6 h-6 text-amber-400" />
        <div className="flex-1">
          <h4 className="font-bold text-amber-400">工序进行中</h4>
          <p className="text-xs text-stone-500 mt-0.5">
            第 {progress.nightsCompleted} 夜 / 共 {progress.nightsRequired} 夜
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-noir-400 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-amber-600 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[10px] text-stone-500 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {energyCost} 精力 (仅精力，精魄已在首夜扣除)
        </div>
        <Button
          onClick={onAdvance}
          disabled={isProcessing || !canAdvance}
          className="h-10 px-4 bg-amber-900 hover:bg-amber-800 border-amber-700"
        >
          {isProcessing ? '...' : '继续工序'}
        </Button>
      </div>

      {!canAdvance && (
        <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          精力不足，无法继续工序
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Quality Badge
// ============================================================================

interface QualityBadgeProps {
  quality: ReforgeQuality;
}

const QUALITY_STYLES: Record<ReforgeQuality, { bg: string; text: string; border: string }> = {
  MASTERWORK: { bg: 'bg-amber-900/60', text: 'text-amber-300', border: 'border-amber-600' },
  NORMAL: { bg: 'bg-stone-800/60', text: 'text-stone-300', border: 'border-stone-600' },
  FLAWED: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-800' },
  FAILED: { bg: 'bg-stone-900/60', text: 'text-stone-500', border: 'border-stone-700' },
};

const QualityBadge: React.FC<QualityBadgeProps> = ({ quality }) => {
  const style = QUALITY_STYLES[quality];
  return (
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded border font-bold inline-flex items-center gap-1",
      style.bg, style.text, style.border
    )}>
      {quality === 'MASTERWORK' && <Star className="w-3 h-3" />}
      {getQualityDisplayName(quality)}
    </span>
  );
};

// ============================================================================
// Quality Outcomes Preview (for probabilistic recipes)
// ============================================================================

interface QualityOutcomesPreviewProps {
  outcomes: QualityOutcome[];
}

const QualityOutcomesPreview: React.FC<QualityOutcomesPreviewProps> = ({ outcomes }) => {
  return (
    <div className="mt-3 pt-3 border-t border-noir-400">
      <div className="text-[10px] text-stone-500 uppercase mb-2">品质概率</div>
      <div className="flex gap-2">
        {outcomes.map(({ quality, probability, valueMultiplier }) => {
          const style = QUALITY_STYLES[quality];
          return (
            <div
              key={quality}
              className={cn(
                "flex-1 p-2 rounded border text-center",
                style.bg, style.border
              )}
            >
              <div className={cn("text-[10px] font-bold", style.text)}>
                {getQualityDisplayName(quality)}
              </div>
              <div className="text-xs font-mono text-stone-400 mt-0.5">
                {Math.round(probability * 100)}%
              </div>
              <div className={cn("text-[10px] mt-0.5", valueMultiplier >= 1 ? "text-green-500" : "text-red-400")}>
                x{valueMultiplier.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
