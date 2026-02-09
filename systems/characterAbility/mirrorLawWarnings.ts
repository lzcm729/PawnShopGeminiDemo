/**
 * Mirror Law Warnings (镜鉴法则警告)
 *
 * When the player's Innocence (清白) drops into the 40-30 range,
 * the game delivers escalating narrative signals across three channels,
 * following the "inside-out" (由内而外) arc from design doc v1.4 §8.3:
 *
 *   Level 1 (Innocence <= 40): MONOLOGUE — Inner mirror (内在镜子)
 *     The protagonist's private unease: nighttime reflections, fragmented
 *     memories, self-doubt. First-person, introspective.
 *
 *   Level 2 (Innocence <= 35): MAIL — Social mirror (社会镜子)
 *     Anonymous letters and veiled hints from the community. The outside
 *     world begins to notice and respond.
 *
 *   Level 3 (Innocence <= 30): NPC_REACTION — Relationship mirror (关系镜子)
 *     Observable behavioral changes from familiar faces: averted eyes,
 *     quickened steps, cold formality.
 *
 * These warnings are atmospheric -- they don't moralize or lecture.
 * They let the player feel the weight of their choices through
 * environmental storytelling: whispers, reflections, averted eyes.
 *
 * Design doc: v1.4 section 8.3 "镜鉴法则"
 */

// ============================================================================
// Types
// ============================================================================

export type WarningLevel = 1 | 2 | 3;
export type WarningChannel = 'MAIL' | 'MONOLOGUE' | 'NPC_REACTION';

export interface MirrorLawWarning {
  level: WarningLevel;
  channel: WarningChannel;
  innocenceThreshold: number;
  text: string;
  /** Mail subject line (MAIL channel only) */
  mailSubject?: string;
  /** Mail sender display name (MAIL channel only) */
  mailSender?: string;
}

// ============================================================================
// Warning Pool
// ============================================================================

export const MIRROR_LAW_WARNINGS: MirrorLawWarning[] = [
  // ------------------------------------------------------------------
  // Level 1: MONOLOGUE (Innocence <= 40)
  // Inner mirror — nighttime reflections, unease, self-doubt
  // First-person introspective thoughts during quiet moments
  // ------------------------------------------------------------------
  {
    level: 1,
    channel: 'MONOLOGUE',
    innocenceThreshold: 40,
    text: '关了灯准备睡觉，但脑子停不下来。今天那笔生意……我做得对吗？翻了个身，把这个念头按下去。明天还有账要算。',
  },
  {
    level: 1,
    channel: 'MONOLOGUE',
    innocenceThreshold: 40,
    text: '洗手的时候愣了一下。不知道为什么，总觉得指缝间还留着什么东西的触感。大概是今天摸的货太多了吧。',
  },
  {
    level: 1,
    channel: 'MONOLOGUE',
    innocenceThreshold: 40,
    text: '夜里醒了一次，想起小时候妈常说的一句话："人在做，天在看。"翻了个身，告诉自己只是做梦。但后半夜没再睡着。',
  },
  {
    level: 1,
    channel: 'MONOLOGUE',
    innocenceThreshold: 40,
    text: '收拾柜台的时候发现自己在发呆。盯着玻璃柜里的倒影看了好一会儿——那个人有点陌生。摇摇头，继续擦桌子。',
  },
  {
    level: 1,
    channel: 'MONOLOGUE',
    innocenceThreshold: 40,
    text: '今晚的茶泡浓了，苦得发涩。以前嫌淡，现在好像只有苦味才能让自己觉得还在正常地过日子。什么时候开始变成这样的？',
  },

  // ------------------------------------------------------------------
  // Level 2: MAIL (Innocence <= 35)
  // Social mirror — anonymous letters, veiled community signals,
  // concerned acquaintances reaching out indirectly
  // ------------------------------------------------------------------
  {
    level: 2,
    channel: 'MAIL',
    innocenceThreshold: 35,
    mailSubject: '一点小建议',
    mailSender: '一位老客户',
    text: '掌柜的，我在你这当了好些年东西了。最近有人在茶馆里聊起你的铺子，说的话不太好听。我知道生意难做，但有些路，走远了就回不来了。这封信看完就烧了吧。',
  },
  {
    level: 2,
    channel: 'MAIL',
    innocenceThreshold: 35,
    mailSubject: '（无标题）',
    mailSender: '匿名',
    text: '你大概不认识我，但我认识你。街角杂货铺的老陈跟我说，最近有人在打听你铺子里进出的货。不是什么好事。信不信由你。',
  },
  {
    level: 2,
    channel: 'MAIL',
    innocenceThreshold: 35,
    mailSubject: '街坊提醒',
    mailSender: '隔壁裁缝铺',
    text: '掌柜，你可能没注意，但最近你铺子门口总有个穿灰大衣的人站着抽烟。不是来典当的，就是站一会儿就走了。我也不知道什么意思，就是觉得应该告诉你一声。',
  },
  {
    level: 2,
    channel: 'MAIL',
    innocenceThreshold: 35,
    mailSubject: '旧日邻居的问候',
    mailSender: '王婶',
    text: '好久没去你铺子坐坐了。前几天碰到你妈以前的老姐妹，她们问起你，我不知道该怎么说。你妈要是知道你现在的名声……算了，我也只是个多嘴的老太太。保重。',
  },
  {
    level: 2,
    channel: 'MAIL',
    innocenceThreshold: 35,
    mailSubject: '关于近期的传闻',
    mailSender: '同业公会',
    text: '致当铺经营者：近期本区域内有关部分典当行经营行为的非正式投诉有所增加。公会建议各成员自行审视近期业务，确保合规经营。此函仅作提醒，不针对任何具体个人。',
  },

  // ------------------------------------------------------------------
  // Level 3: NPC_REACTION (Innocence <= 30)
  // Observable behavioral changes -- body language, avoidance, fear
  // ------------------------------------------------------------------
  {
    level: 3,
    channel: 'NPC_REACTION',
    innocenceThreshold: 30,
    text: '李阿姨在街口看到你，下意识把菜篮子换到了另一只手上——离你远的那只手。她冲你点了点头，脚步却比平时快了不少。',
  },
  {
    level: 3,
    channel: 'NPC_REACTION',
    innocenceThreshold: 30,
    text: '隔壁早点摊的老赵今天没像往常一样跟你打招呼。你走过去的时候，他正在擦桌子，擦得很认真，认真到好像没看见你似的。',
  },
  {
    level: 3,
    channel: 'NPC_REACTION',
    innocenceThreshold: 30,
    text: '一个小男孩拉着妈妈的手经过你的店门口。妈妈低头跟他说了句什么，小男孩回头看了你一眼，然后走得更快了。你没听清她说了什么，但你大概能猜到。',
  },
  {
    level: 3,
    channel: 'NPC_REACTION',
    innocenceThreshold: 30,
    text: '老客户张叔来赎东西。以前他总要坐下来喝杯茶聊几句，今天他把钱放在柜台上，拿了东西，说了声"谢谢"就走了。那个"谢谢"的语气，像是对陌生人说的。',
  },
  {
    level: 3,
    channel: 'NPC_REACTION',
    innocenceThreshold: 30,
    text: '你去杂货铺买烟。老板娘找零的时候，手指没碰到你的掌心——她把硬币放在柜台上，让你自己拿。以前她不是这样的。',
  },
];

