
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { User, MessageSquareQuote, AlertCircle, Flame, History, ChevronDown, ChevronUp } from 'lucide-react';
import { SimLogEntry } from '../types';

export const CustomerView: React.FC = () => {
  const { state } = useGame();
  const { currentCustomer } = state;
  
  // State for toggling the backlog history
  const [showRecap, setShowRecap] = useState(true);

  if (!currentCustomer) return (
    <div className="h-full flex flex-col items-center justify-center text-stone-600 font-mono animate-pulse bg-stone-950">
      <User className="w-12 h-12 mb-4 opacity-20" />
      <span className="tracking-widest">等待顾客光临...</span>
    </div>
  );

  const { mood, patience, interactionType, recapLog } = currentCustomer;
  
  // Defensive coding: Ensure dialogue object exists
  const dialogue = currentCustomer.dialogue || {
      greeting: "...",
      pawnReason: "...",
      redemptionPlea: "...",
      negotiationDynamic: "...",
      accepted: { fair: "...", fleeced: "...", premium: "..." },
      rejected: "...",
      rejectionLines: { standard: "...", angry: "..." }
  };

  // Resolve color mapping
  const resolveColor = {
    Strong: 'text-red-500',
    Medium: 'text-yellow-500',
    Weak: 'text-stone-500',
    None: 'text-stone-700'
  };

  const resolveText = {
    Strong: '坚决',
    Medium: '犹豫',
    Weak: '动摇',
    None: '放弃'
  };
  
  // Mood Styles
  const isAngry = mood === 'Angry';
  const isAnnoyed = mood === 'Annoyed';
  const isHappy = mood === 'Happy';
  
  let borderColor = "border-[#292524]";
  let shadowColor = "shadow-inner";
  let animationClass = "";
  
  if (isAngry) {
      borderColor = "border-red-600";
      shadowColor = "shadow-[0_0_15px_rgba(220,38,38,0.5)]";
      animationClass = "animate-[shake_0.5s_ease-in-out_infinite]";
  } else if (isAnnoyed) {
      borderColor = "border-orange-500";
  } else if (isHappy) {
      borderColor = "border-pawn-green";
      shadowColor = "shadow-[0_0_15px_rgba(16,185,129,0.3)]";
  }

  // Only show Pawn Reason if in Pawn Mode
  const showPawnReason = interactionType === 'PAWN';

  return (
    <div className="flex flex-col h-full bg-[#1c1917] relative overflow-hidden">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-noise.png')] opacity-10 pointer-events-none"></div>
      
      {/* Avatar Section */}
      <div className={`relative z-10 bg-gradient-to-b from-stone-900 to-[#1c1917] p-6 border-b border-[#44403c] shadow-lg transition-colors duration-500 ${isAngry ? 'bg-red-950/20' : ''}`}>
        <div className={`w-32 h-32 mx-auto bg-stone-800 rounded-full mb-4 overflow-hidden border-4 transition-all duration-300 relative group ${borderColor} ${shadowColor} ${animationClass}`}>
          <img 
            src={`https://picsum.photos/seed/${currentCustomer.avatarSeed}/200`} 
            alt="Customer" 
            className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold font-serif text-[#e7e5e4] tracking-wider mb-1">
            {currentCustomer.name}
          </h2>
          <p className="text-xs font-mono text-stone-500 uppercase tracking-widest mb-3">
            ID: {currentCustomer.id.slice(0, 8)}
          </p>

          <div className="flex justify-center gap-2 mb-2">
             {/* Patience/Mood Meter */}
             <div className="flex flex-col items-center">
                <span className={`text-[10px] uppercase mb-1 ${isAngry ? 'text-red-500 font-bold' : 'text-stone-500'}`}>
                    {isAngry ? "情绪失控 (ANGRY)" : "谈判耐心 (PATIENCE)"}
                </span>
                <div className="flex gap-1">
                   {Array.from({length: 5}).map((_, i) => (
                      <Flame 
                        key={i} 
                        className={`w-4 h-4 transition-all duration-300 ${
                            i < patience 
                                ? (isAngry ? 'text-red-600 fill-red-600 animate-pulse' : 'text-orange-500 fill-orange-500') 
                                : 'text-stone-800'
                        }`} 
                      />
                   ))}
                </div>
             </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#292524] rounded-full border border-[#44403c] mt-2">
            <span className="text-xs text-stone-400">赎回意愿:</span>
            <span className={`text-xs font-bold ${resolveColor[currentCustomer.redemptionResolve]}`}>
              {resolveText[currentCustomer.redemptionResolve]}
            </span>
          </div>
        </div>
      </div>

      {/* Dialogue Section */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar z-10">
        
        {/* BACKSTAGE RECAP LOG (Memory) */}
        {recapLog && recapLog.length > 0 && (
             <div className="bg-stone-900/40 border border-stone-800 rounded overflow-hidden">
                 <button 
                    onClick={() => setShowRecap(!showRecap)}
                    className="w-full flex justify-between items-center p-2 bg-stone-900 border-b border-stone-800 text-[10px] text-stone-500 font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors"
                 >
                     <span className="flex items-center gap-2"><History className="w-3 h-3"/> 顾客近期经历 (Backstage)</span>
                     {showRecap ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                 </button>
                 
                 {showRecap && (
                     <div className="p-3 space-y-2 animate-in slide-in-from-top-2">
                         {recapLog.map((log, idx) => (
                             <div key={idx} className="flex gap-2 text-xs font-mono">
                                 <div className={`w-1 h-full rounded-full shrink-0 ${
                                     log.type === 'MILESTONE' ? 'bg-green-500' : 
                                     log.type === 'CRISIS' ? 'bg-red-500' : 'bg-stone-600'
                                 }`}></div>
                                 <span className={
                                     log.type === 'MILESTONE' ? 'text-green-400' : 
                                     log.type === 'CRISIS' ? 'text-red-400' : 'text-stone-400'
                                 }>
                                     {log.content}
                                 </span>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        )}

        {/* Opening Line */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-pawn-accent/80 mb-1">
            <MessageSquareQuote className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">开场白</span>
          </div>
          <div className="bg-[#292524] p-4 border-l-2 border-pawn-accent text-[#d6d3d1] font-serif text-lg leading-relaxed shadow-sm">
            “{dialogue.greeting}”
          </div>
        </div>

        {/* Narrative Details */}
        <div className="grid gap-4">
          
          {/* PAWN REASON: Only show if pawning */}
          {showPawnReason && (
            <div className="group">
                <h4 className="text-xs font-mono text-stone-500 mb-1 uppercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> 典当理由
                </h4>
                <p className="text-sm text-stone-400 italic border-b border-[#292524] pb-2 group-hover:text-stone-300 transition-colors">
                "{dialogue.pawnReason}"
                </p>
            </div>
          )}
          
          <div className="group">
            <h4 className="text-xs font-mono text-stone-500 mb-1 uppercase">赎回承诺</h4>
            <p className="text-sm text-stone-400 italic border-b border-[#292524] pb-2 group-hover:text-stone-300 transition-colors">
              "{dialogue.redemptionPlea}"
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
           {currentCustomer.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-black/40 border border-[#292524] px-2 py-1 rounded text-stone-500 font-mono">
                  #{tag}
              </span>
           ))}
        </div>
      </div>
    </div>
  );
};
