
import React from 'react';
import { Customer, TransactionResult, ReputationType } from '../types';
import { Button } from './ui/Button';
import { PackageCheck, DollarSign, Heart, Briefcase, Skull, Stamp, Package, Shirt, ShoppingBag, Smartphone, Gem, Music, Gamepad2, Archive } from 'lucide-react';

interface DealSuccessModalProps {
  customer: Customer;
  result: TransactionResult;
  onClose: () => void;
}

const getCategoryIcon = (category: string) => {
    switch(category) {
        case '服饰': return <Shirt className="w-6 h-6 text-stone-400" />;
        case '奢侈品': return <ShoppingBag className="w-6 h-6 text-stone-400" />;
        case '电子产品': return <Smartphone className="w-6 h-6 text-stone-400" />;
        case '珠宝': return <Gem className="w-6 h-6 text-stone-400" />;
        case '违禁品': return <Skull className="w-6 h-6 text-stone-400" />;
        case '古玩': return <Archive className="w-6 h-6 text-stone-400" />;
        case '玩具': return <Gamepad2 className="w-6 h-6 text-stone-400" />;
        case '乐器': return <Music className="w-6 h-6 text-stone-400" />;
        default: return <Package className="w-6 h-6 text-stone-400" />;
    }
}

export const DealSuccessModal: React.FC<DealSuccessModalProps> = ({ customer, result, onClose }) => {
  const { reputationDelta, cashDelta } = result;
  const item = result.item!;

  // Select Dialogue based on deal quality
  let dialogueText = customer.dialogue.accepted.fair;
  if (result.dealQuality === 'fleeced') dialogueText = customer.dialogue.accepted.fleeced;
  if (result.dealQuality === 'premium') dialogueText = customer.dialogue.accepted.premium;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#1c1917] border-4 border-pawn-accent p-8 shadow-2xl overflow-hidden flex flex-col items-center">
        
        {/* Animated Stamp */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none">
             <div className="border-[12px] border-pawn-accent text-pawn-accent text-9xl font-black uppercase tracking-widest p-12 rotate-[-25deg] animate-in zoom-in duration-500 scale-[2]">
                DEAL
             </div>
        </div>

        {/* Header Content */}
        <div className="relative z-10 w-full text-center mb-8">
            <div className="w-24 h-24 mx-auto bg-stone-800 rounded-full border-2 border-pawn-accent mb-4 overflow-hidden">
                 <img src={`https://picsum.photos/seed/${customer.avatarSeed}/200`} className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-serif text-white mb-2">成交 (AGREED)</h2>
            <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-600 shadow-inner">
                <p className="font-serif italic text-lg text-pawn-accent">"{dialogueText}"</p>
            </div>
        </div>

        {/* Stats Summary */}
        <div className="relative z-10 w-full grid grid-cols-2 gap-4 mb-8">
            {/* Left: Financials */}
            <div className="bg-black/40 p-4 rounded border border-stone-700 flex flex-col justify-center items-center">
                 <div className="text-red-500 font-mono text-2xl font-bold flex items-center mb-2">
                    <DollarSign className="w-6 h-6 mr-1" />
                    {Math.abs(cashDelta)}
                 </div>
                 <div className="text-stone-400 text-xs uppercase tracking-widest">现金支出</div>
            </div>

            {/* Right: Reputation */}
            <div className="bg-black/40 p-4 rounded border border-stone-700 flex flex-col gap-2">
                 {Object.entries(reputationDelta).map(([key, val]) => {
                     const value = val as number;
                     if (!value || value === 0) return null;
                     let icon = <Briefcase className="w-3 h-3"/>;
                     let color = "text-blue-400";
                     let label = "信誉";
                     
                     if (key === ReputationType.HUMANITY) { icon = <Heart className="w-3 h-3"/>; color = "text-rose-500"; label = "人性"; }
                     if (key === ReputationType.UNDERWORLD) { icon = <Skull className="w-3 h-3"/>; color = "text-purple-500"; label = "地下"; }
                     
                     return (
                         <div key={key} className={`flex justify-between items-center text-xs font-mono font-bold ${color}`}>
                             <span className="flex items-center gap-1">{icon} {label}</span>
                             <span>{value > 0 ? '+' : ''}{value}</span>
                         </div>
                     );
                 })}
                 {Object.values(reputationDelta).every(v => v === 0) && (
                     <span className="text-stone-500 text-xs text-center italic">声誉无变化</span>
                 )}
            </div>
        </div>
        
        {/* Item Acquired */}
        <div className="relative z-10 w-full bg-stone-800 p-3 rounded flex items-center gap-4 mb-8 border border-stone-600">
             <div className="w-12 h-12 bg-black rounded overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-700">
                {getCategoryIcon(item.category)}
             </div>
             <div>
                 <div className="text-xs text-stone-500 uppercase">物品入库</div>
                 <div className="font-bold text-white">{item.name}</div>
             </div>
             <PackageCheck className="w-6 h-6 text-green-500 ml-auto" />
        </div>

        {/* Action */}
        <div className="relative z-10 w-full">
            <Button onClick={onClose} className="w-full h-14 text-xl tracking-widest shadow-lg">
                <Stamp className="w-5 h-5 mr-2 inline-block"/>
                收 货 (STORAGE)
            </Button>
        </div>

      </div>
    </div>
  );
};
