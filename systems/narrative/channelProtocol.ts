/**
 * 信息信道协议 (Information Channel Protocol)
 *
 * 定义事件链后果到新闻/邮件/回忆录/库存日志四个信道的分发规则。
 * 参考: 新闻系统 v1.2 维度G, 事件链系统 v1.5 章节J
 */

/** 后果严重程度 */
export type ConsequenceSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'EXTREME';

/** 信息信道类型 */
export type InformationChannel = 'NEWS' | 'MAIL' | 'RETROSPECTIVE' | 'ITEM_LOG';

/** 信道分配规则 */
export interface ChannelAllocation {
  severity: ConsequenceSeverity;
  primaryChannels: InformationChannel[];
  secondaryChannels: InformationChannel[];
  rules: string[];  // 人类可读的分配规则描述
}

/** 信道分配矩阵 */
export const CHANNEL_ALLOCATION_MATRIX: ChannelAllocation[] = [
  {
    severity: 'MINOR',
    primaryChannels: ['ITEM_LOG'],
    secondaryChannels: [],
    rules: ['仅通过物品状态日志暗示', '不上新闻', '不发邮件']
  },
  {
    severity: 'MODERATE',
    primaryChannels: ['MAIL'],
    secondaryChannels: ['NEWS'],
    rules: ['邮件延迟2-3天投递具体信息', '新闻可选地发布模糊关联报道']
  },
  {
    severity: 'SEVERE',
    primaryChannels: ['MAIL', 'NEWS'],
    secondaryChannels: ['RETROSPECTIVE'],
    rules: ['新闻先于邮件至少1天', '邮件传递直接后果', '新闻不指名报道社会影响', 'NPC仍存活时可有回忆录']
  },
  {
    severity: 'EXTREME',
    primaryChannels: ['MAIL', 'NEWS'],
    secondaryChannels: ['ITEM_LOG'],
    rules: ['邮件为终局通知(绝笔信/感谢信)', '新闻明确报道(仍不指名)', '物品日志标注"主人已..."']
  }
];

/** 信道时序规则 */
export interface ChannelTimingRule {
  rule: string;
  description: string;
}

export const CHANNEL_TIMING_RULES: ChannelTimingRule[] = [
  { rule: 'NEWS_BEFORE_MAIL', description: '同一事件，新闻先于邮件至少1天' },
  { rule: 'MAIL_NO_DUPLICATE_RETRO', description: '邮件不重复回忆录将要说的内容' },
  { rule: 'MAX_TWO_CHANNELS_PER_DAY', description: '同一事件最多在同一天激活两个信道' },
  { rule: 'MINOR_NO_NEWS', description: '轻微后果不上新闻，避免信息噪音' }
];

/** 后果分发请求 */
export interface ConsequenceDispatchRequest {
  sourceChainId: string;
  eventId: string;
  severity: ConsequenceSeverity;
  dayGenerated: number;
  npcId?: string;
  relatedItemId?: string;
  newsHint?: string;        // 模糊新闻暗示文本
  mailTemplateId?: string;  // 对应的邮件模板
  retroContent?: string;    // 回忆录内容
  itemLogEntry?: string;    // 库存日志条目
}
