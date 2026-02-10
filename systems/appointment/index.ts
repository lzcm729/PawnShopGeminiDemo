/**
 * Appointment Board System
 *
 * Generates candidate previews for the appointment board.
 * Candidates are simplified customer previews that can be invited for the next day.
 */

import { AppointmentCandidate, AppointmentPreference, AppointmentBoardLevelConfig } from '../upgrades/types';
import { ActiveNewsInstance } from '../news/types';
import { GAME_CONFIG } from '../game/config';
import { parseCSV, CSVSchema, stringCol, listCol } from '../utils/csvReader';
import candidatesCsv from '@/assets/data/texts/appointment_candidates.csv?raw';

// ============================================================================
// Candidate Generation Data (loaded from CSV)
// ============================================================================

interface CandidateTemplate {
  id: string;
  genders: string[];
  ages: string[];
  appearances: string[];
  itemHints: string[];
  emotions: string[];
  backgrounds: string[];
  urgency: 'high' | 'medium' | 'low';
}

interface CandidateRow {
  id: string;
  urgency: string;
  genders: string[];
  ages: string[];
  appearances: string[];
  itemHints: string[];
  emotions: string[];
  backgrounds: string[];
  newsLinks: string[];
}

const CANDIDATE_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'urgency': stringCol('urgency'),
  'genders': listCol('genders'),
  'ages': listCol('ages'),
  'appearances': listCol('appearances'),
  'itemHints': listCol('itemHints'),
  'emotions': listCol('emotions'),
  'backgrounds': listCol('backgrounds'),
  'newsLinks': listCol('newsLinks'),
};

let _candidateTemplates: CandidateTemplate[] | null = null;
let _newsLinkTemplates: Record<string, string[]> | null = null;
let _mysteryTemplate: CandidateTemplate | null = null;

function loadCandidateData(): void {
  const rows = parseCSV<CandidateRow>(candidatesCsv, CANDIDATE_SCHEMA, {
    warnUnknownColumns: false,
  });

  const templates: CandidateTemplate[] = [];
  const newsLinks: Record<string, string[]> = {};

  for (const row of rows) {
    if (!row.id) continue;

    const template: CandidateTemplate = {
      id: row.id,
      genders: row.genders,
      ages: row.ages,
      appearances: row.appearances,
      itemHints: row.itemHints,
      emotions: row.emotions,
      backgrounds: row.backgrounds,
      urgency: row.urgency as 'high' | 'medium' | 'low',
    };

    if (row.id === 'mystery_visitor') {
      _mysteryTemplate = template;
    } else {
      templates.push(template);
    }

    if (row.newsLinks.length > 0) {
      newsLinks[row.id] = row.newsLinks;
    }
  }

  _candidateTemplates = templates;
  _newsLinkTemplates = newsLinks;
}

function getCandidateTemplates(): CandidateTemplate[] {
  if (!_candidateTemplates) loadCandidateData();
  return _candidateTemplates!;
}

function getNewsLinkTemplates(): Record<string, string[]> {
  if (!_newsLinkTemplates) loadCandidateData();
  return _newsLinkTemplates!;
}

function getMysteryTemplate(): CandidateTemplate {
  if (!_mysteryTemplate) loadCandidateData();
  return _mysteryTemplate!;
}

/** Probability of a mystery visitor appearing in the candidate pool (per generation) */
const MYSTERY_VISITOR_CHANCE = GAME_CONFIG.APPOINTMENT.MYSTERY_VISITOR_CHANCE;

/**
 * Generate a mystery visitor candidate.
 * Information is intentionally vague regardless of board level.
 */
function generateMysteryCandidate(config: AppointmentBoardLevelConfig): AppointmentCandidate {
  const template = getMysteryTemplate();
  const appearance = randomPick(template.appearances);
  const itemHint = randomPick(template.itemHints);

  const candidate: AppointmentCandidate = {
    id: crypto.randomUUID(),
    appearanceDesc: `${appearance}`,
    itemSizeHint: itemHint,
    urgency: 'medium',
    templateSeed: 'mystery_visitor',
  };

  // Mystery visitors show emotion/background as "???" hints even at higher levels
  if (config.showEmotion) {
    candidate.emotionDesc = randomPick(template.emotions);
  }
  if (config.showBackground) {
    candidate.backgroundHint = randomPick(template.backgrounds);
  }
  if (config.showNewsLink) {
    const newsLinks = getNewsLinkTemplates()['mystery_visitor'] || [];
    candidate.newsLink = newsLinks.length > 0 ? randomPick(newsLinks) : '';
  }

  return candidate;
}

// ============================================================================
// Candidate Generation Functions
// ============================================================================

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a single candidate based on template and board level
 */
