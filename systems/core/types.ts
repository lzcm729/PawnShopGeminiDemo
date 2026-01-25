
export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  MORNING_BRIEF = 'MORNING_BRIEF',
  TRADING = 'TRADING',
  NEGOTIATION = 'NEGOTIATION',
  SHOP_CLOSED = 'SHOP_CLOSED', 
  END_OF_DAY = 'END_OF_DAY',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ReputationType {
  HUMANITY = 'Humanity', // Heart - Empathy
  CREDIBILITY = 'Credibility', // Business - Professionalism
  UNDERWORLD = 'Underworld' // Shadow - Illicit
}

export interface ReputationProfile {
  [ReputationType.HUMANITY]: number;
  [ReputationType.CREDIBILITY]: number;
  [ReputationType.UNDERWORLD]: number;
}

export interface MedicalBill {
  amount: number;
  dueDate: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface DailyStats {
  day: number;
  cash: number;
  
  // New Core Loop Fields
  targetSavings: number;
  motherStatus: string;
  medicalBill: MedicalBill;

  dailyExpenses: number; 
  actionPoints: number; // Resource for appraisal
  maxActionPoints: number; // Daily cap
}

export type Mood = 'Happy' | 'Neutral' | 'Annoyed' | 'Angry';
