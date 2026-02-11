
import { Item } from '../items/types';
import { Mood, BehaviorTag } from '../core/types';
import { Dialogue, SimLogEntry, CustomerPortraits, ChainUpdateEffect } from '../narrative/types';

// Re-export BehaviorTag for backward compatibility
export type { BehaviorTag };

// === POST-FORFEIT NPC VARIANTS (#23) ===
export type PostForfeitVariant = 'pleading' | 'angry' | 'resigned';

// === ITEM-DERIVED EVENT (统一物品衍生节点: 窃贼忏悔/原物主认领/收藏家收购) ===
export type ItemDerivedEventType = 'THIEF_REGRET' | 'ORIGINAL_OWNER' | 'PURCHASE_OFFER';

export interface ItemDerivedChoice {
    id: string;             // 'accept' | 'refuse'
    label: string;          // 中文主标签
    subLabel: string;       // 英文副标签 (e.g. "COOPERATE")
    description: string;    // 选项描述
    effectLabels: string[]; // 效果标签 (e.g. ["Humanity +2", "归还物品"])
}

export interface ItemDerivedEvent {
    eventType: ItemDerivedEventType;
    itemId: string;
    itemName: string;
    // NPC
    npcName: string;
    npcDescription?: string;
    npcAvatar?: string;
    // 场景叙事
    sceneNarrative: string;
    npcQuote: string;
    situationDesc: string;
    // 选项（恰好两个）
    choices: [ItemDerivedChoice, ItemDerivedChoice];
    // 主题色
    accentColor: 'purple' | 'amber' | 'emerald' | 'red';
    // 链集成（DSL 事件用）
    chainId?: string;
    storyEventId?: string;
    // PURCHASE_OFFER 专用
    offerValue?: number;
    // 触发元数据
    triggerDay: number;
}

// === BACKWARD COMPAT ALIASES (deprecated) ===
/** @deprecated Use ItemDerivedEventType */
export type HoldingPeriodEventType = 'THIEF_REGRET' | 'ORIGINAL_OWNER';

/** @deprecated Use ItemDerivedEvent */
export interface HoldingPeriodEvent {
    type: HoldingPeriodEventType;
    itemId: string;
    itemName: string;
    chainId?: string;
    triggerDay: number;
}

export interface RenewalProposal {
    itemId: string;
    itemName: string;
    currentDueDate: number;
    proposedExtensionDays: number;
    currentInterestRate: number;
    proposedInterestBonus: number; // e.g. 0.05 for +5%
}

export interface Customer {
  id: string;
  name: string;
  description: string;
  avatarSeed: string;
  portraits?: CustomerPortraits;
  dialogue: Dialogue;
  redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None';

  // === 行为系统（统一） ===
  behaviorTags: BehaviorTag[];           // 替代 negotiationStyle
  patience: number;
  mood: Mood;

  // === 身份系统（分离） ===
  identityTags: string[];                // 替代混用的 tags

  item: Item;

  desiredAmount: number;
  minimumAmount: number;
  survivalMinimum?: number;    // Lowest amount NPC accepts at 0% charity rate (below floor)
  maxRepayment: number;

  interactionType: 'PAWN' | 'REDEEM' | 'NEGOTIATION' | 'RENEWAL' | 'POST_FORFEIT'; // Added POST_FORFEIT
  redemptionIntent?: 'REDEEM' | 'EXTEND' | 'LEAVE';
  renewalProposal?: RenewalProposal; // Added proposal data

  currentWallet?: number;
  currentAskPrice?: number;

  chainId?: string;
  eventId?: string;

  recapLog?: SimLogEntry[];

  allowFreeRedeem?: boolean;
  pawnTermDays?: number;  // 自定义典当期限（默认7天）

  observation?: string; // Narrative observation/hint

  /** #23: Post-forfeit NPC emotional variant */
  postForfeitVariant?: PostForfeitVariant;

  /** Dynamic chain effects injected during story customer generation */
  _dynamicEffects?: ChainUpdateEffect[];

  /** #25: Word-of-mouth referral customer flag */
  isReferral?: boolean;
}
