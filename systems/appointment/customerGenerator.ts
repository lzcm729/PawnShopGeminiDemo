/**
 * Appointment Customer Generator
 *
 * Converts appointment candidates into full Customer objects when they visit.
 * Customer template data loaded from CSV.
 */

import { Customer } from '../npc/types';
import { Item, ItemStatus } from '../items/types';
import { createItemFromTemplate } from '../items/csvLoader';
import { initializeKnowledgePool } from '../items/tagUtils';
import { AppointmentCandidate } from './index';
import { Mood, BehaviorTag } from '../core/types';
import { Dialogue } from '../narrative/types';
import { parseCSV, CSVSchema, stringCol, listCol, numberCol } from '../utils/csvReader';
import customersCsv from '@/assets/data/texts/appointment_customers.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

interface CustomerRow {
  id: string;
  names: string[];
  descriptions: string[];
  itemTemplateIds: string[];
  redemptionResolve: string[];
  behaviorTags: string;
  identityTags: string[];
  priceModMin: number;
  priceModMax: number;
  greeting: string;
  pawnReason: string;
  redemptionPlea: string;
  negotiationDynamic: string;
  accepted_fair: string;
  accepted_fleeced: string;
  accepted_premium: string;
  rejected: string;
  rejection_standard: string;
  rejection_angry: string;
  exit_grateful: string;
  exit_neutral: string;
  exit_resentful: string;
  exit_desperate: string;
}

const CUSTOMER_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'names': listCol('names'),
  'descriptions': listCol('descriptions'),
  'itemTemplateIds': listCol('itemTemplateIds'),
  'redemptionResolve': listCol('redemptionResolve'),
  'behaviorTags': stringCol('behaviorTags'),
  'identityTags': listCol('identityTags'),
  'priceModMin': numberCol('priceModMin'),
  'priceModMax': numberCol('priceModMax'),
  'greeting': stringCol('greeting'),
  'pawnReason': stringCol('pawnReason'),
  'redemptionPlea': stringCol('redemptionPlea'),
  'negotiationDynamic': stringCol('negotiationDynamic'),
  'accepted_fair': stringCol('accepted_fair'),
  'accepted_fleeced': stringCol('accepted_fleeced'),
  'accepted_premium': stringCol('accepted_premium'),
  'rejected': stringCol('rejected'),
  'rejection_standard': stringCol('rejection_standard'),
  'rejection_angry': stringCol('rejection_angry'),
  'exit_grateful': stringCol('exit_grateful'),
  'exit_neutral': stringCol('exit_neutral'),
  'exit_resentful': stringCol('exit_resentful'),
  'exit_desperate': stringCol('exit_desperate'),
};

interface CandidateCustomerTemplate {
  names: string[];
  descriptions: string[];
  itemTemplateIds: string[];
  dialogues: Partial<Dialogue>[];
  redemptionResolve: ('Strong' | 'Medium' | 'Weak' | 'None')[];
  behaviorTags: BehaviorTag[][];
  identityTags: string[];
  priceMod: { min: number; max: number };
}

/**
 * Parse behaviorTags string into BehaviorTag[][].
 * Format: "TAG1|TAG2+TAG3|TAG4" -> [['TAG1'], ['TAG2','TAG3'], ['TAG4']]
 * Each "|"-separated group is a possible combination, "+" separates tags within a combination.
 */
function parseBehaviorTags(raw: string): BehaviorTag[][] {
  if (!raw) return [];
  return raw.split('|').map(group =>
    group.split('+').map(tag => tag.trim() as BehaviorTag)
  );
}

let _customerTemplates: Record<string, CandidateCustomerTemplate> | null = null;

function loadCustomerTemplates(): Record<string, CandidateCustomerTemplate> {
  if (_customerTemplates) return _customerTemplates;

  const rows = parseCSV<CustomerRow>(customersCsv, CUSTOMER_SCHEMA, {
    warnUnknownColumns: false,
  });

  _customerTemplates = {};

  for (const row of rows) {
    if (!row.id) continue;

    _customerTemplates[row.id] = {
      names: row.names,
      descriptions: row.descriptions,
      itemTemplateIds: row.itemTemplateIds,
      dialogues: [{
        greeting: row.greeting,
        pawnReason: row.pawnReason,
        redemptionPlea: row.redemptionPlea,
        negotiationDynamic: row.negotiationDynamic,
        accepted: {
          fair: row.accepted_fair,
          fleeced: row.accepted_fleeced,
          premium: row.accepted_premium,
        },
        rejected: row.rejected,
        rejectionLines: {
          standard: row.rejection_standard,
          angry: row.rejection_angry,
        },
        exitDialogues: {
          grateful: row.exit_grateful,
          neutral: row.exit_neutral,
          resentful: row.exit_resentful,
          desperate: row.exit_desperate,
        },
      }],
      redemptionResolve: row.redemptionResolve as ('Strong' | 'Medium' | 'Weak' | 'None')[],
      behaviorTags: parseBehaviorTags(row.behaviorTags),
      identityTags: row.identityTags,
      priceMod: { min: row.priceModMin, max: row.priceModMax },
    };
  }

  return _customerTemplates;
}

