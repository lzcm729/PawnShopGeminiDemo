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

interface SkillTreeProps {
  skillMap: Map<SkillId, AbilityPanelData['skills'][number]>;
  selectedSkillId: SkillId | null;
  onSelectSkill: (id: SkillId) => void;
  essenceBalance: { craft: number; time: number; vibe: number };
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  skillMap,
  selectedSkillId,
  onSelectSkill,
  essenceBalance,
}) => {
  return (
    <div className="space-y-6">
      {/* Pure Paths */}
      <div className="grid grid-cols-3 gap-4">
        <PathColumn
          title="匠心 (Craft)"
          pathKey="CRAFT"
          skillIds={PURE_CRAFT_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="旧影 (Time)"
          pathKey="TIME"
          skillIds={PURE_TIME_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="灵韵 (Vibe)"
          pathKey="VIBE"
          skillIds={PURE_VIBE_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-stone-700/50" />
        <span className="text-[10px] uppercase text-stone-500 tracking-widest">融合路径</span>
        <div className="flex-1 border-t border-stone-700/50" />
      </div>

      {/* Fusion Paths */}
      <div className="grid grid-cols-3 gap-4">
        <PathColumn
          title="暗路 (旧影+匠心)"
          subtitle="弱点即筹码"
          pathKey="TIME_CRAFT"
          skillIds={DARK_PATH_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="明路 (匠心+灵韵)"
          subtitle="善行有回响"
          pathKey="CRAFT_VIBE"
          skillIds={BRIGHT_PATH_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="慧路 (旧影+灵韵)"
          subtitle="命运可见"
          pathKey="TIME_VIBE"
          skillIds={WISDOM_PATH_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Path Column
// ============================================================================

interface PathColumnProps {
  title: string;
  subtitle?: string;
  pathKey: PathKey;
  skillIds: SkillId[];
  skillMap: Map<SkillId, AbilityPanelData['skills'][number]>;
  selectedSkillId: SkillId | null;
  onSelectSkill: (id: SkillId) => void;
  essenceBalance: { craft: number; time: number; vibe: number };
}

const PathColumn: React.FC<PathColumnProps> = ({
  title,
  subtitle,
  pathKey,
  skillIds,
  skillMap,
  selectedSkillId,
  onSelectSkill,
  essenceBalance,
}) => {
  const colors = PATH_COLORS[pathKey];

  return (
    <div className={cn('rounded border p-3', colors.bg, colors.border)}>
      {/* Path Header */}
      <div className="mb-3 text-center">
        <div className={cn('text-xs font-bold uppercase tracking-wider', colors.text)}>
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-stone-500 mt-0.5 italic">
            {subtitle}
          </div>
        )}
      </div>

      {/* Skill Nodes (T1 at bottom, T2 at top) */}
      <div className="flex flex-col gap-2">
        {/* T2 skill (higher tier at top) */}
        {skillIds.length > 1 && (
          <>
            <SkillNode
              skill={skillMap.get(skillIds[1])!}
              pathKey={pathKey}
              isSelected={selectedSkillId === skillIds[1]}
              onSelect={() => onSelectSkill(skillIds[1])}
              essenceBalance={essenceBalance}
            />
            {/* Connection line */}
            <div className="flex justify-center">
              <div className={cn('w-px h-4 border-l-2 border-dashed', colors.line)} />
            </div>
          </>
        )}
        {/* T1 skill (base tier at bottom) */}
        <SkillNode
          skill={skillMap.get(skillIds[0])!}
          pathKey={pathKey}
          isSelected={selectedSkillId === skillIds[0]}
          onSelect={() => onSelectSkill(skillIds[0])}
          essenceBalance={essenceBalance}
        />
      </div>
    </div>
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
  essenceBalance: { craft: number; time: number; vibe: number };
}

const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  pathKey,
  isSelected,
  onSelect,
  essenceBalance,
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
      className={cn(
        'w-full p-2.5 rounded border transition-all duration-200 text-left',
        'hover:scale-[1.02] cursor-pointer',
        isUnlocked
          ? cn('border-2', colors.border, colors.bg, `shadow-md ${colors.glow}`)
          : canUnlock
          ? cn('border-2 border-dashed', colors.border, 'bg-noir-200 animate-pulse')
          : !meetsPrerequisites
          ? 'border border-stone-700/50 bg-noir-300/50 opacity-50'
          : 'border border-stone-700 bg-noir-200',
        isSelected && 'ring-2 ring-white/30'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Status icon */}
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border',
          isUnlocked
            ? cn(colors.border, colors.bg)
            : canUnlock
            ? cn('border-dashed', colors.border, 'bg-noir-300')
            : 'border-stone-700 bg-noir-400'
        )}>
          {isUnlocked ? (
            <CheckCircle2 className={cn('w-4 h-4', colors.text)} />
          ) : !meetsPrerequisites ? (
            <Lock className="w-3.5 h-3.5 text-stone-600" />
          ) : (
            <Sparkles className={cn('w-3.5 h-3.5', canUnlock ? colors.text : 'text-stone-500')} />
          )}
        </div>

        {/* Skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-sm font-bold truncate',
              isUnlocked ? colors.text : canUnlock ? 'text-stone-200' : 'text-stone-500'
            )}>
              {def.name}
            </span>
            <span className={cn(
              'text-[9px] font-mono shrink-0',
              isUnlocked ? 'text-stone-400' : 'text-stone-600'
            )}>
              {def.tier}
            </span>
            {def.activation === 'ACTIVE' && (
              <span className="text-[9px] px-1 py-0.5 bg-amber-900/40 text-amber-400 rounded shrink-0">
                主动
              </span>
            )}
          </div>

          {/* Progress bar for locked skills */}
          {!isUnlocked && meetsPrerequisites && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-noir-400 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    essenceProgress >= 1 ? 'bg-green-500' : colors.text.replace('text-', 'bg-')
                  )}
                  style={{ width: `${Math.round(essenceProgress * 100)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-stone-600">
                {Math.round(essenceProgress * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
