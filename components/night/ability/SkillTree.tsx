import React, { useMemo } from 'react';
import {
  Lock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  SkillId,
  AbilityPanelData,
} from '../../../systems/characterAbility/types';
import {
  PURE_CRAFT_SKILLS,
  PURE_TIME_SKILLS,
  PURE_VIBE_SKILLS,
  DARK_PATH_SKILLS,
  BRIGHT_PATH_SKILLS,
  WISDOM_PATH_SKILLS,
} from '../../../systems/characterAbility/skillDefinitions';
import { PATH_COLORS, PathKey } from './constants';

// ============================================================================
// Types & Layout Configuration
// ============================================================================

interface SkillTreeProps {
  skillMap: Map<SkillId, AbilityPanelData['skills'][number]>;
  selectedSkillId: SkillId | null;
  onSelectSkill: (id: SkillId) => void;
  essenceBalance: { craft: number; time: number; vibe: number };
}

/** Container dimensions for the triangular layout */
const CONTAINER_W = 680;
const CONTAINER_H = 700;
const CX = CONTAINER_W / 2;
const CY = 310; // slightly above center — bottom half needs more room (TIME, CRAFT, DARK extend down)

/** Radii from center for T1 (inner) and T2 (outer) nodes */
const R_T1 = 120;
const R_T2 = 240;

/** Radius for fusion path nodes — offset from pure paths to avoid overlap */
const R_FUSION_T1 = 155;
const R_FUSION_T2 = 240;

/**
 * Directions (clockwise degrees from top / 12 o'clock):
 * - VIBE: 0 (top)
 * - CRAFT: 120 (4 o'clock, bottom-right)
 * - TIME: 240 (8 o'clock, bottom-left)
 *
 * Fusion midpoints:
 * - BRIGHT (CRAFT+VIBE): 60 (2 o'clock, right-upper)
 * - DARK (TIME+CRAFT): 180 (6 o'clock, bottom)
 * - WISDOM (TIME+VIBE): 300 (10 o'clock, left-upper)
 */
const DIR = {
  VIBE: 0,
  CRAFT: 120,
  TIME: 240,
  CRAFT_VIBE: 60,
  TIME_CRAFT: 180,
  TIME_VIBE: 300,
} as const;

/** Convert clockwise-from-top degrees to screen x,y */
function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.sin(rad),
    y: CY - radius * Math.cos(rad),
  };
}

/** Node position data */
interface NodePos {
  skillId: SkillId;
  x: number;
  y: number;
  pathKey: PathKey;
}

/** Connection line between two nodes */
interface ConnectionLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pathKey: PathKey;
}

// ============================================================================
// Build Layout Positions
// ============================================================================

function buildNodePositions(): { nodes: NodePos[]; connections: ConnectionLine[] } {
  const nodes: NodePos[] = [];
  const connections: ConnectionLine[] = [];

  // Pure paths: each has T1 (inner) and T2 (outer)
  const purePaths: Array<{ pathKey: PathKey; dir: number; skills: readonly SkillId[] }> = [
    { pathKey: 'VIBE', dir: DIR.VIBE, skills: PURE_VIBE_SKILLS },
    { pathKey: 'CRAFT', dir: DIR.CRAFT, skills: PURE_CRAFT_SKILLS },
    { pathKey: 'TIME', dir: DIR.TIME, skills: PURE_TIME_SKILLS },
  ];

  for (const { pathKey, dir, skills } of purePaths) {
    const t1 = polarToXY(dir, R_T1);
    const t2 = polarToXY(dir, R_T2);
    nodes.push({ skillId: skills[0], x: t1.x, y: t1.y, pathKey });
    nodes.push({ skillId: skills[1], x: t2.x, y: t2.y, pathKey });
    connections.push({ x1: t1.x, y1: t1.y, x2: t2.x, y2: t2.y, pathKey });
  }

  // Fusion paths: positioned at midpoint angles
  const fusionPaths: Array<{ pathKey: PathKey; dir: number; skills: readonly SkillId[] }> = [
    { pathKey: 'CRAFT_VIBE', dir: DIR.CRAFT_VIBE, skills: BRIGHT_PATH_SKILLS },
    { pathKey: 'TIME_CRAFT', dir: DIR.TIME_CRAFT, skills: DARK_PATH_SKILLS },
    { pathKey: 'TIME_VIBE', dir: DIR.TIME_VIBE, skills: WISDOM_PATH_SKILLS },
  ];

  for (const { pathKey, dir, skills } of fusionPaths) {
    const t1 = polarToXY(dir, R_FUSION_T1);
    const t2 = polarToXY(dir, R_FUSION_T2);
    nodes.push({ skillId: skills[0], x: t1.x, y: t1.y, pathKey });
    nodes.push({ skillId: skills[1], x: t2.x, y: t2.y, pathKey });
    connections.push({ x1: t1.x, y1: t1.y, x2: t2.x, y2: t2.y, pathKey });
  }

  return { nodes, connections };
}

