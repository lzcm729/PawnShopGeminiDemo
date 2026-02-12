import React from 'react';
import {
  ScanEye,
  Package,
  Shirt,
  ShoppingBag,
  Smartphone,
  Gem,
  Music,
  Gamepad2,
  Archive,
  Skull,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Item } from '../../types';
import { useGame } from '../../store/GameContext';
import { getUncertaintyRisk } from '../../systems/items/utils';
import { getDisplayName, getItemTagsDisplay, getHiddenTagCount } from '../../systems/items/tagUtils';
import { getItemIcon } from '../../systems/assets';
import { isStateTag } from '../../systems/items/tags';

type AppraisalEffectType = 'none' | 'range_narrowed' | 'breakthrough' | 'fake' | 'jackpot' | 'mishap';

const getIcon = (category: string) => {
    switch(category) {
        case '服饰': return <Shirt className="w-20 h-20 text-stone-600" />;
        case '奢侈品': return <ShoppingBag className="w-20 h-20 text-stone-600" />;
        case '电子产品': return <Smartphone className="w-20 h-20 text-stone-600" />;
        case '珠宝': return <Gem className="w-20 h-20 text-stone-600" />;
        case '违禁品': return <Skull className="w-20 h-20 text-stone-600" />;
        case '古玩': return <Archive className="w-20 h-20 text-stone-600" />;
        case '玩具': return <Gamepad2 className="w-20 h-20 text-stone-600" />;
        case '乐器': return <Music className="w-20 h-20 text-stone-600" />;
        default: return <Package className="w-20 h-20 text-stone-600" />;
    }
};

interface ItemAppraisalHeaderProps {
  item: Item;
  canInteract: boolean;
  appraising: boolean;
  appraisalEffect: AppraisalEffectType;
  feedbackMsg: { type: 'success' | 'warning' | 'error' | 'breakthrough', text: string } | null;
  hasAnomaly: boolean;
  anomalyThreshold: number;
  anomalyMessageData: { severity: string; message: { text: string } } | null;
  normalMessage: string;
  onAppraise: () => void;
}

