
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { ArrowRight, MessageSquare, Brain } from 'lucide-react';
import { SatisfactionLevel } from '../systems/narrative/types';
import { TypewriterText } from './ui/TextEffects';
import { playSfx } from '../systems/game/audio';
import { GamePhase } from '../types';
import { getDepartureMonologue } from '../systems/narrative/innerVoiceRegistry';
import { cn } from '../lib/utils';

export const DepartureView: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentCustomer, lastSatisfaction } = state;

  const [textComplete, setTextComplete] = useState(false);
  const [showInnerVoice, setShowInnerVoice] = useState(false);
  const [innerVoiceText, setInnerVoiceText] = useState("");

  const satisfaction = lastSatisfaction || 'NEUTRAL';

  // Audio & Setup
  useEffect(() => {
      if (lastSatisfaction) {
          // Determine monologue
          setInnerVoiceText(getDepartureMonologue(satisfaction));
      }
  }, [lastSatisfaction, satisfaction]);

  const handleNext = () => {
      playSfx('FOOTSTEP');
      // Always transition back to BUSINESS phase. 
      dispatch({ type: 'CLEAR_CUSTOMER' }); 
      dispatch({ type: 'SET_PHASE', payload: GamePhase.BUSINESS });
  };

  const onCustomerTextComplete = () => {
      setTextComplete(true);
      // Chance to trigger inner voice (higher for emotional extremes)
      const chance = (satisfaction === 'GRATEFUL' || satisfaction === 'DESPERATE') ? 0.8 : 0.4;
      if (Math.random() < chance) {
          setTimeout(() => setShowInnerVoice(true), 800);
      }
  };

  if (!currentCustomer) return null;

  // Default exit lines
  const defaultExitLines: Record<SatisfactionLevel, string> = {
      'GRATEFUL': "谢谢你... 你是个好人。我会永远记得今天的。",
      'NEUTRAL': "走了。回见。",
      'RESENTFUL': "算你狠... 咱们走着瞧。",
      'DESPERATE': "求求你... (叹气) 我真的没路可走了..."
  };

  // Silent Variants (Fallback logic)
  const silentExitLines: Partial<Record<SatisfactionLevel, string>> = {
      'RESENTFUL': "[他一言不发，只是冷冷地看了你一眼，转身撞开门离开了]",
      'DESPERATE': "[她低着头，沉默了很久，最后什么都没说，拖着沉重的脚步走了出去]",
      'NEUTRAL': "[点点头，转身融入了街道的人流中]",
      'GRATEFUL': "[深深鞠了一躬，擦了擦眼角，转身离开]"
  };

  // 1. Try to get specific line from story data
  let exitText = currentCustomer.dialogue.exitDialogues?.[satisfaction];
  
  // 2. Fallback to default
  if (!exitText) {
      // 20% chance for silent variant if available
      if (Math.random() < 0.2 && silentExitLines[satisfaction]) {
          exitText = silentExitLines[satisfaction];
      } else {
          exitText = defaultExitLines[satisfaction];
      }
  }

  // Is this a silent/action line? (Check for brackets)
  const isSilentAction = exitText?.startsWith('[') && exitText?.endsWith(']');

  // Avatar Variation
  // Logic: Prefer explicit portrait if available. If not, use seed + CSS filter.
  // We do NOT change the seed for fallback to preserve identity.
  let avatarUrl = `https://picsum.photos/seed/${currentCustomer.avatarSeed}/400`;
  if (currentCustomer.portraits && currentCustomer.portraits[satisfaction.toLowerCase() as keyof typeof currentCustomer.portraits]) {
      avatarUrl = currentCustomer.portraits[satisfaction.toLowerCase() as keyof typeof currentCustomer.portraits]!;
  }

  // CSS Filters for Mood (Fallback)
  let avatarFilter = "";
  let borderStyle = "border-stone-800";
  
  switch(satisfaction) {
      case 'GRATEFUL':
          avatarFilter = "sepia(0.3) saturate(1.2) brightness(1.1)";
          borderStyle = "border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.3)]";
          break;
      case 'RESENTFUL':
          avatarFilter = "contrast(1.5) grayscale(0.5)"; // Harsh look
          borderStyle = "border-red-900";
          break;
      case 'DESPERATE':
          avatarFilter = "grayscale(1) brightness(0.7) blur(0.5px)"; // Faded look
          borderStyle = "border-stone-600 opacity-80";
          break;
      default:
          avatarFilter = "grayscale(0.8) contrast(1.1)"; // Neutral noir look
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
                style={{ filter: avatarFilter }}
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
                        "<TypewriterText text={exitText || "..."} speed={40} onComplete={onCustomerTextComplete} />"
                      </>
                  )}
              </div>
          </div>

          {/* Inner Voice Overlay (The Merchant's Thoughts) */}
          {showInnerVoice && (
              <div className="w-full max-w-lg animate-in fade-in slide-in-from-top-4 duration-1000 mb-8">
                  <div className="flex items-center justify-center gap-2 text-stone-600 text-[10px] uppercase tracking-widest mb-1">
                      <Brain className="w-3 h-3" /> Internal Monologue
                  </div>
                  <p className="text-stone-500 font-serif italic text-center text-sm">
                      <TypewriterText text={innerVoiceText} speed={50} />
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
