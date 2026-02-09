import React from 'react';
import { FileSearch, Eye, Lock } from 'lucide-react';
import { Item, ItemTrait } from '../../types';
import { TraitCard } from './TraitCard';

interface TraitListProps {
  item: Item;
  canInteract: boolean;
  currentAskPrice: number;
  hoveredTrait: ItemTrait | null;
  newlyRevealedTraitIds: Set<string>;
  onTraitClick: (trait: ItemTrait) => void;
  onTraitHover: (trait: ItemTrait) => void;
  onTraitLeave: () => void;
}

export const TraitList: React.FC<TraitListProps> = ({
  item,
  canInteract,
  currentAskPrice,
  hoveredTrait,
  newlyRevealedTraitIds,
  onTraitClick,
  onTraitHover,
  onTraitLeave,
}) => {
  const revealedTraits = item.revealedTraits || [];
  const hiddenTraits = item.hiddenTraits || [];

  const unrevealedTraits = hiddenTraits.filter(
      t => !revealedTraits.some(r => r.id === t.id)
  );

  const revealedCount = revealedTraits.length + 1;
  const totalCount = hiddenTraits.length + revealedTraits.length + 1;

  return (
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

                 {/* Base visual description card */}
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

                 {/* Revealed traits */}
                 {revealedTraits.map((trait) => (
                     <TraitCard
                       key={trait.id}
                       trait={trait}
                       isUsed={item.usedTraitIds?.includes(trait.id) || false}
                       canInteract={canInteract}
                       isHovered={hoveredTrait?.id === trait.id}
                       isNewlyRevealed={newlyRevealedTraitIds.has(trait.id)}
                       currentAskPrice={currentAskPrice}
                       onTraitClick={onTraitClick}
                       onMouseEnter={onTraitHover}
                       onMouseLeave={onTraitLeave}
                     />
                 ))}

                 {/* Unrevealed trait placeholders */}
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
  );
};
