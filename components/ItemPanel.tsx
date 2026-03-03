
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useAppraisal } from '../hooks/useAppraisal';
import { APPRAISAL_TEMPLATES } from '../systems/game/templates/appraisalFeedback';
import type { AppraisalFeedback } from './NegotiationPanel';
import { ItemTrait } from '../types';
import { playSfx } from '../systems/game/audio';
import { GAME_CONFIG } from '../systems/game/config';
import { checkItemAnomaly, getAnomalyDetectionThreshold } from '../systems/upgrades';
import { getAnomalyMessage, getAnomalySeverity, getNormalConfirmationMessage } from '../systems/upgrades/spectrometerFeedback';
import { getAttitudeShift } from '../systems/negotiation/attitudeShift';
import { getFakeDialogue } from '../systems/negotiation/fakeDialogues';
import type { FakeLeverageResult } from '../hooks/useNegotiation';

import { VirtualItemView } from './item/VirtualItemView';
import { ItemAppraisalHeader } from './item/ItemAppraisalHeader';
import { TraitList } from './item/TraitList';

// Appraisal feedback visual effect types
type AppraisalEffectType = 'none' | 'range_narrowed' | 'breakthrough' | 'fake' | 'jackpot' | 'mishap';

interface ItemPanelProps {
  applyLeverage: (power: number, description: string) => void;
  applyStolenLeverage: (power: number, description: string, label?: string) => { askReduction: number; minReduction: number };
  applyFakeLeverage: (knowsFake: boolean, perceivedValue: number) => FakeLeverageResult;
  triggerNarrative: (playerLine: string, customerLine: string, impact?: number) => void;
  canInteract: boolean;
  currentAskPrice: number;
  onAppraisalFeedback?: (feedback: AppraisalFeedback) => void;
}

