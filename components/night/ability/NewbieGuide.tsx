import React from 'react';

interface NewbieGuideProps {
  balance: { craft: number; time: number; vibe: number };
}

export const NewbieGuide: React.FC<NewbieGuideProps> = ({ balance }) => {
  const maxProgress = Math.max(balance.craft, balance.time, balance.vibe);
  const progressPercent = Math.min(100, Math.round((maxProgress / 50) * 100));

  return (
    <div className="bg-gradient-to-r from-amber-950/30 to-purple-950/30 border border-amber-800/40 rounded-lg p-4">
      <p className="text-sm text-stone-300 italic mb-3">
        "每笔交易都在积累修行......"
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-noir-400 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-stone-500 font-mono shrink-0">
          {maxProgress} / 50
        </span>
      </div>
      <p className="text-[10px] text-stone-500 mt-2">
        首个技能解锁还需 {Math.max(0, 50 - maxProgress)} 精魄
      </p>
    </div>
  );
};
