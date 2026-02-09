import { MailDelay, MailTemplate, MailAttachment, MailTone, MailCategory } from './types';
import { parseCSV, CSVSchema, stringCol, listCol } from '../utils/csvReader';
import threatMailsCsv from '@/assets/data/texts/threat_mails.csv?raw';
import mailDefaultsCsv from '@/assets/data/texts/mail_defaults.csv?raw';

export interface InterpolationContext {
    itemName?: string;
    amount?: number;
    playerName?: string;
    dayCount?: number;
    recentNews?: {
        headline: string;
        body: string;
    };
    [key: string]: any;
}

const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
};

// ============================================================================
// Mail Default Texts (CSV)
// ============================================================================

interface MailDefaultRow {
  key: string;
  text: string;
}

const MAIL_DEFAULT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

let _mailDefaults: Map<string, string> | null = null;

function getMailDefaults(): Map<string, string> {
  if (!_mailDefaults) {
    _mailDefaults = new Map();
    const rows = parseCSV<MailDefaultRow>(mailDefaultsCsv, MAIL_DEFAULT_SCHEMA, {
      warnUnknownColumns: false,
    });
    for (const row of rows) {
      if (row.key) _mailDefaults.set(row.key, row.text);
    }
  }
  return _mailDefaults;
}

function getDefault(key: string, fallback: string): string {
  return getMailDefaults().get(key) ?? fallback;
}

export const interpolateMailBody = (templateBody: string, context: InterpolationContext = {}): string => {
    let result = templateBody;

    // Default replacements from CSV
    const safeContext = {
        itemName: getDefault('interpolation_itemName', '那件物品'),
        amount: 0,
        playerName: getDefault('interpolation_playerName', '老板'),
        npcName: getDefault('interpolation_npcName', '顾客'),
        daysPassed: 0,
        ...context
    };

    // Replace strict double curly braces
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (key === 'amount' && typeof safeContext.amount === 'number') {
            return formatCurrency(safeContext.amount);
        }
        if (key === 'recent_news.headline' && safeContext.recentNews) {
            return safeContext.recentNews.headline;
        }
        return safeContext[key] !== undefined ? String(safeContext[key]) : match;
    });

    return result;
};

/**
 * Resolve a MailDelay level to a concrete number of delay days.
 * Adds randomness so delivery timing is not perfectly predictable.
 *
 * - immediate: 0 days (arrives same night)
 * - standard: 2-3 days (default)
 * - slow: 5-7 days
 * - surprise: 10-15 days
 */
export const resolveMailDelay = (level: MailDelay = 'standard'): number => {
    switch (level) {
        case 'immediate': return 0;
        case 'standard': return 2 + Math.floor(Math.random() * 2); // 2-3
        case 'slow': return 5 + Math.floor(Math.random() * 3); // 5-7
        case 'surprise': return 10 + Math.floor(Math.random() * 6); // 10-15
    }
};

/** Non-monetary reward types for善行 mails */
export type NonMonetaryRewardType = 'REFERRAL' | 'INTEL' | 'NPC_HELP';

/**
 * Resolve the actual reward for a mail template.
 * For system-generated善行 reward mails (those with cashRange), applies the
 * 30-40% probability rule. DSL-authored mails with explicit cash amounts
 * are passed through unchanged.
 */
export const resolveMailReward = (template: MailTemplate): MailAttachment | undefined => {
    if (!template.attachments) return undefined;

    // DSL-authored mails with explicit cash: pass through unchanged
    if (template.attachments.cash !== undefined && template.attachments.cash > 0) {
        return template.attachments;
    }

    // System mails with cashRange: apply probabilistic reward
    if (template.attachments.cashRange) {
        const { min, max } = template.attachments.cashRange;
        const rewardChance = 0.3 + Math.random() * 0.1; // 30-40%
        if (Math.random() < rewardChance) {
            return { cash: min + Math.floor(Math.random() * (max - min + 1)) };
        }
        // No cash reward — may still have non-monetary reward
        if (template.attachments.rewardType) {
            return { rewardType: template.attachments.rewardType };
        }
        return undefined;
    }

    // Items or other attachments: pass through
    return template.attachments;
};

// ============================================================================
// Mail Tone System (Design Doc Section C: 语气反差)
// ============================================================================

