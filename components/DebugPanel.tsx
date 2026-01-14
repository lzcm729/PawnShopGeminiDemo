
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { Activity, Database, PlayCircle, Bug, X, Terminal, FileDown, Power } from 'lucide-react';
import { validateEvents, ValidationIssue } from '../services/eventValidator';
import { EMMA_EVENTS } from '../services/storyData';
import { generateDesignBible } from '../services/designExporter';
import { ValidationModal } from './ValidationModal';

export const DebugPanel: React.FC = () => {
  const { state, dispatch } = useGame();
  
  const [showValidation, setShowValidation] = useState(false);
  const [validationLogs, setValidationLogs] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const handleValidate = () => {
        const result = validateEvents([...EMMA_EVENTS]);
        setValidationLogs(result.logs);
        setValidationIssues(result.issues);
        setShowValidation(true);
  };

  const handleExportBible = () => {
      const content = generateDesignBible();
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pawn_shop_design_bible_${new Date().toISOString().slice(0,10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const toggleChain = (chainId: string) => {
    const updatedChains = state.activeChains.map(c =>
        c.id === chainId ? { ...c, isActive: !c.isActive } : c
    );
    dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
  };

  if (!state.showDebug) return null;

  return (
    <>
      <ValidationModal 
            isOpen={showValidation} 
            onClose={() => setShowValidation(false)} 
            logs={validationLogs} 
            issues={validationIssues}
      />

      <div className="fixed left-4 bottom-4 w-96 h-[500px] z-[90] flex flex-col bg-[#050505] border-2 border-green-900 shadow-2xl rounded-lg overflow-hidden font-mono text-xs animate-in slide-in-from-left-10 fade-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-green-900 bg-[#0a0a0a]">
            <div className="flex items-center gap-2 text-green-500 font-bold tracking-widest">
                <Terminal className="w-4 h-4" />
                <span>SYS_DEBUG_TERMINAL</span>
            </div>
            <button 
                onClick={() => dispatch({ type: 'TOGGLE_DEBUG' })}
                className="text-green-700 hover:text-green-400 hover:bg-green-900/30 rounded p-1 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
        
        {/* Controls */}
        <div className="p-3 border-b border-green-900/30 grid grid-cols-2 gap-2 bg-green-950/5">
            <button 
                    onClick={handleValidate}
                    className="bg-green-900/20 border border-green-700/50 hover:bg-green-900/40 text-green-400 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
            >
                <PlayCircle className="w-3 h-3" />
                VALIDATE STORY
            </button>
            <button 
                onClick={handleExportBible}
                className="bg-blue-900/20 border border-blue-700/50 hover:bg-blue-900/40 text-blue-400 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
            >
                <FileDown className="w-3 h-3" />
                EXPORT BIBLE
            </button>
        </div>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-black/50">
            {state.activeChains.map(chain => (
                <div key={chain.id} className="bg-green-950/10 p-3 rounded border border-green-900/30 relative overflow-hidden group">
                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.02)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none"></div>

                    <div className="flex justify-between mb-2 border-b border-green-900/30 pb-1 items-center">
                        <span className="font-bold text-green-300 flex items-center gap-2">
                            <Database className="w-3 h-3" />
                            {chain.npcName}
                        </span>
                        <div className="flex items-center gap-2">
                             <span className="text-green-700">{chain.id}</span>
                             <button
                                onClick={() => toggleChain(chain.id)}
                                className={`p-1 rounded border ${chain.isActive ? 'bg-green-500 text-black border-green-400' : 'bg-red-900/30 text-red-500 border-red-900'} hover:opacity-80 transition-colors`}
                                title={chain.isActive ? "Deactivate" : "Trigger (Start Next Day)"}
                             >
                                <Power className="w-3 h-3" />
                             </button>
                        </div>
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
            <div className="flex justify-between"><span>Global Day:</span> <span className="text-green-400">{state.stats.day}</span></div>
            <div className="flex justify-between"><span>Active Scenarios:</span> <span className="text-green-400">{state.activeChains.filter(c => c.isActive).length}</span></div>
            <div className="flex justify-between"><span>Completed IDs:</span> <span className="text-green-400">{state.completedScenarioIds.length}</span></div>
        </div>
      </div>
    </>
  );
};
