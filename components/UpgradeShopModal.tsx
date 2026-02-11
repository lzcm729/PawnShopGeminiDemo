
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { HelpTooltip } from './ui/Tooltip';
import { Button } from './ui/Button';
import { Package, Wrench, Check, Lock, DollarSign, Zap, Coffee, Scan, ClipboardList, Skull, Sparkles, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAvailableUpgradesWithStatus, getEffectiveInventoryCapacity, getEffectiveNightEnergy, BASE_INVENTORY_CAPACITY, getTotalMaintenanceCost, getPatienceBonus, getAnomalyDetectionThreshold } from '../systems/upgrades';
import { GAME_CONFIG } from '../systems/game/config';
import type { UpgradeLocation } from '../systems/upgrades/types';
import { parseCSV, CSVSchema, stringCol, numberCol } from '../systems/utils/csvReader';
import upgradeTextsCSV from '../assets/data/texts/upgrade_texts.csv?raw';

// Location category configuration
const LOCATION_CATEGORIES: { location: UpgradeLocation; nameCn: string; nameEn: string; color: string }[] = [
    { location: 'BACKROOM', nameCn: '后屋设施', nameEn: 'Backroom', color: 'purple' },
    { location: 'COUNTER', nameCn: '柜台设备', nameEn: 'Counter', color: 'blue' },
];

// ============================================================================
// CSV Loading: upgrade texts (monologues + feature hints)
// ============================================================================

interface UpgradeTextRow {
    type: string;
    upgradeId: string;
    level: number;
    text: string;
}

const UPGRADE_TEXT_SCHEMA: CSVSchema = {
    'type': stringCol('type'),
    'upgradeId': stringCol('upgradeId'),
    'level': numberCol('level'),
    'text': stringCol('text'),
};

let _monologues: Record<string, string[]> | null = null;
let _featureHints: Record<string, Record<number, string>> | null = null;

function loadUpgradeTexts(): void {
    if (_monologues) return;

    _monologues = {};
    _featureHints = {};

    const rows = parseCSV<UpgradeTextRow>(upgradeTextsCSV, UPGRADE_TEXT_SCHEMA, {
        warnUnknownColumns: false,
    });

    for (const row of rows) {
        if (!row.upgradeId) continue;

        if (row.type === 'monologue') {
            if (!_monologues[row.upgradeId]) {
                _monologues[row.upgradeId] = [];
            }
            // Level-indexed: array[level] = text for that level
            _monologues[row.upgradeId][row.level] = row.text;
        } else if (row.type === 'feature_hint') {
            if (!row.text) continue;
            if (!_featureHints[row.upgradeId]) {
                _featureHints[row.upgradeId] = {};
            }
            _featureHints[row.upgradeId][row.level] = row.text;
        }
    }
}

function getPurchaseMonologues(): Record<string, string[]> {
    loadUpgradeTexts();
    return _monologues!;
}

function getUpgradeFeatureHints(): Record<string, Record<number, string>> {
    loadUpgradeTexts();
    return _featureHints!;
}

// PurchaseFlash overlay component
interface PurchaseFlashProps {
    monologue: string;
    upgradeName: string;
    level: number;
    onDismiss: () => void;
}

const PurchaseFlash: React.FC<PurchaseFlashProps> = ({ monologue, upgradeName, level, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            style={{ animation: 'purchaseFlashIn 0.3s ease-out, purchaseFlashOut 0.5s ease-in 2.5s forwards' }}
        >
            <style>
                {`
                    @keyframes purchaseFlashIn {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes purchaseFlashOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `}
            </style>
            <div className="bg-noir-100/95 border border-amber-700 rounded-xl px-8 py-6 max-w-sm text-center shadow-2xl shadow-amber-900/30">
                <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <div className="text-xs text-amber-500 uppercase tracking-widest mb-1">
                    {upgradeName} Lv{level}
                </div>
                <p className="text-sm text-stone-300 italic font-serif leading-relaxed">
                    {monologue}
                </p>
            </div>
        </div>
    );
};

