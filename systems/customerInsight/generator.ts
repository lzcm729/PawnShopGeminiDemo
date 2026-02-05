/**
 * Customer Insight Generator (洞察生成器)
 *
 * Generates insight results based on customer data.
 * Maps BehaviorTags to dispositions and generates contextual text.
 */

import { Customer, BehaviorTag } from '../npc/types';
import {
  Disposition,
  CustomerInsightResult,
  BEHAVIOR_TO_DISPOSITION,
  PATIENCE_COST_TAGS,
  FLOOR_HINT_THRESHOLDS,
} from './types';

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate insight result for a customer
 *
 * @param customer - The customer to analyze
 * @returns CustomerInsightResult with disposition, hints, and moral context
 */
export function generateCustomerInsight(customer: Customer): CustomerInsightResult {
  const disposition = determineDisposition(customer.behaviorTags);
  const dispositionText = generateDispositionText(disposition, customer);
  const floorHint = generateFloorHint(customer.minimumAmount, customer.desiredAmount, disposition);
  const moralContext = generateMoralContext(customer);
  const patienceCost = calculatePatienceCost(customer.behaviorTags);

  return {
    disposition,
    dispositionText,
    floorHint,
    moralContext,
    patienceCost,
  };
}

// ============================================================================
// Disposition Determination
// ============================================================================

/**
 * Determine disposition from behavior tags
 * Priority: DESPERATE > STUBBORN > SUSPICIOUS > SAVVY > NAIVE > SENTIMENTAL
 */
function determineDisposition(behaviorTags: BehaviorTag[]): Disposition {
  // Priority order for disposition detection
  const priorityOrder: BehaviorTag[] = [
    'DESPERATE',
    'STUBBORN',
    'SUSPICIOUS',
    'SAVVY',
    'NAIVE',
    'SENTIMENTAL',
  ];

  for (const tag of priorityOrder) {
    if (behaviorTags.includes(tag)) {
      return BEHAVIOR_TO_DISPOSITION[tag];
    }
  }

  // Default to sincere if no matching tags
  return 'sincere';
}

// ============================================================================
// Text Generation
// ============================================================================

/**
 * Generate descriptive text about customer's psychological state
 */
function generateDispositionText(disposition: Disposition, customer: Customer): string {
  const templates: Record<Disposition, string[]> = {
    desperate: [
      '她的手在微微颤抖。眼眶泛红，但强撑着不让眼泪掉下来。这不是一个会讨价还价的人——她会接受任何能让她带走现金的价格。',
      '他的眼神里有一种急切，手指不自觉地摩挲着衣角。这个人需要钱，非常需要。',
      '她说话的时候声音有些发抖。这种人不会为了几块钱和你纠缠——她只想快点拿到钱离开。',
    ],
    firm: [
      '他站得笔直，目光坚定地与你对视。这是一个有底线的人，不会为了几块钱折腰。和他议价需要尊重，而不是施压。',
      '她的表情平静而坚决。这个人知道自己要什么，也知道自己的底线在哪里。',
      '他的态度不卑不亢，但眼神里有一种不容置疑的坚持。这种人一旦下定决心，很难动摇。',
    ],
    bluffing: [
      '他的眼神太镇定了——镇定得像是在演戏。这个人懂行，知道怎么开价。但越是表现得不急，往往意味着越急。',
      '她装作漫不经心的样子，但你注意到她的目光一直在偷瞄你的反应。这是一个会演戏的人。',
      '他故意表现得很从容，但下意识地攥紧了拳头。这种人在虚张声势。',
    ],
    sincere: [
      '他的表情没有任何伪装，甚至有些不好意思。他开的价格就是他认为合理的价格——没有虚高，也没有故意压低。',
      '她说话的时候眼神很真诚，没有一点算计的意思。这是一个老实人。',
      '他看起来对这些交易不太熟悉，开价的时候还有些犹豫。这个人不会和你玩心眼。',
    ],
  };

  const options = templates[disposition];
  // Use customer id as seed for consistent text
  const index = hashString(customer.id) % options.length;
  return options[index];
}

/**
 * Generate floor hint based on minimum/desired price ratio
 */