/**
 * NPC emotional state context used for tone selection.
 * Captures the NPC's circumstances at mail generation time.
 */
export interface NpcEmotionalContext {
    /** NPC's current hope level (0-100, from chain variables) */
    hope?: number;
    /** NPC's current funds (from chain variables) */
    funds?: number;
    /** Daily cost burn rate (from chain variables) */
    dailyCost?: number;
    /** Whether the player gave a favorable deal */
    favorableDeal?: boolean;
    /** Whether the player rejected/harmed the NPC */
    playerRejected?: boolean;
    /** Contract type used in the deal */
    contractType?: 'CHARITY' | 'AID' | 'STANDARD' | 'SHARK';
    /** Story outcome: positive, negative, or neutral */
    storyOutcome?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

/**
 * Player reputation context for tone selection.
 */
export interface PlayerReputationContext {
    humanity?: number;
    credibility?: number;
    innocence?: number;
}

/**
 * Select the appropriate mail tone based on NPC emotional state and player reputation.
 *
 * Design doc Section C: Mail tone contrasts with counter dialogue.
 * - Desperate NPC at counter may appear calm, but writes desperate mail
 * - Grateful NPC writes warmly
 * - Wronged NPC writes bitterly
 *
 * Priority order: explicit context signals > story outcome > hope level > default
 */
export function selectMailTone(
    npcContext: NpcEmotionalContext,
    _playerReputation?: PlayerReputationContext
): MailTone {
    // Explicit rejection / shark contract -> BITTER
    if (npcContext.playerRejected) {
        return 'BITTER';
    }

    // Shark contract -> BITTER (NPC feels exploited)
    if (npcContext.contractType === 'SHARK') {
        return 'BITTER';
    }

    // Story had a positive outcome -> GRATEFUL
    if (npcContext.storyOutcome === 'POSITIVE') {
        return 'GRATEFUL';
    }

    // Story had a negative outcome -> check hope
    if (npcContext.storyOutcome === 'NEGATIVE') {
        const hope = npcContext.hope ?? 50;
        return hope <= 20 ? 'DESPERATE' : 'BITTER';
    }

    // Charity or Aid contract -> GRATEFUL
    if (npcContext.contractType === 'CHARITY' || npcContext.contractType === 'AID') {
        return 'GRATEFUL';
    }

    // Low hope -> DESPERATE
    if (npcContext.hope !== undefined && npcContext.hope <= 25) {
        return 'DESPERATE';
    }

    // Low funds relative to daily cost -> DESPERATE
    if (
        npcContext.funds !== undefined &&
        npcContext.dailyCost !== undefined &&
        npcContext.dailyCost > 0 &&
        npcContext.funds / npcContext.dailyCost <= 3
    ) {
        return 'DESPERATE';
    }

    // Favorable deal -> GRATEFUL
    if (npcContext.favorableDeal) {
        return 'GRATEFUL';
    }

    // Default: FORMAL
    return 'FORMAL';
}

/**
 * Apply a tone variant to a mail template.
 * Returns a new template with the tone variant's subject and body,
 * while preserving all other template fields.
 *
 * If no matching variant exists for the given tone, returns the original template.
 * This ensures backward compatibility: templates without variants work unchanged.
 */
export function applyToneVariant(
    template: MailTemplate,
    tone: MailTone
): MailTemplate {
    // No variants defined -> return original
    if (!template.toneVariants || template.toneVariants.length === 0) {
        return { ...template, tone };
    }

    // Find matching variant
    const variant = template.toneVariants.find(v => v.tone === tone);
    if (!variant) {
        // No variant for this tone -> return original with tone metadata
        return { ...template, tone };
    }

    // Apply variant: override subject and body, keep everything else
    return {
        ...template,
        subject: variant.subject,
        body: variant.body,
        tone,
    };
}

/**
 * Resolve a mail template with tone awareness.
 * Combines tone selection + variant application in one step.
 *
 * Use this when scheduling a mail and you have NPC context available.
 * The resolved tone is captured at schedule time (not at read time),
 * so the mail reflects the NPC's emotional state when they "wrote" it.
 */
export function resolveMailWithTone(
    template: MailTemplate,
    npcContext: NpcEmotionalContext,
    playerReputation?: PlayerReputationContext
): { template: MailTemplate; resolvedTone: MailTone } {
    const tone = selectMailTone(npcContext, playerReputation);
    const resolved = applyToneVariant(template, tone);
    return { template: resolved, resolvedTone: tone };
}

// ============================================================================
// Underworld Threat Mail System (Design Doc Section F: 黑帮威胁邮件)
// ============================================================================

/**
 * Context for generating a threat mail.
 * Provided by the blackmarket/underworld system when triggering a threat.
 */
export interface ThreatMailContext {
    /** The trigger event type */
    triggerEvent: 'UNDERCOVER_VISIT' | 'HEAT_THRESHOLD' | 'STOLEN_GOODS' | 'PROTECTION_FEE' | 'GENERAL';
    /** Current heat level (0-10) */
    heatLevel?: number;
    /** Related item name (if applicable) */
    relatedItemName?: string;
    /** Optional override for sender name */
    senderOverride?: string;
}

// ============================================================================
// Threat Mail Pool (CSV-loaded, shared with mailRegistry.ts)
// ============================================================================

interface ThreatMailRow {
  id: string;
  triggerEvents: string[];
  subject: string;
  body: string;
}

const THREAT_MAIL_CSV_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'triggerEvents': listCol('triggerEvents', ';'),
  'subject': stringCol('subject'),
  'body': stringCol('body'),
};

