
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { useAppraisal } from '../hooks/useAppraisal';
import { ScanEye, Gavel, FileSearch, Search, AlertCircle, Quote, Skull, HelpCircle, Package, Shirt, ShoppingBag, Smartphone, Gem, Music, Gamepad2, Archive, Lock, Eye, Stamp, AlertTriangle, ArrowDown } from 'lucide-react';
import { Button } from './ui/Button';
import { ItemTrait } from '../types';
import { getUncertaintyRisk } from '../systems/items/utils';

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
}

interface ItemPanelProps {
  applyLeverage: (power: number, description: string) => void;
  triggerNarrative: (playerLine: string, customerLine: string, impact?: number) => void; 
  canInteract: boolean;
  currentAskPrice: number; 
}

export const ItemPanel: React.FC<ItemPanelProps> = ({ applyLeverage, triggerNarrative, canInteract, currentAskPrice }) => {
  const { state, dispatch } = useGame();
  const { currentCustomer } = state;
  const item = currentCustomer?.item;
  const { performAppraisal } = useAppraisal();
  
  const [appraising, setAppraising] = useState(false);
  const [usedLeverageIds, setUsedLeverageIds] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'warning' | 'error', text: string } | null>(null);
  const [hoveredTrait, setHoveredTrait] = useState<ItemTrait | null>(null);

  useEffect(() => {
    setUsedLeverageIds([]);
    setFeedbackMsg(null);
  }, [currentCustomer?.id]);

  useEffect(() => {
    if (feedbackMsg) {
        const timer = setTimeout(() => {
            setFeedbackMsg(null);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  if (!item || !currentCustomer) return <div className="h-full bg-[#1c1917] border-x border-[#44403c]"></div>;

  const handleAppraiseClick = () => {
      setAppraising(true);
      setFeedbackMsg(null);
      
      setTimeout(() => {
          const result = performAppraisal();
          setAppraising(false);
          
          if (!result.success) {
              if (result.failureReason === 'NO_AP') setFeedbackMsg({ type: 'warning', text: "行动点不足 (No AP)" });
              else if (result.failureReason === 'NO_PATIENCE') setFeedbackMsg({ type: 'warning', text: "客户失去了耐心 (No Patience)" });
              else if (result.failureReason === 'ALREADY_KNOWN') setFeedbackMsg({ type: 'warning', text: "暂无更多线索 (No New Traits)" });
          } else {
              if (result.event && result.event.type !== 'NORMAL') {
                   if (result.event.type === 'MISHAP') {
                       setFeedbackMsg({ type: 'error', text: result.event.message || "鉴定失误" });
                   } else if (result.event.type === 'IMPATIENT') {
                       setFeedbackMsg({ type: 'error', text: result.event.message || "客户不耐烦" });
                   } else if (result.event.type === 'LUCKY_FIND') {
                       setFeedbackMsg({ type: 'success', text: result.event.message || "意外发现!" });
                   }
              } else {
                   if (result.newTraitsFound.length > 0) {
                      setFeedbackMsg({ type: 'success', text: `发现了 ${result.newTraitsFound.length} 个新特征!` });
                   } else {
                      setFeedbackMsg({ type: 'success', text: "估值范围已更新 (Range Narrowed)" });
                   }
              }
          }
      }, 600);
  };

  const handleTraitClick = (trait: ItemTrait) => {
      if (usedLeverageIds.includes(trait.id) || !canInteract) return;
      
      const power = Math.abs(trait.valueImpact);

      if (trait.type === 'FAKE') {
          dispatch({ type: 'REALIZE_ITEM_TRUTH', payload: { itemId: item.id } });
          setFeedbackMsg({ type: 'error', text: "价值崩塌 (VALUE CRASH)" });
      }

      if (trait.type === 'FLAW' || trait.type === 'FAKE') {
          applyLeverage(power, trait.name);
          setUsedLeverageIds(prev => [...prev, trait.id]);
      } else if (trait.type === 'STORY') {
          if (trait.dialogueTrigger) {
              triggerNarrative(trait.dialogueTrigger.playerLine, trait.dialogueTrigger.customerLine, power);
          } else {
              applyLeverage(0.05, `话题: ${trait.name}`); 
          }
          setUsedLeverageIds(prev => [...prev, trait.id]);
      }
  };

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

  const revealedTraits = item.revealedTraits || [];
  const hiddenTraits = item.hiddenTraits || [];
  
  const unrevealedTraits = hiddenTraits.filter(
      t => !revealedTraits.some(r => r.id === t.id)
  );

  const revealedCount = revealedTraits.length + 1;
  const totalCount = hiddenTraits.length + 1; 

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
      <div className="h-full bg-[#1c1917] border-x border-[#44403c] flex flex-col overflow-hidden relative">
        
        <div className="bg-[#0c0a09] relative flex flex-col border-b border-[#292524] min-h-[40%]">
            
            <div className="p-3 flex justify-between items-start z-20">
                 <div className="bg-black/70 px-2 py-1 text-[10px] font-mono text-stone-400 border border-stone-700 backdrop-blur-sm rounded">
                   {(item.condition || 'Unknown').toUpperCase()} | {item.category}
                 </div>
                 
                 <div className="flex flex-col items-end gap-1">
                     <div className="bg-stone-900/90 px-3 py-1 rounded border border-pawn-accent/50 text-pawn-accent font-mono text-xs font-bold shadow-[0_0_10px_rgba(217,119,6,0.2)]">
                        AP: {state.stats.actionPoints} / {state.stats.maxActionPoints}
                     </div>
                     {feedbackMsg && (
                         <div className={`text-xs px-2 py-1 rounded animate-in fade-in slide-in-from-top-1 absolute top-12 right-2 z-50 ${
                             feedbackMsg.type === 'error' ? 'text-red-500 bg-red-950/80 border border-red-800' :
                             feedbackMsg.type === 'warning' ? 'text-amber-500 bg-amber-950/80 border border-amber-800' :
                             'text-green-500 bg-green-950/80 border border-green-800'
                         }`}>
                             {feedbackMsg.text}
                         </div>
                     )}
                 </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className={`transition-all duration-500 p-4 border border-stone-800 rounded-full bg-stone-900/50 mb-2 ${appraising ? 'blur-sm opacity-50 scale-110' : ''}`}>
                    {getIcon(item.category)}
                </div>
                <h3 className="text-xl font-bold text-stone-200 leading-tight text-center">{item.name}</h3>
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
                            className={`absolute top-0 bottom-0 border-x-2 transition-all duration-700 ease-out z-10 ${rangeBarClass}`}
                            style={barStyle}
                        >
                            <div className={`transition-opacity duration-300 ${isAppraised ? 'opacity-100' : 'opacity-0'}`}>
                                <div className={`absolute -top-5 left-0 -translate-x-1/2 text-[10px] font-bold transition-all duration-700 bg-black/50 px-1 rounded ${rangeTextClass}`}>
                                    ${currentMin}
                                </div>
                                <div className={`absolute -top-5 right-0 translate-x-1/2 text-[10px] font-bold transition-all duration-700 bg-black/50 px-1 rounded ${rangeTextClass}`}>
                                    ${currentMax}
                                </div>
                            </div>
                        </div>
                        
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${isAppraised ? 'opacity-0' : 'opacity-100'}`}>
                             <div className="w-full h-[1px] bg-stone-800 border-t border-dashed border-stone-700/50"></div>
                        </div>

                        <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zaDBw8PDgk8yAgBRHhOOdaaFmwAAAABJRU5ErkJggg==')] opacity-20 pointer-events-none"></div>
                    </div>
                    
                    {uncertaintyRisk === 'HIGH' && (
                      <div className="flex items-center justify-center gap-2 text-red-500 text-[10px] font-bold mt-1 bg-red-950/20 py-0.5 rounded border border-red-900/30 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>估值不确定性高，建议深入鉴定 (HIGH RISK)</span>
                      </div>
                    )}
                    {uncertaintyRisk === 'MEDIUM' && (
                      <div className="flex items-center justify-center gap-2 text-amber-500 text-[10px] font-bold mt-1 bg-amber-950/20 py-0.5 rounded border border-amber-900/30">
                        <AlertCircle className="w-3 h-3" />
                        <span>估值区间较大 (UNCERTAIN)</span>
                      </div>
                    )}

                 </div>

                 <Button 
                    onClick={handleAppraiseClick}
                    disabled={state.stats.actionPoints <= 0 || !canInteract || appraising}
                    isLoading={appraising}
                    className={`w-full h-12 shadow-lg border-2 font-mono text-sm flex items-center justify-center gap-2 rounded transition-all
                        ${state.stats.actionPoints > 0 
                            ? 'bg-pawn-accent text-black border-white hover:scale-[1.02]' 
                            : 'bg-stone-800 text-stone-500 border-stone-600 cursor-not-allowed'
                        }
                    `}
                 >
                    <ScanEye className="w-5 h-5" />
                    {appraising ? "ANALYZING..." : `深入鉴定 (COST: 1 AP)`}
                 </Button>
            </div>
        </div>

        <div className="flex-1 bg-[#e7e5e4] text-stone-900 flex flex-col relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] min-h-[60%]">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-40 pointer-events-none mix-blend-multiply"></div>
             
             <div className="p-3 border-b-2 border-stone-400/50 relative z-10 flex justify-between items-center bg-[#d6d3d1]/50 backdrop-blur-sm">
                 <h3 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-stone-700" />
                    线索档案
                 </h3>
                 <span className="text-[10px] font-mono text-stone-500 bg-stone-200 px-2 py-0.5 rounded border border-stone-300">
                    已发现: {revealedCount} / {totalCount}
                 </span>
             </div>

             <div className="flex-1 overflow-y-auto p-3 relative z-10 custom-scrollbar-light">
                 <div className="space-y-2">
                     
                     <div className="w-full text-left p-2 rounded border border-stone-300 bg-stone-100 shadow-sm relative group animate-in fade-in slide-in-from-left-1 duration-300">
                        <div className="flex justify-between items-start mb-1">
                             <div className="font-bold text-xs flex items-center gap-1.5 text-stone-700">
                                 <Eye className="w-4 h-4 text-stone-500"/>
                                 基础外观
                             </div>
                             <span className="text-[9px] font-mono px-1 py-0.5 bg-stone-200 rounded text-stone-500 uppercase">
                                VISUAL
                             </span>
                         </div>
                         <p className="text-[11px] text-stone-600 leading-snug">
                             {item.visualDescription}
                         </p>
                     </div>

                     {revealedTraits.map((trait) => {
                         const isUsed = usedLeverageIds.includes(trait.id);
                         let borderColor = "border-stone-400";
                         let bgColor = "bg-white";
                         let icon = <HelpCircle className="w-4 h-4"/>;
                         let label = "点击对话";
                         let impactText = "";
                         
                         if (trait.type === 'FLAW') {
                             borderColor = "border-red-400";
                             bgColor = "bg-red-50";
                             icon = <AlertCircle className="w-4 h-4 text-red-600"/>;
                             label = "点击压价";
                             impactText = `-${Math.abs(trait.valueImpact * 100)}%`;
                         } else if (trait.type === 'STORY') {
                             borderColor = "border-blue-400";
                             bgColor = "bg-blue-50";
                             icon = <Quote className="w-4 h-4 text-blue-600"/>;
                         } else if (trait.type === 'FAKE') {
                             borderColor = "border-purple-600";
                             bgColor = "bg-purple-50";
                             icon = <Skull className="w-4 h-4 text-purple-600"/>;
                             label = "点击揭穿";
                         }
                         
                         const cashImpact = Math.floor(currentAskPrice * Math.abs(trait.valueImpact));

                         return (
                             <button
                                key={trait.id}
                                onClick={() => handleTraitClick(trait)}
                                onMouseEnter={() => setHoveredTrait(trait)}
                                onMouseLeave={() => setHoveredTrait(null)}
                                disabled={isUsed || !canInteract}
                                className={`
                                    w-full text-left p-2 rounded border-l-4 shadow-sm transition-all duration-500 group relative overflow-visible animate-in zoom-in-95
                                    ${borderColor} ${bgColor}
                                    ${isUsed ? 'opacity-50 grayscale-[0.3]' : 'hover:translate-x-1 hover:shadow-md'}
                                `}
                             >
                                 {hoveredTrait?.id === trait.id && !isUsed && canInteract && (trait.type === 'FLAW' || trait.type === 'FAKE') && (
                                    <div className="absolute -top-8 right-0 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap border border-stone-600 animate-in fade-in slide-in-from-bottom-1">
                                        <div className="flex items-center gap-1">
                                            <ArrowDown className="w-3 h-3 text-red-500" />
                                            <span>
                                                {trait.type === 'FAKE' ? "价值崩塌" : `底价 -${cashImpact} (${impactText})`}
                                            </span>
                                        </div>
                                    </div>
                                 )}

                                 <div className="flex justify-between items-start mb-1 relative z-10">
                                     <div className="font-bold text-xs flex items-center gap-1.5">
                                         {icon}
                                         {trait.name}
                                     </div>
                                     <span className="text-[9px] font-mono px-1 py-0.5 bg-stone-200/80 rounded text-stone-600 uppercase">
                                        {trait.type}
                                     </span>
                                 </div>
                                 <p className="text-[11px] text-stone-600 leading-snug relative z-10">
                                     {trait.description}
                                 </p>
                                 
                                 {isUsed && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-stone-800 text-stone-800 font-black text-xs uppercase px-1 rotate-[-15deg] opacity-80 z-20 pointer-events-none mix-blend-multiply bg-stone-300/20 backdrop-blur-[1px]">
                                        已使用
                                    </div>
                                 )}
                                 
                                 {!isUsed && canInteract && (
                                     <div className="mt-1.5 text-[9px] font-bold text-stone-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 relative z-10">
                                         <Gavel className="w-3 h-3" />
                                         {label}
                                     </div>
                                 )}
                             </button>
                         );
                     })}

                     {unrevealedTraits.map((trait) => (
                        <div key={trait.id} className="w-full p-2 rounded border border-dashed border-stone-400 bg-stone-200/50 opacity-60 relative overflow-hidden select-none grayscale">
                            <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zaDBw8PDgk8yAgBRHhOOdaaFmwAAAABJRU5ErkJggg==')] opacity-10"></div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-stone-300 rounded flex items-center justify-center">
                                    <Lock className="w-4 h-4 text-stone-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="h-2.5 bg-stone-300 rounded w-1/3 mb-1.5"></div>
                                    <div className="h-2 bg-stone-300 rounded w-2/3"></div>
                                </div>
                                <div className="text-xl font-black text-stone-400 mr-2">?</div>
                            </div>
                        </div>
                     ))}

                 </div>
             </div>
        </div>
      </div>
  );
};
