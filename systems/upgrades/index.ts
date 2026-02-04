
// Shop Upgrade System - Public API
// Re-exports all public types and functions

export * from './types';
export * from './config';
export * from './utils';

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
  hasPrecisionBench
} from './utils';
