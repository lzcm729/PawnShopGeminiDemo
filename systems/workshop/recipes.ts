/**
 * 工作台配方定义 (Workshop Recipes)
 *
 * 定义所有可用的修复和重铸配方。
 * 参考设计文档 3.2/3.3节。
 *
 * 数据来源：
 * - 文本（name, description, riskNote）→ assets/data/texts/workshop_recipes.csv
 * - 数值（baseCost, energyCost, 品质分布等）→ config/game.toml [workshop.recipes.*]
 * - 代码标识（tags, booleans）→ 本文件硬编码（程序员维护）
 */

import { RestoreRecipe, ReforgeRecipe, Recipe, QualityOutcome } from './types';
import { GAME_CONFIG } from '../game/config';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import recipesCSV from '@/assets/data/texts/workshop_recipes.csv?raw';

// ============================================================================
// CSV Loading (texts)
// ============================================================================

interface RecipeTextRow {
  id: string;
  name: string;
  description: string;
  riskNote: string;
}

const RECIPE_TEXT_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'name': stringCol('name'),
  'description': stringCol('description'),
  'riskNote': stringCol('riskNote'),
};

/** Parsed recipe texts, lazily initialized */
let recipeTextMap: Map<string, RecipeTextRow> | null = null;

function getRecipeTextMap(): Map<string, RecipeTextRow> {
  if (!recipeTextMap) {
    recipeTextMap = new Map();
    const rows = parseCSV<RecipeTextRow>(recipesCSV, RECIPE_TEXT_SCHEMA, {
      warnUnknownColumns: false,
    });
    for (const row of rows) {
      if (!row.id) continue;
      recipeTextMap.set(row.id, row);
    }
  }
  return recipeTextMap;
}

function getText(id: string): RecipeTextRow {
  const row = getRecipeTextMap().get(id);
  return row ?? { id, name: id, description: '', riskNote: '' };
}

// ============================================================================
// TOML config helpers
// ============================================================================

function getRecipeConfig(id: string) {
  return GAME_CONFIG.WORKSHOP.RECIPES[id] ?? { energy_cost: 1 };
}

function buildQualityOutcomes(id: string): QualityOutcome[] | undefined {
  const cfg = getRecipeConfig(id);
  if (cfg.masterwork_probability == null) return undefined;
  return [
    { quality: 'MASTERWORK', probability: cfg.masterwork_probability!, valueMultiplier: cfg.masterwork_multiplier ?? 1.0 },
    { quality: 'NORMAL',     probability: cfg.normal_probability ?? 0,  valueMultiplier: cfg.normal_multiplier ?? 1.0 },
    { quality: 'FLAWED',     probability: cfg.flawed_probability ?? 0,  valueMultiplier: cfg.flawed_multiplier ?? 1.0 },
    { quality: 'FAILED',     probability: cfg.failed_probability ?? 0,  valueMultiplier: cfg.failed_multiplier ?? 0.0 },
  ];
}

// ============================================================================
// 修复配方（设计文档 3.2节）
// ============================================================================

function buildRestoreRecipes(): RestoreRecipe[] {
  const t = getText;
  const c = getRecipeConfig;
  return [
    {
      id: 'restore_clean',
      type: 'RESTORE',
      name: t('restore_clean').name,
      description: t('restore_clean').description,
      targetTag: 'DIRTY',
      baseCost: {},
      energyCost: c('restore_clean').energy_cost,
    },
    {
      id: 'restore_derust',
      type: 'RESTORE',
      name: t('restore_derust').name,
      description: t('restore_derust').description,
      targetTag: 'RUSTED',
      baseCost: { craft: c('restore_derust').craft, time: c('restore_derust').time },
      energyCost: c('restore_derust').energy_cost,
    },
    {
      id: 'restore_broken_mechanical',
      type: 'RESTORE',
      name: t('restore_broken_mechanical').name,
      description: t('restore_broken_mechanical').description,
      targetTag: 'BROKEN',
      baseCost: { craft: c('restore_broken_mechanical').craft, time: c('restore_broken_mechanical').time },
      energyCost: c('restore_broken_mechanical').energy_cost,
    },
    {
      id: 'restore_broken_artistic',
      type: 'RESTORE',
      name: t('restore_broken_artistic').name,
      description: t('restore_broken_artistic').description,
      targetTag: 'BROKEN',
      requiredTags: ['ARTISTIC'],
      baseCost: { craft: c('restore_broken_artistic').craft, time: c('restore_broken_artistic').time, vibe: c('restore_broken_artistic').vibe },
      energyCost: c('restore_broken_artistic').energy_cost,
    },
    {
      id: 'restore_full_refurbish',
      type: 'RESTORE',
      name: t('restore_full_refurbish').name,
      description: t('restore_full_refurbish').description,
      targetAll: true,
      baseCost: { craft: c('restore_full_refurbish').craft, time: c('restore_full_refurbish').time, vibe: c('restore_full_refurbish').vibe },
      energyCost: c('restore_full_refurbish').energy_cost,
    },
  ];
}

