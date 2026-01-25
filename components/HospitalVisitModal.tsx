
import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Activity, Heart, Stethoscope, User, LogOut, MessageCircle, Wallet, ArrowRight, Store, Hourglass, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { TypewriterText } from './ui/TextEffects';
import { playSfx } from '../systems/game/audio';
import { ReputationType } from '../types';

type VisitView = 'MAIN' | 'TALK_MENU' | 'TALK_DISPLAY' | 'DOCTOR';
type Topic = 'SHOP' | 'MEMORIES' | 'FUTURE';

export const HospitalVisitModal: React.FC = () => {
    const { state, dispatch } = useGame();
    const { motherStatus, visitedToday, medicalBill } = state.stats;
    const [view, setView] = useState<VisitView>('MAIN');
    const [currentDialogue, setCurrentDialogue] = useState("");
    const [actionTaken, setActionTaken] = useState(false);

    // Reset view when modal opens
    useEffect(() => {
        if (state.showVisit) {
            setView('MAIN');
            setActionTaken(state.stats.visitedToday);
        }
    }, [state.showVisit, state.stats.visitedToday]);

    if (!state.showVisit) return null;

    const handleComfort = () => {
        playSfx('SUCCESS');
        dispatch({ type: 'VISIT_MOTHER' });
        setActionTaken(true);
    };

    const handleClose = () => {
        dispatch({ type: 'TOGGLE_VISIT' });
        setView('MAIN');
    };

    const handleOpenMedical = () => {
        dispatch({ type: 'TOGGLE_MEDICAL' });
    };

    const getDynamicDialogue = (topic: Topic) => {
        const { reputation, stats, activeChains } = state;
        const { cash, targetSavings } = stats;
        const underworld = reputation[ReputationType.UNDERWORLD];
        const humanity = reputation[ReputationType.HUMANITY];

        // --- NARRATIVE CHECKS (Priority High) ---
        // Check Emma's Chain (The Girl with Laptop)
        const emmaChain = activeChains.find(c => c.id === 'chain_emma');
        const emmaHope = emmaChain?.variables?.hope || 50;
        
        // Check Zhao's Chain (The Veteran)
        const zhaoChain = activeChains.find(c => c.id === 'chain_zhao');
        const zhaoTrust = zhaoChain?.variables?.trust || 50;

        if (topic === 'SHOP') {
            // 1. Specific Story Reactions
            if (emmaHope < 20) {
                return "你今天看起来心事重重... 就像是你弄丢了什么重要的东西。孩子，有些生意要是太亏心，咱们就不做了吧。";
            }
            if (zhaoTrust > 70) {
                return "你今天的眼神很亮，像你父亲当年帮了邻居后的样子。看来店里发生了好事？";
            }
            if (zhaoTrust < 30 && zhaoChain?.isActive) {
                return "为什么我觉得... 你身上有一股我很陌生的冷漠？是不是有个老人去过店里？我昨晚梦见有人在哭。";
            }

            // 2. Stat Reactions
            if (underworld > 30) return "昨晚我做了个噩梦... 梦见店里有些黑影，还有血腥味。孩子，你没在做什么危险的生意吧？";
            if (cash < 200) return "看你的脸色不太好，衣服也旧了... 是不是钱又不够了？如果太勉强，就把店盘出去吧，别为了我硬撑。";
            if (cash > 3000 && humanity < 20) return "我想吃苹果了... 以前你总会记得买。现在你赚钱了，可我觉得我们离得更远了。";
            
            return "那家店是你父亲的心血。只要它还开着，我就觉得他还活着。生意还顺利吗？";
        }
        
        if (topic === 'MEMORIES') {
            if (humanity < 20) return "你小时候眼神多清澈啊... 总是笑着帮街坊邻居跑腿。现在我看这双眼睛，有时候觉得好陌生，冷冰冰的。";
            return "还记得你爸爸教你用放大镜看玉的时候吗？他说，玉有五德，人也要有。那时候你踩在板凳上，听得可认真了。";
        }
        
        if (topic === 'FUTURE') {
            if (motherStatus.status === 'Critical') return "别谈以后了... 我能感觉到，时间不多了。孩子，答应我，如果我走了，你要做一个好人。";
            if (cash >= targetSavings * 0.4) return "最近我觉得身上有力气了。也许... 只要手术顺利，明年春天我们真能去海边看看。";
            return "别想太远。过好今天就行。只要你平平安安的，我就知足了。";
        }
        return "...";
    };

    const selectTopic = (topic: Topic) => {
        playSfx('CLICK');
        const text = getDynamicDialogue(topic);
        setCurrentDialogue(text);
        setView('TALK_DISPLAY');
    };

    const getDoctorReport = () => {
        if (motherStatus.health <= 0) return "心跳停止。我们尽力了...";
        if (motherStatus.risk > 40) return "情况非常危急！如果不立即进行稳定治疗，今晚很难熬过去。建议立刻去缴费终端确认药物供给。";
        if (motherStatus.risk > 20) return "各项指标出现波动，需要密切关注。目前的药物剂量可能不够。";
        return "目前状况相对稳定。继续保持这种治疗方案，不要断药。";
    };

    const getRiskLevelColor = () => {
        if (motherStatus.risk > 40) return "text-red-500 animate-pulse";
        if (motherStatus.risk > 20) return "text-amber-500";
        return "text-blue-400";
    };

    return (
        <Modal
            isOpen={state.showVisit}
            onClose={handleClose}
            title={<><Activity className="w-5 h-5 text-blue-400 animate-pulse" /> ICU - WARD 304</>}
            size="lg"
            className="border-blue-900 bg-[#080b14] shadow-[0_0_50px_rgba(59,130,246,0.15)]"
            noPadding
        >
            <div className="flex flex-col h-[550px] bg-[#050508] text-blue-200 relative overflow-hidden font-mono">
                
                {/* Background: Sterile & Cold */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent_70%)] pointer-events-none"></div>
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>

                {/* Content Container */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center relative z-10">
                    
                    {/* Visual: Bed / Monitor */}
                    <div className="w-full max-w-md mb-6 flex justify-center">
                        <div className={cn("w-64 h-32 border rounded-lg bg-black/40 relative flex items-center justify-center overflow-hidden transition-colors duration-500", motherStatus.risk > 40 ? "border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : "border-blue-900/50")}>
                            {/* EKG Line Animation */}
                            <div className="absolute inset-0 flex items-center">
                                <svg viewBox="0 0 500 100" className={cn("w-full h-20 fill-none stroke-2 opacity-80", motherStatus.risk > 40 ? "stroke-red-500" : "stroke-blue-500")}>
                                    <path d="M0,50 L50,50 L60,20 L70,80 L80,50 L150,50 L160,20 L170,80 L180,50 L250,50 L260,20 L270,80 L280,50 L350,50 L360,20 L370,80 L380,50 L500,50" className="animate-[dash_2s_linear_infinite]" strokeDasharray="500" strokeDashoffset="500" />
                                </svg>
                            </div>
                            <div className={cn("absolute top-2 right-2 text-[10px] animate-pulse", motherStatus.risk > 40 ? "text-red-500" : "text-blue-400")}>
                                {motherStatus.risk > 40 ? "CRITICAL ALERT" : "LIVE MONITORING"}
                            </div>
                            <div className="absolute bottom-2 left-2 text-2xl font-bold text-white tracking-widest">{Math.round(motherStatus.health)} BPM</div>
                        </div>
                    </div>

                    {/* Dialogue / Interaction Area */}
                    <div className="w-full max-w-2xl bg-blue-950/10 border border-blue-900/30 p-6 rounded-lg min-h-[160px] flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
                        
                        {view === 'MAIN' && (
                            <p className="text-lg italic text-blue-100 font-serif animate-in fade-in">
                                {actionTaken 
                                    ? "她在药物的作用下睡得很沉。监护仪发出有节奏的滴答声。" 
                                    : "她醒着，眼神有些浑浊，正望着窗外的霓虹灯反光发呆。"}
                            </p>
                        )}

                        {view === 'TALK_MENU' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full animate-in fade-in slide-in-from-bottom-2">
                                <button onClick={() => selectTopic('SHOP')} className="p-3 border border-blue-800/50 rounded bg-blue-900/10 hover:bg-blue-800/30 flex flex-col items-center gap-2 group transition-all hover:scale-105">
                                    <Store className="w-6 h-6 text-blue-400 group-hover:text-white" />
                                    <span className="text-xs font-bold uppercase tracking-wider">谈谈店铺</span>
                                </button>
                                <button onClick={() => selectTopic('MEMORIES')} className="p-3 border border-blue-800/50 rounded bg-blue-900/10 hover:bg-blue-800/30 flex flex-col items-center gap-2 group transition-all hover:scale-105">
                                    <Brain className="w-6 h-6 text-blue-400 group-hover:text-white" />
                                    <span className="text-xs font-bold uppercase tracking-wider">回忆往事</span>
                                </button>
                                <button onClick={() => selectTopic('FUTURE')} className="p-3 border border-blue-800/50 rounded bg-blue-900/10 hover:bg-blue-800/30 flex flex-col items-center gap-2 group transition-all hover:scale-105">
                                    <Hourglass className="w-6 h-6 text-blue-400 group-hover:text-white" />
                                    <span className="text-xs font-bold uppercase tracking-wider">展望未来</span>
                                </button>
                            </div>
                        )}

                        {view === 'TALK_DISPLAY' && (
                            <div className="animate-in fade-in relative w-full">
                                <div className="absolute top-0 left-0 text-[60px] font-serif text-blue-900/20 leading-none -translate-x-2 -translate-y-4">“</div>
                                <p className="text-lg text-white font-serif leading-relaxed px-6">
                                    <TypewriterText text={currentDialogue} speed={40} />
                                </p>
                                <div className="mt-6 flex justify-center">
                                    <Button size="sm" variant="ghost" onClick={() => setView('TALK_MENU')} className="text-xs text-blue-500">
                                        <ArrowRight className="w-3 h-3 mr-1" /> 返回话题
                                    </Button>
                                </div>
                            </div>
                        )}

                        {view === 'DOCTOR' && (
                            <div className="text-left w-full animate-in fade-in">
                                <div className="text-xs uppercase text-blue-500 font-bold mb-2 flex items-center justify-between border-b border-blue-800/30 pb-2">
                                    <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4"/> Doctor's Report</span>
                                    <span className={cn("text-[10px]", getRiskLevelColor())}>RISK LEVEL: {motherStatus.risk}%</span>
                                </div>
                                <p className="text-sm text-blue-200 leading-relaxed font-mono mb-4">
                                    <TypewriterText text={getDoctorReport()} speed={20} />
                                </p>
                                
                                <div className="flex justify-end pt-2 border-t border-blue-800/30">
                                    <Button 
                                        size="sm" 
                                        variant="primary" 
                                        className="bg-teal-700 hover:bg-teal-600 border-none text-[10px] h-8"
                                        onClick={handleOpenMedical}
                                    >
                                        <Wallet className="w-3 h-3 mr-2" /> 前往缴费终端
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    {view === 'MAIN' && (
                        <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-2xl animate-in slide-in-from-bottom-4">
                            <Button 
                                onClick={() => { setView('TALK_MENU'); playSfx('CLICK'); }}
                                variant="secondary"
                                className="border-blue-800 text-blue-300 hover:bg-blue-900/30"
                            >
                                <MessageCircle className="w-4 h-4 mr-2" /> 说 话 (Talk)
                            </Button>

                            <Button 
                                onClick={handleComfort}
                                variant="primary"
                                className={cn(
                                    "bg-blue-700 hover:bg-blue-600 border-transparent shadow-[0_0_15px_rgba(29,78,216,0.3)]",
                                    actionTaken && "opacity-50 cursor-not-allowed bg-blue-900 text-blue-400 grayscale"
                                )}
                                disabled={actionTaken}
                            >
                                <Heart className="w-4 h-4 mr-2" /> 
                                {actionTaken ? "已陪伴 (Done)" : "陪 伴 (Comfort)"}
                            </Button>

                            <Button 
                                onClick={() => { setView('DOCTOR'); playSfx('CLICK'); }}
                                variant="secondary"
                                className="border-blue-800 text-blue-300 hover:bg-blue-900/30"
                            >
                                <Stethoscope className="w-4 h-4 mr-2" /> 询问医生
                            </Button>
                        </div>
                    )}

                    {view !== 'MAIN' && view !== 'TALK_DISPLAY' && (
                        <button 
                            onClick={() => setView('MAIN')}
                            className="mt-8 text-xs text-blue-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                        >
                            <ArrowRight className="w-3 h-3 rotate-180" /> Back
                        </button>
                    )}

                    {/* Global Exit */}
                    <button 
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-xs text-blue-700 hover:text-blue-400 flex items-center gap-1 uppercase tracking-widest transition-colors"
                    >
                        <LogOut className="w-3 h-3" /> Leave Hospital
                    </button>

                </div>
            </div>
            <style>{`
                @keyframes dash {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </Modal>
    );
};
