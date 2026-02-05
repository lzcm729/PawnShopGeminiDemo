/**
 * CSV Configuration Loader
 *
 * Loads item templates and trait definitions from CSV files,
 * providing runtime item instance creation functionality.
 */

import { Item, ItemTrait, ItemStatus, TraitType } from './types';
import { ItemTag, STATE_TAGS, ATTRIBUTE_TAGS, ESSENCE_TAGS } from './tags';
import {
  parseCSV,
  CSVSchema,
  stringCol,
  numberCol,
  booleanCol,
  listCol,
} from '../utils/csvReader';

// Callback to notify other systems when CSV data is reloaded
let onDataReloadCallback: (() => void) | null = null;

/**
 * Register a callback to be called when CSV data is reloaded
 * Used by fillerGenerator to clear its template cache
 */
export function onCSVDataReload(callback: () => void): void {
  onDataReloadCallback = callback;
}

// ============================================================================
// Type Validation
// ============================================================================

/** Valid TraitType values */
const VALID_TRAIT_TYPES: TraitType[] = ['FLAW', 'STORY', 'FAKE', 'JACKPOT', 'STOLEN'];

/** All valid ItemTag values */
const ALL_VALID_TAGS: ItemTag[] = [...STATE_TAGS, ...ATTRIBUTE_TAGS, ...ESSENCE_TAGS];

/** Validate if string is a valid ItemTag */
function isValidItemTag(tag: string): tag is ItemTag {
  return ALL_VALID_TAGS.includes(tag as ItemTag);
}

/** Validate if string is a valid TraitType */
function isValidTraitType(type: string): type is TraitType {
  return VALID_TRAIT_TYPES.includes(type as TraitType);
}

/** Parse and validate ItemTag list */
function parseItemTags(value: string): ItemTag[] {
  if (!value || value.trim() === '') return [];
  return value
    .split(';')
    .map(s => s.trim())
    .filter(isValidItemTag);
}

/** Parse and validate TraitType */
function parseTraitType(value: string): TraitType {
  if (isValidTraitType(value)) {
    return value;
  }
  return 'STORY'; // Default value
}

// ============================================================================
// Type Definitions
// ============================================================================

/** CSV item template (loaded from Items_Base.csv) */
export interface ItemTemplate {
  id: string;
  nameDefault: string;
  nameRestored: string;
  nameReforged: string;
  category: string;
  realValue: number;
  visualValue: number;
  uncertainty: number;
  initStateTags: ItemTag[];
  attrTags: ItemTag[];
  hiddenTraitIds: string[];
  knowCap: number;
  descDefault: string;
  descRestored: string;
  descReforged: string;
  /** Fit tags for filler customer matching (age, appearance, item tags) */
  fitTags: string[];
  /** Whether this item is available for filler customer generation */
  fillerPool: boolean;
}

/** CSV trait definition (loaded from Traits.csv) */
export interface TraitDefinition {
  id: string;
  name: string;
  type: TraitType;
  valueImpact: number;
  detectDiff: number;
  storyText: string;
  dialoguePlayer?: string;
  dialogueCustomer?: string;
  dialoguePlayerUse?: string;  // Player line when using the trait in negotiation
}

// ============================================================================
// CSV Schemas
// ============================================================================

/** Raw parsed item from CSV (before post-processing) */
interface RawItemTemplate {
  id: string;
  nameDefault: string;
  nameRestored: string;
  nameReforged: string;
  category: string;
  realValue: number;
  visualValue: number;
  uncertainty: number;
  initStateTags: string;  // Raw string, will be parsed
  attrTags: string;       // Raw string, will be parsed
  hiddenTraitIds: string[];
  knowCap: number;
  descDefault: string;
  descRestored: string;
  descReforged: string;
  fitTags: string[];
  fillerPool: boolean;
}

/** Schema for Items_Base.csv */
const ITEM_SCHEMA: CSVSchema = {
  'ID': stringCol('id'),
  'Name_Default': stringCol('nameDefault'),
  'Name_Restored': stringCol('nameRestored'),
  'Name_Reforged': stringCol('nameReforged'),
  'Category': stringCol('category'),
  'Real_Value': numberCol('realValue', 0),
  'Visual_Value': numberCol('visualValue', 0),
  'Uncertainty': numberCol('uncertainty', 0.3),
  'Init_State_Tags': stringCol('initStateTags'),  // Parsed later with validation
  'Attr_Tags': stringCol('attrTags'),             // Parsed later with validation
  'Hidden_Traits': listCol('hiddenTraitIds', ';'),
  'Know_Cap': numberCol('knowCap', 100),
  'Desc_Default': stringCol('descDefault'),
  'Desc_Restored': stringCol('descRestored'),
  'Desc_Reforged': stringCol('descReforged'),
  'Fit_Tags': listCol('fitTags', ';'),
  'Filler_Pool': booleanCol('fillerPool', false),
};

