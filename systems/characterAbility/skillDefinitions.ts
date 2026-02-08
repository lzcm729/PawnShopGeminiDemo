/**
 * Character Ability System - Skill Definitions
 *
 * All 12 skills with their static configuration.
 * Costs, prerequisites, descriptions, and monologues from design doc v1.4.
 */

import { AbilitySkillDef, SkillId } from './types';

// ============================================================================
// Skill Registry
// ============================================================================

export const SKILL_DEFINITIONS: Record<SkillId, AbilitySkillDef> = {
  // === Craft Pure Path (匠心系) ===

  SENSE_HIDDEN: {
    id: 'SENSE_HIDDEN',
    name: '察隐',
    englishName: 'Sense Hidden',
    description: '开始鉴定前，物品散发微弱光晕提示是否存在隐藏特征（有/无）',
    path: 'CRAFT',
    tier: 'T1',
    essenceCost: { craft: 50 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'APPRAISAL',
    prerequisites: [],
    learnMonologue: '你的手指掠过物品表面，第一次感到......有些东西藏在看不见的地方。',
  },

  PIERCE_ILLUSION: {
    id: 'PIERCE_ILLUSION',
    name: '破妄',
    englishName: 'Pierce Illusion',
    description: '若物品为赝品(FAKE)，首次鉴定直接揭示；非赝品时，首次鉴定必定发现一个隐藏特征',
    path: 'CRAFT',
    tier: 'T2',
    essenceCost: { craft: 100 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'APPRAISAL',
    prerequisites: ['SENSE_HIDDEN'],
    learnMonologue: '你看着那枚戒指，它在所有人眼中是完美的。但你看到了——镀层下的铜绿。你在想，你更羡慕看不到的人，还是看到的自己。',
  },

  // === Time Pure Path (旧影系) ===

  APPLY_PRESSURE: {
    id: 'APPLY_PRESSURE',
    name: '施压',
    englishName: 'Apply Pressure',
    description: '直接降低客户心理底价 8%，耐心 -1。每次议价限用一次',
    path: 'TIME',
    tier: 'T1',
    essenceCost: { time: 50 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'NEGOTIATION',
    apCost: 1,
    prerequisites: [],
    learnMonologue: '做了这么多笔交易之后，你明白了——价格从来不是固定的。',
  },

  HEART_STRIKE: {
    id: 'HEART_STRIKE',
    name: '攻心',
    englishName: 'Heart Strike',
    description: '直接降低客户心理底价 10%，不消耗耐心。每次议价限用一次',
    path: 'TIME',
    tier: 'T2',
    essenceCost: { time: 100 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'NEGOTIATION',
    apCost: 1,
    prerequisites: ['APPLY_PRESSURE'],
    learnMonologue: '你发现，最有效的武器不是真相——是对方心里那道裂缝。',
  },

  // === Vibe Pure Path (灵韵系) ===

  EMPATHY: {
    id: 'EMPATHY',
    name: '共情',
    englishName: 'Empathy',
    description: '使用洞察系统时，同样 1 AP 可多揭示一层信息',
    path: 'VIBE',
    tier: 'T1',
    essenceCost: { vibe: 50 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: [],
    learnMonologue: '你开始听到话语背后的声音——那些没有说出口的恐惧和期望。',
  },

  COMFORT: {
    id: 'COMFORT',
    name: '抚慰',
    englishName: 'Comfort',
    description: '送客时对困境中的 NPC 正向影响事件链（hope +5，人情 +1）',
    path: 'VIBE',
    tier: 'T2',
    essenceCost: { vibe: 100 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'DEPARTURE',
    apCost: 0,
    prerequisites: ['EMPATHY'],
    learnMonologue: '你无法改变什么。但一句话，有时候比一叠钞票更有重量。',
  },

  // === Time+Craft Fusion (旧影+匠心 -- 暗路) ===

  SHARP_SCRUTINY: {
    id: 'SHARP_SCRUTINY',
    name: '明察秋毫',
    englishName: 'Sharp Scrutiny',
    description: '每发现 1 个 FLAW 特征，客户心理底价自动降低 3%',
    path: 'TIME_CRAFT',
    tier: 'T1',
    essenceCost: { time: 30, craft: 30 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: ['APPLY_PRESSURE', 'SENSE_HIDDEN'],
    learnMonologue: '你第一次对着一块划痕笑了。他注意到了你的笑容，不安地低下了头。',
  },

  POKER_FACE: {
    id: 'POKER_FACE',
    name: '不动声色',
    englishName: 'Poker Face',
    description: '发现 FLAW 时不再消耗客户耐心',
    path: 'TIME_CRAFT',
    tier: 'T2',
    essenceCost: { time: 60, craft: 60 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'APPRAISAL',
    prerequisites: ['SHARP_SCRUTINY'],
    learnMonologue: '你的手摸到了裂缝，脸上却微笑着说\'品相不错\'。他信了。你发现，说谎原来这么容易。',
  },

  // === Craft+Vibe Fusion (匠心+灵韵 -- 明路) ===

  CHERISH_ALL: {
    id: 'CHERISH_ALL',
    name: '惜物如人',
    englishName: 'Cherish All',
    description: '慈善/援助档成交后，送客阶段解锁"额外关照"按钮',
    path: 'CRAFT_VIBE',
    tier: 'T1',
    essenceCost: { craft: 30, vibe: 30 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'DEPARTURE',
    apCost: 0,
    prerequisites: ['SENSE_HIDDEN', 'EMPATHY'],
    learnMonologue: '你开始相信——善意不会消失，它只是换了一种形式回来。',
  },

  WORD_OF_MOUTH: {
    id: 'WORD_OF_MOUTH',
    name: '口口相传',
    englishName: 'Word of Mouth',
    description: '每次使用"额外关照"后，3-5天后有概率获得推荐客户',
    path: 'CRAFT_VIBE',
    tier: 'T2',
    essenceCost: { craft: 60, vibe: 60 },
    energyCost: 1,
    activation: 'PASSIVE',
    prerequisites: ['CHERISH_ALL'],
    learnMonologue: '门口站着一个你从没见过的人。她说，\'有个人让我来找你。说你会帮忙的。\'你不记得帮过谁。',
  },

  // === Time+Vibe Fusion (旧影+灵韵 -- 慧路) ===

  FORESIGHT: {
    id: 'FORESIGHT',
    name: '洞若观火',
    englishName: 'Foresight',
    description: '议价开始时，自动感知客户赎回意愿（仅高或低时触发）',
    path: 'TIME_VIBE',
    tier: 'T1',
    essenceCost: { time: 30, vibe: 30 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: ['APPLY_PRESSURE', 'EMPATHY'],
    learnMonologue: '你看着他的背影，突然知道——他不会回来了。',
  },

  SEE_CONSEQUENCE: {
    id: 'SEE_CONSEQUENCE',
    name: '因果自见',
    englishName: 'See Consequence',
    description: '悬停合同档位时显示命运色彩暗示；交易后获得命运闪现',
    path: 'TIME_VIBE',
    tier: 'T2',
    essenceCost: { time: 60, vibe: 60 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: ['FORESIGHT'],
    learnMonologue: '从今以后，每一笔交易都不再只是数字。你看到了它的重量。',
  },
};

// ============================================================================
// Convenience Lists
// ============================================================================

export const ALL_SKILL_IDS: SkillId[] = Object.keys(SKILL_DEFINITIONS) as SkillId[];

export const PURE_CRAFT_SKILLS: SkillId[] = ['SENSE_HIDDEN', 'PIERCE_ILLUSION'];
export const PURE_TIME_SKILLS: SkillId[] = ['APPLY_PRESSURE', 'HEART_STRIKE'];
export const PURE_VIBE_SKILLS: SkillId[] = ['EMPATHY', 'COMFORT'];

export const DARK_PATH_SKILLS: SkillId[] = ['SHARP_SCRUTINY', 'POKER_FACE'];
export const BRIGHT_PATH_SKILLS: SkillId[] = ['CHERISH_ALL', 'WORD_OF_MOUTH'];
export const WISDOM_PATH_SKILLS: SkillId[] = ['FORESIGHT', 'SEE_CONSEQUENCE'];

export const FUSION_SKILLS: SkillId[] = [
  ...DARK_PATH_SKILLS,
  ...BRIGHT_PATH_SKILLS,
  ...WISDOM_PATH_SKILLS,
];

/**
 * Get skill definition by ID.
 */
export function getSkillDef(id: SkillId): AbilitySkillDef {
  return SKILL_DEFINITIONS[id];
}
