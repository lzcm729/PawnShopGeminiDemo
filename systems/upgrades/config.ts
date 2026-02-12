
// Shop Upgrade Configuration
// Defines all available upgrades, their costs, and effects

import { UpgradeConfig, AppointmentBoardLevelConfig, BlackMarketLevelConfig } from './types';
import { GAME_CONFIG } from '../game/config';

/**
 * Storage Expansion (Backroom)
 * Increases inventory capacity
 * No maintenance cost, permanently active
 */
export const STORAGE_EXPANSION: UpgradeConfig = {
  id: 'storage_expansion',
  name: 'Storage Expansion',
  nameCn: '储物架扩展',
  description: 'Expand storage shelves to hold more pawned items.',
  location: 'BACKROOM',
  effectType: 'INVENTORY_CAPACITY',
  maxLevel: 5,
  levels: [
    { level: 1, cost: 500,  effectValue: 1, description: '总共+1（累计6位）' },
    { level: 2, cost: 1000, effectValue: 2, description: '总共+2（累计7位）' },
    { level: 3, cost: 2000, effectValue: 3, description: '总共+3（累计8位），解锁「分类摆放」' },
    { level: 4, cost: 4000, effectValue: 4, description: '总共+4（累计9位）' },
    { level: 5, cost: 8000, effectValue: 5, description: '总共+5（累计10位）' },
  ],
  icon: 'Package',
};

/**
 * Workshop Expansion (Backroom)
 * Increases night energy cap
 * No maintenance cost, permanently active
 * Renamed from Precision Bench per design doc v1.1
 */
export const PRECISION_BENCH: UpgradeConfig = {
  id: 'precision_bench',
  name: 'Workshop Expansion',
  nameCn: '工坊扩建',
  description: 'Expand the workshop to allow more night activities.',
  location: 'BACKROOM',
  effectType: 'NIGHT_ENERGY',
  maxLevel: 3,
  levels: [
    { level: 1, cost: 1500, effectValue: 1, description: '总共+1精力（上限3→4）' },
    { level: 2, cost: 3000, effectValue: 2, description: '总共+2精力（上限3→5）' },
    { level: 3, cost: 6000, effectValue: 3, description: '总共+3精力（上限3→6），解锁新夜间活动' },
  ],
  icon: 'Wrench',
};

/**
 * Tea Set (Counter)
 * Increases customer patience
 * Has maintenance cost, can be toggled on/off each night
 */
export const TEA_SET: UpgradeConfig = {
  id: 'tea_set',
  name: 'Tea Set',
  nameCn: '茶具套装',
  description: 'Offer tea to customers, improving their patience.',
  location: 'COUNTER',
  effectType: 'PATIENCE_BONUS',
  maxLevel: 3,
  levels: [
    { level: 1, cost: 800,  effectValue: 1, maintenanceCost: 20, description: '总共+1耐心（维护$20/天）' },
    { level: 2, cost: 1500, effectValue: 2, maintenanceCost: 35, description: '总共+2耐心（维护$35/天）' },
    { level: 3, cost: 3000, effectValue: 3, maintenanceCost: 50, description: '总共+3耐心（维护$50/天）' },
  ],
  icon: 'Coffee',
};

/**
 * Spectrometer (Counter)
 * Detects anomalies between perceived and real value (fakes or bargains)
 * Has maintenance cost, can be toggled on/off each night
 */
export const SPECTROMETER: UpgradeConfig = {
  id: 'spectrometer',
  name: 'Spectrometer',
  nameCn: '光谱分析仪',
  description: 'Detect anomalies between perceived and real value.',
  location: 'COUNTER',
  effectType: 'ANOMALY_DETECTION',
  maxLevel: 3,
  levels: [
    { level: 1, cost: 2000, effectValue: 50, maintenanceCost: 30, description: '检测偏差>50%（维护$30/天）' },
    { level: 2, cost: 4000, effectValue: 30, maintenanceCost: 50, description: '检测偏差>30%（维护$50/天）' },
    { level: 3, cost: 8000, effectValue: 20, maintenanceCost: 80, description: '检测偏差>20%（维护$80/天）' },
  ],
  icon: 'Scan',
};

