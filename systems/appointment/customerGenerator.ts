/**
 * Appointment Customer Generator
 *
 * Converts appointment candidates into full Customer objects when they visit.
 */

import { Customer } from '../npc/types';
import { Item, ItemStatus } from '../items/types';
import { createItemFromTemplate } from '../items/csvLoader';
import { initializeKnowledgePool } from '../items/tagUtils';
import { AppointmentCandidate } from './index';
import { Mood } from '../core/types';
import { Dialogue } from '../narrative/types';

// ============================================================================
// Template mappings for candidate types
// ============================================================================

import { BehaviorTag } from '../narrative/types';

interface CandidateCustomerTemplate {
  names: string[];
  descriptions: string[];
  itemTemplateIds: string[];  // Item template IDs from Items_Base.csv
  dialogues: Partial<Dialogue>[];
  redemptionResolve: ('Strong' | 'Medium' | 'Weak' | 'None')[];
  behaviorTags: BehaviorTag[][];  // Array of possible behavior tag combinations
  identityTags: string[];
  priceMod: { min: number; max: number };  // Multiplier for desired/minimum amounts
}

const CANDIDATE_CUSTOMER_TEMPLATES: Record<string, CandidateCustomerTemplate> = {
  desperate_worker: {
    names: ['Old Wang', 'Worker Li', 'Zhou Brother'],
    descriptions: ['A tired worker in dirty overalls.', 'A man with calloused hands.', 'Someone who looks like they just got off a night shift.'],
    itemTemplateIds: ['item_watch_gambler', 'item_console_student'],  // Fallback to existing templates
    dialogues: [{
      greeting: "Boss... I need some cash, quickly.",
      pawnReason: "The factory hasn't paid us in two months...",
      redemptionPlea: "I'll definitely come back once the back pay comes through!",
      negotiationDynamic: "Please... my family is counting on this.",
      accepted: { fair: "Thank you, boss.", fleeced: "...Fine.", premium: "You're a good person!" },
      rejected: "I understand...",
      rejectionLines: { standard: "I'll try elsewhere.", angry: "You have no heart!" },
      exitDialogues: { grateful: "Thank you so much!", neutral: "Goodbye.", resentful: "...", desperate: "What am I going to do..." }
    }],
    redemptionResolve: ['Medium', 'Strong'],
    behaviorTags: [['DESPERATE'], ['SAVVY']],
    identityTags: ['Worker', 'HighNeed'],
    priceMod: { min: 0.6, max: 0.8 }
  },
  desperate_parent: {
    names: ['Ms. Chen', 'Young Mother Liu', 'Parent Zhang'],
    descriptions: ['A young mother with tired eyes.', 'Someone clutching a small photo.', 'A parent who looks like they haven\'t slept.'],
    itemTemplateIds: ['item_console_student'],
    dialogues: [{
      greeting: "Excuse me... do you take jewelry?",
      pawnReason: "My child needs medicine... the hospital won't wait.",
      redemptionPlea: "This is my wedding ring... I must get it back.",
      negotiationDynamic: "Please, it's all I have left.",
      accepted: { fair: "Thank you.", fleeced: "...*sobs quietly*", premium: "God bless you!" },
      rejected: "Please... there must be something...",
      rejectionLines: { standard: "I understand.", angry: "You're heartless!", desperate: "What will I tell my child..." },
      exitDialogues: { grateful: "You've saved us!", neutral: "Thank you.", resentful: "...", desperate: "*leaves in tears*" }
    }],
    redemptionResolve: ['Strong'],
    behaviorTags: [['DESPERATE']],
    identityTags: ['Parent', 'HighNeed', 'Emotional'],
    priceMod: { min: 0.5, max: 0.7 }
  },
  desperate_gambler: {
    names: ['Old Zhang', 'Gambler Chen', 'Lucky Wang'],
    descriptions: ['A man reeking of alcohol.', 'Someone with bloodshot eyes.', 'A person with trembling hands.'],
    itemTemplateIds: ['item_watch_gambler'],
    dialogues: [{
      greeting: "Hey... I got something good. Quick, give me cash.",
      pawnReason: "Tonight's my night, I can feel it! Just need a bit more capital.",
      redemptionPlea: "When I win big, I'll buy this place!",
      negotiationDynamic: "Come on, don't waste my time!",
      accepted: { fair: "Yeah, yeah, hurry up.", fleeced: "Tch... robbery.", premium: "Ha! You're alright!" },
      rejected: "Your loss!",
      rejectionLines: { standard: "Whatever.", angry: "Scam shop!" },
      exitDialogues: { grateful: "Tonight's the night!", neutral: "Later.", resentful: "Bad luck...", desperate: "Just need one more try..." }
    }],
    redemptionResolve: ['Weak', 'None'],
    behaviorTags: [['STUBBORN'], ['DESPERATE']],
    identityTags: ['Gambler', 'HighRisk'],
    priceMod: { min: 0.4, max: 0.6 }
  },
  student: {
    names: ['Student Chen', 'Young Li', 'Xiao Wang'],
    descriptions: ['A nervous college student.', 'Someone with a backpack.', 'A young person avoiding eye contact.'],
    itemTemplateIds: ['item_console_student'],
    dialogues: [{
      greeting: "Um... hi. Do you take electronics?",
      pawnReason: "I spent too much this month... can't let my parents know.",
      redemptionPlea: "I'll definitely get it back when my allowance comes!",
      negotiationDynamic: "This is the latest model, you know...",
      accepted: { fair: "Thanks, you saved me!", fleeced: "...Okay.", premium: "Wow, really?!" },
      rejected: "Oh... okay.",
      rejectionLines: { standard: "I'll try online.", angry: "..." },
      exitDialogues: { grateful: "You're the best!", neutral: "Bye.", resentful: "So stingy...", desperate: "Mom is going to kill me..." }
    }],
    redemptionResolve: ['Strong', 'Medium'],
    behaviorTags: [['SAVVY']],
    identityTags: ['Student', 'Young'],
    priceMod: { min: 0.7, max: 0.9 }
  },
  office_worker: {
    names: ['Mr. Liu', 'Office Chen', 'Manager Wang'],
    descriptions: ['Someone in a wrinkled suit.', 'A professional trying to look composed.', 'An office worker on their lunch break.'],
    itemTemplateIds: ['item_watch_gambler', 'item_console_student'],
    dialogues: [{
      greeting: "Good afternoon. I have something of value.",
      pawnReason: "Temporary cash flow issue. Nothing to worry about.",
      redemptionPlea: "I'll be back next week when my commission clears.",
      negotiationDynamic: "This is worth more than you think.",
      accepted: { fair: "Acceptable.", fleeced: "That's rather low.", premium: "Most generous." },
      rejected: "Perhaps another establishment.",
      rejectionLines: { standard: "Very well.", angry: "Unprofessional." },
      exitDialogues: { grateful: "Excellent service.", neutral: "Good day.", resentful: "I expected better.", desperate: "This can't be happening..." }
    }],
    redemptionResolve: ['Medium', 'Strong'],
    behaviorTags: [['SAVVY']],
    identityTags: ['WhiteCollar', 'Professional'],
    priceMod: { min: 0.8, max: 1.0 }
  },
  elderly: {
    names: ['Grandpa Li', 'Old Mrs. Zhang', 'Elder Wang'],
    descriptions: ['An elderly person moving slowly.', 'Someone with white hair and kind eyes.', 'An old person clutching a worn box.'],
    itemTemplateIds: ['item_watch_gambler'],
    dialogues: [{
      greeting: "Young person... may I show you something?",
      pawnReason: "The grandchildren need school fees... I don't need this anymore.",
      redemptionPlea: "If my body holds up, I'll come back for it.",
      negotiationDynamic: "My late spouse gave this to me... 50 years ago.",
      accepted: { fair: "Thank you, child.", fleeced: "*sighs* Times are hard.", premium: "You have a kind heart." },
      rejected: "I understand, young one.",
      rejectionLines: { standard: "Perhaps it's fate.", angry: "..." },
      exitDialogues: { grateful: "Bless you.", neutral: "Take care.", resentful: "The young these days...", desperate: "What will I tell them..." }
    }],
    redemptionResolve: ['Medium', 'Weak'],
    behaviorTags: [['SAVVY', 'SENTIMENTAL']],
    identityTags: ['Elderly'],
    priceMod: { min: 0.5, max: 0.7 }
  },
  collector: {
    names: ['Collector Zhao', 'Antique Fan', 'Mr. Heritage'],
    descriptions: ['Someone with refined taste.', 'A collector examining things carefully.', 'An enthusiast in vintage clothing.'],
    itemTemplateIds: ['item_diamond_mystery', 'item_watch_gambler'],
    dialogues: [{
      greeting: "Ah, a proper establishment. I have something... interesting.",
      pawnReason: "Liquidating some pieces to acquire others. The collector's life.",
      redemptionPlea: "If I don't return, consider it a fair trade.",
      negotiationDynamic: "You do recognize the provenance, yes?",
      accepted: { fair: "A fair assessment.", fleeced: "You undervalue it.", premium: "You have a good eye!" },
      rejected: "Perhaps you're not the right buyer.",
      rejectionLines: { standard: "Another time, perhaps.", angry: "Philistines." },
      exitDialogues: { grateful: "A pleasure doing business.", neutral: "Until next time.", resentful: "Pearls before swine...", desperate: "..." }
    }],
    redemptionResolve: ['Weak', 'None'],
    behaviorTags: [['SAVVY'], ['SUSPICIOUS']],
    identityTags: ['Collector', 'LowNeed'],
    priceMod: { min: 1.0, max: 1.3 }
  },
  casual_seller: {
    names: ['Fashionable Lin', 'Trendy Mei', 'Stylish Zhou'],
    descriptions: ['Someone well-dressed.', 'A fashion-conscious person.', 'Someone who looks like they don\'t need the money.'],
    itemTemplateIds: ['item_console_student', 'item_watch_gambler'],
    dialogues: [{
      greeting: "Hi! I'm decluttering. Interested?",
      pawnReason: "Marie Kondo says if it doesn't spark joy... *laughs*",
      redemptionPlea: "Eh, probably not coming back for it.",
      negotiationDynamic: "It's authentic, I have the receipt somewhere.",
      accepted: { fair: "Cool, thanks!", fleeced: "Really? Okay.", premium: "Generous! Here's my card!" },
      rejected: "No worries, I'll try Xianyu.",
      rejectionLines: { standard: "Okay bye!", angry: "Rude." },
      exitDialogues: { grateful: "You're sweet!", neutral: "Bye bye!", resentful: "Whatever.", desperate: "..." }
    }],
    redemptionResolve: ['None', 'Weak'],
    behaviorTags: [['SAVVY']],
    identityTags: ['Casual', 'LowNeed'],
    priceMod: { min: 0.9, max: 1.2 }
  },
  business_person: {
    names: ['Boss Chen', 'CEO Wang', 'Director Li'],
    descriptions: ['A confident business person.', 'Someone who exudes authority.', 'An executive type checking their watch.'],
    itemTemplateIds: ['item_watch_gambler', 'item_diamond_mystery'],
    dialogues: [{
      greeting: "Let's make this quick. I have a meeting.",
      pawnReason: "Cash flow for an investment. Standard procedure.",
      redemptionPlea: "My assistant will handle the retrieval.",
      negotiationDynamic: "I know what it's worth. Don't waste my time.",
      accepted: { fair: "Fine.", fleeced: "Acceptable for now.", premium: "Smart. Here's my card." },
      rejected: "Then we're done here.",
      rejectionLines: { standard: "Moving on.", angry: "Noted." },
      exitDialogues: { grateful: "Efficient.", neutral: "Good.", resentful: "...", desperate: "..." }
    }],
    redemptionResolve: ['Strong', 'Medium'],
    behaviorTags: [['SAVVY'], ['STUBBORN']],
    identityTags: ['Business', 'Wealthy', 'LowNeed'],
    priceMod: { min: 1.1, max: 1.4 }
  }
};

