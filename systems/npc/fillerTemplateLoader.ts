/**
 * Filler Template Loader
 *
 * Loads filler customer template data from CSV files.
 * Provides querying interface for names, descriptions, and dialogues.
 */

import {
  CustomerAge,
  CustomerGender,
  CustomerAppearance,
  CustomerMood,
} from './fillerGenerator';

import namesCsv from '@/assets/data/texts/filler_names.csv?raw';
import descriptionsCsv from '@/assets/data/texts/filler_descriptions.csv?raw';
import dialoguesCsv from '@/assets/data/texts/filler_dialogues.csv?raw';

// ============================================================================
// TYPES
// ============================================================================

export interface NameEntry {
  age: CustomerAge;
  gender: CustomerGender;
  name: string;
}

export interface DescriptionEntry {
  type: 'appearance' | 'mood';
  category: string;
  text: string;
}

export interface DialogueEntry {
  mood: CustomerMood;
  dialogueType: string;
  text: string;
}

// ============================================================================
// CSV PARSING (reusing pattern from items/csvLoader.ts)
// ============================================================================

/**
 * Parse CSV string into 2D array
 * Supports quoted fields with commas and newlines
 */
function parseCSV(csv: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End quote
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentLine.push(currentField.trim());
        if (currentLine.length > 1 || currentLine[0] !== '') {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  // Handle last line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.length > 1 || currentLine[0] !== '') {
      lines.push(currentLine);
    }
  }

  return lines;
}

// ============================================================================
// REGISTRIES
// ============================================================================

/** Name pool registry: age -> gender -> names[] */
const nameRegistry = new Map<CustomerAge, Map<CustomerGender, string[]>>();

/** Appearance description registry: appearance -> texts[] */
const appearanceRegistry = new Map<CustomerAppearance, string[]>();

/** Mood description registry: mood -> texts[] */
const moodDescRegistry = new Map<CustomerMood, string[]>();

/** Dialogue registry: mood -> dialogueType -> texts[] */
const dialogueRegistry = new Map<CustomerMood, Map<string, string[]>>();

// ============================================================================
// LOADING
// ============================================================================

/**
 * Load names from CSV content
 */
export function loadNamesFromCSV(csvContent: string): void {
  const rows = parseCSV(csvContent);
  if (rows.length < 2) return;

  const headers = rows[0];
  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => headerIndex.set(h, i));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const get = (key: string): string => {
      const idx = headerIndex.get(key);
      return idx !== undefined ? (row[idx] || '') : '';
    };

    const age = get('age') as CustomerAge;
    const gender = get('gender') as CustomerGender;
    const name = get('name');

    if (!age || !gender || !name) continue;

    // Ensure age map exists
    if (!nameRegistry.has(age)) {
      nameRegistry.set(age, new Map());
    }
    const ageMap = nameRegistry.get(age)!;

    // Ensure gender array exists
    if (!ageMap.has(gender)) {
      ageMap.set(gender, []);
    }
    ageMap.get(gender)!.push(name);
  }
}

/**
 * Load descriptions from CSV content
 */
export function loadDescriptionsFromCSV(csvContent: string): void {
  const rows = parseCSV(csvContent);
  if (rows.length < 2) return;

  const headers = rows[0];
  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => headerIndex.set(h, i));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const get = (key: string): string => {
      const idx = headerIndex.get(key);
      return idx !== undefined ? (row[idx] || '') : '';
    };

    const type = get('type') as 'appearance' | 'mood';
    const category = get('category');
    const text = get('text');

    if (!type || !category || !text) continue;

    if (type === 'appearance') {
      const appearance = category as CustomerAppearance;
      if (!appearanceRegistry.has(appearance)) {
        appearanceRegistry.set(appearance, []);
      }
      appearanceRegistry.get(appearance)!.push(text);
    } else if (type === 'mood') {
      const mood = category as CustomerMood;
      if (!moodDescRegistry.has(mood)) {
        moodDescRegistry.set(mood, []);
      }
      moodDescRegistry.get(mood)!.push(text);
    }
  }
}

/**
 * Load dialogues from CSV content
 */
export function loadDialoguesFromCSV(csvContent: string): void {
  const rows = parseCSV(csvContent);
  if (rows.length < 2) return;

  const headers = rows[0];
  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => headerIndex.set(h, i));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const get = (key: string): string => {
      const idx = headerIndex.get(key);
      return idx !== undefined ? (row[idx] || '') : '';
    };

    const mood = get('mood') as CustomerMood;
    const dialogueType = get('dialogue_type');
    const text = get('text');

    if (!mood || !dialogueType || !text) continue;

    // Ensure mood map exists
    if (!dialogueRegistry.has(mood)) {
      dialogueRegistry.set(mood, new Map());
    }
    const moodMap = dialogueRegistry.get(mood)!;

    // Ensure dialogue type array exists
    if (!moodMap.has(dialogueType)) {
      moodMap.set(dialogueType, []);
    }
    moodMap.get(dialogueType)!.push(text);
  }
}