/**
 * Appointment Board (Backroom)
 * Preview and invite additional customers
 * No maintenance cost, permanently active
 */
export const APPOINTMENT_BOARD: UpgradeConfig = {
  id: 'appointment_board',
  name: 'Appointment Board',
  nameCn: '预约板',
  description: 'Preview potential customers and invite extra visitors.',
  location: 'BACKROOM',
  effectType: 'APPOINTMENT_BOARD',
  maxLevel: 5,
  levels: [
    { level: 1, cost: 1000,  effectValue: 1, description: 'Lv1 简易预约本：2候选，可邀请1人' },
    { level: 2, cost: 2000,  effectValue: 2, description: 'Lv2 客户档案柜：3候选，+情绪状态' },
    { level: 3, cost: 4000,  effectValue: 3, description: 'Lv3 社区情报网：3候选，+背景线索' },
    { level: 4, cost: 7000,  effectValue: 4, description: 'Lv4 预约热线：3候选，可邀请2人' },
    { level: 5, cost: 12000, effectValue: 5, description: 'Lv5 VIP名册：4候选，+筛选偏好' },
  ],
  icon: 'ClipboardList',
};

/**
 * Black Market Contact (Backroom)
 * Multi-level upgrade that improves black market capabilities
 * Lv1: Unlock basic access
 * Lv2-5: Increase daily limits, heat decay, and price bonuses
 */
export const BLACK_MARKET_CONTACT: UpgradeConfig = {
  id: 'black_market_contact',
  name: 'Black Market Contact',
  nameCn: '黑市联络网',
  description: 'Deepen your connections in the underground trading network.',
  location: 'BACKROOM',
  effectType: 'BLACK_MARKET_CONTACT',
  maxLevel: 5,
  levels: [
    { level: 1, cost: 1000,  effectValue: 1, description: 'Lv1 联络人：解锁黑市，每日收购1件' },
    { level: 2, cost: 2500,  effectValue: 2, description: 'Lv2 街头口碑：每日收购2件' },
    { level: 3, cost: 5000,  effectValue: 3, description: 'Lv3 情报网络：每日收购3件，热度-2/天，收购价+5%' },
    { level: 4, cost: 8000,  effectValue: 4, description: 'Lv4 洗钱渠道：每日收购4件' },
    { level: 5, cost: 15000, effectValue: 5, description: 'Lv5 内部人士：每日收购5件，热度-3/天，收购价+10%' },
  ],
  icon: 'Skull',
};

/**
 * Cultivation Room (Backroom)
 * Unlocks the cultivation (self-improvement) system at night
 * No maintenance cost, permanently active
 */
export const CULTIVATION_ROOM: UpgradeConfig = {
  id: 'cultivation_room',
  name: 'Meditation Corner',
  nameCn: '静修角',
  description: 'Set up a meditation corner for self-cultivation.',
  location: 'BACKROOM',
  effectType: 'CULTIVATION_UNLOCK',
  maxLevel: 3,
  levels: [
    { level: 1, cost: 1000, effectValue: 0,  description: 'Lv1 冥想角落：解锁修行系统' },
    { level: 2, cost: 2500, effectValue: 10, description: 'Lv2 静修室：精魄消耗-10%' },
    { level: 3, cost: 5000, effectValue: 20, description: 'Lv3 悟道堂：精魄消耗-20%' },
  ],
  icon: 'Sparkles',
};

/**
 * Appointment board level configurations with detailed features
 */
