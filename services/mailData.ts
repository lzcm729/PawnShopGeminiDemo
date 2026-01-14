
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

  // Emma's Plea Mail (New)
  "mail_emma_plea": {
    id: "mail_emma_plea",
    sender: "艾玛",
    subject: "关于电脑...",
    body: `老板，\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那台电脑对我真的很重要，里面的资料是我所有的心血。请千万不要把它挂牌出售，再宽限我几天，我一定想办法凑钱。\n\n拜托了。`,
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
  },

  // --- ELDER ZHAO MAILS ---
  
  "mail_zhao_offer": {
      id: "mail_zhao_offer",
      sender: "匿名收藏顾问",
      subject: "关于那套勋章的报价",
      body: `老板，\n\n我看到你店里收了一张立功证书。如果我没猜错，那枚编号029的勋章也在你手里吧？\n\n单卖勋章不值钱，但如果证书和勋章能凑成一套，那就是另一回事了。\n\n我代表一位海外买家出价：$38,000 收购整套（勋章+证书+合影）。\n\n我会在 Day 8 下午再次登门。希望到时候东西还在你店里（或者在你手里，我不介意你是怎么弄到它们的）。`,
      attachments: { cash: 0 }
  },

  "mail_zhao_good": {
      id: "mail_zhao_good",
      sender: "小孙子",
      subject: "爷爷的婚礼致辞",
      body: `当铺老板：\n\n爷爷让我给您发这封邮件。昨天的婚礼上，爷爷穿着旧军装，胸前戴着那枚勋章给我们证婚。虽然他腿脚不好，但那天他站得比谁都直。\n\n他说那是他这辈子最体面的一天。谢谢您没让他把荣誉给卖了。\n\n附上几张喜糖的照片，和一点心意。`,
      attachments: { cash: 200 }
  },

  "mail_zhao_evil": {
      id: "mail_zhao_evil",
      sender: "匿名",
      subject: "无题",
      body: `听说那个老兵在孙子的婚礼上晕倒了。因为没钱买药，也没脸见人。\n\n而你赚了三万八，对吧？\n\n这钱花得安心吗？这附近的老街坊都在议论这件事。我看你这店也没必要开下去了。`,
      attachments: { cash: 0 }
  },

  "mail_zhao_plea": {
      id: "mail_zhao_plea",
      sender: "周守义",
      subject: "请再宽限几天",
      body: `老板，\n\n实在对不住。今天本来该去赎那老物件的，但单位的退休金还没发下来，医院这边又催着缴费，我实在是没脸见你。\n\n我知道规矩，但我求求你，千万别把那东西卖了。那不是铁片，那是我的命。\n\n再给我几天时间，我就是去卖血也会把钱凑齐的。求你了。\n\n老周`,
      attachments: { cash: 0 }
  },

  "mail_generic_plea": {
      id: "mail_generic_plea",
      sender: "顾客",
      subject: "关于我的当品",
      body: `老板，\n\n我现在手头有点紧，没法按时去赎回东西了。但我真的不想失去它。\n\n请不要把它挂牌出售，我会尽快凑钱回来的。拜托了。`,
      attachments: { cash: 0 }
  }
};

export const getMailTemplate = (id: string): MailTemplate | null => {
  return MAIL_TEMPLATES[id] || null;
};
