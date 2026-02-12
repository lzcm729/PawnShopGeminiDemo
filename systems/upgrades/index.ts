
// Shop Upgrade System - Public API
// Re-exports all public types and functions

export * from './types';
export * from './config';
export * from './utils';
export * from './spectrometerFeedback';

// Convenience re-exports for commonly used functions
export {
  getTotalMaintenanceCost,
  getPatienceBonus,
  getAnomalyDetectionThreshold,
  checkItemAnomaly,
  getCounterUpgradesForToggle,
  getAppointmentBoardLevel,
  getActiveAppointmentBoardConfig,
  hasAppointmentBoard,
  hasBlackMarketContact,
  hasPrecisionBench,
  hasCultivationRoom,
  getCultivationRoomLevel,
  getCultivationEssenceDiscount,
  getBlackMarketContactLevel,
  getActiveBlackMarketConfig
} from './utils';
