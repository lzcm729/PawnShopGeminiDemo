
import { MailTemplate } from '../../types';
import { EMMA_MAILS } from './stories/emma';
import { ZHAO_MAILS } from './stories/zhao';
import { UNDERWORLD_MAILS } from './stories/underworld';

const SYSTEM_MAILS: Record<string, MailTemplate> = {
  "mail_welcome": {
    id: "mail_welcome",
    sender: "房东",
    subject: "关于租金调整的通知",
    body: `那个谁，\n\n最近物价上涨，这片街区的治安也不好。提醒你一句，别忘了按时交租。\n\n如果你能搞到一些稀罕玩意儿，也许我们可以谈谈延期的事情。\n\n好自为之。`,
    attachments: { cash: 0 }
  },
  "mail_generic_plea": {
      id: "mail_generic_plea",
      sender: "顾客",
      subject: "关于我的当品",
      body: `老板，\n\n我现在手头有点紧，没法按时去赎回 {{relatedItemName}} 了。但我真的不想失去它。\n\n请不要把它挂牌出售，我会尽快凑钱回来的。拜托了。`,
      attachments: { cash: 0 }
  },
  "mail_market_crash_tip": {
      id: "mail_market_crash_tip",
      sender: "电子城老张",
      subject: "这日子没法过了",
      body: `老兄，听说了吗？芯片厂库存积压，全新显卡当废铁卖。\n\n我这仓库里压了几百万的货，现在连本都回不来。这几天如果有学生仔或者小年轻来你那出电子产品，千万压低点收，搞不好明天还得跌。\n\n这年头，除了黄金，啥都不保值。`,
      attachments: { cash: 0 }
  }
};

export const MAIL_TEMPLATES: Record<string, MailTemplate> = {
  ...SYSTEM_MAILS,
  ...EMMA_MAILS,
  ...ZHAO_MAILS,
  ...UNDERWORLD_MAILS
};

export const getMailTemplate = (id: string): MailTemplate | null => {
  return MAIL_TEMPLATES[id] || null;
};
