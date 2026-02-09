import React from 'react';
import {
  AlertCircle,
  Quote,
  Skull,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  ArrowDown,
  Gavel,
  CheckCircle2,
} from 'lucide-react';
import { ItemTrait } from '../../types';
import { DecryptionText } from '../ui/TextEffects';

interface TraitCardProps {
  trait: ItemTrait;
  isUsed: boolean;
  canInteract: boolean;
  isHovered: boolean;
  isNewlyRevealed: boolean;
  currentAskPrice: number;
  onTraitClick: (trait: ItemTrait) => void;
  onMouseEnter: (trait: ItemTrait) => void;
  onMouseLeave: () => void;
}

export const TraitCard: React.FC<TraitCardProps> = ({
  trait,
  isUsed,
  canInteract,
  isHovered,
  isNewlyRevealed,
  currentAskPrice,
  onTraitClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  let borderColor = "border-stone-400";
  let bgColor = "bg-white";
  let icon = <HelpCircle className="w-4 h-4"/>;
  let label = "点击压价";
  let impactText = "";
  let impactColor = "text-stone-500";

  if (trait.type === 'FLAW') {
      borderColor = "border-red-400";
      bgColor = isUsed ? "bg-stone-200" : "bg-red-50";
      icon = <AlertCircle className={`w-4 h-4 ${isUsed ? 'text-stone-400' : 'text-red-600'}`}/>;
      impactText = `-${Math.abs(trait.valueImpact * 100)}%`;
      impactColor = "text-red-600";
  } else if (trait.type === 'STORY') {
      borderColor = "border-blue-400";
      bgColor = isUsed ? "bg-stone-200" : "bg-blue-50";
      icon = <Quote className={`w-4 h-4 ${isUsed ? 'text-stone-400' : 'text-blue-600'}`}/>;
      label = "点击对话";
  } else if (trait.type === 'FAKE') {
      borderColor = "border-purple-600";
      bgColor = isUsed ? "bg-stone-200" : "bg-purple-50";
      icon = <Skull className={`w-4 h-4 ${isUsed ? 'text-stone-400' : 'text-purple-600'}`}/>;
      label = "点击揭穿";
  } else if (trait.type === 'JACKPOT') {
      borderColor = "border-amber-500";
      bgColor = isUsed ? "bg-stone-200" : "bg-amber-50";
      icon = <Sparkles className={`w-4 h-4 ${isUsed ? 'text-stone-400' : 'text-amber-600'}`}/>;
      impactText = `+${Math.abs(trait.valueImpact * 100)}%`;
      impactColor = "text-amber-600";
      label = "捡漏发现";
  } else if (trait.type === 'STOLEN') {
      borderColor = "border-orange-600";
      bgColor = isUsed ? "bg-stone-200" : "bg-orange-50";
      icon = <AlertTriangle className={`w-4 h-4 ${isUsed ? 'text-stone-400' : 'text-orange-600'}`}/>;
      impactText = "-25%";
      impactColor = "text-orange-600";
      label = "点击压价";
  }

  if (isUsed) {
      borderColor = "border-stone-300";
      impactColor = "text-stone-400";
  }

  const cashImpact = Math.floor(currentAskPrice * Math.abs(trait.valueImpact));

  return (
    <button
      onClick={() => onTraitClick(trait)}
      onMouseEnter={() => onMouseEnter(trait)}
      onMouseLeave={onMouseLeave}
      disabled={isUsed || !canInteract}
      className={`
          w-full text-left p-2 rounded border-l-4 shadow-sm transition-all duration-500 group relative overflow-visible
          ${isNewlyRevealed ? 'animate-trait-reveal' : 'animate-in zoom-in-95'}
          ${borderColor} ${bgColor}
          ${isUsed ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : 'hover:translate-x-1 hover:shadow-md cursor-pointer'}
      `}
    >
      {/* FLAW/FAKE hover tooltip */}
      {isHovered && !isUsed && canInteract && (trait.type === 'FLAW' || trait.type === 'FAKE') && (
        <div className="absolute -top-8 right-0 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap border border-stone-600 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-red-500" />
                <span>
                    {trait.type === 'FAKE' ? "价值崩塌" : `底价 -${cashImpact} (${impactText})`}
                </span>
            </div>
        </div>
      )}
      {/* JACKPOT hover tooltip */}
      {isHovered && !isUsed && canInteract && trait.type === 'JACKPOT' && (
        <div className="absolute -top-8 right-0 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap border border-amber-600 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>价值发现 ({impactText})</span>
            </div>
        </div>
      )}
      {/* STOLEN hover tooltip */}
      {isHovered && !isUsed && canInteract && trait.type === 'STOLEN' && (
        <div className="absolute -top-8 right-0 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap border border-orange-600 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
                <span>赃物压价 (报价和底价均 {impactText})</span>
            </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-1 relative z-10">
          <div className={`font-bold text-xs flex items-center gap-1.5 ${isUsed ? 'text-stone-500' : 'text-stone-700'}`}>
              {icon}
              <DecryptionText text={trait.name} speed={30} revealSpeed={100} />
          </div>
          <span className="text-[9px] font-mono px-1 py-0.5 bg-stone-200/80 rounded text-stone-600 uppercase">
            {trait.type}
          </span>
      </div>
      <p className={`text-[11px] leading-snug relative z-10 ${isUsed ? 'text-stone-400' : 'text-stone-600'}`}>
          <DecryptionText text={trait.description} speed={10} revealSpeed={30} />
      </p>

      {isUsed && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-stone-500 text-stone-500 font-black text-xs uppercase px-1 rotate-[-12deg] opacity-70 z-20 pointer-events-none mix-blend-multiply backdrop-blur-[1px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> APPLIED
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
};
