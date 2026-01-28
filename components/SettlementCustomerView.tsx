
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { User, MessageSquareQuote, History, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SettlementCustomerView - 专门用于赎回/续当场景的顾客视图
 *
 * 与 CustomerView 的区别：
 * - 不显示谈判耐心（赎回不需要谈判）
 * - 不显示赎回意愿（顾客来赎回，意愿已明确）
 * - 不显示典当理由和赎回承诺（这些是典当时的信息）
 * - 不显示 Tags
 * - 保持相同的视觉风格和布局
 */
export const SettlementCustomerView: React.FC = () => {
  const { state } = useGame();
  const { currentCustomer } = state;

  const [showRecap, setShowRecap] = useState(true);

  if (!currentCustomer) return (
    <div className="h-full flex flex-col items-center justify-center text-stone-600 font-mono animate-pulse bg-stone-950">
      <User className="w-12 h-12 mb-4 opacity-20" />
      <span className="tracking-widest">等待顾客...</span>
    </div>
  );

  const { recapLog } = currentCustomer;

  const dialogue = currentCustomer.dialogue || {
      greeting: "...",
  };

  // 赎回场景使用友好的边框颜色
  const borderColor = "border-pawn-green";
  const shadowColor = "shadow-[0_0_15px_rgba(16,185,129,0.2)]";

  return (
    <div className="flex flex-col h-full bg-[#1c1917] relative overflow-hidden">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-noise.png')] opacity-10 pointer-events-none"></div>

      {/* Avatar Section */}
      <div className="relative z-10 bg-gradient-to-b from-stone-900 to-[#1c1917] p-6 border-b border-[#44403c] shadow-lg">
        <div className={`w-32 h-32 mx-auto bg-stone-800 rounded-full mb-4 overflow-hidden border-4 transition-all duration-300 relative group ${borderColor} ${shadowColor}`}>
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

          {/* Narrative Observation */}
          {currentCustomer.observation && (
              <div className="my-2 px-3 py-1 bg-black/40 rounded border border-amber-900/30 text-amber-500/80 text-xs font-serif italic leading-relaxed animate-in fade-in">
                  {currentCustomer.observation}
              </div>
          )}

          {/* Settlement Intent Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pawn-green/10 rounded-full border border-pawn-green/30 mt-2">
            <span className="text-xs text-pawn-green font-medium">
              {currentCustomer.redemptionIntent === 'EXTEND' ? '请求续当' : '前来赎回'}
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
            "{dialogue.greeting}"
          </div>
        </div>
      </div>
    </div>
  );
};