// Circular Arc Pattern Component - represents level with purple arcs
const LevelArcRing: React.FC<{ currentLevel: number; maxLevel: number; icon: React.ReactNode; isMaxLevel?: boolean; isRecommended?: boolean }> = ({
    currentLevel,
    maxLevel,
    icon,
    isMaxLevel = false,
    isRecommended = false
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
        const isNextLevel = i === currentLevel && !isMaxLevel; // Next level to unlock

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

        // Determine stroke color
        let strokeColor = '#3f3f46'; // Inactive
        if (isActive) {
            strokeColor = isMaxLevel ? '#22c55e' : '#a855f7';
        } else if (isNextLevel) {
            strokeColor = '#d97706'; // Amber for next level hint
        }

        return (
            <path
                key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth="3"
                strokeLinecap="round"
                className={isNextLevel && isRecommended ? 'animate-arc-breathe' : undefined}
            />
        );
    });

    return (
        <div className="relative w-16 h-16 shrink-0">
            {/* Arc Ring SVG */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
                <style>
                    {`
                        @keyframes arcBreathe {
                            0%, 100% { opacity: 0.3; }
                            50% { opacity: 1; }
                        }
                        .animate-arc-breathe {
                            animation: arcBreathe 2s ease-in-out infinite;
                        }
                    `}
                </style>
                {arcs}
            </svg>
            {/* Center Icon */}
            <div className={cn(
                "absolute inset-2 rounded-full flex items-center justify-center",
                isMaxLevel ? "bg-green-950/50 text-green-500" : "bg-amber-950/50 text-amber-500"
            )}>
                {icon}
            </div>
        </div>
    );
};

