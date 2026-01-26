
import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { Mail, Download, Terminal, AlertCircle, File, ChevronRight, Hash } from 'lucide-react';
import { getMailTemplate } from '../systems/narrative/mailRegistry';
import { interpolateMailBody } from '../systems/narrative/mailUtils';
import { NewsCategory } from '../types';
import { playSfx } from '../systems/game/audio';
import { Modal } from './ui/Modal';
import { cn } from '../lib/utils';
import { TypewriterText } from './ui/TextEffects';

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
      playSfx('SUCCESS');
      dispatch({ type: 'CLAIM_MAIL_REWARD', payload: uniqueId });
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
    <Modal
        isOpen={state.showMail}
        onClose={() => dispatch({ type: 'TOGGLE_MAIL' })}
        title={<><Terminal className="w-5 h-5 text-green-500" /> SECURE_LINK_V1.0.4</>}
        size="xl"
        noPadding
        className="border-green-900 shadow-[0_0_50px_rgba(0,255,0,0.1)]"
    >
        <div className="flex h-[600px] bg-black font-mono text-green-500 selection:bg-green-900 selection:text-white">
            {/* Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none z-50 opacity-20"></div>

            {/* Sidebar: Message List */}
            <div className="w-1/3 border-r border-green-900/50 flex flex-col bg-black relative z-10">
                <div className="p-3 border-b border-green-900/50 bg-green-950/10 text-[10px] font-bold uppercase tracking-widest flex justify-between items-center">
                    <span>{'>'} INBOX_DIR</span>
                    <span>[{state.inbox.length}]</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {state.inbox.length === 0 ? (
                        <div className="p-4 text-green-900 text-xs text-center mt-10">
                            {'>'} NO_DATA_FOUND_
                        </div>
                    ) : (
                        state.inbox.map(mail => {
                            const tpl = getMailTemplate(mail.templateId);
                            if (!tpl) return null;
                            const isSelected = selectedMailId === mail.uniqueId;
                            
                            return (
                                <button 
                                    key={mail.uniqueId}
                                    onClick={() => handleSelectMail(mail.uniqueId)}
                                    className={cn(
                                        "w-full text-left p-3 border-b border-green-900/30 transition-all relative group hover:bg-green-900/20",
                                        isSelected ? "bg-green-900/30 text-green-400" : "text-green-700"
                                    )}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 animate-pulse"></div>}
                                    
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={cn("text-xs font-bold uppercase truncate max-w-[70%]", !mail.isRead && "animate-pulse text-green-400")}>
                                            {!mail.isRead ? "> NEW " : ""}{tpl.sender}
                                        </span>
                                        <span className="text-[9px] opacity-60">D:{mail.arrivalDay}</span>
                                    </div>
                                    <div className="text-[10px] truncate opacity-80 pl-2">
                                        {tpl.subject}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Content Area: Reader */}
            <div className="w-2/3 flex flex-col bg-black p-6 relative z-10 overflow-hidden">
                 {selectedTemplate && selectedMailInstance ? (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-2 duration-300">
                        {/* Header Block */}
                        <div className="border border-green-800 p-2 mb-4 text-xs space-y-1 bg-green-950/10">
                            <div className="flex">
                                <span className="w-24 opacity-50 uppercase">FROM:</span>
                                <span className="font-bold">{selectedTemplate.sender}</span>
                            </div>
                            <div className="flex">
                                <span className="w-24 opacity-50 uppercase">SUBJECT:</span>
                                <span className="font-bold text-green-400">{selectedTemplate.subject}</span>
                            </div>
                            <div className="flex">
                                <span className="w-24 opacity-50 uppercase">DATE:</span>
                                <span>CYCLE {selectedMailInstance.arrivalDay}</span>
                            </div>
                            {selectedMailInstance.metadata?.relatedItemName && (
                                <div className="flex border-t border-green-900 mt-1 pt-1 text-green-600">
                                    <span className="w-24 opacity-50 uppercase">REF_ID:</span>
                                    <span>{selectedMailInstance.metadata.relatedItemName}</span>
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 text-sm text-green-600 font-mono">
                            <TypewriterText text={displayBody} speed={10} />
                        </div>

                        {/* Attachments Footer */}
                        {selectedTemplate.attachments && (
                            <div className="mt-6 border-t-2 border-dashed border-green-900 pt-4">
                                <div className="text-[10px] opacity-50 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Hash className="w-3 h-3" /> ATTACHED_BINARY_DATA
                                </div>

                                {selectedMailInstance.isClaimed ? (
                                    <div className="flex items-center gap-2 text-green-800 text-xs py-2 border border-green-900/30 bg-green-950/5 px-3">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>[STATUS: EXTRACTED]</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-green-900/10 border border-green-700 p-2 hover:bg-green-900/20 transition-colors">
                                        <div className="text-green-400 text-xs font-bold flex items-center gap-3">
                                            <File className="w-5 h-5" />
                                            <div className="flex flex-col">
                                                <span>ENCRYPTED_ASSET.DAT</span>
                                                <span className="text-[9px] opacity-70 font-normal">
                                                    Contains: {selectedTemplate.attachments.cash ? `${selectedTemplate.attachments.cash} CR` : ''} 
                                                    {selectedTemplate.attachments.item ? ` + ITEM_OBJ` : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleClaim(selectedMailInstance.uniqueId)}
                                            className="text-[10px] font-bold bg-green-700 text-black px-3 py-1 hover:bg-green-600 flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> DECRYPT
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-green-900">
                        <Mail className="w-24 h-24 mb-4 opacity-20 animate-pulse" />
                        <p className="text-xs uppercase tracking-[0.2em]">AWAITING_INPUT...</p>
                    </div>
                 )}
            </div>
        </div>
    </Modal>
  );
};
