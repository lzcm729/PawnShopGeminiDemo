/**
 * 格物系统导出 (Insight System Exports)
 */

// 类型导出
export type {
  InsightResult,
  InsightStatus,
  InsightBlockReason,
  InsightConfig,
  InsightNarrative,
  InsightRecord,
  UnexpectedEventType,
  DepletedRewards,
} from './types';

// 逻辑函数导出
export {
  getInsightStatus,
  canInsight,
  performInsight,
  isNearEpiphany,
  getInsightsToEpiphany,
  getInsightNarrative,
  getBlockReasonText,
  getPrimaryEssenceType,
  resetInsightedFlags,
  // 夜间鉴定相关
  isValueLocked,
} from './insightLogic';
