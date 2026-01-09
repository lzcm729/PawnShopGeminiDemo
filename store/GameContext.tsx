
import React, { createContext, useContext, useReducer, ReactNode, PropsWithChildren } from 'react';
import { GameState, GamePhase, ReputationType, Customer, Item, ReputationProfile, ItemStatus, TransactionRecord, Mood, EventChainState, MailInstance } from '../types';
import { EMMA_CHAIN_INIT } from '../services/storyData';
import { getMailTemplate } from '../services/mailData';
import { generateValuationRange } from '../services/contentGenerator';

const initialState: GameState = {
  phase: GamePhase.START_SCREEN,
  stats: {
    day: 1,
    cash: 100000,
    rentDue: 500,
    rentDueDate: 5,
    dailyExpenses: 50,
    actionPoints: 10, 
    maxActionPoints: 10
  },
  reputation: {
    [ReputationType.HUMANITY]: 30,
    [ReputationType.CREDIBILITY]: 20,
    [ReputationType.UNDERWORLD]: 5
  },
  inventory: [],
  currentCustomer: null,
  dayEvents: [],
  todayTransactions: [],
  customersServedToday: 0,
  maxCustomersPerDay: 1, 
  isLoading: false,
  showInventory: false,
  showMail: false,
  showDebug: false,
  
  activeChains: [EMMA_CHAIN_INIT],
  
  inbox: [],
  pendingMails: [],
  
  completedScenarioIds: []
};

