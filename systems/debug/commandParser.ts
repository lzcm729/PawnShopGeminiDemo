
import { ReputationType, ItemStatus } from '../../types';
import { GamePhase, PhaseIs, PhaseMatch } from '../core/phases';
import { testAllFullStoryFiles, testFullStoryByName, formatFullTestResults } from '../narrative/dsl/__tests__/fullFileTest';
import type { Item, PawnInfo, WorkState } from '../items/types';
import type { ItemTag } from '../items/tags';
import { STATE_TAGS, ATTRIBUTE_TAGS, ESSENCE_TAGS } from '../items/tags';
import { createItemFromTemplate, getAllItemTemplates } from '../items/csvLoader';

export interface CommandResult {
  success: boolean;
  message: string;
}

export interface ParsedCommand {
  command: string;
  args: string[];
}

// Panel names that can be opened via 'open' command
export type OpenablePanel = 'upgrade' | 'mail' | 'calendar' | 'inventory' | 'medical' | 'visit' | 'debug' | 'appointment' | 'blackmarket';

// Valid phase names for 'set phase' command - returns discriminated union objects
const PHASE_MAP: Record<string, GamePhase> = {
  'morning': { type: 'MORNING_BRIEF' },
  'morning_brief': { type: 'MORNING_BRIEF' },
  'business': { type: 'BUSINESS', subphase: 'IDLE' },
  'night': { type: 'NIGHT', subphase: 'ACTIVE' },
  'negotiation': { type: 'NEGOTIATION', mode: 'PAWN' },
  'departure': { type: 'DEPARTURE' },
  'start': { type: 'START_SCREEN' },
  'gameover': { type: 'GAME_OVER', reason: 'Debug' },
  'victory': { type: 'VICTORY' }
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
  'appointment': 'TOGGLE_APPOINTMENT_BOARD',
  'blackmarket': 'TOGGLE_BLACKMARKET'
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
  set heat <n>          - Set blackmarket heat (0-10)
  set chain <id> <var> <val> - Set chain variable (e.g., set chain chain_emma funds 400)
  open <panel>          - Open panel (upgrade|mail|calendar|inventory|medical|visit|debug|appointment|blackmarket)
  close <panel>         - Close panel
  close shop            - Close shop and enter night phase (business phase only)
  skip day              - Skip to next day's morning brief
  add cash <n>          - Add cash (can be negative)
  add essence <n>       - Add essence to all types
  add item <name> --dueDate <day> [--chainId <id>] [--tags TAG1,TAG2] - Add test pawn item
  add forfeit <name> [--tags TAG1,TAG2] - Add forfeit item for blackmarket testing
  add template <id> [--status ACTIVE|FORFEIT] [--workState DEFAULT|RESTORED|REFORGED] - Add item from CSV template
  spawn customer        - Force spawn a customer (business phase only)
  blackmarket lock <n>  - Lock blackmarket for N days
  blackmarket unlock    - Unlock blackmarket
  chains                - View active event chains
  customers             - View today's customer count
  state <path>          - View game state (e.g., state reputation, state stats.day)
  test dsl [story]      - Test DSL stories (emma|susan|zhao|lin or omit for all)
  clear                 - Clear console history
  help                  - Show this help`
      };

    case 'clear':
      return { success: true, message: '__CLEAR__' };

    case 'set':
      return handleSetCommand(args, dispatch, getState);

    case 'open':
      return handleOpenCommand(args, dispatch, getState, true);

    case 'close': {
      // Handle 'close shop' as a special two-word command
      if (args[0]?.toLowerCase() === 'shop') {
        return handleCloseShopCommand(dispatch, getState);
      }
      // Otherwise treat as panel close command
      return handleOpenCommand(args, dispatch, getState, false);
    }

    case 'add':
      return handleAddCommand(args, dispatch, getState);

    case 'spawn':
      if (args[0]?.toLowerCase() === 'customer') {
        const state = getState();
        if (!PhaseIs.business(state.phase)) {
          return { success: false, message: 'Error: Can only spawn customers in BUSINESS phase' };
        }
        // Trigger loading state - the game engine will pick up and generate customer
        dispatch({ type: 'SET_LOADING', payload: true });
        return { success: true, message: 'Triggering customer spawn...' };
      }
      return { success: false, message: `Unknown spawn target: ${args[0]}` };

    case 'skip':
      if (args[0]?.toLowerCase() === 'day') {
        return handleSkipDayCommand(dispatch, getState);
      }
      return { success: false, message: `Unknown skip target: ${args[0]}. Available: day` };

    case 'test':
      return handleTestCommand(args);

    case 'blackmarket':
      return handleBlackmarketCommand(args, dispatch, getState);

    case 'chains':
      return handleChainsCommand(getState);

    case 'customers':
      return handleCustomersCommand(getState);

    case 'state':
      return handleStateCommand(args, getState);

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
      return { success: true, message: `Phase set to ${phase.type}` };
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

    case 'heat': {
      const heat = parseInt(value, 10);
      if (isNaN(heat) || heat < 0 || heat > 10) {
        return { success: false, message: 'Heat must be between 0 and 10' };
      }
      const state = getState();
      const newState = {
        ...state,
        blackmarket: { ...state.blackmarket, heat }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `Blackmarket heat set to ${heat}` };
    }

    case 'chain': {
      // Format: set chain <chainId> <variable> <value>
      const parts = value.split(/\s+/);
      if (parts.length < 3) {
        return { success: false, message: 'Usage: set chain <chainId> <variable> <value>' };
      }
      const [chainId, variable, ...valueParts] = parts;
      const rawValue = valueParts.join(' ');

      const state = getState();
      const chains = state.activeChains || [];
      const chainIndex = chains.findIndex((c: any) => c.id === chainId);

      if (chainIndex === -1) {
        const availableChains = chains.map((c: any) => c.id).join(', ') || '(none)';
        return {
          success: false,
          message: `Chain not found: ${chainId}\nAvailable chains: ${availableChains}`
        };
      }

      // Parse value: try number first, then keep as string
      let parsedValue: unknown;
      const numValue = parseFloat(rawValue);
      if (!isNaN(numValue) && rawValue.trim() === numValue.toString()) {
        parsedValue = numValue;
      } else if (rawValue.toLowerCase() === 'true') {
        parsedValue = true;
      } else if (rawValue.toLowerCase() === 'false') {
        parsedValue = false;
      } else {
        parsedValue = rawValue;
      }

      const targetChain = chains[chainIndex];
      const updatedChain = {
        ...targetChain,
        variables: { ...targetChain.variables, [variable]: parsedValue }
      };
      const updatedChains = [...chains];
      updatedChains[chainIndex] = updatedChain;

      const newState = {
        ...state,
        activeChains: updatedChains
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });

      return {
        success: true,
        message: `Chain ${chainId}: ${variable} = ${parsedValue} (type: ${typeof parsedValue})`
      };
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
    'appointment': 'showAppointmentBoard',
    'blackmarket': 'showBlackmarket'
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

function handleBlackmarketCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  if (args.length < 1) {
    return { success: false, message: 'Usage: blackmarket <lock|unlock> [days]' };
  }

  const subCommand = args[0].toLowerCase();
  const state = getState();

  switch (subCommand) {
    case 'lock': {
      const days = parseInt(args[1], 10) || 3;
      const lockUntilDay = state.stats.day + days;
      const newState = {
        ...state,
        blackmarket: {
          ...state.blackmarket,
          isLocked: true,
          lockUntilDay
        }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: `Blackmarket locked for ${days} days (until day ${lockUntilDay})` };
    }

    case 'unlock': {
      const newState = {
        ...state,
        blackmarket: {
          ...state.blackmarket,
          isLocked: false,
          lockUntilDay: 0
        }
      };
      dispatch({ type: 'LOAD_GAME', payload: newState });
      return { success: true, message: 'Blackmarket unlocked' };
    }

    default:
      return { success: false, message: `Unknown blackmarket command: ${subCommand}. Use 'lock' or 'unlock'.` };
  }
}

function handleTestCommand(args: string[]): CommandResult {
  if (args.length < 1) {
    return { success: false, message: `Usage: test dsl [story]\nAvailable: emma, susan, zhao, lin, or omit for all` };
  }

  const testType = args[0].toLowerCase();

  if (testType === 'dsl') {
    const storyName = args[1]?.toLowerCase();

    if (storyName) {
      // Test single story
      const result = testFullStoryByName(storyName);
      if (!result) {
        return { success: false, message: `Unknown story: ${storyName}. Available: emma, susan, zhao, lin` };
      }
      return { success: result.passed, message: formatFullTestResults([result]) };
    } else {
      // Test all stories
      const results = testAllFullStoryFiles();
      const allPassed = results.every(r => r.passed);
      return { success: allPassed, message: formatFullTestResults(results) };
    }
  }

  return { success: false, message: `Unknown test type: ${testType}. Available: dsl` };
}

function handleChainsCommand(getState: () => any): CommandResult {
  const state = getState();
  const chains = state.activeChains || [];

  if (chains.length === 0) {
    return { success: true, message: 'No active event chains' };
  }

  const lines = chains.map((c: any) => {
    const chainType = c.chainType || 'NARRATIVE';
    const typeLabel = chainType === 'TRANSIENT' ? '[TRANSIENT]' : '[NARRATIVE]';
    return `${typeLabel} ${c.id}: ${c.npcName} (stage=${c.stage}, active=${c.isActive})`;
  });

  return { success: true, message: `Active chains (${chains.length}):\n${lines.join('\n')}` };
}

function handleCustomersCommand(getState: () => any): CommandResult {
  const state = getState();
  const served = state.customersServedToday ?? 0;
  const narrativeServed = state.narrativeCustomersServedToday ?? 0;
  const max = state.maxCustomersPerDay ?? 0;
  const fillerServed = served - narrativeServed;
  const fillerMax = Math.max(0, max - narrativeServed);
  return { success: true, message: `Customers today: ${served} total (${narrativeServed} narrative + ${fillerServed}/${fillerMax} filler)` };
}

function handleStateCommand(args: string[], getState: () => any): CommandResult {
  if (args.length < 1) {
    return { success: false, message: 'Usage: state <path>\nExamples: state reputation, state stats.day, state customersServedToday' };
  }

  const path = args[0];
  const state = getState();

  // Navigate the path (supports dot notation like "stats.day")
  const parts = path.split('.');
  let value: any = state;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return { success: false, message: `Path not found: ${path} (stopped at ${part})` };
    }
    if (typeof value !== 'object') {
      return { success: false, message: `Cannot access property '${part}' on non-object` };
    }
    if (!(part in value)) {
      return { success: false, message: `Property '${part}' not found in path` };
    }
    value = value[part];
  }

  // Format the output based on type
  if (value === null || value === undefined) {
    return { success: true, message: `${path} = null` };
  }

  if (typeof value === 'object') {
    try {
      const formatted = JSON.stringify(value, null, 2);
      // Truncate if too long
      if (formatted.length > 500) {
        return { success: true, message: `${path} = ${formatted.slice(0, 500)}...\n(truncated)` };
      }
      return { success: true, message: `${path} = ${formatted}` };
    } catch {
      return { success: true, message: `${path} = [Object]` };
    }
  }

  return { success: true, message: `${path} = ${value}` };
}

/**
 * Handle 'close shop' command - triggers CLOSE_SHOP event to enter night phase
 * NOTE: CLOSE_SHOP event only works in BUSINESS.CLOSED subphase (all customers served)
 */
function handleCloseShopCommand(
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  const state = getState();

  // Check if we're in BUSINESS.CLOSED subphase (all customers served)
  // The state machine only allows CLOSE_SHOP transition from BUSINESS.CLOSED
  if (!PhaseMatch.businessClosed(state.phase)) {
    // Provide helpful error message based on current state
    if (PhaseIs.business(state.phase)) {
      return {
        success: false,
        message: `Error: Shop can only be closed when all customers have been served (BUSINESS.CLOSED). Current subphase: ${state.phase.subphase}`
      };
    }
    return {
      success: false,
      message: `Error: Can only close shop in BUSINESS phase. Current phase: ${JSON.stringify(state.phase)}`
    };
  }

  // Dispatch the CLOSE_SHOP event through the state machine
  dispatch({ type: 'PHASE_TRANSITION', payload: { type: 'CLOSE_SHOP' } });

  return {
    success: true,
    message: 'Shop closed. Entering departure/night phase...'
  };
}

/**
 * Handle 'skip day' command - jumps directly to next day's MORNING_BRIEF
 */
function handleSkipDayCommand(
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  const state = getState();
  const currentDay = state.stats.day;
  const newDay = currentDay + 1;

  // Skip to next day by updating state directly
  // This bypasses the normal night cycle but is useful for testing
  const newState = {
    ...state,
    stats: {
      ...state.stats,
      day: newDay,
      actionPoints: state.stats.maxActionPoints || 5
    },
    phase: { type: 'MORNING_BRIEF' } as GamePhase,
    // Reset daily counters
    customersServedToday: 0,
    narrativeCustomersServedToday: 0,
    // Reset night state
    nightState: {
      ...state.nightState,
      energy: state.nightState?.maxEnergy || 3
    }
  };

  dispatch({ type: 'LOAD_GAME', payload: newState });

  return {
    success: true,
    message: `Skipped to Day ${newDay} (MORNING_BRIEF phase)`
  };
}

function handleAddCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  if (args.length < 2) {
    return { success: false, message: 'Usage: add <type> <value>\n  add cash <n>\n  add essence <n>\n  add item <name> --dueDate <day> [--chainId <id>] [--tags TAG1,TAG2]' };
  }

  const type = args[0].toLowerCase();

  switch (type) {
    case 'cash': {
      const amount = parseInt(args[1], 10);
      if (isNaN(amount)) {
        return { success: false, message: 'Amount must be a number' };
      }
      dispatch({ type: 'DEBUG_ADD_CASH', payload: amount });
      return { success: true, message: `Added $${amount} to cash` };
    }

    case 'essence': {
      const amount = parseInt(args[1], 10);
      if (isNaN(amount)) {
        return { success: false, message: 'Amount must be a number' };
      }
      dispatch({ type: 'ADD_ESSENCE_BATCH', payload: { craft: amount, time: amount, vibe: amount } });
      return { success: true, message: `Added ${amount} to all essence types` };
    }

    case 'item':
      return handleAddItemCommand(args.slice(1), dispatch, getState);

    case 'forfeit':
      return handleAddForfeitCommand(args.slice(1), dispatch, getState);

    case 'template':
      return handleAddTemplateCommand(args.slice(1), dispatch, getState);

    default:
      return { success: false, message: `Unknown type: ${type}. Valid types: cash, essence, item, forfeit, template` };
  }
}

// All valid tags for validation
const ALL_VALID_TAGS: string[] = [...STATE_TAGS, ...ATTRIBUTE_TAGS, ...ESSENCE_TAGS];

/**
 * Parse args like: 测试钟表 --dueDate 3 --chainId emma_chain --tags DIRTY,RUSTED
 * Returns: { name: "测试钟表", dueDate: 3, chainId: "emma_chain", tags: ["DIRTY", "RUSTED"] }
 */
function parseItemArgs(args: string[]): { name: string; dueDate?: number; chainId?: string; tags?: ItemTag[] } | null {
  const result: { name: string; dueDate?: number; chainId?: string; tags?: ItemTag[] } = { name: '' };
  const nameParts: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--dueDate' || arg === '--duedate') {
      const nextArg = args[i + 1];
      if (!nextArg) return null;
      const day = parseInt(nextArg, 10);
      if (isNaN(day)) return null;
      result.dueDate = day;
      i += 2;
    } else if (arg === '--chainId' || arg === '--chainid') {
      const nextArg = args[i + 1];
      if (!nextArg) return null;
      result.chainId = nextArg;
      i += 2;
    } else if (arg === '--tags' || arg === '--tag') {
      const nextArg = args[i + 1];
      if (!nextArg) return null;
      // Parse comma-separated tags
      const tagStrings = nextArg.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
      // Validate tags
      const validTags: ItemTag[] = [];
      for (const tagStr of tagStrings) {
        if (ALL_VALID_TAGS.includes(tagStr)) {
          validTags.push(tagStr as ItemTag);
        }
        // Silently ignore invalid tags (or we could return null to fail)
      }
      if (validTags.length > 0) {
        result.tags = validTags;
      }
      i += 2;
    } else if (!arg.startsWith('--')) {
      nameParts.push(arg);
      i++;
    } else {
      // Unknown flag
      i++;
    }
  }

  result.name = nameParts.join(' ');
  return result.name ? result : null;
}

function handleAddItemCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  const parsed = parseItemArgs(args);

  if (!parsed || !parsed.name) {
    return { success: false, message: 'Usage: add item <name> --dueDate <day> [--chainId <id>] [--tags TAG1,TAG2]\nExample: add item 测试钟表 --dueDate 3 --chainId emma_chain\nExample: add item 测试物品 --dueDate 5 --tags DIRTY,RUSTED' };
  }

  if (parsed.dueDate === undefined) {
    return { success: false, message: 'Error: --dueDate is required. Usage: add item <name> --dueDate <day>' };
  }

  const state = getState();
  const currentDay = state.stats.day;
  const dueDate = parsed.dueDate;

  // Calculate term (due date - current day, minimum 1)
  const termDays = Math.max(1, dueDate - currentDay);

  // Create a test item with minimal but valid structure
  const itemId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const testValue = 1000; // Default test value

  const pawnInfo: PawnInfo = {
    principal: testValue,
    interestRate: 0.10, // 10% standard rate
    startDate: currentDay,
    termDays: termDays,
    dueDate: dueDate,
    valuation: testValue,
    extensionCount: 0
  };

  const newItem: Item = {
    id: itemId,
    name: parsed.name,
    category: '测试物品',
    condition: '良好',
    visualDescription: '这是一个用于测试的物品。',
    historySnippet: '测试用途。',
    appraisalNote: '测试物品，用于验证续当机制。',
    archiveSummary: '测试物品。',
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: true,
    pawnDate: currentDay,
    status: ItemStatus.ACTIVE,
    pawnAmount: testValue,
    pawnInfo: pawnInfo,
    realValue: testValue,
    perceivedValue: testValue,
    uncertainty: 0,
    currentRange: [testValue, testValue],
    initialRange: [testValue, testValue],
    hiddenTraits: [],
    revealedTraits: [],
    usedTraitIds: [],
    logs: [{
      id: `log-${Date.now()}`,
      day: currentDay,
      content: `[测试] 通过 DevConsole 创建的测试物品`,
      type: 'ENTRY'
    }],
    // Link to chain if provided
    relatedChainId: parsed.chainId,
    // Add tags if provided
    tags: parsed.tags
  };

  // Add item to inventory using LOAD_GAME (same pattern as other debug commands)
  const newState = {
    ...state,
    inventory: [...state.inventory, newItem]
  };
  dispatch({ type: 'LOAD_GAME', payload: newState });

  const chainInfo = parsed.chainId ? ` (链: ${parsed.chainId})` : '';
  const tagsInfo = parsed.tags && parsed.tags.length > 0 ? `\n  Tags: ${parsed.tags.join(', ')}` : '';
  return {
    success: true,
    message: `Added item "${parsed.name}" to inventory\n  ID: ${itemId}\n  Due: Day ${dueDate}${chainInfo}\n  Term: ${termDays} days\n  Value: $${testValue}${tagsInfo}`
  };
}

/**
 * Parse args for forfeit item: <name> [--tags TAG1,TAG2]
 */
function parseForfeitArgs(args: string[]): { name: string; tags?: ItemTag[] } | null {
  const result: { name: string; tags?: ItemTag[] } = { name: '' };
  const nameParts: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--tags' || arg === '--tag') {
      const nextArg = args[i + 1];
      if (!nextArg) return null;
      const tagStrings = nextArg.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
      const validTags: ItemTag[] = [];
      for (const tagStr of tagStrings) {
        if (ALL_VALID_TAGS.includes(tagStr)) {
          validTags.push(tagStr as ItemTag);
        }
      }
      if (validTags.length > 0) {
        result.tags = validTags;
      }
      i += 2;
    } else if (!arg.startsWith('--')) {
      nameParts.push(arg);
      i++;
    } else {
      i++;
    }
  }

  result.name = nameParts.join(' ');
  return result.name ? result : null;
}

function handleAddForfeitCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  const parsed = parseForfeitArgs(args);

  if (!parsed || !parsed.name) {
    return { success: false, message: 'Usage: add forfeit <name> [--tags TAG1,TAG2]\nExample: add forfeit 测试钟表\nExample: add forfeit 贵重手表 --tags GOLD,MINT' };
  }

  const state = getState();
  const currentDay = state.stats.day;

  // Create a forfeit item for blackmarket testing
  const itemId = `forfeit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const testValue = 1000 + Math.floor(Math.random() * 4000); // Random value 1000-5000

  const newItem: Item = {
    id: itemId,
    name: parsed.name,
    category: '测试物品',
    condition: '良好',
    visualDescription: '这是一个绝当物品，可在黑市出售。',
    historySnippet: '测试用途。',
    appraisalNote: '绝当物品，用于测试黑市系统。',
    archiveSummary: '绝当测试物品。',
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: true,
    pawnDate: currentDay - 7, // Pawned a week ago
    status: ItemStatus.FORFEIT, // Already forfeit - owned by player
    pawnAmount: testValue * 0.7,
    realValue: testValue,
    perceivedValue: testValue,
    uncertainty: 0,
    currentRange: [testValue, testValue],
    initialRange: [testValue, testValue],
    hiddenTraits: [],
    revealedTraits: [],
    usedTraitIds: [],
    logs: [{
      id: `log-${Date.now()}`,
      day: currentDay,
      content: `[测试] 通过 DevConsole 创建的绝当物品`,
      type: 'FORFEIT'
    }],
    tags: parsed.tags
  };

  // Add item to inventory
  const newState = {
    ...state,
    inventory: [...state.inventory, newItem]
  };
  dispatch({ type: 'LOAD_GAME', payload: newState });

  const tagsInfo = parsed.tags && parsed.tags.length > 0 ? `\n  Tags: ${parsed.tags.join(', ')}` : '';
  return {
    success: true,
    message: `Added forfeit item "${parsed.name}" to inventory\n  ID: ${itemId}\n  Value: $${testValue}\n  Status: FORFEIT (sellable at blackmarket)${tagsInfo}`
  };
}

