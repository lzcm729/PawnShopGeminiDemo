/**
 * GameNode Types
 *
 * Node architecture for unified daytime interaction data.
 * Nodes are immutable snapshots that provide a consistent interface
 * for all customer interactions (pawn, settlement, item-derived).
 *
 * Design Decision: Snapshot Mode
 * - Nodes contain immutable customer/item data
 * - Interaction state (patience, mood, offer) managed by useNegotiation hook
 * - Data sources (narrative, filler, expiry) each create their own nodes
 */

import { Item, ItemTrait, ItemStatus } from '../systems/items/types';
import { Mood } from '../systems/core/types';
import { Customer, BehaviorTag } from '../systems/npc/types';
import { Dialogue } from '../systems/narrative/types';

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * Union type for all game nodes
 */
export type GameNode = PawnNode | SettlementNode | ItemDerivedNode;

/**
 * PawnNode: Customer wants to pawn an item
 * Created by: narrative events, filler generator, appointment system
 */
export interface PawnNode {
    type: 'PAWN';
    customer: CustomerSnapshot;
    item: ItemSnapshot;
    offer: PawnOffer;
}

/**
 * SettlementNode: Contract expiration handling
 * Created by: expiry system (REDEEM/RENEW behavior)
 */
export interface SettlementNode {
    type: 'SETTLEMENT';
    contract: ContractSnapshot;
    customer?: CustomerSnapshot;  // Customer appears for REDEEM/RENEW
}

/**
 * ItemDerivedNode: Actions triggered by inventory items
 * Created by: item events, special actions
 */
export interface ItemDerivedNode {
    type: 'ITEM_DERIVED';
    item: ItemSnapshot;
    derivedAction: DerivedAction;
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

/**
 * Immutable customer snapshot for node data
 */
export interface CustomerSnapshot {
    id: string;
    name: string;
    chainId?: string;
    eventId?: string;
    description: string;
    avatarSeed: string;
    mood: Mood;
    patience: number;
    behaviorTags: BehaviorTag[];
    identityTags: string[];
    pawnReason: string;
    visitCount: number;
    dialogue: Dialogue;
    redemptionResolve: 'Strong' | 'Medium' | 'Weak' | 'None';
    observation?: string;
}

/**
 * Immutable item snapshot for node data
 */
export interface ItemSnapshot {
    id: string;
    name: string;
    category: string;
    condition: string;
    visualDescription: string;
    currentRange: [number, number];
    initialRange: [number, number];
    perceivedValue?: number;
    realValue: number;
    uncertainty: number;
    revealedTraits: ItemTrait[];
    hiddenTraits: ItemTrait[];
    usedTraitIds: string[];
    appraised: boolean;
    appraisalCount?: number;
    hasNegativeAppraisalEvent?: boolean;
    isStolen: boolean;
    isFake: boolean;
    isSuspicious?: boolean;
    sentimentalValue: boolean;
    status: ItemStatus;
    logs: any[];
    relatedChainId?: string;
    isVirtual?: boolean;
}

/**
 * Pawn offer from customer
 */
export interface PawnOffer {
    askPrice: number;           // Customer's initial asking price
    desiredAmount: number;      // What customer hopes to get
    minimumAmount: number;      // Customer's floor
    maxRepayment: number;       // Maximum they can repay
    pawnTermDays: number;       // Requested pawn duration
}

/**
 * Contract snapshot for settlement
 */
export interface ContractSnapshot {
    itemId: string;
    itemName: string;
    chainId: string;
    npcName: string;
    principal: number;
    interestRate: number;
    startDate: number;
    termDays: number;
    dueDate: number;
    valuation: number;
    redemptionCost: {
        principal: number;
        interest: number;
        total: number;
    };
    realValue: number;
    isCoreItem: boolean;
}

/**
 * Derived action types for item-based interactions
 */
export type DerivedAction =
    | { type: 'SELL_FORFEIT'; buyerName?: string }
    | { type: 'POST_FORFEIT_VISIT'; visitorName: string }
    | { type: 'SPECIAL_EVENT'; eventId: string };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a CustomerSnapshot from a Customer object
 */
export function createCustomerSnapshot(customer: Customer, visitCount: number = 1): CustomerSnapshot {
    return {
        id: customer.id,
        name: customer.name,
        chainId: customer.chainId,
        eventId: customer.eventId,
        description: customer.description,
        avatarSeed: customer.avatarSeed,
        mood: customer.mood,
        patience: customer.patience,
        behaviorTags: [...customer.behaviorTags],
        identityTags: [...customer.identityTags],
        pawnReason: customer.dialogue?.pawnReason || '',
        visitCount,
        dialogue: customer.dialogue,
        redemptionResolve: customer.redemptionResolve,
        observation: customer.observation
    };
}

/**
 * Create an ItemSnapshot from an Item object
 */
export function createItemSnapshot(item: Item): ItemSnapshot {
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        condition: item.condition,
        visualDescription: item.visualDescription,
        currentRange: [...item.currentRange] as [number, number],
        initialRange: [...item.initialRange] as [number, number],
        perceivedValue: item.perceivedValue,
        realValue: item.realValue,
        uncertainty: item.uncertainty,
        revealedTraits: [...item.revealedTraits],
        hiddenTraits: [...item.hiddenTraits],
        usedTraitIds: [...(item.usedTraitIds || [])],
        appraised: item.appraised,
        appraisalCount: item.appraisalCount,
        hasNegativeAppraisalEvent: item.hasNegativeAppraisalEvent,
        isStolen: item.isStolen,
        isFake: item.isFake,
        isSuspicious: item.isSuspicious,
        sentimentalValue: item.sentimentalValue,
        status: item.status,
        logs: [...item.logs],
        relatedChainId: item.relatedChainId,
        isVirtual: item.isVirtual
    };
}

