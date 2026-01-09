
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
  
  // Emma's Hate Mail (Hostile Takeover)
  "mail_emma_hate": {
    id: "mail_emma_hate",
    sender: "艾玛",
    subject: "你毁了一切",
    body: `我以为你会帮我... 结果你和其他吸血鬼没什么两样。\n\n因为没有电脑，我错过了入职提交材料的截止日期。工作没了，还要背负你的违约金债务。\n\n我要离开这座城市了。拿着我的电脑烂在手里吧。我诅咒你，诅咒这家店永远不得安宁。`,
    attachments: {
        cash: 0
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
