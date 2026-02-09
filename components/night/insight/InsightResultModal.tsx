import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Lock,
  CheckCircle2,
  ChevronRight,
  Eye,
  Star,
  CloudFog,
  Flame,
  Tag,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { InsightResult, InsightNarrative } from '../../../systems/insight/types';
import { EssenceBadge } from './EssenceBadge';
import { getTagDisplayInfo } from '../../../systems/items/tagUtils';
import { isStateTag } from '../../../systems/items/tags';

export interface InsightResultModalProps {
  result: {
    result: InsightResult;
    narrative: InsightNarrative;
    oldRange: [number, number];
  } | null;
  onClose: () => void;
}

export const InsightResultModal: React.FC<InsightResultModalProps> = ({ result, onClose }) => {
  const [ritualPhase, setRitualPhase] = useState<'glow' | 'flash' | 'reveal' | 'done'>('glow');
  const [canDismiss, setCanDismiss] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!result) {
      setRitualPhase('glow');
      setCanDismiss(false);
      return;
    }

    if (result.result.isEpiphany) {
      setRitualPhase('glow');
      setCanDismiss(false);

      timerRef.current = setTimeout(() => setRitualPhase('flash'), 800);
      const t2 = setTimeout(() => setRitualPhase('reveal'), 1600);
      const t3 = setTimeout(() => {
        setRitualPhase('done');
        setCanDismiss(true);
      }, 4000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setRitualPhase('done');
      setCanDismiss(true);
    }
  }, [result]);

  if (!result) return null;

  const isEpiphany = result.result.isEpiphany;
  const { rangeNarrowed, newRange, valueLocked, traitDiscovered, unexpectedEvent, glimpse, resonance, revealedHiddenTags } = result.result;
  const oldRange = result.oldRange;

  const handleClose = () => {
    if (canDismiss) onClose();
  };

  return (
    <Modal
      isOpen={!!result}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2 text-purple-300">
          {isEpiphany ? (
            <>
              <Sparkles className="w-5 h-5 text-yellow-400" />
              顿悟!
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5" />
              格物完成
            </>
          )}
        </span>
      }
      size="md"
    >
      {/* Epiphany ritual overlay */}
      {isEpiphany && ritualPhase !== 'done' && (
        <div className={cn(
          'absolute inset-0 z-50 pointer-events-none transition-all duration-700',
          ritualPhase === 'glow' && 'bg-yellow-500/10',
          ritualPhase === 'flash' && 'bg-white/40',
          ritualPhase === 'reveal' && 'bg-yellow-500/5',
        )} />
      )}

      <div className={cn(
        'p-6 rounded border transition-all duration-500',
        isEpiphany
          ? 'bg-gradient-to-r from-yellow-950/50 to-amber-950/30 border-yellow-700/50'
          : 'bg-gradient-to-r from-purple-950/50 to-noir-300/50 border-purple-800'
      )}>
        {/* Narrative */}
        <div className="space-y-3 mb-6 text-stone-300 text-sm italic">
          <p className={cn(
            'transition-opacity duration-1000',
            isEpiphany && ritualPhase === 'glow' && 'opacity-0',
          )}>
            {result.narrative.actionText}
          </p>
          <p className={cn(
            'transition-opacity duration-1000',
            isEpiphany && (ritualPhase === 'glow' || ritualPhase === 'flash') && 'opacity-0',
          )}>
            {result.narrative.discoveryText}
          </p>
          {result.narrative.epiphanyText && (
            <p className={cn(
              'text-yellow-300 font-medium transition-opacity duration-1000',
              isEpiphany && ritualPhase !== 'done' && 'opacity-0',
            )}>
              {result.narrative.epiphanyText}
            </p>
          )}
        </div>

        {/* Unexpected event display */}
        {unexpectedEvent && (
          <div className={cn(
            'mb-4 p-3 rounded border',
            unexpectedEvent === 'DISTRACTION'
              ? 'bg-stone-800/50 border-stone-600 text-stone-400'
              : 'bg-amber-950/50 border-amber-600 text-amber-300'
          )}>
            <div className="flex items-center gap-2">
              {unexpectedEvent === 'DISTRACTION' ? (
                <>
                  <CloudFog className="w-4 h-4 text-stone-500" />
                  <span className="text-sm">今晚心不在焉，产出减半...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">惊人发现! 产出翻倍!</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Glimpse event display */}
        {glimpse && (
          <div className="mb-4 p-3 bg-indigo-950/30 rounded border border-indigo-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] uppercase text-indigo-400 tracking-wider">窥见</span>
            </div>
            <p className="text-sm text-indigo-300/80 italic">{glimpse.text}</p>
          </div>
        )}

        {/* Resonance event display */}
        {resonance && (
          <div className="mb-4 p-3 bg-cyan-950/30 rounded border border-cyan-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase text-cyan-400 tracking-wider">共鸣</span>
            </div>
            <p className="text-sm text-cyan-300/80 italic">{resonance.text}</p>
            <div className="mt-2 flex gap-2">
              {resonance.bonusEssence.craft !== undefined && resonance.bonusEssence.craft > 0 && (
                <span className="text-xs text-blue-400">+{resonance.bonusEssence.craft} 匠心</span>
              )}
              {resonance.bonusEssence.time !== undefined && resonance.bonusEssence.time > 0 && (
                <span className="text-xs text-amber-400">+{resonance.bonusEssence.time} 旧影</span>
              )}
              {resonance.bonusEssence.vibe !== undefined && resonance.bonusEssence.vibe > 0 && (
                <span className="text-xs text-purple-400">+{resonance.bonusEssence.vibe} 灵韵</span>
              )}
            </div>
          </div>
        )}

        {/* Appraisal Results */}
        {(rangeNarrowed || traitDiscovered) && (
          <div className="mb-4 space-y-2">
            {rangeNarrowed && newRange && (
              <div className="flex items-center gap-2 text-sm">
                <ChevronRight className="w-4 h-4 text-pawn-green" />
                <span className="text-stone-400">估价收窄:</span>
                <span className="text-stone-500 line-through">
                  ${oldRange[0].toLocaleString()} ~ ${oldRange[1].toLocaleString()}
                </span>
                <span className="text-stone-400">→</span>
                {valueLocked ? (
                  <span className="text-pawn-green font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    ${newRange[0].toLocaleString()}
                    {newRange[0] !== newRange[1] && ` ~ $${newRange[1].toLocaleString()}`}
                    {' '}(已锁定)
                  </span>
                ) : (
                  <span className="text-pawn-accent font-medium">
                    ${newRange[0].toLocaleString()} ~ ${newRange[1].toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {traitDiscovered && (
              <div className="flex items-start gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div>
                  <span className="text-stone-400">发现特征:</span>
                  <span className={cn(
                    'ml-2 px-2 py-0.5 rounded text-xs',
                    traitDiscovered.type === 'FLAW' && 'bg-red-900/50 text-red-400 border border-red-800',
                    traitDiscovered.type === 'STORY' && 'bg-blue-900/50 text-blue-400 border border-blue-800',
                    traitDiscovered.type === 'FAKE' && 'bg-purple-900/50 text-purple-400 border border-purple-800',
                    traitDiscovered.type === 'JACKPOT' && 'bg-amber-900/50 text-amber-400 border border-amber-800',
                    !['FLAW', 'STORY', 'FAKE', 'JACKPOT'].includes(traitDiscovered.type) && 'bg-stone-700 text-stone-300 border border-stone-600'
                  )}>
                    {traitDiscovered.name}
                  </span>
                  {traitDiscovered.description && (
                    <p className="text-stone-500 text-xs mt-1 ml-0">
                      {traitDiscovered.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revealed Hidden Tags (G2 Discovery) */}
        {revealedHiddenTags && revealedHiddenTags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-stone-400">
                {isEpiphany ? '揭示全部隐藏属性:' : '发现隐藏属性:'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {revealedHiddenTags.map(tag => {
                const info = getTagDisplayInfo(tag);
                return (
                  <div
                    key={tag}
                    className="px-2.5 py-1.5 rounded border border-cyan-700/50 bg-cyan-950/30 text-cyan-300 text-xs flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                  >
                    <span className="text-sm">{info.icon}</span>
                    <span className="font-medium">{info.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Essence Gained */}
        <div className="flex flex-wrap gap-3">
          {result.result.essenceGained.craft !== undefined &&
            result.result.essenceGained.craft > 0 && (
              <EssenceBadge
                type="CRAFT"
                amount={result.result.essenceGained.craft}
                bonus={result.result.bonusEssence?.craft}
              />
            )}
          {result.result.essenceGained.time !== undefined &&
            result.result.essenceGained.time > 0 && (
              <EssenceBadge
                type="TIME"
                amount={result.result.essenceGained.time}
                bonus={result.result.bonusEssence?.time}
              />
            )}
          {result.result.essenceGained.vibe !== undefined &&
            result.result.essenceGained.vibe > 0 && (
              <EssenceBadge
                type="VIBE"
                amount={result.result.essenceGained.vibe}
                bonus={result.result.bonusEssence?.vibe}
              />
            )}
        </div>

        {isEpiphany && (
          <div className="mt-4 text-xs text-yellow-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            精力已返还!
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-end mt-4">
        <Button
          onClick={handleClose}
          disabled={!canDismiss}
          className={cn('px-6', !canDismiss && 'opacity-50 cursor-not-allowed')}
        >
          {canDismiss ? '确定' : '...'}
        </Button>
      </div>
    </Modal>
  );
};