/**
 * Create a PawnOffer from Customer data
 */
export function createPawnOffer(customer: Customer): PawnOffer {
    return {
        askPrice: customer.currentAskPrice ?? customer.desiredAmount,
        desiredAmount: customer.desiredAmount,
        minimumAmount: customer.minimumAmount,
        maxRepayment: customer.maxRepayment,
        pawnTermDays: customer.pawnTermDays ?? 7
    };
}

/**
 * Create a PawnNode from a Customer
 */
export function createPawnNode(customer: Customer, visitCount: number = 1): PawnNode {
    return {
        type: 'PAWN',
        customer: createCustomerSnapshot(customer, visitCount),
        item: createItemSnapshot(customer.item),
        offer: createPawnOffer(customer)
    };
}

/**
 * Extract Customer-like object from a PawnNode for backward compatibility
 * This allows existing components to work with the new node system
 */
export function nodeToCustomer(node: PawnNode): Customer {
    const { customer, item, offer } = node;

    return {
        id: customer.id,
        name: customer.name,
        description: customer.description,
        avatarSeed: customer.avatarSeed,
        dialogue: customer.dialogue,
        redemptionResolve: customer.redemptionResolve,
        behaviorTags: customer.behaviorTags,
        patience: customer.patience,
        mood: customer.mood,
        identityTags: customer.identityTags,
        item: itemSnapshotToItem(item),
        desiredAmount: offer.desiredAmount,
        minimumAmount: offer.minimumAmount,
        maxRepayment: offer.maxRepayment,
        interactionType: 'PAWN',
        currentAskPrice: offer.askPrice,
        chainId: customer.chainId,
        eventId: customer.eventId,
        observation: customer.observation,
        pawnTermDays: offer.pawnTermDays
    };
}

/**
 * Convert ItemSnapshot back to Item for backward compatibility
 */
export function itemSnapshotToItem(snapshot: ItemSnapshot): Item {
    return {
        id: snapshot.id,
        name: snapshot.name,
        category: snapshot.category,
        condition: snapshot.condition,
        visualDescription: snapshot.visualDescription,
        historySnippet: '',
        appraisalNote: '',
        archiveSummary: '',
        isStolen: snapshot.isStolen,
        isFake: snapshot.isFake,
        isSuspicious: snapshot.isSuspicious,
        sentimentalValue: snapshot.sentimentalValue,
        appraised: snapshot.appraised,
        pawnDate: 0,
        status: snapshot.status,
        pawnAmount: 0,
        realValue: snapshot.realValue,
        perceivedValue: snapshot.perceivedValue,
        uncertainty: snapshot.uncertainty,
        currentRange: snapshot.currentRange,
        initialRange: snapshot.initialRange,
        hiddenTraits: snapshot.hiddenTraits,
        revealedTraits: snapshot.revealedTraits,
        usedTraitIds: snapshot.usedTraitIds,
        logs: snapshot.logs,
        appraisalCount: snapshot.appraisalCount,
        hasNegativeAppraisalEvent: snapshot.hasNegativeAppraisalEvent,
        relatedChainId: snapshot.relatedChainId,
        isVirtual: snapshot.isVirtual
    };
}

/**
 * Type guard for PawnNode
 */
export function isPawnNode(node: GameNode): node is PawnNode {
    return node.type === 'PAWN';
}

/**
 * Type guard for SettlementNode
 */
export function isSettlementNode(node: GameNode): node is SettlementNode {
    return node.type === 'SETTLEMENT';
}

/**
 * Type guard for ItemDerivedNode
 */
export function isItemDerivedNode(node: GameNode): node is ItemDerivedNode {
    return node.type === 'ITEM_DERIVED';
}
