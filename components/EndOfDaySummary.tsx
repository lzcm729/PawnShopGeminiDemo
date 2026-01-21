
import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Button } from './ui/Button';
import { Moon, TrendingUp, TrendingDown, DollarSign, PackageX, AlertOctagon } from 'lucide-react';
import { ReputationType, ItemStatus } from '../types';

export const EndOfDaySummary: React.FC = () => {
  const { state, dispatch } = useGame();
  const { liquidateItem, performNightCycle } = useGameEngine();
  const { stats, todayTransactions, reputation, inventory } = state;

  // Calculate Daily Totals
  const income = todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const expense = todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
  const dailyNet = income + expense;
  
  // Find items that are FORFEIT (Owned by shop, ready to sell)
  const expiredItems = inventory.filter(item => item.status === ItemStatus.FORFEIT);

  // Reputation Bars Helper
  const RepBar = ({ type, label, color }: { type: ReputationType, label: string, color: string }) => (
    <div className="mb-4">
      <div className="flex justify-between text-xs font-mono text-stone-400 mb-1">
        <span>{label}</span>
        <span>{reputation[type]}%</span>
      </div>
      <div className="h-2 bg-black rounded-full overflow-hidden border border-stone-800">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${reputation[type]}%` }}></div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-10 blur-sm"></div>

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 h-[80vh]">
        
        {/* LEFT COLUMN: THE LEDGER */}
        <div className="bg-[#e7e5e4] text-stone-900 p-8 rounded shadow-2xl rotate-[-1deg] flex flex-col font-mono relative overflow-hidden">
           {/* Paper texture overlay */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-30 pointer-events-none"></div>
           
           <div className="border-b-2 border-dashed border-stone-400 pb-4 mb-4 text-center">
             <h2 className="text-3xl font-bold uppercase tracking-widest">每日结单</h2>
             <p className="text-sm text-stone-600">日期: 第 {stats.day} 天</p>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-2 pr-2">
              {todayTransactions.length === 0 && <p className="text-center text-stone-500 italic mt-10">今日无交易记录</p>}
              {todayTransactions.map(t => (
                <div key={t.id} className="flex justify-between text-sm border-b border-stone-300 pb-1">
                  <span className="truncate w-2/3">{t.description}</span>
                  <span className={t.amount >= 0 ? "text-green-800 font-bold" : "text-red-800"}>
                    {t.amount >= 0 ? '+' : ''}{t.amount}
                  </span>
                </div>
              ))}
              
              {/* Anticipated Daily Expense */}
              <div className="flex justify-between text-sm border-b border-stone-300 pb-1 mt-4 text-stone-500 italic">
                  <span>店铺运营开支</span>
                  <span className="text-red-800">-{stats.dailyExpenses}</span>
              </div>
           </div>

           <div className="border-t-2 border-stone-800 pt-4 mt-4">
              <div className="flex justify-between text-xl font-bold">
                 <span>今日净收益:</span>
                 <span className={dailyNet - stats.dailyExpenses >= 0 ? "text-green-700" : "text-red-700"}>
                    {dailyNet - stats.dailyExpenses >= 0 ? '+' : ''}{dailyNet - stats.dailyExpenses}
                 </span>
              </div>
              <div className="flex justify-between text-sm mt-2 text-stone-600">
                 <span>当前现金:</span>
                 <span>${stats.cash}</span>
              </div>
              <div className="mt-4 p-2 bg-red-100 border border-red-300 text-red-900 text-center text-sm rounded">
                 <AlertOctagon className="w-4 h-4 inline-block mr-1 mb-1"/>
                 距离缴纳房租 (${stats.rentDue}) 还有 {stats.rentDueDate - stats.day} 天
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: STATUS & BACKROOM */}
        <div className="flex-1 flex flex-col gap-6">
           
           {/* Reputation Card */}
           <div className="bg-[#1c1917] p-6 rounded border-l-4 border-pawn-accent shadow-lg text-stone-200">
              <h3 className="text-xl font-serif text-pawn-accent mb-4 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5" /> 街坊风评
              </h3>
              <RepBar type={ReputationType.HUMANITY} label="人性 (Humanity)" color="bg-rose-600" />
              <RepBar type={ReputationType.CREDIBILITY} label="信誉 (Credibility)" color="bg-blue-500" />
              <RepBar type={ReputationType.UNDERWORLD} label="地下 (Underworld)" color="bg-purple-600" />
           </div>

           {/* Inventory/Liquidate Card */}
           <div className="flex-1 bg-[#292524] p-6 rounded border border-stone-700 shadow-lg flex flex-col min-h-0">
              <h3 className="text-xl font-serif text-stone-300 mb-2 flex items-center gap-2">
                 <PackageX className="w-5 h-5" /> 过期仓库 (绝当)
              </h3>
              <p className="text-xs text-stone-500 mb-4">物品超过期限未赎回即归店铺所有。可立即变现。</p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                 {expiredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-600">
                       <p>暂无过期物品</p>
                    </div>
                 ) : (
                    expiredItems.map(item => (
                       <div key={item.id} className="bg-black/40 p-3 rounded border border-stone-600 flex justify-between items-center group">
                          <div>
                             <p className="text-stone-200 font-bold text-sm">{item.name}</p>
                             <p className="text-stone-500 text-xs">估值: ${item.realValue}</p>
                          </div>
                          <Button 
                             variant="secondary" 
                             className="text-xs px-2 py-1 h-auto"
                             onClick={() => liquidateItem(item)}
                          >
                             <DollarSign className="w-3 h-3 inline mr-1"/>
                             变现 (+${Math.floor(item.realValue * 0.8)})
                          </Button>
                       </div>
                    ))
                 )}
              </div>
           </div>

           <Button 
             variant="primary" 
             onClick={performNightCycle} // UPDATED: Calls the new transition logic
             className="w-full h-16 text-xl tracking-widest shadow-[0_0_20px_rgba(217,119,6,0.5)] flex-shrink-0"
           >
             <Moon className="w-5 h-5 inline-block mr-3 mb-1" />
             结束今日 (SLEEP)
           </Button>

        </div>
      </div>
    </div>
  );
};
