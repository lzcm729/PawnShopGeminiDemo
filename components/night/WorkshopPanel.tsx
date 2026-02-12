/**
 * 工作台面板 (Workshop Panel)
 *
 * 夜间工作台系统的UI组件，允许玩家修复、伪造和重铸物品。
 * 三路线：手(修复) / 眼(伪造) / 心(重铸)
 *
 * v2.0: 三路线重构
 * - 三列布局：手/眼/心
 * - 伪造违约弹窗（比重铸更严厉）
 * - 伪造凝视时刻（首次5秒不可跳过）
 * - 三向互斥锁定
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Heart,
  Lock,
  Clock,
  Star,
  Gift,
  Hand,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import { ESSENCE_ICONS, EssenceCost } from '../../systems/economy/essence';
import {
  RecipeStatus,
  WorkshopResult,
  RestoreRecipe,
  CounterfeitRecipe,
  ReforgeRecipe,
  InProgressRecipe,
  ViolationWarning,
  QualityOutcome,
  ReforgeQuality,
  RecipeType,
} from '../../systems/workshop/types';
import { getQualityDisplayName } from '../../systems/workshop/workshopLogic';
import { getDisplayName } from '../../systems/items/tagUtils';
import { getGazeConfig } from '../../systems/workshop/forgeryNotoriety';
import {
  calculatePerceptionTier,
  calculateEmotionalWeight,
  getScaffoldingPhase,
  shouldShowScaffolding,
} from '../../systems/workshop';
import type { PerceptionTier, EmotionalWeight } from '../../systems/workshop';
import { createTextRegistry, TextRegistry } from '../../systems/utils/textRegistry';
import intuitionCSV from '../../assets/data/texts/workshop_intuition.csv?raw';
import trainingCSV from '../../assets/data/texts/workshop_training.csv?raw';

// ============================================================================
// Text registries (loaded once from CSV)
// ============================================================================

let intuitionTexts: TextRegistry | null = null;
function getIntuitionTexts(): TextRegistry {
  if (!intuitionTexts) {
    intuitionTexts = createTextRegistry('workshop_intuition', intuitionCSV);
  }
  return intuitionTexts;
}

let trainingTexts: TextRegistry | null = null;
function getTrainingTexts(): TextRegistry {
  if (!trainingTexts) {
    trainingTexts = createTextRegistry('workshop_training', trainingCSV);
  }
  return trainingTexts;
}

// ============================================================================
// Route theme config
// ============================================================================

type RouteType = 'restore' | 'counterfeit' | 'reforge';

interface RouteTheme {
  label: string;
  symbol: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  colorActive: string;
  colorBorder: string;
  colorBorderHover: string;
  colorBg: string;
  btnBg: string;
  btnBgHover: string;
  btnBorder: string;
  noRecipeMsg: string;
  lockedByRestore: string;
  lockedByCounterfeit: string;
  lockedByReforge: string;
}

const ROUTE_THEMES: Record<RouteType, RouteTheme> = {
  restore: {
    label: '修复',
    symbol: '手',
    subtitle: '恢复原貌',
    icon: Hand,
    color: 'text-emerald-400',
    colorActive: 'text-emerald-300',
    colorBorder: 'border-emerald-800',
    colorBorderHover: 'hover:border-emerald-600',
    colorBg: 'bg-emerald-950/30',
    btnBg: 'bg-emerald-900',
    btnBgHover: 'hover:bg-emerald-800',
    btnBorder: 'border-emerald-700',
    noRecipeMsg: '物品没有需要修复的状态',
    lockedByRestore: '',
    lockedByCounterfeit: '已选择伪造路线，不可修复',
    lockedByReforge: '已选择重铸路线，不可修复',
  },
  counterfeit: {
    label: '伪造',
    symbol: '眼',
    subtitle: '制造谎言',
    icon: Eye,
    color: 'text-rose-400',
    colorActive: 'text-rose-300',
    colorBorder: 'border-rose-800',
    colorBorderHover: 'hover:border-rose-600',
    colorBg: 'bg-rose-950/30',
    btnBg: 'bg-rose-900',
    btnBgHover: 'hover:bg-rose-800',
    btnBorder: 'border-rose-700',
    noRecipeMsg: '物品不适合伪造',
    lockedByRestore: '已选择修复路线，不可伪造',
    lockedByCounterfeit: '',
    lockedByReforge: '已选择重铸路线，不可伪造',
  },
  reforge: {
    label: '重铸',
    symbol: '心',
    subtitle: '改变本质',
    icon: Heart,
    color: 'text-purple-400',
    colorActive: 'text-purple-300',
    colorBorder: 'border-purple-800',
    colorBorderHover: 'hover:border-purple-600',
    colorBg: 'bg-purple-950/30',
    btnBg: 'bg-purple-900',
    btnBgHover: 'hover:bg-purple-800',
    btnBorder: 'border-purple-700',
    noRecipeMsg: '物品不适合重铸',
    lockedByRestore: '已选择修复路线，不可重铸',
    lockedByCounterfeit: '已选择伪造路线，不可重铸',
    lockedByReforge: '',
  },
};

// Map WorkState to lock reason key
function getLockReason(route: RouteType, workState?: string): string | null {
  if (!workState || workState === 'DEFAULT') return null;
  if (workState === 'RESTORED' && route !== 'restore') return `lockedByRestore`;
  if (workState === 'FORGED' && route !== 'counterfeit') return `lockedByCounterfeit`;
  if (workState === 'REFORGED' && route !== 'reforge') return `lockedByReforge`;
  return null;
}

// ============================================================================
// Main Panel
// ============================================================================

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
    doCounterfeit,
    doReforge,
    advanceInProgressRecipe,
    getReasonText,
    getWarning,
    getCounterfeitWarning,
    getConfirmation,
  } = useWorkshop();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WorkshopResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Violation warning state (used by both counterfeit and reforge)
  const [violationWarning, setViolationWarning] = useState<ViolationWarning | null>(null);
  const [violationRoute, setViolationRoute] = useState<RouteType | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  // Reputation micro-feedback animation state
  const [repFeedback, setRepFeedback] = useState<{ humanity?: number; credibility?: number; innocence?: number } | null>(null);
  // #63: Route confirmation dialog state (first-time route selection)
  const [routeConfirmation, setRouteConfirmation] = useState<{
    text: string;
    route: RecipeType;
    riskLevel: 'low' | 'medium' | 'high';
    recipeId: string;
  } | null>(null);
  // Training monologue state (invisible scaffolding)
  const [trainingText, setTrainingText] = useState<string | null>(null);
  // Gaze moment state (notoriety-aware)
  const [gazeState, setGazeState] = useState<{
    text: string;
    visible: boolean;
    isCounterfeit: boolean;
    skippable: boolean;
    durationMs: number;
  } | null>(null);
  const [pendingResult, setPendingResult] = useState<WorkshopResult | null>(null);

  // Auto-dismiss reputation micro-feedback after 3 seconds
  useEffect(() => {
    if (!repFeedback) return;
    const timer = setTimeout(() => setRepFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [repFeedback]);

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

  // Compute perception tier and emotional weight for the selected item
  const selectedPerceptionTier: PerceptionTier | null = selectedItem
    ? calculatePerceptionTier(selectedItem.item)
    : null;
  const selectedEmotionalWeight: EmotionalWeight | null = selectedItem
    ? calculateEmotionalWeight(selectedItem.item).weight
    : null;

  // Multi-night: check if selected item has an in-progress recipe
  const itemInProgress = selectedItemId
    ? inProgressRecipes.find(r => r.itemId === selectedItemId) ?? null
    : null;

  // Show training monologue when item is selected (scaffolding)
  useEffect(() => {
    if (!selectedItemId || !isOpen) return;
    if (!shouldShowScaffolding(state.workshopUsageCount)) {
      setTrainingText(null);
      return;
    }
    const phase = getScaffoldingPhase(state.workshopUsageCount);
    const text = getTrainingTexts().getRandom(`training:${phase}`);
    if (text) {
      setTrainingText(text);
      const timer = setTimeout(() => setTrainingText(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [selectedItemId, isOpen, state.workshopUsageCount]);

  // ========== Handlers ==========

  // Helper: dispatch workshop usage increment + optional rep feedback
  const afterWorkshopAction = useCallback((result: WorkshopResult) => {
    dispatch({ type: 'INCREMENT_WORKSHOP_USAGE' });
  }, [dispatch]);

  const handleRestore = () => {
    const recipe = selectedItem?.restoreRecipe;
    if (!selectedItemId || !recipe) return;

    // #63: Route confirmation for first-time route selection
    const item = selectedItem?.item;
    if (item) {
      const confirmation = getConfirmation('RESTORE', item);
      if (confirmation) {
        setRouteConfirmation({ text: confirmation.text, route: confirmation.route, riskLevel: confirmation.riskLevel, recipeId: recipe.recipe.id });
        return;
      }
    }

    executeRestore(recipe.recipe.id);
  };

  const executeRestore = (recipeId: string) => {
    if (!selectedItemId) return;
    setIsProcessing(true);
    const output = doRestore(selectedItemId, recipeId);
    if (output?.success && output.result) {
      afterWorkshopAction(output.result);
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  const handleCounterfeit = () => {
    const recipe = selectedItem?.counterfeitRecipe;
    if (!selectedItemId || !recipe) return;

    // #63: Route confirmation for first-time route selection
    const item = selectedItem?.item;
    if (item) {
      const confirmation = getConfirmation('COUNTERFEIT', item);
      if (confirmation) {
        setRouteConfirmation({ text: confirmation.text, route: confirmation.route, riskLevel: confirmation.riskLevel, recipeId: recipe.recipe.id });
        return;
      }
    }

    // Check for counterfeit violation warning (active items)
    if (item) {
      const warning = getCounterfeitWarning(item);
      if (warning) {
        setViolationWarning(warning);
        setViolationRoute('counterfeit');
        setPendingRecipeId(recipe.recipe.id);
        return;
      }
    }

    executeCounterfeit(recipe.recipe.id);
  };

  const executeCounterfeit = (recipeId: string) => {
    if (!selectedItemId) return;
    setIsProcessing(true);
    const output = doCounterfeit(selectedItemId, recipeId);
    if (output?.success && output.result) {
      afterWorkshopAction(output.result);
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  const handleReforge = () => {
    const recipe = selectedItem?.reforgeRecipe;
    if (!selectedItemId || !recipe) return;

    // #63: Route confirmation for first-time route selection
    const item = selectedItem?.item;
    if (item) {
      const confirmation = getConfirmation('REFORGE', item);
      if (confirmation) {
        setRouteConfirmation({ text: confirmation.text, route: confirmation.route, riskLevel: confirmation.riskLevel, recipeId: recipe.recipe.id });
        return;
      }
    }

    // Check for reforge violation warning (active items)
    if (item) {
      const warning = getWarning(item);
      if (warning) {
        setViolationWarning(warning);
        setViolationRoute('reforge');
        setPendingRecipeId(recipe.recipe.id);
        return;
      }
    }

    executeReforge(recipe.recipe.id);
  };

  const executeReforge = (recipeId: string) => {
    if (!selectedItemId) return;
    setIsProcessing(true);
    const output = doReforge(selectedItemId, recipeId);
    if (output?.success && output.result) {
      afterWorkshopAction(output.result);
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  // Confirm violation (both counterfeit and reforge)
  const handleViolationConfirm = () => {
    const route = violationRoute;
    const recipeId = pendingRecipeId;
    // Capture predicted reputation loss before clearing warning
    const repLoss = violationWarning?.reputationLoss;
    setViolationWarning(null);
    setViolationRoute(null);
    setPendingRecipeId(null);

    if (!recipeId) return;

    // Show predicted reputation risk as micro-feedback
    if (repLoss && (repLoss.humanity !== 0 || repLoss.credibility !== 0 || (repLoss.innocence != null && repLoss.innocence !== 0))) {
      setRepFeedback({
        humanity: repLoss.humanity || undefined,
        credibility: repLoss.credibility || undefined,
        innocence: repLoss.innocence ?? undefined,
      });
    }

    if (route === 'counterfeit') {
      executeCounterfeit(recipeId);
    } else if (route === 'reforge') {
      executeReforge(recipeId);
    }
  };

  const handleViolationCancel = () => {
    setViolationWarning(null);
    setViolationRoute(null);
    setPendingRecipeId(null);
  };

  // #63: Route confirmation handlers
  const handleRouteConfirm = () => {
    if (!routeConfirmation) return;
    const { route, recipeId } = routeConfirmation;
    setRouteConfirmation(null);

    // After confirmation, proceed to the regular flow (which may also trigger violation warning)
    const item = selectedItem?.item;
    if (route === 'RESTORE') {
      executeRestore(recipeId);
    } else if (route === 'COUNTERFEIT') {
      if (item) {
        const warning = getCounterfeitWarning(item);
        if (warning) {
          setViolationWarning(warning);
          setViolationRoute('counterfeit');
          setPendingRecipeId(recipeId);
          return;
        }
      }
      executeCounterfeit(recipeId);
    } else if (route === 'REFORGE') {
      if (item) {
        const warning = getWarning(item);
        if (warning) {
          setViolationWarning(warning);
          setViolationRoute('reforge');
          setPendingRecipeId(recipeId);
          return;
        }
      }
      executeReforge(recipeId);
    }
  };

  const handleRouteConfirmCancel = () => {
    setRouteConfirmation(null);
  };

  // Multi-night: advance in-progress recipe
  const handleAdvance = () => {
    if (!selectedItemId) return;
    setIsProcessing(true);
    const output = advanceInProgressRecipe(selectedItemId);
    if (output?.success && output.result) {
      afterWorkshopAction(output.result);
      triggerGaze(output.result);
    }
    setIsProcessing(false);
  };

  // Gaze moment trigger (notoriety-aware for counterfeit operations)
  const triggerGaze = useCallback((result: WorkshopResult) => {
    // Determine gaze config based on operation type
    let durationMs = 4000;
    let skippable = true;
    const isCounterfeit = result.isCounterfeit ?? false;

    if (isCounterfeit) {
      // Counterfeit gaze evolves with forgery notoriety (design doc §9.3)
      const gazeConfig = getGazeConfig(state.forgeryNotoriety.totalCounterfeitSales);
      durationMs = gazeConfig.seconds * 1000;
      skippable = gazeConfig.skippable;
    }

    setPendingResult(result);
    setGazeState({ text: result.narrative.gazeText, visible: false, isCounterfeit, skippable, durationMs });
    // Start fade-in after brief delay
    setTimeout(() => setGazeState(prev => prev ? { ...prev, visible: true } : null), 100);
    // Auto-close after duration
    setTimeout(() => {
      setGazeState(null);
      setPendingResult(null);
      setLastResult(result);
    }, durationMs);
  }, [state.forgeryNotoriety.totalCounterfeitSales]);

  // Click to skip gaze (only if skippable)
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
          <HelpTooltip text="修复、伪造或重铸物品。每件物品只能走三条路线之一，选择后不可更改。修复恢复原貌(手)，伪造制造谎言(眼)，重铸改变本质(心)。" />
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

        {/* Gaze Moment Overlay */}
        {gazeState && (
          <GazeMoment
            text={gazeState.text}
            visible={gazeState.visible}
            skippable={gazeState.skippable}
            isCounterfeit={gazeState.isCounterfeit}
            onSkip={skipGaze}
          />
        )}

        {/* Violation Warning Modal (perception-tier-aware) */}
        {violationWarning && violationRoute && (
          <ViolationWarningModal
            warning={violationWarning}
            route={violationRoute}
            perceptionTier={selectedPerceptionTier || 'blind'}
            emotionalWeight={selectedEmotionalWeight || 'unknown'}
            onConfirm={handleViolationConfirm}
            onCancel={handleViolationCancel}
          />
        )}

        {/* #63: Route Confirmation Dialog (first-time route selection) */}
        {routeConfirmation && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
              "max-w-md w-full p-6 rounded-lg border shadow-2xl",
              routeConfirmation.riskLevel === 'high'
                ? "bg-red-950/90 border-red-800/60"
                : routeConfirmation.riskLevel === 'medium'
                ? "bg-amber-950/90 border-amber-800/60"
                : "bg-stone-900/90 border-stone-700/60"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className={cn(
                  "w-5 h-5",
                  routeConfirmation.riskLevel === 'high' ? "text-red-400" :
                  routeConfirmation.riskLevel === 'medium' ? "text-amber-400" : "text-stone-400"
                )} />
                <h3 className="font-bold text-sm text-stone-200">
                  {routeConfirmation.route === 'RESTORE' ? '修复确认' :
                   routeConfirmation.route === 'COUNTERFEIT' ? '伪造确认' : '重铸确认'}
                </h3>
              </div>
              <p className="text-sm text-stone-300 font-serif italic leading-relaxed mb-6">
                "{routeConfirmation.text}"
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleRouteConfirmCancel}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 border-stone-600"
                >
                  再想想
                </Button>
                <Button
                  onClick={handleRouteConfirm}
                  className={cn(
                    "flex-1",
                    routeConfirmation.riskLevel === 'high'
                      ? "bg-red-900 hover:bg-red-800 border-red-700"
                      : routeConfirmation.riskLevel === 'medium'
                      ? "bg-amber-900 hover:bg-amber-800 border-amber-700"
                      : "bg-emerald-900 hover:bg-emerald-800 border-emerald-700"
                  )}
                >
                  {routeConfirmation.route === 'REFORGE' ? '按我的判断来' : '确认'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reputation Micro-Feedback (predicted risk from violation) */}
        {repFeedback && (
          <RepFeedbackOverlay feedback={repFeedback} />
        )}

        {/* Training Monologue (invisible scaffolding - I10) */}
        {trainingText && (
          <TrainingMonologue text={trainingText} onDismiss={() => setTrainingText(null)} />
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
                        {!inProg && restoreCount > 1 && !item.workState && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700">
                            可修复 {restoreCount} 处
                          </span>
                        )}
                        {/* Work state badges */}
                        {item.workState === 'RESTORED' && (
                          <span className="text-[9px] px-1 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700">
                            已修复
                          </span>
                        )}
                        {item.workState === 'FORGED' && (
                          <span className="text-[9px] px-1 py-0.5 bg-rose-900/50 text-rose-300 rounded border border-rose-700">
                            已伪造
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
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-noir-400">
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
                      <WorkStateBadge workState={selectedItem.item.workState} />
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

                {/* Mutual exclusion warning */}
                {selectedItem.item.workState && selectedItem.item.workState !== 'DEFAULT' && (
                  <div className="mb-3 px-3 py-2 rounded border border-noir-400 bg-noir-300/30">
                    <p className="text-[10px] text-stone-500 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      每件物品只能选择一条路线，选择后不可更改。
                    </p>
                  </div>
                )}

                {/* Action Cards */}
                <div className="space-y-3">
                  {itemInProgress ? (
                    <InProgressCard
                      progress={itemInProgress}
                      onAdvance={handleAdvance}
                      isProcessing={isProcessing}
                      energyCost={
                        selectedItem.reforgeRecipe?.recipe.energyCost
                        ?? selectedItem.counterfeitRecipe?.recipe.energyCost
                        ?? 0
                      }
                      currentEnergy={currentEnergy}
                    />
                  ) : (
                    <ThreeRouteDisplay
                      selectedItem={selectedItem}
                      isProcessing={isProcessing}
                      onRestore={handleRestore}
                      onCounterfeit={handleCounterfeit}
                      onReforge={handleReforge}
                      getReasonText={getReasonText}
                    />
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
// Three-Route Display (Hand / Eye / Heart)
// ============================================================================

interface ThreeRouteDisplayProps {
  selectedItem: {
    item: { workState?: string };
    restoreRecipe: { recipe: RestoreRecipe; status: RecipeStatus } | null;
    counterfeitRecipe: { recipe: CounterfeitRecipe; status: RecipeStatus } | null;
    reforgeRecipe: { recipe: ReforgeRecipe; status: RecipeStatus } | null;
  };
  isProcessing: boolean;
  onRestore: () => void;
  onCounterfeit: () => void;
  onReforge: () => void;
  getReasonText: (reason: string) => string;
}

const ThreeRouteDisplay: React.FC<ThreeRouteDisplayProps> = ({
  selectedItem,
  isProcessing,
  onRestore,
  onCounterfeit,
  onReforge,
  getReasonText,
}) => {
  const workState = selectedItem.item.workState;

  const routes: Array<{
    type: RouteType;
    recipe: RestoreRecipe | CounterfeitRecipe | ReforgeRecipe | undefined;
    status: RecipeStatus | undefined;
    onApply: () => void;
  }> = [
    {
      type: 'restore',
      recipe: selectedItem.restoreRecipe?.recipe,
      status: selectedItem.restoreRecipe?.status,
      onApply: onRestore,
    },
    {
      type: 'counterfeit',
      recipe: selectedItem.counterfeitRecipe?.recipe,
      status: selectedItem.counterfeitRecipe?.status,
      onApply: onCounterfeit,
    },
    {
      type: 'reforge',
      recipe: selectedItem.reforgeRecipe?.recipe,
      status: selectedItem.reforgeRecipe?.status,
      onApply: onReforge,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {routes.map(({ type, recipe, status, onApply }) => {
        const theme = ROUTE_THEMES[type];
        const lockKey = getLockReason(type, workState);

        if (lockKey) {
          const reason = theme[lockKey as keyof RouteTheme] as string;
          return (
            <RouteLockedCard key={type} route={type} reason={reason} />
          );
        }

        return (
          <RouteActionCard
            key={type}
            route={type}
            recipe={recipe}
            status={status}
            onApply={onApply}
            isProcessing={isProcessing}
            getReasonText={getReasonText}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// Route Header (shared between cards)
// ============================================================================

const RouteHeader: React.FC<{ route: RouteType; dimmed?: boolean }> = ({ route, dimmed }) => {
  const theme = ROUTE_THEMES[route];
  const Icon = theme.icon;
  return (
    <div className={cn("text-center mb-3 pb-2 border-b border-noir-400", dimmed && "opacity-40")}>
      <Icon className={cn("w-5 h-5 mx-auto mb-1", dimmed ? "text-stone-600" : theme.color)} />
      <div className={cn("text-xs font-bold", dimmed ? "text-stone-600" : theme.color)}>
        {theme.symbol}
      </div>
      <div className={cn("text-sm font-bold", dimmed ? "text-stone-600" : theme.color)}>
        {theme.label}
      </div>
      <div className="text-[10px] text-stone-500">{theme.subtitle}</div>
    </div>
  );
};

// ============================================================================
// Route Locked Card
// ============================================================================

const RouteLockedCard: React.FC<{ route: RouteType; reason: string }> = ({ route, reason }) => {
  return (
    <div className="p-3 rounded border border-noir-400 bg-noir-200/30 opacity-40">
      <RouteHeader route={route} dimmed />
      <div className="flex items-center gap-2 justify-center">
        <Lock className="w-4 h-4 text-stone-600" />
        <p className="text-[10px] text-stone-600 text-center">{reason}</p>
      </div>
    </div>
  );
};

// ============================================================================
// Route Action Card
// ============================================================================

interface RouteActionCardProps {
  route: RouteType;
  recipe?: RestoreRecipe | CounterfeitRecipe | ReforgeRecipe;
  status?: RecipeStatus;
  onApply: () => void;
  isProcessing: boolean;
  getReasonText: (reason: string) => string;
}

const RouteActionCard: React.FC<RouteActionCardProps> = ({
  route,
  recipe,
  status,
  onApply,
  isProcessing,
  getReasonText,
}) => {
  const theme = ROUTE_THEMES[route];
  const canApply = status?.canApply ?? false;

  // No recipe available for this route
  if (!recipe || !status) {
    return (
      <div className="p-3 rounded border border-noir-400 bg-noir-200/50 opacity-50">
        <RouteHeader route={route} dimmed />
        <p className="text-[10px] text-stone-600 text-center">{theme.noRecipeMsg}</p>
      </div>
    );
  }

  // Has recipe but cannot apply (insufficient resources, etc.)
  if (!canApply) {
    return (
      <div className="p-3 rounded border border-noir-400 bg-noir-200/50">
        <RouteHeader route={route} />
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-stone-400 truncate">{recipe.name}</h4>
          <p className="text-[10px] text-stone-600 leading-snug">{recipe.description}</p>
          <div className="text-[10px] text-red-400">
            {status.reason && getReasonText(status.reason)}
          </div>
          <div className="pt-2 border-t border-noir-400 space-y-1">
            <CostDisplay cost={status.actualCost} deficit={status.deficit} compact />
            <div className="text-[10px] text-stone-500 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {recipe.energyCost} 精力
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Can apply -- active card
  return (
    <div
      className={cn(
        "p-3 rounded border bg-noir-200 transition-all",
        theme.colorBorder, theme.colorBorderHover
      )}
    >
      <RouteHeader route={route} />
      <div className="space-y-2">
        <h4 className={cn("font-bold text-xs", theme.color)}>
          {recipe.name}
          {recipe.nightsRequired && recipe.nightsRequired > 1 && (
            <span className="ml-1 text-[10px] font-normal text-amber-400 inline-flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {recipe.nightsRequired}夜
            </span>
          )}
        </h4>
        <p className="text-[10px] text-stone-500 leading-snug">{recipe.description}</p>

        {/* Counterfeit value multiplier */}
        {'valueMultiplier' in recipe && (
          <div className="text-[10px] text-rose-400 font-mono">
            价值系数: x{(recipe as CounterfeitRecipe).valueMultiplier.toFixed(1)}
          </div>
        )}

        {/* Cost section */}
        <div className="pt-2 border-t border-noir-400 space-y-1">
          <CostDisplay cost={status.actualCost} deficit={status.deficit} compact />
          <div className="text-[10px] text-stone-500 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {recipe.energyCost} 精力
          </div>
        </div>

        {/* Risk note */}
        {'riskNote' in recipe && recipe.riskNote && (
          <div className="text-[10px] text-amber-500/70 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{recipe.riskNote}</span>
          </div>
        )}

        {/* Quality outcome probabilities */}
        {status.isProbabilistic && status.qualityOutcomes && (
          <QualityOutcomesPreview outcomes={status.qualityOutcomes} />
        )}

        {/* Execute button */}
        <Button
          onClick={onApply}
          disabled={isProcessing || !canApply}
          className={cn(
            "w-full h-9 text-sm mt-2",
            theme.btnBg, theme.btnBgHover, theme.btnBorder
          )}
        >
          {isProcessing ? '...' : '执行'}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// WorkState Badge
// ============================================================================

const WorkStateBadge: React.FC<{ workState?: string }> = ({ workState }) => {
  if (!workState || workState === 'DEFAULT') return null;

  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    RESTORED: { label: '已选择修复路线', bg: 'bg-emerald-900/50', text: 'text-emerald-300', border: 'border-emerald-700' },
    FORGED: { label: '已选择伪造路线', bg: 'bg-rose-900/50', text: 'text-rose-300', border: 'border-rose-700' },
    REFORGED: { label: '已选择重铸路线', bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700' },
  };

  const c = config[workState];
  if (!c) return null;

  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", c.bg, c.text, c.border)}>
      {c.label}
    </span>
  );
};

// ============================================================================
// Sub-components (shared)
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

interface CostDisplayProps {
  cost: EssenceCost;
  deficit?: EssenceCost;
  compact?: boolean;
}

const CostDisplay: React.FC<CostDisplayProps> = ({ cost, deficit, compact }) => {
  const items: Array<{ type: 'CRAFT' | 'TIME' | 'VIBE'; amount: number; missing: number }> = [];

  if (cost.craft) items.push({ type: 'CRAFT', amount: cost.craft, missing: deficit?.craft || 0 });
  if (cost.time) items.push({ type: 'TIME', amount: cost.time, missing: deficit?.time || 0 });
  if (cost.vibe) items.push({ type: 'VIBE', amount: cost.vibe, missing: deficit?.vibe || 0 });

  if (items.length === 0) {
    return <span className="text-[10px] text-stone-500">仅消耗精力</span>;
  }

  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "gap-3")}>
      {items.map(({ type, amount, missing }) => (
        <div key={type} className="flex items-center gap-1">
          <span className={compact ? "text-xs" : "text-sm"}>{ESSENCE_ICONS[type]}</span>
          <span className={cn(
            "font-mono",
            compact ? "text-[10px]" : "text-xs",
            missing > 0 ? "text-red-400" : "text-stone-300"
          )}>
            {amount}
            {missing > 0 && <span className="text-[10px]"> (-{missing})</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Violation Warning Modal (supports both counterfeit and reforge)
// ============================================================================

interface ViolationWarningModalProps {
  warning: ViolationWarning;
  route: RouteType;
  perceptionTier: PerceptionTier;
  emotionalWeight: EmotionalWeight;
  onConfirm: () => void;
  onCancel: () => void;
}

const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({
  warning, route, perceptionTier, emotionalWeight, onConfirm, onCancel,
}) => {
  const isCounterfeit = route === 'counterfeit';
  const isBlind = perceptionTier === 'blind';

  // Look up perception-tier-aware intuition text from CSV
  const intuitionText = (() => {
    const texts = getIntuitionTexts();
    if (isCounterfeit) {
      return texts.get(`intuition:counterfeit:_:${perceptionTier}`) || warning.intuitionText;
    }
    return texts.get(`intuition:reforge:${emotionalWeight}:${perceptionTier}`) || warning.intuitionText;
  })();

  // Blind tier: special narrative confirmation style (I8, design 12)
  if (isBlind) {
    const blindTitle = getIntuitionTexts().get('blind:confirm:title') || '你对这件东西和这个人都不了解。';
    const blindBody = getIntuitionTexts().get('blind:confirm:body') || '结果完全不可预测。';
    const blindProceed = getIntuitionTexts().get('blind:confirm:proceed') || '凭直觉来';
    const blindCancel = getIntuitionTexts().get('blind:confirm:cancel') || '再想想';

    return (
      <Modal
        isOpen={true}
        onClose={onCancel}
        title={
          <span className="flex items-center gap-2 text-stone-400">
            <HelpCircle className="w-5 h-5" />
            未知领域
          </span>
        }
        size="md"
      >
        <div className="space-y-4 relative">
          {/* Blurred uncertainty background effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 to-noir-300/50 rounded pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <p className="text-lg text-stone-200 font-bold text-center pt-2">
              {blindTitle}
            </p>
            <p className="text-sm text-stone-400 text-center leading-relaxed">
              {blindBody}
            </p>

            {/* Intuition text - emphasizes uncertainty */}
            <div className="p-4 rounded border border-stone-700 bg-stone-900/50">
              <div className="text-[10px] uppercase text-stone-500 mb-2">商人直觉</div>
              <p className="text-sm text-stone-300/70 italic">
                "{intuitionText}"
              </p>
            </div>

            {/* Consequences: still shown but dimmed (player can't predict outcomes) */}
            {isCounterfeit && (
              <div className="p-3 rounded border border-red-900/30 bg-red-950/10 opacity-60">
                <div className="text-[10px] uppercase text-red-400/60 mb-1">可预见后果 (伪造违约)</div>
                <div className="text-[10px] text-stone-500">
                  赔偿: ${warning.compensationAmount} | 声誉损失: 严重
                </div>
              </div>
            )}

            {/* Buttons: narrative-style */}
            <div className="flex justify-center gap-4 pt-3">
              <Button
                onClick={onCancel}
                className="px-6 bg-noir-300 hover:bg-noir-400 border-stone-600 text-stone-300"
              >
                {blindCancel}
              </Button>
              <Button
                onClick={onConfirm}
                className={cn(
                  "px-6",
                  isCounterfeit
                    ? "bg-rose-900/60 hover:bg-rose-800/60 border-rose-700/60"
                    : "bg-purple-900/60 hover:bg-purple-800/60 border-purple-700/60"
                )}
              >
                {blindProceed}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Non-blind tiers: standard violation warning with perception-tier-aware intuition
  const tierConfidence = {
    glimpse: { label: '模糊感知', color: 'text-amber-400/60', borderColor: 'border-amber-900/30' },
    partial: { label: '部分感知', color: 'text-amber-400/80', borderColor: 'border-amber-900/50' },
    clear: { label: '清晰感知', color: 'text-amber-400', borderColor: 'border-amber-800' },
  } as const;

  const tierStyle = tierConfidence[perceptionTier as keyof typeof tierConfidence];

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={
        <span className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          {isCounterfeit ? '违约风险' : '善意僭越'}
        </span>
      }
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-300">
          {isCounterfeit
            ? '这件物品仍在当期内。伪造将制造谎言，客户赎回时将视为严重违约。'
            : '这件物品仍在当期内。重铸将改变其本质，客户赎回时的反应取决于你对物品和客户的了解程度。'
          }
        </p>

        {/* 可预见后果 */}
        <div className="p-4 rounded border border-red-900/50 bg-red-950/20">
          <div className="text-[10px] uppercase text-red-400 mb-2">
            {isCounterfeit ? '可预见后果' : '可能后果'}
          </div>
          <div className="space-y-1.5 text-sm text-stone-300">
            {isCounterfeit ? (
              <>
                <div>违约赔偿: <span className="text-red-400 font-mono">${warning.compensationAmount}</span> (当金 x200%)</div>
                <div>
                  声誉损失:{' '}
                  <span className="text-red-400">人情 {warning.reputationLoss.humanity}</span>
                  {' / '}
                  <span className="text-red-400">商誉 {warning.reputationLoss.credibility}</span>
                  {warning.reputationLoss.innocence != null && (
                    <>{' / '}<span className="text-red-400">清白 {warning.reputationLoss.innocence}</span></>
                  )}
                </div>
                <div>客户关系: <span className="text-red-400">不可修复</span></div>
              </>
            ) : (
              <>
                <div className="text-stone-400">赎回时客户可能:</div>
                <div className="text-[10px] text-stone-500 space-y-0.5">
                  <div className="text-emerald-400/70">叹服 — 被你的改进打动 (声誉提升)</div>
                  <div className="text-stone-400">认可 — 接受变化 (声誉微增)</div>
                  <div className="text-amber-400/70">不安 — 察觉到异样 (声誉下降)</div>
                  <div className="text-red-400/70">愤怒 — 对擅自改动暴怒 (声誉大幅下降)</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 商人直觉 (perception-tier-aware) */}
        <div className={cn(
          "p-4 rounded border bg-amber-950/20",
          tierStyle?.borderColor || 'border-amber-900/50'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase text-amber-400">商人直觉</div>
            {tierStyle && (
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border border-amber-800/50", tierStyle.color)}>
                {tierStyle.label}
              </span>
            )}
          </div>
          <p className="text-sm text-amber-200/80 italic">
            "{intuitionText}"
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onCancel} className="px-4 bg-noir-300 hover:bg-noir-400 border-noir-500">
            放回去
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              "px-4",
              isCounterfeit
                ? "bg-red-900 hover:bg-red-800 border-red-700"
                : "bg-purple-900 hover:bg-purple-800 border-purple-700"
            )}
          >
            {isCounterfeit ? '我知道后果，继续' : '继续重铸'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// Gaze Moment Overlay (with counterfeit non-skippable support)
// ============================================================================

interface GazeMomentProps {
  text: string;
  visible: boolean;
  skippable: boolean;
  isCounterfeit?: boolean;
  onSkip: () => void;
}

const GazeMoment: React.FC<GazeMomentProps> = ({ text, visible, skippable, isCounterfeit, onSkip }) => {
  const IconComponent = isCounterfeit ? Eye : Eye;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80",
        skippable ? "cursor-pointer" : "cursor-default"
      )}
      onClick={skippable ? onSkip : undefined}
    >
      <div className="max-w-md text-center px-8">
        <IconComponent className={cn(
          "w-8 h-8 mx-auto mb-6",
          isCounterfeit ? "text-rose-400/40" : "text-amber-400/40"
        )} />
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
// Workshop Result Modal (supports three routes)
// ============================================================================

interface WorkshopResultModalProps {
  result: WorkshopResult | null;
  onClose: () => void;
}

const WorkshopResultModal: React.FC<WorkshopResultModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const isRestore = result.type === 'RESTORE';
  const isCounterfeit = result.type === 'COUNTERFEIT';
  const quality = result.reforgeQuality;

  const getTitleContent = () => {
    if (isRestore) {
      return { icon: <Hand className="w-5 h-5" />, text: '修复完成', colorClass: 'text-emerald-300' };
    }
    if (isCounterfeit) {
      return { icon: <Eye className="w-5 h-5" />, text: '伪造完成', colorClass: 'text-rose-300' };
    }
    return { icon: <Heart className="w-5 h-5" />, text: '重铸完成', colorClass: 'text-purple-300' };
  };

  const titleContent = getTitleContent();

  const getGradientClass = () => {
    if (isRestore) return "bg-gradient-to-r from-emerald-950/50 to-noir-300/50 border-emerald-800";
    if (isCounterfeit) return "bg-gradient-to-r from-rose-950/50 to-noir-300/50 border-rose-800";
    if (quality === 'MASTERWORK') return "bg-gradient-to-r from-amber-950/50 to-purple-950/30 border-amber-700";
    if (quality === 'FLAWED') return "bg-gradient-to-r from-red-950/30 to-noir-300/50 border-red-900";
    if (quality === 'FAILED') return "bg-gradient-to-r from-stone-900/50 to-noir-300/50 border-stone-700";
    return "bg-gradient-to-r from-purple-950/50 to-noir-300/50 border-purple-800";
  };

  return (
    <Modal
      isOpen={!!result}
      onClose={onClose}
      title={
        <span className={cn("flex items-center gap-2", titleContent.colorClass)}>
          {titleContent.icon}
          {titleContent.text}
          {quality && <QualityBadge quality={quality} />}
        </span>
      }
      size="md"
    >
      <div className={cn("p-6 rounded border", getGradientClass())}>
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
            {result.counterfeitValueMultiplier && (
              <span className="text-[10px] text-rose-400 ml-2">
                (伪造系数: x{result.counterfeitValueMultiplier.toFixed(1)})
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
    <div className="pt-2 border-t border-noir-400">
      <div className="text-[10px] text-stone-500 uppercase mb-1">品质概率</div>
      <div className="grid grid-cols-2 gap-1">
        {outcomes.map(({ quality, probability, valueMultiplier }) => {
          const style = QUALITY_STYLES[quality];
          return (
            <div
              key={quality}
              className={cn(
                "p-1 rounded border text-center",
                style.bg, style.border
              )}
            >
              <div className={cn("text-[9px] font-bold", style.text)}>
                {getQualityDisplayName(quality)}
              </div>
              <div className="text-[10px] font-mono text-stone-400">
                {Math.round(probability * 100)}%
              </div>
              <div className={cn("text-[9px]", valueMultiplier >= 1 ? "text-green-500" : "text-red-400")}>
                x{valueMultiplier.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Training Monologue (invisible scaffolding - I10)
// ============================================================================

interface TrainingMonologueProps {
  text: string;
  onDismiss: () => void;
}

const TrainingMonologue: React.FC<TrainingMonologueProps> = ({ text, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fadeIn = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(fadeIn);
  }, []);

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 cursor-pointer max-w-sm"
      onClick={onDismiss}
    >
      <div className={cn(
        "flex items-start gap-2 px-4 py-3 rounded border border-amber-900/30 bg-noir-200/90 backdrop-blur-sm transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0"
      )}>
        <MessageCircle className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/60 italic leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Reputation Micro-Feedback Overlay
// ============================================================================

interface RepFeedbackOverlayProps {
  feedback: { humanity?: number; credibility?: number; innocence?: number };
}

const RepFeedbackOverlay: React.FC<RepFeedbackOverlayProps> = ({ feedback }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fadeIn = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(fadeIn);
  }, []);

  const axes: Array<{ key: string; label: string; value: number; icon: string; color: string }> = [];

  if (feedback.humanity != null && feedback.humanity !== 0) {
    axes.push({
      key: 'humanity',
      label: '人情',
      value: feedback.humanity,
      icon: '❤',
      color: feedback.humanity > 0 ? 'text-red-400' : 'text-red-600',
    });
  }
  if (feedback.credibility != null && feedback.credibility !== 0) {
    axes.push({
      key: 'credibility',
      label: '商誉',
      value: feedback.credibility,
      icon: '🤝',
      color: feedback.credibility > 0 ? 'text-amber-400' : 'text-amber-600',
    });
  }
  if (feedback.innocence != null && feedback.innocence !== 0) {
    axes.push({
      key: 'innocence',
      label: '清白',
      value: feedback.innocence,
      icon: '⚖',
      color: feedback.innocence > 0 ? 'text-blue-400' : 'text-blue-600',
    });
  }

  if (axes.length === 0) return null;

  return (
    <div className={cn(
      "absolute top-16 right-4 z-40 transition-all duration-500",
      visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
    )}>
      <div className="flex flex-col gap-1 px-3 py-2 rounded border border-red-900/40 bg-noir-200/95 backdrop-blur-sm shadow-lg">
        <div className="text-[9px] uppercase text-red-400/70 tracking-wider mb-0.5">
          违约风险预估
        </div>
        {axes.map(({ key, label, value, icon, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-sm">{icon}</span>
            <span className="text-[10px] text-stone-500 w-8">{label}</span>
            <span className={cn("text-sm font-mono font-bold", color)}>
              {value > 0 ? '+' : ''}{value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
