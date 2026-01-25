
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from './Card';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  noPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen = true, 
  onClose, 
  title, 
  children, 
  className,
  size = 'lg',
  noPadding = false
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw] h-[90vh]"
  };

  const content = (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <Card 
        className={cn(
          "w-full relative z-10 flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-noir-400", 
          sizeClasses[size],
          className
        )}
        variant="elevated"
        noPadding={true}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="bg-noir-200 border-b border-noir-400 py-4 flex flex-row items-center justify-between shrink-0">
          <CardTitle className="flex items-center gap-2 text-noir-accent">
            {title}
          </CardTitle>
          <button 
            onClick={onClose}
            className="text-noir-txt-muted hover:text-noir-txt-primary transition-colors p-1 rounded-sm hover:bg-noir-300"
          >
            <X className="w-6 h-6" />
          </button>
        </CardHeader>
        
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar bg-noir-100/50", !noPadding && "p-6")}>
          {children}
        </div>
      </Card>
    </div>
  );

  return createPortal(content, document.body);
};
