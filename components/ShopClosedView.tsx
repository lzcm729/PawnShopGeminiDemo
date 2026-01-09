
import React from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { DoorClosed, Moon, Clock } from 'lucide-react';

export const ShopClosedView: React.FC = () => {
  const { state, dispatch } = useGame();

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black/90 relative overflow-hidden text-stone-300">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517502886367-e6f8564db31d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 grayscale"></div>
      
      {/* Closed Sign Effect */}
      <div className="relative z-10 border-4 border-stone-800 bg-[#1c1917] p-12 rounded-lg shadow-2xl flex flex-col items-center max-w-lg w-full">
         <div className="mb-6 relative">
            <div className="absolute -inset-4 bg-red-900/20 blur-xl rounded-full animate-pulse"></div>
            <DoorClosed className="w-20 h-20 text-stone-600 relative z-10" />
         </div>
         
         <h1 className="text-4xl font-serif font-black tracking-widest text-stone-500 mb-2 uppercase">店铺打烊</h1>
         <h2 className="text-xl font-mono text-stone-600 mb-8">(SHOP CLOSED)</h2>
         
         <div className="w-full bg-stone-900/50 p-6 rounded border border-stone-800 mb-8 text-center">
            <p className="text-stone-400 font-serif italic mb-4">"今日的交易已结束。清点账目，准备休息。"</p>
            
            <div className="flex justify-center gap-8 text-sm font-mono text-stone-500">
                <div className="flex flex-col items-center">
                    <Clock className="w-4 h-4 mb-1" />
                    <span>Cycle {state.stats.day}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-stone-300">{state.customersServedToday}</span>
                    <span>顾客</span>
                </div>
            </div>
         </div>

         <Button 
            onClick={() => dispatch({ type: 'MANUAL_CLOSE_SHOP' })}
            className="w-full h-16 text-xl tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.05)] border-stone-600 hover:bg-stone-800"
            variant="secondary"
         >
            <Moon className="w-5 h-5 inline-block mr-3 mb-1" />
            进入结算 (NIGHT)
         </Button>
      </div>
    </div>
  );
};
