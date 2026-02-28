
import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Check, XCircle, Clock, Pause } from 'lucide-react';
import type { Card } from '../../systems/cardNegotiation/types';
import { playSfx } from '../../systems/game/audio';

interface ActionButtonsProps {
  isPlayerTurn: boolean;
  isActive: boolean;
  isLocked: boolean;
  hand: Card[];
  onAcceptDeal: () => void;
  onDismissCustomer: () => void;
  onEndTurn: (retainedCardInstanceId?: string) => void;
  onWait: () => void;
}

/**
 * Retention selector shown at end of turn.
 * Player can choose one extra card from hand to retain.
 */
const RetentionSelector: React.FC<{
  hand: Card[];
  onSelect: (cardInstanceId?: string) => void;
  onSkip: () => void;
}> = ({ hand, onSelect, onSkip }) => {
  const retainableCards = hand.filter(c => c.cardType === 'permanent');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
      <div className="bg-noir-200 border border-noir-400 rounded-lg p-4 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-sm font-serif text-amber-400 mb-1">
          Retain a Card
        </h3>
        <p className="text-[10px] text-noir-txt-muted font-mono mb-3">
          Choose one card to keep for next round. Others return to deck.
        </p>

        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {retainableCards.map(card => (
            <button
              key={card.instanceId}
              onClick={() => {
                playSfx('CLICK');
                onSelect(card.instanceId);
              }}
              className="flex items-center gap-2 px-3 py-2 border border-noir-400 rounded
                         bg-noir-300/30 hover:border-amber-600 hover:bg-amber-950/20
                         transition-all duration-200 text-left"
            >
              <span className="text-sm font-serif text-noir-txt-primary">{card.name}</span>
              <span className="text-[9px] text-noir-txt-muted font-mono ml-auto">{card.category}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            playSfx('CLICK');
            onSkip();
          }}
          className="mt-3 w-full text-xs text-noir-txt-muted hover:text-noir-txt-secondary transition-colors font-mono"
        >
          Skip (no retention)
        </button>
      </div>
    </div>
  );
};

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isPlayerTurn,
  isActive,
  isLocked,
  hand,
  onAcceptDeal,
  onDismissCustomer,
  onEndTurn,
  onWait,
}) => {
  const [showRetention, setShowRetention] = useState(false);

  const handleEndTurn = () => {
    // Show retention selector if player has cards
    if (hand.filter(c => c.cardType === 'permanent').length > 0) {
      setShowRetention(true);
    } else {
      onEndTurn();
    }
  };

  const handleRetentionSelect = (cardInstanceId?: string) => {
    setShowRetention(false);
    onEndTurn(cardInstanceId);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-noir-400/30 bg-noir-100/50">
        {/* Accept Deal - always available */}
        <Button
          variant="primary"
          size="sm"
          onClick={onAcceptDeal}
          disabled={!isActive}
          leftIcon={<Check className="w-3.5 h-3.5" />}
          className="flex-1"
        >
          Accept
        </Button>

        {/* Dismiss - always available */}
        <Button
          variant="danger"
          size="sm"
          onClick={onDismissCustomer}
          disabled={!isActive}
          leftIcon={<XCircle className="w-3.5 h-3.5" />}
          className="flex-1"
        >
          Dismiss
        </Button>

        {/* End Turn - player turn only */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleEndTurn}
          disabled={!isPlayerTurn || !isActive || isLocked}
          leftIcon={<Clock className="w-3.5 h-3.5" />}
          className="flex-1"
        >
          End Turn
        </Button>

        {/* Wait - player turn only */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onWait}
          disabled={!isPlayerTurn || !isActive || isLocked}
          leftIcon={<Pause className="w-3.5 h-3.5" />}
          className="flex-none"
        >
          Wait
        </Button>
      </div>

      {/* Retention selector modal */}
      {showRetention && (
        <RetentionSelector
          hand={hand}
          onSelect={handleRetentionSelect}
          onSkip={() => handleRetentionSelect(undefined)}
        />
      )}
    </>
  );
};
