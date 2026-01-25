
import React, { useEffect, useState } from 'react';
import { useGame } from '../store/GameContext';
import { Button } from './ui/Button';
import { Activity, Heart, Shield, Calendar, DollarSign, RotateCcw, Sun } from 'lucide-react';
import { ReputationType } from '../types';
import { playSfx } from '../systems/game/audio';

interface VictoryScreenProps {
    onRestart: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ onRestart }) => {
    const { state } = useGame();
    const { stats, reputation } = state;
    const [reveal, setReveal] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setReveal(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // Determine Ending Flavor
    let endingTitle = "Surviving the Night";
    let endingDesc = "手术成功了。在这个残酷的城市里，你不仅救回了母亲，也活了下来。";
    let colorTheme = "text-stone-600";

    const humanity = reputation[ReputationType.HUMANITY];
    const underworld = reputation[ReputationType.UNDERWORLD];

    if (humanity > 60) {
        endingTitle = "The Saint of Sector 12";
        endingDesc = "手术非常成功。你证明了即使在最黑暗的角落，良心依然是有价值的。街坊邻里会永远记住你的善意。";
        colorTheme = "text-rose-600";
    } else if (underworld > 40) {
        endingTitle = "A Deal with the Devil";
        endingDesc = "手术成功了，母亲活了下来。但你看着镜子里的自己，眼神已经变得陌生。为了这笔钱，你弄脏了手，也失去了回头的路。";
        colorTheme = "text-purple-600";
    } else {
        endingTitle = "A Hard-Fought Dawn";
        endingDesc = "手术室的灯灭了，医生带来了好消息。你长舒一口气，看着窗外的日出。这是一场艰难的战役，但你赢了。";
        colorTheme = "text-amber-600";
    }

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f4] text-stone-800 relative overflow-hidden font-mono transition-colors duration-1000">
            {/* Light Ambience (Contrast to the dark game) */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f5f5f4] to-[#e7e5e4]"></div>
            
            {/* Particle Dust / Sunbeams */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-20 pointer-events-none"></div>

            <div className={`relative z-10 max-w-3xl w-full text-center p-8 transition-all duration-1000 transform ${reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                
                <div className="mb-8 flex justify-center">
                    <div className="p-6 bg-white rounded-full shadow-xl border border-stone-200 animate-in zoom-in duration-700 delay-300">
                        <Sun className="w-16 h-16 text-amber-500 animate-pulse-slow" />
                    </div>
                </div>

                <h2 className="text-xs font-bold tracking-[0.5em] text-stone-400 uppercase mb-4">Operation Status: Successful</h2>
                
                <h1 className={`text-5xl md:text-7xl font-serif font-black mb-6 ${colorTheme}`}>
                    {endingTitle}
                </h1>
                
                <p className="text-lg md:text-xl text-stone-600 font-serif italic leading-relaxed max-w-2xl mx-auto mb-12">
                    "{endingDesc}"
                </p>

                {/* Stats Card */}
                <div className="bg-white p-8 rounded-lg shadow-lg border border-stone-200 mb-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="flex flex-col items-center">
                        <Calendar className="w-5 h-5 text-stone-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">{stats.day}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Days Taken</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <DollarSign className="w-5 h-5 text-stone-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">${stats.cash}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Remaining Funds</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Heart className="w-5 h-5 text-rose-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">{humanity}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Humanity Score</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Shield className="w-5 h-5 text-blue-400 mb-2" />
                        <span className="text-2xl font-bold font-mono">{reputation[ReputationType.CREDIBILITY]}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">Credibility</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button 
                        onClick={() => { playSfx('CLICK'); onRestart(); }}
                        className="h-16 px-12 text-lg tracking-[0.2em] bg-stone-900 text-white hover:bg-stone-800 shadow-2xl"
                    >
                        <RotateCcw className="w-5 h-5 mr-3" /> RETURN TO TITLE
                    </Button>
                </div>
            </div>
        </div>
    );
};
