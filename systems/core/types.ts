/**
 * @deprecated Use GamePhase from systems/core/phases instead.
 * This enum is kept temporarily for backward compatibility during migration.
 * It will be removed in a future version.
 */
export enum LegacyGamePhase {
  START_SCREEN = 'START_SCREEN',
  MORNING_BRIEF = 'MORNING_BRIEF',
  BUSINESS = 'BUSINESS',
  NEGOTIATION = 'NEGOTIATION',
  DEPARTURE = 'DEPARTURE',
  NIGHT = 'NIGHT',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

// Re-export new GamePhase type for easier migration
export type { GamePhase } from './phases';

export enum ReputationType {
  HUMANITY = 'Humanity', // Heart - Empathy
  CREDIBILITY = 'Credibility', // Business - Professionalism
  INNOCENCE = 'Innocence' // Law - Legal cleanliness (replaces Underworld)
}

export interface ReputationProfile {
  [ReputationType.HUMANITY]: number;
  [ReputationType.CREDIBILITY]: number;
  [ReputationType.INNOCENCE]: number;
}

export interface MedicalBill {
  amount: number;
  dueDate: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface MotherCondition {
  health: number; // 0-100
  status: 'Stable' | 'Declining' | 'Critical';
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
