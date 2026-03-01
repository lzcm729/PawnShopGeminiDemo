/**
 * Card Negotiation System - Card Definitions (K-4)
 *
 * Loads card definitions from CSV and provides the initial deck composition.
 * All card names, descriptions, and effect parameters are data-driven.
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import cardDefsCsv from '@/assets/data/texts/card_definitions.csv?raw';
import customerDropsCsv from '@/assets/data/texts/card_customer_drops.csv?raw';
import { GAME_CONFIG } from '../game/config';
import type {
  Card,
  CardType,
  CardCategory,
  CardEffect,
  CardEffectType,
  CardCustomerType,
  DropCategory,
  TemporaryRetention,
} from './types';

// ============================================================================
// CSV Schema & Row Types
// ============================================================================

interface CardDefRow {
  id: string;
  name: string;
  description: string;
  cardType: string;
  category: string;
  effectType: string;
  effectParams: string;
}

const CARD_DEF_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'name': stringCol('name'),
  'description': stringCol('description'),
  'card_type': stringCol('cardType'),
  'category': stringCol('category'),
  'effect_type': stringCol('effectType'),
  'effect_params': stringCol('effectParams'),
};

interface CustomerDropRow {
  customerType: string;
  cardId: string;
  name: string;
  description: string;
  dropCategory: string;
  effectType: string;
  effectParams: string;
  weight: string;
}

const CUSTOMER_DROP_SCHEMA: CSVSchema = {
  'customer_type': stringCol('customerType'),
  'card_id': stringCol('cardId'),
  'name': stringCol('name'),
  'description': stringCol('description'),
  'drop_category': stringCol('dropCategory'),
  'effect_type': stringCol('effectType'),
  'effect_params': stringCol('effectParams'),
  'weight': stringCol('weight'),
};

// ============================================================================
// Effect Parsing
// ============================================================================

/**
 * Parse an effect params string like "pawnPercent:-5;canDiscoverTrait:true"
 * into a key-value record.
 */
function parseEffectParams(params: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!params) return result;
  for (const pair of params.split(';')) {
    const [key, value] = pair.split(':');
    if (key && value !== undefined) {
      result[key.trim()] = value.trim();
    }
  }
  return result;
}

/**
 * Build a CardEffect from type and params.
 */
function buildEffect(effectType: CardEffectType, params: Record<string, string>): CardEffect {
  switch (effectType) {
    case 'economic':
      return {
        type: 'economic',
        pawnPercent: params.pawnPercent ? Number(params.pawnPercent) : undefined,
        rateAdjust: params.rateAdjust ? Number(params.rateAdjust) : undefined,
        lockRate: params.lockRate === 'true' ? true : undefined,
        resetRate: params.resetRate === 'true' ? true : undefined,
        lockPriceCut: params.lockPriceCut === 'true' ? true : undefined,
      };
    case 'information':
      return {
        type: 'information',
        shrinkPercent: params.shrinkPercent ? Number(params.shrinkPercent) : undefined,
        canDiscoverTrait: params.canDiscoverTrait === 'true' ? true :
                          params.canDiscoverTrait === 'false' ? false : undefined,
        showRedemptionIntent: params.showRedemptionIntent === 'true' ? true : undefined,
        generateInsightCards: params.generateInsightCards === 'true' ? true : undefined,
        vagueInfo: params.vagueInfo === 'true' ? true : undefined,
        successChance: params.successChance ? Number(params.successChance) : undefined,
        addUncertainty: params.addUncertainty ? Number(params.addUncertainty) : undefined,
        insightLayer: params.insightLayer ? Number(params.insightLayer) as 1 | 2 : undefined,
      };
    case 'narrative':
      return {
        type: 'narrative',
        triggerDialogue: params.triggerDialogue || undefined,
        humanityDelta: params.humanityDelta ? Number(params.humanityDelta) : undefined,
        credibilityDelta: params.credibilityDelta ? Number(params.credibilityDelta) : undefined,
        innocenceDelta: params.innocenceDelta ? Number(params.innocenceDelta) : undefined,
      };
    case 'patience':
      return {
        type: 'patience',
        patienceCost: params.patienceCost ? Number(params.patienceCost) : undefined,
        patienceRecover: params.patienceRecover ? Number(params.patienceRecover) : undefined,
      };
  }
}

/**
 * Parse multi-effect type string like "economic;patience"
 * and multi-param string like "pawnPercent:-15;patienceCost:2"
 * into an array of CardEffect.
 */
