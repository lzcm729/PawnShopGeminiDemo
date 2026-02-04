
// Shop Upgrade System Types
// Defines the structure for pawn shop facility upgrades

/**
 * Upgrade location determines maintenance cost and toggle behavior
 * - COUNTER: Has daily maintenance cost, can be toggled on/off each night
 * - BACKROOM: No maintenance cost, permanently active once purchased
 */
export type UpgradeLocation = 'COUNTER' | 'BACKROOM';

/**
 * Upgrade effect types for different facilities
 */
export type UpgradeEffectType =
  | 'INVENTORY_CAPACITY'    // Storage expansion: +inventory slots
  | 'NIGHT_ENERGY'          // Precision bench: +night energy
  | 'PATIENCE_BONUS'        // Tea set: +customer patience
  | 'ANOMALY_DETECTION'     // Spectrometer: detect fakes/treasures
  | 'APPOINTMENT_BOARD'     // Appointment board: preview/invite customers
  | 'BLACK_MARKET_CONTACT'; // Black market contact: unlock black market access

/**
 * Appointment board level configuration
 */
export interface AppointmentBoardLevelConfig {
  level: number;
  candidateCount: number;      // Number of candidates shown
  maxInvites: number;          // How many can be invited
  showEmotion: boolean;        // Lv2+: Show emotional state
  showBackground: boolean;     // Lv3+: Show background hints
  showNewsLink: boolean;       // Lv3+: Show news correlation
  hasPreference: boolean;      // Lv5: Can set preference filter
}

/**
 * Appointment candidate preference filter (Lv5 feature)
 */
export type AppointmentPreference = 'balanced' | 'needy' | 'casual';

/**
 * Candidate customer preview for appointment board
 */
export interface AppointmentCandidate {
  id: string;
  // Basic info (Lv1)
  appearanceDesc: string;      // "Middle-aged man with briefcase"
  itemSizeHint: string;        // "Small object" / "Large box"
  // Lv2+ info
  emotionDesc?: string;        // "Looking anxious"
  // Lv3+ info
  backgroundHint?: string;     // "Bank employee appearance"
  newsLink?: string;           // "Related to recent bank layoffs..."
  // Internal data for generation
  urgency: 'high' | 'medium' | 'low';  // Used for preference filtering
  templateSeed: string;        // Seed for generating full customer later
}

/**
 * Configuration for a single upgrade level
 */
export interface UpgradeLevelConfig {
  level: number;
  cost: number;
  effectValue: number;        // The numeric effect (e.g., +2 capacity, +1 energy)
  description: string;        // Description for this level
  maintenanceCost?: number;   // Daily cost if COUNTER type (only for enabled upgrades)
}

/**
 * Configuration for an upgrade facility
 */
export interface UpgradeConfig {
  id: string;
  name: string;
  nameCn: string;             // Chinese name
  description: string;
  location: UpgradeLocation;
  effectType: UpgradeEffectType;
  maxLevel: number;
  levels: UpgradeLevelConfig[];
  icon?: string;              // Icon identifier for UI
}

/**
 * State of a single upgrade owned by the player
 */
export interface OwnedUpgrade {
  upgradeId: string;
  currentLevel: number;
  enabled: boolean;           // For COUNTER upgrades, can be toggled
}

/**
 * Complete upgrade state in GameState
 */
export interface ShopUpgradeState {
  upgrades: OwnedUpgrade[];
}

/**
 * Appointment board state (separate from upgrade state)
 */
export interface AppointmentBoardState {
  candidates: AppointmentCandidate[];  // Tonight's candidate pool
  selectedIds: string[];               // IDs of selected candidates to invite
  preference: AppointmentPreference;   // Lv5 filter preference
}

/**
 * Computed effects from all active upgrades
 */
export interface UpgradeEffects {
  inventoryCapacityBonus: number;
  nightEnergyBonus: number;
  patienceBonus: number;
  anomalyDetectionLevel: number;
  appointmentSlots: number;
  totalMaintenanceCost: number;
}
