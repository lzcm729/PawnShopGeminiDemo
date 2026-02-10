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
import { PATH_COLORS, PathKey } from './constants';

// ============================================================================
// Types & Layout Configuration
// ============================================================================

interface SkillTreeProps {
  skillMap: Map<SkillId, AbilityPanelData['skills'][number]>;
  selectedSkillId: SkillId | null;
  onSelectSkill: (id: SkillId) => void;
}

/** Container dimensions for the three-ring layout */
const CONTAINER_W = 720;
const CONTAINER_H = 720;
const CX = CONTAINER_W / 2;
const CY = CONTAINER_H / 2;

/** Radii from center for T1 (inner), T2 (middle), T3 (outer) nodes. */
const R_T1 = 100;
const R_T2 = 190;
const R_T3 = 280;

/**
 * Directions (clockwise degrees from top / 12 o'clock):
 * Inner ring T1 (3 pure): 120° apart
 *   EMPATHY (VIBE) at 0°, SENSE_HIDDEN (CRAFT) at 120°, APPLY_PRESSURE (TIME) at 240°
 *
 * Middle ring T2 (6): 60° apart
 *   COMFORT at 0°, CHERISH_ALL at 60°, PIERCE_ILLUSION at 120°,
 *   SHARP_SCRUTINY at 180°, HEART_STRIKE at 240°, FORESIGHT at 300°
 *
 * Outer ring T3 (3 fusion capstones): 120° apart, offset to fusion directions
 *   WORD_OF_MOUTH at 60°, POKER_FACE at 180°, SEE_CONSEQUENCE at 300°
 */

/** Sector directions for background gradients */
const DIR = {
  VIBE: 0,
  CRAFT: 120,
  TIME: 240,
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

// ============================================================================
// Build Layout Positions
// ============================================================================

/** Inner ring T1: 3 pure skills at 120° intervals */
const INNER_RING_LAYOUT: Array<{ skillId: SkillId; angleDeg: number; pathKey: PathKey }> = [
  { skillId: 'EMPATHY',        angleDeg: 0,   pathKey: 'VIBE' },
  { skillId: 'SENSE_HIDDEN',   angleDeg: 120, pathKey: 'CRAFT' },
  { skillId: 'APPLY_PRESSURE', angleDeg: 240, pathKey: 'TIME' },
];

/** Middle ring T2: 6 skills at 60° intervals */
const MIDDLE_RING_LAYOUT: Array<{ skillId: SkillId; angleDeg: number; pathKey: PathKey }> = [
  { skillId: 'COMFORT',         angleDeg: 0,   pathKey: 'VIBE' },
  { skillId: 'CHERISH_ALL',     angleDeg: 60,  pathKey: 'CRAFT_VIBE' },
  { skillId: 'PIERCE_ILLUSION', angleDeg: 120, pathKey: 'CRAFT' },
  { skillId: 'SHARP_SCRUTINY',  angleDeg: 180, pathKey: 'TIME_CRAFT' },
  { skillId: 'HEART_STRIKE',    angleDeg: 240, pathKey: 'TIME' },
  { skillId: 'FORESIGHT',       angleDeg: 300, pathKey: 'TIME_VIBE' },
];

/** Outer ring T3: 3 fusion capstones at 120° intervals (fusion path directions) */
const OUTER_RING_LAYOUT: Array<{ skillId: SkillId; angleDeg: number; pathKey: PathKey }> = [
  { skillId: 'WORD_OF_MOUTH',   angleDeg: 60,  pathKey: 'CRAFT_VIBE' },
  { skillId: 'POKER_FACE',      angleDeg: 180, pathKey: 'TIME_CRAFT' },
  { skillId: 'SEE_CONSEQUENCE', angleDeg: 300, pathKey: 'TIME_VIBE' },
];

function buildNodePositions(): { nodes: NodePos[] } {
  const nodes: NodePos[] = [];

  for (const { skillId, angleDeg, pathKey } of INNER_RING_LAYOUT) {
    const pos = polarToXY(angleDeg, R_T1);
    nodes.push({ skillId, x: pos.x, y: pos.y, pathKey });
  }

  for (const { skillId, angleDeg, pathKey } of MIDDLE_RING_LAYOUT) {
    const pos = polarToXY(angleDeg, R_T2);
    nodes.push({ skillId, x: pos.x, y: pos.y, pathKey });
  }

  for (const { skillId, angleDeg, pathKey } of OUTER_RING_LAYOUT) {
    const pos = polarToXY(angleDeg, R_T3);
    nodes.push({ skillId, x: pos.x, y: pos.y, pathKey });
  }

  return { nodes };
}

// Node dimensions for centering (circular nodes)
const NODE_W = 80;
const NODE_H = 80;

// ============================================================================
// SkillTree Component
// ============================================================================

export const SkillTree: React.FC<SkillTreeProps> = ({
  skillMap,
  selectedSkillId,
  onSelectSkill,
}) => {
  const layout = useMemo(() => buildNodePositions(), []);

  return (
    <div
      className="relative mx-auto"
      style={{ width: CONTAINER_W, height: CONTAINER_H }}
    >
      {/* CSS Animations */}
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes centerPulse {
          0%, 100% { opacity: 0.3; r: 28; }
          50% { opacity: 0.15; r: 36; }
        }
        .skill-breathe {
          animation: breathe 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Background gradients for each pure path sector */}
      <SectorBackgrounds />

      {/* SVG concentric rings + center */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={CONTAINER_W}
        height={CONTAINER_H}
        style={{ zIndex: 1 }}
      >
        <defs>
          {/* Center glow filter */}
          <filter id="centerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inner ring (T1 layer) */}
        <circle
          cx={CX} cy={CY} r={R_T1}
          fill="none"
          stroke="#44403c"
          strokeWidth="1.5"
          opacity="0.3"
        />

        {/* Middle ring (T2 layer) */}
        <circle
          cx={CX} cy={CY} r={R_T2}
          fill="none"
          stroke="#44403c"
          strokeWidth="1.5"
          opacity="0.3"
        />

        {/* Outer ring (T3 layer) */}
        <circle
          cx={CX} cy={CY} r={R_T3}
          fill="none"
          stroke="#44403c"
          strokeWidth="1.5"
          opacity="0.25"
        />

        {/* Center decorative element - practitioner core */}
        <circle
          cx={CX} cy={CY} r="28"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.5"
          opacity="0.3"
          style={{ animation: 'centerPulse 3s ease-in-out infinite' }}
        />
        <circle cx={CX} cy={CY} r="18" fill="none" stroke="#57534e" strokeWidth="1" opacity="0.5" />
        <circle cx={CX} cy={CY} r="8" fill="#292524" stroke="#78716c" strokeWidth="0.5" opacity="0.8" />
        {/* Center Sparkles icon via foreignObject */}
        <foreignObject x={CX - 10} y={CY - 10} width="20" height="20">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Sparkles style={{ width: 14, height: 14, color: '#a78bfa', opacity: 0.7 }} />
          </div>
        </foreignObject>
      </svg>


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
            style={{
              position: 'absolute',
              left: node.x - NODE_W / 2,
              top: node.y - NODE_H / 2,
              width: NODE_W,
              height: NODE_H,
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
              background: `radial-gradient(circle at ${center.x}px ${center.y}px, rgba(${s.color}, 0.18) 0%, rgba(${s.color}, 0.08) 40%, transparent 65%)`,
              zIndex: 0,
            }}
          />
        );
      })}
    </>
  );
};