// Node dimensions for centering
const NODE_W = 120;
const NODE_H = 56;

// ============================================================================
// SkillTree Component
// ============================================================================

export const SkillTree: React.FC<SkillTreeProps> = ({
  skillMap,
  selectedSkillId,
  onSelectSkill,
  essenceBalance,
}) => {
  const layout = useMemo(() => buildNodePositions(), []);

  return (
    <div
      className="relative mx-auto"
      style={{ width: CONTAINER_W, height: CONTAINER_H }}
    >
      {/* Background gradients for each pure path sector */}
      <SectorBackgrounds />

      {/* SVG connection lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={CONTAINER_W}
        height={CONTAINER_H}
        style={{ zIndex: 1 }}
      >
        <defs>
          {/* Gradient definitions for fusion path lines */}
          <linearGradient id="grad-CRAFT_VIBE-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="grad-TIME_CRAFT-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="grad-TIME_VIBE-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {layout.connections.map((conn, i) => {
          const isFusion = ['CRAFT_VIBE', 'TIME_CRAFT', 'TIME_VIBE'].includes(conn.pathKey);
          const strokeColor = isFusion
            ? `url(#grad-${conn.pathKey}-line)`
            : getStrokeColor(conn.pathKey);

          return (
            <line
              key={i}
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              stroke={strokeColor}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          );
        })}

        {/* Center decorative element */}
        <circle cx={CX} cy={CY} r="16" fill="none" stroke="#57534e" strokeWidth="1" opacity="0.4" />
        <circle cx={CX} cy={CY} r="4" fill="#57534e" opacity="0.5" />
      </svg>

      {/* Path labels at the outer edge */}
      <PathLabels />

      {/* Skill nodes */}
      {layout.nodes.map((node) => {
        const skill = skillMap.get(node.skillId);
        if (!skill) return null;
        return (
          <SkillNode
            key={node.skillId}
            skill={skill}
            pathKey={node.pathKey}
            isSelected={selectedSkillId === node.skillId}
            onSelect={() => onSelectSkill(node.skillId)}
            essenceBalance={essenceBalance}
            style={{
              position: 'absolute',
              left: node.x - NODE_W / 2,
              top: node.y - NODE_H / 2,
              width: NODE_W,
              zIndex: 2,
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// Sector Backgrounds
// ============================================================================

/** Radial gradient backgrounds for three pure path sectors */
const SectorBackgrounds: React.FC = () => {
  // Pure path gradient origins (at T1 position for a tighter glow)
  const sectors = [
    { dir: DIR.VIBE, color: '139, 92, 246' },    // purple
    { dir: DIR.CRAFT, color: '59, 130, 246' },    // blue
    { dir: DIR.TIME, color: '245, 158, 11' },     // amber
  ];

  return (
    <>
      {sectors.map((s, i) => {
        const center = polarToXY(s.dir, R_T1 * 0.7);
        return (
          <div
            key={i}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${center.x}px ${center.y}px, rgba(${s.color}, 0.12) 0%, rgba(${s.color}, 0.04) 40%, transparent 65%)`,
              zIndex: 0,
            }}
          />
        );
      })}
    </>
  );
};

// ============================================================================
// Path Labels (outer edge)
// ============================================================================

const PathLabels: React.FC = () => {
  const labels: Array<{ pathKey: PathKey; dir: number }> = [
    { pathKey: 'VIBE', dir: DIR.VIBE },
    { pathKey: 'CRAFT', dir: DIR.CRAFT },
    { pathKey: 'TIME', dir: DIR.TIME },
  ];

  const LABEL_R = R_T2 + 45;

  return (
    <>
      {labels.map(({ pathKey, dir }) => {
        const pos = polarToXY(dir, LABEL_R);
        const colors = PATH_COLORS[pathKey];
        return (
          <div
            key={pathKey}
            className="absolute pointer-events-none flex flex-col items-center"
            style={{
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
            }}
          >
            <span className={cn(
              'font-bold tracking-wider text-xs',
              colors.text
            )}>
              {colors.icon} {colors.label}
            </span>
          </div>
        );
      })}
    </>
  );
};

// ============================================================================
// Stroke color helper
// ============================================================================

function getStrokeColor(pathKey: PathKey): string {
  const colorMap: Record<PathKey, string> = {
    CRAFT: '#3b82f6',
    TIME: '#f59e0b',
    VIBE: '#a855f7',
    TIME_CRAFT: '#ef4444',
    CRAFT_VIBE: '#10b981',
    TIME_VIBE: '#06b6d4',
  };
  return colorMap[pathKey];
}

// ============================================================================
// Skill Node
// ============================================================================

interface SkillNodeProps {
  skill: AbilityPanelData['skills'][number];
  pathKey: PathKey;
  isSelected: boolean;
  onSelect: () => void;
  essenceBalance: { craft: number; time: number; vibe: number };
  style?: React.CSSProperties;
}

const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  pathKey,
  isSelected,
  onSelect,
  essenceBalance,
  style,
}) => {
  const { def, state, canUnlock, meetsPrerequisites } = skill;
  const colors = PATH_COLORS[pathKey];
  const isUnlocked = state.unlocked;

  const essenceProgress = useMemo(() => {
    if (isUnlocked) return 1;
    const cost = def.essenceCost;
    let totalNeeded = 0;
    let totalHave = 0;
    if (cost.craft) {
      totalNeeded += cost.craft;
      totalHave += Math.min(cost.craft, essenceBalance.craft);
    }
    if (cost.time) {
      totalNeeded += cost.time;
      totalHave += Math.min(cost.time, essenceBalance.time);
    }
    if (cost.vibe) {
      totalNeeded += cost.vibe;
      totalHave += Math.min(cost.vibe, essenceBalance.vibe);
    }
    return totalNeeded > 0 ? totalHave / totalNeeded : 0;
  }, [isUnlocked, def.essenceCost, essenceBalance]);

  return (
    <button
      onClick={onSelect}
      style={style}
      className={cn(
        'p-2 rounded-lg border transition-all duration-200 text-left',
        'hover:scale-105 cursor-pointer',
        isUnlocked
          ? cn('border-2', colors.border, colors.bg, `shadow-md ${colors.glow}`)
          : canUnlock
          ? cn('border-2 border-dashed', colors.border, 'bg-noir-200/90 animate-pulse')
          : !meetsPrerequisites
          ? 'border border-stone-700/50 bg-noir-300/80 opacity-50'
          : 'border border-stone-700 bg-noir-200/90',
        isSelected && 'ring-2 ring-white/30 scale-105'
      )}
    >
      <div className="flex items-center gap-1.5">
        {/* Status icon */}
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border',
          isUnlocked
            ? cn(colors.border, colors.bg)
            : canUnlock
            ? cn('border-dashed', colors.border, 'bg-noir-300')
            : 'border-stone-700 bg-noir-400'
        )}>
          {isUnlocked ? (
            <CheckCircle2 className={cn('w-3.5 h-3.5', colors.text)} />
          ) : !meetsPrerequisites ? (
            <Lock className="w-3 h-3 text-stone-600" />
          ) : (
            <Sparkles className={cn('w-3 h-3', canUnlock ? colors.text : 'text-stone-500')} />
          )}
        </div>

        {/* Skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={cn(
              'text-xs font-bold truncate',
              isUnlocked ? colors.text : canUnlock ? 'text-stone-200' : 'text-stone-500'
            )}>
              {def.name}
            </span>
            <span className={cn(
              'text-[8px] font-mono shrink-0',
              isUnlocked ? 'text-stone-400' : 'text-stone-600'
            )}>
              {def.tier}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {def.activation === 'ACTIVE' && (
              <span className="text-[8px] px-0.5 bg-amber-900/40 text-amber-400 rounded shrink-0">
                主动
              </span>
            )}
            {def.activation === 'PASSIVE' && (
              <span className="text-[8px] px-0.5 bg-stone-800/60 text-stone-500 rounded shrink-0">
                被动
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for locked skills */}
      {!isUnlocked && meetsPrerequisites && (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex-1 h-1 bg-noir-400 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                essenceProgress >= 1 ? 'bg-green-500' : colors.text.replace('text-', 'bg-')
              )}
              style={{ width: `${Math.round(essenceProgress * 100)}%` }}
            />
          </div>
          <span className="text-[8px] font-mono text-stone-600">
            {Math.round(essenceProgress * 100)}%
          </span>
        </div>
      )}
    </button>
  );
};
