
import { ReputationMilestone } from './types';
import { ReputationType } from '../core/types';
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import { GAME_CONFIG } from '../game/config';
import milestonesCsv from '@/assets/data/texts/milestones.csv?raw';

// ============================================================================
// CSV Loading
// ============================================================================

interface MilestoneTextRow {
  id: string;
  label: string;
  description: string;
  effectDescription: string;
}

const MILESTONE_TEXT_SCHEMA: CSVSchema = {
  'id': stringCol('id'),
  'label': stringCol('label'),
  'description': stringCol('description'),
  'effectDescription': stringCol('effectDescription'),
};

// Icon and color are presentation config, kept in code
const MILESTONE_PRESENTATION: Record<string, { icon: string; color: string }> = {
  hum_saint: { icon: 'HeartHandshake', color: 'text-rose-500' },
  hum_cold: { icon: 'Snowflake', color: 'text-cyan-400' },
  cred_expert: { icon: 'Award', color: 'text-amber-400' },
  cred_scam: { icon: 'AlertOctagon', color: 'text-red-500' },
  inn_lawful: { icon: 'Shield', color: 'text-blue-500' },
  inn_suspect: { icon: 'AlertTriangle', color: 'text-orange-500' },
};

// Map TOML trigger_type string to ReputationType enum
const REPUTATION_TYPE_MAP: Record<string, ReputationType> = {
  'Humanity': ReputationType.HUMANITY,
  'Credibility': ReputationType.CREDIBILITY,
  'Innocence': ReputationType.INNOCENCE,
};

// ============================================================================
// Lazy Initialization
// ============================================================================

let _milestones: ReputationMilestone[] | null = null;

function buildMilestones(): ReputationMilestone[] {
  if (_milestones) return _milestones;

  const textRows = parseCSV<MilestoneTextRow>(milestonesCsv, MILESTONE_TEXT_SCHEMA, {
    warnUnknownColumns: false,
  });

  const tomlMilestones = GAME_CONFIG.REPUTATION_MILESTONES;

  _milestones = textRows
    .filter(row => row.id && tomlMilestones[row.id])
    .map(row => {
      const trigger = tomlMilestones[row.id];
      const presentation = MILESTONE_PRESENTATION[row.id] ?? { icon: 'Circle', color: 'text-gray-400' };

      return {
        id: row.id,
        label: row.label,
        description: row.description,
        effectDescription: row.effectDescription,
        trigger: {
          type: REPUTATION_TYPE_MAP[trigger.trigger_type] ?? ReputationType.HUMANITY,
          value: trigger.trigger_value,
          operator: trigger.trigger_operator as '>=' | '<=',
        },
        icon: presentation.icon,
        color: presentation.color,
      };
    });

  return _milestones;
}

// ============================================================================
// Export (backward compatible)
// ============================================================================

export const REPUTATION_MILESTONES: ReputationMilestone[] = new Proxy([] as ReputationMilestone[], {
  get(_, prop) {
    const data = buildMilestones();
    if (prop === 'length') return data.length;
    if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return data[Number(prop)];
    if (typeof prop === 'string' && typeof (data as any)[prop] === 'function') {
      return (data as any)[prop].bind(data);
    }
    return (data as any)[prop as any];
  },
});
