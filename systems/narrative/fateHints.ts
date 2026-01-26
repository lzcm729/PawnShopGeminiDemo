
import { ChainVariables } from './types';

interface FateHint {
  variableName: string;
  condition: (value: number) => boolean;
  hints: string[];
  priority: number;
}

export const FATE_HINTS: FateHint[] = [
  // --- HOPE (Mental State) ---
  {
    variableName: 'hope',
    condition: (v) => v >= 80,
    priority: 10,
    hints: [
      '（她的步伐轻快，嘴角甚至带着一丝若有若无的微笑）',
      '（看起来即使在阴雨天，他的心情也很不错）',
      '（眼神里有了光彩，不再像上次那样躲闪）'
    ]
  },
  {
    variableName: 'hope',
    condition: (v) => v <= 20,
    priority: 10,
    hints: [
      '（她的眼神空洞，仿佛灵魂已经被抽走了一半）',
      '（他长时间地盯着地板，手指在无意识地抽搐）',
      '（身上带着一股好几天没洗澡的颓废气息）'
    ]
  },
  
  // --- FUNDS (Financial State) ---
  {
    variableName: 'funds',
    condition: (v) => v >= 3000,
    priority: 5,
    hints: [
      '（换了一件看起来很新的外套，整个人精神了不少）',
      '（手里拿着一杯刚买的咖啡，显然手头宽裕了一些）'
    ]
  },
  {
    variableName: 'funds',
    condition: (v) => v <= 100,
    priority: 5,
    hints: [
      '（嘴唇干裂，看起来好像为了省钱连水都舍不得买）',
      '（衣服上的污渍比上次更多了，显然生活陷入了困顿）'
    ]
  },

  // --- JOB CHANCE (Specific to Emma) ---
  {
    variableName: 'job_chance',
    condition: (v) => v >= 50,
    priority: 8,
    hints: [
      '（手里紧紧攥着一个文件夹，看起来那是她的希望）',
      '（正在整理领口，似乎刚从一个重要的场合回来）'
    ]
  },

  // --- INTERVIEW FAILURES (Specific to Emma) ---
  {
    variableName: 'interview_failures',
    condition: (v) => v >= 2,
    priority: 7,
    hints: [
        '（她的眼圈发红，像是刚哭过）',
        '（手里攥着一张皱巴巴的纸，上面写着什么联系方式）',
        '（指甲被咬得参差不齐，透露着焦虑）'
    ]
  },

  // --- HOPE: MEDIUM (40-60) ---
  {
    variableName: 'hope',
    condition: (v) => v >= 40 && v < 60,
    priority: 6,
    hints: [
        '（她努力挤出一个微笑，但眼底的疲惫藏不住）',
        '（不时看向手机，像是在等什么重要消息）'
    ]
  },

  // --- HOPE: LOW BUT NOT BROKEN (20-40) ---
  {
    variableName: 'hope',
    condition: (v) => v >= 20 && v < 40,
    priority: 8,
    hints: [
        '（她的声音有些沙哑，像是好几天没怎么说话）',
        '（肩膀微微塌着，整个人像是被抽走了力气）',
        '（手指在不停地绞着衣角，透露出内心的不安）'
    ]
  }
];

export function generateFateHint(variables: ChainVariables): string | null {
  const applicableHints: string[] = [];
  let maxPriority = 0;

  for (const hint of FATE_HINTS) {
    // Check if variable exists in chain
    if (variables[hint.variableName] !== undefined) {
        const value = variables[hint.variableName];
        if (hint.condition(value)) {
            if (hint.priority > maxPriority) {
                maxPriority = hint.priority;
                applicableHints.length = 0; // Clear lower priority hints
            }
            if (hint.priority === maxPriority) {
                applicableHints.push(...hint.hints);
            }
        }
    }
  }

  if (applicableHints.length === 0) return null;
  return applicableHints[Math.floor(Math.random() * applicableHints.length)];
}
