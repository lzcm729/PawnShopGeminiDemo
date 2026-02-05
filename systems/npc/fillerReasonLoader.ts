/**
 * Filler Item Reason Loader
 *
 * Loads narrative reasons for why a customer is pawning an item.
 * These reasons explain unexpected item-profile combinations (e.g., young person with antique).
 *
 * CSV Format:
 * context_tag,item_tags,npc_appearance,npc_age,npc_mood,weight,reason_text,exclude_categories
 *
 * Matching logic:
 * - item_tags: Pipe-separated list (any match) or * for wildcard
 * - npc_appearance, npc_age, npc_mood: Pipe-separated list (any match) or * for wildcard
 * - weight: Higher weight = more likely to be selected
 * - exclude_categories: Pipe-separated list of categories to exclude (e.g., "酒类|文房")
 */

import {
  FillerCustomerProfile,
} from './fillerGenerator';

// ============================================================================
// TYPES
// ============================================================================

export interface ReasonEntry {
  contextTag: string;
  itemTags: string[];      // Empty array means wildcard (*)
  npcAppearance: string[]; // Empty array means wildcard (*)
  npcAge: string[];        // Empty array means wildcard (*)
  npcMood: string[];       // Empty array means wildcard (*)
  weight: number;
  reasonText: string;
  excludeCategories: string[];  // Empty array means no exclusion
}

// ============================================================================
// REGISTRY & DEDUPLICATION
// ============================================================================

const reasonRegistry: ReasonEntry[] = [];
const recentReasons: string[] = [];
const MAX_RECENT = 5;

// ============================================================================
// CSV PARSING
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

/**
 * Parse pipe-separated list or wildcard
 * Returns empty array for wildcard (*)
 */
function parsePipeList(value: string): string[] {
  if (!value || value.trim() === '' || value.trim() === '*') {
    return [];
  }
  return value.split('|').map(s => s.trim()).filter(s => s !== '');
}

// ============================================================================
// LOADING
// ============================================================================

/**
 * Load reasons from CSV content
 */
export function loadReasonsFromCSV(csvContent: string): void {
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

    const entry: ReasonEntry = {
      contextTag: get('context_tag'),
      itemTags: parsePipeList(get('item_tags')),
      npcAppearance: parsePipeList(get('npc_appearance')),
      npcAge: parsePipeList(get('npc_age')),
      npcMood: parsePipeList(get('npc_mood')),
      weight: parseFloat(get('weight')) || 1,
      reasonText: get('reason_text'),
      excludeCategories: parsePipeList(get('exclude_categories')),
    };

    if (entry.reasonText) {
      reasonRegistry.push(entry);
    }
  }
}

// ============================================================================
// MATCHING LOGIC
// ============================================================================

/**
 * Check if a value matches a filter list
 * Empty filter list = wildcard (matches anything)
 */
function matchesList(value: string, filterList: string[]): boolean {
  if (filterList.length === 0) return true; // Wildcard
  return filterList.includes(value);
}

/**
 * Check if any item tag matches a filter list
 */
function matchesItemTags(itemTags: string[], filterList: string[]): boolean {
  if (filterList.length === 0) return true; // Wildcard
  return itemTags.some(tag => filterList.includes(tag));
}

/**
 * Calculate match score for a reason entry against profile and item
 * Higher score = better match
 * Returns 0 if any required condition is not met
 */