function parseEffects(effectTypeStr: string, effectParamsStr: string): CardEffect[] {
  const types = effectTypeStr.split(';').map(s => s.trim()) as CardEffectType[];
  const allParams = parseEffectParams(effectParamsStr);

  // For single type, return one effect with all params
  if (types.length === 1) {
    return [buildEffect(types[0], allParams)];
  }

  // For multi-type, distribute params to effects based on param name patterns
  const effects: CardEffect[] = [];
  for (const t of types) {
    const effectParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(allParams)) {
      // Assign params to the right effect type based on known param names
      if (t === 'economic' && ['pawnPercent', 'rateAdjust', 'lockRate', 'resetRate', 'lockPriceCut'].includes(key)) {
        effectParams[key] = value;
      } else if (t === 'information' && ['shrinkPercent', 'canDiscoverTrait', 'showRedemptionIntent', 'generateInsightCards', 'vagueInfo', 'successChance', 'addUncertainty', 'insightLayer'].includes(key)) {
        effectParams[key] = value;
      } else if (t === 'narrative' && ['triggerDialogue', 'humanityDelta', 'credibilityDelta', 'innocenceDelta'].includes(key)) {
        effectParams[key] = value;
      } else if (t === 'patience' && ['patienceCost', 'patienceRecover'].includes(key)) {
        effectParams[key] = value;
      }
    }
    if (Object.keys(effectParams).length > 0) {
      effects.push(buildEffect(t, effectParams));
    }
  }
  return effects;
}

// ============================================================================
// Card Definition Cache
// ============================================================================

let _cardDefs: Map<string, Card> | null = null;

function getCardDefinitions(): Map<string, Card> {
  if (!_cardDefs) {
    _cardDefs = new Map();
    const rows = parseCSV<CardDefRow>(cardDefsCsv, CARD_DEF_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.id) continue;
      const effects = parseEffects(row.effectType, row.effectParams);
      const card: Card = {
        id: row.id,
        instanceId: row.id, // Template cards use id as instanceId
        name: row.name,
        description: row.description,
        cardType: row.cardType as CardType,
        category: row.category as CardCategory,
        effects,
      };
      _cardDefs.set(row.id, card);
    }
  }
  return _cardDefs;
}

/**
 * Get a card definition by ID.
 */
export function getCardDefinition(id: string): Card | undefined {
  return getCardDefinitions().get(id);
}

/**
 * Get all card definitions.
 */
export function getAllCardDefinitions(): Card[] {
  return Array.from(getCardDefinitions().values());
}

// ============================================================================
// Customer Drop Table Cache
// ============================================================================

export interface CustomerDropEntry {
  card: Card;
  dropCategory: DropCategory;
  weight: number;
}

let _dropTables: Map<CardCustomerType, CustomerDropEntry[]> | null = null;

function getDropTables(): Map<CardCustomerType, CustomerDropEntry[]> {
  if (!_dropTables) {
    _dropTables = new Map();
    const rows = parseCSV<CustomerDropRow>(customerDropsCsv, CUSTOMER_DROP_SCHEMA, {
      warnUnknownColumns: false,
    });

    for (const row of rows) {
      if (!row.cardId) continue;
      const custType = row.customerType as CardCustomerType;
      const effects = parseEffects(row.effectType, row.effectParams);

      const card: Card = {
        id: row.cardId,
        instanceId: row.cardId, // Will get unique instanceId when instantiated
        name: row.name,
        description: row.description,
        cardType: 'temporary',
        category: row.dropCategory as CardCategory,
        effects,
        temporarySource: 'customer_drop',
        temporaryRetention: row.dropCategory === 'narrative' ? 'retain' : 'discard',
      };

      const entry: CustomerDropEntry = {
        card,
        dropCategory: row.dropCategory as DropCategory,
        weight: Number(row.weight) || 10,
      };

      const existing = _dropTables.get(custType);
      if (existing) {
        existing.push(entry);
      } else {
        _dropTables.set(custType, [entry]);
      }
    }
  }
  return _dropTables;
}

/**
 * Get the drop table for a customer type.
 */
export function getCustomerDropTable(customerType: CardCustomerType): CustomerDropEntry[] {
  return getDropTables().get(customerType) || [];
}

// ============================================================================
// Initial Deck Composition
// ============================================================================

let _instanceCounter = 0;

/**
 * Generate a unique instance ID for a card.
 */
export function generateInstanceId(baseId: string): string {
  _instanceCounter++;
  return `${baseId}_${_instanceCounter}`;
}

/**
 * Create a card instance from a definition ID.
 * Each instance gets a unique instanceId.
 */
