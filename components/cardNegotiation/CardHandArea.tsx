
import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import type { Card, CardPlayChoice, CardEffect } from '../../systems/cardNegotiation/types';
import { playSfx } from '../../systems/game/audio';

/** Generate a compact, human-readable summary of a card's mechanical effects */
function summarizeEffects(card: Card): string[] {
  const lines: string[] = [];

  // Negative type costs
  if (card.negativeType === 'sacrifice') lines.push('丢弃一张手牌');
  if (card.negativeType === 'occupation') lines.push('占据手牌位');
  if (card.negativeType === 'debuff') lines.push('Focus -1');

  // Focus cost already shown by top-left badge, skip here

  for (const fx of card.effects) {
    switch (fx.type) {
      case 'economic': {
        if (fx.pawnPercent) {
          const sign = fx.pawnPercent > 0 ? '+' : '';
          lines.push(`当金 ${sign}${fx.pawnPercent}%`);
        }
        if (fx.rateAdjust) {
          const sign = fx.rateAdjust > 0 ? '+' : '';
          lines.push(`利率 ${sign}${fx.rateAdjust}%`);
        }
        if (fx.lockRate) lines.push('锁定利率');
        if (fx.resetRate) lines.push('利率归零');
        if (fx.lockPriceCut) lines.push('锁定压价');
        break;
      }
      case 'information': {
        if (fx.shrinkPercent) lines.push(`范围收缩 ${fx.shrinkPercent}%`);
        if (fx.canDiscoverTrait) lines.push('可能发现特征');
        if (fx.generateInsightCards) lines.push('生成洞察牌');
        if (fx.insightLayer) lines.push(`洞察 Lv.${fx.insightLayer}`);
        if (fx.addUncertainty) lines.push(`不确定性 +${Math.round(fx.addUncertainty * 100)}%`);
        if (fx.vagueInfo) lines.push('模糊信息');
        break;
      }
      case 'narrative': {
        if (fx.humanityDelta) lines.push(`人情 ${fx.humanityDelta > 0 ? '+' : ''}${fx.humanityDelta}`);
        if (fx.credibilityDelta) lines.push(`商誉 ${fx.credibilityDelta > 0 ? '+' : ''}${fx.credibilityDelta}`);
        if (fx.innocenceDelta) lines.push(`清白 ${fx.innocenceDelta > 0 ? '+' : ''}${fx.innocenceDelta}`);
        if (fx.triggerDialogue) lines.push('触发对话');
        break;
      }
      case 'patience': {
        if (fx.patienceCost && fx.patienceCost > 0) lines.push(`耐心 -${fx.patienceCost}`);
        if (fx.patienceRecover && fx.patienceRecover > 0) lines.push(`耐心 +${fx.patienceRecover}`);
        break;
      }
    }
  }

  return lines.length > 0 ? lines : ['无特殊效果'];
}

