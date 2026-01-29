
import { GameState } from '../game/types';
import { GamePhase } from './types';

const SAVE_KEY = 'pawns_dilemma_save_v1';

// Debounce timeout for save operations
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

// Environment check for logging
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export const saveGame = (state: GameState) => {
    // Debounce to prevent rapid successive saves
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        try {
            // Don't save if on start screen or game over to prevent loop
            if (state.phase === GamePhase.START_SCREEN || state.phase === GamePhase.GAME_OVER) return;

            const serialized = JSON.stringify(state);
            localStorage.setItem(SAVE_KEY, serialized);
            if (isDev) {
                console.log(`[System] Game Saved. Size: ${(serialized.length / 1024).toFixed(2)} KB`);
            }
        } catch (e) {
            console.error("[System] Save failed:", e);
        }
    }, SAVE_DEBOUNCE_MS);
};

/**
 * Validates the basic structure of a loaded game state
 */
function validateGameState(state: unknown): state is GameState {
    if (!state || typeof state !== 'object') return false;

    const s = state as Record<string, unknown>;

    // Required top-level properties
    if (!s.stats || typeof s.stats !== 'object') return false;
    if (!Array.isArray(s.inventory)) return false;
    if (typeof s.phase !== 'string') return false;
    if (!s.reputation || typeof s.reputation !== 'object') return false;

    // Validate stats structure
    const stats = s.stats as Record<string, unknown>;
    if (typeof stats.day !== 'number') return false;
    if (typeof stats.cash !== 'number') return false;

    return true;
}

export const loadGame = (): GameState | null => {
    try {
        const serialized = localStorage.getItem(SAVE_KEY);
        if (!serialized) return null;

        const state = JSON.parse(serialized);

        // Validate state structure before returning
        if (!validateGameState(state)) {
            console.error("[System] Load failed: Invalid save state structure");
            return null;
        }

        return state;
    } catch (e) {
        console.error("[System] Load failed:", e);
        return null;
    }
};

export const hasSaveGame = (): boolean => {
    return !!localStorage.getItem(SAVE_KEY);
};

export const clearSave = () => {
    localStorage.removeItem(SAVE_KEY);
};
