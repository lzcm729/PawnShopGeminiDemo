
import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import type { CardNegotiationHookReturn, DealResult } from '../hooks/useCardNegotiation';
import { getCharacterPortraitPath, PORTRAIT_PLACEHOLDER } from '../systems/assets';
import { playSfx } from '../systems/game/audio';
import { StatusBar } from './cardNegotiation/StatusBar';
import { DriftBar } from './cardNegotiation/DriftBar';
import { DeckInfo } from './cardNegotiation/DeckInfo';
import { CardHandArea } from './cardNegotiation/CardHandArea';
import { CardChatLog } from './cardNegotiation/CardChatLog';
import { ActionButtons } from './cardNegotiation/ActionButtons';
import { IntelStrip } from './cardNegotiation/IntelStrip';
import type { CardPlayResult } from '../systems/cardNegotiation/types';
import type { CustomerTurnResult } from '../systems/cardNegotiation/customerTurn';
import { calculateEffectiveFocus } from '../systems/cardNegotiation/focus';

// ============================================================================
// Main Panel
// ============================================================================

interface CardNegotiationPanelProps {
  cardNegotiation: CardNegotiationHookReturn;
}

export const CardNegotiationPanel: React.FC<CardNegotiationPanelProps> = ({
  cardNegotiation,
}) => {
  const { state: gameState, dispatch } = useGame();
  const { evaluateTransaction, commitTransaction, rejectCustomer } = useGameEngine();
  const { send } = useGameMachine();
  const customer = gameState.currentCustomer;

  const {
    state: negState,
    customerType,
    macroPhase,
    contractTier,
    rateThresholdKey,
    dropHint,
    dealCompleted,
    dealResult,
    actions,
  } = cardNegotiation;

  // Track results for feedback display
  const [lastPlayResult, setLastPlayResult] = useState<CardPlayResult | null>(null);
  const [lastCustomerResult, setLastCustomerResult] = useState<CustomerTurnResult | null>(null);
  // Charity glow effect
  const [showCharityGlow, setShowCharityGlow] = useState(false);

  // Determine if it's player's turn
  const isPlayerTurn = negState.roundPhase === 'player_play' || negState.roundPhase === 'player_draw';

  // --- Action Handlers ---

  const handlePlayCard = (cardInstanceId: string, choiceId?: string, sacrificeTargetId?: string) => {
    const result = actions.playCard(cardInstanceId, choiceId, sacrificeTargetId);
    if (result) {
      setLastPlayResult(result);
      if (result.isInsult) {
        playSfx('FAIL');
      }
    }
  };

  const handleEndTurn = (retainedCardInstanceId?: string) => {
    const result = actions.endTurn(retainedCardInstanceId);
    if (result) {
      setLastCustomerResult(result);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAcceptDeal = () => {
    if (isSubmitting) return;
    const result = actions.acceptDeal();
    if (result.isCharity) {
      setShowCharityGlow(true);
      setTimeout(() => setShowCharityGlow(false), 2000);
    }
    playSfx('CLICK');
    setIsSubmitting(true);

    // Use the existing game engine transaction flow
    const txResult = evaluateTransaction(
      result.pawnAmount,
      result.rateDecimal,
      customer?.desiredAmount,
    );
    setTimeout(() => {
      send({ type: 'TRANSACTION_COMPLETE' });
      commitTransaction(txResult);
    }, 800);
  };

  const handleDismissCustomer = () => {
    actions.dismissCustomer();
    playSfx('CLICK');

    send({ type: 'CUSTOMER_REJECTED' });
    rejectCustomer('RESENTFUL');
  };

  // Portrait resolution
  const portraitSrc = (() => {
    if (!customer) return PORTRAIT_PLACEHOLDER;
    const emotion = 'neutral' as const;
    if (customer.portraits?.[emotion]) return customer.portraits[emotion];
    if (customer.chainId) {
      const charId = customer.chainId.replace(/^chain_/, '');
      return getCharacterPortraitPath(charId, emotion);
    }
    return PORTRAIT_PLACEHOLDER;
  })();

  if (!customer) {
    return (
      <div className="h-full flex items-center justify-center bg-noir-100 text-noir-txt-muted font-mono">
        No customer present
      </div>
    );
  }

  return (
    <div className={cn(
      'h-full flex flex-col bg-noir-100 relative overflow-hidden transition-all duration-700',
      // Phase atmosphere
      macroPhase === 'showdown' && 'bg-gradient-to-b from-red-950/10 to-noir-100',
      macroPhase === 'bargaining' && 'bg-gradient-to-b from-amber-950/5 to-noir-100',
      // Charity golden glow
      showCharityGlow && 'ring-2 ring-amber-400/50 shadow-[inset_0_0_60px_rgba(251,191,36,0.1)]',
    )}>
      {/* Charity glow overlay */}
      {showCharityGlow && (
        <div className="absolute inset-0 z-50 pointer-events-none animate-in fade-in duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 via-transparent to-amber-400/5" />
          <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(251,191,36,0.15)]" />
        </div>
      )}

      {/* ================= TOP: Status Bar ================= */}
      <StatusBar
        currentPawnAmount={negState.currentPawnAmount}
        originalDesiredAmount={negState.originalDesiredAmount}
        ratePercent={negState.currentRate}
        patience={negState.patience}
        maxPatience={negState.maxPatience}
        roundNumber={negState.roundNumber}
        macroPhase={macroPhase}
        contractTier={contractTier}
        appraisalCardsRemaining={negState.appraisalCardsRemaining}
        appraisalCardsTotal={negState.appraisalCardsTotal}
        insightCardsRemaining={negState.insightCardsRemaining}
        insightCardsTotal={negState.insightCardsTotal}
        rateLocked={negState.modifiers.rateLocked}
        priceCutLocked={negState.modifiers.priceCutLocked}
      />

      {/* ================= MIDDLE: Customer + Feedback ================= */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Customer info strip */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-noir-400/30 bg-noir-200/30 shrink-0">
          {/* Portrait (small) */}
          <div className={cn(
            'w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition-all duration-300',
            negState.patience <= 1
              ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
              : 'border-amber-600/40',
          )}>
            <img
              src={portraitSrc}
              alt={customer.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PORTRAIT_PLACEHOLDER;
              }}
            />
          </div>

          {/* Name + type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif font-bold text-noir-txt-primary truncate">
                {customer.name}
              </h3>
              <span className={cn(
                'text-[8px] font-mono px-1.5 py-0.5 rounded border shrink-0',
                customerType === 'HARD' ? 'text-red-400 border-red-900/40 bg-red-950/20' :
                customerType === 'SLY' ? 'text-purple-400 border-purple-900/40 bg-purple-950/20' :
                customerType === 'SOFT' ? 'text-green-400 border-green-900/40 bg-green-950/20' :
                'text-noir-txt-muted border-noir-400/40 bg-noir-300/20',
              )}>
                {customerType}
              </span>
            </div>
            {/* Customer dialogue/observation */}
            {customer.observation && (
              <p className="text-[10px] text-noir-txt-muted font-serif italic truncate mt-0.5">
                {customer.observation}
              </p>
            )}
          </div>

          {/* Drop hint indicator */}
          {dropHint !== 'none' && (
            <span className={cn(
              'shrink-0 text-xs font-bold font-mono w-5 h-5 flex items-center justify-center rounded',
              dropHint === 'disruption' && 'text-red-400 bg-red-950/30 animate-pulse',
              dropHint === 'temptation' && 'text-purple-400 bg-purple-950/30 animate-pulse',
              dropHint === 'narrative' && 'text-blue-400 bg-blue-950/30',
            )}>
              {dropHint === 'disruption' ? '!' : dropHint === 'temptation' ? '*' : '#'}
            </span>
          )}

          {/* Phase indicator (compact) */}
          <div className={cn(
            'shrink-0 px-2 py-1 rounded text-[10px] font-mono font-bold',
            isPlayerTurn
              ? 'bg-amber-950/30 text-amber-400 border border-amber-800/40'
              : 'bg-noir-300/50 text-noir-txt-muted border border-noir-400/30',
          )}>
            {isPlayerTurn ? 'YOUR TURN' : 'WAIT'}
          </div>
        </div>

        {/* Drift bar */}
        <div className="shrink-0">
          <DriftBar ratePercent={negState.currentRate} />
        </div>

        {/* Deck info */}
        <div className="shrink-0">
          <DeckInfo
            drawPileCount={negState.deck.drawPile.length}
            discardPileCount={negState.deck.discardPile.length}
            exhaustedCount={negState.deck.exhausted.length}
          />
        </div>

        {/* Intel strip (persistent insight info) */}
        <div className="shrink-0">
          <IntelStrip
            dispositionRevealed={negState.dispositionRevealed}
            insightResult={negState.insightResult}
            revealedFloorPrice={negState.revealedFloorPrice}
            concessionTier={negState.revealedConcessionTier}
          />
        </div>

        {/* Chat Log area — flex-1 fills remaining space, must come after fixed-height elements */}
        <CardChatLog
          customer={customer}
          customerType={customerType}
          lastPlayResult={lastPlayResult}
          lastCustomerResult={lastCustomerResult}
          rateThresholdKey={rateThresholdKey}
          dropHint={dropHint}
          roundNumber={negState.roundNumber}
        />

      </div>

      {/* ================= BOTTOM: Hand + Actions ================= */}
      <div className="shrink-0 border-t border-noir-400/50 bg-noir-200/50">
        {/* Quick-glance strip — pawn, rate, focus directly above cards */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-noir-400/20 bg-noir-200/30">
          {/* Pawn amount */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-noir-txt-muted font-mono uppercase">Pawn</span>
            <span className="text-sm font-bold font-mono text-amber-400">
              ${negState.currentPawnAmount.toLocaleString()}
            </span>
            {negState.currentPawnAmount !== negState.originalDesiredAmount && (
              <span className={cn(
                'text-[10px] font-mono',
                negState.currentPawnAmount < negState.originalDesiredAmount ? 'text-green-400' : 'text-red-400',
              )}>
                {Math.round(((negState.currentPawnAmount - negState.originalDesiredAmount) / negState.originalDesiredAmount) * 100)}%
              </span>
            )}
          </div>

          {/* Rate */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-noir-txt-muted font-mono uppercase">Rate</span>
            <span className={cn(
              'text-sm font-bold font-mono',
              negState.currentRate === 0 ? 'text-amber-300' :
              negState.currentRate < 10 ? 'text-blue-400' :
              negState.currentRate < 15 ? 'text-orange-400' : 'text-red-400',
            )}>
              {negState.currentRate}%
            </span>
            {negState.modifiers.rateLocked && (
              <span className="text-[8px] text-red-500 font-mono border border-red-900/50 px-1 rounded">LOCK</span>
            )}
          </div>

          {/* Focus */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-500/80 font-mono font-bold uppercase">Focus</span>
            <div className="flex gap-1">
              {Array.from({ length: calculateEffectiveFocus(negState) }).map((_, i) => (
                <span key={i} className={cn(
                  'w-3 h-3 rounded-full border-2 transition-all duration-300',
                  i < negState.focusRemaining
                    ? 'bg-amber-500 border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                    : 'bg-noir-300/50 border-noir-500/50',
                )} />
              ))}
            </div>
            {negState.modifiers.highRateFocusPenalty && (
              <span className="text-[10px] text-red-500 font-mono font-bold">-1</span>
            )}
            {negState.focusDebuffCount > 0 && (
              <span className="text-[10px] text-purple-400 font-mono font-bold">-{negState.focusDebuffCount}</span>
            )}
          </div>
        </div>

        {/* Hand area */}
        <CardHandArea
          hand={negState.deck.hand}
          canPlay={actions.canPlay}
          onPlayCard={handlePlayCard}
          isPlayerTurn={isPlayerTurn}
        />

        {/* Action buttons */}
        <ActionButtons
          isPlayerTurn={isPlayerTurn}
          isActive={negState.isActive}
          isLocked={negState.isLocked}
          hand={negState.deck.hand}
          onAcceptDeal={handleAcceptDeal}
          onDismissCustomer={handleDismissCustomer}
          onEndTurn={handleEndTurn}
        />
      </div>

      {/* ================= Tension overlay for low patience ================= */}
      {negState.patience <= 1 && negState.isActive && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 border-2 border-red-600/30 animate-pulse rounded" />
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/5 via-transparent to-red-950/10" />
        </div>
      )}

      {/* ================= Locked overlay ================= */}
      {negState.isLocked && negState.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-red-950/80 border border-red-700 rounded-lg px-6 py-3 text-center animate-in zoom-in-50 duration-300">
            <p className="text-red-400 font-serif font-bold text-lg">
              Conditions Locked
            </p>
            <p className="text-red-500/60 text-xs font-mono mt-1">
              Patience exhausted - accept or dismiss
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