type Action =
  | { type: 'START_GAME' }
  | { type: 'START_DAY' }
  | { type: 'SET_PHASE'; payload: GamePhase } 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER_STATUS'; payload: { patience: number; mood: Mood; currentAskPrice: number } }
  | { type: 'APPRAISE_ITEM' } 
  | { type: 'UPDATE_ITEM_KNOWLEDGE'; payload: { itemId: string; newRange: [number, number]; revealedTraits: any[]; newUncertainty: number; newPerceived?: number } } 
  | { type: 'REALIZE_ITEM_TRUTH'; payload: { itemId: string } }
  | { type: 'CONSUME_AP'; payload: number } 
  | { type: 'RESOLVE_TRANSACTION'; payload: { cashDelta: number; reputationDelta: Partial<ReputationProfile>; item: Item | null; log: string; customerName: string } }
  | { type: 'LIQUIDATE_ITEM'; payload: { itemId: string; amount: number; name: string } }
  | { type: 'REJECT_DEAL' }
  | { type: 'MANUAL_CLOSE_SHOP' } 
  | { type: 'END_DAY' }
  | { type: 'PAY_RENT' }
  | { type: 'GAME_OVER'; payload: string }
  | { type: 'TOGGLE_INVENTORY' }
  | { type: 'TOGGLE_MAIL' }
  | { type: 'TOGGLE_DEBUG' } 
  | { type: 'UPDATE_CHAINS'; payload: EventChainState[] }
  | { type: 'SCHEDULE_MAIL'; payload: { templateId: string; delayDays: number } }
  | { type: 'PROCESS_DAILY_MAIL' }
  | { type: 'READ_MAIL'; payload: string } 
  | { type: 'CLAIM_MAIL_REWARD'; payload: string }
  | { type: 'REDEEM_ITEM'; payload: { itemId: string; paymentAmount: number; name: string } }
  | { type: 'EXTEND_PAWN'; payload: { itemId: string; interestPaid: number; newDueDate: number; name: string } }
  | { type: 'EXPIRE_ITEMS'; payload: { expiredItemIds: string[]; logs: string[] } }
  | { type: 'DEFAULT_SELL_ITEM'; payload: { itemId: string; amount: number; name: string } }
  | { type: 'RESOLVE_BREACH'; payload: { penalty: number; name: string } }
  | { type: 'HOSTILE_TAKEOVER'; payload: { itemId: string; penalty: number; name: string } };

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return { ...initialState, phase: GamePhase.MORNING_BRIEF };
      
    case 'START_DAY':
      return { 
        ...state, 
        customersServedToday: 0,
        dayEvents: [],
        todayTransactions: [], 
        phase: GamePhase.TRADING,
        stats: {
            ...state.stats,
            actionPoints: state.stats.maxActionPoints 
        }
      };

    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CUSTOMER':
      const customerInit = { ...action.payload, mood: 'Neutral' as Mood };
      return {
        ...state,
        currentCustomer: customerInit,
        phase: GamePhase.NEGOTIATION
      };
      
    case 'UPDATE_CUSTOMER_STATUS':
      if (!state.currentCustomer) return state;
      return {
        ...state,
        currentCustomer: {
          ...state.currentCustomer,
          patience: action.payload.patience,
          mood: action.payload.mood,
          currentAskPrice: action.payload.currentAskPrice
        }
      };

    case 'UPDATE_ITEM_KNOWLEDGE':
      if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state;
      return {
          ...state,
          currentCustomer: {
              ...state.currentCustomer,
              item: {
                  ...state.currentCustomer.item,
                  currentRange: action.payload.newRange,
                  revealedTraits: action.payload.revealedTraits,
                  uncertainty: action.payload.newUncertainty,
                  perceivedValue: action.payload.newPerceived, 
                  appraised: true
              }
          }
      };

    case 'REALIZE_ITEM_TRUTH': {
        if (!state.currentCustomer || state.currentCustomer.item.id !== action.payload.itemId) return state;
        const item = state.currentCustomer.item;
        const newUncertainty = 0.1; 
        const trueRange = generateValuationRange(item.realValue, undefined, newUncertainty);
        const newInitialRange = generateValuationRange(item.realValue, undefined, 0.4);

        return {
            ...state,
            currentCustomer: {
                ...state.currentCustomer,
                item: {
                    ...item,
                    perceivedValue: undefined, 
                    uncertainty: newUncertainty,
                    currentRange: trueRange,
                    initialRange: newInitialRange, 
                    appraised: false 
                }
            }
        };
    }

    case 'CONSUME_AP':
      return {
          ...state,
          stats: {
              ...state.stats,
              actionPoints: Math.max(0, state.stats.actionPoints - action.payload)
          }
      };

    case 'APPRAISE_ITEM':
      if (!state.currentCustomer) return state;
      return {
        ...state,
        currentCustomer: {
          ...state.currentCustomer,
          item: { ...state.currentCustomer.item, appraised: true }
        }
      };

    case 'RESOLVE_TRANSACTION': {
      const { cashDelta, reputationDelta, item, log, customerName } = action.payload;
      
      const newRep = { ...state.reputation };
      if (reputationDelta[ReputationType.HUMANITY]) newRep[ReputationType.HUMANITY] += reputationDelta[ReputationType.HUMANITY]!;
      if (reputationDelta[ReputationType.CREDIBILITY]) newRep[ReputationType.CREDIBILITY] += reputationDelta[ReputationType.CREDIBILITY]!;
      if (reputationDelta[ReputationType.UNDERWORLD]) newRep[ReputationType.UNDERWORLD] += reputationDelta[ReputationType.UNDERWORLD]!;
      
      Object.keys(newRep).forEach(key => {
        newRep[key as ReputationType] = Math.max(0, Math.min(100, newRep[key as ReputationType]));
      });

      const newInventory = item ? [...state.inventory, item] : state.inventory;
      
      const newTransaction: TransactionRecord | null = item ? {
        id: crypto.randomUUID(),
        description: `收当: ${item.name}`,
        amount: cashDelta,
        type: 'PAWN'
      } : null;

      const updatedTransactions = newTransaction 
        ? [...state.todayTransactions, newTransaction] 
        : state.todayTransactions;

      const servedCount = state.customersServedToday + 1;
      const nextPhase = servedCount >= state.maxCustomersPerDay ? GamePhase.SHOP_CLOSED : GamePhase.TRADING;

      const completedId = state.currentCustomer?.id;
      const newCompletedIds = (completedId && !completedId.startsWith('proc-')) 
          ? [...state.completedScenarioIds, completedId] 
          : state.completedScenarioIds;

      return {
        ...state,
        stats: { ...state.stats, cash: state.stats.cash + cashDelta },
        reputation: newRep,
        inventory: newInventory,
        dayEvents: [...state.dayEvents, log],
        todayTransactions: updatedTransactions,
        currentCustomer: null,
        customersServedToday: servedCount,
        phase: nextPhase,
        completedScenarioIds: newCompletedIds
      };
    }

    case 'LIQUIDATE_ITEM': {
      const { itemId, amount, name } = action.payload;
      const soldInventory = state.inventory.map(item => 
        item.id === itemId ? { ...item, status: ItemStatus.SOLD } : item
      );

      const saleRecord: TransactionRecord = {
        id: crypto.randomUUID(),
        description: `绝当变现: ${name}`,
        amount: amount,
        type: 'SELL'
      };

      return {
        ...state,
        stats: { ...state.stats, cash: state.stats.cash + amount },
        inventory: soldInventory,
        todayTransactions: [...state.todayTransactions, saleRecord],
        dayEvents: [...state.dayEvents, `出售过期物品: ${name} (+$${amount})`]
      };
    }

    case 'REDEEM_ITEM': {
        const { itemId, paymentAmount, name } = action.payload;
        const updatedInventory = state.inventory.map(item => 
            item.id === itemId ? { ...item, status: ItemStatus.REDEEMED } : item
        );

        const record: TransactionRecord = {
            id: crypto.randomUUID(),
            description: `顾客赎回: ${name}`,
            amount: paymentAmount,
            type: 'REDEEM'
        };

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash + paymentAmount },
            inventory: updatedInventory,
            todayTransactions: [...state.todayTransactions, record],
            dayEvents: [...state.dayEvents, `${name} 已被赎回 (收回资金 $${paymentAmount})`]
        };
    }

    case 'EXTEND_PAWN': {
        const { itemId, interestPaid, newDueDate, name } = action.payload;
        
        const updatedInventory = state.inventory.map(item => {
            if (item.id === itemId && item.pawnInfo) {
                return {
                    ...item,
                    pawnInfo: {
                        ...item.pawnInfo,
                        dueDate: newDueDate
                    }
                };
            }
            return item;
        });

        const record: TransactionRecord = {
            id: crypto.randomUUID(),
            description: `续当利息: ${name}`,
            amount: interestPaid,
            type: 'EXTEND'
        };

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash + interestPaid },
            inventory: updatedInventory,
            todayTransactions: [...state.todayTransactions, record],
            dayEvents: [...state.dayEvents, `${name} 续当一周 (收取利息 $${interestPaid})`]
        };
    }

    case 'EXPIRE_ITEMS': {
        const { expiredItemIds, logs } = action.payload;
        if (expiredItemIds.length === 0) return state;

        const updatedInventory = state.inventory.map(item => 
            expiredItemIds.includes(item.id) ? { ...item, status: ItemStatus.FORFEIT } : item
        );

        return {
            ...state,
            inventory: updatedInventory,
            dayEvents: [...state.dayEvents, ...logs]
        };
    }

    case 'DEFAULT_SELL_ITEM': {
        const { itemId, amount, name } = action.payload;
        const soldInventory = state.inventory.map(item => 
            item.id === itemId ? { ...item, status: ItemStatus.SOLD } : item
        );

        const saleRecord: TransactionRecord = {
            id: crypto.randomUUID(),
            description: `违约出售: ${name}`,
            amount: amount,
            type: 'SELL'
        };

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash + amount },
            inventory: soldInventory,
            todayTransactions: [...state.todayTransactions, saleRecord],
            dayEvents: [...state.dayEvents, `违约出售活跃当品: ${name} (+$${amount})`]
        };
    }

    case 'RESOLVE_BREACH': {
        const { penalty, name } = action.payload;
        
        const newRep = { ...state.reputation };
        newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 50);

        const record: TransactionRecord = {
            id: crypto.randomUUID(),
            description: `违约赔偿: ${name}`,
            amount: -penalty,
            type: 'PENALTY'
        };

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash - penalty },
            reputation: newRep,
            todayTransactions: [...state.todayTransactions, record],
            dayEvents: [...state.dayEvents, `支付违约金: ${name} (-$${penalty})，信誉大幅下降。`]
        };
    }
    
    // NEW ACTION: HOSTILE TAKEOVER
    case 'HOSTILE_TAKEOVER': {
        const { itemId, penalty, name } = action.payload;
        
        // Force status to FORFEIT, player keeps the item but pays penalty
        const updatedInventory = state.inventory.map(item => 
            item.id === itemId ? { ...item, status: ItemStatus.FORFEIT } : item
        );

        const newRep = { ...state.reputation };
        // Massive reputation hits
        newRep[ReputationType.CREDIBILITY] = Math.max(0, newRep[ReputationType.CREDIBILITY] - 50);
        newRep[ReputationType.HUMANITY] = Math.max(0, newRep[ReputationType.HUMANITY] - 20);

        const record: TransactionRecord = {
            id: crypto.randomUUID(),
            description: `强制买断: ${name}`,
            amount: -penalty,
            type: 'PENALTY'
        };

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash - penalty },
            inventory: updatedInventory,
            reputation: newRep,
            todayTransactions: [...state.todayTransactions, record],
            dayEvents: [...state.dayEvents, `恶意违约/强制买断: ${name} (-$${penalty})。顾客极度愤怒。`]
        };
    }

    case 'REJECT_DEAL': {
      const servedCount = state.customersServedToday + 1;
      const nextPhase = servedCount >= state.maxCustomersPerDay ? GamePhase.SHOP_CLOSED : GamePhase.TRADING;
      
      const completedId = state.currentCustomer?.id;
      const newCompletedIds = (completedId && !completedId.startsWith('proc-')) 
          ? [...state.completedScenarioIds, completedId] 
          : state.completedScenarioIds;

      return {
        ...state,
        currentCustomer: null,
        dayEvents: [...state.dayEvents, `Turned away ${state.currentCustomer?.name}`],
        customersServedToday: servedCount,
        phase: nextPhase,
        completedScenarioIds: newCompletedIds
      };
    }

    case 'MANUAL_CLOSE_SHOP':
      return { ...state, phase: GamePhase.END_OF_DAY };

    case 'PAY_RENT':
      const rentRecord: TransactionRecord = {
        id: crypto.randomUUID(),
        description: "缴纳房租",
        amount: -state.stats.rentDue,
        type: 'RENT'
      };

      return {
        ...state,
        stats: {
          ...state.stats,
          cash: state.stats.cash - state.stats.rentDue,
          rentDueDate: state.stats.rentDueDate + 5
        },
        dayEvents: [...state.dayEvents, `Paid Rent: $${state.stats.rentDue}`]
      };

    case 'END_DAY':
      const nextDay = state.stats.day + 1;
      const expense = state.stats.dailyExpenses;
      const newCash = state.stats.cash - expense;

      if (newCash < 0) {
        return { ...state, phase: GamePhase.GAME_OVER, dayEvents: [...state.dayEvents, "Bankrupt: Daily expenses exceeded cash."] };
      }

      return {
        ...state,
        stats: {
          ...state.stats,
          day: nextDay,
          cash: newCash,
          actionPoints: state.stats.maxActionPoints, 
        },
        phase: GamePhase.MORNING_BRIEF
      };
      
    case 'GAME_OVER':
      return {
          ...state,
          phase: GamePhase.GAME_OVER,
          dayEvents: [...state.dayEvents, action.payload]
      };
      
    case 'TOGGLE_INVENTORY':
      return { ...state, showInventory: !state.showInventory };

    case 'TOGGLE_MAIL':
      return { ...state, showMail: !state.showMail };

    case 'TOGGLE_DEBUG':
      return { ...state, showDebug: !state.showDebug };

    case 'UPDATE_CHAINS':
      return { ...state, activeChains: action.payload };

    case 'SCHEDULE_MAIL': {
        const { templateId, delayDays } = action.payload;
        const newMail: MailInstance = {
            uniqueId: crypto.randomUUID(),
            templateId,
            arrivalDay: state.stats.day + delayDays,
            isRead: false,
            isClaimed: false
        };
        return { ...state, pendingMails: [...state.pendingMails, newMail] };
    }

    case 'PROCESS_DAILY_MAIL': {
        const today = state.stats.day;
        const arrivingMails = state.pendingMails.filter(m => m.arrivalDay <= today);
        const remainingPending = state.pendingMails.filter(m => m.arrivalDay > today);
        
        if (arrivingMails.length === 0) return state;

        return {
            ...state,
            inbox: [...arrivingMails, ...state.inbox], 
            pendingMails: remainingPending
        };
    }

    case 'READ_MAIL':
        return {
            ...state,
            inbox: state.inbox.map(m => m.uniqueId === action.payload ? { ...m, isRead: true } : m)
        };

    case 'CLAIM_MAIL_REWARD': {
        const mail = state.inbox.find(m => m.uniqueId === action.payload);
        if (!mail || mail.isClaimed) return state;

        const template = getMailTemplate(mail.templateId);
        if (!template || !template.attachments) return state;

        let cashDelta = 0;
        let newInventory = [...state.inventory];
        let transaction: TransactionRecord | null = null;

        if (template.attachments.cash) {
            cashDelta = template.attachments.cash;
            transaction = {
                id: crypto.randomUUID(),
                description: `邮件奖励: ${template.sender}`,
                amount: cashDelta,
                type: 'REWARD'
            };
        }

        if (template.attachments.item) {
             newInventory.push(template.attachments.item);
        }

        const updatedInbox = state.inbox.map(m => 
            m.uniqueId === action.payload ? { ...m, isClaimed: true } : m
        );
        
        const updatedTransactions = transaction 
            ? [...state.todayTransactions, transaction]
            : state.todayTransactions;

        return {
            ...state,
            stats: { ...state.stats, cash: state.stats.cash + cashDelta },
            inventory: newInventory,
            inbox: updatedInbox,
            todayTransactions: updatedTransactions
        };
    }

    default:
      return state;
  }
};

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const GameProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
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
