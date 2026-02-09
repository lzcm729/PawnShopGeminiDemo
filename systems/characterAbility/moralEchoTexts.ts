/**
 * Character Ability System - Moral Echo Narrative Texts
 *
 * Provides narrative content for the moral echo system.
 * Each source+channel combination has 3 severity tiers (LOW/MEDIUM/HIGH),
 * with 2-3 text variants per tier for variety.
 *
 * Severity mapping (based on current innocence):
 *   LOW  (innocence >= 50): fleeting unease, quickly rationalized
 *   MEDIUM (innocence 30-49): persistent moral conflict, hard to shake
 *   HIGH (innocence < 30): deep guilt, behavioral consequences
 *
 * Design doc: v1.4 section 8.5
 */

import { MoralEchoEvent } from './types';

// ============================================================================
// Types
// ============================================================================

export interface EchoText {
  text: string;
  /** Only for MAIL channel */
  mailSubject?: string;
  /** Only for MAIL channel */
  mailSender?: string;
  /** Only for NEWS channel */
  newsHeadline?: string;
}

// ============================================================================
// Text Database
// ============================================================================

/**
 * Keyed by `${source}_${channel}`, each entry maps severity to text variants.
 */
const ECHO_TEXTS: Record<string, Record<string, EchoText[]>> = {

  // --------------------------------------------------------------------------
  // APPLY_PRESSURE + MONOLOGUE
  // Immediate inner monologue tail sentence after using pressure skill
  // --------------------------------------------------------------------------
  APPLY_PRESSURE_MONOLOGUE: {
    LOW: [
      { text: '还好，这只是生意。' },
      { text: '他能承受的。' },
      { text: '......谁不会讨价还价呢。' },
    ],
    MEDIUM: [
      { text: '他走了，你却在想他还会不会回来。' },
      { text: '你说了正确的话。但为什么嘴里发干？' },
      { text: '他最后看你的那个眼神......算了。' },
    ],
    HIGH: [
      { text: '你用力咽了口唾沫。刚才那是谈判，还是......欺负？' },
      { text: '他低下头的那一刻，你看到了自己的影子。' },
      { text: '你的手在抖。不是冷的。' },
    ],
  },

  // --------------------------------------------------------------------------
  // HEART_STRIKE + MONOLOGUE
  // Inner monologue after exploiting customer's emotional weakness
  // --------------------------------------------------------------------------
  HEART_STRIKE_MONOLOGUE: {
    LOW: [
      { text: '你只是看得更透彻。' },
      { text: '利用弱点......这不是聪明的定义吗？' },
    ],
    MEDIUM: [
      { text: '你用了他最害怕的东西。他甚至不知道你是怎么发现的。' },
      { text: '话说出口的瞬间，你就后悔了。但价格已经谈成了。' },
      { text: '你抓住了他的痛处。像拧一把钝刀。' },
    ],
    HIGH: [
      { text: '你在他的伤口上撒了盐，然后用省下来的钱买绷带。给自己的。' },
      { text: '他的声音在发抖，你的手却很稳。什么时候开始的？' },
      { text: '你看着他崩溃的样子，心想：我真的需要那几百块吗？' },
    ],
  },

  // --------------------------------------------------------------------------
  // HEART_STRIKE + NPC_REACTION
  // Behavioral description of DESPERATE customer after being heart-struck
  // --------------------------------------------------------------------------
  HEART_STRIKE_NPC_REACTION: {
    LOW: [
      { text: '对方沉默了几秒，垂下了目光。' },
      { text: '他的嘴唇动了动，最终什么也没说。' },
    ],
    MEDIUM: [
      { text: '他的手指攥紧了柜台边缘，指节发白。' },
      { text: '她的眼眶泛红，但还是用力挤出一个笑容。' },
      { text: '他深深地吸了一口气，像是溺水的人浮出水面。' },
    ],
    HIGH: [
      { text: '她的肩膀剧烈颤抖，泪水无声地滑落。她没有擦。' },
      { text: '他像被抽走了所有力气，双手撑着柜台才没有倒下。' },
      { text: '他看着你，眼神里的光一点一点熄灭。然后他说"好"。' },
    ],
  },

  // --------------------------------------------------------------------------
  // HEART_STRIKE + NEWS
  // Next-day news about community impact (when target was DESPERATE)
  // --------------------------------------------------------------------------
  HEART_STRIKE_NEWS: {
    LOW: [
      {
        newsHeadline: '社区声音',
        text: '有居民反映部分当铺在典当交易中态度欠妥，社区委员会表示将关注。',
      },
      {
        newsHeadline: '消费者权益',
        text: '消费者协会提醒市民在典当交易中注意保护自身权益。',
      },
    ],
    MEDIUM: [
      {
        newsHeadline: '弱势群体保护',
        text: '有社区工作者反映，近期多名困难群众在典当交易中遭受不公正对待，呼吁加强监管。',
      },
      {
        newsHeadline: '社区调查',
        text: '据悉，社区居民联名反映某当铺对经济困难的客户收取过高费用，相关部门已介入调查。',
      },
    ],
    HIGH: [
      {
        newsHeadline: '典当行业乱象',
        text: '一名典当客户在社交媒体发文控诉某当铺"趁火打劫"，引发大量转发。文中描述了令人不安的施压细节。',
      },
      {
        newsHeadline: '谁在收割绝望？',
        text: '本报记者走访多名当铺客户，有人含泪讲述了被迫以远低于物品价值成交的经历。"我别无选择，"她说。',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // SHARK_DEAL + MONOLOGUE
  // Inner monologue after signing a 20% interest (shark) contract
  // --------------------------------------------------------------------------
  SHARK_DEAL_MONOLOGUE: {
    LOW: [
      { text: '20%......合法范围内。' },
      { text: '钱到手了。其他的不用想太多。' },
    ],
    MEDIUM: [
      { text: '利息很甜，但嘴里发苦。' },
      { text: '他能还得起吗？......不是你的问题。是吗？' },
      { text: '你在合同上看到那个数字，觉得它比实际的大得多。' },
    ],
    HIGH: [
      { text: '你签下的每一份高利贷合同，都是别人的一道伤疤。你已经记不清第几道了。' },
      { text: '你妈说过，做人要善良。你现在做的这些，叫什么？' },
      { text: '20%的利息。他离开时的背影佝偻得像个老人。他才三十岁。' },
    ],
  },

  // --------------------------------------------------------------------------
  // SHARK_DEAL + MAIL
  // Anonymous warning letter received next day (when innocence < 50)
  // --------------------------------------------------------------------------
  SHARK_DEAL_MAIL: {
    LOW: [
      {
        mailSubject: '一点建议',
        mailSender: '匿名市民',
        text: '听说你最近生意不错。提醒一句：赚钱是好事，别赚太狠了。',
      },
      {
        mailSubject: '路过说一句',
        mailSender: '街坊',
        text: '老板，利息能不能稍微低点？大家都不容易。随便说说的。',
      },
    ],
    MEDIUM: [
      {
        mailSubject: '有人在看',
        mailSender: '匿名',
        text: '你以为没人注意吗？这条街上的人都在说你。现在还只是说说。',
      },
      {
        mailSubject: '忠告',
        mailSender: '一个老顾客',
        text: '老板，我不是来闹事的。但你最近......变了。利息越来越高，笑容越来越假。你自己照照镜子。',
      },
      {
        mailSubject: '建议你想想',
        mailSender: '知情者',
        text: '你收的那笔当，利息开到20%。那个人回家后哭了一晚上。你知道吗？你大概不关心。',
      },
    ],
    HIGH: [
      {
        mailSubject: '警告',
        mailSender: '匿名',
        text: '你的名字已经上了社区公告栏。再这样下去，不只是名声的问题了。',
      },
      {
        mailSubject: '最后一次',
        mailSender: '受害者家属',
        text: '我爸因为你的高利贷，连饭都吃不起了。你晚上睡得着吗？我睡不着。我每天都在想怎么让你也睡不着。',
      },
      {
        mailSubject: '你心里有数',
        mailSender: '一个看不下去的人',
        text: '有些账，利息算不清。你欠的那种。',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // STOLEN_GOODS + NPC_REACTION
  // Contact's commentary when player accepts stolen goods
  // --------------------------------------------------------------------------
  STOLEN_GOODS_NPC_REACTION: {
    LOW: [
      { text: '联络人挑了挑眉，嘴角带着一丝玩味的笑。' },
      { text: '"不错，你比我想的识相。"联络人拍了拍你的肩。' },
    ],
    MEDIUM: [
      { text: '联络人嗤笑一声："放心，这东西干净得很。"他的语气说明恰恰相反。' },
      { text: '"你现在跟我们也没什么区别了。"联络人冷淡地说，像在陈述事实。' },
      { text: '联络人点了根烟，漫不经心地说："习惯就好。第一次都这样。"' },
    ],
    HIGH: [
      { text: '联络人看你的眼神变了——不是尊重，是一种审视，像在估算你还能走多远。' },
      { text: '"你现在收东西连验都不验了？"联络人皱起眉头，"小心点，别把自己也搭进去。"' },
      { text: '联络人沉默了很久，然后说了一句："你知道这东西原来的主人是谁吗？算了，你不会想知道的。"' },
    ],
  },

  // --------------------------------------------------------------------------
  // STOLEN_GOODS + NEWS
  // Next-day theft report that player can connect to their accepted goods
  // --------------------------------------------------------------------------
  STOLEN_GOODS_NEWS: {
    LOW: [
      {
        newsHeadline: '社区治安',
        text: '警方接报一起入室盗窃案，失窃物品包括部分贵重物品，目前正在调查中。',
      },
      {
        newsHeadline: '失窃通报',
        text: '本区居民报失一批个人物品，呼吁知情者提供线索。',
      },
    ],
    MEDIUM: [
      {
        newsHeadline: '盗窃案进展',
        text: '近日发生的入室盗窃案引发居民不安。失主称被盗物品具有重要纪念意义，恳请归还。"那是我母亲留给我的，"她在采访中哽咽。',
      },
      {
        newsHeadline: '警方追踪赃物',
        text: '警方表示正在追踪近期失窃物品的流向，已锁定多家二手交易场所。提醒商户注意来历不明的物品。',
      },
    ],
    HIGH: [
      {
        newsHeadline: '失窃者的绝望',
        text: '一名独居老人报案称传家宝被盗。她对记者说："那是我丈夫留给我的最后一件东西。"警方正在排查当地典当行。',
      },
      {
        newsHeadline: '典当行涉嫌销赃',
        text: '据知情人士透露，警方已将调查范围扩大至本区多家典当行，怀疑存在知情收赃行为。涉事商户可能面临刑事指控。',
      },
      {
        newsHeadline: '赃物链条',
        text: '本报独家调查发现，一条从街头窃贼到典当行的完整销赃链条正在本区运作。多名受害者联合报案，要求严惩。',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // BLACKMARKET_SELL + NPC_REACTION
  // Black market contact's commentary when player sells through black market
  // --------------------------------------------------------------------------
  BLACKMARKET_SELL_NPC_REACTION: {
    LOW: [
      { text: '"成交愉快。"联络人递过信封，眼神中带着一丝赞许。' },
      { text: '联络人数着钱，随口说："下次有好货继续找我。"' },
    ],
    MEDIUM: [
      { text: '"你上手越来越快了。"联络人似笑非笑，"这条路走起来比想象中容易吧？"' },
      { text: '联络人把钱推过来，压低声音："下次别这么急。太频繁了容易出事。"' },
      { text: '"你知道这东西最后会到哪儿吗？"联络人顿了顿，"算了，你也不在乎了。"' },
    ],
    HIGH: [
      { text: '联络人的表情变得严肃："听我一句劝，收着点。你最近动作太大了，上面的人开始注意了。"' },
      { text: '"你是我见过最快堕落的人。"联络人没有恶意，只是在陈述一个让你脊背发凉的事实。' },
      { text: '联络人收起笑容，低声说："你还记得自己当初为什么开这家店吗？"你张了张嘴，什么也没说出来。' },
    ],
  },
};

// ============================================================================
// Query Function
// ============================================================================

/**
 * Look up a narrative text for a given moral echo event.
 *
 * Selects randomly from available variants for the matching
 * source + channel + severity combination.
 *
 * Falls back to a generic text if no match is found (should not happen
 * if all triggered combinations are covered above).
 */
export function getEchoText(echo: MoralEchoEvent): EchoText {
  const key = `${echo.source}_${echo.channel}`;
  const byKey = ECHO_TEXTS[key];

  if (!byKey) {
    return { text: '......' };
  }

  const variants = byKey[echo.severity];
  if (!variants || variants.length === 0) {
    return { text: '......' };
  }

  const index = Math.floor(Math.random() * variants.length);
  return variants[index];
}