function calculateMatchScore(
  entry: ReasonEntry,
  profile: FillerCustomerProfile,
  itemAttrTags: string[],
  itemCategory: string
): number {
  // Must match item tags (if specified)
  if (!matchesItemTags(itemAttrTags, entry.itemTags)) {
    return 0;
  }

  // Must match NPC appearance (if specified)
  if (!matchesList(profile.appearance, entry.npcAppearance)) {
    return 0;
  }

  // Must match NPC age (if specified)
  if (!matchesList(profile.age, entry.npcAge)) {
    return 0;
  }

  // Must match NPC mood (if specified)
  if (!matchesList(profile.mood, entry.npcMood)) {
    return 0;
  }

  // Exclude if item category is in exclude list
  if (entry.excludeCategories.length > 0 && entry.excludeCategories.includes(itemCategory)) {
    return 0;
  }

  // Calculate specificity score (more specific = higher score)
  let specificity = 0;
  if (entry.itemTags.length > 0) specificity += 1;
  if (entry.npcAppearance.length > 0) specificity += 1;
  if (entry.npcAge.length > 0) specificity += 1;
  if (entry.npcMood.length > 0) specificity += 1;

  // Base score includes weight and specificity
  return entry.weight * (1 + specificity * 0.5);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get a matching reason for an unexpected item-profile combination
 *
 * @param itemAttrTags Item's attribute tags (from Attr_Tags column)
 * @param itemCategory Item's category (e.g., "酒类", "文房")
 * @param profile Customer profile
 * @returns Reason text or undefined if no match found
 */
export function getMatchingReason(
  itemAttrTags: string[],
  itemCategory: string,
  profile: FillerCustomerProfile
): string | undefined {
  if (reasonRegistry.length === 0) {
    return undefined;
  }

  // Find all matching entries with their scores
  const matches: { entry: ReasonEntry; score: number }[] = [];

  for (const entry of reasonRegistry) {
    const score = calculateMatchScore(entry, profile, itemAttrTags, itemCategory);
    if (score > 0) {
      // Check if this reason was recently used
      if (!recentReasons.includes(entry.reasonText)) {
        matches.push({ entry, score });
      }
    }
  }

  if (matches.length === 0) {
    // Fallback: if all matches are recent, clear recent list and try again
    if (recentReasons.length > 0) {
      recentReasons.length = 0;
      return getMatchingReason(itemAttrTags, itemCategory, profile);
    }
    return undefined;
  }

  // Weighted random selection
  const totalWeight = matches.reduce((sum, m) => sum + m.score, 0);
  let roll = Math.random() * totalWeight;

  for (const match of matches) {
    roll -= match.score;
    if (roll <= 0) {
      // Track this reason to avoid immediate repetition
      recentReasons.push(match.entry.reasonText);
      if (recentReasons.length > MAX_RECENT) {
        recentReasons.shift();
      }
      return match.entry.reasonText;
    }
  }

  // Fallback to last match
  const lastMatch = matches[matches.length - 1];
  recentReasons.push(lastMatch.entry.reasonText);
  if (recentReasons.length > MAX_RECENT) {
    recentReasons.shift();
  }
  return lastMatch.entry.reasonText;
}

/**
 * Check if reasons are loaded
 */
export function isReasonsLoaded(): boolean {
  return reasonRegistry.length > 0;
}

/**
 * Clear all registries (for testing)
 */
export function clearReasons(): void {
  reasonRegistry.length = 0;
  recentReasons.length = 0;
}

/**
 * Get the number of loaded reasons
 */
export function getReasonCount(): number {
  return reasonRegistry.length;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Default embedded reasons as fallback
const DEFAULT_REASONS_CSV = `context_tag,item_tags,npc_appearance,npc_age,npc_mood,weight,reason_text,exclude_categories
INHERITANCE,VINTAGE_REAL|SENTIMENTAL,shabby|plain,*,reluctant,1,"这是家里老人留下的，但现在实在没办法了。",
INHERITANCE,VINTAGE_REAL|SENTIMENTAL,*,young,*,1,"祖母留下的遗物，不得已才拿来。",
INHERITANCE,VINTAGE_REAL|SENTIMENTAL,decent,*,calm,1,"祖上传下来的，放着也是放着。",
GIFT_RECEIVED,SENTIMENTAL,*,*,reluctant,1,"朋友送的，但现在顾不上念旧了。",
GIFT_RECEIVED,TRENDY,*,*,eager,1,"别人送的，我用不上，换点钱更实在。",
SUDDEN_NEED,*,shabby|plain,*,anxious,2,"这东西放了好久了，现在急需周转。",
SUDDEN_NEED,*,*,*,anxious,1,"最近手头紧，先当着应急。",
UNEXPECTED_FIND,VINTAGE_REAL,plain,*,calm,1,"收拾老房子翻出来的，听说是古董？",
UNEXPECTED_FIND,*,plain,*,calm,1,"搬家翻出来的旧东西。",
DEBT_HELP,*,shabby|plain,*,anxious,1,"帮朋友救急的，他现在还不上了。",
BREAKUP,SENTIMENTAL,*,young|middle,reluctant,1,"前任的东西，不想看到了。",酒类|文房
BREAKUP,TRENDY,*,young,eager,1,"前任的，留着膈应。",酒类|文房
HOBBY_QUIT,MECHANICAL|ARTISTIC,*,middle|elderly,calm,1,"以前的爱好，现在没时间玩了。",
UPGRADE,TRENDY|MECHANICAL,decent|fancy,*,calm,1,"换新的了，旧的处理掉。",
GENERIC,*,*,*,*,0.5,"就是想换点钱。",
GENERIC,*,*,*,*,0.5,"放着也没用，不如换点现金。",`;

let initialized = false;

/**
 * Initialize reason templates from embedded data or external CSV
 */
export function initializeFillerReasons(csvContent?: string): void {
  if (initialized && !csvContent) return;

  loadReasonsFromCSV(csvContent || DEFAULT_REASONS_CSV);
  initialized = true;
}

/**
 * Load filler reasons from external file
 */
export async function loadFillerReasonsFromFile(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    const csvContent = await response.text();
    loadReasonsFromCSV(csvContent);
    initialized = true;
  } catch (error) {
    console.error('[fillerReasonLoader] Failed to load CSV file:', error);
    // Fallback to default data
    initializeFillerReasons();
  }
}

// Export default data for testing
export { DEFAULT_REASONS_CSV };
