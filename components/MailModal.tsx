
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { X, Mail, Download, FileText, Terminal, Minimize2, AlertCircle } from 'lucide-react';
import { getMailTemplate } from '../systems/narrative/mailRegistry';
import { interpolateMailBody } from '../systems/narrative/mailUtils';
import { NewsCategory } from '../types';
import { playSfx } from '../systems/game/audio';

export const MailModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

  if (!state.showMail) return null;

  const handleSelectMail = (uniqueId: string) => {
      playSfx('CLICK');
      setSelectedMailId(uniqueId);
      dispatch({ type: 'READ_MAIL', payload: uniqueId });
  };

  const handleClaim = (uniqueId: string) => {
      playSfx('CLICK');
      dispatch({ type: 'CLAIM_MAIL_REWARD', payload: uniqueId });
  };

  const closeMail = () => {
      playSfx('CLICK');
      dispatch({ type: 'TOGGLE_MAIL' });
  };

  const selectedMailInstance = selectedMailId ? state.inbox.find(m => m.uniqueId === selectedMailId) : null;
  const selectedTemplate = selectedMailInstance ? getMailTemplate(selectedMailInstance.templateId) : null;
  
  const narrativeNews = state.dailyNews.find(n => n.category === NewsCategory.NARRATIVE) || state.dailyNews[0];

  const displayBody = selectedTemplate && selectedMailInstance 
      ? interpolateMailBody(selectedTemplate.body, { 
          ...selectedMailInstance.metadata || {},
          recentNews: narrativeNews ? { headline: narrativeNews.headline, body: narrativeNews.body } : undefined
      }) 
      : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-5xl h-[85vh] bg-[#0c0c0c] border-2 border-stone-600 shadow-[0_0_40px_rgba(16,185,129,0.1)] flex flex-col relative overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-8 bg-stone-800 border-b border-stone-600 flex justify-between items-center px-2 select-none">
            <div className="flex items-center gap-2 text-stone-300 text-xs font-bold tracking-widest">
                <Terminal className="w-4 h-4 text-green-600" />
                <span>MAIL_CLIENT_V1.0.EXE</span>
            </div>
            <div className="flex gap-1">
                <button onClick={closeMail} className="w-5 h-5 bg-stone-700 hover:bg-stone-600 flex items-center justify-center border border-stone-500 text-stone-300">
                    <Minimize2 className="w-3 h-3" />
                </button>
                <button onClick={closeMail} className="w-5 h-5 bg-stone-700 hover:bg-red-900 flex items-center justify-center border border-stone-500 text-stone-300">
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-black relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none z-20 opacity-50"></div>

            <div className="w-1/3 border-r-2 border-stone-800 flex flex-col bg-[#050505]">
                <div className="p-2 border-b-2 border-stone-800 bg-stone-900/50 text-green-600 text-xs font-bold uppercase tracking-widest mb-1 flex justify-between">
                    <span>Inbox</span>
                    <span>[{state.inbox.length}]</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {state.inbox.length === 0 ? (
                        <div className="p-4 text-stone-600 text-xs text-center font-mono mt-10">
                            NO MESSAGES FOUND...
                        </div>
                    ) : (
                        state.inbox.map(mail => {
                            const tpl = getMailTemplate(mail.templateId);
                            if (!tpl) return null;
                            const isSelected = selectedMailId === mail.uniqueId;
                            
                            return (
                                <div 
                                    key={mail.uniqueId}
                                    onClick={() => handleSelectMail(mail.uniqueId)}
                                    className={`
                                        group p-3 border-b border-stone-900 cursor-pointer transition-all relative
                                        ${isSelected ? 'bg-green-900/20' : 'hover:bg-stone-900'}
                                    `}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
                                    
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={`text-xs font-bold uppercase truncate ${!mail.isRead ? 'text-green-400' : 'text-stone-500'}`}>
                                            {!mail.isRead && <span className="mr-1 animate-pulse">*</span>}
                                            {tpl.sender}
                                        </span>
                                        <span className="text-[10px] text-stone-600">DAY {mail.arrivalDay}</span>
                                    </div>
                                    <div className={`text-xs truncate ${isSelected ? 'text-stone-300' : 'text-stone-600 group-hover:text-stone-400'}`}>
                                        {tpl.subject}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="w-2/3 flex flex-col bg-black p-6 relative">
                 {selectedTemplate && selectedMailInstance ? (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="border-b-2 border-green-900/50 pb-4 mb-4 space-y-1">
                            <div className="flex items-baseline gap-4 text-sm font-mono text-green-600">
                                <span className="w-16 text-stone-500 text-xs uppercase">From:</span>
                                <span className="font-bold">{selectedTemplate.sender}</span>
                            </div>
                             <div className="flex items-baseline gap-4 text-sm font-mono text-green-600">
                                <span className="w-16 text-stone-500 text-xs uppercase">Subject:</span>
                                <span className="text-white">{selectedTemplate.subject}</span>
                            </div>
                             <div className="flex items-baseline gap-4 text-sm font-mono text-green-600">
                                <span className="w-16 text-stone-500 text-xs uppercase">Date:</span>
                                <span>Cycle {selectedMailInstance.arrivalDay}</span>
                            </div>
                        </div>

                        {selectedMailInstance.metadata?.relatedItemName && (
                            <div className="mb-4 px-3 py-2 bg-stone-900/80 border border-stone-700 rounded flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-pawn-accent shrink-0 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">System Context</span>
                                    <span className="text-sm text-stone-300">涉及物品: <span className="font-bold text-white">{selectedMailInstance.metadata.relatedItemName}</span></span>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar-light pr-4 text-stone-300 whitespace-pre-line leading-relaxed text-sm font-mono">
                            {displayBody}
                        </div>

                        {selectedTemplate.attachments && (
                            <div className="mt-6 border border-dashed border-stone-700 bg-stone-900/30 p-4 relative">
                                <div className="absolute -top-2 left-4 bg-black px-2 text-[10px] text-stone-500 uppercase tracking-widest">
                                    Attachment Protocol
                                </div>

                                {selectedMailInstance.isClaimed ? (
                                    <div className="flex items-center justify-center gap-2 text-stone-600 text-xs py-2">
                                        <Download className="w-4 h-4" />
                                        <span>RESOURCES_EXTRACTED.DAT</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="text-green-500 text-xs font-bold flex items-center gap-3">
                                            <FileText className="w-5 h-5" />
                                            <div className="flex flex-col">
                                                <span>ENCRYPTED_ASSET_PACK</span>
                                                <span className="text-[10px] text-stone-500 font-normal">
                                                    Contains: {selectedTemplate.attachments.cash ? `$${selectedTemplate.attachments.cash} CREDITS` : ''} 
                                                    {selectedTemplate.attachments.item ? ` + ITEM` : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleClaim(selectedMailInstance.uniqueId)}
                                            className="px-4 py-2 bg-green-900/20 border border-green-700 hover:bg-green-900/40 text-green-500 text-xs uppercase font-bold tracking-wider hover:shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            [ CLAIM_ASSETS ]
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-stone-800 font-mono">
                        <Mail className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-xs uppercase tracking-widest">Select a frequency to decrypt</p>
                    </div>
                 )}
            </div>
        </div>
        
        <div className="h-6 bg-stone-800 border-t border-stone-600 flex items-center px-2 text-[10px] font-mono text-stone-400 gap-4">
            <span className="text-green-600">ONLINE</span>
            <span>SECURE_CONNECTION</span>
            <span className="ml-auto">MEM: 64KB OK</span>
        </div>
      </div>
    </div>
  );
};