/**
 * Parse args for template command: <templateId> [--status ACTIVE|FORFEIT] [--workState DEFAULT|RESTORED|REFORGED]
 */
function parseTemplateArgs(args: string[]): {
  templateId: string;
  status: ItemStatus;
  workState: WorkState;
} | null {
  let templateId = '';
  let status: ItemStatus = ItemStatus.FORFEIT; // Default to FORFEIT for testing
  let workState: WorkState = 'DEFAULT';

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--status') {
      const nextArg = args[i + 1]?.toUpperCase();
      if (nextArg === 'ACTIVE') {
        status = ItemStatus.ACTIVE;
      } else if (nextArg === 'FORFEIT') {
        status = ItemStatus.FORFEIT;
      }
      i += 2;
    } else if (arg === '--workState' || arg === '--workstate') {
      const nextArg = args[i + 1]?.toUpperCase();
      if (nextArg === 'DEFAULT' || nextArg === 'RESTORED' || nextArg === 'REFORGED') {
        workState = nextArg as WorkState;
      }
      i += 2;
    } else if (!arg.startsWith('--')) {
      templateId = arg;
      i++;
    } else {
      i++;
    }
  }

  return templateId ? { templateId, status, workState } : null;
}

/**
 * Get the display name based on work state
 */
function getNameForWorkState(item: Item): string {
  switch (item.workState) {
    case 'RESTORED':
      return item.nameRestored || item.name;
    case 'REFORGED':
      return item.nameReforged || item.name;
    default:
      return item.nameDefault || item.name;
  }
}

