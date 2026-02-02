
import { EMMA_CHAIN_INIT, SUSAN_CHAIN_INIT, ZHAO_CHAIN_INIT, LIN_CHAIN_INIT, UNDERWORLD_CHAIN_INIT } from '../narrative/storyRegistry';

export const GAME_CONFIG = {
  // --- ECONOMY STARTING STATE ---
  INITIAL_FUNDS: 10000,

  // --- SURVIVAL MECHANICS ---
  GOAL_AMOUNT: 100000,       // 终极目标 (Surgery Cost)
  WEEKLY_MEDICAL_COST: 1000, // 每周医药费
  BILL_CYCLE: 7,             // 医药费缴纳周期 (Days)
  WEEKLY_RENT: 0,            // 店铺周租 (DISABLED: Game focus is on Medical Bill)
  RENT_CYCLE: 7,             // 租金缴纳周期 (Days)
  DAILY_EXPENSES: 50,        // 每日运营/生活成本 (Burn Rate)

  // --- NIGHT PHASE (夜间玩法) ---
  NIGHT: {
    BASE_ENERGY: 3,                    // 每晚基础精力
    INSIGHT_ENERGY_COST: 1,            // 格物消耗精力
    DEFAULT_KNOWLEDGE_CAPACITY: 100,   // 默认知识池容量 (D3: 确保需多夜才能顿悟)
    INSIGHT_EXTRACTION_RATE: 20,       // 每次格物提取量
    EPIPHANY_BONUS_RATIO: 0.2,         // 顿悟额外奖励比例
  },
  
  INITIAL_MOTHER_STATUS: {
      health: 80,
      status: 'Stable',
      risk: 10,
      careLevel: 'Basic'
  } as const,
  
  // --- GAMEPLAY SETTINGS ---
  INITIAL_ACTION_POINTS: 10, // 每日行动点上限 (用于鉴定)
  MAX_CUSTOMERS_PER_DAY: 4,  // 每日营业接待顾客数量上限 (设计配比: 1叙事 : 3填充)

  // --- INITIAL REPUTATION ---
  INITIAL_REPUTATION: {
    HUMANITY: 30,    // 人性 (Heart)
    CREDIBILITY: 20, // 信誉 (Business)
    UNDERWORLD: 5    // 地下 (Shadow)
  },

  // --- NARRATIVE CONFIG ---
  // 在此处配置游戏开始时激活的故事线
  STARTING_CHAINS: [
    EMMA_CHAIN_INIT,      // 艾玛 (失业/求职线)
    SUSAN_CHAIN_INIT,     // 苏珊 (富太/赌博线)
    ZHAO_CHAIN_INIT,      // 周老 (退伍老兵线)
    LIN_CHAIN_INIT,       // 小林 (大学生线)
    UNDERWORLD_CHAIN_INIT // 黑帮 (地下势力线)
  ]
};
