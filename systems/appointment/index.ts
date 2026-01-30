/**
 * Appointment Board System
 *
 * Generates candidate previews for the appointment board.
 * Candidates are simplified customer previews that can be invited for the next day.
 */

import { AppointmentCandidate, AppointmentPreference, AppointmentBoardLevelConfig } from '../upgrades/types';
import { ActiveNewsInstance } from '../news/types';

// ============================================================================
// Candidate Generation Data
// ============================================================================

interface CandidateTemplate {
  id: string;
  // Appearance descriptors
  genders: string[];
  ages: string[];
  appearances: string[];
  // Item hints
  itemHints: string[];
  // Emotional states (Lv2+)
  emotions: string[];
  // Background hints (Lv3+)
  backgrounds: string[];
  // Urgency level for filtering
  urgency: 'high' | 'medium' | 'low';
}

const CANDIDATE_TEMPLATES: CandidateTemplate[] = [
  // High urgency - desperate, need money now
  {
    id: 'desperate_worker',
    genders: ['middle-aged man', 'young man', 'middle-aged woman'],
    ages: ['中年', '年轻'],
    appearances: ['穿着工装', '衣着朴素', '满脸疲惫'],
    itemHints: ['提着工具箱', '抱着一个纸盒', '拿着一个布包'],
    emotions: ['神色焦虑', '眉头紧锁', '欲言又止'],
    backgrounds: ['像是工厂工人', '手上有老茧', '工服上有油渍'],
    urgency: 'high'
  },
  {
    id: 'desperate_parent',
    genders: ['young woman', 'middle-aged woman', 'young man'],
    ages: ['年轻', '中年'],
    appearances: ['抱着孩子的照片', '眼眶发红', '神情憔悴'],
    itemHints: ['提着一个小盒子', '拿着一个首饰袋', '抱着一叠纸张'],
    emotions: ['泪眼婆娑', '强忍着泪水', '声音颤抖'],
    backgrounds: ['像是全职妈妈', '手指上有奶渍', '身上有婴儿奶粉味'],
    urgency: 'high'
  },
  {
    id: 'desperate_gambler',
    genders: ['middle-aged man', 'young man'],
    ages: ['中年', '年轻'],
    appearances: ['满脸通红', '衣衫不整', '浑身酒气'],
    itemHints: ['提着公文包', '拿着一块手表', '攥着一沓票据'],
    emotions: ['神色焦躁', '坐立不安', '眼神闪烁'],
    backgrounds: ['像是赌场常客', '手指发黄', '身上有烟味'],
    urgency: 'high'
  },
  // Medium urgency - have some flexibility
  {
    id: 'student',
    genders: ['young man', 'young woman'],
    ages: ['年轻'],
    appearances: ['背着书包', '穿着运动服', '戴着耳机'],
    itemHints: ['提着一台电脑', '抱着一个游戏机盒子', '拿着一部手机'],
    emotions: ['眼神躲闪', '有些局促', '表情尴尬'],
    backgrounds: ['像是大学生', '手上有墨水印', '背包上有校徽'],
    urgency: 'medium'
  },
  {
    id: 'office_worker',
    genders: ['young man', 'young woman', 'middle-aged man'],
    ages: ['年轻', '中年'],
    appearances: ['穿着西装', '打扮得体', '提着公文包'],
    itemHints: ['拿着一块名表', '提着一个精致的盒子', '带着一套茶具'],
    emotions: ['表情平静', '若有所思', '欲言又止'],
    backgrounds: ['像是白领', '手上有键盘印', '西装袖口磨损'],
    urgency: 'medium'
  },
  {
    id: 'elderly',
    genders: ['elderly man', 'elderly woman'],
    ages: ['年迈'],
    appearances: ['步履蹒跚', '头发花白', '拄着拐杖'],
    itemHints: ['捧着一个旧木盒', '拿着一本老相册', '提着一个布袋'],
    emotions: ['神情落寞', '眼含泪光', '叹息连连'],
    backgrounds: ['像是退休老人', '手上有老年斑', '穿着过时但整洁'],
    urgency: 'medium'
  },
  // Low urgency - casual, disposing idle items
  {
    id: 'collector',
    genders: ['middle-aged man', 'young man', 'young woman'],
    ages: ['中年', '年轻'],
    appearances: ['穿着考究', '戴着眼镜', '气质文雅'],
    itemHints: ['提着一个精致的箱子', '拿着一件古董', '带着一幅画卷'],
    emotions: ['表情从容', '神态自若', '不紧不慢'],
    backgrounds: ['像是收藏家', '手指修长细腻', '身上有古董店的气息'],
    urgency: 'low'
  },
  {
    id: 'casual_seller',
    genders: ['young woman', 'young man', 'middle-aged woman'],
    ages: ['年轻', '中年'],
    appearances: ['穿着休闲', '打扮时髦', '妆容精致'],
    itemHints: ['提着一个名牌包', '拿着一套首饰', '带着几件衣服'],
    emotions: ['神态轻松', '有说有笑', '漫不经心'],
    backgrounds: ['像是时尚达人', '手上有美甲', '身上香水味'],
    urgency: 'low'
  },
  {
    id: 'business_person',
    genders: ['middle-aged man', 'middle-aged woman'],
    ages: ['中年'],
    appearances: ['西装革履', '气度不凡', '手提公文包'],
    itemHints: ['拿着一套高尔夫球具', '带着一块名表', '提着一瓶名酒'],
    emotions: ['表情严肃', '不苟言笑', '眼神锐利'],
    backgrounds: ['像是企业老板', '手上有高尔夫印', '身上有雪茄味'],
    urgency: 'low'
  }
];

