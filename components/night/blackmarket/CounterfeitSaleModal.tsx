/**
 * CounterfeitSaleModal
 *
 * Synchronous blocking sale flow for counterfeit items.
 * Design doc §6.5: Progress bar runs ~4 seconds, then reveals detection result.
 * Detection result is communicated with explicit text (not implied by price difference).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/Button';

export interface CounterfeitSaleResult {
  detected: boolean;
  finalPrice: number;
  originalPrice: number;
  heatGain: number;
  credibilityLoss: number;
  innocenceLoss: number;
  itemName: string;
}

interface CounterfeitSaleModalProps {
  isOpen: boolean;
  itemName: string;
  onComplete: () => void;
  result: CounterfeitSaleResult | null;
}

// Progress bar phase durations
const PROGRESS_DURATION_MS = 4000;
const RESULT_FADE_DELAY_MS = 300;

// Hint texts (will be replaced by CSV loading if available)
const PROGRESS_HINTS = [
  '联系人正在检查货品...',
  '对方仔细端详着每一处细节...',
  '等待中...指尖不自觉地敲着桌面。',
];

export const CounterfeitSaleModal: React.FC<CounterfeitSaleModalProps> = ({
  isOpen,
  itemName,
  onComplete,
  result,
}) => {
  const [phase, setPhase] = useState<'progress' | 'result'>('progress');
  const [progress, setProgress] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('progress');
      setProgress(0);
      setResultVisible(false);
      setHintIndex(Math.floor(Math.random() * PROGRESS_HINTS.length));
    }
  }, [isOpen]);

  // Animate progress bar
  useEffect(() => {
    if (!isOpen || phase !== 'progress') return;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(1, elapsed / PROGRESS_DURATION_MS);
      setProgress(pct);

      if (pct < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Progress complete, show result
        setPhase('result');
        setTimeout(() => setResultVisible(true), RESULT_FADE_DELAY_MS);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, phase]);

  const handleClose = useCallback(() => {
    if (phase === 'result') {
      onComplete();
    }
  }, [phase, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90">
      {/* CRT Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_3px] pointer-events-none z-40 opacity-20" />

      <div className="w-full max-w-md mx-4">
        {phase === 'progress' ? (
          <ProgressPhase
            progress={progress}
            hint={PROGRESS_HINTS[hintIndex]}
            itemName={itemName}
          />
        ) : (
          <ResultPhase
            result={result}
            visible={resultVisible}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Progress Phase
// ============================================================================

interface ProgressPhaseProps {
  progress: number;
  hint: string;
  itemName: string;
}

const ProgressPhase: React.FC<ProgressPhaseProps> = ({ progress, hint, itemName }) => {
  return (
    <div className="text-center font-mono text-[#00ff41]">
      <Eye className="w-10 h-10 mx-auto mb-6 opacity-60 animate-pulse" />

      <div className="text-sm mb-2 text-[#00ff41]/60 tracking-wider">
        {'>'} PROCESSING_SALE
      </div>
      <div className="text-xs mb-6 text-[#00ff41]/40">
        {itemName}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[#0a1a0a] border border-[#00ff41]/30 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[#00ff41] rounded-full transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="text-xs text-[#00ff41]/50 italic">
        {hint}
      </div>

      {/* Percentage */}
      <div className="text-lg font-bold mt-3 tabular-nums">
        {Math.floor(progress * 100)}%
      </div>
    </div>
  );
};

// ============================================================================
// Result Phase
// ============================================================================

interface ResultPhaseProps {
  result: CounterfeitSaleResult | null;
  visible: boolean;
  onClose: () => void;
}

const ResultPhase: React.FC<ResultPhaseProps> = ({ result, visible, onClose }) => {
  if (!result) return null;

  const { detected, finalPrice, originalPrice, heatGain, credibilityLoss, innocenceLoss } = result;

  // Result texts
  const UNDETECTED_TEXTS = [
    '交易顺利完成。',
    '联系人点了点头，将钱推过来。',
    '没有多余的话。钱货两清。',
  ];

  const DETECTED_TEXTS = [
    '联系人翻看了一会儿，眉头微皱。"这东西...有点意思。"',
    '对方放下东西，意味深长地看了你一眼。"价格得重新谈谈。"',
    '"我的人看过了。"联系人的语气平淡得让人不安。"打个折吧。"',
  ];

  const texts = detected ? DETECTED_TEXTS : UNDETECTED_TEXTS;
  const [textIndex] = useState(() => Math.floor(Math.random() * texts.length));
  const displayText = texts[textIndex];

  return (
    <div className={cn(
      'transition-opacity duration-500',
      visible ? 'opacity-100' : 'opacity-0'
    )}>
      <div className={cn(
        'rounded border p-6 font-mono',
        detected
          ? 'bg-red-950/30 border-red-800/50'
          : 'bg-[#0a1a0a] border-[#00ff41]/30'
      )}>
        {/* Status icon */}
        <div className="flex justify-center mb-4">
          {detected ? (
            <ShieldAlert className="w-10 h-10 text-red-400" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-[#00ff41]" />
          )}
        </div>

        {/* Status label */}
        <div className={cn(
          'text-center text-sm tracking-wider mb-4 font-bold',
          detected ? 'text-red-400' : 'text-[#00ff41]'
        )}>
          {detected ? '> 被识破' : '> 交易完成'}
        </div>

        {/* Narrative text - the key feedback per design doc §6.5 */}
        <p className={cn(
          'text-sm italic text-center mb-6 leading-relaxed',
          detected ? 'text-red-300/80' : 'text-[#00ff41]/80'
        )}>
          {displayText}
        </p>

        {/* Price display */}
        <div className={cn(
          'rounded p-4 mb-4',
          detected ? 'bg-red-950/20 border border-red-900/30' : 'bg-[#001a00] border border-[#00ff41]/20'
        )}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-stone-500">售价</span>
            <span className={cn(
              'text-xl font-bold tabular-nums',
              detected ? 'text-red-400' : 'text-[#00ff41]'
            )}>
              ${finalPrice}
            </span>
          </div>
          {detected && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-600">原价</span>
              <span className="text-stone-500 line-through">${originalPrice}</span>
            </div>
          )}
        </div>

        {/* Side effects */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-amber-400/70">
            <AlertTriangle className="w-3 h-3" />
            <span>热度 +{heatGain}</span>
          </div>
          {detected && (
            <>
              <div className="flex items-center gap-2 text-red-400/70">
                <AlertTriangle className="w-3 h-3" />
                <span>商誉 -{credibilityLoss}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400/70">
                <AlertTriangle className="w-3 h-3" />
                <span>清白 -{innocenceLoss}</span>
              </div>
            </>
          )}
          {/* Innocence cost on every counterfeit sale per design doc §7 */}
          <div className="flex items-center gap-2 text-purple-400/70">
            <AlertTriangle className="w-3 h-3" />
            <span>清白 -4 (伪造出售)</span>
          </div>
        </div>
      </div>

      {/* Close button */}
      <div className="flex justify-center mt-4">
        <Button
          onClick={onClose}
          className={cn(
            'px-8',
            detected
              ? 'bg-red-900/50 hover:bg-red-800/50 border-red-800'
              : 'bg-[#002200] hover:bg-[#003300] border-[#00ff41]/30 text-[#00ff41]'
          )}
        >
          确定
        </Button>
      </div>
    </div>
  );
};
