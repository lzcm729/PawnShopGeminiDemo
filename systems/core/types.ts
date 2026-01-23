
export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  MORNING_BRIEF = 'MORNING_BRIEF',
  TRADING = 'TRADING',
  NEGOTIATION = 'NEGOTIATION',
  SHOP_CLOSED = 'SHOP_CLOSED', 
  END_OF_DAY = 'END_OF_DAY',
  GAME_OVER = 'GAME_OVER'
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

export interface DailyStats {
  day: number;
  cash: number;
  rentDue: number;
  rentDueDate: number;
  dailyExpenses: number; 
  actionPoints: number; // Resource for appraisal
  maxActionPoints: number; // Daily cap
}

export type Mood = 'Happy' | 'Neutral' | 'Annoyed' | 'Angry';