interface CardHandAreaProps {
  hand: Card[];
  canPlay: (card: Card) => boolean;
  onPlayCard: (cardInstanceId: string, choiceId?: string, sacrificeTargetId?: string) => void;
  isPlayerTurn: boolean;
  drawPileCount: number;
  discardPileCount: number;
  exhaustedCount: number;
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

// Negative card style overrides
const NEGATIVE_CARD_STYLES: Record<string, { border: string; bg: string; label: string; icon: string }> = {
  occupation: {
    border: 'border-gray-600/60 hover:border-gray-400',
    bg: 'bg-gray-900/40',
    label: 'text-gray-400',
    icon: '\u26D3', // chain
  },
  debuff: {
    border: 'border-purple-600/60 hover:border-purple-400',
    bg: 'bg-purple-900/30',
    label: 'text-purple-400',
    icon: '\u25BC', // down arrow
  },
  sacrifice: {
    border: 'border-red-600/60 hover:border-red-400',
    bg: 'bg-red-900/30',
    label: 'text-red-400',
    icon: '\u2620', // skull
  },
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
  drawPileCount,
  discardPileCount,
  exhaustedCount,
}) => {
  const [choiceCard, setChoiceCard] = useState<Card | null>(null);
  const [sacrificeMode, setSacrificeMode] = useState<{ sourceCard: Card } | null>(null);

  const handleCardClick = (card: Card) => {
    if (!isPlayerTurn) return;

    // If in sacrifice mode, this click selects the sacrifice target
    if (sacrificeMode) {
      if (card.instanceId === sacrificeMode.sourceCard.instanceId) return;
      if (card.negativeType) return;
      playSfx('CLICK');
      onPlayCard(sacrificeMode.sourceCard.instanceId, undefined, card.instanceId);
      setSacrificeMode(null);
      return;
    }

    if (!canPlay(card)) return;
    playSfx('CLICK');

    // Sacrifice cards enter target selection mode
    if (card.negativeType === 'sacrifice') {
      setSacrificeMode({ sourceCard: card });
      return;
    }

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
      {/* Sacrifice mode prompt */}
      {sacrificeMode && (
        <div className="flex items-center justify-center gap-2 py-1 mb-1.5 bg-red-950/30 border border-red-800/30 rounded">
          <span className="text-[10px] text-red-400 font-mono">
            {'\u2620'} {'\u9009\u62E9\u4E00\u5F20\u624B\u724C\u732E\u796D'}
          </span>
          <button
            onClick={() => setSacrificeMode(null)}
            className="text-[10px] text-noir-txt-muted hover:text-red-400 font-mono underline"
          >
            {'\u53D6\u6D88'}
          </button>
        </div>
      )}

      {/* Hand label + deck info */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-noir-txt-muted font-mono uppercase tracking-widest">
            Hand
          </span>
          <span className="text-[10px] text-noir-txt-muted font-mono">
            {hand.length}/5
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" title="Draw pile">
            <span className="text-[9px] text-amber-500 font-mono font-bold">{drawPileCount}</span>
            <span className="text-[9px] text-noir-txt-muted font-mono">Draw</span>
          </div>
          <div className="flex items-center gap-1" title="Discard pile">
            <span className="text-[9px] text-noir-txt-muted font-mono font-bold">{discardPileCount}</span>
            <span className="text-[9px] text-noir-txt-muted font-mono">Disc</span>
          </div>
          {exhaustedCount > 0 && (
            <div className="flex items-center gap-1" title="Used">
              <span className="text-[9px] text-red-500 font-mono font-bold">{exhaustedCount}</span>
              <span className="text-[9px] text-red-500/60 font-mono">Used</span>
            </div>
          )}
        </div>
      </div>

      {/* Cards — horizontal layout with hover-expand */}
      <div className="flex gap-2 justify-center items-center min-h-[80px] overflow-visible">
        {hand.length === 0 ? (
          <div className="text-noir-txt-muted text-xs font-mono italic opacity-50 py-4">
            (empty hand)
          </div>
        ) : (
          hand.map((card) => {
            // Determine styles: negative cards override normal card type styles
            const negStyles = card.negativeType ? NEGATIVE_CARD_STYLES[card.negativeType] : null;
            const styles = negStyles || CARD_TYPE_STYLES[card.cardType] || CARD_TYPE_STYLES.permanent;
            const categoryIcon = negStyles?.icon || CATEGORY_ICONS[card.category] || '?';
            const typeLabel = CARD_TYPE_LABELS[card.cardType] || '';

            // Playability in normal mode vs sacrifice target mode
            const isSacrificeSource = sacrificeMode?.sourceCard.instanceId === card.instanceId;
            const isSacrificeTarget = sacrificeMode && !isSacrificeSource && !card.negativeType;
            const isSacrificeBlocked = sacrificeMode && !isSacrificeSource && !!card.negativeType;
            const playable = sacrificeMode
              ? (isSacrificeTarget ?? false)
              : (isPlayerTurn && canPlay(card));

            const focusCost = card.focusCost ?? 0;

            return (
              <button
                key={card.instanceId}
                onClick={() => handleCardClick(card)}
                disabled={!playable && !isSacrificeSource}
                className={cn(
                  'group relative flex flex-row h-[120px] rounded-lg border-2 transition-all duration-300 ease-out overflow-visible',
                  styles.border,
                  styles.bg,
                  // Sacrifice mode
                  isSacrificeSource && 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse',
                  isSacrificeTarget && 'border-dashed border-red-600/80 hover:border-red-400 cursor-pointer',
                  isSacrificeBlocked && 'opacity-30 cursor-not-allowed',
                  // Normal mode
                  !sacrificeMode && playable
                    ? 'cursor-pointer hover:shadow-lg hover:shadow-amber-900/20 active:scale-[0.98]'
                    : !sacrificeMode ? 'opacity-50 cursor-not-allowed' : '',
                )}
                title={card.description}
              >
                {/* Focus cost badge (top-left, overlapping border) */}
                <span className={cn(
                  'absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold rounded-full border z-10',
                  focusCost === 0 && 'bg-noir-300 border-noir-500 text-noir-txt-muted',
                  focusCost === 1 && 'bg-blue-950 border-blue-700 text-blue-400',
                  focusCost >= 2 && 'bg-amber-950 border-amber-700 text-amber-400',
                )}>
                  {focusCost}
                </span>

                {/* === LEFT: Identity (always visible) === */}
                <div className="flex flex-col justify-center gap-1 px-3 py-2 w-[150px] shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold opacity-60 shrink-0">{categoryIcon}</span>
                    <span className="text-sm font-serif font-bold text-noir-txt-primary leading-tight truncate">
                      {card.name}
                    </span>
                  </div>
                  {/* Type / negative badge */}
                  <div className="flex items-center gap-1">
                    {card.negativeType ? (
                      <span className={cn(
                        'text-[8px] font-mono font-bold px-1 py-0.5 rounded border leading-none',
                        card.negativeType === 'occupation' && 'bg-gray-900 border-gray-700 text-gray-400',
                        card.negativeType === 'debuff' && 'bg-purple-950 border-purple-700 text-purple-400',
                        card.negativeType === 'sacrifice' && 'bg-red-950 border-red-700 text-red-400',
                      )}>
                        {negStyles?.icon} {card.negativeType}
                      </span>
                    ) : card.cardType !== 'permanent' ? (
                      <span className={cn(
                        'text-[8px] font-mono font-bold px-1 py-0.5 rounded border leading-none',
                        card.cardType === 'consumable'
                          ? 'bg-red-950/60 border-red-800/60 text-red-400'
                          : 'bg-purple-950/60 border-purple-800/60 text-purple-400',
                      )}>
                        {typeLabel}
                      </span>
                    ) : null}
                    {card.hasChoice && (
                      <span className="text-[8px] text-amber-500 font-bold">...</span>
                    )}
                  </div>
                  {/* Effect tags */}
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                    {summarizeEffects(card).map((line, i) => (
                      <span key={i} className="text-[9px] text-amber-400/70 font-mono leading-tight">
                        {line}
                      </span>
                    ))}
                  </div>
                </div>

                {/* === RIGHT: Description (expand on hover) === */}
                <div className={cn(
                  'w-0 opacity-0 overflow-hidden transition-all duration-300 ease-out border-l border-transparent',
                  'group-hover:w-[160px] group-hover:opacity-100 group-hover:border-noir-400/30',
                )}>
                  <div className="px-3 py-2 h-full flex flex-col justify-center">
                    <div className="text-[11px] text-noir-txt-muted leading-snug line-clamp-3">
                      {card.description}
                    </div>
                    {card.hasChoice && (
                      <div className="text-[9px] text-amber-500/80 font-mono mt-1">
                        点击选择...
                      </div>
                    )}
                  </div>
                </div>
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
