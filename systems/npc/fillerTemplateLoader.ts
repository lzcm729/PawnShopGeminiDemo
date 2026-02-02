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

// Embedded default data as fallback
const DEFAULT_NAMES_CSV = `age,gender,name
young,male,小李
young,male,阿杰
young,male,小王
young,male,阿明
young,male,小陈
young,male,阿伟
young,female,小美
young,female,阿芳
young,female,小红
young,female,阿静
young,female,小丽
young,female,阿敏
middle,male,张先生
middle,male,李师傅
middle,male,王老板
middle,male,刘经理
middle,male,陈先生
middle,male,周师傅
middle,female,张女士
middle,female,李阿姨
middle,female,王太太
middle,female,刘小姐
middle,female,陈女士
middle,female,周阿姨
elderly,male,张老
elderly,male,李大爷
elderly,male,王老伯
elderly,male,刘老
elderly,male,陈大爷
elderly,male,周老伯
elderly,female,张奶奶
elderly,female,李老太
elderly,female,王婆婆
elderly,female,刘奶奶
elderly,female,陈老太
elderly,female,周婆婆`;

const DEFAULT_DESCRIPTIONS_CSV = `type,category,text
appearance,shabby,穿着破旧
appearance,shabby,衣服有些邋遢
appearance,shabby,明显经济拮据
appearance,shabby,穿着寒酸
appearance,plain,穿着朴素
appearance,plain,衣着普通
appearance,plain,相貌平平
appearance,plain,打扮普通
appearance,decent,穿着体面
appearance,decent,衣着整洁
appearance,decent,看起来不错
appearance,decent,打扮得体
appearance,fancy,穿着讲究
appearance,fancy,打扮精致
appearance,fancy,衣着光鲜
appearance,fancy,看起来有钱
mood,anxious,神情焦虑
mood,anxious,满头是汗
mood,anxious,坐立不安
mood,anxious,眼神慌张
mood,calm,神态自若
mood,calm,面色平静
mood,calm,不慌不忙
mood,calm,气定神闲
mood,reluctant,一脸不舍
mood,reluctant,眼含泪光
mood,reluctant,欲言又止
mood,reluctant,神情惆怅
mood,eager,急不可耐
mood,eager,迫不及待
mood,eager,跃跃欲试
mood,eager,神情急切`;

const DEFAULT_DIALOGUES_CSV = `mood,dialogue_type,text
anxious,greeting,"老板，这个能当多少钱？急用..."
anxious,greeting,请问收不收这个？我急着用钱。
anxious,greeting,能帮帮忙吗？我急需周转...
anxious,accepted_fair,行，就这样吧。
anxious,accepted_fleeced,这也太低了... 算了，急用。
anxious,accepted_premium,谢谢老板！
anxious,rejected,那我再想想...
anxious,rejection_standard,那我去别家问问。
anxious,rejection_angry,太黑了吧？
anxious,exit_grateful,谢谢老板！到期我会来赎的。
anxious,exit_neutral,好的，那我先走了。
anxious,exit_resentful,唉... 算了...
anxious,exit_desperate,...
calm,greeting,你好，想问一下这个能当多少？
calm,greeting,老板，帮我看看这个值多少。
calm,greeting,请问收不收这类东西？
calm,accepted_fair,行，就这样吧。
calm,accepted_fleeced,有点低了，不过算了。
calm,accepted_premium,价格还行，成交。
calm,rejected,那我再考虑考虑。
calm,rejection_standard,好的，我再看看别家。
calm,rejection_angry,这价格不太合适。
calm,exit_grateful,谢谢，到期我来赎。
calm,exit_neutral,好的，再见。
calm,exit_resentful,哦。
calm,exit_desperate,......
reluctant,greeting,"这个... 能当吗？我实在是没办法了..."
reluctant,greeting,"老板，我想当这个... 能出多少？"
reluctant,greeting,"这东西我不太想当，但是..."
reluctant,accepted_fair,好吧... 麻烦了。
reluctant,accepted_fleeced,唉... 没办法了。
reluctant,accepted_premium,谢谢老板的好意...
reluctant,rejected,那... 让我再想想。
reluctant,rejection_standard,我再考虑一下...
reluctant,rejection_angry,这么低... 算了吧。
reluctant,exit_grateful,谢谢... 我一定会来赎的。
reluctant,exit_neutral,好的...
reluctant,exit_resentful,唉...
reluctant,exit_desperate,......
eager,greeting,老板！收这个吗？给个好价钱！
eager,greeting,快帮我看看这个值多少！
eager,greeting,"这东西绝对值钱，老板看看！"
eager,accepted_fair,成交！爽快！
eager,accepted_fleeced,这么点？算了算了，成交。
eager,accepted_premium,老板大气！
eager,rejected,这价不行啊老板！
eager,rejection_standard,再加点嘛老板！
eager,rejection_angry,就这点钱？
eager,exit_grateful,谢谢老板！改天再来！
eager,exit_neutral,行吧，走了。
eager,exit_resentful,切...
eager,exit_desperate,......`;

let initialized = false;

/**
 * Initialize filler templates from embedded data or external CSVs
 */
export function initializeFillerTemplates(
  namesCSV?: string,
  descriptionsCSV?: string,
  dialoguesCSV?: string
): void {
  if (initialized && !namesCSV && !descriptionsCSV && !dialoguesCSV) return;

  loadNamesFromCSV(namesCSV || DEFAULT_NAMES_CSV);
  loadDescriptionsFromCSV(descriptionsCSV || DEFAULT_DESCRIPTIONS_CSV);
  loadDialoguesFromCSV(dialoguesCSV || DEFAULT_DIALOGUES_CSV);

  initialized = true;
}

/**
 * Load filler templates from external files
 */
export async function loadFillerTemplatesFromFiles(
  namesUrl: string,
  descriptionsUrl: string,
  dialoguesUrl: string
): Promise<void> {
  try {
    const [namesRes, descriptionsRes, dialoguesRes] = await Promise.all([
      fetch(namesUrl),
      fetch(descriptionsUrl),
      fetch(dialoguesUrl),
    ]);

    const namesCSV = await namesRes.text();
    const descriptionsCSV = await descriptionsRes.text();
    const dialoguesCSV = await dialoguesRes.text();

    loadNamesFromCSV(namesCSV);
    loadDescriptionsFromCSV(descriptionsCSV);
    loadDialoguesFromCSV(dialoguesCSV);

    initialized = true;
  } catch (error) {
    console.error('[fillerTemplateLoader] Failed to load CSV files:', error);
    // Fallback to default data
    initializeFillerTemplates();
  }
}

// Export default data for testing
export {
  DEFAULT_NAMES_CSV,
  DEFAULT_DESCRIPTIONS_CSV,
  DEFAULT_DIALOGUES_CSV,
};
