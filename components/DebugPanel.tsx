
import React from 'react';
import { useGame } from '../store/GameContext';
import { X, Activity, Database } from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const { state, dispatch } = useGame();
  
  if (!state.showDebug) return null;

  return (
    <div className="fixed top-20 right-4 z-[200] w-80 bg-[#0a0a0a] border border-green-500/30 shadow-[0_0_20px_rgba(0,255,0,0.1)] rounded-md p-4 font-mono text-xs text-green-500 overflow-y-auto max-h-[80vh] backdrop-blur-md">
      <div className="flex justify-between items-center mb-4 border-b border-green-900/50 pb-2">
        <h3 className="font-bold flex items-center gap-2 tracking-widest text-green-400">
            <Activity className="w-4 h-4" /> DEBUG_CONSOLE
        </h3>
        <button onClick={() => dispatch({ type: 'TOGGLE_DEBUG' })} className="hover:text-green-200 transition-colors">
            <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {state.activeChains.map(chain => (
            <div key={chain.id} className="bg-green-950/10 p-3 rounded border border-green-900/30 relative overflow-hidden group">
                 {/* Scanline effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.02)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none"></div>

                <div className="flex justify-between mb-2 border-b border-green-900/30 pb-1">
                    <span className="font-bold text-green-300 flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        {chain.npcName}
                    </span>
                    <span className="text-green-700">{chain.id}</span>
                </div>
                
                <div className="space-y-1.5 pl-1">
                    <div className="flex justify-between">
                        <span className="opacity-70">Stage:</span> 
                        <span className="text-green-200 font-bold">{chain.stage}</span>
                    </div>
                    {Object.entries(chain.variables).map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-dashed border-green-900/30 pb-0.5 last:border-0">
                            <span className="opacity-70 capitalize">{key}:</span>
                            <span className={`font-bold ${typeof val === 'number' && val < 0 ? 'text-red-400' : 'text-green-200'}`}>
                                {val}
                            </span>
                        </div>
                    ))}
                </div>
                
                {!chain.isActive && (
                    <div className="mt-2 text-red-500 bg-red-950/20 border border-red-900/50 text-[9px] uppercase text-center py-1 font-bold tracking-wider">
                        [ CHAIN TERMINATED ]
                    </div>
                )}
            </div>
        ))}

        {state.activeChains.length === 0 && (
            <div className="text-green-700 italic text-center border border-dashed border-green-900 p-4">
                NO ACTIVE NARRATIVE THREADS
            </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-green-900/50 text-[10px] text-green-600 space-y-1">
          <p className="font-bold mb-1">[ SYSTEM_STATE ]</p>
          <div className="flex justify-between"><span>Global Day:</span> <span className="text-green-400">{state.stats.day}</span></div>
          <div className="flex justify-between"><span>Reputation (H/C/U):</span> <span className="text-green-400">{Object.values(state.reputation).join('/')}</span></div>
          <div className="flex justify-between"><span>Completed IDs:</span> <span className="text-green-400">{state.completedScenarioIds.length}</span></div>
      </div>
    </div>
  );
};
