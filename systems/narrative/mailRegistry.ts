
import { MailTemplate } from '../../types';

export const MAIL_TEMPLATES: Record<string, MailTemplate> = {
  "mail_emma_success": {
    id: "mail_emma_success",
    sender: "艾玛",
    subject: "我入职了！",
    body: `老板：\n\n告诉你一个好消息，我被那家跨国公司录取了！\n\n还记得那天我拿着笔记本电脑去你店里吗？如果那时候你像别人一样狠狠宰我一笔，或者因为我没钱就赶我走，我可能早就崩溃了。\n\n这笔钱是我多付的利息，或者是... 感谢费。请你务必收下。\n\n另外，那枚婚戒我也不打算卖了。生活好像又有希望了。\n\n祝好，\n\n艾玛`,
    attachments: { cash: 500 }
  },
  "mail_emma_hate": {
    id: "mail_emma_hate",
    sender: "艾玛",
    subject: "你毁了一切",
    body: `我以为你会帮我... 结果你和其他吸血鬼没什么两样。\n\n因为没有电脑，我错过了入职提交材料的截止日期。工作没了，还要背负你的违约金债务。\n\n我要离开这座城市了。拿着我的电脑烂在手里吧。我诅咒你，诅咒这家店永远不得安宁。`,
    attachments: { cash: 0 }
  },
  "mail_emma_boyfriend_left": {
    id: "mail_emma_boyfriend_left",
    sender: "艾玛",
    subject: "一切都结束了",
    body: `他走了。今早我醒来，发现他的东西都不见了，只留下一张字条说受够了这种没有希望的日子。\n\n电脑赎不回来，工作也没指望了，现在连他也走了。\n\n我觉得好累。这个世界也许真的不适合我。`,
    attachments: { cash: 0 }
  },
  "mail_emma_plea": {
    id: "mail_emma_plea",
    sender: "艾玛",
    subject: "关于电脑...",
    body: `老板，\n\n我现在还没凑齐赎金。面试结果还没出来，我还在等通知。\n\n那台电脑对我真的很重要，里面的资料是我所有的心血。请千万不要把它挂牌出售，再宽限我几天，我一定想办法凑钱。\n\n拜托了。`,
    attachments: { cash: 0 }
  },
  "mail_welcome": {
    id: "mail_welcome",
    sender: "房东",
    subject: "关于租金调整的通知",
    body: `那个谁，\n\n最近物价上涨，这片街区的治安也不好。提醒你一句，别忘了按时交租。\n\n如果你能搞到一些稀罕玩意儿，也许我们可以谈谈延期的事情。\n\n好自为之。`,
    attachments: { cash: 0 }
  },
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
  "mail_zhao_good_extended": {
      id: "mail_zhao_good_extended",
      sender: "小孙子",
      subject: "爷爷说你是好人",
      body: `当铺老板：\n\n爷爷让我特别感谢你当时同意延期。他说如果不是你通融，勋章早就没了。\n\n婚礼上爷爷戴着那枚勋章，站得笔直。他说那是他这辈子最体面的一天。\n\n附上喜糖和一点心意。爷爷说，做生意讲究诚信，但更难得的是讲义气。\n\n祝生意兴隆！`,
      attachments: { cash: 300 }
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
      body: `老板，\n\n实在对不住。没能凑齐钱把老伙计赎回去，甚至连利息都交不上。\n\n单位的退休金还没发下来，医院这边又催着缴费，我实在是走投无路了。\n\n我知道规矩，东西现在归您处置。但我求求你，千万别把那东西卖了。那不是铁片，那是我的命。\n\n再给我几天时间，我就是去卖血也会把钱凑齐的。求你了。\n\n老周`,
      attachments: { cash: 0 }
  },
  "mail_zhao_rumor": {
      id: "mail_zhao_rumor",
      sender: "同行老李",
      subject: "有人在打听老物件",
      body: `老弟：\n\n最近有个穿西装的在咱们这片转悠，专门打听老军功章的事。听说他背后是个大买家，出手很阔绰。\n\n你店里如果有这类东西，可得留个心眼。这种人看着体面，背后的道道多着呢。\n\n提醒你一句，别让人给套路了。\n\n老李`,
      attachments: { cash: 0 }
  },
  "mail_zhao_hospital": {
      id: "mail_zhao_hospital",
      sender: "孙子 小周",
      subject: "爷爷住院了",
      body: `当铺老板：\n\n我爷爷昨晚突然昏倒了，现在在医院抢救。医生说是心脏问题，可能跟最近压力太大有关。\n\n他一直念叨着什么勋章和欠债的事。我不知道你们之间发生了什么，但我想你应该知道这件事。\n\n婚礼推迟了。爷爷说过"不能让老伙计在外面过夜"，可现在他自己都不知道能不能出院了。\n\n我会尽快联系你处理那些东西的。`,
      attachments: { cash: 0 }
  },
  "mail_zhao_tragedy": {
      id: "mail_zhao_tragedy",
      sender: "社区通知",
      subject: "关于周守义老人的情况",
      body: `致相关人士：\n\n周守义老人因经济困难和精神压力，于昨日被送往医院。他的孙子婚礼已推迟。\n\n老人在病床上一直念叨着什么"勋章"和"老伙计"。如果您知道相关情况，请与我们联系。`,
      attachments: { cash: 0 }
  },
  "mail_generic_plea": {
      id: "mail_generic_plea",
      sender: "顾客",
      subject: "关于我的当品",
      body: `老板，\n\n我现在手头有点紧，没法按时去赎回 {{itemName}} 了。但我真的不想失去它。\n\n请不要把它挂牌出售，我会尽快凑钱回来的。拜托了。`,
      attachments: { cash: 0 }
  },
  "mail_underworld_warning": {
    id: "mail_underworld_warning",
    sender: "[未知]",
    subject: "你会后悔的",
    body: `老板，\n\n听说你店里收了一个不该收的东西 ({{itemName}})。\n我们的人很快会来"取回"它。\n\n如果东西还在，我们可以当作什么都没发生。\n如果不在... 夜路走多了，小心影子。\n\n别报警。你知道的。`,
    attachments: { cash: 0 }
  }
};

export const getMailTemplate = (id: string): MailTemplate | null => {
  return MAIL_TEMPLATES[id] || null;
};
