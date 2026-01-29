/**
 * CSV 配置加载器
 *
 * 从 CSV 文件加载物品模板和特征定义，
 * 提供运行时创建物品实例的功能。
 */

import { Item, ItemTrait, ItemStatus, TraitType, WorkState } from './types';
import { ItemTag } from './tags';

// ============================================================================
// 类型定义
// ============================================================================

/** CSV 物品模板（从 Items_Base.csv 加载） */
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
}

/** CSV 特征定义（从 Traits.csv 加载） */
export interface TraitDefinition {
  id: string;
  name: string;
  type: TraitType;
  valueImpact: number;
  detectDiff: number;
  storyText: string;
  dialoguePlayer?: string;
  dialogueCustomer?: string;
}

// ============================================================================
// CSV 解析
// ============================================================================

/**
 * 解析 CSV 字符串为二维数组
 * 支持引号内的逗号和换行
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
        // 转义的引号
        currentField += '"';
        i++;
      } else if (char === '"') {
        // 结束引号
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

  // 处理最后一行
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.length > 1 || currentLine[0] !== '') {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * 解析分号分隔的字符串为数组
 */
function parseSemicolonList(value: string): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(';').map(s => s.trim()).filter(s => s !== '');
}

// ============================================================================
// 注册表
// ============================================================================

/** 物品模板注册表 */
const itemTemplateRegistry = new Map<string, ItemTemplate>();

/** 特征定义注册表 */
const traitDefinitionRegistry = new Map<string, TraitDefinition>();

/**
 * 加载物品模板 CSV
 */
export function loadItemTemplatesFromCSV(csvContent: string): void {
  const rows = parseCSV(csvContent);
  if (rows.length < 2) return; // 至少要有表头和一行数据

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

    const template: ItemTemplate = {
      id: get('ID'),
      nameDefault: get('Name_Default'),
      nameRestored: get('Name_Restored'),
      nameReforged: get('Name_Reforged'),
      category: get('Category'),
      realValue: parseInt(get('Real_Value')) || 0,
      visualValue: parseInt(get('Visual_Value')) || 0,
      uncertainty: parseFloat(get('Uncertainty')) || 0.3,
      initStateTags: parseSemicolonList(get('Init_State_Tags')) as ItemTag[],
      attrTags: parseSemicolonList(get('Attr_Tags')) as ItemTag[],
      hiddenTraitIds: parseSemicolonList(get('Hidden_Traits')),
      knowCap: parseInt(get('Know_Cap')) || 100,
      descDefault: get('Desc_Default'),
      descRestored: get('Desc_Restored') || get('Desc_Default'),
      descReforged: get('Desc_Reforged') || get('Desc_Default'),
    };

    if (template.id) {
      itemTemplateRegistry.set(template.id, template);
    }
  }
}

/**
 * 加载特征定义 CSV
 */
export function loadTraitDefinitionsFromCSV(csvContent: string): void {
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

    const definition: TraitDefinition = {
      id: get('ID'),
      name: get('Name'),
      type: (get('Type') as TraitType) || 'STORY',
      valueImpact: parseFloat(get('Value_Impact')) || 0,
      detectDiff: parseFloat(get('Detect_Diff')) || 0.5,
      storyText: get('Story_Text'),
      dialoguePlayer: get('Dialogue_Player') || undefined,
      dialogueCustomer: get('Dialogue_Customer') || undefined,
    };

    if (definition.id) {
      traitDefinitionRegistry.set(definition.id, definition);
    }
  }
}

// ============================================================================
// 查询 API
// ============================================================================

/**
 * 获取物品模板
 */
export function getItemTemplate(id: string): ItemTemplate | undefined {
  return itemTemplateRegistry.get(id);
}

/**
 * 获取所有物品模板
 */
export function getAllItemTemplates(): ItemTemplate[] {
  return Array.from(itemTemplateRegistry.values());
}

/**
 * 获取特征定义
 */
export function getTraitDefinition(id: string): TraitDefinition | undefined {
  return traitDefinitionRegistry.get(id);
}

/**
 * 获取所有特征定义
 */
export function getAllTraitDefinitions(): TraitDefinition[] {
  return Array.from(traitDefinitionRegistry.values());
}

// ============================================================================
// 物品创建
// ============================================================================

/**
 * 从特征定义创建 ItemTrait 实例
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
        }
      : undefined,
  };
}

/**
 * 从模板创建物品实例
 *
 * @param templateId 物品模板 ID
 * @param overrides 覆盖的字段
 * @returns 新的物品实例，如果模板不存在则返回 null
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

  // 从特征 ID 创建隐藏特征
  const hiddenTraits: ItemTrait[] = [];
  for (const traitId of template.hiddenTraitIds) {
    const traitDef = getTraitDefinition(traitId);
    if (traitDef) {
      hiddenTraits.push(createTraitFromDefinition(traitDef));
    } else {
      console.warn(`[csvLoader] Trait definition not found: ${traitId}`);
    }
  }

  // 合并初始标签
  const tags: ItemTag[] = [...template.initStateTags, ...template.attrTags];

  // 生成估值范围
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
      essenceYield: { craft: 0.34, time: 0.33, vibe: 0.33 }, // 会被 initializeKnowledgePool 重新计算
    },
    ...overrides,
  };

  return item;
}

// ============================================================================
// 初始化
// ============================================================================

let initialized = false;

/**
 * 初始化 CSV 数据（从内嵌的默认数据）
 * 在生产环境中，这些数据应该从文件或 API 加载
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
  console.log(`[csvLoader] Loaded ${itemTemplateRegistry.size} item templates, ${traitDefinitionRegistry.size} trait definitions`);
}

/**
 * 检查是否已初始化
 */
export function isCSVDataInitialized(): boolean {
  return initialized;
}

/**
 * 清空注册表（用于测试）
 */
export function clearRegistries(): void {
  itemTemplateRegistry.clear();
  traitDefinitionRegistry.clear();
  initialized = false;
}
