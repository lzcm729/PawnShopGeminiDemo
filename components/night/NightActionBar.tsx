
import React from 'react';
import { cn } from '../../lib/utils';
import { Mail, Package, Calendar, Eye, Wrench, Store, ClipboardList, ToggleRight, Lock, Briefcase, Skull, Sparkles, AlertCircle } from 'lucide-react';
import { playSfx } from '../../systems/game/audio';

interface NightActionBarProps {
    // Counts & status
    unreadMail: number;
    activeItems: number;

    // Upgrade states
    hasBoardUnlocked: boolean;
    boardLevel: number;
    appointedCount: number;
    hasCounterFacilities: boolean;
    maintenanceCost: number;
    hasWorkshop: boolean;
    workshopLevel: number;
    hasBlackMarket: boolean;
    blackMarketLevel: number;
    storageLevel: number;
    currentCapacity: number;
    currentEnergy: number;

    // Unseen forfeit notification
    unseenForfeitItemIds: string[];

    // Night energy
    nightEnergy: number;
    maxNightEnergy: number;

    // Black market state
    blackmarketHeatLevel: string;
    isBlackmarketLocked: boolean;
    hasRiskEvent: boolean;
    forfeitItems: number;

    // Handlers
    dispatch: React.Dispatch<any>;
    onShowAppointmentBoard: () => void;
    onShowBlackmarket: () => void;
}

