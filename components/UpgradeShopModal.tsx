
import React from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Package, Wrench, Check, Lock, DollarSign, Zap, Coffee, Scan, Power, ToggleLeft, ToggleRight, Coins } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAvailableUpgradesWithStatus, getEffectiveInventoryCapacity, getEffectiveNightEnergy, BASE_INVENTORY_CAPACITY, getTotalMaintenanceCost, getCounterUpgradesForToggle, getPatienceBonus, getAnomalyDetectionThreshold } from '../systems/upgrades';
import { GAME_CONFIG } from '../systems/game/config';
import { GamePhase } from '../types';

// Circular Arc Pattern Component - represents level with purple arcs
const LevelArcRing: React.FC<{ currentLevel: number; maxLevel: number; icon: React.ReactNode; isMaxLevel?: boolean }> = ({
    currentLevel,
    maxLevel,
    icon,
    isMaxLevel = false
}) => {
    // Calculate arc angles based on max level (each level gets an equal arc)
    const gapAngle = 15; // Gap between arcs in degrees
    const totalGapAngle = gapAngle * maxLevel;
    const totalArcAngle = 360 - totalGapAngle;
    const arcAngle = totalArcAngle / maxLevel;

    // Generate arcs
    const arcs = Array.from({ length: maxLevel }, (_, i) => {
        const startAngle = i * (arcAngle + gapAngle) - 90; // Start from top
        const endAngle = startAngle + arcAngle;
        const isActive = i < currentLevel;

        // Convert to radians
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        // Calculate arc path
        const radius = 28;
        const x1 = 32 + radius * Math.cos(startRad);
        const y1 = 32 + radius * Math.sin(startRad);
        const x2 = 32 + radius * Math.cos(endRad);
        const y2 = 32 + radius * Math.sin(endRad);

        const largeArc = arcAngle > 180 ? 1 : 0;

        return (
            <path
                key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke={isActive ? (isMaxLevel ? '#22c55e' : '#a855f7') : '#3f3f46'}
                strokeWidth="3"
                strokeLinecap="round"
            />
        );
    });

    return (
        <div className="relative w-16 h-16 shrink-0">
            {/* Arc Ring SVG */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
                {arcs}
            </svg>
            {/* Center Icon */}
            <div className={cn(
                "absolute inset-2 rounded-lg flex items-center justify-center",
                isMaxLevel ? "bg-green-950/50 text-green-500" : "bg-amber-950/50 text-amber-500"
            )}>
                {icon}
            </div>
        </div>
    );
};

// Level Dots Component - shows colored dots for level progress
const LevelDots: React.FC<{ currentLevel: number; maxLevel: number }> = ({ currentLevel, maxLevel }) => {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-noir-txt-muted uppercase tracking-wider mr-1">LEVEL:</span>
            <div className="flex gap-1">
                {Array.from({ length: maxLevel }, (_, i) => {
                    let color = 'bg-zinc-600'; // Not reached
                    if (i < currentLevel) {
                        // Gradient from green to yellow/orange based on position
                        if (i === 0) color = 'bg-green-500';
                        else if (i === 1) color = 'bg-lime-500';
                        else if (i === 2) color = 'bg-yellow-500';
                        else if (i === 3) color = 'bg-amber-500';
                        else color = 'bg-orange-500';
                    }
                    return (
                        <div
                            key={i}
                            className={cn(
                                "w-3 h-3 rounded-sm",
                                color
                            )}
                        />
                    );
                })}
            </div>
            <span className="text-xs font-mono text-noir-txt-secondary ml-1">
                {currentLevel}/{maxLevel}
            </span>
        </div>
    );
};

