/**
 * Reputation Visibility - Moral Quake Detection
 *
 * Implements the "分层可见性模型" from the reputation system design doc v2.5.
 * Tracks first-time rate tier crossings for HIGH (15%) and SHARK (20%) thresholds.
 *
 * "道德地震" occurs when a player's transaction rate crosses these thresholds
 * for the first time in a save file, triggering special narrative events.
 *
 * Design doc: Designer/叙事设计/声誉系统.md, section "分层可见性模型"
 */

export interface MoralQuakeState {
  HIGH: boolean;
  SHARK: boolean;
}

export interface MoralQuakeEvent {
  /** Which tier threshold was crossed */
  tier: 'HIGH' | 'SHARK';
  /** Whether this is the first time crossing this threshold */
  isFirstTime: boolean;
  /** Text key for narrative content (loaded from CSV) */
  textKey: string;
}

/**
 * Check if a moral quake should trigger based on the current transaction rate.
 *
 * @param ratePercent The transaction interest rate in percentage form (e.g., 15 = 15%)
 * @param moralQuakeState Current moral quake tracking state
 * @returns MoralQuakeEvent if a first-time threshold crossing occurred, null otherwise
 */
export function checkMoralQuake(
  ratePercent: number,
  moralQuakeState: MoralQuakeState
): MoralQuakeEvent | null {
  // Check SHARK threshold first (more severe takes priority)
  if (ratePercent >= 20 && !moralQuakeState.SHARK) {
    return {
      tier: 'SHARK',
      isFirstTime: true,
      textKey: 'MORAL_QUAKE_SHARK',
    };
  }

  // Check HIGH threshold
  if (ratePercent >= 15 && !moralQuakeState.HIGH) {
    return {
      tier: 'HIGH',
      isFirstTime: true,
      textKey: 'MORAL_QUAKE_HIGH',
    };
  }

  return null;
}

/**
 * Update the moral quake state after a quake event.
 */
export function applyMoralQuake(
  state: MoralQuakeState,
  event: MoralQuakeEvent
): MoralQuakeState {
  return {
    ...state,
    [event.tier]: true,
  };
}
