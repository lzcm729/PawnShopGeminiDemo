
import React, { useState } from 'react';
import { Badge } from './Badge';
import { CategoryIcon } from './CategoryIcon';
import { Item, ItemStatus } from '../../types';
import { AlertTriangle, ShieldCheck, Heart, Skull, BookOpen, ChevronDown, ChevronUp, Barcode, CalendarClock, DollarSign, LogIn, Search, FileX, ArrowRightCircle, CheckCircle2, History } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ItemCardProps {
  item: Item;
  currentDay: number;
  actions?: React.ReactNode;
  showLogs?: boolean;
}

const getLogIcon = (type: string) => {
    switch (type) {
        case 'ENTRY': return <LogIn className="w-3 h-3" />;
        case 'APPRAISAL': return <Search className="w-3 h-3" />;
        case 'FORFEIT': return <FileX className="w-3 h-3" />;
        case 'SOLD': return <DollarSign className="w-3 h-3" />;
        case 'REDEEM': return <CheckCircle2 className="w-3 h-3" />;
        case 'INFO': return <History className="w-3 h-3" />;
        default: return <BookOpen className="w-3 h-3" />;
    }
};

const getLogStyle = (type: string) => {
    switch (type) {
        case 'ENTRY': return "border-blue-500 text-blue-500 bg-blue-950/20";
        case 'APPRAISAL': return "border-amber-500 text-amber-500 bg-amber-950/20";
        case 'FORFEIT': return "border-red-500 text-red-500 bg-red-950/20";
        case 'SOLD': return "border-green-500 text-green-500 bg-green-950/20";
        case 'REDEEM': return "border-emerald-500 text-emerald-500 bg-emerald-950/20";
        default: return "border-stone-500 text-stone-500 bg-stone-900";
    }
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, currentDay, actions, showLogs = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isForfeit = item.status === ItemStatus.FORFEIT;
  const isActive = item.status === ItemStatus.ACTIVE;
  const isSold = item.status === ItemStatus.SOLD;
  const isRedeemed = item.status === ItemStatus.REDEEMED;
  
  const daysLeft = item.pawnInfo ? Math.max(0, item.pawnInfo.dueDate - currentDay) : 0;
  
  let statusColor = "bg-stone-600";
  let statusText = "UNKNOWN";
  let borderColor = "border-noir-400";

  if (isForfeit) {
    statusColor = "bg-red-600";
    statusText = "FORFEIT (OWNED)";
    borderColor = "border-red-900";
  } else if (isSold) {
    statusColor = "bg-noir-500";
    statusText = "SOLD";
    borderColor = "border-noir-500 opacity-60";
  } else if (isRedeemed) {
    statusColor = "bg-green-600";
    statusText = "REDEEMED";
    borderColor = "border-green-900";
  } else if (isActive) {
    if (daysLeft <= 1) {
        statusColor = "bg-red-500 animate-pulse";
        statusText = `CRITICAL: ${daysLeft}D`;
        borderColor = "border-red-500";
    } else if (daysLeft <= 3) {
        statusColor = "bg-amber-600";
        statusText = `WARNING: ${daysLeft}D`;
        borderColor = "border-amber-600";
    } else {
        statusColor = "bg-emerald-600";
        statusText = `ACTIVE: ${daysLeft}D`;
        borderColor = "border-emerald-900";
    }
  }

  // Logic: Show all logs if expanded, otherwise show only the last one (current status)
  // We reverse logs for display so newest is top if we want, but timeline usually goes down.
  // Let's keep chronological order (Oldest -> Newest) to tell the story.
  const logsToDisplay = item.logs || []; 

  return (
    <div className={cn("relative flex flex-col bg-noir-200 border-l-4 shadow-sm transition-all duration-300 group overflow-hidden font-mono", borderColor)}>
      
      {/* Header / ID Strip */}
      <div className="flex justify-between items-center bg-black/20 p-2 border-b border-noir-300">
          <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-noir-txt-muted opacity-50" />
              <span className="text-[10px] text-noir-txt-muted tracking-widest uppercase">ID: {item.id.slice(0, 8)}</span>
          </div>
          <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider", statusColor)}>
              {statusText}
          </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3">
        {/* Main Info */}
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0">
            <CategoryIcon category={item.category} className="text-noir-txt-secondary w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-noir-txt-primary truncate text-sm leading-tight mb-1 font-serif tracking-wide">{item.name}</h3>
            <div className="flex flex-wrap gap-1">
                {item.isFake && <span className="text-[9px] border border-red-900 text-red-500 px-1 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> FAKE</span>}
                {item.isStolen && <span className="text-[9px] border border-purple-900 text-purple-500 px-1 rounded flex items-center gap-1"><Skull className="w-3 h-3"/> ILLICIT</span>}
                {item.sentimentalValue && <span className="text-[9px] border border-rose-900 text-rose-500 px-1 rounded flex items-center gap-1"><Heart className="w-3 h-3"/> SENTIMENTAL</span>}
                {!item.isFake && !item.isStolen && item.appraised && <span className="text-[9px] border border-green-900 text-green-500 px-1 rounded flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> VERIFIED</span>}
            </div>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-px bg-noir-400 border border-noir-400 text-[10px]">
            <div className="bg-noir-200 p-1.5">
                <span className="text-noir-txt-muted block mb-0.5">CATEGORY</span>
                <span className="text-noir-txt-secondary">{item.category}</span>
            </div>
            <div className="bg-noir-200 p-1.5">
                <span className="text-noir-txt-muted block mb-0.5">CONDITION</span>
                <span className="text-noir-txt-secondary">{item.condition}</span>
            </div>
            <div className="bg-noir-200 p-1.5">
                <span className="text-noir-txt-muted block mb-0.5">PRINCIPAL</span>
                <span className="text-noir-txt-primary font-bold">${item.pawnAmount}</span>
            </div>
            <div className="bg-noir-200 p-1.5">
                <span className="text-noir-txt-muted block mb-0.5">EST. VALUE</span>
                <span className={cn("font-bold", item.appraised ? "text-green-500" : "text-noir-txt-muted")}>
                    {item.appraised || isSold || isForfeit ? `$${item.realValue}` : "???"}
                </span>
            </div>
        </div>

        {/* Due Date Indicator (Active Only) */}
        {isActive && item.pawnInfo && (
            <div className="flex items-center justify-between text-[10px] text-noir-txt-muted bg-noir-300/50 p-1.5 rounded border border-dashed border-noir-400">
                <div className="flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3" />
                    <span>DUE: DAY {item.pawnInfo.dueDate}</span>
                </div>
                {item.pawnInfo.extensionCount ? (
                    <span className="text-amber-500">Ext: {item.pawnInfo.extensionCount}</span>
                ) : null}
            </div>
        )}

        {/* Audit Timeline */}
        {showLogs && logsToDisplay.length > 0 && (
            <div className="mt-auto">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between py-1 border-b border-noir-400/50 text-[9px] uppercase font-bold text-noir-txt-muted hover:text-noir-txt-secondary transition-colors mb-2"
                >
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3"/> Life Cycle Log</span>
                    <div className="flex items-center gap-1">
                        {!isExpanded && <span className="text-[8px] bg-noir-400 px-1 rounded text-stone-300">Latest</span>}
                        {isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                    </div>
                </button>
                
                <div className={cn("relative transition-all duration-500 overflow-hidden", isExpanded ? "max-h-60" : "max-h-20")}>
                    {/* Vertical Line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-noir-400 z-0"></div>

                    <div className={cn("space-y-3 pl-1 pb-1", !isExpanded && "mask-gradient-bottom")}>
                        {(isExpanded ? logsToDisplay : logsToDisplay.slice(-1)).map((log, index) => (
                            <div key={log.id} className="relative flex items-start gap-3 text-[10px] z-10 animate-in fade-in slide-in-from-left-1 duration-300">
                                {/* Node */}
                                <div className={cn(
                                    "relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 shadow-sm",
                                    getLogStyle(log.type)
                                )}>
                                    {getLogIcon(log.type)}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 pt-0.5 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className="font-bold font-mono text-noir-txt-secondary">DAY {log.day}</span>
                                        <span className="text-[8px] uppercase tracking-wider opacity-50">{log.type}</span>
                                    </div>
                                    <p className="text-noir-txt-muted leading-relaxed break-words border-b border-dashed border-noir-400/30 pb-2">
                                        {log.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="bg-black/30 p-2 border-t border-noir-300 flex items-center justify-end gap-2">
            {actions}
        </div>
      )}
    </div>
  );
};