export const ItemAppraisalHeader: React.FC<ItemAppraisalHeaderProps> = ({
  item,
  canInteract,
  appraising,
  appraisalEffect,
  feedbackMsg,
  hasAnomaly,
  anomalyThreshold,
  anomalyMessageData,
  normalMessage,
  onAppraise,
}) => {
  const { state } = useGame();
  const { actionPoints } = state.stats;

  const currentRange = item.currentRange || [0, 0];
  const initialRange = item.initialRange || [0, 0];

  const [currentMin, currentMax] = currentRange;
  const [baseMin, baseMax] = initialRange;

  const displayMin = Math.min(baseMin, currentMin);
  const displayMax = Math.max(baseMax, currentMax);

  const rangeWidth = displayMax - displayMin;
  const safeRangeWidth = rangeWidth === 0 ? 1 : rangeWidth;

  const leftPercent = ((currentMin - displayMin) / safeRangeWidth) * 100;
  const widthPercent = ((currentMax - currentMin) / safeRangeWidth) * 100;

  const initialLeftPercent = ((baseMin - displayMin) / safeRangeWidth) * 100;
  const initialWidthPercent = ((baseMax - baseMin) / safeRangeWidth) * 100;

  const isAppraised = item.appraised;
  const isCrashMode = item.isFake && item.perceivedValue === undefined;

  const rangeBarClass = isAppraised
    ? "bg-green-900/60 border-green-500"
    : "bg-stone-700/60 border-stone-500";

  const rangeTextClass = isAppraised
    ? "text-green-500"
    : "text-stone-400";

  const labelContainerClass = isCrashMode
    ? "text-lg font-mono font-bold text-pawn-red uppercase mb-1 px-1 transition-all"
    : "text-[10px] font-mono text-stone-600 uppercase mb-1 px-1 transition-all";

  const centerLabelText = "估值范围 (ESTIMATED)";
  const centerLabelClass = isCrashMode
    ? "text-[10px] text-pawn-red font-bold tracking-widest border-b border-pawn-red/30 pb-0.5 mb-1 animate-pulse"
    : "text-[9px] text-stone-600 font-bold tracking-widest border-b border-stone-800 pb-0.5";

  const barStyle = {
      left: `${isAppraised ? leftPercent : initialLeftPercent}%`,
      width: `${isAppraised ? widthPercent : initialWidthPercent}%`,
      opacity: isAppraised ? 1 : 0
  };

  const uncertaintyRisk = getUncertaintyRisk(currentMin, currentMax);

  return (
    <div className="bg-[#0c0a09] relative flex flex-col border-b border-[#292524] min-h-[40%]">

        <div className="p-3 flex justify-between items-start z-20">
             <div className="flex items-center gap-2">
                 <div className="bg-black/70 px-2 py-1 text-[10px] font-mono text-stone-400 border border-stone-700 backdrop-blur-sm rounded">
                   {(item.condition || 'Unknown').toUpperCase()} | {item.category}
                 </div>
                 {/* S1-I3: Spectrometer Anomaly Alert - Graded severity */}
                 {hasAnomaly && (() => {
                     const visualValue = item.perceivedValue ?? item.realValue;
                     const pctDiff = item.realValue > 0 ? (Math.abs(visualValue - item.realValue) / item.realValue) * 100 : 0;
                     const severity = pctDiff > 80 ? 'severe' : pctDiff > 40 ? 'moderate' : 'mild';
                     const severityStyle = severity === 'severe'
                         ? "bg-red-950/80 text-red-400 border-red-700 animate-pulse"
                         : severity === 'moderate'
                         ? "bg-orange-950/80 text-orange-400 border-orange-700"
                         : "bg-yellow-950/80 text-yellow-400 border-yellow-700";
                     return (
                         <div className={"px-2 py-1 text-[10px] font-mono border backdrop-blur-sm rounded flex items-center gap-1 " + severityStyle}>
                             <Radio className="w-3 h-3" />
                             <span>{severity === 'severe' ? 'ALERT' : severity === 'moderate' ? 'ANOMALY' : 'NOTICE'}</span>
                         </div>
                     );
                 })()}
             </div>

             <div className="flex flex-col items-end gap-1">
                 {feedbackMsg && (
                     <div className={`text-xs px-2 py-1 rounded absolute top-12 right-2 z-50 ${
                         feedbackMsg.type === 'error' ? 'text-red-500 bg-red-950/80 border border-red-800 animate-shake' :
                         feedbackMsg.type === 'warning' ? 'text-amber-500 bg-amber-950/80 border border-amber-800' :
                         feedbackMsg.type === 'breakthrough' ? 'text-amber-300 bg-amber-950/90 border-2 border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.4)] font-bold animate-breakthrough-glow' :
                         'text-green-500 bg-green-950/80 border border-green-800'
                     }`} style={{ animation: feedbackMsg.type === 'breakthrough' ? 'breakthroughGlow 2s ease-out forwards' : undefined }}>
                         <span className="flex items-center gap-1">
                             {feedbackMsg.type === 'breakthrough' && <Zap className="w-3 h-3 text-amber-400" />}
                             {feedbackMsg.text}
                         </span>
                     </div>
                 )}
             </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className={`transition-all duration-500 w-32 h-32 border border-stone-800 rounded-lg bg-stone-900/50 mb-2 overflow-hidden flex items-center justify-center cursor-game-look ${appraising ? 'blur-sm opacity-50 scale-110' : ''}`}>
                <img
                  src={getItemIcon(item)}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = (e.target as HTMLImageElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
                <div className="hidden items-center justify-center w-full h-full">
                  {getIcon(item.category)}
                </div>
            </div>
            <h3 className="text-xl font-bold text-stone-200 leading-tight text-center">{getDisplayName(item)}</h3>
            {/* Item Tags Display */}
            {(getItemTagsDisplay(item).length > 0 || getHiddenTagCount(item) > 0) && (
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                {getItemTagsDisplay(item).map(({ tag, name, icon, isNegative }) => (
                  <span
                    key={tag}
                    className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      isNegative
                        ? "border border-red-800/60 bg-red-950/40 text-red-400"
                        : isStateTag(tag)
                          ? "border border-stone-700 bg-stone-800/40 text-stone-400"
                          : "border border-cyan-800/50 bg-cyan-950/30 text-cyan-400"
                    }`}
                    title={name}
                  >
                    <span>{icon}</span> {name}
                  </span>
                ))}
                {getHiddenTagCount(item) > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-stone-700/50 bg-stone-800/20 text-stone-500" title="未发现的隐藏属性">
                    <HelpCircle className="w-3 h-3" /> ?x{getHiddenTagCount(item)}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-stone-500 font-serif italic text-center max-w-[80%]">"{item.historySnippet}"</p>
        </div>

        <div className="p-4 border-t border-[#292524] bg-[#141211]">
             <div className="mb-4 relative pt-5">
                <div className={`flex justify-between items-end ${labelContainerClass}`}>
                    <span>${displayMin}</span>
                    <span className={centerLabelClass}>
                        {centerLabelText}
                    </span>
                    <span>${displayMax}</span>
                </div>

                <div className="h-4 w-full bg-stone-900 rounded-sm relative overflow-visible border border-stone-800">
                     <div
                        className={`absolute top-1 bottom-1 bg-stone-700/30 border-x border-stone-600/50 z-0 transition-opacity duration-700 ${isAppraised ? 'opacity-100' : 'opacity-0'}`}
                        style={{ left: `${initialLeftPercent}%`, width: `${initialWidthPercent}%` }}
                    ></div>

                    <div
                        className={`absolute top-0 bottom-0 border-x-2 transition-all duration-700 ease-out z-10 ${rangeBarClass} ${
                            appraisalEffect === 'range_narrowed' ? 'animate-range-glow' :
                            appraisalEffect === 'breakthrough' ? 'animate-range-glow' :
                            ''
                        }`}
                        style={{
                            ...barStyle,
                            ...(appraisalEffect === 'breakthrough' ? { boxShadow: '0 0 20px 4px rgba(217, 119, 6, 0.5)' } : {})
                        }}
                    >
                        <div className={`transition-opacity duration-300 ${isAppraised ? 'opacity-100' : 'opacity-0'}`}>
                            <div className={`absolute -top-5 left-0 -translate-x-1/2 text-[10px] font-bold transition-all duration-700 bg-black/50 px-1 rounded ${rangeTextClass}`}>
                                ${currentMin}
                            </div>
                            <div className={`absolute -top-5 right-0 translate-x-1/2 text-[10px] font-bold transition-all duration-700 bg-black/50 px-1 rounded ${rangeTextClass}`}>
                                ${currentMax}
                            </div>
                            {/* Mid-value indicator */}
                            <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
                                <div className="text-[11px] font-bold text-pawn-accent bg-black/70 px-1.5 py-0.5 rounded border border-pawn-accent/50">
                                    ${Math.round((currentMin + currentMax) / 2)}
                                </div>
                                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-pawn-accent/70"></div>
                            </div>
                        </div>
                    </div>

                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${isAppraised ? 'opacity-0' : 'opacity-100'}`}>
                         <div className="w-full h-[1px] bg-stone-800 border-t border-dashed border-stone-700/50"></div>
                    </div>

                    <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zaDBw8PDgk8yAgBRHhOOdaaFmwAAAABJRU5ErkJggg==')] opacity-20 pointer-events-none"></div>
                </div>

                {/* S1-I3: Spectrometer Anomaly Warning - Graded severity with dynamic messages */}
                {hasAnomaly && anomalyMessageData && (() => {
                    const { severity, message } = anomalyMessageData;
                    if (severity === 'severe') {
                        return (
                            <div className="flex items-center justify-center gap-2 text-red-400 text-[10px] font-bold mt-1 bg-red-950/40 py-1 rounded border border-red-700/50 animate-pulse">
                                <Radio className="w-3 h-3" />
                                <span>{message.text}</span>
                            </div>
                        );
                    } else if (severity === 'moderate') {
                        return (
                            <div className="flex items-center justify-center gap-2 text-orange-400 text-[10px] font-bold mt-1 bg-orange-950/30 py-1 rounded border border-orange-800/50">
                                <Radio className="w-3 h-3" />
                                <span>{message.text}</span>
                            </div>
                        );
                    } else {
                        return (
                            <div className="flex items-center justify-center gap-2 text-yellow-400 text-[10px] mt-1 bg-yellow-950/20 py-1 rounded border border-yellow-900/30">
                                <Radio className="w-3 h-3" />
                                <span>{message.text}</span>
                            </div>
                        );
                    }
                })()}
                {/* S1-I3: Spectrometer Normal Confirmation - Positive feedback when no anomaly */}
                {!hasAnomaly && anomalyThreshold > 0 && (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-[10px] mt-1 bg-green-950/20 py-1 rounded border border-green-900/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{normalMessage}</span>
                  </div>
                )}
                {!hasAnomaly && uncertaintyRisk === 'HIGH' && (
                  <div className="flex items-center justify-center gap-2 text-red-500 text-[10px] font-bold mt-1 bg-red-950/20 py-0.5 rounded border border-red-900/30 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span>估值不确定性高，建议深入鉴定 (HIGH RISK)</span>
                  </div>
                )}
                {!hasAnomaly && uncertaintyRisk === 'MEDIUM' && (
                  <div className="flex items-center justify-center gap-2 text-amber-500 text-[10px] font-bold mt-1 bg-amber-950/20 py-0.5 rounded border border-amber-900/30">
                    <AlertCircle className="w-3 h-3" />
                    <span>估值区间较大 (UNCERTAIN)</span>
                  </div>
                )}

             </div>

             <Button
                onClick={onAppraise}
                disabled={actionPoints <= 0 || !canInteract || appraising}
                isLoading={appraising}
                className={`w-full h-12 shadow-lg border-2 font-mono text-sm flex items-center justify-center gap-2 rounded transition-all
                    ${actionPoints > 0 && canInteract && !appraising
                        ? 'bg-pawn-accent text-black border-white hover:scale-[1.02] cursor-game-zoom'
                        : 'bg-stone-800 text-stone-500 border-stone-600'
                    }
                `}
             >
                <ScanEye className="w-5 h-5" />
                {appraising ? "ANALYZING..." : `深入鉴定 (COST: 1 AP)`}
             </Button>
        </div>
    </div>
  );
};