/** Raw parsed trait from CSV */
interface RawTraitDefinition {
  id: string;
  name: string;
  type: string;  // Raw string, will be validated
  valueImpact: number;
  detectDiff: number;
  storyText: string;
  dialoguePlayer: string;
  dialogueCustomer: string;
  dialoguePlayerUse: string;
}

/** Schema for Traits.csv */
const TRAIT_SCHEMA: CSVSchema = {
  'ID': stringCol('id'),
  'Name': stringCol('name'),
  'Type': stringCol('type'),  // Validated later
  'Value_Impact': numberCol('valueImpact', 0),
  'Detect_Diff': numberCol('detectDiff', 0.5),
  'Story_Text': stringCol('storyText'),
  'Dialogue_Player': stringCol('dialoguePlayer'),
  'Dialogue_Customer': stringCol('dialogueCustomer'),
  'Dialogue_Player_Use': stringCol('dialoguePlayerUse'),
};

// ============================================================================
// Registries
// ============================================================================

/** Item template registry */
const itemTemplateRegistry = new Map<string, ItemTemplate>();

/** Trait definition registry */
const traitDefinitionRegistry = new Map<string, TraitDefinition>();

/** Default item template (from _default row in CSV) */
let defaultItemTemplate: ItemTemplate | null = null;

/**
 * Load item templates from CSV content
 */
export function loadItemTemplatesFromCSV(csvContent: string): void {
  const rawItems = parseCSV<RawItemTemplate>(csvContent, ITEM_SCHEMA);

  for (const raw of rawItems) {
    if (!raw.id) continue;

    // Post-process: validate and convert tags
    const template: ItemTemplate = {
      ...raw,
      initStateTags: parseItemTags(raw.initStateTags),
      attrTags: parseItemTags(raw.attrTags),
      // Use default description if restored/reforged are empty
      descRestored: raw.descRestored || raw.descDefault,
      descReforged: raw.descReforged || raw.descDefault,
    };

    // Store _default row separately as the fallback template
    if (template.id === '_default') {
      defaultItemTemplate = template;
    } else {
      itemTemplateRegistry.set(template.id, template);
    }
  }
}

/**
 * Load trait definitions from CSV content
 */
export function loadTraitDefinitionsFromCSV(csvContent: string): void {
  const rawTraits = parseCSV<RawTraitDefinition>(csvContent, TRAIT_SCHEMA);

  for (const raw of rawTraits) {
    if (!raw.id) continue;

    // Post-process: validate type and convert optional fields
    const definition: TraitDefinition = {
      id: raw.id,
      name: raw.name,
      type: parseTraitType(raw.type),
      valueImpact: raw.valueImpact,
      detectDiff: raw.detectDiff,
      storyText: raw.storyText,
      dialoguePlayer: raw.dialoguePlayer || undefined,
      dialogueCustomer: raw.dialogueCustomer || undefined,
      dialoguePlayerUse: raw.dialoguePlayerUse || undefined,
    };

    traitDefinitionRegistry.set(definition.id, definition);
  }
}

// ============================================================================
// Query API
// ============================================================================

/**
 * Get item template by ID
 */
export function getItemTemplate(id: string): ItemTemplate | undefined {
  return itemTemplateRegistry.get(id);
}

/**
 * Get all item templates
 */
export function getAllItemTemplates(): ItemTemplate[] {
  return Array.from(itemTemplateRegistry.values());
}

/**
 * Get filler pool template IDs
 * Returns only template IDs where fillerPool === true
 */
export function getFillerPoolTemplateIds(): string[] {
  return Array.from(itemTemplateRegistry.values())
    .filter(t => t.fillerPool === true)
    .map(t => t.id);
}

/**
 * Get default item template (from _default row in CSV)
 * Used as final fallback for missing values
 */
export function getDefaultItemTemplate(): ItemTemplate | null {
  return defaultItemTemplate;
}

/**
 * Get trait definition by ID
 */
export function getTraitDefinition(id: string): TraitDefinition | undefined {
  return traitDefinitionRegistry.get(id);
}

/**
 * Get all trait definitions
 */
export function getAllTraitDefinitions(): TraitDefinition[] {
  return Array.from(traitDefinitionRegistry.values());
}

// ============================================================================
// Item Creation
// ============================================================================

/**
 * Create ItemTrait instance from trait definition
 */