export const APPOINTMENT_BOARD_LEVELS: AppointmentBoardLevelConfig[] = [
  { level: 1, candidateCount: 2, maxInvites: 1, showEmotion: false, showBackground: false, showNewsLink: false, hasPreference: false },
  { level: 2, candidateCount: 3, maxInvites: 1, showEmotion: true,  showBackground: false, showNewsLink: false, hasPreference: false },
  { level: 3, candidateCount: 3, maxInvites: 1, showEmotion: true,  showBackground: true,  showNewsLink: true,  hasPreference: false },
  { level: 4, candidateCount: 3, maxInvites: 2, showEmotion: true,  showBackground: true,  showNewsLink: true,  hasPreference: false },
  { level: 5, candidateCount: 4, maxInvites: 2, showEmotion: true,  showBackground: true,  showNewsLink: true,  hasPreference: true  },
];

/**
 * Get appointment board level config
 */
export function getAppointmentBoardLevelConfig(level: number): AppointmentBoardLevelConfig | undefined {
  return APPOINTMENT_BOARD_LEVELS.find(l => l.level === level);
}

/**
 * Black market contact level configurations with detailed features
 * Based on design spec:
 * | Level | Name | Cost | Daily Purchase | Heat Decay | Price Bonus |
 * |-------|------|------|----------------|------------|-------------|
 * | Lv1 | 黑市联络人 | $1,000 | 1 | -1/day | +0% |
 * | Lv2 | 街头口碑 | $2,500 | 2 | -1/day | +0% |
 * | Lv3 | 情报网络 | $5,000 | 3 | -2/day | +5% |
 * | Lv4 | 洗钱渠道 | $8,000 | 4 | -2/day | +5% |
 * | Lv5 | 内部人士 | $15,000 | 5 | -3/day | +10% |
 */
export const BLACK_MARKET_LEVELS: BlackMarketLevelConfig[] = [
  { level: 1, dailyPurchaseLimit: 1, heatDecay: 1, purchasePriceBonus: 0 },
  { level: 2, dailyPurchaseLimit: 2, heatDecay: 1, purchasePriceBonus: 0 },
  { level: 3, dailyPurchaseLimit: 3, heatDecay: 2, purchasePriceBonus: 0.05 },
  { level: 4, dailyPurchaseLimit: 4, heatDecay: 2, purchasePriceBonus: 0.05 },
  { level: 5, dailyPurchaseLimit: 5, heatDecay: 3, purchasePriceBonus: 0.10 },
];

/**
 * Get black market level config
 * Returns undefined if level is 0 (not unlocked)
 */
export function getBlackMarketLevelConfig(level: number): BlackMarketLevelConfig | undefined {
  return BLACK_MARKET_LEVELS.find(l => l.level === level);
}

/**
 * All available upgrades (Phase 1 + Phase 2 + Phase 3)
 */
export const AVAILABLE_UPGRADES: UpgradeConfig[] = [
  // Backroom (no maintenance, always active)
  STORAGE_EXPANSION,
  PRECISION_BENCH,
  CULTIVATION_ROOM,
  APPOINTMENT_BOARD,
  BLACK_MARKET_CONTACT,
  // Counter (has maintenance, can be toggled)
  TEA_SET,
  SPECTROMETER,
];

/**
 * Get upgrade config by ID
 */
export function getUpgradeConfig(upgradeId: string): UpgradeConfig | undefined {
  return AVAILABLE_UPGRADES.find(u => u.id === upgradeId);
}

/**
 * Get level config for a specific upgrade level
 */
export function getUpgradeLevelConfig(upgradeId: string, level: number) {
  const config = getUpgradeConfig(upgradeId);
  if (!config) return undefined;
  return config.levels.find(l => l.level === level);
}

/**
 * Base inventory capacity (before upgrades)
 */
export const BASE_INVENTORY_CAPACITY = GAME_CONFIG.GAMEPLAY.BASE_INVENTORY_CAPACITY;

/**
 * Default shop upgrade state for new games
 */
export const INITIAL_SHOP_UPGRADES = {
  upgrades: [],
};
