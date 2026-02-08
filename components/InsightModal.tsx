/**
 * InsightModal - Displays customer insight results
 *
 * v1.4 (UI-2 refactored):
 * - Removes explicit disposition labels (I-9: SHOW_DISPOSITION_LABEL_IN_NEGOTIATION = false)
 * - Shows behavioral descriptions instead of labels
 * - Floor hint uses behavioral description text (not direct price hints)
 * - Moral context (for story customers)
 */

import React from 'react';
import { X, Eye, Heart } from 'lucide-react';
import { Button } from './ui/Button';
import {
  CustomerInsightResult,
  DISPOSITION_INFO,
  SHOW_DISPOSITION_LABEL_IN_NEGOTIATION,
  ForesightInfo,
} from '../systems/customerInsight';

interface InsightModalProps {
  result: CustomerInsightResult;
  onClose: () => void;
  foresight?: ForesightInfo | null;
}

export const InsightModal: React.FC<InsightModalProps> = ({ result, onClose, foresight }) => {
  const dispositionInfo = DISPOSITION_INFO[result.disposition];

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-noir-200 border border-noir-400 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-noir-300 border-b border-noir-400 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <Eye className="w-5 h-5" />
            <span className="font-serif font-bold text-lg">洞察结果</span>
          </div>
          <button
            onClick={onClose}
            className="text-noir-txt-muted hover:text-noir-txt-primary transition-colors p-1 rounded-sm hover:bg-noir-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* Disposition - label only shown if SHOW_DISPOSITION_LABEL_IN_NEGOTIATION is true */}
          <div className="space-y-3">
            {SHOW_DISPOSITION_LABEL_IN_NEGOTIATION && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{dispositionInfo.icon}</span>
                <div>
                  <div className="text-xs text-noir-txt-muted uppercase tracking-wider mb-0.5">心理倾向</div>
                  <div className={`text-xl font-bold ${dispositionInfo.color}`}>
                    {dispositionInfo.label}
                  </div>
                </div>
              </div>
            )}

            {/* Behavioral Description (Layer 1) */}
            <div className="space-y-1">
              <div className="text-xs text-noir-txt-muted uppercase tracking-wider">行为观察</div>
              <div className="bg-noir-100 border-l-2 border-amber-600/50 p-4">
                <p className="font-serif text-sm text-noir-txt-secondary leading-relaxed italic">
                  "{result.dispositionText}"
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-noir-400" />

          {/* Floor Hint - now uses behavioral description text (Layer 2) */}
          <div className="space-y-2">
            <div className="text-xs text-noir-txt-muted uppercase tracking-wider">底线观察</div>
            <div className="bg-noir-100 border-l-2 border-purple-600/50 p-4">
              <p className="font-serif text-sm text-amber-500/90 leading-relaxed italic">
                "{result.floorHint}"
              </p>
            </div>
          </div>

          {/* Moral Context (Layer 3, if available) */}
          {result.moralContext && (
            <>
              <div className="border-t border-noir-400" />
              <div className="bg-red-950/20 border border-red-900/30 rounded p-4">
                <div className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="font-serif text-sm text-red-300/90 leading-relaxed italic">
                    {result.moralContext}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Foresight (Layer 4, UI-7) */}
          {foresight && (
            <>
              <div className="border-t border-noir-400" />
              <ForesightDisplay foresight={foresight} />
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-noir-300 border-t border-noir-400 p-4">
          <Button onClick={onClose} className="w-full">
            确认
          </Button>
        </div>

      </div>
    </div>
  );
};

// ============================================================================
// UI-7: Foresight Info Display (洞若观火)
// ============================================================================

const FORESIGHT_STYLES: Record<'low' | 'medium' | 'high', {
  border: string;
  bg: string;
  text: string;
  label: string;
  icon: string;
}> = {
  high: {
    border: 'border-amber-600/60',
    bg: 'bg-amber-950/20',
    text: 'text-amber-300',
    label: '强烈直觉',
    icon: '🔥',
  },
  medium: {
    border: 'border-indigo-600/50',
    bg: 'bg-indigo-950/20',
    text: 'text-indigo-300',
    label: '模糊预感',
    icon: '🌊',
  },
  low: {
    border: 'border-stone-600/50',
    bg: 'bg-stone-900/20',
    text: 'text-stone-400',
    label: '一闪而过',
    icon: '💨',
  },
};

const ForesightDisplay: React.FC<{ foresight: ForesightInfo }> = ({ foresight }) => {
  const style = FORESIGHT_STYLES[foresight.confidence];

  return (
    <div className={`${style.bg} border ${style.border} rounded p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{style.icon}</span>
        <div className="text-xs uppercase tracking-wider text-noir-txt-muted">
          洞若观火
          <span className={`ml-2 ${style.text} font-bold`}>{style.label}</span>
        </div>
      </div>
      <p className={`font-serif text-sm leading-relaxed italic ${style.text}`}>
        {foresight.predictionText}
      </p>
    </div>
  );
};
