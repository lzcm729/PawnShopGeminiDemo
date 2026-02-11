
import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { useCharacterAbility } from '../hooks/useCharacterAbility';
import { Button } from './ui/Button';
import { ArrowRight, MessageSquare, Brain, DollarSign, Heart, Briefcase, Shield, PackageCheck, Shirt, ShoppingBag, Smartphone, Gem, Archive, Gamepad2, Music, Package, Skull, XCircle, HandHeart, Eye, Lock, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SatisfactionLevel } from '../systems/narrative/types';
import { ReputationType } from '../types';
import { TypewriterText } from './ui/TextEffects';
import { playSfx } from '../systems/game/audio';
import { PhaseIs } from '../systems/core/phases';
import { getDepartureMonologue } from '../systems/narrative/innerVoiceRegistry';
import { getDepartureTimingConfig } from '../systems/game/utils/departureTiming';
import type { ReturnResult } from '../systems/workshop/types';
import { createTextRegistry, TextRegistry } from '../systems/utils/textRegistry';
import returnResultsCSV from '../assets/data/texts/workshop_return_results.csv?raw';

// Return result text registry (loaded once)
let returnTexts: TextRegistry | null = null;
function getReturnTexts(): TextRegistry {
  if (!returnTexts) {
    returnTexts = createTextRegistry('workshop_return_results', returnResultsCSV);
  }
  return returnTexts;
}

/** Style config for each return result type */
const returnResultStyles: Record<ReturnResult, {
  borderColor: string;
  titleColor: string;
  hintColor: string;
  bgColor: string;
  glowColor: string;
}> = {
  ADMIRATION: { borderColor: 'border-amber-600', titleColor: 'text-amber-400', hintColor: 'text-amber-500/70', bgColor: 'bg-amber-950/30', glowColor: 'shadow-[0_0_20px_rgba(217,119,6,0.15)]' },
  ACCEPTANCE: { borderColor: 'border-stone-600', titleColor: 'text-stone-300', hintColor: 'text-stone-400/70', bgColor: 'bg-stone-900/60', glowColor: '' },
  UNEASE: { borderColor: 'border-purple-800/60', titleColor: 'text-purple-300', hintColor: 'text-purple-400/60', bgColor: 'bg-purple-950/20', glowColor: 'shadow-[0_0_15px_rgba(147,51,234,0.1)]' },
  ANGER: { borderColor: 'border-red-800', titleColor: 'text-red-400', hintColor: 'text-red-500/60', bgColor: 'bg-red-950/20', glowColor: 'shadow-[0_0_20px_rgba(220,38,38,0.15)]' },
};
import { cn } from '../lib/utils';
import { getCharacterPortraitPath, EmotionType, PORTRAIT_PLACEHOLDER } from '../systems/assets';

const getCategoryIcon = (category: string) => {
    switch(category) {
        case '服饰': return <Shirt className="w-5 h-5 text-stone-400" />;
        case '奢侈品': return <ShoppingBag className="w-5 h-5 text-stone-400" />;
        case '电子产品': return <Smartphone className="w-5 h-5 text-stone-400" />;
        case '珠宝': return <Gem className="w-5 h-5 text-stone-400" />;
        case '违禁品': return <Skull className="w-5 h-5 text-stone-400" />;
        case '古玩': return <Archive className="w-5 h-5 text-stone-400" />;
        case '玩具': return <Gamepad2 className="w-5 h-5 text-stone-400" />;
        case '乐器': return <Music className="w-5 h-5 text-stone-400" />;
        default: return <Package className="w-5 h-5 text-stone-400" />;
    }
};

