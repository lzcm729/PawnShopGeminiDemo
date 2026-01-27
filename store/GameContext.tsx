
import React, { createContext, useContext, useReducer, ReactNode, PropsWithChildren, useEffect } from 'react';
import { GameState, GamePhase, ReputationType, Customer, Item, ReputationProfile, ItemStatus, TransactionRecord, Mood, EventChainState, MailInstance, ActiveNewsInstance, MarketModifier, ItemLogEntry, DailyFinancialSnapshot, SatisfactionLevel, MotherCondition } from '../types';
import { getMailTemplate } from '../systems/narrative/mailRegistry';
import { interpolateMailBody } from '../systems/narrative/mailUtils';
import { generateValuationRange } from '../systems/items/utils';
import { generateRedeemLog, generateForfeitLog, generateSoldLog } from '../systems/game/utils/logGenerator';
import { saveGame, clearSave } from '../systems/core/persistence';
import { playSfx } from '../systems/game/audio';
import { GAME_CONFIG } from '../systems/game/config';

// ... initialState ...
const initialState: GameState = {
  phase: GamePhase.START_SCREEN,
  stats: {
    day: 1,
    cash: GAME_CONFIG.INITIAL_FUNDS,
    targetSavings: GAME_CONFIG.GOAL_AMOUNT,
    motherStatus: { ...GAME_CONFIG.INITIAL_MOTHER_STATUS } as MotherCondition,
    medicalBill: {
        amount: GAME_CONFIG.WEEKLY_MEDICAL_COST,
        dueDate: GAME_CONFIG.BILL_CYCLE,
        status: 'PENDING'
    },
    visitedToday: false,
    dailyExpenses: GAME_CONFIG.DAILY_EXPENSES,
    actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS, 
    maxActionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
    rentDue: GAME_CONFIG.WEEKLY_RENT,
    rentDueDate: GAME_CONFIG.RENT_CYCLE
  },
  reputation: {
    [ReputationType.HUMANITY]: GAME_CONFIG.INITIAL_REPUTATION.HUMANITY,
    [ReputationType.CREDIBILITY]: GAME_CONFIG.INITIAL_REPUTATION.CREDIBILITY,
    [ReputationType.UNDERWORLD]: GAME_CONFIG.INITIAL_REPUTATION.UNDERWORLD
  },
  inventory: [],
  currentCustomer: null,
  dayEvents: [],
  todayTransactions: [],
  customersServedToday: 0,
  maxCustomersPerDay: GAME_CONFIG.MAX_CUSTOMERS_PER_DAY, 
  isLoading: false,
  showInventory: false,
  showMail: false,
  showDebug: false,
  showFinancials: false, 
  showMedical: false,
  showVisit: false,
  activeChains: GAME_CONFIG.STARTING_CHAINS,
  inbox: [],
  pendingMails: [],
  completedScenarioIds: [],
  dailyNews: [],
  activeMarketEffects: [],
  violationFlags: [],
  financialHistory: [],
  lastSatisfaction: null,
  activeMilestones: [] // New State
};