export const UpgradeShopModal: React.FC = () => {
    const { state, dispatch } = useGame();

    const upgradesWithStatus = getAvailableUpgradesWithStatus(state.stats.cash, state.shopUpgrades);
    const totalMaintenanceCost = getTotalMaintenanceCost(state.shopUpgrades);

    const [purchaseFeedback, setPurchaseFeedback] = useState<{ monologue: string; upgradeName: string; level: number } | null>(null);
    const [recentPurchaseId, setRecentPurchaseId] = useState<string | null>(null);


    // Group upgrades by location - useMemo must be called before any conditional returns
    const upgradesByLocation = useMemo(() => {
        const grouped: Record<UpgradeLocation, typeof upgradesWithStatus> = {
            'BACKROOM': [],
            'COUNTER': [],
        };
        upgradesWithStatus.forEach(upgrade => {
            grouped[upgrade.config.location].push(upgrade);
        });
        return grouped;
    }, [upgradesWithStatus]);

    // S1-I6: Find the single most-recommended upgrade (cheapest purchasable)
    const recommendedUpgradeId = useMemo(() => {
        const purchasable = upgradesWithStatus
            .filter(u => u.canPurchase && !u.isMaxLevel)
            .sort((a, b) => (a.nextLevelCost ?? Infinity) - (b.nextLevelCost ?? Infinity));
        return purchasable.length > 0 ? purchasable[0].config.id : null;
    }, [upgradesWithStatus]);

    // Calculate current effective values
    const currentCapacity = getEffectiveInventoryCapacity(state.shopUpgrades);
    const currentEnergy = getEffectiveNightEnergy(state.shopUpgrades);
    const patienceBonus = getPatienceBonus(state.shopUpgrades);
    const anomalyThreshold = getAnomalyDetectionThreshold(state.shopUpgrades);

    // S1-I1: Clear recent purchase glow after 2s
    useEffect(() => {
        if (recentPurchaseId) {
            const timer = setTimeout(() => setRecentPurchaseId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [recentPurchaseId]);

    const handleDismissFlash = useCallback(() => setPurchaseFeedback(null), []);

    // Early return AFTER all hooks
    if (!state.showUpgradeShop) return null;

    const handlePurchase = (upgradeId: string, upgradeName: string, newLevel: number) => {
        dispatch({ type: 'PURCHASE_UPGRADE', payload: { upgradeId } });
        // S1-I1: Show purchase feedback
        const monologues = getPurchaseMonologues()[upgradeId];
        const monologue = monologues?.[newLevel] || '';
        if (monologue) {
            setPurchaseFeedback({ monologue, upgradeName, level: newLevel });
        }
        setRecentPurchaseId(upgradeId);
    };

    const getIcon = (iconName?: string) => {
        switch (iconName) {
            case 'Package': return <Package className="w-6 h-6" />;
            case 'Wrench': return <Wrench className="w-6 h-6" />;
            case 'Coffee': return <Coffee className="w-6 h-6" />;
            case 'Scan': return <Scan className="w-6 h-6" />;
            case 'ClipboardList': return <ClipboardList className="w-6 h-6" />;
            case 'Skull': return <Skull className="w-6 h-6" />;
            default: return <Package className="w-6 h-6" />;
        }
    };

    return (
        <Modal
            isOpen={state.showUpgradeShop}
            onClose={() => dispatch({ type: 'TOGGLE_UPGRADE_SHOP' })}
            title={
                <span className="font-mono tracking-widest flex items-center gap-2">
                    <Wrench className="w-5 h-5" /> SHOP_UPGRADE_SYS
                    <HelpTooltip text="购买店铺升级，扩展库存容量、解锁新功能。后屋设施提供被动加成，柜台设备需要每日维护费。" />
                </span>
            }
            size="lg"
        >
            {/* S1-I1: Purchase feedback overlay */}
            {purchaseFeedback && (
                <PurchaseFlash
                    monologue={purchaseFeedback.monologue}
                    upgradeName={purchaseFeedback.upgradeName}
                    level={purchaseFeedback.level}
                    onDismiss={handleDismissFlash}
                />
            )}

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

                {/* Upgrade Cards - Grouped by Location */}
                <div className="flex flex-col gap-6">
                    {LOCATION_CATEGORIES.map(({ location, nameCn, nameEn, color }) => {
                        const categoryUpgrades = upgradesByLocation[location];
                        if (categoryUpgrades.length === 0) return null;

                        return (
                            <div key={location} className="flex flex-col gap-3">
                                {/* Category Header */}
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-px flex-1",
                                        color === 'purple' ? "bg-purple-700/50" : "bg-blue-700/50"
                                    )} />
                                    <h3 className={cn(
                                        "text-xs font-medium tracking-widest uppercase flex items-center gap-2",
                                        color === 'purple' ? "text-purple-400" : "text-blue-400"
                                    )}>
                                        <span>{nameCn}</span>
                                        <span className="text-noir-txt-muted font-normal">({nameEn})</span>
                                    </h3>
                                    <div className={cn(
                                        "h-px flex-1",
                                        color === 'purple' ? "bg-purple-700/50" : "bg-blue-700/50"
                                    )} />
                                </div>

                                {/* Upgrade Cards */}
                                <div className="grid grid-cols-1 gap-3">
                                    {categoryUpgrades.map(({ config, currentLevel, isMaxLevel, canPurchase, purchaseReason, nextLevelCost, nextLevelConfig }) => {
                                        const ownedUpgrade = state.shopUpgrades.upgrades.find(u => u.upgradeId === config.id);
                                        const isOwned = currentLevel > 0;
                                        const isEnabled = ownedUpgrade?.enabled ?? true;
                                        const isRecommended = config.id === recommendedUpgradeId;
                                        const isRecentPurchase = config.id === recentPurchaseId;

                                        return (
                                            <div
                                                key={config.id}
                                                className={cn(
                                                    "border rounded-lg overflow-hidden transition-all duration-500",
                                                    isRecentPurchase
                                                        ? "bg-amber-950/20 border-amber-500 shadow-lg shadow-amber-900/30"
                                                        : isMaxLevel
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
                                                        isRecommended={isRecommended}
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
                                                            {config.location === 'COUNTER' && isOwned && (
                                                                <span className={cn(
                                                                    "text-[9px] px-1.5 py-0.5 rounded uppercase",
                                                                    isEnabled ? "bg-green-950/50 text-green-400" : "bg-red-950/50 text-red-400"
                                                                )}>
                                                                    {isEnabled ? 'ON' : 'OFF'}
                                                                </span>
                                                            )}
                                                            {isRecommended && canPurchase && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-400 flex items-center gap-1">
                                                                    <Sparkles className="w-3 h-3" /> 推荐
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Description */}
                                                        <p className="text-sm text-noir-txt-muted">
                                                            {config.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Next Level / Action Area */}
                                                {!isMaxLevel && nextLevelConfig ? (
                                                    <div className="border-t border-noir-400 bg-noir-100/50">
                                                        {/* Next Level Info */}
                                                        <div className="px-4 py-3 flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                                                <span className="text-xs text-noir-txt-muted">Next Level:</span>
                                                                <span className="text-sm text-amber-400 font-medium">{nextLevelConfig.description}</span>
                                                                {nextLevelConfig.maintenanceCost && (
                                                                    <span className="text-red-400 text-[10px] ml-1">
                                                                        (维护费 ${nextLevelConfig.maintenanceCost}/天)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Feature Hint - functional unlock preview */}
                                                            {getUpgradeFeatureHints()[config.id]?.[currentLevel + 1] && (
                                                                <div className="flex items-center gap-2 ml-6">
                                                                    <Star className="w-3 h-3 text-yellow-500 shrink-0" />
                                                                    <span className="text-xs text-yellow-400/90 font-medium">
                                                                        {getUpgradeFeatureHints()[config.id][currentLevel + 1]}
                                                                    </span>
                                                                </div>
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
                                                                    {nextLevelCost}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                variant={canPurchase ? "primary" : "ghost"}
                                                                size="sm"
                                                                disabled={!canPurchase}
                                                                onClick={() => handlePurchase(config.id, config.nameCn, currentLevel + 1)}
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
                            </div>
                        );
                    })}
                </div>

                {/* Info Footer */}
                <div className="text-[10px] text-noir-txt-muted text-center border-t border-noir-400 pt-3 space-y-1">
                    <div><span className="text-purple-400">后屋设施</span> 升级无维护费用，永久生效。</div>
                    <div><span className="text-blue-400">柜台设备</span> 升级有每日维护费，可在夜间开关。</div>
                </div>
            </div>
        </Modal>
    );
};
