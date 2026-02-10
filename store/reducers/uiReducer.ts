/**
 * UI Reducer
 * Handles UI state toggles (modals, panels)
 */

import { GameState } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';

type UIState = Pick<GameState,
    | 'showInventory'
    | 'showMail'
    | 'showDebug'
    | 'showFinancials'
    | 'showMedical'
    | 'showVisit'
    | 'showUpgradeShop'
    | 'showFacilityControl'
    | 'showAppointmentBoard'
    | 'showWorkshop'
    | 'showInsight'
    | 'pendingSelectedItemId'
    | 'unseenForfeitItemIds'
>;

export function uiReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'TOGGLE_INVENTORY':
            playSfx('HOVER');
            return {
                ...state,
                showInventory: !state.showInventory,
                // Clear forfeit notifications when opening inventory
                ...(!state.showInventory ? { unseenForfeitItemIds: [] } : {})
            };

        case 'TOGGLE_MAIL':
            playSfx('HOVER');
            return { ...state, showMail: !state.showMail };

        case 'TOGGLE_DEBUG':
            return { ...state, showDebug: !state.showDebug };

        case 'TOGGLE_FINANCIALS':
            playSfx('HOVER');
            return { ...state, showFinancials: !state.showFinancials };

        case 'TOGGLE_MEDICAL':
            playSfx('HOVER');
            return { ...state, showMedical: !state.showMedical };

        case 'TOGGLE_VISIT':
            playSfx('HOVER');
            return { ...state, showVisit: !state.showVisit };

        case 'TOGGLE_UPGRADE_SHOP':
            playSfx('HOVER');
            return { ...state, showUpgradeShop: !state.showUpgradeShop };

        case 'TOGGLE_FACILITY_CONTROL':
            playSfx('HOVER');
            return { ...state, showFacilityControl: !state.showFacilityControl };

        case 'TOGGLE_APPOINTMENT_BOARD':
            playSfx('HOVER');
            return { ...state, showAppointmentBoard: !state.showAppointmentBoard };

        case 'TOGGLE_WORKSHOP':
            playSfx('HOVER');
            // Clear pending selection when closing the panel
            return {
                ...state,
                showWorkshop: !state.showWorkshop,
                pendingSelectedItemId: !state.showWorkshop ? state.pendingSelectedItemId : null
            };

        case 'TOGGLE_INSIGHT':
            playSfx('HOVER');
            // Clear pending selection when closing the panel
            return {
                ...state,
                showInsight: !state.showInsight,
                pendingSelectedItemId: !state.showInsight ? state.pendingSelectedItemId : null
            };

        case 'SET_PENDING_SELECTED_ITEM':
            return { ...state, pendingSelectedItemId: action.payload };

        case 'DEBUG_TOGGLE_FLOOR':
            return { ...state, debugRevealFloor: !state.debugRevealFloor };

        default:
            return state;
    }
}
