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
  liquidation_rate: number;
  warning_threshold: number;
  compensation_multiplier: number;
  resale_premium: number;
  sale_discount: number;
  default_pawn_term_days: number;
  renewal_days: number;
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
  // 不定时小额医疗支出
  random_medical_chance: number;
  random_medical_min: number;
  random_medical_max: number;
  // 健康值每日变化
  health_recovery_rate: number;
  health_decay_rate: number;
  emergency_treatment_cost: number;
  emergency_treatment_heal: number;
  // 健康状态阈值
  health_stable_threshold: number;
  health_declining_threshold: number;
  // 断缴影响
  overdue_health_decay: number;
  complication_health_loss: number;
  overdue_risk_increase: number;
}

interface TomlGameplay {
  initial_action_points: number;
  max_customers_per_day: number;
  daily_challenge_probability: number;
  challenge_profit_target: number;
  base_inventory_capacity: number;
}

interface TomlReputation {
  humanity: number;
  credibility: number;
  innocence: number;
}

interface TomlAppraisalEvents {
  breakthrough_max: number;
  breakthrough_uncertainty_multiplier: number;
  breakthrough_range_shrink: number;
  mishap_max: number;
  mishap_uncertainty_increase: number;
  impatient_max: number;
  lucky_find_max: number;
  fake_pity_multiplier_2: number;
  fake_pity_multiplier_3: number;
  fake_pity_guaranteed: number;
}

interface TomlAppraisal {
  base_discovery_chance: number;
  discovery_difficulty_factor: number;
  normal_shrink_rate: number;
  normal_convergence_speed: number;
  trait_discovery_uncertainty: number;
  mishap_range_expansion: number;
  skew_min: number;
  skew_range: number;
}

interface TomlReputationDeltas {
  // 慈善档(0%)
  charity_generous_humanity: number;
  charity_normal_humanity: number;
  // 援助档(5%)
  aid_credibility: number;
  aid_generous_humanity: number;
  // 标准档(10%)
  standard_credibility: number;
  // 高利贷档(20%)
  shark_humanity: number;
  // 赃物相关
  stolen_known_leverage_innocence: number;
  stolen_known_no_leverage_innocence: number;
  // 违禁品
  contraband_innocence: number;
  contraband_credibility: number;
  // 严打
  crackdown_credibility: number;
  crackdown_innocence: number;
  // 赝品
  fake_credibility: number;
  // 赎回/赔偿
  redemption_success_credibility: number;
  charity_return_humanity: number;
  compensation_humanity: number;
  compensation_credibility: number;
  compensation_innocence: number;
  // 高级交易
  premium_threshold: number;
  premium_value_ratio: number;
}

interface TomlPushPullStrategy {
  base_concession_chance: number;
  concession_ratio: number;
  max_concessions: number;
  base_patience_loss_chance: number;
}

interface TomlNegotiation {
  base_insult_threshold: number;
  insult_clamp_min: number;
  insult_clamp_max: number;
  first_offer_multiplier: number;
  persist_multiplier: number;
  persist_bonus_per_count: number;
  persist_bonus_cap: number;
  behavior_insult_modifiers: Record<string, number>;
  push_pull: {
    SOFT: TomlPushPullStrategy;
    HARD: TomlPushPullStrategy;
    SLY: TomlPushPullStrategy;
    CALM: TomlPushPullStrategy;
  };
}

interface TomlBlackmarket {
  demand_inertia_bonus: number;
  purchase_price_min: number;
  purchase_price_range: number;
  sale_multiplier_min_base: number;
  sale_multiplier_min_range: number;
  sale_multiplier_max_base: number;
  sale_multiplier_max_range: number;
  search_penalty_base: number;
  search_penalty_range: number;
  search_lock_days: number;
  investigation_lock_days: number;
  investigation_rep_loss: number;
  protection_fee_innocence_threshold: number;
  protection_fee_growth_rate: number;
  protection_fee_request_interval: number;
  protection_fee_refusal_cooldown: number;
  refusal_risk_per_time: number;
  refusal_risk_cap: number;
  low_heat_safe_days: number;
  low_heat_price_bonus: number;
  undercover_sale_penalty: number;
}

