
import React, { useEffect, useState } from 'react';
import { REPUTATION_MILESTONES } from '../../systems/reputation/milestones';
import { Trophy } from 'lucide-react';
import { playSfx } from '../../systems/game/audio';
import { cn } from '../../lib/utils';

interface MilestoneNotificationProps {
    activeMilestones: string[];
}

export const MilestoneNotification: React.FC<MilestoneNotificationProps> = ({ activeMilestones }) => {
    const [queue, setQueue] = useState<string[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Watch for changes in activeMilestones to detect new ones
    // Note: In a real app we might want a 'newlyUnlocked' prop from context, 
    // but here we just check if active count increased or diff logic.
    // However, since we receive the full list, we need to know what was JUST added.
    // The reducer dispatches 'UNLOCK_MILESTONE', we can listen for that if we had an event bus.
    // For now, we will rely on a local ref or simple effect.
    
    // Better approach: GameContext doesn't expose 'lastUnlocked'.
    // Let's just rely on the fact that this component mounts once.
    // Actually, we need to track 'seen' locally to know what is new.
    
    const [seen, setSeen] = useState<Set<string>>(new Set(activeMilestones));

    useEffect(() => {
        const newUnlocks = activeMilestones.filter(id => !seen.has(id));
        if (newUnlocks.length > 0) {
            setQueue(prev => [...prev, ...newUnlocks]);
            setSeen(prev => {
                const next = new Set(prev);
                newUnlocks.forEach(id => next.add(id));
                return next;
            });
        }
    }, [activeMilestones]);

    useEffect(() => {
        if (!currentId && queue.length > 0) {
            setCurrentId(queue[0]);
            setQueue(prev => prev.slice(1));
            playSfx('SUCCESS');
            
            const timer = setTimeout(() => {
                setCurrentId(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [queue, currentId]);

    if (!currentId) return null;

    const milestone = REPUTATION_MILESTONES.find(m => m.id === currentId);
    if (!milestone) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-black/90 border-2 border-amber-500 rounded-lg p-4 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center gap-4 min-w-[300px]">
                <div className="p-3 bg-amber-500/20 rounded-full border border-amber-500/50">
                    <Trophy className="w-8 h-8 text-amber-500 animate-bounce" />
                </div>
                <div>
                    <div className="text-[10px] font-bold uppercase text-stone-500 tracking-widest mb-1">
                        Reputation Milestone Unlocked
                    </div>
                    <div className={cn("text-lg font-serif font-black mb-1", milestone.color)}>
                        {milestone.label}
                    </div>
                    <div className="text-xs text-stone-300 font-mono">
                        {milestone.effectDescription}
                    </div>
                </div>
            </div>
        </div>
    );
};
