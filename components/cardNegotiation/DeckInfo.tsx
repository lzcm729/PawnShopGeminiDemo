
import React from 'react';
import { cn } from '../../lib/utils';

interface DeckInfoProps {
  drawPileCount: number;
  discardPileCount: number;
  exhaustedCount: number;
}

/**
 * Small deck info panel showing draw pile, discard pile, and exhausted counts.
 */
export const DeckInfo: React.FC<DeckInfoProps> = ({
  drawPileCount,
  discardPileCount,
  exhaustedCount,
}) => (
  <div className="flex items-center gap-3 px-3 py-1.5 border-t border-noir-400/20">
    <div className="flex items-center gap-1.5" title="Draw pile">
      <div className="w-4 h-5 rounded-sm border border-amber-700/40 bg-amber-950/30 flex items-center justify-center">
        <span className="text-[8px] text-amber-500 font-mono font-bold">{drawPileCount}</span>
      </div>
      <span className="text-[8px] text-noir-txt-muted font-mono">Draw</span>
    </div>

    <div className="flex items-center gap-1.5" title="Discard pile">
      <div className="w-4 h-5 rounded-sm border border-noir-400/40 bg-noir-300/30 flex items-center justify-center">
        <span className="text-[8px] text-noir-txt-muted font-mono font-bold">{discardPileCount}</span>
      </div>
      <span className="text-[8px] text-noir-txt-muted font-mono">Disc</span>
    </div>

    {exhaustedCount > 0 && (
      <div className="flex items-center gap-1.5" title="Exhausted (used consumable cards)">
        <div className="w-4 h-5 rounded-sm border border-red-900/40 bg-red-950/30 flex items-center justify-center">
          <span className="text-[8px] text-red-500 font-mono font-bold">{exhaustedCount}</span>
        </div>
        <span className="text-[8px] text-red-500/60 font-mono">Used</span>
      </div>
    )}
  </div>
);
