import React from 'react';
import { FileSignature, Scale, Stamp, Scroll, Gavel, BadgeAlert } from 'lucide-react';
import { getDisplayName } from '../../systems/items/tagUtils';
import type { Item } from '../../types';

interface VirtualItemViewProps {
  item: Item;
  currentAskPrice: number;
}

export const VirtualItemView: React.FC<VirtualItemViewProps> = ({ item, currentAskPrice }) => {
  return (
    <div className="h-full bg-[#1c1917] border-x border-[#44403c] flex flex-col relative overflow-hidden">
       {/* Header: Contract Header */}
       <div className="bg-[#141211] p-6 border-b border-[#292524] text-center relative z-20 shadow-md">
          <div className="w-16 h-16 mx-auto bg-stone-900 rounded-full flex items-center justify-center border border-stone-700 mb-4 relative">
              <FileSignature className="w-8 h-8 text-pawn-accent" />
              <div className="absolute -bottom-1 -right-1 bg-red-900 text-white text-[9px] px-1.5 py-0.5 rounded border border-red-500 font-bold uppercase tracking-wider">
                  Legal
              </div>
          </div>
          <h2 className="text-2xl font-serif text-white tracking-wide">{getDisplayName(item)}</h2>
          <div className="text-stone-500 font-mono text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center justify-center gap-2">
             <Scale className="w-3 h-3" />
             <span>Binding Agreement // 具有法律效力的合约</span>
          </div>
       </div>

       {/* Body: The Document */}
       <div className="flex-1 bg-[#e7e5e4] text-stone-900 relative overflow-y-auto custom-scrollbar-light">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-30 pointer-events-none mix-blend-multiply" />

          <div className="relative z-10 p-8 space-y-8">

              {/* Financial Terms */}
              <div className="border-b-2 border-stone-800 pb-6">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1">
                      <Stamp className="w-3 h-3" /> Acquisition Offer (收购报价)
                  </span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black font-mono text-stone-900 tracking-tighter">
                          ${currentAskPrice || item.realValue}
                      </span>
                      <span className="text-sm font-bold text-stone-500">CREDITS</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-2 font-mono">
                      * 此金额将以不可追溯的现金形式立即支付。
                  </p>
              </div>

              {/* Contract Body */}
              <div>
                  <h4 className="font-bold font-serif text-lg mb-2 flex items-center gap-2 text-stone-800">
                      <Scroll className="w-4 h-4" /> 协议内容
                  </h4>
                  <div className="bg-white/50 p-4 border-l-4 border-stone-800 text-sm font-serif italic text-stone-700 leading-relaxed shadow-sm">
                      "{item.visualDescription}"
                      <br/><br/>
                      "{item.historySnippet}"
                  </div>
              </div>

              {/* Stipulations / Risks */}
              <div className="bg-stone-200/50 border border-stone-300 p-4 rounded-sm">
                  <h4 className="font-bold uppercase text-xs flex items-center gap-2 text-stone-600 mb-3 border-b border-stone-300 pb-2">
                      <Gavel className="w-4 h-4"/> Terms & Conditions (条款)
                  </h4>
                  <ul className="text-sm space-y-3 font-mono">
                      <li className="flex gap-3 items-start">
                          <span className="text-stone-400 font-bold">01.</span>
                          <span className="text-stone-800 leading-snug">
                              卖方同意将相关物品（即权益标的）的所有权及处置权完全转让给买方。
                          </span>
                      </li>
                      <li className="flex gap-3 items-start">
                          <span className="text-stone-400 font-bold">02.</span>
                          <span className="text-stone-800 leading-snug">
                              本交易为最终定价，受第12区地下市场公约保护，任何一方不得反悔或追索。
                          </span>
                      </li>

                      {item.appraisalNote && (
                          <li className="flex gap-3 items-start p-2 bg-red-100/50 border border-red-200 rounded mt-2">
                              <span className="text-red-500 font-bold">03.</span>
                              <span className="text-red-800 font-bold leading-snug flex flex-col w-full">
                                  <span className="flex items-center gap-1 border-b border-red-200 pb-1 mb-1 text-[10px] uppercase tracking-wider">
                                      <BadgeAlert className="w-3 h-3"/> 风险提示 (Risk Warning)
                                  </span>
                                  <span className="font-serif italic text-base">
                                      "{item.appraisalNote}"
                                  </span>
                              </span>
                          </li>
                      )}
                  </ul>
              </div>

              {/* Signature Area Decoration */}
              <div className="pt-8 flex justify-end opacity-60">
                  <div className="text-center">
                      <div className="h-0.5 w-32 bg-stone-800 mb-1"></div>
                      <span className="text-[10px] uppercase font-bold text-stone-500">Authorized Signature</span>
                  </div>
              </div>
          </div>

          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-8 border-stone-300 text-stone-300 p-4 font-black text-6xl uppercase rotate-[-30deg] pointer-events-none opacity-20 z-0 whitespace-nowrap">
              OFFICIAL OFFER
          </div>
       </div>
    </div>
  );
};
