/**
 * Mail Registry
 *
 * Aggregates all mail templates from stories and system mails.
 * Includes tone variants (design doc Section C) and threat mail templates (Section F).
 */

import { MailTemplate } from '../../types';
import { ALL_STORY_MAILS } from './storyRegistry';

const SYSTEM_MAILS: Record<string, MailTemplate> = {
  "mail_welcome": {
    id: "mail_welcome",
    sender: "房东",
    subject: "关于租金调整的通知",
    body: `那个谁，\n\n最近物价上涨，这片街区的治安也不好。提醒你一句，别忘了按时交租。\n\n如果你能搞到一些稀罕玩意儿，也许我们可以谈谈延期的事情。\n\n好自为之。`,
    attachments: { cash: 0 },
    tone: 'FORMAL',
  },
  "mail_generic_plea": {
      id: "mail_generic_plea",
      sender: "顾客",
      subject: "关于我的当品",
      body: `老板，\n\n我现在手头有点紧，没法按时去赎回 {{relatedItemName}} 了。但我真的不想失去它。\n\n请不要把它挂牌出售，我会尽快凑钱回来的。拜托了。`,
      attachments: { cash: 0 },
      tone: 'FORMAL',
      toneVariants: [
          {
              tone: 'DESPERATE',
              subject: "求求你了",
              body: `老板，求你了......\n\n{{relatedItemName}} 是我最后的念想了。我知道我没按时来，但我真的走投无路了。\n\n你要是把它卖了，我......我不知道该怎么办了。\n\n求你再等等，我一定会来的。`,
          },
          {
              tone: 'GRATEFUL',
              subject: "关于那件东西的事",
              body: `老板你好，\n\n谢谢你之前帮我的忙。关于 {{relatedItemName}}，我暂时还没凑够钱来赎。\n\n但我在努力了，相信很快就能来。谢谢你的耐心。`,
          },
          {
              tone: 'BITTER',
              subject: "你应该知道的",
              body: `既然当初你开了那个价，就不要怪我拖着。\n\n{{relatedItemName}} 值多少钱我们心里都清楚。我会来拿的，但别催我。\n\n你催也没用。`,
          },
      ],
  },
  "mail_market_crash_tip": {
      id: "mail_market_crash_tip",
      sender: "电子城老张",
      subject: "这日子没法过了",
      body: `老兄，听说了吗？芯片厂库存积压，全新显卡当废铁卖。\n\n我这仓库里压了几百万的货，现在连本都回不来。这几天如果有学生仔或者小年轻来你那出电子产品，千万压低点收，搞不好明天还得跌。\n\n这年头，除了黄金，啥都不保值。`,
      attachments: { cash: 0 },
      tone: 'FORMAL',
  },
};

// ============================================================================
// Threat Mail Templates (Design Doc Section F: 黑帮威胁邮件)
//
// Pre-registered threat templates for common underworld scenarios.
// For dynamically generated threats, use generateThreatMail() in mailUtils.ts.
// ============================================================================

const THREAT_MAILS: Record<string, MailTemplate> = {
    "mail_threat_undercover": {
        id: "mail_threat_undercover",
        sender: "未知",
        subject: "你会后悔的",
        body: `$@#*&!... 信号不好......\n\n夜路走多了，小心影子。\n\n......$#@!*`,
        delay: 'immediate',
        tone: 'THREATENING',
        category: 'THREAT',
    },
    "mail_threat_heat_warning": {
        id: "mail_threat_heat_warning",
        sender: "未知",
        subject: "老朋友的忠告",
        body: `听说最近风声很紧。\n\n有些人在打听你的事。我只说一次：该收手的时候就收手。\n\n别让我替你收拾残局。`,
        delay: 'immediate',
        tone: 'THREATENING',
        category: 'THREAT',
    },
    "mail_threat_stolen_goods": {
        id: "mail_threat_stolen_goods",
        sender: "未知",
        subject: "关于那件东西",
        body: `你手上有些不该有的东西。\n\n我不在乎你是怎么得到的。但有人在乎。\n\n%#@... 自己想想接下来该怎么办。`,
        delay: 'immediate',
        tone: 'THREATENING',
        category: 'THREAT',
    },
    "mail_threat_protection": {
        id: "mail_threat_protection",
        sender: "未知",
        subject: "到期提醒",
        body: `商人讲究的是规矩。\n\n上次的事情，你应该清楚。这条街上做生意，总要有人罩着。\n\n希望下次不用我亲自来提醒。`,
        delay: 'immediate',
        tone: 'THREATENING',
        category: 'THREAT',
    },
    "mail_threat_silent": {
        id: "mail_threat_silent",
        sender: "???",
        subject: "// 无标题 //",
        body: `......\n\n我看见你了。\n\n......`,
        delay: 'immediate',
        tone: 'THREATENING',
        category: 'THREAT',
    },
};

// Lazy-loaded combined mail templates (avoid circular dependency issues)
let _cachedMailTemplates: Record<string, MailTemplate> | null = null;

/**
 * Get all mail templates (lazy initialization)
 */
function getAllMailTemplates(): Record<string, MailTemplate> {
  if (!_cachedMailTemplates) {
    _cachedMailTemplates = {
      ...SYSTEM_MAILS,
      ...THREAT_MAILS,
      ...ALL_STORY_MAILS
    };
  }
  return _cachedMailTemplates;
}

// For backward compatibility - but using getter
export const MAIL_TEMPLATES: Record<string, MailTemplate> = new Proxy({} as Record<string, MailTemplate>, {
  get(_, prop: string) {
    return getAllMailTemplates()[prop];
  },
  has(_, prop: string) {
    return prop in getAllMailTemplates();
  },
  ownKeys() {
    return Object.keys(getAllMailTemplates());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    const templates = getAllMailTemplates();
    if (prop in templates) {
      return { configurable: true, enumerable: true, value: templates[prop] };
    }
    return undefined;
  }
});

export const getMailTemplate = (id: string): MailTemplate | null => {
  // Check runtime templates first
  if (_runtimeTemplates[id]) return _runtimeTemplates[id];
  return getAllMailTemplates()[id] || null;
};

// ============================================================================
// Runtime Template Registration (for dynamic echo mails)
// ============================================================================

const _runtimeTemplates: Record<string, MailTemplate> = {};

/**
 * Register a mail template at runtime (e.g., for moral echo mails or
 * dynamically generated threat mails).
 * These are transient and won't persist across page reloads.
 */
export function registerRuntimeMailTemplate(template: MailTemplate): void {
  _runtimeTemplates[template.id] = template;
}
