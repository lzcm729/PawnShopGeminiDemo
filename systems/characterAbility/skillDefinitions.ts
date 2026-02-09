/**
 * Character Ability System - Skill Definitions
 *
 * All 12 skills with their static configuration.
 * Mechanical parameters are defined here in code.
 * Text fields (name, description, learnMonologue) are loaded from CSV:
 *   assets/data/texts/skill_definitions.csv
 *
 * Costs, prerequisites from design doc v1.4.
 */

import { AbilitySkillDef, SkillId } from './types';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import skillDefsCSV from '@/assets/data/texts/skill_definitions.csv?raw';

// ============================================================================
// CSV Loading for Text Fields
// ============================================================================

interface SkillTextRow {
  key: string;
  name: string;
  description: string;
  learnMonologue: string;
}

const SKILL_TEXT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'name': stringCol('name'),
  'description': stringCol('description'),
  'learnMonologue': stringCol('learnMonologue'),
};

/** Lazily loaded text map: SkillId -> { name, description, learnMonologue } */
let skillTextMap: Map<string, SkillTextRow> | null = null;

function getSkillTextMap(): Map<string, SkillTextRow> {
  if (!skillTextMap) {
    skillTextMap = new Map();
    const rows = parseCSV<SkillTextRow>(skillDefsCSV, SKILL_TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });
    for (const row of rows) {
      if (row.key) {
        skillTextMap.set(row.key, row);
      }
    }
  }
  return skillTextMap;
}

function getSkillText(id: SkillId, field: 'name' | 'description' | 'learnMonologue', fallback: string): string {
  const row = getSkillTextMap().get(id);
  if (row && row[field]) return row[field];
  return fallback;
}

// ============================================================================
// Skill Registry (Mechanical parameters in code, text from CSV)
// ============================================================================

/**
 * Mechanical parameters for each skill.
 * Text fields are patched from CSV via getSkillText().
 */