export function createTraitFromDefinition(def: TraitDefinition): ItemTrait {
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    description: def.storyText,
    valueImpact: def.valueImpact,
    discoveryDifficulty: def.detectDiff,
    dialogueTrigger: def.dialoguePlayer && def.dialogueCustomer
      ? {
          playerLine: def.dialoguePlayer,
          customerLine: def.dialogueCustomer,
          playerUseLine: def.dialoguePlayerUse,
        }
      : undefined,
  };
}

/**
 * Create item instance from template
 *
 * @param templateId Item template ID
 * @param overrides Fields to override
 * @returns New item instance, or null if template not found
 */
export function createItemFromTemplate(
  templateId: string,
  overrides?: Partial<Item>
): Item | null {
  const template = getItemTemplate(templateId);
  if (!template) {
    console.warn(`[csvLoader] Item template not found: ${templateId}`);
    return null;
  }

  // Create hidden traits from trait IDs
  const hiddenTraits: ItemTrait[] = [];
  for (const traitId of template.hiddenTraitIds) {
    const traitDef = getTraitDefinition(traitId);
    if (traitDef) {
      hiddenTraits.push(createTraitFromDefinition(traitDef));
    } else {
      console.warn(`[csvLoader] Trait definition not found: ${traitId}`);
    }
  }

  // Merge initial tags
  const tags: ItemTag[] = [...template.initStateTags, ...template.attrTags];

  // Generate estimate range
  const anchor = template.visualValue || template.realValue;
  const width = anchor * template.uncertainty;
  const skewFactor = 0.2 + (Math.random() * 0.6);
  let min = anchor - (width * skewFactor);
  let max = anchor + (width * (1 - skewFactor));
  min = Math.max(0, min);
  max = Math.max(min, max);

  const roundToHuman = (val: number): number => {
    if (val === 0) return 0;
    if (val < 50) return Math.round(val);
    if (val < 200) return Math.round(val / 10) * 10;
    if (val < 1000) return Math.round(val / 50) * 50;
    return Math.round(val / 100) * 100;
  };

  const currentRange: [number, number] = [roundToHuman(min), roundToHuman(max)];

  const item: Item = {
    id: crypto.randomUUID(),
    templateId: template.id,
    name: template.nameDefault,
    nameDefault: template.nameDefault,
    nameRestored: template.nameRestored,
    nameReforged: template.nameReforged,
    category: template.category,
    condition: '',
    visualDescription: template.descDefault,
    descDefault: template.descDefault,
    descRestored: template.descRestored,
    descReforged: template.descReforged,
    historySnippet: '',
    appraisalNote: '',
    archiveSummary: '',
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: false,
    pawnDate: 0,
    status: ItemStatus.ACTIVE,
    pawnAmount: 0,
    realValue: template.realValue,
    perceivedValue: template.visualValue,
    baseValue: template.realValue,
    uncertainty: template.uncertainty,
    currentRange,
    initialRange: currentRange,
    hiddenTraits,
    revealedTraits: [],
    usedTraitIds: [],
    logs: [],
    tags,
    workState: 'DEFAULT',
    knowledgePool: {
      capacity: template.knowCap,
      extracted: 0,
      essenceYield: { craft: 0.34, time: 0.33, vibe: 0.33 }, // Will be recalculated by initializeKnowledgePool
    },
    ...overrides,
  };

  return item;
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;

/**
 * Initialize CSV data (from embedded default data)
 * In production, this data should be loaded from files or API
 */
export function initializeCSVData(itemsCSV?: string, traitsCSV?: string): void {
  if (initialized && !itemsCSV && !traitsCSV) return;

  if (itemsCSV) {
    loadItemTemplatesFromCSV(itemsCSV);
  }
  if (traitsCSV) {
    loadTraitDefinitionsFromCSV(traitsCSV);
  }

  initialized = true;
  // Log loaded counts for debugging
  const fillerCount = Array.from(itemTemplateRegistry.values()).filter(t => t.fillerPool).length;
  const hasDefault = defaultItemTemplate !== null;
  console.log(`[csvLoader] Loaded ${itemTemplateRegistry.size} item templates (${fillerCount} filler pool), ${traitDefinitionRegistry.size} trait definitions, default template: ${hasDefault ? 'yes' : 'MISSING!'}`);

  if (!hasDefault) {
    console.warn('[csvLoader] No _default row found in Items_Base.csv - add a row with ID="_default" for fallback values');
  }

  // Notify other systems that data has been reloaded
  if (onDataReloadCallback) {
    onDataReloadCallback();
  }
}

/**
 * Check if CSV data is initialized
 */
export function isCSVDataInitialized(): boolean {
  return initialized;
}

/**
 * Clear registries (for testing)
 */
export function clearRegistries(): void {
  itemTemplateRegistry.clear();
  traitDefinitionRegistry.clear();
  defaultItemTemplate = null;
  initialized = false;
}