interface TomlMoralEcho {
  low_threshold: number;
  medium_threshold: number;
}

interface TomlMirrorLaw {
  level1_threshold: number;
  level2_threshold: number;
  level3_threshold: number;
  cooldown_days: number;
}

interface TomlAbility {
  global_floor_reduction_cap: number;
  pressure_base_reduction: number;
  heart_strike_desperate: number;
  heart_strike_hard: number;
  heart_strike_default: number;
  sharp_scrutiny_per_flaw: number;
  timing_bonus_multiplier: number;
  wom_base_chance: number;
  wom_increment: number;
  wom_guarantee_streak: number;
  foresight_fatigue_threshold: number;
  foresight_hope_threshold: number;
  moral_echo: TomlMoralEcho;
  mirror_law: TomlMirrorLaw;
}

interface TomlNpcFiller {
  desired_ratio: number;
  minimum_ratio: number;
  insult_ratio: number;
  base_patience: number;
  rare_encounter_chance: number;
}

interface TomlNews {
  max_display_slots: number;
  max_narrative_slots: number;
  violation_detection_min: number;
  violation_detection_range: number;
}

interface TomlNarrative {
  redeem_hope_threshold: number;
  renew_hope_threshold: number;
  hope_collapse_threshold: number;
}

interface TomlAppointment {
  mystery_visitor_chance: number;
}

interface TomlInsight {
  ap_cost: number;
  base_efficiency: number;
  layer_bonus: number;
  max_efficiency: number;
  generous_threshold: number;
  fair_threshold: number;
  accuracy_high_threshold: number;
  accuracy_low_threshold: number;
}

interface GameConfigToml {
  economy: TomlEconomy;
  night: TomlNight;
  mother: TomlMother;
  gameplay: TomlGameplay;
  reputation: TomlReputation;
  appraisal_events: TomlAppraisalEvents;
  appraisal: TomlAppraisal;
  reputation_deltas: TomlReputationDeltas;
  negotiation: TomlNegotiation;
  blackmarket: TomlBlackmarket;
  ability: TomlAbility;
  npc: { filler: TomlNpcFiller };
  news: TomlNews;
  narrative: TomlNarrative;
  appointment: TomlAppointment;
  insight: TomlInsight;
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

