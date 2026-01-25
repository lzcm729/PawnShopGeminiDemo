
import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Button } from './ui/Button';
import { Moon, TrendingUp, AlertOctagon, DollarSign, PackageX, Power, ArrowRight } from 'lucide-react';
import { ReputationType, ItemStatus } from '../types';
import { cn } from '../lib/utils';

export const EndOfDaySummary: React.FC = () => {
  const { state } = useGame();
  const { liquidateItem, performNightCycle } = useGameEngine();
  const { stats, todayTransactions, reputation, inventory } = state;

  // Calculate Daily Totals
  const income = todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const expense = todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
  const dailyNet = income + expense;
  
  // Find items that are FORFEIT (Owned by shop, ready to sell)
  const expiredItems = inventory.filter(item => item.status === ItemStatus.FORFEIT);

  // Formatting currency
  const fmt = (n: number) => Math.abs(n).toLocaleString();

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden font-mono">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1494587416117-f101a292419b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 blur-sm pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>

      <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 h-[85vh] p-8">
        
        {/* LEFT COLUMN: THE THERMAL RECEIPT */}
        <div className="lg:col-span-5 flex justify-center items-start pt-10">
            <div className="bg-white text-black w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform -rotate-1 relative animate-in slide-in-from-top-10 duration-700">
                {/* Receipt Header */}
                <div className="p-6 pb-4 text-center border-b-2 border-dashed border-stone-300">
                    <h2 className="text-2xl font-black uppercase tracking-widest mb-1">Daily Z-Report</h2>
                    <div className="text-xs font-bold text-stone-500 uppercase">Sector 12 Pawn Shop</div>
                    <div className="text-xs font-mono mt-2">
                        CYCLE: {String(stats.day).padStart(4, '0')} <br/>
                        DATE: {new Date().toISOString().split('T')[0]}
                    </div>
                </div>

                {/* Transaction List */}
                <div className="p-6 py-4 min-h-[300px] max-h-[50vh] overflow-y-auto custom-scrollbar-light space-y-3">
                    {todayTransactions.length === 0 && (
                        <div className="text-center text-stone-400 italic py-8">-- NO TRANSACTIONS --</div>
                    )}
                    
                    {todayTransactions.map(t => (
                        <div key={t.id} className="flex justify-between items-baseline text-xs font-bold font-mono">
                            <span className="truncate w-2/3 uppercase text-stone-700">{t.description}</span>
                            <span className={t.amount >= 0 ? "text-black" : "text-red-600"}>
                                {t.amount >= 0 ? '' : '-'}${fmt(t.amount)}
                            </span>
                        </div>
                    ))}

                    <div className="border-t border-dashed border-stone-300 my-2"></div>
                    
                    <div className="flex justify-between items-baseline text-xs font-bold font-mono text-stone-500">
                        <span>OPERATING COSTS</span>
                        <span className="text-red-600">-${fmt(stats.dailyExpenses)}</span>
                    </div>
                </div>

                {/* Receipt Footer (Totals) */}
                <div className="p-6 pt-4 border-t-2 border-dashed border-stone-300 bg-stone-50">
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-bold uppercase">Net Change</span>
                        <span className={cn("font-black font-mono", dailyNet - stats.dailyExpenses >= 0 ? "text-black" : "text-red-600")}>
                            {dailyNet - stats.dailyExpenses >= 0 ? '+' : '-'}${fmt(dailyNet - stats.dailyExpenses)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t border-stone-300">
                        <span className="font-black uppercase">Closing Cash</span>
                        <span className="font-black font-mono text-xl">${fmt(stats.cash)}</span>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <div className="inline-block border-2 border-black px-4 py-1 font-black text-xl uppercase opacity-50 rotate-[-12deg]">
                            APPROVED
                        </div>
                    </div>
                    
                    <div className="text-[10px] text-center text-stone-400 mt-4 font-mono">
                        *** THANK YOU FOR YOUR SERVICE *** <br/>
                        TERMINAL ID: P-8821
                    </div>
                </div>

                {/* Jagged Edge Effect (CSS) */}
                <div className="absolute top-full left-0 right-0 h-4 bg-[linear-gradient(45deg,transparent_33.333%,#ffffff_33.333%,#ffffff_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#ffffff_33.333%,#ffffff_66.667%,transparent_66.667%)] bg-[length:20px_40px] bg-[position:0_-20px]"></div>
            </div>
        </div>

        {/* RIGHT COLUMN: DIGITAL DASHBOARD */}
        <div className="lg:col-span-7 flex flex-col gap-6 pt-10">
           
           {/* RENT STATUS */}
           <div className="bg-noir-200 border border-noir-400 p-6 rounded-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <AlertOctagon className="w-24 h-24 text-red-500" />
               </div>
               
               <div className="relative z-10 flex justify-between items-end mb-4">
                   <div>
                       <h3 className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Upcoming Liability</h3>
                       <div className="text-3xl font-black text-white flex items-center gap-2">
                           RENT DUE <span className="text-red-500">${stats.rentDue}</span>
                       </div>
                   </div>
                   <div className="text-right">
                       <div className="text-4xl font-mono font-bold text-white">{stats.rentDueDate - stats.day}</div>
                       <div className="text-xs text-stone-500 uppercase font-bold">Days Remaining</div>
                   </div>
               </div>

               {/* Progress Bar */}
               <div className="w-full h-4 bg-noir-400 rounded-full overflow-hidden border border-noir-500">
                   <div 
                        className={cn("h-full transition-all duration-1000", 
                            stats.cash >= stats.rentDue ? "bg-pawn-green" : "bg-red-600 animate-pulse"
                        )} 
                        style={{ width: `${Math.min(100, (stats.cash / stats.rentDue) * 100)}%` }}
                   ></div>
               </div>
               <div className="flex justify-between mt-2 text-[10px] font-mono text-stone-500 uppercase">
                   <span>Coverage: {Math.round((stats.cash / stats.rentDue) * 100)}%</span>
                   <span>Target: ${stats.rentDue}</span>
               </div>
           </div>

           {/* REPUTATION MATRIX */}
           <div className="grid grid-cols-3 gap-4">
               {[
                   { label: 'Humanity', value: reputation[ReputationType.HUMANITY], color: 'text-rose-500', bar: 'bg-rose-600' },
                   { label: 'Credibility', value: reputation[ReputationType.CREDIBILITY], color: 'text-blue-500', bar: 'bg-blue-600' },
                   { label: 'Underworld', value: reputation[ReputationType.UNDERWORLD], color: 'text-purple-500', bar: 'bg-purple-600' },
               ].map(rep => (
                   <div key={rep.label} className="bg-noir-200 border border-noir-400 p-4 rounded flex flex-col items-center justify-center">
                       <div className="text-2xl font-black text-white mb-1">{rep.value}</div>
                       <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-3", rep.color)}>{rep.label}</div>
                       <div className="w-full h-1.5 bg-noir-400 rounded-full overflow-hidden">
                           <div className={cn("h-full transition-all duration-1000", rep.bar)} style={{ width: `${rep.value}%` }}></div>
                       </div>
                   </div>
               ))}
           </div>

           {/* BACKROOM INVENTORY (FORFEIT) */}
           <div className="flex-1 bg-noir-200 border border-noir-400 rounded-lg p-6 flex flex-col min-h-0">
               <div className="flex justify-between items-center mb-4 pb-2 border-b border-noir-400">
                   <h3 className="text-stone-300 font-bold uppercase tracking-widest flex items-center gap-2">
                       <PackageX className="w-5 h-5" /> Liquidate Assets
                   </h3>
                   <span className="text-[10px] bg-noir-400 text-stone-300 px-2 py-1 rounded">
                       {expiredItems.length} ITEMS READY
                   </span>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                   {expiredItems.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-stone-600 text-xs uppercase tracking-widest">
                           Vault is Clear
                       </div>
                   ) : (
                       expiredItems.map(item => (
                           <div key={item.id} className="flex justify-between items-center bg-black/30 p-3 rounded border border-noir-400 group hover:border-stone-500 transition-colors">
                               <div>
                                   <div className="text-stone-200 text-sm font-bold">{item.name}</div>
                                   <div className="text-xs text-stone-500 font-mono">Est. ${item.realValue}</div>
                               </div>
                               <Button 
                                   size="sm"
                                   variant="secondary"
                                   onClick={() => liquidateItem(item)}
                                   className="text-[10px] h-8 border-stone-600 hover:bg-pawn-accent hover:text-black hover:border-pawn-accent"
                               >
                                   <DollarSign className="w-3 h-3 mr-1"/> SELL (+${Math.floor(item.realValue * 0.8)})
                               </Button>
                           </div>
                       ))
                   )}
               </div>
           </div>

           {/* SYSTEM SHUTDOWN BUTTON */}
           <Button 
             variant="primary" 
             onClick={performNightCycle} 
             className="w-full h-16 text-xl tracking-[0.2em] shadow-[0_0_30px_rgba(217,119,6,0.3)] bg-gradient-to-r from-amber-700 to-amber-600 border-none hover:from-amber-600 hover:to-amber-500 relative overflow-hidden group"
           >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
             <span className="relative z-10 flex items-center justify-center gap-3">
                 <Power className="w-6 h-6" /> SYSTEM SHUTDOWN (SLEEP)
             </span>
           </Button>

        </div>
      </div>
    </div>
  );
};
