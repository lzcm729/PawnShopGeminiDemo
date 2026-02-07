import { EMMA_CHAIN_INIT, SUSAN_CHAIN_INIT, ZHAO_CHAIN_INIT, LIN_CHAIN_INIT } from '../narrative/storyRegistry';
import configToml from '@/config/game.toml';

// ------------------------------------------------------------
// TOML Configuration Types
// ------------------------------------------------------------

interface TomlEconomy {
  initial_funds: number;
  goal_amount: number;
  weekly_medical_cost: number;
  bill_cycle: number;
  daily_expenses: number;
  weekly_rent: number;
  rent_cycle: number;
}

interface TomlNight {
  base_energy: number;
  insight_energy_cost: number;
  default_knowledge_capacity: number;
  insight_extraction_rate_min: number;
  insight_extraction_rate_max: number;
  epiphany_bonus_ratio: number;
  distraction_chance: number;
  remarkable_find_chance: number;
  glimpse_chance: number;
  resonance_chance: number;
  resonance_bonus_ratio: number;
  energy_levels: number[];
  epiphany_residual_uncertainty: number;
  insight_range_shrink_rate: number;
  insight_trait_discovery_chance: number;
  value_lock_threshold: number;
}

interface TomlMother {
  health: number;
  status: string;
  risk: number;
  care_level: string;
}

interface TomlGameplay {
  initial_action_points: number;
  max_customers_per_day: number;
}

interface TomlReputation {
  humanity: number;
  credibility: number;
  innocence: number;
}

interface GameConfigToml {
  economy: TomlEconomy;
  night: TomlNight;
  mother: TomlMother;
  gameplay: TomlGameplay;
  reputation: TomlReputation;
}

// Cast TOML import to typed interface
const tomlConfig = configToml as unknown as GameConfigToml;

// ------------------------------------------------------------
// Exported Game Configuration
// ------------------------------------------------------------

export const GAME_CONFIG = {
  // --- ECONOMY STARTING STATE ---
  INITIAL_FUNDS: tomlConfig.economy.initial_funds,

  // --- SURVIVAL MECHANICS ---
  GOAL_AMOUNT: tomlConfig.economy.goal_amount,
  WEEKLY_MEDICAL_COST: tomlConfig.economy.weekly_medical_cost,
  BILL_CYCLE: tomlConfig.economy.bill_cycle,
  WEEKLY_RENT: tomlConfig.economy.weekly_rent,
  RENT_CYCLE: tomlConfig.economy.rent_cycle,
  DAILY_EXPENSES: tomlConfig.economy.daily_expenses,

  // --- NIGHT PHASE (夜间玩法) ---
  NIGHT: {
    BASE_ENERGY: tomlConfig.night.base_energy,
    INSIGHT_ENERGY_COST: tomlConfig.night.insight_energy_cost,
    DEFAULT_KNOWLEDGE_CAPACITY: tomlConfig.night.default_knowledge_capacity,
    INSIGHT_EXTRACTION_RATE_MIN: tomlConfig.night.insight_extraction_rate_min,
    INSIGHT_EXTRACTION_RATE_MAX: tomlConfig.night.insight_extraction_rate_max,
    EPIPHANY_BONUS_RATIO: tomlConfig.night.epiphany_bonus_ratio,
    DISTRACTION_CHANCE: tomlConfig.night.distraction_chance,
    REMARKABLE_FIND_CHANCE: tomlConfig.night.remarkable_find_chance,
    GLIMPSE_CHANCE: tomlConfig.night.glimpse_chance,
    RESONANCE_CHANCE: tomlConfig.night.resonance_chance,
    RESONANCE_BONUS_RATIO: tomlConfig.night.resonance_bonus_ratio,
    ENERGY_LEVELS: tomlConfig.night.energy_levels,
    EPIPHANY_RESIDUAL_UNCERTAINTY: tomlConfig.night.epiphany_residual_uncertainty,
    INSIGHT_RANGE_SHRINK_RATE: tomlConfig.night.insight_range_shrink_rate,
    INSIGHT_TRAIT_DISCOVERY_CHANCE: tomlConfig.night.insight_trait_discovery_chance,
    VALUE_LOCK_THRESHOLD: tomlConfig.night.value_lock_threshold,
  },

  INITIAL_MOTHER_STATUS: {
    health: tomlConfig.mother.health,
    status: tomlConfig.mother.status as 'Stable' | 'Declining' | 'Critical',
    risk: tomlConfig.mother.risk,
    careLevel: tomlConfig.mother.care_level as 'Basic' | 'Standard' | 'Premium'
  } as const,

  // --- GAMEPLAY SETTINGS ---
  INITIAL_ACTION_POINTS: tomlConfig.gameplay.initial_action_points,
  MAX_CUSTOMERS_PER_DAY: tomlConfig.gameplay.max_customers_per_day,

  // --- INITIAL REPUTATION ---
  INITIAL_REPUTATION: {
    HUMANITY: tomlConfig.reputation.humanity,
    CREDIBILITY: tomlConfig.reputation.credibility,
    INNOCENCE: tomlConfig.reputation.innocence
  },

  // --- NARRATIVE CONFIG ---
  // 在此处配置游戏开始时激活的故事线
  // (保留在代码中，因为需要导入 TypeScript 模块)
  STARTING_CHAINS: [
    EMMA_CHAIN_INIT,      // 艾玛 (失业/求职线)
    SUSAN_CHAIN_INIT,     // 苏珊 (富太/赌博线)
    ZHAO_CHAIN_INIT,      // 周老 (退伍老兵线)
    LIN_CHAIN_INIT        // 小林 (大学生线)
  ]
};
