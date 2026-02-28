
import React from 'react';
import { cn } from '../../lib/utils';
import type { InsertedCardDecision } from '../../systems/cardNegotiation/types';
import { playSfx } from '../../systems/game/audio';

interface InsertDecisionProps {
  pendingInserts: InsertedCardDecision[];
  onAccept: (cardInstanceId: string) => void;
  onReject: (cardInstanceId: string) => void;
}

/**
 * Displays customer-inserted cards that require player accept/reject decisions.
 * Shows as an overlay when there are undecided inserts.
 */
export const InsertDecision: React.FC<InsertDecisionProps> = ({
  pendingInserts,
  onAccept,
  onReject,
}) => {
  const undecided = pendingInserts.filter(d => !d.decided);
  if (undecided.length === 0) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-noir-200 border border-purple-800/60 rounded-lg p-4 max-w-md w-full mx-4 shadow-2xl shadow-purple-900/20">
        <h3 className="text-sm font-serif text-purple-300 mb-1">
          Customer Card
        </h3>
        <p className="text-[10px] text-noir-txt-muted font-mono mb-3">
          Accept into your hand or reject (costs patience).
        </p>

        <div className="flex flex-col gap-3">
          {undecided.map(decision => (
            <div
              key={decision.card.instanceId}
              className="border border-purple-700/40 rounded-lg p-3 bg-purple-950/20"
            >
              {/* Card info */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-serif font-bold text-purple-300">
                    {decision.card.name}
                  </span>
                  <span className="text-[8px] font-mono text-purple-500 border border-purple-800 px-1 rounded">
                    {decision.card.category}
                  </span>
                </div>
                <p className="text-xs text-noir-txt-secondary font-mono">
                  {decision.card.description}
                </p>
              </div>

              {/* Accept / Reject buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    playSfx('CLICK');
                    onAccept(decision.card.instanceId);
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 rounded border text-sm font-mono font-bold transition-all duration-200',
                    'bg-green-950/30 border-green-700/50 text-green-400',
                    'hover:bg-green-900/40 hover:border-green-500 hover:shadow-[0_0_8px_rgba(16,185,129,0.2)]',
                    'active:scale-95',
                  )}
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    playSfx('CLICK');
                    onReject(decision.card.instanceId);
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 rounded border text-sm font-mono font-bold transition-all duration-200',
                    'bg-red-950/30 border-red-700/50 text-red-400',
                    'hover:bg-red-900/40 hover:border-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.2)]',
                    'active:scale-95',
                  )}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