export const DepartureView: React.FC = () => {
  const { state, dispatch } = useGame();
  const { processNextExpiryEvent } = useGameEngine();
  const { send, can } = useGameMachine();
  const { canExtraCare, applyExtraCare, canComfort, dispatchComfort, isUnlocked } = useCharacterAbility();
  const { currentCustomer, lastSatisfaction, lastDepartureSatisfaction, lastDealSummary, lastReturnResult, expiryQueue, currentForesightInfo } = state;

  const [textComplete, setTextComplete] = useState(false);
  const [showInnerVoice, setShowInnerVoice] = useState(false);
  const [innerVoiceText, setInnerVoiceText] = useState("");

  // Extra Care (额外关照) state
  const [extraCareUsed, setExtraCareUsed] = useState(false);
  const [extraCareNarrative, setExtraCareNarrative] = useState<string | null>(null);
  const [extraCareEffects, setExtraCareEffects] = useState<{ hopeChange: number; humanityChange: number } | null>(null);

  // Comfort (抚慰) state
  const [comfortUsed, setComfortUsed] = useState(false);
  const [comfortNarrative, setComfortNarrative] = useState<string | null>(null);
  const [comfortEffects, setComfortEffects] = useState<{ hopeChange: number; humanityChange: number } | null>(null);

  const satisfaction = lastSatisfaction || 'NEUTRAL';
  const isNarrativeNPC = !!currentCustomer?.chainId;
  const timingConfig = useMemo(() => getDepartureTimingConfig(satisfaction, isNarrativeNPC), [satisfaction, isNarrativeNPC]);

  // Reforge return result narrative (loaded from CSV)
  const returnNarrative = useMemo(() => {
    if (!lastReturnResult) return null;
    const texts = getReturnTexts();
    return {
      title: texts.get(`return:title:${lastReturnResult}`) || lastReturnResult,
      narrative: texts.getRandom(`return:${lastReturnResult}`) || '',
      hint: texts.get(`return:hint:${lastReturnResult}`) || '',
      repHint: texts.get(`return:rep:${lastReturnResult}`) || '',
    };
  }, [lastReturnResult]);

  // Check if we're in an expiry settlement flow
  const hasMoreExpiryEvents = expiryQueue && expiryQueue.length > 0;

  // Default exit lines
  const defaultExitLines: Record<SatisfactionLevel, string> = {
      'GRATEFUL': "谢谢你... 你是个好人。我会永远记得今天的。",
      'NEUTRAL': "走了。回见。",
      'RESENTFUL': "算你狠... 咱们走着瞧。",
      'DESPERATE': "求求你... (叹气) 我真的没路可走了...",
      'CONFLICTED': "...谢谢，也许吧。(摇摇头，转身离开)"
  };

  // Silent Variants (Fallback logic)
  const silentExitLines: Partial<Record<SatisfactionLevel, string>> = {
      'RESENTFUL': "[他一言不发，只是冷冷地看了你一眼，转身撞开门离开了]",
      'DESPERATE': "[她低着头，沉默了很久，最后什么都没说，拖着沉重的脚步走了出去]",
      'NEUTRAL': "[点点头，转身融入了街道的人流中]",
      'GRATEFUL': "[深深鞠了一躬，擦了擦眼角，转身离开]",
      'CONFLICTED': "[他欲言又止，最终只是轻叹一声，头也不回地走了]"
  };

  // Memoize exit text to prevent random change on re-render
  const exitText = useMemo(() => {
      if (!currentCustomer) return "";

      // 1. Try to get specific line from story data
      const storyLine = currentCustomer.dialogue.exitDialogues?.[satisfaction];
      if (storyLine) return storyLine;

      // 2. Fallback: 20% chance for silent variant if available
      if (Math.random() < 0.2 && silentExitLines[satisfaction]) {
          return silentExitLines[satisfaction]!;
      }
      return defaultExitLines[satisfaction];
  }, [currentCustomer?.id, satisfaction]);

  // Is this a silent/action line? (Check for brackets)
  const isSilentAction = exitText?.startsWith('[') && exitText?.endsWith(']');

  // Audio & Setup
  useEffect(() => {
      if (lastSatisfaction && timingConfig.showInnerVoice) {
          setInnerVoiceText(getDepartureMonologue(satisfaction, lastDepartureSatisfaction));
      }
  }, [lastSatisfaction, satisfaction, lastDepartureSatisfaction, timingConfig.showInnerVoice]);

  // For silent actions, trigger inner voice immediately (no typewriter callback)
  useEffect(() => {
      if (isSilentAction && currentCustomer) {
          setTextComplete(true);
          if (timingConfig.showInnerVoice) {
              setTimeout(() => setShowInnerVoice(true), timingConfig.afterglow);
          }
      }
  }, [isSilentAction, currentCustomer?.id, timingConfig]);

  // Extra Care availability check using actual interestRate from DealSummary
  const extraCareAvailable = useMemo(() => {
      if (!lastDealSummary || extraCareUsed) return false;
      if (!isUnlocked('CHERISH_ALL')) return false;
      return canExtraCare(lastDealSummary.interestRate);
  }, [lastDealSummary, extraCareUsed, isUnlocked, canExtraCare]);

  // Comfort availability check
  const comfortAvailable = useMemo(() => {
      if (!currentCustomer || comfortUsed) return false;
      if (!isUnlocked('COMFORT')) return false;
      const hasActiveChain = !!currentCustomer.chainId;
      const chain = currentCustomer.chainId
          ? state.activeChains.find(c => c.id === currentCustomer.chainId)
          : undefined;
      const npcHope = chain?.variables.hope as number | undefined;
      return canComfort(hasActiveChain, npcHope, currentCustomer.behaviorTags);
  }, [currentCustomer, comfortUsed, isUnlocked, canComfort, state.activeChains]);

  const handleComfort = () => {
      if (!comfortAvailable || !currentCustomer) return;

      const result = dispatchComfort(currentCustomer.chainId);
      if (!result) return;

      setComfortUsed(true);
      setComfortNarrative(result.narrativeText);
      setComfortEffects({ hopeChange: result.hopeChange, humanityChange: result.humanityChange });

      playSfx('CLICK');
  };

  const handleExtraCare = () => {
      if (!extraCareAvailable) return;

      const result = applyExtraCare();
      setExtraCareUsed(true);
      setExtraCareNarrative(result.narrativeText);
      setExtraCareEffects({ hopeChange: result.hopeChange, humanityChange: result.humanityChange });

      // Mark skill as used in state
      dispatch({ type: 'SET_EXTRA_CARE_USED' });
      dispatch({ type: 'MARK_SKILL_USED', payload: { skillId: 'CHERISH_ALL' } });

      // Persist effects: update hope on chain + humanity reputation
      dispatch({
          type: 'APPLY_EXTRA_CARE',
          payload: {
              hopeChange: result.hopeChange,
              humanityChange: result.humanityChange,
              chainId: currentCustomer?.chainId,
          }
      });

      playSfx('CLICK');
  };

  const handleNext = () => {
      playSfx('FOOTSTEP');

      // Send state machine event for phase2 sync
      send({ type: 'DISMISS' });

      dispatch({ type: 'CLEAR_CUSTOMER' });
      dispatch({ type: 'SET_INSIGHT_TRAINING_RESULT', payload: null });

      // If there are remaining expiry events, process them instead of going to BUSINESS
      if (hasMoreExpiryEvents) {
          processNextExpiryEvent();
      } else {
          dispatch({ type: 'SET_PHASE', payload: { type: 'BUSINESS', subphase: 'IDLE' } });
      }
  };

  const onCustomerTextComplete = () => {
      setTextComplete(true);
      if (timingConfig.showInnerVoice) {
          setTimeout(() => setShowInnerVoice(true), timingConfig.afterglow);
      }
  };

  if (!currentCustomer) return null;

  // Avatar Variation
  // Logic: Prefer explicit portrait if available. If not, derive from chainId. Finally, use local placeholder.
  const emotion = satisfaction.toLowerCase() as EmotionType;
  let avatarUrl = PORTRAIT_PLACEHOLDER;
  if (currentCustomer.portraits?.[emotion]) {
      avatarUrl = currentCustomer.portraits[emotion]!;
  } else if (currentCustomer.chainId) {
      const charId = currentCustomer.chainId.replace(/^chain_/, '');
      avatarUrl = getCharacterPortraitPath(charId, emotion);
  }

  // Border style based on satisfaction level
  let borderStyle = "border-stone-800";

  switch(satisfaction) {
      case 'GRATEFUL':
          borderStyle = "border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.3)]";
          break;
      case 'RESENTFUL':
          borderStyle = "border-red-900";
          break;
      case 'DESPERATE':
          borderStyle = "border-stone-600 opacity-80";
          break;
      case 'CONFLICTED':
          borderStyle = "border-purple-700 shadow-[0_0_20px_rgba(147,51,234,0.2),0_0_40px_rgba(217,119,6,0.15)]";
          break;
      default:
          borderStyle = "border-stone-700";
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-700">
      
      {/* Background Spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-stone-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
          
          {/* Avatar (Large) — fades out with upward drift */}
          <div className={cn(
              "w-40 h-40 rounded-full border-4 overflow-hidden mb-8 relative transition-all duration-1000 group",
              borderStyle,
          )}>
              <img
                src={avatarUrl}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                alt="Character"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full"></div>
          </div>

          {/* Dialogue Box — fades along with avatar */}
          <div className={cn(
              "w-full bg-[#1c1917] border border-stone-700 p-8 rounded-sm shadow-2xl relative mb-8 min-h-[150px] flex flex-col items-center justify-center text-center transition-all duration-500",
          )}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black px-4 text-stone-500 text-xs font-mono uppercase tracking-widest border border-stone-800 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  {currentCustomer.name}
              </div>
              
              <div className={`font-serif text-xl md:text-2xl italic leading-relaxed ${isSilentAction ? 'text-stone-500' : 'text-stone-300'}`}>
                  {isSilentAction ? (
                      <span className="font-mono text-sm tracking-wide">{exitText}</span>
                  ) : (
                      <>
                        "<TypewriterText text={exitText || "..."} speed={timingConfig.typewriterSpeed} onComplete={onCustomerTextComplete} />"
                      </>
                  )}
              </div>

              {/* Inner Voice (The Merchant's Thoughts) - inside dialogue box */}
              {showInnerVoice && (
                  <p className="mt-4 text-stone-500 font-serif italic text-center text-sm animate-in fade-in duration-500">
                      {innerVoiceText}
                  </p>
              )}
          </div>

          {/* Reforge Return Result Panel (replaces standard deal summary when present) */}
          {lastReturnResult && returnNarrative && lastDealSummary && (
              <div className={cn(
                  "w-full border rounded p-5 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700",
                  returnResultStyles[lastReturnResult].borderColor,
                  returnResultStyles[lastReturnResult].bgColor,
                  returnResultStyles[lastReturnResult].glowColor,
              )}>
                  {/* Header: Result title + sparkle */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                      <Sparkles className={cn("w-4 h-4", returnResultStyles[lastReturnResult].titleColor)} />
                      <span className={cn("font-mono font-bold text-sm tracking-wider", returnResultStyles[lastReturnResult].titleColor)}>
                          {returnNarrative.title}
                      </span>
                  </div>

                  {/* Narrative text */}
                  <p className="text-stone-300/90 font-serif italic text-sm text-center leading-relaxed mb-3">
                      {returnNarrative.narrative}
                  </p>

                  {/* Cash + Rep delta row */}
                  <div className="flex items-center justify-center gap-4 pt-2 border-t border-stone-800/50">
                      <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-green-400">
                          <DollarSign className="w-3 h-3" />+{Math.abs(lastDealSummary.cashDelta)}
                      </span>
                      {Object.entries(lastDealSummary.reputationDelta).map(([key, val]) => {
                          const value = val as number;
                          if (!value || value === 0) return null;
                          let icon = <Briefcase className="w-3 h-3" />;
                          let color = "text-blue-400";
                          if (key === ReputationType.HUMANITY) { icon = <Heart className="w-3 h-3" />; color = value > 0 ? "text-rose-400" : "text-rose-600"; }
                          if (key === ReputationType.CREDIBILITY) { icon = <Briefcase className="w-3 h-3" />; color = value > 0 ? "text-blue-400" : "text-blue-600"; }
                          return (
                              <span key={key} className={cn("flex items-center gap-1 text-xs font-mono font-bold", color)}>
                                  {icon} {value > 0 ? '+' : ''}{value}
                              </span>
                          );
                      })}
                  </div>

                  {/* Reputation hint */}
                  {returnNarrative.repHint && (
                      <p className={cn("text-[10px] text-center mt-2 font-mono", returnResultStyles[lastReturnResult].hintColor)}>
                          {returnNarrative.repHint}
                      </p>
                  )}
              </div>
          )}

          {/* Standard Deal Summary (if a deal was made AND not a reforge return) */}
          {lastDealSummary && !lastReturnResult && (
              <div className="w-full bg-stone-900/80 border border-stone-700 rounded p-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between gap-4">
                      {/* Cash */}
                      <div className="flex items-center gap-2">
                          <DollarSign className={cn("w-4 h-4", lastDealSummary.cashDelta >= 0 ? "text-green-500" : "text-red-500")} />
                          <span className={cn("font-mono font-bold", lastDealSummary.cashDelta >= 0 ? "text-green-500" : "text-red-500")}>
                              {lastDealSummary.cashDelta >= 0 ? '+' : '-'}${Math.abs(lastDealSummary.cashDelta)}
                          </span>
                      </div>

                      {/* Reputation Changes */}
                      <div className="flex items-center gap-3">
                          {Object.entries(lastDealSummary.reputationDelta).map(([key, val]) => {
                              const value = val as number;
                              if (!value || value === 0) return null;
                              let icon = <Briefcase className="w-3 h-3" />;
                              let color = "text-blue-400";
                              if (key === ReputationType.HUMANITY) { icon = <Heart className="w-3 h-3" />; color = "text-rose-500"; }
                              if (key === ReputationType.INNOCENCE) { icon = <Shield className="w-3 h-3" />; color = "text-blue-500"; }
                              return (
                                  <span key={key} className={cn("flex items-center gap-1 text-xs font-mono font-bold", color)}>
                                      {icon} {value > 0 ? '+' : ''}{value}
                                  </span>
                              );
                          })}
                      </div>

                      {/* Item */}
                      <div className="flex items-center gap-2">
                          {getCategoryIcon(lastDealSummary.itemCategory)}
                          <span className="text-stone-300 text-sm">{lastDealSummary.itemName}</span>
                          <PackageCheck className="w-4 h-4 text-green-500" />
                      </div>
                  </div>
              </div>
          )}

          {/* Transaction Feedback - Redemption Rate Impact (shown below deal summary) */}
          {lastDealSummary && !lastReturnResult && lastDealSummary.transactionFeedback && (
              <div className="w-full bg-stone-900/60 border border-stone-700/50 rounded p-3 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                  <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-2 text-center">赎回意愿影响</div>
                  <div className="space-y-1">
                      {lastDealSummary.transactionFeedback.items.map((feedbackItem, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs px-2">
                              <span className="text-stone-400">{feedbackItem.label}</span>
                              <span className={cn(
                                  "font-mono font-bold flex items-center gap-1",
                                  feedbackItem.modifier > 0 ? 'text-pawn-green' :
                                  feedbackItem.modifier < 0 ? 'text-red-400' :
                                  'text-stone-500'
                              )}>
                                  {feedbackItem.modifier > 0 ? <TrendingUp className="w-3 h-3" /> :
                                   feedbackItem.modifier < 0 ? <TrendingDown className="w-3 h-3" /> :
                                   <Minus className="w-3 h-3" />}
                                  {feedbackItem.effect}
                              </span>
                          </div>
                      ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-stone-700/50 text-center">
                      <span className="text-stone-300 text-xs font-semibold">{lastDealSummary.transactionFeedback.summary}</span>
                  </div>
              </div>
          )}

          {/* No Deal Feedback (if no deal was made) */}
          {!lastDealSummary && (
              <div className="w-full bg-stone-900/60 border border-red-900/50 rounded p-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-center gap-3">
                      <XCircle className="w-5 h-5 text-red-800" />
                      <span className="text-red-700 font-mono font-bold tracking-wider text-sm">
                          交易未达成
                      </span>
                  </div>
                  <p className="text-stone-500 text-xs text-center mt-2">
                      {satisfaction === 'RESENTFUL'
                          ? '顾客不满意你的报价，愤然离去。'
                          : satisfaction === 'DESPERATE'
                          ? '你拒绝了这笔交易。'
                          : '双方未能达成一致。'}
                  </p>
              </div>
          )}

          {/* Insight Training Review (洞察复盘) */}
          {lastDealSummary && state.lastInsightTrainingResult && (
              state.lastInsightTrainingResult.insightUsed ? (
                  <div className="w-full bg-stone-900/60 border border-amber-900/30 rounded p-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                          <Eye className="w-3 h-3 text-amber-500/70" />
                          <span className="text-[10px] uppercase text-stone-500 tracking-[0.15em] font-bold">洞察复盘</span>
                      </div>
                      <p className="text-xs text-stone-400 font-serif italic leading-relaxed text-center">
                          {state.lastInsightTrainingResult.feedbackText}
                      </p>
                      {state.lastInsightTrainingResult.insightAccuracyHint && (
                          <p className="mt-1.5 text-[10px] text-amber-500/60 font-mono text-center">
                              {state.lastInsightTrainingResult.insightAccuracyHint}
                          </p>
                      )}
                      <div className={cn(
                          "mt-2 text-[10px] font-mono uppercase tracking-wider text-center",
                          state.lastInsightTrainingResult.dealPosition === 'generous' ? 'text-red-400/60' :
                          state.lastInsightTrainingResult.dealPosition === 'fair' ? 'text-pawn-green/60' :
                          'text-amber-400/60'
                      )}>
                          {state.lastInsightTrainingResult.dealPosition === 'generous' ? '出手大方' :
                           state.lastInsightTrainingResult.dealPosition === 'fair' ? '公平合理' :
                           '精打细算'}
                      </div>
                  </div>
              ) : (
                  <div className="w-full bg-stone-950/40 border border-stone-800/50 rounded p-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                          <Lock className="w-5 h-5 text-stone-600" />
                          <span className="text-xs text-stone-600 tracking-wide">使用洞察技能可解锁交易复盘</span>
                      </div>
                  </div>
              )
          )}

          {/* Foresight Display (洞若观火 - shown in departure when foresight was generated during insight) */}
          {currentForesightInfo && lastDealSummary && (
              <div className={cn(
                  "w-full border rounded p-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300",
                  currentForesightInfo.confidence === 'high'
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : currentForesightInfo.confidence === 'medium'
                      ? 'bg-indigo-950/20 border-indigo-800/40'
                      : 'bg-stone-900/40 border-stone-700/40'
              )}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className={cn(
                          "w-3.5 h-3.5",
                          currentForesightInfo.confidence === 'high' ? 'text-amber-400' :
                          currentForesightInfo.confidence === 'medium' ? 'text-indigo-400' :
                          'text-stone-500'
                      )} />
                      <span className="text-[10px] uppercase text-stone-500 tracking-[0.15em] font-bold">洞若观火</span>
                      <span className={cn(
                          "text-[10px] font-bold",
                          currentForesightInfo.confidence === 'high' ? 'text-amber-400' :
                          currentForesightInfo.confidence === 'medium' ? 'text-indigo-400' :
                          'text-stone-500'
                      )}>
                          {currentForesightInfo.confidence === 'high' ? '强烈直觉' :
                           currentForesightInfo.confidence === 'medium' ? '模糊预感' :
                           '一闪而过'}
                      </span>
                  </div>
                  <p className={cn(
                      "font-serif italic text-sm text-center leading-relaxed",
                      currentForesightInfo.confidence === 'high' ? 'text-amber-300/90' :
                      currentForesightInfo.confidence === 'medium' ? 'text-indigo-300/80' :
                      'text-stone-400/70'
                  )}>
                      {currentForesightInfo.predictionText}
                  </p>
              </div>
          )}

          {/* Extra Care Narrative (shown after using skill) */}
          {extraCareNarrative && (
              <div className="w-full bg-amber-950/20 border border-amber-800/40 rounded p-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-amber-200/90 font-serif italic text-sm text-center leading-relaxed">
                      {extraCareNarrative}
                  </p>
                  {extraCareEffects && (
                      <div className="flex items-center justify-center gap-4 mt-3">
                          {extraCareEffects.hopeChange !== 0 && (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                                  <Brain className="w-3 h-3" />
                                  Hope {extraCareEffects.hopeChange > 0 ? '+' : ''}{extraCareEffects.hopeChange}
                              </span>
                          )}
                          {extraCareEffects.humanityChange !== 0 && (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-rose-400">
                                  <Heart className="w-3 h-3" />
                                  {extraCareEffects.humanityChange > 0 ? '+' : ''}{extraCareEffects.humanityChange}
                              </span>
                          )}
                      </div>
                  )}
              </div>
          )}

          {/* Comfort Narrative (shown after using skill) */}
          {comfortNarrative && (
              <div className="w-full bg-rose-950/20 border border-rose-800/40 rounded p-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-rose-200/90 font-serif italic text-sm text-center leading-relaxed">
                      {comfortNarrative}
                  </p>
                  {comfortEffects && (
                      <div className="flex items-center justify-center gap-4 mt-3">
                          {comfortEffects.hopeChange !== 0 && (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-rose-300">
                                  <Brain className="w-3 h-3" />
                                  Hope {comfortEffects.hopeChange > 0 ? '+' : ''}{comfortEffects.hopeChange}
                              </span>
                          )}
                          {comfortEffects.humanityChange !== 0 && (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-rose-400">
                                  <Heart className="w-3 h-3" />
                                  {comfortEffects.humanityChange > 0 ? '+' : ''}{comfortEffects.humanityChange}
                              </span>
                          )}
                      </div>
                  )}
              </div>
          )}

          {/* Actions */}
          <div className={`transition-opacity duration-1000 flex flex-col items-center gap-3 ${textComplete || isSilentAction ? 'opacity-100' : 'opacity-0'}`}>
              {/* Comfort Button (抚慰) */}
              {comfortAvailable && !comfortUsed && (
                  <button
                      onClick={handleComfort}
                      title="抚慰: 安慰受伤的灵魂，为对方带来些许温暖。Hope +5, 人情 +2"
                      className="h-11 px-8 flex items-center gap-3 rounded border border-rose-700/50 bg-rose-950/30 text-rose-300 font-mono font-bold text-sm tracking-wider transition-all duration-300 hover:bg-rose-900/40 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:text-rose-200 active:scale-[0.98]"
                  >
                      <Heart className="w-4 h-4" />
                      抚慰
                  </button>
              )}

              {/* Extra Care Button (above Dismiss) */}
              {extraCareAvailable && !extraCareUsed && (
                  <button
                      onClick={handleExtraCare}
                      title="额外关照: 仔细包裹物品并附上保管说明。Hope +3, 人情 +1"
                      className="h-11 px-8 flex items-center gap-3 rounded border border-amber-700/50 bg-amber-950/30 text-amber-300 font-mono font-bold text-sm tracking-wider transition-all duration-300 hover:bg-amber-900/40 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(217,119,6,0.2)] hover:text-amber-200 active:scale-[0.98]"
                  >
                      <HandHeart className="w-4 h-4" />
                      额外关照
                  </button>
              )}

              {/* Dismiss Button */}
              <Button
                onClick={handleNext}
                className="h-14 px-10 text-base tracking-[0.3em] border-stone-600 hover:bg-stone-800 hover:border-white shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-black text-stone-300"
                variant="outline"
              >
                  <span className="flex items-center gap-4">
                      送 客 (DISMISS) <ArrowRight className="w-4 h-4" />
                  </span>
              </Button>
          </div>

      </div>
    </div>
  );
};