// Fallback items when template not found
function createFallbackItem(day: number): Item {
  return {
    id: crypto.randomUUID(),
    name: "Unknown Item",
    nameDefault: "Unknown Item",
    nameRestored: "Restored Item",
    nameReforged: "Reforged Item",
    category: "Misc",
    condition: "Average",
    visualDescription: "An item of uncertain origin.",
    descDefault: "An item of uncertain origin.",
    historySnippet: "",
    appraisalNote: "",
    archiveSummary: "Unknown item",
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: false,
    pawnDate: day,
    status: ItemStatus.ACTIVE,
    pawnAmount: 0,
    realValue: 150 + Math.floor(Math.random() * 200),
    perceivedValue: 150 + Math.floor(Math.random() * 200),
    baseValue: 150 + Math.floor(Math.random() * 200),
    uncertainty: 0.3,
    currentRange: [100, 300],
    initialRange: [100, 300],
    hiddenTraits: [],
    revealedTraits: [],
    usedTraitIds: [],
    logs: [],
    tags: [],
    workState: 'DEFAULT',
  };
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a full Customer from an AppointmentCandidate
 */
export function generateCustomerFromCandidate(
  candidate: AppointmentCandidate,
  day: number
): Customer {
  const templateKey = candidate.templateSeed;
  const template = CANDIDATE_CUSTOMER_TEMPLATES[templateKey] || CANDIDATE_CUSTOMER_TEMPLATES['office_worker'];

  // Create item
  let item: Item | null = null;
  for (const templateId of template.itemTemplateIds) {
    item = createItemFromTemplate(templateId, {
      pawnDate: day,
      status: ItemStatus.ACTIVE,
    });
    if (item) break;
  }

  if (!item) {
    item = createFallbackItem(day);
  }

  // Initialize knowledge pool
  item = initializeKnowledgePool(item);

  // Calculate prices based on item value and template modifier
  const baseValue = item.realValue;
  const minMod = template.priceMod.min + Math.random() * (template.priceMod.max - template.priceMod.min);
  const desiredAmount = Math.floor(baseValue * (minMod + 0.1 + Math.random() * 0.2));
  const minimumAmount = Math.floor(baseValue * minMod);
  const maxRepayment = Math.floor(desiredAmount * 1.3);

  // Build dialogue
  const dialogueTemplate = randomPick(template.dialogues);
  const dialogue: Dialogue = {
    greeting: dialogueTemplate.greeting || "Hello.",
    pawnReason: dialogueTemplate.pawnReason || "I need some cash.",
    redemptionPlea: dialogueTemplate.redemptionPlea || "I'll be back.",
    negotiationDynamic: dialogueTemplate.negotiationDynamic || "What can you offer?",
    accepted: dialogueTemplate.accepted || { fair: "Okay.", fleeced: "Fine.", premium: "Great!" },
    rejected: dialogueTemplate.rejected || "I see.",
    rejectionLines: dialogueTemplate.rejectionLines || { standard: "Goodbye.", angry: "Hmph!" },
    exitDialogues: dialogueTemplate.exitDialogues || {
      grateful: "Thank you!",
      neutral: "Bye.",
      resentful: "...",
      desperate: "..."
    }
  };

  const customer: Customer = {
    id: candidate.id, // Use candidate ID for tracking
    name: randomPick(template.names),
    description: randomPick(template.descriptions),
    avatarSeed: `appointed_${templateKey}_${day}`,
    dialogue,
    redemptionResolve: randomPick(template.redemptionResolve),
    behaviorTags: randomPick(template.behaviorTags),
    patience: candidate.urgency === 'high' ? 2 : candidate.urgency === 'low' ? 4 : 3,
    mood: 'Neutral' as Mood,
    identityTags: [...template.identityTags, 'Appointed'],
    item,
    desiredAmount,
    minimumAmount,
    maxRepayment,
    interactionType: 'PAWN',
    observation: candidate.emotionDesc || undefined
  };

  return customer;
}

/**
 * Get all appointed customers for the day
 */
export function getAppointedCustomers(
  candidates: AppointmentCandidate[],
  selectedIds: string[],
  day: number
): Customer[] {
  return selectedIds
    .map(id => candidates.find(c => c.id === id))
    .filter((c): c is AppointmentCandidate => c !== undefined)
    .map(candidate => generateCustomerFromCandidate(candidate, day));
}
