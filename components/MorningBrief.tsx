
import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Button } from './ui/Button';
import { NewsCategory, ItemStatus, GamePhase } from '../types';
import { Sun, CloudRain, Wind, TrendingUp, Newspaper, AlertOctagon, Radio, DollarSign, Calendar, Coffee, ArrowRight, Droplets, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/Badge';

export const MorningBrief: React.FC = () => {
  const { state, dispatch } = useGame();
  // ... (startNewDay usage if needed later)

  const narratives = state.dailyNews.filter(n => n.category === NewsCategory.NARRATIVE);
  const markets = state.dailyNews.filter(n => n.category === NewsCategory.MARKET);
  const flavors = state.dailyNews.filter(n => n.category === NewsCategory.FLAVOR);
  
  const activeFlavor = flavors[0];
  const isRain = activeFlavor?.headline.includes("雨") || activeFlavor?.headline.includes("Rain");

  const expiringItems = state.inventory.filter(i => 
      i.status === ItemStatus.ACTIVE && 
      i.pawnInfo && 
      (i.pawnInfo.dueDate - state.stats.day <= 3)
  ).sort((a,b) => (a.pawnInfo!.dueDate - state.stats.day) - (b.pawnInfo!.dueDate - state.stats.day));

  const rentDaysLeft = state.stats.rentDueDate - state.stats.day;
  const isRentCritical = rentDaysLeft <= 3;

  return (
    <div className="h-screen w-full flex items-center justify-center bg-noir-100 text-noir-txt-primary p-4 md:p-8 relative overflow-hidden font-mono">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?q=80&w=2664&auto=format&fit=crop')] bg-cover bg-center opacity-10 blur-sm pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-noir-100 via-noir-100/90 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl w-full h-[90vh] bg-noir-200 border-2 border-noir-400 shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden rounded-lg">
         
         {/* LEFT SIDEBAR: Personal Terminal */}
         <div className="w-full md:w-1/3 lg:w-1/4 bg-noir-300 border-r border-noir-400 p-6 flex flex-col relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)]">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-noir-500">
              <div className="p-2 bg-noir-400 rounded-full text-noir-accent">
                  <Coffee className="w-6 h-6" />
              </div>
              <div>
                  <h2 className="text-sm font-bold tracking-widest text-noir-txt-muted uppercase">Morning Routine</h2>
                  <div className="text-xl font-black text-noir-txt-primary">DAY {state.stats.day}</div>
              </div>
            </div>
            
            {/* Scroll Area */}
            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              
              {/* Financial Status */}
              <div className="bg-noir-200 p-4 rounded border border-noir-400 space-y-3">
                 <div className="text-xs font-bold text-noir-txt-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Asset Liquidity
                 </div>
                 <div className="flex justify-between items-end">
                    <span className="text-3xl font-mono font-bold text-noir-txt-primary tracking-tighter">${state.stats.cash}</span>
                    <span className="text-xs text-red-500 font-mono mb-1">-${state.stats.dailyExpenses} / day</span>
                 </div>
                 
                 <div className={cn("mt-2 pt-2 border-t border-noir-300 flex justify-between items-center text-xs font-mono", isRentCritical ? "text-red-500 animate-pulse" : "text-noir-txt-secondary")}>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Rent Due (T-{rentDaysLeft})
                    </span>
                    <span className="font-bold">${state.stats.rentDue}</span>
                 </div>
              </div>

              {/* NIGHT REPORT (New) */}
              <div className="bg-black/30 p-3 rounded border border-noir-400/50">
                  <div className="flex items-center gap-2 text-xs font-bold text-noir-txt-muted uppercase mb-2 border-b border-noir-500 pb-1">
                      <Moon className="w-3 h-3" /> Night Report
                  </div>
                  <div className="space-y-1">
                      {state.dayEvents.length === 0 ? (
                          <span className="text-[10px] text-stone-600 italic">No significant events overnight.</span>
                      ) : (
                          state.dayEvents.map((event, idx) => (
                              <div key={idx} className="text-[9px] font-mono text-stone-400 flex gap-2 leading-snug">
                                  <span className="text-stone-600">-</span>
                                  <span>{event}</span>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* Mail Notification */}
              <div className={cn("p-4 rounded border transition-all duration-500", 
                  state.pendingMails.some(m => m.arrivalDay <= state.stats.day) 
                  ? "bg-green-950/20 border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                  : "bg-noir-200 border-noir-400 opacity-60"
              )}>
                  <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full", state.pendingMails.some(m => m.arrivalDay <= state.stats.day) ? "bg-green-900 text-green-400" : "bg-noir-400 text-noir-txt-muted")}>
                          <Radio className="w-4 h-4" />
                      </div>
                      <div>
                          <div className={cn("text-xs font-bold uppercase", state.pendingMails.some(m => m.arrivalDay <= state.stats.day) ? "text-green-500" : "text-noir-txt-muted")}>
                              Mail Server
                          </div>
                          <div className="text-[10px] text-noir-txt-secondary font-mono mt-0.5">
                              {state.pendingMails.some(m => m.arrivalDay <= state.stats.day) ? "NEW ENCRYPTED PACKETS RECEIVED" : "NO NEW MESSAGES"}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Expiry Alerts */}
              {expiringItems.length > 0 && (
                  <div className="bg-red-950/10 border border-red-900/50 p-4 rounded">
                      <h3 className="text-red-500 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
                          <AlertOctagon className="w-3 h-3" /> Critical Expiry Warning
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar-light">
                          {expiringItems.map(item => {
                              const days = item.pawnInfo!.dueDate - state.stats.day;
                              return (
                                  <div key={item.id} className="flex justify-between items-center text-[10px] bg-black/20 p-2 rounded border border-red-900/30">
                                      <span className="truncate w-2/3 text-noir-txt-secondary">{item.name}</span>
                                      <Badge variant={days <= 1 ? "danger" : "warning"} className="text-[9px]">
                                          {days}d left
                                      </Badge>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
            </div>

            <Button 
                onClick={() => dispatch({ type: 'OPEN_SHOP' })} 
                className="w-full mt-6 h-14 text-lg tracking-widest border-noir-400 hover:border-noir-txt-primary hover:bg-noir-200 text-noir-txt-primary shadow-lg group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-noir-accent/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                    OPEN SHOP <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
            </Button>
         </div>

         {/* RIGHT CONTENT: The City Chronicle (Unchanged) */}
         <div className="flex-1 bg-[#e7e5e4] text-stone-900 relative flex flex-col min-w-0">
             {/* ... existing right content ... */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-60 pointer-events-none mix-blend-multiply"></div>

             {/* Newspaper Header */}
             <div className="p-6 md:p-8 border-b-2 border-stone-800 flex justify-between items-end relative z-10 shrink-0">
                 <div>
                     <h1 className="text-4xl md:text-6xl font-black font-serif uppercase tracking-tight leading-none text-stone-900">
                        The City Chronicle
                     </h1>
                     <div className="text-xs font-mono text-stone-600 mt-2 flex gap-4 uppercase font-bold tracking-wider">
                         <span>Vol. {1000 + state.stats.day}</span>
                         <span>Sector 12 Edition</span>
                         <span>Price: 5 Credits</span>
                     </div>
                 </div>
                 
                 <div className="text-right hidden md:block">
                     <div className="flex items-center justify-end gap-2 text-stone-700 mb-1">
                         {isRain ? <CloudRain className="w-8 h-8" /> : <Sun className="w-8 h-8" />}
                         <span className="font-bold text-lg uppercase font-serif">{isRain ? "Heavy Rain" : "Clear Sky"}</span>
                     </div>
                     <div className="text-[10px] font-mono text-stone-500 uppercase">
                         {activeFlavor ? activeFlavor.headline : "Atmosphere Stable"}
                     </div>
                 </div>
             </div>

             {/* Content Grid */}
             <div className="flex-1 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10 overflow-y-auto custom-scrollbar-light">
                 
                 {/* Main Column (Narrative) */}
                 <div className="md:col-span-8 space-y-8">
                     <div className="flex items-center gap-2 border-b-2 border-stone-800 pb-2">
                         <Newspaper className="w-5 h-5 text-stone-700" />
                         <h3 className="font-bold font-sans uppercase tracking-widest text-sm text-stone-800">Top Stories</h3>
                     </div>

                     {narratives.length === 0 ? (
                         <div className="text-center py-20 text-stone-400 italic font-serif text-lg">
                             "No news is good news, they say..."
                         </div>
                     ) : (
                         narratives.map((news, idx) => (
                             <article key={news.id} className="group cursor-default">
                                 <h2 className="text-3xl font-serif font-bold mb-3 leading-tight group-hover:text-red-800 transition-colors">
                                     {news.headline}
                                 </h2>
                                 <div className="text-sm font-serif leading-relaxed text-stone-700 text-justify columns-1 md:columns-2 gap-6 border-b border-stone-300 pb-6 group-last:border-0">
                                     <p>
                                         {idx === 0 && <span className="float-left text-5xl font-black mr-2 leading-[0.8] mt-[-2px] font-serif">
                                             {news.body.charAt(0)}
                                         </span>}
                                         {idx === 0 ? news.body.slice(1) : news.body}
                                     </p>
                                 </div>
                             </article>
                         ))
                     )}
                 </div>

                 {/* Side Column (Market & Weather Detail) */}
                 <div className="md:col-span-4 space-y-6">
                      
                      {/* Market Watch Widget */}
                      <div className="bg-stone-200/50 p-4 border border-stone-300 shadow-sm">
                          <div className="border-b-2 border-stone-400 pb-2 mb-4 flex items-center gap-2 text-stone-700">
                             <TrendingUp className="w-5 h-5" />
                             <h3 className="font-bold font-sans uppercase tracking-widest text-sm">Market Watch</h3>
                          </div>

                          {markets.length === 0 ? (
                              <p className="text-xs text-stone-500 italic">No significant market movements.</p>
                          ) : (
                              <div className="space-y-4">
                                  {markets.map(news => (
                                      <div key={news.id} className="pb-3 border-b border-stone-300 last:border-0 last:pb-0">
                                          <h4 className="font-bold text-xs mb-1 leading-tight">{news.headline}</h4>
                                          <p className="text-[10px] text-stone-600 leading-snug mb-2 font-serif">
                                              {news.body}
                                          </p>
                                          
                                          {news.effect && (
                                              <div className="bg-white/80 px-2 py-1 border border-stone-300 text-[10px] font-mono font-bold flex justify-between items-center shadow-sm">
                                                  <span>{news.effect.categoryTarget || "General"}</span>
                                                  <span className={
                                                      (news.effect.priceMultiplier && news.effect.priceMultiplier > 1) ? 'text-green-700' : 'text-red-700'
                                                  }>
                                                      {news.effect.priceMultiplier ? (news.effect.priceMultiplier > 1 ? "▲ BULLISH" : "▼ BEARISH") : "⚠ RISK ALERT"}
                                                  </span>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Flavor / Weather Widget */}
                      <div className="bg-stone-800 text-stone-300 p-4 border-t-4 border-red-800">
                           <div className="flex items-center gap-2 mb-3 text-red-500">
                                {isRain ? <Droplets className="w-4 h-4" /> : <Wind className="w-4 h-4" />}
                                <h3 className="font-bold text-xs uppercase tracking-widest">Advisory</h3>
                           </div>
                           
                           {activeFlavor ? (
                               <>
                                   <div className="text-xs font-bold text-white mb-1">{activeFlavor.headline}</div>
                                   <div className="text-[10px] opacity-70 mb-2">{activeFlavor.body}</div>
                                   {activeFlavor.effect && activeFlavor.effect.actionPointsModifier && (
                                       <div className="text-[10px] font-mono text-red-400 mt-2 pt-2 border-t border-stone-700">
                                           >> DAILY AP MODIFIER: {activeFlavor.effect.actionPointsModifier}
                                       </div>
                                   )}
                               </>
                           ) : (
                               <div className="text-[10px] opacity-60">
                                   Standard atmospheric conditions. No advisories in effect for Sector 12.
                               </div>
                           )}
                      </div>
                 </div>
             </div>
             
             {/* Footer */}
             <div className="p-2 border-t border-stone-400 text-center text-[9px] text-stone-500 font-mono uppercase tracking-widest relative z-10 bg-[#e7e5e4]">
                 The City Chronicle © 2077 - Truth is expensive.
             </div>

         </div>

      </div>
    </div>
  );
};
