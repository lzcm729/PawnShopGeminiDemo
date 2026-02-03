
import React from 'react';
import { Modal } from './Modal';
import { Item, ItemStatus } from '../../types';
import { CategoryIcon } from './CategoryIcon';
import {
    AlertTriangle,
    ShieldCheck,
    Heart,
    Skull,
    BookOpen,
    Barcode,
    CalendarClock,
    LogIn,
    Search,
    FileX,
    DollarSign,
    CheckCircle2,
    History,
    Hammer,
    Wrench,
    Package,
    Tag,
    FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getDisplayName } from '../../systems/items/tagUtils';
import { getItemIcon } from '../../systems/assets';

interface ItemDetailModalProps {
    item: Item;
    currentDay: number;
    isOpen: boolean;
    onClose: () => void;
}

const getLogIcon = (type: string) => {
    switch (type) {
        case 'ENTRY': return <LogIn className="w-4 h-4" />;
        case 'APPRAISAL': return <Search className="w-4 h-4" />;
        case 'FORFEIT': return <FileX className="w-4 h-4" />;
        case 'SOLD': return <DollarSign className="w-4 h-4" />;
        case 'REDEEM': return <CheckCircle2 className="w-4 h-4" />;
        case 'INFO': return <History className="w-4 h-4" />;
        default: return <BookOpen className="w-4 h-4" />;
    }
};

const getLogStyle = (type: string) => {
    switch (type) {
        case 'ENTRY': return "border-blue-500 text-blue-400 bg-blue-950/30";
        case 'APPRAISAL': return "border-amber-500 text-amber-400 bg-amber-950/30";
        case 'FORFEIT': return "border-red-500 text-red-400 bg-red-950/30";
        case 'SOLD': return "border-green-500 text-green-400 bg-green-950/30";
        case 'REDEEM': return "border-emerald-500 text-emerald-400 bg-emerald-950/30";
        case 'INFO': return "border-purple-500 text-purple-400 bg-purple-950/30";
        default: return "border-stone-500 text-stone-400 bg-stone-900/30";
    }
};

