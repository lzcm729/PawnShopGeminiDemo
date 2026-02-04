/**
 * Generic CSV Reader Utility
 *
 * Provides type-safe CSV parsing with schema-based column definitions.
 * Supports automatic type conversion, BOM handling, and quoted fields.
 */

// ============================================================================
// Types
// ============================================================================

/** Column definition for CSV schema */
export interface ColumnDef<T = unknown> {
  /** Target field name in the output object */
  field: string;
  /** Data type for automatic conversion */
  type: 'string' | 'number' | 'boolean' | 'list';
  /** Delimiter for list type, defaults to ';' */
  delimiter?: string;
  /** Default value if column is missing or empty */
  default?: T;
  /** Custom transform function applied after type conversion */
  transform?: (value: string) => T;
}

/** Schema definition mapping CSV column headers to field definitions */
export type CSVSchema = Record<string, ColumnDef>;

/** Options for parseCSV function */
export interface ParseOptions {
  /** Whether to warn about unknown columns (default: true in dev) */
  warnUnknownColumns?: boolean;
  /** Whether to warn about missing columns (default: false) */
  warnMissingColumns?: boolean;
}

// ============================================================================
// Raw CSV Parsing (handles quotes, BOM, etc.)
// ============================================================================

/**
 * Parse raw CSV string into a 2D array of strings.
 * Handles:
 * - BOM (UTF-8 with BOM)
 * - Quoted fields with commas and newlines
 * - Escaped quotes (doubled quotes)
 * - Mixed line endings (CRLF, LF)
 */
export function parseCSVRaw(csv: string): string[][] {
  // Remove BOM if present
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

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
        // End of quoted field
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
// Type Conversion
// ============================================================================

/**
 * Convert a string value according to column type
 */
function convertValue<T>(
  value: string,
  colDef: ColumnDef<T>
): T | string | number | boolean | string[] {
  // Use custom transform if provided
  if (colDef.transform) {
    return colDef.transform(value);
  }

  // Empty value handling
  if (value === '' || value === undefined || value === null) {
    if (colDef.default !== undefined) {
      return colDef.default;
    }
    // Return type-appropriate empty values
    switch (colDef.type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'list': return [];
    }
  }

  // Type conversion
  switch (colDef.type) {
    case 'string':
      return value;

    case 'number': {
      const num = parseFloat(value);
      return isNaN(num) ? (colDef.default as number ?? 0) : num;
    }

    case 'boolean': {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }

    case 'list': {
      const delimiter = colDef.delimiter ?? ';';
      return value
        .split(delimiter)
        .map(s => s.trim())
        .filter(s => s !== '');
    }

    default:
      return value;
  }
}

// ============================================================================
// Main Parse Function
// ============================================================================

/**
 * Parse CSV content into typed objects using a schema.
 *
 * @param csvContent - Raw CSV string
 * @param schema - Schema mapping column headers to field definitions
 * @param options - Parse options
 * @returns Array of typed objects
 *
 * @example
 * ```typescript
 * const schema: CSVSchema = {
 *   'ID': { field: 'id', type: 'string' },
 *   'Name': { field: 'name', type: 'string' },
 *   'Price': { field: 'price', type: 'number', default: 0 },
 *   'Tags': { field: 'tags', type: 'list', delimiter: ';' },
 *   'Active': { field: 'active', type: 'boolean' },
 * };
 *
 * interface Product {
 *   id: string;
 *   name: string;
 *   price: number;
 *   tags: string[];
 *   active: boolean;
 * }
 *
 * const products = parseCSV<Product>(csvContent, schema);
 * ```
 */
export function parseCSV<T>(
  csvContent: string,
  schema: CSVSchema,
  options: ParseOptions = {}
): T[] {
  const {
    warnUnknownColumns = process.env.NODE_ENV !== 'production',
    warnMissingColumns = false,
  } = options;

  const rows = parseCSVRaw(csvContent);
  if (rows.length < 2) return []; // Need at least header + one data row

  const headers = rows[0];
  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => headerIndex.set(h, i));

  // Check for unknown columns (in CSV but not in schema)
  if (warnUnknownColumns) {
    const schemaColumns = new Set(Object.keys(schema));
    const unknownColumns = headers.filter(h => h && !schemaColumns.has(h));
    if (unknownColumns.length > 0) {
      console.warn(
        `[csvReader] Unknown columns in CSV (not in schema): ${unknownColumns.join(', ')}`
      );
    }
  }

  // Check for missing columns (in schema but not in CSV)
  if (warnMissingColumns) {
    const csvColumns = new Set(headers);
    const missingColumns = Object.keys(schema).filter(k => !csvColumns.has(k));
    if (missingColumns.length > 0) {
      console.warn(
        `[csvReader] Missing columns in CSV (defined in schema): ${missingColumns.join(', ')}`
      );
    }
  }

  const results: T[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty rows
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {};

    // Process each column defined in schema
    for (const [csvColumn, colDef] of Object.entries(schema)) {
      const idx = headerIndex.get(csvColumn);
      const rawValue = idx !== undefined ? (row[idx] || '') : '';
      obj[colDef.field] = convertValue(rawValue, colDef);
    }

    results.push(obj as T);
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple string column definition
 */
export function stringCol(field: string, defaultValue?: string): ColumnDef<string> {
  return { field, type: 'string', default: defaultValue };
}

/**
 * Create a number column definition
 */
export function numberCol(field: string, defaultValue?: number): ColumnDef<number> {
  return { field, type: 'number', default: defaultValue };
}

/**
 * Create a boolean column definition
 */
export function booleanCol(field: string, defaultValue?: boolean): ColumnDef<boolean> {
  return { field, type: 'boolean', default: defaultValue };
}

/**
 * Create a list column definition
 */
export function listCol(
  field: string,
  delimiter: string = ';',
  defaultValue?: string[]
): ColumnDef<string[]> {
  return { field, type: 'list', delimiter, default: defaultValue };
}

/**
 * Create a column with custom transform
 */
export function transformCol<T>(
  field: string,
  transform: (value: string) => T,
  defaultValue?: T
): ColumnDef<T> {
  return { field, type: 'string', transform, default: defaultValue };
}