export const UpgradeShopModal: React.FC = () => {
    const { state, dispatch } = useGame();

    if (!state.showUpgradeShop) return null;

    const upgradesWithStatus = getAvailableUpgradesWithStatus(state.stats.cash, state.shopUpgrades);
    const counterUpgrades = getCounterUpgradesForToggle(state.shopUpgrades);
    const totalMaintenanceCost = getTotalMaintenanceCost(state.shopUpgrades);
    const isNightPhase = state.phase === GamePhase.NIGHT;

    const handlePurchase = (upgradeId: string) => {
        dispatch({ type: 'PURCHASE_UPGRADE', payload: { upgradeId } });
    };

    const handleToggle = (upgradeId: string) => {
        if (!isNightPhase) return;
        dispatch({ type: 'TOGGLE_UPGRADE_ENABLED', payload: { upgradeId } });
    };

    const getIcon = (iconName?: string) => {
        switch (iconName) {
            case 'Package': return <Package className="w-6 h-6" />;
            case 'Wrench': return <Wrench className="w-6 h-6" />;
            case 'Coffee': return <Coffee className="w-6 h-6" />;
            case 'Scan': return <Scan className="w-6 h-6" />;
            default: return <Package className="w-6 h-6" />;
        }
    };

    const getSmallIcon = (iconName?: string) => {
        switch (iconName) {
            case 'Package': return <Package className="w-4 h-4" />;
            case 'Wrench': return <Wrench className="w-4 h-4" />;
            case 'Coffee': return <Coffee className="w-4 h-4" />;
            case 'Scan': return <Scan className="w-4 h-4" />;
            default: return <Package className="w-4 h-4" />;
        }
    };

    // Calculate current effective values
    const currentCapacity = getEffectiveInventoryCapacity(state.shopUpgrades);
    const currentEnergy = getEffectiveNightEnergy(state.shopUpgrades);
    const patienceBonus = getPatienceBonus(state.shopUpgrades);
    const anomalyThreshold = getAnomalyDetectionThreshold(state.shopUpgrades);

    return (
        <Modal
            isOpen={state.showUpgradeShop}
            onClose={() => dispatch({ type: 'TOGGLE_UPGRADE_SHOP' })}
            title={
                <span className="font-mono tracking-widest flex items-center gap-2">
                    <Wrench className="w-5 h-5" /> SHOP_UPGRADE_SYS
                </span>
            }
            size="lg"
        >
            <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Current Status Header */}
                <div className="bg-noir-200 border border-noir-400 rounded p-4">
                    <h3 className="text-xs uppercase tracking-widest text-noir-txt-muted mb-3">Current Facility Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-noir-txt-muted uppercase">Cash</span>
                            <span className="text-lg font-mono text-green-500">${state.stats.cash}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-noir-txt-muted uppercase">Inventory Cap</span>
                            <span className="text-lg font-mono text-amber-500">
                                {currentCapacity}
                                {currentCapacity > BASE_INVENTORY_CAPACITY && (
                                    <span className="text-xs text-green-500 ml-1">(+{currentCapacity - BASE_INVENTORY_CAPACITY})</span>
                                )}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-noir-txt-muted uppercase">Night Energy</span>
                            <span className="text-lg font-mono text-purple-500">
                                {currentEnergy}
                                {currentEnergy > GAME_CONFIG.NIGHT.BASE_ENERGY && (
                                    <span className="text-xs text-green-500 ml-1">(+{currentEnergy - GAME_CONFIG.NIGHT.BASE_ENERGY})</span>
                                )}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-noir-txt-muted uppercase">Daily Maintenance</span>
                            <span className={cn("text-lg font-mono", totalMaintenanceCost > 0 ? "text-red-500" : "text-stone-500")}>
                                ${totalMaintenanceCost}
                            </span>
                        </div>
                    </div>

                    {/* Active Counter Effects */}
                    {(patienceBonus > 0 || anomalyThreshold > 0) && (
                        <div className="mt-3 pt-3 border-t border-noir-400 flex flex-wrap gap-3">
                            {patienceBonus > 0 && (
                                <div className="flex items-center gap-1 text-xs text-teal-400 bg-teal-950/30 px-2 py-1 rounded">
                                    <Coffee className="w-3 h-3" />
                                    <span>Patience +{patienceBonus}</span>
                                </div>
                            )}
                            {anomalyThreshold > 0 && (
                                <div className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded">
                                    <Scan className="w-3 h-3" />
                                    <span>Detects &gt;{anomalyThreshold}% diff</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Counter Upgrade Toggle Section (Night Only) */}
                {counterUpgrades.length > 0 && (
                    <div className="bg-blue-950/20 border border-blue-900/50 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs uppercase tracking-widest text-blue-400 flex items-center gap-2">
                                <Power className="w-4 h-4" /> Counter Facility Controls
                            </h3>
                            {!isNightPhase && (
                                <span className="text-[9px] text-stone-500 bg-stone-800 px-2 py-1 rounded">
                                    Toggle at night only
                                </span>
                            )}
                        </div>
                        <div className="space-y-2">
                            {counterUpgrades.map(upgrade => (
                                <div
                                    key={upgrade.upgradeId}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded border transition-all",
                                        upgrade.enabled
                                            ? "bg-blue-950/30 border-blue-800"
                                            : "bg-noir-300/50 border-noir-400 opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded flex items-center justify-center",
                                            upgrade.enabled ? "bg-blue-900/50 text-blue-400" : "bg-noir-400 text-noir-txt-muted"
                                        )}>
                                            {getSmallIcon(upgrade.icon)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-mono text-noir-txt-primary">
                                                {upgrade.nameCn} <span className="text-[10px] text-noir-txt-muted">Lv{upgrade.currentLevel}</span>
                                            </div>
                                            <div className="text-[10px] text-noir-txt-muted flex items-center gap-1">
                                                <Coins className="w-3 h-3 text-red-500" />
                                                <span className={upgrade.enabled ? "text-red-400" : "text-stone-500"}>
                                                    {upgrade.enabled ? `-$${upgrade.maintenanceCost}/day` : "Disabled"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggle(upgrade.upgradeId)}
                                        disabled={!isNightPhase}
                                        className={cn(
                                            "transition-all",
                                            isNightPhase ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-50"
                                        )}
                                    >
                                        {upgrade.enabled ? (
                                            <ToggleRight className="w-8 h-8 text-green-500" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8 text-stone-500" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upgrade Cards - New Figma Style */}
                <div className="grid grid-cols-1 gap-4">
                    {upgradesWithStatus.map(({ config, currentLevel, isMaxLevel, canPurchase, purchaseReason, nextLevelCost, nextLevelConfig }) => {
                        const ownedUpgrade = state.shopUpgrades.upgrades.find(u => u.upgradeId === config.id);
                        const isOwned = currentLevel > 0;
                        const isEnabled = ownedUpgrade?.enabled ?? true;

                        return (
                            <div
                                key={config.id}
                                className={cn(
                                    "border rounded-lg overflow-hidden transition-all",
                                    isMaxLevel
                                        ? "bg-noir-200 border-green-900/50"
                                        : canPurchase
                                            ? "bg-noir-200 border-amber-900/50 hover:border-amber-500/50"
                                            : "bg-noir-200 border-noir-400"
                                )}
                            >
                                {/* Main Card Content */}
                                <div className="p-4 flex items-start gap-4">
                                    {/* Left: Arc Ring with Icon */}
                                    <LevelArcRing
                                        currentLevel={currentLevel}
                                        maxLevel={config.maxLevel}
                                        icon={getIcon(config.icon)}
                                        isMaxLevel={isMaxLevel}
                                    />

                                    {/* Right: Info */}
                                    <div className="flex-1 min-w-0">
                                        {/* Title Row */}
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="font-bold text-base text-noir-txt-primary">
                                                {config.nameCn}
                                            </h3>
                                            <span className="text-xs text-noir-txt-muted">
                                                ({config.name})
                                            </span>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded uppercase font-medium",
                                                config.location === 'BACKROOM'
                                                    ? "bg-purple-900/50 text-purple-300 border border-purple-700/50"
                                                    : "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                                            )}>
                                                {config.location === 'BACKROOM' ? 'WAREHOUSE' : 'COUNTER'}
                                            </span>
                                            {config.location === 'COUNTER' && isOwned && (
                                                <span className={cn(
                                                    "text-[9px] px-1.5 py-0.5 rounded uppercase",
                                                    isEnabled ? "bg-green-950/50 text-green-400" : "bg-red-950/50 text-red-400"
                                                )}>
                                                    {isEnabled ? 'ON' : 'OFF'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-noir-txt-muted mb-3">
                                            {config.description}
                                        </p>

                                        {/* Level Dots */}
                                        <LevelDots currentLevel={currentLevel} maxLevel={config.maxLevel} />
                                    </div>
                                </div>

                                {/* Next Level / Action Area */}
                                {!isMaxLevel && nextLevelConfig ? (
                                    <div className="border-t border-noir-400 bg-noir-100/50">
                                        {/* Next Level Info */}
                                        <div className="px-4 py-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span className="text-xs text-noir-txt-muted">Next Level:</span>
                                            <span className="text-sm text-amber-400 font-medium">{nextLevelConfig.description}</span>
                                            {nextLevelConfig.maintenanceCost && (
                                                <span className="text-red-400 text-[10px] ml-1">
                                                    (维护费 ${nextLevelConfig.maintenanceCost}/天)
                                                </span>
                                            )}
                                        </div>

                                        {/* Price & Purchase Button */}
                                        <div className="px-4 py-3 border-t border-noir-400/50 flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <DollarSign className={cn(
                                                    "w-5 h-5",
                                                    canPurchase ? "text-green-500" : "text-noir-txt-muted"
                                                )} />
                                                <span className={cn(
                                                    "text-lg font-mono font-bold",
                                                    canPurchase ? "text-white" : "text-red-500"
                                                )}>
                                                    ${nextLevelCost}
                                                </span>
                                            </div>
                                            <Button
                                                variant={canPurchase ? "primary" : "ghost"}
                                                size="sm"
                                                disabled={!canPurchase}
                                                onClick={() => handlePurchase(config.id)}
                                                className={cn(
                                                    "text-xs px-4",
                                                    !canPurchase && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {canPurchase ? (
                                                    <>升级到 Lv{currentLevel + 1}</>
                                                ) : (
                                                    <><Lock className="w-3 h-3 mr-1" />{purchaseReason}</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ) : isMaxLevel ? (
                                    <div className="border-t border-green-900/50 bg-green-950/20 px-4 py-3 flex items-center justify-center gap-2 text-green-500">
                                        <Check className="w-5 h-5" />
                                        <span className="uppercase tracking-wider font-medium">已达到最高等级</span>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {/* Info Footer */}
                <div className="text-[10px] text-noir-txt-muted text-center border-t border-noir-400 pt-3 space-y-1">
                    <div><span className="text-purple-400">Warehouse</span> 升级无维护费用，永久生效。</div>
                    <div><span className="text-blue-400">Counter</span> 升级有每日维护费，可在夜间开关。</div>
                </div>
            </div>
        </Modal>
    );
};
