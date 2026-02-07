
import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameMachine } from '../hooks/useGameMachine';
import { Button } from './ui/Button';
import { NewsCategory, ItemStatus } from '../types';
import { Sun, CloudRain, Wind, TrendingUp, Newspaper, AlertOctagon, ArrowRight, Droplets, Calendar, Target } from 'lucide-react';
import { Badge } from './ui/Badge';
import { getDisplayName } from '../systems/items/tagUtils';

export const MorningBrief: React.FC = () => {
  const { state } = useGame();
  const { send, can } = useGameMachine();

  const narratives = state.dailyNews.filter(n => n.category === NewsCategory.NARRATIVE_ECHO);
  const markets = state.dailyNews.filter(n => n.category === NewsCategory.MARKET_INTEL);
  const flavors = state.dailyNews.filter(n => n.category === NewsCategory.FLAVOR);

  const activeFlavor = flavors[0];
  const isRain = activeFlavor?.headline.includes("雨") || activeFlavor?.headline.includes("Rain");

  // Only show items expiring today (0) or tomorrow (1)
  const expiringItems = state.inventory.filter(i =>
      i.status === ItemStatus.ACTIVE &&
      i.pawnInfo &&
      (i.pawnInfo.dueDate - state.stats.day <= 1)
  ).sort((a,b) => (a.pawnInfo!.dueDate - state.stats.day) - (b.pawnInfo!.dueDate - state.stats.day));

  return (
    <div className="h-screen w-full flex items-center justify-center bg-stone-900 p-4 md:p-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?q=80&w=2664&auto=format&fit=crop')] bg-cover bg-center opacity-5 pointer-events-none"></div>

      <div className="max-w-5xl w-full h-[90vh] bg-[#e7e5e4] text-stone-900 shadow-2xl relative z-10 flex flex-col overflow-hidden rounded-sm border border-stone-400">
          {/* Newspaper Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-50 pointer-events-none mix-blend-multiply"></div>

          {/* Masthead */}
          <div className="p-6 md:p-8 border-b-4 border-double border-stone-800 relative z-10 shrink-0">
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                      <div className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.3em] mb-1">
                          Vol. {1000 + state.stats.day} · Sector 12 Edition
                      </div>
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-serif uppercase tracking-tight leading-none text-stone-900">
                         The City Chronicle
                      </h1>
                      <div className="text-xs font-mono text-stone-600 mt-2 flex gap-4 uppercase tracking-wider border-t border-stone-400 pt-2">
                          <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Day {state.stats.day}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                              {isRain ? <CloudRain className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                              {isRain ? "Rainy" : "Clear"}
                          </span>
                          <span>·</span>
                          <span>Price: 5¢</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Content Grid */}
          <div className="flex-1 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 relative z-10 overflow-y-auto custom-scrollbar-light">

              {/* Main Column (Narrative) */}
              <div className="md:col-span-8 space-y-6">
                  <div className="flex items-center gap-2 border-b-2 border-stone-800 pb-2">
                      <Newspaper className="w-4 h-4 text-stone-700" />
                      <h3 className="font-bold font-sans uppercase tracking-widest text-xs text-stone-800">Headlines</h3>
                  </div>

                  {narratives.length === 0 ? (
                      <div className="text-center py-16 text-stone-400 italic font-serif text-lg">
                          "No news is good news, they say..."
                      </div>
                  ) : (
                      narratives.map((news, idx) => (
                          <article key={news.id} className="group cursor-default">
                              <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3 leading-tight group-hover:text-red-800 transition-colors">
                                  {news.headline}
                              </h2>
                              <div className="text-sm font-serif leading-relaxed text-stone-700 text-justify border-b border-stone-300 pb-6 group-last:border-0">
                                  <p>
                                      {idx === 0 && <span className="float-left text-5xl font-black mr-2 leading-[0.8] mt-[-2px] font-serif text-stone-800">
                                          {news.body.charAt(0)}
                                      </span>}
                                      {idx === 0 ? news.body.slice(1) : news.body}
                                  </p>
                              </div>
                          </article>
                      ))
                  )}
              </div>

              {/* Side Column */}
              <div className="md:col-span-4 space-y-5">

                   {/* Expiry Alerts - Only show if items expiring */}
                   {expiringItems.length > 0 && (
                       <div className="bg-red-950 text-red-100 p-4 border-l-4 border-red-600 shadow-lg">
                           <h3 className="text-red-400 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
                               <AlertOctagon className="w-3 h-3" /> Expiry Alert
                           </h3>
                           <div className="space-y-2">
                               {expiringItems.slice(0, 5).map(item => {
                                   const days = item.pawnInfo!.dueDate - state.stats.day;
                                   return (
                                       <div key={item.id} className="flex justify-between items-center text-[10px] bg-black/30 p-2 rounded">
                                           <span className="truncate w-2/3 text-red-200">{getDisplayName(item)}</span>
                                           <Badge variant="danger" className="text-[9px]">
                                               {days === 0 ? 'TODAY' : 'TOMORROW'}
                                           </Badge>
                                       </div>
                                   );
                               })}
                               {expiringItems.length > 5 && (
                                   <div className="text-[9px] text-red-400 text-center pt-1">
                                       +{expiringItems.length - 5} more items...
                                   </div>
                               )}
                           </div>
                       </div>
                   )}

                   {/* Daily Challenge (v2.1) */}
                   {state.dailyChallenge && !state.dailyChallenge.isCompleted && (
                       <div className="bg-amber-950 text-amber-100 p-4 border-l-4 border-amber-500 shadow-lg">
                           <h3 className="text-amber-400 text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider">
                               <Target className="w-3 h-3" /> Daily Challenge
                           </h3>
                           <div className="text-sm font-bold text-white mb-1">{state.dailyChallenge.title}</div>
                           <div className="text-[11px] text-amber-200/80 mb-2">{state.dailyChallenge.description}</div>
                           <div className="text-[10px] font-mono text-amber-400 pt-2 border-t border-amber-800/50">
                               {state.dailyChallenge.reward.cash && `+$${state.dailyChallenge.reward.cash}`}
                               {state.dailyChallenge.reward.reputation && `+${state.dailyChallenge.reward.reputation.amount} ${state.dailyChallenge.reward.reputation.axis}`}
                               {' (可选)'}
                           </div>
                       </div>
                   )}

                   {/* Market Watch */}
                   <div className="bg-stone-100 p-4 border border-stone-300 shadow-sm">
                       <div className="border-b-2 border-stone-400 pb-2 mb-3 flex items-center gap-2 text-stone-700">
                          <TrendingUp className="w-4 h-4" />
                          <h3 className="font-bold font-sans uppercase tracking-widest text-xs">Market</h3>
                       </div>

                       {markets.length === 0 ? (
                           <p className="text-xs text-stone-500 italic">No market news.</p>
                       ) : (
                           <div className="space-y-3">
                               {markets.map(news => (
                                   <div key={news.id} className="pb-3 border-b border-stone-300 last:border-0 last:pb-0">
                                       <h4 className="font-bold text-xs mb-1 leading-tight">{news.headline}</h4>
                                       <p className="text-[10px] text-stone-600 leading-snug mb-2 font-serif">
                                           {news.body}
                                       </p>

                                       {news.effect && (
                                           <div className="bg-white px-2 py-1 border border-stone-300 text-[10px] font-mono font-bold flex justify-between items-center">
                                               <span className="text-stone-600">{news.effect.categoryTarget || "General"}</span>
                                               <span className={
                                                   (news.effect.priceMultiplier && news.effect.priceMultiplier > 1) ? 'text-green-700' : 'text-red-700'
                                               }>
                                                   {news.effect.priceMultiplier ? (news.effect.priceMultiplier > 1 ? "▲" : "▼") : "⚠"}
                                               </span>
                                           </div>
                                       )}
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>

                   {/* Weather Advisory */}
                   <div className="bg-stone-800 text-stone-300 p-4 border-t-4 border-amber-600">
                        <div className="flex items-center gap-2 mb-2 text-amber-500">
                             {isRain ? <Droplets className="w-4 h-4" /> : <Wind className="w-4 h-4" />}
                             <h3 className="font-bold text-xs uppercase tracking-widest">Advisory</h3>
                        </div>

                        {activeFlavor ? (
                            <>
                                <div className="text-xs font-bold text-white mb-1">{activeFlavor.headline}</div>
                                <div className="text-[10px] opacity-70">{activeFlavor.body}</div>
                                {activeFlavor.effect && activeFlavor.effect.actionPointsModifier && (
                                    <div className="text-[10px] font-mono text-amber-400 mt-2 pt-2 border-t border-stone-700">
                                        AP: {activeFlavor.effect.actionPointsModifier > 0 ? '+' : ''}{activeFlavor.effect.actionPointsModifier}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-[10px] opacity-60">
                                No advisories in effect.
                            </div>
                        )}
                   </div>
              </div>
          </div>

          {/* Footer with Action */}
          <div className="p-4 md:p-6 border-t-2 border-stone-400 bg-stone-100 relative z-10 shrink-0">
              <div className="flex items-center justify-between gap-4">
                  <div className="text-[9px] text-stone-500 font-mono uppercase tracking-widest hidden md:block">
                      The City Chronicle © 2077
                  </div>
                  <Button
                      onClick={() => {
                          // Send state machine event for phase2 sync
                          // NOTE: startNewDay() is now triggered by useEffect in App.tsx
                          // when phase transitions to DAY_START.EXPIRY_CHECK, avoiding timing issues
                          send({ type: 'OPEN_SHOP' });
                      }}
                      disabled={!can({ type: 'OPEN_SHOP' })}
                      variant="primary"
                      className="flex-1 md:flex-none md:min-w-[200px] h-12 text-sm tracking-widest group"
                  >
                      <span className="flex items-center justify-center gap-2">
                          OPEN SHOP <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                  </Button>
              </div>
          </div>

      </div>
    </div>
  );
};