// ============================================================================
// QUERY API
// ============================================================================

/**
 * Get names for given age and gender
 */
export function getNames(age: CustomerAge, gender: CustomerGender): string[] {
  return nameRegistry.get(age)?.get(gender) || [];
}

/**
 * Get a random name for given age and gender
 */
export function getRandomName(age: CustomerAge, gender: CustomerGender): string | undefined {
  const names = getNames(age, gender);
  if (names.length === 0) return undefined;
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Get appearance descriptions for given appearance type
 */
export function getAppearanceDescriptions(appearance: CustomerAppearance): string[] {
  return appearanceRegistry.get(appearance) || [];
}

/**
 * Get a random appearance description
 */
export function getRandomAppearanceDescription(appearance: CustomerAppearance): string | undefined {
  const descs = getAppearanceDescriptions(appearance);
  if (descs.length === 0) return undefined;
  return descs[Math.floor(Math.random() * descs.length)];
}

/**
 * Get mood descriptions for given mood
 */
export function getMoodDescriptions(mood: CustomerMood): string[] {
  return moodDescRegistry.get(mood) || [];
}

/**
 * Get a random mood description
 */
export function getRandomMoodDescription(mood: CustomerMood): string | undefined {
  const descs = getMoodDescriptions(mood);
  if (descs.length === 0) return undefined;
  return descs[Math.floor(Math.random() * descs.length)];
}

/**
 * Get dialogues for given mood and type
 */
export function getDialogues(mood: CustomerMood, dialogueType: string): string[] {
  return dialogueRegistry.get(mood)?.get(dialogueType) || [];
}

/**
 * Get a random dialogue for given mood and type
 */
export function getRandomDialogue(mood: CustomerMood, dialogueType: string): string | undefined {
  const dialogues = getDialogues(mood, dialogueType);
  if (dialogues.length === 0) return undefined;
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// ============================================================================
// DIALOGUE DEDUP (per-day uniqueness)
// ============================================================================

/** Tracks which dialogue texts have been used this day, keyed by mood_dialogueType */
const usedDialogues = new Map<string, Set<string>>();

/**
 * Reset dialogue dedup records. Call at the start of each new day.
 */
export function resetDialogueDedup(): void {
  usedDialogues.clear();
}

/**
 * Get a random dialogue for given mood and type, avoiding same-day repeats.
 * If all options for a given mood+type have been used, resets that bucket
 * and picks randomly (graceful fallback).
 */
export function getUniqueRandomDialogue(mood: CustomerMood, dialogueType: string): string | undefined {
  const dialogues = getDialogues(mood, dialogueType);
  if (dialogues.length === 0) return undefined;

  const key = `${mood}_${dialogueType}`;
  let used = usedDialogues.get(key);
  if (!used) {
    used = new Set();
    usedDialogues.set(key, used);
  }

  // Find texts not yet used today
  const available = dialogues.filter(d => !used!.has(d));

  if (available.length > 0) {
    const chosen = available[Math.floor(Math.random() * available.length)];
    used.add(chosen);
    return chosen;
  }

  // All used up — reset this bucket and pick randomly
  used.clear();
  const chosen = dialogues[Math.floor(Math.random() * dialogues.length)];
  used.add(chosen);
  return chosen;
}

/**
 * Check if templates are loaded
 */
export function isFillerTemplatesLoaded(): boolean {
  return nameRegistry.size > 0 && appearanceRegistry.size > 0 && dialogueRegistry.size > 0;
}

/**
 * Clear all registries (for testing)
 */
export function clearFillerTemplates(): void {
  nameRegistry.clear();
  appearanceRegistry.clear();
  moodDescRegistry.clear();
  dialogueRegistry.clear();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

/**
 * Initialize filler templates from statically imported CSV data.
 * Optional overrides can be passed for testing.
 */
export function initializeFillerTemplates(
  namesCSV?: string,
  descriptionsCSV?: string,
  dialoguesCSV?: string
): void {
  if (initialized && !namesCSV && !descriptionsCSV && !dialoguesCSV) return;

  loadNamesFromCSV(namesCSV || namesCsv);
  loadDescriptionsFromCSV(descriptionsCSV || descriptionsCsv);
  loadDialoguesFromCSV(dialoguesCSV || dialoguesCsv);

  initialized = true;
}
