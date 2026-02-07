
import React, { useEffect, useState } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { Button } from './ui/Button';
import { Moon, Mail, Package, Calendar, Power, Activity, AlertCircle, AlertTriangle, Heart, Eye, Wrench, Store, ClipboardList, ToggleRight, Lock, Shield, Briefcase, Skull } from 'lucide-react';
import { cn } from '../lib/utils';
import { playSfx } from '../systems/game/audio';
import { InnerVoiceDisplay } from './InnerVoiceDisplay';
import { getBedtimeMonologue } from '../systems/narrative/innerVoiceRegistry';
import { InsightPanel } from './night/InsightPanel';
import { WorkshopPanel } from './night/WorkshopPanel';
import { AppointmentBoardPanel } from './night/AppointmentBoardPanel';
import { BlackmarketPanel } from './night/BlackmarketPanel';
import { UpgradeShopModal } from './UpgradeShopModal';
import { FacilityControlModal } from './FacilityControlModal';
import { getHeatLevel } from '../systems/blackmarket/types';
import { useSettlementCeremony } from '../hooks/useFinancialProjection';
import { Tooltip } from './ui/Tooltip';
import { ReputationType } from '../systems/core/types';
import { getEffectiveInventoryCapacity, BASE_INVENTORY_CAPACITY, hasAppointmentBoard, getAppointmentBoardLevel, getCounterUpgradesForToggle, getTotalMaintenanceCost, hasBlackMarketContact, hasPrecisionBench } from '../systems/upgrades';

