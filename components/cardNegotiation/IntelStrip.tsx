
import React from 'react';
import { cn } from '../../lib/utils';
import { createTextRegistry } from '../../systems/utils/textRegistry';
import { DISPOSITION_INFO } from '../../systems/customerInsight/types';
import type { CustomerInsightResult, Disposition } from '../../systems/customerInsight/types';
import type { ConcessionTier } from '../../systems/negotiation/probeEffects';

import intelStripCsv from '../../assets/data/texts/intel_strip.csv?raw';

const textRegistry = createTextRegistry('intel_strip', intelStripCsv);

// ============================================================================
// Types
// ============================================================================

interface IntelStripProps {
  /** Whether disposition has been revealed (controls show/hide of entire strip) */
  dispositionRevealed: boolean;
  /** Insight result (from negState.insightResult) */
  insightResult?: CustomerInsightResult;
  /** Revealed floor price (from negState.revealedFloorPrice) */
  revealedFloorPrice?: number;
  /** Concession tier from probe result */
  concessionTier?: ConcessionTier;
}

// ============================================================================
// Helpers
// ============================================================================

const DISPOSITION_KEY_MAP: Record<Disposition, string> = {
  desperate: 'disposition_desperate',
  firm: 'disposition_firm',
  bluffing: 'disposition_bluffing',
  sincere: 'disposition_sincere',
};

const CONCESSION_KEY_MAP: Record<string, string> = {
  high: 'concession_high',
  medium: 'concession_medium',
  low: 'concession_low',
};

const CONCESSION_COLOR_MAP: Record<string, string> = {
  high: 'text-green-400',
  medium: 'text-amber-400',
  low: 'text-red-400',
};

function formatFloorPrice(price: number): string {
  const label = textRegistry.get('label_floor') || '底线约';
  return `${label} \u00a5${price.toLocaleString()}`;
}

// ============================================================================
// Component
// ============================================================================

export const IntelStrip: React.FC<IntelStripProps> = ({
  dispositionRevealed,
  insightResult,
  revealedFloorPrice,
  concessionTier,
}) => {
  const unknownText = textRegistry.get('slot_unknown') || '?';
  const concessionLabel = textRegistry.get('label_concession') || '让步';

  // Disposition slot
  const dispositionSlot = (() => {
    if (!insightResult) return null;
    const d = insightResult.disposition;
    const key = DISPOSITION_KEY_MAP[d];
    const label = textRegistry.get(key) || d;
    const info = DISPOSITION_INFO[d];
    return { label, colorClass: info.color };
  })();

  // Floor price slot
  const floorSlot = revealedFloorPrice != null
    ? { text: formatFloorPrice(revealedFloorPrice), revealed: true }
    : { text: unknownText, revealed: false };

  // Concession slot
  const concessionSlot = (() => {
    if (concessionTier != null) {
      const key = CONCESSION_KEY_MAP[concessionTier];
      const label = key ? textRegistry.get(key) : concessionTier;
      const colorClass = CONCESSION_COLOR_MAP[concessionTier] || 'text-noir-txt-muted';
      return { text: `${concessionLabel} ${label || concessionTier}`, colorClass, revealed: true };
    }
    return { text: unknownText, colorClass: '', revealed: false };
  })();

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-500 ease-out',
        dispositionRevealed ? 'max-h-8 opacity-100' : 'max-h-0 opacity-0',
      )}
    >
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-noir-400/30 bg-noir-200/30 font-serif text-[11px]">
        {/* Disposition slot */}
        {dispositionSlot && (
          <span className={cn('flex items-center gap-1', dispositionSlot.colorClass)}>
            <span className="text-[9px] opacity-60">&#10070;</span>
            {dispositionSlot.label}
          </span>
        )}

        {/* Floor price slot */}
        <span className={cn(
          'flex items-center gap-1',
          floorSlot.revealed ? 'text-amber-300' : 'animate-pulse text-noir-txt-muted/50',
        )}>
          <span className="text-[9px] opacity-60">&#9671;</span>
          {floorSlot.text}
        </span>

        {/* Concession slot */}
        <span className={cn(
          'flex items-center gap-1',
          concessionSlot.revealed ? concessionSlot.colorClass : 'animate-pulse text-noir-txt-muted/50',
        )}>
          <span className="text-[9px] opacity-60">&#10056;</span>
          {concessionSlot.text}
        </span>
      </div>
    </div>
  );
};