// ============================================================================
// Template mappings for candidate types (loaded from CSV)
// ============================================================================

// Fallback items when template not found
function createFallbackItem(day: number): Item {
  return {
    id: crypto.randomUUID(),
    name: "Unknown Item",
    nameDefault: "Unknown Item",
    nameRestored: "Restored Item",
    nameReforged: "Reforged Item",
    category: "Misc",
    condition: "Average",
    visualDescription: "An item of uncertain origin.",
    descDefault: "An item of uncertain origin.",
    historySnippet: "",
    appraisalNote: "",
    archiveSummary: "Unknown item",
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: false,
    pawnDate: day,
    status: ItemStatus.ACTIVE,
    pawnAmount: 0,
    realValue: 150 + Math.floor(Math.random() * 200),
    perceivedValue: 150 + Math.floor(Math.random() * 200),
    baseValue: 150 + Math.floor(Math.random() * 200),
    uncertainty: 0.3,
    currentRange: [100, 300],
    initialRange: [100, 300],
    hiddenTraits: [],
    revealedTraits: [],
    usedTraitIds: [],
    logs: [],
    tags: [],
    workState: 'DEFAULT',
  };
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a full Customer from an AppointmentCandidate
 */
export function generateCustomerFromCandidate(
  candidate: AppointmentCandidate,
  day: number
): Customer {
  const templates = loadCustomerTemplates();
  const templateKey = candidate.templateSeed;
  const template = templates[templateKey] || templates['office_worker'];

  // Create item
  let item: Item | null = null;
  for (const templateId of template.itemTemplateIds) {
    item = createItemFromTemplate(templateId, {
      pawnDate: day,
      status: ItemStatus.ACTIVE,
    });
    if (item) break;
  }

  if (!item) {
    item = createFallbackItem(day);
  }

  // Initialize knowledge pool
  item = initializeKnowledgePool(item);

  // Calculate prices based on item value and template modifier
  const baseValue = item.realValue;
  const minMod = template.priceMod.min + Math.random() * (template.priceMod.max - template.priceMod.min);
  const desiredAmount = Math.floor(baseValue * (minMod + 0.1 + Math.random() * 0.2));
  const minimumAmount = Math.floor(baseValue * minMod);
  const maxRepayment = Math.floor(desiredAmount * 1.3);

  // Build dialogue
  const dialogueTemplate = randomPick(template.dialogues);
  const dialogue: Dialogue = {
    greeting: dialogueTemplate.greeting || "Hello.",
    pawnReason: dialogueTemplate.pawnReason || "I need some cash.",
    redemptionPlea: dialogueTemplate.redemptionPlea || "I'll be back.",
    negotiationDynamic: dialogueTemplate.negotiationDynamic || "What can you offer?",
    accepted: dialogueTemplate.accepted || { fair: "Okay.", fleeced: "Fine.", premium: "Great!" },
    rejected: dialogueTemplate.rejected || "I see.",
    rejectionLines: dialogueTemplate.rejectionLines || { standard: "Goodbye.", angry: "Hmph!" },
    exitDialogues: dialogueTemplate.exitDialogues || {
      grateful: "Thank you!",
      neutral: "Bye.",
      resentful: "...",
      desperate: "..."
    }
  };

  const customer: Customer = {
    id: candidate.id, // Use candidate ID for tracking
    name: randomPick(template.names),
    description: randomPick(template.descriptions),
    avatarSeed: `appointed_${templateKey}_${day}`,
    dialogue,
    redemptionResolve: randomPick(template.redemptionResolve),
    behaviorTags: randomPick(template.behaviorTags),
    patience: candidate.urgency === 'high' ? 2 : candidate.urgency === 'low' ? 4 : 3,
    mood: 'Neutral' as Mood,
    identityTags: [...template.identityTags, 'Appointed'],
    item,
    desiredAmount,
    minimumAmount,
    survivalMinimum: Math.floor(minimumAmount * 0.7),
    maxRepayment,
    interactionType: 'PAWN',
    observation: candidate.emotionDesc || undefined
  };

  return customer;
}

/**
 * Get all appointed customers for the day
 */
export function getAppointedCustomers(
  candidates: AppointmentCandidate[],
  selectedIds: string[],
  day: number
): Customer[] {
  return selectedIds
    .map(id => candidates.find(c => c.id === id))
    .filter((c): c is AppointmentCandidate => c !== undefined)
    .map(candidate => generateCustomerFromCandidate(candidate, day));
}
