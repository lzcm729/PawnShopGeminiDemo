
import React, { useEffect, useState } from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { Disc, Play, RotateCcw, Volume2, VolumeX, Monitor } from 'lucide-react';
import { hasSaveGame, loadGame, clearSave } from '../systems/core/persistence';
import { toggleMute, getMuteState, playSfx, initAudio, startAmbience } from '../systems/game/audio';

export const StartScreen: React.FC = () => {
  const { dispatch } = useGame();
  const [saveExists, setSaveExists] = useState(false);
  const [isMuted, setIsMuted] = useState(getMuteState());

  useEffect(() => {
    setSaveExists(hasSaveGame());
  }, []);

  const initializeGameAudio = () => {
      initAudio();
      if (!isMuted) {
          startAmbience();
      }
  };

  const handleContinue = () => {
    initializeGameAudio();
    const savedState = loadGame();
    if (savedState) {
        // playSfx('BOOT'); // Removed per user request
        dispatch({ type: 'LOAD_GAME', payload: savedState });
    }
  };

  const handleNewGame = () => {
    initializeGameAudio();
    // playSfx('BOOT'); // Removed per user request
    clearSave();
    dispatch({ type: 'START_GAME' });
  };

  const handleMute = () => {
      const newState = toggleMute();
      setIsMuted(newState);
      // Don't play sound if we just muted it
      if (!newState) playSfx('CLICK');
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-8 relative overflow-hidden font-mono">
      {/* Background with CRT Scanline Effect */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 saturate-0 contrast-125"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>

      <div className="z-20 flex flex-col items-center max-w-4xl w-full animate-in fade-in zoom-in duration-1000">
        
        {/* Logo / Icon */}
        <div className="mb-8 relative group">
            <div className="absolute -inset-4 bg-amber-600/20 rounded-full blur-xl group-hover:bg-amber-600/30 transition-all duration-1000"></div>
            <div className="w-32 h-32 border-4 border-noir-accent rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(217,119,6,0.4)] bg-black/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-noir-accent/10 animate-pulse-slow"></div>
                <Monitor className="w-16 h-16 text-noir-accent" />
            </div>
        </div>

        {/* Title Block */}
        <div className="text-center mb-12 space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-stone-200 to-stone-600 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                THE PAWN'S
            </h1>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-noir-accent drop-shadow-[0_0_20px_rgba(217,119,6,0.8)]">
                DILEMMA
            </h1>
            <div className="h-px w-32 bg-noir-accent mx-auto mt-6 opacity-50"></div>
            <p className="text-stone-400 font-serif italic text-lg tracking-wider mt-4">
                "Gold has a price. Conscience costs extra."
            </p>
        </div>

        {/* Menu Actions */}
        <div className="flex flex-col gap-4 w-full max-w-xs relative">
            {saveExists && (
                <Button 
                    onClick={handleContinue} 
                    className="h-16 text-xl tracking-widest border-2 border-green-700 bg-green-950/30 text-green-500 hover:bg-green-900/50 hover:border-green-500 shadow-[0_0_20px_rgba(22,163,74,0.2)]"
                >
                    <Play className="w-5 h-5 mr-3 fill-current" />
                    CONTINUE
                </Button>
            )}
            
            <Button 
                onClick={handleNewGame} 
                className="h-16 text-xl tracking-widest border-2 border-noir-accent/50 bg-black/50 text-noir-txt-primary hover:bg-noir-accent hover:text-black hover:border-noir-accent shadow-lg transition-all duration-300"
            >
                {saveExists ? <RotateCcw className="w-5 h-5 mr-3" /> : <Disc className="w-5 h-5 mr-3" />}
                NEW GAME
            </Button>

            <div className="flex justify-center gap-4 mt-6">
                <button 
                    onClick={handleMute}
                    className="p-3 rounded-full border border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-900 transition-all"
                    title="Toggle Sound"
                >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-[10px] text-stone-600 font-mono tracking-widest uppercase flex flex-col items-center gap-1">
            <span>System Version 2.0.4 // Build 2077</span>
            <span>Uncertainty Engine Active</span>
        </div>
      </div>
    </div>
  );
};