// ... Actions type definition ...
type Action =
  | { type: 'LOAD_GAME'; payload: GameState }
  | { type: 'START_GAME' }
  | { type: 'START_DAY' }
  | { type: 'OPEN_SHOP' }
  | { type: 'START_NIGHT' }
  | { type: 'SET_PHASE'; payload: GamePhase } 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CUSTOMER'; payload: Customer | null }
  | { type: 'CLEAR_CUSTOMER' }
  | { type: 'UPDATE_CUSTOMER_STATUS'; payload: { patience: number; mood: Mood; currentAskPrice: number } }
  | { type: 'APPRAISE_ITEM' } 
  | { type: 'UPDATE_ITEM_KNOWLEDGE'; payload: { itemId: string; newRange: [number, number]; revealedTraits: any[]; newUncertainty: number; newPerceived?: number; incrementAppraisalCount?: boolean; hasNegativeEvent?: boolean; log?: ItemLogEntry } } 
  | { type: 'REALIZE_ITEM_TRUTH'; payload: { itemId: string } }
  | { type: 'MARK_TRAIT_USED'; payload: { traitId: string } }
  | { type: 'CONSUME_AP'; payload: number } 
  | { type: 'RESOLVE_TRANSACTION'; payload: { cashDelta: number; reputationDelta: Partial<ReputationProfile>; item: Item | null; log: string; customerName: string } }
  | { type: 'LIQUIDATE_ITEM'; payload: { itemId: string; amount: number; name: string } }
  | { type: 'REJECT_DEAL' }
  | { type: 'MANUAL_CLOSE_SHOP' } 
  | { type: 'END_DAY' }
  | { type: 'UPDATE_MOTHER_STATUS'; payload: MotherCondition }
  | { type: 'PAY_MEDICAL_BILL' }
  | { type: 'ROTATE_MEDICAL_BILL' }
  | { type: 'MARK_BILL_OVERDUE' }
  | { type: 'PAY_RENT' }
  | { type: 'PURCHASE_TREATMENT'; payload: { type: 'STABILIZE' | 'REDUCE_RISK', cost: number } }
  | { type: 'VISIT_MOTHER' }
  | { type: 'PAY_SURGERY' }
  | { type: 'GAME_OVER'; payload: string }
  | { type: 'TOGGLE_INVENTORY' }
  | { type: 'TOGGLE_MAIL' }
  | { type: 'TOGGLE_DEBUG' } 
  | { type: 'TOGGLE_FINANCIALS' } 
  | { type: 'TOGGLE_MEDICAL' }
  | { type: 'TOGGLE_VISIT' }
  | { type: 'UPDATE_CHAINS'; payload: EventChainState[] }
  | { type: 'SCHEDULE_MAIL'; payload: { templateId: string; delayDays: number; metadata?: any } }
  | { type: 'PROCESS_DAILY_MAIL' }
  | { type: 'READ_MAIL'; payload: string } 
  | { type: 'CLAIM_MAIL_REWARD'; payload: string }
  | { type: 'REDEEM_ITEM'; payload: { itemId: string; paymentAmount: number; name: string } }
  | { type: 'EXTEND_PAWN'; payload: { itemId: string; interestPaid: number; newDueDate: number; name: string } }
  | { type: 'REFUSE_EXTENSION'; payload: { itemId: string; name: string } }
  | { type: 'EXPIRE_ITEMS'; payload: { expiredItemIds: string[]; logs: string[] } }
  | { type: 'DEFAULT_SELL_ITEM'; payload: { itemId: string; amount: number; name: string } }
  | { type: 'RESOLVE_BREACH'; payload: { penalty: number; name: string } }
  | { type: 'HOSTILE_TAKEOVER'; payload: { itemId: string; penalty: number; name: string } }
  | { type: 'FORCE_FORFEIT'; payload: { itemId: string; name: string } }
  | { type: 'UPDATE_NEWS'; payload: { news: ActiveNewsInstance[], modifiers: MarketModifier[] } }
  | { type: 'ADD_VIOLATION'; payload: string }
  | { type: 'CLEAR_VIOLATIONS' }
  | { type: 'SET_SATISFACTION'; payload: SatisfactionLevel }
  | { type: 'UNLOCK_MILESTONE'; payload: string }
  | { type: 'ACCEPT_RENEWAL'; payload: { itemId: string; extensionDays: number; interestBonus: number; name: string } }
  | { type: 'REJECT_RENEWAL'; payload: { itemId: string; name: string } }
  | { type: 'RESOLVE_POST_FORFEIT'; payload: { itemId: string; action: 'SELL_LOW' | 'GIFT' | 'REFUSE'; name: string; value: number } };

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'LOAD_GAME':
      return { ...action.payload };

    case 'START_GAME':
      clearSave();
      return { ...initialState, phase: GamePhase.MORNING_BRIEF };
      
    case 'START_DAY': {
      // Legacy action, mostly handled by OPEN_SHOP now, but kept for safe initialization if needed
      return { 
        ...state, 
        phase: GamePhase.MORNING_BRIEF
      };
    }

    case 'OPEN_SHOP': {
      // 1. Process Mail Arrival
      const today = state.stats.day;
      const arrivingMails = state.pendingMails.filter(m => m.arrivalDay <= today);
      const remainingPending = state.pendingMails.filter(m => m.arrivalDay > today);
      
      const newInbox = arrivingMails.length > 0 
          ? [...arrivingMails, ...state.inbox] 
          : state.inbox;

      // 2. Calculate Action Points (with Modifiers & Perks)
      const apModifier = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.actionPointsModifier || 0), 0);
      const hasGoldStandard = state.activeMilestones.includes('cred_expert');
      const baseAP = state.stats.maxActionPoints + (hasGoldStandard ? 2 : 0);
      const effectiveMaxAP = Math.max(1, baseAP + apModifier);

      return { 
          ...state, 
          phase: GamePhase.BUSINESS,
          inbox: newInbox,
          pendingMails: remainingPending,
          // RESET DAILY COUNTERS HERE
          customersServedToday: 0,
          todayTransactions: [],
          dayEvents: [], // Clear night report logs
          violationFlags: [], // Reset daily violations
          lastSatisfaction: null,
          stats: {
              ...state.stats,
              actionPoints: effectiveMaxAP,
              visitedToday: false
          }
      };
    }

    case 'START_NIGHT':
      // Sound effect removed to prevent duplicate play with UI interaction
      return { ...state, phase: GamePhase.NIGHT, currentCustomer: null, lastSatisfaction: null };

    // ... rest of the reducer cases (SET_PHASE, SET_LOADING, etc) unchanged ...
    case 'SET_PHASE': return { ...state, phase: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_CUSTOMER': if (!action.payload) return { ...state, currentCustomer: null }; const customerInit = { ...action.payload, mood: 'Neutral' as Mood }; return { ...state, currentCustomer: customerInit, phase: GamePhase.NEGOTIATION, lastSatisfaction: null };
    case 'CLEAR_CUSTOMER': return { ...state, currentCustomer: null };
    case 'UPDATE_CUSTOMER_STATUS': if (!state.currentCustomer) return state; return { ...state, currentCustomer: { ...state.currentCustomer, patience: action.payload.patience, mood: action.payload.mood, currentAskPrice: action.payload.currentAskPrice } };
    case 'UPDATE_ITEM_KNOWLEDGE': if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state; const prevCount = state.currentCustomer.item.appraisalCount || 0; const prevNegative = state.currentCustomer.item.hasNegativeAppraisalEvent || false; const prevLogs = state.currentCustomer.item.logs || []; const newLogs = action.payload.log ? [...prevLogs, action.payload.log] : prevLogs; return { ...state, currentCustomer: { ...state.currentCustomer, item: { ...state.currentCustomer.item, currentRange: action.payload.newRange, revealedTraits: action.payload.revealedTraits, uncertainty: action.payload.newUncertainty, perceivedValue: action.payload.newPerceived, appraised: true, appraisalCount: action.payload.incrementAppraisalCount ? prevCount + 1 : prevCount, hasNegativeAppraisalEvent: action.payload.hasNegativeEvent !== undefined ? action.payload.hasNegativeEvent : prevNegative, logs: newLogs } } };
    case 'REALIZE_ITEM_TRUTH': { if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state; const item = state.currentCustomer.item; const newUncertainty = 0.1; const trueRange = generateValuationRange(item.realValue, undefined, newUncertainty); const newInitialRange = generateValuationRange(item.realValue, undefined, 0.4); return { ...state, currentCustomer: { ...state.currentCustomer, item: { ...item, perceivedValue: undefined, uncertainty: newUncertainty, currentRange: trueRange, initialRange: newInitialRange, appraised: false } } }; }
    case 'MARK_TRAIT_USED': {
        if (!state.currentCustomer) return state;
        const currentItem = state.currentCustomer.item;
        const newUsed = [...(currentItem.usedTraitIds || []), action.payload.traitId];
        return {
            ...state,
            currentCustomer: {
                ...state.currentCustomer,
                item: {
                    ...currentItem,
                    usedTraitIds: newUsed
                }
            }
        };
    }

    case 'CONSUME_AP': return { ...state, stats: { ...state.stats, actionPoints: Math.max(0, state.stats.actionPoints - action.payload) } };
    case 'APPRAISE_ITEM': if (!state.currentCustomer) return state; return { ...state, currentCustomer: { ...state.currentCustomer, item: { ...state.currentCustomer.item, appraised: true } } };
    case 'SET_SATISFACTION': return { ...state, lastSatisfaction: action.payload };

    case 'RESOLVE_TRANSACTION': { 
        const { cashDelta, reputationDelta, item, log, customerName } = action.payload; 
        if (cashDelta > 0) playSfx('CASH'); else if (cashDelta < 0) playSfx('CLICK'); 
        
        // --- VIOLATION CHECK (Task 11 Fix) ---
        // Verify if we accepted an illicit item during a crackdown
        let newViolationFlags = [...state.violationFlags];
        const currentRisk = state.activeMarketEffects.reduce((acc, mod) => acc + (mod.riskModifier || 0), 0);
        
        if (item && (item.isStolen || (item.category === '违禁品' && !item.isSuspicious))) {
            if (currentRisk > 0 && !newViolationFlags.includes('police_risk_ignored')) {
                newViolationFlags.push('police_risk_ignored');
            }
        }
        // -------------------------------------

        const newRep = { ...state.reputation }; 
        if (reputationDelta[ReputationType.HUMANITY]) newRep[ReputationType.HUMANITY] += reputationDelta[ReputationType.HUMANITY]!; 
        if (reputationDelta[ReputationType.CREDIBILITY]) newRep[ReputationType.CREDIBILITY] += reputationDelta[ReputationType.CREDIBILITY]!; 
        if (reputationDelta[ReputationType.UNDERWORLD]) newRep[ReputationType.UNDERWORLD] += reputationDelta[ReputationType.UNDERWORLD]!; 
        Object.keys(newRep).forEach(key => { newRep[key as ReputationType] = Math.max(0, Math.min(100, newRep[key as ReputationType])); }); 
        
        const newInventory = item ? [...state.inventory, item] : state.inventory; 
        const newTransaction: TransactionRecord | null = item ? { id: crypto.randomUUID(), description: `收当: ${item.name}`, amount: cashDelta, type: 'PAWN' } : null; 
        const updatedTransactions = newTransaction ? [...state.todayTransactions, newTransaction] : state.todayTransactions; 
        const servedCount = state.customersServedToday + 1; 
        const completedId = state.currentCustomer?.id; 
        const newCompletedIds = (completedId && !completedId.startsWith('proc-')) ? [...state.completedScenarioIds, completedId] : state.completedScenarioIds; 
        
        return { 
            ...state, 
            stats: { ...state.stats, cash: state.stats.cash + cashDelta }, 
            reputation: newRep, 
            inventory: newInventory, 
            dayEvents: [...state.dayEvents, log], 
            todayTransactions: updatedTransactions, 
            customersServedToday: servedCount, 
            phase: GamePhase.DEPARTURE, 
            completedScenarioIds: newCompletedIds,
            violationFlags: newViolationFlags
        }; 
    }
    
    case 'REJECT_DEAL': { const servedCount = state.customersServedToday + 1; const completedId = state.currentCustomer?.id; const newCompletedIds = (completedId && !completedId.startsWith('proc-')) ? [...state.completedScenarioIds, completedId] : state.completedScenarioIds; playSfx('CLICK'); return { ...state, dayEvents: [...state.dayEvents, `Turned away ${state.currentCustomer?.name}`], customersServedToday: servedCount, phase: GamePhase.DEPARTURE, completedScenarioIds: newCompletedIds }; }
    case 'LIQUIDATE_ITEM': { const { itemId, amount, name } = action.payload; playSfx('CASH'); const soldInventory = state.inventory.map(item => { if (item.id === itemId) { const soldLog = generateSoldLog(item, state.stats.day, amount); return { ...item, status: ItemStatus.SOLD, logs: [...(item.logs || []), soldLog] }; } return item; }); const saleRecord: TransactionRecord = { id: crypto.randomUUID(), description: `绝当变现: ${name}`, amount: amount, type: 'SELL' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash + amount }, inventory: soldInventory, todayTransactions: [...state.todayTransactions, saleRecord], dayEvents: [...state.dayEvents, `出售过期物品: ${name} (+$${amount})`] }; }
    case 'REDEEM_ITEM': { const { itemId, paymentAmount, name } = action.payload; playSfx('CASH'); const updatedInventory = state.inventory.map(item => { if (item.id === itemId) { const redeemLog = generateRedeemLog(state.currentCustomer?.name || "顾客", item, state.stats.day, paymentAmount); return { ...item, status: ItemStatus.REDEEMED, logs: [...(item.logs || []), redeemLog] }; } return item; }); const record: TransactionRecord = { id: crypto.randomUUID(), description: `顾客赎回: ${name}`, amount: paymentAmount, type: 'REDEEM' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash + paymentAmount }, inventory: updatedInventory, todayTransactions: [...state.todayTransactions, record], dayEvents: [...state.dayEvents, `${name} 已被赎回 (收回资金 $${paymentAmount})`] }; }
    case 'EXTEND_PAWN': { const { itemId, interestPaid, newDueDate, name } = action.payload; playSfx('CASH'); const updatedInventory = state.inventory.map(item => { if (item.id === itemId && item.pawnInfo) { return { ...item, pawnInfo: { ...item.pawnInfo, dueDate: newDueDate, extensionCount: (item.pawnInfo.extensionCount || 0) + 1 } }; } return item; }); const record: TransactionRecord = { id: crypto.randomUUID(), description: `续当利息: ${name}`, amount: interestPaid, type: 'EXTEND' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash + interestPaid }, inventory: updatedInventory, todayTransactions: [...state.todayTransactions, record], dayEvents: [...state.dayEvents, `${name} 续当一周 (收取利息 $${interestPaid})`] }; }
    case 'REFUSE_EXTENSION': { const { itemId, name } = action.payload; const updatedInventory = state.inventory.map(item => { if (item.id === itemId) { const log = generateForfeitLog(item, state.stats.day, "拒绝续当"); return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] }; } return item; }); const newRep = { ...state.reputation }; newRep[ReputationType.HUMANITY] = Math.max(0, newRep[ReputationType.HUMANITY] - 10); const servedCount = state.customersServedToday + 1; return { ...state, inventory: updatedInventory, reputation: newRep, customersServedToday: servedCount, phase: GamePhase.DEPARTURE, dayEvents: [...state.dayEvents, `拒绝续当: ${name}。物品已收归店铺 (Humanity -10)。`] }; }
    case 'EXPIRE_ITEMS': { const { expiredItemIds, logs } = action.payload; if (expiredItemIds.length === 0) return state; const updatedInventory = state.inventory.map(item => { if (expiredItemIds.includes(item.id)) { const forfeitLog = generateForfeitLog(item, state.stats.day); return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), forfeitLog] }; } return item; }); return { ...state, inventory: updatedInventory, dayEvents: [...state.dayEvents, ...logs] }; }
    case 'FORCE_FORFEIT': { const { itemId, name } = action.payload; const updatedInventory = state.inventory.map(item => { if (item.id === itemId) { const log = generateForfeitLog(item, state.stats.day, "强制送客"); return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] }; } return item; }); const servedCount = state.customersServedToday + 1; return { ...state, inventory: updatedInventory, customersServedToday: servedCount, phase: GamePhase.DEPARTURE, dayEvents: [...state.dayEvents, `送客处置: ${name} 强制收归店铺所有。`] }; }
    case 'DEFAULT_SELL_ITEM': { const { itemId, amount, name } = action.payload; playSfx('CASH'); const soldInventory = state.inventory.map(item => { if (item.id === itemId) { const soldLog = generateSoldLog(item, state.stats.day, amount); return { ...item, status: ItemStatus.SOLD, logs: [...(item.logs || []), soldLog] }; } return item; }); const saleRecord: TransactionRecord = { id: crypto.randomUUID(), description: `违约出售: ${name}`, amount: amount, type: 'SELL' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash + amount }, inventory: soldInventory, todayTransactions: [...state.todayTransactions, saleRecord], dayEvents: [...state.dayEvents, `违约出售活跃当品: ${name} (+$${amount})`] }; }
    case 'RESOLVE_BREACH': { const { penalty, name } = action.payload; playSfx('FAIL'); const newRep = { ...state.reputation }; newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 50); const record: TransactionRecord = { id: crypto.randomUUID(), description: `违约赔偿: ${name}`, amount: -penalty, type: 'PENALTY' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash - penalty }, reputation: newRep, todayTransactions: [...state.todayTransactions, record], dayEvents: [...state.dayEvents, `支付违约金: ${name} (-$${penalty})，信誉大幅下降。`] }; }
    case 'HOSTILE_TAKEOVER': { const { itemId, penalty, name } = action.payload; playSfx('FAIL'); const updatedInventory = state.inventory.map(item => { if (item.id === itemId) { const log = generateForfeitLog(item, state.stats.day, "恶意买断"); return { ...item, status: ItemStatus.FORFEIT, logs: [...(item.logs || []), log] }; } return item; }); const newRep = { ...state.reputation }; newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 50); newRep[ReputationType.HUMANITY] = Math.max(0, newRep[ReputationType.HUMANITY] - 20); const record: TransactionRecord = { id: crypto.randomUUID(), description: `强制买断: ${name}`, amount: -penalty, type: 'PENALTY' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash - penalty }, inventory: updatedInventory, reputation: newRep, todayTransactions: [...state.todayTransactions, record], dayEvents: [...state.dayEvents, `恶意违约/强制买断: ${name} (-$${penalty})。顾客极度愤怒。`] }; }
    case 'MANUAL_CLOSE_SHOP': playSfx('CLICK'); return { ...state, phase: GamePhase.NIGHT };
    case 'PAY_MEDICAL_BILL': { playSfx('SUCCESS'); const billAmount = state.stats.medicalBill.amount; const billRecord: TransactionRecord = { id: crypto.randomUUID(), description: "支付母亲医药费", amount: -billAmount, type: 'MEDICAL' }; const currentMother = state.stats.motherStatus; const newMother = { ...currentMother, careLevel: 'Premium' as const, risk: Math.max(0, currentMother.risk - 5), status: 'Improving' as const }; return { ...state, stats: { ...state.stats, cash: state.stats.cash - billAmount, motherStatus: newMother, medicalBill: { ...state.stats.medicalBill, status: 'PAID' } }, todayTransactions: [...state.todayTransactions, billRecord], dayEvents: [...state.dayEvents, `Paid Medical Bill: $${billAmount}. Treatment plan secured.`] }; }
    case 'ROTATE_MEDICAL_BILL': {
        const baseCost = GAME_CONFIG.WEEKLY_MEDICAL_COST;
        const fluctuation = 0.8 + (Math.random() * 0.4); 
        const newAmount = Math.floor(baseCost * fluctuation);
        const newDueDate = state.stats.medicalBill.dueDate + 7;
        
        return {
            ...state,
            stats: {
                ...state.stats,
                medicalBill: {
                    amount: newAmount,
                    dueDate: newDueDate,
                    status: 'PENDING'
                }
            },
            dayEvents: [...state.dayEvents, `Medical Bill Updated: $${newAmount} due by Day ${newDueDate}.`]
        };
    }
    case 'MARK_BILL_OVERDUE': {
        if (state.stats.medicalBill.status === 'OVERDUE') return state;
        return { ...state, stats: { ...state.stats, medicalBill: { ...state.stats.medicalBill, status: 'OVERDUE' } } };
    }
    case 'PAY_RENT': {
        const rentAmount = state.stats.rentDue;
        const newDueDate = state.stats.rentDueDate + GAME_CONFIG.RENT_CYCLE;
        const rentRecord: TransactionRecord = { id: crypto.randomUUID(), description: "支付店铺租金", amount: -rentAmount, type: 'RENT' };
        return { ...state, stats: { ...state.stats, cash: state.stats.cash - rentAmount, rentDueDate: newDueDate }, todayTransactions: [...state.todayTransactions, rentRecord], dayEvents: [...state.dayEvents, `Rent Deducted: $${rentAmount}. Next due Day ${newDueDate}.`] };
    }
    case 'PURCHASE_TREATMENT': { const { type, cost } = action.payload; playSfx('SUCCESS'); let newMother = { ...state.stats.motherStatus }; let desc = ""; if (type === 'STABILIZE') { newMother.health = Math.min(100, newMother.health + 5); desc = "额外治疗: 急救注射"; } else if (type === 'REDUCE_RISK') { newMother.risk = Math.max(0, newMother.risk - 3); desc = "额外治疗: 靶向疗法"; } const record: TransactionRecord = { id: crypto.randomUUID(), description: desc, amount: -cost, type: 'MEDICAL' }; return { ...state, stats: { ...state.stats, cash: state.stats.cash - cost, motherStatus: newMother }, todayTransactions: [...state.todayTransactions, record] }; }
    case 'VISIT_MOTHER': { const { motherStatus, visitedToday } = state.stats; if (visitedToday) return state; const newMother = { ...motherStatus, risk: Math.max(0, motherStatus.risk - 1) }; const newRep = { ...state.reputation }; newRep[ReputationType.HUMANITY] = Math.min(100, newRep[ReputationType.HUMANITY] + 2); return { ...state, stats: { ...state.stats, motherStatus: newMother, visitedToday: true }, reputation: newRep, dayEvents: [...state.dayEvents, "前往医院探望了母亲。(Humanity +2, Risk -1%)"] }; }
    case 'PAY_SURGERY': { const surgeryCost = GAME_CONFIG.GOAL_AMOUNT; const record: TransactionRecord = { id: crypto.randomUUID(), description: "支付终极手术费", amount: -surgeryCost, type: 'SURGERY' }; return { ...state, phase: GamePhase.VICTORY, stats: { ...state.stats, cash: state.stats.cash - surgeryCost }, todayTransactions: [...state.todayTransactions, record] }; }
    case 'UPDATE_MOTHER_STATUS': return { ...state, stats: { ...state.stats, motherStatus: action.payload } };
    case 'END_DAY': {
      const currentDay = state.stats.day;
      const nextDay = state.stats.day + 1;
      const expense = state.stats.dailyExpenses;
      const endingCash = state.stats.cash - expense;
      const income = state.todayTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
      const txExpenses = state.todayTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
      const netChange = income + txExpenses - expense;
      const snapshotEvents = state.todayTransactions.map(t => ({ type: t.amount > 0 ? 'INCOME' as const : 'EXPENSE' as const, amount: t.amount, label: t.description }));
      snapshotEvents.push({ type: 'EXPENSE', amount: -expense, label: '店铺运营 (Burn)' });
      const newSnapshot: DailyFinancialSnapshot = { day: currentDay, startingCash: state.stats.cash - (income + txExpenses), endingCash: endingCash, netChange: netChange, events: snapshotEvents };
      if (endingCash < 0) { clearSave(); playSfx('FAIL'); return { ...state, phase: GamePhase.GAME_OVER, dayEvents: [...state.dayEvents, "Bankrupt: Daily expenses exceeded cash."] }; }
      if (state.stats.motherStatus.health <= 0) { clearSave(); playSfx('FAIL'); return { ...state, phase: GamePhase.GAME_OVER, dayEvents: [...state.dayEvents, "GAME OVER: 母亲病情恶化去世。"] }; }
      return { ...state, stats: { ...state.stats, day: nextDay, cash: endingCash, actionPoints: state.stats.maxActionPoints }, financialHistory: [...state.financialHistory, newSnapshot], phase: GamePhase.MORNING_BRIEF };
    }
    case 'GAME_OVER': clearSave(); playSfx('FAIL'); return { ...state, phase: GamePhase.GAME_OVER, dayEvents: [...state.dayEvents, action.payload] };
    case 'TOGGLE_INVENTORY': playSfx('HOVER'); return { ...state, showInventory: !state.showInventory };
    case 'TOGGLE_MAIL': playSfx('HOVER'); return { ...state, showMail: !state.showMail };
    case 'TOGGLE_DEBUG': return { ...state, showDebug: !state.showDebug };
    case 'TOGGLE_FINANCIALS': playSfx('HOVER'); return { ...state, showFinancials: !state.showFinancials };
    case 'TOGGLE_MEDICAL': playSfx('HOVER'); return { ...state, showMedical: !state.showMedical };
    case 'TOGGLE_VISIT': playSfx('HOVER'); return { ...state, showVisit: !state.showVisit };
    case 'UPDATE_CHAINS': return { ...state, activeChains: action.payload };
    case 'SCHEDULE_MAIL': { const { templateId, delayDays, metadata } = action.payload; const newMail: MailInstance = { uniqueId: crypto.randomUUID(), templateId, arrivalDay: state.stats.day + delayDays, isRead: false, isClaimed: false, metadata }; return { ...state, pendingMails: [...state.pendingMails, newMail] }; }
    case 'PROCESS_DAILY_MAIL': { const today = state.stats.day; const arrivingMails = state.pendingMails.filter(m => m.arrivalDay <= today).map(m => { return m; }); const remainingPending = state.pendingMails.filter(m => m.arrivalDay > today); if (arrivingMails.length === 0) return state; return { ...state, inbox: [...arrivingMails, ...state.inbox], pendingMails: remainingPending }; }
    case 'READ_MAIL': return { ...state, inbox: state.inbox.map(m => m.uniqueId === action.payload ? { ...m, isRead: true } : m) };
    case 'CLAIM_MAIL_REWARD': { const mail = state.inbox.find(m => m.uniqueId === action.payload); if (!mail || mail.isClaimed) return state; const template = getMailTemplate(mail.templateId); if (!template || !template.attachments) return state; let cashDelta = 0; let newInventory = [...state.inventory]; let transaction: TransactionRecord | null = null; playSfx('CASH'); if (template.attachments.cash) { cashDelta = template.attachments.cash; transaction = { id: crypto.randomUUID(), description: `邮件奖励: ${template.sender}`, amount: cashDelta, type: 'REWARD' }; } if (template.attachments.item) newInventory.push(template.attachments.item); const updatedInbox = state.inbox.map(m => m.uniqueId === action.payload ? { ...m, isClaimed: true } : m); const updatedTransactions = transaction ? [...state.todayTransactions, transaction] : state.todayTransactions; return { ...state, stats: { ...state.stats, cash: state.stats.cash + cashDelta }, inventory: newInventory, inbox: updatedInbox, todayTransactions: updatedTransactions }; }
    case 'UPDATE_NEWS': return { ...state, dailyNews: action.payload.news, activeMarketEffects: action.payload.modifiers };
    case 'ADD_VIOLATION': if (state.violationFlags.includes(action.payload)) return state; return { ...state, violationFlags: [...state.violationFlags, action.payload] };
    case 'CLEAR_VIOLATIONS': return { ...state, violationFlags: [] };
    
    // NEW: Unlock Milestone
    case 'UNLOCK_MILESTONE': {
        if (state.activeMilestones.includes(action.payload)) return state;
        playSfx('SUCCESS');
        return {
            ...state,
            activeMilestones: [...state.activeMilestones, action.payload],
            dayEvents: [...state.dayEvents, `获得成就: ${action.payload}`] // Log internally
        };
    }

    // NEW: Renewal Logic
    case 'ACCEPT_RENEWAL': {
        const { itemId, extensionDays, interestBonus, name } = action.payload;
        playSfx('STAMP');
        const updatedInventory = state.inventory.map(item => {
            if (item.id === itemId && item.pawnInfo) {
                return {
                    ...item,
                    pawnInfo: {
                        ...item.pawnInfo,
                        dueDate: item.pawnInfo.dueDate + extensionDays,
                        interestRate: item.pawnInfo.interestRate + interestBonus,
                        extensionCount: (item.pawnInfo.extensionCount || 0) + 1
                    }
                };
            }
            return item;
        });
        const servedCount = state.customersServedToday + 1;
        return {
            ...state,
            inventory: updatedInventory,
            customersServedToday: servedCount,
            phase: GamePhase.DEPARTURE,
            lastSatisfaction: 'GRATEFUL',
            dayEvents: [...state.dayEvents, `同意续当请求: ${name} (利息 +${(interestBonus * 100).toFixed(0)}%)`]
        };
    }

    case 'REJECT_RENEWAL': {
        const { itemId, name } = action.payload;
        const servedCount = state.customersServedToday + 1;
        // No item change, just letting it expire later
        return {
            ...state,
            customersServedToday: servedCount,
            phase: GamePhase.DEPARTURE,
            lastSatisfaction: 'DESPERATE',
            dayEvents: [...state.dayEvents, `拒绝续当请求: ${name}`]
        };
    }

    // NEW: Post-Forfeit Logic
    case 'RESOLVE_POST_FORFEIT': {
        const { itemId, action: decision, name, value } = action.payload;
        
        let newInventory = [...state.inventory];
        let cashDelta = 0;
        let repDelta: Partial<ReputationProfile> = {};
        let log = "";
        let satisfaction: SatisfactionLevel = 'NEUTRAL';

        if (decision === 'SELL_LOW') {
            playSfx('CASH');
            cashDelta = value;
            newInventory = newInventory.map(i => i.id === itemId ? { ...i, status: ItemStatus.SOLD } : i);
            repDelta = { [ReputationType.HUMANITY]: 10 };
            log = `低价回售: ${name} 的物品以 $${value} 成交。`;
            satisfaction = 'GRATEFUL';
        } 
        else if (decision === 'GIFT') {
            playSfx('SUCCESS');
            newInventory = newInventory.map(i => i.id === itemId ? { ...i, status: ItemStatus.REDEEMED } : i); // Treated as redeemed but free
            repDelta = { [ReputationType.HUMANITY]: 25, [ReputationType.CREDIBILITY]: -5 };
            log = `赠还物品: ${name} (Humanity +25)`;
            satisfaction = 'GRATEFUL';
        }
        else if (decision === 'REFUSE') {
            playSfx('CLICK');
            // Item stays Forfeit
            repDelta = { [ReputationType.HUMANITY]: -10, [ReputationType.CREDIBILITY]: 5 };
            log = `拒绝回购请求: ${name} (Humanity -10)`;
            satisfaction = 'DESPERATE';
        }

        const servedCount = state.customersServedToday + 1;
        
        // Apply Rep Changes
        const newRep = { ...state.reputation };
        if (repDelta[ReputationType.HUMANITY]) newRep[ReputationType.HUMANITY] += repDelta[ReputationType.HUMANITY]!;
        if (repDelta[ReputationType.CREDIBILITY]) newRep[ReputationType.CREDIBILITY] += repDelta[ReputationType.CREDIBILITY]!;
        Object.keys(newRep).forEach(key => { newRep[key as ReputationType] = Math.max(0, Math.min(100, newRep[key as ReputationType])); });

        const transaction: TransactionRecord | null = cashDelta !== 0 ? {
            id: crypto.randomUUID(),
            description: `绝当回售: ${name}`,
            amount: cashDelta,
            type: 'SELL'
        } : null;

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash + cashDelta },
            reputation: newRep,
            inventory: newInventory,
            customersServedToday: servedCount,
            todayTransactions: transaction ? [...state.todayTransactions, transaction] : state.todayTransactions,
            dayEvents: [...state.dayEvents, log],
            phase: GamePhase.DEPARTURE,
            lastSatisfaction: satisfaction
        };
    }

    default: return state;
  }
};

const GameContext = createContext<{ state: GameState; dispatch: React.Dispatch<Action>; } | undefined>(undefined);

export const GameProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
      if (state.phase === GamePhase.MORNING_BRIEF) {
          saveGame(state);
      }
  }, [state.phase]); 

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
