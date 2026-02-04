
import React from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { HelpTooltip } from './ui/Tooltip';
import { Package, Wrench, Power, ToggleLeft, ToggleRight, Coins, Coffee, Scan } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCounterUpgradesForToggle, getTotalMaintenanceCost, getPatienceBonus, getAnomalyDetectionThreshold } from '../systems/upgrades';
import { PhaseIs } from '../systems/core/phases';

export const FacilityControlModal: React.FC = () => {
    const { state, dispatch } = useGame();

    if (!state.showFacilityControl) return null;

    const counterUpgrades = getCounterUpgradesForToggle(state.shopUpgrades);
    const totalMaintenanceCost = getTotalMaintenanceCost(state.shopUpgrades);
    const isNightPhase = PhaseIs.night(state.phase);
    const patienceBonus = getPatienceBonus(state.shopUpgrades);
    const anomalyThreshold = getAnomalyDetectionThreshold(state.shopUpgrades);

    const handleToggle = (upgradeId: string) => {
        if (!isNightPhase) return;
        dispatch({ type: 'TOGGLE_UPGRADE_ENABLED', payload: { upgradeId } });
    };

    const getSmallIcon = (iconName?: string) => {
        switch (iconName) {
            case 'Package': return <Package className="w-5 h-5" />;
            case 'Wrench': return <Wrench className="w-5 h-5" />;
            case 'Coffee': return <Coffee className="w-5 h-5" />;
            case 'Scan': return <Scan className="w-5 h-5" />;
            default: return <Package className="w-5 h-5" />;
        }
    };

    // No counter upgrades purchased yet
    if (counterUpgrades.length === 0) {
        return (
            <Modal
                isOpen={state.showFacilityControl}
                onClose={() => dispatch({ type: 'TOGGLE_FACILITY_CONTROL' })}
                title={
                    <span className="font-mono tracking-widest flex items-center gap-2">
                        <Power className="w-5 h-5" /> FACILITY_CONTROL
                        <HelpTooltip text="开关柜台设施。启用的设施提供被动效果（如增加耐心、检测仿品），但每日消耗维护费。" />
                    </span>
                }
                size="sm"
            >
                <div className="flex flex-col items-center justify-center py-8 text-noir-txt-muted">
                    <Power className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm text-center">No counter facilities purchased yet.</p>
                    <p className="text-xs mt-2 text-center opacity-70">
                        Purchase counter upgrades in the Upgrade Shop to manage them here.
                    </p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={state.showFacilityControl}
            onClose={() => dispatch({ type: 'TOGGLE_FACILITY_CONTROL' })}
            title={
                <span className="font-mono tracking-widest flex items-center gap-2">
                    <Power className="w-5 h-5" /> FACILITY_CONTROL
                    <HelpTooltip text="开关柜台设施。启用的设施提供被动效果（如增加耐心、检测仿品），但每日消耗维护费。" />
                </span>
            }
            size="md"
        >
            <div className="flex flex-col gap-4">
                {/* Summary Header */}
                <div className="bg-noir-200 border border-noir-400 rounded p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs uppercase tracking-widest text-noir-txt-muted mb-1">Daily Maintenance</h3>
                            <span className={cn(
                                "text-2xl font-mono font-bold",
                                totalMaintenanceCost > 0 ? "text-red-500" : "text-stone-500"
                            )}>
                                ${totalMaintenanceCost}/day
                            </span>
                        </div>
                        {!isNightPhase && (
                            <div className="bg-amber-950/50 border border-amber-900 rounded px-3 py-2">
                                <span className="text-xs text-amber-400">Toggle at night only</span>
                            </div>
                        )}
                    </div>

                    {/* Active Effects Summary */}
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

                {/* Facility List */}
                <div className="space-y-3">
                    {counterUpgrades.map(upgrade => (
                        <div
                            key={upgrade.upgradeId}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-lg border transition-all",
                                upgrade.enabled
                                    ? "bg-blue-950/30 border-blue-800"
                                    : "bg-noir-300/50 border-noir-400 opacity-70"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-lg flex items-center justify-center",
                                    upgrade.enabled ? "bg-blue-900/50 text-blue-400" : "bg-noir-400 text-noir-txt-muted"
                                )}>
                                    {getSmallIcon(upgrade.icon)}
                                </div>
                                <div>
                                    <div className="text-base font-mono text-noir-txt-primary flex items-center gap-2">
                                        {upgrade.nameCn}
                                        <span className="text-xs text-noir-txt-muted bg-noir-400/50 px-1.5 py-0.5 rounded">
                                            Lv{upgrade.currentLevel}
                                        </span>
                                    </div>
                                    <div className="text-sm text-noir-txt-muted flex items-center gap-2 mt-1">
                                        <Coins className="w-4 h-4 text-red-500" />
                                        <span className={upgrade.enabled ? "text-red-400" : "text-stone-500"}>
                                            {upgrade.enabled ? `-$${upgrade.maintenanceCost}/day` : "Disabled - No cost"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle(upgrade.upgradeId)}
                                disabled={!isNightPhase}
                                className={cn(
                                    "transition-all p-2 rounded-lg",
                                    isNightPhase
                                        ? "cursor-pointer hover:bg-noir-400/50"
                                        : "cursor-not-allowed opacity-50"
                                )}
                            >
                                {upgrade.enabled ? (
                                    <ToggleRight className="w-10 h-10 text-green-500" />
                                ) : (
                                    <ToggleLeft className="w-10 h-10 text-stone-500" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Info Footer */}
                <div className="text-xs text-noir-txt-muted text-center border-t border-noir-400 pt-3">
                    <span className="text-blue-400">Counter</span> facilities have daily maintenance costs.
                    Disable them to save money when not needed.
                </div>
            </div>
        </Modal>
    );
};