function handleAddTemplateCommand(
  args: string[],
  dispatch: (action: any) => void,
  getState: () => any
): CommandResult {
  const parsed = parseTemplateArgs(args);

  if (!parsed || !parsed.templateId) {
    // List available templates
    const templates = getAllItemTemplates();
    const templateList = templates.map(t => `  ${t.id}: ${t.nameDefault}`).join('\n');
    return {
      success: false,
      message: `Usage: add template <templateId> [--status ACTIVE|FORFEIT] [--workState DEFAULT|RESTORED|REFORGED]\n\nAvailable templates:\n${templateList || '  (no templates loaded)'}`
    };
  }

  const state = getState();
  const currentDay = state.stats.day;

  // Create item from template
  const item = createItemFromTemplate(parsed.templateId, {
    status: parsed.status,
    workState: parsed.workState,
    pawnDate: parsed.status === ItemStatus.ACTIVE ? currentDay : currentDay - 7,
    appraised: true,
  });

  if (!item) {
    // Template not found - list available templates
    const templates = getAllItemTemplates();
    const templateList = templates.map(t => `  ${t.id}: ${t.nameDefault}`).join('\n');
    return {
      success: false,
      message: `Template not found: ${parsed.templateId}\n\nAvailable templates:\n${templateList || '  (no templates loaded)'}`
    };
  }

  // Update name based on work state
  item.name = getNameForWorkState(item);

  // Update description based on work state
  switch (parsed.workState) {
    case 'RESTORED':
      item.visualDescription = item.descRestored || item.visualDescription;
      item.wasRestored = true;
      break;
    case 'REFORGED':
      item.visualDescription = item.descReforged || item.visualDescription;
      item.wasReforged = true;
      break;
  }

  // Set pawn info for ACTIVE items
  if (parsed.status === ItemStatus.ACTIVE) {
    const dueDate = currentDay + 7;
    item.pawnInfo = {
      principal: item.realValue * 0.7,
      interestRate: 0.10,
      startDate: currentDay,
      termDays: 7,
      dueDate: dueDate,
      valuation: item.realValue,
      extensionCount: 0,
    };
    item.pawnAmount = item.realValue * 0.7;
  } else {
    // FORFEIT items are owned by shop
    item.pawnAmount = item.realValue * 0.7;
  }

  // Add creation log
  item.logs.push({
    id: `log-${Date.now()}`,
    day: currentDay,
    content: `[DevConsole] Created from template: ${parsed.templateId} (status=${parsed.status}, workState=${parsed.workState})`,
    type: parsed.status === ItemStatus.ACTIVE ? 'ENTRY' : 'FORFEIT',
  });

  // Add item to inventory
  const newState = {
    ...state,
    inventory: [...state.inventory, item],
  };
  dispatch({ type: 'LOAD_GAME', payload: newState });

  // Build result message with name variants
  const nameVariants = [
    `    Default: ${item.nameDefault || '(none)'}`,
    `    Restored: ${item.nameRestored || '(none)'}`,
    `    Reforged: ${item.nameReforged || '(none)'}`,
  ].join('\n');

  return {
    success: true,
    message: `Created item from template "${parsed.templateId}"
  ID: ${item.id}
  Name: ${item.name}
  Name Variants:
${nameVariants}
  Status: ${parsed.status}
  WorkState: ${parsed.workState}
  Value: $${item.realValue}
  Tags: ${item.tags?.join(', ') || '(none)'}`,
  };
}

