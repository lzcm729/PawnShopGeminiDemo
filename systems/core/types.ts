
export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  MORNING_BRIEF = 'MORNING_BRIEF', // Morning News/Weather/Prep
  BUSINESS = 'BUSINESS',           // Shop is open, waiting for customer
  NEGOTIATION = 'NEGOTIATION',     // Active dealing with customer
  DEPARTURE = 'DEPARTURE',         // Post-deal summary, "Send Guest"
  NIGHT = 'NIGHT',                 // Admin phase: Mail, Ledger, Sleep
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

export interface MotherCondition {
  health: number; // 0-100
  status: 'Stable' | 'Critical' | 'Improving' | 'Worsening';
  risk: number; // 0-100% chance of complication
  careLevel: 'None' | 'Basic' | 'Premium';
}

export interface DailyStats {
  day: number;
  cash: number;
  
  // New Core Loop Fields
  targetSavings: number;
  motherStatus: MotherCondition; // Updated from string
  medicalBill: MedicalBill;
  
  visitedToday: boolean; // Tracks if player visited hospital tonight

  dailyExpenses: number; 
  actionPoints: number; // Resource for appraisal
  maxActionPoints: number; // Daily cap

  // Rent
  rentDue: number;
  rentDueDate: number;
}

export type Mood = 'Happy' | 'Neutral' | 'Annoyed' | 'Angry';