export function createCardInstance(defId: string): Card | null {
  const def = getCardDefinition(defId);
  if (!def) return null;
  return {
    ...def,
    instanceId: generateInstanceId(defId),
  };
}

/**
 * Build the initial deck for a new day.
 * Composition: 3 appraisal consumable + 2 insight consumable + economic/info permanent cards
 */
export function buildInitialDeck(): Card[] {
  const config = GAME_CONFIG.CARD_NEGOTIATION;
  const cards: Card[] = [];

  // Consumable: Appraisal cards
  const appraisalCount = config.INITIAL_APPRAISAL_CARDS;
  const appraisalIds = ['appraisal', 'appraisal_2', 'appraisal_3'];
  for (let i = 0; i < appraisalCount; i++) {
    const defId = appraisalIds[i] || 'appraisal';
    const card = createCardInstance(defId);
    if (card) cards.push(card);
  }

  // Consumable: Insight cards
  const insightCount = config.INITIAL_INSIGHT_CARDS;
  const insightIds = ['insight', 'insight_2'];
  for (let i = 0; i < insightCount; i++) {
    const defId = insightIds[i] || 'insight';
    const card = createCardInstance(defId);
    if (card) cards.push(card);
  }

  // Permanent: Economic cards (enough to fill ~15 cards total)
  const permanentDefs: [string, number][] = [
    ['price_cut_small', 2],
    ['price_cut_medium', 1],
    ['price_boost', 1],
    ['rate_up', 2],
    ['rate_up_2', 1],
    ['showdown_price', 1],
    ['lock_rate', 1],
    ['conscience', 1],
    // Weakened info cards
    ['basic_observation', 1],
    ['intuition', 1],
  ];

  for (const [defId, count] of permanentDefs) {
    for (let i = 0; i < count; i++) {
      const card = createCardInstance(defId);
      if (card) cards.push(card);
    }
  }

  return cards;
}

/**
 * Create a temporary card for trait discovery.
 */
export function createTraitCard(
  traitType: 'FLAW' | 'FAKE' | 'STORY' | 'STOLEN' | 'JACKPOT',
  traitName: string,
  traitDescription: string,
  valueImpact: number,
): Card {
  const retention: TemporaryRetention = traitType === 'STORY' ? 'retain' : 'retain';

  const effects: CardEffect[] = [];

  switch (traitType) {
    case 'FLAW':
      effects.push({
        type: 'economic',
        pawnPercent: Math.round(valueImpact * 100), // e.g., -0.08 -> -8
      });
      break;
    case 'FAKE':
      effects.push({
        type: 'economic',
        pawnPercent: -30,
      });
      effects.push({
        type: 'information',
        // Estimate collapse handled by effects engine
      });
      break;
    case 'STORY':
      effects.push({
        type: 'narrative',
        triggerDialogue: `trait_story_${traitName}`,
      });
      break;
    case 'STOLEN':
      effects.push({
        type: 'economic',
        pawnPercent: -20,
      });
      effects.push({
        type: 'narrative',
        innocenceDelta: -2,
      });
      break;
    case 'JACKPOT':
      effects.push({
        type: 'information',
        // Estimate jump handled by effects engine
      });
      break;
  }

  return {
    id: `trait_${traitType.toLowerCase()}_${Date.now()}`,
    instanceId: generateInstanceId(`trait_${traitType.toLowerCase()}`),
    name: traitName,
    description: traitDescription,
    cardType: 'temporary',
    category: traitType === 'STORY' ? 'narrative' : 'information',
    effects,
    temporarySource: 'trait_discovery',
    temporaryRetention: retention,
    hasChoice: traitType === 'FLAW' || traitType === 'FAKE' || traitType === 'JACKPOT',
  };
}

/**
 * Create empathy/probe temporary cards from insight.
 */
export function createInsightCards(): [Card, Card] {
  const empathy: Card = {
    id: 'empathy',
    instanceId: generateInstanceId('empathy'),
    name: '共情',
    description: '尝试理解客户的处境和感受',
    cardType: 'temporary',
    category: 'narrative',
    effects: [],  // Mechanical effects handled by hook
    temporarySource: 'insight_unlock',
    temporaryRetention: 'retain',
  };

  const probe: Card = {
    id: 'probe',
    instanceId: generateInstanceId('probe'),
    name: '试探',
    description: '试探客户的底线和弱点',
    cardType: 'temporary',
    category: 'information',
    effects: [],  // Mechanical effects handled by hook
    temporarySource: 'insight_unlock',
    temporaryRetention: 'retain',
  };

  return [empathy, probe];
}