const getLogTypeName = (type: string) => {
    switch (type) {
        case 'ENTRY': return '入库';
        case 'APPRAISAL': return '鉴定';
        case 'FORFEIT': return '绝当';
        case 'SOLD': return '售出';
        case 'REDEEM': return '赎回';
        case 'INFO': return '记录';
        default: return type;
    }
};

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    currentDay,
    isOpen,
    onClose
}) => {
    const isForfeit = item.status === ItemStatus.FORFEIT;
    const isActive = item.status === ItemStatus.ACTIVE;
    const isSold = item.status === ItemStatus.SOLD;
    const isRedeemed = item.status === ItemStatus.REDEEMED;
    const isReforged = item.wasReforged === true;
    const isRestored = item.wasRestored === true;

    const daysLeft = item.pawnInfo ? Math.max(0, item.pawnInfo.dueDate - currentDay) : 0;

    // Status display
    let statusColor = "bg-stone-600";
    let statusText = "UNKNOWN";

    if (isReforged && isActive) {
        statusColor = "bg-purple-600";
        statusText = "REFORGED (OWNED)";
    } else if (isForfeit) {
        statusColor = "bg-red-600";
        statusText = "FORFEIT (OWNED)";
    } else if (isSold) {
        statusColor = "bg-noir-500";
        statusText = "SOLD";
    } else if (isRedeemed) {
        statusColor = "bg-green-600";
        statusText = "REDEEMED";
    } else if (isActive) {
        if (daysLeft <= 1) {
            statusColor = "bg-red-500";
            statusText = `CRITICAL: ${daysLeft}D`;
        } else if (daysLeft <= 3) {
            statusColor = "bg-amber-600";
            statusText = `WARNING: ${daysLeft}D`;
        } else {
            statusColor = "bg-emerald-600";
            statusText = `ACTIVE: ${daysLeft}D`;
        }
    }

    // Work state display
    const getWorkStateInfo = () => {
        if (isReforged) {
            return { label: '已重铸', color: 'text-purple-400', icon: Wrench };
        }
        if (isRestored) {
            return { label: '已修复', color: 'text-emerald-400', icon: Hammer };
        }
        return null;
    };

    const workStateInfo = getWorkStateInfo();

    const logs = item.logs || [];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <span className="font-mono tracking-widest flex items-center gap-2">
                    <FileText className="w-5 h-5" /> ITEM_DETAIL_LOG
                </span>
            }
            size="lg"
        >
            <div className="flex flex-col gap-6 font-mono">
                {/* Header Section - Item Overview */}
                <div className="flex gap-4 bg-noir-200 p-4 rounded border border-noir-400">
                    {/* Item Image */}
                    <div className="w-24 h-24 bg-noir-300 border border-noir-400 flex items-center justify-center shrink-0 overflow-hidden rounded">
                        <img
                            src={getItemIcon(item)}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                        />
                        <div className="hidden items-center justify-center w-full h-full">
                            <CategoryIcon category={item.category} className="text-noir-txt-secondary w-10 h-10" />
                        </div>
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h2 className="font-bold text-noir-txt-primary text-lg font-serif tracking-wide">
                                {getDisplayName(item)}
                            </h2>
                            <div className={cn("text-xs font-bold px-2 py-1 rounded text-white tracking-wider shrink-0", statusColor)}>
                                {statusText}
                            </div>
                        </div>

                        {/* ID */}
                        <div className="flex items-center gap-2 text-xs text-noir-txt-muted mb-2">
                            <Barcode className="w-3 h-3" />
                            <span>ID: {item.id}</span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                            {item.isFake && (
                                <span className="text-xs border border-red-900 text-red-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> FAKE
                                </span>
                            )}
                            {item.isStolen && (
                                <span className="text-xs border border-purple-900 text-purple-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Skull className="w-3 h-3" /> ILLICIT
                                </span>
                            )}
                            {item.sentimentalValue && (
                                <span className="text-xs border border-rose-900 text-rose-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Heart className="w-3 h-3" /> SENTIMENTAL
                                </span>
                            )}
                            {!item.isFake && !item.isStolen && item.appraised && (
                                <span className="text-xs border border-green-900 text-green-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                                </span>
                            )}
                            {workStateInfo && (
                                <span className={cn("text-xs border border-noir-400 px-1.5 py-0.5 rounded flex items-center gap-1", workStateInfo.color)}>
                                    <workStateInfo.icon className="w-3 h-3" /> {workStateInfo.label}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-noir-200 border border-noir-400 p-3 rounded">
                        <div className="text-xs text-noir-txt-muted mb-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> CATEGORY
                        </div>
                        <div className="text-sm text-noir-txt-primary">{item.category}</div>
                    </div>
                    <div className="bg-noir-200 border border-noir-400 p-3 rounded">
                        <div className="text-xs text-noir-txt-muted mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> CONDITION
                        </div>
                        <div className="text-sm text-noir-txt-primary">{item.condition}</div>
                    </div>
                    <div className="bg-noir-200 border border-noir-400 p-3 rounded">
                        <div className="text-xs text-noir-txt-muted mb-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> PRINCIPAL
                        </div>
                        <div className="text-sm text-noir-txt-primary font-bold">${item.pawnAmount}</div>
                    </div>
                    <div className="bg-noir-200 border border-noir-400 p-3 rounded">
                        <div className="text-xs text-noir-txt-muted mb-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> REAL VALUE
                        </div>
                        <div className={cn("text-sm font-bold", item.appraised || isSold || isForfeit ? "text-green-500" : "text-noir-txt-muted")}>
                            {item.appraised || isSold || isForfeit ? `$${item.realValue}` : "???"}
                        </div>
                    </div>
                </div>

                {/* Pawn Contract Info */}
                {item.pawnInfo && (
                    <div className="bg-noir-200 border border-noir-400 p-4 rounded">
                        <h3 className="text-sm font-bold text-noir-txt-secondary mb-3 flex items-center gap-2">
                            <CalendarClock className="w-4 h-4" /> CONTRACT DETAILS
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span className="text-noir-txt-muted block">Start Date</span>
                                <span className="text-noir-txt-primary">DAY {item.pawnInfo.startDate}</span>
                            </div>
                            <div>
                                <span className="text-noir-txt-muted block">Due Date</span>
                                <span className="text-noir-txt-primary">DAY {item.pawnInfo.dueDate}</span>
                            </div>
                            <div>
                                <span className="text-noir-txt-muted block">Interest Rate</span>
                                <span className="text-noir-txt-primary">{(item.pawnInfo.interestRate * 100).toFixed(0)}%</span>
                            </div>
                            <div>
                                <span className="text-noir-txt-muted block">Extensions</span>
                                <span className={cn("text-noir-txt-primary", (item.pawnInfo.extensionCount || 0) > 0 && "text-amber-500")}>
                                    {item.pawnInfo.extensionCount || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Revealed Traits */}
                {item.revealedTraits && item.revealedTraits.length > 0 && (
                    <div className="bg-noir-200 border border-noir-400 p-4 rounded">
                        <h3 className="text-sm font-bold text-noir-txt-secondary mb-3 flex items-center gap-2">
                            <Search className="w-4 h-4" /> DISCOVERED TRAITS
                        </h3>
                        <div className="space-y-2">
                            {item.revealedTraits.map((trait, index) => (
                                <div
                                    key={trait.id || index}
                                    className={cn(
                                        "p-2 rounded border text-xs",
                                        trait.type === 'FLAW' && "border-red-900/50 bg-red-950/20",
                                        trait.type === 'STORY' && "border-blue-900/50 bg-blue-950/20",
                                        trait.type === 'FAKE' && "border-purple-900/50 bg-purple-950/20"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn(
                                            "font-bold",
                                            trait.type === 'FLAW' && "text-red-400",
                                            trait.type === 'STORY' && "text-blue-400",
                                            trait.type === 'FAKE' && "text-purple-400"
                                        )}>
                                            {trait.name}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded",
                                            trait.type === 'FLAW' && "bg-red-900/50 text-red-400",
                                            trait.type === 'STORY' && "bg-blue-900/50 text-blue-400",
                                            trait.type === 'FAKE' && "bg-purple-900/50 text-purple-400"
                                        )}>
                                            {trait.type}
                                        </span>
                                    </div>
                                    <p className="text-noir-txt-muted">{trait.description}</p>
                                    {trait.valueImpact !== 0 && (
                                        <div className={cn(
                                            "mt-1 text-[10px]",
                                            trait.valueImpact > 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            Value Impact: {trait.valueImpact > 0 ? '+' : ''}{(trait.valueImpact * 100).toFixed(0)}%
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Life Cycle Log - Full History */}
                <div className="bg-noir-200 border border-noir-400 p-4 rounded">
                    <h3 className="text-sm font-bold text-noir-txt-secondary mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> LIFE CYCLE LOG
                    </h3>

                    {logs.length === 0 ? (
                        <div className="text-center text-noir-txt-muted py-8">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No log entries found</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Vertical Timeline Line */}
                            <div className="absolute left-4 top-3 bottom-3 w-px bg-noir-400"></div>

                            <div className="space-y-4">
                                {logs.map((log, index) => (
                                    <div
                                        key={log.id || index}
                                        className="relative flex items-start gap-4 pl-2"
                                    >
                                        {/* Timeline Node */}
                                        <div className={cn(
                                            "relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 shadow-md",
                                            getLogStyle(log.type)
                                        )}>
                                            {getLogIcon(log.type)}
                                        </div>

                                        {/* Log Content */}
                                        <div className="flex-1 min-w-0 pb-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-noir-txt-primary">
                                                        DAY {log.day}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                        getLogStyle(log.type)
                                                    )}>
                                                        {getLogTypeName(log.type)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-noir-txt-secondary leading-relaxed">
                                                {log.content}
                                            </p>
                                            {/* Metadata */}
                                            {log.metadata && (
                                                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-noir-txt-muted">
                                                    {log.metadata.payment !== undefined && (
                                                        <span>Payment: ${log.metadata.payment}</span>
                                                    )}
                                                    {log.metadata.amount !== undefined && (
                                                        <span>Amount: ${log.metadata.amount}</span>
                                                    )}
                                                    {log.metadata.reason && (
                                                        <span>Reason: {log.metadata.reason}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Visual Description (if available) */}
                {item.visualDescription && (
                    <div className="bg-noir-200 border border-noir-400 p-4 rounded">
                        <h3 className="text-sm font-bold text-noir-txt-secondary mb-2">DESCRIPTION</h3>
                        <p className="text-xs text-noir-txt-muted leading-relaxed">
                            {item.visualDescription}
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};