// News-related hints for Lv3+
const NEWS_LINK_TEMPLATES: { [key: string]: string[] } = {
  'desperate_worker': [
    '最近城东工厂裁员...',
    '听说有家公司欠薪...',
    '最近失业率上升...'
  ],
  'desperate_parent': [
    '最近物价上涨...',
    '医疗费用增加...',
    '学区房价格暴涨...'
  ],
  'desperate_gambler': [
    '警方正在打击赌博...',
    '地下赌场被端了...',
    '高利贷问题严重...'
  ],
  'student': [
    '大学学费又涨了...',
    '兼职机会减少...',
    '电子产品降价促销...'
  ],
  'office_worker': [
    '金融行业裁员潮...',
    '房贷利率上调...',
    '股市持续低迷...'
  ],
  'elderly': [
    '养老金不够用...',
    '医保报销比例下降...',
    '老年公寓涨价...'
  ],
  'collector': [
    '古董市场行情波动...',
    '艺术品拍卖会取消...',
    '某收藏家资金链断裂...'
  ],
  'casual_seller': [
    '二手奢侈品市场火爆...',
    '断舍离风潮兴起...',
    '网红带货假货多...'
  ],
  'business_person': [
    '企业资金周转困难...',
    '商业地产价格下跌...',
    '某行业出现危机...'
  ]
};

// ============================================================================
// Candidate Generation Functions
// ============================================================================

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a single candidate based on template and board level
 */
function generateCandidate(
  template: CandidateTemplate,
  config: AppointmentBoardLevelConfig,
  news: ActiveNewsInstance[]
): AppointmentCandidate {
  const gender = randomPick(template.genders);
  const age = randomPick(template.ages);
  const appearance = randomPick(template.appearances);
  const itemHint = randomPick(template.itemHints);

  // Basic appearance description (Lv1)
  const appearanceDesc = `${age}${gender.includes('woman') ? '女性' : gender.includes('man') ? '男性' : '老人'}，${appearance}`;

  const candidate: AppointmentCandidate = {
    id: crypto.randomUUID(),
    appearanceDesc,
    itemSizeHint: itemHint,
    urgency: template.urgency,
    templateSeed: template.id
  };

  // Add emotion (Lv2+)
  if (config.showEmotion) {
    candidate.emotionDesc = randomPick(template.emotions);
  }

  // Add background (Lv3+)
  if (config.showBackground) {
    candidate.backgroundHint = randomPick(template.backgrounds);
  }

  // Add news link (Lv3+)
  if (config.showNewsLink) {
    const newsLinks = NEWS_LINK_TEMPLATES[template.id] || [];
    if (newsLinks.length > 0) {
      candidate.newsLink = randomPick(newsLinks);
    }
  }

  return candidate;
}

/**
 * Generate candidates for the appointment board
 * @param config The current appointment board level configuration
 * @param preference The filter preference (Lv5 feature)
 * @param news Current active news for context
 */
export function generateAppointmentCandidates(
  config: AppointmentBoardLevelConfig,
  preference: AppointmentPreference,
  news: ActiveNewsInstance[]
): AppointmentCandidate[] {
  // Filter templates based on preference
  let templatePool = [...CANDIDATE_TEMPLATES];

  if (config.hasPreference) {
    switch (preference) {
      case 'needy':
        // Favor high urgency
        templatePool = templatePool.filter(t => t.urgency === 'high' || t.urgency === 'medium');
        // Double the high urgency templates
        const highUrgency = templatePool.filter(t => t.urgency === 'high');
        templatePool = [...templatePool, ...highUrgency];
        break;
      case 'casual':
        // Favor low urgency
        templatePool = templatePool.filter(t => t.urgency === 'low' || t.urgency === 'medium');
        // Double the low urgency templates
        const lowUrgency = templatePool.filter(t => t.urgency === 'low');
        templatePool = [...templatePool, ...lowUrgency];
        break;
      case 'balanced':
      default:
        // Keep as is
        break;
    }
  }

  // Generate candidates
  const candidates: AppointmentCandidate[] = [];
  const usedTemplates = new Set<string>();

  for (let i = 0; i < config.candidateCount; i++) {
    // Try to avoid duplicate templates
    let template: CandidateTemplate;
    let attempts = 0;
    do {
      template = randomPick(templatePool);
      attempts++;
    } while (usedTemplates.has(template.id) && attempts < 10);

    usedTemplates.add(template.id);
    candidates.push(generateCandidate(template, config, news));
  }

  return candidates;
}

/**
 * Initial appointment board state
 */
export const INITIAL_APPOINTMENT_BOARD_STATE = {
  candidates: [],
  selectedIds: [],
  preference: 'balanced' as AppointmentPreference
};

/**
 * Get the number of appointed customers for the day
 * (Used by morning generation to know how many extra customers to expect)
 */
export function getAppointedCustomerCount(selectedIds: string[]): number {
  return selectedIds.length;
}

// Re-export types
export type { AppointmentCandidate, AppointmentPreference, AppointmentBoardLevelConfig };
