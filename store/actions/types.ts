/**
 * Action Type Definitions
 * Centralized action types for the game state reducer
 */

import { GameState, Customer, Mood, ReputationProfile, Item, EventChainState, SatisfactionLevel, MotherCondition, ExpiryEvent, PoliceInvestigationEvent } from '../../types';
import { DepartureSatisfaction } from '../../systems/narrative/types';
import { GamePhase } from '../../systems/core/phases';
import { EssenceType, EssenceBalance } from '../../systems/economy/essence';
import { KnowledgePool } from '../../systems/items/tags';
import { ItemTag, ItemTrait, WorkState } from '../../systems/items/types';
import { AppointmentCandidate, AppointmentPreference } from '../../systems/appointment';
import { ItemLogEntry } from '../../types';
import { GameNode } from '../../types/node';
import { BlackmarketState, RiskEvent } from '../../systems/blackmarket/types';
import { PhaseEvent } from '../../systems/core/phases';
import { CustomerInsightResult } from '../../systems/customerInsight';
import { DailyChallenge } from '../../systems/game/dailyChallenge';
import { DailySchedule } from '../../systems/npc/customerScheduler';
import { SkillId, MoralEchoEvent, AbilityState } from '../../systems/characterAbility/types';

// === Action Type Union ===

export type Action =
    // Core game flow
    | { type: 'LOAD_GAME'; payload: GameState }
    | { type: 'START_GAME' }
    | { type: 'START_DAY' }
    | { type: 'OPEN_SHOP' }
    | { type: 'START_NIGHT' }
    | { type: 'SET_PHASE'; payload: GamePhase }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'END_DAY' }
    | { type: 'GAME_OVER'; payload: string }

    // New state machine (phase2)
    | { type: 'PHASE_TRANSITION'; payload: PhaseEvent }

    // Customer management
    | { type: 'SET_CUSTOMER'; payload: Customer | null }
    | { type: 'CLEAR_CUSTOMER' }
    | { type: 'UPDATE_CUSTOMER_STATUS'; payload: { patience: number; mood: Mood; currentAskPrice: number } }
    | { type: 'APPLY_STOLEN_LEVERAGE'; payload: { reductionPercent: number } }  // Reduce both ask price and minimum
    | { type: 'MANUAL_CLOSE_SHOP' }
    | { type: 'MARK_NO_MORE_CUSTOMERS' }
    | { type: 'INCREMENT_NARRATIVE_CUSTOMER' }  // Track narrative customer served (no limit)
    | { type: 'SET_SATISFACTION'; payload: SatisfactionLevel }
    | { type: 'SET_DEPARTURE_SATISFACTION'; payload: DepartureSatisfaction }

    // Customer Insight (洞察客户)
    | { type: 'USE_CUSTOMER_INSIGHT'; payload: CustomerInsightResult }
    | { type: 'CLEAR_CUSTOMER_INSIGHT' }

    // Node management (new unified interface)
    | { type: 'SET_NODE'; payload: GameNode | null }
    | { type: 'CLEAR_NODE' }
    | { type: 'UPDATE_NODE_ITEM'; payload: { newRange?: [number, number]; revealedTraits?: any[]; newUncertainty?: number; newPerceived?: number; incrementAppraisalCount?: boolean; hasNegativeEvent?: boolean; log?: ItemLogEntry } }

    // Appraisal & Item knowledge
    | { type: 'APPRAISE_ITEM' }
    | { type: 'UPDATE_ITEM_KNOWLEDGE'; payload: { itemId: string; newRange: [number, number]; revealedTraits: any[]; hiddenTraits?: any[]; newUncertainty: number; newPerceived?: number; incrementAppraisalCount?: boolean; hasNegativeEvent?: boolean; log?: ItemLogEntry; initialRange?: [number, number] } }
    | { type: 'REALIZE_ITEM_TRUTH'; payload: { itemId: string } }
    | { type: 'MARK_TRAIT_USED'; payload: { traitId: string } }
    | { type: 'CONSUME_AP'; payload: number }

    // Transaction & Deal
    | { type: 'RESOLVE_TRANSACTION'; payload: { cashDelta: number; reputationDelta: Partial<ReputationProfile>; item: Item | null; log: string; customerName: string; dealQuality?: 'fleeced' | 'fair' | 'premium' } }
    | { type: 'LIQUIDATE_ITEM'; payload: { itemId: string; amount: number; name: string } }
    | { type: 'REJECT_DEAL' }

    // Inventory management
    | { type: 'REDEEM_ITEM'; payload: { itemId: string; paymentAmount: number; name: string } }
    | { type: 'EXTEND_PAWN'; payload: { itemId: string; interestPaid: number; newDueDate: number; name: string } }
    | { type: 'REFUSE_EXTENSION'; payload: { itemId: string; name: string } }
    | { type: 'EXPIRE_ITEMS'; payload: { expiredItemIds: string[]; logs: string[] } }
    | { type: 'DEFAULT_SELL_ITEM'; payload: { itemId: string; amount: number; name: string } }
    | { type: 'SELL_FORFEIT_ITEM'; payload: { itemId: string; amount: number; name: string } }
    | { type: 'RESOLVE_BREACH'; payload: { penalty: number; name: string } }
    | { type: 'HOSTILE_TAKEOVER'; payload: { itemId: string; penalty: number; name: string } }
    | { type: 'FORCE_FORFEIT'; payload: { itemId: string; name: string } }
    | { type: 'ACCEPT_RENEWAL'; payload: { itemId: string; extensionDays: number; interestBonus: number; name: string } }
    | { type: 'REJECT_RENEWAL'; payload: { itemId: string; name: string } }
    | { type: 'RESOLVE_POST_FORFEIT'; payload: { itemId: string; action: 'SELL_LOW' | 'GIFT' | 'REFUSE'; name: string; value: number } }

    // Financial
    | { type: 'PAY_MEDICAL_BILL' }
    | { type: 'ROTATE_MEDICAL_BILL' }
    | { type: 'MARK_BILL_OVERDUE' }
    | { type: 'PAY_RENT' }
    | { type: 'PURCHASE_TREATMENT'; payload: { type: 'STABILIZE' | 'REDUCE_RISK', cost: number } }
    | { type: 'VISIT_MOTHER' }
    | { type: 'EMERGENCY_TREATMENT' }
    | { type: 'PAY_SURGERY' }
    | { type: 'UPDATE_MOTHER_STATUS'; payload: MotherCondition }
    | { type: 'DEBUG_ADD_CASH'; payload: number }

    // UI toggles
    | { type: 'TOGGLE_INVENTORY' }
    | { type: 'TOGGLE_MAIL' }
    | { type: 'TOGGLE_DEBUG' }
    | { type: 'TOGGLE_FINANCIALS' }
    | { type: 'TOGGLE_MEDICAL' }
    | { type: 'TOGGLE_VISIT' }

    // Narrative (chains, mail)
    | { type: 'UPDATE_CHAINS'; payload: EventChainState[] }
    | { type: 'UPDATE_CHAIN_VAR'; payload: { chainId: string; variable: string; value: number } }
    | { type: 'SCHEDULE_MAIL'; payload: { templateId: string; delayDays: number; metadata?: any; sourceChainId?: string; relatedEventId?: string } }
    | { type: 'PROCESS_DAILY_MAIL' }
    | { type: 'READ_MAIL'; payload: string }
    | { type: 'CLAIM_MAIL_REWARD'; payload: string }

    // News & Market
    | { type: 'UPDATE_NEWS'; payload: { news: any[], modifiers: any[], deferredNews?: any[] } }
    | { type: 'ADD_VIOLATION'; payload: string }
    | { type: 'CLEAR_VIOLATIONS' }

    // Milestones
    | { type: 'UNLOCK_MILESTONE'; payload: string }

    // Expiry System
    | { type: 'SET_EXPIRY_QUEUE'; payload: ExpiryEvent[] }
    | { type: 'TRIGGER_EXPIRY_EVENT'; payload: ExpiryEvent }
    | { type: 'RESOLVE_EXPIRY'; payload: { choice: string; itemId: string; extensionDays?: number; extraFee?: number; salePrice?: number } }
    | { type: 'CLEAR_EXPIRY_EVENT' }
    | { type: 'MARK_CORE_LOST'; payload: { itemId: string } }

    // Night Phase (Essence)
    | { type: 'ADD_ESSENCE'; payload: { essenceType: EssenceType; amount: number } }
    | { type: 'ADD_ESSENCE_BATCH'; payload: Partial<EssenceBalance> }
    | { type: 'SPEND_ESSENCE'; payload: { essenceType: EssenceType; amount: number } }
    | { type: 'SPEND_ESSENCE_BATCH'; payload: Partial<EssenceBalance> }
    | { type: 'CONSUME_NIGHT_ENERGY'; payload: number }
    | { type: 'ADD_NIGHT_ENERGY'; payload: number }
    | { type: 'RESET_NIGHT_STATE' }
    | { type: 'MARK_ITEM_INSIGHTED'; payload: {
    itemId: string;
    knowledgePool: KnowledgePool;
    currentRange?: [number, number];
    perceivedValue?: number;  // undefined means locked (show real value)
    hiddenTraits?: ItemTrait[];
    revealedTraits?: ItemTrait[];
  } }
    | { type: 'RESET_NIGHTLY_INSIGHT_FLAGS' }
    | { type: 'RECORD_NIGHT_ACTION'; payload: string }
    | { type: 'UPDATE_ITEM_TAGS'; payload: { itemId: string; tags?: ItemTag[]; wasRestored?: boolean; wasReforged?: boolean; workState?: WorkState } }

    // Shop Upgrades
    | { type: 'TOGGLE_UPGRADE_SHOP' }
    | { type: 'TOGGLE_FACILITY_CONTROL' }
    | { type: 'PURCHASE_UPGRADE'; payload: { upgradeId: string } }
    | { type: 'TOGGLE_UPGRADE_ENABLED'; payload: { upgradeId: string } }
    | { type: 'DEDUCT_MAINTENANCE_COST' }

    // Appointment Board
    | { type: 'TOGGLE_APPOINTMENT_BOARD' }
    | { type: 'SET_APPOINTMENT_CANDIDATES'; payload: AppointmentCandidate[] }
    | { type: 'SELECT_APPOINTMENT_CANDIDATE'; payload: { candidateId: string } }
    | { type: 'DESELECT_APPOINTMENT_CANDIDATE'; payload: { candidateId: string } }
    | { type: 'SET_APPOINTMENT_PREFERENCE'; payload: AppointmentPreference }
    | { type: 'CLEAR_APPOINTMENT_SELECTIONS' }
    | { type: 'PREPARE_DAILY_APPOINTMENTS' }
    | { type: 'POP_APPOINTED_CANDIDATE' }

    // Black Market
    | { type: 'TOGGLE_BLACKMARKET' }

    // Night Panels
    | { type: 'TOGGLE_WORKSHOP' }
    | { type: 'TOGGLE_INSIGHT' }
    | { type: 'SET_PENDING_SELECTED_ITEM'; payload: string | null }
    | { type: 'BLACKMARKET_SELL_TO_PURCHASE'; payload: { itemId: string; itemName: string; amount: number; tag: ItemTag; heatGain: number } }
    | { type: 'BLACKMARKET_SELL_DIRECT'; payload: { itemId: string; itemName: string; amount: number; heatGain: number } }
    | { type: 'BLACKMARKET_PAY_FINE'; payload: { amount: number } }
    | { type: 'BLACKMARKET_ACCEPT_LOCKDOWN'; payload: { lockDays: number } }
    | { type: 'BLACKMARKET_PROCESS_DAY_END'; payload: { riskEvent: RiskEvent | null } }
    | { type: 'BLACKMARKET_REFRESH_DAILY' }
    | { type: 'SET_BLACKMARKET_STATE'; payload: BlackmarketState }

    // Stolen goods & Police investigation (赃物收购 & 警方调查)
    | { type: 'STOLEN_ITEM_DECISION'; payload: { accept: boolean } }
    | { type: 'TRIGGER_POLICE_INVESTIGATION'; payload: { itemId: string; itemName: string } }
    | { type: 'POLICE_INVESTIGATION_DECISION'; payload: { surrender: boolean; itemId: string } }
    | { type: 'CLEAR_POLICE_INVESTIGATION' }

    // Item Log System (S3-F1/F2)
    | { type: 'APPEND_ITEM_LOGS'; payload: { itemId: string; log: ItemLogEntry }[] }

    // Daily Challenge (每日挑战 v2.1)
    | { type: 'SET_DAILY_CHALLENGE'; payload: DailyChallenge | null }
    | { type: 'COMPLETE_DAILY_CHALLENGE' }
    | { type: 'TRACK_REJECTED_CUSTOMER' }
    | { type: 'TRACK_MISTAKE' }
    | { type: 'TRACK_HIGH_RISK_ITEM' }

    // Customer Schedule (出场顺序 v2.1)
    | { type: 'SET_DAILY_SCHEDULE'; payload: DailySchedule }
    | { type: 'ADVANCE_SCHEDULE_SLOT' }

    // Character Ability System (人物能力升级系统)
    | { type: 'UNLOCK_ABILITY_SKILL'; payload: { skillId: SkillId } }
    | { type: 'MARK_SKILL_USED'; payload: { skillId: SkillId } }
    | { type: 'RESET_NEGOTIATION_SKILLS' }
    | { type: 'RESET_DEPARTURE_SKILLS' }
    | { type: 'ENQUEUE_MORAL_ECHOES'; payload: MoralEchoEvent[] }
    | { type: 'PROCESS_MORAL_ECHOES'; payload: { day: number } }
    | { type: 'UPDATE_WORD_OF_MOUTH'; payload: { failStreak: number; pendingChecks: Array<{ checkDay: number; sourceDay: number }> } }
    | { type: 'UPDATE_FORESIGHT_FATIGUE'; payload: { totalFlashes: number; fatigued: boolean } }
    | { type: 'SET_EXTRA_CARE_USED' }
    | { type: 'SET_ABILITY_STATE'; payload: AbilityState }
    | { type: 'TOGGLE_ABILITY_PANEL' }

    // Debug flags
    | { type: 'DEBUG_TOGGLE_FLOOR' };
