/**
 * Reducer Index
 * Combines all domain reducers into a single game reducer
 */

import { GameState } from '../../types';
import { Action } from '../actions/types';

import { coreReducer } from './coreReducer';
import { customerReducer } from './customerReducer';
import { inventoryReducer } from './inventoryReducer';
import { financialReducer } from './financialReducer';
import { narrativeReducer } from './narrativeReducer';
import { expiryReducer } from './expiryReducer';
import { nightReducer } from './nightReducer';
import { upgradeReducer } from './upgradeReducer';
import { appointmentReducer } from './appointmentReducer';
import { uiReducer } from './uiReducer';
import { nodeReducer } from './nodeReducer';

/**
 * List of domain reducers in priority order
 * Each reducer handles a specific domain of the game state
 * Returns the state unchanged if action is not handled
 */
const domainReducers = [
    coreReducer,
    customerReducer,
    nodeReducer,
    inventoryReducer,
    financialReducer,
    narrativeReducer,
    expiryReducer,
    nightReducer,
    upgradeReducer,
    appointmentReducer,
    uiReducer
];

/**
 * Combined game reducer
 * Passes action through each domain reducer in order
 * First reducer that handles the action wins (returns modified state)
 */
export function gameReducer(state: GameState, action: Action): GameState {
    let currentState = state;

    for (const reducer of domainReducers) {
        const newState = reducer(currentState, action);
        // If state changed, return early (action was handled)
        if (newState !== currentState) {
            return newState;
        }
    }

    // No reducer handled the action - return unchanged state
    return currentState;
}

// Re-export individual reducers for testing
export { coreReducer } from './coreReducer';
export { customerReducer } from './customerReducer';
export { nodeReducer } from './nodeReducer';
export { inventoryReducer } from './inventoryReducer';
export { financialReducer } from './financialReducer';
export { narrativeReducer } from './narrativeReducer';
export { expiryReducer } from './expiryReducer';
export { nightReducer } from './nightReducer';
export { upgradeReducer } from './upgradeReducer';
export { appointmentReducer } from './appointmentReducer';
export { uiReducer } from './uiReducer';

// Re-export action types
export type { Action } from '../actions/types';
