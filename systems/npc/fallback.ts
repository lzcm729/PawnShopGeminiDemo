/**
 * Fallback 客户生成器
 *
 * 当 AI 生成失败时使用的预设客户数据。
 * 客户对话和属性从 CSV 加载，物品使用 CSV 模板系统创建。
 */

import { Customer } from "../../types";
import { Item, ItemStatus } from "../items/types";
import { Mood, BehaviorTag } from "../core/types";
import { createItemFromTemplate } from "../items/csvLoader";
import { initializeKnowledgePool } from "../items/tagUtils";
import { parseCSV, CSVSchema, stringCol, numberCol, booleanCol } from '../utils/csvReader';
import fallbackCsv from '@/assets/data/texts/fallback_customers.csv?raw';
import defaultsCsv from '@/assets/data/texts/mail_defaults.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

interface FallbackCustomerRow {
  id: string;
  templateId: string;
  name: string;
  description: string;
  avatarSeed: string;
  patience: number;
  mood: string;
  redemptionResolve: string;
  desiredAmount: number;
  minimumAmount: number;
  survivalMinimum: number;
  maxRepayment: number;
  historySnippet: string;
  archiveSummary: string;
  isStolen: boolean;
  sentimentalValue: boolean;
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
  behaviorTags: string;
  identityTags: string;
}

const FALLBACK_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'templateId': stringCol('templateId'),
  'name': stringCol('name'),
  'description': stringCol('description'),
  'avatarSeed': stringCol('avatarSeed'),
  'patience': numberCol('patience'),
  'mood': stringCol('mood'),
  'redemptionResolve': stringCol('redemptionResolve'),
  'desiredAmount': numberCol('desiredAmount'),
  'minimumAmount': numberCol('minimumAmount'),
  'survivalMinimum': numberCol('survivalMinimum'),
  'maxRepayment': numberCol('maxRepayment'),
  'historySnippet': stringCol('historySnippet'),
  'archiveSummary': stringCol('archiveSummary'),
  'isStolen': booleanCol('isStolen'),
  'sentimentalValue': booleanCol('sentimentalValue'),
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
  'behaviorTags': stringCol('behaviorTags'),
  'identityTags': stringCol('identityTags'),
};

// ============================================================================
// Default Texts (from mail_defaults.csv)
// ============================================================================

interface DefaultTextRow {
  key: string;
  text: string;
}

const DEFAULTS_SCHEMA: CSVSchema = {
  'key': stringCol('key'),
  'text': stringCol('text'),
};

let _defaults: Map<string, string> | null = null;

function getDefaults(): Map<string, string> {
  if (!_defaults) {
    _defaults = new Map();
    const rows = parseCSV<DefaultTextRow>(defaultsCsv, DEFAULTS_SCHEMA, {
      warnUnknownColumns: false,
    });
    for (const row of rows) {
      if (row.key) _defaults.set(row.key, row.text);
    }
  }
  return _defaults;
}

function getDefaultText(key: string, fallback: string): string {
  return getDefaults().get(key) ?? fallback;
}

// ============================================================================
// Lazy Initialization
// ============================================================================

interface FallbackCustomerPreset {
  templateId: string;
  customer: Omit<Partial<Customer>, 'item'>;
  itemOverrides?: Partial<Item>;
}

let _presets: FallbackCustomerPreset[] | null = null;

function getPresets(): FallbackCustomerPreset[] {
  if (_presets) return _presets;

  const rows = parseCSV<FallbackCustomerRow>(fallbackCsv, FALLBACK_SCHEMA, {
    warnUnknownColumns: false,
  });

  _presets = rows
    .filter(row => row.id && row.templateId)
    .map(row => ({
      templateId: row.templateId,
      itemOverrides: {
        historySnippet: row.historySnippet,
        archiveSummary: row.archiveSummary,
        ...(row.isStolen ? { isStolen: true } : {}),
        ...(row.sentimentalValue ? { sentimentalValue: true } : {}),
      } as Partial<Item>,
      customer: {
        name: row.name,
        description: row.description,
        avatarSeed: row.avatarSeed,
        dialogue: {
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
        },
        redemptionResolve: row.redemptionResolve as 'Strong' | 'Medium' | 'Weak' | 'None',
        behaviorTags: (row.behaviorTags
          ? row.behaviorTags.split(',').map(s => s.trim()).filter(s => s !== '')
          : []) as BehaviorTag[],
        patience: row.patience,
        mood: row.mood as Mood,
        identityTags: row.identityTags
          ? row.identityTags.split(',').map(s => s.trim()).filter(s => s !== '')
          : [],
        desiredAmount: row.desiredAmount,
        minimumAmount: row.minimumAmount,
        survivalMinimum: row.survivalMinimum,
        maxRepayment: row.maxRepayment,
      },
    }));

  return _presets;
}

