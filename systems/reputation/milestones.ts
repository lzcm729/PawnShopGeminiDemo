
import { ReputationMilestone } from './types';
import { ReputationType } from '../core/types';

export const REPUTATION_MILESTONES: ReputationMilestone[] = [
    // --- HUMANITY ---
    {
        id: 'hum_saint',
        label: "贫民窟圣徒 (Saint)",
        description: "你对弱者的仁慈在这个街区广为流传。",
        trigger: { type: ReputationType.HUMANITY, value: 70, operator: '>=' },
        icon: 'HeartHandshake',
        color: 'text-rose-500',
        effectDescription: "母亲心情改善，每日健康衰减 -1"
    },
    {
        id: 'hum_cold',
        label: "冷血动物 (Cold Blooded)",
        description: "人们都知道你只认钱不认人。",
        trigger: { type: ReputationType.HUMANITY, value: 10, operator: '<=' },
        icon: 'Snowflake',
        color: 'text-cyan-400',
        effectDescription: "只有走投无路的人才会来找你 (绝望顾客概率提升)"
    },

    // --- CREDIBILITY ---
    {
        id: 'cred_expert',
        label: "金字招牌 (Gold Standard)",
        description: "你的鉴定结果就是市场标准。",
        trigger: { type: ReputationType.CREDIBILITY, value: 60, operator: '>=' },
        icon: 'Award',
        color: 'text-amber-400',
        effectDescription: "每日行动点 (AP) 上限 +2"
    },
    {
        id: 'cred_scam',
        label: "奸商 (Scammer)",
        description: "大家都知道你的秤有问题。",
        trigger: { type: ReputationType.CREDIBILITY, value: 10, operator: '<=' },
        icon: 'AlertOctagon',
        color: 'text-red-500',
        effectDescription: "正常顾客会避开你的店"
    },

    // --- INNOCENCE ---
    {
        id: 'inn_lawful',
        label: "守法公民 (Law Abiding)",
        description: "警方将你视为合作伙伴，可能提供情报。",
        trigger: { type: ReputationType.INNOCENCE, value: 70, operator: '>=' },
        icon: 'Shield',
        color: 'text-blue-500',
        effectDescription: "警方友好，可能提供情报"
    },
    {
        id: 'inn_suspect',
        label: "嫌疑人 (Suspect)",
        description: "警方已经注意到你的店铺。",
        trigger: { type: ReputationType.INNOCENCE, value: 20, operator: '<=' },
        icon: 'AlertTriangle',
        color: 'text-orange-500',
        effectDescription: "可能触发突击检查事件"
    }
];