export const NightActionBar: React.FC<NightActionBarProps> = ({
    unreadMail,
    activeItems,
    hasBoardUnlocked,
    boardLevel,
    appointedCount,
    hasCounterFacilities,
    maintenanceCost,
    hasWorkshop,
    workshopLevel,
    hasBlackMarket,
    blackMarketLevel,
    storageLevel,
    currentCapacity,
    currentEnergy,
    unseenForfeitItemIds,
    nightEnergy,
    maxNightEnergy,
    blackmarketHeatLevel,
    isBlackmarketLocked,
    hasRiskEvent,
    forfeitItems,
    dispatch,
    onShowAppointmentBoard,
    onShowBlackmarket,
}) => {
    return (
        <div className="flex flex-col gap-4">

            {/* ── INFORMATION ── */}
            <div>
                <div className="text-[9px] uppercase tracking-widest text-stone-600 mb-2 px-1">Information</div>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_MAIL' })}
                        className={cn(
                            "h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                            unreadMail > 0 && "border-green-900/50"
                        )}
                    >
                        {unreadMail > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                        <Mail className={cn("w-8 h-8 group-hover:scale-110 transition-transform", unreadMail > 0 ? "text-green-500" : "text-stone-500")} />
                        <span className="text-xs uppercase tracking-widest group-hover:text-white">
                            Mail Terminal {unreadMail > 0 && `(${unreadMail})`}
                        </span>
                    </button>

                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_FINANCIALS' })}
                        className="h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                    >
                        <Calendar className="w-8 h-8 text-stone-500 group-hover:text-stone-300 group-hover:scale-110 transition-transform" />
                        <span className="text-xs uppercase tracking-widest group-hover:text-white">
                            Financials
                        </span>
                    </button>

                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
                        className="h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group relative"
                    >
                        {unseenForfeitItemIds.length > 0 && (
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        )}
                        <Package className="w-8 h-8 text-stone-500 group-hover:text-stone-300 group-hover:scale-110 transition-transform" />
                        <span className="text-xs uppercase tracking-widest group-hover:text-white">
                            Vault ({activeItems})
                        </span>
                        {storageLevel > 0 && (
                            <span className="text-[9px] text-stone-500 mt-0.5">
                                储物架 Lv{storageLevel} | {currentCapacity}位
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── NIGHT ACTIONS ── */}
            <div>
                <div className="flex items-center gap-3 mb-2 px-1">
                    <span className="text-[9px] uppercase tracking-widest text-stone-600">Night Actions</span>
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: maxNightEnergy }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-2.5 h-2.5 rounded-sm transition-all duration-300",
                                    i < nightEnergy
                                        ? "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]"
                                        : "bg-stone-800 border border-stone-700"
                                )}
                            />
                        ))}
                        <span className="text-[9px] text-purple-400/70 ml-1 font-mono">{nightEnergy}/{maxNightEnergy}</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {/* Insight / 格物 Button */}
                    <button
                        onClick={() => { playSfx('CLICK'); dispatch({ type: 'TOGGLE_INSIGHT' }); }}
                        className="h-32 border border-purple-900 bg-stone-900/50 hover:bg-purple-950/50 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                    >
                        <Eye className="w-8 h-8 text-purple-500 group-hover:text-purple-300 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                格物 (Insight)
                            </span>
                            <span className="text-[9px] text-purple-500/70 mt-1">
                                研究物品获取精魄
                            </span>
                        </div>
                    </button>

                    {/* Cultivation / 修行 Button */}
                    <button
                        onClick={() => { playSfx('CLICK'); dispatch({ type: 'TOGGLE_ABILITY_PANEL' }); }}
                        className="h-32 border border-amber-900 bg-stone-900/50 hover:bg-amber-950/50 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                    >
                        <Sparkles className="w-8 h-8 text-amber-500 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                修行 (Cultivation)
                            </span>
                            <span className="text-[9px] text-amber-500/70 mt-1">
                                学习技能提升能力
                            </span>
                        </div>
                    </button>

                    {/* Workshop / 工作台 Button (locked if not unlocked) */}
                    <button
                        onClick={() => {
                            if (hasWorkshop) {
                                playSfx('CLICK');
                                dispatch({ type: 'TOGGLE_WORKSHOP' });
                            }
                        }}
                        disabled={!hasWorkshop}
                        className={cn(
                            "h-32 border bg-stone-900/50 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                            hasWorkshop
                                ? "border-amber-900 hover:bg-amber-950/50 cursor-pointer"
                                : "border-stone-700/50 cursor-default hover:border-amber-900/50"
                        )}
                    >
                        {/* Locked state overlay */}
                        {!hasWorkshop && (
                            <>
                                {/* Diagonal stripes pattern */}
                                <div
                                    className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)'
                                    }}
                                />
                                {/* Central lock overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Lock className="w-6 h-6 text-amber-500/70 mb-2" />
                                    <span className="text-[10px] text-amber-400/80 font-medium">需要「工坊扩建」升级</span>
                                </div>
                            </>
                        )}
                        <Wrench className={cn(
                            "w-8 h-8 transition-transform",
                            hasWorkshop
                                ? "text-amber-500 group-hover:text-amber-300 group-hover:scale-110"
                                : "text-amber-900/50"
                        )} />
                        <div className="flex flex-col items-center">
                            <span className={cn(
                                "text-xs uppercase tracking-widest",
                                hasWorkshop ? "group-hover:text-white" : "text-stone-600"
                            )}>
                                工作台 (Workshop)
                            </span>
                            <span className={cn(
                                "text-[9px] mt-1 flex items-center gap-1",
                                hasWorkshop ? "text-amber-500/70" : "text-stone-600"
                            )}>
                                {!hasWorkshop
                                    ? <><Lock className="w-3 h-3" /> 未解锁</>
                                    : `工坊 Lv${workshopLevel}`}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── SHOP MANAGEMENT ── */}
            <div>
                <div className="text-[9px] uppercase tracking-widest text-stone-600 mb-2 px-1">Shop Management</div>
                <div className="grid grid-cols-3 gap-3">
                    {/* Appointment Board Button (always visible, locked if not unlocked) */}
                    <button
                        onClick={() => {
                            if (hasBoardUnlocked) {
                                playSfx('CLICK');
                                onShowAppointmentBoard();
                            }
                        }}
                        disabled={!hasBoardUnlocked}
                        className={cn(
                            "h-32 border bg-stone-900/50 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                            hasBoardUnlocked
                                ? cn(
                                    "hover:bg-teal-950/50 cursor-pointer",
                                    appointedCount > 0 ? "border-teal-500" : "border-teal-900"
                                  )
                                : "border-stone-700/50 cursor-default hover:border-teal-900/50"
                        )}
                    >
                        {/* Locked state overlay */}
                        {!hasBoardUnlocked && (
                            <>
                                {/* Diagonal stripes pattern */}
                                <div
                                    className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)'
                                    }}
                                />
                                {/* Central lock overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Lock className="w-6 h-6 text-teal-500/70 mb-2" />
                                    <span className="text-[10px] text-teal-400/80 font-medium">需要「预约板」升级</span>
                                </div>
                            </>
                        )}
                        {hasBoardUnlocked && appointedCount > 0 && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">{appointedCount}</span>
                            </div>
                        )}
                        <ClipboardList className={cn(
                            "w-8 h-8 transition-transform",
                            hasBoardUnlocked
                                ? "text-teal-500 group-hover:text-teal-300 group-hover:scale-110"
                                : "text-teal-900/50"
                        )} />
                        <div className="flex flex-col items-center">
                            <span className={cn(
                                "text-xs uppercase tracking-widest",
                                hasBoardUnlocked ? "group-hover:text-white" : "text-stone-600"
                            )}>
                                Appointments {hasBoardUnlocked ? `(Lv${boardLevel})` : ''}
                            </span>
                            <span className={cn(
                                "text-[9px] mt-1 flex items-center gap-1",
                                hasBoardUnlocked ? "text-teal-500/70" : "text-stone-600"
                            )}>
                                {!hasBoardUnlocked
                                    ? <><Lock className="w-3 h-3" /> 未解锁</>
                                    : appointedCount > 0
                                        ? `${appointedCount} customer(s) invited`
                                        : 'Preview & invite customers'}
                            </span>
                        </div>
                    </button>

                    {/* Facility Control Button (always visible, locked if no counter facilities) */}
                    <button
                        onClick={() => {
                            if (hasCounterFacilities) {
                                dispatch({ type: 'TOGGLE_FACILITY_CONTROL' });
                            }
                        }}
                        disabled={!hasCounterFacilities}
                        className={cn(
                            "h-32 border bg-stone-900/50 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                            hasCounterFacilities
                                ? cn(
                                    "hover:bg-blue-950/50 cursor-pointer",
                                    maintenanceCost > 0 ? "border-blue-500" : "border-blue-900"
                                  )
                                : "border-stone-700/50 cursor-default hover:border-blue-900/50"
                        )}
                    >
                        {/* Locked state overlay */}
                        {!hasCounterFacilities && (
                            <>
                                {/* Diagonal stripes pattern */}
                                <div
                                    className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)'
                                    }}
                                />
                                {/* Central lock overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Lock className="w-6 h-6 text-blue-500/70 mb-2" />
                                    <span className="text-[10px] text-blue-400/80 font-medium">需要柜台设施升级</span>
                                </div>
                            </>
                        )}
                        {hasCounterFacilities && maintenanceCost > 0 && (
                            <div className="absolute top-2 right-2 bg-red-500/80 rounded px-1.5 py-0.5">
                                <span className="text-[9px] font-bold text-white">-${maintenanceCost}/day</span>
                            </div>
                        )}
                        <ToggleRight className={cn(
                            "w-8 h-8 transition-transform",
                            hasCounterFacilities
                                ? "text-blue-500 group-hover:text-blue-300 group-hover:scale-110"
                                : "text-blue-900/50"
                        )} />
                        <div className="flex flex-col items-center">
                            <span className={cn(
                                "text-xs uppercase tracking-widest",
                                hasCounterFacilities ? "group-hover:text-white" : "text-stone-600"
                            )}>
                                设施控制 (Facility)
                            </span>
                            <span className={cn(
                                "text-[9px] mt-1 flex items-center gap-1",
                                hasCounterFacilities ? "text-blue-500/70" : "text-stone-600"
                            )}>
                                {hasCounterFacilities ? '开关柜台设施' : <><Lock className="w-3 h-3" /> 未解锁</>}
                            </span>
                        </div>
                    </button>

                    {/* Black Market Button (always visible, locked if not unlocked) */}
                    <button
                        onClick={() => {
                            if (hasBlackMarket) {
                                playSfx('CLICK');
                                onShowBlackmarket();
                            }
                        }}
                        disabled={!hasBlackMarket}
                        className={cn(
                            "h-32 border bg-stone-900/50 transition-all rounded flex flex-col items-center justify-center gap-3 group relative overflow-hidden",
                            !hasBlackMarket
                                ? "border-stone-700/50 cursor-default hover:border-purple-900/50"
                                : isBlackmarketLocked
                                ? "border-red-900 opacity-70"
                                : hasRiskEvent
                                ? "border-red-500 animate-pulse"
                                : blackmarketHeatLevel === 'DANGER'
                                ? "border-red-700 hover:bg-red-950/50"
                                : blackmarketHeatLevel === 'WARNING'
                                ? "border-orange-700 hover:bg-orange-950/50"
                                : "border-stone-700 hover:bg-stone-800"
                        )}
                    >
                        {/* Locked state overlay (not purchased) */}
                        {!hasBlackMarket && (
                            <>
                                {/* Diagonal stripes pattern */}
                                <div
                                    className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)'
                                    }}
                                />
                                {/* Central lock overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Lock className="w-6 h-6 text-purple-500/70 mb-2" />
                                    <span className="text-[10px] text-purple-400/80 font-medium">需要「黑市联络电话」升级</span>
                                </div>
                            </>
                        )}
                        {/* Lock indicator (market temporarily closed) */}
                        {hasBlackMarket && isBlackmarketLocked && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-red-700 rounded-full flex items-center justify-center">
                                <Lock className="w-3 h-3 text-white" />
                            </div>
                        )}
                        {/* Risk event indicator */}
                        {hasBlackMarket && hasRiskEvent && !isBlackmarketLocked && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                <AlertCircle className="w-3 h-3 text-white" />
                            </div>
                        )}
                        {/* Forfeit count badge */}
                        {hasBlackMarket && forfeitItems > 0 && !isBlackmarketLocked && !hasRiskEvent && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-stone-600 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">{forfeitItems}</span>
                            </div>
                        )}
                        <Skull className={cn(
                            "w-8 h-8 transition-transform",
                            !hasBlackMarket
                                ? "text-purple-900/50"
                                : isBlackmarketLocked ? "text-red-700" :
                                blackmarketHeatLevel === 'DANGER' ? "text-red-500" :
                                blackmarketHeatLevel === 'WARNING' ? "text-orange-500" :
                                "text-stone-500 group-hover:text-stone-300 group-hover:scale-110"
                        )} />
                        <div className="flex flex-col items-center">
                            <span className={cn(
                                "text-xs uppercase tracking-widest",
                                hasBlackMarket ? "group-hover:text-white" : "text-stone-600"
                            )}>
                                黑市 (Black Market)
                            </span>
                            <span className={cn(
                                "text-[9px] mt-1 flex items-center gap-1",
                                !hasBlackMarket ? "text-stone-600" :
                                isBlackmarketLocked ? "text-red-500" :
                                blackmarketHeatLevel === 'DANGER' ? "text-red-400" :
                                blackmarketHeatLevel === 'WARNING' ? "text-orange-400" :
                                "text-stone-500/70"
                            )}>
                                {!hasBlackMarket
                                    ? <><Lock className="w-3 h-3" /> 未解锁</>
                                    : isBlackmarketLocked ? '已关闭' :
                                     hasRiskEvent ? '警方行动!' :
                                     forfeitItems > 0 ? `Lv${blackMarketLevel} | ${forfeitItems} 件可出售` : `Lv${blackMarketLevel} | 变卖绝当物品`}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* ═══ SHOP UPGRADES ═══ (standalone prominent block) */}
            <div>
                <div className="text-[9px] uppercase tracking-widest text-cyan-600 mb-2 px-1">Shop Upgrades</div>
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_UPGRADE_SHOP' })}
                    className="w-full h-16 border border-cyan-800 bg-cyan-950/30 hover:bg-cyan-900/40 transition-all rounded flex items-center justify-center gap-4 group"
                >
                    <Store className="w-7 h-7 text-cyan-500 group-hover:text-cyan-300 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-start">
                        <span className="text-xs uppercase tracking-widest text-cyan-400 group-hover:text-white">
                            店铺升级 (Upgrades)
                        </span>
                        <span className="text-[9px] text-cyan-600 mt-0.5">
                            扩展仓库与设施
                        </span>
                    </div>
                </button>
            </div>

        </div>
    );
};
