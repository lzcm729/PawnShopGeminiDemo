
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { Database, PlayCircle, Bug, X, Terminal, Power, DollarSign, Sparkles, Trash2, GripHorizontal } from 'lucide-react';
import { validateEvents, ValidationIssue } from '../systems/narrative/validator';
import { EMMA_EVENTS } from '../systems/narrative/storyRegistry';
import { ValidationModal } from './ValidationModal';
import { playSfx } from '../systems/game/audio';

const DEBUG_PANEL_POSITION_KEY = 'debug_panel_position_v1';
const PANEL_WIDTH = 384; // w-96 = 24rem = 384px
const PANEL_HEIGHT = 500;

interface Position {
  x: number;
  y: number;
}

function loadSavedPosition(): Position | null {
  try {
    const saved = localStorage.getItem(DEBUG_PANEL_POSITION_KEY);
    if (saved) {
      const pos = JSON.parse(saved) as Position;
      // Validate position is within current viewport
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function savePosition(pos: Position): void {
  try {
    localStorage.setItem(DEBUG_PANEL_POSITION_KEY, JSON.stringify(pos));
  } catch {
    // Ignore storage errors
  }
}

function constrainPosition(x: number, y: number): Position {
  const maxX = window.innerWidth - PANEL_WIDTH;
  const maxY = window.innerHeight - PANEL_HEIGHT;
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}

export const DebugPanel: React.FC = () => {
  const { state, dispatch } = useGame();

  const [showValidation, setShowValidation] = useState(false);
  const [validationLogs, setValidationLogs] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Dragging state
  const [position, setPosition] = useState<Position>(() => {
    const saved = loadSavedPosition();
    return saved || { x: 16, y: window.innerHeight - PANEL_HEIGHT - 16 }; // Default: left-4 bottom-4
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    const constrained = constrainPosition(newX, newY);
    setPosition(constrained);
  }, [isDragging]);

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  }, [isDragging, position]);

  // Attach/detach document-level event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Re-constrain position when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => constrainPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start dragging from title bar
  const handleDragStart = (e: React.MouseEvent) => {
    // Only left mouse button
    if (e.button !== 0) return;

    e.preventDefault();
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    setIsDragging(true);
  };

  const toggleDebug = () => {
      playSfx('CLICK');
      dispatch({ type: 'TOGGLE_DEBUG' });
  };

  const handleValidate = () => {
        playSfx('CLICK');
        const result = validateEvents([...EMMA_EVENTS]);
        setValidationLogs(result.logs);
        setValidationIssues(result.issues);
        setShowValidation(true);
  };

  const handleAddCash = () => {
    playSfx('CLICK');
    dispatch({ type: 'DEBUG_ADD_CASH', payload: 1000 });
  };

  const handleAddEssence = () => {
    playSfx('CLICK');
    dispatch({ type: 'ADD_ESSENCE_BATCH', payload: { craft: 10, time: 10, vibe: 10 } });
  };

  const handleClearSave = () => {
    playSfx('WARNING');
    if (confirm('确定要清除存档吗？此操作不可恢复！')) {
      localStorage.removeItem('pawns_dilemma_save_v1');
      window.location.reload();
    }
  };

  const toggleChain = (chainId: string) => {
    playSfx('CLICK');
    const updatedChains = state.activeChains.map(c =>
        c.id === chainId ? { ...c, isActive: !c.isActive } : c
    );
    dispatch({ type: 'UPDATE_CHAINS', payload: updatedChains });
  };

  return (
    <>
      <ValidationModal 
            isOpen={showValidation} 
            onClose={() => setShowValidation(false)} 
            logs={validationLogs} 
            issues={validationIssues}
      />

      {!state.showDebug && (
        <button
            onClick={toggleDebug}
            className="fixed left-4 bottom-4 z-[200] w-12 h-12 bg-black/90 border border-green-900/50 rounded-full flex items-center justify-center text-green-700 hover:text-green-400 hover:border-green-500 hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,255,0,0.1)] group"
            title="Open Debug Console"
        >
            <Bug className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {state.showDebug && (
        <div
          ref={panelRef}
          className="fixed w-96 h-[500px] z-[200] flex flex-col bg-[#050505] border-2 border-green-900 shadow-[0_0_50px_rgba(0,255,0,0.2)] rounded-lg overflow-hidden font-mono text-xs animate-in slide-in-from-left-10 fade-in duration-300"
          style={{
            left: position.x,
            top: position.y,
          }}
        >

            <div
              className="flex justify-between items-center p-2 border-b border-green-900 bg-[#0a0a0a] cursor-move select-none"
              onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-2 text-green-500 font-bold tracking-widest">
                    <GripHorizontal className="w-4 h-4 opacity-50" />
                    <Terminal className="w-4 h-4" />
                    <span>SYS_DEBUG_TERMINAL</span>
                </div>
                <button
                    onClick={toggleDebug}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-green-700 hover:text-green-400 hover:bg-green-900/30 rounded p-1 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="p-3 border-b border-green-900/30 grid grid-cols-3 gap-2 bg-green-950/5">
                <button
                        onClick={handleValidate}
                        className="bg-green-900/20 border border-green-700/50 hover:bg-green-900/40 text-green-400 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
                >
                    <PlayCircle className="w-3 h-3" />
                    VALIDATE
                </button>
                <button
                    onClick={handleAddCash}
                    className="bg-amber-900/20 border border-amber-700/50 hover:bg-amber-900/40 text-amber-400 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
                >
                    <DollarSign className="w-3 h-3" />
                    +$1000
                </button>
                <button
                    onClick={handleAddEssence}
                    className="bg-purple-900/20 border border-purple-700/50 hover:bg-purple-900/40 text-purple-400 px-2 py-2 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
                >
                    <Sparkles className="w-3 h-3" />
                    +精魄
                </button>
                <button
                    onClick={handleClearSave}
                    className="col-span-3 bg-red-900/20 border border-red-700/50 hover:bg-red-900/40 text-red-400 px-2 py-1.5 rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
                >
                    <Trash2 className="w-3 h-3" />
                    清除存档
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-black/50">
                {state.activeChains.map(chain => (
                    <div key={chain.id} className="bg-green-950/10 p-3 rounded border border-green-900/30 relative overflow-hidden group">
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
            
            <div className="p-3 border-t border-green-900/50 bg-[#050505] text-[10px] text-green-600 space-y-1">
                <div className="flex justify-between"><span>Global Day:</span> <span className="text-green-400">{state.stats.day}</span></div>
                <div className="flex justify-between"><span>Active Scenarios:</span> <span className="text-green-400">{state.activeChains.filter(c => c.isActive).length}</span></div>
                <div className="flex justify-between"><span>Completed IDs:</span> <span className="text-green-400">{state.completedScenarioIds.length}</span></div>
            </div>
        </div>
      )}
    </>
  );
};
