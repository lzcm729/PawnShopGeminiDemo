
import { MailTemplate } from '../types';

export const MAIL_TEMPLATES: Record<string, MailTemplate> = {
  // Emma's Happy Ending Mail
  "mail_emma_success": {
    id: "mail_emma_success",
    sender: "艾玛",
    subject: "我入职了！",
    body: `老板：\n\n告诉你一个好消息，我被那家跨国公司录取了！\n\n还记得那天我拿着笔记本电脑去你店里吗？如果那时候你像别人一样狠狠宰我一笔，或者因为我没钱就赶我走，我可能早就崩溃了。\n\n这笔钱是我多付的利息，或者是... 感谢费。请你务必收下。\n\n另外，那枚婚戒我也不打算卖了。生活好像又有希望了。\n\n祝好，\n\n艾玛`,
    attachments: {
      cash: 500
    }
  },
  
  // Generic Example
  "mail_welcome": {
    id: "mail_welcome",
    sender: "房东",
    subject: "关于租金调整的通知",
    body: `那个谁，\n\n最近物价上涨，这片街区的治安也不好。提醒你一句，别忘了按时交租。\n\n如果你能搞到一些稀罕玩意儿，也许我们可以谈谈延期的事情。\n\n好自为之。`,
    attachments: {
        cash: 0
    }
  }
};

export const getMailTemplate = (id: string): MailTemplate | null => {
  return MAIL_TEMPLATES[id] || null;
};