// ============================================================================
// 重铸配方（设计文档 3.3节）
// ============================================================================

function buildReforgeRecipes(): ReforgeRecipe[] {
  const t = getText;
  const c = getRecipeConfig;
  return [
    // ---- EARLY RECIPES (Day 1+): Deterministic, guaranteed results ----
    {
      id: 'reforge_fake_history',
      type: 'REFORGE',
      name: t('reforge_fake_history').name,
      description: t('reforge_fake_history').description,
      resultTag: 'FAKE_HISTORY',
      baseCost: { craft: c('reforge_fake_history').craft, time: c('reforge_fake_history').time },
      energyCost: c('reforge_fake_history').energy_cost,
      requiredTags: ['VINTAGE_REAL'],
      excludedTags: ['FAKE_HISTORY', 'IMPERIAL'],
      riskNote: t('reforge_fake_history').riskNote,
    },
    {
      id: 'reforge_art_enhanced',
      type: 'REFORGE',
      name: t('reforge_art_enhanced').name,
      description: t('reforge_art_enhanced').description,
      resultTag: 'ART_ENHANCED',
      baseCost: { craft: c('reforge_art_enhanced').craft, time: c('reforge_art_enhanced').time, vibe: c('reforge_art_enhanced').vibe },
      energyCost: c('reforge_art_enhanced').energy_cost,
      requiredTags: ['ARTISTIC'],
      excludedTags: ['ART_ENHANCED'],
      riskNote: t('reforge_art_enhanced').riskNote,
      surpriseDiscoveryChance: c('reforge_art_enhanced').surprise_discovery_chance,
    },

    // ---- MID-GAME RECIPES (Day 15+): Probabilistic, quality variance ----
    {
      id: 'reforge_imperial',
      type: 'REFORGE',
      name: t('reforge_imperial').name,
      description: t('reforge_imperial').description,
      resultTag: 'IMPERIAL',
      baseCost: { craft: c('reforge_imperial').craft, time: c('reforge_imperial').time, vibe: c('reforge_imperial').vibe },
      energyCost: c('reforge_imperial').energy_cost,
      requiredTags: ['VINTAGE_REAL', 'ARTISTIC'],
      excludedTags: ['IMPERIAL', 'FAKE_HISTORY'],
      riskNote: t('reforge_imperial').riskNote,
      minDay: c('reforge_imperial').min_day,
      probabilistic: true,
      qualityOutcomes: buildQualityOutcomes('reforge_imperial'),
      surpriseDiscoveryChance: c('reforge_imperial').surprise_discovery_chance,
    },

    // ---- LATE-GAME RECIPES (Day 22+): High risk, high reward ----
    {
      id: 'reforge_master_forgery',
      type: 'REFORGE',
      name: t('reforge_master_forgery').name,
      description: t('reforge_master_forgery').description,
      resultTag: 'IMPERIAL',
      baseCost: { craft: c('reforge_master_forgery').craft, time: c('reforge_master_forgery').time, vibe: c('reforge_master_forgery').vibe },
      energyCost: c('reforge_master_forgery').energy_cost,
      nightsRequired: c('reforge_master_forgery').nights_required,
      requiredTags: ['VINTAGE_REAL'],
      excludedTags: ['IMPERIAL', 'FAKE_HISTORY'],
      riskNote: t('reforge_master_forgery').riskNote,
      minDay: c('reforge_master_forgery').min_day,
      probabilistic: true,
      qualityOutcomes: buildQualityOutcomes('reforge_master_forgery'),
      surpriseDiscoveryChance: c('reforge_master_forgery').surprise_discovery_chance,
    },
  ];
}

// ============================================================================
// 配方查询
// ============================================================================

export const RESTORE_RECIPES: RestoreRecipe[] = buildRestoreRecipes();
export const REFORGE_RECIPES: ReforgeRecipe[] = buildReforgeRecipes();
export const ALL_RECIPES: Recipe[] = [...RESTORE_RECIPES, ...REFORGE_RECIPES];

export function getRecipeById(id: string): Recipe | undefined {
  return ALL_RECIPES.find(r => r.id === id);
}
