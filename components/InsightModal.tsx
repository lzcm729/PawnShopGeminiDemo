/**
 * InsightModal - Displays customer insight results
 *
 * Shows the player's psychological reading of the current customer:
 * - Disposition (desperate/firm/bluffing/sincere) with icon
 * - Descriptive text about their mental state
 * - Floor hint about their price bottom line
 * - Moral context (for story customers)
 */

import React from 'react';
import { X, Eye, Heart } from 'lucide-react';
import { Button } from './ui/Button';
import { CustomerInsightResult, DISPOSITION_INFO } from '../systems/customerInsight';

interface InsightModalProps {
  result: CustomerInsightResult;
  onClose: () => void;
}

export const InsightModal: React.FC<InsightModalProps> = ({ result, onClose }) => {
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

          {/* Disposition */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{dispositionInfo.icon}</span>
              <div>
                <div className="text-xs text-noir-txt-muted uppercase tracking-wider mb-0.5">心理倾向</div>
                <div className={`text-xl font-bold ${dispositionInfo.color}`}>
                  {dispositionInfo.label}
                </div>
              </div>
            </div>

            {/* Disposition Description */}
            <div className="bg-noir-100 border-l-2 border-noir-400 p-4">
              <p className="font-serif text-sm text-noir-txt-secondary leading-relaxed italic">
                "{result.dispositionText}"
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-noir-400" />

          {/* Floor Hint */}
          <div className="space-y-2">
            <div className="text-xs text-noir-txt-muted uppercase tracking-wider">底线暗示</div>
            <p className="font-serif text-sm text-amber-500/90 leading-relaxed">
              {result.floorHint}
            </p>
          </div>

          {/* Moral Context (if available) */}
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
