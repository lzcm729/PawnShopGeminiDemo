
import React, { useState, useEffect, useRef } from 'react';
import { ChatLog, type LogEntry } from '../negotiation/ChatLog';
import { createTextRegistry } from '../../systems/utils/textRegistry';
import type { CardPlayResult, CardCustomerType } from '../../systems/cardNegotiation/types';
import type { CustomerTurnResult } from '../../systems/cardNegotiation/customerTurn';
import type { Customer } from '../../types';

import cardChatlogCsv from '../../assets/data/texts/card_chatlog.csv?raw';

const textRegistry = createTextRegistry('card_chatlog', cardChatlogCsv);

// ============================================================================
// Types
// ============================================================================

interface CardChatLogProps {
  customer: Customer | null;
  customerType: CardCustomerType;
  lastPlayResult: CardPlayResult | null;
  lastCustomerResult: CustomerTurnResult | null;
  rateThresholdKey: string | null;
  dropHint: 'narrative' | 'disruption' | 'temptation' | 'none';
  roundNumber: number;
}

// ============================================================================
// Helpers
// ============================================================================

function nextId(ref: React.MutableRefObject<number>): string {
  ref.current += 1;
  return `card-chat-${ref.current}`;
}

function addEntry(
  setChatLog: React.Dispatch<React.SetStateAction<LogEntry[]>>,
  entry: LogEntry,
) {
  setChatLog(prev => [...prev.slice(-29), entry]);
}

function txt(key: string, vars?: Record<string, string>): string {
  if (vars) {
    return textRegistry.getRandomWithVars(key, vars) ?? '...';
  }
  return textRegistry.getRandom(key) ?? '...';
}

// ============================================================================
// Component
// ============================================================================

export const CardChatLog: React.FC<CardChatLogProps> = ({
  customer,
  customerType,
  lastPlayResult,
  lastCustomerResult,
  rateThresholdKey,
  dropHint,
  roundNumber,
}) => {
  const [chatLog, setChatLog] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);

  // --- 1. Initial greeting when customer arrives ---
  useEffect(() => {
    if (!customer) return;
    setChatLog([]);
    entryIdRef.current = 0;
    addEntry(setChatLog, {
      id: nextId(entryIdRef),
      sender: 'customer',
      text: txt(`greeting_${customerType}`),
      sentiment: 'neutral',
    });
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 2. Card play result ---
  useEffect(() => {
    if (!lastPlayResult) return;
    const { card } = lastPlayResult;

    const hasEconomic = card.effects.some(e => e.type === 'economic');
    const hasInformation = card.effects.some(e => e.type === 'information');
    const hasNarrative = card.effects.some(e => e.type === 'narrative');

    if (hasEconomic) {
      // Player economic action log
      const parts: string[] = [];
      if (lastPlayResult.pawnAmountDelta !== 0) {
        const sign = lastPlayResult.pawnAmountDelta > 0 ? '+' : '';
        parts.push(`${sign}${lastPlayResult.pawnAmountDelta}`);
      }
      if (lastPlayResult.rateDelta !== 0) {
        const sign = lastPlayResult.rateDelta > 0 ? '+' : '';
        parts.push(`${sign}${lastPlayResult.rateDelta}%`);
      }
      const summary = parts.length > 0 ? parts.join(' | ') : card.name;
      addEntry(setChatLog, {
        id: nextId(entryIdRef),
        sender: 'player',
        text: `[${card.name}] ${summary}`,
        sentiment: lastPlayResult.isInsult ? 'negative' : 'neutral',
        subtext: lastPlayResult.isInsult ? '侮辱性报价！' : undefined,
      });

      // Customer reaction
      if (lastPlayResult.isInsult) {
        addEntry(setChatLog, {
          id: nextId(entryIdRef),
          sender: 'customer',
          text: txt(`play_insult_${customerType}`),
          sentiment: 'negative',
        });
      } else {
        addEntry(setChatLog, {
          id: nextId(entryIdRef),
          sender: 'customer',
          text: txt(`play_economic_${customerType}`),
          sentiment: 'neutral',
        });
      }
    } else if (hasInformation) {
      // Inner monologue for information cards
      const subtextParts: string[] = [];
      if (lastPlayResult.estimateRangeShrunk) subtextParts.push('范围收缩');

      addEntry(setChatLog, {
        id: nextId(entryIdRef),
        sender: 'player',
        type: 'INNER_MONOLOGUE',
        text: txt('play_info'),
        subtext: subtextParts.length > 0 ? subtextParts.join('，') : undefined,
        sentiment: lastPlayResult.estimateRangeShrunk ? 'positive' : 'neutral',
        data: {
          feedbackType: lastPlayResult.estimateRangeShrunk ? 'RANGE_NARROWED' : undefined,
          traitName: lastPlayResult.traitDiscovered,
        },
      });

      // Extra entry for trait discovery
      if (lastPlayResult.traitDiscovered) {
        addEntry(setChatLog, {
          id: nextId(entryIdRef),
          sender: 'player',
          type: 'INNER_MONOLOGUE',
          text: txt('inner_trait_discovered'),
          sentiment: 'positive',
          data: {
            feedbackType: 'TRAIT_DISCOVERED',
            traitName: lastPlayResult.traitDiscovered,
          },
        });
      }
    } else if (hasNarrative) {
      // Player plays narrative card
      addEntry(setChatLog, {
        id: nextId(entryIdRef),
        sender: 'player',
        text: `[${card.name}]`,
        sentiment: 'neutral',
      });
      // Customer reaction to narrative
      addEntry(setChatLog, {
        id: nextId(entryIdRef),
        sender: 'customer',
        text: txt(`play_narrative_${customerType}`),
        sentiment: 'positive',
      });
    } else {
      // Other cards (patience etc.)
      addEntry(setChatLog, {
        id: nextId(entryIdRef),
        sender: 'player',
        text: `[${card.name}]`,
        sentiment: 'neutral',
      });
    }
  }, [lastPlayResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 3. Customer turn result ---
  useEffect(() => {
    if (!lastCustomerResult) return;
    if (lastCustomerResult.insertedCards.length === 0) return;

    const hintKey = dropHint !== 'none' ? `customer_drop_${dropHint}` : null;
    const text = hintKey ? txt(hintKey) : '...';

    addEntry(setChatLog, {
      id: nextId(entryIdRef),
      sender: 'customer',
      text,
      sentiment: 'neutral',
    });
  }, [lastCustomerResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 4. Round transition ---
  useEffect(() => {
    if (roundNumber <= 1) return;
    addEntry(setChatLog, {
      id: nextId(entryIdRef),
      sender: 'system',
      text: txt('round_transition', { round: String(roundNumber) }),
      sentiment: 'neutral',
    });
  }, [roundNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 5. Rate threshold crossing ---
  useEffect(() => {
    if (!rateThresholdKey) return;
    addEntry(setChatLog, {
      id: nextId(entryIdRef),
      sender: 'player',
      type: 'INNER_MONOLOGUE',
      text: txt(rateThresholdKey),
      sentiment: 'negative',
    });
  }, [rateThresholdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-scroll ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog]);

  return (
    <ChatLog
      chatLog={chatLog}
      scrollRef={scrollRef}
    />
  );
};
