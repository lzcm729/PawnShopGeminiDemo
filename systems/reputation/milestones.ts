
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

    // --- UNDERWORLD ---
    {
        id: 'und_fixer',
        label: "中间人 (The Fixer)",
        description: "地下世界把你视为可靠的销赃渠道。",
        trigger: { type: ReputationType.UNDERWORLD, value: 40, operator: '>=' },
        icon: 'Ghost',
        color: 'text-purple-500',
        effectDescription: "夜间遭遇抢劫/破坏的风险降低"
    },
    {
        id: 'und_target',
        label: "肥羊 (Soft Target)",
        description: "你在道上毫无根基，好欺负。",
        trigger: { type: ReputationType.UNDERWORLD, value: 0, operator: '<=' },
        icon: 'Target',
        color: 'text-stone-500',
        effectDescription: "夜间安全风险增加"
    }
];
