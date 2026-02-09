/**
 * Mail Registry
 *
 * Aggregates all mail templates from stories, system mails (CSV), and threat mails (CSV).
 * Includes tone variants (design doc Section C) and threat mail templates (Section F).
 *
 * Threat mails share a single CSV source with mailUtils.ts (assets/data/texts/threat_mails.csv).
 */

import { MailTemplate, MailToneVariant, MailTone } from '../../types';
import { ALL_STORY_MAILS } from './storyRegistry';
import { getThreatMailPool } from './mailUtils';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import systemMailsCsv from '@/assets/data/texts/system_mails.csv?raw';

// ============================================================================
// System Mails (CSV-loaded)
// ============================================================================

interface SystemMailRow {
  id: string;
  sender: string;
  subject: string;
  body: string;
  tone: string;
  category: string;
  parentId: string;
  variantTone: string;
}

const SYSTEM_MAIL_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'sender': stringCol('sender'),
  'subject': stringCol('subject'),
  'body': stringCol('body'),
  'tone': stringCol('tone'),
  'category': stringCol('category'),
  'parentId': stringCol('parentId'),
  'variantTone': stringCol('variantTone'),
};

let _systemMails: Record<string, MailTemplate> | null = null;

function buildSystemMails(): Record<string, MailTemplate> {
  if (_systemMails) return _systemMails;

  const rows = parseCSV<SystemMailRow>(systemMailsCsv, SYSTEM_MAIL_SCHEMA, {
    warnUnknownColumns: false,
  });

  // Separate base mails from tone variants
  const baseMails: SystemMailRow[] = [];
  const variants: SystemMailRow[] = [];

  for (const row of rows) {
    if (!row.id) continue;
    if (row.parentId) {
      variants.push(row);
    } else {
      baseMails.push(row);
    }
  }

  _systemMails = {};

  for (const row of baseMails) {
    // Collect tone variants for this mail
    const mailVariants: MailToneVariant[] = variants
      .filter(v => v.parentId === row.id)
      .map(v => ({
        tone: v.variantTone as MailTone,
        subject: v.subject,
        body: v.body.replace(/\\n/g, '\n'),
      }));

    const template: MailTemplate = {
      id: row.id,
      sender: row.sender,
      subject: row.subject,
      body: row.body.replace(/\\n/g, '\n'),
      attachments: { cash: 0 },
      tone: (row.tone as MailTone) || 'FORMAL',
    };

    if (mailVariants.length > 0) {
      template.toneVariants = mailVariants;
    }

    _systemMails[row.id] = template;
  }

  return _systemMails;
}

// ============================================================================
// Threat Mail Templates (from shared CSV via mailUtils.ts)
// ============================================================================

let _threatMails: Record<string, MailTemplate> | null = null;

function buildThreatMails(): Record<string, MailTemplate> {
  if (_threatMails) return _threatMails;

  const pool = getThreatMailPool();
  _threatMails = {};

  for (const entry of pool) {
    _threatMails[entry.id] = {
      id: entry.id,
      sender: '未知',
      subject: entry.subject,
      body: entry.body,
      delay: 'immediate',
      tone: 'THREATENING',
      category: 'THREAT',
    };
  }

  return _threatMails;
}

// ============================================================================
// Combined Mail Templates (lazy-loaded)
// ============================================================================

let _cachedMailTemplates: Record<string, MailTemplate> | null = null;

function getAllMailTemplates(): Record<string, MailTemplate> {
  if (!_cachedMailTemplates) {
    _cachedMailTemplates = {
      ...buildSystemMails(),
      ...buildThreatMails(),
      ...ALL_STORY_MAILS
    };
  }
  return _cachedMailTemplates;
}

// For backward compatibility - but using getter
export const MAIL_TEMPLATES: Record<string, MailTemplate> = new Proxy({} as Record<string, MailTemplate>, {
  get(_, prop: string) {
    return getAllMailTemplates()[prop];
  },
  has(_, prop: string) {
    return prop in getAllMailTemplates();
  },
  ownKeys() {
    return Object.keys(getAllMailTemplates());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    const templates = getAllMailTemplates();
    if (prop in templates) {
      return { configurable: true, enumerable: true, value: templates[prop] };
    }
    return undefined;
  }
});

export const getMailTemplate = (id: string): MailTemplate | null => {
  // Check runtime templates first
  if (_runtimeTemplates[id]) return _runtimeTemplates[id];
  return getAllMailTemplates()[id] || null;
};

// ============================================================================
// Runtime Template Registration (for dynamic echo mails)
// ============================================================================

const _runtimeTemplates: Record<string, MailTemplate> = {};

/**
 * Register a mail template at runtime (e.g., for moral echo mails or
 * dynamically generated threat mails).
 * These are transient and won't persist across page reloads.
 */
export function registerRuntimeMailTemplate(template: MailTemplate): void {
  _runtimeTemplates[template.id] = template;
}