function generateCandidate(
  template: CandidateTemplate,
  config: AppointmentBoardLevelConfig,
  news: ActiveNewsInstance[]
): AppointmentCandidate {
  const gender = randomPick(template.genders);
  const age = randomPick(template.ages);
  const appearance = randomPick(template.appearances);
  const itemHint = randomPick(template.itemHints);

  // Basic appearance description (Lv1)
  const appearanceDesc = `${age}${gender.includes('woman') ? '女性' : gender.includes('man') ? '男性' : '老人'}，${appearance}`;

  const candidate: AppointmentCandidate = {
    id: crypto.randomUUID(),
    appearanceDesc,
    itemSizeHint: itemHint,
    urgency: template.urgency,
    templateSeed: template.id
  };

  // Add emotion (Lv2+)
  if (config.showEmotion) {
    candidate.emotionDesc = randomPick(template.emotions);
  }

  // Add background (Lv3+)
  if (config.showBackground) {
    candidate.backgroundHint = randomPick(template.backgrounds);
  }

  // Add news link (Lv3+)
  if (config.showNewsLink) {
    const newsLinks = getNewsLinkTemplates()[template.id] || [];
    if (newsLinks.length > 0) {
      candidate.newsLink = randomPick(newsLinks);
    }
  }

  return candidate;
}

/**
 * Generate candidates for the appointment board
 * @param config The current appointment board level configuration
 * @param preference The filter preference (Lv5 feature)
 * @param news Current active news for context
 */
export function generateAppointmentCandidates(
  config: AppointmentBoardLevelConfig,
  preference: AppointmentPreference,
  news: ActiveNewsInstance[]
): AppointmentCandidate[] {
  // Filter templates based on preference
  let templatePool = [...getCandidateTemplates()];

  if (config.hasPreference) {
    switch (preference) {
      case 'needy':
        // Favor high urgency
        templatePool = templatePool.filter(t => t.urgency === 'high' || t.urgency === 'medium');
        // Double the high urgency templates
        const highUrgency = templatePool.filter(t => t.urgency === 'high');
        templatePool = [...templatePool, ...highUrgency];
        break;
      case 'casual':
        // Favor low urgency
        templatePool = templatePool.filter(t => t.urgency === 'low' || t.urgency === 'medium');
        // Double the low urgency templates
        const lowUrgency = templatePool.filter(t => t.urgency === 'low');
        templatePool = [...templatePool, ...lowUrgency];
        break;
      case 'balanced':
      default:
        // Keep as is
        break;
    }
  }

  // Generate candidates
  const candidates: AppointmentCandidate[] = [];
  const usedTemplates = new Set<string>();

  // Mystery visitor: low probability chance to replace one candidate slot
  const hasMysteryVisitor = Math.random() < MYSTERY_VISITOR_CHANCE;
  const mysterySlot = hasMysteryVisitor
    ? Math.floor(Math.random() * config.candidateCount)
    : -1;

  for (let i = 0; i < config.candidateCount; i++) {
    // Insert mystery visitor at the randomly chosen slot
    if (i === mysterySlot) {
      candidates.push(generateMysteryCandidate(config));
      continue;
    }

    // Try to avoid duplicate templates
    let template: CandidateTemplate;
    let attempts = 0;
    do {
      template = randomPick(templatePool);
      attempts++;
    } while (usedTemplates.has(template.id) && attempts < 10);

    usedTemplates.add(template.id);
    candidates.push(generateCandidate(template, config, news));
  }

  return candidates;
}

/**
 * Initial appointment board state
 */
export const INITIAL_APPOINTMENT_BOARD_STATE = {
  candidates: [],
  selectedIds: [],
  preference: 'balanced' as AppointmentPreference
};

/**
 * Get the number of appointed customers for the day
 * (Used by morning generation to know how many extra customers to expect)
 */
export function getAppointedCustomerCount(selectedIds: string[]): number {
  return selectedIds.length;
}

// ============================================================================
// Next-Day Customer Count Estimation
// ============================================================================

/**
 * Estimated customer count breakdown for the next day.
 * Used by the appointment board UI to show expected traffic.
 */
export interface NextDayCustomerEstimate {
  /** Minimum base customers (from scheduler: min 2 across all narrative scenarios) */
  baseMin: number;
  /** Maximum base customers (maxCustomersPerDay from config) */
  baseMax: number;
  /** Number of invited customers via appointment board */
  invited: number;
  /** Total minimum = baseMin + invited */
  totalMin: number;
  /** Total maximum = baseMax + invited */
  totalMax: number;
}

/**
 * Estimate the number of customers expected tomorrow.
 *
 * Derives baseMin from the customer scheduler logic:
 * - 0 narratives: 2-3 filler (min 2)
 * - 1 narrative:  1+1-2 filler (min 2)
 * - 2 narratives: 2+0-1 filler (min 2)
 * - 3+ narratives: 3+ narratives (min 3, but we use 2 as conservative floor)
 *
 * @param maxCustomersPerDay - GAME_CONFIG.MAX_CUSTOMERS_PER_DAY
 * @param selectedCount - Number of candidates selected on the appointment board
 */
export function estimateNextDayCustomerCount(
  maxCustomersPerDay: number,
  selectedCount: number
): NextDayCustomerEstimate {
  // The scheduler guarantees at least 2 customers in every scenario
  // (see customerScheduler.ts scheduleCustomerOrder filler logic)
  const baseMin = 2;
  const baseMax = maxCustomersPerDay;

  return {
    baseMin,
    baseMax,
    invited: selectedCount,
    totalMin: baseMin + selectedCount,
    totalMax: baseMax + selectedCount,
  };
}

// Re-export types
export type { AppointmentCandidate, AppointmentPreference, AppointmentBoardLevelConfig };