// ============================================================================
// 公开 API
// ============================================================================

/**
 * 获取一个随机的 fallback 客户
 * @param day 当前游戏天数
 * @param excludeTemplateIds 要排除的物品模板 ID（库存中已有的物品）
 *                           如果所有模板都被排除，则允许重复（降级处理）
 * @returns 完整的客户对象
 */
export const getFallbackCustomer = (day: number, excludeTemplateIds?: Set<string>): Customer => {
  const presets = getPresets();
  // Filter presets to exclude items already in inventory
  let availablePresets = presets;
  if (excludeTemplateIds && excludeTemplateIds.size > 0) {
    const filtered = presets.filter(p => !excludeTemplateIds.has(p.templateId));
    // Only use filtered list if there are options left; otherwise fall back to all presets
    if (filtered.length > 0) {
      availablePresets = filtered;
    }
  }
  const preset = availablePresets[Math.floor(Math.random() * availablePresets.length)];
  return createCustomerFromPreset(preset, day);
};

/**
 * 获取指定索引的 fallback 客户（用于测试）
 */
export const getFallbackCustomerByIndex = (index: number, day: number): Customer => {
  const presets = getPresets();
  const preset = presets[index % presets.length];
  return createCustomerFromPreset(preset, day);
};

/**
 * 获取所有 fallback 客户预设的数量
 */
export const getFallbackCustomerCount = (): number => getPresets().length;

// ============================================================================
// 内部函数
// ============================================================================

/**
 * 从预设创建完整的客户对象
 */
function createCustomerFromPreset(preset: FallbackCustomerPreset, day: number): Customer {
  // 从模板创建物品
  let item = createItemFromTemplate(preset.templateId, {
    pawnDate: day,
    status: ItemStatus.ACTIVE,
    ...preset.itemOverrides,
  });

  // 如果模板不存在，使用兜底物品
  if (!item) {
    console.warn(`[fallback] Template not found: ${preset.templateId}, using fallback item`);
    item = createFallbackItem(day);
  }

  // 初始化知识池
  item = initializeKnowledgePool(item);

  return {
    id: crypto.randomUUID(),
    interactionType: 'PAWN',
    ...preset.customer,
    avatarSeed: preset.customer.avatarSeed + "_" + day,
    item,
  } as Customer;
}

/**
 * 创建兜底物品（当模板加载失败时使用）
 */
function createFallbackItem(day: number): Item {
  const name = getDefaultText('fallback_item_name', 'Unknown Item');
  const desc = getDefaultText('fallback_item_visualDescription', 'An item of unknown origin.');
  return {
    id: crypto.randomUUID(),
    name,
    nameDefault: name,
    nameRestored: getDefaultText('fallback_item_nameRestored', name),
    nameReforged: getDefaultText('fallback_item_nameReforged', name),
    category: getDefaultText('fallback_item_category', 'Other'),
    condition: getDefaultText('fallback_item_condition', 'Unknown'),
    visualDescription: desc,
    descDefault: desc,
    historySnippet: "",
    appraisalNote: "",
    archiveSummary: getDefaultText('fallback_item_archiveSummary', name),
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: false,
    pawnDate: day,
    status: ItemStatus.ACTIVE,
    pawnAmount: 0,
    realValue: 100,
    perceivedValue: 100,
    baseValue: 100,
    uncertainty: 0.3,
    currentRange: [70, 130],
    initialRange: [70, 130],
    hiddenTraits: [],
    revealedTraits: [],
    usedTraitIds: [],
    logs: [],
    tags: [],
    workState: 'DEFAULT',
  };
}

// 保留旧的导出以保持向后兼容
export const FALLBACK_CUSTOMERS = new Proxy([] as Omit<Partial<Customer>, 'item'>[], {
  get(_, prop) {
    const data = getPresets().map(p => p.customer);
    if (prop === 'length') return data.length;
    if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return data[Number(prop)];
    if (typeof prop === 'string' && typeof (data as any)[prop] === 'function') {
      return (data as any)[prop].bind(data);
    }
    return (data as any)[prop as any];
  },
});
