
import React, { useEffect, useState } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Button } from './ui/Button';
import { Moon, Mail, Package, Calendar, Power, Coffee, Activity, AlertCircle, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { playSfx } from '../systems/game/audio';

export const NightDashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const { performNightCycle } = useGameEngine();
    const { inbox, inventory, stats } = state;

    const unreadMail = inbox.filter(m => !m.isRead).length;
    const activeItems = inventory.filter(i => i.status !== 'SOLD').length;

    // Medical Bill Logic
    const bill = stats.medicalBill;
    const daysUntilBill = bill.dueDate - stats.day;
    const isOverdue = bill.status === 'OVERDUE' || (daysUntilBill <= 0 && bill.status !== 'PAID');

    // Ambience: Lamp flicker logic
    const [lampFlicker, setLampFlicker] = useState(1);
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.95) {
                setLampFlicker(0.8 + Math.random() * 0.2);
                setTimeout(() => setLampFlicker(1), 50 + Math.random() * 100);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSleep = () => {
        playSfx('CLICK');
        performNightCycle();
    };

    return (
        <div className="h-screen w-full bg-[#050505] relative overflow-hidden font-mono text-stone-400 flex flex-col items-center justify-center">
            {/* Background: Dark Office */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 blur-sm pointer-events-none grayscale contrast-125"></div>
            
            {/* Desk Light Overlay */}
            <div 
                className="absolute inset-0 bg-radial-gradient from-amber-500/10 to-black pointer-events-none transition-opacity duration-75"
                style={{ opacity: lampFlicker * 0.5 }}
            ></div>

            <div className="relative z-10 w-full max-w-6xl h-[80vh] flex gap-8 p-8">
                
                {/* Left: Desk Area / Menu */}
                <div className="flex-1 flex flex-col justify-end gap-6">
                    <div className="mb-auto">
                        <h1 className="text-4xl font-serif text-stone-300 mb-2">Night Cycle</h1>
                        <p className="text-xs uppercase tracking-widest text-stone-600">
                            Day {stats.day} Complete. <br/>
                            Store Status: LOCKED.
                        </p>
                    </div>

                    {/* Admin Actions */}
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_MAIL' })}
                            className={cn(
                                "h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                                unreadMail > 0 && "border-green-900/50"
                            )}
                        >
                            {unreadMail > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                            <Mail className={cn("w-8 h-8 group-hover:scale-110 transition-transform", unreadMail > 0 ? "text-green-500" : "text-stone-500")} />
                            <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                Mail Terminal {unreadMail > 0 && `(${unreadMail})`}
                            </span>
                        </button>

                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_FINANCIALS' })}
                            className="h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                        >
                            <Calendar className="w-8 h-8 text-stone-500 group-hover:text-stone-300 group-hover:scale-110 transition-transform" />
                            <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                Financials
                            </span>
                        </button>

                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
                            className="h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                        >
                            <Package className="w-8 h-8 text-stone-500 group-hover:text-stone-300 group-hover:scale-110 transition-transform" />
                            <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                Vault ({activeItems})
                            </span>
                        </button>

                        {/* Medical Terminal Button */}
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_MEDICAL' })}
                            className={cn(
                                "h-32 border bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                                isOverdue ? "border-red-500 animate-pulse bg-red-950/20" : (bill.status === 'PENDING' ? "border-teal-800" : "border-stone-800")
                            )}
                        >
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                {isOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
                                <span className={cn("text-[9px] font-bold uppercase", stats.motherStatus.health < 50 ? "text-red-500" : "text-stone-500")}>
                                    HP: {Math.round(stats.motherStatus.health)}%
                                </span>
                            </div>

                            <Activity className={cn("w-8 h-8 transition-transform group-hover:scale-110", bill.status === 'PENDING' ? "text-teal-500" : "text-stone-500")} />
                            <div className="flex flex-col items-center">
                                <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                    Medical Admin
                                </span>
                                {isOverdue && (
                                    <span className="text-[9px] text-red-500 font-bold mt-1">
                                        ! CRITICAL !
                                    </span>
                                )}
                            </div>
                        </button>

                        {/* NEW: Visit Hospital Button */}
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_VISIT' })}
                            disabled={stats.visitedToday}
                            className={cn(
                                "h-32 border bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden col-span-2",
                                stats.visitedToday ? "border-stone-800 opacity-50 grayscale" : "border-blue-900 hover:border-blue-700"
                            )}
                        >
                            <Heart className={cn("w-8 h-8 transition-transform group-hover:scale-110", stats.visitedToday ? "text-stone-600" : "text-blue-500")} />
                            <div className="flex flex-col items-center">
                                <span className={cn("text-xs uppercase tracking-widest font-bold", stats.visitedToday ? "text-stone-500" : "text-blue-200")}>
                                    {stats.visitedToday ? "Visit Complete" : "Visit Hospital (Action)"}
                                </span>
                                {!stats.visitedToday && (
                                    <span className="text-[9px] text-blue-500/70 mt-1">
                                        Humanity +2 / Risk -1%
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right: End Day Action */}
                <div className="w-1/3 flex flex-col items-center justify-center border-l border-stone-800 pl-8">
                    <div className="text-center mb-8">
                        <div className="text-[10px] uppercase text-stone-600 mb-2 tracking-[0.2em]">Net Cash Position</div>
                        <div className="text-3xl font-mono text-stone-200">${stats.cash}</div>
                    </div>

                    <Button 
                        onClick={handleSleep}
                        className="w-full h-20 text-lg tracking-widest bg-stone-900 hover:bg-stone-800 border-stone-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-colors"></div>
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            <Moon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            END DAY (SLEEP)
                        </span>
                    </Button>
                    
                    <p className="mt-4 text-[9px] text-stone-700 text-center max-w-[200px]">
                        "Sleep is the interest we pay on the debt of death."
                    </p>
                </div>

            </div>
        </div>
    );
};