/**
 * Command definition for documentation
 */
export interface CommandDef {
  command: string;
  description: string;
  usage: string;
  examples?: string[];
}

/**
 * Get all available commands with their documentation
 * This is used by qa-tester to know current available commands
 */
export function getAvailableCommands(): CommandDef[] {
  return [
    {
      command: 'set phase',
      description: 'Set game phase',
      usage: 'set phase <phase>',
      examples: [`set phase night`, `set phase business`, `set phase morning`]
    },
    {
      command: 'set day',
      description: 'Set current day',
      usage: 'set day <n>',
      examples: [`set day 5`, `set day 14`]
    },
    {
      command: 'set cash',
      description: 'Set cash amount',
      usage: 'set cash <n>',
      examples: [`set cash 50000`, `set cash 100000`]
    },
    {
      command: 'set reputation',
      description: 'Set reputation value',
      usage: 'set reputation <type> <n>',
      examples: [`set reputation humanity 80`, `set reputation credibility 50`]
    },
    {
      command: 'set ap',
      description: 'Set action points',
      usage: 'set ap <n>',
      examples: [`set ap 5`]
    },
    {
      command: 'set energy',
      description: 'Set night energy',
      usage: 'set energy <n>',
      examples: [`set energy 3`]
    },
    {
      command: 'set heat',
      description: 'Set blackmarket heat (0-10)',
      usage: 'set heat <n>',
      examples: [`set heat 0`, `set heat 5`, `set heat 9`]
    },
    {
      command: 'set chain',
      description: 'Set a chain variable value (for testing event triggers)',
      usage: 'set chain <chainId> <variable> <value>',
      examples: [`set chain chain_emma funds 400`, `set chain chain_emma hope 30`, `set chain chain_zhao morale 50`]
    },
    {
      command: 'open',
      description: 'Open a panel',
      usage: 'open <panel>',
      examples: [`open upgrade`, `open mail`, `open calendar`, `open inventory`]
    },
    {
      command: 'close',
      description: 'Close a panel',
      usage: 'close <panel>',
      examples: [`close upgrade`, `close mail`]
    },
    {
      command: 'close shop',
      description: 'Close shop and enter night phase (business phase only)',
      usage: 'close shop',
      examples: [`close shop`]
    },
    {
      command: 'skip day',
      description: 'Skip to next day\'s morning brief (bypasses night cycle)',
      usage: 'skip day',
      examples: [`skip day`]
    },
    {
      command: 'add cash',
      description: 'Add cash (can be negative)',
      usage: 'add cash <n>',
      examples: [`add cash 1000`, `add cash -500`]
    },
    {
      command: 'add essence',
      description: 'Add essence to all types',
      usage: 'add essence <n>',
      examples: [`add essence 10`]
    },
    {
      command: 'add item',
      description: 'Add a test pawn item to inventory with specified due date and optional tags',
      usage: 'add item <name> --dueDate <day> [--chainId <id>] [--tags TAG1,TAG2]',
      examples: [`add item 测试钟表 --dueDate 3`, `add item 测试戒指 --dueDate 5 --chainId emma_chain`, `add item 测试物品 --dueDate 3 --tags DIRTY,RUSTED`]
    },
    {
      command: 'add forfeit',
      description: 'Add a forfeit item for blackmarket testing (FORFEIT status, sellable)',
      usage: 'add forfeit <name> [--tags TAG1,TAG2]',
      examples: [`add forfeit 测试钟表`, `add forfeit 贵重手表 --tags GOLD,MINT`]
    },
    {
      command: 'add template',
      description: 'Add item from CSV template with full name variants (nameDefault, nameRestored, nameReforged)',
      usage: 'add template <templateId> [--status ACTIVE|FORFEIT] [--workState DEFAULT|RESTORED|REFORGED]',
      examples: [
        `add template item_watch_01`,
        `add template item_watch_01 --status ACTIVE`,
        `add template item_watch_01 --workState RESTORED`,
        `add template item_watch_01 --status FORFEIT --workState REFORGED`
      ]
    },
    {
      command: 'blackmarket lock',
      description: 'Lock blackmarket for N days',
      usage: 'blackmarket lock <n>',
      examples: [`blackmarket lock 3`, `blackmarket lock 7`]
    },
    {
      command: 'blackmarket unlock',
      description: 'Unlock blackmarket immediately',
      usage: 'blackmarket unlock',
      examples: [`blackmarket unlock`]
    },
    {
      command: 'spawn customer',
      description: 'Force spawn a customer (business phase only)',
      usage: 'spawn customer',
      examples: [`spawn customer`]
    },
    {
      command: 'test dsl',
      description: 'Validate loaded DSL story files',
      usage: 'test dsl [story]',
      examples: [`test dsl`, `test dsl emma`, `test dsl susan`]
    },
    {
      command: 'chains',
      description: 'View active event chains (shows NARRATIVE and TRANSIENT chains)',
      usage: 'chains',
      examples: [`chains`]
    },
    {
      command: 'customers',
      description: 'View today\'s customer service count',
      usage: 'customers',
      examples: [`customers`]
    },
    {
      command: 'state',
      description: 'View game state by path (supports dot notation)',
      usage: 'state <path>',
      examples: [`state reputation`, `state stats.day`, `state customersServedToday`, `state activeChains`, `state currentCustomer.dialogue.pawnReason`]
    },
    {
      command: 'clear',
      description: 'Clear console history',
      usage: 'clear',
      examples: []
    },
    {
      command: 'help',
      description: 'Show available commands',
      usage: 'help',
      examples: []
    }
  ];
}

/**
 * Get valid values for specific command parameters
 */
export function getCommandOptions(): Record<string, string[]> {
  const templates = getAllItemTemplates();
  return {
    phases: Object.keys(PHASE_MAP),
    reputationTypes: Object.keys(REPUTATION_MAP),
    panels: Object.keys(PANEL_MAP),
    itemTags: ALL_VALID_TAGS,
    itemStatuses: ['ACTIVE', 'FORFEIT'],
    workStates: ['DEFAULT', 'RESTORED', 'REFORGED'],
    templateIds: templates.map(t => t.id)
  };
}

/**
 * Interface for window.__console__ exposed to QA tester
 */
export interface DevConsoleAPI {
  execute: (command: string) => CommandResult[];
  getState: () => any;
  getCommands: () => CommandDef[];
  getOptions: () => Record<string, string[]>;
}
