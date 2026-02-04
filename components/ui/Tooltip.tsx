
import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}

/**
 * HelpTooltip - 帮助提示组件
 * 用于在 Modal 标题旁显示问号图标，hover 时显示系统说明
 */
export const HelpTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative group/help ml-1.5 inline-flex">
    <HelpCircle className="w-4 h-4 text-stone-500 hover:text-stone-400 cursor-help transition-colors" />
    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-2.5 bg-noir-100 border border-noir-400 rounded shadow-lg text-[11px] text-stone-300 font-normal leading-relaxed opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all z-50 pointer-events-none whitespace-normal">
      {text}
    </span>
  </span>
);

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] text-noir-txt-inverse bg-noir-txt-primary rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-200">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-noir-txt-primary"></div>
        </div>
      )}
    </div>
  );
};