  // --- ECONOMY EXTENDED ---
  ECONOMY: {
    LIQUIDATION_RATE: tomlConfig.economy.liquidation_rate,
    WARNING_THRESHOLD: tomlConfig.economy.warning_threshold,
    COMPENSATION_MULTIPLIER: tomlConfig.economy.compensation_multiplier,
    RESALE_PREMIUM: tomlConfig.economy.resale_premium,
    SALE_DISCOUNT: tomlConfig.economy.sale_discount,
    DEFAULT_PAWN_TERM_DAYS: tomlConfig.economy.default_pawn_term_days,
    RENEWAL_DAYS: tomlConfig.economy.renewal_days,
  },

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
    careLevel: tomlConfig.mother.care_level as 'None' | 'Basic' | 'Premium'
  } as const,

  // --- MOTHER DYNAMIC PARAMETERS (母亲动态参数) ---
  MOTHER: {
    RANDOM_MEDICAL_CHANCE: tomlConfig.mother.random_medical_chance,
    RANDOM_MEDICAL_MIN: tomlConfig.mother.random_medical_min,
    RANDOM_MEDICAL_MAX: tomlConfig.mother.random_medical_max,
    HEALTH_RECOVERY_RATE: tomlConfig.mother.health_recovery_rate,
    HEALTH_DECAY_RATE: tomlConfig.mother.health_decay_rate,
    EMERGENCY_TREATMENT_COST: tomlConfig.mother.emergency_treatment_cost,
    EMERGENCY_TREATMENT_HEAL: tomlConfig.mother.emergency_treatment_heal,
    HEALTH_STABLE_THRESHOLD: tomlConfig.mother.health_stable_threshold,
    HEALTH_DECLINING_THRESHOLD: tomlConfig.mother.health_declining_threshold,
    OVERDUE_HEALTH_DECAY: tomlConfig.mother.overdue_health_decay,
    COMPLICATION_HEALTH_LOSS: tomlConfig.mother.complication_health_loss,
    OVERDUE_RISK_INCREASE: tomlConfig.mother.overdue_risk_increase,
  },

  // --- GAMEPLAY SETTINGS ---
  INITIAL_ACTION_POINTS: tomlConfig.gameplay.initial_action_points,
  MAX_CUSTOMERS_PER_DAY: tomlConfig.gameplay.max_customers_per_day,

  // --- GAMEPLAY EXTENDED ---
  GAMEPLAY: {
    DAILY_CHALLENGE_PROBABILITY: tomlConfig.gameplay.daily_challenge_probability,
    CHALLENGE_PROFIT_TARGET: tomlConfig.gameplay.challenge_profit_target,
    BASE_INVENTORY_CAPACITY: tomlConfig.gameplay.base_inventory_capacity,
  },

  // --- INITIAL REPUTATION ---
  INITIAL_REPUTATION: {
    HUMANITY: tomlConfig.reputation.humanity,
    CREDIBILITY: tomlConfig.reputation.credibility,
    INNOCENCE: tomlConfig.reputation.innocence
  },

  // --- APPRAISAL EVENTS (鉴定意外事件) ---
  APPRAISAL_EVENTS: {
    BREAKTHROUGH_MAX: tomlConfig.appraisal_events.breakthrough_max,
    BREAKTHROUGH_UNCERTAINTY_MULTIPLIER: tomlConfig.appraisal_events.breakthrough_uncertainty_multiplier,
    BREAKTHROUGH_RANGE_SHRINK: tomlConfig.appraisal_events.breakthrough_range_shrink,
    MISHAP_MAX: tomlConfig.appraisal_events.mishap_max,
    MISHAP_UNCERTAINTY_INCREASE: tomlConfig.appraisal_events.mishap_uncertainty_increase,
    IMPATIENT_MAX: tomlConfig.appraisal_events.impatient_max,
    LUCKY_FIND_MAX: tomlConfig.appraisal_events.lucky_find_max,
    FAKE_PITY_MULTIPLIER_2: tomlConfig.appraisal_events.fake_pity_multiplier_2,
    FAKE_PITY_MULTIPLIER_3: tomlConfig.appraisal_events.fake_pity_multiplier_3,
    FAKE_PITY_GUARANTEED: tomlConfig.appraisal_events.fake_pity_guaranteed,
  },

  // --- APPRAISAL SYSTEM (鉴定系统) ---
  APPRAISAL: {
    BASE_DISCOVERY_CHANCE: tomlConfig.appraisal.base_discovery_chance,
    DISCOVERY_DIFFICULTY_FACTOR: tomlConfig.appraisal.discovery_difficulty_factor,
    NORMAL_SHRINK_RATE: tomlConfig.appraisal.normal_shrink_rate,
    NORMAL_CONVERGENCE_SPEED: tomlConfig.appraisal.normal_convergence_speed,
    TRAIT_DISCOVERY_UNCERTAINTY: tomlConfig.appraisal.trait_discovery_uncertainty,
    MISHAP_RANGE_EXPANSION: tomlConfig.appraisal.mishap_range_expansion,
    SKEW_MIN: tomlConfig.appraisal.skew_min,
    SKEW_RANGE: tomlConfig.appraisal.skew_range,
  },

  // --- REPUTATION DELTAS (声誉增减表) ---
  REPUTATION_DELTAS: {
    CHARITY_GENEROUS_HUMANITY: tomlConfig.reputation_deltas.charity_generous_humanity,
    CHARITY_NORMAL_HUMANITY: tomlConfig.reputation_deltas.charity_normal_humanity,
    AID_CREDIBILITY: tomlConfig.reputation_deltas.aid_credibility,
    AID_GENEROUS_HUMANITY: tomlConfig.reputation_deltas.aid_generous_humanity,
    STANDARD_CREDIBILITY: tomlConfig.reputation_deltas.standard_credibility,
    SHARK_HUMANITY: tomlConfig.reputation_deltas.shark_humanity,
    STOLEN_KNOWN_LEVERAGE_INNOCENCE: tomlConfig.reputation_deltas.stolen_known_leverage_innocence,
    STOLEN_KNOWN_NO_LEVERAGE_INNOCENCE: tomlConfig.reputation_deltas.stolen_known_no_leverage_innocence,
    CONTRABAND_INNOCENCE: tomlConfig.reputation_deltas.contraband_innocence,
    CONTRABAND_CREDIBILITY: tomlConfig.reputation_deltas.contraband_credibility,
    CRACKDOWN_CREDIBILITY: tomlConfig.reputation_deltas.crackdown_credibility,
    CRACKDOWN_INNOCENCE: tomlConfig.reputation_deltas.crackdown_innocence,
    FAKE_CREDIBILITY: tomlConfig.reputation_deltas.fake_credibility,
    REDEMPTION_SUCCESS_CREDIBILITY: tomlConfig.reputation_deltas.redemption_success_credibility,
    CHARITY_RETURN_HUMANITY: tomlConfig.reputation_deltas.charity_return_humanity,
    COMPENSATION_HUMANITY: tomlConfig.reputation_deltas.compensation_humanity,
    COMPENSATION_CREDIBILITY: tomlConfig.reputation_deltas.compensation_credibility,
    COMPENSATION_INNOCENCE: tomlConfig.reputation_deltas.compensation_innocence,
    PREMIUM_THRESHOLD: tomlConfig.reputation_deltas.premium_threshold,
    PREMIUM_VALUE_RATIO: tomlConfig.reputation_deltas.premium_value_ratio,
  },

  // --- NEGOTIATION (议价系统) ---
  NEGOTIATION: {
    BASE_INSULT_THRESHOLD: tomlConfig.negotiation.base_insult_threshold,
    INSULT_CLAMP_MIN: tomlConfig.negotiation.insult_clamp_min,
    INSULT_CLAMP_MAX: tomlConfig.negotiation.insult_clamp_max,
    FIRST_OFFER_MULTIPLIER: tomlConfig.negotiation.first_offer_multiplier,
    PERSIST_MULTIPLIER: tomlConfig.negotiation.persist_multiplier,
    PERSIST_BONUS_PER_COUNT: tomlConfig.negotiation.persist_bonus_per_count,
    PERSIST_BONUS_CAP: tomlConfig.negotiation.persist_bonus_cap,
    BEHAVIOR_INSULT_MODIFIERS: tomlConfig.negotiation.behavior_insult_modifiers,
    PUSH_PULL: {
      SOFT: {
        BASE_CONCESSION_CHANCE: tomlConfig.negotiation.push_pull.SOFT.base_concession_chance,
        CONCESSION_RATIO: tomlConfig.negotiation.push_pull.SOFT.concession_ratio,
        MAX_CONCESSIONS: tomlConfig.negotiation.push_pull.SOFT.max_concessions,
        BASE_PATIENCE_LOSS_CHANCE: tomlConfig.negotiation.push_pull.SOFT.base_patience_loss_chance,
      },
      HARD: {
        BASE_CONCESSION_CHANCE: tomlConfig.negotiation.push_pull.HARD.base_concession_chance,
        CONCESSION_RATIO: tomlConfig.negotiation.push_pull.HARD.concession_ratio,
        MAX_CONCESSIONS: tomlConfig.negotiation.push_pull.HARD.max_concessions,
        BASE_PATIENCE_LOSS_CHANCE: tomlConfig.negotiation.push_pull.HARD.base_patience_loss_chance,
      },
      SLY: {
        BASE_CONCESSION_CHANCE: tomlConfig.negotiation.push_pull.SLY.base_concession_chance,
        CONCESSION_RATIO: tomlConfig.negotiation.push_pull.SLY.concession_ratio,
        MAX_CONCESSIONS: tomlConfig.negotiation.push_pull.SLY.max_concessions,
        BASE_PATIENCE_LOSS_CHANCE: tomlConfig.negotiation.push_pull.SLY.base_patience_loss_chance,
      },
      CALM: {
        BASE_CONCESSION_CHANCE: tomlConfig.negotiation.push_pull.CALM.base_concession_chance,
        CONCESSION_RATIO: tomlConfig.negotiation.push_pull.CALM.concession_ratio,
        MAX_CONCESSIONS: tomlConfig.negotiation.push_pull.CALM.max_concessions,
        BASE_PATIENCE_LOSS_CHANCE: tomlConfig.negotiation.push_pull.CALM.base_patience_loss_chance,
      },
    },
  },

  // --- BLACKMARKET (黑市系统) ---
  BLACKMARKET: {
    DEMAND_INERTIA_BONUS: tomlConfig.blackmarket.demand_inertia_bonus,
    PURCHASE_PRICE_MIN: tomlConfig.blackmarket.purchase_price_min,
    PURCHASE_PRICE_RANGE: tomlConfig.blackmarket.purchase_price_range,
    SALE_MULTIPLIER_MIN_BASE: tomlConfig.blackmarket.sale_multiplier_min_base,
    SALE_MULTIPLIER_MIN_RANGE: tomlConfig.blackmarket.sale_multiplier_min_range,
    SALE_MULTIPLIER_MAX_BASE: tomlConfig.blackmarket.sale_multiplier_max_base,
    SALE_MULTIPLIER_MAX_RANGE: tomlConfig.blackmarket.sale_multiplier_max_range,
    SEARCH_PENALTY_BASE: tomlConfig.blackmarket.search_penalty_base,
    SEARCH_PENALTY_RANGE: tomlConfig.blackmarket.search_penalty_range,
    SEARCH_LOCK_DAYS: tomlConfig.blackmarket.search_lock_days,
    INVESTIGATION_LOCK_DAYS: tomlConfig.blackmarket.investigation_lock_days,
    INVESTIGATION_REP_LOSS: tomlConfig.blackmarket.investigation_rep_loss,
    PROTECTION_FEE_INNOCENCE_THRESHOLD: tomlConfig.blackmarket.protection_fee_innocence_threshold,
    PROTECTION_FEE_GROWTH_RATE: tomlConfig.blackmarket.protection_fee_growth_rate,
    PROTECTION_FEE_REQUEST_INTERVAL: tomlConfig.blackmarket.protection_fee_request_interval,
    PROTECTION_FEE_REFUSAL_COOLDOWN: tomlConfig.blackmarket.protection_fee_refusal_cooldown,
    REFUSAL_RISK_PER_TIME: tomlConfig.blackmarket.refusal_risk_per_time,
    REFUSAL_RISK_CAP: tomlConfig.blackmarket.refusal_risk_cap,
    LOW_HEAT_SAFE_DAYS: tomlConfig.blackmarket.low_heat_safe_days,
    LOW_HEAT_PRICE_BONUS: tomlConfig.blackmarket.low_heat_price_bonus,
    UNDERCOVER_SALE_PENALTY: tomlConfig.blackmarket.undercover_sale_penalty,
  },

  // --- ABILITY (角色能力系统) ---
  ABILITY: {
    GLOBAL_FLOOR_REDUCTION_CAP: tomlConfig.ability.global_floor_reduction_cap,
    PRESSURE_BASE_REDUCTION: tomlConfig.ability.pressure_base_reduction,
    HEART_STRIKE_DESPERATE: tomlConfig.ability.heart_strike_desperate,
    HEART_STRIKE_HARD: tomlConfig.ability.heart_strike_hard,
    HEART_STRIKE_DEFAULT: tomlConfig.ability.heart_strike_default,
    SHARP_SCRUTINY_PER_FLAW: tomlConfig.ability.sharp_scrutiny_per_flaw,
    TIMING_BONUS_MULTIPLIER: tomlConfig.ability.timing_bonus_multiplier,
    WOM_BASE_CHANCE: tomlConfig.ability.wom_base_chance,
    WOM_INCREMENT: tomlConfig.ability.wom_increment,
    WOM_GUARANTEE_STREAK: tomlConfig.ability.wom_guarantee_streak,
    FORESIGHT_FATIGUE_THRESHOLD: tomlConfig.ability.foresight_fatigue_threshold,
    FORESIGHT_HOPE_THRESHOLD: tomlConfig.ability.foresight_hope_threshold,
    MORAL_ECHO: {
      LOW_THRESHOLD: tomlConfig.ability.moral_echo.low_threshold,
      MEDIUM_THRESHOLD: tomlConfig.ability.moral_echo.medium_threshold,
    },
    MIRROR_LAW: {
      LEVEL1_THRESHOLD: tomlConfig.ability.mirror_law.level1_threshold,
      LEVEL2_THRESHOLD: tomlConfig.ability.mirror_law.level2_threshold,
      LEVEL3_THRESHOLD: tomlConfig.ability.mirror_law.level3_threshold,
      COOLDOWN_DAYS: tomlConfig.ability.mirror_law.cooldown_days,
    },
  },

  // --- NPC FILLER (NPC 填充参数) ---
  NPC_FILLER: {
    DESIRED_RATIO: tomlConfig.npc.filler.desired_ratio,
    MINIMUM_RATIO: tomlConfig.npc.filler.minimum_ratio,
    INSULT_RATIO: tomlConfig.npc.filler.insult_ratio,
    BASE_PATIENCE: tomlConfig.npc.filler.base_patience,
    RARE_ENCOUNTER_CHANCE: tomlConfig.npc.filler.rare_encounter_chance,
  },

  // --- NEWS (新闻系统) ---
  NEWS: {
    MAX_DISPLAY_SLOTS: tomlConfig.news.max_display_slots,
    MAX_NARRATIVE_SLOTS: tomlConfig.news.max_narrative_slots,
    VIOLATION_DETECTION_MIN: tomlConfig.news.violation_detection_min,
    VIOLATION_DETECTION_RANGE: tomlConfig.news.violation_detection_range,
  },

  // --- NARRATIVE (叙事参数) ---
  NARRATIVE: {
    REDEEM_HOPE_THRESHOLD: tomlConfig.narrative.redeem_hope_threshold,
    RENEW_HOPE_THRESHOLD: tomlConfig.narrative.renew_hope_threshold,
    HOPE_COLLAPSE_THRESHOLD: tomlConfig.narrative.hope_collapse_threshold,
  },

  // --- APPOINTMENT (预约系统) ---
  APPOINTMENT: {
    MYSTERY_VISITOR_CHANCE: tomlConfig.appointment.mystery_visitor_chance,
  },

  // --- INSIGHT (洞察参数) ---
  INSIGHT: {
    AP_COST: tomlConfig.insight.ap_cost,
    BASE_EFFICIENCY: tomlConfig.insight.base_efficiency,
    LAYER_BONUS: tomlConfig.insight.layer_bonus,
    MAX_EFFICIENCY: tomlConfig.insight.max_efficiency,
    GENEROUS_THRESHOLD: tomlConfig.insight.generous_threshold,
    FAIR_THRESHOLD: tomlConfig.insight.fair_threshold,
    ACCURACY_HIGH_THRESHOLD: tomlConfig.insight.accuracy_high_threshold,
    ACCURACY_LOW_THRESHOLD: tomlConfig.insight.accuracy_low_threshold,
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
