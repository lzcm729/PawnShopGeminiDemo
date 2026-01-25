
import React from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { DoorClosed, Moon, Clock, ArrowRight } from 'lucide-react';

// Formerly ShopClosedView, now represents the "Departure" phase after a deal.
// It serves as a brief pause before transition to Night or Next Customer.
export const DepartureView: React.FC = () => {
  const { state, dispatch } = useGame();

  const handleDeparture = () => {
      // Logic: If served >= max, go to NIGHT. If < max, go to BUSINESS.
      // But based on current reducer, Phase is already set to DEPARTURE.
      // We just need an action to move forward.
      // If we want strict day/night with 1 customer:
      dispatch({ type: 'START_NIGHT' });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black/90 relative overflow-hidden text-stone-300">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517502886367-e6f8564db31d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 grayscale"></div>
      
      {/* Departure Content */}
      <div className="relative z-10 border-4 border-stone-800 bg-[#1c1917] p-12 rounded-lg shadow-2xl flex flex-col items-center max-w-lg w-full animate-in fade-in duration-500">
         <div className="mb-6 relative">
            <div className="absolute -inset-4 bg-amber-900/10 blur-xl rounded-full animate-pulse"></div>
            <DoorClosed className="w-20 h-20 text-stone-600 relative z-10" />
         </div>
         
         <h1 className="text-3xl font-serif font-black tracking-widest text-stone-500 mb-2 uppercase">交易结束</h1>
         <div className="h-px w-24 bg-stone-700 mb-6"></div>
         
         <div className="w-full bg-stone-900/50 p-6 rounded border border-stone-800 mb-8 text-center">
            <p className="text-stone-400 font-serif italic mb-4">"顾客已离开。柜台恢复了平静。"</p>
            
            <div className="flex justify-center gap-8 text-sm font-mono text-stone-500">
                <div className="flex flex-col items-center">
                    <Clock className="w-4 h-4 mb-1" />
                    <span>Cycle {state.stats.day}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-stone-300">{state.customersServedToday} / {state.maxCustomersPerDay}</span>
                    <span>Served</span>
                </div>
            </div>
         </div>

         <Button 
            onClick={handleDeparture}
            className="w-full h-16 text-xl tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.05)] border-stone-600 hover:bg-stone-800 group"
            variant="secondary"
         >
            <div className="flex items-center gap-3">
                <Moon className="w-5 h-5" />
                <span>LOCK UP (NIGHT)</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
         </Button>
      </div>
    </div>
  );
};
