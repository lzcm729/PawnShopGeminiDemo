
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { parseMultipleCommands, executeCommand, CommandResult, DevConsoleAPI, getAvailableCommands, getCommandOptions } from '../systems/debug/commandParser';
import { ChevronRight, Terminal } from 'lucide-react';

interface HistoryEntry {
  type: 'input' | 'output' | 'error';
  text: string;
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    __console__?: DevConsoleAPI;
  }
}

export const DevConsole: React.FC = () => {
  const { state, dispatch } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Get state callback for command parser
  const getState = useCallback(() => state, [state]);

  // Execute command function for both UI and API
  const executeCommandString = useCallback((commandString: string): CommandResult[] => {
    const results: CommandResult[] = [];
    const commands = parseMultipleCommands(commandString);

    for (const parsed of commands) {
      const result = executeCommand(parsed, dispatch, getState);
      results.push(result);
    }

    return results;
  }, [dispatch, getState]);

  // Expose API to window for QA testing
  useEffect(() => {
    const api: DevConsoleAPI = {
      execute: (command: string) => {
        const results = executeCommandString(command);
        // Also update UI history when called via API
        setHistory(prev => [
          ...prev,
          { type: 'input', text: command },
          ...results.map(r => ({
            type: (r.success ? 'output' : 'error') as 'output' | 'error',
            text: r.message
          })).filter(e => e.text && e.text !== '__CLEAR__')
        ]);
        return results;
      },
      getState: () => state,
      getCommands: getAvailableCommands,
      getOptions: getCommandOptions
    };

    window.__console__ = api;

    return () => {
      delete window.__console__;
    };
  }, [executeCommandString, state]);

  // Keyboard shortcuts for opening/closing console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Backtick (`) or F1 to toggle console
      if (e.key === '`' || e.key === 'F1') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when console opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when history updates
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add to command history for up/down navigation
    setCommandHistory(prev => [inputValue, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    // Add input to display history
    setHistory(prev => [...prev, { type: 'input', text: inputValue }]);

    // Execute commands
    const results = executeCommandString(inputValue);

    // Process results
    for (const result of results) {
      if (result.message === '__CLEAR__') {
        setHistory([]);
      } else if (result.message) {
        setHistory(prev => [
          ...prev,
          { type: result.success ? 'output' : 'error', text: result.message }
        ]);
      }
    }

    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Up arrow - previous command
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    }
    // Down arrow - next command
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[300] animate-in slide-in-from-bottom duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Semi-transparent backdrop */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-green-900/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-green-900/30 bg-black/50">
          <div className="flex items-center gap-2 text-green-500 text-xs font-mono">
            <Terminal className="w-4 h-4" />
            <span>DEV CONSOLE</span>
            <span className="text-green-700">|</span>
            <span className="text-green-600">Press ` or F1 to toggle</span>
          </div>
          <div className="text-green-700 text-xs font-mono">
            Day {state.stats.day} | ${state.stats.cash} | Phase: {JSON.stringify(state.phase)}
          </div>
        </div>

        {/* History */}
        <div className="h-48 overflow-y-auto p-3 font-mono text-sm custom-scrollbar">
          {history.length === 0 && (
            <div className="text-green-700 italic">
              Type 'help' for available commands...
            </div>
          )}
          {history.map((entry, index) => (
            <div
              key={index}
              className={`mb-1 ${
                entry.type === 'input'
                  ? 'text-green-400'
                  : entry.type === 'error'
                    ? 'text-red-400'
                    : 'text-green-300'
              }`}
            >
              {entry.type === 'input' ? (
                <span className="flex items-start gap-1">
                  <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                  <span>{entry.text}</span>
                </span>
              ) : (
                <pre className="whitespace-pre-wrap pl-5">{entry.text}</pre>
              )}
            </div>
          ))}
          <div ref={historyEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center border-t border-green-900/30 bg-black/50">
          <span className="text-green-500 px-3 font-mono">
            <ChevronRight className="w-4 h-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-green-300 font-mono text-sm py-3 pr-4 outline-none placeholder:text-green-800"
            placeholder="Enter command..."
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
};
