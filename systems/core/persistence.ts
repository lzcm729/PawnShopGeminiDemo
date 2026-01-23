
import { GameState } from '../game/types';
import { GamePhase } from './types';

const SAVE_KEY = 'pawns_dilemma_save_v1';

export const saveGame = (state: GameState) => {
    try {
        // Don't save if on start screen or game over to prevent loop
        if (state.phase === GamePhase.START_SCREEN || state.phase === GamePhase.GAME_OVER) return;
        
        const serialized = JSON.stringify(state);
        localStorage.setItem(SAVE_KEY, serialized);
        console.log(`[System] Game Saved. Size: ${(serialized.length / 1024).toFixed(2)} KB`);
    } catch (e) {
        console.error("Save failed:", e);
    }
};

export const loadGame = (): GameState | null => {
    try {
        const serialized = localStorage.getItem(SAVE_KEY);
        if (!serialized) return null;
        
        const state = JSON.parse(serialized) as GameState;
        
        // Sanity checks to ensure valid state structure
        if (!state.stats || !state.inventory) return null;
        
        return state;
    } catch (e) {
        console.error("Load failed:", e);
        return null;
    }
};

export const hasSaveGame = (): boolean => {
    return !!localStorage.getItem(SAVE_KEY);
};

export const clearSave = () => {
    localStorage.removeItem(SAVE_KEY);
};
