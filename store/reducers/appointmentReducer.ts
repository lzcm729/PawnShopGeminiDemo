/**
 * Appointment Reducer
 * Handles appointment board customer selection system
 */

import { GameState } from '../../types';
import { Action } from '../actions/types';
import { playSfx } from '../../systems/game/audio';
import { AppointmentCandidate } from '../../systems/appointment';

export function appointmentReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'SET_APPOINTMENT_CANDIDATES':
            return {
                ...state,
                appointmentBoard: {
                    ...state.appointmentBoard,
                    candidates: action.payload,
                    selectedIds: [] // Clear selections when new candidates are set
                }
            };

        case 'SELECT_APPOINTMENT_CANDIDATE': {
            const { candidateId } = action.payload;
            if (state.appointmentBoard.selectedIds.includes(candidateId)) {
                return state; // Already selected
            }
            playSfx('CLICK');
            return {
                ...state,
                appointmentBoard: {
                    ...state.appointmentBoard,
                    selectedIds: [...state.appointmentBoard.selectedIds, candidateId]
                }
            };
        }

        case 'DESELECT_APPOINTMENT_CANDIDATE': {
            const { candidateId } = action.payload;
            playSfx('CLICK');
            return {
                ...state,
                appointmentBoard: {
                    ...state.appointmentBoard,
                    selectedIds: state.appointmentBoard.selectedIds.filter(id => id !== candidateId)
                }
            };
        }

        case 'SET_APPOINTMENT_PREFERENCE':
            playSfx('CLICK');
            return {
                ...state,
                appointmentBoard: {
                    ...state.appointmentBoard,
                    preference: action.payload
                }
            };

        case 'CLEAR_APPOINTMENT_SELECTIONS':
            return {
                ...state,
                appointmentBoard: {
                    ...state.appointmentBoard,
                    selectedIds: []
                }
            };

        case 'PREPARE_DAILY_APPOINTMENTS': {
            // Copy selected candidates to pending queue and clear selections
            const selectedCandidates = state.appointmentBoard.selectedIds
                .map(id => state.appointmentBoard.candidates.find(c => c.id === id))
                .filter((c): c is AppointmentCandidate => c !== undefined);
            return {
                ...state,
                pendingAppointedCandidates: selectedCandidates,
                appointmentBoard: {
                    ...state.appointmentBoard,
                    candidates: [],  // Clear old candidates
                    selectedIds: []  // Clear selections
                }
            };
        }

        case 'POP_APPOINTED_CANDIDATE':
            // Remove first candidate from pending queue
            if (state.pendingAppointedCandidates.length === 0) return state;
            return {
                ...state,
                pendingAppointedCandidates: state.pendingAppointedCandidates.slice(1)
            };

        default:
            return state;
    }
}
