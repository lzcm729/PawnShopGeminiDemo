
import { TriggerCondition } from '../narrative/types';

export enum NewsCategory {
  NARRATIVE = 'NARRATIVE',   // 对应设计文档 NARRATIVE_ECHO
  MARKET = 'MARKET',         // 对应设计文档 MARKET_INTEL
  FLAVOR = 'FLAVOR'          // 对应设计文档 FLAVOR
}

export interface MarketModifier {
  categoryTarget?: string;
  priceMultiplier?: number;
  riskModifier?: number;
  actionPointsModifier?: number;
}

/** v1.2 通用效果接口，后续 S3 迁移时替代 MarketModifier */
export interface NewsEffect {
  targetSystem: string;        // 受影响系统标识
  parameter: string;           // 受影响参数
  modifier: number;            // 修正值
  modifierType: 'ABSOLUTE' | 'PERCENTAGE';
  duration: number;            // 持续天数
}

export interface NewsItem {
  id: string;
  headline: string;
  body: string;
  category: NewsCategory;
  priority: number;
  triggers: TriggerCondition[];
  effect?: MarketModifier;
  duration: number;
  triggerMailId?: string;
  // v1.2 新增字段
  sourceLabel?: string;       // 虚构来源标签，如 "[市民热线]"
  tags?: string[];             // 结构化标签，供预约板/日历系统查询
  relatedChainId?: string;     // 关联的事件链 ID（后果回响类）
  displayDay?: number;         // 展示日期（默认生成后次日）
  expiresDay?: number;         // 过期日期（多日事件的结束日）
}

export interface ActiveNewsInstance extends NewsItem {
  daysRemaining: number;
}
