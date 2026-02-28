
import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import type { Card, CardPlayChoice } from '../../systems/cardNegotiation/types';
import { playSfx } from '../../systems/game/audio';

interface CardHandAreaProps {
  hand: Card[];
  canPlay: (card: Card) => boolean;
  onPlayCard: (cardInstanceId: string, choiceId?: string) => void;
  isPlayerTurn: boolean;
}

// Card type border colors
const CARD_TYPE_STYLES: Record<string, { border: string; bg: string; label: string }> = {
  consumable: {
    border: 'border-red-700/60 hover:border-red-500',
    bg: 'bg-red-950/20',
    label: 'text-red-400',
  },
  temporary: {
    border: 'border-purple-700/60 hover:border-purple-500',
    bg: 'bg-purple-950/20',
    label: 'text-purple-400',
  },
  permanent: {
    border: 'border-noir-400 hover:border-amber-600/60',
    bg: 'bg-noir-200/40',
    label: 'text-noir-txt-muted',
  },
};

// Card category icons (using text symbols for simplicity)
const CATEGORY_ICONS: Record<string, string> = {
  economic: '$',
  information: '?',
  narrative: '#',
  disruption: '!',
  temptation: '*',
};

// Card type labels in Chinese
const CARD_TYPE_LABELS: Record<string, string> = {
  consumable: '消耗',
  temporary: '临时',
  permanent: '常驻',
};

interface ChoiceModalProps {
  card: Card;
  onSelect: (choiceId: string) => void;
  onCancel: () => void;
}

const ChoiceModal: React.FC<ChoiceModalProps> = ({ card, onSelect, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70" onClick={onCancel}>
    <div
      className="bg-noir-200 border border-noir-400 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      onClick={e => e.stopPropagation()}
    >
      <h3 className="text-lg font-serif text-noir-txt-primary mb-1">{card.name}</h3>
      <p className="text-xs text-noir-txt-muted font-mono mb-4">{card.description}</p>
      <div className="flex flex-col gap-2">
        {card.choices?.map(choice => (
          <button
            key={choice.id}
            onClick={() => {
              playSfx('CLICK');
              onSelect(choice.id);
            }}
            className="w-full px-4 py-3 text-left border border-noir-400 rounded bg-noir-300/50
                       hover:border-amber-600 hover:bg-amber-950/20 transition-all duration-200
                       text-sm text-noir-txt-secondary hover:text-amber-400"
          >
            {choice.label}
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="mt-3 w-full text-xs text-noir-txt-muted hover:text-noir-txt-secondary transition-colors"
      >
        取消
      </button>
    </div>
  </div>
);

export const CardHandArea: React.FC<CardHandAreaProps> = ({
  hand,
  canPlay,
  onPlayCard,
  isPlayerTurn,
}) => {
  const [choiceCard, setChoiceCard] = useState<Card | null>(null);

  const handleCardClick = (card: Card) => {
    if (!isPlayerTurn || !canPlay(card)) return;

    playSfx('CLICK');

    if (card.hasChoice && card.choices && card.choices.length > 0) {
      setChoiceCard(card);
    } else {
      onPlayCard(card.instanceId);
    }
  };

  const handleChoiceSelect = (choiceId: string) => {
    if (choiceCard) {
      onPlayCard(choiceCard.instanceId, choiceId);
      setChoiceCard(null);
    }
  };

  return (
    <div className="px-3 py-2">
      {/* Hand label */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-noir-txt-muted font-mono uppercase tracking-widest">
          Hand
        </span>
        <span className="text-[10px] text-noir-txt-muted font-mono">
          {hand.length}/5
        </span>
      </div>

      {/* Cards */}
      <div className="flex gap-2 justify-center items-end min-h-[120px]">
        {hand.length === 0 ? (
          <div className="text-noir-txt-muted text-xs font-mono italic opacity-50 py-8">
            (empty hand)
          </div>
        ) : (
          hand.map((card, index) => {
            const styles = CARD_TYPE_STYLES[card.cardType] || CARD_TYPE_STYLES.permanent;
            const playable = isPlayerTurn && canPlay(card);
            const categoryIcon = CATEGORY_ICONS[card.category] || '?';
            const typeLabel = CARD_TYPE_LABELS[card.cardType] || '';

            return (
              <button
                key={card.instanceId}
                onClick={() => handleCardClick(card)}
                disabled={!playable}
                className={cn(
                  'relative flex flex-col w-[110px] min-h-[100px] rounded-lg border-2 p-2 transition-all duration-200',
                  styles.border,
                  styles.bg,
                  playable
                    ? 'cursor-pointer hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-900/20 active:scale-100'
                    : 'opacity-50 cursor-not-allowed',
                )}
                title={card.description}
              >
                {/* Type badge (top-right) */}
                {card.cardType !== 'permanent' && (
                  <span className={cn(
                    'absolute -top-1.5 -right-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border',
                    card.cardType === 'consumable'
                      ? 'bg-red-950 border-red-800 text-red-400'
                      : 'bg-purple-950 border-purple-800 text-purple-400',
                  )}>
                    {typeLabel}
                  </span>
                )}

                {/* Category icon */}
                <div className="text-lg font-bold text-center mb-0.5 opacity-60">
                  {categoryIcon}
                </div>

                {/* Card name */}
                <div className="text-xs font-serif font-bold text-center text-noir-txt-primary leading-tight mb-1 line-clamp-2">
                  {card.name}
                </div>

                {/* Description (abbreviated) */}
                <div className="text-[9px] text-noir-txt-muted font-mono leading-tight line-clamp-2 mt-auto">
                  {card.description}
                </div>

                {/* Choice indicator */}
                {card.hasChoice && (
                  <div className="absolute bottom-1 right-1 text-[8px] text-amber-500 font-bold">
                    ...
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Choice modal */}
      {choiceCard && (
        <ChoiceModal
          card={choiceCard}
          onSelect={handleChoiceSelect}
          onCancel={() => setChoiceCard(null)}
        />
      )}
    </div>
  );
};
