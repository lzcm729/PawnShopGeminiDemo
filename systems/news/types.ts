
import { TriggerCondition } from '../narrative/types';
import { ConsequenceSeverity } from '../narrative/channelProtocol';

// v1.2: Enum values match design doc naming
export enum NewsCategory {
  NARRATIVE_ECHO = 'NARRATIVE_ECHO',
  MARKET_INTEL = 'MARKET_INTEL',
  FLAVOR = 'FLAVOR'
}

// Backward-compatible aliases for components that still use old names
export const NewsCategory_NARRATIVE = NewsCategory.NARRATIVE_ECHO;
export const NewsCategory_MARKET = NewsCategory.MARKET_INTEL;
export const NewsCategory_FLAVOR = NewsCategory.FLAVOR;

/** Legacy market modifier — kept for backward compatibility with GameState.activeMarketEffects */
export interface MarketModifier {
  categoryTarget?: string;
  priceMultiplier?: number;
  riskModifier?: number;
  actionPointsModifier?: number;
}

/** v1.2 通用效果接口 */
export interface NewsEffect {
  targetSystem: string;        // 受影响系统标识
  parameter: string;           // 受影响参数
  modifier: number;            // 修正值
  modifierType: 'ABSOLUTE' | 'PERCENTAGE';
  duration: number;            // 持续天数
}

/** v1.2 完整 NewsItem 数据结构 */
export interface NewsItem {
  id: string;
  headline: string;
  body: string;
  category: NewsCategory;
  priority: number;
  triggers: TriggerCondition[];
  sourceLabel: string;          // v1.2: 虚构来源标签，如 "[市民热线]"
  tags: string[];               // v1.2: 结构化标签，供预约板/日历系统查询
  effects: NewsEffect[];        // v1.2: 机制效果列表（替代旧 effect?: MarketModifier）
  relatedChainId?: string;      // 关联的事件链 ID（后果回响类）
  displayDay?: number;          // 展示日期（默认生成后次日）
  expiresDay?: number;          // 过期日期（多日事件的结束日）
  duration: number;
  triggerMailId?: string;
  // Legacy field kept for backward compat during migration
  effect?: MarketModifier;
}

export interface ActiveNewsInstance extends NewsItem {
  daysRemaining: number;
  generatedDay: number;         // v1.2: 生成日期
}

/** v1.2: 待展示的新闻条目（延迟队列用） */
export interface PendingNewsItem {
  headline: string;
  body: string;
  category: NewsCategory;
  priority: number;
  sourceLabel: string;
  tags: string[];
  effects: NewsEffect[];
  relatedChainId?: string;
  displayDay: number;           // 目标展示日
  expiresDay?: number;
  duration: number;
  triggerMailId?: string;
}

/** v1.2: 违规严重程度 */
export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/** v1.2: 违规记录（增强 violationFlags） */
export interface ViolationRecord {
  flag: string;
  severity: ViolationSeverity;
  day: number;                  // 违规发生日
  detected: boolean;            // 是否被发现（概率判定后填充）
  delayDays: number;            // 延迟天数
}

/** v1.2: 外部事件链触发信号 */
export interface ExternalChainTrigger {
  type: string;                 // e.g. 'NEWS_VERIFICATION_PENALTY'
  payload: {
    newsId: string;
    penaltyType: ViolationSeverity;
    severity: ConsequenceSeverity;
    sourceDay: number;
  };
}

/** generateDailyNews 的返回类型 */
export interface DailyNewsResult {
  news: ActiveNewsInstance[];
  modifiers: MarketModifier[];
  scheduledMails: string[];
  externalTriggers: ExternalChainTrigger[];
  deferredNews: PendingNewsItem[];  // 溢出/延迟到次日的新闻
}
