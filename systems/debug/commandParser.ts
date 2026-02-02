
import { GamePhase, ReputationType } from '../../types';
import { testSusanDSL } from '../narrative/dsl/__tests__/susan.test';
import { testLinDSL } from '../narrative/dsl/__tests__/lin.test';
import { testZhaoDSL } from '../narrative/dsl/__tests__/zhao.test';
import { testEmmaDSL } from '../narrative/dsl/__tests__/emma.test';
import { testAllFullStoryFiles, testFullStoryByName, formatFullTestResults } from '../narrative/dsl/__tests__/fullFileTest';
import type { TestResult } from '../narrative/dsl/__tests__/testUtils';

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
  chains                - View active event chains
  customers             - View today's customer count
  state <path>          - View game state (e.g., state reputation, state stats.day)
  test dsl <story>      - Test DSL parser (susan|lin|zhao|emma|all|full)
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

    case 'test':
      return handleTestCommand(args);

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

// Map of story names to their test functions
const STORY_TEST_MAP: Record<string, () => TestResult> = {
  'susan': testSusanDSL,
  'lin': testLinDSL,
  'zhao': testZhaoDSL,
  'emma': testEmmaDSL
};

function formatTestResult(storyName: string, result: TestResult): string {
  const passedCount = result.tests.filter(t => t.passed).length;
  const totalCount = result.tests.length;

  let output = `=== ${storyName.charAt(0).toUpperCase() + storyName.slice(1)} DSL Test ===\n`;
  for (const test of result.tests) {
    const status = test.passed ? '✓' : '✗';
    output += `${status} ${test.name}\n`;
    if (!test.passed) {
      if (test.error) {
        output += `  Error: ${test.error}\n`;
      } else {
        output += `  Expected: ${JSON.stringify(test.expected)}\n`;
        output += `  Actual: ${JSON.stringify(test.actual)}\n`;
      }
    }
  }
  output += `\n=== Results: ${passedCount}/${totalCount} passed ===`;
  return output;
}

function handleTestCommand(args: string[]): CommandResult {
  if (args.length < 1) {
    return { success: false, message: `Usage: test dsl <story> | test dsl full [story]\nAvailable: ${Object.keys(STORY_TEST_MAP).join(', ')}, all, full` };
  }

  const testType = args[0].toLowerCase();

  if (testType === 'dsl') {
    const storyName = args[1]?.toLowerCase() || 'susan';

    // Full file validation
    if (storyName === 'full') {
      const specificStory = args[2]?.toLowerCase();

      if (specificStory) {
        // Test single story's full file
        const result = testFullStoryByName(specificStory);
        if (!result) {
          return { success: false, message: `Unknown story: ${specificStory}. Available: emma, susan, zhao, lin` };
        }
        return { success: result.passed, message: formatFullTestResults([result]) };
      } else {
        // Test all full files
        const results = testAllFullStoryFiles();
        const allPassed = results.every(r => r.passed);
        return { success: allPassed, message: formatFullTestResults(results) };
      }
    }

    // Run all tests
    if (storyName === 'all') {
      const results: { name: string; result: TestResult }[] = [];
      let allPassed = true;

      for (const [name, testFn] of Object.entries(STORY_TEST_MAP)) {
        try {
          const result = testFn();
          results.push({ name, result });
          if (!result.passed) allPassed = false;
        } catch (error) {
          results.push({
            name,
            result: {
              passed: false,
              tests: [{ name: 'Execution', passed: false, error: error instanceof Error ? error.message : String(error) }]
            }
          });
          allPassed = false;
        }
      }

      let output = `=== All DSL Tests ===\n\n`;
      let totalPassed = 0;
      let totalTests = 0;

      for (const { name, result } of results) {
        const passedCount = result.tests.filter(t => t.passed).length;
        const testCount = result.tests.length;
        totalPassed += passedCount;
        totalTests += testCount;
        const status = result.passed ? '✓' : '✗';
        output += `${status} ${name}: ${passedCount}/${testCount}\n`;

        // Show failed tests
        for (const test of result.tests) {
          if (!test.passed) {
            output += `  ✗ ${test.name}`;
            if (test.error) {
              output += `: ${test.error}`;
            }
            output += `\n`;
          }
        }
      }
      output += `\n=== Total: ${totalPassed}/${totalTests} passed ===`;

      return { success: allPassed, message: output };
    }

    // Run single story test
    const testFn = STORY_TEST_MAP[storyName];
    if (testFn) {
      try {
        const result = testFn();
        return { success: result.passed, message: formatTestResult(storyName, result) };
      } catch (error) {
        return { success: false, message: `Test error: ${error instanceof Error ? error.message : String(error)}` };
      }
    }

    return { success: false, message: `Unknown story: ${storyName}. Available: ${Object.keys(STORY_TEST_MAP).join(', ')}, all` };
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
  const max = state.maxCustomersPerDay ?? 0;
  return { success: true, message: `Customers today: ${served}/${max}` };
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
      command: 'spawn customer',
      description: 'Force spawn a customer (business phase only)',
      usage: 'spawn customer',
      examples: [`spawn customer`]
    },
    {
      command: 'test dsl',
      description: 'Test DSL parser output against TypeScript source',
      usage: 'test dsl <story>',
      examples: [`test dsl susan`, `test dsl lin`, `test dsl zhao`, `test dsl emma`, `test dsl all`]
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
      examples: [`state reputation`, `state stats.day`, `state customersServedToday`, `state activeChains`]
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
  return {
    phases: Object.keys(PHASE_MAP),
    reputationTypes: Object.keys(REPUTATION_MAP),
    panels: Object.keys(PANEL_MAP)
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
