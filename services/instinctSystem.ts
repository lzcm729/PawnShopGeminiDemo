
import { Customer, Item, InterestRate } from '../types';

type InstinctCategory = 
  | 'INSULT' 
  | 'PREDATORY' 
  | 'CHARITY' 
  | 'HAGGLING' 
  | 'PREMIUM' 
  | 'STANDARD' 
  | 'FAKE_BARGAIN';

interface InstinctConfig {
  texts: string[];
  toneColor: string; // Tailwind class
}

const INSTINCT_LIBRARY: Record<InstinctCategory, InstinctConfig> = {
  INSULT: {
    texts: [
      "这不仅仅是低价，这是在扇他的脸。",
      "他在压抑怒火... 贪婪让我变得愚蠢。",
      "再低一点，这笔生意就变成仇恨了。",
      "我正在羞辱一个走投无路的人。这很危险。",
      "这种报价是在自寻死路。别试探底线了。"
    ],
    toneColor: "text-red-500"
  },
  PREDATORY: {
    texts: [
      "我在喝她的血... 但这味道像极了明天的房租。",
      "她眼里的光熄灭了。我是那个吹灭蜡烛的人。",
      "这笔利润带着腥味。但我饿了。",
      "这是合法的抢劫。上帝会宽恕我吗？",
      "我在利用绝望兑现。我是个怪物，但我是个活着的怪物。",
      "吃人不吐骨头。这行就是这么残酷。"
    ],
    toneColor: "text-purple-400"
  },
  CHARITY: {
    texts: [
      "我一定是疯了才做这笔生意。",
      "房东会杀了我的。",
      "这不是做生意，这是在施舍。",
      "我在用本金购买片刻的安宁。",
      "希望这好心能有点回报... 虽然通常没有。"
    ],
    toneColor: "text-green-400"
  },
  HAGGLING: {
    texts: [
      "只差一点了。他想要这笔钱，但我得守住底线。",
      "沉默... 他在计算得失。还没触到底。",
      "这个价格很微妙。他在权衡尊严和生存。",
      "他在动摇。再推一把，或者... 再加一张票子？",
      "这只肥羊还在挣扎，但钩子已经咬住了。"
    ],
    toneColor: "text-stone-400"
  },
  PREMIUM: {
    texts: [
      "这价格足以改变很多事。我是不是太心软了？",
      "这简直是在做慈善。但我感觉不错。",
      "溢价收购。希望这良心能值几个钱。",
      "他在发抖... 他没想到我会给这么多。",
      "我简直像个慈善家。这感觉... 很奇怪。"
    ],
    toneColor: "text-amber-400"
  },
  STANDARD: {
    texts: [
      "这是生意，仅此而已。",
      "各取所需。这在这个街区很难得。",
      "这种平静的交易让我感到不安... 但也让我感到安全。",
      "钱货两清。最简单的快乐。",
      "互不相欠。下次交易继续。",
      "没有血迹，也没有眼泪。干净的生意。"
    ],
    toneColor: "text-stone-500"
  },
  FAKE_BARGAIN: {
    texts: [
      "虽然是假货，但这价格收来玩玩也不亏。",
      "明知是假的还收... 这就是所谓的捡漏？",
      "他在撒谎，我在压价。公平的游戏。",
      "用垃圾的价格买垃圾，很公平。"
    ],
    toneColor: "text-stone-400"
  }
};

/**
 * Deterministic selector to keep text stable while sliding, but varied across different values.
 */
const selectText = (category: InstinctCategory, seedInput: number): string => {
  const lib = INSTINCT_LIBRARY[category];
  const index = Math.floor(Math.abs(seedInput)) % lib.texts.length;
  return lib.texts[index];
};

export const getMerchantInstinct = (
  offer: number, 
  rate: InterestRate, 
  customer: Customer, 
  item: Item
): { text: string; color: string } => {
  const minPrincipal = customer.minimumAmount;
  const desiredAmount = customer.desiredAmount;
  
  // Use sum of offer and rate as a seed so text doesn't flicker randomly but changes on input
  const seed = offer + (rate * 1000) + customer.id.charCodeAt(0);

  // 0. Special Case: Fake Item Bargain
  // If item is known to be fake (revealed traits) AND offer is low
  const isRevealedFake = item.isFake && item.revealedTraits.some(t => t.type === 'FAKE');
  if (isRevealedFake && offer < item.realValue * 0.5) {
      return {
          text: selectText('FAKE_BARGAIN', seed),
          color: INSTINCT_LIBRARY.FAKE_BARGAIN.toneColor
      };
  }

  // 1. Priority: Premium (Overpaying > 115% of Desired)
  // MOVED UP: Generosity should override lowball logic if paying huge amount.
  if (offer > desiredAmount * 1.15) {
    return {
      text: selectText('PREMIUM', seed),
      color: INSTINCT_LIBRARY.PREMIUM.toneColor
    };
  }

  // 2. Priority: Charity (0% Interest)
  // MOVED UP: Moral stance overrides "Insult" check. 
  // Even if offer is low, 0% interest implies "I'm helping with what I can" or "Not seeking profit".
  if (rate === 0) {
    return {
      text: selectText('CHARITY', seed),
      color: INSTINCT_LIBRARY.CHARITY.toneColor
    };
  }

  // 3. Priority: Insult (Lowball < 70% of Min)
  if (offer < minPrincipal * 0.7) {
    return {
      text: selectText('INSULT', seed),
      color: INSTINCT_LIBRARY.INSULT.toneColor
    };
  }

  // 4. Priority: Predatory (High Interest + Desperate)
  // Desperate styles: 'Desperate' or 'Deceptive' (often high risk) or specifically tagged
  const isDesperate = customer.negotiationStyle === 'Desperate' || customer.tags.includes('HighRisk');
  if (rate >= 0.20 && isDesperate) {
    return {
      text: selectText('PREDATORY', seed),
      color: INSTINCT_LIBRARY.PREDATORY.toneColor
    };
  }

  // 5. Priority: Haggling (Between 85% of Min and Min)
  // This represents the "Almost there" zone where psychological pressure is highest.
  if (offer < minPrincipal && offer >= minPrincipal * 0.85) {
    return {
      text: selectText('HAGGLING', seed),
      color: INSTINCT_LIBRARY.HAGGLING.toneColor
    };
  }
  
  // Also check if offer is just generally low but above insult (70% - 85%) - map to Haggling or Standard? 
  // Let's map strict "Below Min" generally to Haggling if not Insult.
  if (offer < minPrincipal) {
      return {
          text: selectText('HAGGLING', seed),
          color: INSTINCT_LIBRARY.HAGGLING.toneColor
      };
  }

  // 6. Priority: Standard
  return {
    text: selectText('STANDARD', seed),
    color: INSTINCT_LIBRARY.STANDARD.toneColor
  };
};
