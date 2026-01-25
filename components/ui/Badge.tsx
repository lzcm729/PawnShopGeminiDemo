
import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'danger' | 'success' | 'warning' | 'accent';
}

export const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-mono font-bold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-noir-400 focus:ring-offset-2";
  
  const variants = {
    default: "border-transparent bg-noir-txt-primary text-noir-100 hover:bg-noir-txt-primary/80",
    secondary: "border-transparent bg-noir-300 text-noir-txt-secondary hover:bg-noir-300/80",
    danger: "border-transparent bg-red-950 text-red-500 hover:bg-red-900/80 border border-red-900/50",
    success: "border-transparent bg-green-950 text-green-500 hover:bg-green-900/80 border border-green-900/50",
    warning: "border-transparent bg-yellow-950 text-yellow-500 hover:bg-yellow-900/80 border border-yellow-900/50",
    accent: "border-transparent bg-amber-950 text-noir-accent hover:bg-amber-900/80 border border-amber-900/50",
    outline: "text-noir-txt-primary border border-noir-400",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  );
};