let _threatMailPool: Array<{ id: string; subject: string; body: string; triggerEvents: string[] }> | null = null;

/**
 * Get the threat mail pool from CSV (single source of truth).
 * Also used by mailRegistry.ts via getThreatMailPool().
 */
export function getThreatMailPool(): Array<{ id: string; subject: string; body: string; triggerEvents: string[] }> {
  if (!_threatMailPool) {
    const rows = parseCSV<ThreatMailRow>(threatMailsCsv, THREAT_MAIL_CSV_SCHEMA, {
      warnUnknownColumns: false,
    });
    _threatMailPool = rows
      .filter(row => row.id && row.subject)
      .map(row => ({
        id: row.id,
        subject: row.subject,
        body: row.body.replace(/\\n/g, '\n'),
        triggerEvents: row.triggerEvents,
      }));
  }
  return _threatMailPool;
}

/**
 * Generate a threat mail template from the pool.
 *
 * Design doc Section F:
 * - Immediate delivery (same day, night phase)
 * - Cryptic/threatening content: garbled text, single menacing line
 * - No player interaction buttons (read-only)
 * - Signals upcoming danger but doesn't directly punish
 *
 * Returns a MailTemplate with category='THREAT', delay='immediate', no attachments.
 * The calling system should dispatch this via SCHEDULE_MAIL with delayDays=0.
 */
export function generateThreatMail(context: ThreatMailContext): MailTemplate {
    const pool = getThreatMailPool();

    // Filter pool by trigger event, fallback to GENERAL
    const candidates = pool.filter(
        t => t.triggerEvents.includes(context.triggerEvent)
    );

    // Pick a random candidate (or fallback to first GENERAL)
    const fallback = pool.find(t => t.triggerEvents.includes('GENERAL'))!;
    const selected = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : fallback;

    // Generate unique ID with timestamp to avoid collisions
    const uniqueId = `threat_${context.triggerEvent.toLowerCase()}_${Date.now()}`;

    // Optional: inject related item name into body
    let body = selected.body;
    if (context.relatedItemName) {
        body = body.replace('那件东西', context.relatedItemName);
        body = body.replace('不该有的东西', `不该有的东西 (${context.relatedItemName})`);
    }

    return {
        id: uniqueId,
        sender: context.senderOverride ?? '未知',
        subject: selected.subject,
        body,
        delay: 'immediate',
        tone: 'THREATENING',
        category: 'THREAT',
        // No attachments — threat mails are pure information/intimidation
    };
}

/**
 * Check if a mail template is a threat mail (read-only, no interaction).
 * UI components can use this to suppress reply/claim buttons.
 */
export function isThreatMail(template: MailTemplate): boolean {
    return template.category === 'THREAT';
}

/**
 * Check if a MailInstance represents a threat mail.
 * Uses the category field snapshot on the instance.
 */
export function isThreatMailInstance(instance: { category?: MailCategory }): boolean {
    return instance.category === 'THREAT';
}
