
import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Copy, Check, Terminal } from 'lucide-react';
import { Button } from './ui/Button';
import { ValidationIssue, generateFixPrompt } from '../services/eventValidator';

interface ValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    issues: ValidationIssue[];
}

export const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, logs, issues }) => {
    const [copied, setCopied] = useState(false);
    
    if (!isOpen) return null;

    const isClean = logs.length === 0;

    const handleCopyFixPrompt = () => {
        const prompt = generateFixPrompt(issues);
        navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-[#0c0c0c] border border-stone-700 shadow-2xl rounded-lg flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-[#1c1917]">
                    <div className="flex items-center gap-2">
                        {isClean ? <CheckCircle className="text-green-500" /> : <AlertTriangle className="text-yellow-500" />}
                        <h2 className="text-lg font-mono font-bold text-stone-200">STORY_VALIDATOR_V2.0</h2>
                    </div>
                    <button onClick={onClose} className="text-stone-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-black custom-scrollbar">
                    {isClean ? (
                        <div className="flex flex-col items-center justify-center h-40 text-green-500">
                            <CheckCircle className="w-12 h-12 mb-4" />
                            <span className="text-xl font-bold">ALL SYSTEMS GO</span>
                            <span className="text-green-800 mt-2">No logical inconsistencies detected.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Raw Logs */}
                            <div className="space-y-2">
                                {logs.map((log, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`p-2 rounded border-l-4 ${
                                            log.startsWith('❌') 
                                                ? 'bg-red-950/30 border-red-600 text-red-400' 
                                                : 'bg-yellow-950/30 border-yellow-600 text-yellow-400'
                                        }`}
                                    >
                                        {log}
                                    </div>
                                ))}
                            </div>

                            {/* Fix Candidate Preview */}
                            {issues.length > 0 && (
                                <div className="mt-6 border-t border-stone-800 pt-4">
                                    <h3 className="text-stone-400 font-bold mb-2 flex items-center gap-2">
                                        <Terminal className="w-4 h-4" /> 
                                        GENERATED REPAIR STRATEGY
                                    </h3>
                                    <div className="bg-[#1a1a1a] p-3 rounded border border-stone-700 text-xs text-stone-500 font-mono overflow-x-auto">
                                        <div className="mb-2">Issues Detected: {issues.length}</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            {[...new Set(issues.map(i => i.type))].map(type => (
                                                <li key={type} className="text-stone-400">{type}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-800 bg-[#1c1917] flex justify-between items-center text-xs">
                    <div className="text-stone-500">
                        Errors: <span className="text-red-500 font-bold">{logs.filter(l => l.startsWith('❌')).length}</span>
                    </div>
                    
                    <div className="flex gap-3">
                        {issues.length > 0 && (
                            <Button 
                                variant="primary" 
                                onClick={handleCopyFixPrompt}
                                className={`h-9 flex items-center gap-2 border-none ${copied ? 'bg-green-600 text-white' : ''}`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? "PROMPT COPIED!" : "COPY FIX PROMPT"}
                            </Button>
                        )}
                        <Button variant="secondary" onClick={onClose} className="h-9">CLOSE</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
