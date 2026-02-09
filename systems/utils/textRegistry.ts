/**
 * Text Registry Utility
 *
 * Loads narrative text entries from CSV files and provides:
 * - Key-based lookup (e.g., by tag, category, or reason)
 * - Template placeholder replacement ({item_name} -> actual name)
 * - Multiple variants per key (random selection)
 *
 * CSV Format:
 *   key,text
 *   MECHANICAL:钟表,原来如此...{item_name}的秘密...
 *
 * Same key can appear on multiple rows for variant support.
 */

import { parseCSV, CSVSchema, stringCol } from './csvReader';

// ============================================================================
// Types
// ============================================================================

/** A single text entry loaded from CSV */
interface TextEntry {
  key: string;
  text: string;
}

/** Schema for text CSV files */
const TEXT_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

// ============================================================================
// TextRegistry Class
// ============================================================================

/**
 * Registry that holds text entries grouped by key.
 * Supports multiple variants per key and template substitution.
 */
export class TextRegistry {
  private entries = new Map<string, string[]>();
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Load text entries from CSV content.
   * Can be called multiple times to merge entries.
   */
  load(csvContent: string): void {
    const rows = parseCSV<TextEntry>(csvContent, TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.key || !row.text) continue;

      const existing = this.entries.get(row.key);
      if (existing) {
        existing.push(row.text);
      } else {
        this.entries.set(row.key, [row.text]);
      }
    }
  }

  /**
   * Get all text variants for a key.
   * Returns empty array if key not found.
   */
  getAll(key: string): string[] {
    return this.entries.get(key) || [];
  }

  /**
   * Get a single text for a key (first variant).
   * Returns undefined if key not found.
   */
  get(key: string): string | undefined {
    const variants = this.entries.get(key);
    return variants?.[0];
  }

  /**
   * Get a random variant for a key.
   * Returns undefined if key not found.
   */
  getRandom(key: string): string | undefined {
    const variants = this.entries.get(key);
    if (!variants || variants.length === 0) return undefined;
    return variants[Math.floor(Math.random() * variants.length)];
  }

  /**
   * Get a single text with template substitution.
   * Placeholders like {item_name} are replaced with values from the vars object.
   */
  getWithVars(key: string, vars: Record<string, string>): string | undefined {
    const text = this.get(key);
    if (!text) return undefined;
    return applyTemplate(text, vars);
  }

  /**
   * Get a random variant with template substitution.
   */
  getRandomWithVars(key: string, vars: Record<string, string>): string | undefined {
    const text = this.getRandom(key);
    if (!text) return undefined;
    return applyTemplate(text, vars);
  }

  /**
   * Get all variants with template substitution.
   */
  getAllWithVars(key: string, vars: Record<string, string>): string[] {
    return this.getAll(key).map(text => applyTemplate(text, vars));
  }

  /**
   * Look up text by trying multiple keys in order.
   * Returns the first match found, or the fallback key's text.
   *
   * Useful for tag-based lookup with fallback:
   *   resolve(['MECHANICAL:钟表', 'MECHANICAL', '_default'], vars)
   */
  resolve(keys: string[], vars?: Record<string, string>): string | undefined {
    for (const key of keys) {
      const text = vars ? this.getRandomWithVars(key, vars) : this.getRandom(key);
      if (text) return text;
    }
    return undefined;
  }

  /**
   * Look up all variants by trying multiple keys in order.
   * Returns variants from the first key that has entries.
   */
  resolveAll(keys: string[], vars?: Record<string, string>): string[] {
    for (const key of keys) {
      const texts = vars ? this.getAllWithVars(key, vars) : this.getAll(key);
      if (texts.length > 0) return texts;
    }
    return [];
  }

  /**
   * Collect all variants from ALL matching keys (not just first match).
   * Falls back to fallbackKey if no other keys matched.
   *
   * Useful when texts should accumulate from multiple matching tags:
   *   collectAll(['MECHANICAL:钟表', 'GOLD', 'VINTAGE_REAL'], '_default', vars)
   */
  collectAll(keys: string[], fallbackKey?: string, vars?: Record<string, string>): string[] {
    const result: string[] = [];
    for (const key of keys) {
      const texts = vars ? this.getAllWithVars(key, vars) : this.getAll(key);
      result.push(...texts);
    }
    if (result.length === 0 && fallbackKey) {
      const fallback = vars ? this.getAllWithVars(fallbackKey, vars) : this.getAll(fallbackKey);
      result.push(...fallback);
    }
    return result;
  }

  /**
   * Check if registry has any entries for a key.
   */
  has(key: string): boolean {
    const variants = this.entries.get(key);
    return !!variants && variants.length > 0;
  }

  /**
   * Get total number of unique keys.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Get total number of text entries (including variants).
   */
  get totalEntries(): number {
    let count = 0;
    for (const variants of this.entries.values()) {
      count += variants.length;
    }
    return count;
  }
}

// ============================================================================
// Template Substitution
// ============================================================================

/**
 * Replace {placeholder} patterns in text with values from vars.
 * Unknown placeholders are left as-is.
 */
function applyTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create and load a TextRegistry from CSV content.
 */
export function createTextRegistry(name: string, csvContent: string): TextRegistry {
  const registry = new TextRegistry(name);
  registry.load(csvContent);
  return registry;
}