// ============================================================================
// Skill Node
// ============================================================================

interface SkillNodeProps {
  skill: AbilityPanelData['skills'][number];
  pathKey: PathKey;
  isSelected: boolean;
  onSelect: () => void;
  style?: React.CSSProperties;
}

const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  pathKey,
  isSelected,
  onSelect,
  style,
}) => {
  const { def, state, canUnlock, meetsPrerequisites } = skill;
  const colors = PATH_COLORS[pathKey];
  const isUnlocked = state.unlocked;

  // Determine node visual state
  const nodeState: 'UNLOCKED' | 'CAN_UNLOCK' | 'ESSENCE_SHORT' | 'LOCKED' = isUnlocked
    ? 'UNLOCKED'
    : canUnlock
    ? 'CAN_UNLOCK'
    : !meetsPrerequisites
    ? 'LOCKED'
    : 'ESSENCE_SHORT';

  return (
    <button
      onClick={onSelect}
      style={{
        ...style,
        // Unlocked nodes get a subtle inner glow via box-shadow
        ...(isUnlocked ? {
          boxShadow: `0 0 12px 2px ${colors.hex}33, inset 0 0 8px 1px ${colors.hex}22`,
        } : canUnlock ? {
          boxShadow: `0 0 8px 1px ${colors.hex}22`,
        } : {}),
      }}
      className={cn(
        'rounded-full border transition-all duration-200 group',
        'flex flex-col items-center justify-center',
        'hover:shadow-lg cursor-pointer',
        // State-specific styles
        nodeState === 'UNLOCKED' && cn(
          'border-2', colors.border, colors.bg,
        ),
        nodeState === 'CAN_UNLOCK' && cn(
          'border-2 border-dashed skill-breathe', colors.border, 'bg-noir-200/90',
        ),
        nodeState === 'LOCKED' && cn(
          'border border-dashed border-stone-700/50 bg-noir-300/80 opacity-40',
        ),
        nodeState === 'ESSENCE_SHORT' && cn(
          'border border-stone-600 bg-noir-200/90',
        ),
        isSelected && 'ring-2 ring-white/30 !scale-105',
        // Hover transform
        !isSelected && 'hover:scale-110 hover:z-10',
      )}
    >
      {/* Status icon */}
      <div className="mb-0.5">
        {nodeState === 'UNLOCKED' ? (
          <CheckCircle2 className={cn('w-5 h-5', colors.text)} />
        ) : nodeState === 'LOCKED' ? (
          <Lock className="w-5 h-5 text-stone-600" />
        ) : (
          <Sparkles className={cn('w-5 h-5', canUnlock ? colors.text : 'text-stone-500')} />
        )}
      </div>

      {/* Skill name */}
      <span className={cn(
        'text-xs font-bold truncate max-w-[64px] text-center leading-tight',
        nodeState === 'UNLOCKED' ? colors.text
          : nodeState === 'CAN_UNLOCK' ? 'text-stone-200'
          : nodeState === 'ESSENCE_SHORT' ? 'text-stone-300'
          : 'text-stone-500'
      )}>
        {def.name}
      </span>

      {/* Active/Passive label */}
      {def.activation === 'ACTIVE' && (
        <span className="text-[7px] px-1 py-px bg-amber-900/50 text-amber-300 rounded shrink-0 font-medium mt-0.5">
          主动
        </span>
      )}
      {def.activation === 'PASSIVE' && (
        <span className="text-[7px] px-1 py-px bg-indigo-950/60 text-indigo-400 rounded shrink-0 font-medium mt-0.5">
          被动
        </span>
      )}
    </button>
  );
};
