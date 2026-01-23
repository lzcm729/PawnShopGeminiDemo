
import React from 'react';
import { playSfx } from '../../systems/game/audio';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  muteSound?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  muteSound = false,
  onClick,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 font-mono font-bold uppercase tracking-wider text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-pawn-accent text-black hover:bg-amber-500 shadow-[0_0_10px_rgba(217,119,6,0.3)]",
    secondary: "bg-pawn-panel border border-pawn-accent/50 text-pawn-accent hover:border-pawn-accent hover:bg-pawn-accent/10",
    danger: "bg-pawn-red/20 border border-pawn-red text-pawn-red hover:bg-pawn-red hover:text-white",
    ghost: "text-pawn-muted hover:text-pawn-text"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading && !muteSound) {
          playSfx('CLICK');
      }
      if (onClick) onClick(e);
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      onMouseEnter={() => !disabled && !isLoading && playSfx('HOVER')}
      {...props}
    >
      {isLoading ? "Thinking..." : children}
    </button>
  );
};