export const NightDashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const { performNightCycle } = useGameEngine();
    const { send, can } = useGameMachine();
    const { inbox, inventory, stats, reputation } = state;
    const ceremony = useSettlementCeremony();

    const [showMonologue, setShowMonologue] = useState(false);
    const [monologueText, setMonologueText] = useState("");
    const [showAppointmentBoard, setShowAppointmentBoard] = useState(false);
    const [showBlackmarket, setShowBlackmarket] = useState(false);

    // Use global state for Workshop and Insight panels
    const showInsightPanel = state.showInsight;
    const showWorkshopPanel = state.showWorkshop;

    // Check if appointment board is unlocked
    const hasBoardUnlocked = hasAppointmentBoard(state.shopUpgrades);
    const boardLevel = getAppointmentBoardLevel(state.shopUpgrades);
    const appointedCount = state.appointmentBoard.selectedIds.length;

    // Check for counter facilities
    const counterUpgrades = getCounterUpgradesForToggle(state.shopUpgrades);
    const hasCounterFacilities = counterUpgrades.length > 0;
    const maintenanceCost = getTotalMaintenanceCost(state.shopUpgrades);

    // Workshop state
    const hasWorkshop = hasPrecisionBench(state.shopUpgrades);

    // Black market state
    const hasBlackMarket = hasBlackMarketContact(state.shopUpgrades);
    const blackmarketHeat = state.blackmarket?.heat ?? 0;
    const blackmarketHeatLevel = getHeatLevel(blackmarketHeat);
    const isBlackmarketLocked = state.blackmarket?.isLocked ?? false;
    const hasRiskEvent = state.blackmarket?.lastRiskEvent !== null;
    const forfeitItems = inventory.filter(i => i.status === 'FORFEIT').length;

    const unreadMail = inbox.filter(m => !m.isRead).length;
    // Count only items actually in inventory (ACTIVE or FORFEIT), not REDEEMED/SOLD
    const activeItems = inventory.filter(i => i.status === 'ACTIVE' || i.status === 'FORFEIT').length;

    // Medical Bill Logic
    const bill = stats.medicalBill;
    const daysUntilBill = bill.dueDate - stats.day;
    const isOverdue = bill.status === 'OVERDUE' || (daysUntilBill <= 0 && bill.status !== 'PAID');

    // Ambience: Lamp flicker logic
    const [lampFlicker, setLampFlicker] = useState(1);
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.95) {
                setLampFlicker(0.8 + Math.random() * 0.2);
                setTimeout(() => setLampFlicker(1), 50 + Math.random() * 100);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSleep = () => {
        playSfx('CLICK');
        const text = getBedtimeMonologue(state);
        setMonologueText(text);
        setShowMonologue(true);
    };

    const completeNight = () => {
        setShowMonologue(false);
        // Send state machine event for phase2 sync
        send({ type: 'END_DAY' });
        // Execute night cycle business logic
        performNightCycle();
    };

    return (
        <div className="h-screen w-full bg-[#050505] relative overflow-hidden font-mono text-stone-400 flex flex-col items-center justify-center">
            
            {showMonologue && (
                <InnerVoiceDisplay text={monologueText} onComplete={completeNight} />
            )}

            {/* Background: Pawn Shop Night Interior */}
            <div className="absolute inset-0 bg-[url('/assets/backgrounds/night_dashboard.png')] bg-cover bg-center opacity-25 blur-[2px] pointer-events-none"></div>
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none"></div>
            
            {/* Desk Light Overlay - warm glow from lamp */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-75"
                style={{
                    opacity: lampFlicker * 0.4,
                    background: 'radial-gradient(ellipse 60% 50% at 30% 70%, rgba(251, 191, 36, 0.15) 0%, transparent 70%)'
                }}
            ></div>
            {/* Neon glow from window - subtle blue/pink */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 40% 60% at 80% 40%, rgba(147, 197, 253, 0.08) 0%, transparent 60%)'
                }}
            ></div>

            <div className="relative z-10 w-full max-w-6xl h-[80vh] flex gap-8 p-8">
                
                {/* Left: Desk Area / Menu */}
                <div className="flex-1 flex flex-col justify-end gap-6">
                    <div className="mb-auto">
                        <h1 className="text-4xl font-serif text-stone-300 mb-2">Night Cycle</h1>
                        <p className="text-xs uppercase tracking-widest text-stone-600">
                            Day {stats.day} Complete. <br/>
                            Store Status: LOCKED.
                        </p>

                        {/* Mother's Care - Emotional Banner */}
                        <div className={cn(
                            "mt-8 border rounded-lg overflow-hidden flex items-stretch",
                            isOverdue ? "border-red-500/60 bg-red-950/20" : "border-rose-900/40 bg-stone-900/30"
                        )}>
                            {/* Left: Icon & Title */}
                            <div className={cn(
                                "px-6 py-5 flex items-center gap-4 border-r",
                                isOverdue ? "border-red-900/50" : "border-stone-800/50"
                            )}>
                                <Heart className={cn(
                                    "w-10 h-10 shrink-0",
                                    isOverdue ? "text-red-400 animate-pulse" : "text-rose-400"
                                )} />
                                <div>
                                    <span className="text-lg uppercase tracking-[0.15em] text-stone-200 font-medium">
                                        母亲
                                    </span>
                                    {isOverdue && (
                                        <div className="mt-1 text-[10px] text-red-400 font-bold flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            医疗账单逾期!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Action Buttons */}
                            <div className="flex-1 flex divide-x divide-stone-800/50">
                                <button
                                    onClick={() => dispatch({ type: 'TOGGLE_MEDICAL' })}
                                    className="flex-1 py-4 px-4 flex items-center justify-center gap-3 hover:bg-stone-800/50 transition-colors group"
                                >
                                    <Activity className={cn(
                                        "w-6 h-6 group-hover:scale-110 transition-transform shrink-0",
                                        isOverdue ? "text-red-400" : "text-teal-400"
                                    )} />
                                    <div className="text-left">
                                        <div className={cn(
                                            "text-xs uppercase tracking-wider group-hover:text-white",
                                            isOverdue ? "text-red-400" : "text-stone-300"
                                        )}>
                                            医疗账单
                                        </div>
                                        <div className={cn(
                                            "text-[10px] mt-0.5",
                                            isOverdue ? "text-red-500" : "text-stone-500"
                                        )}>
                                            {isOverdue ? '立即处理' : daysUntilBill > 0 ? `${daysUntilBill} 天后到期` : '查看详情'}
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => dispatch({ type: 'TOGGLE_VISIT' })}
                                    disabled={stats.visitedToday}
                                    className={cn(
                                        "flex-1 py-4 px-4 flex items-center justify-center gap-3 transition-colors group",
                                        stats.visitedToday ? "opacity-40 cursor-not-allowed" : "hover:bg-rose-950/30"
                                    )}
                                >
                                    <Heart className={cn(
                                        "w-6 h-6 transition-transform shrink-0",
                                        stats.visitedToday ? "text-stone-600" : "text-rose-400 group-hover:scale-110"
                                    )} />
                                    <div className="text-left">
                                        <div className={cn(
                                            "text-xs uppercase tracking-wider",
                                            stats.visitedToday ? "text-stone-600" : "text-stone-300 group-hover:text-rose-300"
                                        )}>
                                            {stats.visitedToday ? '已探望' : '探望母亲'}
                                        </div>
                                        <div className="text-[10px] text-stone-500 mt-0.5">
                                            {stats.visitedToday ? '明天再来' : '去看看她'}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* S2-I4: Settlement Eve Banner (Day before medical bill) */}
                        {ceremony.isSettlementEve && (
                            <div className="mt-4 border border-amber-700/60 bg-amber-950/20 rounded-lg p-4 flex items-start gap-3 animate-in fade-in duration-500">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                                        明日账单提醒
                                    </div>
                                    <div className="text-sm text-stone-300 mt-1">
                                        明天需要支付 <span className="text-amber-400 font-mono font-bold">${ceremony.billAmount}</span> 的医疗费用。
                                    </div>
                                    {ceremony.canAfford ? (
                                        <div className="text-[10px] text-stone-500 mt-1">
                                            当前余额 ${stats.cash}，{stats.cash >= ceremony.billAmount * 1.5 ? '资金充裕' : '刚好够付'}。
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-red-400 mt-1 font-bold">
                                            当前余额 ${stats.cash}，缺口 ${ceremony.shortfall}！
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* S2-I4: Settlement Day Ceremony (Medical bill due day) */}
                        {ceremony.isSettlementDay && ceremony.canAfford && (
                            <div className={cn(
                                "mt-4 border rounded-lg p-4 animate-in fade-in duration-700",
                                ceremony.severityTier === 'COMFORTABLE'
                                    ? 'border-emerald-800/60 bg-emerald-950/20'
                                    : ceremony.severityTier === 'TIGHT'
                                    ? 'border-amber-800/60 bg-amber-950/20'
                                    : 'border-red-800/60 bg-red-950/20'
                            )}>
                                <div className="text-[10px] uppercase tracking-widest text-stone-600 mb-2 font-bold">
                                    Settlement // Day {stats.day}
                                </div>
                                <div className={cn(
                                    "text-sm italic leading-relaxed",
                                    ceremony.severityTier === 'COMFORTABLE'
                                        ? 'text-emerald-300/90'
                                        : ceremony.severityTier === 'TIGHT'
                                        ? 'text-amber-300/90'
                                        : 'text-red-300/90'
                                )}>
                                    "{ceremony.narrativeLine}"
                                </div>
                                <div className="mt-2 flex justify-between text-[10px] font-mono text-stone-500">
                                    <span>已付: -${ceremony.billAmount}</span>
                                    <span>余额: ${ceremony.balanceAfterPayment}</span>
                                </div>
                            </div>
                        )}

                        {ceremony.isSettlementDay && !ceremony.canAfford && (
                            <div className="mt-4 border border-red-600/80 bg-red-950/30 rounded-lg p-4 animate-pulse">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <span className="text-xs uppercase tracking-wider text-red-400 font-bold">
                                        无法支付医疗账单
                                    </span>
                                </div>
                                <div className="text-sm text-red-300">
                                    需要 <span className="font-mono font-bold">${ceremony.billAmount}</span>，缺口 <span className="font-mono font-bold">${ceremony.shortfall}</span>。
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Admin Actions */}
                    <div className="grid grid-cols-3 gap-4">
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
                            className="h-32 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                        >
                            <Package className="w-8 h-8 text-stone-500 group-hover:text-stone-300 group-hover:scale-110 transition-transform" />
                            <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                Vault ({activeItems})
                            </span>
                        </button>

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
                                        <span className="text-[10px] text-amber-400/80 font-medium">需要「精密工作台」升级</span>
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
                                        : '修复与重铸物品'}
                                </span>
                            </div>
                        </button>

                        {/* Shop Upgrades Button */}
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_UPGRADE_SHOP' })}
                            className="h-32 border border-cyan-900 bg-stone-900/50 hover:bg-cyan-950/50 transition-all rounded flex flex-col items-center justify-center gap-3 group"
                        >
                            <Store className="w-8 h-8 text-cyan-500 group-hover:text-cyan-300 group-hover:scale-110 transition-transform" />
                            <div className="flex flex-col items-center">
                                <span className="text-xs uppercase tracking-widest group-hover:text-white">
                                    店铺升级 (Upgrades)
                                </span>
                                <span className="text-[9px] text-cyan-500/70 mt-1">
                                    扩展仓库与设施
                                </span>
                            </div>
                        </button>

                        {/* Appointment Board Button (always visible, locked if not unlocked) */}
                        <button
                            onClick={() => {
                                if (hasBoardUnlocked) {
                                    playSfx('CLICK');
                                    setShowAppointmentBoard(true);
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
                                    setShowBlackmarket(true);
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
                                         forfeitItems > 0 ? `${forfeitItems} 件可出售` : '变卖绝当物品'}
                                </span>
                            </div>
                        </button>

                    </div>
                </div>

                {/* Right: Status Panel */}
                <div className="w-1/3 flex flex-col items-center justify-center border-l border-stone-800 pl-8">

                    {/* Cash Position */}
                    <div className="text-center mb-6">
                        <div className="text-[10px] uppercase text-stone-600 mb-2 tracking-[0.2em]">Net Cash Position</div>
                        <div className="text-3xl font-mono text-stone-200">${stats.cash}</div>
                    </div>

                    {/* Reputation Bars */}
                    <div className="flex flex-col gap-3 mb-6 w-full max-w-[200px]">
                        <div className="text-[10px] uppercase text-stone-600 tracking-[0.2em] text-center">Reputation</div>

                        <Tooltip content={<div className="text-xs"><span className="font-bold">Humanity:</span> {reputation[ReputationType.HUMANITY]}%</div>}>
                            <div className="flex items-center gap-3">
                                <Heart className="w-4 h-4 text-red-400 shrink-0" />
                                <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${reputation[ReputationType.HUMANITY]}%` }}></div>
                                </div>
                                <span className="text-[10px] text-stone-500 w-8 text-right">{reputation[ReputationType.HUMANITY]}%</span>
                            </div>
                        </Tooltip>

                        <Tooltip content={<div className="text-xs"><span className="font-bold">Credibility:</span> {reputation[ReputationType.CREDIBILITY]}%</div>}>
                            <div className="flex items-center gap-3">
                                <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                                <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${reputation[ReputationType.CREDIBILITY]}%` }}></div>
                                </div>
                                <span className="text-[10px] text-stone-500 w-8 text-right">{reputation[ReputationType.CREDIBILITY]}%</span>
                            </div>
                        </Tooltip>

                        <Tooltip content={<div className="text-xs"><span className="font-bold">Innocence:</span> {reputation[ReputationType.INNOCENCE]}%</div>}>
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                                <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${reputation[ReputationType.INNOCENCE]}%` }}></div>
                                </div>
                                <span className="text-[10px] text-stone-500 w-8 text-right">{reputation[ReputationType.INNOCENCE]}%</span>
                            </div>
                        </Tooltip>
                    </div>

                    <Button
                        onClick={handleSleep}
                        className="w-full h-20 text-lg tracking-widest bg-stone-900 hover:bg-stone-800 border-stone-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] group relative overflow-hidden text-stone-200 hover:text-white"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-colors"></div>
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            <Moon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            END DAY (SLEEP)
                        </span>
                    </Button>

                    <p className="mt-4 text-[9px] text-stone-700 text-center max-w-[200px]">
                        "Sleep is the interest we pay on the debt of death."
                    </p>
                </div>

            </div>

            {/* Insight Panel Modal */}
            <InsightPanel
                isOpen={showInsightPanel}
                onClose={() => dispatch({ type: 'TOGGLE_INSIGHT' })}
            />

            {/* Workshop Panel Modal */}
            <WorkshopPanel
                isOpen={showWorkshopPanel}
                onClose={() => dispatch({ type: 'TOGGLE_WORKSHOP' })}
            />

            {/* Upgrade Shop Modal */}
            <UpgradeShopModal />

            {/* Facility Control Modal */}
            <FacilityControlModal />

            {/* Appointment Board Modal */}
            <AppointmentBoardPanel
                isOpen={showAppointmentBoard}
                onClose={() => setShowAppointmentBoard(false)}
            />

            {/* Black Market Modal */}
            <BlackmarketPanel
                isOpen={showBlackmarket}
                onClose={() => setShowBlackmarket(false)}
            />
        </div>
    );
};
