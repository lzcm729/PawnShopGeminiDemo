
import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'flat';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'elevated', 
  noPadding = false,
  className, 
  ...props 
}) => {
  const baseStyles = "rounded-lg transition-all duration-300 overflow-hidden";
  
  const variants = {
    elevated: "bg-noir-200 border border-noir-300 shadow-xl",
    outlined: "bg-transparent border border-noir-400",
    flat: "bg-noir-100 border border-transparent"
  };

  return (
    <div className={cn(baseStyles, variants[variant], !noPadding && "p-4", className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3 className={cn("text-lg font-serif font-bold leading-none tracking-wide text-noir-txt-primary", className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props}>
    {children}
  </div>
);
