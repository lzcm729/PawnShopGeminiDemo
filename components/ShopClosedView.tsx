
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { ArrowRight } from 'lucide-react';
import { SatisfactionLevel } from '../systems/narrative/types';
import { TypewriterText } from './ui/TextEffects';
import { playSfx } from '../systems/game/audio';
import { GamePhase } from '../types';

export const DepartureView: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentCustomer, lastSatisfaction } = state;

  const [textComplete, setTextComplete] = useState(false);

  useEffect(() => {
      if (lastSatisfaction) {
          playSfx('TYPE');
      }
  }, [lastSatisfaction]);

  const handleNext = () => {
      // Always transition back to BUSINESS phase. 
      // The main GameContent component will check if maxCustomers is reached 
      // and display the "Close Shop" button instead of generating a new event.
      dispatch({ type: 'CLEAR_CUSTOMER' }); // Ensure customer is fully cleared
      dispatch({ type: 'SET_PHASE', payload: GamePhase.BUSINESS });
  };

  if (!currentCustomer) return null;

  const satisfaction = lastSatisfaction || 'NEUTRAL';
  
  // Default exit lines if missing from data
  const defaultExitLines: Record<SatisfactionLevel, string> = {
      'GRATEFUL': "谢谢你... 你是个好人。我会永远记得今天的。",
      'NEUTRAL': "走了。回见。",
      'RESENTFUL': "算你狠... 咱们走着瞧。",
      'DESPERATE': "求求你... (叹气) 我真的没路可走了..."
  };

  const exitText = currentCustomer.dialogue.exitDialogues?.[satisfaction] || defaultExitLines[satisfaction];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-700">
      
      {/* Background Spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-stone-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
          
          {/* Avatar (Large) */}
          <div className="w-48 h-48 rounded-full border-4 border-stone-800 shadow-2xl overflow-hidden mb-8 relative grayscale hover:grayscale-0 transition-all duration-1000">
              <img 
                src={`https://picsum.photos/seed/${currentCustomer.avatarSeed}/400`} 
                className="w-full h-full object-cover"
                alt="Character"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full"></div>
          </div>

          {/* Emotional Dialogue Box */}
          <div className="w-full bg-[#1c1917] border border-stone-700 p-8 rounded-sm shadow-2xl relative mb-12 min-h-[150px] flex items-center justify-center text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black px-4 text-stone-500 text-xs font-mono uppercase tracking-widest border border-stone-800">
                  {currentCustomer.name}
              </div>
              
              <div className="font-serif text-xl md:text-2xl text-stone-300 italic leading-relaxed">
                  "<TypewriterText text={exitText} speed={40} onComplete={() => setTextComplete(true)} />"
              </div>
          </div>

          {/* Action */}
          <div className={`transition-opacity duration-1000 ${textComplete ? 'opacity-100' : 'opacity-0'}`}>
              <Button 
                onClick={handleNext}
                className="h-16 px-12 text-lg tracking-[0.3em] border-stone-600 hover:bg-stone-800 hover:border-white shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-black"
                variant="outline"
              >
                  <span className="flex items-center gap-4">
                      送 客 (DISMISS) <ArrowRight className="w-5 h-5" />
                  </span>
              </Button>
          </div>

      </div>
    </div>
  );
};
