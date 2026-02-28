
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import type { CardPlayResult, WaitResult } from '../../systems/cardNegotiation/types';
import type { CustomerTurnResult } from '../../systems/cardNegotiation/customerTurn';

interface FeedbackEntry {
  id: number;
  type: 'play' | 'wait' | 'customer';
  text: string;
  subtext?: string;
  color: string;
}

interface FeedbackAreaProps {
  lastPlayResult: CardPlayResult | null;
  lastCustomerResult: CustomerTurnResult | null;
  lastWaitResult: WaitResult | null;
  rateThresholdKey: string | null;
  dropHint: 'narrative' | 'disruption' | 'temptation' | 'none';
}

/** Format a card play result into a readable feedback entry */
function formatPlayResult(result: CardPlayResult): FeedbackEntry {
  const parts: string[] = [];

  if (result.pawnAmountDelta !== 0) {
    const sign = result.pawnAmountDelta > 0 ? '+' : '';
    parts.push(`Pawn ${sign}${result.pawnAmountDelta}`);
  }
  if (result.rateDelta !== 0) {
    const sign = result.rateDelta > 0 ? '+' : '';
    parts.push(`Rate ${sign}${result.rateDelta}%`);
  }
  if (result.patienceChange !== 0) {
    const sign = result.patienceChange > 0 ? '+' : '';
    parts.push(`Patience ${sign}${result.patienceChange}`);
  }
  if (result.estimateRangeShrunk) {
    parts.push('Estimate narrowed');
  }
  if (result.traitDiscovered) {
    parts.push(`Trait: ${result.traitDiscovered}`);
  }
  if (result.rateLocked) {
    parts.push('Rate LOCKED');
  }
  if (result.rateReset) {
    parts.push('Rate reset to 0%');
  }

  return {
    id: Date.now(),
    type: 'play',
    text: `[${result.card.name}] ${parts.join(' | ') || 'No effect'}`,
    subtext: result.isInsult ? 'Insulting offer!' : undefined,
    color: result.isInsult ? 'text-red-400' : 'text-amber-400',
  };
}

/** Format a wait result */
function formatWaitResult(result: WaitResult): FeedbackEntry {
  const outcomeTexts: Record<string, string> = {
    concession: 'Customer concedes',
    no_reaction: 'No reaction',
    impatient: 'Customer grows impatient',
  };
  return {
    id: Date.now(),
    type: 'wait',
    text: outcomeTexts[result.outcome] || result.outcome,
    subtext: result.droppedCard ? `Gained: ${result.droppedCard.name}` : undefined,
    color: result.outcome === 'concession' ? 'text-green-400'
         : result.outcome === 'impatient' ? 'text-red-400'
         : 'text-noir-txt-secondary',
  };
}

/** Drop hint visual */
const DROP_HINT_DISPLAY: Record<string, { symbol: string; color: string; pulse: boolean }> = {
  narrative: { symbol: '#', color: 'text-blue-400', pulse: false },
  disruption: { symbol: '!', color: 'text-red-400', pulse: true },
  temptation: { symbol: '*', color: 'text-purple-400', pulse: true },
  none: { symbol: '', color: '', pulse: false },
};

export const FeedbackArea: React.FC<FeedbackAreaProps> = ({
  lastPlayResult,
  lastCustomerResult,
  lastWaitResult,
  rateThresholdKey,
  dropHint,
}) => {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);

  // Track play results
  useEffect(() => {
    if (!lastPlayResult) return;
    entryIdRef.current += 1;
    const entry = formatPlayResult(lastPlayResult);
    entry.id = entryIdRef.current;
    setEntries(prev => [...prev.slice(-19), entry]);
  }, [lastPlayResult]);

  // Track wait results
  useEffect(() => {
    if (!lastWaitResult) return;
    entryIdRef.current += 1;
    const entry = formatWaitResult(lastWaitResult);
    entry.id = entryIdRef.current;
    setEntries(prev => [...prev.slice(-19), entry]);
  }, [lastWaitResult]);

  // Track customer turn results
  useEffect(() => {
    if (!lastCustomerResult) return;
    entryIdRef.current += 1;
    const parts: string[] = [];
    if (lastCustomerResult.insertedCards.length > 0) {
      parts.push(`${lastCustomerResult.insertedCards.length} card(s) offered`);
    }
    setEntries(prev => [...prev.slice(-19), {
      id: entryIdRef.current,
      type: 'customer' as const,
      text: parts.length > 0 ? `Customer: ${parts.join(', ')}` : 'Customer turn',
      color: 'text-purple-400',
    }]);
  }, [lastCustomerResult]);

  // Track rate threshold crossings
  useEffect(() => {
    if (!rateThresholdKey) return;
    entryIdRef.current += 1;
    setEntries(prev => [...prev.slice(-19), {
      id: entryIdRef.current,
      type: 'play' as const,
      text: `Rate threshold crossed: ${rateThresholdKey}`,
      color: 'text-red-500',
    }]);
  }, [rateThresholdKey]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const hintDisplay = DROP_HINT_DISPLAY[dropHint] || DROP_HINT_DISPLAY.none;

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t border-noir-400/30">
      {/* Header with drop hint */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-noir-400/20">
        <span className="text-[9px] text-noir-txt-muted font-mono uppercase tracking-wider">
          Log
        </span>
        {dropHint !== 'none' && hintDisplay.symbol && (
          <span className={cn(
            'text-xs font-bold font-mono',
            hintDisplay.color,
            hintDisplay.pulse && 'animate-pulse',
          )} title={`Drop hint: ${dropHint}`}>
            {hintDisplay.symbol}
          </span>
        )}
      </div>

      {/* Scrollable log */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5 scrollbar-thin"
      >
        {entries.length === 0 ? (
          <div className="text-[10px] text-noir-txt-muted font-mono italic opacity-50 py-2">
            Play cards to begin negotiation...
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
              <p className={cn('text-[11px] font-mono leading-snug', entry.color)}>
                {entry.text}
              </p>
              {entry.subtext && (
                <p className="text-[9px] text-noir-txt-muted font-mono leading-snug ml-2">
                  {entry.subtext}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
