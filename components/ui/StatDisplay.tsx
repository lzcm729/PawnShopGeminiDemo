
import React from 'react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

interface StatDisplayProps {
  icon?: React.ReactNode;
  label?: string;
  value: React.ReactNode;
  variant?: 'default' | 'accent' | 'danger' | 'success';
  className?: string;
  tooltip?: React.ReactNode;
  onClick?: () => void;
}

export const StatDisplay: React.FC<StatDisplayProps> = ({ 
  icon, 
  label, 
  value, 
  variant = 'default',
  className,
  tooltip,
  onClick
}) => {
  const variants = {
    default: "bg-noir-200 border-noir-400 text-noir-txt-primary",
    accent: "bg-amber-950/20 border-amber-900/50 text-noir-accent shadow-[0_0_10px_rgba(217,119,6,0.1)]",
    danger: "bg-red-950/30 border-red-900 text-red-500",
    success: "bg-green-950/30 border-green-900/50 text-status-success"
  };

  const Component = onClick ? 'button' : 'div';

  const content = (
    <Component 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded border transition-all",
        onClick && "hover:bg-noir-300 hover:scale-105 active:scale-95 cursor-pointer",
        variants[variant],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="flex flex-col items-start leading-none">
        {label && <span className="text-[10px] font-mono uppercase text-noir-txt-muted mb-1 font-bold tracking-wider">{label}</span>}
        <span className="font-mono text-lg font-bold tracking-wide">{value}</span>
      </div>
    </Component>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{content}</Tooltip>;
  }

  return content;
};