// ============================================================================
// Query Functions
// ============================================================================

/** Warning level thresholds (upper bounds, inclusive) */
const LEVEL_THRESHOLDS: Record<WarningLevel, number> = {
  1: 40,
  2: 35,
  3: 30,
};

/** Minimum days between consecutive warnings */
const WARNING_COOLDOWN_DAYS = 2;

/**
 * Determine the highest warning level that should be active
 * based on current innocence value.
 *
 * @returns The warning level (1-3) or null if innocence is above all thresholds
 */
export function getWarningLevel(innocence: number): WarningLevel | null {
  if (innocence <= LEVEL_THRESHOLDS[3]) return 3;
  if (innocence <= LEVEL_THRESHOLDS[2]) return 2;
  if (innocence <= LEVEL_THRESHOLDS[1]) return 1;
  return null;
}

/**
 * Randomly select one warning from the pool for a given level.
 *
 * @param level - The warning level to draw from
 * @returns A randomly chosen MirrorLawWarning of that level
 */
export function getWarningForLevel(level: WarningLevel): MirrorLawWarning {
  const pool = MIRROR_LAW_WARNINGS.filter(w => w.level === level);
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Determine whether a warning should be shown, enforcing a cooldown
 * period to avoid bombarding the player every single day.
 *
 * @param innocence - Current innocence value
 * @param lastWarningDay - The day number when the last warning was shown (0 if never)
 * @param currentDay - The current game day
 * @returns true if enough time has passed and innocence is in warning range
 */
export function shouldShowWarning(
  innocence: number,
  lastWarningDay: number,
  currentDay: number
): boolean {
  // No warning needed if innocence is above threshold
  if (getWarningLevel(innocence) === null) return false;

  // Always show the first warning (lastWarningDay === 0 means never shown)
  if (lastWarningDay === 0) return true;

  // Enforce cooldown
  return (currentDay - lastWarningDay) >= WARNING_COOLDOWN_DAYS;
}
