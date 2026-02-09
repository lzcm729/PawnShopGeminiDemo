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
 * Texts are loaded from CSV: assets/data/texts/mirror_warnings.csv
 * CSV key format: {level}:{channel}
 *
 * Design doc: v1.4 section 8.3 "镜鉴法则"
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import mirrorWarningsCSV from '@/assets/data/texts/mirror_warnings.csv?raw';

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
// CSV Loading
// ============================================================================

interface MirrorWarningRow {
  key: string;
  text: string;
  mailSubject: string;
  mailSender: string;
}

const MIRROR_WARNING_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
  'mailSubject': stringCol('mailSubject'),
  'mailSender': stringCol('mailSender'),
};

/** Warning level thresholds (upper bounds, inclusive) */
// TODO: Migrate to TOML config in a future batch
const LEVEL_THRESHOLDS: Record<WarningLevel, number> = {
  1: 40,
  2: 35,
  3: 30,
};

/** Minimum days between consecutive warnings */
// TODO: Migrate to TOML config in a future batch
const WARNING_COOLDOWN_DAYS = 2;

/** Lazily initialized warning pool */
let warningPool: MirrorLawWarning[] | null = null;

function getWarningPool(): MirrorLawWarning[] {
  if (!warningPool) {
    warningPool = [];
    const rows = parseCSV<MirrorWarningRow>(mirrorWarningsCSV, MIRROR_WARNING_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;

      const [levelStr, channel] = row.key.split(':');
      const level = parseInt(levelStr, 10) as WarningLevel;
      if (level < 1 || level > 3) continue;

      const warning: MirrorLawWarning = {
        level,
        channel: channel as WarningChannel,
        innocenceThreshold: LEVEL_THRESHOLDS[level],
        text: row.text,
      };
      if (row.mailSubject) warning.mailSubject = row.mailSubject;
      if (row.mailSender) warning.mailSender = row.mailSender;

      warningPool.push(warning);
    }
  }
  return warningPool;
}

// ============================================================================
// Query Functions
// ============================================================================

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
  const pool = getWarningPool().filter(w => w.level === level);
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