function generateFloorHint(
  minimumAmount: number,
  desiredAmount: number,
  disposition: Disposition
): string {
  const ratio = minimumAmount / desiredAmount;

  // Base hint based on ratio
  let baseHint: string;
  if (ratio < FLOOR_HINT_THRESHOLDS.VERY_LOW) {
    baseHint = '他的底线比开口价低得多。';
  } else if (ratio < FLOOR_HINT_THRESHOLDS.LOW) {
    baseHint = '他有一定的谈判空间。';
  } else if (ratio < FLOOR_HINT_THRESHOLDS.MEDIUM) {
    baseHint = '他的底线接近开口价。';
  } else {
    baseHint = '他几乎没有让步余地。';
  }

  // Add disposition-specific suffix
  const suffixes: Record<Disposition, string> = {
    desperate: '但看她的样子，每少给一分钱，都是在她的伤口上撒盐。',
    firm: '试探太多会激怒他，要小心。',
    bluffing: '别被他的从容迷惑，试探几次值得。',
    sincere: '这个价格对他来说已经是底线了。',
  };

  return `${baseHint}${suffixes[disposition]}`;
}

/**
 * Generate moral context from customer's story
 * Only available for story customers (those with chainId or pawnReason)
 */
function generateMoralContext(customer: Customer): string | null {
  const pawnReason = customer.dialogue?.pawnReason;

  // No story context for generic customers
  if (!pawnReason && !customer.chainId) {
    return null;
  }

  // If there's a pawn reason, generate moral context based on it
  if (pawnReason) {
    return generateMoralContextFromReason(pawnReason, customer);
  }

  // For chain customers without explicit pawn reason, use generic context
  if (customer.chainId) {
    return '这个人有自己的故事。你的决定会影响他的命运。';
  }

  return null;
}

/**
 * Generate moral context from pawn reason text
 */
function generateMoralContextFromReason(reason: string, customer: Customer): string {
  const reasonLower = reason.toLowerCase();

  // Detect keywords and generate appropriate moral context
  if (reasonLower.includes('女儿') || reasonLower.includes('孩子') || reasonLower.includes('儿子')) {
    if (reasonLower.includes('病') || reasonLower.includes('药') || reasonLower.includes('手术')) {
      return '她提到孩子生病了。这笔钱可能是药费。压得太低，这个孩子可能等不到明天。';
    }
    if (reasonLower.includes('学费') || reasonLower.includes('上学')) {
      return '这笔钱关系到一个孩子的未来。你的选择可能决定他能不能继续读书。';
    }
    return '她提到了自己的孩子。这笔钱对这个家庭很重要。';
  }

  if (reasonLower.includes('母亲') || reasonLower.includes('父亲') || reasonLower.includes('老人')) {
    if (reasonLower.includes('病') || reasonLower.includes('医')) {
      return '这笔钱是给老人看病的。每一分钱都关系到一条生命。';
    }
    return '这笔钱是为了家里的老人。';
  }

  if (reasonLower.includes('房租') || reasonLower.includes('房子')) {
    return '他说需要钱付房租。压得太低，这个人可能很快就没地方住了。';
  }

  if (reasonLower.includes('失业') || reasonLower.includes('工作')) {
    return '他正在找工作。这笔钱可能是他最后的周转资金。';
  }

  if (reasonLower.includes('结婚') || reasonLower.includes('妻子') || reasonLower.includes('丈夫')) {
    return '这件物品承载着他的一段回忆。典当意味着放弃一段人生。';
  }

  if (reasonLower.includes('勋章') || reasonLower.includes('军') || reasonLower.includes('战')) {
    return '这对他来说不只是一件物品，而是一段荣誉。低价成交意味着剥夺他最后的尊严。';
  }

  // Generic fallback
  return `他说：「${reason}」。这笔交易对他意义重大。`;
}

// ============================================================================
// Patience Cost Calculation
// ============================================================================

/**
 * Calculate patience cost based on behavior tags
 * STUBBORN, SUSPICIOUS, SAVVY customers lose 1 patience when insight is used
 */
function calculatePatienceCost(behaviorTags: BehaviorTag[]): number {
  for (const tag of behaviorTags) {
    if (PATIENCE_COST_TAGS.includes(tag)) {
      return 1;
    }
  }
  return 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple string hash for deterministic text selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  determineDisposition,
  generateDispositionText,
  generateFloorHint,
  generateMoralContext,
  calculatePatienceCost,
};