export const ItemPanel: React.FC<ItemPanelProps> = ({ applyLeverage, applyStolenLeverage, applyFakeLeverage, triggerNarrative, canInteract, currentAskPrice, onAppraisalFeedback }) => {
  const { state, dispatch } = useGame();
  const { currentCustomer } = state;
  const item = currentCustomer?.item;
  const { performAppraisal } = useAppraisal();

  const [appraising, setAppraising] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'warning' | 'error' | 'breakthrough', text: string } | null>(null);
  const [hoveredTrait, setHoveredTrait] = useState<ItemTrait | null>(null);
  const [appraisalEffect, setAppraisalEffect] = useState<AppraisalEffectType>('none');
  const [newlyRevealedTraitIds, setNewlyRevealedTraitIds] = useState<Set<string>>(new Set());
  const effectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // B-8: Track previous uncertainty for attitude shift detection
  const prevUncertaintyRef = useRef<number | null>(null);
  const [attitudeShiftText, setAttitudeShiftText] = useState<string | null>(null);

  useEffect(() => {
    setFeedbackMsg(null);
    setAppraisalEffect('none');
    setNewlyRevealedTraitIds(new Set());
    setAttitudeShiftText(null);
    prevUncertaintyRef.current = null;
  }, [currentCustomer?.id]);

  useEffect(() => {
    if (feedbackMsg) {
        const duration = feedbackMsg.type === 'breakthrough' ? 2500 : 3000;
        const timer = setTimeout(() => {
            setFeedbackMsg(null);
        }, duration);
        return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // B-8: Detect uncertainty change and trigger NPC attitude shift
  useEffect(() => {
    if (!item || !currentCustomer) return;
    const prevUnc = prevUncertaintyRef.current;
    if (prevUnc === null) return; // No previous value stored yet

    const currentUnc = item.uncertainty;
    if (currentUnc === prevUnc) return; // No change

    // Use first behavior tag as the primary tag for attitude lookup
    const primaryTag = currentCustomer.behaviorTags[0];
    if (!primaryTag) return;

    const shiftText = getAttitudeShift(primaryTag, prevUnc, currentUnc);
    if (shiftText) {
      setAttitudeShiftText(shiftText);
      onAppraisalFeedback?.({
        type: 'ATTITUDE_SHIFT',
        text: shiftText,
      });
    }

    // Clear the ref so we don't re-trigger until next appraisal
    prevUncertaintyRef.current = null;
  }, [item?.uncertainty]);

  // Auto-dismiss attitude shift text after display
  useEffect(() => {
    if (attitudeShiftText) {
      const timer = setTimeout(() => setAttitudeShiftText(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [attitudeShiftText]);

  // Clear appraisal effect after animation completes
  useEffect(() => {
    if (appraisalEffect !== 'none') {
        const duration = appraisalEffect === 'fake' || appraisalEffect === 'jackpot' ? 1000 : 800;
        effectTimeoutRef.current = setTimeout(() => {
            setAppraisalEffect('none');
        }, duration);
        return () => {
            if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);
        };
    }
  }, [appraisalEffect]);

  if (!item || !currentCustomer) return <div className="h-full bg-[#1c1917] border-x border-[#44403c]"></div>;

  // =========================================================================================
  // VIRTUAL ITEM VIEW (Contract / Offer) - No Appraisal, Document Aesthetic
  // =========================================================================================
  if (item.isVirtual) {
      return <VirtualItemView item={item} currentAskPrice={currentAskPrice} />;
  }

  // =========================================================================================
  // STANDARD PHYSICAL ITEM VIEW
  // =========================================================================================

  const handleAppraiseClick = () => {
      setAppraising(true);
      setFeedbackMsg(null);
      setAppraisalEffect('none');
      setAttitudeShiftText(null);

      // B-8: Capture uncertainty before appraisal for attitude shift detection
      prevUncertaintyRef.current = item.uncertainty;

      setTimeout(() => {
          const result = performAppraisal();
          setAppraising(false);

          if (!result.success) {
              if (result.failureReason === 'ALREADY_KNOWN') {
                  setFeedbackMsg({ type: 'warning', text: "暂无更多线索 (No New Traits)" });
                  onAppraisalFeedback?.({ type: 'ALREADY_KNOWN', text: APPRAISAL_TEMPLATES.ALREADY_KNOWN });
              }
          } else {
              // Handle negative events (MISHAP, IMPATIENT)
              if (result.event && (result.event.type === 'MISHAP' || result.event.type === 'IMPATIENT')) {
                   if (result.event.type === 'MISHAP') {
                       setFeedbackMsg({ type: 'error', text: result.event.message || "鉴定失误" });
                       setAppraisalEffect('mishap');
                       playSfx('FAIL');
                       onAppraisalFeedback?.({ type: 'MISHAP', text: APPRAISAL_TEMPLATES.MISHAP });
                   } else {
                       setFeedbackMsg({ type: 'error', text: result.event.message || "客户不耐烦" });
                       playSfx('WARNING');
                       onAppraisalFeedback?.({ type: 'IMPATIENT', text: APPRAISAL_TEMPLATES.IMPATIENT });
                   }
              }

              // Track newly revealed traits for entrance animation
              if (result.newTraitsFound.length > 0) {
                  setNewlyRevealedTraitIds(new Set(result.newTraitsFound.map(t => t.id)));
                  setTimeout(() => setNewlyRevealedTraitIds(new Set()), 1200);
              }

              // Send feedback for each discovered trait
              if (result.newTraitsFound.length > 0) {
                  if (result.valueJump === 'FAKE') {
                      setFeedbackMsg({ type: 'error', text: "价值崩塌！(VALUE CRASH)" });
                      setAppraisalEffect('fake');
                      playSfx('FAIL');
                      setTimeout(() => playSfx('WARNING'), 300);
                  } else if (result.valueJump === 'JACKPOT') {
                      setFeedbackMsg({ type: 'breakthrough', text: "价值发现！(JACKPOT)" });
                      setAppraisalEffect('jackpot');
                      playSfx('SUCCESS');
                      setTimeout(() => playSfx('CASH'), 400);
                  } else {
                      setFeedbackMsg({ type: 'success', text: `发现了 ${result.newTraitsFound.length} 个新特征!` });
                      setAppraisalEffect('range_narrowed');
                      playSfx('CLICK');
                  }
                  for (const trait of result.newTraitsFound) {
                      const monologueText = trait.dialogueTrigger?.playerLine || trait.description;
                      const isBonus = result.bonusTraitIds.includes(trait.id);
                      onAppraisalFeedback?.({
                          type: 'TRAIT_DISCOVERED',
                          text: monologueText,
                          traitId: trait.id,
                          traitName: trait.name,
                          isBonus,
                      });
                  }
              } else if (!result.event || result.event.type === 'NORMAL' || result.event.type === 'BREAKTHROUGH') {
                  if (result.isBreakthrough) {
                      setFeedbackMsg({ type: 'breakthrough', text: "灵光一闪！估值大幅收窄" });
                      setAppraisalEffect('breakthrough');
                      playSfx('SUCCESS');
                      onAppraisalFeedback?.({ type: 'BREAKTHROUGH', text: APPRAISAL_TEMPLATES.BREAKTHROUGH });
                  } else {
                      setFeedbackMsg({ type: 'success', text: "估值范围已更新 (Range Narrowed)" });
                      setAppraisalEffect('range_narrowed');
                      playSfx('CLICK');
                      onAppraisalFeedback?.({ type: 'RANGE_NARROWED', text: APPRAISAL_TEMPLATES.RANGE_NARROWED });
                  }
              }
          }
      }, 600);
  };

  const handleTraitClick = (trait: ItemTrait) => {
      const isUsed = item.usedTraitIds?.includes(trait.id);
      if (isUsed || !canInteract) return;

      const power = Math.abs(trait.valueImpact);

      dispatch({ type: 'MARK_TRAIT_USED', payload: { traitId: trait.id } });

      const negotiationPower = (trait.type === 'JACKPOT' || trait.type === 'STORY') ? 0 : power;

      if (trait.type === 'STOLEN') {
          const stolenPower = 0.25;
          applyStolenLeverage(stolenPower, trait.name);
          dispatch({ type: 'APPLY_STOLEN_LEVERAGE', payload: { reductionPercent: stolenPower } });
          if (trait.dialogueTrigger) {
              const dialogueLine = trait.dialogueTrigger.playerUseLine || trait.dialogueTrigger.playerLine;
              triggerNarrative(dialogueLine, trait.dialogueTrigger.customerLine, 0);
          }
      } else if (trait.type === 'FAKE') {
          const knowsFake = state.currentCustomer?.customerKnowsFake ?? false;
          const perceivedValue = item.perceivedValue ?? item.realValue;
          const result = applyFakeLeverage(knowsFake, perceivedValue);
          const reductionPercent = knowsFake ? 0.50 : 0.10;
          dispatch({ type: 'APPLY_STOLEN_LEVERAGE', payload: { reductionPercent } });
          const dialogue = getFakeDialogue(knowsFake);
          triggerNarrative(dialogue.playerLine, dialogue.customerLine, 0);
      } else if (trait.dialogueTrigger) {
          const dialogueLine = trait.dialogueTrigger.playerUseLine || trait.dialogueTrigger.playerLine;
          triggerNarrative(dialogueLine, trait.dialogueTrigger.customerLine, negotiationPower);
      } else if (trait.type === 'FLAW') {
          applyLeverage(power, trait.name);
      } else if (trait.type === 'STORY' || trait.type === 'JACKPOT') {
          applyLeverage(0, `话题: ${trait.name}`);
      }
      playSfx('STAMP');
  };

  // Spectrometer anomaly detection
  const anomalyThreshold = getAnomalyDetectionThreshold(state.shopUpgrades);
  const hasAnomaly = checkItemAnomaly(item.perceivedValue, item.realValue, state.shopUpgrades);

  const anomalyMessageData = useMemo(() => {
    if (!hasAnomaly) return null;
    const visualValue = item.perceivedValue ?? item.realValue;
    const pctDiff = item.realValue > 0 ? (Math.abs(visualValue - item.realValue) / item.realValue) * 100 : 0;
    const severity = getAnomalySeverity(pctDiff);
    return { severity, message: getAnomalyMessage(severity) };
  }, [hasAnomaly, item.id, item.perceivedValue, item.realValue]);

  const normalMessage = useMemo(() => {
    return getNormalConfirmationMessage();
  }, [item.id]);

  return (
      <div className={`h-full bg-[#1c1917] border-x border-[#44403c] flex flex-col overflow-hidden relative ${
          appraisalEffect === 'mishap' ? 'animate-shake' : ''
      }`}>

        {/* Value Jump Flash Overlay (FAKE/JACKPOT) */}
        {appraisalEffect === 'fake' && (
            <div className="absolute inset-0 bg-red-600/30 z-50 pointer-events-none animate-value-jump-flash" />
        )}
        {appraisalEffect === 'jackpot' && (
            <div className="absolute inset-0 bg-amber-500/30 z-50 pointer-events-none animate-value-jump-flash" />
        )}
        {/* Breakthrough subtle glow overlay */}
        {appraisalEffect === 'breakthrough' && (
            <div className="absolute inset-0 z-50 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, rgba(217,119,6,0.15) 0%, transparent 70%)',
                animation: 'valueJumpFlash 1.2s ease-out forwards'
            }} />
        )}

        <ItemAppraisalHeader
          item={item}
          canInteract={canInteract}
          appraising={appraising}
          appraisalEffect={appraisalEffect}
          feedbackMsg={feedbackMsg}
          hasAnomaly={hasAnomaly}
          anomalyThreshold={anomalyThreshold}
          anomalyMessageData={anomalyMessageData}
          normalMessage={normalMessage}
          onAppraise={handleAppraiseClick}
          hideAppraisalButton={GAME_CONFIG.CARD_NEGOTIATION.ENABLED}
        />

        {/* B-8: NPC attitude shift quote */}
        {attitudeShiftText && (
          <div className="mx-3 mb-1 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="bg-indigo-950/40 border border-indigo-800/50 rounded px-3 py-2 relative">
              <span className="absolute -top-1 -left-0.5 text-indigo-400/40 text-lg font-serif leading-none">&ldquo;</span>
              <p className="text-xs font-serif italic text-indigo-200/90 pl-3 pr-1">
                {attitudeShiftText}
              </p>
              <span className="absolute -bottom-1 -right-0.5 text-indigo-400/40 text-lg font-serif leading-none">&rdquo;</span>
              <div className="text-[9px] text-indigo-400/60 font-mono uppercase tracking-wider mt-1 pl-3">
                {currentCustomer.name} &middot; Attitude Shift
              </div>
            </div>
          </div>
        )}

        <TraitList
          item={item}
          canInteract={canInteract}
          currentAskPrice={currentAskPrice}
          hoveredTrait={hoveredTrait}
          newlyRevealedTraitIds={newlyRevealedTraitIds}
          onTraitClick={handleTraitClick}
          onTraitHover={setHoveredTrait}
          onTraitLeave={() => setHoveredTrait(null)}
        />
      </div>
  );
};
