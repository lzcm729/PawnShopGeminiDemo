
import { GamePhase, ReputationType } from '../../types';

export interface CommandResult {
  success: boolean;
  message: string;
}

export interface ParsedCommand {
  command: string;
  args: string[];
}

// Panel names that can be opened via 'open' command
export type OpenablePanel = 'upgrade' | 'mail' | 'calendar' | 'inventory' | 'medical' | 'visit' | 'debug' | 'appointment';

// Valid phase names for 'set phase' command
const PHASE_MAP: Record<string, GamePhase> = {
  'morning': GamePhase.MORNING_BRIEF,
  'morning_brief': GamePhase.MORNING_BRIEF,
  'business': GamePhase.BUSINESS,
  'night': GamePhase.NIGHT,
  'negotiation': GamePhase.NEGOTIATION,
  'departure': GamePhase.DEPARTURE,
  'start': GamePhase.START_SCREEN,
  'gameover': GamePhase.GAME_OVER,
  'victory': GamePhase.VICTORY
};

// Valid reputation types for 'set reputation' command
const REPUTATION_MAP: Record<string, ReputationType> = {
  'humanity': ReputationType.HUMANITY,
  'credibility': ReputationType.CREDIBILITY,
  'underworld': ReputationType.UNDERWORLD
};

// Panel toggle action map
const PANEL_MAP: Record<OpenablePanel, string> = {
  'upgrade': 'TOGGLE_UPGRADE_SHOP',
  'mail': 'TOGGLE_MAIL',
  'calendar': 'TOGGLE_FINANCIALS',
  'inventory': 'TOGGLE_INVENTORY',
  'medical': 'TOGGLE_MEDICAL',
  'visit': 'TOGGLE_VISIT',
  'debug': 'TOGGLE_DEBUG',
  'appointment': 'TOGGLE_APPOINTMENT_BOARD'
};

/**
 * Parse a single command string into command name and arguments
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const command = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);
  return { command, args };
}

/**
 * Parse multiple commands separated by &&
 */
export function parseMultipleCommands(input: string): ParsedCommand[] {
  return input
    .split('&&')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0)
    .map(parseCommand);
}

/**
 * Execute a parsed command and return the result
 * Dispatch is passed from the component that uses this
 */
export function executeCommand(
  parsed: ParsedCommand,
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  const { command, args } = parsed;

  switch (command) {
    case 'help':
      return {
        success: true,
        message: `Available commands:
  set phase <phase>     - Set game phase (morning|business|night|negotiation|departure|start|gameover|victory)
  set day <n>           - Set current day
  set cash <n>          - Set cash amount
  set reputation <type> <n> - Set reputation (humanity|credibility|underworld)
  set ap <n>            - Set action points
  set energy <n>        - Set night energy
  open <panel>          - Open panel (upgrade|mail|calendar|inventory|medical|visit|debug|appointment)
  close <panel>         - Close panel
  add cash <n>          - Add cash (can be negative)
  add essence <n>       - Add essence to all types
  spawn customer        - Force spawn a customer (business phase only)
  clear                 - Clear console history
  help                  - Show this help`
      };

    case 'clear':
      return { success: true, message: '__CLEAR__' };

    case 'set':
      return handleSetCommand(args, dispatch, getState);

    case 'open':
      return handleOpenCommand(args, dispatch, getState, true);

    case 'close':
      return handleOpenCommand(args, dispatch, getState, false);

    case 'add':
      return handleAddCommand(args, dispatch);

    case 'spawn':
      if (args[0]?.toLowerCase() === 'customer') {
        const state = getState();
        if (state.phase !== GamePhase.BUSINESS) {
          return { success: false, message: 'Error: Can only spawn customers in BUSINESS phase' };
        }
        // Trigger loading state - the game engine will pick up and generate customer
        dispatch({ type: 'SET_LOADING', payload: true });
        return { success: true, message: 'Triggering customer spawn...' };
      }
      return { success: false, message: `Unknown spawn target: ${args[0]}` };

    default:
      if (command === '') {
        return { success: true, message: '' };
      }
      return { success: false, message: `Unknown command: ${command}. Type 'help' for available commands.` };
  }
}

function handleSetCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  if (args.length < 2) {
    return { success: false, message: 'Usage: set <property> <value>' };
  }

  const property = args[0].toLowerCase();
  const value = args.slice(1).join(' ');

  switch (property) {
    case 'phase': {
      const phaseName = value.toLowerCase();
      const phase = PHASE_MAP[phaseName];
      if (!phase) {
        return {
          success: false,
          message: `Invalid phase: ${value}. Valid phases: ${Object.keys(PHASE_MAP).join(', ')}`
        };
      }
      dispatch({ type: 'SET_PHASE', payload: phase });
      return { success: true, message: `Phase set to ${phase}` };
    }

    case 'day': {
      const day = parseInt(value, 10);
      if (isNaN(day) || day < 1) {
        return { success: false, message: 'Day must be a positive number' };
      }
      // We need to update the stats.day directly - use a workaround through LOAD_GAME
      const state = getState();
      const newState = {
        ...state,
        stats: { ...state.stats, day }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `Day set to ${day}` };
    }

    case 'cash': {
      const cash = parseInt(value, 10);
      if (isNaN(cash)) {
        return { success: false, message: 'Cash must be a number' };
      }
      const state = getState();
      const newState = {
        ...state,
        stats: { ...state.stats, cash }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `Cash set to $${cash}` };
    }

    case 'reputation':
    case 'rep': {
      // Format: set reputation humanity 50
      const parts = value.split(/\s+/);
      if (parts.length < 2) {
        return { success: false, message: 'Usage: set reputation <type> <value>' };
      }
      const repType = REPUTATION_MAP[parts[0].toLowerCase()];
      if (!repType) {
        return {
          success: false,
          message: `Invalid reputation type: ${parts[0]}. Valid types: ${Object.keys(REPUTATION_MAP).join(', ')}`
        };
      }
      const repValue = parseInt(parts[1], 10);
      if (isNaN(repValue) || repValue < 0 || repValue > 100) {
        return { success: false, message: 'Reputation value must be between 0 and 100' };
      }
      const state = getState();
      const newState = {
        ...state,
        reputation: { ...state.reputation, [repType]: repValue }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `${repType} set to ${repValue}` };
    }

    case 'ap': {
      const ap = parseInt(value, 10);
      if (isNaN(ap) || ap < 0) {
        return { success: false, message: 'AP must be a non-negative number' };
      }
      const state = getState();
      const newState = {
        ...state,
        stats: { ...state.stats, actionPoints: ap }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `Action Points set to ${ap}` };
    }

    case 'energy': {
      const energy = parseInt(value, 10);
      if (isNaN(energy) || energy < 0) {
        return { success: false, message: 'Energy must be a non-negative number' };
      }
      const state = getState();
      const newState = {
        ...state,
        nightState: { ...state.nightState, energy }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `Night energy set to ${energy}` };
    }

    default:
      return { success: false, message: `Unknown property: ${property}` };
  }
}

function handleOpenCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any,
  shouldOpen: boolean
): CommandResult {
  if (args.length < 1) {
    return { success: false, message: `Usage: ${shouldOpen ? 'open' : 'close'} <panel>` };
  }

  const panelName = args[0].toLowerCase() as OpenablePanel;
  const actionType = PANEL_MAP[panelName];

  if (!actionType) {
    return {
      success: false,
      message: `Unknown panel: ${panelName}. Valid panels: ${Object.keys(PANEL_MAP).join(', ')}`
    };
  }

  // Check current state to determine if we need to toggle
  const state = getState();
  const stateKeyMap: Record<OpenablePanel, keyof typeof state> = {
    'upgrade': 'showUpgradeShop',
    'mail': 'showMail',
    'calendar': 'showFinancials',
    'inventory': 'showInventory',
    'medical': 'showMedical',
    'visit': 'showVisit',
    'debug': 'showDebug',
    'appointment': 'showAppointmentBoard'
  };

  const stateKey = stateKeyMap[panelName];
  const currentState = state[stateKey];

  // Only toggle if needed
  if ((shouldOpen && !currentState) || (!shouldOpen && currentState)) {
    dispatch({ type: actionType });
  }

  return {
    success: true,
    message: `${panelName} panel ${shouldOpen ? 'opened' : 'closed'}`
  };
}

function handleAddCommand(
  args: string[],
  dispatch: (action: any) => void
): CommandResult {
  if (args.length < 2) {
    return { success: false, message: 'Usage: add <type> <amount>' };
  }

  const type = args[0].toLowerCase();
  const amount = parseInt(args[1], 10);

  if (isNaN(amount)) {
    return { success: false, message: 'Amount must be a number' };
  }

  switch (type) {
    case 'cash':
      dispatch({ type: 'DEBUG_ADD_CASH', payload: amount });
      return { success: true, message: `Added $${amount} to cash` };

    case 'essence':
      dispatch({ type: 'ADD_ESSENCE_BATCH', payload: { craft: amount, time: amount, vibe: amount } });
      return { success: true, message: `Added ${amount} to all essence types` };

    default:
      return { success: false, message: `Unknown type: ${type}. Valid types: cash, essence` };
  }
}

/**
 * Interface for window.__console__ exposed to QA tester
 */
export interface DevConsoleAPI {
  execute: (command: string) => CommandResult[];
  getState: () => any;
}
