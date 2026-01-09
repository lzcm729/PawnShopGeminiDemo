
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { Activity, Database, PlayCircle, Bug } from 'lucide-react';
import { validateEvents, ValidationIssue } from '../services/eventValidator';
import { EMMA_EVENTS } from '../services/storyData';
import { ValidationModal } from './ValidationModal';

export const DebugPanel: React.FC = () => {
  const { state } = useGame();
  
  const [showValidation, setShowValidation] = useState(false);
  const [validationLogs, setValidationLogs] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const handleValidate = () => {
        const result = validateEvents([...EMMA_EVENTS]);
        setValidationLogs(result.logs);
        setValidationIssues(result.issues);
        setShowValidation(true);
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] font-mono text-xs text-green-500 flex flex-col border-r border-green-500/10">
      
      <ValidationModal 
            isOpen={showValidation} 
            onClose={() => setShowValidation(false)} 
            logs={validationLogs} 
            issues={validationIssues}
      />

      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-green-900/50 bg-[#050505]">
        <h3 className="font-bold flex items-center gap-2 tracking-widest text-green-400">
            <Activity className="w-4 h-4" /> DEV_CONSOLE
        </h3>
      </div>
      
      {/* Controls */}
      <div className="p-3 border-b border-green-900/50 grid grid-cols-2 gap-2">
           <button 
                onClick={handleValidate}
                className="bg-green-900/20 border border-green-700/50 hover:bg-green-900/40 text-green-400 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
           >
               <PlayCircle className="w-3 h-3" />
               VALIDATE STORY
           </button>
           <div className="bg-green-900/10 border border-green-900/30 text-green-600 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase cursor-not-allowed opacity-50">
               <Bug className="w-3 h-3" />
               (MORE TOOLS)
           </div>
      </div>

      {/* Content Scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
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
      
      {/* Footer Stats */}
      <div className="p-3 border-t border-green-900/50 bg-[#050505] text-[10px] text-green-600 space-y-1">
          <p className="font-bold mb-1">[ SYSTEM_STATE ]</p>
          <div className="flex justify-between"><span>Global Day:</span> <span className="text-green-400">{state.stats.day}</span></div>
          <div className="flex justify-between"><span>Reputation:</span> <span className="text-green-400">{Object.values(state.reputation).map(Math.round).join('/')}</span></div>
          <div className="flex justify-between"><span>Completed IDs:</span> <span className="text-green-400">{state.completedScenarioIds.length}</span></div>
      </div>
    </div>
  );
};
