import React from 'react';
import { Sparkles } from 'lucide-react';

interface MonologueOverlayProps {
  text: string;
  onDismiss: () => void;
}

export const MonologueOverlay: React.FC<MonologueOverlayProps> = ({ text, onDismiss }) => (
  <div
    onClick={onDismiss}
    className="bg-gradient-to-r from-amber-950/50 to-purple-950/50 border border-amber-700/40 rounded-lg p-6 cursor-pointer hover:bg-amber-950/60 transition-colors"
  >
    <div className="flex items-start gap-4">
      <Sparkles className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
      <div>
        <div className="text-[10px] uppercase text-amber-400/70 tracking-wider mb-2">领悟</div>
        <p className="text-stone-200 italic leading-relaxed">{text}</p>
        <p className="text-[10px] text-stone-500 mt-3">点击关闭</p>
      </div>
    </div>
  </div>
);
