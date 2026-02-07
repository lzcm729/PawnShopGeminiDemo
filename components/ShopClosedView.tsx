
import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { Button } from './ui/Button';
import { ArrowRight, MessageSquare, Brain, DollarSign, Heart, Briefcase, Shield, PackageCheck, Shirt, ShoppingBag, Smartphone, Gem, Archive, Gamepad2, Music, Package, Skull, XCircle } from 'lucide-react';
import { SatisfactionLevel } from '../systems/narrative/types';
import { ReputationType } from '../types';
import { TypewriterText } from './ui/TextEffects';
import { playSfx } from '../systems/game/audio';
import { PhaseIs } from '../systems/core/phases';
import { getDepartureMonologue } from '../systems/narrative/innerVoiceRegistry';
import { getDepartureTimingConfig } from '../systems/game/utils/departureTiming';
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
  const { currentCustomer, lastSatisfaction, lastDepartureSatisfaction, lastDealSummary, expiryQueue } = state;

  const [textComplete, setTextComplete] = useState(false);
  const [showInnerVoice, setShowInnerVoice] = useState(false);
  const [innerVoiceText, setInnerVoiceText] = useState("");

  const satisfaction = lastSatisfaction || 'NEUTRAL';
  const isNarrativeNPC = !!currentCustomer?.chainId;
  const timingConfig = useMemo(() => getDepartureTimingConfig(satisfaction, isNarrativeNPC), [satisfaction, isNarrativeNPC]);

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

  const handleNext = () => {
      playSfx('FOOTSTEP');

      // Send state machine event for phase2 sync
      send({ type: 'DISMISS' });

      dispatch({ type: 'CLEAR_CUSTOMER' });

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
          
          {/* Avatar (Large) */}
          <div className={cn(
              "w-40 h-40 rounded-full border-4 overflow-hidden mb-8 relative transition-all duration-1000 group",
              borderStyle
          )}>
              <img
                src={avatarUrl}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                alt="Character"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full"></div>
          </div>

          {/* Dialogue Box */}
          <div className="w-full bg-[#1c1917] border border-stone-700 p-8 rounded-sm shadow-2xl relative mb-8 min-h-[150px] flex flex-col items-center justify-center text-center transition-all duration-500">
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

          {/* Deal Summary (if a deal was made) */}
          {lastDealSummary && (
              <div className="w-full bg-stone-900/80 border border-stone-700 rounded p-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between gap-4">
                      {/* Cash */}
                      <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-500" />
                          <span className="text-red-500 font-mono font-bold">${Math.abs(lastDealSummary.cashDelta)}</span>
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
                                  <span key={key} className={`flex items-center gap-1 text-xs font-mono font-bold ${color}`}>
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

          {/* Action */}
          <div className={`transition-opacity duration-1000 ${textComplete || isSilentAction ? 'opacity-100' : 'opacity-0'}`}>
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
