/**
 * Spectrometer Feedback Templates
 *
 * Message pools for the spectrometer anomaly detection system.
 * Design doc 3.6 requires balanced positive/negative anomaly messages:
 * - At least 40% of alerts should point to "bargain" opportunities
 * - Provide "equipment confirms: item normal" positive feedback when no anomaly
 * - Avoid punishment-heavy messaging that makes the spectrometer feel like an anxiety source
 *
 * Severity tiers based on deviation percentage:
 * - Mild: just above threshold (e.g., 21-40% for Lv3)
 * - Moderate: clearly above threshold (e.g., 41-80%)
 * - Severe: far above threshold (e.g., >80%)
 */

// ============================================================================
// Anomaly Alert Messages (when anomaly IS detected)
// ============================================================================

export type AnomalySeverity = 'mild' | 'moderate' | 'severe';

interface AnomalyMessage {
  text: string;
  /** Whether this message leans positive (bargain hint) or negative (fake/overvalued hint) or neutral */
  tone: 'positive' | 'negative' | 'neutral';
}

/**
 * Mild anomaly messages - slight deviation detected.
 * Mix of positive and negative tones for balance.
 */
export const MILD_ANOMALY_MESSAGES: AnomalyMessage[] = [
  // Neutral
  { text: '嗯...有点蹊跷，但也可能是仪器偏差。', tone: 'neutral' },
  { text: '读数有轻微波动，不确定是否有意义。', tone: 'neutral' },
  // Positive (bargain hints)
  { text: '指针微微偏了一下...也许值得多看看。', tone: 'positive' },
  { text: '有点意思，这个读数暗示可能被低估了。', tone: 'positive' },
  { text: '轻微异常...有时候好东西就藏在这种信号里。', tone: 'positive' },
  // Negative (risk hints)
  { text: '仪器显示有点不对劲，留个心眼。', tone: 'negative' },
  { text: '读数微偏，可能只是老化痕迹...也可能不是。', tone: 'negative' },
];

/**
 * Moderate anomaly messages - clear deviation detected.
 */
export const MODERATE_ANOMALY_MESSAGES: AnomalyMessage[] = [
  // Neutral
  { text: '...这个读数不太对。值得深入看看。', tone: 'neutral' },
  { text: '分析仪指针明显偏转，需要进一步鉴定。', tone: 'neutral' },
  // Positive (bargain hints)
  { text: '这个偏差...如果是低估的话，可能捡到宝了。', tone: 'positive' },
  { text: '读数异常偏高——要么是仪器坏了，要么这东西比看起来值钱。', tone: 'positive' },
  { text: '明显的偏差信号。直觉告诉我，这可能是个机会。', tone: 'positive' },
  // Negative (risk hints)
  { text: '偏差不小...最好仔细看看是不是有问题。', tone: 'negative' },
  { text: '信号波动明显，这东西不太对劲。', tone: 'negative' },
  { text: '仪器警告——估价和真实价值之间有明显落差。', tone: 'negative' },
];

/**
 * Severe anomaly messages - major deviation detected.
 */
export const SEVERE_ANOMALY_MESSAGES: AnomalyMessage[] = [
  // Neutral
  { text: '...这个读数不对。差得有点离谱。', tone: 'neutral' },
  { text: '警报——偏差远超正常范围。', tone: 'neutral' },
  // Positive (bargain hints)
  { text: '读数爆表了...如果是真品被严重低估，这是千载难逢的机会。', tone: 'positive' },
  { text: '离谱的偏差。要么是赝品，要么是被埋没的珍品——赌一把？', tone: 'positive' },
  // Negative (risk hints)
  { text: '仪器疯了一样响——这东西有严重问题。', tone: 'negative' },
  { text: '极端异常。高概率是赝品或严重高估，务必深度鉴定。', tone: 'negative' },
];

// ============================================================================
// Normal Confirmation Messages (when NO anomaly detected)
// ============================================================================

/**
 * Positive feedback when spectrometer is active but no anomaly found.
 * Per design doc: "设备确认：物品状态正常" style messages
 * to make players feel the maintenance cost is worthwhile.
 */
export const NORMAL_CONFIRMATION_MESSAGES: string[] = [
  '设备确认：读数正常，未检测到异常。',
  '光谱分析完成，物品状态在正常范围内。',
  '仪器指针平稳——这件看起来没什么问题。',
  '扫描结束，一切正常。花在维护上的钱没白费。',
  '分析仪确认：估价与实际偏差在合理范围。',
  '指示灯稳定亮绿——可以放心。',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a random anomaly message for the given severity.
 */
export function getAnomalyMessage(severity: AnomalySeverity): AnomalyMessage {
  const pool =
    severity === 'severe' ? SEVERE_ANOMALY_MESSAGES :
    severity === 'moderate' ? MODERATE_ANOMALY_MESSAGES :
    MILD_ANOMALY_MESSAGES;

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a random normal confirmation message.
 */
export function getNormalConfirmationMessage(): string {
  return NORMAL_CONFIRMATION_MESSAGES[
    Math.floor(Math.random() * NORMAL_CONFIRMATION_MESSAGES.length)
  ];
}

/**
 * Determine anomaly severity based on percentage deviation.
 */
export function getAnomalySeverity(percentDiff: number): AnomalySeverity {
  if (percentDiff > 80) return 'severe';
  if (percentDiff > 40) return 'moderate';
  return 'mild';
}
