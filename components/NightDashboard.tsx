
import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameMachine } from '../hooks/useGameMachine';
import { Button } from './ui/Button';
import { Moon, Heart, Briefcase, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { playSfx } from '../systems/game/audio';
import { InnerVoiceDisplay } from './InnerVoiceDisplay';
import { getBedtimeMonologue } from '../systems/narrative/innerVoiceRegistry';
import { InsightPanel } from './night/InsightPanel';
import { WorkshopPanel } from './night/WorkshopPanel';
import { AppointmentBoardPanel } from './night/AppointmentBoardPanel';
import { BlackmarketPanel } from './night/BlackmarketPanel';
import { AbilityPanel } from './night/AbilityPanel';
import { UpgradeShopModal } from './UpgradeShopModal';
import { FacilityControlModal } from './FacilityControlModal';
import { getHeatLevel } from '../systems/blackmarket/types';
import { useSettlementCeremony } from '../hooks/useFinancialProjection';
import { Tooltip } from './ui/Tooltip';
import { ReputationType } from '../systems/core/types';
import { getNarrativeAnchor } from '../systems/reputation';
import { getEffectiveInventoryCapacity, BASE_INVENTORY_CAPACITY, hasAppointmentBoard, getAppointmentBoardLevel, getCounterUpgradesForToggle, getTotalMaintenanceCost, hasBlackMarketContact, hasPrecisionBench, getUpgradeLevel, getEffectiveNightEnergy, getBlackMarketContactLevel, hasCultivationRoom } from '../systems/upgrades';
import { GAME_CONFIG } from '../systems/game/config';
import { NightHeader } from './night/NightHeader';
import { NightActionBar } from './night/NightActionBar';

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
    const showAbilityPanel = state.showAbilityPanel;

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

    // Cultivation state
    const hasCultivation = hasCultivationRoom(state.shopUpgrades);
    const cultivationLevel = getUpgradeLevel('cultivation_room', state.shopUpgrades);

    // Black market state
    const hasBlackMarket = hasBlackMarketContact(state.shopUpgrades);
    // S1-I8: Backroom upgrade levels for presence indicators
    const storageLevel = getUpgradeLevel('storage_expansion', state.shopUpgrades);
    const workshopLevel = getUpgradeLevel('precision_bench', state.shopUpgrades);
    const blackMarketLevel = getBlackMarketContactLevel(state.shopUpgrades);
    const currentEnergy = getEffectiveNightEnergy(state.shopUpgrades);
    const currentCapacity = getEffectiveInventoryCapacity(state.shopUpgrades);

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

    // Reputation micro-feedback: track previous values and show delta (I9)
    const prevReputation = useRef(reputation);
    const [repDelta, setRepDelta] = useState<{
        humanity?: number; credibility?: number; innocence?: number;
    } | null>(null);

    useEffect(() => {
        const prev = prevReputation.current;
        const dH = reputation[ReputationType.HUMANITY] - prev[ReputationType.HUMANITY];
        const dC = reputation[ReputationType.CREDIBILITY] - prev[ReputationType.CREDIBILITY];
        const dI = reputation[ReputationType.INNOCENCE] - prev[ReputationType.INNOCENCE];

        if (dH !== 0 || dC !== 0 || dI !== 0) {
            setRepDelta({
                humanity: dH !== 0 ? dH : undefined,
                credibility: dC !== 0 ? dC : undefined,
                innocence: dI !== 0 ? dI : undefined,
            });
            const timer = setTimeout(() => setRepDelta(null), 2500);
            prevReputation.current = reputation;
            return () => clearTimeout(timer);
        }
        prevReputation.current = reputation;
    }, [reputation]);

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
        <div className="h-screen w-full bg-[#050505] relative overflow-hidden font-mono text-stone-400 flex flex-col items-center justify-center cursor-game-night">

            {showMonologue && (
                <InnerVoiceDisplay text={monologueText} onComplete={completeNight} />
            )}

            {/* Background: Pawn Shop Night Interior */}
            <div className="absolute inset-0 bg-[url('/backgrounds/night_dashboard.png')] bg-cover bg-center opacity-25 blur-[2px] pointer-events-none"></div>
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
                    <NightHeader
                        stats={stats}
                        isOverdue={isOverdue}
                        daysUntilBill={daysUntilBill}
                        dispatch={dispatch}
                        ceremony={ceremony}
                    />

                    {/* Admin Actions */}
                    <NightActionBar
                        unreadMail={unreadMail}
                        activeItems={activeItems}
                        hasBoardUnlocked={hasBoardUnlocked}
                        boardLevel={boardLevel}
                        appointedCount={appointedCount}
                        hasCounterFacilities={hasCounterFacilities}
                        maintenanceCost={maintenanceCost}
                        hasWorkshop={hasWorkshop}
                        workshopLevel={workshopLevel}
                        hasCultivation={hasCultivation}
                        cultivationLevel={cultivationLevel}
                        hasBlackMarket={hasBlackMarket}
                        blackMarketLevel={blackMarketLevel}
                        storageLevel={storageLevel}
                        currentCapacity={currentCapacity}
                        currentEnergy={currentEnergy}
                        nightEnergy={state.nightState.energy}
                        maxNightEnergy={state.nightState.maxEnergy}
                        blackmarketHeatLevel={blackmarketHeatLevel}
                        isBlackmarketLocked={isBlackmarketLocked}
                        hasRiskEvent={hasRiskEvent}
                        forfeitItems={forfeitItems}
                        unseenForfeitItemIds={state.unseenForfeitItemIds}
                        dispatch={dispatch}
                        onShowAppointmentBoard={() => setShowAppointmentBoard(true)}
                        onShowBlackmarket={() => setShowBlackmarket(true)}
                    />
                </div>

                {/* Right: Status Panel */}
                <div className="w-1/3 flex flex-col items-center justify-center border-l border-stone-800 pl-8">

                    {/* Cash Position */}
                    <div className="text-center mb-6">
                        <div className="text-[10px] uppercase text-stone-600 mb-2 tracking-[0.2em]">Net Cash Position</div>
                        <div className="text-3xl font-mono text-stone-200">${stats.cash}</div>
                    </div>


                    {/* Reputation Bars (with micro-feedback delta animation - I9) */}
                    <div className="flex flex-col gap-3 mb-6 w-full max-w-[200px]">
                        <div className="text-[10px] uppercase text-stone-600 tracking-[0.2em] text-center">Reputation</div>

                        <Tooltip content={<div className="text-xs"><span className="font-bold">Humanity:</span> {reputation[ReputationType.HUMANITY]}%{(() => { const a = getNarrativeAnchor(ReputationType.HUMANITY, reputation[ReputationType.HUMANITY]); return a ? <><br/><span className="italic text-stone-400">{a.description}</span></> : null; })()}</div>}>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3 relative">
                                    <Heart className={cn("w-4 h-4 text-red-400 shrink-0 transition-transform duration-300", repDelta?.humanity && "scale-125")} />
                                    <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${reputation[ReputationType.HUMANITY]}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-stone-500 w-8 text-right">{reputation[ReputationType.HUMANITY]}%</span>
                                    {repDelta?.humanity != null && (
                                        <span className={cn(
                                            "absolute -right-8 text-[10px] font-mono font-bold animate-bounce",
                                            repDelta.humanity > 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {repDelta.humanity > 0 ? '+' : ''}{repDelta.humanity}
                                        </span>
                                    )}
                                </div>
                                {(() => { const a = getNarrativeAnchor(ReputationType.HUMANITY, reputation[ReputationType.HUMANITY]); return a ? <div className="text-[9px] text-red-400/60 font-serif italic pl-7 truncate" title={a.description}>{a.description}</div> : null; })()}
                            </div>
                        </Tooltip>

                        <Tooltip content={<div className="text-xs"><span className="font-bold">Credibility:</span> {reputation[ReputationType.CREDIBILITY]}%{(() => { const a = getNarrativeAnchor(ReputationType.CREDIBILITY, reputation[ReputationType.CREDIBILITY]); return a ? <><br/><span className="italic text-stone-400">{a.description}</span></> : null; })()}</div>}>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3 relative">
                                    <Briefcase className={cn("w-4 h-4 text-amber-400 shrink-0 transition-transform duration-300", repDelta?.credibility && "scale-125")} />
                                    <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${reputation[ReputationType.CREDIBILITY]}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-stone-500 w-8 text-right">{reputation[ReputationType.CREDIBILITY]}%</span>
                                    {repDelta?.credibility != null && (
                                        <span className={cn(
                                            "absolute -right-8 text-[10px] font-mono font-bold animate-bounce",
                                            repDelta.credibility > 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {repDelta.credibility > 0 ? '+' : ''}{repDelta.credibility}
                                        </span>
                                    )}
                                </div>
                                {(() => { const a = getNarrativeAnchor(ReputationType.CREDIBILITY, reputation[ReputationType.CREDIBILITY]); return a ? <div className="text-[9px] text-amber-400/60 font-serif italic pl-7 truncate" title={a.description}>{a.description}</div> : null; })()}
                            </div>
                        </Tooltip>

                        <Tooltip content={<div className="text-xs"><span className="font-bold">Innocence:</span> {reputation[ReputationType.INNOCENCE]}%{(() => { const a = getNarrativeAnchor(ReputationType.INNOCENCE, reputation[ReputationType.INNOCENCE]); return a ? <><br/><span className="italic text-stone-400">{a.description}</span></> : null; })()}</div>}>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3 relative">
                                    <Shield className={cn("w-4 h-4 text-blue-400 shrink-0 transition-transform duration-300", repDelta?.innocence && "scale-125")} />
                                    <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${reputation[ReputationType.INNOCENCE]}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-stone-500 w-8 text-right">{reputation[ReputationType.INNOCENCE]}%</span>
                                    {repDelta?.innocence != null && (
                                        <span className={cn(
                                            "absolute -right-8 text-[10px] font-mono font-bold animate-bounce",
                                            repDelta.innocence > 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {repDelta.innocence > 0 ? '+' : ''}{repDelta.innocence}
                                        </span>
                                    )}
                                </div>
                                {(() => { const a = getNarrativeAnchor(ReputationType.INNOCENCE, reputation[ReputationType.INNOCENCE]); return a ? <div className="text-[9px] text-blue-400/60 font-serif italic pl-7 truncate" title={a.description}>{a.description}</div> : null; })()}
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

            {/* Ability Panel Modal */}
            <AbilityPanel
                isOpen={showAbilityPanel}
                onClose={() => dispatch({ type: 'TOGGLE_ABILITY_PANEL' })}
            />
        </div>
    );
};
