/**
 * PoliceInvestigationModal
 *
 * Modal that appears when police are investigating the shop for stolen goods.
 * Player must choose to surrender the item or attempt to conceal it.
 */

import React from 'react';
import { useGame } from '../store/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import {
    Shield,
    AlertTriangle,
    Handshake,
    EyeOff,
    Scale,
    FileWarning,
    ShieldCheck,
    ShieldX
} from 'lucide-react';

export const PoliceInvestigationModal: React.FC = () => {
    const { state } = useGame();
    const { handlePoliceInvestigationDecision } = useGameEngine();

    const investigation = state.currentPoliceInvestigation;

    if (!investigation) return null;

    const { itemId, itemName } = investigation;

    const handleSurrender = () => {
        handlePoliceInvestigationDecision(true);
    };

    const handleConceal = () => {
        handlePoliceInvestigationDecision(false);
    };

    return (
        <Modal
            isOpen={true}
            onClose={() => {}} // Cannot close without making a decision
            title={
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span>POLICE INVESTIGATION</span>
                </div>
            }
            size="md"
            className="border-blue-900/50 bg-[#0a1628] shadow-[0_0_50px_rgba(59,130,246,0.2)]"
            noPadding
        >
            <div className="flex flex-col bg-[#050d1a] text-blue-400 font-mono relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>

                {/* Header Alert */}
                <div className="relative z-10 bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-blue-900/40 border-b border-blue-800/50 p-4">
                    <div className="flex items-center justify-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                        <div className="text-center">
                            <div className="text-xs uppercase tracking-widest text-blue-500 font-bold">
                                OFFICIAL NOTICE
                            </div>
                            <div className="text-lg text-white font-bold mt-0.5">
                                Law Enforcement Present
                            </div>
                        </div>
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 space-y-6">
                    {/* Situation Description */}
                    <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <FileWarning className="w-8 h-8 text-blue-400 shrink-0 mt-1" />
                            <div>
                                <p className="text-sm text-blue-100 leading-relaxed mb-3">
                                    警方正在调查您的店铺，声称有人举报店内存有来历不明的物品。
                                </p>
                                <p className="text-sm text-blue-100 leading-relaxed">
                                    他们发现了可疑物品：
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Suspicious Item Display */}
                    <div className="bg-red-950/20 border-2 border-red-800/50 rounded-lg p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-900/30 rounded border border-red-700 flex items-center justify-center">
                            <Scale className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-red-400 uppercase tracking-wider mb-0.5">
                                FLAGGED ITEM
                            </div>
                            <div className="text-lg text-white font-bold">
                                {itemName}
                            </div>
                        </div>
                    </div>

                    {/* Choice Explanation */}
                    <div className="text-center text-sm text-blue-300/80 font-serif italic">
                        "您需要做出选择，先生/女士..."
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option A: Surrender */}
                        <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4 hover:bg-blue-900/30 hover:border-blue-600/50 transition-all group">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-700 group-hover:border-blue-500 transition-colors">
                                    <Handshake className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-blue-200">
                                        配合调查
                                    </div>
                                    <div className="text-[10px] text-blue-500 uppercase">
                                        COOPERATE
                                    </div>
                                </div>
                            </div>
                            <ul className="text-xs space-y-1.5 mb-4">
                                <li className="flex items-center gap-2 text-blue-300/80">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    主动交出物品
                                </li>
                                <li className="flex items-center gap-2 text-teal-400">
                                    <ShieldCheck className="w-3 h-3" />
                                    Innocence +1
                                </li>
                                <li className="flex items-center gap-2 text-red-400">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                    物品被没收
                                </li>
                            </ul>
                            <Button
                                variant="primary"
                                onClick={handleSurrender}
                                className="w-full h-10 bg-blue-700 hover:bg-blue-600 border-blue-600 text-sm"
                            >
                                <Handshake className="w-4 h-4 mr-2" />
                                交出物品
                            </Button>
                        </div>

                        {/* Option B: Conceal */}
                        <div className="bg-stone-950/30 border border-stone-700/50 rounded-lg p-4 hover:bg-stone-900/30 hover:border-stone-600/50 transition-all group">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 bg-stone-800/50 rounded-full flex items-center justify-center border border-stone-600 group-hover:border-stone-500 transition-colors">
                                    <EyeOff className="w-5 h-5 text-stone-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-stone-200">
                                        隐瞒
                                    </div>
                                    <div className="text-[10px] text-stone-500 uppercase">
                                        DENY
                                    </div>
                                </div>
                            </div>
                            <ul className="text-xs space-y-1.5 mb-4">
                                <li className="flex items-center gap-2 text-stone-300/80">
                                    <span className="w-1.5 h-1.5 bg-stone-500 rounded-full"></span>
                                    声称店内没有赃物
                                </li>
                                <li className="flex items-center gap-2 text-red-400">
                                    <ShieldX className="w-3 h-3" />
                                    Innocence -3
                                </li>
                                <li className="flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    保留物品但引起怀疑
                                </li>
                            </ul>
                            <Button
                                variant="outline"
                                onClick={handleConceal}
                                className="w-full h-10 border-stone-600 text-stone-300 hover:bg-stone-800/50 hover:border-stone-500 text-sm"
                            >
                                <EyeOff className="w-4 h-4 mr-2" />
                                否认一切
                            </Button>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="text-center text-[10px] text-blue-600/60 uppercase tracking-wider pt-2 border-t border-blue-900/30">
                        THIS DECISION CANNOT BE UNDONE
                    </div>
                </div>
            </div>
        </Modal>
    );
};
