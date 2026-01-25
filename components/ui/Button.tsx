
import React from 'react';
import { playSfx } from '../../systems/game/audio';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  muteSound?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  className = '', 
  disabled,
  muteSound = false,
  onClick,
  leftIcon,
  rightIcon,
  ...props 
}) => {
  
  const baseStyles = "relative inline-flex items-center justify-center font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noir-accent focus-visible:ring-offset-2 focus-visible:ring-offset-noir-100";
  
  const variants = {
    primary: "bg-noir-accent text-noir-txt-inverse shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(217,119,6,0.5)] border border-transparent",
    secondary: "bg-noir-200 border border-noir-400 text-noir-txt-secondary hover:border-noir-accent hover:text-noir-accent hover:bg-noir-300",
    outline: "bg-transparent border-2 border-noir-400 text-noir-txt-secondary hover:border-noir-txt-primary hover:text-noir-txt-primary",
    danger: "bg-red-950/30 border border-red-900 text-red-500 hover:bg-red-900/50 hover:border-red-600 hover:text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
    ghost: "text-noir-txt-muted hover:text-noir-txt-primary hover:bg-noir-200/50 border border-transparent"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs rounded-sm",
    md: "h-10 px-4 text-sm rounded",
    lg: "h-14 px-8 text-base tracking-[0.15em] rounded-md",
    icon: "h-10 w-10 p-0 rounded"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading && !muteSound) {
          playSfx('CLICK');
      }
      if (onClick) onClick(e);
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      onClick={handleClick}
      onMouseEnter={() => !disabled && !isLoading && playSfx('HOVER')}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