const SKILL_MECHANICS: Record<SkillId, Omit<AbilitySkillDef, 'name' | 'description' | 'learnMonologue'>> = {
  // === Craft Pure Path (匠心系) ===

  SENSE_HIDDEN: {
    id: 'SENSE_HIDDEN',
    englishName: 'Sense Hidden',
    path: 'CRAFT',
    tier: 'T1',
    essenceCost: { craft: 50 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'APPRAISAL',
    prerequisites: [],
  },

  PIERCE_ILLUSION: {
    id: 'PIERCE_ILLUSION',
    englishName: 'Pierce Illusion',
    path: 'CRAFT',
    tier: 'T2',
    essenceCost: { craft: 100 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'APPRAISAL',
    prerequisites: ['SENSE_HIDDEN'],
  },

  // === Time Pure Path (旧影系) ===

  APPLY_PRESSURE: {
    id: 'APPLY_PRESSURE',
    englishName: 'Apply Pressure',
    path: 'TIME',
    tier: 'T1',
    essenceCost: { time: 50 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'NEGOTIATION',
    apCost: 1,
    prerequisites: [],
  },

  HEART_STRIKE: {
    id: 'HEART_STRIKE',
    englishName: 'Heart Strike',
    path: 'TIME',
    tier: 'T2',
    essenceCost: { time: 100 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'NEGOTIATION',
    apCost: 1,
    prerequisites: ['APPLY_PRESSURE'],
  },

  // === Vibe Pure Path (灵韵系) ===

  EMPATHY: {
    id: 'EMPATHY',
    englishName: 'Empathy',
    path: 'VIBE',
    tier: 'T1',
    essenceCost: { vibe: 50 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: [],
  },

  COMFORT: {
    id: 'COMFORT',
    englishName: 'Comfort',
    path: 'VIBE',
    tier: 'T2',
    essenceCost: { vibe: 100 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'DEPARTURE',
    apCost: 0,
    prerequisites: ['EMPATHY'],
  },

  // === Time+Craft Fusion (旧影+匠心 -- 暗路) ===

  SHARP_SCRUTINY: {
    id: 'SHARP_SCRUTINY',
    englishName: 'Sharp Scrutiny',
    path: 'TIME_CRAFT',
    tier: 'T1',
    essenceCost: { time: 30, craft: 30 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: ['APPLY_PRESSURE', 'SENSE_HIDDEN'],
  },

  POKER_FACE: {
    id: 'POKER_FACE',
    englishName: 'Poker Face',
    path: 'TIME_CRAFT',
    tier: 'T2',
    essenceCost: { time: 60, craft: 60 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'APPRAISAL',
    prerequisites: ['SHARP_SCRUTINY'],
  },

  // === Craft+Vibe Fusion (匠心+灵韵 -- 明路) ===

  CHERISH_ALL: {
    id: 'CHERISH_ALL',
    englishName: 'Cherish All',
    path: 'CRAFT_VIBE',
    tier: 'T1',
    essenceCost: { craft: 30, vibe: 30 },
    energyCost: 1,
    activation: 'ACTIVE',
    phase: 'DEPARTURE',
    apCost: 0,
    prerequisites: ['SENSE_HIDDEN', 'EMPATHY'],
  },

  WORD_OF_MOUTH: {
    id: 'WORD_OF_MOUTH',
    englishName: 'Word of Mouth',
    path: 'CRAFT_VIBE',
    tier: 'T2',
    essenceCost: { craft: 60, vibe: 60 },
    energyCost: 1,
    activation: 'PASSIVE',
    prerequisites: ['CHERISH_ALL'],
  },

  // === Time+Vibe Fusion (旧影+灵韵 -- 慧路) ===

  FORESIGHT: {
    id: 'FORESIGHT',
    englishName: 'Foresight',
    path: 'TIME_VIBE',
    tier: 'T1',
    essenceCost: { time: 30, vibe: 30 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: ['APPLY_PRESSURE', 'EMPATHY'],
  },

  SEE_CONSEQUENCE: {
    id: 'SEE_CONSEQUENCE',
    englishName: 'See Consequence',
    path: 'TIME_VIBE',
    tier: 'T2',
    essenceCost: { time: 60, vibe: 60 },
    energyCost: 1,
    activation: 'PASSIVE',
    phase: 'NEGOTIATION',
    prerequisites: ['FORESIGHT'],
  },
};

// ============================================================================
// Build Full Definitions (merge mechanics + CSV text)
// ============================================================================

function buildSkillDefinitions(): Record<SkillId, AbilitySkillDef> {
  const result = {} as Record<SkillId, AbilitySkillDef>;
  for (const [id, mechanics] of Object.entries(SKILL_MECHANICS)) {
    const skillId = id as SkillId;
    result[skillId] = {
      ...mechanics,
      name: getSkillText(skillId, 'name', mechanics.englishName),
      description: getSkillText(skillId, 'description', ''),
      learnMonologue: getSkillText(skillId, 'learnMonologue', ''),
    };
  }
  return result;
}

/** Lazily built full skill definitions */
let _definitions: Record<SkillId, AbilitySkillDef> | null = null;

function getDefinitions(): Record<SkillId, AbilitySkillDef> {
  if (!_definitions) {
    _definitions = buildSkillDefinitions();
  }
  return _definitions;
}

/**
 * Public accessor for skill definitions.
 * Returns a Proxy so that SKILL_DEFINITIONS[id] works transparently.
 */
export const SKILL_DEFINITIONS: Record<SkillId, AbilitySkillDef> = new Proxy(
  {} as Record<SkillId, AbilitySkillDef>,
  {
    get(_target, prop: string) {
      return getDefinitions()[prop as SkillId];
    },
    ownKeys() {
      return Object.keys(getDefinitions());
    },
    has(_target, prop: string) {
      return prop in getDefinitions();
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const defs = getDefinitions();
      if (prop in defs) {
        return {
          configurable: true,
          enumerable: true,
          value: defs[prop as SkillId],
        };
      }
      return undefined;
    },
  }
);

// ============================================================================
// Convenience Lists
// ============================================================================

export const ALL_SKILL_IDS: SkillId[] = Object.keys(SKILL_MECHANICS) as SkillId[];

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
  return getDefinitions()[id];
}
